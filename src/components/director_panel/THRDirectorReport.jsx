import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf"; import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const monthLabels = {
  apr: 'April',
  may: 'May',
  jun: 'June',
  jul: 'July',
  aug: 'August',
  sep: 'September',
  oct: 'October',
  nov: 'November',
  dec: 'December',
  jan: 'January',
  feb: 'February',
  mar: 'March',
};

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'],
  'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'],
  'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const fieldAliases = {
  district: ["district", "district_name", "districtName"],
  project: ["project", "project_name", "projectName"],
  sector: ["sector", "sector_name", "sectorName"],
  awc_name: ["awc_name", "awcName", "anganwadi_name", "anganwadiName"],
  awc_code: ["awc_code", "awcCode", "anganwadi_code", "anganwadiCode"],
  awc_type: ["awc_type", "awcType", "anganwadi_type", "anganwadiType"],
  food_item: ["food_item", "foodItem", "food_item_name", "foodItemName"],
  bene_category: ["bene_category", "beneCategory", "beneficiary_category", "beneficiaryCategory"],
  days_allotted: ["days_allotted", "daysAllotted", "allotted_days", "allottedDays"],
  fin_year: ["fin_year", "finYear", "financial_year", "financialYear"],
  months: ["months", "month", "allotted_months", "allottedMonths", "distribution_months", "distributionMonths", "month_name", "monthName", "months_allotted", "monthsAllotted", "allocation_months", "allocationMonths"],
  trimester: ["trimester", "trimester_name", "trimesterName", "quarter", "quarter_name", "quarterName", "quarter_months", "quarterMonths", "distribution_quarter", "distributionQuarter", "allocation_trimester", "allocationTrimester"],
  total_beneficiaries: ["total_beneficiaries", "totalBeneficiaries", "beneficiaries", "beneficiary_count", "beneficiaryCount"],
  quantity: ["quantity", "total_quantity", "totalQuantity", "qty", "distributed_quantity", "distributedQuantity"],
  unit: ["unit", "quantity_unit", "quantityUnit"],
  anganwadi_remark: ["anganwadi_remark", "anganwadiRemark", "awc_remark", "awcRemark", "remark", "remarks"],
  sector_status: ["sector_status", "sectorStatus", "status"],
  cdpo_status: ["cdpo_status", "cdpoStatus", "project_status", "projectStatus"],
  sector_remark: ["sector_remark", "sectorRemark", "supervisor_remark", "supervisorRemark"],
};

const getField = (row, field) => firstValue(row, fieldAliases[field] || [field]);

const getMonthsRaw = (row) => getField(row, "months") || getField(row, "trimester");

