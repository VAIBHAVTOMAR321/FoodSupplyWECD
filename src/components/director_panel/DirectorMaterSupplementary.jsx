import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Col,
  Container,
  Form,
  Pagination,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dashboard.css";
import "../../assets/css/dpo.css";
import DirectorHeader from "./DirectorHeader";
import DirectorLeftNav from "./DirectorLeftNav";

const API_URL = "/supplementary-nutrition-master/";
const QUARTERS = ["Apr-May-Jun", "Jul-Aug-Sep", "Oct-Nov-Dec", "Jan-Feb-Mar"];
const ITEMS_PER_PAGE = 10;

const getRecords = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results?.data)) return data.results.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  throw new Error("Unexpected supplementary nutrition records response.");
};

const DirectorMaterSupplementary = () => {
  const { api } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    financial_year: "",
    quarter: "",
  });

  useEffect(() => {
    let isActive = true;

    api.get(API_URL, { timeout: 30000 })
      .then((response) => {
        if (isActive) setReports(getRecords(response.data));
      })
      .catch((err) => {
        console.error("Fetch supplementary nutrition records error:", err);
        if (isActive) {
          setError("Failed to fetch supplementary nutrition records. Please try again.");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [api]);

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

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
    setCurrentPage(1);
  };

  const uniqueFinYears = useMemo(
    () =>
      [...new Set(reports.map((report) => report.financial_year).filter(Boolean))]
        .sort((a, b) => String(b).localeCompare(String(a))),
    [reports]
  );

  const uniqueQuarters = useMemo(
    () =>
      [...new Set(reports.map((report) => report.quarter).filter(Boolean))]
        .sort((a, b) => {
          const aOrder = QUARTERS.indexOf(a);
          const bOrder = QUARTERS.indexOf(b);
          if (aOrder === -1 && bOrder === -1) return String(a).localeCompare(String(b));
          if (aOrder === -1) return 1;
          if (bOrder === -1) return -1;
          return aOrder - bOrder;
        }),
    [reports]
  );

  const filteredReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          (!filters.financial_year || report.financial_year === filters.financial_year) &&
          (!filters.quarter || report.quarter === filters.quarter)
      ),
    [reports, filters]
  );

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfFirstItem + ITEMS_PER_PAGE);

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
          <h3 className="mb-4 fw-bold">Supplementary Nutrition Master</h3>

          {error && <Alert variant="danger">{error}</Alert>}

          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Financial Year</Form.Label>
                <Form.Select
                  name="financial_year"
                  value={filters.financial_year}
                  onChange={handleFilterChange}
                >
                  <option value="">All Years</option>
                  {uniqueFinYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filter by Quarter</Form.Label>
                <Form.Select
                  name="quarter"
                  value={filters.quarter}
                  onChange={handleFilterChange}
                >
                  <option value="">All Quarters</option>
                  {uniqueQuarters.map((quarter) => (
                    <option key={quarter} value={quarter}>{quarter}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Fetching records, please wait...</p>
              </div>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District</th>
                    <th>Project</th>
                    <th>Quarter</th>
                    <th>Financial Year</th>
                    <th>PW &amp; LM</th>
                    <th>Poushik Sattu</th>
                    <th>Children 6m-3y</th>
                    <th>Panjeeri 6m-3y</th>
                    <th>SAM 6M-5Y/SUW 6M-6Y</th>
                    <th>Panjeeri SAM</th>
                    <th>SAM 3Y-5Y/SUW 3Y-6Y</th>
                    <th>Sattu SAM</th>
                    <th>HCM 3Y-6Y</th>
                    <th>Mung Dal Khichdi</th>
                    <th>Multi Grain Aata</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((report, index) => (
                      <tr key={report.id}>
                        <td>{indexOfFirstItem + index + 1}</td>
                        <td>{report.district}</td>
                        <td>{report.project}</td>
                        <td>{report.quarter}</td>
                        <td>{report.financial_year}</td>
                        <td>{report.pregnant_woman_lactating_mother}</td>
                        <td>{report.poushik_sattu_preg_lat}</td>
                        <td>{report.children_6m_3y}</td>
                        <td>{report.panjeeri_6m_3y}</td>
                        <td>{report.sam_children_6m_5y_suw_children_6m_6y}</td>
                        <td>{report.panjeeri_sam_6m_5y_suw_6m_6y}</td>
                        <td>{report.sam_children_3y_5y_suw_children_3y_6y}</td>
                        <td>{report.sattu_sam_3y_5y_suw_3y_6y}</td>
                        <td>{report.hcm_beneficiaries_3y_6y}</td>
                        <td>{report.mung_dal_khichdi_3y_6y}</td>
                        <td>{report.multi_grain_aata_3y_6y}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="text-center">
                        No supplementary nutrition records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Pagination.Item
                  key={page}
                  active={page === currentPage}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Pagination.Item>
              ))}
            </Pagination>
          )}
        </Container>
      </div>
    </div>
  );
};

export default DirectorMaterSupplementary;
