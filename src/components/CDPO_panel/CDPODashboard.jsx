import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Collapse, Table, Form, Dropdown, Button, ButtonGroup, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { FaUsers, FaUserFriends, FaBox, FaChevronDown, FaChevronUp, FaTruckLoading, FaFilter, FaTimes, FaSearch, FaWarehouse } from "react-icons/fa";

const CDPODashboard = () => {
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
  const [awcCount, setAwcCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [expanded, setExpanded] = useState(null);

  // Reconciliation data states
  const [hcmReconciliation, setHcmReconciliation] = useState(null);
  const [thrReconciliation, setThrReconciliation] = useState(null);
  const [hcmReconciliationLoading, setHcmReconciliationLoading] = useState(false);
  const [thrReconciliationLoading, setThrReconciliationLoading] = useState(false);
  const [hcmReconciliationError, setHcmReconciliationError] = useState("");
  const [thrReconciliationError, setThrReconciliationError] = useState("");
  
  // Filter states
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [reconciliationTab, setReconciliationTab] = useState("hcm");

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

  const fetchCdpoAwcCount = async () => {
    try {
      const response = await api.get("/cdpo-awc-dropdown/");
      const data = response.data;
      setAwcCount(data?.count ?? (Array.isArray(data?.data) ? data.data.length : 0));
    } catch (err) {
      console.error("Failed to fetch CDPO AWC count:", err);
    }
  };

  const fetchCdpoSectorCount = async () => {
    try {
      const response = await api.get("/cdpo-sector/");
      const data = response.data;
      setSectorCount(data?.count ?? (Array.isArray(data?.data) ? data.data.length : 0));
    } catch (err) {
      console.error("Failed to fetch CDPO sector count:", err);
    }
  };

  const fetchDashboardSummaries = async () => {
    try {
      const [hcmRes, thrRes] = await Promise.all([ 
        api.get("/cdpo/dashboard/hcm/"),
        api.get("/cdpo/dashboard/thr/")
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
      await Promise.all([
        fetchDashboardSummaries(),
        fetchHcmFoodItems(),
        fetchThrFoodItems(),
        fetchCdpoAwcCount(),
        fetchCdpoSectorCount(),
      ]);
    } catch (err) {
      setError("Failed to fetch supervisor distributions.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch reconciliation data for HCM and THR
  const fetchReconciliationData = useCallback(async (type) => {
    if (type === "hcm") { 
      setHcmReconciliationLoading(true);
      setHcmReconciliationError("");
    } else {
      setThrReconciliationLoading(true);
      setThrReconciliationError("");
    }
    
    try {
      const response = await api.get(`/cdpo/${type}-awc-food-reconciliation/`);
      const apiResponse = response.data;
      
      // API returns: { count, next, previous, results: { success, project, data: [...] } }
      const results = apiResponse.results;
      
      if (results && results.success && results.data) {
        if (type === "hcm") {
          setHcmReconciliation(results);
        } else {
          setThrReconciliation(results);
        }
      } else {
        if (type === "hcm") {
          setHcmReconciliation(null);
        } else {
          setThrReconciliation(null);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${type.toUpperCase()} reconciliation data:`, err);
      const errorMsg = `Failed to fetch ${type.toUpperCase()} reconciliation data.`;
      if (type === "hcm") {
        setHcmReconciliationError(errorMsg);
        setHcmReconciliation(null);
      } else {
        setThrReconciliationError(errorMsg);
        setThrReconciliation(null);
      }
    } finally {
      if (type === "hcm") {
        setHcmReconciliationLoading(false);
      } else {
        setThrReconciliationLoading(false);
      }
    }
  }, [api]);

useEffect(() => {
    if (api) {
      fetchAllData();
    }
  }, [api]);

  // Fetch reconciliation data when tab changes
  useEffect(() => {
    if (api) {
      fetchReconciliationData(reconciliationTab);
    }
  }, [api, reconciliationTab, fetchReconciliationData]);
  
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

  // Reconciliation Table Component
  const ReconciliationTable = ({ data, type, isLoading, error }) => {
    /*
     * IMPORTANT:
     * Do not return before calculating the data below.
     * The API is asynchronous, so returning before hooks/derived values
     * can cause React hook-order/render problems.
     *
     * API structure:
     * response.data.results.data = [
     *   { month: "August", financial_year: "2026-27", ... }
     * ]
     */

    const records = Array.isArray(data?.data) ? data.data : [];

    // The API currently returns month and financial_year directly
    // inside every object of results.data.
    const getMonthValue = (row) =>
      String(row?.month ?? "").trim();

    const getFYValue = (row) =>
      String(row?.financial_year ?? "").trim();

    // Unique months from results.data, sorted chronologically.
    const monthOrder = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    const uniqueMonths = [
      ...new Set(
        records
          .map(getMonthValue)
          .filter(Boolean)
      )
    ].sort((a, b) => {
      const aIndex = monthOrder.findIndex(
        (month) => month.toLowerCase() === a.toLowerCase()
      );
      const bIndex = monthOrder.findIndex(
        (month) => month.toLowerCase() === b.toLowerCase()
      );

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    // Unique financial years from results.data.
    const uniqueFYs = [
      ...new Set(
        records
          .map(getFYValue)
          .filter(Boolean)
      )
    ].sort((a, b) => {
      const aYear = parseInt(a.split("-")[0], 10);
      const bYear = parseInt(b.split("-")[0], 10);

      if (!Number.isNaN(aYear) && !Number.isNaN(bYear)) {
        return aYear - bYear;
      }

      return a.localeCompare(b);
    });

    // Empty selection means ALL records.
    // Therefore initially:
    // selectedMonths = [] => all months
    // selectedFYs = [] => all financial years
    const filteredData = records.filter((row) => {
      const rowMonth = getMonthValue(row);
      const rowFY = getFYValue(row);

      const monthMatches =
        selectedMonths.length === 0 ||
        selectedMonths.includes(rowMonth);

      const fyMatches =
        selectedFYs.length === 0 ||
        selectedFYs.includes(rowFY);

      return monthMatches && fyMatches;
    });

    const totals = filteredData.reduce(
      (acc, r) => {
        acc.allocated_beneficiaries +=
          parseInt(r.allocated_beneficiaries) || 0;

        acc.received_beneficiaries +=
          parseInt(r.received_beneficiaries) || 0;

        acc.distributed_beneficiaries +=
          parseInt(r.distributed_beneficiaries) || 0;

        acc.allocated_quantity +=
          parseFloat(r.allocated_quantity) || 0;

        acc.received_quantity +=
          parseFloat(r.received_quantity) || 0;

        acc.distributed_quantity +=
          parseFloat(r.distributed_quantity) || 0;

        acc.balance_quantity +=
          parseFloat(r.balance_quantity) || 0;

        return acc;
      },
      {
        allocated_beneficiaries: 0,
        received_beneficiaries: 0,
        distributed_beneficiaries: 0,
        allocated_quantity: 0,
        received_quantity: 0,
        distributed_quantity: 0,
        balance_quantity: 0
      }
    );

    if (isLoading) {
      return (
        <div className="text-center p-4">
          <Spinner animation="border" />
        </div>
      );
    }

    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }

    if (records.length === 0) {
      return (
        <div className="text-center p-4 text-muted">
          No reconciliation data found.
        </div>
      );
    }

    const toggleMonth = (month) => {
      setSelectedMonths((prev) =>
        prev.includes(month)
          ? prev.filter((item) => item !== month)
          : [...prev, month]
      );
    };

    const toggleFY = (fy) => {
      setSelectedFYs((prev) =>
        prev.includes(fy)
          ? prev.filter((item) => item !== fy)
          : [...prev, fy]
      );
    };

    const selectAllMonths = () => {
      setSelectedMonths([]);
    };

    const selectAllFYs = () => {
      setSelectedFYs([]);
    };

    return (
      <div className="reconciliation-table-container">
        {/* FILTER BAR - always displayed directly above the table */}
        <div
          className="reconciliation-filter-bar mb-3 p-3 bg-light rounded"
          style={{ display: "block", width: "100%" }}
        >
          <Row className="g-3 align-items-end">
            {/* MONTH FILTER */}
            <Col md={5} sm={6} xs={12}>
              <Form.Label className="fw-bold mb-2">
                Month
              </Form.Label>

              <Dropdown autoClose="outside" className="w-100">
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                >
                  <span>
                    {selectedMonths.length === 0
                      ? "All Months"
                      : selectedMonths.length === 1
                      ? selectedMonths[0]
                      : `${selectedMonths.length} Months Selected`}
                  </span>

                  <FaChevronDown />
                </Dropdown.Toggle>

                <Dropdown.Menu
                  className="reconciliation-dropdown-menu p-2"
                  style={{
                    width: "100%",
                    minWidth: "100%",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}
                >
                  <Dropdown.Item
                    as="div"
                    onClick={(e) => e.stopPropagation()}
                    className="reconciliation-dropdown-item"
                  >
                    <Form.Check
                      type="checkbox"
                      label="All Months"
                      checked={selectedMonths.length === 0}
                      onChange={selectAllMonths}
                    />
                  </Dropdown.Item>

                  {uniqueMonths.map((month) => (
                    <Dropdown.Item
                      as="div"
                      key={month}
                      onClick={(e) => e.stopPropagation()}
                      className="reconciliation-dropdown-item"
                    >
                      <Form.Check
                        type="checkbox"
                        label={month}
                        checked={selectedMonths.includes(month)}
                        onChange={() => toggleMonth(month)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            {/* FINANCIAL YEAR FILTER */}
            <Col md={5} sm={6} xs={12}>
              <Form.Label className="fw-bold mb-2">
                Financial Year
              </Form.Label>

              <Dropdown autoClose="outside" className="w-100">
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                >
                  <span>
                    {selectedFYs.length === 0
                      ? "All Financial Years"
                      : selectedFYs.length === 1
                      ? selectedFYs[0]
                      : `${selectedFYs.length} Years Selected`}
                  </span>

                  <FaChevronDown />
                </Dropdown.Toggle>

                <Dropdown.Menu
                  className="reconciliation-dropdown-menu p-2"
                  style={{
                    width: "100%",
                    minWidth: "100%",
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}
                >
                  <Dropdown.Item
                    as="div"
                    onClick={(e) => e.stopPropagation()}
                    className="reconciliation-dropdown-item"
                  >
                    <Form.Check
                      type="checkbox"
                      label="All Financial Years"
                      checked={selectedFYs.length === 0}
                      onChange={selectAllFYs}
                    />
                  </Dropdown.Item>

                  {uniqueFYs.map((fy) => (
                    <Dropdown.Item
                      as="div"
                      key={fy}
                      onClick={(e) => e.stopPropagation()}
                      className="reconciliation-dropdown-item"
                    >
                      <Form.Check
                        type="checkbox"
                        label={fy}
                        checked={selectedFYs.includes(fy)}
                        onChange={() => toggleFY(fy)}
                      />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            {/* CLEAR FILTERS */}
            <Col
              md={2}
              sm={12}
              xs={12}
              className="d-flex align-items-end justify-content-md-end"
            >
              {(selectedMonths.length > 0 ||
                selectedFYs.length > 0) && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => {
                    setSelectedMonths([]);
                    setSelectedFYs([]);
                  }}
                  className="d-flex align-items-center"
                >
                  <FaTimes className="me-1" />
                  Clear Filters
                </Button>
              )}
            </Col>
          </Row>
        </div>

        {/* FILTER RESULT INFO */}
        <div className="mb-3">
          <small className="text-muted">
            Showing{" "}
            <strong>{filteredData.length}</strong>{" "}
            of{" "}
            <strong>{records.length}</strong>{" "}
            records
            {selectedMonths.length > 0 && (
              <>
                {" "} | Months:{" "}
                <strong>{selectedMonths.join(", ")}</strong>
              </>
            )}
            {selectedFYs.length > 0 && (
              <>
                {" "} | Financial Years:{" "}
                <strong>{selectedFYs.join(", ")}</strong>
              </>
            )}
          </small>
        </div>

        {/* SUMMARY CARDS */}
        <div className="reconciliation-summary-cards mb-3">
          <Row className="g-2">
            <Col xs={6} md={3}>
              <Card className="bg-primary text-white">
                <Card.Body className="py-2">
                  <small>Allocated Beneficiaries</small>
                  <div className="fw-bold fs-5">
                    {totals.allocated_beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="bg-info text-white">
                <Card.Body className="py-2">
                  <small>Received Beneficiaries</small>
                  <div className="fw-bold fs-5">
                    {totals.received_beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="bg-success text-white">
                <Card.Body className="py-2">
                  <small>Distributed Beneficiaries</small>
                  <div className="fw-bold fs-5">
                    {totals.distributed_beneficiaries.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={6} md={3}>
              <Card className="bg-warning text-dark">
                <Card.Body className="py-2">
                  <small>Balance Quantity</small>
                  <div className="fw-bold fs-5">
                    {totals.balance_quantity.toLocaleString()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>

        {/* DATA TABLE */}
        <div className="table-responsive">
          <Table
            striped
            bordered
            hover
            responsive
            className="mb-0 reconciliation-table"
          >
            <thead className="table-light sticky-top">
              <tr>
                <th>#</th>
                <th>District</th>
                <th>Project</th>
                <th>Sector</th>
                <th>AWC Code</th>
                <th>AWC Name</th>
                <th>Month</th>
                <th>Fin. Year</th>
                <th>Food Item</th>
                <th>Beneficiary Category</th>
                <th>Allocated Bene.</th>
                <th>Received Bene.</th>
                <th>Distributed Bene.</th>
                <th>Allocated Qty</th>
                <th>Received Qty</th>
                <th>Distributed Qty</th>
                <th>Balance Qty</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan="17"
                    className="text-center p-4 text-muted"
                  >
                    No data found for selected filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{index + 1}</td>
                    <td>{item.district}</td>
                    <td>{item.project}</td>
                    <td>{item.sector}</td>
                    <td>{item.awc_code}</td>
                    <td>{item.awc_name}</td>
                    <td>
                      <Badge bg="secondary">
                        {item.month}
                      </Badge>
                    </td>
                    <td>{item.financial_year}</td>
                    <td>{item.food_item}</td>
                    <td>{item.bene_category}</td>
                    <td className="text-end">
                      {item.allocated_beneficiaries ?? 0}
                    </td>
                    <td className="text-end">
                      {item.received_beneficiaries ?? 0}
                    </td>
                    <td className="text-end">
                      {item.distributed_beneficiaries ?? 0}
                    </td>
                    <td className="text-end">
                      {parseFloat(item.allocated_quantity || 0).toFixed(2)}
                    </td>
                    <td className="text-end">
                      {parseFloat(item.received_quantity || 0).toFixed(2)}
                    </td>
                    <td className="text-end">
                      {parseFloat(item.distributed_quantity || 0).toFixed(2)}
                    </td>
                    <td className="text-end fw-bold text-primary">
                      {parseFloat(item.balance_quantity || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="table-active fw-bold">
                <th></th>
                <th colSpan="9" className="text-end">
                  Totals:
                </th>
                <th className="text-end">
                  {totals.allocated_beneficiaries.toLocaleString()}
                </th>
                <th className="text-end">
                  {totals.received_beneficiaries.toLocaleString()}
                </th>
                <th className="text-end">
                  {totals.distributed_beneficiaries.toLocaleString()}
                </th>
                <th className="text-end">
                  {totals.allocated_quantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}
                </th>
                <th className="text-end">
                  {totals.received_quantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}
                </th>
                <th className="text-end">
                  {totals.distributed_quantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}
                </th>
                <th className="text-end text-primary">
                  {totals.balance_quantity.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}
                </th>
              </tr>
            </tfoot>
          </Table>
        </div>
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
            <h4 className="section-title">THR Distribution & Received Summary</h4>
            <Row className="g-3"> 
              <Col md={4}>
                <Card className="dashboard-card card-thr" onClick={() => navigate('/ThrCdpoDistributions')}>
                  <Card.Body>
                    <div className=" d-flex align-items-center w-100">
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
            <h4 className="section-title">HCM Distribution & Received Summary</h4>
            <Row className="g-3"> 
              <Col md={4}>
                <Card className="dashboard-card card-hcm" onClick={() => navigate('/HcmCdpoDistributions')}>
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
               <div className="dashboard-section">
            <h4 className="section-title">AWC / Sector Summary</h4>
            <Row className="g-3">
              <Col md={6} lg={4}>
                <Card className="dashboard-card card-thr" onClick={() => navigate('/CdpoAWCList')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon thr-icon"><FaUsers /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">AWC List</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : awcCount}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={4}>
                <Card className="dashboard-card card-hcm" onClick={() => navigate('/CdpoAWCList')}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="dashboard-card-icon hcm-icon"><FaUsers /></div>
                      <div className="ms-3 text-start">
                        <h6 className="dashboard-card-title">Sector List</h6>
                        <div className="dashboard-card-value">
                          {loading ? <Spinner animation="border" size="sm" /> : sectorCount}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          {/* Supplies Received & Distributed Summary - Reconciliation */}
          <div className="dashboard-section">
            <h4 className="section-title">
              <FaWarehouse className="me-2" /> Supplies Received & Distributed Summary
            </h4>
            <Card className="shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-3">
                  <ButtonGroup className="reconciliation-tab-group" role="group">
                    <Button 
                      variant={reconciliationTab === "hcm" ? "primary" : "outline-primary"} 
                      size="sm"
                      onClick={() => { setReconciliationTab("hcm"); setSelectedMonths([]); setSelectedFYs([]); }}
                    >
                      <FaBox className="me-1" /> HCM
                    </Button>
                    <Button 
                      variant={reconciliationTab === "thr" ? "warning" : "outline-warning"} 
                      size="sm"
                      onClick={() => { setReconciliationTab("thr"); setSelectedMonths([]); setSelectedFYs([]); }}
                    >
                      <FaTruckLoading className="me-1" /> THR
                    </Button>
                  </ButtonGroup>
                </div>
              </Card.Header>
              <Card.Body className="p-3">
                {reconciliationTab === "hcm" ? (
                  <ReconciliationTable 
                    data={hcmReconciliation} 
                    type="hcm" 
                    isLoading={hcmReconciliationLoading}
                    error={hcmReconciliationError}
                  />
                ) : (
                  <ReconciliationTable 
                    data={thrReconciliation} 
                    type="thr" 
                    isLoading={thrReconciliationLoading}
                    error={thrReconciliationError}
                  />
                )}
              </Card.Body>
            </Card>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default CDPODashboard;