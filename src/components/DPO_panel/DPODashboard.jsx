import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import DPOLeftNav from "./DPOLeftNav";
import DPOHeader from "./DPOHeader";

const DPODashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { user, api } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await api.get("/candidate/details/", {
        params: { registred_by: user?.user_id || "USR-000002" }
      });
      setCandidates(response.data.data || []);
      setTotalRegistrations(response.data.count || 0);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setCandidates([]);
      setTotalRegistrations(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  useEffect(() => {
    const totalPages = Math.ceil(candidates.length / itemsPerPage);
    if (totalPages === 0) {
      setCurrentPage(1);
    } else if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [candidates.length, itemsPerPage, currentPage]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCardClick = () => {
    setShowTable(true);
    setCurrentPage(1);
  };

  const handleCloseTable = () => {
    setShowTable(false);
    setCurrentPage(1);
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading">
            <h3 className="mb-4 fw-bold">
              DPO Dashboard
            </h3>
          </div>

          <Row>
            <Col md={3}>
              <Card className="h-100 shadow-sm border-0" style={{ cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '200px' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; }} onClick={handleCardClick}>
                <Card.Body className="text-center py-3">
                  <div className="mb-2">
                    <i className="bi bi-people-fill" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                  </div>
                  <Card.Title as="h6" className="mb-1 text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Total Registrations
                  </Card.Title>
                  <Card.Text as="h3" className="fw-bold text-primary mb-0" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                    {totalRegistrations}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>

        {showTable && (
          <Container fluid className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Registered Candidates</h4>
              <Button variant="secondary" size="sm" onClick={handleCloseTable}>
                <i className="bi bi-arrow-up me-2"></i>
                Collapse
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading candidates...</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-4">
                <p>No candidates found.</p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <Table striped bordered hover size="sm" className="table-hover align-middle mb-0">
                    <thead className="table-thead" style={{ backgroundColor: '#2c3e50' }}>
                      <tr>
                        <th className="text-center" style={{ minWidth: '50px' }}>#</th>
                        <th style={{ minWidth: '130px' }}>Candidate ID</th>
                        <th style={{ minWidth: '150px' }}>Name</th>
                        <th style={{ minWidth: '110px' }}>Phone</th>
                        <th style={{ minWidth: '110px' }}>LMP Date</th>
                        <th style={{ minWidth: '100px' }}>Women DOB</th>
                        <th style={{ minWidth: '100px' }}>Child DOB</th>
                        <th style={{ minWidth: '120px' }}>Child Name</th>
                        <th style={{ minWidth: '70px' }}>Preg #</th>
                        <th style={{ minWidth: '130px' }}>Aadhar Number</th>
                        <th style={{ minWidth: '120px' }}>PAN Number</th>
                        <th style={{ minWidth: '140px' }}>Account Number</th>
                        <th style={{ minWidth: '100px' }}>IFSC Code</th>
                        <th style={{ minWidth: '100px' }}>Verified</th>
                        <th style={{ minWidth: '80px' }}>Active</th>
                        <th style={{ minWidth: '100px' }}>Aadhar File</th>
                        <th style={{ minWidth: '100px' }}>PAN File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalItems = candidates.length;
                        const totalPages = Math.ceil(totalItems / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const paginatedCandidates = candidates.slice(startIndex, endIndex);

                        return paginatedCandidates.map((c, index) => {
                          const baseUrl = "https://mahadevaaya.com/golden100days/golden100days_backend";
                          const aadharFile = c.aadhar_file ? `${baseUrl}${c.aadhar_file}` : "-";
                          const panFile = c.pan_file ? `${baseUrl}${c.pan_file}` : "-";

                          return (
                            <tr key={c.id} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                              <td className="text-center fw-bold">{startIndex + index + 1}</td>
                              <td><span className="badge bg-primary">{c.candidate_id}</span></td>
                              <td className="fw-semibold">{c.candidate_name}</td>
                              <td>{c.phone}</td>
                              <td>{c.lmp_date}</td>
                              <td>{c.dob}</td>
                              <td>{c.dob_child}</td>
                              <td>{c.child_name}</td>
                              <td>{c.pregancy_num}</td>
                              <td><code className="text-muted small">{c.aadhar_number}</code></td>
                              <td><span className="badge bg-secondary">{c.pan_no}</span></td>
                              <td><code className="text-muted small">{c.account_number}</code></td>
                              <td><span className="badge bg-secondary">{c.ifsc_code}</span></td>
                              <td>
                                <span className={`badge ${c.is_verified ? 'bg-success' : 'bg-warning'}`}>
                                  {c.is_verified ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${c.is_active ? 'bg-success' : 'bg-danger'}`}>
                                  {c.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                {c.aadhar_file ? (
                                  <a href={aadharFile} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                    <i className="bi bi-eye"></i> View
                                  </a>
                                ) : <span className="text-muted">-</span>}
                              </td>
                              <td>
                                {c.pan_file ? (
                                  <a href={panFile} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                    <i className="bi bi-eye"></i> View
                                  </a>
                                ) : <span className="text-muted">-</span>}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </Table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                  <span className="text-muted small">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, candidates.length)} of {candidates.length} entries
                  </span>

                  <div className="d-flex align-items-center gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-double-left"></i>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </Button>

                    <span className="badge bg-light text-dark border px-3 py-2">
                      Page {currentPage} of {Math.ceil(candidates.length / itemsPerPage)}
                    </span>

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(candidates.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(candidates.length / itemsPerPage)}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCurrentPage(Math.ceil(candidates.length / itemsPerPage))}
                      disabled={currentPage === Math.ceil(candidates.length / itemsPerPage)}
                    >
                      <i className="bi bi-chevron-double-right"></i>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Container>
        )}
      </div>
    </div>
  );
};

export default DPODashboard;