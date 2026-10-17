import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown, Badge } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

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
  if (Number.isNaN(date.getTime())) return raw;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const getMonthsRaw = (row) => firstValue(row, [
  "months", "month", "allotted_months", "allottedMonths", "distribution_months",
  "distributionMonths", "month_name", "monthName", "months_allotted", "monthsAllotted",
  "allocation_months", "allocationMonths"
]);

const getTrimesterRaw = (row) => firstValue(row, [
  "trimester", "trimester_name", "trimesterName", "quarter", "quarter_name", "quarterName",
  "quarter_months", "quarterMonths", "distribution_quarter", "distributionQuarter",
  "allocation_trimester", "allocationTrimester"
]);

const formatMonthsValue = (value) => {
  const names = {
    apr: "April", april: "April", may: "May", jun: "June", june: "June",
    jul: "July", july: "July", aug: "August", august: "August",
    sep: "September", sept: "September", september: "September", oct: "October", october: "October",
    nov: "November", november: "November", dec: "December", december: "December",
    jan: "January", january: "January", feb: "February", february: "February", mar: "March", march: "March"
  };
  const quarterMap = {
    "apr-may-jun": ["April", "May", "June"], "april-may-june": ["April", "May", "June"],
    "jul-aug-sep": ["July", "August", "September"], "july-august-september": ["July", "August", "September"],
    "oct-nov-dec": ["October", "November", "December"], "october-november-december": ["October", "November", "December"],
    "jan-feb-mar": ["January", "February", "March"], "january-february-march": ["January", "February", "March"]
  };
  if (Array.isArray(value)) return value.map(v => names[String(v).trim().toLowerCase()] || v).join(", ");
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const token = raw.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (quarterMap[token]) return quarterMap[token].join(", ");
  const parts = token.split(/[,-/|]+/).filter(Boolean);
  if (parts.length > 1) return parts.map(v => names[v] || v).join(", ");
  return names[token] || raw;
};

const formatMonths = (row) => {
  const months = getMonthsRaw(row);
  return formatMonthsValue(months !== "" ? months : getTrimesterRaw(row));
};

const normalizeTrimesterKey = (row) => {
  const raw = getTrimesterRaw(row) || getMonthsRaw(row);
  const token = (Array.isArray(raw) ? raw.join("-") : String(raw ?? ""))
    .trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  const aliases = {
    "april-may-june": "apr-may-jun", "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec", "january-february-march": "jan-feb-mar"
  };
  const normalized = aliases[token] || token;
  const groups = {
    "apr-may-jun": ["apr", "may", "jun"], "jul-aug-sep": ["jul", "aug", "sep"],
    "oct-nov-dec": ["oct", "nov", "dec"], "jan-feb-mar": ["jan", "feb", "mar"]
  };
  if (groups[normalized]) return normalized;
  const monthAliases = { april: "apr", june: "jun", july: "jul", august: "aug", september: "sep", october: "oct", november: "nov", december: "dec", january: "jan", february: "feb", march: "mar" };
  const parts = normalized.split(/[,-/|]+/).filter(Boolean).map(m => monthAliases[m] || m);
  for (const [key, months] of Object.entries(groups)) if (months.every(m => parts.includes(m))) return key;
  return normalized || "-";
};

const formatTrimester = (row) => ({
  "apr-may-jun": "Apr-May-Jun", "jul-aug-sep": "Jul-Aug-Sep",
  "oct-nov-dec": "Oct-Nov-Dec", "jan-feb-mar": "Jan-Feb-Mar"
})[normalizeTrimesterKey(row)] || normalizeTrimesterKey(row);

