
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
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import "../../assets/css/foodSupplementary.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import {
  FaEdit,
  FaTrash,
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
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ── Excel Column Definitions ── */
const EXCEL_COLUMNS = [
  { header: "District", key: "district", send: false, type: "string", category: "Location Info" },
  { header: "Project", key: "project", send: false, type: "string", category: "Location Info" },
  { header: "Sector", key: "sector", send: false, type: "string", category: "Location Info" },
  { header: "AWC Name", key: "awc_name", send: false, type: "string", category: "Location Info" },
  { header: "AWC Code", key: "awc_code", send: true, type: "string", category: "Location Info" },
  { header: "Month", key: "month", send: true, type: "string", category: "Period" },
  { header: "Financial Year", key: "financial_year", send: true, type: "string", category: "Period" },
  { header: "Active Beneficiaries", key: "active_beneficiaries", send: true, type: "number", category: "Beneficiary Summary" },
  { header: "Total Beneficiaries", key: "total_beneficiaries", send: true, type: "number", category: "Beneficiary Summary" },
  { header: "Pregnant/Lactating Mothers", key: "pregnant_women_lactating_mothers", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "Children 6m-3y", key: "children_6m_3y_beneficiaries", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "THR 25 Days FRS/HCM (3y-6y)", key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "HCM Beneficiaries (3y-6y)", key: "hcm_beneficiaries_3y_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "SAM Children 6m-6y", key: "sam_children_6m_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "SUW Children 6m-6y", key: "suw_children_6m_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "SAM Children 3y-6y", key: "sam_children_3y_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "SUW Children 3y-6y", key: "suw_children_3y_6y", send: true, type: "number", category: "Beneficiaries by Category" },
  { header: "Mung Dal Khichdi Packets", key: "quarterly_packets_mung_dal_khichdi", send: true, type: "number", category: "Packets Distribution" },
  { header: "Poushik Sattu Mix Packets", key: "quarterly_packets_poushik_sattu_mix", send: true, type: "number", category: "Packets Distribution" },
  { header: "Poushik Sattu Mix (75d, gm)", key: "poushik_sattu_mix_75_days_packet_size_gm", send: true, type: "number", category: "Packets Distribution" },
  { header: "Panjeeri 75d 2625gm Packets", key: "panjeeri_75_days_2625gm_quarterly_packets", send: true, type: "number", category: "Packets Distribution" },
  { header: "Panjeeri 75d 4625gm Packets", key: "panjeeri_75_days_4625gm_quarterly_packets", send: true, type: "number", category: "Packets Distribution" },
  { header: "Sattu 2250gm Packets", key: "quarterly_packets_sattu_2250gm", send: true, type: "number", category: "Packets Distribution" },
  { header: "Mix 1000gm Packets", key: "quarterly_packets_mix_1000gm", send: true, type: "number", category: "Packets Distribution" },
  { header: "Multi Grain Aata 1250gm Packets", key: "quarterly_packets_multi_grain_aata_1250gm", send: true, type: "number", category: "Packets Distribution" },
];

