import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert,
  Row, Col, InputGroup, Badge, ListGroup, Dropdown
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";

import "../../assets/css/anganwadileftnav.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiDashboard.css";
import {
  FaEdit, FaTrash, FaEye, FaBuilding, FaHashtag, FaUtensils, FaUsers,
  FaWeightHanging, FaCalendarDay, FaMapMarkerAlt, FaCubes,
  FaProjectDiagram, FaInfoCircle, FaClock, FaFileExcel, FaFilePdf,
  FaBoxes, FaPlus, FaMinus, FaCalendarCheck
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const API_URLS = {
  hcm_receiving: "https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/hcm-anganwadi-receiving/",
  thr_receiving: "https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/thr-anganwadi-receiving/",
  supp_nutrition: "/supplementary-nutrition-anganwadi/",
  category_food_item: "/categoryandfooditem/",
};

const GRANT_IDS = [15, 30, 31];
const GRANT_CATEGORIES = [
  { title: "Pregnant Woman and Lactating Mother", countKey: "pregnant_woman_lactating_mother", grantKey: "pregnant_woman_lactating_mother_grant" },
  { title: "Children 6m-3y", countKey: "children_6m_3y", grantKey: "children_6m_3y_grant" },
  { title: "SAM 6M-5Y / SUW 6M-6Y", countKey: "sam_children_6m_5y_suw_children_6m_6y", grantKey: "sam_children_6m_5y_suw_children_6m_6y_grant" },
  { title: "SAM 3Y-5Y / SUW 3Y-6Y", countKey: "sam_children_3y_5y_suw_children_3y_6y", grantKey: "sam_children_3y_5y_suw_children_3y_6y_grant" },
  { title: "HCM Beneficiaries 3Y-6Y (Normal Children)", countKey: "hcm_beneficiaries_3y_6y", grantKey: "hcm_beneficiaries_3y_6y_grant" },
];
const FOOD_FIELDS = [
  { header: "Poushik Sattu - Pregnant/Lactating Mother", key: "poushik_sattu_preg_lat" },
  { header: "Panjeeri - Children 6m-3y", key: "panjeeri_6m_3y" },
  { header: "Panjeeri - SAM 6M-5Y / SUW 6M-6Y", key: "panjeeri_sam_6m_5y_suw_6m_6y" },
  { header: "Sattu - SAM 3Y-5Y / SUW 3Y-6Y", key: "sattu_sam_3y_5y_suw_3y_6y" },
  { header: "Mung Dal Khichdi - HCM 3Y-6Y", key: "mung_dal_khichdi_3y_6y" },
  { header: "Multi Grain Aata - HCM 3Y-6Y", key: "multi_grain_aata_3y_6y" },
];
const EXCEL_META_COLUMNS = [
  { header: "DISTRICT", key: "district" },
  { header: "PROJECT", key: "project" },
  { header: "SECTOR", key: "sector" },
  { header: "AWC NAME", key: "awc_name" },
  { header: "AWC CODE", key: "awc_code" },
  { header: "MONTH", key: "month" },
  { header: "FINANCIAL YEAR", key: "financial_year" },
];
const NUMERIC_TOTAL_KEYS = [
  ...GRANT_CATEGORIES.map((c) => c.countKey),
  ...FOOD_FIELDS.map((f) => f.key),
];

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const getCurrentMonth = () => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return monthNames[new Date().getMonth()];
};

const monthOptions = [
  { value: 'April', label: 'April' },
  { value: 'May', label: 'May' },
  { value: 'June', label: 'June' },
  { value: 'July', label: 'July' },
  { value: 'August', label: 'August' },
  { value: 'September', label: 'September' },
  { value: 'October', label: 'October' },
  { value: 'November', label: 'November' },
  { value: 'December', label: 'December' },
  { value: 'January', label: 'January' },
  { value: 'February', label: 'February' },
  { value: 'March', label: 'March' },
];

const quarterToMonths = {
  'April-May-June': ['April', 'May', 'June'],
  'July-August-September': ['July', 'August', 'September'],
  'October-November-December': ['October', 'November', 'December'],
  'January-February-March': ['January', 'February', 'March'],
};

const monthLabels = monthOptions.reduce((acc, month) => {
    acc[month.value] = month.label;
    return acc;
  }, {});

const monthLabelToValue = {};
monthOptions.forEach(m => {
    monthLabelToValue[m.label.toLowerCase()] = m.value;
    monthLabelToValue[m.value.toLowerCase()] = m.value;
});

const normalizeMonthKey = (raw) => {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim().toLowerCase();
    if (!str) return null;
    if (monthLabelToValue[str]) return monthLabelToValue[str];
    const found = monthOptions.find(m =>
      m.value === str || m.label.toLowerCase() === str ||
      m.label.toLowerCase().startsWith(str) || str.startsWith(m.label.toLowerCase())
    );
    return found ? found.value : null;
};

