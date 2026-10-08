
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Form, Button, ButtonGroup, InputGroup, Dropdown, Pagination } from "react-bootstrap";
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

const TABLE_COLUMNS = [
  { label: "District", key: "district" },
  { label: "Project", key: "project" },
  { label: "Sector", key: "sector" },
  { label: "AWC Code", key: "awc_code" },
  { label: "Month", key: "month" },
  { label: "Fin. Year", key: "financial_year" },
  { label: "Active Bene.", key: "active_beneficiaries", num: true },
  { label: "Total Bene.", key: "total_beneficiaries", strong: true },
  { label: "Pregnant/Lact", key: "pregnant_women_lactating_mothers", num: true },
  { label: "6m-3y", key: "children_6m_3y_beneficiaries", num: true },
  { label: "THR 25d", key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", num: true },
  { label: "HCM 3-6y", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "SAM 6m-6y", key: "sam_children_6m_6y", num: true },
  { label: "SUW 6m-6y", key: "suw_children_6m_6y", num: true },
  { label: "SAM 3-6y", key: "sam_children_3y_6y", num: true },
  { label: "SUW 3-6y", key: "suw_children_3y_6y", num: true },
  { label: "Mung Dal", key: "quarterly_packets_mung_dal_khichdi", num: true },
  { label: "P. Sattu", key: "quarterly_packets_poushik_sattu_mix", num: true },
  { label: "Sattu(gm)", key: "poushik_sattu_mix_75_days_packet_size_gm", num: true },
  { label: "Panj 2625", key: "panjeeri_75_days_2625gm_quarterly_packets", num: true },
  { label: "Panj 4625", key: "panjeeri_75_days_4625gm_quarterly_packets", num: true },
  { label: "Sattu 2250", key: "quarterly_packets_sattu_2250gm", num: true },
  { label: "Mix 1000", key: "quarterly_packets_mix_1000gm", num: true },
  { label: "Multi Aata", key: "quarterly_packets_multi_grain_aata_1250gm", num: true },
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
  table.style.cssText = `width:100%;border-collapse:collapse;table-layout:fixed;font-size:${fontSize}px;line-height:1.35;`;

  const createCell = (tagName, cell) => {
    const element = document.createElement(tagName);
    const value = typeof cell === "object" && cell !== null ? cell : { text: cell };
    element.textContent = value.text == null ? "" : String(value.text);
    if (value.colSpan) element.colSpan = value.colSpan;
    if (value.rowSpan) element.rowSpan = value.rowSpan;
    element.style.cssText = "border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:middle;overflow-wrap:anywhere;";
    return element;
  };

  const thead = document.createElement("thead");
  headers.forEach((headerRow) => {
    const row = document.createElement("tr");
    headerRow.forEach((cell) => {
      const header = createCell("th", cell);
      header.style.backgroundColor = "#6f42c1";
      header.style.color = "#fff";
      row.appendChild(header);
    });
    thead.appendChild(row);
  });
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((values) => {
    const row = document.createElement("tr");
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
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a3", orientation: "landscape" },
        pagebreak: { mode: ["css", "legacy"] }
      })
      .from(content)
      .save();
  } finally {
    content.remove();
  }
};

