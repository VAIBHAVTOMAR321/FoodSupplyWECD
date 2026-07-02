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
import "../../assets/css/anganwadileftnav.css";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
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

const API_URL = "/beneficiary-registration/";

const BeneficiarieEntry = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [counts, setCounts] = useState({ hcm: 0, thr: 0 });
  const [loading, setLoading] = useState({ counts: true, table: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { user, api } = useAuth();
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
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(API_URL);
      setReports(response.data || []);
    } catch (err) {
      setError("लाभार्थी रिपोर्ट लाने में विफल।");
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
        await api.delete(API_URL, { data: { id: id } });
        setSuccess("रिपोर्ट सफलतापूर्वक हटा दी गई।");
        fetchReports();
      } catch (err) {
        setError("रिपोर्ट हटाने में विफल।");
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
        await api.put(API_URL, payload); // Make sure your API handler for PUT uses payload.id
        setSuccess("रिपोर्ट सफलतापूर्वक अपडेट की गई।");
      } else {
        await api.post(API_URL, payload);
        setSuccess("रिपोर्ट सफलतापूर्वक बनाई गई।");
      }
      setShowForm(false);
      setFormData(initialFormData);
      setEditingId(null);
      fetchReports();
    } catch (err) {
      const errors = err.response?.data || {};
      setFormErrors(errors);
      setError(`रिपोर्ट ${editingId ? "अपडेट" : "बनाने"} में विफल।`);
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
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />
  
        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="mb-4 fw-bold">
              लाभार्थी एंट्री
            </h3>
            <Button onClick={handleAddNew} variant="primary">
              <FaPlus className="me-2" /> लाभार्थी विवरण जोड़ें
            </Button>
          </div>

          {success && <Alert variant="success">{success}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Collapse in={showForm}>
            <Card className="mb-4">
              <Card.Header as="h5">
                {editingId ? "संपादित करें" : "जोड़ें"} लाभार्थी रिपोर्ट
              </Card.Header>
              <Card.Body>
                <Form onSubmit={handleSubmit}>
                  <Row className="align-items-end">
                    <Col md>
                      <Form.Group className="mb-3">
                        <Form.Label>वित्तीय वर्ष</Form.Label>
                        <Form.Control type="text" name="fin_year" value={formData.fin_year} onChange={handleFormChange} required />
                      </Form.Group>
                    </Col>
                    <Col md>
                      <Form.Group className="mb-3">
                        <Form.Label>महीना</Form.Label>
                        <Form.Select name="month" value={formData.month} onChange={handleFormChange} required>
                          <option value="">माह का चयन करें</option>
                          {["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map(m => <option key={m} value={m}>{m}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>PW & LM</Form.Label><Form.Control type="number" name="pw_lm" value={formData.pw_lm} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>बच्चे (6m-3y)</Form.Label><Form.Control type="number" name="children_6m_3y" value={formData.children_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>बच्चे (3-6y)</Form.Label><Form.Control type="number" name="children_3_6y" value={formData.children_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md><Form.Group className="mb-3"><Form.Label>किशोरी लड़कियां</Form.Label><Form.Control type="number" name="adolescent_girls" value={formData.adolescent_girls} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SAM (6m-3y)</Form.Label><Form.Control type="number" name="sam_6m_3y" value={formData.sam_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SAM (3-5y)</Form.Label><Form.Control type="number" name="sam_3_5y" value={formData.sam_3_5y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SUW (6m-3y)</Form.Label><Form.Control type="number" name="suw_6m_3y" value={formData.suw_6m_3y} onChange={handleFormChange} required /></Form.Group></Col>
                    <Col md><Form.Group className="mb-3"><Form.Label>SUW (3-6y)</Form.Label><Form.Control type="number" name="suw_3_6y" value={formData.suw_3_6y} onChange={handleFormChange} required /></Form.Group></Col>
                  </Row>
                  <Button variant="secondary" onClick={() => setShowForm(false)} className="me-2">रद्द करें</Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingId ? "रिपोर्ट अपडेट करें" : "रिपोर्ट सहेजें")}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Collapse>

          <h5 className="mt-4">मौजूदा लाभार्थी रिपोर्ट</h5>
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>वित्तीय वर्ष के अनुसार फ़िल्टर करें</Form.Label>
                <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
                  <option value="">सभी वर्ष</option>
                  {uniqueFinYears.map(year => <option key={year} value={year}>{year}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>महीने के अनुसार फ़िल्टर करें</Form.Label>
                <Form.Select name="month" value={filters.month} onChange={handleFilterChange}>
                  <option value="">सभी महीने</option>
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
                      <th>वित्तीय वर्ष</th>
                      <th>महीना</th>
                      <th>PW & LM</th>
                      <th>बच्चे (6 महीने-3 वर्ष)</th>
                      <th>बच्चे (3-6 वर्ष)</th>
                      <th>किशोरी लड़कियां</th>
                      <th>SAM (6 महीने-3 वर्ष)</th>
                      <th>SAM (3-5 वर्ष)</th>
                      <th>SUW (6 महीने-3 वर्ष)</th>
                      <th>SUW (3-6 वर्ष)</th>
                      <th>सेक्टर स्थिति</th>
                      <th>क्रियाएं</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((report, index) => (
                        <tr key={report.id}>
                          <td>{indexOfFirstItem + index + 1}</td>
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
                            {report.sector_status !== 'approved' && (
                              <>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEdit(report)}><FaEdit /></Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)}><FaTrash /></Button>
                              </>
                            )}
                            {report.sector_remark && (
                              <Button variant="outline-info" size="sm" onClick={() => handleShowRemarkModal(report.sector_remark)}><FaEye /></Button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="13" className="text-center">कोई रिपोर्ट नहीं मिली।</td></tr>
                    )}
                  </tbody>
                </Table>
              )}
              {renderPagination()}
          </div>

          <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>सेक्टर टिप्पणी</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <p>{viewingRemark}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseRemarkModal}>बंद करें</Button>
            </Modal.Footer>
          </Modal>
          </Container>

         
      </div>

   
    
     </div>
  );
};

export default BeneficiarieEntry;