/* ── Detailed Table column definitions ── */
const TABLE_COLUMNS = [
  { label: "S. No.", key: "_index" },
  { label: "District", key: "district" },
  { label: "Project", key: "project" },
  { label: "Sector", key: "sector" },
  { label: "AWC Code", key: "awc_code" },
  { label: "Month", key: "month", badge: true },
  { label: "Fin. Year", key: "financial_year" },
  { label: "Active Bene.", key: "active_beneficiaries", num: true },
  { label: "Total Bene.", key: "total_beneficiaries", strong: true },
  { label: "Pregnant/Lactating", key: "pregnant_women_lactating_mothers", num: true },
  { label: "Children 6m-3y", key: "children_6m_3y_beneficiaries", num: true },
  { label: "THR 25d (3-6y)", key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", num: true },
  { label: "HCM (3-6y)", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "SAM 6m-6y", key: "sam_children_6m_6y", num: true },
  { label: "SUW 6m-6y", key: "suw_children_6m_6y", num: true },
  { label: "SAM 3y-6y", key: "sam_children_3y_6y", num: true },
  { label: "SUW 3y-6y", key: "suw_children_3y_6y", num: true },
  { label: "Mung Dal", key: "quarterly_packets_mung_dal_khichdi", num: true },
  { label: "Poushik Sattu", key: "quarterly_packets_poushik_sattu_mix", num: true },
  { label: "Sattu Mix (gm)", key: "poushik_sattu_mix_75_days_packet_size_gm", num: true },
  { label: "Panjeeri 2625gm", key: "panjeeri_75_days_2625gm_quarterly_packets", num: true },
  { label: "Panjeeri 4625gm", key: "panjeeri_75_days_4625gm_quarterly_packets", num: true },
  { label: "Sattu 2250gm", key: "quarterly_packets_sattu_2250gm", num: true },
  { label: "Mix 1000gm", key: "quarterly_packets_mix_1000gm", num: true },
  { label: "Multi Grain Aata", key: "quarterly_packets_multi_grain_aata_1250gm", num: true },
  { label: "Actions", key: "_actions" },
];

/* ── Numeric columns for aggregation ── */
const NUMERIC_AGG_FIELDS = [
  { label: "Active Bene.", key: "active_beneficiaries" },
  { label: "Total Bene.", key: "total_beneficiaries" },
  { label: "Pregnant/Lactating", key: "pregnant_women_lactating_mothers" },
  { label: "Children 6m-3y", key: "children_6m_3y_beneficiaries" },
  { label: "THR 25d (3-6y)", key: "thr_25_days_frs_hcm_beneficiaries_3y_6y" },
  { label: "HCM (3-6y)", key: "hcm_beneficiaries_3y_6y" },
  { label: "SAM 6m-6y", key: "sam_children_6m_6y" },
  { label: "SUW 6m-6y", key: "suw_children_6m_6y" },
  { label: "SAM 3y-6y", key: "sam_children_3y_6y" },
  { label: "SUW 3y-6y", key: "suw_children_3y_6y" },
  { label: "Mung Dal", key: "quarterly_packets_mung_dal_khichdi" },
  { label: "Poushik Sattu", key: "quarterly_packets_poushik_sattu_mix" },
  { label: "Sattu Mix (gm)", key: "poushik_sattu_mix_75_days_packet_size_gm" },
  { label: "Panjeeri 2625gm", key: "panjeeri_75_days_2625gm_quarterly_packets" },
  { label: "Panjeeri 4625gm", key: "panjeeri_75_days_4625gm_quarterly_packets" },
  { label: "Sattu 2250gm", key: "quarterly_packets_sattu_2250gm" },
  { label: "Mix 1000gm", key: "quarterly_packets_mix_1000gm" },
  { label: "Multi Grain Aata", key: "quarterly_packets_multi_grain_aata_1250gm" },
];

/* ── Compact Pill Definitions for Summary ── */
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
  { key: "quarterly_packets_mung_dal_khichdi", label: "Mung Dal", icon: <FaBox size={10} /> },
  { key: "quarterly_packets_poushik_sattu_mix", label: "P. Sattu", icon: <FaBox size={10} /> },
  { key: "poushik_sattu_mix_75_days_packet_size_gm", label: "Sattu(gm)", icon: <FaBox size={10} /> },
  { key: "panjeeri_75_days_2625gm_quarterly_packets", label: "Panj 2625", icon: <FaBox size={10} /> },
  { key: "panjeeri_75_days_4625gm_quarterly_packets", label: "Panj 4625", icon: <FaBox size={10} /> },
  { key: "quarterly_packets_sattu_2250gm", label: "Sattu 2250", icon: <FaBox size={10} /> },
  { key: "quarterly_packets_mix_1000gm", label: "Mix 1000", icon: <FaBox size={10} /> },
  { key: "quarterly_packets_multi_grain_aata_1250gm", label: "Multi Aata", icon: <FaBox size={10} /> },
];

// Dummy Data for Supplies Table
const SUPPLIES_DATA = [
  { project: "Bhaisiachana", sector: "Barechhina", received: 3500, distributed: 3000, remaining: 500 },
  { project: "Bhaisiachana", sector: "Sheragat", received: 2800, distributed: 2500, remaining: 300 },
  { project: "Bhikiyasain", sector: "Basot", received: 1500, distributed: 1200, remaining: 300 },
  { project: "Bhikiyasain", sector: "Bhikiyasen", received: 1600, distributed: 1400, remaining: 200 },
  { project: "Bhikiyasain", sector: "Daula", received: 2000, distributed: 1800, remaining: 200 },
  { project: "Bhikiyasain", sector: "Vinayak", received: 1300, distributed: 1100, remaining: 200 },
];