const getFieldValue = (row, field) => {
  const aliases = {
    awc_name: ["awc_name", "awcName", "anganwadi_name", "anganwadiName"],
    awc_code: ["awc_code", "awcCode", "anganwadi_code", "anganwadiCode"],
    awc_type: ["awc_type", "awcType", "type_of_awc", "typeOfAwc"],
    days_allotted: ["days_allotted", "daysAllotted", "allotted_days", "allottedDays"],
    fin_year: ["fin_year", "finYear", "financial_year", "financialYear"],
    total_beneficiaries: ["total_beneficiaries", "totalBeneficiaries", "beneficiaries", "beneficiary_count"],
    quantity: ["quantity", "total_quantity", "totalQuantity", "qty"],
    anganwadi_remark: ["anganwadi_remark", "anganwadiRemark", "awc_remark", "awcRemark", "remark"],
    sector_status: ["sector_status", "sectorStatus", "status"],
    sector_remark: ["sector_remark", "sectorRemark"],
    bene_category: ["bene_category", "beneCategory", "beneficiary_category", "beneficiaryCategory"],
    food_item: ["food_item", "foodItem"],
    sector: ["sector", "sector_name", "sectorName"],
    project: ["project", "project_name", "projectName"],
    district: ["district", "district_name", "districtName"],
    unit: ["unit", "quantity_unit", "quantityUnit"]
  };
  if (field === "date") return getDistributionDateRaw(row);
  if (field === "months") return formatMonths(row);
  if (field === "trimester") return formatTrimester(row);
  return firstValue(row, aliases[field] || [field]);
};

