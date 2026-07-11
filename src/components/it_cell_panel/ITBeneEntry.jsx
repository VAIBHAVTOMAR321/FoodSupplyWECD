import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  const [awcList, setAwcList] = useState([]);
  const [awcListLoading, setAwcListLoading] = useState(true);
  const [bulkFileInputKey, setBulkFileInputKey] = useState(0);

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
      setReports(response.data?.results?.data || []);
    } catch (err) {
      setError("Failed to fetch beneficiary reports.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    const fetchAwcList = async () => {
      setAwcListLoading(true);
      try {
        const response = await api.get("/director/awc-list/");
        const awcs = (response.data.data || []).map(awc => ({
          ...awc,
          district_name: awc.district, // Ensure district_name is available
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
    setCurrentPage(1); // Reset to first page on filter change
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

  const handleShowBulkUploadModal = () => {
    setBulkFile(null);
    setBulkPreviewData([]);
    setBulkUploadError("");
    setBulkFileInputKey(prev => prev + 1);
    setShowBulkUploadModal(true);
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
        district: "Sample District",
        project: "Sample Project",
        sector: "Sample Sector",
        awc_name: "Sample AWC",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiary Data");
    XLSX.writeFile(workbook, "SampleBeneficiaryEntry.xlsx");
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
        setBulkUploadError("AWC list is still loading. Please wait a moment and select the file again.");
      } else {
        setBulkUploadError("AWC list is not available. Please refresh the page and try again.");
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
        awcList.forEach(awc => awcNameMap.set(String(awc.awc_name).toUpperCase(), awc.awc_name));

        // For duplicate checking
        const seenEntries = new Set();

        const previewData = json.map((row, index) => {
          const rowErrors = {};
          requiredHeaders.forEach(header => {
            const value = row[header];
            if (value === undefined || value === null || String(value).trim() === "") {
              rowErrors[header] = `'${header}' is missing.`;
            } else {
              if (header !== 'fin_year' && header !== 'month' && header !== 'awc_name' && isNaN(Number(value))) {
                rowErrors[header] = `'${header}' must be a valid number.`;
              }
            }
          });

          // Validate awc_name against the fetched list
          const excelAwcName = row.awc_name ? String(row.awc_name).trim().toUpperCase() : "";
          if (!excelAwcName) {
            rowErrors['awc_name'] = "'awc_name' is missing.";
          } else if (awcNameMap.has(excelAwcName)) {
            row.awc_name = awcNameMap.get(excelAwcName); // Correct casing
          }  else { let bestMatch = null; let minDistance = Infinity; awcList.forEach(awc => {
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
              const errorMessage = bestMatch ? `'${row.awc_name}' is not a valid AWC name. Did you mean '${bestMatch}'?` : `'${row.awc_name}' is not a valid AWC name.`;
              rowErrors['awc_name'] = errorMessage;
            }
          }

          if (Object.keys(rowErrors).length === 0) {
            const entryKey = `${row.fin_year}|${row.month}|${row.awc_name}`;
            if (seenEntries.has(entryKey)) {
              rowErrors['duplicate'] = `Duplicate entry for AWC '${row.awc_name}' in month '${row.month}'.`;
            } else {
              seenEntries.add(entryKey);
            }
          }
          return { data: row, errors: rowErrors };
        });

        setBulkPreviewData(previewData);
        if (previewData.some(item => Object.keys(item.errors).length > 0)) {
          setBulkUploadError("Your file contains errors. Please fix them before uploading.");
        }
      } catch (err) {
        setBulkUploadError("Failed to parse the Excel file. Please ensure it's a valid .xlsx or .xls file.");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile || bulkPreviewData.some(item => Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion)) {
      setBulkUploadError("Cannot upload. Please select a valid file and fix any errors.");
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
        // The API for creation is not specified, assuming it's a POST to the same URL
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

          {/* Form for editing. Creation form might need more fields. */}
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
                      <tr><td colSpan="14" className="text-center">No reports found.</td></tr>
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
              {bulkUploadError && <Alert variant="danger">{bulkUploadError}</Alert>}
              <p>Upload an Excel file with the required columns. The column names must match the sample file.</p>
              <Button variant="link" onClick={downloadSampleFile} className="p-0 mb-3">
                <FaFileExcel className="me-1" /> Download Sample File
              </Button>
              <Form.Group controlId="formFile" className="mb-3">
                <Form.Label>Select Excel File</Form.Label>
                <Form.Control
                  key={bulkFileInputKey}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  disabled={awcListLoading}
                />
                {awcListLoading && <Form.Text className="text-muted">Loading AWC list... file selection will be enabled shortly.</Form.Text>}
              </Form.Group>

              {bulkPreviewData.length > 0 && (
                <div className="mt-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <h6>File Preview</h6>
                  <Table striped bordered hover responsive size="sm">
                  <thead>
                      <tr>
                        <th>#</th>
                        {Object.keys(initialFormData).filter(k => !['district', 'project', 'sector'].includes(k)).map(key => <th key={key}>{key.replace(/_/g, ' ')}</th>)}
                        <th>Status</th>
                      </tr>
                    </thead>
                    {bulkPreviewData.some(item => item.errors.duplicate) && (
                      <Alert variant="warning" className="mt-2">Duplicate rows were found in your file. Only the first instance of each will be uploaded.</Alert>
                    )}
                    <tbody>
                      {bulkPreviewData.map((item, index) => (
                        <tr key={index}>
                          <td className={Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion ? 'table-danger' : ''}>{index + 1}</td>
                          {Object.keys(initialFormData).filter(k => !['district', 'project', 'sector'].includes(k)).map(key => (
                            <td 
                              key={key} 
                              className={item.errors[key] ? 'table-danger' : (key === 'awc_name' && item.errors.awc_name_suggestion) ? 'table-warning' : ''} 
                              title={item.errors[key] || item.errors.awc_name_suggestion}
                            >
                              {item.data[key]} 
                            </td>
                          ))}
                          <td>
                            {Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion ? (
                              <span className="text-danger" title={Object.values(item.errors).join('\n')}>Error</span>
                            ) : item.errors.awc_name_suggestion ? (
                              <span className="text-warning" title={item.errors.awc_name_suggestion}>Suggestion</span>
                            ) : (<span className="text-success">OK</span>)}
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
              <Button variant="primary" onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile || bulkPreviewData.some(item => Object.keys(item.errors).length > 0 && !item.errors.awc_name_suggestion)}>
                {bulkUploading ? <><Spinner as="span" animation="border" size="sm" /> Uploading...</> : "Upload"}
              </Button>
            </Modal.Footer>
          </Modal>
          </Container>
      </div>
     </div>
  );
}

export default ITBeneEntry;