const SUMMARY_PILLS = [
  { key: "total_beneficiaries", label: "Total", icon: <FaUsers size={10} /> },
  { key: "active_beneficiaries", label: "Active", icon: <FaUserFriends size={10} /> },
  { key: "pregnant_women_lactating_mothers", label: "Preg/Lact", icon: <FaBaby size={10} /> },
  { key: "children_6m_3y_beneficiaries", label: "6m-3y", icon: <FaBaby size={10} /> },
  { key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", label: "THR 25d", icon: <FaUsers size={10} /> },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3-6y", icon: <FaUsers size={10} /> },
  { key: "sam_children_6m_6y", label: "SAM 6m-6y", icon: <FaBaby size={10} /> },
  { key: "suw_children_6m_6y", label: "SUW 6m-6y", icon: <FaBaby size={10} /> },
  { key: "sam_children_3y_6y", label: "SAM 3-6y", icon: <FaBaby size={10} /> },
  { key: "suw_children_3y_6y", label: "SUW 3-6y", icon: <FaBaby size={10} /> },
  { key: "quarterly_packets_mung_dal_khichdi", label: "Mung Dal", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_poushik_sattu_mix", label: "P. Sattu", icon: <FaBoxes size={10} /> },
  { key: "poushik_sattu_mix_75_days_packet_size_gm", label: "Sattu(gm)", icon: <FaBoxes size={10} /> },
  { key: "panjeeri_75_days_2625gm_quarterly_packets", label: "Panj 2625", icon: <FaBoxes size={10} /> },
  { key: "panjeeri_75_days_4625gm_quarterly_packets", label: "Panj 4625", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_sattu_2250gm", label: "Sattu 2250", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_mix_1000gm", label: "Mix 1000", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_multi_grain_aata_1250gm", label: "Multi Aata", icon: <FaBoxes size={10} /> },
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
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  
  const [aggregateView, setAggregateView] = useState("sector"); // 'sector' | 'project' | 'district'

  // Pagination States
  const [aggPage, setAggPage] = useState(1);
  const [detailsPage, setDetailsPage] = useState(1);

  // Supplies Dynamic States
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesViewMode, setSuppliesViewMode] = useState("district"); // 'district' | 'project' | 'sector' | 'awc'
  const [suppliesRecords, setSuppliesRecords] = useState({});
  const [suppliesDetailRecords, setSuppliesDetailRecords] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [selectedSupplyMonths, setSelectedSupplyMonths] = useState([]);
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

  // Fetch Food Item Counts dynamically from /categoryandfooditem/
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
      setRecords(data);
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Supplies Data Fetching (Handles both 'thr' and 'hcm' dynamically)
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

      // Use summary arrays directly from API
      const summaries = {
        overallSummary: result.overall_summary || [],
        districtSummary: result.district_summary || [],
        projectSummary: result.project_summary || [],
        sectorSummary: result.sector_summary || [],
      };

      if (reqId === suppliesReqId.current) {
        setSuppliesRecords(summaries);
        setSuppliesDetailRecords(result.data || []);
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

  // Unique months and financial years from detail records for filtering
  const suppliesMonths = useMemo(
    () => [...new Set(suppliesDetailRecords.map((record) => record.month).filter(Boolean))]
      .sort(),
    [suppliesDetailRecords]
  );
  const suppliesFinancialYears = useMemo(
    () => [...new Set(suppliesDetailRecords.map((record) => record.financial_year).filter(Boolean))]
      .sort(),
    [suppliesDetailRecords]
  );

  // Filtered detail records based on month/year filters
  const filteredDetailRecords = useMemo(() => {
    return suppliesDetailRecords.filter((record) =>
      (selectedSupplyMonths.length === 0 || selectedSupplyMonths.includes(record.month)) &&
      (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(record.financial_year))
    );
  }, [suppliesDetailRecords, selectedSupplyMonths, selectedSupplyFYs]);

  // Extract unique food items dynamically from suppliesRecords
  const suppliesFoodItems = useMemo(() => {
    const items = new Set();
    const summaries = suppliesRecords || {};
    [summaries.overallSummary, summaries.districtSummary, summaries.projectSummary, summaries.sectorSummary].forEach(arr => {
      if (arr) arr.forEach(row => items.add(row.food_item));
    });
    return Array.from(items);
  }, [suppliesRecords]);

  // District-wise aggregation from district_summary
  const districtSuppliesData = useMemo(() => {
    const districts = {};
    const summary = suppliesRecords.districtSummary || [];
    summary.forEach(item => {
      const key = item.district;
      if (!districts[key]) {
        districts[key] = { district: key, foodData: {} };
        suppliesFoodItems.forEach(fi => {
          districts[key].foodData[fi] = { received: 0, distributed: 0, balance: 0 };
        });
      }
      if (districts[key].foodData[item.food_item]) {
        districts[key].foodData[item.food_item].received += Number(item.received_quantity) || 0;
        districts[key].foodData[item.food_item].distributed += Number(item.distributed_quantity) || 0;
        districts[key].foodData[item.food_item].balance += Number(item.balance_quantity) || 0;
      }
    });
    return Object.values(districts).map(d => ({
      ...d,
      foodData: Object.entries(d.foodData).map(([food_item, vals]) => ({ food_item, ...vals }))
    })).sort((a, b) => a.district.localeCompare(b.district));
  }, [suppliesRecords, suppliesFoodItems]);

  // Project-wise aggregation from project_summary
  const projectSuppliesData = useMemo(() => {
    const projects = {};
    const summary = suppliesRecords.projectSummary || [];
    summary.forEach(item => {
      const key = item.project;
      if (!projects[key]) {
        projects[key] = { project: key, foodData: {} };
        suppliesFoodItems.forEach(fi => {
          projects[key].foodData[fi] = { received: 0, distributed: 0, balance: 0 };
        });
      }
      if (projects[key].foodData[item.food_item]) {
        projects[key].foodData[item.food_item].received += Number(item.received_quantity) || 0;
        projects[key].foodData[item.food_item].distributed += Number(item.distributed_quantity) || 0;
        projects[key].foodData[item.food_item].balance += Number(item.balance_quantity) || 0;
      }
    });
    return Object.values(projects).map(p => ({
      ...p,
      foodData: Object.entries(p.foodData).map(([food_item, vals]) => ({ food_item, ...vals }))
    })).sort((a, b) => a.project.localeCompare(b.project));
  }, [suppliesRecords, suppliesFoodItems]);

  // Sector-wise aggregation from sector_summary
  const sectorSuppliesData = useMemo(() => {
    const sectors = {};
    const summary = suppliesRecords.sectorSummary || [];
    summary.forEach(item => {
      const key = item.sector;
      if (!sectors[key]) {
        sectors[key] = { sector: key, foodData: {} };
        suppliesFoodItems.forEach(fi => {
          sectors[key].foodData[fi] = { received: 0, distributed: 0, balance: 0 };
        });
      }
      if (sectors[key].foodData[item.food_item]) {
        sectors[key].foodData[item.food_item].received += Number(item.received_quantity) || 0;
        sectors[key].foodData[item.food_item].distributed += Number(item.distributed_quantity) || 0;
        sectors[key].foodData[item.food_item].balance += Number(item.balance_quantity) || 0;
      }
    });
    return Object.values(sectors).map(s => ({
      ...s,
      foodData: Object.entries(s.foodData).map(([food_item, vals]) => ({ food_item, ...vals }))
    })).sort((a, b) => a.sector.localeCompare(b.sector));
  }, [suppliesRecords, suppliesFoodItems]);

  // AWC-wise aggregation from detail records
  const awcSuppliesData = useMemo(() => {
    const awcs = new Map();
    filteredDetailRecords.forEach((record) => {
      const awcKey = `${record.awc_code}|${record.awc_name}|${record.district}|${record.project}|${record.sector}`;
      if (!awcs.has(awcKey)) {
        awcs.set(awcKey, { 
          awc_code: record.awc_code, 
          awc_name: record.awc_name, 
          district: record.district,
          project: record.project, 
          sector: record.sector, 
          foodData: new Map() 
        });
      }
      const awc = awcs.get(awcKey);
      const quantities = awc.foodData.get(record.food_item) || { received: 0, distributed: 0, balance: 0 };
      quantities.received += Number(record.received_quantity) || 0;
      quantities.distributed += Number(record.distributed_quantity) || 0;
      quantities.balance += Number(record.balance_quantity) || 0;
      awc.foodData.set(record.food_item, quantities);
    });

    return Array.from(awcs.values()).map(awc => ({
      ...awc,
      foodData: Array.from(awc.foodData, ([food_item, quantities]) => ({ food_item, ...quantities })),
    })).sort((a, b) => a.district.localeCompare(b.district) || a.project.localeCompare(b.project) || a.sector.localeCompare(b.sector) || a.awc_name.localeCompare(b.awc_name));
  }, [filteredDetailRecords]);

  // Get the current data based on view mode
  const currentSuppliesData = useMemo(() => {
    switch (suppliesViewMode) {
      case 'district': return districtSuppliesData;
      case 'project': return projectSuppliesData;
      case 'sector': return sectorSuppliesData;
      case 'awc': return awcSuppliesData;
      default: return districtSuppliesData;
    }
  }, [suppliesViewMode, districtSuppliesData, projectSuppliesData, sectorSuppliesData, awcSuppliesData]);

  // Calculate Totals for dynamic supplies table
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

  // Main records table logic
  const uniqueMonths = useMemo(() => [...new Set(records.map(r => r.month).filter(Boolean))].sort(), [records]);
  const uniqueFYs = useMemo(() => [...new Set(records.map(r => r.financial_year).filter(Boolean))].sort(), [records]);
  const uniqueProjects = useMemo(() => [...new Set(records.map(r => r.project).filter(Boolean))].sort(), [records]);
  const uniqueSectors = useMemo(() => [...new Set(records.map(r => r.sector).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const m = selectedMonths.length === 0 ? true : selectedMonths.includes(r.month);
      const y = selectedFYs.length === 0 ? true : selectedFYs.includes(r.financial_year);
      const p = selectedProjects.length === 0 ? true : selectedProjects.includes(r.project);
      const s = selectedSectors.length === 0 ? true : selectedSectors.includes(r.sector);
      return m && y && p && s;
    });
  }, [records, selectedMonths, selectedFYs, selectedProjects, selectedSectors]);

  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return filteredRecords;
    const term = searchTerm.toLowerCase();
    return filteredRecords.filter(r =>
      (r.month || "").toLowerCase().includes(term) ||
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
        grouped[groupKey] = { groupKey, months: new Set(), fys: new Set(), totals: NUMERIC_AGG_FIELDS.reduce((a, { key }) => ({ ...a, [key]: 0 }), {}) };
      }
      if (r.month) grouped[groupKey].months.add(r.month);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => { grouped[groupKey].totals[key] += parseInt(r[key]) || 0; });
    });
    return Object.values(grouped).map(g => ({
      groupKey: g.groupKey, months: Array.from(g.months).join(", "), fys: Array.from(g.fys).join(", "), ...g.totals
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

  // Paginated Data Slices
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
      suppliesFoodItems.forEach(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        row[`${fi} - Received`] = fd ? fd.received : 0;
        row[`${fi} - Distributed`] = fd ? fd.distributed : 0;
        row[`${fi} - Remaining`] = fd ? fd.balance : 0;
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
    suppliesFoodItems.forEach(fi => {
      const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
      totalRow[`${fi} - Received`] = t.received.toLocaleString();
      totalRow[`${fi} - Distributed`] = t.distributed.toLocaleString();
      totalRow[`${fi} - Remaining`] = t.balance.toLocaleString();
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
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
      ...suppliesFoodItems.map(fi => ({ text: fi, colSpan: 3 }))
    ], [
      ...suppliesFoodItems.flatMap(() => ['Rec.', 'Dist.', 'Rem.'])
    ]];
    
    const rows = currentSuppliesData.map((r, i) => [
      i + 1,
      ...(suppliesViewMode === 'district' ? [r.district] : suppliesViewMode === 'project' ? [r.project] : suppliesViewMode === 'sector' ? [r.sector] : [r.district, r.project, r.sector, r.awc_name, r.awc_code]),
      ...suppliesFoodItems.flatMap(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        return fd ? [fd.received, fd.distributed, fd.balance] : [0, 0, 0];
      })
    ]);

    const groupColSpan = suppliesViewMode === 'awc' ? 5 : 1;
    const footer = [[
      { text: 'Total', colSpan: 1 + groupColSpan },
      ...suppliesFoodItems.flatMap(fi => {
        const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
        return [{ text: t.received.toLocaleString() }, { text: t.distributed.toLocaleString() }, { text: t.balance.toLocaleString() }];
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
    const data = aggregatedData.map((r, i) => ({ "S. No.": i + 1, [aggregateView]: r.groupKey, Months: r.months, "Fin. Years": r.fys, ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: r[f.key] }), {}) }));
    data.push({ "S. No.": "", [aggregateView]: "Total", ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: totalAggregated[f.key] }), {}) });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `${aggregateView}_Summary.xlsx`);
  };

  const exportAggToPDF = () => {
    const headers = [["S. No.", aggregateView, "Months", "Fin. Years", ...NUMERIC_AGG_FIELDS.map(f => f.label)]];
    const rows = aggregatedData.map((r, i) => [i + 1, r.groupKey, r.months, r.fys, ...NUMERIC_AGG_FIELDS.map(f => r[f.key])]);
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

  const exportDetailsToExcel = () => {
    const data = searchedRecords.map((r, i) => ({ "S. No.": i + 1, ...TABLE_COLUMNS.reduce((o, c) => ({ ...o, [c.label]: r[c.key] || 0 }), {}) }));
    data.push({ "S. No.": "", [TABLE_COLUMNS[0].label]: "Total", ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: totalDetailed[f.key] }), {}) });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "Supplementary_Records.xlsx");
  };

  const exportDetailsToPDF = () => {
    const headers = [["S. No.", ...TABLE_COLUMNS.map(c => c.label)]];
    const rows = searchedRecords.map((r, i) => [i + 1, ...TABLE_COLUMNS.map(c => r[c.key] || "—")]);
    const footer = [["", ...TABLE_COLUMNS.map(c => (c.num || c.strong) ? totalDetailed[c.key] : (c.key === "district" ? "Total" : ""))]];
    return handlePDFExport({
      title: "Supplementary Nutrition Records",
      filename: "Supplementary_Records.pdf",
      headers,
      rows,
      footer,
      fontSize: 7
    });
  };

  return (
    <div className="dashboard-container">
      {/* CSS Override to fix dropdown overlapping issues inside cards */}
      <style>{`
        .dpo-table-card {
          overflow: visible !important;
        }
        .dpo-table-header {
          border-radius: 10px 10px 0 0;
          position: relative;
          z-index: 20;
        }
        .dpo-multi-menu {
          z-index: 1060 !important;
        }
      `}</style>

      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        
        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          {/* DPO Purple Header Section */}
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
            <MultiSelectDropdown label="Month" options={uniqueMonths} selected={selectedMonths} onChange={setSelectedMonths} />
            <MultiSelectDropdown label="Financial Year" options={uniqueFYs} selected={selectedFYs} onChange={setSelectedFYs} />
            <MultiSelectDropdown label="Project" options={uniqueProjects} selected={selectedProjects} onChange={setSelectedProjects} />
            <MultiSelectDropdown label="Sector" options={uniqueSectors} selected={selectedSectors} onChange={setSelectedSectors} />
            <Button variant="outline-secondary" size="sm" className="dpo-filter-reset" onClick={() => { setSelectedMonths([]); setSelectedFYs([]); setSelectedProjects([]); setSelectedSectors([]); }}>
              Reset
            </Button>
          </div>

          {/* Wrapped Summary Pills */}
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

          {/* Supplies Received & Distributed Table (Dynamic with View Mode) */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Supplies Received & Distributed Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'thr' ? 'active' : ''}`} onClick={() => { setSuppliesTab('thr'); setSelectedSupplyMonths([]); setSelectedSupplyFYs([]); }}>THR</Button>
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'hcm' ? 'active' : ''}`} onClick={() => { setSuppliesTab('hcm'); setSelectedSupplyMonths([]); setSelectedSupplyFYs([]); }}>HCM</Button>
                </ButtonGroup>
                <ButtonGroup className="dpo-toggle-group" style={{ marginLeft: '8px', marginRight: '8px' }}>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'district' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('district')} title="District-wise">District</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'project' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('project')} title="Project-wise">Project</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'sector' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('sector')} title="Sector-wise">Sector</Button>
                  <Button className={`dpo-toggle-btn ${suppliesViewMode === 'awc' ? 'active' : ''}`} onClick={() => setSuppliesViewMode('awc')} title="AWC-wise">AWC</Button>
                </ButtonGroup>
                <MultiSelectDropdown
                  label="Month"
                  options={suppliesMonths}
                  selected={selectedSupplyMonths}
                  onChange={setSelectedSupplyMonths}
                />
                <MultiSelectDropdown
                  label="Financial Year"
                  options={suppliesFinancialYears}
                  selected={selectedSupplyFYs}
                  onChange={setSelectedSupplyFYs}
                />
                {(selectedSupplyMonths.length > 0 || selectedSupplyFYs.length > 0) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="dpo-filter-reset"
                    onClick={() => { setSelectedSupplyMonths([]); setSelectedSupplyFYs([]); }}
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
              <div className="dpo-table-wrapper">
                {suppliesLoading ? (
                  <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
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
                        {suppliesFoodItems.map((fi, idx) => (
                          <th key={`fi-${idx}`} colSpan="3" className="text-center" style={{ borderLeft: '1px solid #e9d5ff' }}>
                            {fi}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {suppliesFoodItems.map((fi, idx) => (
                          <React.Fragment key={`sub-${idx}`}>
                            <th className="text-end">Rec.</th>
                            <th className="text-end">Dist.</th>
                            <th className="text-end">Rem.</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSuppliesData.length === 0 ? (
                        <tr>
                          <td colSpan={suppliesViewMode === 'awc' ? 6 + suppliesFoodItems.length * 3 : 2 + suppliesFoodItems.length * 3} className="text-center p-4 text-muted">
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
                          {suppliesFoodItems.map((fi, idx) => {
                            const fd = row.foodData.find(f => f.food_item === fi);
                            return (
                              <React.Fragment key={`data-${idx}`}>
                                <td className="text-end">{fd ? fd.received.toLocaleString() : 0}</td>
                                <td className="text-end">{fd ? fd.distributed.toLocaleString() : 0}</td>
                                <td className="text-end text-primary"><strong>{fd ? fd.balance.toLocaleString() : 0}</strong></td>
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
                          {suppliesFoodItems.map((fi, idx) => {
                            const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
                            return (
                              <React.Fragment key={`foot-${idx}`}>
                                <th className="text-end">{t.received.toLocaleString()}</th>
                                <th className="text-end">{t.distributed.toLocaleString()}</th>
                                <th className="text-end">{t.balance.toLocaleString()}</th>
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
              <div className="dpo-table-wrapper">
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        <th style={{textTransform: 'capitalize'}}>{aggregateView}</th>
                        <th>Months</th>
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
                          <td>{row.months}</td>
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

          {/* Detailed Records Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaChartBar /> Detailed Records
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <InputGroup style={{maxWidth: '300px'}}>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search AWC, District..." 
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
              <div className="dpo-table-wrapper">
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        {TABLE_COLUMNS.map((col, i) => <th key={i} className={col.num || col.strong ? "text-end" : ""}>{col.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDetailed.length === 0 ? (
                        <tr><td colSpan={TABLE_COLUMNS.length + 1} className="text-center p-5 text-muted">No records found.</td></tr>
                      ) : currentDetailed.map((row, i) => (
                        <tr key={i}>
                          <td>{(detailsPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          {TABLE_COLUMNS.map((col, c) => {
                            const val = row[col.key];
                            if (col.strong) return <td key={c} className="text-end"><strong className="text-primary">{val ? Number(val).toLocaleString() : 0}</strong></td>;
                            if (col.num) return <td key={c} className="text-end">{val ? Number(val).toLocaleString() : 0}</td>;
                            return <td key={c}>{val || "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {searchedRecords.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          {TABLE_COLUMNS.map((col, c) => (
                            <th key={c} className={col.num || col.strong ? "text-end" : ""}>
                              {col.num || col.strong ? (totalDetailed[col.key]?.toLocaleString() || 0) : (c === 0 ? "Total" : "")}
                            </th>
                          ))}
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
