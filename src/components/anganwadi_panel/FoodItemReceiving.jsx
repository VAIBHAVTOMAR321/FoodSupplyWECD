import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert,
  Row, Col, InputGroup, Badge, ListGroup, Dropdown
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
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

// Grant fields from the API are arrays of values in this order:
// [Grant 15 value, Grant 30 value, Grant 31 value].
// Preserve numeric zero; only show a dash when a value is genuinely absent.
const getGrantValue = (record, grantKey, grantIndex) => {
  const values = record && record[grantKey];
  if (!Array.isArray(values) || grantIndex >= values.length) return "—";
  const value = values[grantIndex];
  if (value === null || value === undefined || value === "") return "—";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString() : String(value);
};
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

// Match each food-detail column to the beneficiary group it belongs to.
// This keeps the on-screen table and exports in the same grouped structure.
const CATEGORY_FOOD_FIELDS = [
  ["poushik_sattu_preg_lat"],
  ["panjeeri_6m_3y"],
  ["panjeeri_sam_6m_5y_suw_6m_6y"],
  ["sattu_sam_3y_5y_suw_3y_6y"],
  ["mung_dal_khichdi_3y_6y", "multi_grain_aata_3y_6y"],
];
const getFoodForCategory = (categoryIndex) =>
  FOOD_FIELDS.filter((food) => CATEGORY_FOOD_FIELDS[categoryIndex]?.includes(food.key));