const getMonthsArray = (item) => {
    if (!item) return [];
    if (Array.isArray(item.months)) {
      return item.months.map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    if (typeof item.months === 'string' && item.months) {
      try {
        const parsed = JSON.parse(item.months);
        if (Array.isArray(parsed)) return parsed.map(m => normalizeMonthKey(m)).filter(Boolean);
      } catch (e) { /* ignore */ }
      return item.months.split(',').map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    if (Array.isArray(item.quarter)) {
      return item.quarter.map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    if (typeof item.quarter === 'string' && item.quarter) {
      if (quarterToMonths[item.quarter]) return quarterToMonths[item.quarter];
      return item.quarter.split(',').map(m => normalizeMonthKey(m)).filter(Boolean);
    }
    return [];
};

const FOOD_BENE_CATEGORY_MAP = {
  'पौष्टिक सत्तू मिक्स': 'Pregnant Women & Lactating Mothers',
  'पंजीरी': 'Children (6m-3y)',
  'सत्तू': 'Children (6m-3y)',
  'मूंग दाल खिचड़ी मिक्स': 'Children (3-6y)',
  'मल्टीग्रेन आटा': 'Children (3-6y)',
};

const formatMonths = (months = []) => {
  if (!Array.isArray(months)) return '';
  return months.map((month) => monthLabels[month] || month).join(', ');
};

const normalizeSuppMonth = (rawMonth) => {
  if (!rawMonth) return '';
  if (typeof rawMonth === 'number' && rawMonth >= 1 && rawMonth <= 12) {
    return monthOptions[rawMonth - 1].value;
  }
  const str = String(rawMonth).trim();
  if (!str) return '';
  const direct = monthOptions.find(m => m.value === str.toLowerCase());
  if (direct) return direct.value;
  const byLabel = monthOptions.find(m => m.label.toLowerCase() === str.toLowerCase());
  if (byLabel) return byLabel.value;
  const partial = monthOptions.find(m =>
    m.value.toLowerCase().includes(str.toLowerCase()) ||
    m.label.toLowerCase().includes(str.toLowerCase())
  );
  return partial ? partial.value : str.toLowerCase();
};

const normalizePacketExpiry = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) return [['', '', '']];
  const out = raw.map(row => {
    if (Array.isArray(row)) {
      return [
        String(row[0] == null ? '' : row[0]),
        String(row[1] == null ? '' : row[1]),
        String(row[2] == null ? '' : row[2])
      ];
    }
    if (row && typeof row === 'object') {
      return [
        String(row.count == null ? '' : row.count),
        String(row.date == null ? '' : row.date),
        String(row.remark == null ? (row.remarks == null ? '' : row.remarks) : row.remark)
      ];
    }
    return ['', '', ''];
  });
  return out.length > 0 ? out : [['', '', '']];
};

let hindiPdfFontPromise;
const loadHindiPdfFont = async () => {
  if (!hindiPdfFontPromise) {
    hindiPdfFontPromise = new Promise((resolve) => {
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap";
      fontLink.onload = () => resolve(true);
      fontLink.onerror = () => resolve(false);
      document.head.appendChild(fontLink);
    });
  }
  if (await hindiPdfFontPromise) {
    try { await document.fonts.load('400 12px "Noto Sans Devanagari"', "हिंदी"); } catch (e) { /* noop */ }
  }
};

const downloadGrantWisePDF = async ({ title, filename, records, totalsRow }) => {
  const content = document.createElement("div");
  content.style.cssText = "box-sizing:border-box;width:100%;padding:14px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI',sans-serif;";

  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.style.cssText = "margin:0 0 12px;text-align:center;color:#1e3a5f;font-size:16px;font-weight:700;";
  content.appendChild(heading);

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;table-layout:fixed;font-size:7px;line-height:1.35;";

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);
    const value = typeof cell === "object" && cell !== null ? cell : { text: cell };
    element.textContent = value.text == null ? "" : String(value.text);
    if (value.colSpan) element.colSpan = value.colSpan;
    if (value.rowSpan) element.rowSpan = value.rowSpan;
    element.style.cssText = "border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:middle;overflow-wrap:anywhere;word-break:normal;";
    return element;
  };

  const groupHeaders = [
    { text: 'S. No.', rowSpan: 2 },
    ...EXCEL_META_COLUMNS.map(col => ({ text: col.header, rowSpan: 2 })),
    ...GRANT_CATEGORIES.map(cat => ({ text: cat.title, colSpan: 4 })),
    { text: 'SUPPLEMENTARY NUTRITION DETAILS', colSpan: FOOD_FIELDS.length },
  ];
  const subHeaders = [
    ...GRANT_CATEGORIES.flatMap(() => ['Grant 15', 'Grant 30', 'Grant 31', 'TOTAL']),
    ...FOOD_FIELDS.map(f => f.header),
  ];

  const thead = document.createElement("thead");
  [groupHeaders, subHeaders].forEach((headerRow, rowIndex) => {
    const row = document.createElement("tr");
    headerRow.forEach((cell) => {
      const header = createCell("th", cell);
      header.style.cssText += `;background-color:${rowIndex === 0 ? "#4f46e5" : "#e0e7ff"};color:${rowIndex === 0 ? "#fff" : "#312e81"};border-color:${rowIndex === 0 ? "#4338ca" : "#a5b4fc"};padding:6px 4px;text-align:center;font-weight:700;font-size:8px;line-height:1.25;white-space:normal;`;
      row.appendChild(header);
    });
    thead.appendChild(row);
  });
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  records.forEach((r, i) => {
    const row = document.createElement("tr");
    const values = [i + 1];
    EXCEL_META_COLUMNS.forEach(col => values.push(r[col.key] || "—"));
    GRANT_CATEGORIES.forEach(cat => {
      const grants = Array.isArray(r[cat.grantKey]) ? r[cat.grantKey].map(Number) : [];
      [15, 30, 31].forEach(gid => values.push(grants.includes(gid) ? String(gid) : "—"));
      values.push(Number(r[cat.countKey] || 0).toLocaleString());
    });
    FOOD_FIELDS.forEach(f => values.push(Number(r[f.key] || 0).toLocaleString()));
    values.forEach(v => row.appendChild(createCell("td", v)));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const footRow = document.createElement("tr");
  const footValues = [
    { text: '', colSpan: 1 + EXCEL_META_COLUMNS.length },
    ...GRANT_CATEGORIES.flatMap(cat => [
      { text: '' }, { text: '' }, { text: '' },
      { text: totalsRow[cat.countKey] ? totalsRow[cat.countKey].toLocaleString() : 0 },
    ]),
    ...FOOD_FIELDS.map(f => ({ text: totalsRow[f.key] ? totalsRow[f.key].toLocaleString() : 0 })),
  ];
  footValues.forEach(cell => {
    const c = createCell("td", cell);
    c.style.backgroundColor = "#f1f5f9";
    c.style.fontWeight = "700";
    footRow.appendChild(c);
  });
  tfoot.appendChild(footRow);
  table.appendChild(tfoot);

  content.appendChild(table);
  document.body.appendChild(content);

  try {
    await loadHindiPdfFont();
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(content)
      .save();
  } finally {
    content.remove();
  }
};

const FoodItemReceiving = () => {
  const { api } = useAuth();

  // ── NEW: ref for scrolling modal to top on error ──
  const modalBodyRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [activeTab, setActiveTab] = useState("hcm");
  const [hcmReceivings, setHcmReceivings] = useState([]);
  const [thrReceivings, setThrReceivings] = useState([]);
  const [suppNutritionData, setSuppNutritionData] = useState([]);
  const [foodItemOptions, setFoodItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryViewItem, setExpiryViewItem] = useState(null);

  const [suppFilters, setSuppFilters] = useState({ month: '', financial_year: '' });
  const [filters, setFilters] = useState({ fin_year: '', months: [] });
  const [uniqueFilterOptions, setUniqueFilterOptions] = useState({
    hcm: { fin_year: [], months: [] },
    thr: { fin_year: [], months: [] },
  });

  // ── NEW: Helper to scroll modal body to top ──
  const scrollModalToTop = () => {
    if (modalBodyRef && modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── NEW: Wrapper that sets error AND scrolls to top ──
  const setFormErrorAndScroll = (msg) => {
    setFormError(msg);
    // Use setTimeout to ensure the DOM has updated with the error Alert before scrolling
    setTimeout(() => {
      scrollModalToTop();
    }, 50);
  };

  const availableMonthsForSelectedFoodItem = useMemo(() => {
    if (!formData.field_name || suppNutritionData.length === 0) return [];
    const monthsFromData = new Set();
    suppNutritionData.forEach(rec => {
      const quantity = parseInt(rec[formData.field_name], 10) || 0;
      if (quantity > 0) {
        const normalized = rec._monthKeys || normalizeSuppMonth(rec.month);
        if (normalized) monthsFromData.add(normalized);
      }
    });
    return monthOptions.filter(m => monthsFromData.has(m.value)).map(m => m.value);
  }, [suppNutritionData, formData.field_name]);

  const suppUniqueMonths = useMemo(() => {
    return [...new Set(suppNutritionData.map(r => r.month).filter(Boolean))]
      .sort((a, b) => monthOptions.findIndex(m => m.value === a) - monthOptions.findIndex(m => m.value === b));
  }, [suppNutritionData]);

  const suppUniqueFYs = useMemo(() => {
    return [...new Set(suppNutritionData.map(r => r.financial_year).filter(Boolean))].sort().reverse();
  }, [suppNutritionData]);

  const filteredSuppNutritionData = useMemo(() => {
    return suppNutritionData.filter(rec => {
      const monthMatch = !suppFilters.month || rec.month === suppFilters.month;
      const fyMatch = !suppFilters.financial_year || rec.financial_year === suppFilters.financial_year;
      return monthMatch && fyMatch;
    });
  }, [suppNutritionData, suppFilters]);

  const suppTotals = useMemo(() => {
    const totals = {};
    NUMERIC_TOTAL_KEYS.forEach(key => {
      totals[key] = filteredSuppNutritionData.reduce((sum, r) => sum + (parseInt(r[key]) || 0), 0);
    });
    return totals;
  }, [filteredSuppNutritionData]);

  const computePacketsForMonths = (monthsArray, fieldName, finYear) => {
    if (!fieldName || !Array.isArray(monthsArray) || monthsArray.length === 0 || suppNutritionData.length === 0) {
      return 0;
    }
    const matchingRecords = suppNutritionData.filter(rec => {
      const qty = parseInt(rec[fieldName], 10) || 0;
      if (qty <= 0) return false;
      const recMonth = rec._monthKeys || normalizeSuppMonth(rec.month);
      return recMonth && monthsArray.includes(recMonth);
    });
    if (matchingRecords.length === 0) return 0;
    if (finYear) {
      const yearMatched = matchingRecords.filter(rec => rec.financial_year === finYear);
      if (yearMatched.length > 0) {
        return yearMatched.reduce((sum, rec) => sum + (parseInt(rec[fieldName], 10) || 0), 0);
      }
    }
    return matchingRecords.reduce((sum, rec) => sum + (parseInt(rec[fieldName], 10) || 0), 0);
  };

  const packetExpiryTotal = useMemo(() => {
    const rows = formData.packet_expiry || [];
    return rows.reduce((sum, row) => sum + (parseFloat(row && row[0]) || 0), 0);
  }, [formData.packet_expiry]);

  const packetExpiryMatchInfo = useMemo(() => {
    const totalQty = parseFloat(formData.quantity) || 0;
    const listTotal = packetExpiryTotal;
    if (!totalQty && !listTotal) {
      return { ok: false, message: 'Enter quantity & packet details.', variant: 'muted' };
    }
    if (listTotal > totalQty) {
      return { ok: false, message: `List total (${listTotal}) exceeds quantity (${totalQty}).`, variant: 'danger' };
    }
    if (listTotal === totalQty) {
      return { ok: true, message: `List total (${listTotal}) matches quantity ✓`, variant: 'success' };
    }
    return { ok: false, message: `List total (${listTotal}). Required: ${totalQty}. Remaining: ${totalQty - listTotal}`, variant: 'warning' };
  }, [packetExpiryTotal, formData.quantity]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [hcmRec, thrRec, suppResp, foodItemResp] = await Promise.all([
        api.get(API_URLS.hcm_receiving),
        api.get(API_URLS.thr_receiving),
        api.get(API_URLS.supp_nutrition),
        api.get(API_URLS.category_food_item),
      ]);

      const hcmData = hcmRec.data || [];
      const thrData = thrRec.data || [];
      const suppData = suppResp.data || [];
      const foodData =
        (foodItemResp.data && foodItemResp.data.food_data)
        ? foodItemResp.data.food_data
        : (Array.isArray(foodItemResp.data) ? foodItemResp.data : []);

      setHcmReceivings(hcmData);
      setThrReceivings(thrData);
      const normalizedSupp = Array.isArray(suppData)
        ? suppData
        : (suppData.food_data || (suppResp.data && suppResp.data.results) || []);
      const normalizedSuppWithMonths = normalizedSupp.map(rec => {
        const m = normalizeSuppMonth(rec.month);
        return { ...rec, _monthKeys: m };
      });
      setSuppNutritionData(normalizedSuppWithMonths);
      setFoodItemOptions(foodData);

      setUniqueFilterOptions({
        hcm: {
          fin_year: [...new Set(hcmData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(hcmData.flatMap(item => getMonthsArray(item)).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
        thr: {
          fin_year: [...new Set(thrData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(thrData.flatMap(item => getMonthsArray(item)).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
      });
    } catch (err) {
      setError("Failed to fetch data. Please refresh the page.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    setFilters({ fin_year: '', months: [] });
  }, [activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSuppFilterChange = (e) => {
    const { name, value } = e.target;
    setSuppFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetSuppFilters = () => {
    setSuppFilters({ month: '', financial_year: '' });
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

  const resetFilters = () => {
    setFilters({ fin_year: '', months: [] });
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      const parsedMonths = getMonthsArray(item);
      const optionMatch = foodItemOptions.find(opt =>
        opt.food_item === item.food_item &&
        String(opt.beneficiary_category || FOOD_BENE_CATEGORY_MAP[opt.food_item] || '') ===
        String(item.bene_category || '')
      );
      const foodItemValue = (optionMatch && item.bene_category)
        ? `${item.food_item}|||${item.bene_category}`
        : item.food_item;
      const fieldName = optionMatch ? (optionMatch.field_name || '') : '';

      setFormData({
        ...item,
        date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
        max_expirydate: item.max_expirydate ? new Date(item.max_expirydate).toISOString().split('T')[0] : '',
        curr_month: item.curr_month || getCurrentMonth(),
        months: parsedMonths,
        quarter: item.quarter || '',
        food_item_value: foodItemValue,
        field_name: fieldName,
        quantity: String(item.quantity == null ? '' : item.quantity),
        packet_expiry: normalizePacketExpiry(item.packet_expiry),
      });
    } else {
      setFormData({
        food_item: '', food_item_value: '', quantity: '', bene_category: '', unit: '',
        date: new Date().toISOString().split('T')[0],
        max_expirydate: '',
        curr_month: getCurrentMonth(),
        fin_year: getCurrentFinancialYear(),
        months: [],
        quarter: '',
        field_name: '',
        packet_expiry: [['', '', '']],
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleOpenViewModal = (record) => {
    setViewItem(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewItem(null);
  };

  const handleOpenExpiryModal = (record) => {
    setExpiryViewItem(record);
    setShowExpiryModal(true);
  };

  const handleCloseExpiryModal = () => {
    setShowExpiryModal(false);
    setExpiryViewItem(null);
  };

  const availableFoodItems = useMemo(() => {
    const tabCategory = activeTab.toUpperCase();
    return foodItemOptions.filter(item => item.category === tabCategory);
  }, [foodItemOptions, activeTab]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'food_item') {
      const parts = value.split('|||');
      const selectedFoodItem = parts[0] || '';
      const selectedBeneCategory = parts[1] || '';
      const selectedItem = foodItemOptions.find(item =>
        item.food_item === selectedFoodItem &&
        (selectedBeneCategory
          ? String(item.beneficiary_category || FOOD_BENE_CATEGORY_MAP[item.food_item] || '') === selectedBeneCategory
          : true)
      );

      let autoUnit = 'Packets';
      let autoFieldName = '';
      let autoBeneCategory = '';

      if (selectedItem) {
        autoFieldName = selectedItem.field_name || '';
        autoBeneCategory =
          selectedItem.beneficiary_category ||
          FOOD_BENE_CATEGORY_MAP[selectedFoodItem] ||
          selectedItem.bene_category ||
          selectedItem.category ||
          '';
      }

      setFormData(prev => {
        const currentFinYear = prev.fin_year || getCurrentFinancialYear();

        const monthSet = new Set();
        if (autoFieldName && suppNutritionData.length > 0) {
          suppNutritionData.forEach(rec => {
            const qty = parseInt(rec[autoFieldName], 10) || 0;
            if (qty > 0) {
              const m = rec._monthKeys || normalizeSuppMonth(rec.month);
              if (m) monthSet.add(m);
            }
          });
        }
        const autoMonths = monthOptions.filter(m => monthSet.has(m.value)).map(m => m.value);

        const autoQuantity = autoMonths.length > 0
          ? String(computePacketsForMonths(autoMonths, autoFieldName, currentFinYear))
          : '';

        let quarterString = '';
        if (autoMonths.length > 0) {
          const matchedQuarter = Object.keys(quarterToMonths).find(qKey => {
            const qMonths = quarterToMonths[qKey];
            return (
              autoMonths.length === qMonths.length &&
              autoMonths.every(m => qMonths.includes(m))
            );
          });
          quarterString = matchedQuarter || autoMonths.join(',');
        }

        return {
          ...prev,
          food_item: selectedFoodItem,
          food_item_value: value,
          field_name: autoFieldName,
          unit: autoUnit,
          quantity: autoQuantity,
          bene_category: autoBeneCategory,
          months: autoMonths,
          quarter: quarterString,
          packet_expiry: [['', '', '']],
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Clear any previous error when user edits a field
    if (formError) setFormError('');
  };

  const handleMonthToggle = (monthValue, isChecked) => {
    setFormData(prev => {
      const currentMonths = prev.months || [];
      const nextMonths = isChecked
        ? Array.from(new Set([...currentMonths, monthValue]))
        : currentMonths.filter(m => m !== monthValue);

      let quarterString = '';
      if (nextMonths.length > 0) {
        const matchedQuarter = Object.keys(quarterToMonths).find(qKey => {
          const qMonths = quarterToMonths[qKey];
          return (
            nextMonths.length === qMonths.length &&
            nextMonths.every(m => qMonths.includes(m))
          );
        });
        quarterString = matchedQuarter || nextMonths.join(',');
      }

      const currentFinYear = prev.fin_year || getCurrentFinancialYear();
      const recomputedQty = computePacketsForMonths(nextMonths, prev.field_name, currentFinYear);

      return {
        ...prev,
        months: nextMonths,
        quarter: quarterString,
        quantity: recomputedQty > 0 ? String(recomputedQty) : (prev.quantity || ''),
      };
    });
    if (formError) setFormError('');
  };

  const handlePacketExpiryChange = (index, field, value) => {
    setFormData(prev => {
      const rows = Array.isArray(prev.packet_expiry) ? prev.packet_expiry.map(r => [...r]) : [['', '', '']];
      const current = rows[index] || ['', '', ''];
      if (field === 'count') {
        const totalQty = parseFloat(prev.quantity) || 0;
        const sumWithoutThis = rows.reduce((sum, row, i) => {
          if (i === index) return sum;
          return sum + (parseFloat(row && row[0]) || 0);
        }, 0);
        const entered = parseFloat(value) || 0;
        if (totalQty > 0 && sumWithoutThis + entered > totalQty) {
          const allowed = Math.max(0, totalQty - sumWithoutThis);
          rows[index] = [String(allowed), current[1] || '', current[2] || ''];
        } else {
          rows[index] = [String(value), current[1] || '', current[2] || ''];
        }
      } else if (field === 'date') {
        rows[index] = [current[0] || '', String(value), current[2] || ''];
      } else if (field === 'remarks') {
        rows[index] = [current[0] || '', current[1] || '', String(value)];
      }
      return { ...prev, packet_expiry: rows };
    });
    if (formError) setFormError('');
  };

  const handleAddPacketRow = () => {
    setFormData(prev => {
      const rows = Array.isArray(prev.packet_expiry) ? prev.packet_expiry.map(r => [...r]) : [];
      const totalQty = parseFloat(prev.quantity) || 0;
      const currentSum = rows.reduce((s, r) => s + (parseFloat(r && r[0]) || 0), 0);
      if (totalQty > 0 && currentSum >= totalQty) {
        return prev;
      }
      rows.push(['', '', '']);
      return { ...prev, packet_expiry: rows };
    });
  };

  const handleRemovePacketRow = (index) => {
    setFormData(prev => {
      const rows = Array.isArray(prev.packet_expiry) ? prev.packet_expiry.map(r => [...r]) : [];
      rows.splice(index, 1);
      if (rows.length === 0) rows.push(['', '', '']);
      return { ...prev, packet_expiry: rows };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    const isThr = activeTab === 'thr';
    const parsedQuantity = parseFloat(formData.quantity) || 0;
    const selectedMonths = Array.isArray(formData.months) ? formData.months : [];

    let quarterString = formData.quarter || '';
    if (selectedMonths.length > 0) {
      const matchedQuarter = Object.keys(quarterToMonths).find(qKey => {
        const qMonths = quarterToMonths[qKey];
        return selectedMonths.length === qMonths.length && selectedMonths.every(m => qMonths.includes(m));
      });
      if (matchedQuarter) quarterString = matchedQuarter;
      else quarterString = selectedMonths.join(',');
    }

    const existingRecords = isThr ? thrReceivings : hcmReceivings;
    const duplicate = existingRecords.find(rec => {
      if (editingItem && rec.id === editingItem.id) return false;
      const recMonths = getMonthsArray(rec);
      if (rec.food_item !== formData.food_item ||
          rec.fin_year !== (formData.fin_year || getCurrentFinancialYear())) return false;
      if (formData.bene_category && rec.bene_category &&
          formData.bene_category !== rec.bene_category) return false;
      return selectedMonths.some(m => recMonths.includes(m));
    });

    if (duplicate) {
      setFormErrorAndScroll("इस माह का प्राप्ति रिकॉर्ड इसी श्रेणी (category) के लिए पहले ही दर्ज है।");
      setSubmitting(false);
      return;
    }

    const peRows = Array.isArray(formData.packet_expiry) ? formData.packet_expiry : [];
    const cleanedPacketExpiry = peRows
      .map(r => {
        const c = Array.isArray(r) ? r : ['', '', ''];
        return [
          String(c[0] == null ? '' : c[0]).trim(),
          String(c[1] == null ? '' : c[1]).trim(),
          String(c[2] == null ? '' : c[2]).trim()
        ];
      })
      .filter(r => r[0] !== '' || r[1] !== '' || r[2] !== '');

    const peTotal = cleanedPacketExpiry.reduce((s, r) => s + (parseFloat(r[0]) || 0), 0);

    if (parsedQuantity > 0) {
      if (cleanedPacketExpiry.length === 0) {
        setFormErrorAndScroll("कृपया Packet Details में कम से कम एक पंक्ति भरें।");
        setSubmitting(false);
        return;
      }
      if (peTotal > parsedQuantity) {
        setFormErrorAndScroll(`Packet details का योग (${peTotal}) quantity (${parsedQuantity}) से अधिक नहीं हो सकता।`);
        setSubmitting(false);
        return;
      }
      if (peTotal !== parsedQuantity) {
        setFormErrorAndScroll(
          `Packet details का योग (${peTotal}) और quantity (${parsedQuantity}) समान होना चाहिए। शेष: ${parsedQuantity - peTotal}`
        );
        setSubmitting(false);
        return;
      }
      const incomplete = cleanedPacketExpiry.find(r => r[0] === '' || r[1] === '');
      if (incomplete) {
        setFormErrorAndScroll("कृपया हर packet row में packets और expiry date दोनों भरें।");
        setSubmitting(false);
        return;
      }
    }

    let payload = {
      food_item: formData.food_item || '',
      quantity: parsedQuantity,
      unit: formData.unit || '',
      bene_category: formData.bene_category || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      fin_year: formData.fin_year || getCurrentFinancialYear(),
      months: selectedMonths,
      quarter: quarterString,
      curr_month: formData.curr_month || getCurrentMonth(),
      max_expirydate: formData.max_expirydate || null,
      packet_expiry: cleanedPacketExpiry.length > 0 ? cleanedPacketExpiry : [['', '', '']],
    };

    if (editingItem) {
      payload.id = editingItem.id;
      payload.awc_name = editingItem.awc_name;
      payload.awc_code = editingItem.awc_code;
      payload.awc_type = editingItem.awc_type;
      payload.sector = editingItem.sector;
      payload.project = editingItem.project;
      payload.district = editingItem.district;
      if (editingItem.sector_status) payload.sector_status = editingItem.sector_status;
      if (editingItem.sector_remark !== undefined) payload.sector_remark = editingItem.sector_remark;
    }

    const url = isThr ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
    const method = editingItem ? 'put' : 'post';

    try {
      await api[method](url, payload);
      handleCloseModal();
      fetchData();
    } catch (err) {
      const errData = err.response && err.response.data;
      let backendMessage = '';
      if (errData) {
        if (typeof errData === 'string') backendMessage = errData;
        else if (errData.error || errData.detail) backendMessage = errData.error || errData.detail;
        else {
          const firstField = Object.keys(errData)[0];
          if (firstField) {
            backendMessage = Array.isArray(errData[firstField])
              ? errData[firstField].join(' ')
              : String(errData[firstField]);
          }
        }
      }
      setFormErrorAndScroll(`Failed to ${editingItem ? 'update' : 'create'} record. ${backendMessage || 'Please try again.'}`);
      console.error("API Error:", err.response ? err.response.data : err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receiving record?")) {
      const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
      try {
        await api.delete(url, { data: { id } });
        fetchData();
      } catch (err) {
        alert("Failed to delete record.");
        console.error(err);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  const hasPacketExpiry = (rec) => {
    if (!rec) return false;
    if (!Array.isArray(rec.packet_expiry) || rec.packet_expiry.length === 0) return false;
    return rec.packet_expiry.some(pe => {
      const count = Array.isArray(pe) ? pe[0] : (pe && pe.count);
      const date = Array.isArray(pe) ? pe[1] : (pe && pe.date);
      return (count !== '' && count != null) || (date !== '' && date != null);
    });
  };

  const filteredHcmReceivings = useMemo(() => {
    return hcmReceivings.filter(item => {
      const itemMonths = getMonthsArray(item).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
        (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [hcmReceivings, filters]);

  const filteredThrReceivings = useMemo(() => {
    return thrReceivings.filter(item => {
      const itemMonths = getMonthsArray(item).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
        (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [thrReceivings, filters]);

  const exportSuppToExcel = () => {
    if (!filteredSuppNutritionData.length) return;
    const dataToExport = filteredSuppNutritionData.map((row, i) => {
      const obj = { "S. No.": i + 1 };
      EXCEL_META_COLUMNS.forEach(c => { obj[c.header] = row[c.key] == null ? "" : row[c.key]; });
      GRANT_CATEGORIES.forEach(cat => {
        const grants = Array.isArray(row[cat.grantKey]) ? row[cat.grantKey].map(Number) : [];
        [15, 30, 31].forEach(gid => {
          obj[`${cat.title} - Grant ${gid}`] = grants.includes(gid) ? gid : "";
        });
        obj[`${cat.title} - Total`] = Number(row[cat.countKey] || 0);
      });
      FOOD_FIELDS.forEach(f => { obj[f.header] = Number(row[f.key] || 0); });
      return obj;
    });

    const totalObj = { "S. No.": "" };
    EXCEL_META_COLUMNS.forEach(c => { totalObj[c.header] = c.key === "district" ? "TOTAL" : ""; });
    GRANT_CATEGORIES.forEach(cat => {
      [15, 30, 31].forEach(gid => { totalObj[`${cat.title} - Grant ${gid}`] = ""; });
      totalObj[`${cat.title} - Total`] = suppTotals[cat.countKey] || 0;
    });
    FOOD_FIELDS.forEach(f => { totalObj[f.header] = suppTotals[f.key] || 0; });
    dataToExport.push(totalObj);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supp Nutrition");
    XLSX.writeFile(wb, "Supplementary_Nutrition_Grant_Wise.xlsx");
  };

  const exportSuppToPDF = async () => {
    if (!filteredSuppNutritionData.length) return;
    try {
      await downloadGrantWisePDF({
        title: "Supplementary Nutrition Records - Grant Wise Master",
        filename: "Supplementary_Nutrition_Grant_Wise.pdf",
        records: filteredSuppNutritionData,
        totalsRow: suppTotals,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  const renderTable = (records) => {
    const totalQuantity = records.reduce((sum, rec) => sum + (parseFloat(rec.quantity) || 0), 0);

    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
            <th>#</th>
            <th>Date</th>
            <th>Quarterly Packets Distribution</th>
            <th>Beneficiary Category</th>
            <th>Packets</th>
            <th>Unit</th>
            <th>Fin. Year</th>
            <th>Current Month</th>
            <th>Max Expiry Date</th>
            <th>Months</th>
            <th>Sector Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id}>
              <td>{index + 1}</td>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              <td>{rec.food_item}</td>
              <td>{rec.bene_category}</td>
              <td>{rec.quantity}</td>
              <td>{rec.unit}</td>
              <td>{rec.fin_year}</td>
              <td>{rec.curr_month || '-'}</td>
              <td>{rec.max_expirydate ? new Date(rec.max_expirydate).toLocaleDateString() : '-'}</td>
              <td>{formatMonths(getMonthsArray(rec))}</td>
              <td>
                <Badge bg={getStatusVariant(rec.sector_status)}>{rec.sector_status || 'pending'}</Badge>
              </td>
              <td>
                <div className="d-flex gap-1 flex-wrap">
                  {rec.sector_status === 'approved' || rec.sector_status === 'rejected' ? (
                    <Button variant="outline-info" size="sm" onClick={() => handleOpenViewModal(rec)}>
                      <FaEye /> View
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline-primary" size="sm" onClick={() => handleOpenModal(rec)}>
                        <FaEdit />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rec.id)}>
                        <FaTrash />
                      </Button>
                    </>
                  )}
                  {hasPacketExpiry(rec) && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      onClick={() => handleOpenExpiryModal(rec)}
                      title="View Packet Expiry Details"
                    >
                      <FaCalendarCheck /> Expiry
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="12" className="text-center">No records found.</td></tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
              <td colSpan="4" className="text-end">Total Quantity:</td>
              <td>{totalQuantity}</td>
              <td colSpan="7"></td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  const renderSuppTable = (records) => {
    const totalCols = 1 + EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.length * 4 + FOOD_FIELDS.length;

    return (
      <>
        <div className="mt-4">
          <Row className="mb-3 g-2 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Month</Form.Label>
                <Form.Select name="month" value={suppFilters.month} onChange={handleSuppFilterChange}>
                  <option value="">All Months</option>
                  {suppUniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Financial Year</Form.Label>
                <Form.Select name="financial_year" value={suppFilters.financial_year} onChange={handleSuppFilterChange}>
                  <option value="">All Years</option>
                  {suppUniqueFYs.map(y => <option key={y} value={y}>{y}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex gap-2 justify-content-end align-items-end">
              <Button variant="secondary" size="sm" onClick={resetSuppFilters}>Reset</Button>
              <Button variant="success" size="sm" onClick={exportSuppToExcel} disabled={!records.length}>
                <FaFileExcel className="me-1" /> Excel
              </Button>
              <Button variant="danger" size="sm" onClick={exportSuppToPDF} disabled={!records.length}>
                <FaFilePdf className="me-1" /> PDF
              </Button>
            </Col>
          </Row>

          <div className="table-responsive">
            <Table
              bordered
              hover
              className="supp-grant-master-table"
              style={{ minWidth: "2400px", borderCollapse: "separate", borderSpacing: 0 }}
            >
              <thead>
                <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                  <th rowSpan={2} className="text-center align-middle">S. No.</th>
                  {EXCEL_META_COLUMNS.map((col) => (
                    <th key={col.key} rowSpan={2} className="text-center align-middle">{col.header}</th>
                  ))}
                  {GRANT_CATEGORIES.map((cat) => (
                    <th key={cat.countKey} colSpan={4} className="text-center align-middle supp-grant-group-header">
                      {cat.title}
                    </th>
                  ))}
                  <th colSpan={FOOD_FIELDS.length} className="text-center align-middle supp-food-group-header">
                    SUPPLEMENTARY NUTRITION DETAILS
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                  {GRANT_CATEGORIES.flatMap((cat) =>
                    [15, 30, 31].map((grantId) => (
                      <th key={`${cat.countKey}-${grantId}`} className="text-center">Grant {grantId}</th>
                    )).concat([
                      <th key={`${cat.countKey}-total`} className="text-center">TOTAL</th>
                    ])
                  )}
                  {FOOD_FIELDS.map((food) => (
                    <th key={food.key} className="text-center">{food.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map((rec, index) => (
                  <tr key={rec.id || index}>
                    <td className="text-center text-muted">{index + 1}</td>
                    {EXCEL_META_COLUMNS.map((col) => (
                      <td key={col.key} className={col.key === "month" ? "text-center" : ""}>
                        {col.key === "month" && rec[col.key] ? (
                          <Badge className="supp-month-badge">{rec[col.key]}</Badge>
                        ) : (
                          rec[col.key] || "—"
                        )}
                      </td>
                    ))}
                    {GRANT_CATEGORIES.flatMap((cat) => {
                      const grants = Array.isArray(rec[cat.grantKey]) ? rec[cat.grantKey].map(Number) : [];
                      return [15, 30, 31]
                        .map((grantId) => (
                          <td key={`${cat.countKey}-${grantId}`} className="text-center supp-grant-cell">
                            {grants.includes(grantId) ? grantId : "—"}
                          </td>
                        ))
                        .concat([
                          <td key={`${cat.countKey}-total`} className="text-end fw-semibold supp-total-cell">
                            {Number(rec[cat.countKey] || 0).toLocaleString()}
                          </td>
                        ]);
                    })}
                    {FOOD_FIELDS.map((food) => (
                      <td key={food.key} className="text-end">{Number(rec[food.key] || 0).toLocaleString()}</td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={totalCols} className="text-center text-muted p-4">
                      No supplementary nutrition records found.
                    </td>
                  </tr>
                )}
              </tbody>
              {records.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                    <th></th>
                    {EXCEL_META_COLUMNS.map((col, idx) => (
                      <th key={col.key}>{idx === 0 ? "TOTAL" : ""}</th>
                    ))}
                    {GRANT_CATEGORIES.flatMap((cat) => [
                      <th key={`${cat.countKey}-g15`}></th>,
                      <th key={`${cat.countKey}-g30`}></th>,
                      <th key={`${cat.countKey}-g31`}></th>,
                      <th key={`${cat.countKey}-total`} className="text-end">
                        {suppTotals[cat.countKey] ? suppTotals[cat.countKey].toLocaleString() : 0}
                      </th>,
                    ])}
                    {FOOD_FIELDS.map((food) => (
                      <th key={food.key} className="text-end">
                        {suppTotals[food.key] ? suppTotals[food.key].toLocaleString() : 0}
                      </th>
                    ))}
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </div>
      </>
    );
  };

  const renderFilters = () => {
    const currentFilters = uniqueFilterOptions[activeTab];
    return (
      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Financial Year</Form.Label>
            <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
              <option value="">All Years</option>
              {currentFilters && currentFilters.fin_year ? currentFilters.fin_year.map(year => <option key={year} value={year}>{year}</option>) : null}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Months</Form.Label>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} selected` : 'All Months'}</Dropdown.Toggle>
              <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {currentFilters && currentFilters.months ? currentFilters.months.map(v => (
                  <Dropdown.Item key={v} as="div">
                    <Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange('months', v)} />
                  </Dropdown.Item>
                )) : null}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button variant="secondary" onClick={resetFilters}>Reset</Button>
        </Col>
      </Row>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width < 768) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dashboard-container">
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="fw-bold mb-4">
              <FaBoxes className="me-2" /> Food Item Receiving
            </h3>
            {activeTab !== 'supp' && (
              <Button onClick={() => handleOpenModal()}>Add New Receiving</Button>
            )}
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">

            <Tab eventKey="hcm" title="HCM Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">HCM Receiving Records</h5>
                  {renderFilters()}
                  {renderTable(filteredHcmReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="thr" title="THR Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">THR Receiving Records</h5>
                  {renderFilters()}
                  {renderTable(filteredThrReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="supp" title="Supplementary Nutrition">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">Supplementary Nutrition Records</h5>
                  {renderSuppTable(filteredSuppNutritionData)}
                </>
              )}
            </Tab>

          </Tabs>
        </Container>

        <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{editingItem ? 'Edit' : 'Add'} {activeTab.toUpperCase()} Receiving</Modal.Title>
          </Modal.Header>
          <Modal.Body ref={modalBodyRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quarterly Packets Distribution</Form.Label>
                    <Form.Select
                      name="food_item"
                      value={formData.food_item_value || ''}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Quarterly Packets Distribution</option>
                      {availableFoodItems.map((item, index) => {
                        const itemCategory = item.beneficiary_category || FOOD_BENE_CATEGORY_MAP[item.food_item] || '';
                        const itemValue = itemCategory
                          ? `${item.food_item}|||${itemCategory}`
                          : item.food_item;
                        return [
                          <option key={index} value={itemValue} style={{ fontWeight: 'bold' }}>
                            {item.food_item}
                          </option>,
                          <option key={`${index}-cat`} disabled style={{ color: '#6c757d', paddingLeft: '15px' }}>
                            &nbsp;&nbsp;↳ Category: {itemCategory || 'N/A'}
                          </option>
                        ];
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Packets (Auto-fetched from Supplementary Nutrition)</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        name="quantity"
                        value={formData.quantity || ''}
                        onChange={handleFormChange}
                        placeholder="Auto-filled Quantity"
                        required
                      />
                      <Form.Control
                        type="text"
                        name="unit"
                        value={formData.unit || ''}
                        onChange={handleFormChange}
                        placeholder="Unit"
                        readOnly
                        required
                      />
                    </InputGroup>
                    {formData.field_name && (formData.quantity === '' || formData.quantity === undefined) && (
                      <small className="text-warning d-block mt-1">
                        No packet data found in Supplementary Nutrition table for the selected months.
                      </small>
                    )}
                    {formData.field_name && formData.quantity !== '' && formData.quantity !== undefined && Number(formData.quantity) > 0 && (
                      <small className="text-success d-block mt-1">
                        ✓ Packets auto-fetched for {(formData.months || []).length} selected month(s).
                      </small>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control
                      type="text"
                      name="bene_category"
                      value={formData.bene_category || ''}
                      onChange={handleFormChange}
                      placeholder="Enter Beneficiary Category"
                      required
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Receiving</Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Financial Year</Form.Label>
                    <Form.Control
                      type="text"
                      name="fin_year"
                      value={formData.fin_year || ''}
                      onChange={handleFormChange}
                      placeholder="e.g., 2025-26"
                      required
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Month (Auto-filled)</Form.Label>
                    <Form.Control
                      type="text"
                      name="curr_month"
                      value={formData.curr_month || ''}
                      readOnly
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Expiry Date (Safe to distribute till)</Form.Label>
                    <Form.Control
                      type="date"
                      name="max_expirydate"
                      value={formData.max_expirydate || ''}
                      onChange={handleFormChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <h6 className="mt-2 mb-3">Select Months (All months available — Packets auto-recalculate for months with data)</h6>
                    <div className="month-checkbox-group d-flex flex-wrap gap-2">
                      {monthOptions.map((month) => {
                        const hasData = availableMonthsForSelectedFoodItem.includes(month.value);
                        const isChecked = (formData.months || []).includes(month.value);
                        return (
                          <Form.Check
                            key={month.value}
                            inline
                            type="checkbox"
                            id={`month-${month.value}`}
                            label={hasData ? `${month.label} ✓` : month.label}
                            checked={isChecked}
                            onChange={(e) => {
                              handleMonthToggle(month.value, e.target.checked);
                            }}
                          />
                        );
                      })}
                    </div>
                    {!formData.field_name ? (
                      <small className="text-muted">Select a food item first. All months are selectable — months with data will auto-fetch packets.</small>
                    ) : (
                      <small className="text-muted">
                        ✓ All 12 months are selectable. Months with Supplementary Nutrition data are marked with ✓ and will auto-fetch/deduct packets. Months without data won't change the packet count.
                      </small>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">Packet Details (Per Expiry Batch)</h6>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleAddPacketRow}
                        disabled={
                          (parseFloat(formData.quantity) || 0) > 0 &&
                          packetExpiryTotal >= (parseFloat(formData.quantity) || 0)
                        }
                      >
                        <FaPlus className="me-1" /> Add Row
                      </Button>
                    </div>

                    <Table bordered responsive size="sm" className="mb-2">
                      <thead>
                        <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ width: '120px' }}>Packets</th>
                          <th style={{ width: '160px' }}>Expiry Date</th>
                          <th>Remarks</th>
                          <th style={{ width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.packet_expiry || [['', '', '']]).map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-center">{idx + 1}</td>
                            <td>
                              <Form.Control
                                type="number"
                                min="0"
                                value={row ? row[0] : ''}
                                onChange={(e) => handlePacketExpiryChange(idx, 'count', e.target.value)}
                                placeholder="Packets"
                                isInvalid={
                                  (parseFloat(formData.quantity) || 0) > 0 &&
                                  (parseFloat(row && row[0]) || 0) > 0 &&
                                  packetExpiryTotal > (parseFloat(formData.quantity) || 0)
                                }
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="date"
                                value={row ? row[1] : ''}
                                onChange={(e) => handlePacketExpiryChange(idx, 'date', e.target.value)}
                              />
                            </td>
                            <td>
                              <Form.Control
                                type="text"
                                value={row ? row[2] : ''}
                                onChange={(e) => handlePacketExpiryChange(idx, 'remarks', e.target.value)}
                                placeholder="Enter remarks for this batch"
                              />
                            </td>
                            <td className="text-center">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemovePacketRow(idx)}
                                disabled={(formData.packet_expiry || []).length <= 1}
                              >
                                <FaMinus />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                          <td className="text-end">Total:</td>
                          <td>{packetExpiryTotal}</td>
                          <td colSpan={3}>
                            <small className={`text-${packetExpiryMatchInfo.variant}`}>
                              {packetExpiryMatchInfo.message}
                            </small>
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                    <small className="text-muted d-block">
                      नोट: Packet details का योग (Total) auto-fetched Packets संख्या के बराबर होना चाहिए — अधिक नहीं हो सकता।
                    </small>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={submitting || !packetExpiryMatchInfo.ok}
                >
                  {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingItem ? 'Update' : 'Submit')}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {viewItem && (
          <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>View Record: {viewItem.food_item}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item><FaBuilding className="view-modal-icon" /> <strong>AWC Name:</strong> {viewItem.awc_name}</ListGroup.Item>
                <ListGroup.Item><FaHashtag className="view-modal-icon" /> <strong>AWC Code:</strong> {viewItem.awc_code}</ListGroup.Item>
                <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>Quarterly Packets Distribution:</strong> {viewItem.food_item}</ListGroup.Item>
                <ListGroup.Item><FaWeightHanging className="view-modal-icon" /> <strong>Quantity:</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                {viewItem.date ? (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                ) : (
                  <>
                    <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Financial Year:</strong> {viewItem.fin_year}</ListGroup.Item>
                    <ListGroup.Item><FaCubes className="view-modal-icon" /> <strong>Months:</strong> {formatMonths(getMonthsArray(viewItem))}</ListGroup.Item>
                  </>
                )}
                {viewItem.curr_month && (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Current Month:</strong> {viewItem.curr_month}</ListGroup.Item>
                )}
                {viewItem.max_expirydate && (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Max Expiry Date:</strong> {new Date(viewItem.max_expirydate).toLocaleDateString()}</ListGroup.Item>
                )}
                {Array.isArray(viewItem.packet_expiry) && viewItem.packet_expiry.length > 0 && (
                  <ListGroup.Item>
                    <FaInfoCircle className="view-modal-icon" /> <strong>Packet Details:</strong>
                    <Table bordered size="sm" className="mt-2 mb-0">
                      <thead>
                        <tr><th>Packets</th><th>Expiry Date</th><th>Remarks</th></tr>
                      </thead>
                      <tbody>
                        {viewItem.packet_expiry.map((pe, i) => {
                          const count = Array.isArray(pe) ? pe[0] : (pe && pe.count);
                          const date = Array.isArray(pe) ? pe[1] : (pe && pe.date);
                          const remark = Array.isArray(pe) ? pe[2] : (pe && (pe.remark || pe.remarks));
                          return (
                            <tr key={i}>
                              <td>{count == null ? '-' : count}</td>
                              <td>{date ? new Date(date).toLocaleDateString() : '-'}</td>
                              <td>{remark || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </ListGroup.Item>
                )}
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>Sector:</strong> {viewItem.sector}</ListGroup.Item>
                <ListGroup.Item><FaProjectDiagram className="view-modal-icon" /> <strong>Project:</strong> {viewItem.project}</ListGroup.Item>
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>District:</strong> {viewItem.district}</ListGroup.Item>
                {viewItem.sector_status && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Status:</strong> <Badge bg={getStatusVariant(viewItem.sector_status)}>{viewItem.sector_status}</Badge></ListGroup.Item>
                )}
                {viewItem.sector_remark && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Remark:</strong> {viewItem.sector_remark}</ListGroup.Item>
                )}
              </ListGroup>
            </Modal.Body>
            <Modal.Footer className="view-modal-footer">
              <Button variant="secondary" onClick={handleCloseViewModal}>Close</Button>
            </Modal.Footer>
          </Modal>
        )}

        {expiryViewItem && (
          <Modal show={showExpiryModal} onHide={handleCloseExpiryModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>
                <FaCalendarCheck className="me-2" />
                Packet Expiry Details: {expiryViewItem.food_item}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <FaUtensils className="view-modal-icon" />
                  <strong>Food Item:</strong> {expiryViewItem.food_item}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaWeightHanging className="view-modal-icon" />
                  <strong>Total Packets:</strong> {expiryViewItem.quantity} {expiryViewItem.unit}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCalendarDay className="view-modal-icon" />
                  <strong>Date of Receiving:</strong>{' '}
                  {expiryViewItem.date ? new Date(expiryViewItem.date).toLocaleDateString() : '-'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCubes className="view-modal-icon" />
                  <strong>Months:</strong> {formatMonths(getMonthsArray(expiryViewItem))}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaInfoCircle className="view-modal-icon" />
                  <strong>Sector Status:</strong>{' '}
                  <Badge bg={getStatusVariant(expiryViewItem.sector_status)}>
                    {expiryViewItem.sector_status || 'pending'}
                  </Badge>
                </ListGroup.Item>
              </ListGroup>

              <hr />

              <h6 className="mb-2">
                <FaCalendarCheck className="me-1" /> Packet-wise Expiry List
              </h6>
              <Table bordered striped size="sm" className="mb-0">
                <thead>
                  <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                    <th className="text-center" style={{ width: '50px' }}>S. No.</th>
                    <th className="text-center">Packets</th>
                    <th className="text-center">Expiry Date</th>
                    <th className="text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(expiryViewItem.packet_expiry) && expiryViewItem.packet_expiry.length > 0 ? (
                    expiryViewItem.packet_expiry.map((pe, i) => {
                      const count = Array.isArray(pe) ? pe[0] : (pe && pe.count);
                      const date = Array.isArray(pe) ? pe[1] : (pe && pe.date);
                      const remark = Array.isArray(pe) ? pe[2] : (pe && (pe.remark || pe.remarks));
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
                        No packet expiry details available.
                      </td>
                    </tr>
                  )}
                </tbody>
                {Array.isArray(expiryViewItem.packet_expiry) && expiryViewItem.packet_expiry.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                      <td className="text-end">Total:</td>
                      <td className="text-center">
                        {expiryViewItem.packet_expiry.reduce((sum, pe) => {
                          const c = Array.isArray(pe) ? pe[0] : (pe && pe.count);
                          return sum + (parseFloat(c) || 0);
                        }, 0)}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </Table>
            </Modal.Body>
            <Modal.Footer className="view-modal-footer">
              <Button variant="secondary" onClick={handleCloseExpiryModal}>Close</Button>
            </Modal.Footer>
          </Modal>
        )}

      </div>
    </div>
  );
};

export default FoodItemReceiving;