const formatMonthsValue = (value) => {
  const names = {
    apr: 'April', april: 'April', may: 'May', jun: 'June', june: 'June',
    jul: 'July', july: 'July', aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October', nov: 'November', november: 'November',
    dec: 'December', december: 'December', jan: 'January', january: 'January',
    feb: 'February', february: 'February', mar: 'March', march: 'March'
  };
  const quarters = {
    'apr-may-jun': ['April', 'May', 'June'], 'april-may-june': ['April', 'May', 'June'],
    'jul-aug-sep': ['July', 'August', 'September'], 'july-august-september': ['July', 'August', 'September'],
    'oct-nov-dec': ['October', 'November', 'December'], 'october-november-december': ['October', 'November', 'December'],
    'jan-feb-mar': ['January', 'February', 'March'], 'january-february-march': ['January', 'February', 'March']
  };
  if (Array.isArray(value)) return value.map(m => names[String(m).trim().toLowerCase()] || m).join(', ');
  const token = String(value ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (quarters[token]) return quarters[token].join(', ');
  const parts = token.split(/[,-/]+/).filter(Boolean);
  if (parts.length > 1) return parts.map(m => names[m] || m).join(', ');
  return names[token] || value || '-';
};

const formatMonths = (rowOrValue) => {
  if (rowOrValue && typeof rowOrValue === 'object' && !Array.isArray(rowOrValue)) {
    return formatMonthsValue(getMonthsRaw(rowOrValue));
  }
  return formatMonthsValue(rowOrValue);
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
const statusBadgeClass = (value) => {
  const status = normalizeStatus(value);
  if (status === 'approved' || status === 'accepted') return 'success';
  if (status === 'rejected' || status === 'declined') return 'danger';
  return 'warning';
};

const THRDirectorReport = () => {
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
    finYear: [], //
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    sector_status: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const initialColumns = [
    { dataField: '#', text: '#', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'fin_year', text: 'Fin. Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'trimester', text: 'Trimester', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'anganwadi_remark', text: 'Anganwadi Remark', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'sector_remark', text: 'Sector Remark', visible: true }
  ];

  const [columns, setColumns] = useState(initialColumns);
  const localizedColumns = columns.map((column) => ({
    ...column,
    text: t(column.text, ({
      District: "ज़िला", Project: "परियोजना", Sector: "सेक्टर",
      "AWC Name": "आंगनवाड़ी केंद्र का नाम", "AWC Code": "आंगनवाड़ी केंद्र कोड",
      "AWC Type": "आंगनवाड़ी केंद्र का प्रकार", "Food Item": "खाद्य सामग्री",
      "Beneficiary Category": "लाभार्थी श्रेणी", "Days Allotted": "आवंटित दिन",
      "Fin. Year": "वित्तीय वर्ष", Months: "महीने", Trimester: "त्रैमासिक अवधि",
      Beneficiaries: "लाभार्थी", Quantity: "मात्रा", Unit: "इकाई",
      "Anganwadi Remark": "आंगनवाड़ी केंद्र टिप्पणी", "Sector Status": "सेक्टर की स्थिति",
      "Sector Remark": "सेक्टर टिप्पणी",
    })[column.text] || column.text),
  }));
  const tableRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-director-distributions/");
      const raw = response.data?.data || response.data || [];
      const data = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setReportData(data);
      setUniqueFinYears([...new Set(data.map(item => getField(item, 'fin_year')).filter(Boolean))].sort().reverse());
      const allMonths = data.flatMap(item => formatMonths(item).split(', ').filter(m => m && m !== '-'));
      const monthOrder = Object.values(monthLabels);
      setUniqueMonths([...new Set(allMonths)].sort((a, b) => {
        const ai = monthOrder.indexOf(a); const bi = monthOrder.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      }));
      setUniqueDistricts([...new Set(data.map(item => getField(item, 'district')).filter(Boolean))]);
      setUniqueProjects([...new Set(data.map(item => getField(item, 'project')).filter(Boolean))]);
      setUniqueSectors([...new Set(data.map(item => getField(item, 'sector')).filter(Boolean))]);
      setUniqueFoodItems([...new Set(data.map(item => getField(item, 'food_item')).filter(Boolean))]);
      setUniqueBeneCategories([...new Set(data.map(item => getField(item, 'bene_category')).filter(Boolean))]);
      setUniqueSectorStatuses([...new Set(data.map(item => getField(item, 'sector_status')).filter(Boolean))]);
    } catch (err) {
      setError(t("Failed to fetch THR report data.", "टीएचआर रिपोर्ट डेटा प्राप्त नहीं हो सका।"));
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
    if (filters.finYear.length) data = data.filter(item => filters.finYear.includes(getField(item, 'fin_year')));
    if (filters.months.length) {
      data = data.filter(item => filters.months.some(month => formatMonths(item).split(', ').includes(month)));
    }
    if (filters.district.length) data = data.filter(item => filters.district.includes(getField(item, 'district')));
    if (filters.project.length) data = data.filter(item => filters.project.includes(getField(item, 'project')));
    if (filters.sector.length) data = data.filter(item => filters.sector.includes(getField(item, 'sector')));
    if (filters.food_item.length) data = data.filter(item => filters.food_item.includes(getField(item, 'food_item')));
    if (filters.bene_category.length) data = data.filter(item => filters.bene_category.includes(getField(item, 'bene_category')));
    if (filters.sector_status.length) data = data.filter(item => filters.sector_status.includes(getField(item, 'sector_status')));
    setFilteredData(data);
    setCurrentPage(1);
  }, [filters, reportData]);

  // const handleFilterChange = (e) => {
  //   setFilters({ ...filters, [e.target.name]: e.target.value });
  // };

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
      acc.beneficiaries += Number(getField(item, 'total_beneficiaries')) || 0;
      const unit = getField(item, 'unit') || 'N/A';
      const quantity = parseFloat(getField(item, 'quantity')) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      acc.quantity += quantity;
      return acc;
    }, {
      beneficiaries: 0,
      quantityByUnit: {},
      quantity: 0
    });
  }, [filteredData]);

  const exportToPDF = async () => {
    if (!filteredData.length) {
      window.alert(t("No data available to export.", "निर्यात के लिए कोई डेटा उपलब्ध नहीं है।"));
      return;
    }

    setIsPrinting(true);
    let exportContainer;

    try {
      const visibleColumns = localizedColumns.filter(col => col.visible);
      const escapeHtml = (value) => String(value ?? "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      const getExportValue = (row, col) => {
        if (col.dataField === "#") return "";
        if (col.dataField === "months") return formatMonths(row);
        if (col.dataField === "trimester") return formatMonths(getField(row, "trimester"));
        return getField(row, col.dataField);
      };

      exportContainer = document.createElement("div");
      Object.assign(exportContainer.style, {
        position: "fixed",
        left: "-100000px",
        top: "0",
        width: "1800px",
        padding: "18px",
        background: "#ffffff",
        color: "#111111",
        zIndex: "-1",
        fontFamily: "Arial, sans-serif"
      });

      const table = document.createElement("table");
      Object.assign(table.style, {
        width: "100%",
        borderCollapse: "collapse",
        tableLayout: "auto",
        fontSize: "10px",
        background: "#ffffff"
      });

      const title = document.createElement("h3");
      title.textContent = t("THR Distribution Report", "टीएचआर वितरण रिपोर्ट");
      Object.assign(title.style, { textAlign: "center", margin: "0 0 14px", fontSize: "18px" });
      exportContainer.appendChild(title);

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      visibleColumns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col.text;
        Object.assign(th.style, {
          border: "1px solid #b8c2cc",
          padding: "6px",
          background: "#e9eef3",
          fontWeight: "bold",
          textAlign: "left",
          verticalAlign: "top",
          overflowWrap: "anywhere"
        });
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      filteredData.forEach((row, index) => {
        const tr = document.createElement("tr");
        visibleColumns.forEach(col => {
          const td = document.createElement("td");
          let value;
          if (col.dataField === "#") value = index + 1;
          else value = getExportValue(row, col);
          td.textContent = value === "" || value === null || value === undefined ? "-" : String(value);
          Object.assign(td.style, {
            border: "1px solid #cbd2d9",
            padding: "5px",
            verticalAlign: "top",
            overflowWrap: "anywhere",
            wordBreak: "break-word"
          });
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      const beneficiaryIndex = visibleColumns.findIndex(col => col.dataField === "total_beneficiaries");
      const totalRow = document.createElement("tr");
      visibleColumns.forEach((col, index) => {
        const td = document.createElement("td");
        if (index === 0) td.textContent = t("Total", "कुल");
        else if (col.dataField === "total_beneficiaries") td.textContent = String(totals.beneficiaries);
        else td.textContent = "";
        Object.assign(td.style, {
          border: "1px solid #aab5c0",
          padding: "6px",
          background: "#dcecf5",
          fontWeight: "bold"
        });
        totalRow.appendChild(td);
      });
      // Keep the Total label aligned with the existing report footer, including if the
      // beneficiary column is hidden or moved by the user.
      if (beneficiaryIndex > 0 && visibleColumns[0]?.dataField !== "#") {
        totalRow.cells[0].textContent = t("Total", "कुल");
      }
      const tfoot = document.createElement("tfoot");
      tfoot.appendChild(totalRow);
      table.appendChild(tfoot);

      exportContainer.appendChild(table);
      document.body.appendChild(exportContainer);

      const canvas = await html2canvas(exportContainer, {
        scale: 1.1,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      const imageData = canvas.toDataURL("image/jpeg", 0.62);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a3",
        compress: true,
        putOnlyUsedFonts: true
      });

      const margin = 18;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;
      const availableHeight = pageHeight - margin * 2;
      const sliceHeight = Math.floor((canvas.width * availableHeight) / renderWidth);

      let sourceY = 0;
      while (sourceY < canvas.height) {
        if (sourceY > 0) pdf.addPage();
        const currentSliceHeight = Math.min(sliceHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = currentSliceHeight;
        const context = pageCanvas.getContext("2d");
        context.drawImage(
          canvas,
          0, sourceY, canvas.width, currentSliceHeight,
          0, 0, canvas.width, currentSliceHeight
        );
        const pageImage = pageCanvas.toDataURL("image/jpeg", 0.62);
        const pageImageHeight = (currentSliceHeight * renderWidth) / canvas.width;
        pdf.addImage(pageImage, "JPEG", margin, margin, renderWidth, pageImageHeight, undefined, "FAST");
        sourceY += currentSliceHeight;
      }

      pdf.save("thr_director_report.pdf");
    } catch (err) {
      console.error("Failed to export THR report PDF:", err);
      window.alert(t("Unable to export PDF. Please try again.", "पीडीएफ निर्यात नहीं हो सकी। कृपया पुनः प्रयास करें।"));
    } finally {
      if (exportContainer?.parentNode) exportContainer.parentNode.removeChild(exportContainer);
      setIsPrinting(false);
    }
  };

  const exportToExcel = () => {
    const visibleColumns = localizedColumns.filter(col => col.visible);
    const dataToExport = filteredData.map((row, index) => {
      const newRow = {};
      visibleColumns.forEach(col => {
        if (col.dataField === "#") newRow[col.text] = index + 1;
        else if (col.dataField === "months") newRow[col.text] = formatMonths(row);
        else if (col.dataField === "trimester") newRow[col.text] = formatMonths(getField(row, "trimester"));
        else newRow[col.text] = getField(row, col.dataField) ?? "";
      });
      return newRow;
    });

    const totalRow = {};
    visibleColumns.forEach((col, index) => {
      if (index === 0) totalRow[col.text] = t("Total", "कुल");
      else if (col.dataField === "total_beneficiaries") totalRow[col.text] = totals.beneficiaries;
      else totalRow[col.text] = "";
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, {
      header: visibleColumns.map(col => col.text)
    });
    worksheet["!cols"] = visibleColumns.map(col => ({
      wch: Math.min(Math.max(String(col.text).length + 4, 12), 32)
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Report");
    XLSX.writeFile(workbook, "thr_director_report.xlsx", { compression: true });
  };

  // Pagination logic
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
            <h3 className="mb-0">{t("THR Distribution Report", "टीएचआर वितरण रिपोर्ट")}</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                <FaFilePdf className="me-1" /> {t("Export PDF", "पीडीएफ निर्यात करें")}
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel}>
                <FaFileExcel className="me-1" /> {t("Export Excel", "एक्सेल निर्यात करें")}
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)} className="ms-2">
                <FaEye className="me-1" /> {t("Column Visibility", "कॉलम दृश्यता")}
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-finyear" className="w-100">
                  {filters.finYear.length ? t(`${filters.finYear.length} years selected`, `${filters.finYear.length} वर्ष चयनित`) : t('All Fin. Years', 'सभी वित्तीय वर्ष')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFinYears.map(year => (
                    <Dropdown.Item key={year} as="div">
                      <Form.Check type="checkbox" label={year} checked={filters.finYear.includes(year)} onChange={() => handleMultiSelectChange('finYear', year)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-months" className="w-100">
                  {filters.months.length ? t(`${filters.months.length} months selected`, `${filters.months.length} महीने चयनित`) : t('All Months', 'सभी महीने')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueMonths.map(m => (
                    <Dropdown.Item key={m} as="div">
                      <Form.Check type="checkbox" label={m} checked={filters.months.includes(m)} onChange={() => handleMultiSelectChange('months', m)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district" className="w-100">
                  {filters.district.length ? t(`${filters.district.length} districts selected`, `${filters.district.length} ज़िले चयनित`) : t('All Districts', 'सभी ज़िले')}
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
                  {filters.project.length ? t(`${filters.project.length} projects selected`, `${filters.project.length} परियोजनाएँ चयनित`) : t('All Projects', 'सभी परियोजनाएँ')}
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
                  {filters.sector.length ? t(`${filters.sector.length} sectors selected`, `${filters.sector.length} सेक्टर चयनित`) : t('All Sectors', 'सभी सेक्टर')}
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
                  {filters.food_item.length ? t(`${filters.food_item.length} items selected`, `${filters.food_item.length} खाद्य सामग्री चयनित`) : t('All Food Items', 'सभी खाद्य सामग्री')}
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
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? t(`${filters.bene_category.length} categories selected`, `${filters.bene_category.length} श्रेणियाँ चयनित`) : t('All Bene. Categories', 'सभी लाभार्थी श्रेणियाँ')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (
                    <Dropdown.Item key={cat} as="div">
                      <Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status" className="w-100">
                  {filters.sector_status.length ? t(`${filters.sector_status.length} selected`, `${filters.sector_status.length} चयनित`) : t('All Sector Status', 'सभी सेक्टर स्थितियाँ')}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectorStatuses.map(status => (
                    <Dropdown.Item key={status} as="div">
                      <Form.Check type="checkbox" label={status} checked={filters.sector_status.includes(status)} onChange={() => handleMultiSelectChange('sector_status', status)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ finYear: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [], sector_status: [] })}>{t("Clear Filters", "फ़िल्टर साफ़ करें")}</Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              <Table striped bordered hover responsive className="bg-white" ref={tableRef} style={{ border: '1px solid #dee2e6' }}>
                <thead>
                  <tr>
                    {localizedColumns.map((col, index) => col.visible && (
                      <th key={index}>
                        {col.dataField === 'bene_category' ? (
                          <div className="bene-category-cell" style={{ width: '150px' }}>{col.text}</div>
                        ) : col.text}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? currentItems.map((row, index) => (
                    <tr key={row.id}>
                      {columns.map((col, i) => {
                        if (!col.visible) return null;
                        let cellContent;
                        switch (col.dataField) {
                          case '#':
                            cellContent = indexOfFirstItem + index + 1;
                            break;
                          case 'bene_category':
                            cellContent = (
                              <div className="bene-category-cell" style={{ width: '150px' }}>
                                {row[col.dataField]}
                              </div>
                            );
                            break;
                          case 'months':
                            cellContent = formatMonths(row);
                            break;
                          case 'sector_status': {
                            const status = getField(row, col.dataField);
                            cellContent = isPrinting || !status
                              ? (status || '-')
                              : <span className={`badge bg-${statusBadgeClass(status)}`}>{status}</span>;
                            break;
                          }
                          case 'trimester':
                            cellContent = formatMonths(getField(row, 'trimester'));
                            break;
                          default:
                            cellContent = getField(row, col.dataField) || '-';
                        }
                        return <td key={i}>{cellContent}</td>;
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={columns.filter(c => c.visible).length} className="text-center">{t("No data available", "कोई डेटा उपलब्ध नहीं है")}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={localizedColumns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')}>{t("Total", "कुल")}</td>
                    {localizedColumns.filter(c => c.visible).slice(localizedColumns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')).map(col => {
                      if (col.dataField === 'total_beneficiaries') {
                        return <td key="total_beneficiaries">{totals.beneficiaries}</td>;
                      }
                      if (col.dataField === 'quantity') {
                        return <td key="total_quantity">
                          {!isPrinting && (
                            <Button variant="link" size="sm" onClick={() => setShowQuantityModal(true)}>
                              {t("View Totals", "कुल देखें")}
                            </Button>
                          )}
                        </td>;
                      }
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
              </Table>
              {totalPages > 1 && (
                <Pagination className="justify-content-end">
                  {paginationItems}
                </Pagination>
              )}
            </>
          )}
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएँ/छिपाएँ")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {localizedColumns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={col.text}
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

export default THRDirectorReport;