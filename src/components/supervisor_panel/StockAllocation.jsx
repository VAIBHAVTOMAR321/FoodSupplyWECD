import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import {
  Alert,
  Container,
  Spinner,
  Table,
  Row,
  Col,
  Form,
  Dropdown,
  Button,
  InputGroup,
  Card,
  Badge,
} from "react-bootstrap";

import {
  FaBoxes,
  FaSearch,
  FaSyncAlt,
  FaFileExcel,
  FaFilePdf,
  FaWarehouse,
  FaLayerGroup,
  FaChevronDown,
  FaFilter,
} from "react-icons/fa";

import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/dashboard.css";

import "../../assets/css/dpo.css";

import SupervisorLeftNav from "./SupervisorLeftNav";

import SupervisorHeader from "./SupervisorHeader";

import * as XLSX from "xlsx";

import html2pdf from "html2pdf.js";

/* ── Grant-wise Table schema (mirrors FoodSupplementary) ── */

const GRANT_IDS = [15, 30, 31];

// API grant arrays are ordered as [Grant 15 value, Grant 30 value, Grant 31 value].

// Display 0 when supplied; use a dash only for a missing value.

const getGrantValue = (record, grantKey, grantIndex) => {
  const values = record && record[grantKey];

  if (!Array.isArray(values) || grantIndex >= values.length) return "—";

  const value = values[grantIndex];

  if (value === null || value === undefined || value === "") return "—";

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString()
    : String(value);
};

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

  { header: "Trimester", key: "quarter" },

  { header: "FINANCIAL YEAR", key: "financial_year" },
];

// Flat columns for Excel export

const EXPORT_FLAT_COLUMNS = [
  ...EXCEL_META_COLUMNS,

  ...GRANT_CATEGORIES.flatMap((cat) => [
    {
      header: `${cat.title} - Grant 15`,
      key: `${cat.countKey}_g15`,
      isGrant: true,
      grantId: 15,
      grantKey: cat.grantKey,
    },

    {
      header: `${cat.title} - Grant 30`,
      key: `${cat.countKey}_g30`,
      isGrant: true,
      grantId: 30,
      grantKey: cat.grantKey,
    },

    {
      header: `${cat.title} - Grant 31`,
      key: `${cat.countKey}_g31`,
      isGrant: true,
      grantId: 31,
      grantKey: cat.grantKey,
    },

    { header: `${cat.title} - Total`, key: cat.countKey, num: true },
  ]),

  ...FOOD_FIELDS.map((f) => ({ header: f.header, key: f.key, num: true })),
];

const NUMERIC_TOTAL_KEYS = [
  ...GRANT_CATEGORIES.map((c) => c.countKey),

  ...FOOD_FIELDS.map((f) => f.key),
];

let hindiPdfFontPromise;

const loadHindiPdfFont = async () => {
  if (!hindiPdfFontPromise) {
    hindiPdfFontPromise = new Promise((resolve) => {
      const fontLink = document.createElement("link");

      fontLink.rel = "stylesheet";

      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap";

      fontLink.onload = () => resolve(true);

      fontLink.onerror = () => resolve(false);

      document.head.appendChild(fontLink);
    });
  }

  if (await hindiPdfFontPromise) {
    try {
      await document.fonts.load('400 12px "Noto Sans Devanagari"', "हिंदी");
    } catch (e) {
      /* noop */
    }
  }
};

