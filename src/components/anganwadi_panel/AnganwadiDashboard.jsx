import React, { useState, useEffect } from "react";

import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Table,
  Alert,
  Button,
  Modal,
  Form,
  ListGroup,
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";

import "../../assets/css/anganwadileftnav.css";

import { useLocation } from "react-router-dom";

import AnganwadiLeftNav from "./AnganwadiLeftNav";

import AnganwadiHeader from "./AnganwadiHeader";

import "../../assets/css/dashboard.css";

import {
  FaUtensils,
  FaBoxOpen,
  FaChevronDown,
  FaChevronUp,
  FaDolly,
  FaEdit,
  FaTrash,
  FaEye,
  FaBuilding,
  FaHashtag,
  FaUsers,
  FaWeightHanging,
  FaCalendarDay,
  FaMapMarkerAlt,
  FaCubes,
  FaProjectDiagram,
  FaInfoCircle,
  FaClock,
  FaWarehouse,
  FaLayerGroup,
  FaSyncAlt,
  FaFileExcel,
  FaFilePdf,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

import "../../assets/css/AnganwadiDashboard.css";

let hindiPdfFontPromise;

const loadHindiPdfFont = async () => {
  if (!hindiPdfFontPromise) {
    hindiPdfFontPromise = new Promise((resolve) => {
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap";
      fontLink.onload = () => resolve(true);
      fontLink.onerror = () => {
        console.warn("Noto Sans Devanagari could not be loaded; using the system Hindi font.");
        resolve(false);
      };
      document.head.appendChild(fontLink);
    });
  }

  if (await hindiPdfFontPromise) {
    try {
      await document.fonts.load('400 12px "Noto Sans Devanagari"', "हिंदी");
    } catch (error) {
      console.warn("Noto Sans Devanagari could not be prepared; using the system Hindi font.", error);
    }
  }
};

const downloadTablePdf = async ({ title, filename, headers, rows, fontSize = 8 }) => {
  const content = document.createElement("div");
  content.style.cssText =
    "box-sizing:border-box;width:100%;padding:12px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI','Mangal',sans-serif;";

  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.style.cssText =
    "margin:0 0 14px;text-align:center;color:#1e3a5f;font-size:16px;font-weight:700;";
  content.appendChild(heading);

  const table = document.createElement("table");
  table.style.cssText = `width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}px;line-height:1.35;`;
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((value) => {
    const cell = document.createElement("th");
    cell.textContent = String(value ?? "");
    cell.style.cssText =
      "border:1px solid #4338ca;background:#4f46e5;color:#fff;padding:6px 4px;text-align:center;vertical-align:middle;font-weight:700;overflow-wrap:anywhere;";
    headerRow.appendChild(cell);
  });
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  rows.forEach((values, rowIndex) => {
    const row = document.createElement("tr");
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value ?? "");
      cell.style.cssText =
        `border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:middle;overflow-wrap:anywhere;${rowIndex % 2 ? "background:#f5f8fb;" : ""}`;
      row.appendChild(cell);
    });
    row.style.pageBreakInside = "avoid";
    body.appendChild(row);
  });
  table.appendChild(body);
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
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape", compress: true },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr"] },
      })
      .from(content)
      .save();
  } finally {
    content.remove();
  }
};

const API_URLS = {
  categoryandfooditem: "/categoryandfooditem/",

  hcm_distribution: "/hcm-anganwadi-distribution/",

  thr_distribution: "/thr-anganwadi-distribution/",

  hcm_receiving: "/hcm-anganwadi-receiving/",

  thr_receiving: "/thr-anganwadi-receiving/",

  supp_nutrition: "/supplementary-nutrition-anganwadi/",

  hcm_food_items: "/hcm-food-items/",
};

const supplementaryFoodConfig = [
  {
    key: "quarterly_packets_mung_dal_khichdi",
    bene_category: "Children (3-6y)",
    unit: "Packets",
    qty_per_ben: 1,
    days_allotted: 75,
  },

  {
    key: "quarterly_packets_poushik_sattu_mix",
    bene_category: "Pregnant Women & Lactating Mothers",
    unit: "Packets",
    qty_per_ben: 1,
    days_allotted: 75,
  },

  {
    key: "panjeeri_75_days_4625gm_quarterly_packets",
    bene_category: "Children (6m-3y)",
    unit: "Packets",
    qty_per_ben: 1,
    days_allotted: 75,
  },

  {
    key: "quarterly_packets_sattu_2250gm",
    bene_category: "Children (6m-3y)",
    unit: "Packets",
    qty_per_ben: 1,
    days_allotted: 75,
  },

  {
    key: "quarterly_packets_multi_grain_aata_1250gm",
    bene_category: "Children (3-6y)",
    unit: "Packets",
    qty_per_ben: 1,
    days_allotted: 75,
  },
];

