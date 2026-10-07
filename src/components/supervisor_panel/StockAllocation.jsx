import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Container, Spinner, Table } from "react-bootstrap";
import { FaBoxes } from "react-icons/fa";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dashboard.css";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";

const excludedFields = new Set(["id", "created_at", "updated_at"]);

const getArrayPayload = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

const StockAllocation = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStockAllocation = useCallback(async () => {
    if (!api) return;

    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-supervisor/");
      const payload = response.data;
      if (payload?.success === false) {
        setError("The stock allocation API returned an unsuccessful response.");
        setAllocations([]);
      } else {
        setAllocations(getArrayPayload(response));
      }
    } catch (fetchError) {
      setError("Failed to fetch stock allocation data.");
      setAllocations([]);
      console.error("Failed to fetch stock allocation data:", fetchError);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchStockAllocation();
  }, [fetchStockAllocation]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns = useMemo(() => {
    const fields = new Set();
    allocations.forEach((item) => {
      Object.keys(item).forEach((field) => {
        if (!excludedFields.has(field)) fields.add(field);
      });
    });
    return [...fields];
  }, [allocations]);

  const formatHeader = (field) =>
    field
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());

  const toggleSidebar = () => setSidebarOpen((open) => !open);

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
          <h3 className="mb-4">
            <FaBoxes className="me-2" /> Stock Allocation
          </h3>
          {error && <Alert variant="danger">{error}</Alert>}
          {loading ? (
            <div className="text-center p-4"><Spinner animation="border" role="status" /></div>
          ) : (
            <div className="table-responsive">
              <Table bordered hover responsive className="align-middle">
                <thead>
                  <tr>{columns.map((field) => <th key={field}>{formatHeader(field)}</th>)}</tr>
                </thead>
                <tbody>
                  {allocations.length ? allocations.map((allocation, index) => {
                    return (
                      <tr key={`${allocation.awc_code || allocation.awc_name || "allocation"}-${allocation.month || ""}-${index}`}>
                        {columns.map((field) => (
                          <td key={field}>{allocation[field] ?? "—"}</td>
                        ))}
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={Math.max(columns.length, 1)} className="text-center">
                        No stock allocation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default StockAllocation;
