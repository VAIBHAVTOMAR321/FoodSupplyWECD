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
import "../../assets/css/directorleftnav.css";

import { useAuth } from "../all_login/AuthContext";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import PacketExpiryDetails from "../PacketExpiryDetails";

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

const firstAvailableValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const quarterToMonths = {
  "apr-may-jun": ["apr", "may", "jun"],
  "jul-aug-sep": ["jul", "aug", "sep"],
  "oct-nov-dec": ["oct", "nov", "dec"],
  "jan-feb-mar": ["jan", "feb", "mar"],
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

const getTrimesterValue = (row) => firstAvailableValue(row, [
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
    }).filter((month) => Object.prototype.hasOwnProperty.call(monthLabels, month));
  }
  if (typeof raw === "number") return [];
  const value = String(raw ?? "").trim();
  if (!value) return [];
  const normalized = value.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const quarterAliases = {
    "april-may-june": "apr-may-jun",
    "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec",
    "january-february-march": "jan-feb-mar",
  };
  const quarter = quarterAliases[normalized] || normalized;
  if (quarterToMonths[quarter]) return quarterToMonths[quarter];
  const parsed = value.split(/[,\s/|]+|-(?=[A-Za-z])/)
    .map(normalizeMonthToken)
    .filter((month) => Object.prototype.hasOwnProperty.call(monthLabels, month));
  if (parsed.length) return parsed;
  const single = normalizeMonthToken(value);
  return Object.prototype.hasOwnProperty.call(monthLabels, single) ? [single] : [];
};

const formatMonths = (monthsOrRow) => {
  const months = Array.isArray(monthsOrRow)
    ? monthsOrRow
    : (monthsOrRow && typeof monthsOrRow === "object"
      ? getMonthArray(monthsOrRow)
      : (Array.isArray(monthsOrRow) ? monthsOrRow : []));
  if (months.length) {
    return [...new Set(months.map(normalizeMonthToken))]
      .map((month) => monthLabels[month] || month)
      .join(", ");
  }
  if (monthsOrRow && typeof monthsOrRow === "object") {
    const raw = getTrimesterValue(monthsOrRow);
    return raw || "-";
  }
  return monthsOrRow || "-";
};

const formatRecordTrimester = (row) => {
  const raw = getTrimesterValue(row);
  const token = String(raw ?? "").trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const aliases = {
    "april-may-june": "apr-may-jun",
    "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec",
    "january-february-march": "jan-feb-mar",
  };
  const normalized = aliases[token] || token;
  if (quarterToMonths[normalized]) {
    return quarterToMonths[normalized].map((month) => monthLabels[month]).join(" - ");
  }
  const months = getMonthArray(row);
  if (months.length >= 3) {
    for (const quarterMonths of Object.values(quarterToMonths)) {
      if (quarterMonths.every((month) => months.includes(month))) {
        return quarterMonths.map((month) => monthLabels[month]).join(" - ");
      }
    }
  }
  return raw || "-";
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
const getMaxExpiryDate = (row) => firstAvailableValue(row, [
  "max_expirydate", "max_expiry_date", "maxExpiryDate", "expiry_date", "expiryDate",
]);
const getReportField = (row, field) => {
  const aliases = {
    awc_name: ["awc_name", "awcName", "anganwadi_name", "anganwadiName"],
    awc_code: ["awc_code", "awcCode", "anganwadi_code", "anganwadiCode"],
    awc_type: ["awc_type", "awcType", "anganwadi_type", "anganwadiType"],
    district: ["district", "district_name", "districtName"],
    project: ["project", "project_name", "projectName"],
    sector: ["sector", "sector_name", "sectorName"],
    food_item: ["food_item", "foodItem", "food_item_name", "foodItemName"],
    bene_category: ["bene_category", "beneCategory", "beneficiary_category", "beneficiaryCategory"],
    quantity: ["quantity", "received_quantity", "receivedQuantity", "total_quantity", "totalQuantity"],
    unit: ["unit", "quantity_unit", "quantityUnit"],
    fin_year: ["fin_year", "financial_year", "financialYear"],
    sector_status: ["sector_status", "sectorStatus", "status"],
  };
  return firstAvailableValue(row, aliases[field] || [field]);
};

const getExpiryRows = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    // Supports [packet count, expiry date, remarks] entries as well as arrays of objects.
    if (payload.length >= 2 && !Array.isArray(payload[0]) &&
        (typeof payload[1] === "string" || payload[1] instanceof Date)) {
      return [{ count: payload[0], date: payload[1], remarks: payload[2] ?? "" }];
    }
    return payload.flatMap(getExpiryRows);
  }
  if (typeof payload !== "object") return [];
  for (const key of ["results", "data", "expiry_details", "expiry_data", "packet_expiry", "packets", "details", "expiry_records"]) {
    if (Array.isArray(payload[key])) return payload[key].flatMap(getExpiryRows);
  }
  const date = payload.expiry_date ?? payload.expirydate ?? payload.expiryDate ??
    payload.exp_date ?? payload.date_of_expiry ?? payload.expiry ?? payload.date;
  const qty = payload.expired_packets ?? payload.expired_quantity ?? payload.packet_count ??
    payload.no_of_packets ?? payload.packets_count ?? payload.quantity ?? payload.qty ??
    payload.count ?? (typeof payload.packets === "number" ? payload.packets : undefined);
  if (date || qty !== undefined) return [payload];
  return Object.values(payload).flatMap(v =>
    (Array.isArray(v) || (v && typeof v === "object")) ? getExpiryRows(v) : []
  );
};
const expiryDateOf = (item) => Array.isArray(item) ? (item[1] ?? "") :
  (item?.expiry_date ?? item?.expirydate ?? item?.expiryDate ?? item?.exp_date ??
   item?.date_of_expiry ?? item?.expiry ?? item?.date ?? "");
