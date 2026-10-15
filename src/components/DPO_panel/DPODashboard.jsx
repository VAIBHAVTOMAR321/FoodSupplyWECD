import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Form,
  Button,
  ButtonGroup,
  InputGroup,
  Dropdown,
  Pagination,
  Modal,
  Badge,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";

import {
  FaUsers,
  FaUserFriends,
  FaBaby,
  FaChartBar,
  FaLayerGroup,
  FaFileExcel,
  FaFilePdf,
  FaSyncAlt,
  FaSearch,
  FaBoxes,
  FaChevronDown,
  FaWarehouse,
  FaUtensils,
  FaTimes,
} from "react-icons/fa";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const quarterOptions = ["Apr-May-Jun", "Jul-Aug-Sep", "Oct-Nov-Dec", "Jan-Feb-Mar"];

/* ── Grant-wise Table schema (mirrors FoodSupplementary) ── */
const GRANT_IDS = [15, 30, 31];
const GRANT_CATEGORIES = [
  {
    title: "Pregnant Woman and Lactating Mother",
    countKey: "pregnant_woman_lactating_mother",
    grantKey: "pregnant_woman_lactating_mother_grant",
  },
  {
    title: "Children 6m-3y",
    countKey: "children_6m_3y",
    grantKey: "children_6m_3y_grant",
  },
  {
    title: "SAM 6M-5Y / SUW 6M-6Y",
    countKey: "sam_children_6m_5y_suw_children_6m_6y",
    grantKey: "sam_children_6m_5y_suw_children_6m_6y_grant",
  },
  {
    title: "SAM 3Y-5Y / SUW 3Y-6Y",
    countKey: "sam_children_3y_5y_suw_children_3y_6y",
    grantKey: "sam_children_3y_5y_suw_children_3y_6y_grant",
  },
  {
    title: "HCM Beneficiaries 3Y-6Y (Normal Children)",
    countKey: "hcm_beneficiaries_3y_6y",
    grantKey: "hcm_beneficiaries_3y_6y_grant",
  },
];
const FOOD_FIELDS = [
  {
    header: "Poushik Sattu - Pregnant/Lactating Mother",
    key: "poushik_sattu_preg_lat",
  },
  { header: "Panjeeri - Children 6m-3y", key: "panjeeri_6m_3y" },
  {
    header: "Panjeeri - SAM 6M-5Y / SUW 6M-6Y",
    key: "panjeeri_sam_6m_5y_suw_6m_6y",
  },
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
  { header: "TRIMESTER", key: "quarter" },
  { header: "FINANCIAL YEAR", key: "financial_year" },
];

const TABLE_COLUMNS = [
  { label: "District", key: "district" },
  { label: "Project", key: "project" },
  { label: "Sector", key: "sector" },
  { label: "AWC Code", key: "awc_code" },
  { label: "AWC Name", key: "awc_name" },
  { label: "Trimester", key: "quarter" },
  { label: "Fin. Year", key: "financial_year" },
  {
    label: "Pregnant/Lactating",
    key: "pregnant_woman_lactating_mother",
    num: true,
  },
  { label: "Poushik Sattu", key: "poushik_sattu_preg_lat", num: true },
  { label: "Children 6m-3y", key: "children_6m_3y", num: true },
  { label: "Panjeeri 6m-3y", key: "panjeeri_6m_3y", num: true },
  {
    label: "SAM 6m-5y / SUW 6m-6y",
    key: "sam_children_6m_5y_suw_children_6m_6y",
    num: true,
  },
  { label: "Panjeeri SAM/SUW", key: "panjeeri_sam_6m_5y_suw_6m_6y", num: true },
  {
    label: "SAM 3y-5y / SUW 3y-6y",
    key: "sam_children_3y_5y_suw_children_3y_6y",
    num: true,
  },
  { label: "Sattu SAM/SUW", key: "sattu_sam_3y_5y_suw_3y_6y", num: true },
  { label: "HCM 3y-6y", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "Mung Dal Khichdi", key: "mung_dal_khichdi_3y_6y", num: true },
  { label: "Multi Grain Aata", key: "multi_grain_aata_3y_6y", num: true },
];

const NUMERIC_AGG_FIELDS = TABLE_COLUMNS.filter((c) => c.num || c.strong);

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
        console.warn(
          "Noto Sans Devanagari could not be loaded; using the system Hindi font.",
        );
        resolve(false);
      };
      document.head.appendChild(fontLink);
    });
  }

  if (await hindiPdfFontPromise) {
    try {
      await document.fonts.load('400 12px "Noto Sans Devanagari"', "हिंदी");
    } catch (error) {
      console.warn(
        "Noto Sans Devanagari could not be prepared; using the system Hindi font.",
        error,
      );
    }
  }
};

