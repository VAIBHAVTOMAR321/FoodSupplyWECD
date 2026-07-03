import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container, Alert, Spinner, Card, Table, Row, Col,
  Pagination, Dropdown, Tabs, Tab, Button, Modal, Form,
} from "react-bootstrap";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { useAuth } from "../all_login/AuthContext";
import { FaFileExcel, FaEye, FaFilePdf } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const CDPOHCMReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const { api } = useAuth();

  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const tableRef = useRef(null);

  const [filters, setFilters] = useState({ fin_year: [], quarter: [], sector: [], food_item: [], bene_category: [] });
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "quarter", text: "Quarter", visible: true },
    { dataField: "date", text: "Date", visible: true },
  ]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/cdpo/hcm-receiving-summary/?page=1");
      const results = response.data.results;
      if (results?.success) {
        setSummaryData({
          project: results.project,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError("Failed to fetch HCM receiving data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uniqueValues = (key) => [...new Set(reports.map((r) => r[key]))];

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: prev[filterName].includes(value)
        ? prev[filterName].filter((v) => v !== value)
        : [...prev[filterName], value],
    }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) =>
      Object.entries(filters).every(
        ([key, vals]) => vals.length === 0 || vals.includes(item[key])
      )
    );
  }, [reports, filters]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentItems = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleColumnToggle = (i) => {
    const updated = [...columns];
    updated[i].visible = !updated[i].visible;
    setColumns(updated);
  };
  const visibleColumns = columns.filter((c) => c.visible);

  const exportToExcel = () => {
    const visCols = columns.filter((c) => c.visible && c.dataField !== "#");
    const data = filteredReports.map((row, i) => {
      const r = { "#": i + 1 };
      visCols.forEach((col) => { r[col.text] = row[col.dataField]; });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HCM Receiving");
    XLSX.writeFile(wb, "hcm_receiving.xlsx");
  };

  const exportToPDF = () => {
    const input = tableRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a2",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth - 40;
      const height = width / ratio;
      pdf.text("HCM Receiving Report", 20, 30);
      pdf.addImage(
        imgData, "PNG", 20, 40, width,
        height > pdfHeight - 60 ? pdfHeight - 60 : height
      );
      pdf.save("hcm_receiving_report.pdf");
    });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    const go = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

    items.push(<Pagination.First key="first" onClick={() => go(1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Prev key="prev" onClick={() => go(currentPage - 1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Item key={1} active={currentPage === 1} onClick={() => go(1)}>{1}</Pagination.Item>);
    if (startPage > 2) items.push(<Pagination.Ellipsis key="e1" />);
    for (let n = startPage; n <= endPage; n++) {
      if (n > 1 && n < totalPages)
        items.push(<Pagination.Item key={n} active={n === currentPage} onClick={() => go(n)}>{n}</Pagination.Item>);
    }
    if (endPage < totalPages - 1) items.push(<Pagination.Ellipsis key="e2" />);
    if (totalPages > 1)
      items.push(<Pagination.Item key={totalPages} active={currentPage === totalPages} onClick={() => go(totalPages)}>{totalPages}</Pagination.Item>);
    items.push(<Pagination.Next key="next" onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages} />);
    items.push(<Pagination.Last key="last" onClick={() => go(totalPages)} disabled={currentPage === totalPages} />);
    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  const filterKeys = ["fin_year", "quarter", "sector", "food_item", "bene_category"];
  const filterLabels = { fin_year: "Fin. Year", quarter: "Quarter", sector: "Sector", food_item: "Food Item", bene_category: "Category" };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="dashboard-section">
            <h4 className="section-title">HCM प्राप्ति सारांश</h4>

            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : summaryData ? (
              <Tabs defaultActiveKey="awc_report" id="hcm-receiving-tabs" className="mb-3">

                {/* Project Summary Tab */}
                <Tab eventKey="project_summary" title="Project Summary">
                  <h5 className="mt-3">Project: {summaryData.project}</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Unit</th>
                        <th>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.unit}</td>
                          <td>{row.total_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                {/* Sector Summary Tab */}
                <Tab eventKey="sector_summary" title="Sector Summary">
                  <Table striped bordered hover responsive className="mt-3">
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Unit</th>
                        <th>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.sector_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{row.sector}</td>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.unit}</td>
                          <td>{row.total_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                {/* AWC Report Tab */}
                <Tab eventKey="awc_report" title="AWC Report">
                  <div className="d-flex justify-content-between align-items-center mb-3 mt-2">
                    <h5 className="mb-0">AWC HCM Receiving Report</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> Export PDF
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> Export Excel
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                        <FaEye className="me-1" /> Columns
                      </Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-2">
                    {filterKeys.map((key) => (
                      <Col md={2} key={key}>
                        <Dropdown>
                          <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100">
                            {filters[key].length ? `${filters[key].length} selected` : `All ${filterLabels[key]}`}
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {uniqueValues(key).map((v) => (
                              <Dropdown.Item key={v} as="div">
                                <Form.Check type="checkbox" label={v} checked={filters[key].includes(v)} onChange={() => handleMultiSelectChange(key, v)} />
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown>
                      </Col>
                    ))}
                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], quarter: [], sector: [], food_item: [], bene_category: [] })}>
                        Clear Filters
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">No data found for selected filters.</div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>{visibleColumns.map((col) => <th key={col.dataField}>{col.text}</th>)}</tr>
                          </thead>
                          <tbody>
                            {currentItems.map((row, index) => (
                              <tr key={row.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#"
                                      ? (currentPage - 1) * itemsPerPage + index + 1
                                      : row[col.dataField]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                        {renderPagination()}
                      </div>
                    </Card>
                  )}
                </Tab>
              </Tabs>
            ) : null}
          </div>
        </Container>
      </div>

      <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
        <Modal.Header closeButton><Modal.Title>Show/Hide Columns</Modal.Title></Modal.Header>
        <Modal.Body>
          {columns.map((col, i) => (
            <Form.Check key={i} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(i)} />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CDPOHCMReceiving;
