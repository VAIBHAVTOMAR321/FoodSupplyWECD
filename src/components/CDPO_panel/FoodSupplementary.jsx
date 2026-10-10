import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Container,
  Alert,
  Spinner,
  Card,
  Table,
  Row,
  Col,
  Button,
  Modal,
  Form,
  Badge,
  Dropdown,
  ProgressBar,
  Pagination,
  ButtonGroup,
  Tabs,
  Tab,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import "../../assets/css/foodSupplementary.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaChartBar,
  FaUsers,
  FaBox,
  FaBaby,
  FaSearch,
  FaSyncAlt,
  FaUserFriends,
  FaFileExcel,
  FaUpload,
  FaTimesCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSave,
  FaTimes,
  FaArrowLeft,
  FaFileDownload,
  FaLayerGroup,
  FaFilePdf,
  FaChevronDown,
  FaWarehouse,
  FaUtensils,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ── Grant-wise Excel / API schema ── */
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
const TABLE_COLUMNS = [
  { label: "S. No.", key: "_index" },
  { label: "District", key: "district" },
  { label: "Project", key: "project" },
  { label: "Sector", key: "sector" },
  { label: "AWC Name", key: "awc_name" },
  { label: "AWC Code", key: "awc_code" },
  { label: "Month", key: "month", badge: true },
  { label: "Fin. Year", key: "financial_year" },
  { label: "Pregnant/Lactating", key: "pregnant_woman_lactating_mother", num: true },
  { label: "Children 6m-3y", key: "children_6m_3y", num: true },
  { label: "SAM 6m-5y / SUW 6m-6y", key: "sam_children_6m_5y_suw_children_6m_6y", num: true },
  { label: "SAM 3y-5y / SUW 3y-6y", key: "sam_children_3y_5y_suw_children_3y_6y", num: true },
  { label: "HCM 3y-6y", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "Poushik Sattu Preg/Lact", key: "poushik_sattu_preg_lat", num: true },
  { label: "Panjeeri 6m-3y", key: "panjeeri_6m_3y", num: true },
  { label: "Panjeeri SAM/SUW", key: "panjeeri_sam_6m_5y_suw_6m_6y", num: true },
  { label: "Sattu SAM/SUW", key: "sattu_sam_3y_5y_suw_3y_6y", num: true },
  { label: "Mung Dal Khichdi", key: "mung_dal_khichdi_3y_6y", num: true },
  { label: "Multi Grain Aata", key: "multi_grain_aata_3y_6y", num: true },
  { label: "Actions", key: "_actions" },
];
const NUMERIC_AGG_FIELDS = TABLE_COLUMNS.filter((c) => c.num).map((c) => ({ label: c.label, key: c.key }));
const SUMMARY_PILLS = [
  { key: "pregnant_woman_lactating_mother", label: "Preg/Lact", icon: <FaBaby size={10} /> },
  { key: "children_6m_3y", label: "Children 6m-3y", icon: <FaBaby size={10} /> },
  { key: "sam_children_6m_5y_suw_children_6m_6y", label: "SAM/SUW 6m-6y", icon: <FaBaby size={10} /> },
  { key: "sam_children_3y_5y_suw_children_3y_6y", label: "SAM/SUW 3y-6y", icon: <FaBaby size={10} /> },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3y-6y", icon: <FaUsers size={10} /> },
  { key: "poushik_sattu_preg_lat", label: "Poushik Sattu", icon: <FaBox size={10} /> },
  { key: "panjeeri_6m_3y", label: "Panjeeri 6m-3y", icon: <FaBox size={10} /> },
  { key: "panjeeri_sam_6m_5y_suw_6m_6y", label: "Panjeeri SAM/SUW", icon: <FaBox size={10} /> },
  { key: "sattu_sam_3y_5y_suw_3y_6y", label: "Sattu SAM/SUW", icon: <FaBox size={10} /> },
  { key: "mung_dal_khichdi_3y_6y", label: "Mung Dal", icon: <FaBox size={10} /> },
  { key: "multi_grain_aata_3y_6y", label: "Multi Grain Aata", icon: <FaBox size={10} /> },
];
const initialFormData = {
  id: null, awc_code: "", month: "September", financial_year: "2026-2027",
  pregnant_woman_lactating_mother: 0, poushik_sattu_preg_lat: 0,
  children_6m_3y: 0, panjeeri_6m_3y: 0,
  sam_children_6m_5y_suw_children_6m_6y: 0, panjeeri_sam_6m_5y_suw_6m_6y: 0,
  sam_children_3y_5y_suw_children_3y_6y: 0, sattu_sam_3y_5y_suw_3y_6y: 0,
  hcm_beneficiaries_3y_6y: 0, mung_dal_khichdi_3y_6y: 0, multi_grain_aata_3y_6y: 0,
  pregnant_woman_lactating_mother_grant: [...GRANT_IDS],
  children_6m_3y_grant: [...GRANT_IDS],
  sam_children_6m_5y_suw_children_6m_6y_grant: [...GRANT_IDS],
  sam_children_3y_5y_suw_children_3y_6y_grant: [...GRANT_IDS],
  hcm_beneficiaries_3y_6y_grant: [...GRANT_IDS],
};

