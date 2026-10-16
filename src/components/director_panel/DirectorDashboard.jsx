import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Form, Button, ButtonGroup, InputGroup, Dropdown, Pagination, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/directorleftnav.css";
import "../../assets/css/dpo.css"; 

import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

import { FaUsers, FaUserFriends, FaBaby, FaChartBar, FaLayerGroup, FaFileExcel, FaFilePdf, FaSyncAlt, FaSearch, FaBoxes, FaChevronDown, FaWarehouse, FaBox } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

const ITEMS_PER_PAGE = 100;
const quarterOptions = ["Apr-May-Jun", "Jul-Aug-Sep", "Oct-Nov-Dec", "Jan-Feb-Mar"];
const normalizeQuarter = (raw) => {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const canonical = quarterOptions.find(q => q.toLowerCase() === value.toLowerCase());
  if (canonical) return canonical;
  const monthMap = {jan:3,feb:3,mar:3,apr:0,may:0,jun:0,jul:1,aug:1,sep:1,oct:2,nov:2,dec:2};
  const index = monthMap[value.toLowerCase().slice(0,3)];
  return index === undefined ? value : quarterOptions[index];
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
  const rawYear = record.calendar_year ?? record.year ?? record.record_year;
  const yearMatch = String(rawYear ?? "").match(/^(20\d{2})$/);
  const month = String(record.month ?? record.month_name ?? record.period_month ?? "").trim().toLowerCase();
  if (yearMatch && month) {
    const year = Number(yearMatch[1]);
    return ["january", "jan", "february", "feb", "march", "mar"].includes(month)
      ? `${year - 1}-${year}` : `${year}-${year + 1}`;
  }
  return "";
};

// Match the DPO Dashboard's API field normalization so the same backend
// records populate Director Dashboard metadata and nutrition columns.
const normalizeRecord = (r = {}) => ({
  ...r,
  district: r.district ?? r.district_name ?? r.districtName ?? "",
  project: r.project ?? r.project_name ?? r.projectName ?? "",
  sector: r.sector ?? r.sector_name ?? r.sectorName ?? "",
  awc_name: r.awc_name ?? r.awcName ?? r.awc ?? r.anganwadi_name ?? r.anganwadiName ?? "",
  awc_code: r.awc_code ?? r.awcCode ?? r.awc_id ?? r.awcId ?? "",
  quarter: normalizeQuarter(r.quarter ?? r.trimester ?? r.quarter_name ?? r.month ?? r.month_name),
  financial_year: getFinancialYear(r),
  food_item: r.food_item ?? r.foodItem ?? r.food_item_name ?? r.item_name ?? "",
  received_quantity: Number(r.received_quantity ?? r.receivedQuantity ?? r.quantity_received ?? r.received ?? 0) || 0,
  distributed_quantity: Number(r.distributed_quantity ?? r.distributedQuantity ?? r.quantity_distributed ?? r.distributed ?? 0) || 0,
  balance_quantity: Number(r.balance_quantity ?? r.balanceQuantity ?? r.remaining_quantity ?? r.balance ?? 0) || 0,
});

/* ── Grant-wise Table schema (mirrors FoodSupplementary) ── */
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
const FOOD_FIELDS_BY_CATEGORY = {
  pregnant_woman_lactating_mother: [
    FOOD_FIELDS.find((field) => field.key === "poushik_sattu_preg_lat"),
  ],
  children_6m_3y: [
    FOOD_FIELDS.find((field) => field.key === "panjeeri_6m_3y"),
  ],
  sam_children_6m_5y_suw_children_6m_6y: [
    FOOD_FIELDS.find((field) => field.key === "panjeeri_sam_6m_5y_suw_6m_6y"),
  ],
  sam_children_3y_5y_suw_children_3y_6y: [
    FOOD_FIELDS.find((field) => field.key === "sattu_sam_3y_5y_suw_3y_6y"),
  ],
  hcm_beneficiaries_3y_6y: [
    FOOD_FIELDS.find((field) => field.key === "mung_dal_khichdi_3y_6y"),
    FOOD_FIELDS.find((field) => field.key === "multi_grain_aata_3y_6y"),
  ],
};

const getCategoryFoodFields = (category) =>
  (FOOD_FIELDS_BY_CATEGORY[category.countKey] || []).filter(Boolean);

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
  { label: "Pregnant/Lactating", key: "pregnant_woman_lactating_mother", num: true },
  { label: "Poushik Sattu", key: "poushik_sattu_preg_lat", num: true },
  { label: "Children 6m-3y", key: "children_6m_3y", num: true },
  { label: "Panjeeri 6m-3y", key: "panjeeri_6m_3y", num: true },
  { label: "SAM 6m-5y / SUW 6m-6y", key: "sam_children_6m_5y_suw_children_6m_6y", num: true },
  { label: "Panjeeri SAM/SUW", key: "panjeeri_sam_6m_5y_suw_6m_6y", num: true },
  { label: "SAM 3y-5y / SUW 3y-6y", key: "sam_children_3y_5y_suw_children_3y_6y", num: true },
  { label: "Sattu SAM/SUW", key: "sattu_sam_3y_5y_suw_3y_6y", num: true },
  { label: "HCM 3y-6y", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "Mung Dal Khichdi", key: "mung_dal_khichdi_3y_6y", num: true },
  { label: "Multi Grain Aata", key: "multi_grain_aata_3y_6y", num: true },
];

const NUMERIC_AGG_FIELDS = TABLE_COLUMNS.filter(c => c.num || c.strong);

let hindiPdfFontPromise;

