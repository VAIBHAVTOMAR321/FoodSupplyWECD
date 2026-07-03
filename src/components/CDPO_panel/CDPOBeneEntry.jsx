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
  Tabs,
  Tab,
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
        const response = await api.get(`/cdpo/beneficiary-summary/?${params}`);
        const results = response.data.results;

        if (results && results.success) {
          setSummaryData({
            project: results.project,
            project_total: results.project_total,
            sector_summary: results.sector_summary,
          });
          setReports(results.data || []);
          setTotalPages(Math.ceil(response.data.count / 5000)); // Assuming 5000 items per page
        }
      } catch (err) {
        setError("Failed to fetch beneficiary summary.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    fetchBeneficiarySummary(currentPage);
  }, [fetchBeneficiarySummary, currentPage]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handlePageChange = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 3;
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    items.push(<Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />);

    // First page
    items.push(<Pagination.Item key={1} active={1 === currentPage} onClick={() => handlePageChange(1)}>{1}</Pagination.Item>);

    // Start ellipsis
    if (startPage > 2) {
      items.push(<Pagination.Ellipsis key="start-ellipsis" />);
    }

    // Middle pages
    for (let number = startPage; number <= endPage; number++) {
      if (number > 1 && number < totalPages) {
        items.push(<Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>{number}</Pagination.Item>);
      }
    }

    // End ellipsis
    if (endPage < totalPages - 1) {
      items.push(<Pagination.Ellipsis key="end-ellipsis" />);
    }

    // Last page
    if (totalPages > 1) {
      items.push(<Pagination.Item key={totalPages} active={totalPages === currentPage} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
    }

    items.push(<Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />);
    items.push(<Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />);

    return <Pagination className="justify-content-center">{items}</Pagination>;
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

            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : summaryData ? (
              <>
                <Row>
                  <Tabs defaultActiveKey="project" id="beneficiary-summary-tabs" className="mb-3">
                    <Tab eventKey="project" title="Project Total">
                      <Card className="mb-4">
                        <Card.Header as="h5">
                          Project Total: {summaryData.project}
                        </Card.Header>
                    
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
                                <td>{summaryData.project_total.total_children_6m_3y}</td>
                                <td>{summaryData.project_total.total_children_3_6y}</td>
                                <td>{summaryData.project_total.total_adolescent_girls}</td>
                                <td>{summaryData.project_total.total_sam_6m_3y}</td>
                                <td>{summaryData.project_total.total_sam_3_5y}</td>
                                <td>{summaryData.project_total.total_suw_6m_3y}</td>
                                <td>{summaryData.project_total.total_suw_3_6y}</td>
                              </tr>
                            </tbody>
                          </Table>
                       
                      </Card>
                    </Tab>
                    <Tab eventKey="sector" title="Sector Summary">
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
                    </Tab>
                    <Tab eventKey="awc" title="AWC Summary">
                      <h5 className="mt-4">AWC से लाभार्थी रिपोर्ट</h5>
                      {reports.length > 0 ? (
                        <Table striped bordered hover responsive>
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
                      {renderPagination()}
                    </Tab>
                  </Tabs>
                </Row>
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