const HCMDirectorReport = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  const { api } = useAuth();
  const { t } = useLanguage();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    awc_type: [],
    sector_status: [],
  });
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [uniqueAwcTypes, setUniqueAwcTypes] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const initialColumns = [
    { dataField: '#', text: '#', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'date', text: 'Date', visible: true },
    { dataField: 'fin_year', text: 'Fin Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'trimester', text: 'Trimester', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'anganwadi_remark', text: 'Anganwadi Remark', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'sector_remark', text: 'Sector Remark', visible: false },
  ];

  const [columns, setColumns] = useState(initialColumns);
  const columnLabels = {
    awc_name: ["AWC Name", "आंगनवाड़ी केंद्र का नाम"],
    awc_code: ["AWC Code", "आंगनवाड़ी केंद्र कोड"],
    awc_type: ["AWC Type", "आंगनवाड़ी केंद्र का प्रकार"],
    sector: ["Sector", "सेक्टर"], project: ["Project", "परियोजना"],
    district: ["District", "ज़िला"], food_item: ["Food Item", "खाद्य सामग्री"],
    days_allotted: ["Days Allotted", "आवंटित दिन"],
    bene_category: ["Beneficiary Category", "लाभार्थी श्रेणी"],
    date: ["Date", "तिथि"], fin_year: ["Fin Year", "वित्तीय वर्ष"],
    months: ["Months", "महीने"], trimester: ["Trimester", "त्रैमासिक अवधि"],
    total_beneficiaries: ["Beneficiaries", "लाभार्थी"],
    quantity: ["Qty", "मात्रा"], unit: ["Unit", "इकाई"],
    anganwadi_remark: ["Anganwadi Remark", "आंगनवाड़ी केंद्र टिप्पणी"],
    sector_status: ["Sector Status", "सेक्टर की स्थिति"],
    sector_remark: ["Sector Remark", "सेक्टर टिप्पणी"],
  };
  const localizedColumns = columns.map((column) => ({
    ...column,
    text: columnLabels[column.dataField] ? t(...columnLabels[column.dataField]) : column.text,
  }));
  const tableRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hcm-director-distributions/");
      const data = response.data.data || [];
      setReportData(data);
      setUniqueDistricts([...new Set(data.map((item) => getFieldValue(item, 'district')).filter(Boolean))]);
      setUniqueProjects([...new Set(data.map((item) => getFieldValue(item, 'project')).filter(Boolean))]);
      setUniqueSectors([...new Set(data.map((item) => getFieldValue(item, 'sector')).filter(Boolean))]);
      setUniqueFoodItems([...new Set(data.map((item) => getFieldValue(item, 'food_item')).filter(Boolean))]);
      setUniqueBeneCategories([...new Set(data.map((item) => getFieldValue(item, 'bene_category')).filter(Boolean))]);
      setUniqueAwcTypes([...new Set(data.map((item) => getFieldValue(item, 'awc_type')).filter(Boolean))]);
      setUniqueSectorStatuses([...new Set(data.map((item) => getFieldValue(item, 'sector_status')).filter(Boolean))]);
    } catch (err) {
      setError(t("Failed to fetch HCM report data.", "एचसीएम रिपोर्ट डेटा प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    fetchData();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  useEffect(() => {
    let data = [...reportData];
    const { startDate, endDate, district, project, sector, food_item, bene_category, awc_type, sector_status } = filters;
    data = data.filter(item => {
      const rawDate = getDistributionDateRaw(item);
      const itemDate = rawDate ? new Date(rawDate) : null;
      const matchesStart = !startDate || (itemDate && !Number.isNaN(itemDate.getTime()) && itemDate >= new Date(`${startDate}T00:00:00`));
      const matchesEnd = !endDate || (itemDate && !Number.isNaN(itemDate.getTime()) && itemDate <= new Date(`${endDate}T23:59:59`));
      return matchesStart && matchesEnd &&
        (!district.length || district.includes(getFieldValue(item, 'district'))) &&
        (!project.length || project.includes(getFieldValue(item, 'project'))) &&
        (!sector.length || sector.includes(getFieldValue(item, 'sector'))) &&
        (!food_item.length || food_item.includes(getFieldValue(item, 'food_item'))) &&
        (!bene_category.length || bene_category.includes(getFieldValue(item, 'bene_category'))) &&
        (!awc_type.length || awc_type.includes(getFieldValue(item, 'awc_type'))) &&
        (!sector_status.length || sector_status.includes(getFieldValue(item, 'sector_status')));
    });
    setFilteredData(data);
    setCurrentPage(1);
  }, [filters, reportData]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

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

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
      acc.beneficiaries += Number(getFieldValue(item, 'total_beneficiaries')) || 0;
      const unit = getFieldValue(item, 'unit') || 'N/A';
      const quantity = parseFloat(getFieldValue(item, 'quantity')) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      return acc;
    }, {
      beneficiaries: 0,
      quantityByUnit: {}
    });
  }, [filteredData]);

  const exportToPDF = async () => {
    if (!filteredData.length) {
      setError(t("No data available to export.", "निर्यात के लिए कोई डेटा उपलब्ध नहीं है।"));
      return;
    }

    setIsPrinting(true);
    const exportColumns = localizedColumns.filter(col => col.visible);
    const exportContainer = document.createElement("div");
    Object.assign(exportContainer.style, {
      position: "fixed",
      left: "-100000px",
      top: "0",
      width: "1600px",
      background: "#ffffff",
      color: "#212529",
      padding: "20px",
      zIndex: "-1",
      fontFamily: "Arial, sans-serif"
    });

    try {
      const title = document.createElement("h2");
      title.textContent = t("HCM Distribution Report", "एचसीएम वितरण रिपोर्ट");
      Object.assign(title.style, { textAlign: "center", margin: "0 0 16px", fontSize: "20px" });
      exportContainer.appendChild(title);

      const table = document.createElement("table");
      Object.assign(table.style, {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "auto",
        fontSize: "11px",
        background: "#ffffff"
      });

      const makeCell = (tag, value, isHeader = false) => {
        const cell = document.createElement(tag);
        cell.textContent = value === null || value === undefined || value === "" ? "-" : String(value);
        Object.assign(cell.style, {
          border: "1px solid #adb5bd",
          padding: "6px 7px",
          textAlign: "left",
          verticalAlign: "top",
          overflowWrap: "anywhere",
          whiteSpace: "normal",
          ...(isHeader ? { background: "#e9ecef", fontWeight: "bold" } : {})
        });
        return cell;
      };

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      exportColumns.forEach(col => headerRow.appendChild(makeCell("th", col.text, true)));
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      filteredData.forEach((row, index) => {
        const tr = document.createElement("tr");
        exportColumns.forEach(col => {
          let value;
          if (col.dataField === "#") value = index + 1;
          else if (col.dataField === "date") value = formatDistributionDate(getDistributionDateRaw(row));
          else if (col.dataField === "months") value = formatMonths(row);
          else if (col.dataField === "trimester") value = formatTrimester(row);
          else value = getFieldValue(row, col.dataField);
          tr.appendChild(makeCell("td", value));
        });
        tbody.appendChild(tr);
      });

      const totalRow = document.createElement("tr");
      totalRow.style.fontWeight = "bold";
      totalRow.style.background = "#dbeafe";
      exportColumns.forEach((col, index) => {
        let value = "";
        if (col.dataField === "total_beneficiaries") value = totals.beneficiaries;
        else if (index === 0) value = t("Total", "कुल");
        totalRow.appendChild(makeCell("td", value));
      });
      tbody.appendChild(totalRow);
      table.appendChild(tbody);
      exportContainer.appendChild(table);
      document.body.appendChild(exportContainer);

      const canvas = await html2canvas(exportContainer, {
        scale: 1.1,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a3",
        compress: true
      });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = pageHeight - margin * 2;
      const scaledCanvasHeight = canvas.height * (renderWidth / canvas.width);
      const pageCanvasHeight = renderHeight * (canvas.width / renderWidth);
      let sourceY = 0;
      let pageIndex = 0;

      while (sourceY < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sliceHeight);
        const context = pageCanvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0, Math.floor(sourceY), canvas.width, Math.ceil(sliceHeight),
          0, 0, canvas.width, Math.ceil(sliceHeight)
        );
        if (pageIndex > 0) pdf.addPage();
        const imageData = pageCanvas.toDataURL("image/jpeg", 0.68);
        const imageHeight = pageCanvas.height * (renderWidth / pageCanvas.width);
        pdf.addImage(imageData, "JPEG", margin, margin, renderWidth, Math.min(imageHeight, renderHeight), undefined, "FAST");
        sourceY += sliceHeight;
        pageIndex += 1;
      }

      pdf.save("hcm_director_report.pdf");
    } catch (err) {
      console.error("Failed to export HCM PDF:", err);
      setError(t("Failed to export PDF. Please try again.", "पीडीएफ निर्यात विफल हुआ। कृपया पुनः प्रयास करें।"));
    } finally {
      if (exportContainer.parentNode) exportContainer.parentNode.removeChild(exportContainer);
      setIsPrinting(false);
    }
  };

  const exportToExcel = () => {
    const visibleColumns = localizedColumns.filter(col => col.visible);
    const dataToExport = filteredData.map((row, index) => {
      const newRow = {};
      visibleColumns.forEach(col => {
        if (col.dataField === "#") newRow[col.text] = index + 1;
        else if (col.dataField === "date") newRow[col.text] = formatDistributionDate(getDistributionDateRaw(row));
        else if (col.dataField === "months") newRow[col.text] = formatMonths(row);
        else if (col.dataField === "trimester") newRow[col.text] = formatTrimester(row);
        else newRow[col.text] = getFieldValue(row, col.dataField) ?? "";
      });
      return newRow;
    });

    const totalRow = {};
    visibleColumns.forEach((col, index) => {
      if (col.dataField === "total_beneficiaries") totalRow[col.text] = totals.beneficiaries;
      else if (index === 0) totalRow[col.text] = t("Total", "कुल");
      else totalRow[col.text] = "";
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, {
      header: visibleColumns.map(col => col.text)
    });
    worksheet["!cols"] = visibleColumns.map(col => ({
      wch: Math.min(32, Math.max(12, String(col.text).length + 3))
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HCM Director Report");
    XLSX.writeFile(workbook, "hcm_director_report.xlsx", { compression: true });
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item key={number} active={number === currentPage} onClick={() => paginate(number)}>
        {number}
      </Pagination.Item>,
    );
  }

  return (
    <div className="dashboard-container">
      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">{t("HCM Distribution Report", "एचसीएम वितरण रिपोर्ट")}</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf className="me-1" /> {t("Export PDF", "पीडीएफ निर्यात करें")}</Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel}><FaFileExcel className="me-1" /> {t("Export Excel", "एक्सेल निर्यात करें")}</Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)} className="ms-2"><FaEye className="me-1" /> {t("Column Visibility", "कॉलम दृश्यता")}</Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col md={2}><Form.Control type="date" name="startDate" aria-label={t("Start Date", "आरंभ तिथि")} onChange={handleFilterChange} value={filters.startDate} /></Col>
            <Col md={2}><Form.Control type="date" name="endDate" aria-label={t("End Date", "अंतिम तिथि")} onChange={handleFilterChange} value={filters.endDate} /></Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district-hcm" className="w-100">
                  {filters.district.length ? t(`${filters.district.length} districts selected`, `${filters.district.length} ज़िले चयनित`) : t('All Districts', 'सभी ज़िले')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDistricts.map(d => (<Dropdown.Item key={d} as="div"><Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-project-hcm" className="w-100">
                  {filters.project.length ? t(`${filters.project.length} projects selected`, `${filters.project.length} परियोजनाएँ चयनित`) : t('All Projects', 'सभी परियोजनाएँ')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueProjects.map(p => (<Dropdown.Item key={p} as="div"><Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-hcm" className="w-100">
                  {filters.sector.length ? t(`${filters.sector.length} sectors selected`, `${filters.sector.length} सेक्टर चयनित`) : t('All Sectors', 'सभी सेक्टर')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectors.map(s => (<Dropdown.Item key={s} as="div"><Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-food-item-hcm" className="w-100">
                  {filters.food_item.length ? t(`${filters.food_item.length} items selected`, `${filters.food_item.length} खाद्य सामग्री चयनित`) : t('All Food Items', 'सभी खाद्य सामग्री')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFoodItems.map(item => (<Dropdown.Item key={item} as="div"><Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category-hcm" className="w-100">
                  {filters.bene_category.length ? t(`${filters.bene_category.length} categories selected`, `${filters.bene_category.length} श्रेणियाँ चयनित`) : t('All Bene. Categories', 'सभी लाभार्थी श्रेणियाँ')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (<Dropdown.Item key={cat} as="div"><Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-awc-type-hcm" className="w-100">
                  {filters.awc_type.length ? t(`${filters.awc_type.length} types selected`, `${filters.awc_type.length} प्रकार चयनित`) : t('All AWC Types', 'सभी आंगनवाड़ी केंद्र प्रकार')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueAwcTypes.map(type => <Dropdown.Item key={type} as="div"><Form.Check type="checkbox" label={type} checked={filters.awc_type.includes(type)} onChange={() => handleMultiSelectChange('awc_type', type)} /></Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status-hcm" className="w-100">
                  {filters.sector_status.length ? t(`${filters.sector_status.length} statuses selected`, `${filters.sector_status.length} स्थितियाँ चयनित`) : t('All Sector Statuses', 'सभी सेक्टर स्थितियाँ')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectorStatuses.map(status => <Dropdown.Item key={status} as="div"><Form.Check type="checkbox" label={status} checked={filters.sector_status.includes(status)} onChange={() => handleMultiSelectChange('sector_status', status)} /></Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2 d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ startDate: '', endDate: '', district: [], project: [], sector: [], food_item: [], bene_category: [], awc_type: [], sector_status: [] })}>{t("Clear Filters", "फ़िल्टर साफ़ करें")}</Button>
            </Col>
          </Row>

          {loading ? <div className="text-center"><Spinner animation="border" /></div> : error ? <Alert variant="danger">{error}</Alert> : (
            <>
              <Table striped bordered hover responsive className="bg-white" ref={tableRef} style={{ border: '1px solid #dee2e6' }}>
                <thead>
                  <tr>
                    {localizedColumns.map((col, index) => col.visible && (
                      <th key={index}>
                        {col.dataField === 'food_item' ? (
                          <div className="food-item-cell" style={{ width: '180px' }}>{col.text}</div>
                        ) : col.dataField === 'bene_category' ? (
                          <div className="bene-category-cell" style={{ width: '150px' }}>{col.text}</div>
                        ) : col.text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? currentItems.map((row, index) => (
                    <tr key={row.id ?? `${getFieldValue(row, 'awc_code')}-${getDistributionDateRaw(row)}-${index}`}>
                      {columns.map((col, i) => {
                        if (!col.visible) return null;
                        let cellContent;
                        if (col.dataField === '#') {
                          cellContent = indexOfFirstItem + index + 1;
                        } else if (col.dataField === 'food_item') {
                          cellContent = <div className="food-item-cell" style={{ width: '180px' }}>{getFieldValue(row, col.dataField) || '-'}</div>;
                        } else if (col.dataField === 'bene_category') {
                          cellContent = <div className="bene-category-cell" style={{ width: '150px' }}>{getFieldValue(row, col.dataField) || '-'}</div>;
                        } else if (col.dataField === 'date') {
                          cellContent = formatDistributionDate(getDistributionDateRaw(row));
                        } else if (col.dataField === 'months') {
                          cellContent = formatMonths(row);
                        } else if (col.dataField === 'trimester') {
                          cellContent = formatTrimester(row);
                        } else if (col.dataField === 'sector_status') {
                          const status = getFieldValue(row, 'sector_status') || 'pending';
                          const normalizedStatus = String(status).toLowerCase();
                          const variant = normalizedStatus === 'approved' ? 'success' : normalizedStatus === 'rejected' ? 'danger' : 'warning';
                          cellContent = <Badge bg={variant}>{status}</Badge>;
                        } else {
                          const value = getFieldValue(row, col.dataField);
                          cellContent = value === '' || value === null || value === undefined ? '-' : value;
                        }
                        return <td key={i}>{cellContent}</td>
                      })}
                    </tr>
                  )) : <tr><td colSpan={columns.filter(c => c.visible).length} className="text-center">{t("No data available", "कोई डेटा उपलब्ध नहीं है")}</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={localizedColumns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')}>{t("Total", "कुल")}</td>
                    {columns.filter(c => c.visible).slice(columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')).map(col => {
                      if (col.dataField === 'total_beneficiaries') {
                        return <td key="total_beneficiaries">{totals.beneficiaries}</td>;
                      }
                      if (col.dataField === 'quantity') {
                        return (
                          <td key="total_quantity">
                            {!isPrinting && <Button variant="link" size="sm" onClick={() => setShowQuantityModal(true)}>{t("View Totals", "कुल देखें")}</Button>}
                          </td>
                        );
                      }
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
              </Table>
              {totalPages > 1 && <Pagination className="justify-content-end">{paginationItems}</Pagination>}
            </>
          )}
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton><Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएँ/छिपाएँ")}</Modal.Title></Modal.Header>
          <Modal.Body>
            {localizedColumns.map((col, index) => (<Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />))}
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button></Modal.Footer>
        </Modal>

        <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{t("Total Quantity by Unit", "इकाई के अनुसार कुल मात्रा")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {Object.keys(totals.quantityByUnit).length > 0 ? (
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>{t("Unit", "इकाई")}</th>
                    <th>{t("Total Quantity", "कुल मात्रा")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.quantityByUnit).map(([unit, total]) => (
                    <tr key={unit}><td>{unit}</td><td>{total.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </Table>
            ) : <p>{t("No quantity data to display.", "दिखाने के लिए मात्रा डेटा उपलब्ध नहीं है।")}</p>}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default HCMDirectorReport;