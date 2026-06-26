import React, { useState, useEffect } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination } from "react-bootstrap";

import "../../assets/css/dpo.css";
import { useAuth } from "../all_login/AuthContext";
import DPOLeftNav from "./DPOLeftNav";
import DPOHeader from "./DPOHeader";




const ThrDpoDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [openRemarkId, setOpenRemarkId] = useState(null);
  const [openRemarkAction, setOpenRemarkAction] = useState("");
  const [remarkValue, setRemarkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);

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

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-dpo-distributions/");
      const raw = response.data?.data || response.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setDistributions(items);
    } catch (err) {
      setError("Failed to fetch THR distributions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchDistributions();
    }
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleToggleRemark = (item, action) => {
    if (openRemarkId === item.id) {
      setOpenRemarkId(null);
      setOpenRemarkAction("");
    } else {
      setOpenRemarkId(item.id);
      setOpenRemarkAction(action);
      setRemarkValue("");
      setActionError("");
    }
  };

  const handleStatusUpdate = async (item) => {
    const action = openRemarkAction;
    const remark = remarkValue.trim();
    setActionError("");

    if (action === "rejected" && !remark) {
      setActionError("Please enter a remark for rejection.");
      return;
    }

    setSubmitting(true);
    setLoadingAction(prev => ({ ...prev, [item.id]: true }));
    try {
      const response = await api.put("/thr-dpo-distributions/", {
        id: item.id,
        dpo_status: action,
        dpo_remark: remark || null,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Status updated to ${action} successfully.`);
        setDistributions(prev => prev.map(d =>
          d.id === item.id ? { ...d, dpo_status: action, dpo_remark: remark || null } : d
        ));
        setOpenRemarkId(null);
        setOpenRemarkAction("");
        setRemarkValue("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || "Failed to update status.");
      }
    } catch (err) {
      setActionError("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setLoadingAction(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleViewRemark = (item) => {
    setSelectedRemarks(item);
    setShowRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);
    setSelectedRemarks(null);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = distributions.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(distributions.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    items.push(
      <Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />,
      <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
    );
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    items.push(
      <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />,
      <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
    );
    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination size="sm">{items}</Pagination>
      </div>
    );
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
              THR DPO Distributions
            </h3>
          </div>

          {successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {actionError && <Alert variant="danger" className="mb-3">{actionError}</Alert>}

          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : distributions.length === 0 ? (
                <div className="text-center py-4 text-muted">No THR distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover responsive className="mb-0">
                     <thead>
                      <tr>
                        <th>#</th>
                        <th>AWC Name</th>
                        <th>AWC Code</th>
                        <th>AWC Type</th>
                        <th>Sector</th>
                        <th>Project</th>
                        <th>District</th>
                        <th>Food Item</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Beneficiaries</th>
                        <th>Fin Year</th>
                        <th>Quarter</th>
                        <th>CDPO Status</th>
                        <th>DPO Status</th>
                        <th>Sector Status</th>
                        <th>DPO Remark</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <tr>
                            <td>{index + 1}</td>
                            <td>{item.awc_name}</td>
                            <td>{item.awc_code}</td>
                            <td>{item.awc_type}</td>
                            <td>{item.sector}</td>
                            <td>{item.project}</td>
                            <td>{item.district}</td>
                            <td>{item.food_item}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unit}</td>
                            <td>{item.total_beneficiaries}</td>
                            <td>{item.fin_year}</td>
                            <td>{item.quarter}</td>
                            <td><Badge bg={getStatusVariant(item.cdpo_status)}>{item.cdpo_status || "pending"}</Badge></td>
                            <td><Badge bg={getStatusVariant(item.dpo_status)}>{item.dpo_status || "pending"}</Badge></td>
                            <td><Badge bg={getStatusVariant(item.sector_status)}>{item.sector_status}</Badge></td>
                            <td>{item.dpo_remark || "-"}</td>
                            <td>
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="me-2"
                                disabled={item.cdpo_status === "pending" || item.cdpo_status === "pendings" || item.dpo_status === "approved" || item.dpo_status === "rejected" || loadingAction[item.id]}
                                onClick={() => handleToggleRemark(item, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="me-2"
                                disabled={item.cdpo_status === "pending" || item.cdpo_status === "pendings" || item.dpo_status === "approved" || item.dpo_status === "rejected" || loadingAction[item.id]}
                                onClick={() => handleToggleRemark(item, "rejected")}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm" className="mt-2"
                                onClick={() => handleViewRemark(item)}
                              >
                                View Remark
                              </Button>
                            </td>
                          </tr>
                          {openRemarkId === item.id && (
                            <tr>
                              <td colSpan="18">
                                <div className="d-flex align-items-start gap-2">
                                  <Form.Control
                                    type="text"
                                    size="sm"
                                    placeholder="Enter remark"
                                    value={remarkValue}
                                    onChange={(e) => setRemarkValue(e.target.value)}
                                    className="me-2"
                                    style={{ maxWidth: "300px" }}
                                  />
                                  <Button
                                    size="sm"
                                    variant={openRemarkAction === "approved" ? "success" : "danger"}
                                    disabled={submitting || loadingAction[item.id]}
                                    onClick={() => handleStatusUpdate(item)}
                                  >
                                    {loadingAction[item.id] ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={submitting || loadingAction[item.id]}
                                    onClick={() => {
                                      setOpenRemarkId(null);
                                      setOpenRemarkAction("");
                                      setRemarkValue("");
                                      setActionError("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </Table>
                  {renderPagination()}
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>

        <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>All Remarks - {selectedRemarks?.awc_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedRemarks && (
              <div>
                <div className="mb-3">
                  <h6>CDPO Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.cdpo_status)}>{selectedRemarks.cdpo_status || "pending"}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.cdpo_remark || "No remark"}</p>
                </div>
                <hr />
                <div className="mb-3">
                  <h6>DPO Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.dpo_status)}>{selectedRemarks.dpo_status || "pending"}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.dpo_remark || "No remark"}</p>
                </div>
                <hr />
                <div className="mb-3">
                  <h6>Sector Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.sector_status)}>{selectedRemarks.sector_status}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.sector_remark || "No remark"}</p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRemarkModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    </div>
  );
};

export default ThrDpoDistributions;
