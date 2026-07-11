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
} from "react-icons/fa";
import "../../assets/css/AnganwadiDashboard.css";

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
  const [awcList, setAwcList] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [filteredAwcs, setFilteredAwcs] = useState([]);
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

  useEffect(() => {
    const fetchAwcList = async () => {
      try {
        const response = await api.get("/director/awc-list/");
        setAwcList(response.data.data || []);
      } catch (err) {
        console.error("Failed to fetch AWC list:", err);
      }
    };
    fetchAwcList();
  }, [api]);

  useEffect(() => {
    if (awcList.length > 0) {
      const districtMap = new Map(
        awcList
          .filter(item => item.district_code && item.district)
          .map(item => [item.district_code, { code: item.district_code, name: item.district }])
      );
      setUniqueDistricts([...districtMap.values()]);
    }
  }, [awcList]);

  useEffect(() => {
    if (!formData.district) {
      setUniqueProjects([]);
      setUniqueSectors([]);
      setFilteredAwcs([]);
    }
  }, [formData.district]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDistrictChange = (e) => {
    const districtCode = e.target.value;
    const projects = [...new Set(awcList.filter(item => item.district_code === districtCode).map(item => item.project))].filter(Boolean);
    setUniqueProjects(projects);
    setUniqueSectors([]);
    setFilteredAwcs([]);
    setFormData((prev) => ({
      ...prev,
      district: districtCode,
      project: "",
      sector: "",
      awc_name: "",
    }));
  };

  const handleProjectChange = (e) => {
    const project = e.target.value;
    const sectors = [...new Set(awcList.filter(item => item.district_code === formData.district && item.project === project).map(item => item.sector))].filter(Boolean);
    setUniqueSectors(sectors);
    setFilteredAwcs([]);
    setFormData((prev) => ({
      ...prev,
      project,
      sector: "",
      awc_name: "",
    }));
  };

  const handleSectorChange = (e) => {
    const sector = e.target.value;
    const awcs = awcList.filter(item =>
      item.district_code === formData.district &&
      item.project === formData.project &&
      item.sector === sector
    );
    setFilteredAwcs(awcs);
    setFormData((prev) => ({
      ...prev,
      sector,
      awc_name: "",
    }));
  };

  const handleAwcChange = (e) => {
    const { value } = e.target;
    const selectedAwc = awcList.find(awc => awc.awc_name === value);
    if (selectedAwc) {
      setFormData(prev => ({
        ...prev, // This keeps existing form data
        awc_name: selectedAwc.awc_name,
      }));
    }
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
        await api.post("/ang-beneficiary-report/", payload);
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
            <Button onClick={handleAddNew} variant="primary">
              <FaPlus className="me-2" /> Add Beneficiary Details
            </Button>
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Form for editing. Creation form might need more fields. */}
          <Collapse in={showForm}>
            <Card className="mb-4">
              <Card.Header as="h5">
                {editingId ? "Edit" : "Add"} Beneficiary Report
              </Card.Header>
             
                <Form onSubmit={handleSubmit}>
                  <Row className="align-items-end">
                    <Col md={3}><Form.Group className="mb-3"><Form.Label>Financial Year</Form.Label><Form.Control type="text" name="fin_year" value={formData.fin_year} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md={3}><Form.Group className="mb-3"><Form.Label>Month</Form.Label><Form.Select name="month" value={formData.month} onChange={handleFormChange} required disabled={!!editingId}><option value="">Select Month</option>{["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map(m => <option key={m} value={m}>{m}</option>)}</Form.Select></Form.Group></Col>                    <Col md={3}><Form.Group className="mb-3"><Form.Label>District</Form.Label><Form.Select name="district" value={formData.district} onChange={handleDistrictChange} required disabled={!!editingId}><option value="">Select District</option>{uniqueDistricts.map(d => <option key={d.code} value={d.code}>{`${d.name} (${d.code})`}</option>)}</Form.Select></Form.Group></Col>
                    <Col md={3}><Form.Group className="mb-3"><Form.Label>Project</Form.Label><Form.Select name="project" value={formData.project} onChange={handleProjectChange} required disabled={!formData.district || !!editingId}><option value="">Select Project</option>{uniqueProjects.map(p => <option key={p} value={p}>{p}</option>)}</Form.Select></Form.Group></Col>
                    <Col md={3}><Form.Group className="mb-3"><Form.Label>Sector</Form.Label><Form.Select name="sector" value={formData.sector} onChange={handleSectorChange} required disabled={!formData.project || !!editingId}><option value="">Select Sector</option>{uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}</Form.Select></Form.Group></Col>
                    <Col md={3}><Form.Group className="mb-3"><Form.Label>AWC Name</Form.Label><Form.Select name="awc_name" value={formData.awc_name} onChange={handleAwcChange} required disabled={!formData.sector || !!editingId}><option value="">Select AWC</option>{filteredAwcs.map(awc => <option key={awc.awc_code} value={awc.awc_name}>{awc.awc_name}</option>)}</Form.Select>{formErrors.awc_name && <Form.Text className="text-danger">{formErrors.awc_name}</Form.Text>}</Form.Group></Col>
              
                
                  <h6 className="mb-3">Beneficiary Numbers</h6>
                 
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
          </Container>
      </div>
     </div>
  );
}

export default ITBeneEntry;