import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container,
  Alert,
  Spinner,
  Card,
  Table,
  Row,
  Col,
  Pagination,
  Dropdown,
  Tabs,
  Button,
  Modal,
  Form,
  Tab,
} from "react-bootstrap";
import "../../assets/css/dpo.css";

import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import dpoHindi from "./DPOTranslations.json";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";

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

const firstAvailableValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const normalizeMonthToken = (value) => {
  const token = String(value ?? "").trim().toLowerCase().replace(/\./g, "");
  const aliases = {
    april: "apr", apr: "apr", may: "may", june: "jun", jun: "jun",
    july: "jul", jul: "jul", august: "aug", aug: "aug",
    september: "sep", sept: "sep", sep: "sep", october: "oct", oct: "oct",
    november: "nov", nov: "nov", december: "dec", dec: "dec",
    january: "jan", jan: "jan", february: "feb", feb: "feb",
    march: "mar", mar: "mar",
  };
  return aliases[token] || token;
};

const getTrimesterValue = (row) =>
  firstAvailableValue(row, [
    "quarter", "trimester", "trimester_name", "trimesterName",
    "quarter_name", "quarterName", "distribution_quarter", "distributionQuarter",
    "quarter_months", "quarterMonths", "trimester_months", "trimesterMonths",
  ]);

const getMonthArray = (row) => {
  const raw = firstAvailableValue(row, [
    "months", "month", "month_names", "monthNames", "allotted_months",
    "allottedMonths", "distribution_months", "distributionMonths",
  ]) || getTrimesterValue(row);

  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => {
      if (entry == null || entry === "") return [];
      const normalized = normalizeMonthToken(entry);
      if (quarterToMonths[normalized]) return quarterToMonths[normalized];
      return normalized.split(/[,\s/|]+/).filter(Boolean).map(normalizeMonthToken);
    }).filter(Boolean);
  }

  if (typeof raw === "number") return [];
  const text = String(raw ?? "").trim();
  if (!text) return [];

  const normalizedText = text.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (quarterToMonths[normalizedText]) return quarterToMonths[normalizedText];
  const quarterAliases = {
    "april-may-june": "apr-may-jun",
    "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec",
    "january-february-march": "jan-feb-mar",
  };
  if (quarterAliases[normalizedText]) return quarterToMonths[quarterAliases[normalizedText]];

  const parts = text.split(/[,\s/|]+|-(?=[A-Za-z])/).filter(Boolean);
  const parsed = parts.map(normalizeMonthToken).filter((part) => Object.prototype.hasOwnProperty.call(monthLabels, part));
  if (parsed.length) return parsed;

  const single = normalizeMonthToken(text);
  return Object.prototype.hasOwnProperty.call(monthLabels, single) ? [single] : [];
};

const formatRecordMonths = (row) => {
  const months = getMonthArray(row);
  return months.length ? [...new Set(months)].map((month) => monthLabels[month] || month).join(", ") : "-";
};

const formatRecordTrimester = (row) => {
  const raw = getTrimesterValue(row);
  if (raw && !Array.isArray(raw) && typeof raw === "string") {
    const token = raw.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
    const aliases = {
      "april-may-june": "apr-may-jun",
      "july-august-september": "jul-aug-sep",
      "october-november-december": "oct-nov-dec",
      "january-february-march": "jan-feb-mar",
    };
    const normalized = aliases[token] || token;
    if (quarterToMonths[normalized]) return quarterToMonths[normalized].map((m) => monthLabels[m]).join(" - ");
    if (raw.trim()) return raw;
  }
  const months = getMonthArray(row);
  if (months.length >= 3) {
    const monthSet = new Set(months);
    for (const [quarter, quarterMonths] of Object.entries(quarterToMonths)) {
      if (quarterMonths.every((month) => monthSet.has(month))) {
        return quarterMonths.map((month) => monthLabels[month]).join(" - ");
      }
    }
  }
  return "-";
};

const formatDateValue = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? raw
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const getRecordDate = (row) => firstAvailableValue(row, [
  "date", "distribution_date", "distributionDate", "received_date",
  "receivedDate", "created_at", "createdAt",
]);

const getCurrentMonth = (row) => firstAvailableValue(row, [
  "curr_month", "current_month", "currentMonth", "month_current", "monthCurrent",
]);

const getReceivingRowKey = (row) =>
  String(
    row?.id ??
    [
      row?.awc_code,
      row?.sector,
      row?.food_item,
      row?.bene_category,
      getRecordDate(row),
    ].map((value) => String(value ?? "").trim()).join("|")
  );


