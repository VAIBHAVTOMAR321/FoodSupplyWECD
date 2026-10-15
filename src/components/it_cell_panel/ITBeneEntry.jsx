import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Table,
  Alert,
  Button,
  Form,
  Collapse,
  Pagination,
  Modal,
  Badge,
} from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/itcellLeftnav.css";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";
import "../../assets/css/dashboard.css";
import {
  FaEdit,
  FaTrash,
  FaUpload,
  FaFileExcel,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../../assets/css/AnganwadiDashboard.css";
import * as XLSX from "xlsx";

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3
    ? `${currentYear}-${currentYear + 1}`
    : `${currentYear - 1}-${currentYear}`;
};

const API_URL = "/supplementary-nutrition-master/";

// Fields checked for duplicate entries
const DUPLICATE_CHECK_FIELDS = [
  "district",
  "project",
  "quarter",
  "financial_year",
];

// Column mapping from Excel headers to API field names
const COLUMN_MAPPING = {
  DISTRICT: "district",
  PROJECT: "project",
  QUARTER: "quarter",
  "FINANCIAL YEAR": "financial_year",
  "Pregnant Woman and Lactating Mother": "pregnant_woman_lactating_mother",
  "Children 6m-3y": "children_6m_3y",
  "SAM 6M-5Y / SUW 6M-6Y": "sam_children_6m_5y_suw_children_6m_6y",
  "SAM 3Y-5Y / SUW 3Y-6Y": "sam_children_3y_5y_suw_children_3y_6y",
  "HCM Beneficiaries 3Y-6Y (Normal Children)": "hcm_beneficiaries_3y_6y",
  POUSHIK_SATTU_PREG_LAT: "poushik_sattu_preg_lat",
  PANJEERI_6M_3Y: "panjeeri_6m_3y",
  PANJEERI_SAM_6M_5Y_SUW_6M_6Y: "panjeeri_sam_6m_5y_suw_6m_6y",
  SATTU_SAM_3Y_5Y_SUW_3Y_6Y: "sattu_sam_3y_5y_suw_3y_6y",
  MUNG_DAL_KHICHDI_3Y_6Y: "mung_dal_khichdi_3y_6y",
  MULTI_GRAIN_AATA_3Y_6Y: "multi_grain_aata_3y_6y",
};

// All numeric fields
const NUMERIC_FIELDS = [
  "pregnant_woman_lactating_mother",
  "poushik_sattu_preg_lat",
  "children_6m_3y",
  "panjeeri_6m_3y",
  "sam_children_6m_5y_suw_children_6m_6y",
  "panjeeri_sam_6m_5y_suw_6m_6y",
  "sam_children_3y_5y_suw_children_3y_6y",
  "sattu_sam_3y_5y_suw_3y_6y",
  "hcm_beneficiaries_3y_6y",
  "mung_dal_khichdi_3y_6y",
  "multi_grain_aata_3y_6y",
];

const QUARTERS = [
  "Apr-May-Jun",
  "Jul-Aug-Sep",
  "Oct-Nov-Dec",
  "Jan-Feb-Mar",
];

// Preview table columns definition
const PREVIEW_COLUMNS = [
  { key: "district", label: "District", isDuplicate: true },
  { key: "project", label: "Project", isDuplicate: true },
  { key: "quarter", label: "Quarter", isDuplicate: true },
  { key: "financial_year", label: "Financial Year", isDuplicate: true },
  { key: "pregnant_woman_lactating_mother", label: "PW & LM", isDuplicate: false },
  { key: "poushik_sattu_preg_lat", label: "Poushik Sattu", isDuplicate: false },
  { key: "children_6m_3y", label: "Children 6m-3y", isDuplicate: false },
  { key: "panjeeri_6m_3y", label: "Panjeeri 6m-3y", isDuplicate: false },
  { key: "sam_children_6m_5y_suw_children_6m_6y", label: "SAM 6M-5Y/SUW 6M-6Y", isDuplicate: false },
  { key: "panjeeri_sam_6m_5y_suw_6m_6y", label: "Panjeeri SAM", isDuplicate: false },
  { key: "sam_children_3y_5y_suw_children_3y_6y", label: "SAM 3Y-5Y/SUW 3Y-6Y", isDuplicate: false },
  { key: "sattu_sam_3y_5y_suw_3y_6y", label: "Sattu SAM", isDuplicate: false },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3Y-6Y", isDuplicate: false },
  { key: "mung_dal_khichdi_3y_6y", label: "Mung Dal Khichdi", isDuplicate: false },
  { key: "multi_grain_aata_3y_6y", label: "Multi Grain Aata", isDuplicate: false },
];

