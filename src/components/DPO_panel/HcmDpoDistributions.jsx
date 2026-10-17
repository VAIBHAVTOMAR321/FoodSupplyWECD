import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import dpoHindi from "./DPOTranslations.json";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

// Match the date and trimester presentation used by HcmSupervisorDistributions.
const getDistributionDateRaw = (row) => firstValue(row, [
  "date", "distribution_date", "distributionDate", "distributed_date", "distributedDate",
  "date_of_distribution", "dateOfDistribution", "allotment_date", "allotmentDate",
  "created_at", "createdAt", "timestamp"
]);

const formatDistributionDate = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const getMonthsRaw = (row) => firstValue(row, [
  "months", "month", "allotted_months", "allottedMonths", "distribution_months",
  "distributionMonths", "month_name", "monthName", "months_allotted", "monthsAllotted",
  "allocation_months", "allocationMonths"
]);

const getTrimesterRaw = (row) => firstValue(row, [
  "trimester", "trimester_name", "trimesterName", "quarter", "quarter_name", "quarterName",
  "quarter_months", "quarterMonths", "distribution_quarter", "distributionQuarter",
  "months", "month", "allocation_trimester", "allocationTrimester"
]);

const normalizeMonthToken = (value) => String(value ?? "")
  .trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "-");

const formatMonths = (row) => {
  const raw = getMonthsRaw(row);
  if (raw === "") {
    const trimester = getTrimesterRaw(row);
    return formatMonthsValue(trimester);
  }
  return formatMonthsValue(raw);
};

const formatMonthsValue = (value) => {
  const names = {
    apr: "April", april: "April", may: "May", jun: "June", june: "June",
    jul: "July", july: "July", aug: "August", august: "August",
    sep: "September", sept: "September", september: "September",
    oct: "October", october: "October", nov: "November", november: "November",
    dec: "December", december: "December", jan: "January", january: "January",
    feb: "February", february: "February", mar: "March", march: "March"
  };
  const quarterMap = {
    "apr-may-jun": ["April", "May", "June"], "april-may-june": ["April", "May", "June"],
    "jul-aug-sep": ["July", "August", "September"], "july-august-september": ["July", "August", "September"],
    "oct-nov-dec": ["October", "November", "December"], "october-november-december": ["October", "November", "December"],
    "jan-feb-mar": ["January", "February", "March"], "january-february-march": ["January", "February", "March"]
  };
  if (Array.isArray(value)) return value.map(v => names[normalizeMonthToken(v)] || v).join(", ");
  const token = normalizeMonthToken(value).replace(/_/g, "-");
  if (quarterMap[token]) return quarterMap[token].join(", ");
  const parts = token.split(/[,-/]+/).filter(Boolean);
  if (parts.length > 1) return parts.map(v => names[v] || v).join(", ");
  return names[token] || (value || "-");
};

const normalizeTrimesterKey = (row) => {
  const raw = getTrimesterRaw(row);
  const token = (Array.isArray(raw) ? raw.join("-") : String(raw))
    .trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  const aliases = {
    "april-may-june": "apr-may-jun", "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec", "january-february-march": "jan-feb-mar",
    "apr-may-jun": "apr-may-jun", "jul-aug-sep": "jul-aug-sep",
    "oct-nov-dec": "oct-nov-dec", "jan-feb-mar": "jan-feb-mar"
  };
  if (aliases[token]) return aliases[token];
  const months = token.split(/[,-/]+/).filter(Boolean).map((m) => ({
    april: "apr", june: "jun", july: "jul", august: "aug", september: "sep",
    october: "oct", november: "nov", december: "dec", january: "jan",
    february: "feb", march: "mar"
  })[m] || m);
  const groups = {
    "apr-may-jun": ["apr", "may", "jun"], "jul-aug-sep": ["jul", "aug", "sep"],
    "oct-nov-dec": ["oct", "nov", "dec"], "jan-feb-mar": ["jan", "feb", "mar"]
  };
  for (const [key, group] of Object.entries(groups)) {
    if (group.every((month) => months.includes(month))) return key;
  }
  return token || "-";
};

const formatTrimester = (row) => ({
  "apr-may-jun": "Apr-May-Jun", "jul-aug-sep": "Jul-Aug-Sep",
  "oct-nov-dec": "Oct-Nov-Dec", "jan-feb-mar": "Jan-Feb-Mar"
})[normalizeTrimesterKey(row)] || normalizeTrimesterKey(row);