const EXCEL_META_COLUMNS = [
  { header: "DISTRICT", key: "district" },
  { header: "PROJECT", key: "project" },
  { header: "SECTOR", key: "sector" },
  { header: "AWC NAME", key: "awc_name" },
  { header: "AWC CODE", key: "awc_code" },
  { header: "Trimester", key: "quarter" },
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

const TRIMESTER_OPTIONS = [
  { value: 'Apr-May-Jun', label: 'Apr-May-Jun', months: ['April', 'May', 'June'] },
  { value: 'Jul-Aug-Sep', label: 'Jul-Aug-Sep', months: ['July', 'August', 'September'] },
  { value: 'Oct-Nov-Dec', label: 'Oct-Nov-Dec', months: ['October', 'November', 'December'] },
  { value: 'Jan-Feb-Mar', label: 'Jan-Feb-Mar', months: ['January', 'February', 'March'] },
];
const trimesterToMonths = Object.fromEntries(TRIMESTER_OPTIONS.map(q => [q.value, q.months]));
const normalizeTrimester = (raw) => {
  const value = String(raw || '').trim().toLowerCase();
  const aliases = {
    'apr-may-jun': 'Apr-May-Jun', 'april-may-june': 'Apr-May-Jun',
    'jul-aug-sep': 'Jul-Aug-Sep', 'july-august-september': 'Jul-Aug-Sep',
    'oct-nov-dec': 'Oct-Nov-Dec', 'october-november-december': 'Oct-Nov-Dec',
    'jan-feb-mar': 'Jan-Feb-Mar', 'january-february-march': 'Jan-Feb-Mar'
  };
  return aliases[value] || '';
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
      if (trimesterToMonths[item.quarter]) return trimesterToMonths[item.quarter];
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
  table.style.cssText = "width:100%;border-collapse:collapse;table-layout:fixed;font-size:7px;line-height:1.5;break-inside:auto;";

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);
    const value = typeof cell === "object" && cell !== null ? cell : { text: cell };
    element.textContent = value.text == null ? "" : String(value.text);
    if (value.colSpan) element.colSpan = value.colSpan;
    if (value.rowSpan) element.rowSpan = value.rowSpan;
    element.style.cssText = "border:1px solid #cbd5e1;padding:5px 4px;text-align:left;vertical-align:top;overflow-wrap:anywhere;word-break:normal;white-space:normal;line-height:1.5;height:auto;";
    return element;
  };

  const groupHeaders = [
    { text: 'S. No.', rowSpan: 2 },
    ...EXCEL_META_COLUMNS.map(col => ({ text: col.header, rowSpan: 2 })),
    ...GRANT_CATEGORIES.map((cat, index) => ({ text: cat.title, colSpan: 4 + getFoodForCategory(index).length })),
  ];
  const subHeaders = GRANT_CATEGORIES.flatMap((cat, index) => [
    'Grant 15', 'Grant 30', 'Grant 31', 'TOTAL',
    ...getFoodForCategory(index).map(food => food.header),
  ]);

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
    GRANT_CATEGORIES.forEach((cat, categoryIndex) => {
      [15, 30, 31].forEach((grantId, grantIndex) => {
        values.push(getGrantValue(r, cat.grantKey, grantIndex));
      });
      values.push(Number(r[cat.countKey] || 0).toLocaleString());
      getFoodForCategory(categoryIndex).forEach(food => values.push(Number(r[food.key] || 0).toLocaleString()));
    });
    values.forEach(v => row.appendChild(createCell("td", v)));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const footRow = document.createElement("tr");
  const footValues = [
    { text: '', colSpan: 1 + EXCEL_META_COLUMNS.length },
    ...GRANT_CATEGORIES.flatMap((cat, categoryIndex) => [
      { text: '' }, { text: '' }, { text: '' },
      { text: totalsRow[cat.countKey] ? totalsRow[cat.countKey].toLocaleString() : 0 },
      ...getFoodForCategory(categoryIndex).map(food => ({ text: totalsRow[food.key] ? totalsRow[food.key].toLocaleString() : 0 })),
    ]),
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
  const { t } = useLanguage();
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

  const [suppFilters, setSuppFilters] = useState({ quarter: '', financial_year: '' });
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
    const trimesterMonths = trimesterToMonths[normalizeTrimester(formData.quarter)] || [];
    if (!formData.field_name || !formData.quarter) return trimesterMonths;
    const dataMonths = new Set();
    suppNutritionData.forEach(rec => {
      const recTrimester = normalizeTrimester(rec.quarter);
      const quantity = Number(rec[formData.field_name]) || 0;
      if (recTrimester === normalizeTrimester(formData.quarter) && quantity > 0) {
        const month = rec._monthKeys || normalizeSuppMonth(rec.month);
        if (month) dataMonths.add(month);
      }
    });
    // Show only months belonging to the selected trimester. Months remain selectable
    // for recording receiving; they do not drive the auto-fetched packet total.
    return trimesterMonths;
  }, [suppNutritionData, formData.field_name, formData.quarter]);

  // A trimester is available only when Supplementary Nutrition contains
  // a positive allocation for the selected food field (or any food field
  // before a food item has been selected).
  const selectedTrimesterHasData = useMemo(() => {
    const selectedTrimester = normalizeTrimester(formData.quarter);
    if (!selectedTrimester) return true;

    const trimesterRecords = suppNutritionData.filter(
      rec => normalizeTrimester(rec.quarter) === selectedTrimester
    );
    if (!trimesterRecords.length) return false;

    const fieldsToCheck = formData.field_name
      ? [formData.field_name]
      : FOOD_FIELDS.map(food => food.key);

    return trimesterRecords.some(rec =>
      fieldsToCheck.some(field => Number(rec[field]) > 0)
    );
  }, [suppNutritionData, formData.quarter, formData.field_name]);

  const suppUniqueTrimesters = useMemo(() => {
    const trimesterOrder = [
      'Apr-May-Jun',
      'Jul-Aug-Sep',
      'Oct-Nov-Dec',
      'Jan-Feb-Mar',
      'April-May-June',
      'July-August-September',
      'October-November-December',
      'January-February-March',
    ];
    return [...new Set(suppNutritionData.map(r => r.quarter).filter(Boolean))]
      .sort((a, b) => {
        const aIndex = trimesterOrder.indexOf(String(a).trim());
        const bIndex = trimesterOrder.indexOf(String(b).trim());
        if (aIndex === -1 && bIndex === -1) return String(a).localeCompare(String(b));
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
  }, [suppNutritionData]);

  const suppUniqueFYs = useMemo(() => {
    return [...new Set(suppNutritionData.map(r => r.financial_year).filter(Boolean))].sort().reverse();
  }, [suppNutritionData]);

  const filteredSuppNutritionData = useMemo(() => {
    return suppNutritionData.filter(rec => {
      const trimesterMatch = !suppFilters.quarter || String(rec.quarter || '') === suppFilters.quarter;
      const fyMatch = !suppFilters.financial_year || rec.financial_year === suppFilters.financial_year;
      return trimesterMatch && fyMatch;
    });
  }, [suppNutritionData, suppFilters]);

  const suppTotals = useMemo(() => {
    const totals = {};
    NUMERIC_TOTAL_KEYS.forEach(key => {
      totals[key] = filteredSuppNutritionData.reduce((sum, r) => sum + (parseInt(r[key]) || 0), 0);
    });
    return totals;
  }, [filteredSuppNutritionData]);

  const computePacketsForTrimester = (trimester, fieldName, finYear) => {
    const selectedTrimester = normalizeTrimester(trimester);
    if (!selectedTrimester || !fieldName || !Array.isArray(suppNutritionData) || suppNutritionData.length === 0) return 0;

    // Use the exact food-item field selected from the Category/Food Item API.
    // Supplementary Nutrition can contain financial-year values in different formats,
    // so trimester matching is primary and FY matching is applied only when it finds rows.
    const matchingRecords = suppNutritionData.filter(rec => {
      if (normalizeTrimester(rec.quarter) !== selectedTrimester) return false;
      const rawValue = rec[fieldName];
      return rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '' && Number.isFinite(Number(rawValue));
    });

    if (!matchingRecords.length) return 0;

    const normalizeFY = (value) => {
      const str = String(value || '').trim();
      const match = str.match(/(\d{4})\s*[-–/]\s*(\d{2,4})/);
      if (!match) return str.toLowerCase();
      const start = Number(match[1]);
      const end = String(match[2]).length === 2 ? String(start + 1).slice(-2) : String(Number(match[2])).slice(-2);
      return `${start}-${end}`;
    };
    const normalizedSelectedFY = normalizeFY(finYear);
    const yearMatched = normalizedSelectedFY
      ? matchingRecords.filter(rec => normalizeFY(rec.financial_year || rec.fin_year) === normalizedSelectedFY)
      : [];

    // Important: do not return zero just because the FY text differs (e.g. 2026-27 vs 2026-27).
    // If no rows match the FY format, sum all records for the selected trimester, as the old
    // month-based implementation did when it could not find an FY match.
    const recordsToSum = yearMatched.length ? yearMatched : matchingRecords;
    return recordsToSum.reduce((sum, rec) => sum + (Number(rec[fieldName]) || 0), 0);
  };

  // Remaining allocation = Supplementary Nutrition allocation for the selected
  // trimester/food item minus packets already received in this HCM or THR tab.
  // When editing, exclude the record being edited so its own quantity is not deducted.
  const getRemainingAllocatedPackets = ({
    trimester, fieldName, finYear, foodItem, beneCategory, excludeId = null,
  }) => {
    const allocated = computePacketsForTrimester(trimester, fieldName, finYear);
    const records = activeTab === 'thr' ? thrReceivings : hcmReceivings;
    const normalizeFY = (value) => String(value || '').trim().replace(/[–/]/g, '-').toLowerCase();
    const alreadyReceived = records.reduce((sum, rec) => {
      if (excludeId != null && String(rec.id) === String(excludeId)) return sum;
      if (rec.food_item !== foodItem) return sum;
      if (normalizeTrimester(rec.quarter) !== normalizeTrimester(trimester)) return sum;
      if (normalizeFY(rec.fin_year) !== normalizeFY(finYear)) return sum;
      if (beneCategory && rec.bene_category && String(rec.bene_category) !== String(beneCategory)) return sum;
      return sum + (Number(rec.quantity) || 0);
    }, 0);
    return Math.max(0, allocated - alreadyReceived);
  };

  const remainingAllocation = useMemo(() => {
    if (!formData.field_name || !formData.quarter || !formData.food_item) return 0;
    return getRemainingAllocatedPackets({
      trimester: formData.quarter,
      fieldName: formData.field_name,
      finYear: formData.fin_year || getCurrentFinancialYear(),
      foodItem: formData.food_item,
      beneCategory: formData.bene_category,
      excludeId: editingItem ? editingItem.id : null,
    });
  }, [formData.field_name, formData.quarter, formData.food_item, formData.bene_category, formData.fin_year, editingItem, activeTab, suppNutritionData, hcmReceivings, thrReceivings]);

  const packetExpiryTotal = useMemo(() => {
    const rows = formData.packet_expiry || [];
    return rows.reduce((sum, row) => sum + (parseFloat(row && row[0]) || 0), 0);
  }, [formData.packet_expiry]);

  const packetExpiryMatchInfo = useMemo(() => {
    const totalQty = parseFloat(formData.quantity) || 0;
    const listTotal = packetExpiryTotal;
    if (!totalQty && !listTotal) {
      return { ok: false, message: t('Enter quantity & packet details.', 'मात्रा और पैकेट विवरण दर्ज करें।'), variant: 'muted' };
    }
    if (listTotal > totalQty) {
      return { ok: false, message: t(`List total (${listTotal}) exceeds quantity (${totalQty}).`, `सूची का कुल (${listTotal}) मात्रा (${totalQty}) से अधिक है।`), variant: 'danger' };
    }
    if (listTotal === totalQty) {
      return { ok: true, message: t(`List total (${listTotal}) matches quantity ✓`, `सूची का कुल (${listTotal}) मात्रा से मेल खाता है ✓`), variant: 'success' };
    }
    return { ok: false, message: t(`List total (${listTotal}). Required: ${totalQty}. Remaining: ${totalQty - listTotal}`, `सूची का कुल (${listTotal})। आवश्यक: ${totalQty}। शेष: ${totalQty - listTotal}`), variant: 'warning' };
  }, [packetExpiryTotal, formData.quantity]);

  // Expiry batch details are optional. Only enforce the packet-total match
  // when the user has entered at least one value in the expiry table.
  const packetExpiryHasInput = useMemo(() => {
    const rows = Array.isArray(formData.packet_expiry) ? formData.packet_expiry : [];
    return rows.some((row) =>
      Array.isArray(row) &&
      row.some((value) => String(value ?? "").trim() !== "")
    );
  }, [formData.packet_expiry]);

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
      setError(t("Failed to fetch data. Please refresh the page.", "डेटा प्राप्त नहीं हो सका। कृपया पृष्ठ रीफ़्रेश करें।"));
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
    setSuppFilters({ quarter: '', financial_year: '' });
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
        months: parsedMonths.filter(month => (trimesterToMonths[normalizeTrimester(item.quarter)] || []).includes(month)),
        quarter: normalizeTrimester(item.quarter) || item.quarter || '',
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

    if (name === 'quarter') {
      const trimesterMonths = trimesterToMonths[normalizeTrimester(value)] || [];
      setFormData(prev => ({
        ...prev,
        quarter: value,
        months: (prev.months || []).filter(month => trimesterMonths.includes(month)),
        quantity: prev.field_name && prev.food_item
          ? String(getRemainingAllocatedPackets({ trimester: value, fieldName: prev.field_name, finYear: prev.fin_year || getCurrentFinancialYear(), foodItem: prev.food_item, beneCategory: prev.bene_category, excludeId: editingItem ? editingItem.id : null }))
          : '',
        packet_expiry: [['', '', '']],
      }));
    } else if (name === 'food_item') {
      const parts = value.split('|||');
      const selectedFoodItem = parts[0] || '';
      const selectedBeneCategory = parts[1] || '';
      const selectedItem = foodItemOptions.find(item =>
        item.food_item === selectedFoodItem &&
        (selectedBeneCategory
          ? String(item.beneficiary_category || FOOD_BENE_CATEGORY_MAP[item.food_item] || '') === selectedBeneCategory
          : true)
      );
      const autoFieldName = selectedItem ? (selectedItem.field_name || '') : '';
      const autoBeneCategory = selectedItem
        ? (selectedItem.beneficiary_category || FOOD_BENE_CATEGORY_MAP[selectedFoodItem] || selectedItem.bene_category || selectedItem.category || '')
        : '';
      setFormData(prev => ({
        ...prev,
        food_item: selectedFoodItem,
        food_item_value: value,
        field_name: autoFieldName,
        unit: 'Packets',
        bene_category: autoBeneCategory,
        quantity: prev.quarter && autoFieldName
          ? String(getRemainingAllocatedPackets({ trimester: prev.quarter, fieldName: autoFieldName, finYear: prev.fin_year || getCurrentFinancialYear(), foodItem: selectedFoodItem, beneCategory: autoBeneCategory, excludeId: editingItem ? editingItem.id : null }))
          : '',
        months: (prev.months || []).filter(month => (trimesterToMonths[normalizeTrimester(prev.quarter)] || []).includes(month)),
        packet_expiry: [['', '', '']],
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (formError) setFormError('');
  };

  const handleMonthToggle = (monthValue, isChecked) => {
    setFormData(prev => {
      const allowedMonths = trimesterToMonths[normalizeTrimester(prev.quarter)] || [];
      if (!allowedMonths.includes(monthValue)) return prev;
      const currentMonths = prev.months || [];
      const nextMonths = isChecked
        ? Array.from(new Set([...currentMonths, monthValue]))
        : currentMonths.filter(m => m !== monthValue);
      // Month selection records only the months when receiving occurred.
      // Packet quantity always comes from the selected trimester in Supplementary Nutrition.
      return { ...prev, months: nextMonths };
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

    const trimesterValue = normalizeTrimester(formData.quarter) || formData.quarter || '';
    if (!trimesterValue) {
      setFormErrorAndScroll(t('Please select a trimester for receiving.', 'कृपया प्राप्ति के लिए त्रैमासिक अवधि चुनें।'));
      setSubmitting(false);
      return;
    }

    // At least one receiving month is mandatory; expiry details are optional.
    if (selectedMonths.length === 0) {
      setFormErrorAndScroll(t('Please select at least one month for receiving.', 'कृपया प्राप्ति के लिए कम से कम एक महीना चुनें।'));
      setSubmitting(false);
      return;
    }

    if (!selectedTrimesterHasData) {
      setFormErrorAndScroll(t(`No Supplementary Nutrition data is available for trimester (${trimesterValue}). Please select another trimester.`, `इस त्रैमासिक अवधि (${trimesterValue}) के लिए पूरक पोषण डेटा उपलब्ध नहीं है। कृपया दूसरी अवधि चुनें।`));
      setSubmitting(false);
      return;
    }

    const allocationLimit = getRemainingAllocatedPackets({
      trimester: trimesterValue,
      fieldName: formData.field_name,
      finYear: formData.fin_year || getCurrentFinancialYear(),
      foodItem: formData.food_item,
      beneCategory: formData.bene_category,
      excludeId: editingItem ? editingItem.id : null,
    });
    // If this allocation has already been fully received in the active HCM/THR
    // receiving table, block another receiving record even if the user enters 0.
    if (allocationLimit <= 0 && !editingItem) {
      const totalAllocated = computePacketsForTrimester(
        trimesterValue,
        formData.field_name,
        formData.fin_year || getCurrentFinancialYear()
      );
      setFormErrorAndScroll(
        t(`Your receiving limit for ${trimesterValue} is ${totalAllocated} packets. All ${totalAllocated} allocated packets have already been received in ${isThr ? 'THR' : 'HCM'} Receiving. You cannot add more receiving for this food item and trimester.`, `${trimesterValue} के लिए आपकी प्राप्ति सीमा ${totalAllocated} पैकेट है। सभी आवंटित पैकेट ${isThr ? 'THR' : 'HCM'} प्राप्ति में दर्ज हो चुके हैं। इस खाद्य सामग्री और अवधि के लिए और प्राप्ति दर्ज नहीं की जा सकती।`)
      );
      setSubmitting(false);
      return;
    }

    if (parsedQuantity > allocationLimit) {
      setFormErrorAndScroll(t(`Your remaining receiving limit for ${trimesterValue} is ${allocationLimit} packets. You cannot receive more than the allocated quantity.`, `${trimesterValue} के लिए आपकी शेष प्राप्ति सीमा ${allocationLimit} पैकेट है। आवंटित मात्रा से अधिक प्राप्त नहीं कर सकते।`));
      setSubmitting(false);
      return;
    }

    const existingRecords = isThr ? thrReceivings : hcmReceivings;
    const duplicate = existingRecords.find(rec => {
      if (editingItem && rec.id === editingItem.id) return false;
      const recMonths = getMonthsArray(rec);
      if (rec.food_item !== formData.food_item ||
          rec.fin_year !== (formData.fin_year || getCurrentFinancialYear()) ||
          normalizeTrimester(rec.quarter) !== trimesterValue) return false;
      if (formData.bene_category && rec.bene_category &&
          formData.bene_category !== rec.bene_category) return false;
      return selectedMonths.some(m => recMonths.includes(m));
    });

    if (duplicate) {
      setFormErrorAndScroll(t("A receiving record for this month and category already exists.", "इस महीने और श्रेणी के लिए प्राप्ति रिकॉर्ड पहले से दर्ज है।"));
      setSubmitting(false);
      return;
    }

    // Packet-wise expiry details are optional for both THR and HCM receiving.
    // If the user enters any batch rows, validate those rows; otherwise allow saving.
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
      .filter(r => r.some(value => value !== ''));

    const peTotal = cleanedPacketExpiry.reduce((s, r) => s + (parseFloat(r[0]) || 0), 0);

    // Only validate batch totals when packet details have actually been entered.
    if (cleanedPacketExpiry.length > 0) {
      if (peTotal > parsedQuantity) {
        setFormErrorAndScroll(t(`Packet details total (${peTotal}) cannot exceed quantity (${parsedQuantity}).`, `पैकेट विवरण का कुल (${peTotal}) मात्रा (${parsedQuantity}) से अधिक नहीं हो सकता।`));
        setSubmitting(false);
        return;
      }
      if (peTotal !== parsedQuantity) {
        setFormErrorAndScroll(
          t(`Packet details total (${peTotal}) must equal quantity (${parsedQuantity}). Remaining: ${parsedQuantity - peTotal}`, `पैकेट विवरण का कुल (${peTotal}) मात्रा (${parsedQuantity}) के बराबर होना चाहिए। शेष: ${parsedQuantity - peTotal}`)
        );
        setSubmitting(false);
        return;
      }
      const incomplete = cleanedPacketExpiry.find(r => r[0] === '' || r[1] === '');
      if (incomplete) {
        setFormErrorAndScroll(t("If you enter Packet Details, provide both packet count and expiry date for every batch.", "यदि पैकेट विवरण भरते हैं, तो हर बैच के लिए पैकेट संख्या और समाप्ति तिथि दोनों भरें।"));
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
      quarter: trimesterValue,
      curr_month: formData.curr_month || getCurrentMonth(),
      max_expirydate: formData.max_expirydate || null,
      packet_expiry: cleanedPacketExpiry,
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
      setFormErrorAndScroll(t(`Failed to ${editingItem ? 'update' : 'create'} record. ${backendMessage || 'Please try again.'}`, `${editingItem ? 'अपडेट' : 'नया'} रिकॉर्ड नहीं बनाया जा सका। ${backendMessage || 'कृपया पुनः प्रयास करें।'}`));
      console.error("API Error:", err.response ? err.response.data : err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("Are you sure you want to delete this receiving record?", "क्या आप वाकई यह प्राप्ति रिकॉर्ड हटाना चाहते हैं?"))) {
      const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
      try {
        await api.delete(url, { data: { id } });
        fetchData();
      } catch (err) {
        alert(t("Failed to delete record.", "रिकॉर्ड हटाया नहीं जा सका।"));
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


  // Shared packet-expiry helpers for the receiving table and its PDF/Excel exports.
  const getPacketExpiryRows = (record) => {
    if (!Array.isArray(record?.packet_expiry)) return [];
    return record.packet_expiry.filter((entry) => {
      const count = Array.isArray(entry) ? entry[0] : entry?.count;
      const date = Array.isArray(entry) ? entry[1] : entry?.date;
      const remark = Array.isArray(entry) ? entry[2] : (entry?.remark ?? entry?.remarks);
      return [count, date, remark].some(value => value !== null && value !== undefined && String(value).trim() !== '');
    });
  };

  const getExpiryEntry = (entry) => ({
    count: Array.isArray(entry) ? entry[0] : (entry?.count ?? ''),
    date: Array.isArray(entry) ? entry[1] : (entry?.date ?? ''),
    remark: Array.isArray(entry) ? entry[2] : (entry?.remark ?? entry?.remarks ?? ''),
  });

  const formatExportDate = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('en-GB');
  };

  const getExpiredPacketCount = (record) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return getPacketExpiryRows(record).reduce((total, entry) => {
      const { count, date } = getExpiryEntry(entry);
      if (!date) return total;
      const expiryDate = new Date(date);
      if (Number.isNaN(expiryDate.getTime())) return total;
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate < today ? total + (Number(count) || 0) : total;
    }, 0);
  };

  const getExpiryBreakdown = (record) => getPacketExpiryRows(record).map((entry) => {
    const { count, date, remark } = getExpiryEntry(entry);
    const expired = date && !Number.isNaN(new Date(date).getTime()) && new Date(date).setHours(0, 0, 0, 0) < new Date(new Date().setHours(0, 0, 0, 0));
    return `${count === '' ? '—' : count} packets | Expiry: ${formatExportDate(date) || '—'} | ${expired ? 'EXPIRED / समाप्त' : 'Not expired / समाप्त नहीं'}${remark ? ` | ${remark}` : ''}`;
  }).join(' ; ');

  const makeReceivingExportRows = (records) => records.map((rec, index) => ({
    'S. No.': index + 1,
    'District': rec.district ?? '',
    'Project': rec.project ?? '',
    'Sector': rec.sector ?? '',
    'AWC Name': rec.awc_name ?? '',
    'AWC Code': rec.awc_code ?? '',
    'Date': formatExportDate(rec.date),
    'Trimester Packets Distribution': rec.food_item ?? '',
    'Beneficiary Category': rec.bene_category ?? '',
    'Packets': rec.quantity ?? 0,
    'Unit': rec.unit ?? '',
    'Fin. Year': rec.fin_year ?? '',
    'Current Month': rec.curr_month ?? '',
    'Max Expiry Date': formatExportDate(rec.max_expirydate),
    'Trimester': normalizeTrimester(rec.quarter) || rec.quarter || '',
    'Months': formatMonths(getMonthsArray(rec)),
    'Expired Packets': getExpiredPacketCount(rec),
    'Expiry Details': getExpiryBreakdown(rec) || 'No expiry details / समाप्ति विवरण उपलब्ध नहीं',
    'Sector Status': rec.sector_status || 'pending',
    'Sector Remark': rec.sector_remark ?? '',
  }));

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
      GRANT_CATEGORIES.forEach((cat, categoryIndex) => {
        [15, 30, 31].forEach((grantId, grantIndex) => {
          const values = row[cat.grantKey];
          const value = Array.isArray(values) ? values[grantIndex] : undefined;
          obj[`${cat.title} - Grant ${grantId}`] =
            value === null || value === undefined || value === "" ? "" : (Number.isFinite(Number(value)) ? Number(value) : value);
        });
        obj[`${cat.title} - Total`] = Number(row[cat.countKey] || 0);
        getFoodForCategory(categoryIndex).forEach(food => { obj[food.header] = Number(row[food.key] || 0); });
      });
      return obj;
    });

    const totalObj = { "S. No.": "" };
    EXCEL_META_COLUMNS.forEach(c => { totalObj[c.header] = c.key === "district" ? "TOTAL" : ""; });
    GRANT_CATEGORIES.forEach((cat, categoryIndex) => {
      [15, 30, 31].forEach(gid => { totalObj[`${cat.title} - Grant ${gid}`] = ""; });
      totalObj[`${cat.title} - Total`] = suppTotals[cat.countKey] || 0;
      getFoodForCategory(categoryIndex).forEach(food => { totalObj[food.header] = suppTotals[food.key] || 0; });
    });
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

  const exportReceivingToExcel = () => {
    const records = activeTab === 'thr' ? filteredThrReceivings : filteredHcmReceivings;
    if (!records.length) return;
    try {
      const mainRows = makeReceivingExportRows(records);
      const expiryRows = [];
      records.forEach((rec, index) => {
        const entries = getPacketExpiryRows(rec);
        const common = {
          'S. No.': index + 1,
          'District': rec.district ?? '',
          'Project': rec.project ?? '',
          'Sector': rec.sector ?? '',
          'AWC Name': rec.awc_name ?? '',
          'AWC Code': rec.awc_code ?? '',
          'Food Item': rec.food_item ?? '',
          'Beneficiary Category': rec.bene_category ?? '',
          'Receiving Date': formatExportDate(rec.date),
        };
        if (entries.length) {
          entries.forEach((entry) => {
            const { count, date, remark } = getExpiryEntry(entry);
            const expiryDate = date ? new Date(date) : null;
            const expired = expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate.setHours(0, 0, 0, 0) < new Date(new Date().setHours(0, 0, 0, 0));
            expiryRows.push({
              ...common,
              'Expiry Date': formatExportDate(date),
              'Packet Count': count,
              'Expiry Status': expired ? 'EXPIRED / समाप्त' : 'Not expired / समाप्त नहीं',
              'Remarks': remark,
            });
          });
        } else {
          expiryRows.push({ ...common, 'Expiry Date': '', 'Packet Count': '', 'Expiry Status': 'No expiry details / समाप्ति विवरण उपलब्ध नहीं', 'Remarks': '' });
        }
      });

      const quantityTotals = Object.entries(records.reduce((acc, rec) => {
        const unit = rec.unit || 'N/A';
        acc[unit] = (acc[unit] || 0) + (Number(rec.quantity) || 0);
        return acc;
      }, {})).map(([unit, total]) => ({ 'Unit / इकाई': unit, 'Total Quantity / कुल मात्रा': Number(total.toFixed(2)) }));

      const workbook = XLSX.utils.book_new();
      const mainSheet = XLSX.utils.json_to_sheet(mainRows);
      const expirySheet = XLSX.utils.json_to_sheet(expiryRows);
      const totalsSheet = XLSX.utils.json_to_sheet(quantityTotals);
      [mainSheet, expirySheet, totalsSheet].forEach((sheet) => {
        if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
      });
      mainSheet['!cols'] = Object.keys(mainRows[0] || {}).map(key => ({ wch: Math.min(42, Math.max(14, key.length + 2)) }));
      expirySheet['!cols'] = Object.keys(expiryRows[0] || {}).map(key => ({ wch: Math.min(36, Math.max(14, key.length + 2)) }));
      XLSX.utils.book_append_sheet(workbook, mainSheet, `${activeTab.toUpperCase()} Receiving`);
      XLSX.utils.book_append_sheet(workbook, expirySheet, 'Packet Expiry Details');
      XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Quantity Totals');
      XLSX.writeFile(workbook, `${activeTab}-anganwadi-receiving.xlsx`, { compression: true });
    } catch (err) {
      console.error('Receiving Excel export failed:', err);
      setError('Excel export failed. Please try again.');
    }
  };

  const exportReceivingToPDF = async () => {
    const records = activeTab === 'thr' ? filteredThrReceivings : filteredHcmReceivings;
    if (!records.length) return;
    let content;
    try {
      await loadHindiPdfFont();
      const rows = makeReceivingExportRows(records);
      content = document.createElement('div');
      content.style.cssText = "box-sizing:border-box;width:100%;padding:12px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI',Mangal,sans-serif;";
      const heading = document.createElement('h2');
      heading.textContent = `${activeTab.toUpperCase()} प्राप्ति रिपोर्ट / ${activeTab.toUpperCase()} Receiving Report`;
      heading.style.cssText = 'text-align:center;margin:0 0 12px;font-size:16px;font-weight:700;';
      content.appendChild(heading);

      const appendTable = (title, headers, bodyRows) => {
        if (title) {
          const h = document.createElement('h3');
          h.textContent = title;
          h.style.cssText = 'font-size:12px;margin:14px 0 6px;';
          content.appendChild(h);
        }
        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse;table-layout:auto;font-size:7px;line-height:1.5;break-inside:auto;';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(label => {
          const th = document.createElement('th');
          th.textContent = label;
          th.style.cssText = 'border:1px solid #94a3b8;background:#e0e7ff;color:#312e81;padding:4px;text-align:left;vertical-align:middle;';
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        bodyRows.forEach(values => {
          const tr = document.createElement('tr');
          values.forEach(value => {
            const td = document.createElement('td');
            td.textContent = value == null || value === '' ? '—' : String(value);
            td.style.cssText = 'border:1px solid #cbd5e1;padding:5px 4px;vertical-align:top;overflow-wrap:anywhere;white-space:normal;line-height:1.5;height:auto;';
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        content.appendChild(table);
      };

      const mainHeaders = Object.keys(rows[0] || {});
      appendTable('प्राप्ति विवरण / Receiving Details', mainHeaders, rows.map(row => mainHeaders.map(header => row[header])));

      const expiryHeaders = ['S. No.', 'District', 'Project', 'Sector', 'AWC Name', 'Food Item', 'Expiry Date', 'Packet Count', 'Expiry Status', 'Remarks'];
      const expiryRows = [];
      records.forEach((rec, index) => {
        const entries = getPacketExpiryRows(rec);
        const common = [index + 1, rec.district ?? '—', rec.project ?? '—', rec.sector ?? '—', rec.awc_name ?? '—', rec.food_item ?? '—'];
        if (entries.length) entries.forEach(entry => {
          const { count, date, remark } = getExpiryEntry(entry);
          const expiryDate = date ? new Date(date) : null;
          const expired = expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate.setHours(0, 0, 0, 0) < new Date(new Date().setHours(0, 0, 0, 0));
          expiryRows.push([...common, formatExportDate(date) || '—', count || '—', expired ? 'EXPIRED / समाप्त' : 'Not expired / समाप्त नहीं', remark || '—']);
        });
        else expiryRows.push([...common, '—', '—', 'No expiry details / समाप्ति विवरण उपलब्ध नहीं', '—']);
      });
      appendTable('पैकेट की समाप्ति जानकारी / Packet Expiry Details', expiryHeaders, expiryRows);

      const totals = Object.entries(records.reduce((acc, rec) => {
        const unit = rec.unit || 'N/A';
        acc[unit] = (acc[unit] || 0) + (Number(rec.quantity) || 0);
        return acc;
      }, {}));
      appendTable('इकाई के अनुसार कुल मात्रा / Quantity Totals', ['Unit / इकाई', 'Total Quantity / कुल मात्रा'], totals.map(([unit, total]) => [unit, total.toFixed(2)]));

      document.body.appendChild(content);
      await html2pdf().set({
        margin: [7, 7, 7, 7],
        filename: `${activeTab}-anganwadi-receiving.pdf`,
        image: { type: 'jpeg', quality: 0.88 },
        html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape', compress: true },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'td', 'th'] },
      }).from(content).save();
    } catch (err) {
      console.error('Receiving PDF export failed:', err);
      setError('PDF export failed. Please try again.');
    } finally {
      content?.remove();
    }
  };

  const renderTable = (records) => {
    const totalQuantity = records.reduce((sum, rec) => sum + (parseFloat(rec.quantity) || 0), 0);

    return (
      <Table striped bordered hover responsive className="mt-4 receiving-data-table food-item-table" style={{ tableLayout: 'auto', minWidth: '1500px' }}>
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
            <th>#</th>
            <th>{t("Date", "दिनांक")}</th>
            <th>{t("Trimester Packets Distribution", "त्रैमासिक पैकेट वितरण")}</th>
            <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
            <th>{t("Packets", "पैकेट")}</th>
            <th>{t("Unit", "इकाई")}</th>
            <th>{t("Fin. Year", "वित्तीय वर्ष")}</th>
            <th>{t("Current Month", "वर्तमान महीना")}</th>
            <th>{t("Max Expiry Date", "अधिकतम समाप्ति तिथि")}</th>
            <th>{t("Trimester", "त्रैमासिक अवधि")}</th>
            <th>{t("Months", "महीने")}</th>
            <th>{t("Expired Packets", "समाप्त पैकेट")}</th>
            <th>{t("Expiry Details", "समाप्ति विवरण")}</th>
            <th>{t("Sector Status", "सेक्टर स्थिति")}</th>
            <th>{t("Actions", "कार्रवाई")}</th>
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
              <td>{normalizeTrimester(rec.quarter) || rec.quarter || '-'}</td>
              <td>{formatMonths(getMonthsArray(rec))}</td>
              <td className="text-center">{getExpiredPacketCount(rec).toLocaleString()}</td>
              <td style={{ minWidth: '260px', whiteSpace: 'normal', verticalAlign: 'top', overflowWrap: 'anywhere', lineHeight: 1.5, height: 'auto' }}>{getExpiryBreakdown(rec) || t('No expiry details available.', 'समाप्ति विवरण उपलब्ध नहीं है।')}</td>
              <td>
                <Badge bg={getStatusVariant(rec.sector_status)}>{rec.sector_status || 'pending'}</Badge>
              </td>
              <td>
                <div className="d-flex gap-1 flex-wrap">
                  {rec.sector_status === 'approved' || rec.sector_status === 'rejected' ? (
                    <Button variant="outline-info" size="sm" onClick={() => handleOpenViewModal(rec)}>
                      <FaEye /> {t("View", "देखें")}
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
                      title={t("View Packet Expiry Details", "पैकेट समाप्ति विवरण देखें")}
                    >
                      <FaCalendarCheck /> {t("Expiry", "समाप्ति")}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="15" className="text-center">{t("No records found.", "कोई रिकॉर्ड नहीं मिला।")}</td></tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
              <td colSpan="4" className="text-end">{t("Total Quantity:", "कुल मात्रा:")}</td>
              <td>{totalQuantity}</td>
              <td colSpan="10"></td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  const renderSuppTable = (records) => {
    const totalCols = 1 + EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.reduce(
      (sum, cat, index) => sum + 4 + getFoodForCategory(index).length, 0
    );

    return (
      <div className="mt-4">
        <Row className="mb-3 g-2 align-items-end">
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t("Trimester", "त्रैमासिक अवधि")}</Form.Label>
              <Form.Select name="quarter" value={suppFilters.quarter} onChange={handleSuppFilterChange}>
                <option value="">{t("All Trimesters", "सभी त्रैमासिक अवधियां")}</option>
                {suppUniqueTrimesters.map(trimester => (
                  <option key={trimester} value={trimester}>{trimester}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label>
              <Form.Select name="financial_year" value={suppFilters.financial_year} onChange={handleSuppFilterChange}>
                <option value="">{t("All Years", "सभी वर्ष")}</option>
                {suppUniqueFYs.map(y => <option key={y} value={y}>{y}</option>)}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6} className="d-flex gap-2 justify-content-end align-items-end flex-wrap">
            <Button variant="secondary" size="sm" onClick={resetSuppFilters}>{t("Reset", "रीसेट करें")}</Button>
            <Button variant="success" size="sm" onClick={exportSuppToExcel} disabled={!records.length}>
              <FaFileExcel className="me-1" /> {t("Excel", "एक्सेल")}
            </Button>
            <Button variant="danger" size="sm" onClick={exportSuppToPDF} disabled={!records.length}>
              <FaFilePdf className="me-1" /> {t("PDF", "पीडीएफ")}
            </Button>
          </Col>
        </Row>

        <div className="table-responsive supp-grant-table-scroll-host" style={{ width: "100%", overflowX: "auto", position: "relative" }}>
          <Table
            bordered
            hover
            className="supp-grant-master-table mb-0"
            style={{ minWidth: "2400px", borderCollapse: "separate", borderSpacing: 0, width: "max-content" }}
          >
            <thead>
              <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                <th rowSpan={2} className="text-center align-middle">{t("S. No.", "क्रम सं.")}</th>
                {EXCEL_META_COLUMNS.map((col) => (
                  <th key={col.key} rowSpan={2} className="text-center align-middle">{t(col.header, ({
                    DISTRICT: "जिला", PROJECT: "परियोजना", SECTOR: "सेक्टर",
                    "AWC NAME": "आंगनवाड़ी केंद्र का नाम", "AWC CODE": "आंगनवाड़ी केंद्र कोड",
                    Trimester: "त्रैमासिक अवधि", "FINANCIAL YEAR": "वित्तीय वर्ष"
                  })[col.header])}</th>
                ))}
                {GRANT_CATEGORIES.map((cat, index) => (
                  <th key={cat.countKey} colSpan={4 + getFoodForCategory(index).length} className="text-center align-middle supp-grant-group-header">
                    {t(cat.title, ({
                      "Pregnant Woman and Lactating Mother": "गर्भवती महिलाएं और स्तनपान कराने वाली माताएं",
                      "Children 6m-3y": "6 माह से 3 वर्ष के बच्चे",
                      "SAM 6M-5Y / SUW 6M-6Y": "SAM 6 माह–5 वर्ष / SUW 6 माह–6 वर्ष",
                      "SAM 3Y-5Y / SUW 3Y-6Y": "SAM 3–5 वर्ष / SUW 3–6 वर्ष",
                      "HCM Beneficiaries 3Y-6Y (Normal Children)": "HCM लाभार्थी 3–6 वर्ष (सामान्य बच्चे)"
                    })[cat.title])}
                  </th>
                ))}
              </tr>
              <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                {GRANT_CATEGORIES.flatMap((cat, index) => [
                  ...[15, 30, 31].map((grantId) => (
                    <th key={`${cat.countKey}-${grantId}`} className="text-center">{t(`Grant ${grantId}`, `अनुदान ${grantId}`)}</th>
                  )),
                  <th key={`${cat.countKey}-total`} className="text-center">{t("TOTAL", "कुल")}</th>,
                  ...getFoodForCategory(index).map((food) => (
                    <th key={food.key} className="text-center supp-food-subheader">{food.header}</th>
                  )),
                ])}
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map((rec, index) => (
                <tr key={rec.id || index}>
                  <td className="text-center text-muted">{index + 1}</td>
                  {EXCEL_META_COLUMNS.map((col) => (
                    <td key={col.key} className={col.key === "quarter" ? "text-center" : ""}>
                      {col.key === "quarter" && rec[col.key] ? (
                        <Badge className="supp-quarter-badge">{normalizeTrimester(rec[col.key]) || rec[col.key]}</Badge>
                      ) : (rec[col.key] ?? "—")}
                    </td>
                  ))}
                  {GRANT_CATEGORIES.flatMap((cat, categoryIndex) => [
                    ...[15, 30, 31].map((grantId, grantIndex) => (
                      <td key={`${cat.countKey}-${grantId}`} className="text-center supp-grant-cell">
                        {getGrantValue(rec, cat.grantKey, grantIndex)}
                      </td>
                    )),
                    <td key={`${cat.countKey}-total`} className="text-end fw-semibold supp-total-cell">
                      {Number(rec[cat.countKey] || 0).toLocaleString()}
                    </td>,
                    ...getFoodForCategory(categoryIndex).map((food) => (
                      <td key={food.key} className="text-end">{Number(rec[food.key] || 0).toLocaleString()}</td>
                    )),
                  ])}
                </tr>
              )) : (
                <tr>
                  <td colSpan={totalCols} className="text-center text-muted p-4">{t("No supplementary nutrition records found.", "पूरक पोषण का कोई रिकॉर्ड नहीं मिला।")}</td>
                </tr>
              )}
            </tbody>
            {records.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                  <th></th>
                  {EXCEL_META_COLUMNS.map((col, idx) => (
                    <th key={col.key}>{idx === 0 ? t("TOTAL", "कुल") : ""}</th>
                  ))}
                  {GRANT_CATEGORIES.flatMap((cat, categoryIndex) => [
                    <th key={`${cat.countKey}-g15`}></th>,
                    <th key={`${cat.countKey}-g30`}></th>,
                    <th key={`${cat.countKey}-g31`}></th>,
                    <th key={`${cat.countKey}-total`} className="text-end">{(suppTotals[cat.countKey] || 0).toLocaleString()}</th>,
                    ...getFoodForCategory(categoryIndex).map((food) => (
                      <th key={food.key} className="text-end">{(suppTotals[food.key] || 0).toLocaleString()}</th>
                    )),
                  ])}
                </tr>
              </tfoot>
            )}
          </Table>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    const currentFilters = uniqueFilterOptions[activeTab];
    return (
      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label>
            <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
              <option value="">{t("All Years", "सभी वर्ष")}</option>
              {currentFilters && currentFilters.fin_year ? currentFilters.fin_year.map(year => <option key={year} value={year}>{year}</option>) : null}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>{t("Months", "महीने")}</Form.Label>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? t(`${filters.months.length} selected`, `${filters.months.length} चयनित`) : t('All Months', 'सभी महीने')}</Dropdown.Toggle>
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
        <Col md={4} className="d-flex align-items-end gap-2 flex-wrap food-tem-receving">
          <Button variant="secondary" onClick={resetFilters}>{t("Reset", "रीसेट करें")}</Button>
          <Button variant="outline-success" onClick={exportReceivingToExcel} disabled={!(activeTab === 'thr' ? filteredThrReceivings : filteredHcmReceivings).length}>
            <FaFileExcel className="me-1" /> Excel
          </Button>
          <Button variant="outline-danger" onClick={exportReceivingToPDF} disabled={!(activeTab === 'thr' ? filteredThrReceivings : filteredHcmReceivings).length}>
            <FaFilePdf className="me-1" /> PDF
          </Button>
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

  // Sticky viewport scrollbar for all horizontally scrollable tables (HCM, THR,
  // Supplementary Nutrition and responsive tables inside visible modals). The
  // original table scrollbar remains usable; this additional bar stays at the
  // viewport bottom and synchronizes with the currently visible table.
  useEffect(() => {
    const bar = document.createElement("div");
    const track = document.createElement("div");
    bar.className = "food-item-sticky-horizontal-scrollbar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Scroll visible table horizontally");
    bar.tabIndex = 0;
    Object.assign(bar.style, {
      position: "fixed", left: "0", bottom: "0", width: "100vw", height: "18px",
      overflowX: "auto", overflowY: "hidden", zIndex: "1080", display: "none",
      background: "#fff", borderTop: "1px solid #cbd5e1",
      boxShadow: "0 -2px 8px rgba(15,23,42,.12)", scrollbarWidth: "auto",
      scrollbarColor: "#64748b #e2e8f0", touchAction: "pan-x",
      overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch",
    });
    Object.assign(track.style, { height: "1px", pointerEvents: "none" });
    bar.appendChild(track);
    document.body.appendChild(bar);

    let activeScroller = null;
    let syncing = false;
    let rafId = 0;
    const getCandidates = () => Array.from(document.querySelectorAll(
      ".food-item-table-scroll, .supp-grant-table-scroll-host, .table-responsive"
    )).filter(el => el !== bar && !bar.contains(el) && el.querySelector("table"));
    const hasOverflow = el => {
      const table = el.querySelector("table");
      return !!table && Math.max(el.scrollWidth, table.scrollWidth, table.getBoundingClientRect().width) > el.clientWidth + 2;
    };
    const visible = el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    };
    const refresh = preferred => {
      rafId = 0;
      const candidates = getCandidates().filter(el => hasOverflow(el) && visible(el));
      activeScroller = preferred && candidates.includes(preferred)
        ? preferred
        : (activeScroller && candidates.includes(activeScroller)
          ? activeScroller
          : candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0] || null);
      if (!activeScroller) { bar.style.display = "none"; return; }
      const rect = activeScroller.getBoundingClientRect();
      const table = activeScroller.querySelector("table");
      const width = Math.max(activeScroller.scrollWidth, table?.scrollWidth || 0, activeScroller.clientWidth + 1);
      bar.style.display = "block";
      bar.style.left = `${Math.max(0, rect.left)}px`;
      bar.style.width = `${Math.max(0, Math.min(window.innerWidth - Math.max(0, rect.left), rect.width))}px`;
      track.style.width = `${width}px`;
      if (bar.scrollLeft !== activeScroller.scrollLeft) bar.scrollLeft = activeScroller.scrollLeft;
    };
    const schedule = preferred => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => refresh(preferred));
    };
    const onTableScroll = event => {
      if (syncing) return;
      const scroller = event.currentTarget;
      if (activeScroller === scroller) {
        syncing = true; bar.scrollLeft = scroller.scrollLeft; syncing = false;
      }
      schedule(scroller);
    };
    let observeTables = () => {};
    const attach = () => {
      getCandidates().forEach(el => {
        if (el.dataset.foodStickyScrollBound !== "true") {
          el.dataset.foodStickyScrollBound = "true";
          el.addEventListener("scroll", onTableScroll, { passive: true });
        }
      });
      observeTables();
      schedule();
    };
    const onBarScroll = () => {
      if (!activeScroller || syncing) return;
      syncing = true; activeScroller.scrollLeft = bar.scrollLeft; syncing = false;
    };
    const onViewportChange = () => schedule();
    bar.addEventListener("scroll", onBarScroll, { passive: true });
    window.addEventListener("scroll", onViewportChange, { passive: true, capture: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    const observer = typeof MutationObserver !== "undefined"
      ? new MutationObserver((mutations) => {
          // Ignore style changes made by the sticky scrollbar itself; observing those
          // would create a refresh loop and can freeze the page.
          const relevant = mutations.some(m => !bar.contains(m.target) && (
            m.type === "childList" || m.target.closest?.(".food-item-table-scroll, .supp-grant-table-scroll-host, .table-responsive")
          ));
          if (relevant) attach();
        }) : null;
    observer?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => schedule());
      observeTables = () => getCandidates().forEach(el => {
        try {
          resizeObserver.observe(el);
          const table = el.querySelector("table");
          if (table) resizeObserver.observe(table);
        } catch (_) {}
      });
      observeTables();
    }
    attach();
    schedule();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer?.disconnect(); resizeObserver?.disconnect();
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
      bar.removeEventListener("scroll", onBarScroll);
      getCandidates().forEach(el => {
        el.removeEventListener("scroll", onTableScroll);
        delete el.dataset.foodStickyScrollBound;
      });
      bar.remove();
    };
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
              <FaBoxes className="me-2" /> {t("Food Item Receiving", "खाद्य सामग्री प्राप्ति")}
            </h3>
            {activeTab !== 'supp' && (
              <Button onClick={() => handleOpenModal()}>{t("Add New Receiving", "नई प्राप्ति जोड़ें")}</Button>
            )}
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">

            <Tab eventKey="hcm" title={t("HCM Receiving", "HCM प्राप्ति")}>
              {!loading && !error && (
                <>
                  <h5 className="mt-4">{t("HCM Receiving Records", "HCM प्राप्ति रिकॉर्ड")}</h5>
                  {renderFilters()}
                  {renderTable(filteredHcmReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="thr" title={t("THR Receiving", "THR प्राप्ति")}>
              {!loading && !error && (
                <>
                  <h5 className="mt-4">{t("THR Receiving Records", "THR प्राप्ति रिकॉर्ड")}</h5>
                  {renderFilters()}
                  {renderTable(filteredThrReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="supp" title={t("Supplementary Nutrition", "पूरक पोषण")}>
              {!loading && !error && (
                <>
                  <h5 className="mt-4">{t("Supplementary Nutrition Records", "पूरक पोषण रिकॉर्ड")}</h5>
                  {renderSuppTable(filteredSuppNutritionData)}
                </>
              )}
            </Tab>

          </Tabs>
        </Container>

        <Modal show={showModal} onHide={handleCloseModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{t(editingItem ? 'Edit' : 'Add', editingItem ? 'संपादित करें' : 'जोड़ें')} {activeTab.toUpperCase()} {t('Receiving', 'प्राप्ति')}</Modal.Title>
          </Modal.Header>
          <Modal.Body ref={modalBodyRef} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Select Trimester", "त्रैमासिक अवधि चुनें")} <span className="text-danger">*</span></Form.Label>
                    <Form.Select name="quarter" value={normalizeTrimester(formData.quarter) || ''} onChange={handleFormChange} required>
                      <option value="">{t("Select Trimester", "त्रैमासिक अवधि चुनें")}</option>
                      {TRIMESTER_OPTIONS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                    </Form.Select>
                    {formData.quarter && !selectedTrimesterHasData && (
                      <Alert variant="danger" className="mt-2 mb-0 py-2" role="alert">
                        <strong>{t("Data not available:", "डेटा उपलब्ध नहीं है:")}</strong> {t("Supplementary Nutrition data is not found for this trimester. Please select another trimester.", "इस त्रैमासिक अवधि के लिए पूरक पोषण डेटा नहीं मिला। कृपया दूसरी अवधि चुनें।")}
                      </Alert>
                    )}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Trimester Packets Distribution", "त्रैमासिक पैकेट वितरण")} <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      name="food_item"
                      value={formData.food_item_value || ''}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">{t("Select Trimester Packets Distribution", "त्रैमासिक पैकेट वितरण चुनें")}</option>
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
                            &nbsp;&nbsp;↳ {t("Category:", "श्रेणी:")} {itemCategory || 'N/A'}
                          </option>
                        ];
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Packets (Auto-fetched from Supplementary Nutrition)", "पैकेट (पूरक पोषण से स्वतः प्राप्त)")} <span className="text-danger">*</span></Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        name="quantity"
                        min="0"
                        max={remainingAllocation}
                        value={formData.quantity || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value !== '' && Number(value) > remainingAllocation) {
                            setFormData(prev => ({ ...prev, quantity: String(remainingAllocation) }));
                            setFormError(t(`Maximum packets available for receiving: ${remainingAllocation}.`, `प्राप्ति के लिए अधिकतम उपलब्ध पैकेट: ${remainingAllocation}।`));
                          } else {
                            handleFormChange(e);
                          }
                        }}
                        placeholder={t("Auto-filled Quantity", "स्वतः भरी गई मात्रा")}
                        required
                      />
                      <Form.Control
                        type="text"
                        name="unit"
                        value={formData.unit || ''}
                        onChange={handleFormChange}
                        placeholder={t("Unit", "इकाई")}
                        readOnly
                        required
                      />
                    </InputGroup>
                    {formData.field_name && formData.quarter && remainingAllocation > 0 && (
                      <small className="text-primary d-block mt-1">
                        {t(`Remaining allocation for this trimester: ${remainingAllocation} packets.`, `इस त्रैमासिक अवधि के लिए शेष आवंटन: ${remainingAllocation} पैकेट।`)}
                      </small>
                    )}
                    {formData.field_name && formData.food_item && formData.quarter && remainingAllocation <= 0 && !editingItem && (
                      <Alert variant="danger" className="mt-2 mb-0 py-2" role="alert">
                        <strong>{t("Receiving limit reached:", "प्राप्ति सीमा पूरी हो गई:")}</strong>{' '}
                        {t(`Your total allocation for ${normalizeTrimester(formData.quarter)} is ${computePacketsForTrimester(formData.quarter, formData.field_name, formData.fin_year || getCurrentFinancialYear())} packets. All allocated packets have already been received in the ${activeTab.toUpperCase()} Receiving table. You cannot add more receiving for this food item and trimester.`, `${normalizeTrimester(formData.quarter)} के लिए आपका कुल आवंटन ${computePacketsForTrimester(formData.quarter, formData.field_name, formData.fin_year || getCurrentFinancialYear())} पैकेट है। सभी आवंटित पैकेट ${activeTab.toUpperCase()} प्राप्ति तालिका में दर्ज हो चुके हैं। इस खाद्य सामग्री और अवधि के लिए और प्राप्ति नहीं जोड़ सकते।`)}
                      </Alert>
                    )}
                    {formData.field_name && (formData.quantity === '' || formData.quantity === undefined) && (
                      <small className="text-warning d-block mt-1">
                        {t("No packet data found in Supplementary Nutrition for the selected trimester and food category.", "चयनित त्रैमासिक अवधि और खाद्य श्रेणी के लिए पूरक पोषण में पैकेट डेटा नहीं मिला।")}
                      </small>
                    )}
                    {formData.field_name && formData.quantity !== '' && formData.quantity !== undefined && Number(formData.quantity) > 0 && (
                      <small className="text-success d-block mt-1">
                        {t(`✓ Total packets auto-fetched for ${normalizeTrimester(formData.quarter) || 'selected trimester'} from Supplementary Nutrition.`, `✓ ${normalizeTrimester(formData.quarter) || 'चयनित अवधि'} के लिए कुल पैकेट पूरक पोषण से स्वतः प्राप्त हुए।`)}
                      </small>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</Form.Label>
                    <Form.Control
                      type="text"
                      name="bene_category"
                      value={formData.bene_category || ''}
                      onChange={handleFormChange}
                      placeholder={t("Enter Beneficiary Category", "लाभार्थी श्रेणी दर्ज करें")}
                      required
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Date of Receiving", "प्राप्ति की तिथि")} <span className="text-danger">*</span></Form.Label>
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
                    <Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label>
                    <Form.Control
                      type="text"
                      name="fin_year"
                      value={formData.fin_year || ''}
                      onChange={handleFormChange}
                      placeholder={t("e.g., 2025-26", "उदाहरण: 2025-26")}
                      required
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Current Month (Auto-filled)", "वर्तमान महीना (स्वतः भरा गया)")}</Form.Label>
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
                    <Form.Label>{t("Max Expiry Date (Safe to distribute till)", "अधिकतम समाप्ति तिथि (इस तिथि तक वितरण सुरक्षित है)")} <span className="text-muted">({t("Optional", "वैकल्पिक")})</span></Form.Label>
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
                    <h6 className="mt-2 mb-3">{t("Select Months (Only months in the selected trimester)", "महीने चुनें (केवल चयनित त्रैमासिक अवधि के महीने)")} <span className="text-danger">*</span></h6>
                    <div className="month-checkbox-group d-flex flex-wrap gap-2">
                      {availableMonthsForSelectedFoodItem.map((monthValue) => {
                        const month = monthOptions.find(m => m.value === monthValue) || { value: monthValue, label: monthValue };
                        const hasData = true;
                        const isChecked = (formData.months || []).includes(month.value);
                        return (
                          <Form.Check
                            key={month.value}
                            inline
                            type="checkbox"
                            id={`month-${month.value}`}
                            label={month.label}
                            checked={isChecked}
                            onChange={(e) => {
                              handleMonthToggle(month.value, e.target.checked);
                            }}
                          />
                        );
                      })}
                    </div>
                    {!formData.field_name ? (
                      <small className="text-muted">{t("Select a trimester first. Only the three months in that trimester can be selected for receiving.", "पहले त्रैमासिक अवधि चुनें। प्राप्ति के लिए उसी अवधि के केवल तीन महीने चुने जा सकते हैं।")}</small>
                    ) : (
                      <small className="text-muted">
                        {t("Select only the months in which receiving is being recorded. Packet total is fetched independently from Supplementary Nutrition using the selected trimester and food category.", "केवल वे महीने चुनें जिनमें प्राप्ति दर्ज की जा रही है। पैकेट की कुल संख्या चयनित त्रैमासिक अवधि और खाद्य श्रेणी के आधार पर पूरक पोषण से प्राप्त होती है।")}
                      </small>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <h6 className="mb-0">{t("Packet Details (Per Expiry Batch)", "पैकेट विवरण (प्रत्येक समाप्ति बैच के लिए)")} <span className="text-muted">({t("Optional", "वैकल्पिक")})</span></h6>
                        <small className="text-muted">
                          {t("Optional — receiving can be saved without packet-wise expiry details.", "वैकल्पिक — पैकेट-वार समाप्ति विवरण के बिना भी प्राप्ति सहेजी जा सकती है।")}
                        </small>
                      </div>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={handleAddPacketRow}
                        disabled={
                          (parseFloat(formData.quantity) || 0) > 0 &&
                          packetExpiryTotal >= (parseFloat(formData.quantity) || 0)
                        }
                      >
                        <FaPlus className="me-1" /> {t("Add Row", "पंक्ति जोड़ें")}
                      </Button>
                    </div>

                    <Table bordered responsive size="sm" className="mb-2">
                      <thead>
                        <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                          <th style={{ width: '40px' }}>#</th>
                          <th style={{ width: '120px' }}>{t("Packets", "पैकेट")}</th>
                          <th style={{ width: '160px' }}>{t("Expiry Date", "समाप्ति तिथि")}</th>
                          <th>{t("Remarks", "टिप्पणियां")}</th>
                          <th style={{ width: '80px' }}>{t("Action", "कार्रवाई")}</th>
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
                                placeholder={t("Packets", "पैकेट")}
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
                                placeholder={t("Enter remarks for this batch", "इस बैच के लिए टिप्पणियां दर्ज करें")}
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
                          <td className="text-end">{t("Total:", "कुल:")}</td>
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
                      {t("Note: Packet details total must equal the auto-fetched packet count and cannot exceed it.", "ध्यान दें: पैकेट विवरण का कुल स्वतः प्राप्त पैकेट संख्या के बराबर होना चाहिए और उससे अधिक नहीं हो सकता।")}
                    </small>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                  {t("Cancel", "रद्द करें")}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={submitting || (packetExpiryHasInput && !packetExpiryMatchInfo.ok) || (!!formData.quarter && !selectedTrimesterHasData) || (!!formData.field_name && !!formData.food_item && !!formData.quarter && remainingAllocation <= 0 && !editingItem)}
                >
                  {submitting ? <Spinner as="span" animation="border" size="sm" /> : t(editingItem ? 'Update' : 'Submit', editingItem ? 'अपडेट करें' : 'जमा करें')}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {viewItem && (
          <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>{t("View Record:", "रिकॉर्ड देखें:")} {viewItem.food_item}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item><FaBuilding className="view-modal-icon" /> <strong>{t("AWC Name:", "आंगनवाड़ी केंद्र का नाम:")}</strong> {viewItem.awc_name}</ListGroup.Item>
                <ListGroup.Item><FaHashtag className="view-modal-icon" /> <strong>{t("AWC Code:", "आंगनवाड़ी केंद्र कोड:")}</strong> {viewItem.awc_code}</ListGroup.Item>
                <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>{t("Trimester Packets Distribution:", "त्रैमासिक पैकेट वितरण:")}</strong> {viewItem.food_item}</ListGroup.Item>
                <ListGroup.Item><FaWeightHanging className="view-modal-icon" /> <strong>{t("Quantity:", "मात्रा:")}</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>{t("Trimester:", "त्रैमासिक अवधि:")}</strong> {normalizeTrimester(viewItem.quarter) || viewItem.quarter || '-'}</ListGroup.Item>
                {viewItem.date ? (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>{t("Date:", "दिनांक:")}</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                ) : (
                  <>
                    <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>{t("Financial Year:", "वित्तीय वर्ष:")}</strong> {viewItem.fin_year}</ListGroup.Item>
                    <ListGroup.Item><FaCubes className="view-modal-icon" /> <strong>{t("Months:", "महीने:")}</strong> {formatMonths(getMonthsArray(viewItem))}</ListGroup.Item>
                  </>
                )}
                {viewItem.curr_month && (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>{t("Current Month:", "वर्तमान महीना:")}</strong> {viewItem.curr_month}</ListGroup.Item>
                )}
                {viewItem.max_expirydate && (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>{t("Max Expiry Date:", "अधिकतम समाप्ति तिथि:")}</strong> {new Date(viewItem.max_expirydate).toLocaleDateString()}</ListGroup.Item>
                )}
                {Array.isArray(viewItem.packet_expiry) && viewItem.packet_expiry.length > 0 && (
                  <ListGroup.Item>
                    <FaInfoCircle className="view-modal-icon" /> <strong>{t("Packet Details:", "पैकेट विवरण:")}</strong>
                    <Table bordered size="sm" className="mt-2 mb-0">
                      <thead>
                        <tr><th>{t("Packets", "पैकेट")}</th><th>{t("Expiry Date", "समाप्ति तिथि")}</th><th>{t("Remarks", "टिप्पणियां")}</th></tr>
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
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>{t("Sector:", "सेक्टर:")}</strong> {viewItem.sector}</ListGroup.Item>
                <ListGroup.Item><FaProjectDiagram className="view-modal-icon" /> <strong>{t("Project:", "परियोजना:")}</strong> {viewItem.project}</ListGroup.Item>
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>{t("District:", "जिला:")}</strong> {viewItem.district}</ListGroup.Item>
                {viewItem.sector_status && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>{t("Sector Status:", "सेक्टर स्थिति:")}</strong> <Badge bg={getStatusVariant(viewItem.sector_status)}>{viewItem.sector_status}</Badge></ListGroup.Item>
                )}
                {viewItem.sector_remark && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>{t("Sector Remark:", "सेक्टर टिप्पणी:")}</strong> {viewItem.sector_remark}</ListGroup.Item>
                )}
              </ListGroup>
            </Modal.Body>
            <Modal.Footer className="view-modal-footer">
              <Button variant="secondary" onClick={handleCloseViewModal}>{t("Close", "बंद करें")}</Button>
            </Modal.Footer>
          </Modal>
        )}

        {expiryViewItem && (
          <Modal show={showExpiryModal} onHide={handleCloseExpiryModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>
                <FaCalendarCheck className="me-2" />
                {t("Packet Expiry Details:", "पैकेट समाप्ति विवरण:")} {expiryViewItem.food_item}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <FaUtensils className="view-modal-icon" />
                  <strong>{t("Food Item:", "खाद्य सामग्री:")}</strong> {expiryViewItem.food_item}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaWeightHanging className="view-modal-icon" />
                  <strong>{t("Total Packets:", "कुल पैकेट:")}</strong> {expiryViewItem.quantity} {expiryViewItem.unit}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCalendarDay className="view-modal-icon" />
                  <strong>{t("Date of Receiving:", "प्राप्ति की तिथि:")}</strong>{' '}
                  {expiryViewItem.date ? new Date(expiryViewItem.date).toLocaleDateString() : '-'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaCubes className="view-modal-icon" />
                  <strong>{t("Trimester:", "त्रैमासिक अवधि:")}</strong> {normalizeTrimester(expiryViewItem.quarter) || expiryViewItem.quarter || '-'}<br />
                  <strong>{t("Months:", "महीने:")}</strong> {formatMonths(getMonthsArray(expiryViewItem))}
                </ListGroup.Item>
                <ListGroup.Item>
                  <FaInfoCircle className="view-modal-icon" />
                  <strong>{t("Sector Status:", "सेक्टर स्थिति:")}</strong>{' '}
                  <Badge bg={getStatusVariant(expiryViewItem.sector_status)}>
                    {expiryViewItem.sector_status || 'pending'}
                  </Badge>
                </ListGroup.Item>
              </ListGroup>

              <hr />

              <h6 className="mb-2">
                <FaCalendarCheck className="me-1" /> {t("Packet-wise Expiry List", "पैकेट-वार समाप्ति सूची")}
              </h6>
              <Table bordered striped size="sm" className="mb-0">
                <thead>
                  <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                    <th className="text-center" style={{ width: '50px' }}>{t("S. No.", "क्रम सं.")}</th>
                    <th className="text-center">{t("Packets", "पैकेट")}</th>
                    <th className="text-center">{t("Expiry Date", "समाप्ति तिथि")}</th>
                    <th className="text-center">{t("Remarks", "टिप्पणियां")}</th>
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
                        {t("No packet expiry details available.", "पैकेट समाप्ति विवरण उपलब्ध नहीं है।")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {Array.isArray(expiryViewItem.packet_expiry) && expiryViewItem.packet_expiry.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                      <td className="text-end">{t("Total:", "कुल:")}</td>
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
              <Button variant="secondary" onClick={handleCloseExpiryModal}>{t("Close", "बंद करें")}</Button>
            </Modal.Footer>
          </Modal>
        )}

      </div>
    </div>
  );
};

export default FoodItemReceiving;