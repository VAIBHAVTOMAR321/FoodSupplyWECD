
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Table,
  Pagination,
  Collapse,
  Modal,
  ListGroup,
} from "react-bootstrap";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import "../../assets/css/dpo.css";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import dpoHindi from "./DPOTranslations.json";
import { FaPlus, FaEdit, FaTrash, FaEye, FaUsers, FaChild, FaFemale, FaExclamationTriangle, FaUpload, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3
    ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}`
    : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const initialFormData = {
  fin_year: getCurrentFinancialYear(),
  month: "",
  awc_name: "",
  district: "",
  project: "",
  sector: "",
  pw_lm: "",
  children_3_6y: "",
  children_6m_3y: "",
  adolescent_girls: "",
  sam_6m_3y: "",
  sam_3_5y: "",
  suw_6m_3y: "",
  suw_3_6y: "",
};

const StudentForm = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  const { user, api } = useAuth();
  const [awcList, setAwcList] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    fin_year: "",
    month: "",
    district: "",
    project: "",
    sector: "",
    awc_name: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueAwcs, setUniqueAwcs] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkPreviewData, setBulkPreviewData] = useState([]);
  const [awcListLoading, setAwcListLoading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAwcList = async () => {
      setAwcListLoading(true);
      try {
        const response = await api.get("/dpo-awc-dropdown/");
        if (isMounted) {
          setAwcList(response.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch AWC list:", err);
      } finally {
        if (isMounted) setAwcListLoading(false);
      }
    };
    fetchAwcList();
  }, [api]);


  useEffect(() => {
    if (awcList.length > 0) {
      const districts = [...new Set(awcList.map(item => item.district_name))];
      setUniqueDistricts(districts);
    }
  }, [awcList]);

  const fetchReports = useCallback(async (page, currentFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page });
      // Append filters to params if they have a value, to keep the URL clean
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await api.get(`/ang-beneficiary-report/?${params.toString()}`);
      setReports(response.data.results || []);
      setTotalPages(response.data.total_pages || 1); // Make sure your API returns this
    } catch (err) {
      setError(t("Failed to fetch reports.", "रिपोर्ट प्राप्त करने में विफल।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchReports(currentPage, filters);
  }, [fetchReports, currentPage]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;    
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ fin_year: "", month: "", district: "", project: "", sector: "", awc_name: "" });
    setUniqueProjects([]);
    setUniqueSectors([]);
    setUniqueAwcs([]);
    setCurrentPage(1);
    fetchReports(1, { fin_year: "", quarter: "", district: "", project: "", sector: "", awc_name: "" });
  };
  const handleDistrictChange = (e) => {
    const district = e.target.value;
    setFilters(prev => ({ ...prev, district, project: "", sector: "", awc_name: "" }));
    if (district) {
      const projects = [...new Set(awcList.filter(item => item.district_name === district).map(item => item.project))];
      setUniqueProjects(projects);
    } else {
      setUniqueProjects([]);
    }
    setUniqueSectors([]);
    setUniqueAwcs([]);
    setCurrentPage(1);
    fetchReports(1, { ...filters, district, project: "", sector: "", awc_name: "" });
  };

  const handleProjectChange = (e) => {
    const project = e.target.value;
    setFilters(prev => ({ ...prev, project, sector: "", awc_name: "" }));
    if (project) {
      const sectors = [...new Set(awcList.filter(item => item.district_name === filters.district && item.project === project).map(item => item.sector))];
      setUniqueSectors(sectors);
    } else {
      setUniqueSectors([]);
    }
    setUniqueAwcs([]);
    setCurrentPage(1);
    fetchReports(1, { ...filters, project, sector: "", awc_name: "" });
  };

  const handleSectorChange = (e) => {
    const sector = e.target.value;
    setFilters(prev => ({ ...prev, sector, awc_name: "" }));
    if (sector) {
      const awcs = [...new Set(awcList.filter(item => item.district_name === filters.district && item.project === filters.project && item.sector === sector).map(item => item.awc_name))];
      setUniqueAwcs(awcs);
    } else {
      setUniqueAwcs([]);
    }
    setCurrentPage(1);
    fetchReports(1, { ...filters, sector, awc_name: "" });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAwcChange = (e) => {
    const { value } = e.target;
    const selectedAwc = awcList.find(awc => awc.awc_name === value);
    if (selectedAwc) {
      setFormData(prev => ({
        ...prev,
        awc_name: selectedAwc.awc_name,
        district: selectedAwc.district_name,
        project: selectedAwc.project,
        sector: selectedAwc.sector,
      }));
    } else {
      setFormData(prev => ({ ...prev, awc_name: value, district: "", project: "", sector: "" }));
    }
  };

  const handleEdit = (report) => {
    setEditingId(report.id);
    setFormData({ ...report });
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleShowViewModal = (report) => {
    setViewingReport(report);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingReport(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("Are you sure you want to delete this report?", "क्या आप वाकई इस रिपोर्ट को हटाना चाहते हैं?"))) {
      try {
        await api.delete("/ang-beneficiary-report/", { data: { id } });
        setSuccess(t("Report deleted successfully.", "रिपोर्ट सफलतापूर्वक हटा दी गई।"));
        fetchReports(currentPage, filters);
      } catch (err) {
        setError(t("Failed to delete report.", "रिपोर्ट हटाने में विफल।"));
        console.error(err);
      }
    }
  };

  const handleShowBulkUploadModal = () => {
    setBulkFile(null);
    setBulkPreviewData([]);
    setBulkUploadError("");
    setShowBulkUploadModal(true);
  };

  const handleCloseBulkUploadModal = () => setShowBulkUploadModal(false);

  const downloadSampleFile = () => {
    const headers = [
      "fin_year", "month", "awc_name", "pw_lm", "children_3_6y",
      "children_6m_3y", "adolescent_girls", "sam_6m_3y", "sam_3_5y",
      "suw_6m_3y", "suw_3_6y"
    ];
    const sampleData = [
      {
        fin_year: "2025-26",
        month: "jan",
        awc_name: "THAPLA",
        pw_lm: 24,
        children_6m_3y: 21,
        children_3_6y: 38,
        adolescent_girls: 17,
        sam_6m_3y: 2,
        sam_3_5y: 1,
        suw_6m_3y: 3,
        suw_3_6y: 4,
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BeneficiaryReports");
    XLSX.writeFile(workbook, "SampleBeneficiaryReports.xlsx");
  };

  // Levenshtein distance function to find closest match for misspelled names
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


  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (awcList.length === 0) {
      if (awcListLoading) {
        setBulkUploadError(t("AWC list is still loading. Please wait a moment and select the file again.", "आंगनवाड़ी केंद्र सूची अभी लोड हो रही है। कृपया प्रतीक्षा करें और फ़ाइल फिर से चुनें।"));
      } else {
        setBulkUploadError(t("AWC list is not available. Please refresh the page and try again.", "आंगनवाड़ी केंद्र सूची उपलब्ध नहीं है। पृष्ठ रीफ़्रेश करके पुनः प्रयास करें।"));
      }
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
          setBulkUploadError(t("The Excel file is empty.", "Excel फ़ाइल खाली है।"));
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
          setBulkUploadError(`${t("Missing required columns:", "आवश्यक कॉलम अनुपस्थित हैं:")} ${missingHeaders.join(", ")}`);
          return;
        }

        // Create a map for quick, case-insensitive AWC name lookup
        const awcNameMap = new Map();
        awcList.forEach(awc => awcNameMap.set(String(awc.awc_name).toUpperCase(), awc.awc_name));

        // For duplicate checking
        const seenEntries = new Set();

        const previewData = json.map((row, rowIndex) => {
          const rowErrors = {};
          requiredHeaders.forEach(header => {
            const value = row[header];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[header] = t(`'${header}' is missing.`, `'${header}' अनुपस्थित है।`);
            } else {
              if (header !== 'fin_year' && header !== 'month' && header !== 'awc_name' && isNaN(Number(value))) {
                rowErrors[header] = t(`'${header}' must be a valid number.`, `'${header}' मान्य संख्या होनी चाहिए।`);
              }
            }
          });

          // Validate awc_name against the fetched list
          const excelAwcName = row.awc_name ? String(row.awc_name).trim().toUpperCase() : "";

          if (!excelAwcName) {
            rowErrors['awc_name'] = t("'awc_name' is missing.", "'awc_name' अनुपस्थित है।");
          } else if (awcNameMap.has(excelAwcName)) {
            row.awc_name = awcNameMap.get(excelAwcName); // Correct casing
          }  else {
            let bestMatch = null;
            let minDistance = Infinity;

            // Levenshtein distance check on both full and base names
            awcList.forEach(awc => { const distance = levenshteinDistance(excelAwcName, awc.awc_name.toUpperCase());

              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = awc.awc_name;
              }
            });

            // Automatically correct if the spelling is very close
            if (bestMatch && minDistance <= 2) { // Stricter threshold for auto-correction
              rowErrors['awc_name_suggestion'] = `${t("Original:", "मूल:")} '${row.awc_name}'. ${t("Corrected to", "में सुधारकर")} '${bestMatch}'.`;
              row.awc_name = bestMatch;
            } else {
              const errorMessage = bestMatch
                ? t(`'${row.awc_name}' is not a valid AWC name. Did you mean '${bestMatch}'?`, `'${row.awc_name}' मान्य आंगनवाड़ी केंद्र का नाम नहीं है। क्या आपका मतलब '${bestMatch}' है?`)
                : t(`'${row.awc_name}' is not a valid AWC name.`, `'${row.awc_name}' मान्य आंगनवाड़ी केंद्र का नाम नहीं है।`);
              rowErrors['awc_name'] = errorMessage;
            }
          }

          // Check for duplicates within the file only after all other validations and corrections are done.
          if (Object.keys(rowErrors).length === 0) {
            const entryKey = `${row.fin_year}|${row.month}|${row.awc_name}`;
            if (seenEntries.has(entryKey)) {
              rowErrors['duplicate'] = t(
                `Duplicate entry for AWC '${row.awc_name}' in month '${row.month}'.`,
                `आंगनवाड़ी केंद्र '${row.awc_name}' के लिए '${row.month}' महीने में डुप्लिकेट प्रविष्टि।`,
              );
            } else {
              seenEntries.add(entryKey);
            }
          }
          return { data: row, errors: rowErrors };
        });

        setBulkPreviewData(previewData);
        if (previewData.some(item => Object.keys(item.errors).length > 0)) {
          setBulkUploadError(t("Your file contains errors. Please fix them before uploading.", "आपकी फ़ाइल में त्रुटियाँ हैं। अपलोड करने से पहले उन्हें ठीक करें।"));
        }
      } catch (err) {
        setBulkUploadError(t("Failed to parse the Excel file. Please ensure it's a valid .xlsx or .xls file.", "Excel फ़ाइल पढ़ने में विफल। सुनिश्चित करें कि यह मान्य .xlsx या .xls फ़ाइल है।"));
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const previewHeaders = {
    fin_year: "Fin. Year",
    month: "Month",
    awc_name: "AWC Name",
    pw_lm: "PW & LM",
    children_3_6y: "Child (3-6y)",
    children_6m_3y: "Child (6m-3y)",
    adolescent_girls: "Adol. Girls",
    sam_6m_3y: "SAM (6m-3y)",
    sam_3_5y: "SAM (3-5y)",
    suw_6m_3y: "SUW (6m-3y)",
    suw_3_6y: "SUW (3-6y)",
  };
  const handleBulkUpload = async () => {
    if (!bulkFile || bulkPreviewData.some(item => Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion)) {
      setBulkUploadError(t("Cannot upload. Please select a valid file and fix any errors.", "अपलोड नहीं किया जा सकता। कृपया मान्य फ़ाइल चुनें और त्रुटियाँ ठीक करें।"));
      return;
    }
    setBulkUploading(true);
    setBulkUploadError("");

    try {
      const validRows = bulkPreviewData.filter(item => Object.keys(item.errors).length === 0 || (Object.keys(item.errors).length === 1 && item.errors.awc_name_suggestion));
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
      setSuccess(t("Bulk upload successful!", "बल्क अपलोड सफल!"));
      handleCloseBulkUploadModal();
      fetchReports(1, { fin_year: "", month: "" });
    } catch (err) {
      setBulkUploadError(t("An error occurred during bulk upload. Some records may have failed.", "बल्क अपलोड के दौरान त्रुटि हुई। कुछ रिकॉर्ड अपलोड नहीं हो सके।"));
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
        await api.put("/ang-beneficiary-report/", payload);
        setSuccess(t("Report updated successfully.", "रिपोर्ट सफलतापूर्वक अपडेट हुई।"));
      } else {
        await api.post("/ang-beneficiary-report/", payload);
        setSuccess(t("Report created successfully.", "रिपोर्ट सफलतापूर्वक बनाई गई।"));
      }
      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      fetchReports(1, { fin_year: "", month: "" }); // Reset to first page with no filters
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      setError(editingId
        ? t("Failed to update report.", "रिपोर्ट अपडेट करने में विफल।")
        : t("Failed to create report.", "रिपोर्ट बनाने में विफल।"));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = () => (
    <Card className="mb-4">
    
      <Card.Header as="h5">{editingId ? "Edit" : "Add"} Beneficiary Report</Card.Header>
     
        <Form onSubmit={handleSubmit}>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label><Form.Control type="text" name="fin_year" value={formData.fin_year} onChange={handleFormChange} required /></Form.Group></Col>            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("Month", "महीना")}</Form.Label>
              <Form.Select name="month" value={formData.month} onChange={handleFormChange} required>
                  <option value="">{t("Select Month", "महीना चुनें")}</option>
                  <option value="jan">{t("January", "जनवरी")}</option><option value="feb">{t("February", "फ़रवरी")}</option><option value="mar">{t("March", "मार्च")}</option>
                  <option value="apr">{t("April", "अप्रैल")}</option><option value="may">{t("May", "मई")}</option><option value="jun">{t("June", "जून")}</option>
                  <option value="jul">{t("July", "जुलाई")}</option><option value="aug">{t("August", "अगस्त")}</option><option value="sep">{t("September", "सितंबर")}</option>
                  <option value="oct">{t("October", "अक्टूबर")}</option><option value="nov">{t("November", "नवंबर")}</option><option value="dec">{t("December", "दिसंबर")}</option>
              </Form.Select>
            </Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</Form.Label><Form.Select name="awc_name" value={formData.awc_name} onChange={handleAwcChange} required disabled={!!editingId}><option value="">{t("Select AWC", "आंगनवाड़ी केंद्र चुनें")}</option>{awcList.map(awc => <option key={awc.awc_code} value={awc.awc_name}>{awc.awc_name}</option>)}</Form.Select>{formErrors.awc_name && <Form.Text className="text-danger">{formErrors.awc_name}</Form.Text>}</Form.Group></Col>
          </Row>
          <Row>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>{t("District", "जिला")}</Form.Label><Form.Control type="text" name="district" value={formData.district || ''} disabled /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>{t("Project", "परियोजना")}</Form.Label><Form.Control type="text" name="project" value={formData.project || ''} disabled /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>{t("Sector", "सेक्टर")}</Form.Label><Form.Control type="text" name="sector" value={formData.sector || ''} disabled /></Form.Group></Col>
          </Row>
          <h6 className="mt-3">{t("Beneficiary Counts", "लाभार्थी संख्या")}</h6>
          <Row>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("PW & LM", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}</Form.Label><Form.Control type="number" name="pw_lm" value={formData.pw_lm} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("Children (6m-3y)", "बच्चे (6 माह-3 वर्ष)")}</Form.Label><Form.Control type="number" name="children_6m_3y" value={formData.children_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("Children (3-6y)", "बच्चे (3-6 वर्ष)")}</Form.Label><Form.Control type="number" name="children_3_6y" value={formData.children_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("Adolescent Girls", "किशोरियाँ")}</Form.Label><Form.Control type="number" name="adolescent_girls" value={formData.adolescent_girls} onChange={handleFormChange} required /></Form.Group></Col>
          </Row>
          <Row>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("SAM (6m-3y)", "SAM (6 माह-3 वर्ष)")}</Form.Label><Form.Control type="number" name="sam_6m_3y" value={formData.sam_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("SAM (3-5y)", "SAM (3-5 वर्ष)")}</Form.Label><Form.Control type="number" name="sam_3_5y" value={formData.sam_3_5y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("SUW (6m-3y)", "SUW (6 माह-3 वर्ष)")}</Form.Label><Form.Control type="number" name="suw_6m_3y" value={formData.suw_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>{t("SUW (3-6y)", "SUW (3-6 वर्ष)")}</Form.Label><Form.Control type="number" name="suw_3_6y" value={formData.suw_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
          </Row>
          <Button variant="secondary" onClick={() => setShowForm(false)} className="me-2">{t("Cancel", "रद्द करें")}</Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingId ? t("Update Report", "रिपोर्ट अपडेट करें") : t("Save Report", "रिपोर्ट सहेजें"))}
          </Button>
        </Form>
      
    </Card>
  );

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DPOHeader user={user} toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold">{t("Beneficiary Reports", "लाभार्थी रिपोर्ट")}</h3>
            <div>
              <Button onClick={handleShowBulkUploadModal} variant="success" className="me-2"><FaUpload className="me-2" /> {t("Bulk Upload", "बल्क अपलोड")}</Button>
              <Button onClick={handleAddNew} variant="primary"><FaPlus className="me-2" /> {t("Add New Report", "नई रिपोर्ट जोड़ें")}</Button>
            </div>
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          
          <Collapse in={showForm}>
            <div>{renderForm()}</div>
          </Collapse>

          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col md={3}><Card.Title as="h5" className="mb-0">{t("Existing Reports", "मौजूदा रिपोर्ट")}</Card.Title></Col>
                <Col md={9}>
                  <Button variant="secondary" onClick={handleResetFilters}>{t("Reset Filters", "फ़िल्टर रीसेट करें")}</Button>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={2}><Form.Control type="text" name="fin_year" placeholder={t("Fin. Year (e.g., 2025-26)", "वित्तीय वर्ष (उदा., 2025-26)")} value={filters.fin_year} onChange={handleFilterChange} /></Col>
                <Col md={2}><Form.Select name="month" value={filters.month} onChange={handleFilterChange}>
                    <option value="">{t("All Months", "सभी महीने")}</option>
                    <option value="jan">{t("Jan", "जनवरी")}</option><option value="feb">{t("Feb", "फ़रवरी")}</option><option value="mar">{t("Mar", "मार्च")}</option>
                    <option value="apr">{t("Apr", "अप्रैल")}</option><option value="may">{t("May", "मई")}</option><option value="jun">{t("Jun", "जून")}</option>
                    <option value="jul">{t("Jul", "जुलाई")}</option><option value="aug">{t("Aug", "अगस्त")}</option><option value="sep">{t("Sep", "सितंबर")}</option>
                    <option value="oct">{t("Oct", "अक्टूबर")}</option><option value="nov">{t("Nov", "नवंबर")}</option><option value="dec">{t("Dec", "दिसंबर")}</option>
                  </Form.Select>
                </Col>
                <Col md={2}><Form.Select name="district" value={filters.district} onChange={handleDistrictChange}><option value="">{t("All Districts", "सभी जिले")}</option>{uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="project" value={filters.project} onChange={handleProjectChange} disabled={!filters.district}><option value="">{t("All Projects", "सभी परियोजनाएँ")}</option>{uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="sector" value={filters.sector} onChange={handleSectorChange} disabled={!filters.project}><option value="">{t("All Sectors", "सभी सेक्टर")}</option>{uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="awc_name" value={filters.awc_name} onChange={handleFilterChange} disabled={!filters.sector}><option value="">{t("All AWCs", "सभी आंगनवाड़ी केंद्र")}</option>{uniqueAwcs.map(a => <option key={a} value={a}>{a}</option>)}</Form.Select></Col>
              </Row>
            </Card.Header>
          
              {loading ? <div className="text-center"><Spinner animation="border" /></div> : error && !loading ? <Alert variant="danger">{error}</Alert> : (
                <>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{t("District", "जिला")}</th>
                        <th>{t("Project", "परियोजना")}</th>
                        <th>{t("Sector", "सेक्टर")}</th>
                        <th>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</th>
                        <th>{t("Fin. Year", "वित्तीय वर्ष")}</th>
                        <th>{t("Month", "महीना")}</th>
                        <th title={t("Pregnant Women & Lactating Mothers", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}>{t("PW & LM", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}</th>
                        <th title={t("Children 6 months to 3 years", "बच्चे 6 माह से 3 वर्ष")}>{t("Child (6m-3y)", "बच्चे (6 माह-3 वर्ष)")}</th>
                        <th title={t("Children 3 to 6 years", "बच्चे 3 से 6 वर्ष")}>{t("Child (3-6y)", "बच्चे (3-6 वर्ष)")}</th>
                        <th title={t("Adolescent Girls", "किशोरियाँ")}>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th title={t("SAM 6 months to 3 years", "SAM 6 माह से 3 वर्ष")}>{t("SAM (6m-3y)", "SAM (6 माह-3 वर्ष)")}</th>
                        <th title={t("SAM 3 to 5 years", "SAM 3 से 5 वर्ष")}>{t("SAM (3-5y)", "SAM (3-5 वर्ष)")}</th>
                        <th title={t("SUW 6 months to 3 years", "SUW 6 माह से 3 वर्ष")}>{t("SUW (6m-3y)", "SUW (6 माह-3 वर्ष)")}</th>
                        <th title={t("SUW 3 to 6 years", "SUW 3 से 6 वर्ष")}>{t("SUW (3-6y)", "SUW (3-6 वर्ष)")}</th>
                        <th>{t("Actions", "कार्रवाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length > 0 ? (
                        <>
                          {reports.map((report, index) => (
                            <tr key={report.id}>
                              <td>{(currentPage - 1) * 20 + index + 1}</td>
                              <td>{report.district}</td>
                              <td>{report.project}</td>
                              <td>{report.sector}</td>
                              <td>{report.awc_name}</td>
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
                              <td>
                                <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleShowViewModal(report)} aria-label={t("View", "देखें")}><FaEye /></Button>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(report)} aria-label={t("Edit", "संपादित करें")}><FaEdit /></Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)} aria-label={t("Delete", "हटाएँ")}><FaTrash /></Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="table-active fw-bold">
                            <td colSpan="7">{t("Total", "कुल")}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.pw_lm) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.children_6m_3y) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.children_3_6y) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.adolescent_girls) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.sam_6m_3y) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.sam_3_5y) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.suw_6m_3y) || 0), 0)}</td>
                            <td>{reports.reduce((sum, r) => sum + (Number(r.suw_3_6y) || 0), 0)}</td>
                            <td></td>
                          </tr>
                        </>
                      ) : (
                        <tr><td colSpan="16" className="text-center">{t("No reports found.", "कोई रिपोर्ट नहीं मिली।")}</td></tr>
                      )}
                    </tbody>
                  </Table>
                  {totalPages > 1 && <Pagination className="justify-content-center"><Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} /><Pagination.Item>{currentPage} / {totalPages}</Pagination.Item><Pagination.Next onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} /></Pagination>}
                </>
              )}
           
          </Card>

          {viewingReport && (
            <Modal show={showViewModal} onHide={handleCloseViewModal} centered size="lg">
              <Modal.Header closeButton>
                <Modal.Title>{t("Beneficiary Report Details", "लाभार्थी रिपोर्ट विवरण")}</Modal.Title>
              </Modal.Header>
            <Modal.Body>                <Row><Col md={6}><p><strong>{t("AWC Name:", "आंगनवाड़ी केंद्र का नाम:")}</strong> {viewingReport.awc_name}</p><p><strong>{t("Financial Year:", "वित्तीय वर्ष:")}</strong> {viewingReport.fin_year}</p><p><strong>{t("Month:", "महीना:")}</strong> {viewingReport.month}</p></Col><Col md={6}><p><strong>{t("District:", "जिला:")}</strong> {viewingReport.district}</p><p><strong>{t("Project:", "परियोजना:")}</strong> {viewingReport.project}</p><p><strong>{t("Sector:", "सेक्टर:")}</strong> {viewingReport.sector}</p></Col></Row>
                <hr />
                <h5 className="mb-3">{t("Beneficiary Counts", "लाभार्थी संख्या")}</h5>
                <ListGroup variant="flush"><ListGroup.Item><FaUsers className="me-2 text-primary" /> {t("Pregnant Women & Lactating Mothers:", "गर्भवती एवं स्तनपान कराने वाली माताएँ:")} <strong>{viewingReport.pw_lm}</strong></ListGroup.Item><ListGroup.Item><FaChild className="me-2 text-info" /> {t("Children (6 months - 3 years):", "बच्चे (6 माह - 3 वर्ष):")} <strong>{viewingReport.children_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaChild className="me-2 text-success" /> {t("Children (3 years - 6 years):", "बच्चे (3 वर्ष - 6 वर्ष):")} <strong>{viewingReport.children_3_6y}</strong></ListGroup.Item><ListGroup.Item><FaFemale className="me-2 text-secondary" /> {t("Adolescent Girls:", "किशोरियाँ:")} <strong>{viewingReport.adolescent_girls}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-danger" /> {t("SAM (6 months - 3 years):", "SAM (6 माह - 3 वर्ष):")} <strong>{viewingReport.sam_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-danger" /> {t("SAM (3 years - 5 years):", "SAM (3 वर्ष - 5 वर्ष):")} <strong>{viewingReport.sam_3_5y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-warning" /> {t("SUW (6 months - 3 years):", "SUW (6 माह - 3 वर्ष):")} <strong>{viewingReport.suw_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-warning" /> {t("SUW (3 years - 6 years):", "SUW (3 वर्ष - 6 वर्ष):")} <strong>{viewingReport.suw_3_6y}</strong></ListGroup.Item></ListGroup>
              </Modal.Body>
              <Modal.Footer><Button variant="secondary" onClick={handleCloseViewModal}>{t("Close", "बंद करें")}</Button></Modal.Footer>
            </Modal>
          )}

          <Modal show={showBulkUploadModal} onHide={handleCloseBulkUploadModal} centered size="xl">
            <Modal.Header closeButton>
              <Modal.Title>{t("Bulk Upload Beneficiary Reports", "लाभार्थी रिपोर्ट का बल्क अपलोड")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {bulkUploadError && <Alert variant="danger">{bulkUploadError}</Alert>}
              <p>{t("Upload an Excel file with the required columns. The 'awc_name' must match an existing AWC in the system.", "आवश्यक कॉलम वाली Excel फ़ाइल अपलोड करें। 'awc_name' सिस्टम में मौजूद आंगनवाड़ी केंद्र से मेल खाना चाहिए।")}</p>
              <Button variant="link" onClick={downloadSampleFile} className="p-0 mb-3">
                <FaFileExcel className="me-1" /> {t("Download Sample File", "नमूना फ़ाइल डाउनलोड करें")}
              </Button>
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>{t("Select Excel File", "Excel फ़ाइल चुनें")}</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                />
              </Form.Group>

              {bulkPreviewData.length > 0 && (
                <div className="mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <h6>{t("File Preview", "फ़ाइल पूर्वावलोकन")}</h6>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        {Object.keys(previewHeaders).map(key => (
                          <th key={key}>{translateLabel(previewHeaders[key])}</th>
                        ))}
                        <th>{t("Status", "स्थिति")}</th>
                      </tr>
                    </thead>
                    {bulkPreviewData.some(item => item.errors.duplicate) && (
                      <Alert variant="warning" className="mt-2">{t("Duplicate rows were found in your file. Only the first instance of each will be uploaded.", "फ़ाइल में डुप्लिकेट पंक्तियाँ मिलीं। प्रत्येक की केवल पहली पंक्ति अपलोड की जाएगी।")}</Alert>
                    )}
                    <tbody>
                      {bulkPreviewData.map((item, index) => (
                        <tr key={index} className={item.errors.length > 0 ? 'table-danger' : ''}>
                          <td className={Object.keys(item.errors).length > 0 ? 'table-danger' : ''}>{index + 1}</td>
                          {Object.keys(previewHeaders).map(key => (
                            <td 
                              key={key} 
                              className={item.errors[key] ? 'table-danger' : (key === 'awc_name' && item.errors.awc_name_suggestion) ? 'table-warning' : ''} 
                              title={item.errors[key] || item.errors.awc_name_suggestion}
                            >
                              {/* Display original value in tooltip for suggestions */}
                              {item.data[key]} 
                            </td>
                          ))}
                          <td>
                            {Object.keys(item.errors).length > 0 ? (
                              <span
                                className="text-danger"
                                title={Object.values(item.errors).join(' \n')}
                              >
                                {t("Error", "त्रुटि")}
                              </span>
                            ) : (
                              <span className="text-success">{t("OK", "ठीक है")}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseBulkUploadModal} disabled={bulkUploading}>{t("Cancel", "रद्द करें")}</Button>
              <Button variant="primary" onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile || bulkPreviewData.some(item => Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion)}>{bulkUploading ? <><Spinner as="span" animation="border" size="sm" /> {t("Uploading...", "अपलोड हो रहा है...")}</> : t("Upload", "अपलोड करें")}</Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default StudentForm;