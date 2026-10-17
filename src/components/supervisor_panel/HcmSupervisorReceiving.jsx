import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Badge,
  Pagination,
  Row,
  Col,
  Form,
  Dropdown,
  Button,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import "../../assets/css/dashboard.css";
import { FaUserCircle, FaFilePdf, FaFileExcel, FaEye, FaCalendarCheck } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";
import {
  getAllocationComparisonStyle,
  getFoodItemOptions,
  getStockAllocationComparison,
} from "./stockAllocationComparison";

// Packet expiry helpers: supports API records represented as [packetCount, expiryDate, remarks]
// or objects with common backend field names.
const getPacketExpiryEntries = (record) => {
  const raw = record?.packet_expiry ?? record?.expiry_details ?? record?.expiry_data ??
    record?.packets_expiry ?? record?.expiry_records ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (Array.isArray(entry)) {
      return { packets: entry[0] ?? "", date: entry[1] ?? "", remarks: entry[2] ?? "" };
    }
    if (entry && typeof entry === "object") {
      return {
        packets: entry.expired_packets ?? entry.expired_quantity ?? entry.packet_count ??
          entry.no_of_packets ?? entry.packets_count ?? entry.quantity ?? entry.qty ??
          entry.count ?? (typeof entry.packets === "number" ? entry.packets : ""),
        date: entry.expiry_date ?? entry.expirydate ?? entry.expiryDate ??
          entry.exp_date ?? entry.date_of_expiry ?? entry.expiry ?? entry.date ?? "",
        remarks: entry.remarks ?? entry.remark ?? entry.notes ?? "",
      };
    }
    return { packets: "", date: "", remarks: "" };
  }).filter((entry) => entry.packets !== "" || entry.date || entry.remarks);
};