const DPOTHRReceiving = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [filters, setFilters] = useState({
    fin_year: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });

  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "awc_type", text: "AWC Type", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "actions", text: "Actions", visible: true }
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      setUniqueFinYears([...new Set(reports.map((item) => item.fin_year))]);
      const allMonths = reports.flatMap((item) => getMonthArray(item));
      setUniqueMonths([...new Set(allMonths)].map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)));
      setUniqueDistricts([...new Set(reports.map((item) => item.district))]);
      setUniqueProjects([...new Set(reports.map((item) => item.project))]);
      setUniqueSectors([...new Set(reports.map((item) => item.sector))]);
      setUniqueFoodItems([...new Set(reports.map((item) => item.food_item))]);
      setUniqueBeneCategories([...new Set(reports.map((item) => item.bene_category))]);
    }
  }, [reports]);

  const fetchBeneficiarySummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/dpo/thr-receiving-summary/`);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district: results.district,
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError(t("Failed to fetch THR receiving summary.", "THR प्राप्ति सारांश प्राप्त करने में विफल।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBeneficiarySummary();
  }, [fetchBeneficiarySummary]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return {
          ...prevFilters,
          [filterName]: currentValues.filter((v) => v !== value),
        };
      } else {
        return {
          ...prevFilters,
          [filterName]: [...currentValues, value],
        };
      }
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const { fin_year, months, district, project, sector, food_item, bene_category } = filters;
      const itemMonths = getMonthArray(item).map((m) => monthLabels[m] || m);
      const monthMatch = months.length === 0 || months.some(filterMonth => itemMonths.includes(filterMonth));

      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        monthMatch &&
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector)) &&
        (food_item.length === 0 || food_item.includes(item.food_item)) &&
        (bene_category.length === 0 || bene_category.includes(item.bene_category))
      );
    });
  }, [reports, filters]);

  const totals = useMemo(() => {
    return filteredReports.reduce((acc, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unit = item.unit || 'N/A';
        
        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }
        acc.quantityByUnit[unit] += quantity;
        return acc;
    }, { quantityByUnit: {} });
  }, [filteredReports]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handlePageChange = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter((c) => c.visible);

  const fetchLatestExportReports = async () => {

    try {
      const response = await api.get("/dpo/thr-receiving-summary/?page=1");
      const results = response?.data?.results;
      const latest = results?.success && Array.isArray(results.data) ? results.data : reports;
      const byKey = new Map(latest.map((item) => [getReceivingRowKey(item), item]));
      return filteredReports.map((row) => {
        const fresh = byKey.get(getReceivingRowKey(row));
        return fresh ? { ...row, ...fresh } : row;
      });
    } catch (err) {
      console.error("Could not refresh receiving report before export; using loaded rows.", err);
      return filteredReports;
    }
  };

  const makeExportRecord = (row, index, exportColumns) => {
    const record = { "#": index + 1 };
    exportColumns.forEach((col) => {
      const value = row[col.dataField];
      if (col.dataField === "months") record[col.text] = formatRecordMonths(row);
      else if (col.dataField === "quarter") record[col.text] = formatRecordTrimester(row);
      else if (col.dataField === "date") record[col.text] = formatDateValue(getRecordDate(row));
      else if (col.dataField === "curr_month") record[col.text] = getCurrentMonth(row) || "";
      else if (col.dataField === "actions") return;
      else record[col.text] = value ?? "";
    });
    return record;
  };

  const exportToExcel = async () => {
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter((col) => col.visible && col.dataField !== "#" && col.dataField !== "actions");
      const data = exportReports.map((row, index) => makeExportRecord(row, index, exportColumns));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const headers = Object.keys(data[0] || { "#": "" });
      worksheet["!cols"] = headers.map((header) => ({
        wch: Math.min(42, Math.max(header.length + 2, ...data.map((row) => Math.min(40, String(row[header] ?? "").length + 2)))),
      }));
      if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "THR Receiving");

      const totalsRows = Object.entries(totals.quantityByUnit).map(([unit, quantity]) => ({
        "Unit / इकाई": unit, "Total Quantity / कुल मात्रा": Number(quantity.toFixed(2))
      }));
      if (totalsRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totalsRows), "Quantity Totals");
      XLSX.writeFile(workbook, "dpo_thr_receiving_report.xlsx", { bookType: "xlsx", compression: true });
    } catch (err) {
      console.error("Receiving Excel export failed:", err);
      setError(t("Excel export failed. Please try again.", "Excel निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    }
  };

  const exportToPDF = async () => {
    setIsPrinting(true);
    setError("");
    let exportRoot;
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter((col) => col.visible && col.dataField !== "actions");
      const headers = exportColumns.map((col) => col.text);
      const body = exportReports.map((row, index) => {
        const record = makeExportRecord(row, index, exportColumns);
        return exportColumns.map((col) => record[col.text] ?? "-");
      });

      // Render HTML using browser fonts to preserve Hindi/Devanagari. JPEG compression
      // and A3 pages keep the PDF smaller than the old high-resolution A2 PNG export.
      exportRoot = document.createElement("div");
      exportRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:1800px;background:#fff;color:#111;padding:20px;font-family:Arial,'Noto Sans Devanagari',Mangal,sans-serif;z-index:-1;";
      const title = document.createElement("h2");
      title.textContent = "THR प्राप्ति रिपोर्ट / THR Receiving Report";
      title.style.cssText = "font-size:20px;margin:0 0 14px;text-align:center;font-weight:700;";
      exportRoot.appendChild(title);

      const table = document.createElement("table");
      table.style.cssText = "width:100%;border-collapse:collapse;font-size:11px;table-layout:auto;";
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      headers.forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.cssText = "border:1px solid #777;background:#e9eef5;padding:6px;white-space:normal;text-align:left;";
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      body.forEach((values) => {
        const tr = document.createElement("tr");
        values.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = String(value);
          td.style.cssText = "border:1px solid #999;padding:5px;vertical-align:top;white-space:normal;overflow-wrap:anywhere;";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      exportRoot.appendChild(table);

      const totalsTitle = document.createElement("h3");
      totalsTitle.textContent = "Total Quantity by Unit / इकाई के अनुसार कुल मात्रा";
      totalsTitle.style.cssText = "font-size:15px;margin:18px 0 8px;";
      exportRoot.appendChild(totalsTitle);
      const totalsTable = document.createElement("table");
      totalsTable.style.cssText = "border-collapse:collapse;font-size:11px;";
      Object.entries(totals.quantityByUnit).forEach(([unit, total]) => {
        const tr = document.createElement("tr");
        [unit, total.toFixed(2)].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = String(value);
          td.style.cssText = "border:1px solid #999;padding:6px;";
          tr.appendChild(td);
        });
        totalsTable.appendChild(tr);
      });
      exportRoot.appendChild(totalsTable);

      document.body.appendChild(exportRoot);
      const canvas = await html2canvas(exportRoot, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3", compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const scale = (pdfWidth - 32) / canvas.width;
      const slicePixelHeight = (pdfHeight - 32) / scale;
      let sourceY = 0;
      while (sourceY < canvas.height) {
        const sliceHeight = Math.min(slicePixelHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sliceHeight);
        pageCanvas.getContext("2d").drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.68), "JPEG", 16, 16, pdfWidth - 32, sliceHeight * scale, undefined, "FAST");
        sourceY += sliceHeight;
        if (sourceY < canvas.height) pdf.addPage();
      }
      pdf.save("dpo_thr_receiving_report.pdf");
    } catch (err) {
      console.error("Receiving PDF export failed:", err);
      setError(t("PDF export failed. Please try again.", "PDF निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    } finally {
      if (exportRoot?.parentNode) exportRoot.parentNode.removeChild(exportRoot);
      setIsPrinting(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 3;
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    items.push(
      <Pagination.First
        key="first"
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      />
    );
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    items.push(
      <Pagination.Item
        key={1}
        active={1 === currentPage}
        onClick={() => handlePageChange(1)}
      >
        {1}
      </Pagination.Item>
    );

    if (startPage > 2) {
      items.push(<Pagination.Ellipsis key="start-ellipsis" />);
    }

    for (let number = startPage; number <= endPage; number++) {
      if (number > 1 && number < totalPages) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      }
    }

    if (endPage < totalPages - 1) {
      items.push(<Pagination.Ellipsis key="end-ellipsis" />);
    }

    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );
    items.push(
      <Pagination.Last
        key="last"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
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
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-section">
            <h4 className="section-title">{t("THR Receiving Summary", "THR प्राप्ति सारांश")}</h4>

            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : summaryData ? (
              <Tabs
                defaultActiveKey="awc_report"
                id="beneficiary-summary-tabs"
                className="mb-3"
              >
                <Tab eventKey="district_summary" title={t("District Summary", "जिला सारांश")}>
                  <h5 className="mt-4">{t("District Summary", "जिला सारांश")}: {summaryData.district}</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>{t("District", "जिला")}</th>
                        <th>{t("Food Item", "खाद्य सामग्री")}</th>
                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                        <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        <th>{t("Unit", "इकाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summaryData.district_summary || []).map((item, index) => (
                        <tr key={index}>
                          <td>{summaryData.district}</td>
                          <td>{item.food_item}</td>
                          <td>{item.bene_category}</td>
                          <td>{item.total_quantity}</td>
                          <td>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="project_summary" title={t("Project Summary", "परियोजना सारांश")}>
                  <h5 className="mt-4">{t("Project-wise Summary (Total)", "परियोजना-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Project", "परियोजना")}</th>
                        <th>{t("Food Item", "खाद्य सामग्री")}</th>
                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                        <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        <th>{t("Unit", "इकाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summaryData.project_summary || []).map((project) => (
                        <tr key={project.project}>
                          <td>{project.project}</td>
                          <td>{project.food_item}</td>
                          <td>{project.bene_category}</td>
                          <td>{project.total_quantity}</td>
                          <td>{project.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="sector_summary" title={t("Sector Summary", "सेक्टर सारांश")}>
                  <h5 className="mt-4">{t("Sector-wise Summary (Total)", "सेक्टर-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Sector", "सेक्टर")}</th>
                        <th>{t("Food Item", "खाद्य सामग्री")}</th>
                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                        <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        <th>{t("Unit", "इकाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(summaryData.sector_summary || []).map((sector, index) => (
                        <tr key={`${sector.sector}-${index}`}>
                          <td>{sector.sector}</td>
                          <td>{sector.food_item}</td>
                          <td>{sector.bene_category}</td>
                          <td>{sector.total_quantity}</td>
                          <td>{sector.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="awc_report" title={t("AWC Report", "आंगनवाड़ी रिपोर्ट")}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{t("AWC THR Receiving Report", "आंगनवाड़ी THR प्राप्ति रिपोर्ट")}</h5>
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

                  <Row className="mb-3 g-3">
                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.fin_year.length ? `${filters.fin_year.length} ${t("selected", "चयनित")}` : t("All Fin. Years", "सभी वित्तीय वर्ष")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueFinYears.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange("fin_year", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100" id="dropdown-months">
                          {filters.months.length ? `${filters.months.length} ${t("selected", "चयनित")}` : t("All Months", "सभी महीने")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueMonths.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange("months", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.district.length ? `${filters.district.length} ${t("selected", "चयनित")}` : t("All Districts", "सभी जिले")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueDistricts.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange("district", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.project.length ? `${filters.project.length} ${t("selected", "चयनित")}` : t("All Projects", "सभी परियोजनाएँ")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueProjects.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange("project", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.sector.length ? `${filters.sector.length} ${t("selected", "चयनित")}` : t("All Sectors", "सभी सेक्टर")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueSectors.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange("sector", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.food_item.length ? `${filters.food_item.length} ${t("selected", "चयनित")}` : t("All Food Items", "सभी खाद्य सामग्री")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueFoodItems.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange("food_item", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.bene_category.length ? `${filters.bene_category.length} ${t("selected", "चयनित")}` : t("All Categories", "सभी श्रेणियाँ")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueBeneCategories.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.bene_category.includes(v)} onChange={() => handleMultiSelectChange("bene_category", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [] })}>
                        {t("Clear Filters", "फ़िल्टर हटाएँ")}
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No THR receiving reports found for the selected filters.
                    </div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>
                              {visibleColumns.map((col) => (
                                <th key={col.dataField}>{translateLabel(col.text)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentItems.map((report, index) => (
                              <tr key={report.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#"
                                      ? (currentPage - 1) * itemsPerPage + index + 1
                                      : col.dataField === "months"
                                      ? formatRecordMonths(report)
                                      : col.dataField === "quarter"
                                      ? formatRecordTrimester(report)
                                      : col.dataField === "date"
                                      ? formatDateValue(getRecordDate(report))
                                      : col.dataField === "curr_month"
                                      ? (getCurrentMonth(report) || '-')
                                      : col.dataField === "actions"
                                      ? null
                                      : col.dataField === "created_at" || col.dataField === "updated_at"
                                      ? new Date(report[col.dataField]).toLocaleString()
                                      : (report[col.dataField] ?? '-') }
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          {!isPrinting && (
                            <tfoot>
                              <tr>
                                {visibleColumns.map((col) => {
                                  let cellContent = '';
                                  if (col.dataField === '#') {
                                    cellContent = <strong>{t("Total", "कुल")}</strong>;
                                  } else if (col.dataField === 'quantity') {
                                    cellContent = (
                                      <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                        View Total
                                      </Button>
                                    );
                                  }
                                  return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                                })}
                              </tr>
                            </tfoot>
                          )}
                        </Table>
                        {renderPagination()}
                      </div>
                    </Card>
                  )}
                </Tab>
              </Tabs>
            ) : null}
          </div>
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएँ/छिपाएँ")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={translateLabel(col.text)} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button>
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

export default DPOTHRReceiving;