const initialFormData = {
  id: null, awc_code: "", month: "July", financial_year: "2026-27",
  active_beneficiaries: "", total_beneficiaries: "",
  thr_25_days_frs_hcm_beneficiaries_3y_6y: "", hcm_beneficiaries_3y_6y: "",
  quarterly_packets_mung_dal_khichdi: "", pregnant_women_lactating_mothers: "",
  poushik_sattu_mix_75_days_packet_size_gm: "", quarterly_packets_poushik_sattu_mix: "",
  children_6m_3y_beneficiaries: "", panjeeri_75_days_2625gm_quarterly_packets: "",
  sam_children_6m_6y: "", suw_children_6m_6y: "", panjeeri_75_days_4625gm_quarterly_packets: "",
  sam_children_3y_6y: "", quarterly_packets_sattu_2250gm: "", suw_children_3y_6y: "",
  quarterly_packets_mix_1000gm: "", quarterly_packets_multi_grain_aata_1250gm: "",
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
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getLabel()}</span>
          <FaChevronDown className="fs-multi-caret" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="fs-multi-menu">
          {options.length === 0 ? (
            <Dropdown.Item disabled>No options</Dropdown.Item>
          ) : (
            options.map((opt) => (
              <div key={opt} className="fs-multi-item" onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}>
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

  const [formData, setFormData] = useState({ ...initialFormData });
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    total: 0, uploaded: 0, failed: 0, errors: [], currentRow: 0, isUploading: false, isComplete: false, fileName: "",
  });
  const fileInputRef = useRef(null);

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
    setLoading(true); setError("");
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
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uniqueMonths = useMemo(() => [...new Set(records.map(r => r.month).filter(Boolean))].sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b)), [records]);
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

  useEffect(() => {
    if (filteredRecords.length > 0) {
      const totals = filteredRecords.reduce((acc, r) => ({
        total_beneficiaries: (acc.total_beneficiaries || 0) + (parseInt(r.total_beneficiaries) || 0),
        active_beneficiaries: (acc.active_beneficiaries || 0) + (parseInt(r.active_beneficiaries) || 0),
        pregnant_women_lactating_mothers: (acc.pregnant_women_lactating_mothers || 0) + (parseInt(r.pregnant_women_lactating_mothers) || 0),
        quarterly_packets_mung_dal_khichdi: (acc.quarterly_packets_mung_dal_khichdi || 0) + (parseInt(r.quarterly_packets_mung_dal_khichdi) || 0),
        quarterly_packets_poushik_sattu_mix: (acc.quarterly_packets_poushik_sattu_mix || 0) + (parseInt(r.quarterly_packets_poushik_sattu_mix) || 0),
        poushik_sattu_mix_75_days_packet_size_gm: (acc.poushik_sattu_mix_75_days_packet_size_gm || 0) + (parseInt(r.poushik_sattu_mix_75_days_packet_size_gm) || 0),
        quarterly_packets_sattu_2250gm: (acc.quarterly_packets_sattu_2250gm || 0) + (parseInt(r.quarterly_packets_sattu_2250gm) || 0),
        quarterly_packets_mix_1000gm: (acc.quarterly_packets_mix_1000gm || 0) + (parseInt(r.quarterly_packets_mix_1000gm) || 0),
        quarterly_packets_multi_grain_aata_1250gm: (acc.quarterly_packets_multi_grain_aata_1250gm || 0) + (parseInt(r.quarterly_packets_multi_grain_aata_1250gm) || 0),
        panjeeri_75_days_2625gm_quarterly_packets: (acc.panjeeri_75_days_2625gm_quarterly_packets || 0) + (parseInt(r.panjeeri_75_days_2625gm_quarterly_packets) || 0),
        panjeeri_75_days_4625gm_quarterly_packets: (acc.panjeeri_75_days_4625gm_quarterly_packets || 0) + (parseInt(r.panjeeri_75_days_4625gm_quarterly_packets) || 0),
        suw_children_3y_6y: (acc.suw_children_3y_6y || 0) + (parseInt(r.suw_children_3y_6y) || 0),
        sam_children_6m_6y: (acc.sam_children_6m_6y || 0) + (parseInt(r.sam_children_6m_6y) || 0),
        suw_children_6m_6y: (acc.suw_children_6m_6y || 0) + (parseInt(r.suw_children_6m_6y) || 0),
        sam_children_3y_6y: (acc.sam_children_3y_6y || 0) + (parseInt(r.sam_children_3y_6y) || 0),
        children_6m_3y_beneficiaries: (acc.children_6m_3y_beneficiaries || 0) + (parseInt(r.children_6m_3y_beneficiaries) || 0),
        thr_25_days_frs_hcm_beneficiaries_3y_6y: (acc.thr_25_days_frs_hcm_beneficiaries_3y_6y || 0) + (parseInt(r.thr_25_days_frs_hcm_beneficiaries_3y_6y) || 0),
        hcm_beneficiaries_3y_6y: (acc.hcm_beneficiaries_3y_6y || 0) + (parseInt(r.hcm_beneficiaries_3y_6y) || 0),
      }), {});
      setSummary(totals);
    } else {
      setSummary(null);
    }
  }, [filteredRecords]);

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

  /* ── Aggregation Logic for Sector-wise Summary Table ── */
  const aggregatedData = useMemo(() => {
    if (!filteredRecords.length) return [];
    const grouped = {};
    filteredRecords.forEach(r => {
      const groupKey = r.sector || "—"; 
      if (!grouped[groupKey]) {
        grouped[groupKey] = { groupKey, months: new Set(), fys: new Set(), totals: NUMERIC_AGG_FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {}) };
      }
      if (r.month) grouped[groupKey].months.add(r.month);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => { grouped[groupKey].totals[key] += parseInt(r[key]) || 0; });
    });
    return Object.values(grouped).map(g => ({
      groupKey: g.groupKey, months: Array.from(g.months).join(", "), fys: Array.from(g.fys).join(", "), ...g.totals
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

  const totalSupplies = useMemo(() => {
    return SUPPLIES_DATA.reduce((acc, item) => {
      acc.received += item.received;
      acc.distributed += item.distributed;
      acc.remaining += item.remaining;
      return acc;
    }, { received: 0, distributed: 0, remaining: 0 });
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  /* ─── Excel Template Download ─── */
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const categoryRow = EXCEL_COLUMNS.map((c) => c.category);
    const headerRow = EXCEL_COLUMNS.map((c) => c.header);
    const sampleRow = EXCEL_COLUMNS.map((c) => {
      if (c.key === "district") return "Almora";
      if (c.key === "project") return "Bhaisiachana";
      if (c.key === "sector") return "Barechhina";
      if (c.key === "awc_name") return "Aali-01";
      if (c.key === "awc_code") return "5064010101";
      if (c.key === "month") return "July";
      if (c.key === "financial_year") return "2026-27";
      if (!c.send) return "";
      return 0;
    });
    const emptyRow = EXCEL_COLUMNS.map(() => "");
    const aoa = [categoryRow, headerRow, sampleRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow, emptyRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const merges = [];
    let startIdx = 0;
    for (let i = 1; i <= categoryRow.length; i++) {
      if (i === categoryRow.length || categoryRow[i] !== categoryRow[startIdx]) {
        if (i - 1 > startIdx) merges.push({ s: { r: 0, c: startIdx }, e: { r: 0, c: i - 1 } });
        startIdx = i;
      }
    }
    ws["!merges"] = merges;
    ws["!cols"] = EXCEL_COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 4, 16) }));

    XLSX.utils.book_append_sheet(wb, ws, "Supplementary Nutrition");
    XLSX.writeFile(wb, "Supplementary_Nutrition_Template.xlsx");
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
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];

        const json_aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(8, json_aoa.length); i++) {
          if (json_aoa[i] && json_aoa[i].some((h) => normalizeHeader(h) === normalizeHeader("AWC Code"))) {
            headerRowIdx = i; break;
          }
        }
        if (headerRowIdx === -1) {
          setError("Could not find the header row containing 'AWC Code'. Please use the downloaded template.");
          return;
        }

        const parsedData = XLSX.utils.sheet_to_json(ws, { range: headerRowIdx, defval: "" });
        const parsedRecords = parsedData.map((rowObj, rowIdx) => {
          const record = {};
          EXCEL_COLUMNS.forEach((col) => {
            const objKey = Object.keys(rowObj).find((k) => normalizeHeader(k) === normalizeHeader(col.header));
            if (objKey !== undefined) {
              const rawVal = rowObj[objKey];
              if (col.type === "string") {
                record[col.key] = rawVal !== "" && rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : "";
              } else {
                if (typeof rawVal === "number") record[col.key] = rawVal;
                else if (rawVal === "" || rawVal === null || rawVal === undefined) record[col.key] = 0;
                else {
                  const cleaned = String(rawVal).replace(/[^0-9.-]/g, "");
                  const num = parseFloat(cleaned);
                  record[col.key] = isNaN(num) ? 0 : num;
                }
              }
            } else {
              record[col.key] = col.type === "string" ? "" : 0;
            }
          });
          return { _rowNum: headerRowIdx + rowIdx + 2, ...record };
        }).filter(r => r.awc_code !== "" || r.month !== "" || r.financial_year !== "");

        if (parsedRecords.length === 0) {
          setError("No data rows found in the Excel file.");
          return;
        }

        setShowUploadModal(true);
        setUploadProgress({
          total: parsedRecords.length, uploaded: 0, failed: 0, errors: [], currentRow: 0,
          isUploading: true, isComplete: false, fileName: file.name,
        });

        let uploadedCount = 0, failedCount = 0;
        const errorsList = [];

        for (let i = 0; i < parsedRecords.length; i++) {
          const rec = parsedRecords[i];
          setUploadProgress((prev) => ({ ...prev, currentRow: i + 1 }));

          const payload = {};
          EXCEL_COLUMNS.filter((c) => c.send).forEach((col) => {
            if (rec[col.key] !== undefined && rec[col.key] !== "") payload[col.key] = rec[col.key];
          });

          if (payload.awc_code === "" || payload.awc_code === undefined || 
              payload.month === "" || payload.month === undefined || 
              payload.financial_year === "" || payload.financial_year === undefined) {
            failedCount++;
            errorsList.push({
              row: rec._rowNum, awcCode: rec.awc_code || rec.awc_name || "—",
              error: "Missing required field (AWC Code / Month / Financial Year)",
            });
            setUploadProgress((prev) => ({ ...prev, uploaded: uploadedCount, failed: failedCount, errors: [...errorsList] }));
            continue;
          }

          try {
            await api.post("/supplementary-nutrition-details/", payload);
            uploadedCount++;
          } catch (err) {
            failedCount++;
            const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.response?.data?.error || (typeof err?.response?.data === "object" ? JSON.stringify(err.response.data) : err.message) || "Unknown error";
            errorsList.push({ row: rec._rowNum, awcCode: rec.awc_code || rec.awc_name || "—", error: errMsg });
          }

          setUploadProgress((prev) => ({ ...prev, uploaded: uploadedCount, failed: failedCount, errors: [...errorsList] }));
          if (i % 3 === 0) await new Promise((r) => setTimeout(r, 30));
        }

        setUploadProgress((prev) => ({ ...prev, isUploading: false, isComplete: true }));
        if (uploadedCount > 0) setSuccess(`${uploadedCount} record(s) uploaded successfully.`);
        fetchData();
      } catch (err) {
        setError("Failed to parse Excel file: " + (err.message || "Unknown error"));
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /* ─── Edit / Delete ─── */
  const handleEdit = (record) => {
    setFormData({ ...initialFormData, ...record });
    setFormErrors({}); setIsEditing(true); setView("form");
  };

  const handleDeleteClick = (record) => {
    setDeleteTarget(record); setShowDeleteModal(true);
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
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormLoading(true);
    try {
      if (isEditing) {
        await api.put("/supplementary-nutrition-details/", formData);
        setSuccess("Record updated successfully.");
      }
      setView("list"); fetchData();
    } catch (err) {
      setError("Failed to update record."); console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete("/supplementary-nutrition-details/", { data: { id: deleteTarget.id } });
      setSuccess("Record deleted successfully.");
      setShowDeleteModal(false); setDeleteTarget(null); fetchData();
    } catch (err) {
      setError("Failed to delete record."); console.error(err);
    }
  };

  const renderFormField = (label, name, type = "text", placeholder = "") => {
    const isSelect = type === "select";
    return (
      <Form.Group className="mb-3">
        <Form.Label className="fs-field-label">{label}</Form.Label>
        {isSelect ? (
          <Form.Select name={name} value={formData[name] ?? ""} onChange={handleInputChange} className={formErrors[name] ? "is-invalid" : ""}>
            {monthNames.map((m) => <option key={m} value={m}>{m}</option>)}
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

  /* ─── Export Handlers (Excel & PDF) ─── */
  const exportSuppliesToExcel = () => {
    const data = SUPPLIES_DATA.map((r, i) => ({ "S. No.": i + 1, Project: r.project, Sector: r.sector, Received: r.received, Distributed: r.distributed, Remaining: r.remaining }));
    data.push({ "S. No.": "", Project: "Total", Sector: "", Received: totalSupplies.received, Distributed: totalSupplies.distributed, Remaining: totalSupplies.remaining });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    XLSX.writeFile(wb, "Supplies_Summary.xlsx");
  };

  const exportSuppliesToPDF = () => {
    const head = [["S. No.", "Project", "Sector", "Received", "Distributed", "Remaining"]];
    const body = SUPPLIES_DATA.map((r, i) => [i + 1, r.project, r.sector, r.received, r.distributed, r.remaining]);
    const doc = new jsPDF("p", "pt", "a4");
    doc.text("Supplies Received & Distributed Summary", 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] },
      foot: [["", "Total", "", totalSupplies.received, totalSupplies.distributed, totalSupplies.remaining]],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" }
    });
    doc.save("Supplies_Summary.pdf");
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
    const head = [["S. No.", "Sector", "Months", "Fin. Years", ...NUMERIC_AGG_FIELDS.map(f => f.label)]];
    const body = aggregatedData.map((row, i) => [i + 1, row.groupKey, row.months, row.fys, ...NUMERIC_AGG_FIELDS.map(f => row[f.key]?.toLocaleString() || 0)]);
    
    const doc = new jsPDF("l", "pt", "a3");
    doc.text("Sector-wise Aggregated Summary", 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
      foot: [["", "Total", "", "", ...NUMERIC_AGG_FIELDS.map(f => totalAggregated[f.key]?.toLocaleString() || 0)]],
    });
    doc.save("Sector_Summary.pdf");
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
    const cols = TABLE_COLUMNS.filter(c => c.key !== "_index" && c.key !== "_actions");
    const head = [["S. No.", ...cols.map(c => c.label)]];
    const body = searchedRecords.map((row, i) => [i + 1, ...cols.map(c => {
      const val = row[c.key];
      if (c.num || c.strong) return val ? Number(val).toLocaleString() : "0";
      return val || "—";
    })]);
    
    const totalRow = ["", ...cols.map(c => {
      if (c.num || c.strong) return totalDetailed[c.key]?.toLocaleString() || 0;
      return "";
    })];
    totalRow[1] = "Total"; 

    const doc = new jsPDF("l", "pt", "a3"); 
    doc.text("Supplementary Nutrition Records", 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 5, cellPadding: 1.5 },
      headStyles: { fillColor: [79, 70, 229] },
      foot: [totalRow],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" },
    });
    doc.save("Supplementary_Records.pdf");
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
                    <FaChartBar className="me-2" /> Food Supplementary Nutrition
                  </h4>
                  <div className="fs-header-actions">
                    <input type="file" ref={fileInputRef} style={{ display: "none" }} accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
                    <Dropdown className="fs-search-dropdown">
                      <Dropdown.Toggle variant="light" size="sm"><FaSearch className="me-1" /> Search</Dropdown.Toggle>
                      <Dropdown.Menu style={{ minWidth: "300px", padding: "12px" }}>
                        <Form.Control type="text" placeholder="Search month, year, district, AWC..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mb-2" />
                        {searchTerm && <div className="text-muted small">Results: {searchedRecords.length}</div>}
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button variant="success" size="sm" onClick={handleDownloadTemplate} className="fs-btn-light"
                      style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "none", color: "#fff" }}>
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

                  {/* ─── Supplies Received & Distributed Table ─── */}
                  <div className="dashboard-section mt-3">
                    <Card className="fs-table-card shadow-sm">
                      <Card.Header className="fs-table-card-header">
                        <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                          <h5 className="fs-section-title mb-0">
                            <FaWarehouse className="me-2" /> Supplies Received & Distributed Summary
                          </h5>
                          <div className="fs-export-btns">
                            <Button variant="light" size="sm" className="fs-export-btn" onClick={exportSuppliesToExcel}>
                              <FaFileExcel className="text-success" /> Excel
                            </Button>
                            <Button variant="light" size="sm" className="fs-export-btn" onClick={exportSuppliesToPDF}>
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
                                <th>Project</th>
                                <th>Sector</th>
                                <th className="text-end">Received</th>
                                <th className="text-end">Distributed</th>
                                <th className="text-end">Remaining</th>
                              </tr>
                            </thead>
                            <tbody>
                              {SUPPLIES_DATA.map((row, i) => (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td><strong>{row.project}</strong></td>
                                  <td>{row.sector}</td>
                                  <td className="text-end">{row.received.toLocaleString()}</td>
                                  <td className="text-end">{row.distributed.toLocaleString()}</td>
                                  <td className="text-end text-primary"><strong>{row.remaining.toLocaleString()}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th></th>
                                <th>Total</th>
                                <th></th>
                                <th className="text-end">{totalSupplies.received.toLocaleString()}</th>
                                <th className="text-end">{totalSupplies.distributed.toLocaleString()}</th>
                                <th className="text-end">{totalSupplies.remaining.toLocaleString()}</th>
                              </tr>
                            </tfoot>
                          </Table>
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
                            <Badge bg="primary" pill className="fs-count-badge">{searchedRecords.length} entries</Badge>
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
                          <Table hover className="fs-data-table mb-0">
                            <thead>
                              <tr>
                                {TABLE_COLUMNS.map((col, idx) => (
                                  <th 
                                    key={idx} 
                                    className={col.key === "_actions" ? "text-center" : col.num || col.strong ? "text-end" : ""}
                                  >
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {searchedRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={TABLE_COLUMNS.length} className="text-center py-5 text-muted">
                                    No records found. Click <strong>Upload Excel</strong> to add records.
                                  </td>
                                </tr>
                              ) : (
                                searchedRecords.map((record, index) => (
                                  <tr key={record.id || index}>
                                    {TABLE_COLUMNS.map((col, cIdx) => {
                                      if (col.key === "_index") return <td key={cIdx} className="text-muted">{index + 1}</td>;
                                      if (col.key === "_actions") return (
                                        <td key={cIdx} className="text-center">
                                          <div className="fs-action-btns">
                                            <Button variant="light" size="sm" className="fs-action-btn fs-edit-btn" onClick={() => handleEdit(record)} title="Edit"><FaEdit /></Button>
                                            <Button variant="light" size="sm" className="fs-action-btn fs-delete-btn" onClick={() => handleDeleteClick(record)} title="Delete"><FaTrash /></Button>
                                          </div>
                                        </td>
                                      );
                                      const val = record[col.key];
                                      if (col.badge) return <td key={cIdx}><Badge className="fs-month-badge">{val}</Badge></td>;
                                      if (col.strong) return <td key={cIdx} className="text-end"><strong className="text-primary">{val ? Number(val).toLocaleString() : 0}</strong></td>;
                                      if (col.num) return <td key={cIdx} className="text-end">{val ? Number(val).toLocaleString() : 0}</td>;
                                      return <td key={cIdx}>{val || "—"}</td>;
                                    })}
                                  </tr>
                                ))
                              )}
                            </tbody>
                            {searchedRecords.length > 0 && (
                              <tfoot>
                                <tr>
                                  {TABLE_COLUMNS.map((col, cIdx) => {
                                    if (col.key === "_index") return <th key={cIdx}></th>;
                                    if (col.key === "_actions") return <th key={cIdx}></th>;
                                    if (col.num || col.strong) return <th key={cIdx} className="text-end">{totalDetailed[col.key]?.toLocaleString() || 0}</th>;
                                    if (cIdx === 1) return <th key={cIdx}>Total</th>;
                                    return <th key={cIdx}></th>;
                                  })}
                                </tr>
                              </tfoot>
                            )}
                          </Table>
                        </div>
                      </Card.Body>
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
                      <Button variant="light" size="sm" onClick={() => setView("list")} className="fs-btn-light"><FaArrowLeft className="me-1" /> Back</Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Basic Information</h6>
                      <Row>
                        <Col md={6} lg={4}>{renderFormField("AWC Code", "awc_code", "text", "5064010101")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Month", "month", "select")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Financial Year", "financial_year", "text", "2026-27")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Active Beneficiaries", "active_beneficiaries", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Total Beneficiaries", "total_beneficiaries", "number", "0")}</Col>
                      </Row>
                    </div>
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Beneficiaries Details</h6>
                      <Row>
                        <Col md={6} lg={3}>{renderFormField("THR 25 Days FRS/HCM (3y-6y)", "thr_25_days_frs_hcm_beneficiaries_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("HCM Beneficiaries (3y-6y)", "hcm_beneficiaries_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Children 6m-3y", "children_6m_3y_beneficiaries", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Pregnant/Lactating Mothers", "pregnant_women_lactating_mothers", "number", "0")}</Col>
                      </Row>
                    </div>
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Packets & Supplies Distribution</h6>
                      <Row>
                        <Col md={6} lg={3}>{renderFormField("Mung Dal Khichdi Packets", "quarterly_packets_mung_dal_khichdi", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Poushik Sattu Mix Packets", "quarterly_packets_poushik_sattu_mix", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Poushik Sattu Mix (75d, gm)", "poushik_sattu_mix_75_days_packet_size_gm", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Sattu 2250gm Packets", "quarterly_packets_sattu_2250gm", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Mix 1000gm Packets", "quarterly_packets_mix_1000gm", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Multi Grain Aata 1250gm", "quarterly_packets_multi_grain_aata_1250gm", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Panjeeri 75d 2625gm", "panjeeri_75_days_2625gm_quarterly_packets", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("Panjeeri 75d 4625gm", "panjeeri_75_days_4625gm_quarterly_packets", "number", "0")}</Col>
                      </Row>
                    </div>
                    <div className="fs-form-section">
                      <h6 className="fs-section-subtitle">SAM & SUW Children</h6>
                      <Row>
                        <Col md={6} lg={3}>{renderFormField("SAM Children 6m-6y", "sam_children_6m_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SUW Children 6m-6y", "suw_children_6m_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SAM Children 3y-6y", "sam_children_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SUW Children 3y-6y", "suw_children_3y_6y", "number", "0")}</Col>
                      </Row>
                    </div>
                  </Card.Body>
                  <Card.Footer className="fs-form-footer">
                    <Button variant="light" onClick={() => setView("list")} className="fs-btn-light px-4"><FaTimes className="me-1" /> Cancel</Button>
                    <Button variant="primary" type="submit" disabled={formLoading} className="fs-btn-primary px-4">
                      {formLoading ? <><Spinner as="span" animation="border" size="sm" className="me-1" /> Saving...</> : <><FaSave className="me-1" /> Update Record</>}
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
            {uploadProgress.isComplete ? <><FaCheckCircle className="me-2 text-success" /> Upload Complete</> : <><FaUpload className="me-2" /> Uploading Records...</>}
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
            <ProgressBar
              now={uploadProgress.total > 0 ? ((uploadProgress.uploaded + uploadProgress.failed) / uploadProgress.total) * 100 : 0}
              variant={uploadProgress.failed > 0 && !uploadProgress.isUploading ? "warning" : "primary"}
              animated={uploadProgress.isUploading}
              style={{ height: "10px" }}
            />
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
              <strong>Total Beneficiaries:</strong> {deleteTarget.total_beneficiaries}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button variant="light" onClick={() => setShowDeleteModal(false)} className="fs-btn-light"><FaTimes className="me-1" /> Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} className="fs-btn-danger"><FaTrash className="me-1" /> Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FoodSupplementary;
