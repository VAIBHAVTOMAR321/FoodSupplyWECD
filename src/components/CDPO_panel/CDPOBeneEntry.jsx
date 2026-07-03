import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Alert,
  Spinner,
  Card,
  Table,
  Row,
  Col,
  Pagination,
  Form,
  Button,
} from "react-bootstrap";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { useAuth } from "../all_login/AuthContext";

const CDPOBeneEntry = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filterDate, setFilterDate] = useState("");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const fetchBeneficiarySummary = useCallback(
    async (page) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page });
        if (filterDate) {
          params.append("created_at", filterDate);
        }
        const response = await api.get(`/cdpo/beneficiary-summary/?${params.toString()}`);
        const results = response.data.results;

        if (results && results.success) {
          setSummaryData({
            project: results.project,
            project_total: results.project_total,
            sector_summary: results.sector_summary,
          });
          setReports(results.data || []);
          setTotalPages(Math.ceil(response.data.count / 10)); // Assuming 10 items per page or get from API if available
        }
      } catch (err) {
        setError("Failed to fetch beneficiary summary.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [api, filterDate]
  );

  useEffect(() => {
    fetchBeneficiarySummary(currentPage);
  }, [fetchBeneficiarySummary, currentPage, filterDate]);

  const handleDateFilterChange = (e) => {
    setFilterDate(e.target.value);
    setCurrentPage(1); // Reset to the first page when the filter changes
  };

  const handleResetFilter = () => {
    setFilterDate("");
    setCurrentPage(1);
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
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
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-section">
            <h4 className="section-title">लाभार्थी सारांश</h4>

            <Card className="mb-4">
              <Card.Header>फ़िल्टर</Card.Header>
              <Card.Body>
                <Row className="align-items-end">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>निर्माण तिथि के अनुसार फ़िल्टर करें</Form.Label>
                      <Form.Control type="date" value={filterDate} onChange={handleDateFilterChange} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Button variant="secondary" onClick={handleResetFilter}>रीसेट</Button>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : summaryData ? (
              <>
                <Row>
                  <Col md={12}>
                    <Card className="mb-4">
                      <Card.Header as="h5">
                        Project Total: {summaryData.project}
                      </Card.Header>
                      <Card.Body>
                        <Table striped bordered hover responsive>
                          <thead>
                            <tr>
                              <th>PW & LM</th>
                              <th>Child (6m-3y)</th>
                              <th>Child (3-6y)</th>
                              <th>Adol. Girls</th>
                              <th>SAM (6m-3y)</th>
                              <th>SAM (3-5y)</th>
                              <th>SUW (6m-3y)</th>
                              <th>SUW (3-6y)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{summaryData.project_total.total_pw_lm}</td>
                              <td>
                                {summaryData.project_total.total_children_6m_3y}
                              </td>
                              <td>
                                {summaryData.project_total.total_children_3_6y}
                              </td>
                              <td>
                                {summaryData.project_total.total_adolescent_girls}
                              </td>
                              <td>
                                {summaryData.project_total.total_sam_6m_3y}
                              </td>
                              <td>{summaryData.project_total.total_sam_3_5y}</td>
                              <td>
                                {summaryData.project_total.total_suw_6m_3y}
                              </td>
                              <td>{summaryData.project_total.total_suw_3_6y}</td>
                            </tr>
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <h5 className="mt-4">सेक्टर-वार सारांश (कुल)</h5>
                <Table striped bordered hover responsive className="mb-4">
                  <thead>
                    <tr>
                      <th>Sector</th>
                      <th>PW & LM</th>
                      <th>Child (6m-3y)</th>
                      <th>Child (3-6y)</th>
                      <th>Adol. Girls</th>
                      <th>SAM (6m-3y)</th>
                      <th>SAM (3-5y)</th>
                      <th>SUW (6m-3y)</th>
                      <th>SUW (3-6y)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.sector_summary.map((sector) => (
                      <tr key={sector.sector}>
                        <td>{sector.sector}</td>
                        <td>{sector.total_pw_lm}</td>
                        <td>{sector.total_children_6m_3y}</td>
                        <td>{sector.total_children_3_6y}</td>
                        <td>{sector.total_adolescent_girls}</td>
                        <td>{sector.total_sam_6m_3y}</td>
                        <td>{sector.total_sam_3_5y}</td>
                        <td>{sector.total_suw_6m_3y}</td>
                        <td>{sector.total_suw_3_6y}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <h5 className="mt-4">AWC से लाभार्थी रिपोर्ट</h5>
                {reports.length > 0 ? (
                  <Table striped bordered hover responsive>
                    {/* Table for reports.data can be added here if needed */}
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>AWC का नाम</th>
                        <th>जिला</th>
                        <th>परियोजना</th>
                        <th>सेक्टर</th>
                        <th>वित्तीय वर्ष</th>
                        <th>महीना</th>
                        <th>PW & LM</th>
                        <th>बच्चे (6m-3y)</th>
                        <th>बच्चे (3-6y)</th>
                        <th>किशोरी लड़कियां</th>
                        <th>SAM (6m-3y)</th>
                        <th>SAM (3-5y)</th>
                        <th>SUW (6m-3y)</th>
                        <th>SUW (3-6y)</th>
                        <th>सेक्टर स्थिति</th>
                        <th>सेक्टर टिप्पणी</th>
                        <th>बनाया गया</th>
                        <th>अद्यतन किया गया</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report, index) => (
                        <tr key={report.id}>
                          <td>{(currentPage - 1) * 10 + index + 1}</td>
                          <td>{report.awc_name}</td>
                          <td>{report.district}</td>
                          <td>{report.project}</td>
                          <td>{report.sector}</td>
                          <td>{report.fin_year}</td>
                          <td>{report.month}</td>
                          <td>{report.pw_lm}</td>
                          <td>{report.children_6m_3y}</td>
                          <td>{report.children_3_6y}</td>
                          <td>{report.adolescent_girls}</td>
                          <td>{report.sam_6m_3y}</td>
                          <td>{report.sam_3_5y}</td>
                          <td>{report.suw_6m_3y}</td>
                          <td>{report.suw_3_6y}</td>
                          <td>{report.sector_status}</td>
                          <td>{report.sector_remark}</td>
                          <td>{new Date(report.created_at).toLocaleString()}</td>
                          <td>{new Date(report.updated_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">No detailed reports found.</Alert>
                )}
                {totalPages > 1 && (
                  <Pagination className="justify-content-center">
                    {[...Array(totalPages).keys()].map(number => (
                      <Pagination.Item key={number + 1} active={number + 1 === currentPage} onClick={() => setCurrentPage(number + 1)}>{number + 1}</Pagination.Item>
                    ))}
                  </Pagination>
                )}
              </>
            ) : (
              !error && <p>No summary data available.</p>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
};

export default CDPOBeneEntry;