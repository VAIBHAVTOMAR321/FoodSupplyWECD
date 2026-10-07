import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Container,
  Spinner,
  Table,
  Row,
  Col,
  Form,
  Dropdown,
  Button,
  InputGroup,
} from "react-bootstrap";
import { FaBoxes, FaSearch } from "react-icons/fa";
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
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState({
    awc_name: [],
    awc_code: [],
    month: [],
  });

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

  const uniqueValues = useMemo(() => {
    const values = {
      awc_name: [...new Set(allocations.map((item) => item.awc_name).filter(Boolean))].sort(),
      awc_code: [...new Set(allocations.map((item) => item.awc_code).filter(Boolean))].sort(),
      month: [...new Set(allocations.map((item) => item.month).filter(Boolean))].sort(),
    };
    return values;
  }, [allocations]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const resetFilters = () => {
    setFilters({
      awc_name: [],
      awc_code: [],
      month: [],
    });
    setSearchText("");
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const searchMatch =
        !searchText ||
        (item.awc_name && String(item.awc_name).toLowerCase().includes(searchText.toLowerCase())) ||
        (item.awc_code && String(item.awc_code).toLowerCase().includes(searchText.toLowerCase()));

      const awcNameMatch = filters.awc_name.length === 0 || filters.awc_name.includes(String(item.awc_name));
      const awcCodeMatch = filters.awc_code.length === 0 || filters.awc_code.includes(String(item.awc_code));
      const monthMatch = filters.month.length === 0 || filters.month.includes(String(item.month));

      return searchMatch && awcNameMatch && awcCodeMatch && monthMatch;
    });
  }, [allocations, filters, searchText]);

  const columns = useMemo(() => {
    const fields = new Set();
    filteredAllocations.forEach((item) => {
      Object.keys(item).forEach((field) => {
        if (!excludedFields.has(field)) fields.add(field);
      });
    });
    return [...fields];
  }, [filteredAllocations]);

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

          <Row className="mb-3 g-2 align-items-center">
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  {filters.awc_name.length ? `${filters.awc_name.length} selected` : "All AWC Names"}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {uniqueValues.awc_name.map((v) => (
                    <Dropdown.Item key={v} as="div">
                      <Form.Check
                        type="checkbox"
                        label={v}
                        checked={filters.awc_name.includes(v)}
                        onChange={() => handleMultiSelectChange("awc_name", v)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  {filters.awc_code.length ? `${filters.awc_code.length} selected` : "All AWC Codes"}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {uniqueValues.awc_code.map((v) => (
                    <Dropdown.Item key={v} as="div">
                      <Form.Check
                        type="checkbox"
                        label={v}
                        checked={filters.awc_code.includes(v)}
                        onChange={() => handleMultiSelectChange("awc_code", v)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={3}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  {filters.month.length ? `${filters.month.length} selected` : "All Months"}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {uniqueValues.month.map((v) => (
                    <Dropdown.Item key={v} as="div">
                      <Form.Check
                        type="checkbox"
                        label={v}
                        checked={filters.month.includes(v)}
                        onChange={() => handleMultiSelectChange("month", v)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by AWC Name or Code"
                  value={searchText}
                  onChange={handleSearchChange}
                />
              </InputGroup>
            </Col>
            <Col xs="auto">
              <Button variant="secondary" onClick={resetFilters}>
                Reset Filters
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center p-4"><Spinner animation="border" role="status" /></div>
          ) : (
            <div className="table-responsive">
              <Table bordered hover responsive className="align-middle">
                <thead>
                  <tr>{columns.map((field) => <th key={field}>{formatHeader(field)}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredAllocations.length ? filteredAllocations.map((allocation, index) => {
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