const formatDateForReport = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? raw
    : `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const isPacketExpiryPast = (value) => {
  if (!value) return false;
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const getExpirySummary = (record) => {
  const entries = getPacketExpiryEntries(record);
  const expiredPackets = entries.reduce((sum, entry) => {
    const qty = Number(entry.packets);
    return sum + (isPacketExpiryPast(entry.date) && Number.isFinite(qty) ? qty : 0);
  }, 0);
  const details = entries.map((entry) => {
    const status = isPacketExpiryPast(entry.date) ? "EXPIRED" : "Not expired";
    return `${formatDateForReport(entry.date)}: ${entry.packets === "" ? "-" : entry.packets} packet(s) [${status}]${entry.remarks ? ` — ${entry.remarks}` : ""}`;
  }).join("; ");
  return { entries, expiredPackets, details: details || "No expiry details available" };
};

// Read common API response shapes and follow server pagination so the table and exports
// use every receiving record, not just the first API page.
const getReceivingPage = (payload) => {
  const candidates = [payload?.data, payload?.results, payload?.data?.data, payload?.data?.results, payload?.results?.data];
  const rows = Array.isArray(payload) ? payload : candidates.find(Array.isArray) || [];
  const next = payload?.next ?? payload?.links?.next ?? payload?.data?.next ?? payload?.data?.links?.next ?? payload?.results?.next ?? null;
  return { rows, next };
};

const exportValue = (item, col, index) => {
  switch (col.dataField) {
    case "#": return index + 1;
    case "date": return formatDateForReport(item.date ?? item.received_date ?? item.created_at);
    case "max_expirydate": return formatDateForReport(item.max_expirydate ?? item.max_expiry_date ?? item.maxExpiryDate ?? item.expiry_date);
    case "expired_packets": return getExpirySummary(item).expiredPackets;
    case "expiry_breakdown": return getExpirySummary(item).details;
    case "months": return formatMonthsArray(item.months ?? item.month_names ?? item.allotted_months);
    case "quarter": return item.quarter ?? item.trimester ?? "";
    case "curr_month": return item.curr_month ?? item.current_month ?? item.currentMonth ?? "";
    case "sector_status": return item.sector_status || "pending";
    case "quantity": return item.quantity ?? "";
    default: {
      const value = item[col.dataField];
      return value === null || value === undefined ? "" : value;
    }
  }
};

// Helper to format months array to string
const formatMonthsArray = (months) => {
  if (!months) return "";
  if (Array.isArray(months)) return months.join(", ");
  return months;
};

const HcmSupervisorReceiving = () => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const tableRef = React.useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { api } = useAuth();
  const [receivings, setReceivings] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [foodItemOptions, setFoodItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allocationError, setAllocationError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkRemark, setBulkRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    awc_name: [],
    food_item: [],
    project: [],
    sector: [],
    district: [],
    bene_category: [],
    startDate: "",
    endDate: "",
  });

  // ── NEW: Expiry details modal state ──
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryViewItem, setExpiryViewItem] = useState(null);

  // Updated Columns state to include missing fields
  const [columns, setColumns] = useState([
    { dataField: "select", text: "Select", visible: true },
    { dataField: "#", text: "#", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: false },
    { dataField: "awc_type", text: "AWC Type", visible: false },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: false },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "max_expirydate", text: "Max Expiry Date", visible: true },
    { dataField: "expired_packets", text: "Expired Packets", visible: true },
    { dataField: "expiry_breakdown", text: "Packet Expiry Details", visible: true },
    { dataField: "sector_remark", text: "Sector Remark", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);
  
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalData, setModalData] = useState({ title: "", totals: {} });

  const visibleColumns = columns.filter((c) => c.visible);

  const getColumnLabel = (col) => {
    const hindiLabels = {
      "Select": "चुनें", "District": "जिला", "Sector": "क्षेत्र", "Project": "परियोजना",
      "AWC Name": "आंगनवाड़ी केंद्र का नाम", "AWC Code": "आंगनवाड़ी केंद्र कोड", "AWC Type": "आंगनवाड़ी केंद्र प्रकार",
      "Food Item": "खाद्य सामग्री", "Quantity": "मात्रा", "Unit": "इकाई", "Beneficiary Category": "लाभार्थी श्रेणी",
      "Date": "तारीख", "Fin. Year": "वित्तीय वर्ष", "Fin Year": "वित्तीय वर्ष", "Financial Year": "वित्तीय वर्ष",
      "Trimester": "त्रैमासिक", "Months": "महीने", "Current Month": "वर्तमान महीना", "Max Expiry Date": "अधिकतम समाप्ति तारीख",
      "Expired Packets": "समाप्त पैकेट", "Expiry Details": "समाप्ति विवरण", "Packet Expiry Details": "पैकेट समाप्ति विवरण",
      "Sector Remark": "क्षेटर टिप्पणी", "Sector Status": "क्षेत्र स्थिति", "Actions": "कार्रवाई", "Action": "कार्रवाई",
      "Days Allotted": "आवंटित दिन", "Beneficiaries": "लाभार्थी", "Qty": "मात्रा", "Remark": "टिप्पणी"
    };
    return t(col.text, hindiLabels[col.text] || col.text);
  };

  // ── NEW: Helper to check if a record has packet_expiry data ──
  const hasPacketExpiry = (rec) => getPacketExpiryEntries(rec).length > 0;

  // ── NEW: Expiry modal handlers ──
  const handleOpenExpiryModal = (record) => {
    setExpiryViewItem(record);
    setShowExpiryModal(true);
  };

  const handleCloseExpiryModal = () => {
    setShowExpiryModal(false);
    setExpiryViewItem(null);
  };

  const fetchReceivings = useCallback(async () => {
    setLoading(true);
    setError("");
    setAllocationError("");
    const [receivingResult, allocationResult, foodItemResult] = await Promise.allSettled([
      (async () => {
        let url = "/supervisor/hcm-receiving/";
        const allRows = [];
        const visited = new Set();
        // Safety limit protects against a malformed API repeatedly returning the same next URL.
        for (let page = 0; url && page < 500; page += 1) {
          if (visited.has(url)) break;
          visited.add(url);
          const response = await api.get(url);
          const pageData = getReceivingPage(response?.data);
          allRows.push(...pageData.rows);
          url = pageData.next;
        }
        return allRows;
      })(),
      api.get("/supplementary-nutrition-supervisor/"),
      api.get("/categoryandfooditem/"),
    ]);

    if (receivingResult.status === "fulfilled") {
      setReceivings(receivingResult.value);
    } else {
      setError(t("Failed to fetch HCM receiving data.", "HCM प्राप्ति डेटा प्राप्त नहीं हो सका।"));
      console.error("Failed to fetch HCM receiving data:", receivingResult.reason);
    }

    if (allocationResult.status === "fulfilled") {
      const payload = allocationResult.value.data;
      const allocationRows = Array.isArray(payload) ? payload : payload?.data;
      if (Array.isArray(allocationRows) && payload?.success !== false) {
        setAllocations(allocationRows);
      } else {
        setAllocations([]);
        setAllocationError(t("Stock allocation data is unavailable; receiving rows cannot be compared.", "स्टॉक आवंटन डेटा उपलब्ध नहीं है; प्राप्ति रिकॉर्ड की तुलना नहीं की जा सकती।"));
      }
    } else {
      setAllocations([]);
      setAllocationError(t("Failed to fetch stock allocation data; receiving rows cannot be compared.", "स्टॉक आवंटन डेटा प्राप्त नहीं हो सका; प्राप्ति रिकॉर्ड की तुलना नहीं की जा सकती।"));
      console.error("Failed to fetch stock allocation data:", allocationResult.reason);
    }
    if (foodItemResult.status === "fulfilled") {
      const payload = foodItemResult.value.data;
      const options = getFoodItemOptions(payload);
      setFoodItemOptions(options);
      if (payload?.success === false || options.length === 0) {
        setAllocationError(t("Food item mappings are unavailable; receiving rows cannot be compared.", "खाद्य सामग्री मैपिंग उपलब्ध नहीं है; प्राप्ति रिकॉर्ड की तुलना नहीं की जा सकती।"));
      }
    } else {
      setFoodItemOptions([]);
      setAllocationError(t("Failed to fetch food item mappings; receiving rows cannot be compared.", "खाद्य सामग्री मैपिंग प्राप्त नहीं हो सकी; प्राप्ति रिकॉर्ड की तुलना नहीं की जा सकती।"));
      console.error("Failed to fetch food item allocation mappings:", foodItemResult.reason);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchReceivings();
  }, [fetchReceivings]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = pendingItemsOnPage.map((item) => item.id);
      setSelectedIds(prev => [...new Set([...prev, ...pendingIds])]);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      awc_name: [],
      food_item: [],
      project: [],
      sector: [],
      district: [],
      bene_category: [],
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  const uniqueValues = useMemo(() => {
    const values = {
      awc_name: [...new Set(receivings.map((item) => item.awc_name))],
      food_item: [...new Set(receivings.map((item) => item.food_item))],
      project: [...new Set(receivings.map((item) => item.project))],
      sector: [...new Set(receivings.map((item) => item.sector))],
      district: [...new Set(receivings.map((item) => item.district))],
      bene_category: [...new Set(receivings.map((item) => item.bene_category))],
    };
    Object.keys(values).forEach((key) => values[key].sort());
    return values;
  }, [receivings]);

  const filteredReceivings = useMemo(() => {
    return receivings.filter((item) => {
      const { startDate, endDate, ...otherFilters } = filters;
      const itemDate = new Date(item.date);

      const dateFilter =
        (!startDate || itemDate >= new Date(startDate)) &&
        (!endDate || itemDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999)));

      const multiSelectFilter = Object.keys(otherFilters).every((key) => {
        return filters[key].length === 0 || filters[key].includes(String(item[key]));
      });

      return dateFilter && multiSelectFilter;
    });
  }, [receivings, filters]);

  const totals = useMemo(() => {
    return filteredReceivings.reduce((acc, item) => {
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
  }, [filteredReceivings]);

  const calculateTotals = (data) => {
    if (!data) return {};
    return data.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item.quantity) || 0;
      if (!acc[unit]) { acc[unit] = 0; }
      acc[unit] += quantity;
      return acc;
    }, {});
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReceivings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceivings.length / itemsPerPage);

  const pendingItemsOnPage = useMemo(() => 
    currentItems.filter(item => item.sector_status === 'pending' || !item.sector_status),
    [currentItems]
  );

  const areAllPendingSelected = useMemo(() => {
    if (pendingItemsOnPage.length === 0) return false;
    return pendingItemsOnPage.every(item => selectedIds.includes(item.id));
  }, [pendingItemsOnPage, selectedIds]);

  const canApprove = useMemo(() => {
    return selectedIds.some(id => {
      const item = receivings.find(r => r.id === id);
      return item && item.sector_status !== 'approved';
    });
  }, [selectedIds, receivings]);

  const canReject = useMemo(() => {
    return selectedIds.some(id => receivings.find(r => r.id === id)?.sector_status !== 'rejected');
  }, [selectedIds, receivings]);

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const handleViewTotals = (data, title) => {
    const totals = calculateTotals(data);
    setModalData({ title, totals });
    setShowQuantityModal(true);
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      setActionError(t("No items selected for bulk action.", "सामूहिक कार्रवाई के लिए कोई आइटम चयनित नहीं है।"));
      return;
    }
    if (bulkAction === "rejected" && !bulkRemark) {
      setActionError(t("Remark is required for rejection.", "अस्वीकृति के लिए टिप्पणी आवश्यक है।"));
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMsg("");

    try {
      await api.put("/supervisor/hcm-receiving/", {
        ids: selectedIds,
        sector_status: bulkAction,
        sector_remark: bulkRemark,
      });

      setSuccessMsg(t(`Successfully ${bulkAction} ${selectedIds.length} items.`, `${selectedIds.length} आइटम सफलतापूर्वक ${bulkAction === "approved" ? "स्वीकृत" : "अस्वीकृत"} किए गए।`));
      fetchReceivings(); 
      setSelectedIds([]);
      setShowBulkActionModal(false);
      setBulkRemark("");
    } catch (err) {
      setActionError(t("Failed to perform bulk action. Please try again.", "सामूहिक कार्रवाई नहीं की जा सकी। कृपया पुनः प्रयास करें।"));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "pending":
      default:
        return "warning";
    }
  };

  const exportToPDF = async () => {
    setIsPrinting(true);
    setError("");
    let exportRoot;
    try {
      const exportColumns = visibleColumns.filter((col) => !["select", "actions"].includes(col.dataField));
      const reportRows = filteredReceivings.map((item, index) =>
        exportColumns.map((col) => String(exportValue(item, col, index) ?? "-"))
      );
      const expiryRows = filteredReceivings.flatMap((item, index) => {
        const entries = getExpirySummary(item).entries;
        return (entries.length ? entries : [{ packets: "", date: "", remarks: "" }]).map((entry) => [
          index + 1, item.district ?? "-", item.project ?? "-", item.sector ?? "-",
          item.awc_name ?? "-", item.awc_code ?? "-", item.food_item ?? "-",
          item.bene_category ?? "-", formatDateForReport(entry.date), entry.packets || "-",
          entry.date
            ? (isPacketExpiryPast(entry.date) ? "EXPIRED / समाप्त" : "Not expired / समाप्त नहीं")
            : "Expiry date unavailable / समाप्ति तिथि उपलब्ध नहीं",
          entry.remarks || "-",
        ]);
      });

      // Render through the browser's native text renderer before capturing the pages.
      // This preserves Devanagari/Hindi text, unlike jsPDF's default fonts.
      exportRoot = document.createElement("div");
      exportRoot.style.cssText = [
        "position:fixed", "left:-20000px", "top:0", "width:1800px",
        "background:#fff", "color:#111", "padding:20px", "z-index:-1",
        "font-family:Arial,'Noto Sans Devanagari','Nirmala UI',Mangal,sans-serif",
        "box-sizing:border-box"
      ].join(";") + ";";
      document.body.appendChild(exportRoot);

      const makeTitle = (text, level = 2) => {
        const el = document.createElement(level === 2 ? "h2" : "h3");
        el.textContent = text;
        el.style.cssText = `font-size:${level === 2 ? 22 : 17}px;margin:0 0 14px;text-align:center;font-weight:700;`;
        return el;
      };

      const makeTable = (headers, rows) => {
        const table = document.createElement("table");
        table.style.cssText = "width:100%;border-collapse:collapse;table-layout:auto;font-size:11px;";
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        headers.forEach((label) => {
          const th = document.createElement("th");
          th.textContent = String(label ?? "-");
          th.style.cssText = "border:1px solid #777;background:#e9eef5;padding:6px;white-space:normal;text-align:left;font-weight:700;";
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        rows.forEach((values) => {
          const tr = document.createElement("tr");
          values.forEach((value) => {
            const td = document.createElement("td");
            td.textContent = String(value ?? "-");
            td.style.cssText = "border:1px solid #999;padding:5px;vertical-align:top;white-space:normal;overflow-wrap:anywhere;word-break:normal;";
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        return table;
      };

      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const addHtmlPage = async (titleText, headers, rows, pageNumber, totalPages) => {
        exportRoot.replaceChildren();
        exportRoot.appendChild(makeTitle(titleText));
        const subtitle = document.createElement("div");
        subtitle.textContent = `Page ${pageNumber} of ${totalPages}  |  Records: ${filteredReceivings.length}`;
        subtitle.style.cssText = "font-size:10px;margin:0 0 10px;text-align:right;color:#444;";
        exportRoot.appendChild(subtitle);
        exportRoot.appendChild(makeTable(headers, rows));
        const canvas = await html2canvas(exportRoot, {
          scale: 1.25,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1900,
        });
        const margin = 18;
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;
        const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
        if (pageNumber > 1) pdf.addPage("a3", "landscape");
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.78),
          "JPEG",
          margin,
          margin,
          canvas.width * scale,
          canvas.height * scale,
          undefined,
          "FAST"
        );
        canvas.width = 1;
        canvas.height = 1;
      };

      const reportChunkSize = 22;
      const reportChunks = [];
      for (let i = 0; i < reportRows.length; i += reportChunkSize) {
        reportChunks.push(reportRows.slice(i, i + reportChunkSize));
      }
      if (!reportChunks.length) reportChunks.push([]);
      const expiryChunkSize = 24;
      const expiryChunks = [];
      for (let i = 0; i < expiryRows.length; i += expiryChunkSize) {
        expiryChunks.push(expiryRows.slice(i, i + expiryChunkSize));
      }
      if (!expiryChunks.length) expiryChunks.push([]);

      const totalPages = reportChunks.length + expiryChunks.length + 1;
      let pageNumber = 1;
      for (const chunk of reportChunks) {
        await addHtmlPage(
          "HCM Supervisor Receiving Report / एचसीएम प्राप्ति रिपोर्ट",
          exportColumns.map((col) => getColumnLabel(col)),
          chunk,
          pageNumber++,
          totalPages
        );
      }
      for (const chunk of expiryChunks) {
        await addHtmlPage(
          "Packet Expiry Details / पैकेट की समाप्ति जानकारी",
          ["#", "District / जिला", "Project / परियोजना", "Sector / सेक्टर", "AWC Name / आंगनवाड़ी केंद्र", "AWC Code", "Food Item / खाद्य सामग्री", "Beneficiary Category / लाभार्थी श्रेणी", "Expiry Date / समाप्ति तिथि", "Packet Count / पैकेट संख्या", "Status / स्थिति", "Remarks / टिप्पणी"],
          chunk,
          pageNumber++,
          totalPages
        );
      }

      // Quantity summary also uses browser-rendered text so Hindi unit names remain readable.
      exportRoot.replaceChildren();
      exportRoot.appendChild(makeTitle("Total Quantity by Unit / इकाई के अनुसार कुल मात्रा"));
      const totalsRows = Object.entries(totals.quantityByUnit).map(([unit, total]) => [unit, Number(total.toFixed(2))]);
      exportRoot.appendChild(makeTable(["Unit / इकाई", "Total Quantity / कुल मात्रा"], totalsRows));
      const totalsCanvas = await html2canvas(exportRoot, {
        scale: 1.25, useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: 1900,
      });
      pdf.addPage("a3", "landscape");
      const totalsScale = Math.min((pageWidth - 36) / totalsCanvas.width, (pageHeight - 36) / totalsCanvas.height);
      pdf.addImage(totalsCanvas.toDataURL("image/jpeg", 0.78), "JPEG", 18, 18,
        totalsCanvas.width * totalsScale, totalsCanvas.height * totalsScale, undefined, "FAST");
      totalsCanvas.width = 1;
      totalsCanvas.height = 1;

      pdf.save("hcm-supervisor-receiving.pdf");
    } catch (err) {
      console.error("HCM receiving PDF export failed:", err);
      setError(t(`PDF export failed: ${err?.message || "Please try again."}`, `PDF निर्यात विफल: ${err?.message || "कृपया पुनः प्रयास करें।"}`));
    } finally {
      if (exportRoot?.parentNode) exportRoot.parentNode.removeChild(exportRoot);
      setIsPrinting(false);
    }
  };

  const exportToExcel = () => {
    try {
      const exportColumns = visibleColumns.filter((col) => !["select", "actions"].includes(col.dataField));
      const dataToExport = filteredReceivings.map((item, index) => {
        const row = {};
        exportColumns.forEach((col) => { row[getColumnLabel(col)] = exportValue(item, col, index); });
        return row;
      });
      const quantityTotalsData = Object.entries(totals.quantityByUnit).map(([unit, total]) => ({
        Unit: unit, "Total Quantity": Number(total.toFixed(2)),
      }));
      const expiryData = filteredReceivings.flatMap((item, index) => {
        const entries = getExpirySummary(item).entries;
        return (entries.length ? entries : [{ packets: "", date: "", remarks: "" }]).map((entry) => ({
          "#": index + 1, District: item.district ?? "", Project: item.project ?? "",
          Sector: item.sector ?? "", "AWC Name": item.awc_name ?? "", "AWC Code": item.awc_code ?? "",
          "AWC Type": item.awc_type ?? "", "Food Item": item.food_item ?? "",
          "Beneficiary Category": item.bene_category ?? "", Quantity: item.quantity ?? "", Unit: item.unit ?? "",
          "Date of Receiving": formatDateForReport(item.date),
          "Max Expiry Date": formatDateForReport(item.max_expirydate ?? item.max_expiry_date ?? item.maxExpiryDate),
          "Expiry Date": formatDateForReport(entry.date), "Packet Count": entry.packets,
          "Expiry Status": entry.date ? (isPacketExpiryPast(entry.date) ? "EXPIRED" : "Not expired") : "No expiry date",
          Remarks: entry.remarks ?? "", "Sector Status": item.sector_status || "pending",
          "Sector Remark": item.sector_remark ?? "",
        }));
      });
      const workbook = XLSX.utils.book_new();
      const addSheet = (rows, name) => {
        const ws = XLSX.utils.json_to_sheet(rows);
        if (ws["!ref"]) {
          ws["!autofilter"] = { ref: ws["!ref"] };
          const range = XLSX.utils.decode_range(ws["!ref"]);
          ws["!cols"] = Array.from({ length: range.e.c + 1 }, (_, c) => {
            const header = String(ws[XLSX.utils.encode_cell({ r: 0, c })]?.v ?? "");
            let width = header.length + 2;
            for (let r = 1; r <= range.e.r; r += 1) {
              width = Math.max(width, Math.min(42, String(ws[XLSX.utils.encode_cell({ r, c })]?.v ?? "").length + 2));
            }
            return { wch: Math.min(42, width) };
          });
        }
        XLSX.utils.book_append_sheet(workbook, ws, name);
      };
      addSheet(dataToExport, "HCM Receiving Report");
      addSheet(quantityTotalsData, "Quantity Totals");
      addSheet(expiryData, "Packet Expiry Details");
      XLSX.writeFile(workbook, "hcm-supervisor-receiving.xlsx", { compression: true });
    } catch (err) {
      console.error("HCM receiving Excel export failed:", err);
      setError(t("Excel export failed. Please try again.", "Excel निर्यात विफल। कृपया पुनः प्रयास करें।"));
    }
  };

  const renderColumnModal = () => (
    <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएं/छिपाएं")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {columns.map((col, index) => (col.dataField !== 'select' &&
          <Form.Check key={index} type="checkbox" label={getColumnLabel(col)} checked={col.visible} onChange={() => handleColumnToggle(index)} />
        ))}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button>
      </Modal.Footer>
    </Modal>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination>{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <SupervisorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <SupervisorHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <h3 className="mb-4">
            <FaUserCircle className="me-2" /> {t("HCM Supervisor Receiving", "HCM पर्यवेक्षक प्राप्ति")}
          </h3>
          {successMsg && <Alert variant="success">{successMsg}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {allocationError && <Alert variant="warning">{allocationError}</Alert>}
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <Row className="mb-3 g-2 align-items-center">
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? t(`${filters.district.length} selected`, `${filters.district.length} चयनित`) : t('All Districts', 'सभी ज़िले')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.district.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange('district', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? t(`${filters.sector.length} selected`, `${filters.sector.length} चयनित`) : t('All Sectors', 'सभी सेक्टर')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.sector.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange('sector', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? t(`${filters.project.length} selected`, `${filters.project.length} चयनित`) : t('All Projects', 'सभी परियोजनाएं')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.project.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange('project', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.awc_name.length ? t(`${filters.awc_name.length} selected`, `${filters.awc_name.length} चयनित`) : t('All AWC Names', 'सभी आंगनवाड़ी केंद्रों के नाम')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.awc_name.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.awc_name.includes(v)} onChange={() => handleMultiSelectChange('awc_name', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? t(`${filters.food_item.length} selected`, `${filters.food_item.length} चयनित`) : t('All Food Items', 'सभी खाद्य सामग्री')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.food_item.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange('food_item', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.bene_category.length ? t(`${filters.bene_category.length} selected`, `${filters.bene_category.length} चयनित`) : t('All Bene. Categories', 'सभी लाभार्थी श्रेणियां')}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.bene_category.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.bene_category.includes(v)} onChange={() => handleMultiSelectChange('bene_category', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
          </Row>
          <Row className="mb-3 g-2 align-items-end">
            <Col md={3}><Form.Group><Form.Label>{t("Start Date", "आरंभ तिथि")}</Form.Label><Form.Control type="date" name="startDate" value={filters.startDate} onChange={handleDateChange} /></Form.Group></Col>
            <Col md={3}><Form.Group><Form.Label>{t("End Date", "समाप्ति तिथि")}</Form.Label><Form.Control type="date" name="endDate" value={filters.endDate} onChange={handleDateChange} /></Form.Group></Col>
            <Col xs="auto"><Button variant="secondary" onClick={resetFilters}>{t("Reset Filters", "फ़िल्टर रीसेट करें")}</Button></Col>
          </Row>
          <Row className="mb-3">
            <Col>
              {selectedIds.length > 0 && (
                <div className="d-flex gap-2">
                  <Button variant="success" size="sm" onClick={() => { setBulkAction("approved"); setShowBulkActionModal(true); }} disabled={!canApprove}>
                    {t(`Approve Selected (${selectedIds.length})`, `चयनित स्वीकृत करें (${selectedIds.length})`)}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setBulkAction("rejected"); setShowBulkActionModal(true); }} disabled={!canReject}>
                    {t(`Reject Selected (${selectedIds.length})`, `चयनित अस्वीकार करें (${selectedIds.length})`)}
                  </Button>
                </div>
              )}
            </Col>
          </Row>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf /> PDF</Button>
            <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2"><FaFileExcel /> Excel</Button>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}><FaEye /> {t("Columns", "कॉलम")}</Button>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : (
              <Table striped bordered hover responsive ref={tableRef}>
                <thead>
                  <tr>
                    {visibleColumns.filter(col => !isPrinting || (col.dataField !== 'select' && col.dataField !== 'actions')).map((col) => (
                      <th key={col.dataField}>
                        {col.dataField === "select" ? (
                          <Form.Check type="checkbox" onChange={handleSelectAll} checked={areAllPendingSelected}
                          />
                        ) : (
                          getColumnLabel(col)
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => {
                      const comparison = getStockAllocationComparison(
                        item,
                        allocations,
                        foodItemOptions,
                        "HCM"
                      );
                      const comparisonStyle = getAllocationComparisonStyle(comparison);
                      return (
                      <tr key={item.id} title={comparison ? `Received: ${comparison.received}; allocation: ${comparison.allocated}` : undefined}>{visibleColumns.filter(col => !isPrinting || (col.dataField !== 'select' && col.dataField !== 'actions')).map((col) => {
                          if (col.dataField === 'select') {
                            return <td key="select" style={comparisonStyle}><Form.Check type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} /></td>;
                          }
                          let cellContent;
                          switch (col.dataField) {
                            case "#":
                              cellContent = indexOfFirstItem + index + 1;
                              break;
                            case "date":
                              cellContent = new Date(item.date).toLocaleDateString();
                              break;
                            case "max_expirydate":
                              cellContent = formatDateForReport(item.max_expirydate);
                              break;
                            case "expired_packets":
                              cellContent = getExpirySummary(item).expiredPackets;
                              break;
                            case "expiry_breakdown":
                              cellContent = getExpirySummary(item).details;
                              break;
                            case "months":
                              cellContent = formatMonthsArray(item.months);
                              break;
                            case "quarter":
                              cellContent = item.quarter || '-';
                              break;
                            case "sector_status":
                              if (isPrinting) {
                                cellContent = <div>{item.sector_status || 'pending'}</div>;
                              } else {
                                cellContent = <Badge bg={getStatusVariant(item.sector_status)}>{item.sector_status || 'pending'}</Badge>;
                              }
                              break;
                            case "actions":
                              return (
                                <td key="actions" style={comparisonStyle}>
                                  <div className="d-flex gap-1 flex-wrap">
                                    <Button variant="outline-success" size="sm" disabled={item.sector_status === 'approved'} onClick={() => { setBulkAction("approved"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>{t("Approve", "स्वीकृत करें")}</Button>
                                    <Button variant="outline-danger" size="sm" disabled={item.sector_status === 'rejected'} onClick={() => { setBulkAction("rejected"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>{t("Reject", "अस्वीकार करें")}</Button>
                                    {/* ── NEW: Expiry button ── */}
                                    {hasPacketExpiry(item) && (
                                      <Button
                                        variant="outline-warning"
                                        size="sm"
                                        onClick={() => handleOpenExpiryModal(item)}
                                        title="View Packet Expiry Details"
                                      >
                                        <FaCalendarCheck /> {t("Expiry", "समाप्ति")}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              );
                            default:
                              cellContent = item[col.dataField];
                          }
                          return <td key={col.dataField} style={comparisonStyle}>{cellContent}</td>;
                        })}
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="text-center">
                        {t("No receiving records found.", "प्राप्ति का कोई रिकॉर्ड नहीं मिला।")}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={visibleColumns.findIndex(c => c.dataField === 'quantity')}>{t("Total", "कुल")}</td>
                    {visibleColumns.slice(visibleColumns.findIndex(c => c.dataField === 'quantity')).map(col => {
                      if (col.dataField === 'quantity') {
                        return (
                          <td key="total_quantity">
                            {!isPrinting && <Button variant="link" size="sm" onClick={() => handleViewTotals(filteredReceivings, t('HCM Supervisor Receiving Totals', 'HCM पर्यवेक्षक प्राप्ति कुल'))}>{t("View Totals", "कुल देखें")}</Button>}
                          </td>
                        );
                      }
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
              </Table>
            )}
          </div>
          {filteredReceivings.length > 0 && renderPagination()}
          {renderColumnModal()}
          <Modal show={showBulkActionModal} onHide={() => setShowBulkActionModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{t("Bulk Action", "सामूहिक कार्रवाई")}: {t(bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1), bulkAction === "approved" ? "स्वीकृति" : "अस्वीकृति")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>{t("Remark", "टिप्पणी")} {bulkAction === 'rejected' && t("(Required)", "(आवश्यक)")}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder={t("Enter remark", "टिप्पणी दर्ज करें")}
                  value={bulkRemark}
                  onChange={(e) => setBulkRemark(e.target.value)}
                />
              </Form.Group>
              {actionError && <Alert variant="danger" className="mt-3">{actionError}</Alert>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowBulkActionModal(false)}>{t("Cancel", "रद्द करें")}</Button>
              <Button variant={bulkAction === 'approved' ? 'success' : 'danger'} onClick={handleBulkAction} disabled={submitting}>{submitting ? t("Submitting...", "जमा किया जा रहा है...") : `${t("Confirm", "पुष्टि करें")} ${t(bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1), bulkAction === "approved" ? "स्वीकृति" : "अस्वीकृति")}`}</Button>
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
                      <th>{t("Unit", "इकाई")}</th>
                      <th>{t("Total Quantity", "कुल मात्रा")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modalData.totals).map(([unit, total]) => (
                      <tr key={unit}><td>{unit}</td><td>{total.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </Table>
              ) : <p>{t("No quantity data to display.", "दिखाने के लिए मात्रा का डेटा उपलब्ध नहीं है।")}</p>}
            </Modal.Body>
          </Modal>

          {/* ── NEW: Expiry Details Modal ── */}
          {expiryViewItem && (
            <Modal show={showExpiryModal} onHide={handleCloseExpiryModal} centered>
              <Modal.Header closeButton className="view-modal-header">
                <Modal.Title>
                  <FaCalendarCheck className="me-2" />
                  {t("Packet Expiry Details", "पैकेट समाप्ति विवरण")}: {expiryViewItem.food_item}
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="view-modal-body">
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <strong>{t("AWC Name:", "आंगनवाड़ी केंद्र का नाम:")}</strong> {expiryViewItem.awc_name}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("AWC Code:", "आंगनवाड़ी केंद्र कोड:")}</strong> {expiryViewItem.awc_code}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Food Item:", "खाद्य सामग्री:")}</strong> {expiryViewItem.food_item}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Total Packets:", "कुल पैकेट:")}</strong> {expiryViewItem.quantity} {expiryViewItem.unit}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Date of Receiving:", "प्राप्ति की तिथि:")}</strong>{' '}
                    {expiryViewItem.date ? new Date(expiryViewItem.date).toLocaleDateString() : '-'}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Months:", "महीने:")}</strong>{' '}
                    {formatMonthsArray(expiryViewItem.months)}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Max Expiry Date:", "अधिकतम समाप्ति तिथि:")}</strong>{' '}
                    {expiryViewItem.max_expirydate ? new Date(expiryViewItem.max_expirydate).toLocaleDateString() : '-'}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>{t("Sector Status:", "सेक्टर स्थिति:")}</strong>{' '}
                    <Badge bg={getStatusVariant(expiryViewItem.sector_status)}>
                      {expiryViewItem.sector_status || 'pending'}
                    </Badge>
                  </ListGroup.Item>
                  {expiryViewItem.sector_remark && (
                    <ListGroup.Item>
                      <strong>{t("Sector Remark:", "सेक्टर टिप्पणी:")}</strong> {expiryViewItem.sector_remark}
                    </ListGroup.Item>
                  )}
                </ListGroup>

                <hr />

                <h6 className="mb-2">
                  <FaCalendarCheck className="me-1" /> {t("Packet-wise Expiry List", "पैकेट-वार समाप्ति सूची")}
                </h6>
                <Table bordered striped size="sm" className="mb-0">
                  <thead>
                    <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                      <th className="text-center" style={{ width: '50px' }}>{t("S. No.", "क्रम संख्या")}</th>
                      <th className="text-center">{t("Packets", "पैकेट")}</th>
                      <th className="text-center">{t("Expiry Date", "समाप्ति तिथि")}</th>
                      <th className="text-center">{t("Remarks", "टिप्पणियां")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPacketExpiryEntries(expiryViewItem).length > 0 ? (
                      getPacketExpiryEntries(expiryViewItem).map((pe, i) => {
                        const count = pe.packets;
                        const date = pe.date;
                        const remark = pe.remarks;
                        return (
                          <tr key={i}>
                            <td className="text-center">{i + 1}</td>
                            <td className="text-center fw-semibold">{count == null || count === '' ? '-' : count}</td>
                            <td className="text-center">
                              {date ? new Date(date).toLocaleDateString() : '-'}
                            </td>
                            <td>{remark || '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-muted p-3">
                          {t("No packet expiry details available.", "पैकेट समाप्ति का कोई विवरण उपलब्ध नहीं है।")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {getPacketExpiryEntries(expiryViewItem).length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                        <td className="text-end">{t("Total:", "कुल:")}</td>
                        <td className="text-center">
                          {getPacketExpiryEntries(expiryViewItem).reduce((sum, pe) => sum + (parseFloat(pe.packets) || 0), 0)}
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </Table>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseExpiryModal}>{t("Close", "बंद करें")}</Button>
              </Modal.Footer>
            </Modal>
          )}

        </Container>
      </div>
    </div>
  );
};

export default HcmSupervisorReceiving;