// --- Custom Multi-Select Dropdown Component ---
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
    <div className="fs-filter-group">
      <Form.Label className="fs-filter-label">{label}</Form.Label>
      <Dropdown autoClose="outside">
        <Dropdown.Toggle size="sm" variant="light" className="fs-multi-toggle">
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {getLabel()}
          </span>
          <FaChevronDown className="fs-multi-caret" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="fs-multi-menu">
          {options.length === 0 ? (
            <Dropdown.Item disabled>No options</Dropdown.Item>
          ) : (
            options.map((opt) => (
              <div key={opt} className="fs-multi-item" onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}>
                <Form.Check type="checkbox" checked={selected.includes(opt)} onChange={() => {}} label={opt} />
              </div>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

const FoodSupplementary = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Multi-Select States
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);

  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  
  // Food Items Modal state
  const [showFoodItemModal, setShowFoodItemModal] = useState(false);
  const [foodItems, setFoodItems] = useState({ hcm: [], thr: [] });
  const [loadingFoodItems, setLoadingFoodItems] = useState(false);

  const [formData, setFormData] = useState({ ...initialFormData });
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    total: 0, uploaded: 0, failed: 0, errors: [], currentRow: 0, isUploading: false, isComplete: false, fileName: "",
  });
  const fileInputRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Supplies Dynamic States
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesViewMode, setSuppliesViewMode] = useState("sector");
  const [suppliesRecords, setSuppliesRecords] = useState([]);
  const [suppliesDetailRecords, setSuppliesDetailRecords] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [suppliesError, setSuppliesError] = useState("");
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-details/");
      const data = Array.isArray(response.data) ? response.data : response.data?.results || response.data?.data || [];
      setRecords(data);
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Dynamic Supplies Data Fetching (THR & HCM for CDPO)
  const fetchSuppliesData = useCallback(async (type) => {
    const reqId = ++suppliesReqId.current;
    setSuppliesLoading(true);
    setSuppliesError("");
    try {
      const response = await api.get(`/cdpo/${type}-awc-food-reconciliation/`);
      if (reqId !== suppliesReqId.current) return;

      const reconciliation = response.data?.results;
      if (!reconciliation?.success) {
        throw new Error(reconciliation?.message || "The reconciliation API returned an unsuccessful response.");
      }
      if (!Array.isArray(reconciliation.data)) {
        throw new Error("The reconciliation response does not contain detail records.");
      }

      if (reqId === suppliesReqId.current) {
        setSuppliesRecords(reconciliation.sector_month_summary || []);
        setSuppliesDetailRecords(reconciliation.data || []);
      }
    } catch (err) {
      if (reqId === suppliesReqId.current) {
        console.error(`Failed to fetch ${type.toUpperCase()} supplies data:`, err);
        setSuppliesRecords([]);
        setSuppliesDetailRecords([]);
        setSuppliesError(`Failed to fetch ${type.toUpperCase()} supplies data.`);
      }
    } finally {
      if (reqId === suppliesReqId.current) {
        setSuppliesLoading(false);
      }
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchSuppliesData(suppliesTab);
  }, [fetchSuppliesData, suppliesTab]);

  const suppliesMonths = useMemo(
    () => [...new Set(suppliesRecords.map((record) => record.month).filter(Boolean))]
      .sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b)),
    [suppliesRecords]
  );
  const suppliesFinancialYears = useMemo(
    () => [...new Set(suppliesRecords.map((record) => record.financial_year).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [suppliesRecords]
  );

  const filteredSuppliesRecords = useMemo(
    () => suppliesRecords.filter((record) =>
      (selectedSupplyMonths.length === 0 || selectedSupplyMonths.includes(record.month)) &&
      (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(record.financial_year))
    ),
    [suppliesRecords, selectedSupplyMonths, selectedSupplyFYs]
  );

  // Filtered detail records for AWC-wise view
  const filteredDetailRecords = useMemo(() => {
    return suppliesDetailRecords.filter((record) =>
      (selectedSupplyMonths.length === 0 || selectedSupplyMonths.includes(record.month)) &&
      (selectedSupplyFYs.length === 0 || selectedSupplyFYs.includes(record.financial_year))
    );
  }, [suppliesDetailRecords, selectedSupplyMonths, selectedSupplyFYs]);

  // Sector-wise aggregation (existing logic)
  const suppliesData = useMemo(() => {
    const sectors = new Map();
    suppliesRecords.forEach((record) => {
      if (!sectors.has(record.sector)) {
        sectors.set(record.sector, new Map());
      }

      const foodItems = sectors.get(record.sector);
      const quantities = foodItems.get(record.food_item) || { received: 0, distributed: 0, balance: 0 };
      quantities.received += Number(record.received_quantity) || 0;
      quantities.distributed += Number(record.distributed_quantity) || 0;
      quantities.balance += Number(record.balance_quantity) || 0;
      foodItems.set(record.food_item, quantities);
    });

    return Array.from(sectors, ([sector, foodItems]) => ({
      sector,
      foodData: Array.from(foodItems, ([food_item, quantities]) => ({ food_item, ...quantities })),
    }));
  }, [suppliesRecords]);

  // AWC-wise aggregation
  const awcSuppliesData = useMemo(() => {
    const awcs = new Map();
    filteredDetailRecords.forEach((record) => {
      const awcKey = `${record.awc_code}|${record.awc_name}|${record.sector}`;
      if (!awcs.has(awcKey)) {
        awcs.set(awcKey, { awc_code: record.awc_code, awc_name: record.awc_name, sector: record.sector, foodData: new Map() });
      }
      const awc = awcs.get(awcKey);
      const quantities = awc.foodData.get(record.food_item) || { received: 0, distributed: 0, balance: 0 };
      quantities.received += Number(record.received_quantity) || 0;
      quantities.distributed += Number(record.distributed_quantity) || 0;
      quantities.balance += Number(record.balance_quantity) || 0;
      awc.foodData.set(record.food_item, quantities);
    });

    return Array.from(awcs.values()).map((awc) => ({
      ...awc,
      foodData: Array.from(awc.foodData, ([food_item, quantities]) => ({ food_item, ...quantities })),
    })).sort((a, b) => a.sector.localeCompare(b.sector) || a.awc_name.localeCompare(b.awc_name));
  }, [filteredDetailRecords]);

  // Keep food columns stable while period filters change.
  const suppliesFoodItems = useMemo(() => {
    return [...new Set(suppliesRecords.map((record) => record.food_item).filter(Boolean))];
  }, [suppliesRecords]);

  // Calculate Totals for dynamic supplies table
  const suppliesTotals = useMemo(() => {
    const totals = {};
    suppliesFoodItems.forEach((fi) => {
      totals[fi] = { received: 0, distributed: 0, balance: 0 };
    });
    const data = suppliesViewMode === "sector" ? suppliesData : awcSuppliesData;
    data.forEach((row) => {
      row.foodData.forEach((fd) => {
        if (totals[fd.food_item]) {
          totals[fd.food_item].received += fd.received || 0;
          totals[fd.food_item].distributed += fd.distributed || 0;
          totals[fd.food_item].balance += fd.balance || 0;
        }
      });
    });
    return totals;
  }, [suppliesData, awcSuppliesData, suppliesFoodItems, suppliesViewMode]);

  const uniqueMonths = useMemo(() => [...new Set(records.map((r) => r.month).filter(Boolean))].sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b)), [records]);
  const uniqueFYs = useMemo(() => [...new Set(records.map((r) => r.financial_year).filter(Boolean))].sort(), [records]);
  const uniqueProjects = useMemo(() => [...new Set(records.map((r) => r.project).filter(Boolean))].sort(), [records]);
  const uniqueSectors = useMemo(() => [...new Set(records.map((r) => r.sector).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const m = selectedMonths.length === 0 ? true : selectedMonths.includes(r.month);
      const y = selectedFYs.length === 0 ? true : selectedFYs.includes(r.financial_year);
      const p = selectedProjects.length === 0 ? true : selectedProjects.includes(r.project);
      const s = selectedSectors.length === 0 ? true : selectedSectors.includes(r.sector);
      return m && y && p && s;
    });
  }, [records, selectedMonths, selectedFYs, selectedProjects, selectedSectors]);

  useEffect(() => {
    if (!filteredRecords.length) { setSummary(null); return; }
    const totals = NUMERIC_AGG_FIELDS.reduce((acc, field) => {
      acc[field.key] = filteredRecords.reduce((sum, row) => sum + (Number(row[field.key]) || 0), 0);
      return acc;
    }, {});
    setSummary(totals);
  }, [filteredRecords]);

  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return filteredRecords;
    const term = searchTerm.toLowerCase();
    return filteredRecords.filter((r) =>
      (r.month || "").toLowerCase().includes(term) ||
      (r.financial_year || "").toLowerCase().includes(term) ||
      (r.district || "").toLowerCase().includes(term) ||
      (r.project || "").toLowerCase().includes(term) ||
      (r.sector || "").toLowerCase().includes(term) ||
      (r.awc_code || "").toLowerCase().includes(term)
    );
  }, [filteredRecords, searchTerm]);

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

  /* ── Aggregation Logic for Sector-wise Summary Table ── */
  const aggregatedData = useMemo(() => {
    if (!filteredRecords.length) return [];
    const grouped = {};
    filteredRecords.forEach((r) => {
      const groupKey = r.sector || "—";
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          groupKey,
          months: new Set(),
          fys: new Set(),
          totals: NUMERIC_AGG_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {}),
        };
      }
      if (r.month) grouped[groupKey].months.add(r.month);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => {
        grouped[groupKey].totals[key] += parseInt(r[key]) || 0;
      });
    });
    return Object.values(grouped).map((g) => ({
      groupKey: g.groupKey,
      months: Array.from(g.months).join(", "),
      fys: Array.from(g.fys).join(", "),
      ...g.totals,
    }));
  }, [filteredRecords]);

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

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  /* ─── Grant Wise Master Excel Template Download ─── */
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const categoryRow = [...EXCEL_META_COLUMNS.map(() => ""), ...GRANT_CATEGORIES.flatMap((c) => [c.title, "", "", ""]), ...FOOD_FIELDS.map(() => "Supplementary Nutrition Details")];
    const headerRow = [
      ...EXCEL_META_COLUMNS.map((c) => c.header),
      ...GRANT_CATEGORIES.flatMap(() => ["Grant 15", "Grant 30", "Grant 31", "TOTAL"]),
      ...FOOD_FIELDS.map((f) => f.header),
    ];
    const sampleRow = ["Almora", "Bhaisiyachana [0506401]", "SERAGHAT [02]", "HATOLA-02", "5064010220", "September", "2026-2027"];
    GRANT_CATEGORIES.forEach((c, idx) => sampleRow.push(15, 30, 31, [25, 30, 10, 8, 40][idx]));
    sampleRow.push(25, 30, 10, 0, 40, 40);
    const ws = XLSX.utils.aoa_to_sheet([categoryRow, headerRow, sampleRow, Array(headerRow.length).fill("")]);
    const merges = [];
    GRANT_CATEGORIES.forEach((_, idx) => {
      const col = EXCEL_META_COLUMNS.length + idx * 4;
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 3 } });
    });
    const foodStart = EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.length * 4;
    if (FOOD_FIELDS.length > 1) merges.push({ s: { r: 0, c: foodStart }, e: { r: 0, c: foodStart + FOOD_FIELDS.length - 1 } });
    ws["!merges"] = merges;
    ws["!cols"] = headerRow.map((h) => ({ wch: Math.max(String(h || "").length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, "Grant Wise Master");
    XLSX.writeFile(wb, "Grant_Wise_Master_Template.xlsx");
  };

  /* ─── Excel Upload Handler ─── */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload a valid Excel (.xlsx, .xls) or CSV file.");
      return;
    }
    processExcelFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const normalizeHeader = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const processExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
        const headerIdx = rows.findIndex((row) => row.some((cell) => normalizeHeader(cell) === normalizeHeader("AWC CODE")));
        if (headerIdx < 0) throw new Error("Could not find the AWC CODE header. Please use the downloaded Grant Wise Master template.");
        const header = rows[headerIdx].map((v) => String(v || "").trim());
        const idxOf = (label) => header.findIndex((h) => normalizeHeader(h) === normalizeHeader(label));
        const metaIndexes = EXCEL_META_COLUMNS.map((c) => idxOf(c.header));
        // Some workbooks have a grant subheader row (e.g. "Grant 15"), while
        // the downloaded template may place sample/data rows immediately after
        // the main header. Skip that row only when it is actually a subheader.
        const possibleSubheader = rows[headerIdx + 1] || [];
        const hasSubheader = possibleSubheader.some((cell) => {
          const normalized = normalizeHeader(cell);
          return normalized === normalizeHeader("Grant 15") ||
            normalized === normalizeHeader("No. of Beneficiaries");
        });
        const dataStartIdx = headerIdx + (hasSubheader ? 2 : 1);
        const dataRows = rows
          .slice(dataStartIdx)
          .filter((row) => row.some((v) => v !== "" && v !== null && v !== undefined));
        const parsedRecords = dataRows.map((row, i) => {
          const record = { _rowNum: dataStartIdx + i + 1 };
          EXCEL_META_COLUMNS.forEach((col, j) => { record[col.key] = String(row[metaIndexes[j]] ?? "").trim(); });
          GRANT_CATEGORIES.forEach((cat, catIdx) => {
            const base = EXCEL_META_COLUMNS.length + catIdx * 4;
            const grantValues = GRANT_IDS.filter((grantId, grantIdx) => {
              const cell = row[base + grantIdx];
              return cell !== "" && cell !== null && cell !== undefined && cell !== 0 && String(cell).trim() !== "0";
            });
            record[cat.countKey] = Number(row[base + 3]) || 0;
            record[cat.grantKey] = grantValues.length ? grantValues : [...GRANT_IDS];
          });
          const foodStart = EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.length * 4;
          FOOD_FIELDS.forEach((food, i) => { record[food.key] = Number(row[foodStart + i]) || 0; });
          return record;
        }).filter((r) => r.awc_code || r.month || r.financial_year);
        if (!parsedRecords.length) throw new Error("No data rows found in the Excel file.");

        setShowUploadModal(true);
        setUploadProgress({ total: parsedRecords.length, uploaded: 0, failed: 0, errors: [], currentRow: 0, isUploading: true, isComplete: false, fileName: file.name });
        let uploadedCount = 0, failedCount = 0;
        const errorsList = [];
        for (let i = 0; i < parsedRecords.length; i++) {
          const rec = parsedRecords[i];
          setUploadProgress((prev) => ({ ...prev, currentRow: i + 1 }));
          if (!rec.awc_code || !rec.month || !rec.financial_year) {
            failedCount++;
            errorsList.push({ row: rec._rowNum, awcCode: rec.awc_code || "—", error: "AWC CODE, MONTH and FINANCIAL YEAR are required." });
            setUploadProgress((prev) => ({ ...prev, uploaded: uploadedCount, failed: failedCount, errors: [...errorsList] }));
            continue;
          }
          const payload = { awc_code: rec.awc_code, month: rec.month, financial_year: rec.financial_year };
          GRANT_CATEGORIES.forEach((cat) => {
            payload[cat.countKey] = Number(rec[cat.countKey]) || 0;
            payload[cat.grantKey] = rec[cat.grantKey];
          });
          FOOD_FIELDS.forEach((food) => { payload[food.key] = Number(rec[food.key]) || 0; });
          try {
            const response = await api.post("/supplementary-nutrition-details/", payload);
            // API returns a record object; count successful 2xx responses as uploaded.
            if (response.status >= 200 && response.status < 300) uploadedCount++;
          } catch (err) {
            failedCount++;
            const body = err?.response?.data;
            const errMsg = body?.detail || body?.message || body?.error || (body ? JSON.stringify(body) : err.message) || "Unknown error";
            errorsList.push({ row: rec._rowNum, awcCode: rec.awc_code || "—", error: errMsg });
          }
          setUploadProgress((prev) => ({ ...prev, uploaded: uploadedCount, failed: failedCount, errors: [...errorsList] }));
        }
        setUploadProgress((prev) => ({ ...prev, isUploading: false, isComplete: true }));
        if (uploadedCount) setSuccess(`${uploadedCount} record(s) uploaded successfully.`);
        await fetchData();
      } catch (err) {
        setError("Failed to process Excel file: " + (err.message || "Unknown error"));
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ─── Edit / Delete ─── */
  const handleEdit = (record) => {
    setFormData({ ...initialFormData, ...record });
    setFormErrors({});
    setIsEditing(true);
    setView("form");
  };

  const handleDeleteClick = (record) => {
    setDeleteTarget(record);
    setShowDeleteModal(true);
  };

  const handleViewClick = (record) => {
    setViewRecord(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewRecord(null);
  };

  // --- Fetch Food Items dynamically from /categoryandfooditem/ ---
  const handleOpenFoodItemModal = async () => {
    setLoadingFoodItems(true);
    setShowFoodItemModal(true);
    try {
      const response = await api.get("/categoryandfooditem/");
      const data = response.data?.food_data || [];
      
      const hcm = data.filter(item => item.category === "HCM");
      const thr = data.filter(item => item.category === "THR");
      
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

  const validateForm = (data) => {
    const errors = {};
    if (!data.awc_code) errors.awc_code = "AWC Code is required";
    if (!data.month) errors.month = "Month is required";
    if (!data.financial_year) errors.financial_year = "Financial year is required";
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormLoading(true);
    try {
      if (isEditing) {
        const payload = { ...formData };
        delete payload.district; delete payload.project; delete payload.sector; delete payload.awc_name; delete payload.created_at; delete payload.updated_at;
        await api.put("/supplementary-nutrition-details/", payload);
        setSuccess("Record updated successfully.");
      }
      setView("list");
      fetchData();
    } catch (err) {
      setError("Failed to update record.");
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete("/supplementary-nutrition-details/", { data: { ids: [deleteTarget.id] } });
      setSuccess("Record deleted successfully.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError("Failed to delete record.");
      console.error(err);
    }
  };

  const renderFormField = (label, name, type = "text", placeholder = "") => {
    const isSelect = type === "select";
    return (
      <Form.Group className="mb-3">
        <Form.Label className="fs-field-label">{label}</Form.Label>
        {isSelect ? (
          <Form.Select name={name} value={formData[name] ?? ""} onChange={handleInputChange} className={formErrors[name] ? "is-invalid" : ""}>
            {monthNames.map((m) => (<option key={m} value={m}>{m}</option>))}
          </Form.Select>
        ) : (
          <Form.Control type={type} name={name} value={formData[name] ?? ""} onChange={handleInputChange} placeholder={placeholder} className={formErrors[name] ? "is-invalid" : ""} />
        )}
        {formErrors[name] && <Form.Control.Feedback type="invalid">{formErrors[name]}</Form.Control.Feedback>}
      </Form.Group>
    );
  };

  const closeUploadModal = () => {
    if (uploadProgress.isUploading) return;
    setShowUploadModal(false);
    setUploadProgress({ total: 0, uploaded: 0, failed: 0, errors: [], currentRow: 0, isUploading: false, isComplete: false, fileName: "" });
  };

  /* ─── Dynamic Export Handlers (Excel & PDF) ─── */
  const exportSuppliesToExcel = () => {
    const data = (suppliesViewMode === "sector" ? suppliesData : awcSuppliesData).map((r, i) => {
      const row = { "S. No.": i + 1 };
      if (suppliesViewMode === "sector") {
        row.Sector = r.sector;
      } else {
        row.Sector = r.sector;
        row["AWC Name"] = r.awc_name;
        row["AWC Code"] = r.awc_code;
      }
      suppliesFoodItems.forEach((fi) => {
        const fd = r.foodData.find((f) => f.food_item === fi);
        row[`${fi} - Received`] = fd ? fd.received : 0;
        row[`${fi} - Distributed`] = fd ? fd.distributed : 0;
        row[`${fi} - Remaining`] = fd ? fd.balance : 0;
      });
      return row;
    });

    const totalRow = { "S. No.": "" };
    if (suppliesViewMode === "sector") {
      totalRow.Sector = "Total";
    } else {
      totalRow.Sector = "Total";
      totalRow["AWC Name"] = "";
      totalRow["AWC Code"] = "";
    }
    suppliesFoodItems.forEach((fi) => {
      const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
      totalRow[`${fi} - Received`] = t.received.toLocaleString();
      totalRow[`${fi} - Distributed`] = t.distributed.toLocaleString();
      totalRow[`${fi} - Remaining`] = t.balance.toLocaleString();
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    XLSX.writeFile(wb, `Supplies_${suppliesTab.toUpperCase()}_${suppliesViewMode === "sector" ? "Sector" : "AWC"}_Summary.xlsx`);
  };

  const exportSuppliesToPDF = () => {
    const data = suppliesViewMode === "sector" ? suppliesData : awcSuppliesData;
    
    let html = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0;">
          <div style="font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif; padding: 20px;">
            <h3 style="text-align:center; margin-bottom:20px; color:#1e3a5f;">
              Supplies ${suppliesTab.toUpperCase()} ${suppliesViewMode === "sector" ? "Sector-wise" : "AWC-wise"} Summary
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:10px;">
              <thead>
                <tr style="background-color:#4f46e5; color:white;">
                  <th style="border:1px solid #ddd; padding:6px 4px;">S. No.</th>
                  <th style="border:1px solid #ddd; padding:6px 4px;">Sector</th>
                  ${suppliesViewMode === "awc" ? `
                    <th style="border:1px solid #ddd; padding:6px 4px;">AWC Name</th>
                    <th style="border:1px solid #ddd; padding:6px 4px;">AWC Code</th>
                  ` : ""}
                  ${suppliesFoodItems.map(fi => `
                    <th style="border:1px solid #ddd; padding:6px 4px; colspan:3; text-align:center;">${fi}</th>
                  `).join("")}
                </tr>
                <tr style="background-color:#e0e7ff;">
                  <th style="border:1px solid #ddd; padding:4px;">S. No.</th>
                  <th style="border:1px solid #ddd; padding:4px;">Sector</th>
                  ${suppliesViewMode === "awc" ? `
                    <th style="border:1px solid #ddd; padding:4px;">AWC Name</th>
                    <th style="border:1px solid #ddd; padding:4px;">AWC Code</th>
                  ` : ""}
                  ${suppliesFoodItems.flatMap(() => [
                    `<th style="border:1px solid #ddd; padding:4px; text-align:right;">Rec.</th>`,
                    `<th style="border:1px solid #ddd; padding:4px; text-align:right;">Dist.</th>`,
                    `<th style="border:1px solid #ddd; padding:4px; text-align:right;">Rem.</th>`
                  ]).join("")}
                </tr>
              </thead>
              <tbody>
                ${data.map((r, i) => `
                  <tr>
                    <td style="border:1px solid #ddd; padding:4px; text-align:center;">${i + 1}</td>
                    <td style="border:1px solid #ddd; padding:4px;"><strong>${r.sector}</strong></td>
                    ${suppliesViewMode === "awc" ? `
                      <td style="border:1px solid #ddd; padding:4px;">${r.awc_name}</td>
                      <td style="border:1px solid #ddd; padding:4px;">${r.awc_code}</td>
                    ` : ""}
                    ${suppliesFoodItems.map(fi => {
                      const fd = r.foodData.find(f => f.food_item === fi);
                      return `
                        <td style="border:1px solid #ddd; padding:4px; text-align:right;">${fd ? fd.received.toLocaleString() : 0}</td>
                        <td style="border:1px solid #ddd; padding:4px; text-align:right;">${fd ? fd.distributed.toLocaleString() : 0}</td>
                        <td style="border:1px solid #ddd; padding:4px; text-align:right; color:#2563eb; font-weight:bold;">${fd ? fd.balance.toLocaleString() : 0}</td>
                      `;
                    }).join("")}
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr style="background-color:#f1f5f9; font-weight:bold;">
                  <td style="border:1px solid #ddd; padding:4px;"></td>
                  <td style="border:1px solid #ddd; padding:4px;">Total</td>
                  ${suppliesViewMode === "awc" ? `
                    <td style="border:1px solid #ddd; padding:4px;"></td>
                    <td style="border:1px solid #ddd; padding:4px;"></td>
                  ` : ""}
                  ${suppliesFoodItems.map(fi => {
                    const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
                    return `
                      <td style="border:1px solid #ddd; padding:4px; text-align:right;">${t.received.toLocaleString()}</td>
                      <td style="border:1px solid #ddd; padding:4px; text-align:right;">${t.distributed.toLocaleString()}</td>
                      <td style="border:1px solid #ddd; padding:4px; text-align:right; color:#2563eb;">${t.balance.toLocaleString()}</td>
                    `;
                  }).join("")}
                </tr>
              </tfoot>
            </table>
          </div>
        </body>
      </html>
    `;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Supplies_${suppliesTab.toUpperCase()}_${suppliesViewMode === "sector" ? "Sector" : "AWC"}_Summary.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a3", orientation: "landscape" }
    };

    html2pdf().set(opt).from(html).save();
  };

  const exportAggToExcel = () => {
    const dataToExport = aggregatedData.map((row, i) => {
      const obj = { "S. No.": i + 1, Sector: row.groupKey, Months: row.months, "Fin. Years": row.fys };
      NUMERIC_AGG_FIELDS.forEach((f) => (obj[f.label] = row[f.key]));
      return obj;
    });
    const totalObj = { "S. No.": "", Sector: "Total", Months: "", "Fin. Years": "" };
    NUMERIC_AGG_FIELDS.forEach((f) => (totalObj[f.label] = totalAggregated[f.key]));
    dataToExport.push(totalObj);

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sector Summary");
    XLSX.writeFile(wb, "Sector_Summary.xlsx");
  };

  const exportAggToPDF = () => {
    let html = `
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0;">
          <div style="font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif; padding: 20px;">
            <h3 style="text-align:center; margin-bottom:20px; color:#1e3a5f;">Sector-wise Aggregated Summary</h3>
            <table style="width:100%; border-collapse:collapse; font-size:9px;">
              <thead>
                <tr style="background-color:#4f46e5; color:white;">
                  <th style="border:1px solid #ddd; padding:6px 4px;">S. No.</th>
                  <th style="border:1px solid #ddd; padding:6px 4px;">Sector</th>
                  <th style="border:1px solid #ddd; padding:6px 4px;">Months</th>
                  <th style="border:1px solid #ddd; padding:6px 4px;">Fin. Years</th>
                  ${NUMERIC_AGG_FIELDS.map(f => `<th style="border:1px solid #ddd; padding:6px 4px; text-align:right;">${f.label}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${aggregatedData.map((row, i) => `
                  <tr>
                    <td style="border:1px solid #ddd; padding:4px; text-align:center;">${i + 1}</td>
                    <td style="border:1px solid #ddd; padding:4px;"><strong>${row.groupKey}</strong></td>
                    <td style="border:1px solid #ddd; padding:4px;">${row.months}</td>
                    <td style="border:1px solid #ddd; padding:4px;">${row.fys}</td>
                    ${NUMERIC_AGG_FIELDS.map(f => `
                      <td style="border:1px solid #ddd; padding:4px; text-align:right;">${row[f.key] ? Number(row[f.key]).toLocaleString() : 0}</td>
                    `).join("")}
                  </tr>
                `).join("")}
              </tbody>
              <tfoot>
                <tr style="background-color:#f1f5f9; font-weight:bold;">
                  <td style="border:1px solid #ddd; padding:4px;"></td>
                  <td style="border:1px solid #ddd; padding:4px;">Total</td>
                  <td style="border:1px solid #ddd; padding:4px;"></td>
                  <td style="border:1px solid #ddd; padding:4px;"></td>
                  ${NUMERIC_AGG_FIELDS.map(f => `
                    <td style="border:1px solid #ddd; padding:4px; text-align:right;">${totalAggregated[f.key]?.toLocaleString() || 0}</td>
                  `).join("")}
                </tr>
              </tfoot>
            </table>
          </div>
        </body>
      </html>
    `;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: "Sector_Summary.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a3", orientation: "landscape" }
    };

    html2pdf().set(opt).from(html).save();
  };

  const exportDetailsToExcel = () => {
    const cols = TABLE_COLUMNS.filter((c) => c.key !== "_index" && c.key !== "_actions");
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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "Supplementary_Records.xlsx");
  };

  const exportDetailsToPDF = () => {
    const cols = TABLE_COLUMNS.filter((c) => c.key !== "_index" && c.key !== "_actions");
    
    let html = `
      <div style="font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif; padding: 20px;">
        <h3 style="text-align:center; margin-bottom:20px; color:#1e3a5f;">Supplementary Nutrition Records</h3>
        <table style="width:100%; border-collapse:collapse; font-size:8px;">
          <thead>
            <tr style="background-color:#4f46e5; color:white;">
              <th style="border:1px solid #ddd; padding:5px 3px;">S. No.</th>
              ${cols.map(c => `<th style="border:1px solid #ddd; padding:5px 3px; text-align:${c.num || c.strong ? 'right' : 'center'};">${c.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${searchedRecords.map((row, i) => `
              <tr>
                <td style="border:1px solid #ddd; padding:3px; text-align:center;">${i + 1}</td>
                ${cols.map(c => {
                  const val = row[c.key];
                  if (c.num || c.strong) {
                    return `<td style="border:1px solid #ddd; padding:3px; text-align:right;">${val ? Number(val).toLocaleString() : "0"}</td>`;
                  }
                  return `<td style="border:1px solid #ddd; padding:3px;">${val || "—"}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr style="background-color:#f1f5f9; font-weight:bold;">
              <td style="border:1px solid #ddd; padding:3px;"></td>
              ${cols.map(c => {
                if (c.num || c.strong) {
                  return `<td style="border:1px solid #ddd; padding:3px; text-align:right;">${totalDetailed[c.key]?.toLocaleString() || 0}</td>`;
                }
                if (c === cols[1]) {
                  return `<td style="border:1px solid #ddd; padding:3px;">Total</td>`;
                }
                return `<td style="border:1px solid #ddd; padding:3px;"></td>`;
              }).join("")}
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: "Supplementary_Records.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      },
      jsPDF: { unit: "mm", format: "a3", orientation: "landscape" }
    };

    html2pdf().set(opt).from(html).save();
  };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-4">
          {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}
          {view === "list" && (
            <>
              {/* ─── Compact Page Header ─── */}
              <div className="dashboard-section">
                <div className="fs-page-header">
                  <h4 className="fs-page-title">
                    <FaChartBar className="me-2" /> CDPO Dashboard - Supplementary Nutrition Records
                  </h4>
                  <div className="fs-header-actions">
                    <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
                    <Dropdown className="fs-search-dropdown">
                      <Dropdown.Toggle variant="light" size="sm">
                        <FaSearch className="me-1" /> Search
                      </Dropdown.Toggle>
                      <Dropdown.Menu style={{ minWidth: "300px", padding: "12px" }}>
                        <Form.Control type="text" placeholder="Search month, year, district, AWC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mb-2" />
                        {searchTerm && <div className="text-muted small">Results: {searchedRecords.length}</div>}
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button variant="success" size="sm" onClick={handleDownloadTemplate} className="fs-btn-light" style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "none", color: "#fff" }}>
                      <FaFileDownload className="me-1" /> Template
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()} className="fs-btn-primary">
                      <FaUpload className="me-1" /> Upload
                    </Button>
                    <Button variant="light" size="sm" onClick={() => { setRefreshing(true); setTimeout(() => { setRefreshing(false); fetchData(); }, 500); }} disabled={refreshing} className="fs-btn-light">
                      <FaSyncAlt className={`me-1 ${refreshing ? "fs-spin" : ""}`} /> Refresh
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading data...</p>
                </div>
              ) : (
                <>
                  {/* ─── Multi-Select Filter Bar ─── */}
                  <div className="fs-filter-bar">
                    <MultiSelectDropdown label="Month" options={uniqueMonths} selected={selectedMonths} onChange={setSelectedMonths} />
                    <MultiSelectDropdown label="Financial Year" options={uniqueFYs} selected={selectedFYs} onChange={setSelectedFYs} />
                    <MultiSelectDropdown label="Project" options={uniqueProjects} selected={selectedProjects} onChange={setSelectedProjects} />
                    <MultiSelectDropdown label="Sector" options={uniqueSectors} selected={selectedSectors} onChange={setSelectedSectors} />
                    
                    {/* Added View Food Items Button */}
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleOpenFoodItemModal} 
                      className="me-2" 
                      style={{ height: '31px', alignSelf: 'flex-end', display: 'flex', alignItems: 'center' }}
                    >
                      <FaUtensils className="me-1" /> View Food Items
                    </Button>

                    <Button variant="outline-secondary" size="sm" className="fs-filter-reset" onClick={() => { setSelectedMonths([]); setSelectedFYs([]); setSelectedProjects([]); setSelectedSectors([]); }}>
                      Reset
                    </Button>
                  </div>

                  {/* ─── Wrapped Summary Pills ─── */}
                  {summary && (
                    <div className="fs-stat-strip">
                      {SUMMARY_PILLS.map((field) => (
                        <div key={field.key} className="fs-stat-pill">
                          <span className="fs-stat-pill-icon">{field.icon}</span>
                          <span className="fs-stat-pill-label">{field.label}</span>
                          <span className="fs-stat-pill-value">{summary[field.key]?.toLocaleString() || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ─── Supplies Received & Distributed Table (Dynamic) ─── */}
                  <div className="dashboard-section mt-3">
                    <Card className="fs-table-card fs-supplies-card shadow-sm">
                      <Card.Header className="fs-table-card-header">
                        <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                          <h5 className="fs-section-title mb-0">
                            <FaWarehouse className="me-2" /> Supplies Received & Distributed Summary
                          </h5>
                          <div className="d-flex align-items-end gap-3 flex-wrap">
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
                                className="fs-filter-reset"
                                onClick={() => {
                                  setSelectedSupplyMonths([]);
                                  setSelectedSupplyFYs([]);
                                }}
                              >
                                Reset
                              </Button>
                            )}
                            <ButtonGroup className="fs-toggle-group" style={{ marginRight: "8px" }}>
                              <Button className={`fs-toggle-btn ${suppliesTab === "thr" ? "active" : ""}`} onClick={() => { setSuppliesTab("thr"); setSelectedSupplyMonths([]); setSelectedSupplyFYs([]); }}>THR</Button>
                              <Button className={`fs-toggle-btn ${suppliesTab === "hcm" ? "active" : ""}`} onClick={() => { setSuppliesTab("hcm"); setSelectedSupplyMonths([]); setSelectedSupplyFYs([]); }}>HCM</Button>
                            </ButtonGroup>
                            <ButtonGroup className="fs-toggle-group" style={{ marginRight: "8px" }}>
                              <Button className={`fs-toggle-btn ${suppliesViewMode === "sector" ? "active" : ""}`} onClick={() => setSuppliesViewMode("sector")} title="Sector-wise">
                                <FaLayerGroup className="me-1" /> Sector
                              </Button>
                              <Button className={`fs-toggle-btn ${suppliesViewMode === "awc" ? "active" : ""}`} onClick={() => setSuppliesViewMode("awc")} title="AWC-wise">
                                <FaWarehouse className="me-1" /> AWC
                              </Button>
                            </ButtonGroup>
                            <div className="fs-export-btns">
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportSuppliesToExcel}>
                                <FaFileExcel className="text-success" /> Excel
                              </Button>
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportSuppliesToPDF}>
                                <FaFilePdf className="text-danger" /> PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="fs-table-wrapper">
                          {suppliesLoading ? (
                            <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                          ) : suppliesError ? (
                            <Alert variant="danger" className="m-3">{suppliesError}</Alert>
                          ) : (
                            <>
                              {suppliesViewMode === "sector" ? (
                                <Table hover className="fs-data-table mb-0">
                                  <thead>
                                    <tr>
                                      <th rowSpan="2">S. No.</th>
                                      <th rowSpan="2">Sector</th>
                                      {suppliesFoodItems.map((fi, idx) => (
                                        <th key={`fi-${idx}`} colSpan="3" className="text-center" style={{ borderLeft: "1px solid #e9d5ff" }}>
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
                                    {suppliesData.length === 0 ? (
                                      <tr>
                                        <td colSpan={2 + suppliesFoodItems.length * 3} className="text-center p-4 text-muted">
                                          No data available
                                        </td>
                                      </tr>
                                    ) : (
                                      suppliesData.map((row, i) => (
                                        <tr key={i}>
                                          <td>{i + 1}</td>
                                          <td><strong>{row.sector}</strong></td>
                                          {suppliesFoodItems.map((fi, idx) => {
                                            const fd = row.foodData.find((f) => f.food_item === fi);
                                            return (
                                              <React.Fragment key={`data-${idx}`}>
                                                <td className="text-end">{fd ? fd.received.toLocaleString() : 0}</td>
                                                <td className="text-end">{fd ? fd.distributed.toLocaleString() : 0}</td>
                                                <td className="text-end text-primary"><strong>{fd ? fd.balance.toLocaleString() : 0}</strong></td>
                                              </React.Fragment>
                                            );
                                          })}
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                  {suppliesData.length > 0 && (
                                    <tfoot>
                                      <tr>
                                        <th></th>
                                        <th>Total</th>
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
                              ) : (
                                <Table hover className="fs-data-table mb-0">
                                  <thead>
                                    <tr>
                                      <th rowSpan="2">S. No.</th>
                                      <th rowSpan="2">Sector</th>
                                      <th rowSpan="2">AWC Name</th>
                                      <th rowSpan="2">AWC Code</th>
                                      {suppliesFoodItems.map((fi, idx) => (
                                        <th key={`fi-awc-${idx}`} colSpan="3" className="text-center" style={{ borderLeft: "1px solid #e9d5ff" }}>
                                          {fi}
                                        </th>
                                      ))}
                                    </tr>
                                    <tr>
                                      {suppliesFoodItems.map((fi, idx) => (
                                        <React.Fragment key={`sub-awc-${idx}`}>
                                          <th className="text-end">Rec.</th>
                                          <th className="text-end">Dist.</th>
                                          <th className="text-end">Rem.</th>
                                        </React.Fragment>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {awcSuppliesData.length === 0 ? (
                                      <tr>
                                        <td colSpan={4 + suppliesFoodItems.length * 3} className="text-center p-4 text-muted">
                                          No data available
                                        </td>
                                      </tr>
                                    ) : (
                                      awcSuppliesData.map((row, i) => (
                                        <tr key={i}>
                                          <td>{i + 1}</td>
                                          <td>{row.sector}</td>
                                          <td><strong>{row.awc_name}</strong></td>
                                          <td>{row.awc_code}</td>
                                          {suppliesFoodItems.map((fi, idx) => {
                                            const fd = row.foodData.find((f) => f.food_item === fi);
                                            return (
                                              <React.Fragment key={`data-awc-${idx}`}>
                                                <td className="text-end">{fd ? fd.received.toLocaleString() : 0}</td>
                                                <td className="text-end">{fd ? fd.distributed.toLocaleString() : 0}</td>
                                                <td className="text-end text-primary"><strong>{fd ? fd.balance.toLocaleString() : 0}</strong></td>
                                              </React.Fragment>
                                            );
                                          })}
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                  {awcSuppliesData.length > 0 && (
                                    <tfoot>
                                      <tr>
                                        <th></th>
                                        <th>Total</th>
                                        <th></th>
                                        <th></th>
                                        {suppliesFoodItems.map((fi, idx) => {
                                          const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
                                          return (
                                            <React.Fragment key={`foot-awc-${idx}`}>
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
                            </>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </div>

                  {/* ─── Sector-wise Aggregated Summary Table ─── */}
                  {searchedRecords.length > 0 && (
                    <div className="dashboard-section mt-3">
                      <Card className="fs-table-card shadow-sm">
                        <Card.Header className="fs-table-card-header">
                          <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                            <h5 className="fs-section-title mb-0">
                              <FaLayerGroup className="me-2" /> Sector-wise Aggregated Summary
                            </h5>
                            <div className="fs-export-btns">
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportAggToExcel}>
                                <FaFileExcel className="text-success" /> Excel
                              </Button>
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportAggToPDF}>
                                <FaFilePdf className="text-danger" /> PDF
                              </Button>
                            </div>
                          </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                          <div className="fs-table-wrapper">
                            <Table hover className="fs-data-table mb-0">
                              <thead>
                                <tr>
                                  <th>S. No.</th>
                                  <th>Sector</th>
                                  <th>Months</th>
                                  <th>Fin. Years</th>
                                  {NUMERIC_AGG_FIELDS.map((col, idx) => (
                                    <th key={idx} className="text-end">{col.label}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {aggregatedData.length === 0 ? (
                                  <tr>
                                    <td colSpan={NUMERIC_AGG_FIELDS.length + 4} className="text-center py-4 text-muted">
                                      No data available for aggregation
                                    </td>
                                  </tr>
                                ) : (
                                  aggregatedData.map((row, idx) => (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td><strong>{row.groupKey}</strong></td>
                                      <td>{row.months}</td>
                                      <td>{row.fys}</td>
                                      {NUMERIC_AGG_FIELDS.map((col, cIdx) => (
                                        <td key={cIdx} className="text-end">
                                          {row[col.key] ? Number(row[col.key]).toLocaleString() : 0}
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
                                    {NUMERIC_AGG_FIELDS.map((col, cIdx) => (
                                      <th key={cIdx} className="text-end">
                                        {totalAggregated[col.key]?.toLocaleString() || 0}
                                      </th>
                                    ))}
                                  </tr>
                                </tfoot>
                              )}
                            </Table>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  )}

                  {/* ─── Detailed Records Table ─── */}
                  <div className="dashboard-section mt-3">
                    <Card className="fs-table-card shadow-sm">
                      <Card.Header className="fs-table-card-header">
                        <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                          <h5 className="fs-section-title mb-0">
                            <FaChartBar className="me-2" /> Supplementary Nutrition Records
                          </h5>
                          <div className="d-flex align-items-center gap-2">
                            <Badge bg="primary" pill className="fs-count-badge">
                              {searchedRecords.length} entries
                            </Badge>
                            <div className="fs-export-btns">
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportDetailsToExcel}>
                                <FaFileExcel className="text-success" /> Excel
                              </Button>
                              <Button variant="light" size="sm" className="fs-export-btn" onClick={exportDetailsToPDF}>
                                <FaFilePdf className="text-danger" /> PDF
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="fs-table-wrapper">
                          <Table hover className="fs-data-table mb-0 fs-grant-master-table" style={{ minWidth: "2400px", borderCollapse: "separate", borderSpacing: 0 }}>
                            <thead>
                              <tr>
                                <th rowSpan={2} className="text-center align-middle">S. No.</th>
                                {EXCEL_META_COLUMNS.map((col) => (
                                  <th key={col.key} rowSpan={2} className="text-center align-middle">{col.header}</th>
                                ))}
                                {GRANT_CATEGORIES.map((cat) => (
                                  <th key={cat.countKey} colSpan={4} className="text-center align-middle fs-grant-group-header">{cat.title}</th>
                                ))}
                                <th colSpan={FOOD_FIELDS.length} className="text-center align-middle fs-food-group-header">SUPPLEMENTARY NUTRITION DETAILS</th>
                                <th rowSpan={2} className="text-center align-middle">Actions</th>
                              </tr>
                              <tr>
                                {GRANT_CATEGORIES.flatMap((cat) => [15, 30, 31].map((grantId) => (
                                  <th key={`${cat.countKey}-${grantId}`} className="text-center">Grant {grantId}</th>
                                )).concat([
                                  <th key={`${cat.countKey}-total`} className="text-center">TOTAL</th>
                                ]))}
                                {FOOD_FIELDS.map((food) => (
                                  <th key={food.key} className="text-center fs-food-subheader">{food.header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={1 + EXCEL_META_COLUMNS.length + GRANT_CATEGORIES.length * 4 + FOOD_FIELDS.length + 1} className="text-center py-5 text-muted">
                                    No records found. Click <strong>Upload Excel</strong> to add records.
                                  </td>
                                </tr>
                              ) : (
                                paginatedRecords.map((record, index) => (
                                  <tr key={record.id || index}>
                                    <td className="text-center text-muted">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    {EXCEL_META_COLUMNS.map((col) => (
                                      <td key={col.key} className={col.key === "month" ? "text-center" : ""}>
                                        {col.key === "month" && record[col.key]
                                          ? <Badge className="fs-month-badge">{record[col.key]}</Badge>
                                          : (record[col.key] || "—")}
                                      </td>
                                    ))}
                                    {GRANT_CATEGORIES.flatMap((cat) => {
                                      const grants = Array.isArray(record[cat.grantKey]) ? record[cat.grantKey].map(Number) : [];
                                      return [15, 30, 31].map((grantId) => (
                                        <td key={`${cat.countKey}-${grantId}`} className="text-center fs-grant-cell">
                                          {grants.includes(grantId) ? grantId : "—"}
                                        </td>
                                      )).concat([
                                        <td key={`${cat.countKey}-total`} className="text-end fw-semibold fs-total-cell">
                                          {Number(record[cat.countKey] || 0).toLocaleString()}
                                        </td>
                                      ]);
                                    })}
                                    {FOOD_FIELDS.map((food) => (
                                      <td key={food.key} className="text-end">{Number(record[food.key] || 0).toLocaleString()}</td>
                                    ))}
                                    <td className="text-center">
                                      <div className="fs-action-btns">
                                        <Button variant="light" size="sm" className="fs-action-btn" style={{ color: "#0ea5e9", background: "#f0f9ff", borderColor: "#bae6fd" }} onClick={() => handleViewClick(record)} title="View"><FaEye /></Button>
                                        <Button variant="light" size="sm" className="fs-action-btn fs-edit-btn" onClick={() => handleEdit(record)} title="Edit"><FaEdit /></Button>
                                        <Button variant="light" size="sm" className="fs-action-btn fs-delete-btn" onClick={() => handleDeleteClick(record)} title="Delete"><FaTrash /></Button>
                                      </div>
                                    </td>
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
                                    <th key={`${cat.countKey}-total`} className="text-end">{totalDetailed[cat.countKey]?.toLocaleString() || 0}</th>,
                                  ])}
                                  {FOOD_FIELDS.map((food) => (
                                    <th key={food.key} className="text-end">{totalDetailed[food.key]?.toLocaleString() || 0}</th>
                                  ))}
                                  <th></th>
                                </tr>
                              </tfoot>
                            )}
                          </Table>
                        </div>
                      </Card.Body>
                      {totalRecords > 0 && (
                        <Card.Footer className="d-flex justify-content-between align-items-center flex-wrap gap-2 py-3 px-4">
                          <span className="small text-muted">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} entries
                          </span>
                          <Pagination size="sm" className="mb-0">
                            <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                              const page = startPage + i;
                              if (page > totalPages) return null;
                              return (
                                <Pagination.Item key={page} active={page === currentPage} onClick={() => handlePageChange(page)}>
                                  {page}
                                </Pagination.Item>
                              );
                            })}
                            <Pagination.Next disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} />
                          </Pagination>
                        </Card.Footer>
                      )}
                    </Card>
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── Edit Form View ─── */}
          {view === "form" && (
            <div className="dashboard-section">
              <Card className="fs-table-card shadow-sm">
                <Form onSubmit={handleSubmit}>
                  <Card.Header className="fs-form-header">
                    <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                      <h5 className="mb-0"><FaEdit className="me-2" /> Edit Supplementary Record</h5>
                      <Button variant="light" size="sm" onClick={() => setView("list")} className="fs-btn-light">
                        <FaArrowLeft className="me-1" /> Back
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Basic Information</h6>
                      <Row>
                        <Col md={6} lg={4}>{renderFormField("AWC Code", "awc_code", "text", "5064010220")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Month", "month", "select")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Financial Year", "financial_year", "text", "2026-2027")}</Col>
                      </Row>
                    </div>
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Beneficiary Counts</h6>
                      <Row>
                        {GRANT_CATEGORIES.map((cat) => <Col md={6} lg={4} key={cat.countKey}>{renderFormField(cat.title, cat.countKey, "number", "0")}</Col>)}
                      </Row>
                    </div>
                    <div className="fs-form-section">
                      <h6 className="fs-section-subtitle">Supplementary Nutrition Details</h6>
                      <Row>
                        {FOOD_FIELDS.map((food) => <Col md={6} lg={4} key={food.key}>{renderFormField(food.header, food.key, "number", "0")}</Col>)}
                      </Row>
                    </div>
                  </Card.Body>
                  <Card.Footer className="fs-form-footer">
                    <Button variant="light" onClick={() => setView("list")} className="fs-btn-light px-4"><FaTimes className="me-1" /> Cancel</Button>
                    <Button variant="primary" type="submit" disabled={formLoading} className="fs-btn-primary px-4">
                      {formLoading ? (<><Spinner as="span" animation="border" size="sm" className="me-1" /> Saving...</>) : (<><FaSave className="me-1" /> Update Record</>)}
                    </Button>
                  </Card.Footer>
                </Form>
              </Card>
            </div>
          )}
        </Container>
      </div>

      {/* ─── Upload Progress Modal ─── */}
      <Modal show={showUploadModal} onHide={closeUploadModal} centered backdrop={uploadProgress.isUploading ? "static" : true} className="fs-modal">
        <Modal.Header closeButton={!uploadProgress.isUploading} className="fs-modal-header">
          <Modal.Title>
            {uploadProgress.isComplete ? (<><FaCheckCircle className="me-2 text-success" /> Upload Complete</>) : (<><FaUpload className="me-2" /> Uploading Records...</>)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <small className="text-muted d-block mb-1">File:</small>
            <strong style={{ wordBreak: "break-all" }}>{uploadProgress.fileName}</strong>
          </div>
          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <span className="fw-bold">
                {uploadProgress.isUploading ? `Uploading ${uploadProgress.currentRow} of ${uploadProgress.total}...` : `Processed ${uploadProgress.total} of ${uploadProgress.total} records`}
              </span>
              <span className="fw-bold text-primary">
                {uploadProgress.total > 0 ? Math.round(((uploadProgress.uploaded + uploadProgress.failed) / uploadProgress.total) * 100) : 0}%
              </span>
            </div>
            <ProgressBar now={uploadProgress.total > 0 ? ((uploadProgress.uploaded + uploadProgress.failed) / uploadProgress.total) * 100 : 0} variant={uploadProgress.failed > 0 && !uploadProgress.isUploading ? "warning" : "primary"} animated={uploadProgress.isUploading} style={{ height: "10px" }} />
          </div>
          <Row className="g-2 mb-3">
            <Col xs={4}>
              <div className="text-center p-2 rounded border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <FaCheckCircle className="text-success mb-1" />
                <div className="fw-bold text-success" style={{ fontSize: "1.3rem" }}>{uploadProgress.uploaded}</div>
                <small className="text-muted">Uploaded</small>
              </div>
            </Col>
            <Col xs={4}>
              <div className="text-center p-2 rounded border" style={{ background: "#fef2f2", borderColor: "#fecaca" }}>
                <FaTimesCircle className="text-danger mb-1" />
                <div className="fw-bold text-danger" style={{ fontSize: "1.3rem" }}>{uploadProgress.failed}</div>
                <small className="text-muted">Failed</small>
              </div>
            </Col>
            <Col xs={4}>
              <div className="text-center p-2 rounded border" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <FaFileExcel className="text-primary mb-1" />
                <div className="fw-bold text-primary" style={{ fontSize: "1.3rem" }}>{uploadProgress.total}</div>
                <small className="text-muted">Total</small>
              </div>
            </Col>
          </Row>
          {uploadProgress.errors.length > 0 && (
            <div>
              <div className="d-flex align-items-center mb-2">
                <FaExclamationTriangle className="text-warning me-2" />
                <strong>Error Details ({uploadProgress.errors.length}):</strong>
              </div>
              <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #fecaca", borderRadius: "8px", background: "#fef2f2" }}>
                {uploadProgress.errors.map((err, i) => (
                  <div key={i} className="px-3 py-2" style={{ borderBottom: i < uploadProgress.errors.length - 1 ? "1px solid #fecaca" : "none", fontSize: "0.8rem" }}>
                    <div><strong>Row {err.row}</strong>{err.awcCode !== "—" && <span className="text-muted"> — AWC: {err.awcCode}</span>}</div>
                    <div className="text-danger">{err.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {uploadProgress.isComplete && uploadProgress.failed === 0 && (
            <Alert variant="success" className="mt-3 mb-0"><FaCheckCircle className="me-2" /> All {uploadProgress.uploaded} records uploaded successfully!</Alert>
          )}
          {uploadProgress.isComplete && uploadProgress.failed > 0 && (
            <Alert variant="warning" className="mt-3 mb-0"><FaExclamationTriangle className="me-2" /> {uploadProgress.uploaded} succeeded, {uploadProgress.failed} failed. Check error details above.</Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button variant="light" onClick={closeUploadModal} disabled={uploadProgress.isUploading} className="fs-btn-light px-4"><FaTimes className="me-1" /> Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ─── Delete Confirmation Modal ─── */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered className="fs-modal">
        <Modal.Header closeButton className="fs-modal-header fs-delete-header">
          <Modal.Title><FaTrash className="me-2" /> Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this record?</p>
          {deleteTarget && (
            <div className="fs-delete-detail">
              <strong>AWC Code:</strong> {deleteTarget.awc_code} &nbsp;|&nbsp;
              <strong>Month:</strong> {deleteTarget.month} &nbsp;|&nbsp;
              <strong>Year:</strong> {deleteTarget.financial_year} &nbsp;|&nbsp;
              <strong>Pregnant/Lactating Count:</strong> {deleteTarget.pregnant_woman_lactating_mother}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button variant="light" onClick={() => setShowDeleteModal(false)} className="fs-btn-light"><FaTimes className="me-1" /> Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} className="fs-btn-danger"><FaTrash className="me-1" /> Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* ─── View Record Modal ─── */}
      <Modal show={showViewModal} onHide={handleCloseViewModal} centered className="fs-modal" size="lg">
        <Modal.Header closeButton className="fs-modal-header">
          <Modal.Title><FaEye className="me-2 text-primary" /> View Record Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewRecord && (
            <div>
              <div className="fs-form-section mb-3">
                <h6 className="fs-section-subtitle">Basic Information</h6>
                <Row>
                  <Col md={6}><strong>District:</strong> {viewRecord.district || "—"}</Col>
                  <Col md={6}><strong>Project:</strong> {viewRecord.project || "—"}</Col>
                  <Col md={6}><strong>Sector:</strong> {viewRecord.sector || "—"}</Col>
                  <Col md={6}><strong>AWC Name:</strong> {viewRecord.awc_name || "—"}</Col>
                  <Col md={6}><strong>AWC Code:</strong> {viewRecord.awc_code}</Col>
                  <Col md={6}><strong>Month:</strong> {viewRecord.month}</Col>
                  <Col md={6}><strong>Financial Year:</strong> {viewRecord.financial_year}</Col>
                </Row>
              </div>
              <div className="fs-form-section mb-3">
                <h6 className="fs-section-subtitle">Beneficiary Counts and Grants</h6>
                <Row>
                  {GRANT_CATEGORIES.map((cat) => <Col md={6} key={cat.countKey} className="mb-2"><strong>{cat.title}:</strong> {Number(viewRecord[cat.countKey] || 0).toLocaleString()}<div className="small text-muted">Grants: {(viewRecord[cat.grantKey] || []).join(", ") || "—"}</div></Col>)}
                </Row>
              </div>
              <div className="fs-form-section">
                <h6 className="fs-section-subtitle">Supplementary Nutrition Details</h6>
                <Row>
                  {FOOD_FIELDS.map((food) => <Col md={6} key={food.key} className="mb-2"><strong>{food.header}:</strong> {Number(viewRecord[food.key] || 0).toLocaleString()}</Col>)}
                </Row>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button variant="light" onClick={handleCloseViewModal} className="fs-btn-light px-4"><FaTimes className="me-1" /> Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ─── Food Items Modal ─── */}
      <Modal show={showFoodItemModal} onHide={handleCloseFoodItemModal} centered className="fs-modal" size="lg">
        <Modal.Header closeButton className="fs-modal-header">
          <Modal.Title><FaUtensils className="me-2 text-primary" /> Food Items List</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loadingFoodItems ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading food items...</p>
            </div>
          ) : (
            <Tabs defaultActiveKey="hcm" id="food-items-modal-tabs" className="mb-3">
              <Tab eventKey="hcm" title={`HCM Food Items (${foodItems.hcm?.length || 0})`}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Food Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.hcm?.length === 0 ? (
                      <tr><td colSpan="3" className="text-center text-muted p-4">No HCM items found.</td></tr>
                    ) : (
                      foodItems.hcm?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{item.food_item}</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </Tab>
              <Tab eventKey="thr" title={`THR Food Items (${foodItems.thr?.length || 0})`}>
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Food Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodItems.thr?.length === 0 ? (
                      <tr><td colSpan="3" className="text-center text-muted p-4">No THR items found.</td></tr>
                    ) : (
                      foodItems.thr?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{item.food_item}</strong></td>
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
          <Button variant="light" onClick={handleCloseFoodItemModal} className="fs-btn-light px-4"><FaTimes className="me-1" /> Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FoodSupplementary;