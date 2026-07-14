import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table, Button, ButtonGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/directorleftnav.css";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { FaUserShield, FaUserGraduate, FaUserCog, FaUserTie, FaHome, FaUserFriends, FaBox, FaChevronDown, FaChevronUp, FaTruckLoading } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const DirectorDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hcmSummary, setHcmSummary] = useState(null);
  const [thrSummary, setThrSummary] = useState(null);
  const [hcmFoodItemsCount, setHcmFoodItemsCount] = useState(0);
  const [thrFoodItemsCount, setThrFoodItemsCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState({
    dpo: 0,
    cdpo: 0,
    supervisor: 0,
    anganwadi: 0,
  });
  const [loadingRoles, setLoadingRoles] = useState({
    dpo: true,
    cdpo: true,
    supervisor: true,
    anganwadi: true,
  });
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("card");

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
        api.get("/director/dashboard/hcm/"),
        api.get("/director/dashboard/thr/")
      ]);
      setHcmSummary(hcmRes.data);
      setThrSummary(thrRes.data);
    } catch (err) {
      setError("Failed to fetch dashboard summaries.");
      console.error("Dashboard summary fetch error:", err);
    }
  };

  const fetchRoleCount = async (role, endpoint) => {
    setLoadingRoles(prev => ({ ...prev, [role]: true }));
    try {
      const response = await api.get(endpoint);
      let data = response.data?.data || [];
      if (role === 'dpo') {
        data = data.filter(u => u.role === 'dpo');
      }
      setRoleCounts(prev => ({ ...prev, [role]: data.length }));
    } catch (err) {
      console.error(`Failed to fetch ${role} count:`, err);
      // Optionally set an error state for this specific card
    } finally {
      setLoadingRoles(prev => ({ ...prev, [role]: false }));
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError("");

    // Fetch role counts independently
    fetchRoleCount('dpo', '/director/districts/');
    fetchRoleCount('cdpo', '/director/projects/');
    fetchRoleCount('supervisor', '/director/sectors/');
    fetchRoleCount('anganwadi', '/director/awc-list/');

    // Fetch other dashboard data
    try {
      await Promise.all([
        fetchDashboardSummaries(), 
        fetchHcmFoodItems(), 
        fetchThrFoodItems()
      ]);
    } catch (err) {
      setError("Failed to fetch Director dashboard data.");
      console.error(err);
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



  const thrSummaryChartData = useMemo(() => ({
    labels: ["Beneficiaries", "Received Qty", "Distributed Qty"],
    datasets: [
      {
        label: "THR Summary",
        data: [
          thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0,
          thrSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
          thrSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
        ],
        backgroundColor: ["#ff8c00", "#dc3545", "#6f42c1"],
        borderRadius: 6,
      },
    ],
  }), [thrSummary]);

  const hcmSummaryChartData = useMemo(() => ({
    labels: ["Beneficiaries", "Received Qty", "Distributed Qty"],
    datasets: [
      {
        label: "HCM Summary",
        data: [
          hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0,
          hcmSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
          hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0,
        ],
        backgroundColor: ["#20c997", "#0dcaf0", "#fd7e14"],
        borderRadius: 6,
      },
    ],
  }), [hcmSummary]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  return (
    <div className="dashboard-container">
      <DirectorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3"> 
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <div className="d-flex justify-content-end mb-3">
            <ButtonGroup size="sm">
              <Button variant={viewMode === "card" ? "primary" : "outline-primary"} onClick={() => setViewMode("card")}>Card View</Button>
              <Button variant={viewMode === "graph" ? "primary" : "outline-primary"} onClick={() => setViewMode("graph")}>Graph View</Button>
            </ButtonGroup>
          </div>

          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">User Lists Overview</h4>
            </div>
            <Row className="g-3">
              <Col md={3}>
                <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/DirectorAwcList?tab=dpo')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon hcm-icon"><FaUserCog /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">DPO List</h6>
                        <div className="dashboard-card-value">{loadingRoles.dpo ? <Spinner animation="border" size="sm" /> : roleCounts.dpo}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/DirectorAwcList?tab=cdpo')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon thr-icon"><FaUserShield /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">CDPO List</h6>
                        <div className="dashboard-card-value">{loadingRoles.cdpo ? <Spinner animation="border" size="sm" /> : roleCounts.cdpo}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/DirectorAwcList?tab=supervisor')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon hcm-icon"><FaUserTie /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">Supervisor List</h6>
                        <div className="dashboard-card-value">{loadingRoles.supervisor ? <Spinner animation="border" size="sm" /> : roleCounts.supervisor}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/DirectorAwcList?tab=anganwadi')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon thr-icon"><FaHome /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">Anganwadi List</h6>
                        <div className="dashboard-card-value">{loadingRoles.anganwadi ? <Spinner animation="border" size="sm" /> : roleCounts.anganwadi}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">Food Items Overview</h4>
            </div>
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
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">THR Distribution & Received Summary</h4>
            </div>
            {viewMode === "graph" ? (
              <Row className="g-3">
                <Col xs={12}>
                  <div className="w-100">
                    <div className="mb-3 text-center">
                      <strong>Distribution Beneficiaries:</strong> {thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0} · <strong>Total Received Quantity:</strong> {thrSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0} · <strong>Total Distributed Quantity:</strong> {thrSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0}
                    </div>
                    <Row className="g-4 align-items-start">
                      <Col lg={8}>
                        <Row className="g-3">
                          <Col xs={12}>
                            <h6 className="text-center text-muted">THR Receiving Summary</h6>
                            <ReceivingTable items={thrSummary?.receiving_summary} />
                          </Col>
                          <Col xs={12}>
                            <h6 className="text-center text-muted mt-3">THR Distribution Summary</h6>
                            <DistributionTable items={thrSummary?.distribution_summary} />
                          </Col>
                        </Row>
                      </Col>
                      <Col lg={4}>
                        <div style={{ height: 320 }}>
                          <Bar data={thrSummaryChartData} options={chartOptions} />
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            ) : (
              <Row className="g-3"> 
                <Col md={4} className="d-flex">
                  <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/THRDirectorReport')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon thr-icon"><FaUserFriends /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">THR Distribution</h6>
                          <div className="dashboard-card-value">
                            {loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-receiving')}>
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
                  <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-quantity')}>
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
            )}
          </div>
          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="section-title mb-0">HCM Distribution & Received Summary</h4>
            </div>
            {viewMode === "graph" ? (
              <Row className="g-3">
                <Col xs={12}>
                  <div className="w-100">
                    <div className="mb-3 text-center">
                      <strong>Distribution Beneficiaries:</strong> {hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0) || 0} · <strong>Total Received Quantity:</strong> {hcmSummary?.receiving_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0} · <strong>Total Distributed Quantity:</strong> {hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (parseFloat(item.total_quantity) || 0), 0) || 0}
                    </div>
                    <Row className="g-4 align-items-start">
                      <Col lg={8}>
                        <Row className="g-3">
                          <Col xs={12}>
                            <h6 className="text-center text-muted">HCM Receiving Summary</h6>
                            <ReceivingTable items={hcmSummary?.receiving_summary} />
                          </Col>
                          <Col xs={12}>
                            <h6 className="text-center text-muted mt-3">HCM Distribution Summary</h6>
                            <DistributionTable items={hcmSummary?.distribution_summary} />
                          </Col>
                        </Row>
                      </Col>
                      <Col lg={4}>
                        <div style={{ height: 320 }}>
                          <Bar data={hcmSummaryChartData} options={chartOptions} />
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Col>
              </Row>
            ) : (
              <Row className="g-3"> 
                <Col md={4} className="d-flex">
                  <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/HCMDirectorReport')}>
                    <Card.Body>
                      <div className="d-flex align-items-center w-100">
                        <div className="dashboard-card-icon hcm-icon"><FaUserFriends /></div>
                        <div className="ms-3 text-start">
                          <h6 className="dashboard-card-title mb-1">HCM Distribution</h6>
                          <div className="dashboard-card-value">
                            {loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4} >
                  <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-receiving')}>
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
                <Col md={4} >
                  <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-quantity')}>
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
            )}
          </div>
        </Container>
      </div>
    </div>
  );
};

export default DirectorDashboard;