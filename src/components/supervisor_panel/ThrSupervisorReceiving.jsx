import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Pagination,
  Row,
  Col,
  Form,
  Dropdown,
  Button,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/dashboard.css";
import { FaUserCircle } from "react-icons/fa";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";

const monthLabels = {
  apr: 'April',
  may: 'May',
  jun: 'June',
  jul: 'July',
  aug: 'August',
  sep: 'September',
  oct: 'October',
  nov: 'November',
  dec: 'December',
  jan: 'January',
  feb: 'February',
  mar: 'March',
};

const ThrSupervisorReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [receivings, setReceivings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    awc_name: [],
    food_item: [],
    fin_year: [],
    months: [],
    project: [],
    sector: [],
    district: [],
    bene_category: [],
  });

  const fetchReceivings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supervisor/thr-receiving/");
      setReceivings(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch THR receiving data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchReceivings();
  }, [fetchReceivings]);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      awc_name: [],
      food_item: [],
      fin_year: [],
      months: [],
      project: [],
      sector: [],
      district: [],
      bene_category: [],
    });
    setCurrentPage(1);
  };

  const uniqueValues = useMemo(() => {
    const values = {
      awc_name: [...new Set(receivings.map((item) => item.awc_name))],
      food_item: [...new Set(receivings.map((item) => item.food_item))],
      fin_year: [...new Set(receivings.map((item) => item.fin_year))],
      months: [...new Set(
        receivings
          .flatMap((item) => item.months || [])
          .map(m => monthLabels[m] || m)
      )].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
      project: [...new Set(receivings.map((item) => item.project))],
      sector: [...new Set(receivings.map((item) => item.sector))],
      district: [...new Set(receivings.map((item) => item.district))],
      bene_category: [...new Set(receivings.map((item) => item.bene_category))],
    };
    Object.keys(values).forEach(key => values[key].sort());
    return values;
  }, [receivings]);

  const filteredReceivings = useMemo(() => {
    return receivings.filter((item) => {
      return Object.entries(filters).every(([key, selectedValues]) => {
        if (selectedValues.length === 0) return true;
        if (key === 'months') {
          const itemMonths = (item.months || []).map(m => monthLabels[m] || m);
          return selectedValues.some(v => itemMonths.includes(v));
        }
        return selectedValues.includes(String(item[key]));
      });
    });
  }, [receivings, filters]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReceivings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceivings.length / itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination>{items}</Pagination>;
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
          <h3 className="mb-4 profile-page-title">
            <FaUserCircle className="me-2" /> THR Supervisor Receiving
          </h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="mb-3 g-2 align-items-center">
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} selected` : 'All Districts'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.district.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange('district', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} selected` : 'All Sectors'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.sector.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange('sector', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} selected` : 'All Projects'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.project.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange('project', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.awc_name.length ? `${filters.awc_name.length} selected` : 'All AWC Names'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.awc_name.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.awc_name.includes(v)} onChange={() => handleMultiSelectChange('awc_name', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} selected` : 'All Food Items'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.food_item.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange('food_item', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.fin_year.length ? `${filters.fin_year.length} selected` : 'All Fin. Years'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.fin_year.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange('fin_year', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} selected` : 'All Months'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.months.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange('months', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.bene_category.length ? `${filters.bene_category.length} selected` : 'All Bene. Categories'}</Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.bene_category.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.bene_category.includes(v)} onChange={() => handleMultiSelectChange('bene_category', v)} /></Dropdown.Item>))}</Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col xs="auto">
              <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
            </Col>
          </Row>
          <div className="table-responsive">
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District</th>
                    <th>Sector</th>
                    <th>Project</th>
                    <th>AWC Name</th>
                    <th>Food Item</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Beneficiary Category</th>
                    <th>Date</th>
                    <th>Financial Year</th>
                    <th>Months</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td>{item.district}</td>
                        <td>{item.sector}</td>
                        <td>{item.project}</td>
                        <td>{item.awc_name}</td>
                        <td>{item.food_item}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.bene_category}</td>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td>{item.fin_year}</td>
                        <td>{(item.months || []).map(m => monthLabels[m] || m).join(', ')}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="12" className="text-center">
                        No receiving records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </div>
          {filteredReceivings.length > 0 && renderPagination()}
        </Container>
      </div>
    </div>
  );
};

export default ThrSupervisorReceiving;
