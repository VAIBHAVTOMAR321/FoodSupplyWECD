import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../all_login/AuthContext";
import { Container, Table, Spinner, Alert, Tabs, Tab, Badge } from "react-bootstrap";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import "../../assets/css/DirectorFoodItems.css";

const FOOD_ITEMS_API =
  "https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/categoryandfooditem/";

const DirectorFoodItems = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();

  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFoodItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Use the authenticated API client from AuthContext. Its request
      // interceptor should attach the current Authorization: Bearer <token>.
      const response = await api.get(FOOD_ITEMS_API, {
        headers: { Accept: "application/json" },
      });
      const result = response?.data;

      if (result?.success !== true || !Array.isArray(result?.food_data)) {
        console.error("Unexpected categoryandfooditem API response:", result);
        throw new Error("API response में success=true और food_data array नहीं मिला।");
      }

      const normalizedItems = result.food_data
        .filter((item) => ["THR", "HCM"].includes(String(item?.category || "").trim().toUpperCase()))
        .map((item, index) => ({
          id: `${String(item.category).toUpperCase()}-${index}`,
          category: String(item.category || "").trim().toUpperCase(),
          food_item: String(item.food_item || "").trim(),
          beneficiary_category: String(item.beneficiary_category || "").trim(),
        }));

      setFoodItems(normalizedItems);
      if (normalizedItems.length === 0) {
        console.warn("categoryandfooditem API succeeded but returned no THR/HCM items.", result.food_data);
      }
    } catch (err) {
      console.error("Failed to fetch category and food items:", {
        status: err?.response?.status,
        response: err?.response?.data,
        message: err?.message,
      });
      setFoodItems([]);

      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError(`API access denied (HTTP ${status}). कृपया login/token permissions जाँचें।`);
      } else if (status) {
        setError(`खाद्य सामग्री प्राप्त नहीं हो सकी (HTTP ${status})। API response के लिए Console जाँचें।`);
      } else if (err?.message?.toLowerCase().includes("network")) {
        setError("API से कनेक्शन नहीं बन सका। यदि Console में CORS error है, तो backend में frontend domain को अनुमति देनी होगी।");
      } else {
        setError(err?.message || "खाद्य सामग्री प्राप्त नहीं हो सकी। API connection जाँचें और पुनः प्रयास करें।");
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchFoodItems();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchFoodItems]);

  const toggleSidebar = () => setSidebarOpen((previous) => !previous);

  const renderFoodItems = (category) => {
    const items = foodItems.filter((item) => item.category === category);

    if (loading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" />
          <div className="mt-2">खाद्य सामग्री लोड हो रही है...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="danger" className="mt-3">
          <div>{error}</div>
          <button className="btn btn-sm btn-outline-danger mt-2" onClick={fetchFoodItems}>
            पुनः प्रयास करें
          </button>
        </Alert>
      );
    }

    if (items.length === 0) {
      return <div className="empty-state mt-3">कोई {category} खाद्य सामग्री उपलब्ध नहीं है।</div>;
    }

    return (
      <div className="food-items-table-container mt-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="mb-0">{category} खाद्य सामग्री विवरण</h5>
          <Badge bg={category === "THR" ? "primary" : "success"}>
            कुल सामग्री: {items.length}
          </Badge>
        </div>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: "75px" }}>क्रम संख्या</th>
              <th>खाद्य सामग्री</th>
              <th>लाभार्थी श्रेणी</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.category}-${item.food_item}-${index}`}>
                <td>{index + 1}</td>
                <td>{item.food_item}</td>
                <td>{item.beneficiary_category}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
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
        <div className="food-items-container">
          <Container fluid className="dashboard-box food-items-content">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
              <h3 className="page-title-heading mb-0">THR एवं HCM खाद्य सामग्री</h3>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={fetchFoodItems}
                disabled={loading}
              >
                {loading ? "लोड हो रहा है..." : "डेटा रिफ्रेश करें"}
              </button>
            </div>
            <Tabs defaultActiveKey="HCM" id="food-items-tabs" className="mb-4 food-items-tabs">
              <Tab eventKey="HCM" title="HCM Food Items">
                {renderFoodItems("HCM")}
              </Tab>
              <Tab eventKey="THR" title="THR Food Items">
                {renderFoodItems("THR")}
              </Tab>
            </Tabs>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default DirectorFoodItems;