const loadHindiPdfFont = async () => {
  if (!hindiPdfFontPromise) {
    hindiPdfFontPromise = new Promise((resolve) => {
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap";
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

const downloadPDF = async ({ title, filename, headers, rows, footer, fontSize }) => {
  const content = document.createElement("div");
  content.style.cssText = "box-sizing:border-box;width:100%;padding:12px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI',sans-serif;";

  const heading = document.createElement("h3");
  heading.textContent = title;
  heading.style.cssText = "margin:0 0 14px;text-align:center;color:#1e3a5f;font-size:16px;font-weight:700;";
  content.appendChild(heading);

  const table = document.createElement("table");
  table.style.cssText = `width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}px;line-height:1.25;`;
  table.style.pageBreakInside = "auto";
  table.style.breakInside = "auto";

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);
    const value = typeof cell === "object" && cell !== null ? cell : { text: cell };
    element.textContent = value.text == null ? "" : String(value.text);
    if (value.colSpan) element.colSpan = value.colSpan;
    if (value.rowSpan) element.rowSpan = value.rowSpan;
    element.style.cssText = "border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:middle;overflow-wrap:anywhere;word-break:normal;";
    return element;
  };

  const thead = document.createElement("thead");
  headers.forEach((headerRow, rowIndex) => {
    const row = document.createElement("tr");
    headerRow.forEach((cell) => {
      const header = createCell("th", cell);
      header.style.cssText += `;background-color:${rowIndex === 0 ? "#4f46e5" : "#e0e7ff"};color:${rowIndex === 0 ? "#fff" : "#312e81"};border-color:${rowIndex === 0 ? "#4338ca" : "#a5b4fc"};padding:6px 4px;text-align:center;font-weight:700;font-size:${Math.max(fontSize, 8)}px;line-height:1.25;white-space:normal;`;
      row.appendChild(header);
    });
    row.style.pageBreakInside = "avoid";
    row.style.breakInside = "avoid";
    thead.appendChild(row);
  });
  thead.style.display = "table-header-group";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.style.display = "table-row-group";
  rows.forEach((values) => {
    const row = document.createElement("tr");
    values.forEach((value) => row.appendChild(createCell("td", value)));
    // Keep each record together on a single PDF page instead of splitting it
    // between the bottom of one page and the top of the next.
    row.style.pageBreakInside = "avoid";
    row.style.breakInside = "avoid";
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
        // Safe margins keep rows away from the page edges. A moderate canvas
        // scale and JPEG quality reduce file size without making text blurry.
        margin: [12, 8, 12, 8],
        filename,
        image: { type: "jpeg", quality: 0.84 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: Math.max(document.documentElement.clientWidth, content.scrollWidth),
        },
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape", compress: true },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead", "tfoot"] }
      })
      .from(content)
      .save();
  } finally {
    content.remove();
  }
};