const expiryPacketsOf = (item) => Array.isArray(item) ? (item[0] ?? "") :
  (item?.expired_packets ?? item?.expired_quantity ?? item?.packet_count ??
   item?.no_of_packets ?? item?.packets_count ?? item?.quantity ?? item?.qty ??
   item?.count ?? (typeof item?.packets === "number" ? item.packets : undefined) ?? "");
const expiryRemarksOf = (item) => Array.isArray(item) ? (item[2] ?? "") :
  (item?.remarks ?? item?.remark ?? item?.notes ?? "");
const isExpiryPast = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return date < today;
};

const expiryRowKey = (row) => String(
  row?.id ?? row?.awc_code ??
  `${row?.district ?? ""}|${row?.project ?? ""}|${row?.sector ?? ""}|${row?.food_item ?? ""}|${row?.bene_category ?? ""}|${row?.date ?? ""}`
);

const DirectorTHRReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [expiryDetailsByRow, setExpiryDetailsByRow] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);

  const [filters, setFilters] = useState({
    fin_year: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

  // Updated columns state to include 'curr_month' and 'max_expirydate'
  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "awc_type", text: "AWC Type", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "max_expirydate", text: "Max Expiry Date", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "expired_packets", text: "Expired Packets", visible: true },
    { dataField: "expiry_breakdown", text: "Expiry Details", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalData, setModalData] = useState({ title: "", totals: {} });
  const [isPrinting, setIsPrinting] = useState(false);

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
      const uniqueMonthKeys = [...new Set(allMonths)];
      const formattedUniqueMonths = uniqueMonthKeys.map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b));
      setUniqueMonths(formattedUniqueMonths);
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
      const response = await api.get(`/director/thr-receiving-summary/`);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError("Failed to fetch THR receiving summary.");
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
      const itemMonths = getMonthArray(item).map((month) => monthLabels[month] || month);

      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        (months.length === 0 || itemMonths.some(month => months.includes(month))) &&
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
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item.quantity) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      return acc;
    }, {
      quantityByUnit: {}
    });
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



  const handleExpiryDetailsLoaded = useCallback((row, payload) => {
    const key = expiryRowKey(row);
    setExpiryDetailsByRow((previous) => ({
      ...previous,
      [key]: getExpiryRows(payload),
    }));
  }, []);

  const getRowExpiryRows = (row) => {
    const cached = expiryDetailsByRow[expiryRowKey(row)];
    if (Array.isArray(cached) && cached.length) return cached;
    // Some summary APIs already return expiry detail rows directly.
    return getExpiryRows(
      row?.packet_expiry ?? row?.expiry_details ?? row?.expiry_data ??
      row?.packets_expiry ?? row?.expiry_records ?? row?.expiry ?? []
    );
  };

  const getExpiryExportValues = (row) => {
    const entries = getRowExpiryRows(row);
    const expiredPackets = entries
      .filter((entry) => isExpiryPast(expiryDateOf(entry)))
      .reduce((sum, entry) => {
        const qty = Number(expiryPacketsOf(entry));
        return sum + (Number.isFinite(qty) ? qty : 0);
      }, 0);
    const breakdown = entries.map((entry) => {
      const date = formatDateValue(expiryDateOf(entry));
      const packets = expiryPacketsOf(entry);
      const status = isExpiryPast(expiryDateOf(entry)) ? "EXPIRED / समाप्त" : "Not expired / समाप्त नहीं";
      const remarks = expiryRemarksOf(entry);
      return `${date || "Date unavailable / तिथि उपलब्ध नहीं"}: ${packets === "" ? "Packet count unavailable / पैकेट संख्या उपलब्ध नहीं" : packets} packet(s) [${status}]${remarks ? ` — ${remarks}` : ""}`;
    });
    return { entries, expiredPackets, breakdown: breakdown.join("; ") };
  };

  // Refresh summary rows immediately before exporting; retain already loaded expiry details.

  const fetchLatestExportReports = async () => {
    try {
      const response = await api.get("/director/thr-receiving-summary/?page=1");
      const results = response?.data?.results;
      const latest = results?.success && Array.isArray(results.data) ? results.data : reports;
      const byKey = new Map(latest.map((item) => [expiryRowKey(item), item]));
      return filteredReports.map((row) => {
        const fresh = byKey.get(expiryRowKey(row));
        return fresh ? { ...row, ...fresh } : row;
      });
    } catch (err) {
      console.error("Could not refresh receiving report before export; using loaded rows.", err);
      return filteredReports;
    }
  };

  const makeExportRecord = (row, index, exportColumns) => {
    const expiry = getExpiryExportValues(row);
    const record = { "#": index + 1 };
    exportColumns.forEach((col) => {
      const value = row[col.dataField];
      if (col.dataField === "months") record[col.text] = formatMonths(row);
      else if (col.dataField === "quarter") record[col.text] = formatRecordTrimester(row);
      else if (col.dataField === "date") record[col.text] = formatDateValue(getRecordDate(row));
      else if (col.dataField === "max_expirydate") record[col.text] = formatDateValue(getMaxExpiryDate(row));
      else if (col.dataField === "curr_month") record[col.text] = getCurrentMonth(row) || "";
      else if (col.dataField === "expired_packets") record[col.text] = expiry.expiredPackets;
      else if (col.dataField === "expiry_breakdown") record[col.text] = expiry.breakdown || "No expiry details loaded / expiry data unavailable";
      else if (col.dataField === "actions") return;
      else record[col.text] = value ?? "";
    });
    return record;
  };

  const exportToExcel = async () => {
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter((col) => col.visible && col.dataField !== "#" && col.dataField !== "actions");
      // Keep the expiry columns in the export even if a user has hidden them in the table.
      for (const field of ["expired_packets", "expiry_breakdown"]) {
        const column = columns.find((col) => col.dataField === field);
        if (column && !exportColumns.some((col) => col.dataField === field)) exportColumns.push(column);
      }
      const data = exportReports.map((row, index) => makeExportRecord(row, index, exportColumns));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const headers = Object.keys(data[0] || { "#": "" });
      worksheet["!cols"] = headers.map((header) => ({
        wch: Math.min(42, Math.max(header.length + 2, ...data.map((row) => Math.min(40, String(row[header] ?? "").length + 2)))),
      }));
      if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "THR Receiving");

      // Detailed expiry worksheet: one line per packet-expiry record.
      const expiryRows = [];
      exportReports.forEach((row, index) => {
        const expiry = getExpiryExportValues(row);
        const common = {
          "#": index + 1,
          "District": row.district ?? "",
          "Project": row.project ?? "",
          "Sector": row.sector ?? "",
          "AWC Name": row.awc_name ?? "",
          "AWC Code": row.awc_code ?? "",
          "Food Item": row.food_item ?? "",
          "Beneficiary Category": row.bene_category ?? "",
        };
        if (expiry.entries.length) {
          expiry.entries.forEach((entry) => expiryRows.push({
            ...common,
            "Expiry Date": formatDateValue(expiryDateOf(entry)),
            "Packet Count": expiryPacketsOf(entry),
            "Expiry Status": isExpiryPast(expiryDateOf(entry)) ? "EXPIRED / समाप्त" : "Not expired / समाप्त नहीं",
            "Remarks": expiryRemarksOf(entry),
          }));
        } else {
          expiryRows.push({ ...common, "Expiry Date": "", "Packet Count": "", "Expiry Status": "No expiry details loaded", "Remarks": "" });
        }
      });
      const expirySheet = XLSX.utils.json_to_sheet(expiryRows);
      const expiryHeaders = Object.keys(expiryRows[0] || {"Expiry Date": ""});
      expirySheet["!cols"] = expiryHeaders.map((header) => ({ wch: Math.min(32, Math.max(header.length + 2, 14)) }));
      if (expirySheet["!ref"]) expirySheet["!autofilter"] = { ref: expirySheet["!ref"] };
      XLSX.utils.book_append_sheet(workbook, expirySheet, "Expiry Details");

      const totalsRows = Object.entries(totals.quantityByUnit).map(([unit, quantity]) => ({
        "Unit / इकाई": unit, "Total Quantity / कुल मात्रा": Number(quantity.toFixed(2))
      }));
      if (totalsRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(totalsRows), "Quantity Totals");
      XLSX.writeFile(workbook, "director_thr_receiving_report.xlsx", { bookType: "xlsx", compression: true });
    } catch (err) {
      console.error("Receiving Excel export failed:", err);
      setError("Excel export failed. Please try again.");
    }
  };

  const exportToPDF = async () => {
    setIsPrinting(true);
    setError("");
    let exportRoot;
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter((col) => col.visible && col.dataField !== "actions");
      for (const field of ["expired_packets", "expiry_breakdown"]) {
        const column = columns.find((col) => col.dataField === field);
        if (column && !exportColumns.some((col) => col.dataField === field)) exportColumns.push(column);
      }
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

      const expiryTitle = document.createElement("h3");
      expiryTitle.textContent = "Packet Expiry Details / पैकेट की समाप्ति जानकारी";
      expiryTitle.style.cssText = "font-size:15px;margin:18px 0 8px;";
      exportRoot.appendChild(expiryTitle);
      const expiryTable = document.createElement("table");
      expiryTable.style.cssText = "width:100%;border-collapse:collapse;font-size:10px;table-layout:auto;";
      const expiryHeaders = ["District", "Project", "Sector", "AWC Name", "Food Item", "Expiry Date", "Packet Count", "Status", "Remarks"];
      const expiryHead = document.createElement("tr");
      expiryHeaders.forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.cssText = "border:1px solid #777;background:#e9eef5;padding:5px;text-align:left;";
        expiryHead.appendChild(th);
      });
      expiryTable.appendChild(expiryHead);
      exportReports.forEach((row) => {
        const expiry = getExpiryExportValues(row);
        const entries = expiry.entries.length ? expiry.entries : [null];
        entries.forEach((entry) => {
          const vals = [
            row.district ?? "-", row.project ?? "-", row.sector ?? "-", row.awc_name ?? "-",
            row.food_item ?? "-", entry ? formatDateValue(expiryDateOf(entry)) : "No expiry details loaded",
            entry ? expiryPacketsOf(entry) : "-", entry ? (isExpiryPast(expiryDateOf(entry)) ? "EXPIRED / समाप्त" : "Not expired / समाप्त नहीं") : "-",
            entry ? expiryRemarksOf(entry) : "-"
          ];
          const tr = document.createElement("tr");
          vals.forEach((value) => {
            const td = document.createElement("td");
            td.textContent = String(value ?? "-");
            td.style.cssText = "border:1px solid #999;padding:4px;vertical-align:top;white-space:normal;overflow-wrap:anywhere;";
            tr.appendChild(td);
          });
          expiryTable.appendChild(tr);
        });
      });
      exportRoot.appendChild(expiryTable);

      document.body.appendChild(exportRoot);
      const canvas = await html2canvas(exportRoot, { scale: 1.15, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1900, logging: false });
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
      pdf.save("director_thr_receiving_report.pdf");
    } catch (err) {
      console.error("Receiving PDF export failed:", err);
      setError("PDF export failed. Please try again.");
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

  const calculateTotals = (data, quantityField = 'total_quantity') => {
    if (!data) return {};
    return data.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item[quantityField]) || 0;
      if (!acc[unit]) {
        acc[unit] = 0;
      }
      acc[unit] += quantity;
      return acc;
    }, {});
  };

  const handleViewTotals = (summaryData, title, quantityField = 'total_quantity') => {
    const totals = calculateTotals(summaryData, quantityField);
    setModalData({ title, totals });
    setShowQuantityModal(true);
  };

  return (
    <div className="dashboard-container">
      <DirectorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-section">
            <h4 className="section-title">THR प्राप्ति सारांश</h4>

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
                <Tab eventKey="district_summary" title="District Summary">
                  <h5 className="mt-4">District-wise Summary (Total)</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Total Quantity</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.district_summary.map((item, index) => (
                        <tr key={index}>
                          <td>{item.food_item}</td>
                          <td>{item.bene_category}</td>
                          <td>{item.total_quantity}</td>
                          <td>{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold table-info">
                        <td colSpan="2">Total</td>
                        <td colSpan="2">
                          <Button variant="link" size="sm" onClick={() => handleViewTotals(summaryData.district_summary, 'District Summary Totals')}>View Totals</Button>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </Tab>

                <Tab eventKey="project_summary" title="Project Summary">
                  <h5 className="mt-4">Project-wise Summary (Total)</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Total Quantity</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((project, index) => (
                        <tr key={`${project.project}-${index}`}>
                          <td>{project.project}</td>
                          <td>{project.food_item}</td>
                          <td>{project.bene_category}</td>
                          <td>{project.total_quantity}</td>
                          <td>{project.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold table-info">
                        <td colSpan="3">Total</td>
                        <td colSpan="2">
                          <Button variant="link" size="sm" onClick={() => handleViewTotals(summaryData.project_summary, 'Project Summary Totals')}>View Totals</Button>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </Tab>

                <Tab eventKey="sector_summary" title="Sector Summary">
                  <h5 className="mt-4">Sector-wise Summary (Total)</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Total Quantity</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.sector_summary.map((sector, index) => (
                        <tr key={`${sector.sector}-${index}`}>
                          <td>{sector.sector}</td>
                          <td>{sector.food_item}</td>
                          <td>{sector.bene_category}</td>
                          <td>{sector.total_quantity}</td>
                          <td>{sector.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="fw-bold table-info">
                        <td colSpan="3">Total</td>
                        <td colSpan="2">
                          <Button variant="link" size="sm" onClick={() => handleViewTotals(summaryData.sector_summary, 'Sector Summary Totals')}>View Totals</Button>
                        </td>
                      </tr>
                    </tfoot>
                  </Table>
                </Tab>

                <Tab eventKey="awc_report" title="AWC Report">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">AWC THR Receiving Report</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> Export PDF
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> Export Excel
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                        <FaEye className="me-1" /> Column Visibility
                      </Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-3">
                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.fin_year.length ? `${filters.fin_year.length} selected` : "All Fin. Years"}
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
                        <Dropdown.Toggle variant="outline-secondary" id="dropdown-months" className="w-100">
                          {filters.months.length ? `${filters.months.length} selected` : 'All Months'}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
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
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.district.length ? `${filters.district.length} selected` : "All Districts"}
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
                          {filters.project.length ? `${filters.project.length} selected` : "All Projects"}
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
                          {filters.sector.length ? `${filters.sector.length} selected` : "All Sectors"}
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
                          {filters.food_item.length ? `${filters.food_item.length} selected` : "All Food Items"}
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
                          {filters.bene_category.length ? `${filters.bene_category.length} selected` : "All Categories"}
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
                        Clear Filters
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
                                <th key={col.dataField}>{col.text}</th>
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
                                      ? formatMonths(report)
                                      : col.dataField === "quarter"
                                      ? formatRecordTrimester(report)
                                      : col.dataField === "date"
                                      ? formatDateValue(getRecordDate(report))
                                      : col.dataField === "curr_month"
                                      ? (getCurrentMonth(report) || "-")
                                      : col.dataField === "max_expirydate"
                                      ? formatDateValue(getMaxExpiryDate(report))
                                      : col.dataField === "expired_packets"
                                      ? getExpiryExportValues(report).expiredPackets
                                      : col.dataField === "expiry_breakdown"
                                      ? (getExpiryExportValues(report).breakdown || "Expiry details load when available")
                                      : col.dataField === "actions"
                                      ? <PacketExpiryDetails record={report} onDetailsLoaded={(payload) => handleExpiryDetailsLoaded(report, payload)} />
                                      : col.dataField === "created_at" || col.dataField === "updated_at"
                                      ? (report[col.dataField] ? new Date(report[col.dataField]).toLocaleString() : "-")
                                      : (getReportField(report, col.dataField) || "-")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="fw-bold table-info">
                              <td colSpan={visibleColumns.findIndex(c => c.dataField === 'quantity')}>Total</td>
                              {visibleColumns.slice(visibleColumns.findIndex(c => c.dataField === 'quantity')).map(col => {
                                if (col.dataField === 'quantity') {
                                  return (
                                    <td key="total_quantity">
                                      {!isPrinting && <Button variant="link" size="sm" onClick={() => handleViewTotals(filteredReports, 'AWC Report Totals', 'quantity')}>View Totals</Button>}
                                    </td>
                                  );
                                }
                                return <td key={col.dataField}></td>;
                              })}
                            </tr>
                          </tfoot>
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
            <Modal.Title>Show/Hide Columns</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>{modalData.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {Object.keys(modalData.totals).length > 0 ? (
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Total Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(modalData.totals).map(([unit, total]) => (
                    <tr key={unit}><td>{unit}</td><td>{parseFloat(total).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </Table>
            ) : <p>No quantity data to display.</p>}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default DirectorTHRReceiving;