
import React, { useState, useEffect, useCallback } from "react";
import { Container, Spinner, Table, Alert, Tabs, Tab } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaBox } from "react-icons/fa";
import "../../assets/css/DirectorFoodItems.css";

const DirectorFoodItems = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  const { api } = useAuth();

  const [hcmItems, setHcmItems] = useState([]);
  const [thrItems, setThrItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFoodData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/categoryandfooditem/");
      const data = response.data?.food_data || [];
      
      // Separate items based on category
      const hcm = data.filter(item => item.category === "HCM");
      const thr = data.filter(item => item.category === "THR");
      
      setHcmItems(hcm);
      setThrItems(thr);
    } catch (err) {
      setError("Failed to fetch food items data.");
      console.error("Fetch food items error:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchFoodData();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchFoodData]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const renderTable = (scheme, items) => (
    <div className="food-items-table-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{scheme.toUpperCase()} खाद्य सामग्री विवरण</h5>
      </div>
      {loading ? (
        <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
      ) : error ? (
        <Alert variant="danger">{error}</Alert>
      ) : items.length === 0 ? (
        <div className="empty-state text-center p-4 text-muted">No items found for {scheme.toUpperCase()}.</div>
      ) : (
        <Table striped bordered hover responsive className="align-middle">
          <thead>
            <tr>
              <th>#</th>
              <th>Food Item</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td><strong>{item.food_item}</strong></td>
                <td><span className="badge bg-info text-dark">{item.category}</span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );

  return (
    <div className="dashboard-container">
      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        <div className="food-items-container">
          <Container fluid className="dashboard-box food-items-content">
            <div className="d-flex align-items-center mb-4">
              <FaBox size={28} className="me-3 text-primary" />
              <h3 className="page-title-heading mb-0">THR एवं HCM खाद्य सामग्री</h3>
            </div>
            
            <Tabs defaultActiveKey="hcm" id="food-items-tabs" className="mb-4 food-items-tabs">
              <Tab eventKey="hcm" title="HCM Food Items">
                {renderTable('hcm', hcmItems)}
              </Tab>
              <Tab eventKey="thr" title="THR Food Items">
                {renderTable('thr', thrItems)}
              </Tab>
            </Tabs>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default DirectorFoodItems;
