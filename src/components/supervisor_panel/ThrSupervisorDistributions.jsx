import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Button, Modal, Form, Alert, Badge } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/supervisorleftnav.css";
import SupervisorHeader from "./SupervisorHeader";
import SupervisorLeftNav from "./SupervisorLeftNav";

const ThrSupervisorDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
      const response = await api.get("/thr-supervisor-distributions/");
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

  const handleOpenModal = (item, action) => {
    setSelectedItem(item);
    setPendingAction(action);
    setRemark("");
    setActionError("");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setPendingAction("");
    setRemark("");
    setActionError("");
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setActionError("");

    if (pendingAction === "rejected" && !remark.trim()) {
      setActionError("Please provide a remark for rejection.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put("/thr-supervisor-distributions/", {
        id: selectedItem.id,
        sector_status: pendingAction,
        sector_remark: remark.trim() || null,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Status updated to ${pendingAction} successfully.`);
        setDistributions(prev => prev.map(item =>
          item.id === selectedItem.id
            ? { ...item, sector_status: pendingAction, sector_remark: remark.trim() || null }
            : item
        ));
        handleCloseModal();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || "Failed to update status.");
      }
    } catch (err) {
      setActionError("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  return (
    <div className="dashboard-container">
      <SupervisorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <SupervisorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading">
            <h3 className="mb-4 fw-bold">
              THR Supervisor Distributions
            </h3>
          </div>

          {successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

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
                        <th>Sector Remark</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributions.map((item, index) => (
                        <tr key={item.id}>
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
                          <td><Badge bg={item.cdpo_status === "approved" ? "success" : item.cdpo_status === "rejected" ? "danger" : "warning"}>{item.cdpo_status || "pending"}</Badge></td>
                          <td><Badge bg={item.dpo_status === "approved" ? "success" : item.dpo_status === "rejected" ? "danger" : "warning"}>{item.dpo_status || "pending"}</Badge></td>
                          <td><Badge bg={getStatusVariant(item.sector_status)}>{item.sector_status}</Badge></td>
                          <td>{item.sector_remark || "-"}</td>
                          <td>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="me-2"
                              disabled={item.sector_status === "approved" || item.sector_status === "rejected"}
                              onClick={() => handleOpenModal(item, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              disabled={item.sector_status === "approved" || item.sector_status === "rejected"}
                              onClick={() => handleOpenModal(item, "rejected")}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Container>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {pendingAction === "approved" ? "Approve" : "Reject"} Distribution
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {actionError && <Alert variant="danger">{actionError}</Alert>}
            <Form onSubmit={handleStatusUpdate}>
              <Form.Group className="mb-3">
                <Form.Label>Remark</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter remark (optional for approve, required for reject)"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </Form.Group>
              <Button variant="secondary" onClick={handleCloseModal} className="me-2" disabled={submitting}>
                Cancel
              </Button>
              <Button variant={pendingAction === "approved" ? "success" : "danger"} type="submit" disabled={submitting}>
                {submitting ? <Spinner as="span" animation="border" size="sm" /> : pendingAction === "approved" ? "Approve" : "Reject"}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default ThrSupervisorDistributions;