import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import "../../assets/css/directorleftnav.css";

import { FaUsers, FaUserFriends, FaBox, FaChevronDown, FaChevronUp, FaTruckLoading } from "react-icons/fa";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";



const ITCellDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();
  const { t } = useLanguage();
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
        api.get("/director/dashboard/hcm/"),
        api.get("/director/dashboard/thr/")
      ]);
      setHcmSummary(hcmRes.data);
      setThrSummary(thrRes.data);
    } catch (err) {
      setError(t("Failed to fetch dashboard summaries.", "डैशबोर्ड सारांश प्राप्त नहीं हो सका।"));
      console.error("Dashboard summary fetch error:", err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([fetchDashboardSummaries(), fetchHcmFoodItems(), fetchThrFoodItems()]);
    } catch (err) {
      setError(t("Failed to fetch Director dashboard data.", "डायरेक्टर डैशबोर्ड डेटा प्राप्त नहीं हो सका।"));
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
          setError(t(`Failed to fetch ${scheme.toUpperCase()} food items.`, `${scheme.toUpperCase()} खाद्य पदार्थ प्राप्त नहीं हो सके।`));
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchItems();
    }, [scheme, api, t]);

    if (loading) return <div className="text-center p-4"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;
    if (items.length === 0) return <div className="text-center p-4 text-muted">{t("No food items found.", "कोई खाद्य पदार्थ नहीं मिला।")}</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>{t("Food Item", "खाद्य पदार्थ")}</th>
              <th>{t("Quantity Per Beneficiary", "प्रति लाभार्थी मात्रा")}</th>
              <th>{t("Unit", "इकाई")}</th>
              <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
              <th>{t("Days Allotted", "आवंटित दिन")}</th>
              <th>{t("Total Quantity", "कुल मात्रा")}</th>
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
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">{t("No receiving records found.", "प्राप्ति रिकॉर्ड नहीं मिले।")}</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>{t("Quantity", "मात्रा")}</th>
              <th>{t("Unit", "इकाई")}</th>
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
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">{t("No distribution records found.", "वितरण रिकॉर्ड नहीं मिले।")}</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>{t("Total Beneficiaries", "कुल लाभार्थी")}</th>
              <th>{t("Total Quantity", "कुल मात्रा")}</th>
              <th>{t("Unit", "इकाई")}</th>
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
    if (!items || items.length === 0) return <div className="text-center p-4 text-muted">{t("No beneficiary summary found.", "लाभार्थी सारांश नहीं मिला।")}</div>;

    return (
      <div className="table-responsive food-item-table-container">
        <Table striped bordered hover responsive className="mb-0 food-item-table">
          <thead className="table-light sticky-top">
            <tr>
              <th>#</th>
              <th>{t("Category Name", "श्रेणी का नाम")}</th>
              <th>{t("Beneficiary Count", "लाभार्थी संख्या")}</th>
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
      <ITCellLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3"> 
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <div className="dashboard-section">
            <h4 className="section-title">{t("Food Items Overview", "खाद्य पदार्थों का अवलोकन")}</h4>
            <Row className="g-3">
              <Col md={6}>
                <Card className="dashboard-card card-hcm expandable-card" onClick={() => handleCardClick('hcm')}>
                  <Card.Body>
                    <div className=" d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">{t("HCM Food Items", "एचसीएम खाद्य पदार्थ")}</h6>
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
                        <h6 className="dashboard-card-title">{t("THR Food Items", "टीएचआर खाद्य पदार्थ")}</h6>
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
            <h4 className="section-title">{t("THR Distribution & Received Summary", "टीएचआर वितरण और प्राप्ति सारांश")}</h4>
            <Row className="g-3"> 
              <Col md={4} className="d-flex">
                <Card className="dashboard-card card-thr h-100" onClick={() => navigate('/ITCellTHRReport')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon thr-icon"><FaUserFriends /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">{t("THR Distribution", "टीएचआर वितरण")}</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : thrSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4} className="">
                <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-receiving')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaTruckLoading /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">{t("THR Received", "टीएचआर प्राप्त")}</h6>
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
              <Col md={4} className="">
                <Card className="dashboard-card card-thr expandable-card w-100" onClick={() => handleCardClick('thr-quantity')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">{t("THR Quantity Records", "टीएचआर मात्रा रिकॉर्ड")}</h6>
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
            <h4 className="section-title">{t("HCM Distribution & Received Summary", "एचसीएम वितरण और प्राप्ति सारांश")}</h4>
            <Row className="g-3"> 
              <Col md={4} className="d-flex">
                <Card className="dashboard-card card-hcm h-100" onClick={() => navigate('/ITCellHCMReport')}>
                  <Card.Body>
                    <div className="d-flex align-items-center w-100">
                      <div className="dashboard-card-icon hcm-icon"><FaUserFriends /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">{t("HCM Distribution", "एचसीएम वितरण")}</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : hcmSummary?.distribution_summary?.reduce((sum, item) => sum + (item.total_beneficiaries || 0), 0).toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-receiving')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaTruckLoading /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">{t("HCM Received", "एचसीएम प्राप्त")}</h6>
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
                <Card className="dashboard-card card-hcm expandable-card w-100" onClick={() => handleCardClick('hcm-quantity')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaBox /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title mb-1">{t("HCM Quantity Records", "एचसीएम मात्रा रिकॉर्ड")}</h6>
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

export default ITCellDashBoard;