const downloadPDF = async ({
  title,
  subtitle,
  filename,
  headers,
  rows,
  footer,
  fontSize,
}) => {
  const content = document.createElement("div");

  content.style.cssText =
    "box-sizing:border-box;width:100%;padding:14px;background:#fff;color:#1e293b;font-family:'Noto Sans Devanagari','Noto Sans','Nirmala UI',sans-serif;";

  const heading = document.createElement("h3");

  heading.textContent = title;

  heading.style.cssText =
    "margin:0 0 6px;text-align:center;color:#1e3a5f;font-size:16px;font-weight:700;";

  content.appendChild(heading);

  if (subtitle) {
    const sub = document.createElement("p");

    sub.textContent = subtitle;

    sub.style.cssText =
      "margin:0 0 12px;text-align:center;color:#475569;font-size:11px;font-weight:600;";

    content.appendChild(sub);
  }

  const table = document.createElement("table");

  table.style.cssText = `width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}px;line-height:1.35;page-break-inside:auto;`;

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);

    const value =
      typeof cell === "object" && cell !== null ? cell : { text: cell };

    element.textContent = value.text == null ? "" : String(value.text);

    if (value.colSpan) element.colSpan = value.colSpan;

    if (value.rowSpan) element.rowSpan = value.rowSpan;

    element.style.cssText =
      "border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:middle;overflow-wrap:anywhere;word-break:normal;";

    return element;
  };

  const thead = document.createElement("thead");

  headers.forEach((headerRow, rowIndex) => {
    const row = document.createElement("tr");

    headerRow.forEach((cell) => {
      const header = createCell("th", cell);

      header.style.cssText += `;background-color:${
        rowIndex === 0 ? "#4f46e5" : "#e0e7ff"
      };color:${rowIndex === 0 ? "#fff" : "#312e81"};border-color:${
        rowIndex === 0 ? "#4338ca" : "#a5b4fc"
      };padding:6px 4px;text-align:center;font-weight:700;font-size:${Math.max(
        fontSize,

        8,
      )}px;line-height:1.25;white-space:normal;`;

      row.appendChild(header);
    });

    row.style.pageBreakInside = "avoid";

    thead.appendChild(row);
  });
  thead.style.display = "table-header-group";

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  rows.forEach((values) => {
    const row = document.createElement("tr");
    row.style.pageBreakInside = "avoid";
    row.style.breakInside = "avoid";

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
        margin: [12, 8, 12, 8],

        filename,

        image: { type: "jpeg", quality: 0.82 },

        html2canvas: {
          scale: 1.6,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
        },

        jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },

        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "thead", "tfoot"] },
      })

      .from(content)

      .save();
  } finally {
    content.remove();
  }
};

