
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
  quarter: "",
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
    quarter: "",
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
      try {
        const response = await api.get("/dpo-awc-dropdown/");
        if (isMounted) setAwcList(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch AWC list:", err);
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
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      setError("Failed to fetch reports.");
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
    setFilters({ fin_year: "", quarter: "", district: "", project: "", sector: "", awc_name: "" });
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
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await api.delete("/ang-beneficiary-report/", { data: { id } });
        setSuccess("Report deleted successfully.");
        fetchReports(currentPage, filters);
      } catch (err) {
        setError("Failed to delete report.");
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
      "fin_year", "quarter", "awc_name", "pw_lm", "children_3_6y",
      "children_6m_3y", "adolescent_girls", "sam_6m_3y", "sam_3_5y",
      "suw_6m_3y", "suw_3_6y"
    ];
    const sampleData = [
      {
        fin_year: "2025-26",
        quarter: "jan-feb-mar",
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
          "fin_year", "quarter", "awc_name", "pw_lm", "children_3_6y",
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
        awcList.forEach(awc => awcNameMap.set(awc.awc_name.toUpperCase(), awc.awc_name));

        const previewData = json.map((row) => {
          const rowErrors = [];
          requiredHeaders.forEach(header => {
            if (row[header] === undefined || row[header] === null || String(row[header]).trim() === "") {
              rowErrors.push(`'${header}' is missing.`);
            } else if (header !== 'fin_year' && header !== 'quarter' && header !== 'awc_name' && isNaN(Number(row[header]))) {
              rowErrors.push(`'${header}' must be a number.`);
            }
          });

          // Validate awc_name against the fetched list
          const excelAwcName = row.awc_name ? String(row.awc_name).trim().toUpperCase() : "";
          const excelAwcNameBase = excelAwcName.split(/[-\s(]/)[0].trim();

          if (!excelAwcName) {
            rowErrors.push("'awc_name' is missing.");
          } else if (awcNameMap.has(excelAwcName)) {
            row.awc_name = awcNameMap.get(excelAwcName); // Correct casing
          } else if (excelAwcNameBase && awcNameMap.has(excelAwcNameBase)) {
            // Attempt to correct by matching the base name (e.g., "Sunoli" from "Sunoli-03")
            row.awc_name = awcNameMap.get(excelAwcNameBase);
          } else {
            let bestMatch = null;
            let minDistance = Infinity;

            // Levenshtein distance check on both full and base names
            awcList.forEach(awc => {
              const fullDistance = levenshteinDistance(excelAwcName, awc.awc_name.toUpperCase());
              const baseDistance = levenshteinDistance(excelAwcNameBase, awc.awc_name.toUpperCase().split(/[-\s(]/)[0].trim());
              const distance = Math.min(fullDistance, baseDistance);

              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = awc.awc_name;
              }
            });

            // Automatically correct if the spelling is very close
            if (bestMatch && minDistance <= 3) {
              row.awc_name = bestMatch;
            } else {
              const errorMessage = bestMatch ? `'${row.awc_name}' is not a valid AWC name. Did you mean '${bestMatch}'?` : `'${row.awc_name}' is not a valid AWC name.`;
              rowErrors.push(errorMessage);
            }
          }
          return { data: row, errors: rowErrors };
        });

        setBulkPreviewData(previewData);
        if (previewData.some(item => item.errors.length > 0)) {
          setBulkUploadError("Your file contains errors. Please fix them before uploading.");
        }
      } catch (err) {
        setBulkUploadError("Failed to parse the Excel file. Please ensure it's a valid .xlsx or .xls file.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const previewHeaders = {
    fin_year: "Fin. Year",
    quarter: "Quarter",
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
    if (!bulkFile || bulkPreviewData.some(item => item.errors.length > 0)) {
      setBulkUploadError("Cannot upload. Please select a valid file and fix any errors.");
      return;
    }
    setBulkUploading(true);
    setBulkUploadError("");

    try {
      const uploadPromises = bulkPreviewData.map(item => {
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
      fetchReports(1, { fin_year: "", quarter: "" });
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
        await api.put("/ang-beneficiary-report/", payload);
        setSuccess("Report updated successfully.");
      } else {
        await api.post("/ang-beneficiary-report/", payload);
        setSuccess("Report created successfully.");
      }
      setFormData(initialFormData);
      setEditingId(null);
      setShowForm(false);
      fetchReports(1, { fin_year: "", quarter: "" }); // Reset to first page with no filters
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      setError(`Failed to ${editingId ? 'update' : 'create'} report.`);
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
            <Col md={3}><Form.Group className="mb-3"><Form.Label>Financial Year</Form.Label><Form.Control type="text" name="fin_year" value={formData.fin_year} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>Quarter</Form.Label><Form.Select name="quarter" value={formData.quarter} onChange={handleFormChange} required><option value="">Select Quarter</option><option value="apr-may-jun">April-May-June</option><option value="jul-aug-sep">July-August-September</option><option value="oct-nov-dec">October-November-December</option><option value="jan-feb-mar">January-February-March</option></Form.Select></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>AWC Name</Form.Label><Form.Select name="awc_name" value={formData.awc_name} onChange={handleAwcChange} required disabled={!!editingId}><option value="">Select AWC</option>{awcList.map(awc => <option key={awc.awc_code} value={awc.awc_name}>{awc.awc_name}</option>)}</Form.Select>{formErrors.awc_name && <Form.Text className="text-danger">{formErrors.awc_name}</Form.Text>}</Form.Group></Col>
          </Row>
          <Row>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>District</Form.Label><Form.Control type="text" name="district" value={formData.district || ''} disabled /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>Project</Form.Label><Form.Control type="text" name="project" value={formData.project || ''} disabled /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>Sector</Form.Label><Form.Control type="text" name="sector" value={formData.sector || ''} disabled /></Form.Group></Col>
          </Row>
          <h6 className="mt-3">Beneficiary Counts</h6>
          <Row>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>PW & LM</Form.Label><Form.Control type="number" name="pw_lm" value={formData.pw_lm} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>Children (6m-3y)</Form.Label><Form.Control type="number" name="children_6m_3y" value={formData.children_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>Children (3-6y)</Form.Label><Form.Control type="number" name="children_3_6y" value={formData.children_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>Adolescent Girls</Form.Label><Form.Control type="number" name="adolescent_girls" value={formData.adolescent_girls} onChange={handleFormChange} required /></Form.Group></Col>
          </Row>
          <Row>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>SAM (6m-3y)</Form.Label><Form.Control type="number" name="sam_6m_3y" value={formData.sam_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>SAM (3-5y)</Form.Label><Form.Control type="number" name="sam_3_5y" value={formData.sam_3_5y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>SUW (6m-3y)</Form.Label><Form.Control type="number" name="suw_6m_3y" value={formData.suw_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
            <Col md={3}><Form.Group className="mb-3"><Form.Label>SUW (3-6y)</Form.Label><Form.Control type="number" name="suw_3_6y" value={formData.suw_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
          </Row>
          <Button variant="secondary" onClick={() => setShowForm(false)} className="me-2">Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingId ? "Update Report" : "Save Report")}
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
            <h3 className="fw-bold">Beneficiary Reports</h3>
            <div>
              <Button onClick={handleShowBulkUploadModal} variant="success" className="me-2"><FaUpload className="me-2" /> Bulk Upload</Button>
              <Button onClick={handleAddNew} variant="primary"><FaPlus className="me-2" /> Add New Report</Button>
            </div>
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          
          <Collapse in={showForm}>
            <div>{renderForm()}</div>
          </Collapse>

          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col md={3}><Card.Title as="h5" className="mb-0">Existing Reports</Card.Title></Col>
                <Col md={9}>
                  <Button variant="secondary" onClick={handleResetFilters}>Reset Filters</Button>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col md={2}><Form.Control type="text" name="fin_year" placeholder="Fin. Year (e.g., 2025-26)" value={filters.fin_year} onChange={handleFilterChange} /></Col>
                <Col md={2}><Form.Select name="quarter" value={filters.quarter} onChange={handleFilterChange}><option value="">All Quarters</option><option value="apr-may-jun">Apr-Jun</option><option value="jul-aug-sep">Jul-Sep</option><option value="oct-nov-dec">Oct-Dec</option><option value="jan-feb-mar">Jan-Mar</option></Form.Select></Col>
                <Col md={2}><Form.Select name="district" value={filters.district} onChange={handleDistrictChange}><option value="">All Districts</option>{uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="project" value={filters.project} onChange={handleProjectChange} disabled={!filters.district}><option value="">All Projects</option>{uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="sector" value={filters.sector} onChange={handleSectorChange} disabled={!filters.project}><option value="">All Sectors</option>{uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}</Form.Select></Col>
                <Col md={2}><Form.Select name="awc_name" value={filters.awc_name} onChange={handleFilterChange} disabled={!filters.sector}><option value="">All AWCs</option>{uniqueAwcs.map(a => <option key={a} value={a}>{a}</option>)}</Form.Select></Col>
              </Row>
            </Card.Header>
          
              {loading ? <div className="text-center"><Spinner animation="border" /></div> : error && !loading ? <Alert variant="danger">{error}</Alert> : (
                <>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>District</th>
                        <th>Project</th>
                        <th>Sector</th>
                        <th>AWC Name</th>
                        <th>Fin. Year</th>
                        <th>Quarter</th>
                        <th title="Pregnant Women & Lactating Mothers">PW & LM</th>
                        <th title="Children 6 months to 3 years">Child (6m-3y)</th>
                        <th title="Children 3 to 6 years">Child (3-6y)</th>
                        <th title="Adolescent Girls">Adol. Girls</th>
                        <th title="SAM 6 months to 3 years">SAM (6m-3y)</th>
                        <th title="SAM 3 to 5 years">SAM (3-5y)</th>
                        <th title="SUW 6 months to 3 years">SUW (6m-3y)</th>
                        <th title="SUW 3 to 6 years">SUW (3-6y)</th>
                        <th>Actions</th>
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
                              <td>{report.quarter}</td>
                              <td>{report.pw_lm}</td>
                              <td>{report.children_6m_3y}</td>
                              <td>{report.children_3_6y}</td>
                              <td>{report.adolescent_girls}</td>
                              <td>{report.sam_6m_3y}</td>
                              <td>{report.sam_3_5y}</td>
                              <td>{report.suw_6m_3y}</td>
                              <td>{report.suw_3_6y}</td>
                              <td>
                                <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleShowViewModal(report)}><FaEye /></Button>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(report)}><FaEdit /></Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)}><FaTrash /></Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="table-active fw-bold">
                            <td colSpan="7">Total</td>
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
                        <tr><td colSpan="16" className="text-center">No reports found.</td></tr>
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
                <Modal.Title>Beneficiary Report Details</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Row><Col md={6}><p><strong>AWC Name:</strong> {viewingReport.awc_name}</p><p><strong>Financial Year:</strong> {viewingReport.fin_year}</p><p><strong>Quarter:</strong> {viewingReport.quarter}</p></Col><Col md={6}><p><strong>District:</strong> {viewingReport.district}</p><p><strong>Project:</strong> {viewingReport.project}</p><p><strong>Sector:</strong> {viewingReport.sector}</p></Col></Row>
                <hr />
                <h5 className="mb-3">Beneficiary Counts</h5>
                <ListGroup variant="flush"><ListGroup.Item><FaUsers className="me-2 text-primary" /> Pregnant Women & Lactating Mothers: <strong>{viewingReport.pw_lm}</strong></ListGroup.Item><ListGroup.Item><FaChild className="me-2 text-info" /> Children (6 months - 3 years): <strong>{viewingReport.children_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaChild className="me-2 text-success" /> Children (3 years - 6 years): <strong>{viewingReport.children_3_6y}</strong></ListGroup.Item><ListGroup.Item><FaFemale className="me-2 text-secondary" /> Adolescent Girls: <strong>{viewingReport.adolescent_girls}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-danger" /> SAM (6 months - 3 years): <strong>{viewingReport.sam_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-danger" /> SAM (3 years - 5 years): <strong>{viewingReport.sam_3_5y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-warning" /> SUW (6 months - 3 years): <strong>{viewingReport.suw_6m_3y}</strong></ListGroup.Item><ListGroup.Item><FaExclamationTriangle className="me-2 text-warning" /> SUW (3 years - 6 years): <strong>{viewingReport.suw_3_6y}</strong></ListGroup.Item></ListGroup>
              </Modal.Body>
              <Modal.Footer><Button variant="secondary" onClick={handleCloseViewModal}>Close</Button></Modal.Footer>
            </Modal>
          )}

          <Modal show={showBulkUploadModal} onHide={handleCloseBulkUploadModal} centered size="xl">
            <Modal.Header closeButton>
              <Modal.Title>Bulk Upload Beneficiary Reports</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {bulkUploadError && <Alert variant="danger">{bulkUploadError}</Alert>}
              <p>Upload an Excel file with the required columns. The 'awc_name' must match an existing AWC in the system.</p>
              <Button variant="link" onClick={downloadSampleFile} className="p-0 mb-3">
                <FaFileExcel className="me-1" /> Download Sample File
              </Button>
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Select Excel File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                />
              </Form.Group>

              {bulkPreviewData.length > 0 && (
                <div className="mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <h6>File Preview</h6>
                  <Table striped bordered hover responsive size="sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        {Object.keys(previewHeaders).map(key => (
                          <th key={key}>{previewHeaders[key]}</th>
                        ))}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreviewData.map((item, index) => (
                        <tr key={index} className={item.errors.length > 0 ? 'table-danger' : ''}>
                          <td>{index + 1}</td>
                          {Object.keys(previewHeaders).map(key => (
                            <td key={key}>{item.data[key]}</td>
                          ))}
                          <td>
                            {item.errors.length > 0 ? (
                              <span className="text-danger" title={item.errors.join('\n')}>Error</span>
                            ) : (
                              <span className="text-success">OK</span>
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
              <Button variant="secondary" onClick={handleCloseBulkUploadModal} disabled={bulkUploading}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile || bulkPreviewData.some(item => item.errors.length > 0)}>{bulkUploading ? <><Spinner as="span" animation="border" size="sm" /> Uploading...</> : "Upload"}</Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default StudentForm;