const ITBeneEntry = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { api } = useAuth();
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    financial_year: "",
    quarter: "",
  });

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkPreviewData, setBulkPreviewData] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [reportsLoadingForModal, setReportsLoadingForModal] = useState(false);
  const [bulkFileInputKey, setBulkFileInputKey] = useState(0);

  const reportsRef = useRef([]);
  const isFetchingRef = useRef(false); // Prevent duplicate fetches

  const initialFormData = {
    district: "",
    project: "",
    quarter: "",
    financial_year: getCurrentFinancialYear(),
    pregnant_woman_lactating_mother: "",
    poushik_sattu_preg_lat: "",
    children_6m_3y: "",
    panjeeri_6m_3y: "",
    sam_children_6m_5y_suw_children_6m_6y: "",
    panjeeri_sam_6m_5y_suw_6m_6y: "",
    sam_children_3y_5y_suw_children_3y_6y: "",
    sattu_sam_3y_5y_suw_3y_6y: "",
    hcm_beneficiaries_3y_6y: "",
    mung_dal_khichdi_3y_6y: "",
    multi_grain_aata_3y_6y: "",
    sam_children_6m_5y_suw_children_6m_6y_grant: [],
    sam_children_3y_5y_suw_children_3y_6y_grant: [],
    hcm_beneficiaries_3y_6y_grant: [],
  };

  const [formData, setFormData] = useState(initialFormData);

  // ===================== FETCH REPORTS =====================
  const fetchReports = useCallback(async () => {
    if (isFetchingRef.current) return; // Prevent double execution
    isFetchingRef.current = true;
    
    setLoading(true);
    setError("");
    try {
      const response = await api.get(API_URL, { timeout: 30000 }); // 30s timeout
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.results?.data) {
        data = response.data.results.data;
      } else if (response.data?.data) {
        data = response.data.data;
      } else if (response.data?.results) {
        data = Array.isArray(response.data.results) ? response.data.results : [];
      }
      setReports(data);
      reportsRef.current = data;
    } catch (err) {
      setError("Failed to fetch supplementary nutrition records. Please try again.");
      console.error("Fetch reports error:", err.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [api]);

  // Fetch reports specifically for modal
  const fetchReportsForModal = useCallback(async () => {
    setReportsLoadingForModal(true);
    try {
      const response = await api.get(API_URL, { timeout: 30000 });
      let data = [];
      if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.results?.data) {
        data = response.data.results.data;
      } else if (response.data?.data) {
        data = response.data.data;
      } else if (response.data?.results) {
        data = Array.isArray(response.data.results) ? response.data.results : [];
      }
      setReports(data);
      reportsRef.current = data;
      return data;
    } catch (err) {
      console.error("Modal fetch error:", err.message);
      return [];
    } finally {
      setReportsLoadingForModal(false);
    }
  }, [api]);

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
    fetchReports();
  }, [fetchReports]);

  // ===================== HELPERS =====================
  const normalizeStr = (str) => {
    if (str === undefined || str === null) return "";
    return String(str).trim().toLowerCase();
  };

  const createDuplicateKey = (district, project, quarter, finYear) => {
    return `${normalizeStr(district)}|||${normalizeStr(project)}|||${normalizeStr(quarter)}|||${normalizeStr(finYear)}`;
  };

  const hasDuplicateError = (errors) => {
    return !!errors.duplicate_server || !!errors.duplicate_file;
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  // ===================== EDIT (PUT) =====================
  const handleEdit = (report) => {
    setEditingId(report.id);
    setFormData({
      ...initialFormData,
      ...report,
      sam_children_6m_5y_suw_children_6m_6y_grant:
        report.sam_children_6m_5y_suw_children_6m_6y_grant || [],
      sam_children_3y_5y_suw_children_3y_6y_grant:
        report.sam_children_3y_5y_suw_children_3y_6y_grant || [],
      hcm_beneficiaries_3y_6y_grant:
        report.hcm_beneficiaries_3y_6y_grant || [],
    });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  // ===================== DELETE =====================
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await api.delete(API_URL, { data: { ids: [id] } });
        setSuccess("Record deleted successfully.");
        fetchReports();
      } catch (err) {
        setError("Failed to delete record.");
        console.error(err);
      }
    }
  };

  // ===================== BULK UPLOAD MODAL =====================
  const handleShowBulkUploadModal = async () => {
    setBulkFile(null);
    setBulkPreviewData([]);
    setBulkUploadError("");
    setBulkFileInputKey((prev) => prev + 1);
    setShowBulkUploadModal(true);
    await fetchReportsForModal();
  };

  const handleCloseBulkUploadModal = () => setShowBulkUploadModal(false);

  // ===================== DOWNLOAD TEMPLATE =====================
  const downloadSampleFile = () => {
    const headerRow1 = [
      "S. No.",
      "DISTRICT",
      "PROJECT",
      "QUARTER",
      "FINANCIAL YEAR",
      "Pregnant Woman and Lactating Mother",
      "Children 6m-3y",
      "SAM 6M-5Y / SUW 6M-6Y",
      "SAM 3Y-5Y / SUW 3Y-6Y",
      "HCM Beneficiaries 3Y-6Y (Normal Children)",
      "Supplementary Nutrition Details",
      "",
      "",
      "",
      "",
      "",
    ];
    const headerRow2 = [
      "", // Removed the "1" to prevent the extra row look
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "POUSHIK_SATTU_PREG_LAT",
      "PANJEERI_6M_3Y",
      "PANJEERI_SAM_6M_5Y_SUW_6M_6Y",
      "SATTU_SAM_3Y_5Y_SUW_3Y_6Y",
      "MUNG_DAL_KHICHDI_3Y_6Y",
      "MULTI_GRAIN_AATA_3Y_6Y",
    ];
    const sampleRow = [
      1,
      "almora",
      "Bhaisiyachana [0506401]",
      "Oct-Nov-Dec",
      "2026-2027",
      150,
      200,
      25,
      15,
      300,
      150,
      200,
      25,
      15,
      300,
      300,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, sampleRow]);

    // Set column widths
    ws["!cols"] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 30 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Grant Wise Master");
    XLSX.writeFile(wb, "supplementarynutrimaster_template.xlsx");
  };

  // ===================== FILE SELECT & PARSE =====================
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const latestReports = await fetchReportsForModal();

    setBulkFile(file);
    setBulkPreviewData([]);
    setBulkUploadError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (aoa.length < 3) {
          setBulkUploadError("The Excel file is empty or has no data rows (minimum 2 header rows + 1 data row required).");
          return;
        }

        const row0 = aoa[0] || [];
        const row1 = aoa[1] || [];

        const columnMap = {};
        const maxCols = Math.max(row0.length, row1.length);
        for (let c = 0; c < maxCols; c++) {
          const h0 = String(row0[c] || "").trim();
          const h1 = String(row1[c] || "").trim();
          let header = null;
          
          // Updated exclusion logic to match new template
          if (h1 && h1 !== "*" && h1 !== "1" && h1 !== "") {
            header = h1;
          } else if (
            h0 && 
            h0 !== "S. No." && 
            h0 !== "Supplementary Nutrition Details" && 
            h0 !== "" && 
            h0 !== "*"
          ) {
            header = h0;
          }

          if (header && COLUMN_MAPPING[header]) {
            columnMap[c] = COLUMN_MAPPING[header];
          }
        }

        const mappedFields = Object.values(columnMap);
        const missingFields = DUPLICATE_CHECK_FIELDS.filter((f) => !mappedFields.includes(f));
        if (missingFields.length > 0) {
          setBulkUploadError(`Missing required columns: ${missingFields.join(", ")}. Please use the downloaded template.`);
          return;
        }

        const jsonData = [];
        for (let r = 2; r < aoa.length; r++) {
          const row = aoa[r];
          if (!row || row.every((v) => v === "" || v === null || v === undefined)) continue;
          const obj = {};
          for (const [colIdx, fieldName] of Object.entries(columnMap)) {
            obj[fieldName] = row[colIdx] !== undefined && row[colIdx] !== null ? row[colIdx] : "";
          }
          jsonData.push(obj);
        }

        if (jsonData.length === 0) {
          setBulkUploadError("No data rows found in the file.");
          return;
        }

        const existingEntriesMap = new Map();
        latestReports.forEach((r) => {
          const key = createDuplicateKey(r.district, r.project, r.quarter, r.financial_year);
          existingEntriesMap.set(key, r);
        });

        const seenEntriesInFile = new Set();
        let duplicateCount = 0;
        const duplicateDetails = [];

        const previewData = jsonData.map((row, index) => {
          const rowErrors = {};

          DUPLICATE_CHECK_FIELDS.forEach((field) => {
            const value = row[field];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[field] = `'${field}' is missing.`;
            }
          });

          NUMERIC_FIELDS.forEach((field) => {
            const value = row[field];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[field] = `'${field}' is missing.`;
            } else if (isNaN(Number(value))) {
              rowErrors[field] = `'${field}' must be a valid number.`;
            }
          });

          const keyFieldsValid = DUPLICATE_CHECK_FIELDS.every((f) => !rowErrors[f]);
          if (keyFieldsValid) {
            const dupKey = createDuplicateKey(row.district, row.project, row.quarter, row.financial_year);

            if (existingEntriesMap.has(dupKey)) {
              const dupErrorMsg = `For quarter '${String(row.quarter).trim()}' of financial year '${String(row.financial_year).trim()}', the entry for District '${String(row.district).trim()}' and Project '${String(row.project).trim()}' is already present.`;
              rowErrors["duplicate_server"] = dupErrorMsg;
              DUPLICATE_CHECK_FIELDS.forEach((f) => {
                rowErrors[`${f}_duplicate`] = dupErrorMsg;
              });
              duplicateCount++;
              duplicateDetails.push({
                row: index + 3,
                district: row.district,
                project: row.project,
                quarter: row.quarter,
                fin_year: row.financial_year,
              });
            }

            if (seenEntriesInFile.has(dupKey)) {
              const fileDupMsg = `Duplicate within file: For quarter '${row.quarter}' of financial year '${row.financial_year}', District '${row.district}' and Project '${row.project}' appears multiple times.`;
              rowErrors["duplicate_file"] = fileDupMsg;
              if (!rowErrors.duplicate_server) {
                DUPLICATE_CHECK_FIELDS.forEach((f) => {
                  rowErrors[`${f}_duplicate`] = fileDupMsg;
                });
              }
              duplicateCount++;
            } else {
              seenEntriesInFile.add(dupKey);
            }
          }

          return { data: row, errors: rowErrors };
        });

        setBulkPreviewData(previewData);

        const hasNonDuplicateErrors = previewData.some((item) => {
          const keys = Object.keys(item.errors);
          const realErrors = keys.filter(
            (k) => !["duplicate_server", "duplicate_file", ...DUPLICATE_CHECK_FIELDS.map((f) => `${f}_duplicate`)].includes(k)
          );
          return realErrors.length > 0;
        });

        if (duplicateCount > 0 && hasNonDuplicateErrors) {
          setBulkUploadError(
            `Found ${duplicateCount} duplicate entry/entries and rows with validation errors. Duplicates: ${duplicateDetails.map((d) => `Row ${d.row} (${d.district} - ${d.project} - ${d.quarter} - ${d.fin_year})`).join(", ")}. Please fix all errors before uploading.`
          );
        } else if (duplicateCount > 0) {
          setBulkUploadError(
            `Found ${duplicateCount} duplicate entry/entries! For the specified quarter(s) of this financial year, the entry for the District/Project combination is already present. Duplicates: ${duplicateDetails.map((d) => `Row ${d.row} (${d.district} - ${d.project} - ${d.quarter} - ${d.fin_year})`).join(", ")}. Please remove duplicate rows before uploading.`
          );
        } else if (hasNonDuplicateErrors) {
          setBulkUploadError("Your file contains validation errors. Please fix them before uploading.");
        }
      } catch (err) {
        setBulkUploadError("Failed to parse the Excel file. Please ensure it's a valid .xlsx or .xls file.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ===================== BULK UPLOAD (POST) =====================
  const handleBulkUpload = async () => {
    const hasErrors = bulkPreviewData.some((item) => Object.keys(item.errors).length > 0);

    if (!bulkFile || hasErrors) {
      setBulkUploadError("Cannot upload. Please select a valid file and fix all errors including duplicate entries.");
      return;
    }

    setBulkUploading(true);
    setBulkUploadError("");

    try {
      const validRows = bulkPreviewData.map((item) => ({
        district: String(item.data.district).trim(),
        project: String(item.data.project).trim(),
        quarter: String(item.data.quarter).trim(),
        financial_year: String(item.data.financial_year).trim(),
        pregnant_woman_lactating_mother: Number(item.data.pregnant_woman_lactating_mother) || 0,
        poushik_sattu_preg_lat: Number(item.data.poushik_sattu_preg_lat) || 0,
        children_6m_3y: Number(item.data.children_6m_3y) || 0,
        panjeeri_6m_3y: Number(item.data.panjeeri_6m_3y) || 0,
        sam_children_6m_5y_suw_children_6m_6y: Number(item.data.sam_children_6m_5y_suw_children_6m_6y) || 0,
        panjeeri_sam_6m_5y_suw_6m_6y: Number(item.data.panjeeri_sam_6m_5y_suw_6m_6y) || 0,
        sam_children_3y_5y_suw_children_3y_6y: Number(item.data.sam_children_3y_5y_suw_children_3y_6y) || 0,
        sattu_sam_3y_5y_suw_3y_6y: Number(item.data.sattu_sam_3y_5y_suw_3y_6y) || 0,
        hcm_beneficiaries_3y_6y: Number(item.data.hcm_beneficiaries_3y_6y) || 0,
        mung_dal_khichdi_3y_6y: Number(item.data.mung_dal_khichdi_3y_6y) || 0,
        multi_grain_aata_3y_6y: Number(item.data.multi_grain_aata_3y_6y) || 0,
        sam_children_6m_5y_suw_children_6m_6y_grant: [],
        sam_children_3y_5y_suw_children_3y_6y_grant: [],
        hcm_beneficiaries_3y_6y_grant: [],
      }));

      const uploadPromises = validRows.map((payload) => api.post(API_URL, payload));
      await Promise.all(uploadPromises);
      
      setSuccess("Bulk upload successful!");
      handleCloseBulkUploadModal();
      fetchReports();
    } catch (err) {
      setBulkUploadError("An error occurred during bulk upload. Some records may have failed.");
      console.error("Bulk upload failed:", err.response || err);
    } finally {
      setBulkUploading(false);
    }
  };

  // ===================== UPDATE (PUT) =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    const payload = {
      id: editingId,
      district: formData.district,
      project: formData.project,
      quarter: formData.quarter,
      financial_year: formData.financial_year,
      pregnant_woman_lactating_mother: Number(formData.pregnant_woman_lactating_mother) || 0,
      poushik_sattu_preg_lat: Number(formData.poushik_sattu_preg_lat) || 0,
      children_6m_3y: Number(formData.children_6m_3y) || 0,
      panjeeri_6m_3y: Number(formData.panjeeri_6m_3y) || 0,
      sam_children_6m_5y_suw_children_6m_6y: Number(formData.sam_children_6m_5y_suw_children_6m_6y) || 0,
      panjeeri_sam_6m_5y_suw_6m_6y: Number(formData.panjeeri_sam_6m_5y_suw_6m_6y) || 0,
      sam_children_3y_5y_suw_children_3y_6y: Number(formData.sam_children_3y_5y_suw_children_3y_6y) || 0,
      sattu_sam_3y_5y_suw_3y_6y: Number(formData.sattu_sam_3y_5y_suw_3y_6y) || 0,
      hcm_beneficiaries_3y_6y: Number(formData.hcm_beneficiaries_3y_6y) || 0,
      mung_dal_khichdi_3y_6y: Number(formData.mung_dal_khichdi_3y_6y) || 0,
      multi_grain_aata_3y_6y: Number(formData.multi_grain_aata_3y_6y) || 0,
      sam_children_6m_5y_suw_children_6m_6y_grant: formData.sam_children_6m_5y_suw_children_6m_6y_grant || [],
      sam_children_3y_5y_suw_children_3y_6y_grant: formData.sam_children_3y_5y_suw_children_3y_6y_grant || [],
      hcm_beneficiaries_3y_6y_grant: formData.hcm_beneficiaries_3y_6y_grant || [],
    };

    try {
      await api.put(API_URL, payload);
      setSuccess("Record updated successfully.");
      setShowForm(false);
      setFormData(initialFormData);
      setEditingId(null);
      fetchReports();
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      setError("Failed to update record.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== DERIVED DATA =====================
  const uniqueFinYears = useMemo(() => {
    return [...new Set(reports.map((r) => r.financial_year))].sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const uniqueQuarters = useMemo(() => {
    const quarters = [...new Set(reports.map((r) => r.quarter))];
    return quarters.sort((a, b) => QUARTERS.indexOf(a) - QUARTERS.indexOf(b));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      return (
        (filters.financial_year ? report.financial_year === filters.financial_year : true) &&
        (filters.quarter ? report.quarter === filters.quarter : true)
      );
    });
  }, [reports, filters]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const isBulkUploadDisabled = useMemo(() => {
    return (
      bulkUploading ||
      !bulkFile ||
      reportsLoadingForModal ||
      bulkPreviewData.some((item) => Object.keys(item.errors).length > 0)
    );
  }, [bulkUploading, bulkFile, bulkPreviewData, reportsLoadingForModal]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => setCurrentPage(number)}>
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination>{items}</Pagination>;
  };

  // ===================== PREVIEW TABLE HELPERS =====================
  const getCellError = (item, key) => {
    if (item.errors[key]) return item.errors[key];
    if (DUPLICATE_CHECK_FIELDS.includes(key) && item.errors[`${key}_duplicate`]) return item.errors[`${key}_duplicate`];
    return null;
  };

  const getCellClass = (item, key) => {
    if (item.errors[key]) return "table-danger";
    if (DUPLICATE_CHECK_FIELDS.includes(key) && item.errors[`${key}_duplicate`]) return "table-danger";
    return "";
  };

  // ===================== RENDER =====================
  return (
    <div className="dashboard-container">
      <ITCellLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />

      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="mb-4 fw-bold">Supplementary Nutrition Master</h3>
            <div>
              <Button onClick={handleShowBulkUploadModal} variant="success" className="me-2">
                <FaUpload className="me-2" /> Bulk Upload
              </Button>
            </div>
          </div>

          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

          {/* ===================== EDIT FORM (PUT) ===================== */}
          <Collapse in={showForm}>
            <Card className="mb-4">
              <Card.Header as="h5">Edit Supplementary Nutrition Record</Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>District</Form.Label>
                        <Form.Control type="text" name="district" value={formData.district} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Project</Form.Label>
                        <Form.Control type="text" name="project" value={formData.project} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quarter</Form.Label>
                        <Form.Select name="quarter" value={formData.quarter} onChange={handleFormChange} required>
                          <option value="">Select Quarter</option>
                          {QUARTERS.map((quarter) => <option key={quarter} value={quarter}>{quarter}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Financial Year</Form.Label>
                        <Form.Control type="text" name="financial_year" value={formData.financial_year} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <hr />
                  <h6 className="mb-3">Beneficiary Numbers & Supplementary Nutrition Details</h6>

                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Pregnant Woman & Lactating Mother</Form.Label>
                        <Form.Control type="number" name="pregnant_woman_lactating_mother" value={formData.pregnant_woman_lactating_mother} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Poushik Sattu (PW & LM)</Form.Label>
                        <Form.Control type="number" name="poushik_sattu_preg_lat" value={formData.poushik_sattu_preg_lat} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Children 6m-3y</Form.Label>
                        <Form.Control type="number" name="children_6m_3y" value={formData.children_6m_3y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Panjeeri 6m-3y</Form.Label>
                        <Form.Control type="number" name="panjeeri_6m_3y" value={formData.panjeeri_6m_3y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>SAM 6M-5Y / SUW 6M-6Y</Form.Label>
                        <Form.Control type="number" name="sam_children_6m_5y_suw_children_6m_6y" value={formData.sam_children_6m_5y_suw_children_6m_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Panjeeri SAM 6M-5Y / SUW 6M-6Y</Form.Label>
                        <Form.Control type="number" name="panjeeri_sam_6m_5y_suw_6m_6y" value={formData.panjeeri_sam_6m_5y_suw_6m_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>SAM 3Y-5Y / SUW 3Y-6Y</Form.Label>
                        <Form.Control type="number" name="sam_children_3y_5y_suw_children_3y_6y" value={formData.sam_children_3y_5y_suw_children_3y_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Sattu SAM 3Y-5Y / SUW 3Y-6Y</Form.Label>
                        <Form.Control type="number" name="sattu_sam_3y_5y_suw_3y_6y" value={formData.sattu_sam_3y_5y_suw_3y_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>HCM Beneficiaries 3Y-6Y</Form.Label>
                        <Form.Control type="number" name="hcm_beneficiaries_3y_6y" value={formData.hcm_beneficiaries_3y_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Mung Dal Khichdi 3Y-6Y</Form.Label>
                        <Form.Control type="number" name="mung_dal_khichdi_3y_6y" value={formData.mung_dal_khichdi_3y_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Multi Grain Aata 3Y-6Y</Form.Label>
                        <Form.Control type="number" name="multi_grain_aata_3y_6y" value={formData.multi_grain_aata_3y_6y} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); setFormData(initialFormData); }} className="me-2">
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : "Update Record"}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Collapse>

          {/* ===================== DATA TABLE ===================== */}
          <h5 className="mt-4">Existing Supplementary Nutrition Records</h5>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Financial Year</Form.Label>
                <Form.Select name="financial_year" value={filters.financial_year} onChange={handleFilterChange}>
                  <option value="">All Years</option>
                  {uniqueFinYears.map((year) => <option key={year} value={year}>{year}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Quarter</Form.Label>
                <Form.Select name="quarter" value={filters.quarter} onChange={handleFilterChange}>
                  <option value="">All Quarters</option>
                  {uniqueQuarters.map((quarter) => <option key={quarter} value={quarter}>{quarter}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Fetching records, please wait...</p>
              </div>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District</th>
                    <th>Project</th>
                    <th>Quarter</th>
                    <th>Financial Year</th>
                    <th>PW & LM</th>
                    <th>Poushik Sattu</th>
                    <th>Children 6m-3y</th>
                    <th>Panjeeri 6m-3y</th>
                    <th>SAM 6M-5Y/SUW 6M-6Y</th>
                    <th>Panjeeri SAM</th>
                    <th>SAM 3Y-5Y/SUW 3Y-6Y</th>
                    <th>Sattu SAM</th>
                    <th>HCM 3Y-6Y</th>
                    <th>Mung Dal Khichdi</th>
                    <th>Multi Grain Aata</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((report, index) => (
                      <tr key={report.id}>
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td>{report.district}</td>
                        <td>{report.project}</td>
                        <td>{report.quarter}</td>
                        <td>{report.financial_year}</td>
                        <td>{report.pregnant_woman_lactating_mother}</td>
                        <td>{report.poushik_sattu_preg_lat}</td>
                        <td>{report.children_6m_3y}</td>
                        <td>{report.panjeeri_6m_3y}</td>
                        <td>{report.sam_children_6m_5y_suw_children_6m_6y}</td>
                        <td>{report.panjeeri_sam_6m_5y_suw_6m_6y}</td>
                        <td>{report.sam_children_3y_5y_suw_children_3y_6y}</td>
                        <td>{report.sattu_sam_3y_5y_suw_3y_6y}</td>
                        <td>{report.hcm_beneficiaries_3y_6y}</td>
                        <td>{report.mung_dal_khichdi_3y_6y}</td>
                        <td>{report.multi_grain_aata_3y_6y}</td>
                        <td>
                          <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(report)}>
                            <FaEdit />
                          </Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)}>
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="17" className="text-center">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
            {renderPagination()}
          </div>

          {/* ===================== BULK UPLOAD MODAL ===================== */}
          <Modal show={showBulkUploadModal} onHide={handleCloseBulkUploadModal} centered size="xl">
            <Modal.Header closeButton>
              <Modal.Title>Bulk Upload Supplementary Nutrition Records</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {reportsLoadingForModal && (
                <Alert variant="info">
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Loading existing records for duplicate checking...
                </Alert>
              )}

              {bulkUploadError && (
                <Alert variant="danger">
                  <FaExclamationTriangle className="me-2" />
                  {bulkUploadError}
                </Alert>
              )}

              <p>Upload an Excel file with the required columns. The column names must match the downloaded template.</p>

              <div className="d-flex align-items-center mb-3">
                <Button variant="link" onClick={downloadSampleFile} className="p-0 me-3">
                  <FaFileExcel className="me-1" /> Download Template File
                </Button>
                <Badge bg="info" pill>
                  {reportsRef.current.length} existing records in system
                </Badge>
              </div>

              <div className="mb-3 p-2" style={{ backgroundColor: "#f8f9fa", borderRadius: "4px", fontSize: "0.85rem" }}>
                <strong>Duplicate Check Rule:</strong> An entry is considered duplicate if the combination of{" "}
                <Badge bg="primary" className="mx-1">District</Badge> +{" "}
                <Badge bg="primary" className="mx-1">Project</Badge> +{" "}
                <Badge bg="primary" className="mx-1">Quarter</Badge> +{" "}
                <Badge bg="primary" className="mx-1">Financial Year</Badge>{" "}
                already exists. The numeric count fields are NOT checked for duplicates.
              </div>

              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Select Excel File</Form.Label>
                <Form.Control key={bulkFileInputKey} type="file" accept=".xlsx, .xls" onChange={handleFileSelect} disabled={reportsLoadingForModal} />
                {reportsLoadingForModal && (
                  <Form.Text className="text-muted">
                    Loading required data... file selection will be enabled shortly.
                  </Form.Text>
                )}
              </Form.Group>

              {bulkPreviewData.length > 0 && (
                <div className="mt-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <h6>File Preview</h6>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        {PREVIEW_COLUMNS.map((col) => (
                          <th key={col.key} style={{ backgroundColor: col.isDuplicate ? "#cce5ff" : "transparent", fontWeight: col.isDuplicate ? "bold" : "normal" }} title={col.isDuplicate ? "Checked for duplicates" : "Format validated only, not checked for duplicates"}>
                            {col.label}
                            {col.isDuplicate && <span style={{ color: "#004085", fontSize: "0.7rem" }}> *</span>}
                          </th>
                        ))}
                        <th>Status / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreviewData.map((item, index) => {
                        const hasErrors = Object.keys(item.errors).length > 0;
                        const hasDupError = hasDuplicateError(item.errors);
                        return (
                          <tr key={index} className={hasErrors ? "table-danger" : ""}>
                            <td>{index + 1}</td>
                            {PREVIEW_COLUMNS.map((col) => {
                              const cellError = getCellError(item, col.key);
                              const cellClass = getCellClass(item, col.key);
                              return (
                                <td key={col.key} className={cellClass} title={cellError || (col.isDuplicate ? "Checked for duplicates" : "Count field - not checked for duplicates")} style={{ cursor: cellError ? "help" : "default", fontSize: "0.85rem", backgroundColor: col.isDuplicate && !cellClass ? "#f0f7ff" : undefined }}>
                                  {item.data[col.key]}
                                  {cellError && <div className="text-danger mt-1" style={{ fontSize: "0.65rem", fontWeight: "600" }}>⚠ DUPLICATE</div>}
                                </td>
                              );
                            })}
                            <td style={{ fontSize: "0.8rem", minWidth: "220px" }}>
                              {hasErrors ? (
                                <div>
                                  <Badge bg="danger" className="mb-1">{hasDupError ? "DUPLICATE" : "ERROR"}</Badge>
                                  <div className="text-danger" style={{ fontSize: "0.7rem" }}>
                                    {item.errors.duplicate_server || item.errors.duplicate_file || Object.values(item.errors).filter((e) => e !== item.errors.duplicate_server && e !== item.errors.duplicate_file).join(", ")}
                                  </div>
                                </div>
                              ) : (
                                <Badge bg="success">OK</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>

                  {bulkPreviewData.some((item) => hasDuplicateError(item.errors)) && (
                    <Alert variant="danger" className="mt-3 mb-0">
                      <FaExclamationTriangle className="me-2" />
                      <strong>Duplicate Entries Found - Upload Disabled!</strong>
                      <div className="mt-2 mb-1" style={{ fontSize: "0.8rem" }}>
                        The following rows have the same{" "}
                        <strong>District + Project + Quarter + Financial Year</strong> combination that already exists:
                      </div>
                      <ul className="mb-0" style={{ fontSize: "0.8rem" }}>
                        {bulkPreviewData.filter((item) => hasDuplicateError(item.errors)).map((item, idx) => (
                          <li key={idx}>
                            <strong>Row {bulkPreviewData.indexOf(item) + 1}:</strong>{" "}
                            {item.errors.duplicate_server || item.errors.duplicate_file}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseBulkUploadModal} disabled={bulkUploading}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkUpload} disabled={isBulkUploadDisabled} title={isBulkUploadDisabled && bulkFile ? "Fix all duplicate errors (District + Project + Quarter + Financial Year) before uploading" : ""}>
                {bulkUploading ? (
                  <><Spinner as="span" animation="border" size="sm" /> Uploading...</>
                ) : (
                  "Upload"
                )}
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default ITBeneEntry;