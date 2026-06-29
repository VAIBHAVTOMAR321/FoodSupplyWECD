import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Collapse } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaUsers, FaUserFriends, FaBox, FaChevronDown, FaChevronUp } from "react-icons/fa";

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

  const FoodItemTable = ({
    scheme,
    api
  }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchItems = async () => {
        setLoading(true);
        setError("");
        try {
          const response = await api.get(`/${scheme}-food-items/`);
          const data = Array.isArray(response.data) ? response.data : response.data ?.data || [];
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
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Food Item</th>
              <th>Quantity Per Beneficiary</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.food_item}</td>
                <td>{item.qty_per_ben}</td>
                <td>{item.unit}</td>
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
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {/* <div className="dashboard-header-section">
            <h2 className="dashboard-main-title">
              DPO Dashboard
            </h2>
            <p className="dashboard-subtitle">Welcome! Here's a summary of the distribution activities.</p>
          </div> */}

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <div className="dashboard-section">
            <h4 className="section-title">Food Items Overview</h4>
            <Row className="g-3">
              <Col md={6}>
                <Card className="dashboard-card card-hcm expandable-card" onClick={() => handleCardClick('hcm')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">HCM Food Items</h6>
                        <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmFoodItemsCount}</div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'hcm' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
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
                <Card className="dashboard-card card-thr expandable-card" onClick={() => handleCardClick('thr')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">THR Food Items</h6>
                        <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrFoodItemsCount}</div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'thr' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
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
          </div>

          <div className="dashboard-section">
            <h4 className="section-title">THR Distribution Summary</h4>
            <Row className="g-3">
              <Col md={4}>
                <Card className="dashboard-card card-thr">
                  <Card.Body>
                    <div className="dashboard-card-icon thr-icon"><FaUsers /></div>
                    <h6 className="dashboard-card-title">THR Registrations</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrTotalRegistrations}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-thr">
                  <Card.Body>
                    <div className="dashboard-card-icon thr-icon"><FaUserFriends /></div>
                    <h6 className="dashboard-card-title">THR Beneficiaries</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrTotals.beneficiaries.toLocaleString()}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-thr">
                  <Card.Body>
                    <div className="dashboard-card-icon thr-icon"><FaBox /></div>
                    <h6 className="dashboard-card-title">THR Quantity</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : thrTotals.quantity.toFixed(2)}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          <div className="dashboard-section">
            <h4 className="section-title">HCM Distribution Summary</h4>
            <Row className="g-3">
              <Col md={4}>
                <Card className="dashboard-card card-hcm">
                  <Card.Body>
                    <div className="dashboard-card-icon hcm-icon"><FaUsers /></div>
                    <h6 className="dashboard-card-title">HCM Registrations</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmTotalRegistrations}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-hcm">
                  <Card.Body>
                    <div className="dashboard-card-icon hcm-icon"><FaUserFriends /></div>
                    <h6 className="dashboard-card-title">HCM Beneficiaries</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmTotals.beneficiaries.toLocaleString()}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-hcm">
                  <Card.Body>
                    <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                    <h6 className="dashboard-card-title">HCM Quantity</h6>
                    <div className="dashboard-card-value">{loading ? <Spinner animation="border" size="sm" /> : hcmTotals.quantity.toFixed(2)}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

        </Container>
      </div>
    </div>
  );
};

export default DPODashboard;