const getCurrentFinancialYear = () => {
  const today = new Date();

  const currentMonth = today.getMonth();

  const currentYear = today.getFullYear();

  if (currentMonth >= 3) {
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else {
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

const monthOptions = [
  { value: "April", label: "April" },

  { value: "May", label: "May" },

  { value: "June", label: "June" },

  { value: "July", label: "July" },

  { value: "August", label: "August" },

  { value: "September", label: "September" },

  { value: "October", label: "October" },

  { value: "November", label: "November" },

  { value: "December", label: "December" },

  { value: "January", label: "January" },

  { value: "February", label: "February" },

  { value: "March", label: "March" },
];

const quarterToMonths = {
  "April-May-June": ["April", "May", "June"],

  "July-August-September": ["July", "August", "September"],

  "October-November-December": ["October", "November", "December"],

  "January-February-March": ["January", "February", "March"],
};

const trimesterOptions = [
  {
    value: "Apr-May-Jun",
    label: "Apr-May-Jun",
    months: ["April", "May", "June"],
  },
  {
    value: "Jul-Aug-Sep",
    label: "Jul-Aug-Sep",
    months: ["July", "August", "September"],
  },
  {
    value: "Oct-Nov-Dec",
    label: "Oct-Nov-Dec",
    months: ["October", "November", "December"],
  },
  {
    value: "Jan-Feb-Mar",
    label: "Jan-Feb-Mar",
    months: ["January", "February", "March"],
  },
];
const trimesterToMonths = Object.fromEntries(
  trimesterOptions.map((t) => [t.value, t.months]),
);
const legacyQuarterToTrimester = {
  "April-May-June": "Apr-May-Jun",
  "July-August-September": "Jul-Aug-Sep",
  "October-November-December": "Oct-Nov-Dec",
  "January-February-March": "Jan-Feb-Mar",
};
const normalizeTrimester = (value, months = []) => {
  if (value && trimesterToMonths[value]) return value;
  if (value && legacyQuarterToTrimester[value])
    return legacyQuarterToTrimester[value];
  const normalizedMonths = Array.isArray(months)
    ? months.map((m) => normalizeSuppMonth(m))
    : [];
  return (
    trimesterOptions.find((t) =>
      normalizedMonths.some((m) => t.months.includes(m)),
    )?.value || ""
  );
};

const getRecordMonths = (record) => {
  const rawMonths = Array.isArray(record?.months)
    ? record.months
    : Array.isArray(record?.quarter)
      ? record.quarter
      : Array.isArray(record?.month)
        ? record.month
        : [];
  if (rawMonths.length)
    return rawMonths.map(normalizeSuppMonth).filter(Boolean);
  const quarterValue = record?.quarter || record?.trimester;
  const mapped =
    trimesterToMonths[normalizeTrimester(quarterValue)] ||
    quarterToMonths[quarterValue] ||
    [];
  return mapped.map(normalizeSuppMonth).filter(Boolean);
};

const getRecordTrimester = (record) => {
  const months = getRecordMonths(record);
  return normalizeTrimester(
    record?.trimester ||
      (typeof record?.quarter === "string" ? record.quarter : ""),
    months,
  );
};

const getRecordFoodName = (record) =>
  String(
    record?.food_item ??
      record?.food_item_name ??
      record?.foodItem ??
      record?.name ??
      "",
  )
    .trim()
    .toLowerCase();

const getRecordFinancialYear = (record) =>
  String(
    record?.fin_year ?? record?.financial_year ?? record?.financialYear ?? "",
  ).trim();

const getRecordQuantity = (record) => {
  const value =
    record?.quantity ??
    record?.total_quantity ??
    record?.distributed_quantity ??
    0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const monthLabels = {
  apr: "April",
  may: "May",
  jun: "June",
  jul: "July",
  aug: "August",
  sep: "September",

  oct: "October",
  nov: "November",
  dec: "December",
  jan: "January",
  feb: "February",
  mar: "March",
};

const normalizeSuppMonth = (rawMonth) => {
  if (!rawMonth) return "";

  if (typeof rawMonth === "number" && rawMonth >= 1 && rawMonth <= 12) {
    return monthOptions[rawMonth - 1].value;
  }

  const str = String(rawMonth).trim();

  if (!str) return "";

  const direct = monthOptions.find((m) => m.value === str.toLowerCase());

  if (direct) return direct.value;

  const byLabel = monthOptions.find(
    (m) => m.label.toLowerCase() === str.toLowerCase(),
  );

  if (byLabel) return byLabel.value;

  const partial = monthOptions.find(
    (m) =>
      m.value.toLowerCase().includes(str.toLowerCase()) ||
      m.label.toLowerCase().includes(str.toLowerCase()),
  );

  return partial ? partial.value : str.toLowerCase();
};

const formatMonths = (monthsOrQuarter) => {
  if (Array.isArray(monthsOrQuarter)) {
    return monthsOrQuarter.map((m) => monthLabels[m] || m).join(", ");
  }

  if (typeof monthsOrQuarter === "string") {
    const mapped =
      trimesterToMonths[normalizeTrimester(monthsOrQuarter)] ||
      (quarterToMonths && quarterToMonths[monthsOrQuarter]);

    if (mapped) return mapped.map((m) => monthLabels[m] || m).join(", ");

    return monthLabels[monthsOrQuarter] || monthsOrQuarter;
  }

  return "";
};

const toDateOnly = (input) => {
  if (!input) return "";

  try {
    const d = new Date(input);

    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();

    const mm = String(d.getMonth() + 1).padStart(2, "0");

    const dd = String(d.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return "";
  }
};

const AnganwadiDashboard = () => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const [isTablet, setIsTablet] = useState(false);

  const [counts, setCounts] = useState({ hcm: 0, thr: 0 });

  const [loading, setLoading] = useState({ counts: true, table: false });

  const [error, setError] = useState({ counts: "", table: "" });

  const [activeScheme, setActiveScheme] = useState(null);

  const [foodItems, setFoodItems] = useState([]);

  const [distributionRecords, setDistributionRecords] = useState([]);

  const [receivedMonths, setReceivedMonths] = useState([]);

  const [receivedMonthsStatus, setReceivedMonthsStatus] = useState({});
  const [receivingRecords, setReceivingRecords] = useState([]);

  const [suppNutritionData, setSuppNutritionData] = useState([]);

  const [showDistributionModal, setShowDistributionModal] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);

  const [distributionData, setDistributionData] = useState({
    total_beneficiaries: "",

    fin_year: "",

    months: [],
    trimester: "",

    food_item_id: "",

    date: new Date().toISOString().split("T")[0],

    anganwadi_remark: "",
  });

  const [distributionError, setDistributionError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [showViewModal, setShowViewModal] = useState(false);

  const [viewItem, setViewItem] = useState(null);

  const [selectedFoodItem, setSelectedFoodItem] = useState(null);

  // Supplies Received & Distributed Summary (same reconciliation API used by CDPO panel)
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesViewMode, setSuppliesViewMode] = useState("awc");
  const [suppliesRecords, setSuppliesRecords] = useState([]);
  const [suppliesDetailRecords, setSuppliesDetailRecords] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(false);
  const [suppliesError, setSuppliesError] = useState("");
  const [selectedSupplyMonths, setSelectedSupplyMonths] = useState([]);
  const [selectedSupplyFYs, setSelectedSupplyFYs] = useState([]);
  const [suppliesExportError, setSuppliesExportError] = useState("");
  const [distributionExportError, setDistributionExportError] = useState("");

  const { user, api, uniqueId } = useAuth();

  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      setIsMobile(width < 768);

      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    const searchParams = new URLSearchParams(location.search);

    const openScheme = searchParams.get("open");

    if (openScheme === "hcm" || openScheme === "thr") {
      setTimeout(() => handleCardClick(openScheme), 100);
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [location.search]);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading((prev) => ({ ...prev, counts: true }));

      setError((prev) => ({ ...prev, counts: "" }));

      try {
        const response = await api.get(API_URLS.categoryandfooditem);

        const foodData = response.data?.food_data || [];

        const hcmCount = foodData.filter(
          (item) => item.category === "HCM",
        ).length;

        const thrCount = foodData.filter(
          (item) => item.category === "THR",
        ).length;

        setCounts({ hcm: hcmCount, thr: thrCount });
      } catch (err) {
        setError((prev) => ({
          ...prev,
          counts: t("Failed to fetch food item counts.", "खाद्य सामग्री की संख्या प्राप्त नहीं हो सकी।"),
        }));

        console.error(err);
      } finally {
        setLoading((prev) => ({ ...prev, counts: false }));
      }
    };

    fetchCounts();
  }, [api]);

  // Fetch the same HCM/THR reconciliation response used in FoodSupplementary.jsx.
  useEffect(() => {
    let cancelled = false;
    const fetchSuppliesData = async () => {
      setSuppliesLoading(true);
      setSuppliesError("");
      try {
        // These are the AWC-specific reconciliation endpoints. The API response
        // is returned directly as { success, financial_year, awc_code, data }.
        // Do not use the CDPO endpoint or expect a nested `results` object here.
        const endpoint =
          suppliesTab === "thr"
            ? "/thr-awc-reconciliation/"
            : "/hcm-awc-reconciliation/";
        const response = await api.get(endpoint);
        const reconciliation = response?.data;
        if (!reconciliation?.success || !Array.isArray(reconciliation.data)) {
          throw new Error(
            reconciliation?.message || "Invalid AWC reconciliation response.",
          );
        }
        if (!cancelled) {
          // The AWC API provides detail rows only, so use those rows as the
          // source for both sector-wise aggregation and AWC-wise display.
          setSuppliesRecords(reconciliation.data);
          setSuppliesDetailRecords(reconciliation.data);
          setSelectedSupplyFYs((current) =>
            current.length
              ? current
              : reconciliation.financial_year
                ? [reconciliation.financial_year]
                : [],
          );
        }
      } catch (err) {
        console.error(
          `Failed to fetch ${suppliesTab.toUpperCase()} AWC reconciliation:`,
          err,
        );
        if (!cancelled) {
          setSuppliesRecords([]);
          setSuppliesDetailRecords([]);
          // Keep the user logged in when this table request fails; show the
          // fetch error locally instead of changing authentication state.
          setSuppliesError(
            err?.response?.status === 401 || err?.response?.status === 403
              ? t(
                  `You are not authorized to view ${suppliesTab.toUpperCase()} reconciliation data. Please verify the AWC login/session permissions.`,
                  `आपको ${suppliesTab.toUpperCase()} मिलान डेटा देखने की अनुमति नहीं है। कृपया आंगनवाड़ी केंद्र लॉगिन/सत्र अनुमतियां जांचें।`,
                )
              : t(
                  `Failed to fetch ${suppliesTab.toUpperCase()} supplies data. Please retry.`,
                  `${suppliesTab.toUpperCase()} आपूर्ति डेटा प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।`,
                ),
          );
        }
      } finally {
        if (!cancelled) setSuppliesLoading(false);
      }
    };
    fetchSuppliesData();
    return () => {
      cancelled = true;
    };
  }, [api, suppliesTab]);

  const suppliesMonths = [
    ...new Set(suppliesRecords.map((r) => r.month).filter(Boolean)),
  ].sort(
    (a, b) =>
      monthOptions.findIndex((m) => m.value === a) -
      monthOptions.findIndex((m) => m.value === b),
  );
  const suppliesFinancialYears = [
    ...new Set(suppliesRecords.map((r) => r.financial_year).filter(Boolean)),
  ].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true }),
  );
  const filteredSuppliesRecords = suppliesRecords.filter(
    (r) =>
      (selectedSupplyMonths.length === 0 ||
        selectedSupplyMonths.includes(r.month)) &&
      (selectedSupplyFYs.length === 0 ||
        selectedSupplyFYs.includes(r.financial_year)),
  );
  const filteredSupplyDetails = suppliesDetailRecords.filter(
    (r) =>
      (selectedSupplyMonths.length === 0 ||
        selectedSupplyMonths.includes(r.month)) &&
      (selectedSupplyFYs.length === 0 ||
        selectedSupplyFYs.includes(r.financial_year)),
  );
  const suppliesFoodItems = [
    ...new Set(suppliesRecords.map((r) => r.food_item).filter(Boolean)),
  ];
  const suppliesSectorData = (() => {
    const groups = new Map();
    filteredSuppliesRecords.forEach((r) => {
      const sector = r.sector || "—";
      if (!groups.has(sector)) groups.set(sector, new Map());
      const items = groups.get(sector);
      const q = items.get(r.food_item) || {
        received: 0,
        distributed: 0,
        balance: 0,
      };
      q.received += Number(r.received_quantity) || 0;
      q.distributed += Number(r.distributed_quantity) || 0;
      q.balance += Number(r.balance_quantity) || 0;
      items.set(r.food_item, q);
    });
    return Array.from(groups, ([sector, items]) => ({
      sector,
      foodData: Array.from(items, ([food_item, q]) => ({ food_item, ...q })),
    }));
  })();
  const suppliesAwcData = (() => {
    const groups = new Map();
    filteredSupplyDetails.forEach((r) => {
      const key = `${r.awc_code || ""}|${r.awc_name || ""}|${r.sector || ""}`;
      if (!groups.has(key))
        groups.set(key, {
          awc_code: r.awc_code,
          awc_name: r.awc_name,
          sector: r.sector,
          foodMap: new Map(),
        });
      const group = groups.get(key);
      const q = group.foodMap.get(r.food_item) || {
        received: 0,
        distributed: 0,
        balance: 0,
      };
      q.received += Number(r.received_quantity) || 0;
      q.distributed += Number(r.distributed_quantity) || 0;
      q.balance += Number(r.balance_quantity) || 0;
      group.foodMap.set(r.food_item, q);
    });
    return Array.from(groups.values())
      .map((r) => ({
        ...r,
        foodData: Array.from(r.foodMap, ([food_item, q]) => ({
          food_item,
          ...q,
        })),
      }))
      .sort(
        (a, b) =>
          String(a.sector || "").localeCompare(String(b.sector || "")) ||
          String(a.awc_name || "").localeCompare(String(b.awc_name || "")),
      );
  })();
  const suppliesDisplayData = suppliesAwcData;
  const suppliesTotals = suppliesFoodItems.reduce((acc, item) => {
    acc[item] = { received: 0, distributed: 0, balance: 0 };
    suppliesDisplayData.forEach((row) => {
      const found = row.foodData.find((f) => f.food_item === item);
      if (found) {
        acc[item].received += found.received;
        acc[item].distributed += found.distributed;
        acc[item].balance += found.balance;
      }
    });
    return acc;
  }, {});

  // Display units: THR quantities are packet counts; HCM quantities are grams.
  const formatSupplyQuantity = (value, scheme = suppliesTab) => {
    const quantity = Number(value) || 0;
    const formatted = quantity.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
    if (scheme === "hcm") {
      const kg = (quantity / 1000).toLocaleString(undefined, {
        maximumFractionDigits: 3,
      });
      return `${formatted} g (${kg} kg)`;
    }
    return `${formatted} packets`;
  };

  const distributionQuantityUnit =
    activeScheme === "hcm" ? "g / kg" : "packets";
  const formatDistributionQuantity = (value) => {
    const quantity = Number(value) || 0;
    if (activeScheme === "hcm") {
      return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} g (${(quantity / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg)`;
    }
    return `${quantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} packets`;
  };

  const exportSuppliesToExcel = () => {
    setSuppliesExportError("");
    try {
      const rows = suppliesDisplayData.map((row, index) => {
        const exportRow = {
          "S. No.": index + 1,
          Sector: row.sector || "—",
          "AWC Name": row.awc_name || "—",
          "AWC Code": row.awc_code || "—",
        };
        suppliesFoodItems.forEach((foodItem) => {
          const item = row.foodData.find((food) => food.food_item === foodItem);
          exportRow[`${foodItem} - Received`] = formatSupplyQuantity(item?.received || 0);
          exportRow[`${foodItem} - Distributed`] = formatSupplyQuantity(item?.distributed || 0);
          exportRow[`${foodItem} - Remaining`] = formatSupplyQuantity(item?.balance || 0);
        });
        return exportRow;
      });
      const totalRow = {
        "S. No.": "",
        Sector: "Total",
        "AWC Name": "",
        "AWC Code": "",
      };
      suppliesFoodItems.forEach((foodItem) => {
        const total = suppliesTotals[foodItem] || { received: 0, distributed: 0, balance: 0 };
        totalRow[`${foodItem} - Received`] = formatSupplyQuantity(total.received);
        totalRow[`${foodItem} - Distributed`] = formatSupplyQuantity(total.distributed);
        totalRow[`${foodItem} - Remaining`] = formatSupplyQuantity(total.balance);
      });
      if (rows.length) rows.push(totalRow);

      const sheet = XLSX.utils.json_to_sheet(rows);
      if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Supplies Summary");
      XLSX.writeFile(
        workbook,
        `Supplies_${suppliesTab.toUpperCase()}_AWC_Summary.xlsx`,
        { compression: true },
      );
    } catch (exportError) {
      console.error("Failed to export supplies summary to Excel:", exportError);
      setSuppliesExportError(t("Excel export failed. Please try again.", "Excel निर्यात विफल। कृपया पुनः प्रयास करें।"));
    }
  };

  const exportSuppliesToPDF = async () => {
    setSuppliesExportError("");
    try {
      const headers = [
        "S. No.",
        "Sector",
        "AWC Name",
        "AWC Code",
        ...suppliesFoodItems.flatMap((foodItem) => [
          `${foodItem} - Received`,
          `${foodItem} - Distributed`,
          `${foodItem} - Remaining`,
        ]),
      ];
      const rows = suppliesDisplayData.map((row, index) => [
        index + 1,
        row.sector || "—",
        row.awc_name || "—",
        row.awc_code || "—",
        ...suppliesFoodItems.flatMap((foodItem) => {
          const item = row.foodData.find((food) => food.food_item === foodItem);
          return [
            formatSupplyQuantity(item?.received || 0),
            formatSupplyQuantity(item?.distributed || 0),
            formatSupplyQuantity(item?.balance || 0),
          ];
        }),
      ]);
      if (rows.length) {
        rows.push([
          "",
          "Total",
          "",
          "",
          ...suppliesFoodItems.flatMap((foodItem) => {
            const total = suppliesTotals[foodItem] || { received: 0, distributed: 0, balance: 0 };
            return [
              formatSupplyQuantity(total.received),
              formatSupplyQuantity(total.distributed),
              formatSupplyQuantity(total.balance),
            ];
          }),
        ]);
      }

      await downloadTablePdf({
        title: `Supplies ${suppliesTab.toUpperCase()} Received & Distributed Summary`,
        filename: `Supplies_${suppliesTab.toUpperCase()}_AWC_Summary.pdf`,
        headers,
        rows,
        fontSize: 7,
      });
    } catch (exportError) {
      console.error("Failed to export supplies summary to PDF:", exportError);
      setSuppliesExportError(t("PDF export failed. Please try again.", "PDF निर्यात विफल। कृपया पुनः प्रयास करें।"));
    }
  };

  const getDistributionExportRows = () =>
    distributionRecords.map((record, index) => ({
      "#": index + 1,
      "Food Item": record.food_item || "",
      "Beneficiary Category": record.bene_category || "-",
      Date: record.date ? new Date(record.date).toLocaleDateString() : "-",
      "Trimester / Months": `${record.trimester || normalizeTrimester(record.quarter, record.months)} (${formatMonths(
        record.months ||
          trimesterToMonths[
            normalizeTrimester(record.trimester || record.quarter)
          ] ||
          record.quarter,
      )})`,
      Year: record.fin_year || "",
      "Total Beneficiaries": record.total_beneficiaries ?? "",
      Quantity: formatDistributionQuantity(record.quantity),
      Unit: record.unit || "",
      Remark: record.anganwadi_remark || "-",
    }));

  const exportDistributionsToExcel = () => {
    setDistributionExportError("");
    try {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(getDistributionExportRows());
      if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
      XLSX.utils.book_append_sheet(workbook, sheet, "Distribution Records");
      XLSX.writeFile(
        workbook,
        `${activeScheme}-anganwadi-distributions.xlsx`,
        { compression: true },
      );
    } catch (exportError) {
      console.error("Failed to export distribution records to Excel:", exportError);
      setDistributionExportError(t("Excel export failed. Please try again.", "Excel निर्यात विफल। कृपया पुनः प्रयास करें।"));
    }
  };

  const exportDistributionsToPDF = async () => {
    setDistributionExportError("");
    try {
      const rows = getDistributionExportRows();
      const headers = Object.keys(rows[0] || {
        "#": "",
        "Food Item": "",
        "Beneficiary Category": "",
        Date: "",
        "Trimester / Months": "",
        Year: "",
        "Total Beneficiaries": "",
        Quantity: "",
        Unit: "",
        Remark: "",
      });
      await downloadTablePdf({
        title: `${activeScheme.toUpperCase()} Distribution Records`,
        filename: `${activeScheme}-anganwadi-distributions.pdf`,
        headers,
        rows: rows.map((row) => headers.map((header) => row[header])),
      });
    } catch (exportError) {
      console.error("Failed to export distribution records to PDF:", exportError);
      setDistributionExportError(t("PDF export failed. Please try again.", "PDF निर्यात विफल। कृपया पुनः प्रयास करें।"));
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const computeAutoTotalBeneficiaries = (
    foodItemObj,
    finYear,
    months,
    trimester = "",
  ) => {
    if (!foodItemObj || !suppNutritionData || suppNutritionData.length === 0)
      return "";

    const matchingRecord = suppNutritionData.find((rec) => {
      const recYearStr = String(
        rec._normalizedFinancialYear || rec.financial_year || rec.fin_year || rec.financialYear || "",
      ).trim();
      const selYearStr = String(finYear || "").trim();
      const matchesYear =
        !selYearStr || !recYearStr || recYearStr === selYearStr ||
        recYearStr.includes(selYearStr.substring(0, 4));

      const recMonthsForTrimester = rec._normalizedMonths ||
        (Array.isArray(rec.months) ? rec.months.map(normalizeSuppMonth) : []);
      const recTrimester = rec._normalizedTrimester || normalizeTrimester(
        rec.trimester || (typeof rec.quarter === "string" ? rec.quarter : ""),
        recMonthsForTrimester,
      );
      const matchesTrimester = !trimester || recTrimester === trimester;

      const matchesMonth = !Array.isArray(months) || months.length === 0 ||
        months.some((m) => {
          const normalizedSelectedMonth = normalizeSuppMonth(m);
          const recMonthKey = rec._monthKeys || normalizeSuppMonth(rec.month);
          const recMonthStr = String(rec.month || "").toLowerCase();
          return !recMonthKey && !recMonthStr
            ? matchesTrimester
            : recMonthKey === normalizedSelectedMonth ||
              recMonthsForTrimester.includes(normalizedSelectedMonth) ||
              recMonthStr.includes(String(m || "").toLowerCase());
        });

      return matchesYear && matchesTrimester && matchesMonth;
    });

    if (!matchingRecord) return "";

    const beneCategory = String(foodItemObj?.bene_category || "").toLowerCase();

    if (
      beneCategory.includes("pregnant") ||
      beneCategory.includes("lactating") ||
      beneCategory.includes("garbh") ||
      beneCategory.includes("dhatri") ||
      beneCategory.includes("गर्भवती") ||
      beneCategory.includes("धात्री")
    ) {
      return matchingRecord.pregnant_woman_lactating_mother ??
        matchingRecord.pregnant_women_lactating_mothers ??
        matchingRecord.pregnant_lactating_beneficiaries ??
        matchingRecord.total_beneficiaries ?? 0;
    }

    if (
      beneCategory.includes("3-6") ||
      beneCategory.includes("3y-6y") ||
      beneCategory.includes("3 से 6") ||
      beneCategory.includes("normal") ||
      beneCategory.includes("3 वर्ष से 6") ||
      beneCategory.includes("सामान्य")
    ) {
      return matchingRecord.hcm_beneficiaries_3y_6y ??
        matchingRecord.beneficiaries_3y_6y ??
        matchingRecord.children_3y_6y ??
        matchingRecord.total_beneficiaries ?? 0;
    }

    if (
      beneCategory.includes("6m-3") ||
      beneCategory.includes("6m-3y") ||
      beneCategory.includes("6 माह से 3") ||
      beneCategory.includes("6 महिने से 3")
    ) {
      return matchingRecord.children_6m_3y ??
        matchingRecord.beneficiaries_6m_3y ??
        matchingRecord.children_6_months_to_3_years ??
        matchingRecord.total_beneficiaries ?? 0;
    }

    if (beneCategory.includes("sam") || beneCategory.includes("suw")) {
      return (
        matchingRecord.sam_children_6m_5y_suw_children_6m_6y ||
        matchingRecord.sam_children_3y_5y_suw_children_3y_6y ||
        0
      );
    }

    const fieldName = foodItemObj?.field_name;

    const beneMap = {
      quarterly_packets_mung_dal_khichdi:
        matchingRecord.hcm_beneficiaries_3y_6y,

      mung_dal_khichdi_3y_6y: matchingRecord.hcm_beneficiaries_3y_6y,

      quarterly_packets_poushik_sattu_mix:
        matchingRecord.pregnant_woman_lactating_mother,

      poushik_sattu_preg_lat: matchingRecord.pregnant_woman_lactating_mother,

      panjeeri_75_days_2625gm_quarterly_packets: matchingRecord.children_6m_3y,

      panjeeri_75_days_4625gm_quarterly_packets: matchingRecord.children_6m_3y,

      panjeeri_6m_3y: matchingRecord.children_6m_3y,

      quarterly_packets_sattu_2250gm: matchingRecord.children_6m_3y,

      sattu_sam_3y_5y_suw_3y_6y:
        matchingRecord.sam_children_3y_5y_suw_children_3y_6y,

      quarterly_packets_multi_grain_aata_1250gm:
        matchingRecord.hcm_beneficiaries_3y_6y,

      multi_grain_aata_3y_6y: matchingRecord.hcm_beneficiaries_3y_6y,
    };

    if (fieldName && beneMap[fieldName] !== undefined) {
      return beneMap[fieldName];
    }

    if (matchingRecord.total_beneficiaries) {
      return matchingRecord.total_beneficiaries;
    }

    return "";
  };

  const handleCardClick = async (scheme) => {
    if (activeScheme === scheme) {
      setActiveScheme(null);

      setFoodItems([]);

      setReceivedMonths([]);

      setReceivedMonthsStatus({});

      setSuppNutritionData([]);

      return;
    }

    setActiveScheme(scheme);

    setLoading((prev) => ({ ...prev, table: true }));

    setError((prev) => ({ ...prev, table: "" }));

    setFoodItems([]);

    setDistributionRecords([]);

    setReceivedMonths([]);

    setReceivedMonthsStatus({});

    setSuppNutritionData([]);

    try {
      const distributionUrl =
        scheme === "hcm"
          ? API_URLS.hcm_distribution
          : API_URLS.thr_distribution;

      const receivingUrl =
        scheme === "hcm" ? API_URLS.hcm_receiving : API_URLS.thr_receiving;

      const fetchPromises = [
        api.get(API_URLS.categoryandfooditem),

        api.get(distributionUrl),

        api.get(receivingUrl),

        api.get(API_URLS.supp_nutrition),
      ];

      if (scheme === "hcm") {
        fetchPromises.push(api.get(API_URLS.hcm_food_items));
      }

      const responses = await Promise.all(fetchPromises);

      const [
        catResponse,
        distributionsResponse,
        receivingResponse,
        suppResponse,
        hcmFoodResponse,
      ] = responses;

      // Map food items - use categoryandfooditem API for both HCM and THR (like FoodItemReceiving.jsx)

      const allFoodData = catResponse.data?.food_data || [];

      const schemeFoodData = allFoodData.filter(
        (f) => f.category === scheme.toUpperCase(),
      );

      // For HCM, also get additional fields from hcm_food_items API

      let hcmExtraData = {};

      if (scheme === "hcm" && hcmFoodResponse && hcmFoodResponse.data) {
        const hcmData = Array.isArray(hcmFoodResponse.data)
          ? hcmFoodResponse.data
          : [];

        hcmExtraData = hcmData.reduce((acc, item) => {
          acc[item.food_item] = {
            qty_per_ben: parseFloat(item.qty_per_ben) || 0,

            daily_consumption_qty: parseFloat(item.daily_consumption_qty) || 0,

            days_allotted: item.days_allotted || 0,

            total_quantity: parseFloat(item.total_quantity) || 0,

            financial_year: item.financial_year,

            quarter: item.quarter,
          };

          return acc;
        }, {});
      }

      const mappedFoodItems = schemeFoodData.map((data, index) => {
        const config = supplementaryFoodConfig.find(
          (c) => c.key === data.field_name,
        );

        const extra = hcmExtraData[data.food_item] || {};

        return {
          id: index + 1,

          food_item: data.food_item,

          field_name: data.field_name,

          bene_category:
            data.beneficiary_category || config?.bene_category || "N/A",

          unit: scheme === "hcm" ? "ग्राम" : config?.unit || "Packets",

          qty_per_ben:
            extra.qty_per_ben !== undefined
              ? extra.qty_per_ben
              : config?.qty_per_ben || 1,

          daily_consumption_qty: extra.daily_consumption_qty || 0,

          days_allotted:
            extra.days_allotted !== undefined
              ? extra.days_allotted
              : config?.days_allotted || 75,

          total_quantity: extra.total_quantity || 0,

          financial_year: extra.financial_year || "",

          quarter: extra.quarter || "",
        };
      });

      setFoodItems(mappedFoodItems);

      const allowedMonths = new Set();
      const monthsStatus = {};
      const fetchedReceivingRecords = Array.isArray(receivingResponse.data)
        ? receivingResponse.data
        : receivingResponse.data?.results || [];
      setReceivingRecords(fetchedReceivingRecords);
      fetchedReceivingRecords.forEach((rec) => {
        const m = Array.isArray(rec.months)
          ? rec.months
          : Array.isArray(rec.quarter)
            ? rec.quarter
            : quarterToMonths[rec.quarter] || [];

        m.forEach((month) => {
          allowedMonths.add(month);

          monthsStatus[month] =
            monthsStatus[month] || rec.sector_status === "approved";
        });
      });

      setReceivedMonths(Array.from(allowedMonths));

      setReceivedMonthsStatus(monthsStatus);

      const suppData = suppResponse.data || {};

      // Normalize supported Supplementary Nutrition response shapes.
      const normalizedSupp = Array.isArray(suppData)
        ? suppData
        : Array.isArray(suppData.data)
          ? suppData.data
          : Array.isArray(suppData.results)
            ? suppData.results
            : Array.isArray(suppData.records)
              ? suppData.records
              : Array.isArray(suppData.supplementary_nutrition)
                ? suppData.supplementary_nutrition
                : Array.isArray(suppData.food_data)
                  ? suppData.food_data
                  : [];

      const normalizedSuppWithMonths = normalizedSupp.map((rec) => {
        const rawMonths = Array.isArray(rec.months)
          ? rec.months
          : Array.isArray(rec.quarter)
            ? rec.quarter
            : typeof rec.months === "string"
              ? rec.months.split(",").map((m) => m.trim())
              : [];
        const normalizedMonths = rawMonths.map(normalizeSuppMonth).filter(Boolean);
        return {
          ...rec,
          _monthKeys: normalizeSuppMonth(rec.month),
          _normalizedMonths: normalizedMonths,
          _normalizedTrimester: normalizeTrimester(
            rec.trimester || (typeof rec.quarter === "string" ? rec.quarter : ""),
            normalizedMonths,
          ),
          _normalizedFinancialYear: String(
            rec.financial_year || rec.fin_year || rec.financialYear || "",
          ).trim(),
        };
      });

      setSuppNutritionData(normalizedSuppWithMonths);

      const fetchedDistributionRecords = Array.isArray(
        distributionsResponse.data,
      )
        ? distributionsResponse.data
        : distributionsResponse.data?.results ||
          distributionsResponse.data?.data ||
          [];
      setDistributionRecords(fetchedDistributionRecords);
    } catch (err) {
      setError((prev) => ({
        ...prev,
        table: `Failed to fetch ${scheme.toUpperCase()} items.`,
      }));

      console.error(err);
    } finally {
      setLoading((prev) => ({ ...prev, table: false }));
    }
  };

  const handleOpenDistributionModal = (
    item,
    scheme,
    existingRecord = null,
    isNew = false,
  ) => {
    let modalItem;

    if (isNew) {
      modalItem = { scheme, isNew: true };
    } else if (existingRecord) {
      const fullFoodItem = foodItems.find(
        (fi) => fi.food_item === existingRecord.food_item,
      );

      modalItem = {
        ...fullFoodItem,
        ...existingRecord,
        scheme,
        isEdit: true,
        recordId: existingRecord.id,
      };
    } else {
      modalItem = { ...item, scheme };
    }

    setSelectedItem(modalItem);

    setSelectedFoodItem(modalItem);

    if (existingRecord) {
      const foodItemDetails = foodItems.find(
        (fi) => fi.food_item === existingRecord.food_item,
      );

      const existingMonths = Array.isArray(existingRecord.months)
        ? existingRecord.months
        : Array.isArray(existingRecord.quarter)
          ? existingRecord.quarter
          : quarterToMonths[existingRecord.quarter] ||
            trimesterToMonths[
              normalizeTrimester(
                existingRecord.trimester || existingRecord.quarter,
              )
            ] ||
            [];

      // Existing distribution records store the selected trimester in `quarter`,
      // matching the HCM/THR Receiving API contract.
      const existingTrimester = normalizeTrimester(
        existingRecord.trimester || existingRecord.quarter,
        existingMonths,
      );

      setDistributionData({
        total_beneficiaries: existingRecord.total_beneficiaries,

        fin_year: existingRecord.fin_year,

        months: existingMonths,
        trimester: existingTrimester,

        food_item_id: foodItemDetails?.id,

        date: existingRecord.date
          ? new Date(existingRecord.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],

        anganwadi_remark: existingRecord.anganwadi_remark || "",
      });

      setSelectedFoodItem(foodItemDetails);
    } else {
      setDistributionData({
        total_beneficiaries: "",

        fin_year: getCurrentFinancialYear(),

        months: [],

        trimester: "",

        food_item_id: "",

        date: new Date().toISOString().split("T")[0],

        anganwadi_remark: "",
      });
    }

    setDistributionError("");

    setShowDistributionModal(true);
  };

  const handleCloseDistributionModal = () => {
    setShowDistributionModal(false);

    setSelectedItem(null);

    setSelectedFoodItem(null);
  };

  const handleOpenViewModal = (record) => {
    setViewItem(record);

    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);

    setViewItem(null);
  };

  const handleDistributionSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    setDistributionError("");

    if (!distributionData.food_item_id) {
      setDistributionError(t("Please select a food item.", "कृपया खाद्य सामग्री चुनें।"));

      setSubmitting(false);

      return;
    }

    const selectedFoodItemDetails =
      selectedItem.isNew || selectedItem.isEdit
        ? foodItems.find(
            (fi) => fi.id === parseInt(distributionData.food_item_id, 10),
          )
        : selectedItem;

    if (
      !distributionData.total_beneficiaries ||
      !distributionData.fin_year ||
      !distributionData.trimester ||
      !distributionData.months?.length
    ) {
      setDistributionError(t("Please fill in all required fields.", "कृपया सभी आवश्यक फ़ील्ड भरें।"));

      setSubmitting(false);

      return;
    }

    const allowedTrimesterMonths =
      trimesterToMonths[distributionData.trimester] || [];
    if (
      distributionData.months.some((m) => !allowedTrimesterMonths.includes(m))
    ) {
      setDistributionError(
        t("Please select only months included in the selected trimester.", "कृपया केवल चयनित त्रैमासिक अवधि के महीने चुनें।"),
      );
      setSubmitting(false);
      return;
    }

    const unreceivedMonths = distributionData.months.filter(
      (m) => !receivedMonths.includes(m),
    );

    if (unreceivedMonths.length > 0) {
      setDistributionError(
        t(`Receiving is not registered for ${formatMonths(unreceivedMonths)}. Please record receiving first.`, `${formatMonths(unreceivedMonths)} के लिए प्राप्ति दर्ज नहीं है। कृपया पहले प्राप्ति दर्ज करें।`),
      );

      setSubmitting(false);

      return;
    }

    const unapprovedMonths = distributionData.months.filter(
      (m) => !receivedMonthsStatus[m],
    );

    if (unapprovedMonths.length > 0) {
      setDistributionError(
        t(`Receiving for ${formatMonths(unapprovedMonths)} is not approved. Please ask the supervisor to approve it first.`, `${formatMonths(unapprovedMonths)} के लिए प्राप्ति स्वीकृत नहीं है। कृपया पहले सुपरवाइज़र से इसे अनुमोदित करवाएं।`),
      );

      setSubmitting(false);

      return;
    }

    if (activeScheme === "hcm") {
      const selectedDateOnly = toDateOnly(
        distributionData.date || new Date().toISOString().split("T")[0],
      );

      const duplicateDate = distributionRecords.find((rec) => {
        if (selectedItem.isEdit && rec.id === selectedItem.recordId)
          return false;

        if (!rec.date) return false;

        const recDateOnly = toDateOnly(rec.date);

        return recDateOnly && recDateOnly === selectedDateOnly;
      });

      if (duplicateDate) {
        setDistributionError(
          t(`A distribution has already been recorded for ${selectedDateOnly}. Only one HCM distribution record can be created per date.`, `${selectedDateOnly} के लिए वितरण पहले ही दर्ज किया जा चुका है। प्रत्येक दिनांक पर केवल एक HCM वितरण रिकॉर्ड बनाया जा सकता है।`),
        );

        setSubmitting(false);

        return;
      }
    } else {
      const duplicate = distributionRecords.find((rec) => {
        if (selectedItem.isEdit && rec.id === selectedItem.recordId) {
          return false;
        }

        let recMonths = [];

        if (Array.isArray(rec.months)) {
          recMonths = rec.months;
        } else if (Array.isArray(rec.quarter)) {
          recMonths = rec.quarter;
        } else if (typeof rec.quarter === "string") {
          recMonths =
            quarterToMonths[rec.quarter] ||
            rec.quarter.split(",").map((m) => m.trim());
        }

        const recFoodItem = (rec.food_item || "").trim().toLowerCase();

        const selFoodItem = (selectedFoodItemDetails.food_item || "")
          .trim()
          .toLowerCase();

        const recFinYear = (rec.fin_year || "").trim();

        const selFinYear = (distributionData.fin_year || "").trim();

        const recBeneCat = (rec.bene_category || "").trim().toLowerCase();

        const selBeneCat = (selectedFoodItemDetails.bene_category || "")
          .trim()
          .toLowerCase();

        if (
          recFoodItem !== selFoodItem ||
          recFinYear !== selFinYear ||
          recBeneCat !== selBeneCat
        ) {
          return false;
        }

        const normalizeMonth = (m) => (m || "").trim().toLowerCase();

        const normRecMonths = recMonths.map(normalizeMonth);

        const normSelMonths = (distributionData.months || []).map(
          normalizeMonth,
        );

        return normSelMonths.some((m) => normRecMonths.includes(m));
      });

      if (duplicate) {
        setDistributionError(
          t("Stock for this month has already been allocated. Please do not record another distribution for this month.", "इस महीने का स्टॉक पहले ही आवंटित किया जा चुका है। कृपया इस महीने के लिए दोबारा वितरण दर्ज न करें।"),
        );

        setSubmitting(false);

        return;
      }
    }

    const isEdit = selectedItem.isEdit;

    // Calculate the planned quantity. If it exceeds remaining stock, keep the beneficiary
    // count unchanged and automatically reduce the per-person quantity to use the remainder.
    const beneficiaryCount =
      parseInt(distributionData.total_beneficiaries, 10) || 0;
    const originalPerPersonQty =
      activeScheme === "hcm"
        ? parseFloat(selectedFoodItemDetails.daily_consumption_qty) || 0
        : parseFloat(selectedFoodItemDetails.qty_per_ben) || 0;
    let adjustedPerPersonQty = originalPerPersonQty;
    let calculatedQuantity =
      Math.round(beneficiaryCount * originalPerPersonQty * 100) / 100;

    // Distribution cannot exceed approved receiving for the same food item + trimester + financial year.
    const selectedTrimesterForLimit = distributionData.trimester;
    const selectedFoodName = String(selectedFoodItemDetails.food_item || "")
      .trim()
      .toLowerCase();
    const selectedFY = String(distributionData.fin_year || "").trim();

    // Refresh stock and distribution history immediately before saving. The state may be stale
    // if a previous distribution was saved in another session/tab after this modal opened.
    let latestReceivingRecords = Array.isArray(receivingRecords)
      ? receivingRecords
      : [];
    let latestDistributionRecords = Array.isArray(distributionRecords)
      ? distributionRecords
      : [];
    try {
      const receivingUrlForSubmit =
        activeScheme === "hcm"
          ? API_URLS.hcm_receiving
          : API_URLS.thr_receiving;
      const distributionUrlForSubmit =
        activeScheme === "hcm"
          ? API_URLS.hcm_distribution
          : API_URLS.thr_distribution;
      const [latestReceivingResponse, latestDistributionResponse] =
        await Promise.all([
          api.get(receivingUrlForSubmit),
          api.get(distributionUrlForSubmit),
        ]);
      const freshReceiving = Array.isArray(latestReceivingResponse.data)
        ? latestReceivingResponse.data
        : latestReceivingResponse.data?.results ||
          latestReceivingResponse.data?.data ||
          [];
      const freshDistributions = Array.isArray(latestDistributionResponse.data)
        ? latestDistributionResponse.data
        : latestDistributionResponse.data?.results ||
          latestDistributionResponse.data?.data ||
          [];
      latestReceivingRecords = freshReceiving;
      latestDistributionRecords = freshDistributions;
      setReceivingRecords(freshReceiving);
      setDistributionRecords(freshDistributions);
    } catch (refreshError) {
      console.error(
        "Unable to refresh stock before distribution:",
        refreshError,
      );
      setDistributionError(
        t("Unable to verify stock before distribution. Please try again.", "वितरण से पहले स्टॉक की पुष्टि नहीं हो सकी। कृपया पुनः प्रयास करें।"),
      );
      setSubmitting(false);
      return;
    }

    const matchingReceiving = latestReceivingRecords.filter((rec) => {
      const recFood = getRecordFoodName(rec);
      const recFY = getRecordFinancialYear(rec);
      const recTrimester = getRecordTrimester(rec);
      const status = String(rec.sector_status ?? rec.status ?? "approved")
        .trim()
        .toLowerCase();
      const isApproved =
        !status || ["approved", "approve", "accepted"].includes(status);
      return (
        recFood === selectedFoodName &&
        recFY === selectedFY &&
        recTrimester === selectedTrimesterForLimit &&
        isApproved
      );
    });
    // Receiving quantity is packets for HCM; convert to grams. THR quantities stay in their received unit.
    const receivedLimit = matchingReceiving.reduce((sum, rec) => {
      const receivedQty = getRecordQuantity(rec);
      return (
        sum +
        (activeScheme === "hcm"
          ? receivedQty * (Number(selectedFoodItemDetails.qty_per_ben) || 0)
          : receivedQty)
      );
    }, 0);
    const alreadyDistributed = latestDistributionRecords.reduce((sum, rec) => {
      if (
        selectedItem.isEdit &&
        String(rec.id) === String(selectedItem.recordId)
      )
        return sum;
      const recFood = getRecordFoodName(rec);
      const recFY = getRecordFinancialYear(rec);
      const recTrimester = getRecordTrimester(rec);
      if (
        recFood !== selectedFoodName ||
        recFY !== selectedFY ||
        recTrimester !== selectedTrimesterForLimit
      )
        return sum;
      return sum + getRecordQuantity(rec);
    }, 0);
    const remainingDistributionLimit = Math.max(
      0,
      Math.round((receivedLimit - alreadyDistributed) * 100) / 100,
    );
    if (remainingDistributionLimit <= 0) {
      setDistributionError(
        t("Distribution is unavailable because the received allocation has been exhausted. No quantity remains for this trimester.", "आप वितरण नहीं कर सकते, प्राप्त आवंटन समाप्त हो चुका है। इस त्रैमासिक अवधि के लिए कोई मात्रा शेष नहीं है।"),
      );
      setSubmitting(false);
      return;
    }
    if (calculatedQuantity > remainingDistributionLimit) {
      if (beneficiaryCount <= 0) {
        setDistributionError(t("Please enter the number of beneficiaries.", "कृपया लाभार्थियों की संख्या दर्ज करें।"));
        setSubmitting(false);
        return;
      }
      // Auto-adjust per-person quantity to 2 decimal places without exceeding stock.
      // Beneficiary count remains exactly as entered/auto-fetched.
      adjustedPerPersonQty =
        Math.floor((remainingDistributionLimit / beneficiaryCount) * 100) / 100;
      calculatedQuantity =
        Math.round(beneficiaryCount * adjustedPerPersonQty * 100) / 100;

      // Keep the saved total within the available balance, even with floating-point rounding.
      if (calculatedQuantity > remainingDistributionLimit) {
        adjustedPerPersonQty = Math.max(0, adjustedPerPersonQty - 0.01);
        calculatedQuantity =
          Math.round(beneficiaryCount * adjustedPerPersonQty * 100) / 100;
      }
    }

    if (
      calculatedQuantity <= 0 ||
      calculatedQuantity > remainingDistributionLimit
    ) {
      setDistributionError(
        calculatedQuantity <= 0
          ? t("The remaining quantity is insufficient for distribution among the beneficiaries. Distribution cannot proceed.", "शेष मात्रा लाभार्थियों में वितरित करने के लिए पर्याप्त नहीं है। वितरण नहीं किया जा सकता।")
          : t("The distribution quantity exceeds the remaining stock. Please check the quantity.", "वितरण मात्रा शेष स्टॉक से अधिक है। कृपया मात्रा जाँचें।"),
      );
      setSubmitting(false);
      return;
    }

    const selectedMonths = Array.isArray(distributionData.months)
      ? distributionData.months
      : [];

    // Use the exact same trimester value format as HCM/THR Receiving:
    // quarter: "Apr-May-Jun" | "Jul-Aug-Sep" | "Oct-Nov-Dec" | "Jan-Feb-Mar".
    // The backend receiving APIs persist this value in the `quarter` field.
    const selectedTrimester =
      normalizeTrimester(distributionData.trimester, selectedMonths) ||
      distributionData.trimester ||
      "";
    const quarterString = selectedTrimester;

    if (!quarterString || !trimesterToMonths[quarterString]) {
      setDistributionError(t("Please select a valid trimester for distribution.", "कृपया वितरण के लिए सही त्रैमासिक अवधि चुनें।"));
      setSubmitting(false);
      return;
    }

    let payload = {
      food_item: selectedFoodItemDetails.food_item,

      total_beneficiaries: parseInt(distributionData.total_beneficiaries, 10),

      quantity: isNaN(calculatedQuantity) ? 0 : calculatedQuantity,

      unit: activeScheme === "hcm" ? "ग्राम" : selectedFoodItemDetails.unit,

      bene_category: selectedFoodItemDetails.bene_category,

      days_allotted: selectedFoodItemDetails.days_allotted,

      fin_year: distributionData.fin_year,

      months: selectedMonths,

      // `quarter` is the backend field, same as Receiving; `trimester` is
      // also sent for APIs/serializers that expose the explicit trimester field.
      quarter: quarterString,

      trimester: quarterString,

      date: distributionData.date || new Date().toISOString().split("T")[0],

      anganwadi_remark: distributionData.anganwadi_remark || "",
    };

    if (isEdit) {
      payload.id = selectedItem.recordId;
    }

    const url =
      activeScheme === "hcm"
        ? API_URLS.hcm_distribution
        : API_URLS.thr_distribution;

    const method = isEdit ? "put" : "post";

    try {
      await api[method](url, payload);

      alert(t(`Distribution ${isEdit ? "updated" : "recorded"} successfully!`, `वितरण ${isEdit ? "अपडेट" : "दर्ज"} सफलतापूर्वक हुआ!`));

      handleCloseDistributionModal();

      handleCardClick(activeScheme);
    } catch (err) {
      console.error("API Error:", err.response?.data || err);

      let errorMessage = t(`Failed to ${isEdit ? "update" : "record"} distribution. Please try again.`, `वितरण ${isEdit ? "अपडेट" : "दर्ज"} नहीं हो सका। कृपया पुनः प्रयास करें।`);

      if (err.response && err.response.data) {
        const errorData = err.response.data;

        if (typeof errorData === "object" && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData).map(
            ([key, value]) => {
              const valStr = Array.isArray(value)
                ? value.join(", ")
                : String(value);

              return `${key}: ${valStr}`;
            },
          );

          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join(" | ");
          }
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      }

      setDistributionError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (
      window.confirm(
        t(`Are you sure you want to delete the distribution record for ${record.food_item}?`, `क्या आप वाकई ${record.food_item} का वितरण रिकॉर्ड हटाना चाहते हैं?`),
      )
    ) {
      const url =
        activeScheme === "hcm"
          ? API_URLS.hcm_distribution
          : API_URLS.thr_distribution;

      try {
        await api.delete(url, { data: { id: record.id } });

        alert(t("Distribution record deleted successfully!", "वितरण रिकॉर्ड सफलतापूर्वक हटाया गया!"));

        handleCardClick(activeScheme);
      } catch (err) {
        alert(t("Failed to delete distribution record.", "वितरण रिकॉर्ड हटाया नहीं जा सका।"));

        console.error(err);
      }
    }
  };

  const selectedFoodItemForCalc =
    selectedItem?.isNew || selectedItem?.isEdit || selectedItem
      ? foodItems.find(
          (fi) => fi.id === parseInt(distributionData.food_item_id, 10),
        )
      : selectedItem;

  // Calculate total quantity display

  // HCM: Total = daily_consumption_qty × total_beneficiaries (NO days_allotted)

  // THR: Total = qty_per_ben × total_beneficiaries

  const beneficiaries = parseInt(distributionData.total_beneficiaries, 10) || 0;

  let calculatedQuantityDisplay = "0.00";
  let calculatedQuantityGrams = 0;
  let calculatedQuantityKg = "0.00";
  let perPersonQtyGrams = 0;
  let effectivePerPersonQty = 0;
  let remainingStockForDisplay = null;
  let receivedStockForDisplay = null;
  let distributedStockForDisplay = null;
  let plannedQuantityForDisplay = 0;
  let stockFinishedForDisplay = false;

  if (
    selectedFoodItemForCalc &&
    distributionData.trimester &&
    distributionData.fin_year
  ) {
    const selectedFoodNameForDisplay = String(
      selectedFoodItemForCalc.food_item || "",
    )
      .trim()
      .toLowerCase();
    const selectedFYForDisplay = String(distributionData.fin_year || "").trim();
    const selectedTrimesterForDisplay = distributionData.trimester;
    const receivingForDisplay = receivingRecords.filter((rec) => {
      const status = String(rec.sector_status ?? rec.status ?? "approved")
        .trim()
        .toLowerCase();
      const isApproved =
        !status || ["approved", "approve", "accepted"].includes(status);
      return (
        getRecordFoodName(rec) === selectedFoodNameForDisplay &&
        getRecordFinancialYear(rec) === selectedFYForDisplay &&
        getRecordTrimester(rec) === selectedTrimesterForDisplay &&
        isApproved
      );
    });
    const receivedForDisplay = receivingForDisplay.reduce((sum, rec) => {
      const qty = getRecordQuantity(rec);
      return (
        sum +
        (activeScheme === "hcm"
          ? qty * (Number(selectedFoodItemForCalc.qty_per_ben) || 0)
          : qty)
      );
    }, 0);
    const distributedForDisplay = (
      Array.isArray(distributionRecords) ? distributionRecords : []
    ).reduce((sum, rec) => {
      if (
        selectedItem?.isEdit &&
        String(rec.id) === String(selectedItem.recordId)
      )
        return sum;
      if (
        getRecordFoodName(rec) !== selectedFoodNameForDisplay ||
        getRecordFinancialYear(rec) !== selectedFYForDisplay ||
        getRecordTrimester(rec) !== selectedTrimesterForDisplay
      )
        return sum;
      return sum + getRecordQuantity(rec);
    }, 0);
    receivedStockForDisplay = receivedForDisplay;
    distributedStockForDisplay = distributedForDisplay;
    remainingStockForDisplay = Math.max(
      0,
      receivedForDisplay - distributedForDisplay,
    );
    stockFinishedForDisplay = remainingStockForDisplay <= 0;
  }

  if (selectedFoodItemForCalc) {
    const basePerPersonQty =
      activeScheme === "hcm"
        ? parseFloat(selectedFoodItemForCalc.daily_consumption_qty) || 0
        : parseFloat(selectedFoodItemForCalc.qty_per_ben) || 0;
    plannedQuantityForDisplay = beneficiaries * basePerPersonQty;
    const shouldAutoAdjust =
      remainingStockForDisplay !== null &&
      beneficiaries > 0 &&
      plannedQuantityForDisplay > remainingStockForDisplay;
    effectivePerPersonQty = shouldAutoAdjust
      ? Math.floor((remainingStockForDisplay / beneficiaries) * 100) / 100
      : Math.round(basePerPersonQty * 100) / 100;

    if (activeScheme === "hcm") {
      perPersonQtyGrams = effectivePerPersonQty;
      calculatedQuantityGrams =
        Math.round(beneficiaries * perPersonQtyGrams * 100) / 100;
      calculatedQuantityKg = (calculatedQuantityGrams / 1000).toFixed(2);
      calculatedQuantityDisplay = `${calculatedQuantityGrams.toFixed(2)} ग्राम (${calculatedQuantityKg} kg)`;
    } else {
      const total =
        Math.round(beneficiaries * effectivePerPersonQty * 100) / 100;
      calculatedQuantityDisplay = total.toFixed(2);
    }
  }

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
            <h3 className="mb-4 fw-bold">{t("Anganwadi Dashboard", "आंगनवाड़ी डैशबोर्ड")}</h3>
          </div>

          <Row>
            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card
                className={`card-hcm ${activeScheme === "hcm" ? "active" : ""}`}
                onClick={() => handleCardClick("hcm")}
              >
               
                  <FaUtensils className="card-icon" />

                  <Card.Title>{t("HCM Food Items", "HCM खाद्य सामग्री")}</Card.Title>

                  {loading.counts ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <h2 className="fw-bold">{counts.hcm}</h2>
                  )}

                  <Card.Text className="">
                    {t("Total Items", "कुल आइटम")}
                    {activeScheme === "hcm" ? (
                      <FaChevronUp className="ms-2" />
                    ) : (
                      <FaChevronDown className="ms-2" />
                    )}
                  </Card.Text>
             
              </Card>
            </Col>

            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card
                className={`card-thr ${activeScheme === "thr" ? "active" : ""}`}
                onClick={() => handleCardClick("thr")}
              >
              
                  <FaBoxOpen className="card-icon" />

                  <Card.Title>{t("THR Food Items", "THR खाद्य सामग्री")}</Card.Title>

                  {loading.counts ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <h2 className="fw-bold">{counts.thr}</h2>
                  )}

                  <Card.Text className="">
                    {t("Total Items", "कुल आइटम")}
                    {activeScheme === "thr" ? (
                      <FaChevronUp className="ms-2" />
                    ) : (
                      <FaChevronDown className="ms-2" />
                    )}
                  </Card.Text>
            
              </Card>
            </Col>
          </Row>

          {error.counts && !loading.counts && (
            <div className="alert alert-danger" role="alert">
              {error.counts}
            </div>
          )}

          {/* Supplies summary: shared HCM/THR reconciliation API, like CDPO FoodSupplementary */}
          <div className="mt-3 mb-4">
            <Card
              className="shadow-sm"
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Card.Header
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <h5
                    className="mb-0 fw-bold"
                    style={{ color: "#12304a", letterSpacing: ".1px" }}
                  >
                    <FaWarehouse
                      className="me-2"
                      style={{ color: "#0f766e" }}
                    />
                    {t("Supplies Received & Distributed Summary", "प्राप्त और वितरित आपूर्ति का सारांश")}{" "}
                    <span
                      className="badge rounded-pill ms-2"
                      style={{
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        fontSize: ".7rem",
                      }}
                    >
                      {t("AWC-wise", "आंगनवाड़ी केंद्र-वार")}
                    </span>
                  </h5>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <Form.Group className="mb-0">
                      <Form.Label className="small mb-1">{t("Trimester", "त्रैमासिक अवधि")}</Form.Label>
                      <Form.Select
                        size="sm"
                        value={selectedSupplyMonths[0] || ""}
                        onChange={(e) =>
                          setSelectedSupplyMonths(
                            e.target.value ? [e.target.value] : [],
                          )
                        }
                      >
                        <option value="">{t("All Trimesters", "सभी त्रैमासिक अवधियां")}</option>
                        {suppliesMonths.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-0">
                      <Form.Label className="small mb-1">
                        {t("Financial Year", "वित्तीय वर्ष")}
                      </Form.Label>
                      <Form.Select
                        size="sm"
                        value={selectedSupplyFYs[0] || ""}
                        onChange={(e) =>
                          setSelectedSupplyFYs(
                            e.target.value ? [e.target.value] : [],
                          )
                        }
                      >
                        <option value="">{t("All Financial Years", "सभी वित्तीय वर्ष")}</option>
                        {suppliesFinancialYears.map((fy) => (
                          <option key={fy} value={fy}>
                            {fy}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <div className="d-flex gap-1 align-self-end">
                      <Button
                        size="sm"
                        variant={
                          suppliesTab === "thr" ? "primary" : "outline-primary"
                        }
                        onClick={() => {
                          setSuppliesTab("thr");
                          setSelectedSupplyMonths([]);
                          setSelectedSupplyFYs([]);
                        }}
                      >
                        THR
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          suppliesTab === "hcm" ? "primary" : "outline-primary"
                        }
                        onClick={() => {
                          setSuppliesTab("hcm");
                          setSelectedSupplyMonths([]);
                          setSelectedSupplyFYs([]);
                        }}
                      >
                        HCM
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="align-self-end"
                      onClick={() => {
                        setSelectedSupplyMonths([]);
                        setSelectedSupplyFYs([]);
                      }}
                    >
                      <FaSyncAlt className="me-1" />
                      {t("Reset", "रीसेट करें")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-success"
                      className="align-self-end"
                      onClick={exportSuppliesToExcel}
                      disabled={suppliesLoading || suppliesDisplayData.length === 0}
                    >
                      <FaFileExcel className="me-1" /> Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      className="align-self-end"
                      onClick={exportSuppliesToPDF}
                      disabled={suppliesLoading || suppliesDisplayData.length === 0}
                    >
                      <FaFilePdf className="me-1" /> PDF
                    </Button>
                  </div>
                </div>
              </Card.Header>
           
                {suppliesExportError && (
                  <Alert
                    variant="danger"
                    className="m-3"
                    dismissible
                    onClose={() => setSuppliesExportError("")}
                  >
                    {suppliesExportError}
                  </Alert>
                )}
                {suppliesLoading ? (
                  <div className="text-center p-4">
                    <Spinner animation="border" size="sm" />{" "}
                    <span className="ms-2">{t("Loading supplies summary...", "आपूर्ति सारांश लोड हो रहा है...")}</span>
                  </div>
                ) : suppliesError ? (
                  <Alert variant="danger" className="m-3">
                    {suppliesError}
                  </Alert>
                ) : (
                  <div style={{ overflowX: "auto", maxHeight: 520 }}>
                    <Table
                      bordered
                      hover
                      responsive
                      className="mb-0 align-middle"
                      size="sm"
                      style={{ fontSize: ".86rem", minWidth: "900px" }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                          background: "#eaf2ff",
                          color: "#16324f",
                          borderBottom: "2px solid #b6c9e8",
                        }}
                      >
                        <tr>
                          <th rowSpan={2}>S. No.</th>
                          <th rowSpan={2}>{t("Sector", "सेक्टर")}</th>
                          <th rowSpan={2}>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</th>
                          <th rowSpan={2}>{t("AWC Code", "आंगनवाड़ी केंद्र कोड")}</th>
                          {suppliesFoodItems.map((fi) => (
                            <th key={fi} colSpan={3} className="text-center">
                              {fi}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {suppliesFoodItems.map((fi) => (
                            <React.Fragment key={`${fi}-sub`}>
                              <th className="text-end">
                                {t("Received", "प्राप्त")} (
                                {suppliesTab === "hcm" ? "g / kg" : "packets"})
                              </th>
                              <th className="text-end">
                                {t("Distributed", "वितरित")} (
                                {suppliesTab === "hcm" ? "g / kg" : "packets"})
                              </th>
                              <th className="text-end">
                                {t("Remaining", "शेष")} (
                                {suppliesTab === "hcm" ? "g / kg" : "packets"})
                              </th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {suppliesDisplayData.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                2 +
                                (suppliesViewMode === "awc" ? 2 : 0) +
                                suppliesFoodItems.length * 3
                              }
                              className="text-center text-muted p-4"
                            >
                              {t("No supplies data available for the selected filters.", "चयनित फ़िल्टर के लिए आपूर्ति डेटा उपलब्ध नहीं है।")}
                            </td>
                          </tr>
                        ) : (
                          suppliesDisplayData.map((row, index) => (
                            <tr
                              key={`${row.sector || "sector"}-${row.awc_code || index}-${index}`}
                            >
                              <td>{index + 1}</td>
                              <td>{row.sector || "—"}</td>
                              {suppliesViewMode === "awc" && (
                                <>
                                  <td>{row.awc_name || "—"}</td>
                                  <td>{row.awc_code || "—"}</td>
                                </>
                              )}
                              {suppliesFoodItems.map((fi) => {
                                const fd = row.foodData.find(
                                  (f) => f.food_item === fi,
                                );
                                return (
                                  <React.Fragment key={`${fi}-${index}`}>
                                    <td className="text-end">
                                      {formatSupplyQuantity(fd?.received || 0)}
                                    </td>
                                    <td className="text-end">
                                      {formatSupplyQuantity(
                                        fd?.distributed || 0,
                                      )}
                                    </td>
                                    <td className="text-end fw-bold text-primary">
                                      {formatSupplyQuantity(fd?.balance || 0)}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                      {suppliesDisplayData.length > 0 && (
                        <tfoot
                          style={{
                            background: "#f1f5f9",
                            borderTop: "2px solid #cbd5e1",
                          }}
                        >
                          <tr>
                            <th></th>
                            <th>{t("Total", "कुल")}</th>
                            <th></th>
                            <th></th>
                            {suppliesFoodItems.map((fi) => {
                              const t = suppliesTotals[fi] || {
                                received: 0,
                                distributed: 0,
                                balance: 0,
                              };
                              return (
                                <React.Fragment key={`${fi}-total`}>
                                  <th className="text-end">
                                    {formatSupplyQuantity(t.received)}
                                  </th>
                                  <th className="text-end">
                                    {formatSupplyQuantity(t.distributed)}
                                  </th>
                                  <th className="text-end">
                                    {formatSupplyQuantity(t.balance)}
                                  </th>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        </tfoot>
                      )}
                    </Table>
                  </div>
                )}
            
            </Card>
          </div>

          {activeScheme && (
            <Row>
              <Col xs={12}>
                <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                  <h5 className="mb-0">
                    {t(`${activeScheme.toUpperCase()} Distribution Records`, `${activeScheme.toUpperCase()} वितरण रिकॉर्ड`)}
                  </h5>

                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={exportDistributionsToExcel}
                      disabled={loading.table || distributionRecords.length === 0}
                    >
                      <FaFileExcel className="me-1" /> Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={exportDistributionsToPDF}
                      disabled={loading.table || distributionRecords.length === 0}
                    >
                      <FaFilePdf className="me-1" /> PDF
                    </Button>
                    <Button
                      variant="success"
                      onClick={() =>
                        handleOpenDistributionModal(
                          null,
                          activeScheme,
                          null,
                          true,
                        )
                      }
                    >
                      <FaDolly className="me-2" /> {t("New Distribution", "नया वितरण")}
                    </Button>
                  </div>
                </div>

                {distributionExportError && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setDistributionExportError("")}
                  >
                    {distributionExportError}
                  </Alert>
                )}
                {loading.table ? (
                  <div className="loading-state">
                    <Spinner animation="border" />
                  </div>
                ) : error.table ? (
                  <Alert variant="danger">{error.table}</Alert>
                ) : distributionRecords.length === 0 ? (
                  <div className="empty-state">
                    {t("No distribution records found for", "इसके लिए कोई वितरण रिकॉर्ड नहीं मिला")}{" "}
                    {activeScheme.toUpperCase()}.
                  </div>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>

                        <th>{t("Food Item", "खाद्य सामग्री")}</th>

                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>

                        <th>{t("Date", "दिनांक")}</th>

                        <th>{t("Trimester / Months", "त्रैमासिक अवधि / महीने")}</th>

                        <th>{t("Year", "वर्ष")}</th>

                        <th>{t("Total Beneficiaries", "कुल लाभार्थी")}</th>

                        <th>{t("Quantity", "मात्रा")}</th>

                        <th>{t("Unit", "इकाई")}</th>

                        <th>{t("Remark", "टिप्पणी")}</th>

                        <th>{t("Actions", "कार्रवाई")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {distributionRecords.map((record, index) => (
                        <tr key={record.id}>
                          <td>{index + 1}</td>

                          <td>{record.food_item}</td>

                          <td>{record.bene_category || "-"}</td>

                          <td>
                            {record.date
                              ? new Date(record.date).toLocaleDateString()
                              : "-"}
                          </td>

                          <td>
                            {record.trimester ||
                              normalizeTrimester(
                                record.quarter,
                                record.months,
                              )}{" "}
                            (
                            {formatMonths(
                              record.months ||
                                trimesterToMonths[
                                  normalizeTrimester(
                                    record.trimester || record.quarter,
                                  )
                                ] ||
                                record.quarter,
                            )}
                            )
                          </td>

                          <td>{record.fin_year}</td>

                          <td>{record.total_beneficiaries}</td>

                          <td>
                            {record.quantity}

                            {activeScheme === "hcm" && record.quantity && (
                              <small className="text-muted d-block">
                                (
                                {(parseFloat(record.quantity) / 1000).toFixed(
                                  2,
                                )}{" "}
                                kg)
                              </small>
                            )}
                          </td>

                          <td>{record.unit}</td>

                          <td>{record.anganwadi_remark || "-"}</td>

                          <td>
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="me-2"
                              onClick={() => handleOpenViewModal(record)}
                            >
                              <FaEye />
                            </Button>

                            {record.sector_status !== "approved" && (
                              <>
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="me-2"
                                  onClick={() =>
                                    handleOpenDistributionModal(
                                      record,
                                      activeScheme,
                                      record,
                                    )
                                  }
                                >
                                  <FaEdit />
                                </Button>

                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(record)}
                                >
                                  <FaTrash />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Col>

              <Col xs={12}>
                <div className="food-items-table-container mt-4">
                  <h5 className="mb-3">
                    {t(`${activeScheme.toUpperCase()} Food Item List`, `${activeScheme.toUpperCase()} खाद्य सामग्री सूची`)}
                  </h5>

                  {loading.table ? (
                    <div className="loading-state">
                      <Spinner animation="border" />
                    </div>
                  ) : error.table ? (
                    <Alert variant="danger">{error.table}</Alert>
                  ) : foodItems.length === 0 ? (
                    <div className="empty-state">
                      {t(`No items found for ${activeScheme.toUpperCase()}.`, `${activeScheme.toUpperCase()} के लिए कोई आइटम नहीं मिला।`)}
                    </div>
                  ) : activeScheme === "hcm" ? (
                    /* ── HCM-specific Food Item List with grams/kg columns ── */

                    <Table striped bordered hover responsive>
                      <thead>
                        <tr
                          style={{ backgroundColor: "#073f73", color: "white" }}
                        >
                          <th>#</th>

                          <th>{t("Food Item", "खाद्य सामग्री")}</th>

                          <th>{t("Packet Weight (g)", "पैकेट का वज़न (g)")}</th>

                          <th>{t("Per Person Qty (g)", "प्रति व्यक्ति मात्रा (g)")}</th>

                          <th>{t("Total Quantity (g)", "कुल मात्रा (g)")}</th>

                          <th>{t("Total Quantity (kg)", "कुल मात्रा (kg)")}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {foodItems.map((item, index) => {
                          const totalGrams =
                            parseFloat(item.total_quantity) || 0;

                          const totalKg = (totalGrams / 1000).toFixed(2);

                          return (
                            <tr key={item.id}>
                              <td>{index + 1}</td>

                              <td>{item.food_item}</td>

                              <td>{item.qty_per_ben}</td>

                              <td>{item.daily_consumption_qty}</td>

                              <td>{totalGrams}</td>

                              <td>{totalKg}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  ) : (
                    /* ── THR Food Item List (existing) ── */

                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>#</th>

                          <th>Food Item</th>

                          <th>{t("Qty Per Beneficiary", "प्रति लाभार्थी मात्रा")}</th>

                          <th>{t("Unit", "इकाई")}</th>

                          <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>

                          <th>{t("Days Allotted", "आवंटित दिन")}</th>

                          <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {foodItems.map((item, index) => (
                          <tr key={item.id}>
                            <td>{index + 1}</td>

                            <td>{item.food_item}</td>

                            <td>{item.qty_per_ben}</td>

                            <td>{item.unit}</td>

                            <td>{item.bene_category}</td>

                            <td>{item.days_allotted}</td>

                            <td>{item.total_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
              </Col>
            </Row>
          )}

          {selectedItem && (
            <Modal
              show={showDistributionModal}
              onHide={handleCloseDistributionModal}
              centered
              size="lg"
            >
              <Modal.Header closeButton>
                <Modal.Title>
                  {selectedItem.isEdit ? t("Edit", "संपादित करें") : t("Record", "दर्ज करें")} {t("Distribution", "वितरण")}
                </Modal.Title>
              </Modal.Header>

              <Modal.Body>
                {distributionError && (
                  <Alert variant="danger">{distributionError}</Alert>
                )}

                <Form onSubmit={handleDistributionSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>{t("Select Trimester", "त्रैमासिक अवधि चुनें")}</Form.Label>
                    <Form.Select
                      value={distributionData.trimester || ""}
                      required
                      onChange={(e) => {
                        const trimester = e.target.value;
                        setDistributionData((prev) => ({
                          ...prev,
                          trimester,
                          months: [],
                          total_beneficiaries: "",
                        }));
                        setDistributionError("");
                        const allowed = trimesterToMonths[trimester] || [];
                        const hasApprovedReceiving = allowed.some(
                          (m) =>
                            receivedMonths.includes(m) &&
                            receivedMonthsStatus[m],
                        );
                        if (trimester && !hasApprovedReceiving)
                          setDistributionError(
                            "इस Trimester के लिए approved receiving उपलब्ध नहीं है। कृपया दूसरा Trimester चुनें या पहले receiving approve करवाएं।",
                          );
                      }}
                    >
                      <option value="">{t("Select Trimester", "त्रैमासिक अवधि चुनें")}</option>
                      {trimesterOptions.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Trimester", "त्रैमासिक अवधि")}</Form.Label>

                    <div className="month-checkbox-group d-flex flex-wrap gap-2">
                      {monthOptions
                        .filter(
                          (m) =>
                            (
                              trimesterToMonths[distributionData.trimester] ||
                              []
                            ).includes(m.value) &&
                            receivedMonths.includes(m.value),
                        )
                        .map((month) => {
                          const checked =
                            distributionData.months?.includes(month.value) ||
                            false;

                          const isApproved = receivedMonthsStatus[month.value];

                          return (
                            <Form.Check
                              key={month.value}
                              inline
                              type="checkbox"
                              id={`month-${month.value}`}
                              label={month.label}
                              checked={checked}
                              disabled={!isApproved}
                              onChange={(e) => {
                                if (e.target.checked && !isApproved) {
                                  setDistributionError(
                                    `त्रुटि: ${month.label} महीने के लिए रिसीविंग स्वीकृत (approved) नहीं है। कृपया सुपरवाइजर से पहले रिसीविंग अनुमोदित करवाएं।`,
                                  );

                                  return;
                                }

                                if (distributionError) setDistributionError("");

                                const nextMonths = e.target.checked
                                  ? [
                                      ...new Set([
                                        ...(distributionData.months || []),
                                        month.value,
                                      ]),
                                    ]
                                  : (distributionData.months || []).filter(
                                      (m) => m !== month.value,
                                    );

                                const selectedFoodItem = foodItems.find(
                                  (fi) =>
                                    fi.id ===
                                    parseInt(distributionData.food_item_id, 10),
                                );

                                const autoTotalBene =
                                  computeAutoTotalBeneficiaries(
                                    selectedFoodItem,

                                    distributionData.fin_year,

                                    nextMonths,
                                  );

                                setDistributionData({
                                  ...distributionData,

                                  months: nextMonths,

                                  total_beneficiaries:
                                    autoTotalBene ||
                                    distributionData.total_beneficiaries,
                                });
                              }}
                            />
                          );
                        })}
                    </div>

                    {receivedMonths.length === 0 ? (
                      <Alert variant="warning" className="p-2 mt-2">
                        वितरण हेतु कोई माह उपलब्ध नहीं है। कृपया पहले प्राप्ति
                        रिकॉर्ड दर्ज करें।
                      </Alert>
                    ) : receivedMonths.every(
                        (m) => !receivedMonthsStatus[m],
                      ) ? (
                      <Alert variant="warning" className="p-2 mt-2">
                        कोई भी स्वीकृत माह उपलब्ध नहीं है। कृपया सुपरवाइजर से
                        रिसीविंग अनुमोदित करवाएं।
                      </Alert>
                    ) : null}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Food Item", "खाद्य सामग्री")}</Form.Label>

                    <Form.Select
                      required
                      value={distributionData.food_item_id || ""}
                      onChange={(e) => {
                        const newFoodItemId = e.target.value;

                        const selectedFoodItem = foodItems.find(
                          (fi) => fi.id === parseInt(newFoodItemId, 10),
                        );

                        const autoTotalBene = computeAutoTotalBeneficiaries(
                          selectedFoodItem,

                          distributionData.fin_year,

                          distributionData.months,

                          distributionData.trimester,
                        );

                        setDistributionData((prev) => ({
                          ...prev,

                          food_item_id: newFoodItemId,

                          total_beneficiaries: autoTotalBene,
                        }));
                      }}
                    >
                      <option value="">{t("Select a food item...", "खाद्य सामग्री चुनें...")}</option>

                      {foodItems.map((item) => [
                        <option
                          key={item.id}
                          value={item.id}
                          style={{ fontWeight: "bold" }}
                        >
                          {item.food_item}
                        </option>,

                        <option
                          key={`${item.id}-cat`}
                          disabled
                          style={{ color: "#6c757d", paddingLeft: "15px" }}
                        >
                          &nbsp;&nbsp;                          ↳ {t("Category:", "श्रेणी:")} {item.bene_category}
                        </option>,
                      ])}
                    </Form.Select>
                  </Form.Group>

                  {distributionData.food_item_id && (
                    <div className="row g-3 mb-3">
                      {[
                        {
                          label: t("Received", "प्राप्त"),
                          value: receivedStockForDisplay,
                          color: "#0f766e",
                          bg: "#ecfdf5",
                        },
                        {
                          label: t("Distributed", "वितरित"),
                          value: distributedStockForDisplay,
                          color: "#1d4ed8",
                          bg: "#eff6ff",
                        },
                        {
                          label: t("Remaining", "शेष"),
                          value: remainingStockForDisplay,
                          color: "#7c3aed",
                          bg: "#f5f3ff",
                        },
                      ].map((item) => (
                        <div className="col-4" key={item.label}>
                          <div
                            style={{
                              border: `1px solid ${item.color}30`,
                              background: item.bg,
                              borderRadius: 12,
                              padding: "12px 10px",
                              minHeight: 86,
                            }}
                          >
                            <div
                              style={{
                                fontSize: ".78rem",
                                color: item.color,
                                fontWeight: 700,
                              }}
                            >
                              {item.label} {t("quantity", "मात्रा")} ({distributionQuantityUnit})
                            </div>
                            <div
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: 800,
                                color: "#172554",
                                marginTop: 5,
                              }}
                            >
                              {item.value === null
                                ? t("Select trimester and financial year", "त्रैमासिक अवधि और वित्तीय वर्ष चुनें")
                                : formatDistributionQuantity(item.value)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Date of Distribution", "वितरण की तिथि")}</Form.Label>

                    <Form.Control
                      type="date"
                      name="date"
                      value={distributionData.date || ""}
                      onChange={(e) =>
                        setDistributionData({
                          ...distributionData,
                          date: e.target.value,
                        })
                      }
                      required
                    />

                    {activeScheme === "hcm" && (
                      <Form.Text className="text-muted d-block mt-1">
                        {t("Note: Only one HCM distribution record can be recorded for a date.", "नोट: एक दिनांक पर केवल एक ही HCM वितरण रिकॉर्ड किया जा सकता है।")}
                      </Form.Text>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Anganwadi Remark", "आंगनवाड़ी टिप्पणी")}</Form.Label>

                    <Form.Control
                      type="text"
                      name="anganwadi_remark"
                      value={distributionData.anganwadi_remark || ""}
                      onChange={(e) =>
                        setDistributionData({
                          ...distributionData,
                          anganwadi_remark: e.target.value,
                        })
                      }
                      placeholder={t("Enter remark", "टिप्पणी दर्ज करें")}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Total Beneficiaries", "कुल लाभार्थी")}</Form.Label>

                    {(!distributionData.months ||
                      distributionData.months.length === 0) && (
                      <Form.Text className="text-muted d-block mb-2">
                        {t("Please select a trimester first to enable this field.", "इस फ़ील्ड को सक्रिय करने के लिए पहले त्रैमासिक अवधि चुनें।")}
                      </Form.Text>
                    )}

                    {distributionData.total_beneficiaries_error && (
                      <Form.Text className="text-danger d-block mb-2">
                        {distributionData.total_beneficiaries_error}
                      </Form.Text>
                    )}

                    <Form.Control
                      type="text"
                      value={distributionData.total_beneficiaries}
                      onChange={(e) => {
                        const value = e.target.value;

                        const enteredBeneficiaries = parseInt(value, 10) || 0;

                        let error = "";

                        if (
                          value &&
                          distributionData.months?.length > 0 &&
                          distributionData.food_item_id
                        ) {
                          const selectedFoodItem = foodItems.find(
                            (fi) =>
                              fi.id ===
                              parseInt(distributionData.food_item_id, 10),
                          );

                          const maxAvailable = computeAutoTotalBeneficiaries(
                            selectedFoodItem,

                            distributionData.fin_year,

                            distributionData.months,
                          );

                          if (
                            maxAvailable &&
                            enteredBeneficiaries > maxAvailable
                          ) {
                            error = `कुल लाभार्थी (${enteredBeneficiaries}) उपलब्ध लाभार्थियों (${maxAvailable}) से अधिक नहीं हो सकते।`;
                          }
                        }

                        setDistributionData({
                          ...distributionData,

                          total_beneficiaries: value,

                          total_beneficiaries_error: error,
                        });
                      }}
                      placeholder="पूरक पोषण से स्वतः दर्ज होगा"
                      required
                      disabled={
                        !distributionData.months ||
                        distributionData.months.length === 0
                      }
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Financial Year</Form.Label>

                    <Form.Control
                      type="text"
                      placeholder={t("e.g., 2025-26", "उदाहरण: 2025-26")}
                      value={distributionData.fin_year}
                      readOnly
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</Form.Label>

                    <Form.Control
                      type="text"
                      value={selectedFoodItemForCalc?.bene_category || ""}
                      disabled
                    />
                  </Form.Group>

                  {/* ── Total Quantity with grams & kg for HCM ── */}

                  <Form.Group className="mb-3">
                    <Form.Label>
                      {t("Total Quantity", "कुल मात्रा")}{" "}
                      {activeScheme === "hcm" ? t("(in grams & kg)", "(ग्राम और kg में)") : ""}
                    </Form.Label>

                    {activeScheme === "hcm" ? (
                      <>
                        <Form.Control
                          type="text"
                          value={calculatedQuantityDisplay}
                          disabled
                        />

                        <Form.Text className="d-block mt-1">
                          <strong>{t("Per Person Qty:", "प्रति व्यक्ति मात्रा:")}</strong>{" "}
                          {perPersonQtyGrams.toFixed(2)} ग्राम (
                          {(perPersonQtyGrams / 1000).toFixed(2)} kg)
                          <br />
                          <strong>{t("Calculation:", "गणना:")}</strong>{" "}
                          {perPersonQtyGrams.toFixed(2)} g × {beneficiaries}{" "}
                          {t("beneficiaries", "लाभार्थी")}
                          <br />
                          <strong>
                            = {calculatedQuantityGrams.toFixed(2)} ग्राम (
                            {calculatedQuantityKg} kg)
                          </strong>
                        </Form.Text>
                      </>
                    ) : (
                      <>
                        <Form.Control
                          type="text"
                          value={
                            selectedFoodItemForCalc
                              ? `${calculatedQuantityDisplay} ${selectedFoodItemForCalc.unit}`
                              : "0.00"
                          }
                          disabled
                        />

                        <Form.Text className="d-block">
                          ({effectivePerPersonQty.toFixed(2)}{" "}
                          {selectedFoodItemForCalc?.unit} per beneficiary)
                          {remainingStockForDisplay !== null &&
                            plannedQuantityForDisplay >
                              remainingStockForDisplay &&
                            beneficiaries > 0 && (
                              <Alert variant="info" className="mt-2 mb-0">
                                शेष स्टॉक {remainingStockForDisplay.toFixed(2)}{" "}
                                {selectedFoodItemForCalc?.unit || ""} है।
                                लाभार्थियों की संख्या {beneficiaries} ही रहेगी
                                और प्रति लाभार्थी मात्रा स्वतः{" "}
                                {effectivePerPersonQty.toFixed(2)}{" "}
                                {selectedFoodItemForCalc?.unit || ""} कर दी गई
                                है।
                              </Alert>
                            )}
                        </Form.Text>
                        {stockFinishedForDisplay && (
                          <Alert variant="danger" className="mt-2 mb-0">
                            आप वितरण नहीं कर सकते, आवंटित रिसीविंग समाप्त हो
                            चुकी है। इस Trimester में कोई मात्रा शेष नहीं है।
                          </Alert>
                        )}
                      </>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>{t("Unit", "इकाई")}</Form.Label>

                    <Form.Control
                      type="text"
                      value={
                        activeScheme === "hcm"
                          ? "ग्राम"
                          : selectedFoodItemForCalc?.unit || ""
                      }
                      disabled
                    />
                  </Form.Group>

                  {/* Show Packet Weight info for HCM */}

                  {activeScheme === "hcm" && selectedFoodItemForCalc && (
                    <Form.Group className="mb-3">
                      <Form.Label>
                        {t("Packet Weight (1 packet = ? grams)", "पैकेट का वज़न (1 पैकेट = ? ग्राम)")}
                      </Form.Label>

                      <Form.Control
                        type="text"
                        value={`${selectedFoodItemForCalc.qty_per_ben} ग्राम`}
                        disabled
                      />

                      <Form.Text>
                        {t("1 packet", "1 पैकेट")} = {selectedFoodItemForCalc.qty_per_ben}g | {t("Per person allotted quantity", "प्रति व्यक्ति आवंटित मात्रा")} ={" "}
                        {selectedFoodItemForCalc.daily_consumption_qty}g
                      </Form.Text>
                    </Form.Group>
                  )}

                  <div className="d-flex justify-content-end">
                    <Button
                      variant="secondary"
                      onClick={handleCloseDistributionModal}
                      className="me-2"
                    >
                      {t("Cancel", "रद्द करें")}
                    </Button>

                    <Button
                      variant="primary"
                      type="submit"
                      disabled={
                        submitting ||
                        !distributionData.trimester ||
                        !!distributionData.total_beneficiaries_error ||
                        stockFinishedForDisplay
                      }
                    >
                      {submitting ? (
                        <Spinner as="span" animation="border" size="sm" />
                      ) : selectedItem.isEdit ? (
                        t("Update", "अपडेट करें")
                      ) : (
                        t("Submit", "जमा करें")
                      )}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>
          )}

          {viewItem && (
            <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
              <Modal.Header closeButton className="view-modal-header">
                <Modal.Title>
                  {t("View Distribution", "वितरण देखें")}: {viewItem.food_item}
                </Modal.Title>
              </Modal.Header>

              <Modal.Body className="view-modal-body">
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <FaBuilding className="view-modal-icon" />{" "}
                    <strong>{t("AWC Name:", "आंगनवाड़ी केंद्र का नाम:")}</strong> {viewItem.awc_name}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaHashtag className="view-modal-icon" />{" "}
                    <strong>{t("AWC Code:", "आंगनवाड़ी केंद्र कोड:")}</strong> {viewItem.awc_code}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaUtensils className="view-modal-icon" />{" "}
                    <strong>{t("Food Item:", "खाद्य सामग्री:")}</strong> {viewItem.food_item}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaUsers className="view-modal-icon" />{" "}
                    <strong>{t("Beneficiaries:", "लाभार्थी:")}</strong>{" "}
                    {viewItem.total_beneficiaries}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaWeightHanging className="view-modal-icon" />
                    <strong>{t("Quantity:", "मात्रा:")}</strong> {viewItem.quantity}{" "}
                    {viewItem.unit}
                    {activeScheme === "hcm" && viewItem.quantity && (
                      <span className="text-muted ms-2">
                        ({(parseFloat(viewItem.quantity) / 1000).toFixed(2)} kg)
                      </span>
                    )}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaCalendarDay className="view-modal-icon" />{" "}
                    <strong>{t("Date:", "दिनांक:")}</strong>{" "}
                    {viewItem.date
                      ? new Date(viewItem.date).toLocaleDateString()
                      : "-"}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaInfoCircle className="view-modal-icon" />{" "}
                    <strong>{t("Anganwadi Remark:", "आंगनवाड़ी टिप्पणी:")}</strong>{" "}
                    {viewItem.anganwadi_remark || "-"}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaCalendarDay className="view-modal-icon" />{" "}
                    <strong>{t("Financial Year:", "वित्तीय वर्ष:")}</strong> {viewItem.fin_year}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaCubes className="view-modal-icon" />{" "}
                    <strong>{t("Trimester:", "त्रैमासिक अवधि:")}</strong>{" "}
                    {formatMonths(viewItem.months || viewItem.quarter)}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaMapMarkerAlt className="view-modal-icon" />{" "}
                    <strong>{t("Sector:", "सेक्टर:")}</strong> {viewItem.sector}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaProjectDiagram className="view-modal-icon" />{" "}
                    <strong>{t("Project:", "परियोजना:")}</strong> {viewItem.project}
                  </ListGroup.Item>

                  <ListGroup.Item>
                    <FaMapMarkerAlt className="view-modal-icon" />{" "}
                    <strong>{t("District:", "ज़िला:")}</strong> {viewItem.district}
                  </ListGroup.Item>

                  {viewItem.sector_status && (
                    <ListGroup.Item>
                      <FaInfoCircle className="view-modal-icon" />{" "}
                      <strong>{t("Sector Status:", "सेक्टर स्थिति:")}</strong>{" "}
                      <span
                        className={`badge bg-${viewItem.sector_status === "approved" ? "success" : "warning"}`}
                      >
                        {viewItem.sector_status}
                      </span>
                    </ListGroup.Item>
                  )}
                </ListGroup>

                <hr />

                <Row className="text-muted small">
                  <Col>
                    <FaClock className="me-1" />

                    <strong>{t("Recorded:", "दर्ज किया गया:")}</strong>

                    <br />

                    {new Date(viewItem.created_at).toLocaleString()}
                  </Col>

                  <Col className="text-end">
                    <FaEdit className="me-1" />

                    <strong>{t("Updated:", "अपडेट किया गया:")}</strong>

                    <br />

                    {new Date(viewItem.updated_at).toLocaleString()}
                  </Col>
                </Row>
              </Modal.Body>

              <Modal.Footer className="view-modal-footer">
                <Button variant="secondary" onClick={handleCloseViewModal}>
                  {t("Close", "बंद करें")}
                </Button>
              </Modal.Footer>
            </Modal>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AnganwadiDashboard;