const HcmDpoDistributions = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const tableRef = useRef(null);

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "awc_type", text: "AWC Type", visible: false },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "days_allotted", text: "Days Allotted", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "fin_year", text: "Fin Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "trimester", text: "Trimester", visible: true },
    { dataField: "total_beneficiaries", text: "Beneficiaries", visible: true },
    { dataField: "quantity", text: "Qty", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "anganwadi_remark", text: "Anganwadi Remark", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "sector_remark", text: "Sector Remark", visible: false },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const [filters, setFilters] = useState({
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    awc_type: [],
    sector_status: [],
    startDate: '',
    endDate: '',
  });
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueAwcTypes, setUniqueAwcTypes] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);
  const [beneficiaryCategories, setBeneficiaryCategories] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (distributions.length > 0) {
      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueAwcTypes([...new Set(distributions.map(item => item.awc_type).filter(Boolean))]);
      setUniqueSectorStatuses([...new Set(distributions.map(item => item.sector_status).filter(Boolean))]);
    }
  }, [distributions]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const filteredData = useMemo(() => {
    return distributions.filter(item => {
      const { district, project, sector, food_item, awc_type, bene_category, sector_status, startDate, endDate } = filters;
      const matchesFilters = (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project)) &&
             (sector.length === 0 || sector.includes(item.sector)) &&
             (food_item.length === 0 || food_item.includes(item.food_item)) &&
             (bene_category.length === 0 || bene_category.includes(item.bene_category)) &&
             (awc_type.length === 0 || awc_type.includes(item.awc_type)) &&
             (sector_status.length === 0 || sector_status.includes(item.sector_status));

      const itemDate = item.date ? new Date(item.date) : null;
      const matchesDateRange = (!startDate || (itemDate && itemDate >= new Date(startDate))) &&
                               (!endDate || (itemDate && itemDate <= new Date(endDate + 'T23:59:59')));

      return matchesFilters && matchesDateRange;
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hcm-dpo-distributions/");
      const raw = response.data?.data ?? response.data?.results ?? response.data ?? [];
      setDistributions(Array.isArray(raw) ? raw : raw ? [raw] : []);
    } catch (err) {
      setDistributions([]);
      setError(t("Failed to fetch HCM DPO distributions.", "HCM DPO वितरण प्राप्त करने में विफल।"));
      console.error("Failed to fetch HCM DPO distributions:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBeneficiaryCategories = async () => {
    try {
      const response = await api.get("/beneficiary-categories/");
      const data = response.data?.results || response.data?.data || response.data || [];
      setBeneficiaryCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch beneficiary categories:", err);
      if (distributions.length > 0) {
        const uniqueCats = [...new Set(distributions.map(item => item.bene_category))];
        setBeneficiaryCategories(uniqueCats.map((name, idx) => ({ id: idx, category_name: name })));
      }
    }
  };

  useEffect(() => {
    if (api) {
      fetchDistributions();
      fetchBeneficiaryCategories();
    }
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter(c => c.visible);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      acc.beneficiaries += Number(item.total_beneficiaries) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const unit = item.unit || 'N/A';

      acc.quantity += quantity;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      return acc;
    }, { beneficiaries: 0, quantity: 0, quantityByUnit: {} });
  }, [filteredData]);

  const exportToPDF = async () => {
    const exportColumns = columns.filter((col) => col.visible && col.dataField !== "action");
    const exportRoot = document.createElement("div");
    Object.assign(exportRoot.style, {
      position: "fixed", left: "-10000px", top: "0", width: "1600px",
      padding: "12px", background: "#ffffff", color: "#212529",
      fontFamily: "Arial, Noto Sans Devanagari, sans-serif", zIndex: "-1"
    });

    const table = document.createElement("table");
    Object.assign(table.style, {
      width: "100%", tableLayout: "auto", borderCollapse: "collapse",
      fontSize: "10px", lineHeight: "1.25", background: "#ffffff"
    });
    const cellStyle = "border:1px solid #adb5bd;padding:4px 5px;vertical-align:top;overflow-wrap:anywhere;white-space:normal;";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    exportColumns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.text;
      th.setAttribute("style", `${cellStyle}background:#e9ecef;font-weight:700;text-align:center;`);
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const getExportValue = (row, col, index) => {
      if (col.dataField === "#") return index + 1;
      if (col.dataField === "date") return formatDistributionDate(getDistributionDateRaw(row));
      if (col.dataField === "months") return formatMonths(row);
      if (col.dataField === "trimester") return formatTrimester(row);
      if (col.dataField === "sector_status") return row.sector_status || "pending";
      return row[col.dataField] ?? "";
    };
    filteredData.forEach((row, index) => {
      const tr = document.createElement("tr");
      exportColumns.forEach((col) => {
        const td = document.createElement("td");
        const value = getExportValue(row, col, index);
        td.textContent = value === null || value === undefined ? "" : String(value);
        td.setAttribute("style", `${cellStyle}${index % 2 ? "background:#f8f9fa;" : ""}`);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const footerRow = document.createElement("tr");
    exportColumns.forEach((col) => {
      const td = document.createElement("td");
      let value = "";
      if (col.dataField === "#") value = "Total";
      if (col.dataField === "total_beneficiaries") value = totals.beneficiaries;
      td.textContent = String(value);
      td.setAttribute("style", `${cellStyle}background:#e9ecef;font-weight:700;`);
      footerRow.appendChild(td);
    });
    tbody.appendChild(footerRow);
    table.appendChild(tbody);
    exportRoot.appendChild(table);
    document.body.appendChild(exportRoot);

    try {
      // Browser canvas rendering keeps Hindi/Unicode text readable. JPEG compression
      // and a smaller A3 page reduce PDF size substantially compared with PNG/A2.
      const canvas = await html2canvas(exportRoot, {
        scale: 1.15, useCORS: true, backgroundColor: "#ffffff",
        logging: false, windowWidth: 1600
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.68);
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const titleHeight = 24;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2 - titleHeight;
      const scale = contentWidth / canvas.width;
      const scaledHeight = canvas.height * scale;
      const pageSliceHeight = contentHeight / scale;
      let sourceY = 0;
      let page = 0;

      while (sourceY < canvas.height) {
        if (page > 0) pdf.addPage("a3", "landscape");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(33, 37, 41);
        pdf.text("HCM DPO Distributions Report", margin, 18);
        const sliceHeight = Math.min(pageSliceHeight, canvas.height - sourceY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(sliceHeight);
        const context = sliceCanvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.68), "JPEG", margin, margin + titleHeight, contentWidth, sliceCanvas.height * scale, undefined, "FAST");
        sourceY += sliceCanvas.height;
        page += 1;
      }
      pdf.save("hcm_dpo_distributions.pdf");
    } catch (err) {
      console.error("Failed to export HCM DPO distributions PDF:", err);
      setError(t("PDF export failed. Please try again.", "PDF निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    } finally {
      document.body.removeChild(exportRoot);
      setIsPrinting(false);
    }
  };

  const exportToExcel = () => {
    const visCols = columns.filter(c => c.visible && c.dataField !== '#' && c.dataField !== 'action');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField !== '#') {
          if (col.dataField === "date") {
            newRow[col.text] = formatDistributionDate(getDistributionDateRaw(row));
          } else if (col.dataField === "months") {
            newRow[col.text] = formatMonths(row);
          } else if (col.dataField === "trimester") {
            newRow[col.text] = formatTrimester(row);
          } else {
            newRow[col.text] = row[col.dataField] ?? "";
          }
        }
      });
      return newRow;
    });

    const totalRow = { '#': '' };
    visCols.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = '';
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HCM DPO Distributions");
    XLSX.writeFile(workbook, "hcm_dpo_distributions.xlsx");
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    items.push(
      <Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />,
      <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
    );
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    items.push(
      <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />,
      <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
    );
    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination size="sm">{items}</Pagination>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">{t("HCM DPO Distributions", "HCM DPO वितरण")}</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                <FaFilePdf className="me-1" /> {t("Export PDF", "PDF निर्यात करें")}
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                <FaEye className="me-1" /> {t("Column Visibility", "कॉलम दृश्यता")}
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district" className="w-100">
                  {filters.district.length ? `${filters.district.length} ${t("districts selected", "जिले चयनित")}` : t("All Districts", "सभी जिले")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDistricts.map(d => (
                    <Dropdown.Item key={d} as="div">
                      <Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-project" className="w-100">
                  {filters.project.length ? `${filters.project.length} ${t("projects selected", "परियोजनाएँ चयनित")}` : t("All Projects", "सभी परियोजनाएँ")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueProjects.map(p => (
                    <Dropdown.Item key={p} as="div">
                      <Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector" className="w-100">
                  {filters.sector.length ? `${filters.sector.length} ${t("sectors selected", "सेक्टर चयनित")}` : t("All Sectors", "सभी सेक्टर")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectors.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-food-item" className="w-100">
                  {filters.food_item.length ? `${filters.food_item.length} ${t("items selected", "सामग्री चयनित")}` : t("All Food Items", "सभी खाद्य सामग्री")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFoodItems.map(item => (
                    <Dropdown.Item key={item} as="div">
                      <Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-awc-type" className="w-100">
                  {filters.awc_type.length ? `${filters.awc_type.length} ${t("types selected", "प्रकार चयनित")}` : t("All AWC Types", "आंगनवाड़ी केंद्र के सभी प्रकार")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueAwcTypes.map(t => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check type="checkbox" label={t} checked={filters.awc_type.includes(t)} onChange={() => handleMultiSelectChange('awc_type', t)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} ${t("categories selected", "श्रेणियाँ चयनित")}` : t("All Bene. Categories", "सभी लाभार्थी श्रेणियाँ")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {beneficiaryCategories.map(cat => (
                    <Dropdown.Item key={cat.id} as="div">
                      <Form.Check type="checkbox" label={cat.category_name} checked={filters.bene_category.includes(cat.category_name)} onChange={() => handleMultiSelectChange('bene_category', cat.category_name)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status" className="w-100">
                  {filters.sector_status.length ? `${filters.sector_status.length} ${t("statuses selected", "स्थितियाँ चयनित")}` : t("All Sector Statuses", "सभी सेक्टर स्थितियाँ")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {uniqueSectorStatuses.map((status) => (
                    <Dropdown.Item key={status} as="div">
                      <Form.Check
                        type="checkbox"
                        label={status}
                        checked={filters.sector_status.includes(status)}
                        onChange={() => handleMultiSelectChange("sector_status", status)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={2}>
              <Form.Label>{t("Start Date", "आरंभ तिथि")}</Form.Label>
              <Form.Control type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
            </Col>
            <Col md={2}>
              <Form.Label>{t("End Date", "समाप्ति तिथि")}</Form.Label>
              <Form.Control type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ district: [], project: [], sector: [], food_item: [], awc_type: [], bene_category: [], sector_status: [], startDate: '', endDate: '' })} className="me-2">
                {t("Clear Filters", "फ़िल्टर हटाएँ")}
              </Button>
            </Col>
          </Row>

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <Card className="shadow-sm">
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-4 text-muted">{t("No HCM distributions found.", "कोई HCM वितरण नहीं मिला।")}</div>
            ) : (
              <div className="table-responsive">
                <Table 
                  striped 
                  bordered 
                  hover 
                  responsive 
                  className="mb-0 bg-white" 
                  ref={tableRef}
                  style={{ border: '1px solid #dee2e6' }}
                >
                  <thead>
                    <tr>
                      {visibleColumns.map((col) => <th key={`th-${col.dataField}`}>{translateLabel(col.text)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? currentItems.map((row, index) => (
                      <tr key={`row-${row.id ?? `${row.awc_code}-${row.date}-${index}`}`}>
                        {visibleColumns.map((col) => {
                          let cellContent;
                          if (col.dataField === "#") {
                            cellContent = indexOfFirst + index + 1;
                          } else if (col.dataField === "date") {
                            cellContent = formatDistributionDate(getDistributionDateRaw(row));
                          } else if (col.dataField === "months") {
                            cellContent = formatMonths(row);
                          } else if (col.dataField === "trimester") {
                            cellContent = formatTrimester(row);
                          } else if (col.dataField === "sector_status") {
                            const status = row.sector_status || "pending";
                            const variant = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
                            cellContent = <Badge bg={variant}>{status}</Badge>;
                          } else {
                            cellContent = row[col.dataField] ?? "";
                          }
                          return <td key={`td-${row.id ?? index}-${col.dataField}`}>{cellContent}</td>;
                        })}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={visibleColumns.length} className="text-center">{t("No data available", "कोई डेटा उपलब्ध नहीं")}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      {visibleColumns.map((col) => {
                        let cellContent = '';
                        if (col.dataField === '#') {
                          cellContent = <strong>{t("Total", "कुल")}</strong>;
                        } else if (col.dataField === "total_beneficiaries") {
                          cellContent = <strong>{totals.beneficiaries}</strong>;
                        } else if (col.dataField === 'quantity') {
                              cellContent = (
                                <>
                                  {!isPrinting && (
                                    <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                      View Total
                                    </Button>
                                  )}
                                </>
                              );
                        }
                        return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                      })}
                    </tr>
                  </tfoot>
                </Table>
                {renderPagination()}
              </div>
            )}
          </Card>
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएँ/छिपाएँ")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={translateLabel(col.text)}
                checked={col.visible}
                onChange={() => handleColumnToggle(index)}
              />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>
              {t("Close", "बंद करें")}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQtyModal} onHide={() => setShowQtyModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t("Quantity Breakdown by Unit", "इकाई के अनुसार मात्रा विवरण")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>{t("Unit", "इकाई")}</th>
                  <th>{t("Total Quantity", "कुल मात्रा")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals.quantityByUnit).map(([unit, qty]) => (
                  <tr key={unit}>
                    <td>{unit}</td>
                    <td>{qty.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default HcmDpoDistributions;