const StockAllocation = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();

  const [allocations, setAllocations] = useState([]);

  const [sectorInfo, setSectorInfo] = useState(null);

  const [anganwadiCount, setAnganwadiCount] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");

  // Filters

  const [filters, setFilters] = useState({
    awc_name: [],

    awc_code: [],

    quarter: [],

    financial_year: [],
  });

  // Pagination

  const [currentPage, setCurrentPage] = useState(1);

  const [itemsPerPage] = useState(100);

  const tableRef = useRef(null);

  const fetchStockAllocation = useCallback(async () => {
    if (!api) return;

    setLoading(true);

    setError("");

    try {
      const response = await api.get("/supplementary-nutrition-supervisor/");

      const payload = response.data;

      if (payload?.success === false) {
        setError(
          payload?.message ||
            "The stock allocation API returned an unsuccessful response.",
        );

        setAllocations([]);

        setSectorInfo(null);

        setAnganwadiCount(null);
      } else {
        // Response shape: { success, sector, anganwadi_count, data: [...] }

        const dataArray = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        setAllocations(dataArray);

        setSectorInfo(payload?.sector || null);

        setAnganwadiCount(
          payload?.anganwadi_count != null
            ? payload.anganwadi_count
            : dataArray.length,
        );
      }
    } catch (fetchError) {
      setError("Failed to fetch stock allocation data.");

      setAllocations([]);

      setSectorInfo(null);

      setAnganwadiCount(null);

      console.error("Failed to fetch stock allocation data:", fetchError);
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStockAllocation();
  }, [fetchStockAllocation]);

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

  const uniqueValues = useMemo(() => {
    return {
      awc_name: [
        ...new Set(allocations.map((item) => item.awc_name).filter(Boolean)),
      ].sort(),

      awc_code: [
        ...new Set(allocations.map((item) => item.awc_code).filter(Boolean)),
      ].sort(),
      quarter: [
        "Apr-May-Jun",
        "Jul-Aug-Sep",
        "Oct-Nov-Dec",
        "Jan-Feb-Mar",
      ].filter((q) => allocations.some((item) => item.quarter === q)),

      financial_year: [
        ...new Set(
          allocations.map((item) => item.financial_year).filter(Boolean),
        ),
      ].sort(),
    };
  }, [allocations]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prev) => {
      const currentValues = prev[filterName];

      if (currentValues.includes(value)) {
        return {
          ...prev,
          [filterName]: currentValues.filter((v) => v !== value),
        };
      }

      return { ...prev, [filterName]: [...currentValues, value] };
    });

    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);

    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      awc_name: [],

      awc_code: [],

      quarter: [],

      financial_year: [],
    });

    setSearchText("");

    setCurrentPage(1);
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const searchMatch =
        !searchText ||
        (item.awc_name &&
          String(item.awc_name)
            .toLowerCase()
            .includes(searchText.toLowerCase())) ||
        (item.awc_code &&
          String(item.awc_code)
            .toLowerCase()
            .includes(searchText.toLowerCase())) ||
        (item.quarter &&
          String(item.quarter)
            .toLowerCase()
            .includes(searchText.toLowerCase())) ||
        (item.financial_year &&
          String(item.financial_year)
            .toLowerCase()
            .includes(searchText.toLowerCase()));

      const awcNameMatch =
        filters.awc_name.length === 0 ||
        filters.awc_name.includes(String(item.awc_name));

      const awcCodeMatch =
        filters.awc_code.length === 0 ||
        filters.awc_code.includes(String(item.awc_code));

      const quarterMatch =
        filters.quarter.length === 0 ||
        filters.quarter.includes(String(item.quarter));

      const fyMatch =
        filters.financial_year.length === 0 ||
        filters.financial_year.includes(String(item.financial_year));

      return (
        searchMatch && awcNameMatch && awcCodeMatch && quarterMatch && fyMatch
      );
    });
  }, [allocations, filters, searchText]);

  // Totals row

  const totalsRow = useMemo(() => {
    const totals = {};

    NUMERIC_TOTAL_KEYS.forEach((key) => {
      totals[key] = filteredAllocations.reduce(
        (sum, row) => sum + (parseInt(row[key]) || 0),

        0,
      );
    });

    return totals;
  }, [filteredAllocations]);

  // Pagination

  const totalRecords = filteredAllocations.length;

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return filteredAllocations.slice(start, start + itemsPerPage);
  }, [filteredAllocations, currentPage, itemsPerPage]);

  const handlePageChange = (page) => setCurrentPage(page);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  /* ── Excel Export (Grant-wise master) ── */

  const exportToExcel = () => {
    if (!filteredAllocations.length) return;

    const dataToExport = filteredAllocations.map((row, i) => {
      const obj = { "S. No.": i + 1 };

      EXCEL_META_COLUMNS.forEach((c) => {
        obj[c.header] = row[c.key] ?? "";
      });

      GRANT_CATEGORIES.forEach((cat) => {
        [15, 30, 31].forEach((grantId, grantIndex) => {
          const values = row[cat.grantKey];

          const value = Array.isArray(values) ? values[grantIndex] : undefined;

          obj[`${cat.title} - Grant ${grantId}`] =
            value === null || value === undefined || value === ""
              ? ""
              : Number.isFinite(Number(value))
                ? Number(value)
                : value;
        });

        obj[`${cat.title} - Total`] = Number(row[cat.countKey] || 0);
      });

      FOOD_FIELDS.forEach((f) => {
        obj[f.header] = Number(row[f.key] || 0);
      });

      return obj;
    });

    const totalObj = { "S. No.": "" };

    EXCEL_META_COLUMNS.forEach((c) => {
      totalObj[c.header] = c.key === "district" ? "TOTAL" : "";
    });

    GRANT_CATEGORIES.forEach((cat) => {
      [15, 30, 31].forEach((gid) => {
        totalObj[`${cat.title} - Grant ${gid}`] = "";
      });

      totalObj[`${cat.title} - Total`] = totalsRow[cat.countKey] || 0;
    });

    FOOD_FIELDS.forEach((f) => {
      totalObj[f.header] = totalsRow[f.key] || 0;
    });

    dataToExport.push(totalObj);

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Stock Allocation");

    XLSX.writeFile(wb, "Stock_Allocation_Grant_Wise.xlsx", {
      compression: true,
    });
  };

  /* ── PDF Export (Grant-wise master, 2-row header) ── */

  const exportToPDF = async () => {
    if (!filteredAllocations.length) return;

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

    const rows = filteredAllocations.map((r, i) => {
      const row = [i + 1];

      EXCEL_META_COLUMNS.forEach((col) => row.push(r[col.key] || "—"));

      GRANT_CATEGORIES.forEach((cat) => {
        [15, 30, 31].forEach((grantId, grantIndex) => {
          row.push(getGrantValue(r, cat.grantKey, grantIndex));
        });

        row.push(Number(r[cat.countKey] || 0).toLocaleString());
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

          { text: totalsRow[cat.countKey]?.toLocaleString() || 0 },
        ]),

        ...FOOD_FIELDS.map((f) => ({
          text: totalsRow[f.key]?.toLocaleString() || 0,
        })),
      ],
    ];

    const subtitleParts = [];

    if (sectorInfo) subtitleParts.push(`Sector: ${sectorInfo}`);

    if (anganwadiCount != null)
      subtitleParts.push(`Anganwadi Count: ${anganwadiCount}`);

    const subtitle = subtitleParts.join("   |   ");

    try {
      await downloadPDF({
        title: "Stock Allocation - Grant Wise Master",

        subtitle,

        filename: "Stock_Allocation_Grant_Wise.pdf",

        headers,

        rows,

        footer,

        fontSize: 7,
      });
    } catch (err) {
      console.error("Failed to generate PDF:", err);

      setError("Failed to generate PDF. Please try again.");
    }
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
          {/* Page Header */}

          <div className="dashboard-header-section">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Stock Allocation
              </h4>

              <p className="dashboard-subtitle">
                AWC-wise grant-wise stock allocation overview for your sector.
              </p>
            </div>

            <Button
              className="dpo-btn-light"
              onClick={() => {
                setRefreshing(true);

                fetchStockAllocation();
              }}
              disabled={refreshing || loading}
            >
              <FaSyncAlt className={refreshing || loading ? "fa-spin" : ""} />{" "}
              Refresh
            </Button>
          </div>

          {/* Info pills */}

          {(sectorInfo || anganwadiCount != null) && (
            <div className="d-flex gap-2 mb-3 flex-wrap">
              {sectorInfo && (
                <span className="sa-info-pill">
                  <FaLayerGroup /> Sector: <strong>{sectorInfo}</strong>
                </span>
              )}

              {anganwadiCount != null && (
                <span className="sa-info-pill">
                  <FaWarehouse /> Anganwadi Count:{" "}
                  <strong>{anganwadiCount}</strong>
                </span>
              )}
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          {/* Filter Bar */}

          <Card className="dpo-table-card mb-3">
            <Card.Body>
              <Row className="g-2 align-items-center">
                <Col md={3}>
                  <Dropdown autoClose="outside">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      <FaFilter className="me-1" />

                      {filters.awc_name.length
                        ? `${filters.awc_name.length} AWC Names`
                        : "All AWC Names"}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        minWidth: "100%",
                      }}
                    >
                      {uniqueValues.awc_name.length === 0 ? (
                        <Dropdown.Item disabled>No options</Dropdown.Item>
                      ) : (
                        uniqueValues.awc_name.map((v) => (
                          <Dropdown.Item
                            key={v}
                            as="div"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Form.Check
                              type="checkbox"
                              label={v}
                              checked={filters.awc_name.includes(v)}
                              onChange={() =>
                                handleMultiSelectChange("awc_name", v)
                              }
                            />
                          </Dropdown.Item>
                        ))
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

                <Col md={3}>
                  <Dropdown autoClose="outside">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      <FaFilter className="me-1" />

                      {filters.awc_code.length
                        ? `${filters.awc_code.length} AWC Codes`
                        : "All AWC Codes"}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        minWidth: "100%",
                      }}
                    >
                      {uniqueValues.awc_code.length === 0 ? (
                        <Dropdown.Item disabled>No options</Dropdown.Item>
                      ) : (
                        uniqueValues.awc_code.map((v) => (
                          <Dropdown.Item
                            key={v}
                            as="div"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Form.Check
                              type="checkbox"
                              label={v}
                              checked={filters.awc_code.includes(v)}
                              onChange={() =>
                                handleMultiSelectChange("awc_code", v)
                              }
                            />
                          </Dropdown.Item>
                        ))
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

                <Col md={2}>
                  <Dropdown autoClose="outside">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      <FaFilter className="me-1" />

                      {filters.quarter.length
                        ? `${filters.quarter.length} Quarters`
                        : "All Quarters"}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        minWidth: "100%",
                      }}
                    >
                      {uniqueValues.quarter.length === 0 ? (
                        <Dropdown.Item disabled>No options</Dropdown.Item>
                      ) : (
                        uniqueValues.quarter.map((v) => (
                          <Dropdown.Item
                            key={v}
                            as="div"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Form.Check
                              type="checkbox"
                              label={v}
                              checked={filters.quarter.includes(v)}
                              onChange={() =>
                                handleMultiSelectChange("quarter", v)
                              }
                            />
                          </Dropdown.Item>
                        ))
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

                <Col md={2}>
                  <Dropdown autoClose="outside">
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      <FaFilter className="me-1" />

                      {filters.financial_year.length
                        ? `${filters.financial_year.length} Fin. Years`
                        : "All Fin. Years"}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                      style={{
                        maxHeight: "240px",
                        overflowY: "auto",
                        minWidth: "100%",
                      }}
                    >
                      {uniqueValues.financial_year.length === 0 ? (
                        <Dropdown.Item disabled>No options</Dropdown.Item>
                      ) : (
                        uniqueValues.financial_year.map((v) => (
                          <Dropdown.Item
                            key={v}
                            as="div"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Form.Check
                              type="checkbox"
                              label={v}
                              checked={filters.financial_year.includes(v)}
                              onChange={() =>
                                handleMultiSelectChange("financial_year", v)
                              }
                            />
                          </Dropdown.Item>
                        ))
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>

                <Col md={2}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      placeholder="Search..."
                      value={searchText}
                      onChange={handleSearchChange}
                    />
                  </InputGroup>
                </Col>
              </Row>

              <Row className="mt-2">
                <Col className="d-flex gap-2 justify-content-end">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </Button>

                  <Button
                    variant="success"
                    size="sm"
                    onClick={exportToExcel}
                    disabled={!filteredAllocations.length}
                  >
                    <FaFileExcel className="me-1" /> Excel
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={exportToPDF}
                    disabled={!filteredAllocations.length}
                  >
                    <FaFilePdf className="me-1" /> PDF
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Grant-wise Master Table */}

          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Grant Wise Stock Allocation Records
              </h5>

              <div className="d-flex align-items-center gap-2">
                <Badge bg="primary" pill>
                  {filteredAllocations.length} entries
                </Badge>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              <div
                className="dpo-table-wrapper"
                style={{ overflowX: "auto" }}
                ref={tableRef}
              >
                {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : (
                  <Table
                    hover
                    className="dpo-data-table mb-0 sa-grant-master-table"
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
                            className="text-center align-middle sa-grant-group-header"
                          >
                            {cat.title}
                          </th>
                        ))}

                        <th
                          colSpan={FOOD_FIELDS.length}
                          className="text-center align-middle sa-food-group-header"
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
                            No stock allocation records found.
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
                                {col.key === "quarter" && record[col.key] ? (
                                  <Badge className="sa-quarter-badge">
                                    {record[col.key]}
                                  </Badge>
                                ) : (
                                  record[col.key] || "—"
                                )}
                              </td>
                            ))}

                            {GRANT_CATEGORIES.flatMap((cat) => {
                              return [15, 30, 31]

                                .map((grantId, grantIndex) => (
                                  <td
                                    key={`${cat.countKey}-${grantId}`}
                                    className="text-center sa-grant-cell"
                                  >
                                    {getGrantValue(
                                      record,
                                      cat.grantKey,
                                      grantIndex,
                                    )}
                                  </td>
                                ))

                                .concat([
                                  <td
                                    key={`${cat.countKey}-total`}
                                    className="text-end fw-semibold sa-total-cell"
                                  >
                                    {Number(
                                      record[cat.countKey] || 0,
                                    ).toLocaleString()}
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

                    {filteredAllocations.length > 0 && (
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
                              {totalsRow[cat.countKey]?.toLocaleString() || 0}
                            </th>,
                          ])}

                          {FOOD_FIELDS.map((food) => (
                            <th key={food.key} className="text-end">
                              {totalsRow[food.key]?.toLocaleString() || 0}
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

                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>

                  <span className="small text-muted">
                    Page {currentPage} of {totalPages || 1}
                  </span>

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default StockAllocation;
