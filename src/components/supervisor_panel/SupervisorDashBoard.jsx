import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, ButtonGroup, Card, Col, Container, Row, Spinner, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import "../../assets/css/supervisorleftnav.css";
import SupervisorHeader from "./SupervisorHeader";
import SupervisorLeftNav from "./SupervisorLeftNav";
import {
  FaBox,
  FaBoxes,
  FaChartBar,
  FaFileAlt,
  FaSyncAlt,
  FaTruckLoading,
  FaUserFriends,
  FaUsers,
  FaUtensils,
  FaWarehouse,
} from "react-icons/fa";

const getArrayPayload = (response) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatCount = (value) => (Number(value) || 0).toLocaleString();

const getTotal = (items, key) =>
  (Array.isArray(items) ? items : []).reduce((total, item) => total + (Number(item?.[key]) || 0), 0);

const DistributionSummaryTable = ({ items, loading }) => (
  <div className="dpo-table-wrapper">
    <Table hover className="dpo-data-table mb-0">
      <thead>
        <tr>
          <th>#</th>
          <th className="text-end">Total Beneficiaries</th>
          <th className="text-end">Total Quantity</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={4} className="text-center p-4"><Spinner animation="border" size="sm" /></td></tr>
        ) : items.length === 0 ? (
          <tr><td colSpan={4} className="text-center p-4 text-muted">No distribution records found.</td></tr>
        ) : items.map((item, index) => (
          <tr key={`${item.unit || "unit"}-${index}`}>
            <td>{index + 1}</td>
            <td className="text-end">{formatCount(item.total_beneficiaries)}</td>
            <td className="text-end">{formatCount(item.total_quantity)}</td>
            <td>{item.unit || "—"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

const ReceivingSummaryTable = ({ items, loading }) => (
  <div className="dpo-table-wrapper">
    <Table hover className="dpo-data-table mb-0">
      <thead>
        <tr>
          <th>#</th>
          <th className="text-end">Quantity Received</th>
          <th>Unit</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan={3} className="text-center p-4"><Spinner animation="border" size="sm" /></td></tr>
        ) : items.length === 0 ? (
          <tr><td colSpan={3} className="text-center p-4 text-muted">No receiving records found.</td></tr>
        ) : items.map((item, index) => (
          <tr key={`${item.unit || "unit"}-${index}`}>
            <td>{index + 1}</td>
            <td className="text-end">{formatCount(item.total_quantity)}</td>
            <td>{item.unit || "—"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

const SupervisorDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hcmSummary, setHcmSummary] = useState(null);
  const [thrSummary, setThrSummary] = useState(null);
  const [hcmFoodItems, setHcmFoodItems] = useState([]);
  const [thrFoodItems, setThrFoodItems] = useState([]);
  const [awcCount, setAwcCount] = useState(0);
  const [foodItemsTab, setFoodItemsTab] = useState("hcm");

  const navigate = useNavigate();
  const { api } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!api) return;

    setLoading(true);
    setError("");
    const requests = await Promise.allSettled([
      api.get("/supervisor/dashboard-hcm/"),
      api.get("/supervisor/dashboard-thr/"),
      api.get("/hcm-food-items/"),
      api.get("/thr-food-items/"),
      api.get("/sector-awc-dropdown/"),
    ]);

    const [hcm, thr, hcmItems, thrItems, awcs] = requests;
    let failed = false;

    if (hcm.status === "fulfilled") setHcmSummary(hcm.value.data);
    else {
      failed = true;
      console.error("Failed to fetch HCM dashboard summary:", hcm.reason);
    }

    if (thr.status === "fulfilled") setThrSummary(thr.value.data);
    else {
      failed = true;
      console.error("Failed to fetch THR dashboard summary:", thr.reason);
    }

    if (hcmItems.status === "fulfilled") setHcmFoodItems(getArrayPayload(hcmItems.value));
    else {
      failed = true;
      console.error("Failed to fetch HCM food items:", hcmItems.reason);
    }

    if (thrItems.status === "fulfilled") setThrFoodItems(getArrayPayload(thrItems.value));
    else {
      failed = true;
      console.error("Failed to fetch THR food items:", thrItems.reason);
    }

    if (awcs.status === "fulfilled") {
      const data = awcs.value.data;
      setAwcCount(Number(data?.count) || (Array.isArray(data?.data) ? data.data.length : 0));
    } else {
      failed = true;
      console.error("Failed to fetch AWC count:", awcs.reason);
    }

    if (failed) setError("Some dashboard information could not be loaded. Please refresh and try again.");
    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const hcmDistributions = Array.isArray(hcmSummary?.distribution_summary) ? hcmSummary.distribution_summary : [];
  const thrDistributions = Array.isArray(thrSummary?.distribution_summary) ? thrSummary.distribution_summary : [];
  const hcmReceipts = Array.isArray(hcmSummary?.receiving_summary) ? hcmSummary.receiving_summary : [];
  const thrReceipts = Array.isArray(thrSummary?.receiving_summary) ? thrSummary.receiving_summary : [];
  const foodItems = foodItemsTab === "hcm" ? hcmFoodItems : thrFoodItems;

  const stats = [
    { label: "HCM Beneficiaries", value: getTotal(hcmDistributions, "total_beneficiaries"), icon: <FaUserFriends /> },
    { label: "THR Beneficiaries", value: getTotal(thrDistributions, "total_beneficiaries"), icon: <FaUserFriends /> },
    { label: "HCM Distribution Records", value: hcmDistributions.length, icon: <FaChartBar /> },
    { label: "THR Distribution Records", value: thrDistributions.length, icon: <FaChartBar /> },
    { label: "HCM Received Records", value: hcmReceipts.length, icon: <FaTruckLoading /> },
    { label: "THR Received Records", value: thrReceipts.length, icon: <FaTruckLoading /> },
  ];

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
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <div className="dashboard-header-section">
            <div>
              <h4 className="dashboard-main-title"><FaBoxes /> Supervisor Dashboard</h4>
              <p className="dashboard-subtitle">
                Overview of HCM and THR distribution, receiving, food items, and assigned AWCs.
              </p>
            </div>
            <Button className="dpo-btn-light" onClick={fetchAllData} disabled={loading}>
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          <Row className="g-3 mb-3">
            <Col xs={12} md={4}>
              <Card className="dpo-table-card h-100 mb-0">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded" style={{ width: 42, height: 42, background: "rgba(255, 193, 7, 0.12)", color: "#b58100" }}>
                    <FaBox />
                  </div>
                  <div>
                    <div className="small text-uppercase text-muted fw-bold">HCM Food Items</div>
                    <div className="fs-4 fw-bold">{loading ? <Spinner animation="border" size="sm" /> : formatCount(hcmFoodItems.length)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card className="dpo-table-card h-100 mb-0">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded" style={{ width: 42, height: 42, background: "rgba(13, 202, 240, 0.12)", color: "#0786a0" }}>
                    <FaBox />
                  </div>
                  <div>
                    <div className="small text-uppercase text-muted fw-bold">THR Food Items</div>
                    <div className="fs-4 fw-bold">{loading ? <Spinner animation="border" size="sm" /> : formatCount(thrFoodItems.length)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} md={4}>
              <Card
                className="dpo-table-card h-100 mb-0"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/AwcAganWadi")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") navigate("/AwcAganWadi");
                }}
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div className="d-flex align-items-center justify-content-center rounded" style={{ width: 42, height: 42, background: "rgba(111, 66, 193, 0.12)", color: "#6f42c1" }}>
                    <FaUsers />
                  </div>
                  <div>
                    <div className="small text-uppercase text-muted fw-bold">Assigned AWCs</div>
                    <div className="fs-4 fw-bold">{loading ? <Spinner animation="border" size="sm" /> : formatCount(awcCount)}</div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="dpo-stat-strip">
            {stats.map((stat) => (
              <div key={stat.label} className="dpo-stat-pill">
                <span className="dpo-stat-pill-icon">{stat.icon}</span>
                <span className="dpo-stat-pill-label">{stat.label}</span>
                <span className="dpo-stat-pill-value">{loading ? "—" : formatCount(stat.value)}</span>
              </div>
            ))}
          </div>

          <Row className="g-3">
            {[
              {
                label: "HCM",
                summary: hcmSummary,
                distributions: hcmDistributions,
                receipts: hcmReceipts,
                distributionRoute: "/HcmSupervisorDistributions",
                receivingRoute: "/HcmSupervisorReceiving",
              },
              {
                label: "THR",
                summary: thrSummary,
                distributions: thrDistributions,
                receipts: thrReceipts,
                distributionRoute: "/thr-supervisor-distributions",
                receivingRoute: "/ThrSupervisorReceiving",
              },
            ].map((scheme) => (
              <Col key={scheme.label} xs={12} xl={6}>
                <Card className="dpo-table-card h-100">
                  <Card.Header className="dpo-table-header">
                    <h5 className="dpo-section-title"><FaWarehouse /> {scheme.label} Distribution &amp; Receiving</h5>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button variant="outline-primary" size="sm" onClick={() => navigate(scheme.distributionRoute)}>
                        <FaFileAlt className="me-1" /> View distributions
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => navigate(scheme.receivingRoute)}>
                        <FaTruckLoading className="me-1" /> View receiving
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <div className="px-3 pt-3 pb-2 fw-bold text-secondary small text-uppercase">Distribution Summary</div>
                    <DistributionSummaryTable items={scheme.distributions} loading={loading && !scheme.summary} />
                    <div className="px-3 pt-3 pb-2 fw-bold text-secondary small text-uppercase">Received Summary</div>
                    <ReceivingSummaryTable items={scheme.receipts} loading={loading && !scheme.summary} />
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="dpo-table-card mt-3">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title"><FaUtensils /> Food Items Overview</h5>
              <ButtonGroup className="dpo-toggle-group" aria-label="Food item scheme">
                <Button
                  className={`dpo-toggle-btn ${foodItemsTab === "hcm" ? "active" : ""}`}
                  onClick={() => setFoodItemsTab("hcm")}
                >
                  HCM ({formatCount(hcmFoodItems.length)})
                </Button>
                <Button
                  className={`dpo-toggle-btn ${foodItemsTab === "thr" ? "active" : ""}`}
                  onClick={() => setFoodItemsTab("thr")}
                >
                  THR ({formatCount(thrFoodItems.length)})
                </Button>
              </ButtonGroup>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? (
                  <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                ) : foodItems.length === 0 ? (
                  <div className="text-center p-5 text-muted">No {foodItemsTab.toUpperCase()} food items found.</div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Food Item</th>
                        <th className="text-end">Quantity Per Beneficiary</th>
                        <th>Unit</th>
                        <th>Beneficiary Category</th>
                        <th className="text-end">Days Allotted</th>
                        <th className="text-end">Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodItems.map((item, index) => (
                        <tr key={item.id ?? `${item.food_item || "food-item"}-${index}`}>
                          <td>{index + 1}</td>
                          <td>{item.food_item || "—"}</td>
                          <td className="text-end">{item.qty_per_ben ?? "—"}</td>
                          <td>{item.unit || "—"}</td>
                          <td>{item.bene_category || "—"}</td>
                          <td className="text-end">{item.days_allotted ?? "—"}</td>
                          <td className="text-end">{item.total_quantity ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default SupervisorDashBoard;
