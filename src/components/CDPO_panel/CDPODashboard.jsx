import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import "../../assets/css/dpo.css"; // Import DPO CSS for card styles
import CDPOLeftNav from "./CDPOLeftNav";
import CDPOHeader from "./CDPOHeader";
import { FaUsers, FaUserFriends, FaBox, FaChevronDown, FaChevronUp } from "react-icons/fa";

const CDPODashboard = () => {
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
  const [hcmFoodItemsCount, setHcmFoodItemsCount] = useState(0);
  const [thrFoodItemsCount, setThrFoodItemsCount] = useState(0);
  const [expanded, setExpanded] = useState(null);

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
      const response = await api.get("/thr-cdpo-distributions/");
      const raw = response.data?.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setThrDistributions(items);
      setThrTotalRegistrations(response.data?.count || items.length);
    } catch (err) {
      console.error("Failed to fetch THR CDPO distributions:", err);
    }
  };

  const fetchHcmDistributions = async () => {
    try {
      const response = await api.get("/hcm-cdpo-distributions/");
      const raw = response.data?.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setHcmDistributions(items);
      setHcmTotalRegistrations(response.data?.count || items.length);
    } catch (err) {
      console.error("Failed to fetch HCM CDPO distributions:", err);
    }
  };

  const fetchHcmFoodItems = async () => {
    try {
      const response = await api.get("/hcm-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setHcmFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch HCM food items:", err);
    }
  };

  const fetchThrFoodItems = async () => {
    try {
      const response = await api.get("/thr-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setThrFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch THR food items:", err);
    }
  };

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchThrDistributions(), fetchHcmDistributions(), fetchHcmFoodItems(), fetchThrFoodItems()]);
    } catch (err) {
      setError("Failed to fetch CDPO distributions.");
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

  const FoodItemTable = ({ scheme, api }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await api.get(`/${scheme}-food-items/`);
          const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
          setItems(Array.isArray(data) ? data : []);
        } catch (err) {
          setError(`Failed to fetch ${scheme.toUpperCase()} food items.`);
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchItems();
    }, [scheme, api]);

    if (loading) return <div className="text-center p-4"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (items.length === 0) return <div className="text-center p-4 text-muted">No food items found.</div>;

    return (
      <div className="cdpo-food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 cdpo-food-item-table">
          <thead className="sticky-top">
            <tr>
              <th>#</th>
              <th>Food Item</th>
              <th>Quantity Per Beneficiary</th>
              <th>Unit</th>
              <th>Beneficiary Category</th>
              <th>Days Allotted</th>
              <th>Total Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.food_item}</td>
                <td>{item.qty_per_ben}</td>
                <td>{item.unit}</td>
                <td>{item.bene_category}</td>
                <td>{item.days_allotted}</td>
                <td>{item.total_quantity}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const handleCardClick = (scheme) => {
    setExpanded(expanded === scheme ? null : scheme);
  };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <h4 className="cdpo-section-title">Food Items Overview</h4>
          <Row className="mb-4">
            <Col md={6}>
              <Card className="dashboard-card cdpo-expandable-card card-hcm" onClick={() => handleCardClick('hcm')} aria-expanded={expanded === 'hcm'}>
                <Card.Body className="d-flex align-items-center w-100">
                  <div className="dashboard-card-icon hcm-icon">
                    <FaBox className="text-primary" size={22} />
                  </div>
                  <div className="ms-3 text-start">
                    <h6 className="dashboard-card-title mb-1">HCM Food Items</h6>
                    <div className="dashboard-card-value">
                      {loading ? <Spinner animation="border" size="sm" /> : hcmFoodItemsCount}
                    </div>
                  </div>
                  <div className="ms-auto cdpo-expand-icon">
                    {expanded === 'hcm' ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </Card.Body>
              </Card>
              <Collapse in={expanded === 'hcm'}>
                <div className="mt-3">
                  <FoodItemTable scheme="hcm" api={api} />
                </div>
              </Collapse>
            </Col>
            <Col md={6}>
              <Card className="dashboard-card cdpo-expandable-card card-thr" onClick={() => handleCardClick('thr')} aria-expanded={expanded === 'thr'}>
                <Card.Body className="d-flex align-items-center w-100">
                  <div className="dashboard-card-icon thr-icon">
                    <FaBox className="text-secondary" size={22} />
                  </div>
                  <div className="ms-3 text-start">
                    <h6 className="dashboard-card-title mb-1">THR Food Items</h6>
                    <div className="dashboard-card-value">
                      {loading ? <Spinner animation="border" size="sm" /> : thrFoodItemsCount}
                    </div>
                  </div>
                  <div className="ms-auto cdpo-expand-icon">
                    {expanded === 'thr' ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </Card.Body>
              </Card>
              <Collapse in={expanded === 'thr'}>
                <div className="mt-3">
                  <FoodItemTable scheme="thr" api={api} />
                </div>
              </Collapse>
            </Col>
          </Row>

          <h4 className="cdpo-section-title">THR Distribution Summary</h4>
          <Row className="mb-4 g-3">
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
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
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-success bg-opacity-10">
                    <FaUserFriends className="text-success" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">THR Distribution</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : thrTotals.beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
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

          <h4 className="cdpo-section-title">HCM Distribution Summary</h4>
          <Row className="g-3">
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
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
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
                <Card.Body className="d-flex flex-column align-items-center justify-content-center p-2">
                  <div className="dashboard-card-icon bg-danger bg-opacity-10">
                    <FaUserFriends className="text-danger" size={22} />
                  </div>
                  <h6 className="dashboard-card-title mb-1">HCM Distribution</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : hcmTotals.beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={4}>
              <Card className="cdpo-summary-card">
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

export default CDPODashboard;