const SUMMARY_PILLS = [
  { key: "pregnant_woman_lactating_mother", label: "Preg/Lact", icon: <FaBaby size={10} /> },
  { key: "poushik_sattu_preg_lat", label: "Poushik Sattu", icon: <FaBoxes size={10} /> },
  { key: "children_6m_3y", label: "Children 6m-3y", icon: <FaBaby size={10} /> },
  { key: "panjeeri_6m_3y", label: "Panjeeri 6m-3y", icon: <FaBoxes size={10} /> },
  { key: "sam_children_6m_5y_suw_children_6m_6y", label: "SAM/SUW 6m-6y", icon: <FaBaby size={10} /> },
  { key: "panjeeri_sam_6m_5y_suw_6m_6y", label: "Panjeeri SAM/SUW", icon: <FaBoxes size={10} /> },
  { key: "sam_children_3y_5y_suw_children_3y_6y", label: "SAM/SUW 3y-6y", icon: <FaBaby size={10} /> },
  { key: "sattu_sam_3y_5y_suw_3y_6y", label: "Sattu SAM/SUW", icon: <FaBoxes size={10} /> },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3y-6y", icon: <FaUsers size={10} /> },
  { key: "mung_dal_khichdi_3y_6y", label: "Mung Dal", icon: <FaBoxes size={10} /> },
  { key: "multi_grain_aata_3y_6y", label: "Multi Grain Aata", icon: <FaBoxes size={10} /> },
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
    <div className="dpo-filter-group" style={{ position: 'relative', zIndex: 20 }}>
      <Form.Label className="dpo-filter-label">{label}</Form.Label>
      <Dropdown autoClose="outside">
        <Dropdown.Toggle size="sm" variant="light" className="dpo-multi-toggle">
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getLabel()}</span>
          <FaChevronDown className="dpo-multi-caret" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="dpo-multi-menu">
          {options.length === 0 ? (
            <Dropdown.Item disabled>No options</Dropdown.Item>
          ) : (
            options.map((opt) => (
              <div key={opt} className="dpo-multi-item" onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}>
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

const DirectorDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();

  // Food Items State
  const [hcmFoodItemsCount, setHcmFoodItemsCount] = useState(0);
  const [thrFoodItemsCount, setThrFoodItemsCount] = useState(0);

  // DPO Data States
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-Select States
  const [selectedQuarters, setSelectedQuarters] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  
  const [aggregateView, setAggregateView] = useState("sector");

  // Pagination States
  const [aggPage, setAggPage] = useState(1);
  const [detailsPage, setDetailsPage] = useState(1);

  // Supplies Dynamic States
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesViewMode, setSuppliesViewMode] = useState("district");
  const [suppliesRecords, setSuppliesRecords] = useState({});
  const [suppliesDetailRecords, setSuppliesDetailRecords] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [selectedSupplyQuarters, setSelectedSupplyQuarters] = useState([]);
  const [selectedSupplyFYs, setSelectedSupplyFYs] = useState([]);

  // Race condition prevention for API calls
  const suppliesReqId = useRef(0);

  // A single fixed horizontal scrollbar follows whichever Director table is
  // currently visible. Its scroll range is matched exactly to the active table.
  useEffect(() => {
    const bar = document.createElement("div");
    const inner = document.createElement("div");
    bar.className = "director-sticky-horizontal-scroll";
    bar.setAttribute("aria-label", "Horizontal table scrollbar");
    bar.style.cssText = [
      "position:fixed", "left:260px", "right:12px", "bottom:4px", "height:22px",
      "overflow-x:auto", "overflow-y:hidden", "z-index:2000",
      "background:#f8fafc", "border:1px solid #94a3b8",
      "border-radius:6px", "box-shadow:0 2px 8px rgba(15,23,42,.22)",
      "display:none", "scrollbar-width:auto", "box-sizing:border-box",
      "overscroll-behavior-x:contain", "-webkit-overflow-scrolling:touch"
    ].join(";");
    inner.style.cssText = "height:2px;min-height:2px;pointer-events:none;";
    bar.appendChild(inner);
    document.body.appendChild(bar);

    let activeWrapper = null;
    let syncing = false;
    let rafId = 0;
    const boundWrappers = new Set();
    const observedWrappers = new Set();
    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => scheduleChooseActive()) : null;

    const getWrappers = () => Array.from(document.querySelectorAll(
      ".director-table-wrapper"
    )).filter((el) => el.querySelector("table"));

    const measure = (wrapper) => {
      const table = wrapper.querySelector("table");
      const rect = wrapper.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
      const contentWidth = Math.ceil(Math.max(
        table?.scrollWidth || 0,
        table?.offsetWidth || 0,
        table?.getBoundingClientRect().width || 0,
        wrapper.scrollWidth || 0
      ));
      return {
        wrapper, rect, visibleHeight, contentWidth,
        overflow: contentWidth > wrapper.clientWidth + 2
      };
    };

    const chooseActive = () => {
      rafId = 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const candidates = getWrappers().map(measure)
        .filter((item) => item.visibleHeight > 20 && item.overflow);

      // Prefer the table crossing the viewport centre, otherwise the most
      // visible table. This also makes the scrollbar switch when reaching table 2.
      candidates.sort((a, b) => {
        const aCenter = a.rect.top <= viewportHeight / 2 && a.rect.bottom >= viewportHeight / 2;
        const bCenter = b.rect.top <= viewportHeight / 2 && b.rect.bottom >= viewportHeight / 2;
        if (aCenter !== bCenter) return aCenter ? -1 : 1;
        if (a.visibleHeight !== b.visibleHeight) return b.visibleHeight - a.visibleHeight;
        return Math.abs((a.rect.top + a.rect.bottom) / 2 - viewportHeight / 2) -
          Math.abs((b.rect.top + b.rect.bottom) / 2 - viewportHeight / 2);
      });

      const selected = candidates[0];
      activeWrapper = selected?.wrapper || null;
      if (!selected) {
        bar.style.display = "none";
        return;
      }

      // Match the fixed scrollbar's scroll range to the table's scroll range.
      // Using bar.clientWidth + tableOverflow avoids thumb/track length mismatch
      // when the dashboard sidebar makes the fixed bar narrower than the table.
      bar.style.left = window.innerWidth < 768 ? "8px" : "260px";
      bar.style.right = "8px";
      bar.style.display = "block";
      const tableMaxScroll = Math.max(0, activeWrapper.scrollWidth - activeWrapper.clientWidth);
      const barContentWidth = Math.ceil(bar.clientWidth + tableMaxScroll);
      inner.style.width = `${barContentWidth}px`;
      inner.style.minWidth = `${barContentWidth}px`;
      const barMaxScroll = Math.max(0, bar.scrollWidth - bar.clientWidth);
      if (barMaxScroll > 0 && tableMaxScroll > 0) {
        const target = activeWrapper.scrollLeft * barMaxScroll / tableMaxScroll;
        if (Math.abs(bar.scrollLeft - target) > 1) bar.scrollLeft = target;
      } else {
        bar.scrollLeft = 0;
      }
    };

    function scheduleChooseActive() {
      if (!rafId) rafId = window.requestAnimationFrame(chooseActive);
    }

    const onBarScroll = () => {
      if (!activeWrapper || syncing) return;
      syncing = true;
      const maxBarScroll = Math.max(0, bar.scrollWidth - bar.clientWidth);
      const maxTableScroll = Math.max(0, activeWrapper.scrollWidth - activeWrapper.clientWidth);
      activeWrapper.scrollLeft = maxBarScroll > 0
        ? bar.scrollLeft * maxTableScroll / maxBarScroll : 0;
      syncing = false;
    };

    const onWrapperScroll = (event) => {
      const wrapper = event.currentTarget;
      if (syncing) return;
      if (wrapper !== activeWrapper) {
        scheduleChooseActive();
        return;
      }
      syncing = true;
      const maxTableScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
      const maxBarScroll = Math.max(0, bar.scrollWidth - bar.clientWidth);
      bar.scrollLeft = maxTableScroll > 0
        ? wrapper.scrollLeft * maxBarScroll / maxTableScroll : 0;
      syncing = false;
    };

    const bindWrappers = () => {
      getWrappers().forEach((wrapper) => {
        if (!boundWrappers.has(wrapper)) {
          wrapper.addEventListener("scroll", onWrapperScroll, { passive: true });
          boundWrappers.add(wrapper);
        }
        if (!observedWrappers.has(wrapper)) {
          resizeObserver?.observe(wrapper);
          const table = wrapper.querySelector("table");
          if (table) resizeObserver?.observe(table);
          observedWrappers.add(wrapper);
        }
      });
      scheduleChooseActive();
    };

    bar.addEventListener("scroll", onBarScroll, { passive: true });
    window.addEventListener("scroll", scheduleChooseActive, { passive: true });
    window.addEventListener("resize", scheduleChooseActive);
    const mutationObserver = new MutationObserver(() => bindWrappers());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    bindWrappers();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      bar.removeEventListener("scroll", onBarScroll);
      window.removeEventListener("scroll", scheduleChooseActive);
      window.removeEventListener("resize", scheduleChooseActive);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      boundWrappers.forEach((wrapper) => wrapper.removeEventListener("scroll", onWrapperScroll));
      bar.remove();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchFoodItemCounts = async () => {
    try {
      const response = await api.get("/categoryandfooditem/");
      const data = response.data?.food_data || [];
      
      const hcmCount = data.filter(item => item.category === "HCM").length;
      const thrCount = data.filter(item => item.category === "THR").length;
      
      setHcmFoodItemsCount(hcmCount);
      setThrFoodItemsCount(thrCount);
    } catch (err) {
      console.error("Failed to fetch food item counts:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-details/");
      const data = Array.isArray(response.data) ? response.data : (response.data?.results || response.data?.data || []);
      setRecords(Array.isArray(data) ? data.map(normalizeRecord) : []);
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliesData = async (type) => {
    const reqId = ++suppliesReqId.current;
    setSuppliesLoading(true);
    try {
      const response = await api.get(`/director/${type}-director-food-reconciliation/`);
      
      if (reqId !== suppliesReqId.current) return;

      const result = response.data?.results;
      if (!result?.success) {
        throw new Error(result?.message || "The reconciliation API returned an unsuccessful response.");
      }
      if (!Array.isArray(result.data)) {
        throw new Error("The reconciliation response does not contain detail records.");
      }

      const summaries = {
        overallSummary: result.overall_summary || [],
        districtSummary: result.district_summary || [],
        projectSummary: result.project_summary || [],
        sectorSummary: result.sector_summary || [],
      };

      if (reqId === suppliesReqId.current) {
        setSuppliesRecords(Object.fromEntries(Object.entries(summaries).map(([key, rows]) => [key, rows.map(normalizeRecord)])));
        setSuppliesDetailRecords((result.data || []).map(normalizeRecord));
      }
    } catch (err) {
      if (reqId === suppliesReqId.current) {
        console.error(`Failed to fetch ${type.toUpperCase()} supplies data:`, err);
        setSuppliesRecords({ overallSummary: [], districtSummary: [], projectSummary: [], sectorSummary: [] });
        setSuppliesDetailRecords([]);
      }
    } finally {
      if (reqId === suppliesReqId.current) {
        setSuppliesLoading(false);
      }
    }
  };

  useEffect(() => { 
    if (api) {
      fetchFoodItemCounts();
      fetchData();
    }
  }, [api]);

  useEffect(() => {
    if (api) {
      fetchSuppliesData(suppliesTab);
    }
  }, [suppliesTab]);

  const suppliesQuarters = useMemo(() => [...new Set(suppliesDetailRecords.map(r => r.quarter).filter(Boolean))]
    .sort((a,b) => quarterOptions.indexOf(a) - quarterOptions.indexOf(b)), [suppliesDetailRecords]);
  const suppliesFinancialYears = useMemo(() => [...new Set(suppliesDetailRecords.map(r => r.financial_year).filter(Boolean))].sort(), [suppliesDetailRecords]);
  const filteredDetailRecords = useMemo(() => suppliesDetailRecords.filter(r =>
    (!selectedSupplyQuarters.length || selectedSupplyQuarters.includes(r.quarter)) &&
    (!selectedSupplyFYs.length || selectedSupplyFYs.includes(r.financial_year))
  ), [suppliesDetailRecords, selectedSupplyQuarters, selectedSupplyFYs]);

  const suppliesFoodItems = useMemo(() => {
    const items = new Set(suppliesDetailRecords.map(r => r.food_item).filter(Boolean));
    return Array.from(items);
  }, [suppliesDetailRecords]);

  // Group from the same trimester-filtered detail rows at every geographic level.
  // This prevents district/project/sector summaries from ignoring the trimester filter.
  const groupSupplies = (level) => {
    const groups = new Map();
    filteredDetailRecords.forEach(r => {
      const identity = level === 'district' ? [r.district] :
        level === 'project' ? [r.district, r.project] :
        level === 'sector' ? [r.district, r.project, r.sector] :
        [r.district, r.project, r.sector, r.awc_code, r.awc_name];
      const key = JSON.stringify([...identity, r.quarter, r.financial_year]);
      if (!groups.has(key)) groups.set(key, {
        district: r.district, project: r.project, sector: r.sector,
        awc_code: r.awc_code, awc_name: r.awc_name,
        quarter: r.quarter, financial_year: r.financial_year, items: new Map()
      });
      const group = groups.get(key);
      const item = group.items.get(r.food_item) || { received: 0, distributed: 0, balance: 0 };
      item.received += r.received_quantity;
      item.distributed += r.distributed_quantity;
      item.balance += r.balance_quantity;
      group.items.set(r.food_item, item);
    });
    return [...groups.values()].map(({items, ...rest}) => ({
      ...rest, foodData: [...items].map(([food_item, values]) => ({food_item, ...values}))
    })).sort((a,b) =>
      String(a.district).localeCompare(String(b.district)) ||
      String(a.project).localeCompare(String(b.project)) ||
      String(a.sector).localeCompare(String(b.sector)) ||
      quarterOptions.indexOf(a.quarter) - quarterOptions.indexOf(b.quarter));
  };
  const districtSuppliesData = useMemo(() => groupSupplies('district'), [filteredDetailRecords]);
  const projectSuppliesData = useMemo(() => groupSupplies('project'), [filteredDetailRecords]);
  const sectorSuppliesData = useMemo(() => groupSupplies('sector'), [filteredDetailRecords]);
  const awcSuppliesData = useMemo(() => groupSupplies('awc'), [filteredDetailRecords]);

  const currentSuppliesData = useMemo(() => {
    switch (suppliesViewMode) {
      case 'district': return districtSuppliesData;
      case 'project': return projectSuppliesData;
      case 'sector': return sectorSuppliesData;
      case 'awc': return awcSuppliesData;
      default: return districtSuppliesData;
    }
  }, [suppliesViewMode, districtSuppliesData, projectSuppliesData, sectorSuppliesData, awcSuppliesData]);

  // THR values are packet counts. HCM API quantities are in grams, so keep
  // the original gram value visible and show its kilogram equivalent in brackets.
  const formatSupplyQuantity = (raw) => {
    const value = Number(raw) || 0;
    if (suppliesTab === 'thr') {
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} packets`;
    }

    const grams = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const kilograms = (value / 1000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
    return `${grams} g (${kilograms} kg)`;
  };
  const suppliesQuantityHeader = suppliesTab === 'thr' ? 'Packets' : 'g (kg equivalent)';

  const suppliesTotals = useMemo(() => {
    const totals = {};
    suppliesFoodItems.forEach(fi => {
      totals[fi] = { received: 0, distributed: 0, balance: 0 };
    });
    currentSuppliesData.forEach(row => {
      row.foodData.forEach(fd => {
        if (totals[fd.food_item]) {
          totals[fd.food_item].received += fd.received || 0;
          totals[fd.food_item].distributed += fd.distributed || 0;
          totals[fd.food_item].balance += fd.balance || 0;
        }
      });
    });
    return totals;
  }, [currentSuppliesData, suppliesFoodItems]);

  const uniqueQuarters = useMemo(() => [...new Set(records.map(r => r.quarter).filter(Boolean))].sort((a,b) => quarterOptions.indexOf(a) - quarterOptions.indexOf(b)), [records]);
  const uniqueFYs = useMemo(() => [...new Set(records.map(r => r.financial_year).filter(Boolean))].sort(), [records]);
  const uniqueProjects = useMemo(() => [...new Set(records.map(r => r.project).filter(Boolean))].sort(), [records]);
  const uniqueSectors = useMemo(() => [...new Set(records.map(r => r.sector).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const m = selectedQuarters.length === 0 ? true : selectedQuarters.includes(r.quarter);
      const y = selectedFYs.length === 0 ? true : selectedFYs.includes(r.financial_year);
      const p = selectedProjects.length === 0 ? true : selectedProjects.includes(r.project);
      const s = selectedSectors.length === 0 ? true : selectedSectors.includes(r.sector);
      return m && y && p && s;
    });
  }, [records, selectedQuarters, selectedFYs, selectedProjects, selectedSectors]);

  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return filteredRecords;
    const term = searchTerm.toLowerCase();
    return filteredRecords.filter(r =>
      (r.quarter || "").toLowerCase().includes(term) ||
      (r.financial_year || "").toLowerCase().includes(term) ||
      (r.district || "").toLowerCase().includes(term) ||
      (r.project || "").toLowerCase().includes(term) ||
      (r.sector || "").toLowerCase().includes(term) ||
      (r.awc_code || "").toLowerCase().includes(term)
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
    filteredRecords.forEach(r => {
      const groupKey = r[aggregateView] || "—";
      if (!grouped[groupKey]) {
        grouped[groupKey] = { groupKey, quarters: new Set(), fys: new Set(), totals: NUMERIC_AGG_FIELDS.reduce((a, { key }) => ({ ...a, [key]: 0 }), {}) };
      }
      if (r.quarter) grouped[groupKey].quarters.add(r.quarter);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => { grouped[groupKey].totals[key] += parseInt(r[key]) || 0; });
    });
    return Object.values(grouped).map(g => ({
      groupKey: g.groupKey, quarters: Array.from(g.quarters).join(", "), fys: Array.from(g.fys).join(", "), ...g.totals
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
      acc[key] = searchedRecords.reduce((sum, row) => sum + (parseInt(row[key]) || 0), 0);
      return acc;
    }, {});
  }, [searchedRecords]);

  // Reset Pagination on Filter Change
  useEffect(() => { setDetailsPage(1); }, [searchedRecords]);
  useEffect(() => { setAggPage(1); }, [aggregatedData]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Pagination Renderer
  const renderPagination = (currentPage, totalItems, setPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages = [];
    pages.push(<Pagination.First key="first" disabled={currentPage === 1} onClick={() => setPage(1)} />);
    pages.push(<Pagination.Prev key="prev" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} />);
    
    if (startPage > 1) {
      pages.push(<Pagination.Item key={1} onClick={() => setPage(1)}>{1}</Pagination.Item>);
      if (startPage > 2) pages.push(<Pagination.Ellipsis key="ell1" disabled />);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => setPage(i)}>{i}</Pagination.Item>);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<Pagination.Ellipsis key="ell2" disabled />);
      pages.push(<Pagination.Item key={totalPages} onClick={() => setPage(totalPages)}>{totalPages}</Pagination.Item>);
    }

    pages.push(<Pagination.Next key="next" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />);
    pages.push(<Pagination.Last key="last" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} />);

    const startItem = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems);
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="d-flex justify-content-between align-items-center p-2 flex-wrap" style={{ borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          Showing {startItem} to {endItem} of {totalItems} entries
        </div>
        <Pagination size="sm" className="mb-0">{pages}</Pagination>
      </div>
    );
  };

  const currentAggregated = useMemo(() => {
    return aggregatedData.slice((aggPage - 1) * ITEMS_PER_PAGE, aggPage * ITEMS_PER_PAGE);
  }, [aggregatedData, aggPage]);

  const currentDetailed = useMemo(() => {
    return searchedRecords.slice((detailsPage - 1) * ITEMS_PER_PAGE, detailsPage * ITEMS_PER_PAGE);
  }, [searchedRecords, detailsPage]);

  /* --- Export Functions --- */
  const exportSuppliesToExcel = () => {
    const data = currentSuppliesData.map((r, i) => {
      const row = { "S. No.": i + 1 };
      if (suppliesViewMode === 'district') {
        row.District = r.district;
      } else if (suppliesViewMode === 'project') {
        row.Project = r.project;
      } else if (suppliesViewMode === 'sector') {
        row.Sector = r.sector;
      } else {
        row.District = r.district;
        row.Project = r.project;
        row.Sector = r.sector;
        row["AWC Name"] = r.awc_name;
        row["AWC Code"] = r.awc_code;
      }
      row.Trimester = r.quarter;
      row["Financial Year"] = r.financial_year;
      suppliesFoodItems.forEach(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        row[`${fi} - Received (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd?.received);
        row[`${fi} - Distributed (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd?.distributed);
        row[`${fi} - Remaining (${suppliesQuantityHeader})`] = formatSupplyQuantity(fd?.balance);
      });
      return row;
    });
    
    const totalRow = { "S. No.": "" };
    if (suppliesViewMode === 'district') {
      totalRow.District = "Total";
    } else if (suppliesViewMode === 'project') {
      totalRow.Project = "Total";
    } else if (suppliesViewMode === 'sector') {
      totalRow.Sector = "Total";
    } else {
      totalRow.District = "Total";
      totalRow.Project = "";
      totalRow.Sector = "";
      totalRow["AWC Name"] = "";
      totalRow["AWC Code"] = "";
    }
    totalRow.Trimester = "";
    totalRow["Financial Year"] = "";
    suppliesFoodItems.forEach(fi => {
      const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
      totalRow[`${fi} - Received (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.received);
      totalRow[`${fi} - Distributed (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.distributed);
      totalRow[`${fi} - Remaining (${suppliesQuantityHeader})`] = formatSupplyQuantity(t.balance);
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const supplyHeaders = Object.keys(data[0] || {});
    ws["!cols"] = supplyHeaders.map((header) => ({
      wch: Math.min(Math.max(header.length, data.reduce((max, row) => Math.max(max, String(row[header] ?? "").length), 10)) + 2, 32),
    }));
    if (data.length) {
      ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: supplyHeaders.length - 1 } }) };
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    const viewModeLabel = suppliesViewMode.charAt(0).toUpperCase() + suppliesViewMode.slice(1);
    XLSX.writeFile(wb, `Supplies_${suppliesTab.toUpperCase()}_${viewModeLabel}_Summary.xlsx`);
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
    const groupHeaders = suppliesViewMode === 'district' 
      ? [{ text: 'District', rowSpan: 2 }]
      : suppliesViewMode === 'project'
      ? [{ text: 'Project', rowSpan: 2 }]
      : suppliesViewMode === 'sector'
      ? [{ text: 'Sector', rowSpan: 2 }]
      : [
          { text: 'District', rowSpan: 2 },
          { text: 'Project', rowSpan: 2 },
          { text: 'Sector', rowSpan: 2 },
          { text: 'AWC Name', rowSpan: 2 },
          { text: 'AWC Code', rowSpan: 2 }
        ];

    const headers = [[
      { text: 'S. No.', rowSpan: 2 },
      ...groupHeaders,
      { text: "Trimester", rowSpan: 2 },
      { text: "Financial Year", rowSpan: 2 },
      ...suppliesFoodItems.map(fi => ({ text: fi, colSpan: 3 }))
    ], [
      ...suppliesFoodItems.flatMap(() => ['Rec.', 'Dist.', 'Rem.'])
    ]];
    
    const rows = currentSuppliesData.map((r, i) => [
      i + 1,
      ...(suppliesViewMode === 'district' ? [r.district] : suppliesViewMode === 'project' ? [r.project] : suppliesViewMode === 'sector' ? [r.sector] : [r.district, r.project, r.sector, r.awc_name, r.awc_code]),
      r.quarter, r.financial_year,
      ...suppliesFoodItems.flatMap(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        return fd ? [formatSupplyQuantity(fd.received), formatSupplyQuantity(fd.distributed), formatSupplyQuantity(fd.balance)] : [formatSupplyQuantity(0), formatSupplyQuantity(0), formatSupplyQuantity(0)];
      })
    ]);

    const groupColSpan = suppliesViewMode === 'awc' ? 5 : 1;
    const footer = [[
      { text: 'total', colSpan: 3 + groupColSpan },
      ...suppliesFoodItems.flatMap(fi => {
        const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
        return [{ text: formatSupplyQuantity(t.received) }, { text: formatSupplyQuantity(t.distributed) }, { text: formatSupplyQuantity(t.balance) }];
      })
    ]];

    const viewModeLabel = suppliesViewMode === 'district' ? 'District-wise' : suppliesViewMode === 'project' ? 'Project-wise' : suppliesViewMode === 'sector' ? 'Sector-wise' : 'AWC-wise';
    const viewModeLabelFile = suppliesViewMode.charAt(0).toUpperCase() + suppliesViewMode.slice(1);
    return handlePDFExport({
      title: `Supplies ${suppliesTab.toUpperCase()} ${viewModeLabel} Summary`,
      filename: `Supplies_${suppliesTab.toUpperCase()}_${viewModeLabelFile}_Summary.pdf`,
      headers,
      rows,
      footer,
      fontSize: 9
    });
  };

  const exportAggToExcel = () => {
    const data = aggregatedData.map((r, i) => ({ "S. No.": i + 1, [aggregateView]: r.groupKey, Trimesters: r.quarters, "Fin. Years": r.fys, ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: r[f.key] }), {}) }));
    data.push({ "S. No.": "", [aggregateView]: "Total", ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: totalAggregated[f.key] }), {}) });
    const ws = XLSX.utils.json_to_sheet(data);
    const summaryHeaders = Object.keys(data[0] || {});
    ws["!cols"] = summaryHeaders.map((header) => ({
      wch: Math.min(Math.max(header.length, data.reduce((max, row) => Math.max(max, String(row[header] ?? "").length), 10)) + 2, 32),
    }));
    if (data.length) {
      ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: summaryHeaders.length - 1 } }) };
      ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `${aggregateView}_Summary.xlsx`);
  };

  const exportAggToPDF = () => {
    const headers = [["S. No.", aggregateView, "Trimesters", "Fin. Years", ...NUMERIC_AGG_FIELDS.map(f => f.label)]];
    const rows = aggregatedData.map((r, i) => [i + 1, r.groupKey, r.quarters, r.fys, ...NUMERIC_AGG_FIELDS.map(f => r[f.key])]);
    const footer = [["", "Total", "", "", ...NUMERIC_AGG_FIELDS.map(f => totalAggregated[f.key])]];
    return handlePDFExport({
      title: `${aggregateView}-wise Aggregated Summary`,
      filename: `${aggregateView}_Summary.pdf`,
      headers,
      rows,
      footer,
      fontSize: 8
    });
  };

  /* ── Detailed Records Export (match the on-screen grant table exactly) ── */
  const getGrantAmount = (record, grantKey, grantIndex) => {
    const values = Array.isArray(record?.[grantKey]) ? record[grantKey] : [];
    const value = values[grantIndex];
    // The visible table displays the amount at each grant position, not grant IDs.
    return value === null || value === undefined || value === "" ? 0 : value;
  };

  const exportDetailsToExcel = () => {
    const headers = [
      "S. No.",
      ...EXCEL_META_COLUMNS.map((col) => col.header),
      ...GRANT_CATEGORIES.flatMap((cat) => [
        `${cat.title} - Grant 15`,
        `${cat.title} - Grant 30`,
        `${cat.title} - Grant 31`,
        `${cat.title} - TOTAL`,
        ...getCategoryFoodFields(cat).map((field) => field.header),
      ]),
    ];

    const dataToExport = searchedRecords.map((record, index) => {
      const row = { "S. No.": index + 1 };
      EXCEL_META_COLUMNS.forEach((col) => { row[col.header] = record[col.key] ?? "—"; });
      GRANT_CATEGORIES.forEach((cat) => {
        row[`${cat.title} - Grant 15`] = getGrantAmount(record, cat.grantKey, 0);
        row[`${cat.title} - Grant 30`] = getGrantAmount(record, cat.grantKey, 1);
        row[`${cat.title} - Grant 31`] = getGrantAmount(record, cat.grantKey, 2);
        row[`${cat.title} - TOTAL`] = Number(record[cat.countKey] ?? 0);
        getCategoryFoodFields(cat).forEach((field) => {
          row[field.header] = Number(record[field.key] ?? 0);
        });
      });
      return row;
    });

    const totalRow = { "S. No.": "", [EXCEL_META_COLUMNS[0].header]: "TOTAL" };
    EXCEL_META_COLUMNS.slice(1).forEach((col) => { totalRow[col.header] = ""; });
    GRANT_CATEGORIES.forEach((cat) => {
      totalRow[`${cat.title} - Grant 15`] = "";
      totalRow[`${cat.title} - Grant 30`] = "";
      totalRow[`${cat.title} - Grant 31`] = "";
      totalRow[`${cat.title} - TOTAL`] = Number(totalDetailed[cat.countKey] ?? 0);
      getCategoryFoodFields(cat).forEach((field) => {
        totalRow[field.header] = Number(totalDetailed[field.key] ?? 0);
      });
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    worksheet["!cols"] = headers.map((header) => {
      const longest = Math.max(String(header).length, ...dataToExport.map((row) => String(row[header] ?? "").length));
      return { wch: Math.min(Math.max(longest + 2, 10), 32) };
    });
    if (dataToExport.length) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: dataToExport.length, c: headers.length - 1 } }),
      };
    }
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detailed Records");
    XLSX.writeFile(workbook, "Supplementary_Records.xlsx", { compression: true });
  };

  const exportDetailsToPDF = () => {
    const groupHeaders = [
      { text: "S. No.", rowSpan: 2 },
      ...EXCEL_META_COLUMNS.map((col) => ({ text: col.header, rowSpan: 2 })),
      ...GRANT_CATEGORIES.map((cat) => ({
        text: cat.title,
        colSpan: 4 + getCategoryFoodFields(cat).length,
      })),
    ];
    const subHeaders = GRANT_CATEGORIES.flatMap((cat) => [
      "Grant 15", "Grant 30", "Grant 31", "TOTAL",
      ...getCategoryFoodFields(cat).map((field) => field.header),
    ]);

    const rows = searchedRecords.map((record, index) => {
      const row = [index + 1];
      EXCEL_META_COLUMNS.forEach((col) => row.push(record[col.key] ?? "—"));
      GRANT_CATEGORIES.forEach((cat) => {
        row.push(getGrantAmount(record, cat.grantKey, 0));
        row.push(getGrantAmount(record, cat.grantKey, 1));
        row.push(getGrantAmount(record, cat.grantKey, 2));
        row.push(Number(record[cat.countKey] ?? 0).toLocaleString());
        getCategoryFoodFields(cat).forEach((field) => {
          row.push(Number(record[field.key] ?? 0).toLocaleString());
        });
      });
      return row;
    });

    const footer = [[
      { text: "", colSpan: 1 + EXCEL_META_COLUMNS.length },
      ...GRANT_CATEGORIES.flatMap((cat) => [
        { text: "" }, { text: "" }, { text: "" },
        { text: Number(totalDetailed[cat.countKey] ?? 0).toLocaleString() },
        ...getCategoryFoodFields(cat).map((field) => ({
          text: Number(totalDetailed[field.key] ?? 0).toLocaleString(),
        })),
      ]),
    ]];

    return handlePDFExport({
      title: "Supplementary Nutrition Records",
      filename: "Supplementary_Records.pdf",
      headers: [groupHeaders, subHeaders],
      rows,
      footer,
      fontSize: 7,
    });
  };

  return (
    <div className="dashboard-container">
   

      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        
        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <div className="dashboard-header-section mt-4">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Director Dashboard
              </h4>
            </div>
            <Button className="dpo-btn-light" onClick={fetchData} disabled={loading}>
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          {/* Optimized Compact Food Items Overview */}
          <div className="mb-4">
            <Row className="g-3">
              <Col md={6}>
                <div 
                  onClick={() => navigate('/director/food-items')} 
                  className="d-flex align-items-center p-1 bg-white rounded shadow-sm " 
                  style={{ cursor: 'pointer', borderLeft: '4px solid #ffc107', transition: 'all 0.2s' }}
                >
                  <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', borderRadius: '8px' }}>
                    <FaBox size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>HCM Food Items</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                      {loading ? <Spinner animation="border" size="sm" /> : hcmFoodItemsCount}
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div 
                  onClick={() => navigate('/director/food-items')} 
                  className="d-flex align-items-center p-1 bg-white rounded shadow-sm " 
                  style={{ cursor: 'pointer', borderLeft: '4px solid #0dcaf0', transition: 'all 0.2s' }}
                >
                  <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'rgba(13, 202, 240, 0.1)', color: '#0dcaf0', borderRadius: '8px' }}>
                    <FaBox size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>THR Food Items</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                      {loading ? <Spinner animation="border" size="sm" /> : thrFoodItemsCount}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Compact Multi-Select Filter Bar */}
          <div className="dpo-filter-bar">
            <MultiSelectDropdown label="Trimester" options={uniqueQuarters} selected={selectedQuarters} onChange={setSelectedQuarters} />
            <MultiSelectDropdown label="Financial Year" options={uniqueFYs} selected={selectedFYs} onChange={setSelectedFYs} />
            <MultiSelectDropdown label="Project" options={uniqueProjects} selected={selectedProjects} onChange={setSelectedProjects} />
            <MultiSelectDropdown label="Sector" options={uniqueSectors} selected={selectedSectors} onChange={setSelectedSectors} />
            <Button variant="outline-secondary" size="sm" className="dpo-filter-reset" onClick={() => { setSelectedQuarters([]); setSelectedFYs([]); setSelectedProjects([]); setSelectedSectors([]); }}>
              Reset
            </Button>
          </div>

          {summaryStats && (
            <div className="dpo-stat-strip">
              {SUMMARY_PILLS.map(field => (
                <div key={field.key} className="dpo-stat-pill">
                  <span className="dpo-stat-pill-icon">{field.icon}</span>
                  <span className="dpo-stat-pill-label">{field.label}</span>
                  <span className="dpo-stat-pill-value">{summaryStats[field.key]?.toLocaleString() || 0}</span>
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
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'thr' ? 'active' : ''}`} onClick={() => { setSuppliesTab('thr'); setSelectedSupplyQuarters([]); setSelectedSupplyFYs([]); }}>THR</Button>
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'hcm' ? 'active' : ''}`} onClick={() => { setSuppliesTab('hcm'); setSelectedSupplyQuarters([]); setSelectedSupplyFYs([]); }}>HCM</Button>
                </ButtonGroup>
                <ButtonGroup className="dpo-toggle-group" style={{ marginLeft: '8px', marginRight: '8px' }}>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'district' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('district')} title="District-wise">District</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'project' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('project')} title="Project-wise">Project</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'sector' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('sector')} title="Sector-wise">Sector</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'awc' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('awc')} title="AWC-wise">AWC</Button>
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
                {(selectedSupplyQuarters.length > 0 || selectedSupplyFYs.length > 0) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="dpo-filter-reset"
                    onClick={() => { setSelectedSupplyQuarters([]); setSelectedSupplyFYs([]); }}
                  >
                    Reset
                  </Button>
                )}
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportSuppliesToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportSuppliesToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper director-table-wrapper" style={{ overflowX: "auto", maxWidth: "100%" }}>
                {suppliesLoading ? (
                  <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                ) : (
                  <Table hover className="dpo-data-table mb-0" style={{ width: "max-content", minWidth: "100%" }}>
                    <thead>
                      <tr>
                        <th rowSpan="2">S. No.</th>
                        {suppliesViewMode === 'district' ? (
                          <th rowSpan="2">District</th>
                        ) : suppliesViewMode === 'project' ? (
                          <th rowSpan="2">Project</th>
                        ) : suppliesViewMode === 'sector' ? (
                          <th rowSpan="2">Sector</th>
                        ) : (
                          <>
                            <th rowSpan="2">District</th>
                            <th rowSpan="2">Project</th>
                            <th rowSpan="2">Sector</th>
                            <th rowSpan="2">AWC Name</th>
                            <th rowSpan="2">AWC Code</th>
                          </>
                        )}
                        <th rowSpan="2">Trimester</th>
                        <th rowSpan="2">Financial Year</th>
                        {suppliesFoodItems.map((fi, idx) => (
                          <th key={`fi-${idx}`} colSpan="3" className="text-center" style={{ borderLeft: '1px solid #e9d5ff' }}>
                            {fi}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {suppliesFoodItems.map((fi, idx) => (
                          <React.Fragment key={`sub-${idx}`}>
                            <th className="text-end">Rec. ({suppliesQuantityHeader})</th>
                            <th className="text-end">Dist. ({suppliesQuantityHeader})</th>
                            <th className="text-end">Rem. ({suppliesQuantityHeader})</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSuppliesData.length === 0 ? (
                        <tr>
                          <td colSpan={suppliesViewMode === 'awc' ? 8 + suppliesFoodItems.length * 3 : 4 + suppliesFoodItems.length * 3} className="text-center p-4 text-muted">
                            No data available
                          </td>
                        </tr>
                      ) : currentSuppliesData.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {suppliesViewMode === 'district' ? (
                            <td><strong>{row.district}</strong></td>
                          ) : suppliesViewMode === 'project' ? (
                            <td><strong>{row.project}</strong></td>
                          ) : suppliesViewMode === 'sector' ? (
                            <td><strong>{row.sector}</strong></td>
                          ) : (
                            <>
                              <td>{row.district}</td>
                              <td>{row.project}</td>
                              <td>{row.sector}</td>
                              <td><strong>{row.awc_name}</strong></td>
                              <td>{row.awc_code}</td>
                            </>
                          )}
                          <td>{row.quarter || "—"}</td>
                          <td>{row.financial_year || "—"}</td>
                          {suppliesFoodItems.map((fi, idx) => {
                            const fd = row.foodData.find(f => f.food_item === fi);
                            return (
                              <React.Fragment key={`data-${idx}`}>
                                <td className="text-end">{fd ? formatSupplyQuantity(fd.received) : formatSupplyQuantity(0)}</td>
                                <td className="text-end">{fd ? formatSupplyQuantity(fd.distributed) : formatSupplyQuantity(0)}</td>
                                <td className="text-end text-primary"><strong>{fd ? formatSupplyQuantity(fd.balance) : formatSupplyQuantity(0)}</strong></td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {currentSuppliesData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          {suppliesViewMode === 'district' ? (
                            <th>Total</th>
                          ) : suppliesViewMode === 'project' ? (
                            <th>Total</th>
                          ) : suppliesViewMode === 'sector' ? (
                            <th>Total</th>
                          ) : (
                            <>
                              <th>Total</th>
                              <th></th>
                              <th></th>
                              <th></th>
                              <th></th>
                            </>
                          )}
                          <th></th><th></th>
                          {suppliesFoodItems.map((fi, idx) => {
                            const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
                            return (
                              <React.Fragment key={`foot-${idx}`}>
                                <th className="text-end">{formatSupplyQuantity(t.received)}</th>
                                <th className="text-end">{formatSupplyQuantity(t.distributed)}</th>
                                <th className="text-end">{formatSupplyQuantity(t.balance)}</th>
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
                <FaLayerGroup /> {aggregateView === "sector" ? "Sector-wise" : aggregateView === "project" ? "Project-wise" : "District-wise"} Aggregated Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button className={`dpo-toggle-btn ${aggregateView === 'district' ? 'active' : ''}`} onClick={() => setAggregateView('district')}>District-wise</Button>
                  <Button className={`dpo-toggle-btn ${aggregateView === 'project' ? 'active' : ''}`} onClick={() => setAggregateView('project')}>Project-wise</Button>
                  <Button className={`dpo-toggle-btn ${aggregateView === 'sector' ? 'active' : ''}`} onClick={() => setAggregateView('sector')}>Sector-wise</Button>
                </ButtonGroup>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportAggToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportAggToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper director-table-wrapper" style={{ overflowX: "auto", maxWidth: "100%" }}>
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0" style={{ width: "max-content", minWidth: "100%" }}>
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        <th style={{textTransform: 'capitalize'}}>{aggregateView}</th>
                        <th>Trimesters</th>
                        <th>Fin. Years</th>
                        {NUMERIC_AGG_FIELDS.map((col, i) => <th key={i} className="text-end">{col.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {currentAggregated.length === 0 ? (
                        <tr><td colSpan={NUMERIC_AGG_FIELDS.length + 4} className="text-center p-4 text-muted">No data available</td></tr>
                      ) : currentAggregated.map((row, i) => (
                        <tr key={i}>
                          <td>{(aggPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          <td><strong>{row.groupKey}</strong></td>
                          <td>{row.quarters}</td>
                          <td>{row.fys}</td>
                          {NUMERIC_AGG_FIELDS.map((col, c) => <td key={c} className="text-end">{row[col.key]?.toLocaleString() || 0}</td>)}
                        </tr>
                      ))}
                    </tbody>
                    {aggregatedData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          <th>Total</th><th></th><th></th>
                          {NUMERIC_AGG_FIELDS.map((col, c) => <th key={c} className="text-end">{totalAggregated[col.key]?.toLocaleString() || 0}</th>)}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
              {!loading && renderPagination(aggPage, aggregatedData.length, setAggPage)}
            </Card.Body>
          </Card>

          {/* ─── Detailed Records Table (Grant-wise Structure) ─── */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaChartBar /> Detailed Records
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <InputGroup style={{maxWidth: '300px'}}>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search AWC, District, Trimester..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportDetailsToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportDetailsToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper director-table-wrapper" style={{ overflowX: "auto" }}>
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0 dpo-grant-master-table" style={{ width: "max-content", minWidth: "2400px", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} className="text-center align-middle">S. No.</th>
                        {EXCEL_META_COLUMNS.map((col) => (
                          <th key={col.key} rowSpan={2} className="text-center align-middle">{col.header}</th>
                        ))}
                        {GRANT_CATEGORIES.map((cat) => (
                          <th key={cat.countKey} colSpan={4 + getCategoryFoodFields(cat).length} className="text-center align-middle dpo-grant-group-header">{cat.title}</th>
                        ))}
                      </tr>
                      <tr>
                        {GRANT_CATEGORIES.flatMap((cat) => [
                          ...[15, 30, 31].map((grantId) => (
                            <th key={`${cat.countKey}-${grantId}`} className="text-center">Grant {grantId}</th>
                          )),
                          <th key={`${cat.countKey}-total`} className="text-center">TOTAL</th>,
                          ...getCategoryFoodFields(cat).map((food) => (
                            <th key={`${cat.countKey}-${food.key}`} className="text-center dpo-food-group-header">{food.header}</th>
                          )),
                        ])}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetailed.length === 0 ? (
                        <tr>
                          <td colSpan={1 + EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.length * 4 + FOOD_FIELDS.length} className="text-center py-5 text-muted">
                            No records found.
                          </td>
                        </tr>
                      ) : currentDetailed.map((record, index) => (
                        <tr key={record.id || index}>
                          <td className="text-center text-muted">{(detailsPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                          {EXCEL_META_COLUMNS.map((col) => (
                            <td key={col.key} className={col.key === "quarter" ? "text-center" : ""}>
                              {col.key === "quarter" && record[col.key]
                                ? <Badge className="dpo-month-badge">{record[col.key]}</Badge>
                                : (record[col.key] || "—")}
                            </td>
                          ))}
                          {GRANT_CATEGORIES.flatMap((cat) => {
                            // API grant arrays contain amounts in order: Grant 15, Grant 30, Grant 31.
                            const grantValues = Array.isArray(record[cat.grantKey]) ? record[cat.grantKey] : [];
                            return [
                              ...[15, 30, 31].map((grantId, grantIndex) => (
                                <td key={`${cat.countKey}-${grantId}`} className="text-center dpo-grant-cell">
                                  {Number(grantValues[grantIndex] ?? 0).toLocaleString()}
                                </td>
                              )),
                              <td key={`${cat.countKey}-total`} className="text-end fw-semibold dpo-total-cell">
                                {Number(record[cat.countKey] ?? 0).toLocaleString()}
                              </td>,
                              ...getCategoryFoodFields(cat).map((food) => (
                                <td key={`${cat.countKey}-${food.key}`} className="text-end">{Number(record[food.key] ?? 0).toLocaleString()}</td>
                              )),
                            ];
                          })}
                        </tr>
                      ))}
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
                            <th key={`${cat.countKey}-total`} className="text-end">{totalDetailed[cat.countKey]?.toLocaleString() || 0}</th>,
                            ...getCategoryFoodFields(cat).map((food) => (
                              <th key={`${cat.countKey}-${food.key}`} className="text-end">{totalDetailed[food.key]?.toLocaleString() || 0}</th>
                            )),
                          ])}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
              {!loading && renderPagination(detailsPage, searchedRecords.length, setDetailsPage)}
            </Card.Body>
          </Card>

        </Container>
      </div>
    </div>
  );
};

export default DirectorDashboard;