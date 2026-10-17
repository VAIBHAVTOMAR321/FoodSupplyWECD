import React, { useState, useEffect, useMemo, useRef } from "react";

import {
  Container,
  Card,
  Spinner,
  Table,
  Button,
  Alert,
  Badge,
  Form,
  Modal,
  Pagination,
  Dropdown,
  Row,
  Col,
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";

import "../../assets/css/supervisorleftnav.css";

import SupervisorHeader from "./SupervisorHeader";

import SupervisorLeftNav from "./SupervisorLeftNav";

import {
  getAllocationComparisonStyle,
  getFoodItemOptions,
  getStockAllocationDistributionComparison,
} from "./stockAllocationComparison";

import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";


import * as XLSX from "xlsx";

// Helper to format months array to string

const normalizeTrimesterKey = (row) => {
  const raw = row?.trimester ?? row?.quarter ?? row?.months ?? row?.month ?? "";
  const aliases = {
    "april-may-june": "apr-may-jun",
    "july-august-september": "jul-aug-sep",
    "october-november-december": "oct-nov-dec",
    "january-february-march": "jan-feb-mar",
    "apr-may-jun": "apr-may-jun",
    "jul-aug-sep": "jul-aug-sep",
    "oct-nov-dec": "oct-nov-dec",
    "jan-feb-mar": "jan-feb-mar",
  };
  const token = Array.isArray(raw)
    ? raw.join("-")
    : String(raw).trim().toLowerCase();
  const normalized = token.replace(/\s+/g, "").replace(/_/g, "-");
  if (aliases[normalized]) return aliases[normalized];
  const months = normalized
    .split(/[,\s/-]+/)
    .filter(Boolean)
    .map(
      (m) =>
        ({
          april: "apr",
          june: "jun",
          july: "jul",
          august: "aug",
          september: "sep",
          october: "oct",
          november: "nov",
          december: "dec",
          january: "jan",
          february: "feb",
          march: "mar",
        })[m] || m,
    );
  const groups = {
    "apr-may-jun": ["apr", "may", "jun"],
    "jul-aug-sep": ["jul", "aug", "sep"],
    "oct-nov-dec": ["oct", "nov", "dec"],
    "jan-feb-mar": ["jan", "feb", "mar"],
  };
  for (const [key, group] of Object.entries(groups)) {
    if (group.every((m) => months.includes(m))) return key;
  }
  return normalized || "-";
};
const formatTrimester = (row) =>
  ({
    "apr-may-jun": "Apr-May-Jun",
    "jul-aug-sep": "Jul-Aug-Sep",
    "oct-nov-dec": "Oct-Nov-Dec",
    "jan-feb-mar": "Jan-Feb-Mar",
  })[normalizeTrimesterKey(row)] ||
  (normalizeTrimesterKey(row) === "-" ? "-" : normalizeTrimesterKey(row));
const formatDistributionDate = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const formatMonthsArray = (months) => {
  if (!months) return "";

  if (Array.isArray(months)) return months.join(", ");

  return months;
};

const HcmSupervisorDistributions = () => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();

  const [distributions, setDistributions] = useState([]);

  const [allocations, setAllocations] = useState([]);

  const [foodItemOptions, setFoodItemOptions] = useState([]);

  const [comparisonError, setComparisonError] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage] = useState(20);

  const [isPrinting, setIsPrinting] = useState(false);

  const [showQtyModal, setShowQtyModal] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");

  const [actionError, setActionError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [loadingAction, setLoadingAction] = useState({});

  const [openRemarkId, setOpenRemarkId] = useState(null);

  const [openRemarkAction, setOpenRemarkAction] = useState("");

  const [remarkValue, setRemarkValue] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [showBulkRemarkModal, setShowBulkRemarkModal] = useState(false);

  const [bulkRemark, setBulkRemark] = useState("");

  const [bulkAction, setBulkAction] = useState("");

  const [showRemarkModal, setShowRemarkModal] = useState(false);

  const [selectedRemarks, setSelectedRemarks] = useState(null);

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

    { dataField: "trimester", text: "Trimester", visible: true },

    { dataField: "total_beneficiaries", text: "Beneficiaries", visible: true },

    { dataField: "quantity", text: "Qty", visible: true },

    { dataField: "unit", text: "Unit", visible: true },

    { dataField: "anganwadi_remark", text: "Remark", visible: true },

    { dataField: "sector_status", text: "Sector Status", visible: true },

    { dataField: "action", text: "Action", visible: true },
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

    startDate: "",

    endDate: "",
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

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (distributions.length > 0) {
      setUniqueDistricts([
        ...new Set(distributions.map((item) => item.district)),
      ]);

      setUniqueProjects([
        ...new Set(distributions.map((item) => item.project)),
      ]);

      setUniqueSectors([...new Set(distributions.map((item) => item.sector))]);

      setUniqueFoodItems([
        ...new Set(distributions.map((item) => item.food_item)),
      ]);

      setUniqueAwcTypes([
        ...new Set(distributions.map((item) => item.awc_type)),
      ]);

      setUniqueSectorStatuses([
        ...new Set(distributions.map((item) => item.sector_status)),
      ]);
    }
  }, [distributions]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];

      if (currentValues.includes(value)) {
        return {
          ...prevFilters,
          [filterName]: currentValues.filter((v) => v !== value),
        };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const filteredData = useMemo(() => {
    return distributions.filter((item) => {
      const {
        district,
        project,
        sector,
        food_item,
        awc_type,
        bene_category,
        sector_status,
        startDate,
        endDate,
      } = filters;

      const matchesFilters =
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector)) &&
        (food_item.length === 0 || food_item.includes(item.food_item)) &&
        (bene_category.length === 0 ||
          bene_category.includes(item.bene_category)) &&
        (awc_type.length === 0 || awc_type.includes(item.awc_type)) &&
        (sector_status.length === 0 ||
          sector_status.includes(item.sector_status));

      const itemDate = item.date ? new Date(item.date) : null;

      const matchesDateRange =
        (!startDate || (itemDate && itemDate >= new Date(startDate))) &&
        (!endDate || (itemDate && itemDate <= new Date(endDate + "T23:59:59")));

      return matchesFilters && matchesDateRange;
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);

    setError("");

    setComparisonError("");

    const [distributionResult, allocationResult, foodItemResult] =
      await Promise.allSettled([
        api.get("/hcm-supervisor-distributions/"),

        api.get("/supplementary-nutrition-supervisor/"),

        api.get("/categoryandfooditem/"),
      ]);

    if (distributionResult.status === "fulfilled") {
      const response = distributionResult.value;

      const raw = response.data?.data || response.data || [];

      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

      setDistributions(items);
    } else {
      setError(t("Failed to fetch HCM distributions.", "HCM वितरण डेटा प्राप्त नहीं हो सका।"));

      console.error(
        "Failed to fetch HCM distributions:",
        distributionResult.reason,
      );
    }

    if (allocationResult.status === "fulfilled") {
      const payload = allocationResult.value.data;

      const rows = Array.isArray(payload) ? payload : payload?.data;

      if (Array.isArray(rows) && payload?.success !== false) {
        setAllocations(rows);
      } else {
        setAllocations([]);

        setComparisonError(
          t("Stock allocation data is unavailable; distributions cannot be compared.", "स्टॉक आवंटन डेटा उपलब्ध नहीं है; वितरण की तुलना नहीं की जा सकती।"),
        );
      }
    } else {
      setAllocations([]);

      setComparisonError(
        t("Failed to fetch stock allocation data; distributions cannot be compared.", "स्टॉक आवंटन डेटा प्राप्त नहीं हो सका; वितरण की तुलना नहीं की जा सकती।"),
      );

      console.error(
        "Failed to fetch stock allocation data:",
        allocationResult.reason,
      );
    }

    if (foodItemResult.status === "fulfilled") {
      const payload = foodItemResult.value.data;

      const mappings = getFoodItemOptions(payload);

      setFoodItemOptions(mappings);

      if (payload?.success === false || mappings.length === 0) {
        setComparisonError(
          t("Food item mappings are unavailable; distributions cannot be compared.", "खाद्य सामग्री मैपिंग उपलब्ध नहीं है; वितरण की तुलना नहीं की जा सकती।"),
        );
      }
    } else {
      setFoodItemOptions([]);

      setComparisonError(
        t("Failed to fetch food item mappings; distributions cannot be compared.", "खाद्य सामग्री मैपिंग प्राप्त नहीं हो सकी; वितरण की तुलना नहीं की जा सकती।"),
      );

      console.error(
        "Failed to fetch food item mappings:",
        foodItemResult.reason,
      );
    }

    setLoading(false);
  };

  const fetchBeneficiaryCategories = async () => {
    try {
      const response = await api.get("/beneficiary-categories/");

      const data = response.data || [];

      setBeneficiaryCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch beneficiary categories.", err);

      setError(t("Failed to fetch beneficiary categories.", "लाभार्थी श्रेणियां प्राप्त नहीं हो सकीं।"));
    }
  };

  useEffect(() => {
    if (api) {
      fetchDistributions();

      fetchBeneficiaryCategories();
    }
  }, [api]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredData.map((item) => item.id);

      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllPending = () => {
    const pendingIds = filteredData

      .filter((item) => item.sector_status === "pending" || !item.sector_status)

      .map((item) => item.id);

    setSelectedIds(pendingIds);
  };

  const isAllSelected = useMemo(
    () => filteredData.length > 0 && selectedIds.length === filteredData.length,
    [filteredData, selectedIds],
  );

  const handleToggleRemark = (item, action) => {
    if (openRemarkId === item.id) {
      setOpenRemarkId(null);

      setOpenRemarkAction("");
    } else {
      setOpenRemarkId(item.id);

      setOpenRemarkAction(action);

      setRemarkValue("");

      setActionError("");
    }
  };

  const handleStatusUpdate = async (item) => {
    const action = openRemarkAction;

    const remark = remarkValue.trim();

    setActionError("");

    if (action === "rejected" && !remark) {
      setActionError(t("Please enter a remark for rejection.", "अस्वीकृति के लिए कृपया टिप्पणी दर्ज करें।"));

      return;
    }

    setSubmitting(true);

    setLoadingAction((prev) => ({ ...prev, [item.id]: true }));

    try {
      const response = await api.put("/hcm-supervisor-distributions/", {
        ids: [item.id],

        sector_status: action,

        sector_remark: remark || "",
      });

      if (response.data?.success !== false) {
        setSuccessMsg(t(`Status updated to ${action} successfully.`, `स्थिति सफलतापूर्वक ${action === "approved" ? "स्वीकृत" : "अस्वीकृत"} की गई।`));

        setDistributions((prev) =>
          prev.map((d) =>
            d.id === item.id
              ? { ...d, sector_status: action, sector_remark: remark || "" }
              : d,
          ),
        );

        setOpenRemarkId(null);

        setOpenRemarkAction("");

        setRemarkValue("");

        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || t("Failed to update status.", "स्थिति अपडेट नहीं हो सकी।"));
      }
    } catch (err) {
      setActionError(t("Failed to update status. Please try again.", "स्थिति अपडेट नहीं हो सकी। कृपया पुनः प्रयास करें।"));

      console.error(err);
    } finally {
      setSubmitting(false);

      setLoadingAction((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      setActionError(t("No items selected.", "कोई आइटम चयनित नहीं है।"));

      return;
    }

    if (bulkAction === "rejected" && !bulkRemark.trim()) {
      setActionError(t("Please enter a remark for rejection.", "अस्वीकृति के लिए कृपया टिप्पणी दर्ज करें।"));

      return;
    }

    setSubmitting(true);

    try {
      const response = await api.put("/hcm-supervisor-distributions/", {
        ids: selectedIds,

        sector_status: bulkAction,

        sector_remark: bulkRemark.trim(),
      });

      if (response.data?.success !== false) {
        setSuccessMsg(t(`Successfully updated ${selectedIds.length} items.`, `${selectedIds.length} आइटम सफलतापूर्वक अपडेट किए गए।`));

        fetchDistributions();

        setSelectedIds([]);

        setShowBulkRemarkModal(false);

        setBulkRemark("");

        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(
          response.data?.message || t("Failed to perform bulk action.", "सामूहिक कार्रवाई नहीं की जा सकी।"),
        );
      }
    } catch (err) {
      setActionError(t("Failed to perform bulk action. Please try again.", "सामूहिक कार्रवाई नहीं की जा सकी। कृपया पुनः प्रयास करें।"));

      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRemark = (item) => {
    setSelectedRemarks(item);

    setShowRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);

    setSelectedRemarks(null);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved":
        return "success";

      case "rejected":
        return "danger";

      default:
        return "warning";
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];

    newColumns[index].visible = !newColumns[index].visible;

    setColumns(newColumns);
  };

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

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => {
        acc.beneficiaries += Number(item.total_beneficiaries) || 0;

        const quantity = parseFloat(item.quantity) || 0;

        const unit = item.unit || "N/A";

        acc.quantity += quantity;

        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }

        acc.quantityByUnit[unit] += quantity;

        return acc;
      },
      { beneficiaries: 0, quantity: 0, quantityByUnit: {} },
    );
  }, [filteredData]);

  const exportToPDF = async () => {
    // Render the actual Unicode table in the browser first. This preserves Hindi
    // glyphs (unlike jsPDF's built-in Helvetica font) while JPEG compression
    // keeps the resulting PDF reasonably small.
    const exportColumns = columns.filter(
      (col) => col.visible && col.dataField !== "action",
    );
    const headers = exportColumns.map((col) => getColumnLabel(col));
    const getValue = (row, col, index) => {
      if (col.dataField === "#") return String(index + 1);
      if (col.dataField === "date") return formatDistributionDate(row.date);
      if (col.dataField === "trimester") return formatTrimester(row);
      if (col.dataField === "sector_status") return row.sector_status || "pending";
      const value = row[col.dataField];
      return value === null || value === undefined || value === "" ? "-" : String(value);
    };

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      position: "fixed", left: "-100000px", top: "0", width: "1600px",
      background: "#ffffff", color: "#222222", padding: "12px",
      fontFamily: '"Noto Sans Devanagari", "Nirmala UI", Mangal, Arial, sans-serif',
      boxSizing: "border-box",
    });
    const table = document.createElement("table");
    Object.assign(table.style, {
      width: "100%", borderCollapse: "collapse", tableLayout: "fixed",
      fontSize: "12px", lineHeight: "1.25", overflowWrap: "anywhere",
    });
    const colgroup = document.createElement("colgroup");
    exportColumns.forEach((col) => {
      const colEl = document.createElement("col");
      colEl.style.width = ["awc_name", "food_item", "bene_category"].includes(col.dataField)
        ? "13%" : ["district", "project", "sector", "anganwadi_remark"].includes(col.dataField)
          ? "9%" : `${Math.max(5, 100 / exportColumns.length)}%`;
      colgroup.appendChild(colEl);
    });
    table.appendChild(colgroup);
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      Object.assign(th.style, {
        border: "1px solid #aeb8c2", padding: "5px 4px", textAlign: "left",
        background: "#e9eef2", fontWeight: "700", verticalAlign: "top",
        overflowWrap: "anywhere",
      });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    filteredData.forEach((row, index) => {
      const tr = document.createElement("tr");
      exportColumns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = getValue(row, col, index);
        Object.assign(td.style, {
          border: "1px solid #c4cbd1", padding: "4px", verticalAlign: "top",
          overflowWrap: "anywhere", background: index % 2 ? "#f8fafb" : "#ffffff",
        });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    const totalTr = document.createElement("tr");
    exportColumns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = col.dataField === "#" ? "Total" : col.dataField === "total_beneficiaries" ? String(totals.beneficiaries) : "";
      Object.assign(td.style, { border: "1px solid #aeb8c2", padding: "5px 4px", background: "#e9eef2", fontWeight: "700" });
      totalTr.appendChild(td);
    });
    tbody.appendChild(totalTr);
    table.appendChild(tbody);
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);

    try {
      // Wait for browser font shaping before rasterizing Devanagari text.
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = await html2canvas(wrapper, {
        scale: 1.15, backgroundColor: "#ffffff", useCORS: true,
        logging: false, imageTimeout: 10000,
      });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3", compress: true });
      const margin = 7;
      const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
      // Slice the table into page-sized horizontal strips, repeating the header
      // on each page. JPEG encoding significantly reduces file size vs PNG.
      const headerHeight = Math.max(1, Math.ceil(thead.getBoundingClientRect().height * 1.15));
      const scaleToPdf = pageWidth / canvas.width;
      const maxSliceHeight = Math.floor(pageHeight / scaleToPdf);
      let sourceY = 0;
      let pageIndex = 0;
      while (sourceY < canvas.height) {
        if (pageIndex > 0) pdf.addPage();
        let sliceHeight = Math.min(maxSliceHeight, canvas.height - sourceY);
        if (pageIndex > 0 && sourceY + sliceHeight < canvas.height) {
          sliceHeight = Math.max(headerHeight + 1, sliceHeight);
        }
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        if (pageIndex === 0) {
          ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        } else {
          // Repeat the header row at the top of subsequent pages, then continue
          // from the previous slice's body position.
          ctx.drawImage(canvas, 0, 0, canvas.width, headerHeight, 0, 0, canvas.width, headerHeight);
          const bodyAvailable = sliceHeight - headerHeight;
          const bodyStart = sourceY;
          ctx.drawImage(canvas, 0, bodyStart, canvas.width, bodyAvailable, 0, headerHeight, canvas.width, bodyAvailable);
        }
        const img = pageCanvas.toDataURL("image/jpeg", 0.72);
        const imgHeight = (pageCanvas.height * pageWidth) / pageCanvas.width;
        pdf.addImage(img, "JPEG", margin, margin, pageWidth, imgHeight, undefined, "FAST");
        sourceY += pageIndex === 0 ? sliceHeight : Math.max(1, sliceHeight - headerHeight);
        pageIndex += 1;
      }
      pdf.save("hcm_supervisor_distributions.pdf");
    } catch (error) {
      console.error("Failed to export HCM distributions PDF:", error);
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const exportToExcel = () => {
    const visCols = columns.filter(
      (c) => c.visible && c.dataField !== "#" && c.dataField !== "action",
    );

    const dataToExport = filteredData.map((row, index) => {
      const newRow = { "#": index + 1 };

      visCols.forEach((col) => {
        if (col.dataField !== "#") {
          if (col.dataField === "date" && row[col.dataField]) {
            newRow[getColumnLabel(col)] = formatDistributionDate(row[col.dataField]);
          } else if (col.dataField === "trimester") {
            newRow[getColumnLabel(col)] = formatTrimester(row);
          } else {
            newRow[getColumnLabel(col)] = row[col.dataField];
          }
        }
      });

      return newRow;
    });

    const beneficiaryIndex = visCols.findIndex(
      (c) => c.dataField === "total_beneficiaries",
    );

    const totalRow = { "#": "" };

    visCols.forEach((col) => {
      if (col.dataField === "total_beneficiaries")
        totalRow[getColumnLabel(col)] = totals.beneficiaries;
      else if (col.dataField === "quantity") totalRow[getColumnLabel(col)] = "";
      else totalRow[getColumnLabel(col)] = "";
    });

    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "HCM Supervisor Distributions",
    );

    XLSX.writeFile(workbook, "hcm_supervisor_distributions.xlsx");
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
      <Pagination.First
        key="first"
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      />,

      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />,
    );

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>,
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />,

      <Pagination.Last
        key="last"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />,
    );

    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination size="sm">{items}</Pagination>
      </div>
    );
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">{t("HCM Supervisor Distributions", "HCM पर्यवेक्षक वितरण")}</h3>

            <div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={exportToPDF}
                className="me-2"
              >
                <FaFilePdf className="me-1" /> {t("Export PDF", "PDF निर्यात करें")}
              </Button>

              <Button
                variant="outline-success"
                size="sm"
                onClick={exportToExcel}
                className="me-2"
              >
                <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
              </Button>

              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowColumnModal(true)}
              >
                <FaEye className="me-1" /> {t("Column Visibility", "कॉलम दिखाएं/छिपाएं")}
              </Button>
            </div>
          </div>

          <div className="mb-3 d-flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setBulkAction("approved");
                    setShowBulkRemarkModal(true);
                  }}
                >
                  {t(`Approve Selected (${selectedIds.length})`, `चयनित स्वीकृत करें (${selectedIds.length})`)}
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setBulkAction("rejected");
                    setShowBulkRemarkModal(true);
                  }}
                >
                  {t(`Reject Selected (${selectedIds.length})`, `चयनित अस्वीकार करें (${selectedIds.length})`)}
                </Button>
              </>
            )}

            <Button variant="info" size="sm" onClick={handleSelectAllPending}>
              {t("Select All Pending", "सभी लंबित चुनें")}
            </Button>
          </div>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-district"
                  className="w-100"
                >
                  {filters.district.length
                    ? t(`${filters.district.length} districts selected`, `${filters.district.length} ज़िले चयनित`)
                    : t("All Districts", "सभी ज़िले")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueDistricts.map((d) => (
                    <Dropdown.Item key={d} as="div">
                      <Form.Check
                        type="checkbox"
                        label={d}
                        checked={filters.district.includes(d)}
                        onChange={() => handleMultiSelectChange("district", d)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-project"
                  className="w-100"
                >
                  {filters.project.length
                    ? t(`${filters.project.length} projects selected`, `${filters.project.length} परियोजनाएं चयनित`)
                    : t("All Projects", "सभी परियोजनाएं")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueProjects.map((p) => (
                    <Dropdown.Item key={p} as="div">
                      <Form.Check
                        type="checkbox"
                        label={p}
                        checked={filters.project.includes(p)}
                        onChange={() => handleMultiSelectChange("project", p)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-sector"
                  className="w-100"
                >
                  {filters.sector.length
                    ? t(`${filters.sector.length} sectors selected`, `${filters.sector.length} सेक्टर चयनित`)
                    : t("All Sectors", "सभी सेक्टर")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueSectors.map((s) => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check
                        type="checkbox"
                        label={s}
                        checked={filters.sector.includes(s)}
                        onChange={() => handleMultiSelectChange("sector", s)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-food-item"
                  className="w-100"
                >
                  {filters.food_item.length
                    ? t(`${filters.food_item.length} items selected`, `${filters.food_item.length} आइटम चयनित`)
                    : t("All Food Items", "सभी खाद्य सामग्री")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueFoodItems.map((item) => (
                    <Dropdown.Item key={item} as="div">
                      <Form.Check
                        type="checkbox"
                        label={item}
                        checked={filters.food_item.includes(item)}
                        onChange={() =>
                          handleMultiSelectChange("food_item", item)
                        }
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-awc-type"
                  className="w-100"
                >
                  {filters.awc_type.length
                    ? t(`${filters.awc_type.length} types selected`, `${filters.awc_type.length} प्रकार चयनित`)
                    : t("All AWC Types", "सभी आंगनवाड़ी केंद्र प्रकार")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueAwcTypes.map((t) => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check
                        type="checkbox"
                        label={t}
                        checked={filters.awc_type.includes(t)}
                        onChange={() => handleMultiSelectChange("awc_type", t)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-bene-category"
                  className="w-100"
                >
                  {filters.bene_category.length
                    ? t(`${filters.bene_category.length} categories selected`, `${filters.bene_category.length} श्रेणियां चयनित`)
                    : t("All Bene. Categories", "सभी लाभार्थी श्रेणियां")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {beneficiaryCategories.map((cat) => (
                    <Dropdown.Item key={cat.id} as="div">
                      <Form.Check
                        type="checkbox"
                        label={cat.category_name}
                        checked={filters.bene_category.includes(
                          cat.category_name,
                        )}
                        onChange={() =>
                          handleMultiSelectChange(
                            "bene_category",
                            cat.category_name,
                          )
                        }
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="dropdown-sector-status"
                  className="w-100"
                >
                  {filters.sector_status.length
                    ? t(`${filters.sector_status.length} statuses selected`, `${filters.sector_status.length} स्थितियां चयनित`)
                    : t("All Statuses", "सभी स्थितियां")}
                </Dropdown.Toggle>

                <Dropdown.Menu
                  style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                  {uniqueSectorStatuses.map((s) => (
                    <Dropdown.Item key={String(s)} as="div">
                      <Form.Check
                        type="checkbox"
                        label={s || "pending"}
                        checked={filters.sector_status.includes(s)}
                        onChange={() =>
                          handleMultiSelectChange("sector_status", s)
                        }
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={3}>
              <Form.Label>{t("Start Date", "आरंभ तिथि")}</Form.Label>

              <Form.Control
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </Col>

            <Col md={2}>
              <Form.Label>{t("End Date", "समाप्ति तिथि")}</Form.Label>

              <Form.Control
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </Col>

            <Col md={3} className="d-flex align-items-end">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() =>
                  setFilters({
                    district: [],
                    project: [],
                    sector: [],
                    food_item: [],
                    awc_type: [],
                    bene_category: [],
                    sector_status: [],
                    startDate: "",
                    endDate: "",
                  })
                }
                className="me-2"
              >
                {t("Clear Filters", "फ़िल्टर साफ़ करें")}
              </Button>
            </Col>
          </Row>

          {!isPrinting && successMsg && (
            <Alert variant="success" className="mb-3">
              {successMsg}
            </Alert>
          )}

          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {comparisonError && (
            <Alert variant="warning" className="mb-3">
              {comparisonError}
            </Alert>
          )}

          {actionError && (
            <Alert variant="danger" className="mb-3">
              {actionError}
            </Alert>
          )}

          <Card className="shadow-sm">
            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-4 text-muted">
                {t("No HCM distributions found.", "कोई HCM वितरण नहीं मिला।")}
              </div>
            ) : (
              <div className="table-responsive">
                <Table
                  striped
                  bordered
                  hover
                  responsive
                  className="mb-0"
                  ref={tableRef}
                >
                  <thead>
                    <tr>
                      {!isPrinting && (
                        <th style={{ width: "50px" }}>
                          <Form.Check
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={isAllSelected}
                          />
                        </th>
                      )}

                      {visibleColumns
                        .filter(
                          (col) => !isPrinting || col.dataField !== "action",
                        )
                        .map((col) => {
                          let thStyle = {};

                          if (col.dataField === "awc_name")
                            thStyle.minWidth = "250px";

                          if (col.dataField === "food_item")
                            thStyle.minWidth = "200px";

                          if (col.dataField === "bene_category")
                            thStyle.minWidth = "200px";

                          return (
                            <th key={`th-${col.dataField}`} style={thStyle}>
                              {getColumnLabel(col)}
                            </th>
                          );
                        })}
                    </tr>
                  </thead>

                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((row, index) => {
                        const comparison =
                          getStockAllocationDistributionComparison(
                            row,

                            allocations,

                            foodItemOptions,

                            "HCM",
                          );

                        const comparisonStyle =
                          getAllocationComparisonStyle(comparison);

                        return (
                          <React.Fragment key={`row-${row.id}`}>
                            <tr
                              title={
                                comparison
                                  ? `Packets: ${comparison.actualQuantity}/${comparison.expectedQuantity}; beneficiaries: ${comparison.actualBeneficiaries}/${comparison.expectedBeneficiaries}`
                                  : undefined
                              }
                            >
                              {!isPrinting && (
                                <td style={comparisonStyle}>
                                  <Form.Check
                                    type="checkbox"
                                    checked={selectedIds.includes(row.id)}
                                    onChange={() => handleSelectOne(row.id)}
                                  />
                                </td>
                              )}

                              {visibleColumns
                                .filter(
                                  (col) =>
                                    !isPrinting || col.dataField !== "action",
                                )
                                .map((col) => {
                                  let cellContent,
                                    cellClassName = "",
                                    cellStyle = {};

                                  if (col.dataField === "#") {
                                    cellContent = index + 1;
                                  } else if (
                                    col.dataField === "date" &&
                                    row[col.dataField]
                                  ) {
                                    cellContent = formatDistributionDate(
                                      row[col.dataField],
                                    );
                                  } else if (col.dataField === "trimester") {
                                    cellContent = formatTrimester(row);
                                  } else if (
                                    col.dataField === "bene_category"
                                  ) {
                                    cellContent = (
                                      <div>{row[col.dataField]}</div>
                                    );

                                    cellClassName = "bene-category-cell"; // This class remains on the <td>

                                    cellStyle = {
                                      minWidth: "200px",
                                      wordBreak: "break-word",
                                    };
                                  } else if (col.dataField === "food_item") {
                                    cellContent = (
                                      <div className="style-table-td">
                                        {row[col.dataField]}
                                      </div>
                                    );

                                    cellClassName = "food-item-cell";

                                    cellStyle = {
                                      minWidth: "200px",
                                      wordBreak: "break-word",
                                    };
                                  } else if (
                                    col.dataField === "sector_status"
                                  ) {
                                    cellContent = isPrinting ? (
                                      row[col.dataField] || "pending"
                                    ) : (
                                      <Badge
                                        bg={getStatusVariant(
                                          row[col.dataField],
                                        )}
                                      >
                                        {row[col.dataField] || "pending"}
                                      </Badge>
                                    );
                                  } else if (col.dataField === "action") {
                                    cellContent = (
                                      <div className="d-flex align-items-center gap-2">
                                        <Button
                                          variant="outline-success"
                                          size="sm"
                                          disabled={
                                            row.sector_status === "approved" ||
                                            row.sector_status === "rejected" ||
                                            loadingAction[row.id]
                                          }
                                          onClick={() =>
                                            handleToggleRemark(row, "approved")
                                          }
                                        >
                                          {t("Approve", "स्वीकृत करें")}
                                        </Button>

                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          disabled={
                                            row.sector_status === "approved" ||
                                            row.sector_status === "rejected" ||
                                            loadingAction[row.id]
                                          }
                                          onClick={() =>
                                            handleToggleRemark(row, "rejected")
                                          }
                                        >
                                          {t("Reject", "अस्वीकार करें")}
                                        </Button>

                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => handleViewRemark(row)}
                                        >
                                          {t("View Remark", "टिप्पणी देखें")}
                                        </Button>
                                      </div>
                                    );
                                  } else {
                                    cellContent = row[col.dataField];
                                  }

                                  return (
                                    <td
                                      key={`td-${row.id}-${col.dataField}`}
                                      className={cellClassName}
                                      style={{
                                        ...comparisonStyle,
                                        ...cellStyle,
                                      }}
                                    >
                                      {cellContent}
                                    </td>
                                  );
                                })}
                            </tr>

                            {openRemarkId === row.id && (
                              <tr>
                                <td
                                  colSpan={
                                    visibleColumns.length + (isPrinting ? 0 : 1)
                                  }
                                >
                                  <div className="d-flex align-items-start gap-2">
                                    <Form.Control
                                      type="text"
                                      size="sm"
                                      placeholder={t("Enter remark", "टिप्पणी दर्ज करें")}
                                      value={remarkValue}
                                      onChange={(e) =>
                                        setRemarkValue(e.target.value)
                                      }
                                      className="me-2"
                                      style={{ maxWidth: "300px" }}
                                    />

                                    <Button
                                      size="sm"
                                      variant={
                                        openRemarkAction === "approved"
                                          ? "success"
                                          : "danger"
                                      }
                                      disabled={
                                        submitting || loadingAction[row.id]
                                      }
                                      onClick={() => handleStatusUpdate(row)}
                                    >
                                      {loadingAction[row.id]
                                        ? t("Saving...", "सहेजा जा रहा है...")
                                        : t("Save", "सहेजें")}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={
                                        submitting || loadingAction[row.id]
                                      }
                                      onClick={() => {
                                        setOpenRemarkId(null);

                                        setOpenRemarkAction("");

                                        setRemarkValue("");

                                        setActionError("");
                                      }}
                                    >
                                      {t("Cancel", "रद्द करें")}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={visibleColumns.length + (isPrinting ? 0 : 1)}
                          className="text-center"
                        >
                          {t("No data available", "कोई डेटा उपलब्ध नहीं है")}
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr>
                      {!isPrinting && <td key="total-select-spacer"></td>}

                      {visibleColumns
                        .filter(
                          (col) => !isPrinting || col.dataField !== "action",
                        )
                        .map((col) => {
                          let cellContent = "";

                          if (col.dataField === "#") {
                            cellContent = <strong>{t("Total", "कुल")}</strong>;
                          } else if (col.dataField === "total_beneficiaries") {
                            cellContent = (
                              <strong>{totals.beneficiaries}</strong>
                            );
                          } else if (col.dataField === "quantity") {
                            cellContent = (
                              <div className="d-flex align-items-center justify-content-end">
                                {/* <strong>{totals.quantity.toFixed(2)}</strong> */}

                                {!isPrinting && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => setShowQtyModal(true)}
                                    className="p-1"
                                  >
                                    {t("View Total", "कुल देखें")}
                                  </Button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <td key={`tf-${col.dataField}`}>{cellContent}</td>
                          );
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
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएं/छिपाएं")}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={getColumnLabel(col)}
                checked={col.visible}
                onChange={() => handleColumnToggle(index)}
              />
            ))}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowColumnModal(false)}
            >
              {t("Close", "बंद करें")}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showQtyModal}
          onHide={() => setShowQtyModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>{t("Quantity Breakdown by Unit", "इकाई के अनुसार मात्रा का विवरण")}</Modal.Title>
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

        <Modal
          show={showRemarkModal}
          onHide={handleCloseRemarkModal}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>{t("All Remarks", "सभी टिप्पणियां")} - {selectedRemarks?.awc_name}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {selectedRemarks && (
              <div>
                <div className="mb-3">
                  <h6>{t("Sector Remark", "सेक्टर टिप्पणी")}</h6>

                  <p className="mb-1">
                    <strong>{t("Status:", "स्थिति:")}</strong>{" "}
                    <Badge bg={getStatusVariant(selectedRemarks.sector_status)}>
                      {selectedRemarks.sector_status || "pending"}
                    </Badge>
                  </p>

                  <p className="mb-0">
                    <strong>{t("Remark:", "टिप्पणी:")}</strong>{" "}
                    {selectedRemarks.sector_remark || t("No remark", "कोई टिप्पणी नहीं")}
                  </p>
                </div>

                <div className="mb-3">
                  <h6>{t("Anganwadi Details", "आंगनवाड़ी विवरण")}</h6>

                  <p className="mb-1">
                    <strong>{t("Expired Quantity:", "समाप्त मात्रा:")}</strong>{" "}
                    {selectedRemarks.expired_quantity || 0}
                  </p>

                  <p className="mb-0">
                    <strong>{t("Anganwadi Remark:", "आंगनवाड़ी टिप्पणी:")}</strong>{" "}
                    {selectedRemarks.anganwadi_remark || t("No remark", "कोई टिप्पणी नहीं")}
                  </p>
                </div>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRemarkModal}>
              {t("Close", "बंद करें")}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          show={showBulkRemarkModal}
          onHide={() => setShowBulkRemarkModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {bulkAction === "approved"
                ? t("Bulk Approve Remark", "सामूहिक स्वीकृति टिप्पणी")
                : t("Bulk Reject Remark", "सामूहिक अस्वीकृति टिप्पणी")}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form.Group>
              <Form.Label>
                {t("Remark for", "के लिए टिप्पणी")}{" "}
                {bulkAction === "approved" ? t("Approval", "स्वीकृति") : t("Rejection", "अस्वीकृति")}
              </Form.Label>

              <Form.Control
                type="text"
                placeholder={
                  bulkAction === "approved"
                    ? t("Enter remark (e.g., वितरण सत्यापित है)", "टिप्पणी दर्ज करें (जैसे, वितरण सत्यापित है)")
                    : t("Enter reason for rejection", "अस्वीकृति का कारण दर्ज करें")}
                value={bulkRemark}
                onChange={(e) => setBulkRemark(e.target.value)}
              />
            </Form.Group>

            {actionError && (
              <Alert variant="danger" className="mt-3">
                {actionError}
              </Alert>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowBulkRemarkModal(false)}
            >
              {t("Cancel", "रद्द करें")}
            </Button>

            <Button
              variant={bulkAction === "approved" ? "success" : "danger"}
              onClick={handleBulkAction}
              disabled={submitting}
            >
              {submitting
                ? t("Submitting...", "जमा किया जा रहा है...")
                : bulkAction === "approved"
                  ? t(`Approve ${selectedIds.length} items`, `${selectedIds.length} आइटम स्वीकृत करें`)
                  : t(`Reject ${selectedIds.length} items`, `${selectedIds.length} आइटम अस्वीकार करें`)}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default HcmSupervisorDistributions;
