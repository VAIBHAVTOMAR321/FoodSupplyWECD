import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaUsers, FaUserFriends, FaBox } from "react-icons/fa";

const DPODashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [thrDistributions, setThrDistributions] = useState([]);
  const [hcmDistributions, setHcmDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thrTotalRegistrations, setThrTotalRegistrations] = useState(0);
  const [hcmTotalRegistrations, setHcmTotalRegistrations] = useState(0);

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

  const fetchThrDistributions = async () => {
    try {
      const response = await api.get("/thr-dpo-distributions/");
      const raw = response.data?.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setThrDistributions(items);
      setThrTotalRegistrations(response.data?.count || items.length);
    } catch (err) {
      console.error("Failed to fetch THR DPO distributions:", err);
    }
  };

  const fetchHcmDistributions = async () => {
    try {
      const response = await api.get("/hcm-dpo-distributions/");
      const raw = response.data?.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setHcmDistributions(items);
      setHcmTotalRegistrations(response.data?.count || items.length);
    } catch (err) {
      console.error("Failed to fetch HCM DPO distributions:", err);
    }
  };

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchThrDistributions(), fetchHcmDistributions()]);
    } catch (err) {
      setError("Failed to fetch DPO distributions.");
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

  const thrTotals = useMemo(() => {
    return thrDistributions.reduce((acc, item) => {
      acc.beneficiaries += Number(item.total_beneficiaries) || 0;
      acc.quantity += parseFloat(item.quantity) || 0;
      return acc;
    }, { beneficiaries: 0, quantity: 0 });
  }, [thrDistributions]);

  const hcmTotals = useMemo(() => {
    return hcmDistributions.reduce((acc, item) => {
      acc.beneficiaries += Number(item.total_beneficiaries) || 0;
      acc.quantity += parseFloat(item.quantity) || 0;
      return acc;
    }, { beneficiaries: 0, quantity: 0 });
  }, [hcmDistributions]);

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

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <Row className="mb-4 g-3">
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-primary bg-opacity-10">
                    <FaUsers className="text-primary" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">THR Registrations</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : thrTotalRegistrations}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-success bg-opacity-10">
                    <FaUserFriends className="text-success" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">THR Beneficiaries</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : thrTotals.beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-info bg-opacity-10">
                    <FaBox className="text-info" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">THR Quantity</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : thrTotals.quantity.toFixed(2)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4 g-3">
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-warning bg-opacity-10">
                    <FaUsers className="text-warning" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">HCM Registrations</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : hcmTotalRegistrations}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-danger bg-opacity-10">
                    <FaUserFriends className="text-danger" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">HCM Beneficiaries</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : hcmTotals.beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Card className="dashboard-card h-100">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-secondary bg-opacity-10">
                    <FaBox className="text-secondary" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">HCM Quantity</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : hcmTotals.quantity.toFixed(2)}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default DPODashboard;