const downloadPDF = async ({
  title,
  filename,
  headers,
  rows,
  footer,
  fontSize,
}) => {
  const content = document.createElement("div");
  content.style.cssText =
    "box-sizing:border-box;width:100%;padding:8px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI',sans-serif;";

  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.style.cssText =
    "margin:0 0 10px;text-align:center;color:#1e3a5f;font-size:15px;font-weight:700;";
  content.appendChild(heading);

  const table = document.createElement("table");
  table.style.cssText = `width:100%;border-collapse:collapse;table-layout:auto;font-size:${Math.max(7, Math.min(fontSize, 8))}px;line-height:1.3;page-break-inside:auto;`;

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);
    const value =
      typeof cell === "object" && cell !== null ? cell : { text: cell };
    element.textContent = value.text == null ? "" : String(value.text);
    if (value.colSpan) element.colSpan = value.colSpan;
    if (value.rowSpan) element.rowSpan = value.rowSpan;
    element.style.cssText =
      "box-sizing:border-box;border:1px solid #cbd5e1;padding:4px 3px;text-align:left;vertical-align:middle;white-space:normal;overflow-wrap:break-word;word-break:normal;";
    return element;
  };

  const thead = document.createElement("thead");
  headers.forEach((headerRow, rowIndex) => {
    const row = document.createElement("tr");
    headerRow.forEach((cell) => {
      const header = createCell("th", cell);
      header.style.cssText += `;background-color:${rowIndex === 0 ? "#4f46e5" : "#e0e7ff"};color:${rowIndex === 0 ? "#fff" : "#312e81"};border-color:${rowIndex === 0 ? "#4338ca" : "#a5b4fc"};padding:5px 3px;text-align:center;font-weight:700;font-size:${Math.max(fontSize, 8)}px;line-height:1.3;white-space:normal;`;
      row.appendChild(header);
    });
    row.style.pageBreakInside = "avoid";
    thead.appendChild(row);
  });
  // Keep the heading and table header attached to the first data rows.
  // Avoid page-break-before on THEAD; it can produce a header-only page.
  thead.style.display = "table-header-group";
  thead.style.breakInside = "avoid";
  thead.style.pageBreakInside = "avoid";
  table.style.breakInside = "auto";
  table.style.pageBreakInside = "auto";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((values) => {
    const row = document.createElement("tr");
    row.style.pageBreakInside = "avoid";
    row.style.breakInside = "avoid";
    row.className = "pdf-no-break";
    values.forEach((value) => row.appendChild(createCell("td", value)));
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  if (footer?.length) {
    const tfoot = document.createElement("tfoot");
    footer.forEach((footerRow) => {
      const row = document.createElement("tr");
      footerRow.forEach((cell) => {
        const footerCell = createCell("td", cell);
        footerCell.style.backgroundColor = "#f1f5f9";
        footerCell.style.fontWeight = "700";
        row.appendChild(footerCell);
      });
      row.style.pageBreakInside = "avoid";
      row.style.breakInside = "avoid";
      row.className = "pdf-no-break";
      tfoot.appendChild(row);
    });
    table.appendChild(tfoot);
  }

  content.appendChild(table);
  document.body.appendChild(content);

  try {
    await loadHindiPdfFont();
    await html2pdf()
      .set({
        margin: [10, 8, 12, 8],
        filename,
        image: { type: "jpeg", quality: 0.84 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.max(content.scrollWidth, 1600),
        },
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape", compress: true },
        pagebreak: {
          // Do not force a new page before the table header. That rule caused
          // the multi-row grant header to be pushed onto a page by itself.
          mode: ["css"],
          avoid: ["tr", "tfoot", ".pdf-no-break"],
        },
      })
      .from(content)
      .save();
  } finally {
    content.remove();
  }
};

const SUMMARY_PILLS = [
  {
    key: "pregnant_woman_lactating_mother",
    label: "Preg/Lact",
    icon: <FaBaby size={10} />,
  },
  {
    key: "poushik_sattu_preg_lat",
    label: "Poushik Sattu",
    icon: <FaBoxes size={10} />,
  },
  {
    key: "children_6m_3y",
    label: "Children 6m-3y",
    icon: <FaBaby size={10} />,
  },
  {
    key: "panjeeri_6m_3y",
    label: "Panjeeri 6m-3y",
    icon: <FaBoxes size={10} />,
  },
  {
    key: "sam_children_6m_5y_suw_children_6m_6y",
    label: "SAM/SUW 6m-6y",
    icon: <FaBaby size={10} />,
  },
  {
    key: "panjeeri_sam_6m_5y_suw_6m_6y",
    label: "Panjeeri SAM/SUW",
    icon: <FaBoxes size={10} />,
  },
  {
    key: "sam_children_3y_5y_suw_children_3y_6y",
    label: "SAM/SUW 3y-6y",
    icon: <FaBaby size={10} />,
  },
  {
    key: "sattu_sam_3y_5y_suw_3y_6y",
    label: "Sattu SAM/SUW",
    icon: <FaBoxes size={10} />,
  },
  {
    key: "hcm_beneficiaries_3y_6y",
    label: "HCM 3y-6y",
    icon: <FaUsers size={10} />,
  },
  {
    key: "mung_dal_khichdi_3y_6y",
    label: "Mung Dal",
    icon: <FaBoxes size={10} />,
  },
  {
    key: "multi_grain_aata_3y_6y",
    label: "Multi Grain Aata",
    icon: <FaBoxes size={10} />,
  },
];

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((o) => o !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const getLabel = () => {
    if (!selected || selected.length === 0) return `All ${label}s`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} ${label}s selected`;
  };

  return (
    <div
      className="dpo-filter-group"
      style={{ position: "relative", zIndex: 20 }}
    >
      <Form.Label className="dpo-filter-label">{label}</Form.Label>
      <Dropdown autoClose="outside">
        <Dropdown.Toggle size="sm" variant="light" className="dpo-multi-toggle">
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {getLabel()}
          </span>
          <FaChevronDown className="dpo-multi-caret" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="dpo-multi-menu">
          {options.length === 0 ? (
            <Dropdown.Item disabled>No options</Dropdown.Item>
          ) : (
            options.map((opt) => (
              <div
                key={opt}
                className="dpo-multi-item"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(opt);
                }}
              >
                <Form.Check
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => {}}
                  label={opt}
                />
              </div>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

const DPODashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Multi-Select States
  const [selectedQuarters, setSelectedQuarters] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);

  const [aggregateView, setAggregateView] = useState("sector"); // 'sector' | 'project'

  // Pagination state (Fixed to 100 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);

  // Food Items Modal state
  const [showFoodItemModal, setShowFoodItemModal] = useState(false);
  const [foodItems, setFoodItems] = useState({ hcm: [], thr: [] });
  const [loadingFoodItems, setLoadingFoodItems] = useState(false);

  // Supplies Dynamic States
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesViewMode, setSuppliesViewMode] = useState("project"); // 'project' | 'sector' | 'awc'
  const [suppliesRecords, setSuppliesRecords] = useState([]);
  const [suppliesDetailRecords, setSuppliesDetailRecords] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [selectedSupplyQuarters, setSelectedSupplyQuarters] = useState([]);
  const [selectedSupplyFYs, setSelectedSupplyFYs] = useState([]);

  // Race condition prevention for API calls
  const suppliesReqId = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Normalize field names returned by both Supplementary Nutrition and the
  // THR/HCM reconciliation APIs. Some reconciliation endpoints use alternate
  // keys for financial year and return a month instead of a trimester.
  const normalizeQuarter = (value) => {
    if (!value) return "";
    const text = String(value).trim();
    if (quarterOptions.includes(text)) return text;
    const month = text.toLowerCase();
    const monthToQuarter = {
      april: "Apr-May-Jun", may: "Apr-May-Jun", june: "Apr-May-Jun", jun: "Apr-May-Jun",
      july: "Jul-Aug-Sep", jul: "Jul-Aug-Sep", august: "Jul-Aug-Sep", aug: "Jul-Aug-Sep", september: "Jul-Aug-Sep", sep: "Jul-Aug-Sep", sept: "Jul-Aug-Sep",
      october: "Oct-Nov-Dec", oct: "Oct-Nov-Dec", november: "Oct-Nov-Dec", nov: "Oct-Nov-Dec", december: "Oct-Nov-Dec", dec: "Oct-Nov-Dec",
      january: "Jan-Feb-Mar", jan: "Jan-Feb-Mar", february: "Jan-Feb-Mar", feb: "Jan-Feb-Mar", march: "Jan-Feb-Mar", mar: "Jan-Feb-Mar",
    };
    return monthToQuarter[month] || text;
  };

  const getFinancialYear = (record = {}) => {
    const direct = record.financial_year ?? record.financialYear ?? record.financial_year_name ??
      record.financialYearName ?? record.fin_year ?? record.finYear ?? record.fy ??
      record.financialyear ?? record.financial_year_label ?? record.fy_name;
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      const value = String(direct).trim();
      const match = value.match(/(20\d{2})\s*[-–/]\s*(20\d{2})/);
      return match ? `${match[1]}-${match[2]}` : value;
    }

    const start = record.financial_year_start ?? record.fy_start_year ?? record.start_year;
    const end = record.financial_year_end ?? record.fy_end_year ?? record.end_year;
    if (start && end) return `${start}-${end}`;

    // If the API provides a calendar year and month, derive the Indian
    // April-to-March financial year instead of showing a blank value.
    const rawYear = record.calendar_year ?? record.year ?? record.record_year;
    const yearMatch = String(rawYear ?? "").match(/^(20\d{2})$/);
    const monthValue = String(record.month ?? record.month_name ?? record.period_month ?? "").trim().toLowerCase();
    if (yearMatch && monthValue) {
      const year = Number(yearMatch[1]);
      const janToMar = ["january", "jan", "february", "feb", "march", "mar"];
      return janToMar.includes(monthValue) ? `${year - 1}-${year}` : `${year}-${year + 1}`;
    }
    return "";
  };

  const normalizeSupplementaryRecord = (record = {}) => ({
    ...record,
    district: record.district ?? record.district_name ?? record.districtName ?? "",
    project: record.project ?? record.project_name ?? record.projectName ?? "",
    sector: record.sector ?? record.sector_name ?? record.sectorName ?? "",
    awc_name: record.awc_name ?? record.awcName ?? record.awc ?? record.anganwadi_name ?? "",
    awc_code: record.awc_code ?? record.awcCode ?? record.awc_id ?? record.awcId ?? "",
    quarter: normalizeQuarter(record.quarter ?? record.trimester ?? record.quarter_name ?? record.month ?? record.month_name),
    financial_year: getFinancialYear(record),
  });

  const normalizeSupplyRecord = (record = {}) => ({
    ...record,
    district: record.district ?? record.district_name ?? record.districtName ?? "",
    project: record.project ?? record.project_name ?? record.projectName ?? "",
    sector: record.sector ?? record.sector_name ?? record.sectorName ?? "",
    awc_name: record.awc_name ?? record.awcName ?? record.awc ?? record.anganwadi_name ?? "",
    awc_code: record.awc_code ?? record.awcCode ?? record.awc_id ?? record.awcId ?? "",
    quarter: normalizeQuarter(record.quarter ?? record.trimester ?? record.quarter_name ?? record.month ?? record.month_name),
    financial_year: getFinancialYear(record),
    food_item: record.food_item ?? record.foodItem ?? record.food_item_name ?? record.item_name ?? "",
    received_quantity: record.received_quantity ?? record.receivedQuantity ?? record.quantity_received ?? record.received ?? 0,
    distributed_quantity: record.distributed_quantity ?? record.distributedQuantity ?? record.quantity_distributed ?? record.distributed ?? 0,
    balance_quantity: record.balance_quantity ?? record.balanceQuantity ?? record.remaining_quantity ?? record.balance ?? 0,
  });

  // When a reconciliation summary omits financial_year, resolve it from the
  // saved Supplementary Nutrition Records using the same project/sector/AWC
  // and trimester. Only use a fallback when it identifies one unambiguous FY.
  const resolveSupplyFinancialYear = (item, level = "project") => {
    const ownFY = getFinancialYear(item);
    if (ownFY) return ownFY;
    const normalized = normalizeSupplyRecord(item);
    const candidates = records
      .map(normalizeSupplementaryRecord)
      .filter((record) => {
        if (normalized.quarter && record.quarter !== normalized.quarter) return false;
        if (level === "project" && normalized.project && record.project !== normalized.project) return false;
        if ((level === "sector" || level === "awc") && normalized.sector && record.sector !== normalized.sector) return false;
        if (level === "awc" && normalized.awc_code && record.awc_code !== normalized.awc_code) return false;
        return Boolean(record.financial_year);
      });
    const years = [...new Set(candidates.map((record) => record.financial_year))];
    return years.length === 1 ? years[0] : "";
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-details/");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.results || response.data?.data || [];
      setRecords(Array.isArray(data) ? data.map(normalizeSupplementaryRecord) : []);
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Supplies Data Fetching (DPO Level - Project, Sector, AWC)
  const fetchSuppliesData = async (type) => {
    const reqId = ++suppliesReqId.current;
    setSuppliesLoading(true);

    try {
      const response = await api.get(`/dpo/${type}-food-reconciliation/`);

      if (reqId !== suppliesReqId.current) return;

      const result = response.data?.results;
      if (!result?.success) {
        throw new Error(
          result?.message ||
            "The reconciliation API returned an unsuccessful response.",
        );
      }
      if (!Array.isArray(result.data)) {
        throw new Error(
          "The reconciliation response does not contain detail records.",
        );
      }

      const projectMonthSummary = result.project_month_summary || [];
      const sectorMonthSummary = result.sector_month_summary || [];

      if (reqId === suppliesReqId.current) {
        setSuppliesRecords({
          projectMonthSummary: projectMonthSummary.map(normalizeSupplyRecord),
          sectorMonthSummary: sectorMonthSummary.map(normalizeSupplyRecord),
        });
        setSuppliesDetailRecords((result.data || []).map(normalizeSupplyRecord));
      }
    } catch (err) {
      if (reqId === suppliesReqId.current) {
        console.error(
          `Failed to fetch ${type.toUpperCase()} supplies data:`,
          err,
        );
        setSuppliesRecords({ projectMonthSummary: [], sectorMonthSummary: [] });
        setSuppliesDetailRecords([]);
      }
    } finally {
      if (reqId === suppliesReqId.current) {
        setSuppliesLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchSuppliesData(suppliesTab);
  }, [suppliesTab]);

  // Unique months and financial years from detail records for filtering
  const suppliesQuarters = useMemo(
    () =>
      [
        ...new Set(
          suppliesDetailRecords.map((record) => record.quarter || record.trimester || record.month).filter(Boolean),
        ),
      ].sort((a, b) => quarterOptions.indexOf(a) - quarterOptions.indexOf(b)),
    [suppliesDetailRecords],
  );
  const suppliesFinancialYears = useMemo(() => {
    const summaryRows = [
      ...(suppliesRecords.projectMonthSummary || []).map((row) => ({ row, level: "project" })),
      ...(suppliesRecords.sectorMonthSummary || []).map((row) => ({ row, level: "sector" })),
    ];
    const years = [
      ...suppliesDetailRecords.map((record) => getFinancialYear(record)),
      ...summaryRows.map(({ row, level }) => resolveSupplyFinancialYear(row, level)),
    ].filter(Boolean);
    return [...new Set(years)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [suppliesDetailRecords, suppliesRecords, records]);

  const filteredDetailRecords = useMemo(() => {
    return suppliesDetailRecords.filter((record) => {
      const quarter = normalizeQuarter(record.quarter || record.trimester || record.month);
      const financialYear = resolveSupplyFinancialYear(record, "awc");
      return (selectedSupplyQuarters.length === 0 || selectedSupplyQuarters.includes(quarter)) &&
        (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(financialYear));
    });
  }, [suppliesDetailRecords, selectedSupplyQuarters, selectedSupplyFYs, records]);

  const suppliesFoodItems = useMemo(() => {
    const items = new Set();
    if (suppliesRecords.projectMonthSummary) {
      suppliesRecords.projectMonthSummary.forEach((row) =>
        items.add(row.food_item),
      );
    }
    if (suppliesRecords.sectorMonthSummary) {
      suppliesRecords.sectorMonthSummary.forEach((row) =>
        items.add(row.food_item),
      );
    }
    return Array.from(items);
  }, [suppliesRecords]);

  const projectSuppliesData = useMemo(() => {
    const projects = {};
    if (!suppliesRecords.projectMonthSummary) return [];
    suppliesRecords.projectMonthSummary.filter((item) => {
      const quarter = normalizeQuarter(item.quarter || item.trimester || item.month);
      const financialYear = resolveSupplyFinancialYear(item, "project");
      return (selectedSupplyQuarters.length === 0 || selectedSupplyQuarters.includes(quarter)) &&
        (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(financialYear));
    }).forEach((item) => {
      const quarter = normalizeQuarter(item.quarter || item.trimester || item.month) || "—";
      const financialYear = resolveSupplyFinancialYear(item, "project");
      const key = `${item.project}|${quarter}|${financialYear}`;
      if (!projects[key]) {
        projects[key] = { project: item.project || "—", quarter, financial_year: financialYear || "—", foodData: {} };
        suppliesFoodItems.forEach((fi) => {
          projects[key].foodData[fi] = {
            received: 0,
            distributed: 0,
            balance: 0,
          };
        });
      }
      if (projects[key].foodData[item.food_item]) {
        projects[key].foodData[item.food_item].received +=
          Number(item.received_quantity) || 0;
        projects[key].foodData[item.food_item].distributed +=
          Number(item.distributed_quantity) || 0;
        projects[key].foodData[item.food_item].balance +=
          Number(item.balance_quantity) || 0;
      }
    });
    return Object.values(projects)
      .map((p) => ({
        ...p,
        foodData: Object.entries(p.foodData).map(([food_item, vals]) => ({
          food_item,
          ...vals,
        })),
      }))
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [suppliesRecords, suppliesFoodItems, selectedSupplyQuarters, selectedSupplyFYs, records]);

  const sectorSuppliesData = useMemo(() => {
    const sectors = {};
    if (!suppliesRecords.sectorMonthSummary) return [];
    suppliesRecords.sectorMonthSummary.filter((item) => {
      const quarter = normalizeQuarter(item.quarter || item.trimester || item.month);
      const financialYear = resolveSupplyFinancialYear(item, "sector");
      return (selectedSupplyQuarters.length === 0 || selectedSupplyQuarters.includes(quarter)) &&
        (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(financialYear));
    }).forEach((item) => {
      const quarter = normalizeQuarter(item.quarter || item.trimester || item.month) || "—";
      const financialYear = resolveSupplyFinancialYear(item, "sector");
      const key = `${item.sector}|${quarter}|${financialYear}`;
      if (!sectors[key]) {
        sectors[key] = { sector: item.sector || "—", quarter, financial_year: financialYear || "—", foodData: {} };
        suppliesFoodItems.forEach((fi) => {
          sectors[key].foodData[fi] = {
            received: 0,
            distributed: 0,
            balance: 0,
          };
        });
      }
      if (sectors[key].foodData[item.food_item]) {
        sectors[key].foodData[item.food_item].received +=
          Number(item.received_quantity) || 0;
        sectors[key].foodData[item.food_item].distributed +=
          Number(item.distributed_quantity) || 0;
        sectors[key].foodData[item.food_item].balance +=
          Number(item.balance_quantity) || 0;
      }
    });
    return Object.values(sectors)
      .map((s) => ({
        ...s,
        foodData: Object.entries(s.foodData).map(([food_item, vals]) => ({
          food_item,
          ...vals,
        })),
      }))
      .sort((a, b) => a.sector.localeCompare(b.sector));
  }, [suppliesRecords, suppliesFoodItems, selectedSupplyQuarters, selectedSupplyFYs, records]);

  const awcSuppliesData = useMemo(() => {
    const awcs = new Map();
    filteredDetailRecords.forEach((record) => {
      const quarter = normalizeQuarter(record.quarter || record.trimester || record.month) || "—";
      const financialYear = resolveSupplyFinancialYear(record, "awc");
      const awcKey = `${record.awc_code}|${record.awc_name}|${record.project}|${record.sector}|${quarter}|${financialYear}`;
      if (!awcs.has(awcKey)) {
        awcs.set(awcKey, {
          awc_code: record.awc_code,
          awc_name: record.awc_name,
          project: record.project,
          sector: record.sector,
          quarter,
          financial_year: financialYear || "—",
          foodData: new Map(),
        });
      }
      const awc = awcs.get(awcKey);
      const quantities = awc.foodData.get(record.food_item) || {
        received: 0,
        distributed: 0,
        balance: 0,
      };
      quantities.received += Number(record.received_quantity) || 0;
      quantities.distributed += Number(record.distributed_quantity) || 0;
      quantities.balance += Number(record.balance_quantity) || 0;
      awc.foodData.set(record.food_item, quantities);
    });

    return Array.from(awcs.values())
      .map((awc) => ({
        ...awc,
        foodData: Array.from(awc.foodData, ([food_item, quantities]) => ({
          food_item,
          ...quantities,
        })),
      }))
      .sort(
        (a, b) =>
          a.project.localeCompare(b.project) ||
          a.sector.localeCompare(b.sector) ||
          a.awc_name.localeCompare(b.awc_name),
      );
  }, [filteredDetailRecords, records]);

  const currentSuppliesData = useMemo(() => {
    switch (suppliesViewMode) {
      case "project":
        return projectSuppliesData;
      case "sector":
        return sectorSuppliesData;
      case "awc":
        return awcSuppliesData;
      default:
        return projectSuppliesData;
    }
  }, [
    suppliesViewMode,
    projectSuppliesData,
    sectorSuppliesData,
    awcSuppliesData,
  ]);

  // Supply API quantities for HCM are stored in kilograms. Display small
  // quantities in grams and larger quantities in kilograms. THR quantities
  // are packet counts and must always be displayed as packets.
  const formatSupplyQuantity = (rawValue) => {
    const value = Number(rawValue) || 0;
    if (suppliesTab === "thr") {
      const packets = Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      return `${packets} packets`;
    }

    const kg = Math.abs(value);
    if (kg === 0) return "0 g";
    if (kg < 1) {
      const grams = value * 1000;
      return `${Number.isInteger(grams) ? grams.toLocaleString() : grams.toLocaleString(undefined, { maximumFractionDigits: 2 })} g`;
    }
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg`;
  };

  const suppliesQuantityHeader = suppliesTab === "hcm" ? "g / kg" : "Packets";

  const suppliesTotals = useMemo(() => {
    const totals = {};
    suppliesFoodItems.forEach((fi) => {
      totals[fi] = { received: 0, distributed: 0, balance: 0 };
    });
    currentSuppliesData.forEach((row) => {
      row.foodData.forEach((fd) => {
        if (totals[fd.food_item]) {
          totals[fd.food_item].received += fd.received || 0;
          totals[fd.food_item].distributed += fd.distributed || 0;
          totals[fd.food_item].balance += fd.balance || 0;
        }
      });
    });
    return totals;
  }, [currentSuppliesData, suppliesFoodItems]);

  const uniqueQuarters = useMemo(
    () => quarterOptions.filter((q) => records.some((r) => (r.quarter || r.trimester || r.month) === q)),
    [records],
  );
  const uniqueFYs = useMemo(
    () =>
      [...new Set(records.map((r) => r.financial_year).filter(Boolean))].sort(),
    [records],
  );
  const uniqueProjects = useMemo(
    () => [...new Set(records.map((r) => r.project).filter(Boolean))].sort(),
    [records],
  );
  const uniqueSectors = useMemo(
    () => [...new Set(records.map((r) => r.sector).filter(Boolean))].sort(),
    [records],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const m =
        selectedQuarters.length === 0 ? true : selectedQuarters.includes(r.quarter || r.trimester || r.month);
      const y =
        selectedFYs.length === 0
          ? true
          : selectedFYs.includes(r.financial_year);
      const p =
        selectedProjects.length === 0
          ? true
          : selectedProjects.includes(r.project);
      const s =
        selectedSectors.length === 0
          ? true
          : selectedSectors.includes(r.sector);
      return m && y && p && s;
    });
  }, [records, selectedQuarters, selectedFYs, selectedProjects, selectedSectors]);

  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return filteredRecords;
    const term = searchTerm.toLowerCase();
    return filteredRecords.filter(
      (r) =>
        ((r.quarter || r.trimester || r.month) || "").toLowerCase().includes(term) ||
        (r.financial_year || "").toLowerCase().includes(term) ||
        (r.district || "").toLowerCase().includes(term) ||
        (r.project || "").toLowerCase().includes(term) ||
        (r.sector || "").toLowerCase().includes(term) ||
        (r.awc_code || "").toLowerCase().includes(term),
    );
  }, [filteredRecords, searchTerm]);

  const summaryStats = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      NUMERIC_AGG_FIELDS.forEach(({ key }) => {
        acc[key] = (acc[key] || 0) + (parseInt(r[key]) || 0);
      });
      return acc;
    }, {});
  }, [filteredRecords]);

  const aggregatedData = useMemo(() => {
    if (!filteredRecords.length) return [];
    const grouped = {};
    filteredRecords.forEach((r) => {
      const groupKey = r[aggregateView] || "—";
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupKey,
          quarters: new Set(),
          fys: new Set(),
          totals: NUMERIC_AGG_FIELDS.reduce(
            (a, { key }) => ({ ...a, [key]: 0 }),
            {},
          ),
        };
      }
      if (r.quarter || r.trimester || r.month) grouped[groupKey].quarters.add(r.quarter || r.trimester || r.month);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => {
        grouped[groupKey].totals[key] += parseInt(r[key]) || 0;
      });
    });
    return Object.values(grouped).map((g) => ({
      groupKey: g.groupKey,
      quarters: quarterOptions.filter((q) => g.quarters.has(q)).concat([...g.quarters].filter((q) => !quarterOptions.includes(q))).join(", "),
      fys: Array.from(g.fys).join(", "),
      ...g.totals,
    }));
  }, [filteredRecords, aggregateView]);

  const totalAggregated = useMemo(() => {
    return NUMERIC_AGG_FIELDS.reduce((acc, { key }) => {
      acc[key] = aggregatedData.reduce((sum, row) => sum + (row[key] || 0), 0);
      return acc;
    }, {});
  }, [aggregatedData]);

  const totalDetailed = useMemo(() => {
    return NUMERIC_AGG_FIELDS.reduce((acc, { key }) => {
      acc[key] = searchedRecords.reduce(
        (sum, row) => sum + (parseInt(row[key]) || 0),
        0,
      );
      return acc;
    }, {});
  }, [searchedRecords]);

  // Pagination logic
  const totalRecords = searchedRecords.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return searchedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedRecords, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleOpenFoodItemModal = async () => {
    setLoadingFoodItems(true);
    setShowFoodItemModal(true);
    try {
      const response = await api.get("/categoryandfooditem/");
      const data = response.data?.food_data || [];

      const hcm = data.filter((item) => item.category === "HCM");
      const thr = data.filter((item) => item.category === "THR");

      setFoodItems({ hcm, thr });
    } catch (err) {
      console.error("Failed to fetch food items:", err);
      setFoodItems({ hcm: [], thr: [] });
    } finally {
      setLoadingFoodItems(false);
    }
  };

  const handleCloseFoodItemModal = () => {
    setShowFoodItemModal(false);
    setFoodItems({ hcm: [], thr: [] });
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  /* --- Export Functions --- */
  const exportSuppliesToExcel = () => {
    const data = currentSuppliesData.map((r, i) => {
      const row = { "S. No.": i + 1 };
      if (suppliesViewMode === "project") {
        row.Project = r.project;
        row.Trimester = r.quarter || "—";
        row["Financial Year"] = r.financial_year || "—";
      } else if (suppliesViewMode === "sector") {
        row.Sector = r.sector;
        row.Trimester = r.quarter || "—";
        row["Financial Year"] = r.financial_year || "—";
      } else {
        row.Project = r.project;
        row.Sector = r.sector;
        row["AWC Name"] = r.awc_name;
        row["AWC Code"] = r.awc_code;
        row.Trimester = r.quarter || "—";
        row["Financial Year"] = r.financial_year || "—";
      }
      suppliesFoodItems.forEach((fi) => {
        const fd = r.foodData.find((f) => f.food_item === fi);
        row[`${fi} - Received (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd ? fd.received : 0);
        row[`${fi} - Distributed (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd ? fd.distributed : 0);
        row[`${fi} - Remaining (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd ? fd.balance : 0);
      });
      return row;
    });

    const totalRow = { "S. No.": "" };
    if (suppliesViewMode === "project") {
      totalRow.Project = "Total";
    } else if (suppliesViewMode === "sector") {
      totalRow.Sector = "Total";
    } else {
      totalRow.Project = "Total";
      totalRow.Sector = "";
      totalRow["AWC Name"] = "";
      totalRow["AWC Code"] = "";
    }
    suppliesFoodItems.forEach((fi) => {
      const t = suppliesTotals[fi] || {
        received: 0,
        distributed: 0,
        balance: 0,
      };
      totalRow[`${fi} - Received (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.received);
      totalRow[`${fi} - Distributed (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.distributed);
      totalRow[`${fi} - Remaining (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.balance);
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.min(Math.max(String(key).length + 2, 12), 28),
    }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    XLSX.writeFile(
      wb,
      `Supplies_${suppliesTab.toUpperCase()}_${suppliesViewMode.charAt(0).toUpperCase() + suppliesViewMode.slice(1)}_Summary.xlsx`,
      { compression: true },
    );
  };

  const handlePDFExport = async (options) => {
    try {
      await downloadPDF(options);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setError("Failed to generate PDF. Please try again.");
    }
  };

  const exportSuppliesToPDF = () => {
    const groupHeaders =
      suppliesViewMode === "project"
        ? [{ text: "Project", rowSpan: 2 }, { text: "Trimester", rowSpan: 2 }, { text: "Financial Year", rowSpan: 2 }]
        : suppliesViewMode === "sector"
          ? [{ text: "Sector", rowSpan: 2 }, { text: "Trimester", rowSpan: 2 }, { text: "Financial Year", rowSpan: 2 }]
          : [
              { text: "Project", rowSpan: 2 },
              { text: "Sector", rowSpan: 2 },
              { text: "AWC Name", rowSpan: 2 },
              { text: "AWC Code", rowSpan: 2 },
              { text: "Trimester", rowSpan: 2 },
              { text: "Financial Year", rowSpan: 2 },
            ];

    const headers = [
      [
        { text: "S. No.", rowSpan: 2 },
        ...groupHeaders,
        ...suppliesFoodItems.map((fi) => ({ text: fi, colSpan: 3 })),
      ],
      [...suppliesFoodItems.flatMap(() => [`Received (${suppliesQuantityHeader})`, `Distributed (${suppliesQuantityHeader})`, `Remaining (${suppliesQuantityHeader})`])],
    ];

    const rows = currentSuppliesData.map((r, i) => [
      i + 1,
      ...(suppliesViewMode === "project"
        ? [r.project, r.quarter || "—", r.financial_year || "—"]
        : suppliesViewMode === "sector"
          ? [r.sector, r.quarter || "—", r.financial_year || "—"]
          : [r.project, r.sector, r.awc_name, r.awc_code, r.quarter || "—", r.financial_year || "—"]),
      ...suppliesFoodItems.flatMap((fi) => {
        const fd = r.foodData.find((f) => f.food_item === fi);
        return fd
          ? [formatSupplyQuantity(fd.received), formatSupplyQuantity(fd.distributed), formatSupplyQuantity(fd.balance)]
          : [formatSupplyQuantity(0), formatSupplyQuantity(0), formatSupplyQuantity(0)];
      }),
    ]);

    const groupColSpan = suppliesViewMode === "awc" ? 6 : 3;
    const footer = [
      [
        { text: "Total", colSpan: 1 + groupColSpan },
        ...suppliesFoodItems.flatMap((fi) => {
          const t = suppliesTotals[fi] || {
            received: 0,
            distributed: 0,
            balance: 0,
          };
          return [
            { text: formatSupplyQuantity(t.received) },
            { text: formatSupplyQuantity(t.distributed) },
            { text: formatSupplyQuantity(t.balance) },
          ];
        }),
      ],
    ];

    const viewModeLabel =
      suppliesViewMode === "project"
        ? "Project-wise"
        : suppliesViewMode === "sector"
          ? "Sector-wise"
          : "AWC-wise";
    return handlePDFExport({
      title: `Supplies ${suppliesTab.toUpperCase()} ${viewModeLabel} Summary`,
      filename: `Supplies_${suppliesTab.toUpperCase()}_${suppliesViewMode.charAt(0).toUpperCase() + suppliesViewMode.slice(1)}_Summary.pdf`,
      headers,
      rows,
      footer,
      fontSize: 9,
    });
  };

  const exportAggToExcel = () => {
    const data = aggregatedData.map((r, i) => ({
      "S. No.": i + 1,
      [aggregateView]: r.groupKey,
      Trimester: r.quarters,
      "Fin. Years": r.fys,
      ...NUMERIC_AGG_FIELDS.reduce(
        (o, f) => ({ ...o, [f.label]: r[f.key] }),
        {},
      ),
    }));
    data.push({
      "S. No.": "",
      [aggregateView]: "Total",
      ...NUMERIC_AGG_FIELDS.reduce(
        (o, f) => ({ ...o, [f.label]: totalAggregated[f.key] }),
        {},
      ),
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.min(Math.max(String(key).length + 2, 12), 28),
    }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `${aggregateView}_Summary.xlsx`, { compression: true });
  };

  const exportAggToPDF = () => {
    const headers = [
      [
        "S. No.",
        aggregateView,
        "Trimester",
        "Fin. Years",
        ...NUMERIC_AGG_FIELDS.map((f) => f.label),
      ],
    ];
    const rows = aggregatedData.map((r, i) => [
      i + 1,
      r.groupKey,
      r.quarters,
      r.fys,
      ...NUMERIC_AGG_FIELDS.map((f) => r[f.key]),
    ]);
    const footer = [
      [
        "",
        "Total",
        "",
        "",
        ...NUMERIC_AGG_FIELDS.map((f) => totalAggregated[f.key]),
      ],
    ];
    return handlePDFExport({
      title: `${aggregateView}-wise Aggregated Summary`,
      filename: `${aggregateView}_Summary.pdf`,
      headers,
      rows,
      footer,
      fontSize: 8,
    });
  };

  /* ── Detailed Records Export (Grant-wise structure) ── */
  const exportDetailsToExcel = () => {
    const cols = TABLE_COLUMNS.filter(
      (c) => c.key !== "_index" && c.key !== "_actions",
    );
    const dataToExport = searchedRecords.map((row, i) => {
      const obj = { "S. No.": i + 1 };
      cols.forEach((c) => (obj[c.label] = row[c.key] || 0));
      return obj;
    });
    const totalObj = { "S. No.": "" };
    cols.forEach((c) => {
      if (c.num || c.strong) totalObj[c.label] = totalDetailed[c.key];
      else totalObj[c.label] = "";
    });
    totalObj[cols[0].label] = "Total";
    dataToExport.push(totalObj);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws["!cols"] = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.min(Math.max(String(key).length + 2, 12), 28),
    }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "Supplementary_Records.xlsx", { compression: true });
  };

  const exportDetailsToPDF = () => {
    const groupHeaders = [
      { text: "S. No.", rowSpan: 2 },
      ...EXCEL_META_COLUMNS.map((col) => ({ text: col.header, rowSpan: 2 })),
      ...GRANT_CATEGORIES.map((cat) => ({ text: cat.title, colSpan: 4 })),
      { text: "SUPPLEMENTARY NUTRITION DETAILS", colSpan: FOOD_FIELDS.length },
    ];
    const subHeaders = [
      ...GRANT_CATEGORIES.flatMap(() => [
        "Grant 15",
        "Grant 30",
        "Grant 31",
        "TOTAL",
      ]),
      ...FOOD_FIELDS.map((f) => f.header),
    ];
    const headers = [groupHeaders, subHeaders];

    const rows = searchedRecords.map((r, i) => {
      const row = [i + 1];
      EXCEL_META_COLUMNS.forEach((col) => row.push(r[col.key] || "—"));
      GRANT_CATEGORIES.forEach((cat) => {
        const grantValues = Array.isArray(r[cat.grantKey]) ? r[cat.grantKey] : [];
        [0, 1, 2].forEach((grantIndex) =>
          row.push(Number(grantValues[grantIndex] ?? 0).toLocaleString()),
        );
        row.push(Number(r[cat.countKey] ?? 0).toLocaleString());
      });
      FOOD_FIELDS.forEach((f) =>
        row.push(Number(r[f.key] || 0).toLocaleString()),
      );
      return row;
    });

    const footer = [
      [
        { text: "", colSpan: 1 + EXCEL_META_COLUMNS.length },
        ...GRANT_CATEGORIES.flatMap((cat) => [
          { text: "" },
          { text: "" },
          { text: "" },
          { text: totalDetailed[cat.countKey]?.toLocaleString() || 0 },
        ]),
        ...FOOD_FIELDS.map((f) => ({
          text: totalDetailed[f.key]?.toLocaleString() || 0,
        })),
      ],
    ];

    return handlePDFExport({
      title: "Supplementary Nutrition Records",
      filename: "Supplementary_Records.pdf",
      headers,
      rows,
      footer,
      fontSize: 7,
    });
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

        <Container fluid className="mt-3">
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {/* DPO Purple Header Section */}
          <div className="dashboard-header-section">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Supplementary Nutrition Overview
              </h4>
              <p className="dashboard-subtitle">
                View aggregated and detailed supplementary nutrition data across
                sectors and projects.
              </p>
            </div>
            <Button
              className="dpo-btn-light"
              onClick={fetchData}
              disabled={loading}
            >
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          {/* Compact Multi-Select Filter Bar */}
          <div className="dpo-filter-bar">
            <MultiSelectDropdown
              label="Trimester"
              options={uniqueQuarters}
              selected={selectedQuarters}
              onChange={setSelectedQuarters}
            />
            <MultiSelectDropdown
              label="Financial Year"
              options={uniqueFYs}
              selected={selectedFYs}
              onChange={setSelectedFYs}
            />
            <MultiSelectDropdown
              label="Project"
              options={uniqueProjects}
              selected={selectedProjects}
              onChange={setSelectedProjects}
            />
            <MultiSelectDropdown
              label="Sector"
              options={uniqueSectors}
              selected={selectedSectors}
              onChange={setSelectedSectors}
            />
            <Button
              variant="outline-secondary"
              size="sm"
              className="dpo-filter-reset"
              onClick={() => {
                setSelectedQuarters([]);
                setSelectedFYs([]);
                setSelectedProjects([]);
                setSelectedSectors([]);
              }}
            >
              Reset
            </Button>
            <Button
              className="dpo-export-btn"
              onClick={handleOpenFoodItemModal}
              title="View Food Items"
            >
              <FaUtensils className="text-primary" /> Food Items
            </Button>
          </div>

          {summaryStats && (
            <div className="dpo-stat-strip">
              {SUMMARY_PILLS.map((field) => (
                <div key={field.key} className="dpo-stat-pill">
                  <span className="dpo-stat-pill-icon">{field.icon}</span>
                  <span className="dpo-stat-pill-label">{field.label}</span>
                  <span className="dpo-stat-pill-value">
                    {summaryStats[field.key]?.toLocaleString() || 0}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Supplies Received & Distributed Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Supplies Received & Distributed Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button
                    className={`dpo-toggle-btn ${suppliesTab === "thr" ? "active" : ""}`}
                    onClick={() => {
                      setSuppliesTab("thr");
                      setSelectedSupplyQuarters([]);
                      setSelectedSupplyFYs([]);
                    }}
                  >
                    THR
                  </Button>
                  <Button
                    className={`dpo-toggle-btn ${suppliesTab === "hcm" ? "active" : ""}`}
                    onClick={() => {
                      setSuppliesTab("hcm");
                      setSelectedSupplyQuarters([]);
                      setSelectedSupplyFYs([]);
                    }}
                  >
                    HCM
                  </Button>
                </ButtonGroup>
                <ButtonGroup
                  className="dpo-toggle-group"
                  style={{ marginLeft: "8px", marginRight: "8px" }}
                >
                  <Button
                    className={`dpo-toggle-btn ${suppliesViewMode === "project" ? "active" : ""}`}
                    onClick={() => setSuppliesViewMode("project")}
                    title="Project-wise"
                  >
                    Project
                  </Button>
                  <Button
                    className={`dpo-toggle-btn ${suppliesViewMode === "sector" ? "active" : ""}`}
                    onClick={() => setSuppliesViewMode("sector")}
                    title="Sector-wise"
                  >
                    Sector
                  </Button>
                  <Button
                    className={`dpo-toggle-btn ${suppliesViewMode === "awc" ? "active" : ""}`}
                    onClick={() => setSuppliesViewMode("awc")}
                    title="AWC-wise"
                  >
                    AWC
                  </Button>
                </ButtonGroup>
                <MultiSelectDropdown
                  label="Trimester"
                  options={suppliesQuarters}
                  selected={selectedSupplyQuarters}
                  onChange={setSelectedSupplyQuarters}
                />
                <MultiSelectDropdown
                  label="Financial Year"
                  options={suppliesFinancialYears}
                  selected={selectedSupplyFYs}
                  onChange={setSelectedSupplyFYs}
                />
                {(selectedSupplyQuarters.length > 0 ||
                  selectedSupplyFYs.length > 0) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="dpo-filter-reset"
                    onClick={() => {
                      setSelectedSupplyQuarters([]);
                      setSelectedSupplyFYs([]);
                    }}
                  >
                    Reset
                  </Button>
                )}
                <div className="dpo-export-btns">
                  <Button
                    className="dpo-export-btn"
                    onClick={exportSuppliesToExcel}
                  >
                    <FaFileExcel className="text-success" /> Excel
                  </Button>
                  <Button
                    className="dpo-export-btn"
                    onClick={exportSuppliesToPDF}
                  >
                    <FaFilePdf className="text-danger" /> PDF
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {suppliesLoading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th rowSpan="2">S. No.</th>
                        {suppliesViewMode === "project" ? (
                          <>
                            <th rowSpan="2">Project</th>
                            <th rowSpan="2">Trimester</th>
                            <th rowSpan="2">Financial Year</th>
                          </>
                        ) : suppliesViewMode === "sector" ? (
                          <>
                            <th rowSpan="2">Sector</th>
                            <th rowSpan="2">Trimester</th>
                            <th rowSpan="2">Financial Year</th>
                          </>
                        ) : (
                          <>
                            <th rowSpan="2">Project</th>
                            <th rowSpan="2">Sector</th>
                            <th rowSpan="2">AWC Name</th>
                            <th rowSpan="2">AWC Code</th>
                            <th rowSpan="2">Trimester</th>
                            <th rowSpan="2">Financial Year</th>
                          </>
                        )}
                        {suppliesFoodItems.map((fi, idx) => (
                          <th
                            key={`fi-${idx}`}
                            colSpan="3"
                            className="text-center"
                            style={{ borderLeft: "1px solid #e9d5ff" }}
                          >
                            {fi}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {suppliesFoodItems.map((fi, idx) => (
                          <React.Fragment key={`sub-${idx}`}>
                            <th className="text-end">Received ({suppliesQuantityHeader})</th>
                            <th className="text-end">Distributed ({suppliesQuantityHeader})</th>
                            <th className="text-end">Remaining ({suppliesQuantityHeader})</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSuppliesData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              suppliesViewMode === "awc"
                                ? 7 + suppliesFoodItems.length * 3
                                : 4 + suppliesFoodItems.length * 3
                            }
                            className="text-center p-4 text-muted"
                          >
                            No data available
                          </td>
                        </tr>
                      ) : (
                        currentSuppliesData.map((row, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            {suppliesViewMode === "project" ? (
                              <>
                                <td><strong>{row.project}</strong></td>
                                <td>{row.quarter || "—"}</td><td>{row.financial_year || "—"}</td>
                              </>
                            ) : suppliesViewMode === "sector" ? (
                              <>
                                <td><strong>{row.sector}</strong></td>
                                <td>{row.quarter || "—"}</td><td>{row.financial_year || "—"}</td>
                              </>
                            ) : (
                              <>
                                <td>{row.project}</td>
                                <td>{row.sector}</td>
                                <td>
                                  <strong>{row.awc_name}</strong>
                                </td>
                                <td>{row.awc_code}</td>
                                <td>{row.quarter || "—"}</td><td>{row.financial_year || "—"}</td>
                              </>
                            )}
                            {suppliesFoodItems.map((fi, idx) => {
                              const fd = row.foodData.find(
                                (f) => f.food_item === fi,
                              );
                              return (
                                <React.Fragment key={`data-${idx}`}>
                                  <td className="text-end">
                                    {formatSupplyQuantity(fd ? fd.received : 0)}
                                  </td>
                                  <td className="text-end">
                                    {formatSupplyQuantity(fd ? fd.distributed : 0)}
                                  </td>
                                  <td className="text-end text-primary">
                                    <strong>
                                      {formatSupplyQuantity(fd ? fd.balance : 0)}
                                    </strong>
                                  </td>
                                </React.Fragment>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {currentSuppliesData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th colSpan={suppliesViewMode === "awc" ? 7 : 4} className="text-start">
                            Total
                          </th>
                          {suppliesFoodItems.map((fi, idx) => {
                            const t = suppliesTotals[fi] || {
                              received: 0,
                              distributed: 0,
                              balance: 0,
                            };
                            return (
                              <React.Fragment key={`foot-${idx}`}>
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
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Aggregated Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaLayerGroup />{" "}
                {aggregateView === "sector" ? "Sector-wise" : "Project-wise"}{" "}
                Aggregated Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button
                    className={`dpo-toggle-btn ${aggregateView === "project" ? "active" : ""}`}
                    onClick={() => setAggregateView("project")}
                  >
                    Project-wise
                  </Button>
                  <Button
                    className={`dpo-toggle-btn ${aggregateView === "sector" ? "active" : ""}`}
                    onClick={() => setAggregateView("sector")}
                  >
                    Sector-wise
                  </Button>
                </ButtonGroup>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportAggToExcel}>
                    <FaFileExcel className="text-success" /> Excel
                  </Button>
                  <Button className="dpo-export-btn" onClick={exportAggToPDF}>
                    <FaFilePdf className="text-danger" /> PDF
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        <th style={{ textTransform: "capitalize" }}>
                          {aggregateView}
                        </th>
                        <th>Months</th>
                        <th>Fin. Years</th>
                        {NUMERIC_AGG_FIELDS.map((col, i) => (
                          <th key={i} className="text-end">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={NUMERIC_AGG_FIELDS.length + 4}
                            className="text-center p-4 text-muted"
                          >
                            No data available
                          </td>
                        </tr>
                      ) : (
                        aggregatedData.map((row, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>
                              <strong>{row.groupKey}</strong>
                            </td>
                            <td>{row.months}</td>
                            <td>{row.fys}</td>
                            {NUMERIC_AGG_FIELDS.map((col, c) => (
                              <td key={c} className="text-end">
                                {row[col.key]?.toLocaleString() || 0}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {aggregatedData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          <th>Total</th>
                          <th></th>
                          <th></th>
                          {NUMERIC_AGG_FIELDS.map((col, c) => (
                            <th key={c} className="text-end">
                              {totalAggregated[col.key]?.toLocaleString() || 0}
                            </th>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* ─── Detailed Records Table (Grant-wise Structure) ─── */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaChartBar /> Detailed Records
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <InputGroup style={{ maxWidth: "300px" }}>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search AWC, District, Trimester..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <div className="dpo-export-btns">
                  <Button
                    className="dpo-export-btn"
                    onClick={exportDetailsToExcel}
                  >
                    <FaFileExcel className="text-success" /> Excel
                  </Button>
                  <Button
                    className="dpo-export-btn"
                    onClick={exportDetailsToPDF}
                  >
                    <FaFilePdf className="text-danger" /> PDF
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper" style={{ overflowX: "auto" }}>
                {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <Table
                    hover
                    className="dpo-data-table mb-0 dpo-grant-master-table"
                    style={{
                      minWidth: "2400px",
                      borderCollapse: "separate",
                      borderSpacing: 0,
                    }}
                  >
                    <thead>
                      <tr>
                        <th rowSpan={2} className="text-center align-middle">
                          S. No.
                        </th>
                        {EXCEL_META_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            rowSpan={2}
                            className="text-center align-middle"
                          >
                            {col.header}
                          </th>
                        ))}
                        {GRANT_CATEGORIES.map((cat) => (
                          <th
                            key={cat.countKey}
                            colSpan={4}
                            className="text-center align-middle dpo-grant-group-header"
                          >
                            {cat.title}
                          </th>
                        ))}
                        <th
                          colSpan={FOOD_FIELDS.length}
                          className="text-center align-middle dpo-food-group-header"
                        >
                          SUPPLEMENTARY NUTRITION DETAILS
                        </th>
                      </tr>
                      <tr>
                        {GRANT_CATEGORIES.flatMap((cat) =>
                          [15, 30, 31]
                            .map((grantId) => (
                              <th
                                key={`${cat.countKey}-${grantId}`}
                                className="text-center"
                              >
                                Grant {grantId}
                              </th>
                            ))
                            .concat([
                              <th
                                key={`${cat.countKey}-total`}
                                className="text-center"
                              >
                                TOTAL
                              </th>,
                            ]),
                        )}
                        {FOOD_FIELDS.map((food) => (
                          <th key={food.key} className="text-center">
                            {food.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              1 +
                              EXCEL_META_COLUMNS.length +
                              GRANT_CATEGORIES.length * 4 +
                              FOOD_FIELDS.length
                            }
                            className="text-center py-5 text-muted"
                          >
                            No records found.
                          </td>
                        </tr>
                      ) : (
                        paginatedRecords.map((record, index) => (
                          <tr key={record.id || index}>
                            <td className="text-center text-muted">
                              {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                            {EXCEL_META_COLUMNS.map((col) => (
                              <td
                                key={col.key}
                                className={
                                  col.key === "quarter" ? "text-center" : ""
                                }
                              >
                                {col.key === "quarter" && (record.quarter || record.trimester || record.month) ? (
                                  <Badge className="dpo-month-badge">
                                    {record.quarter || record.trimester || record.month}
                                  </Badge>
                                ) : (
                                  record[col.key] || "—"
                                )}
                              </td>
                            ))}
                            {GRANT_CATEGORIES.flatMap((cat) => {
                              // The API stores the entered amounts in order:
                              // [Grant 15 amount, Grant 30 amount, Grant 31 amount].
                              // These are values, not grant IDs; display each by its column index.
                              const grantValues = Array.isArray(record[cat.grantKey])
                                ? record[cat.grantKey]
                                : [];
                              return [15, 30, 31]
                                .map((grantId, grantIndex) => (
                                  <td
                                    key={`${cat.countKey}-${grantId}`}
                                    className="text-center dpo-grant-cell"
                                  >
                                    {Number(grantValues[grantIndex] ?? 0).toLocaleString()}
                                  </td>
                                ))
                                .concat([
                                  <td
                                    key={`${cat.countKey}-total`}
                                    className="text-end fw-semibold dpo-total-cell"
                                  >
                                    {Number(record[cat.countKey] ?? 0).toLocaleString()}
                                  </td>,
                                ]);
                            })}
                            {FOOD_FIELDS.map((food) => (
                              <td key={food.key} className="text-end">
                                {Number(record[food.key] || 0).toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {searchedRecords.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          {EXCEL_META_COLUMNS.map((col, idx) => (
                            <th key={col.key}>{idx === 0 ? "TOTAL" : ""}</th>
                          ))}
                          {GRANT_CATEGORIES.flatMap((cat) => [
                            <th key={`${cat.countKey}-g15`}></th>,
                            <th key={`${cat.countKey}-g30`}></th>,
                            <th key={`${cat.countKey}-g31`}></th>,
                            <th
                              key={`${cat.countKey}-total`}
                              className="text-end"
                            >
                              {totalDetailed[cat.countKey]?.toLocaleString() ||
                                0}
                            </th>,
                          ])}
                          {FOOD_FIELDS.map((food) => (
                            <th key={food.key} className="text-end">
                              {totalDetailed[food.key]?.toLocaleString() || 0}
                            </th>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
            </Card.Body>
            {totalRecords > 0 && (
              <Card.Footer className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-3 px-4">
                <span className="small text-muted">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                  {totalRecords} entries
                </span>
                <Pagination size="sm" className="mb-0">
                  <Pagination.Prev
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  />
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let startPage = Math.max(
                      1,
                      Math.min(currentPage - 2, totalPages - 4),
                    );
                    const page = startPage + i;
                    if (page > totalPages) return null;
                    return (
                      <Pagination.Item
                        key={page}
                        active={page === currentPage}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Pagination.Item>
                    );
                  })}
                  <Pagination.Next
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  />
                </Pagination>
              </Card.Footer>
            )}
          </Card>
        </Container>
      </div>

      {/* Food Items Modal */}
      <Modal
        show={showFoodItemModal}
        onHide={handleCloseFoodItemModal}
        centered
        className="fs-modal"
        size="lg"
      >
        <Modal.Header closeButton className="fs-modal-header">
          <Modal.Title>
            <FaUtensils className="me-2 text-primary" /> Food Items List
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {loadingFoodItems ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading food items...</p>
            </div>
          ) : (
            <Tabs
              defaultActiveKey="hcm"
              id="food-items-modal-tabs"
              className="mb-3"
            >
              <Tab
                eventKey="hcm"
                title={`HCM Food Items (${foodItems.hcm?.length || 0})`}
              >
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Food Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.hcm?.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted p-4">
                          No HCM items found.
                        </td>
                      </tr>
                    ) : (
                      foodItems.hcm?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{item.food_item}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Tab>
              <Tab
                eventKey="thr"
                title={`THR Food Items (${foodItems.thr?.length || 0})`}
              >
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Food Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.thr?.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center text-muted p-4">
                          No THR items found.
                        </td>
                      </tr>
                    ) : (
                      foodItems.thr?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{item.food_item}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button
            variant="light"
            onClick={handleCloseFoodItemModal}
            className="dpo-btn-light px-4"
          >
            <FaTimes className="me-1" /> Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DPODashboard;
