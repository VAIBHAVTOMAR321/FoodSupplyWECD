import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/supervisorleftnav.css";
import SupervisorHeader from "./SupervisorHeader";
import SupervisorLeftNav from "./SupervisorLeftNav";
import { FaUsers, FaUserFriends, FaBox, FaChevronDown, FaChevronUp, FaTruckLoading } from "react-icons/fa";

const SupervisorDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hcmSummary, setHcmSummary] = useState(null);
  const [thrSummary, setThrSummary] = useState(null);
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

  const fetchDashboardSummaries = async () => {
    try {
      const [hcmRes, thrRes] = await Promise.all([
        api.get("/supervisor/dashboard-hcm/"),
        api.get("/supervisor/dashboard-thr/")
      ]);
      setHcmSummary(hcmRes.data);
      setThrSummary(thrRes.data);
    } catch (err) {
      setError("Failed to fetch dashboard summaries.");
      console.error("Dashboard summary fetch error:", err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchDashboardSummaries(), fetchHcmFoodItems(), fetchThrFoodItems()]);
    } catch (err) {
      setError("Failed to fetch supervisor distributions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchAllData();
    }
  }, [api]);
 
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  const ReceivingTable = ({ items }) => {
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No receiving records found.</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.total_quantity}</td>
                <td>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const DistributionTable = ({ items }) => {
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No distribution records found.</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Total Beneficiaries</th>
              <th>Total Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{item.total_beneficiaries}</td>
                <td>{item.total_quantity}</td>
                <td>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const BeneficiarySummaryTable = ({ items }) => {
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">No beneficiary summary found.</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>Category Name</th>
              <th>Beneficiary Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.category_id}>
                <td>{index + 1}</td>
                <td>{item.category_name}</td>
                <td>{item.beneficiary_count}</td>
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
              Supervisor Dashboard
            </h3>
          </div>

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
                <Card className="dashboard-card card-thr" onClick={() => navigate('/thr-supervisor-distributions')}>
                  <Card.Body>
                    <div className="dashboard-card-icon thr-icon"><FaUserFriends /></div>
                  <h6 className="dashboard-card-title mb-1">THR Distribution</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                  </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-thr expandable-card" onClick={() => handleCardClick('thr-receiving')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaTruckLoading /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">THR Received</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : 
                            thrSummary?.receiving_summary?.length || 0
                          }
                        </div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'thr-receiving' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Collapse in={expanded === 'thr-receiving'}>
                  <div className="mt-3">
                    <ReceivingTable items={thrSummary?.receiving_summary} />
                  </div>
                </Collapse>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-thr expandable-card" onClick={() => handleCardClick('thr-quantity')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">THR Quantity Records</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.length || 0}
                        </div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'thr-quantity' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Collapse in={expanded === 'thr-quantity'}>
                  <div className="mt-3">
                    <DistributionTable items={thrSummary?.distribution_summary} />
                  </div>
                </Collapse>
              </Col>
            </Row>
          </div>
          <div className="dashboard-section">
            <h4 className="section-title">HCM Distribution Summary</h4>
            <Row className="g-3">
              <Col md={4}>
                <Card className="dashboard-card card-hcm" onClick={() => navigate('/HcmSupervisorDistributions')}>
                  <Card.Body>
                    <div className="dashboard-card-icon hcm-icon"><FaUserFriends /></div>
                  <h6 className="dashboard-card-title mb-1">HCM Distribution</h6>
                  <div className="dashboard-card-value">
                    {loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                  </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-hcm expandable-card" onClick={() => handleCardClick('hcm-receiving')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaTruckLoading /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">HCM Received</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : 
                            hcmSummary?.receiving_summary?.length || 0
                          }
                        </div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'hcm-receiving' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Collapse in={expanded === 'hcm-receiving'}>
                  <div className="mt-3">
                    <ReceivingTable items={hcmSummary?.receiving_summary} />
                  </div>
                </Collapse>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-hcm expandable-card" onClick={() => handleCardClick('hcm-quantity')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">HCM Quantity Records</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.length || 0}
                        </div>
                      </div>
                      <div className="ms-auto expand-icon">
                        {expanded === 'hcm-quantity' ? <FaChevronUp /> : <FaChevronDown />}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
                <Collapse in={expanded === 'hcm-quantity'}>
                  <div className="mt-3">
                    <DistributionTable items={hcmSummary?.distribution_summary} />
                  </div>
                </Collapse>
              </Col>
            </Row>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default SupervisorDashBoard;