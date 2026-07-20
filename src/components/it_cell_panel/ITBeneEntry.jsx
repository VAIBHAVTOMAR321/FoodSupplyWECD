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
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
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
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const API_URL = "/director/beneficiary-summary/";

// Only these 3 fields are checked for duplicate entry
const DUPLICATE_CHECK_FIELDS = ["fin_year", "month", "awc_name"];

// Numeric fields - only validated for format, NOT for duplicates
const NUMERIC_FIELDS = [
  "pw_lm",
  "children_3_6y",
  "children_6m_3y",
  "adolescent_girls",
  "sam_6m_3y",
  "sam_3_5y",
  "suw_6m_3y",
  "suw_3_6y",
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
    fin_year: "",
    month: "",
  });
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [viewingRemark, setViewingRemark] = useState("");

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkPreviewData, setBulkPreviewData] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [reportsLoadingForModal, setReportsLoadingForModal] = useState(false);

  const [awcList, setAwcList] = useState([]);
  const [awcListLoading, setAwcListLoading] = useState(true);
  const [bulkFileInputKey, setBulkFileInputKey] = useState(0);

  // Use a ref to always have the latest reports data available
  const reportsRef = useRef([]);

  const initialFormData = {
    fin_year: getCurrentFinancialYear(),
    month: "",
    pw_lm: "",
    children_3_6y: "",
    children_6m_3y: "",
    adolescent_girls: "",
    sam_6m_3y: "",
    sam_3_5y: "",
    suw_6m_3y: "",
    suw_3_6y: "",
    district: "",
    project: "",
    sector: "",
    awc_name: "",
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(API_URL);
      let data = [];
      if (response.data?.results?.data) {
        data = response.data.results.data;
      } else if (response.data?.data) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.results) {
        data = Array.isArray(response.data.results) ? response.data.results : [];
      }
      setReports(data);
      reportsRef.current = data;
      console.log("Fetched reports count:", data.length);
    } catch (err) {
      setError("Failed to fetch beneficiary reports.");
      console.error("Fetch reports error:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Fetch reports specifically for modal (ensures fresh data)
  const fetchReportsForModal = useCallback(async () => {
    setReportsLoadingForModal(true);
    try {
      const response = await api.get(API_URL);
      let data = [];
      if (response.data?.results?.data) {
        data = response.data.results.data;
      } else if (response.data?.data) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.results) {
        data = Array.isArray(response.data.results) ? response.data.results : [];
      }
      setReports(data);
      reportsRef.current = data;
      console.log("Modal - Fetched reports count:", data.length);
      return data;
    } catch (err) {
      console.error("Modal fetch error:", err);
      return [];
    } finally {
      setReportsLoadingForModal(false);
    }
  }, [api]);

  useEffect(() => {
    const fetchAwcList = async () => {
      setAwcListLoading(true);
      try {
        const response = await api.get("/director/awc-list/");
        const awcs = (response.data.data || []).map(awc => ({
          ...awc,
          district_name: awc.district,
        }));
        setAwcList(awcs);
      } catch (err) {
        console.error("Failed to fetch AWC list:", err);
      } finally {
        setAwcListLoading(false);
      }
    };
    fetchAwcList();
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

  // Helper function to normalize a string for comparison
  const normalizeStr = (str) => {
    if (str === undefined || str === null) return "";
    return String(str).trim().toLowerCase();
  };

  // Helper function to create a unique key for duplicate checking
  // ONLY uses awc_name, fin_year, month - NOT the numeric count fields
  const createDuplicateKey = (finYear, month, awcName) => {
    return `${normalizeStr(finYear)}|||${normalizeStr(month)}|||${normalizeStr(awcName)}`;
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

  const handleShowRemarkModal = (remark) => {
    setViewingRemark(remark);
    setShowRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);
    setViewingRemark("");
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleEdit = (report) => {
    setEditingId(report.id);
    setFormData({ ...report });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await api.delete(API_URL, { data: { ids: [id] } });
        setSuccess("Report deleted successfully.");
        fetchReports();
      } catch (err) {
        setError("Failed to delete report.");
        console.error(err);
      }
    }
  };

  const handleShowBulkUploadModal = async () => {
    setBulkFile(null);
    setBulkPreviewData([]);
    setBulkUploadError("");
    setBulkFileInputKey(prev => prev + 1);
    setShowBulkUploadModal(true);
    // Always fetch fresh reports when opening modal
    await fetchReportsForModal();
  };

  const handleCloseBulkUploadModal = () => setShowBulkUploadModal(false);

  const downloadSampleFile = () => {
    const sampleData = [
      {
        fin_year: getCurrentFinancialYear(),
        month: "apr",
        pw_lm: 10,
        children_6m_3y: 15,
        children_3_6y: 20,
        adolescent_girls: 5,
        sam_6m_3y: 1,
        sam_3_5y: 2,
        suw_6m_3y: 3,
        suw_3_6y: 4,
        awc_name: "Sample AWC",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiary Data");
    XLSX.writeFile(workbook, "SampleBeneficiaryEntry.xlsx");
  };

  // Levenshtein distance function
  const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
      }
    }
    return matrix[b.length][a.length];
  };

  // Helper: check if errors object has ONLY suggestion (allowed to upload)
  const hasOnlySuggestionError = (errors) => {
    const errorKeys = Object.keys(errors);
    return errorKeys.length === 1 && errorKeys[0] === 'awc_name_suggestion';
  };

  // Helper: check if errors object has any duplicate error
  const hasDuplicateError = (errors) => {
    return !!errors.duplicate_server || !!errors.duplicate_file;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (awcList.length === 0) {
      if (awcListLoading) {
        setBulkUploadError("AWC list is still loading. Please wait a moment and select the file again.");
      } else {
        setBulkUploadError("AWC list is not available. Please refresh the page and try again.");
      }
      setBulkPreviewData([]);
      setBulkFile(null);
      return;
    }

    // Always fetch fresh reports before processing file
    const latestReports = await fetchReportsForModal();

    if (latestReports.length === 0) {
      setBulkUploadError("No existing records found in the system. Please ensure data is available before uploading.");
      setBulkPreviewData([]);
      setBulkFile(null);
      return;
    }

    setBulkFile(file);
    setBulkPreviewData([]);
    setBulkUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json.length === 0) {
          setBulkUploadError("The Excel file is empty.");
          return;
        }

        const requiredHeaders = [
          "fin_year", "month", "awc_name", "pw_lm", "children_3_6y",
          "children_6m_3y", "adolescent_girls", "sam_6m_3y", "sam_3_5y",
          "suw_6m_3y", "suw_3_6y"
        ];
        const fileHeaders = Object.keys(json[0] || {});
        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

        if (missingHeaders.length > 0) {
          setBulkUploadError(`Missing required columns: ${missingHeaders.join(", ")}`);
          return;
        }

        // Create a map for quick, case-insensitive AWC name lookup
        const awcNameMap = new Map();
        awcList.forEach(awc => awcNameMap.set(String(awc.awc_name).trim().toUpperCase(), awc.awc_name));

        // For duplicate checking within file
        const seenEntriesInFile = new Set();

        // Create existing entries set from LATEST reports
        // ONLY using awc_name + fin_year + month as the key
        const existingEntriesMap = new Map();
        latestReports.forEach(r => {
          const key = createDuplicateKey(r.fin_year, r.month, r.awc_name);
          existingEntriesMap.set(key, {
            fin_year: r.fin_year,
            month: r.month,
            awc_name: r.awc_name
          });
        });

        console.log("Existing entries in DB:", existingEntriesMap.size);
        console.log("Sample existing keys:", [...existingEntriesMap.keys()].slice(0, 5));

        let duplicateCount = 0;
        const duplicateDetails = [];

        const previewData = json.map((row, index) => {
          const rowErrors = {};

          // =============================================
          // STEP 1: Validate required fields are present
          // =============================================
          DUPLICATE_CHECK_FIELDS.forEach(header => {
            const value = row[header];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[header] = `'${header}' is missing.`;
            }
          });

          // =============================================
          // STEP 2: Validate numeric fields (format only, NOT for duplicates)
          // =============================================
          NUMERIC_FIELDS.forEach(header => {
            const value = row[header];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[header] = `'${header}' is missing.`;
            } else if (isNaN(Number(value))) {
              rowErrors[header] = `'${header}' must be a valid number.`;
            }
          });

          // =============================================
          // STEP 3: Validate awc_name against the AWC list
          // =============================================
          const excelAwcName = row.awc_name ? String(row.awc_name).trim().toUpperCase() : "";
          if (!excelAwcName) {
            // Already handled in STEP 1
          } else if (awcNameMap.has(excelAwcName)) {
            row.awc_name = awcNameMap.get(excelAwcName); // Correct casing
          } else {
            let bestMatch = null;
            let minDistance = Infinity;
            awcList.forEach(awc => {
              const distance = levenshteinDistance(excelAwcName, awc.awc_name.toUpperCase());
              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = awc.awc_name;
              }
            });

            if (bestMatch && minDistance <= 2) {
              rowErrors['awc_name_suggestion'] = `Original: '${row.awc_name}'. Corrected to '${bestMatch}'.`;
              row.awc_name = bestMatch;
            } else {
              const errorMessage = bestMatch
                ? `'${row.awc_name}' is not a valid AWC name. Did you mean '${bestMatch}'?`
                : `'${row.awc_name}' is not a valid AWC name.`;
              rowErrors['awc_name'] = errorMessage;
            }
          }

          // =============================================
          // STEP 4: Duplicate check - ONLY awc_name + fin_year + month
          // Numeric count fields are NOT checked for duplicates
          // =============================================
          const hasOnlySuggestion = hasOnlySuggestionError(rowErrors);
          // Check if the 3 key fields are present (no missing/format errors on them)
          const keyFieldsValid = !rowErrors.fin_year && !rowErrors.month && !rowErrors.awc_name;

          if (keyFieldsValid) {
            // Create duplicate key using ONLY awc_name, fin_year, month
            const dupKey = createDuplicateKey(row.fin_year, row.month, row.awc_name);

            console.log(`Row ${index + 1} duplicate key:`, dupKey, "| Exists in DB:", existingEntriesMap.has(dupKey));

            // Check against existing database entries
            if (existingEntriesMap.has(dupKey)) {
              const dupErrorMsg = `For month '${String(row.month).trim()}' of financial year '${String(row.fin_year).trim()}', the entry for AWC '${String(row.awc_name).trim()}' is already present.`;
              rowErrors['duplicate_server'] = dupErrorMsg;
              // Highlight only the 3 key fields, NOT the numeric fields
              rowErrors['fin_year_duplicate'] = dupErrorMsg;
              rowErrors['month_duplicate'] = dupErrorMsg;
              rowErrors['awc_name_duplicate'] = dupErrorMsg;
              duplicateCount++;
              duplicateDetails.push({
                row: index + 1,
                awc_name: row.awc_name,
                month: row.month,
                fin_year: row.fin_year
              });
            }

            // Check for duplicates within the same file
            if (seenEntriesInFile.has(dupKey)) {
              const fileDupMsg = `Duplicate within file: For month '${row.month}' of financial year '${row.fin_year}', AWC '${row.awc_name}' appears multiple times.`;
              rowErrors['duplicate_file'] = fileDupMsg;
              if (!rowErrors.duplicate_server) {
                rowErrors['fin_year_duplicate'] = fileDupMsg;
                rowErrors['month_duplicate'] = fileDupMsg;
                rowErrors['awc_name_duplicate'] = fileDupMsg;
              }
              duplicateCount++;
            } else {
              seenEntriesInFile.add(dupKey);
            }
          }

          return { data: row, errors: rowErrors };
        });

        setBulkPreviewData(previewData);

        // Set appropriate error messages
        const hasNonDuplicateErrors = previewData.some(item => {
          const keys = Object.keys(item.errors);
          // Filter out suggestion and duplicate-specific keys
          const realErrors = keys.filter(k =>
            !['awc_name_suggestion', 'duplicate_server', 'duplicate_file',
              'fin_year_duplicate', 'month_duplicate', 'awc_name_duplicate'].includes(k)
          );
          return realErrors.length > 0;
        });

        if (duplicateCount > 0 && hasNonDuplicateErrors) {
          setBulkUploadError(
            `Found ${duplicateCount} duplicate entry/entries and ${previewData.filter(i => hasNonDuplicateErrors(i)).length} row(s) with validation errors. ` +
            `Duplicates: ${duplicateDetails.map(d => `Row ${d.row} (${d.awc_name} - ${d.month} - ${d.fin_year})`).join(', ')}. ` +
            `Please fix all errors before uploading.`
          );
        } else if (duplicateCount > 0) {
          setBulkUploadError(
            `Found ${duplicateCount} duplicate entry/entries! ` +
            `For the specified month(s) of this financial year, the entry for the AWC name(s) is already present. ` +
            `Duplicates: ${duplicateDetails.map(d => `Row ${d.row} (${d.awc_name} - ${d.month} - ${d.fin_year})`).join(', ')}. ` +
            `Please remove duplicate rows before uploading.`
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

  const handleBulkUpload = async () => {
    // Check if any row has blocking errors (excluding suggestion-only and duplicate)
    const hasErrors = bulkPreviewData.some(item => {
      const keys = Object.keys(item.errors);
      return keys.length > 0 && !hasOnlySuggestionError(item.errors);
    });

    if (!bulkFile || hasErrors) {
      setBulkUploadError("Cannot upload. Please select a valid file and fix all errors including duplicate entries.");
      return;
    }

    setBulkUploading(true);
    setBulkUploadError("");

    try {
      const validRows = bulkPreviewData.filter(item =>
        Object.keys(item.errors).length === 0 || hasOnlySuggestionError(item.errors)
      );
      const uploadPromises = validRows.map(item => {
        const selectedAwc = awcList.find(awc => awc.awc_name === item.data.awc_name);
        const payload = {
          ...item.data,
          district: selectedAwc?.district_name || '',
          project: selectedAwc?.project || '',
          sector: selectedAwc?.sector || '',
        };
        return api.post("/ang-beneficiary-report/", payload);
      });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    setFormErrors({});

    const payload = {
      ...formData,
      pw_lm: Number(formData.pw_lm) || 0,
      children_3_6y: Number(formData.children_3_6y) || 0,
      children_6m_3y: Number(formData.children_6m_3y) || 0,
      adolescent_girls: Number(formData.adolescent_girls) || 0,
      sam_6m_3y: Number(formData.sam_6m_3y) || 0,
      sam_3_5y: Number(formData.sam_3_5y) || 0,
      suw_6m_3y: Number(formData.suw_6m_3y) || 0,
      suw_3_6y: Number(formData.suw_3_6y) || 0,
    };

    try {
      if (editingId) {
        payload.id = editingId;
        await api.put(API_URL, payload);
        setSuccess("Report updated successfully.");
      } else {
        await api.post(API_URL, payload);
        setSuccess("Report created successfully.");
      }
      setShowForm(false);
      setFormData(initialFormData);
      setEditingId(null);
      fetchReports();
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      setError(`Failed to ${editingId ? "update" : "create"} report.`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const uniqueFinYears = useMemo(() => {
    return [...new Set(reports.map((report) => report.fin_year))].sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const uniqueMonths = useMemo(() => {
    const monthOrder = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const months = [...new Set(reports.map((report) => report.month))];
    return months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      return (filters.fin_year ? report.fin_year === filters.fin_year : true) &&
        (filters.month ? report.month === filters.month : true);
    });
  }, [reports, filters]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Check if bulk upload should be disabled
  const isBulkUploadDisabled = useMemo(() => {
    return bulkUploading ||
      !bulkFile ||
      reportsLoadingForModal ||
      bulkPreviewData.some(item => {
        const keys = Object.keys(item.errors);
        return keys.length > 0 && !hasOnlySuggestionError(item.errors);
      });
  }, [bulkUploading, bulkFile, bulkPreviewData, reportsLoadingForModal]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination>{items}</Pagination>;
  };

  // Get error for a cell - only highlight the 3 key fields for duplicates, NOT numeric fields
  const getCellError = (item, key) => {
    // Direct error on this field (missing, format, invalid awc name)
    if (item.errors[key]) return item.errors[key];
    // Duplicate error only on the 3 key fields
    if (key === 'fin_year' && item.errors.fin_year_duplicate) return item.errors.fin_year_duplicate;
    if (key === 'month' && item.errors.month_duplicate) return item.errors.month_duplicate;
    if (key === 'awc_name' && item.errors.awc_name_duplicate) return item.errors.awc_name_duplicate;
    // Numeric fields: never show duplicate error
    return null;
  };

  // Get cell CSS class - only highlight key fields red for duplicates
  const getCellClass = (item, key) => {
    // Direct error on this field
    if (item.errors[key]) return 'table-danger';
    // Suggestion on awc_name (only if no duplicate error)
    if (key === 'awc_name' && item.errors.awc_name_suggestion && !item.errors.awc_name_duplicate) return 'table-warning';
    // Duplicate highlighting only on the 3 key fields
    if (key === 'fin_year' && item.errors.fin_year_duplicate) return 'table-danger';
    if (key === 'month' && item.errors.month_duplicate) return 'table-danger';
    if (key === 'awc_name' && item.errors.awc_name_duplicate) return 'table-danger';
    // Numeric fields: never highlight for duplicates
    return '';
  };

  return (
    <div className="dashboard-container">
      <ITCellLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="mb-4 fw-bold">
              Beneficiary Entry
            </h3>
            <div>
              <Button onClick={handleShowBulkUploadModal} variant="success" className="me-2"><FaUpload className="me-2" /> Bulk Upload</Button>
              <Button onClick={handleAddNew} variant="primary"><FaPlus className="me-2" /> Add Beneficiary Details</Button>
            </div>
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Collapse in={showForm}>
            <Card className="mb-4">
              <Card.Header as="h5">
                {editingId ? "Edit" : "Add"} Beneficiary Report
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>District</Form.Label><Form.Control type="text" name="district" value={formData.district} onChange={handleFormChange} required disabled /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Project</Form.Label><Form.Control type="text" name="project" value={formData.project} onChange={handleFormChange} required disabled /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Sector</Form.Label><Form.Control type="text" name="sector" value={formData.sector} onChange={handleFormChange} required disabled /></Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>AWC Name</Form.Label><Form.Control type="text" name="awc_name" value={formData.awc_name} onChange={handleFormChange} required disabled /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Sector Status</Form.Label><Form.Select name="sector_status" value={formData.sector_status} onChange={handleFormChange} required><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Form.Select></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>Month</Form.Label>
                      <Form.Select name="month" value={formData.month} onChange={handleFormChange} required>
                        <option value="">Select Month</option>
                        <option value="jan">January</option><option value="feb">February</option><option value="mar">March</option>
                        <option value="apr">April</option><option value="may">May</option><option value="jun">June</option>
                        <option value="jul">July</option><option value="aug">August</option><option value="sep">September</option>
                        <option value="oct">October</option><option value="nov">November</option><option value="dec">December</option>
                      </Form.Select>
                    </Form.Group></Col>
                  </Row>
                  <hr />
                  <h6 className="mb-3">Beneficiary Numbers</h6>
                  <Row>
                    <Col md><Form.Group className="mb-3"><Form.Label>PW & LM</Form.Label><Form.Control type="number" name="pw_lm" value={formData.pw_lm} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>Children (6m-3y)</Form.Label><Form.Control type="number" name="children_6m_3y" value={formData.children_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>Children (3-6y)</Form.Label><Form.Control type="number" name="children_3_6y" value={formData.children_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md><Form.Group className="mb-3"><Form.Label>Adolescent Girls</Form.Label><Form.Control type="number" name="adolescent_girls" value={formData.adolescent_girls} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SAM (6m-3y)</Form.Label><Form.Control type="number" name="sam_6m_3y" value={formData.sam_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SAM (3-5y)</Form.Label><Form.Control type="number" name="sam_3_5y" value={formData.sam_3_5y} onChange={handleFormChange} required /></Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>SUW (6m-3y)</Form.Label><Form.Control type="number" name="suw_6m_3y" value={formData.suw_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label>SUW (3-6y)</Form.Label><Form.Control type="number" name="suw_3_6y" value={formData.suw_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md={4}></Col>
                  </Row>
                  <Button variant="secondary" onClick={() => setShowForm(false)} className="me-2">Cancel</Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingId ? "Update Report" : "Save Report")}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Collapse>

          <h5 className="mt-4">Existing Beneficiary Reports</h5>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Financial Year</Form.Label>
                <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
                  <option value="">All Years</option>
                  {uniqueFinYears.map(year => <option key={year} value={year}>{year}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Month</Form.Label>
                <Form.Select name="month" value={filters.month} onChange={handleFilterChange}>
                  <option value="">All Months</option>
                  {uniqueMonths.map(month => <option key={month} value={month}>{month}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>AWC Name</th>
                    <th>District</th>
                    <th>Project</th>
                    <th>Sector</th>
                    <th>Financial Year</th>
                    <th>Month</th>
                    <th>PW & LM</th>
                    <th>Children (6m-3y)</th>
                    <th>Children (3-6y)</th>
                    <th>Adolescent Girls</th>
                    <th>SAM (6m-3y)</th>
                    <th>SAM (3-5y)</th>
                    <th>SUW (6m-3y)</th>
                    <th>SUW (3-6y)</th>
                    <th>Sector Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((report, index) => (
                      <tr key={report.id}>
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td>{report.awc_name}</td>
                        <td>{report.district}</td>
                        <td>{report.project}</td>
                        <td>{report.sector}</td>
                        <td>{report.fin_year}</td>
                        <td>{report.month}</td>
                        <td>{report.pw_lm}</td>
                        <td>{report.children_6m_3y}</td>
                        <td>{report.children_3_6y}</td>
                        <td>{report.adolescent_girls}</td>
                        <td>{report.sam_6m_3y}</td>
                        <td>{report.sam_3_5y}</td>
                        <td>{report.suw_6m_3y}</td>
                        <td>{report.suw_3_6y}</td>
                        <td><span className={`badge bg-${report.sector_status === 'approved' ? 'success' : 'warning'}`}>{report.sector_status}</span></td>
                        <td>
                          <>
                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(report)}><FaEdit /></Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)}><FaTrash /></Button>
                          </>
                          {report.sector_remark && (
                            <Button variant="outline-info" size="sm" onClick={() => handleShowRemarkModal(report.sector_remark)}><FaEye /></Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="17" className="text-center">No reports found.</td></tr>
                  )}
                </tbody>
              </Table>
            )}
            {renderPagination()}
          </div>

          <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Sector Remark</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>{viewingRemark}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseRemarkModal}>Close</Button>
            </Modal.Footer>
          </Modal>

          <Modal show={showBulkUploadModal} onHide={handleCloseBulkUploadModal} centered size="xl">
            <Modal.Header closeButton>
              <Modal.Title>Bulk Upload Beneficiary Reports</Modal.Title>
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

              <p>Upload an Excel file with the required columns. The column names must match the sample file.</p>
              
              <div className="d-flex align-items-center mb-3">
                <Button variant="link" onClick={downloadSampleFile} className="p-0 me-3">
                  <FaFileExcel className="me-1" /> Download Sample File
                </Button>
                <Badge bg="info" pill>
                  {reportsRef.current.length} existing records in system
                </Badge>
              </div>

              <div className="mb-3 p-2" style={{ backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.85rem' }}>
                <strong>Duplicate Check Rule:</strong> An entry is considered duplicate if the combination of 
                <Badge bg="primary" className="mx-1">AWC Name</Badge> + 
                <Badge bg="primary" className="mx-1">Financial Year</Badge> + 
                <Badge bg="primary" className="mx-1">Month</Badge> 
                already exists. The beneficiary count fields are NOT checked for duplicates.
              </div>

              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Select Excel File</Form.Label>
                <Form.Control
                  key={bulkFileInputKey}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  disabled={awcListLoading || reportsLoadingForModal}
                />
                {(awcListLoading || reportsLoadingForModal) && (
                  <Form.Text className="text-muted">
                    Loading required data... file selection will be enabled shortly.
                  </Form.Text>
                )}
              </Form.Group>

              {bulkPreviewData.length > 0 && (
                <div className="mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <h6>File Preview</h6>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        {Object.keys(initialFormData).filter(k => !['district', 'project', 'sector'].includes(k)).map(key => (
                          <th 
                            key={key} 
                            style={{ 
                              backgroundColor: DUPLICATE_CHECK_FIELDS.includes(key) ? '#cce5ff' : 'transparent',
                              fontWeight: DUPLICATE_CHECK_FIELDS.includes(key) ? 'bold' : 'normal'
                            }}
                            title={DUPLICATE_CHECK_FIELDS.includes(key) ? "Checked for duplicates" : "Format validated only, not checked for duplicates"}
                          >
                            {key.replace(/_/g, ' ')}
                            {DUPLICATE_CHECK_FIELDS.includes(key) && <span style={{ color: '#004085', fontSize: '0.7rem' }}> *</span>}
                          </th>
                        ))}
                        <th>Status / Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreviewData.map((item, index) => {
                        const hasErrors = Object.keys(item.errors).length > 0 && !hasOnlySuggestionError(item.errors);
                        const hasDupError = hasDuplicateError(item.errors);
                        const hasOnlySugg = hasOnlySuggestionError(item.errors);

                        return (
                          <tr key={index} className={hasErrors ? 'table-danger' : hasOnlySugg ? 'table-warning' : ''}>
                            <td>{index + 1}</td>
                            {Object.keys(initialFormData).filter(k => !['district', 'project', 'sector'].includes(k)).map(key => {
                              const cellError = getCellError(item, key);
                              const cellClass = getCellClass(item, key);
                              const isKeyField = DUPLICATE_CHECK_FIELDS.includes(key);
                              return (
                                <td
                                  key={key}
                                  className={cellClass}
                                  title={cellError || (isKeyField ? "Checked for duplicates" : "Count field - not checked for duplicates")}
                                  style={{
                                    cursor: cellError ? 'help' : 'default',
                                    fontSize: '0.85rem',
                                    backgroundColor: isKeyField && !cellClass ? '#f0f7ff' : undefined
                                  }}
                                >
                                  {item.data[key]}
                                  {cellError && (
                                    <div className="text-danger mt-1" style={{ fontSize: '0.65rem', fontWeight: '600' }}>
                                      ⚠ DUPLICATE
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{ fontSize: '0.8rem', minWidth: '220px' }}>
                              {hasErrors ? (
                                <div>
                                  <Badge bg="danger" className="mb-1">DUPLICATE</Badge>
                                  <div className="text-danger" style={{ fontSize: '0.7rem' }}>
                                    {item.errors.duplicate_server || item.errors.duplicate_file}
                                  </div>
                                </div>
                              ) : hasOnlySugg ? (
                                <div>
                                  <Badge bg="warning" text="dark" className="mb-1">SUGGESTION</Badge>
                                  <div className="text-warning" style={{ fontSize: '0.7rem' }}>
                                    {item.errors.awc_name_suggestion}
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

                  {/* Summary of duplicate errors */}
                  {bulkPreviewData.some(item => hasDuplicateError(item.errors)) && (
                    <Alert variant="danger" className="mt-3 mb-0">
                      <FaExclamationTriangle className="me-2" />
                      <strong>Duplicate Entries Found - Upload Disabled!</strong>
                      <div className="mt-2 mb-1" style={{ fontSize: '0.8rem' }}>
                        The following rows have the same <strong>AWC Name + Financial Year + Month</strong> combination that already exists:
                      </div>
                      <ul className="mb-0" style={{ fontSize: '0.8rem' }}>
                        {bulkPreviewData
                          .filter(item => hasDuplicateError(item.errors))
                          .map((item, idx) => (
                            <li key={idx}>
                              <strong>Row {bulkPreviewData.indexOf(item) + 1}:</strong> {item.errors.duplicate_server || item.errors.duplicate_file}
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
              <Button
                variant="primary"
                onClick={handleBulkUpload}
                disabled={isBulkUploadDisabled}
                title={isBulkUploadDisabled && bulkFile ? "Fix all duplicate errors (AWC Name + Financial Year + Month) before uploading" : ""}
              >
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
}

export default ITBeneEntry;