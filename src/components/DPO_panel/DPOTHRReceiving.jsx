import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container,
  Alert,
  Spinner,
  Card,
  Table,
  Row,
  Col,
  Pagination,
  Dropdown,
  Tabs,
  Button,
  Modal,
  Form,
  Tab,
} from "react-bootstrap";
import "../../assets/css/dpo.css";

import { useAuth } from "../all_login/AuthContext";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import DPOLeftNav from "./DPOLeftNav";
import DPOHeader from "./DPOHeader";

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

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'],
  'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'],
  'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const DPOTHRReceiving = () => {
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
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);

  const [filters, setFilters] = useState({
    fin_year: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });

  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "awc_type", text: "AWC Type", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

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

  useEffect(() => {
    if (reports.length > 0) {
      setUniqueFinYears([...new Set(reports.map((item) => item.fin_year))]);
      const allMonths = reports.flatMap(item => {
        const monthData = item.months || item.quarter;
        if (Array.isArray(monthData)) return monthData;
        if (typeof monthData === 'string' && quarterToMonths[monthData]) return quarterToMonths[monthData];
        return [];
      });
      setUniqueMonths([...new Set(allMonths)].map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)));
      setUniqueDistricts([...new Set(reports.map((item) => item.district))]);
      setUniqueProjects([...new Set(reports.map((item) => item.project))]);
      setUniqueSectors([...new Set(reports.map((item) => item.sector))]);
      setUniqueFoodItems([...new Set(reports.map((item) => item.food_item))]);
      setUniqueBeneCategories([...new Set(reports.map((item) => item.bene_category))]);
    }
  }, [reports]);

  const fetchBeneficiarySummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/dpo/thr-receiving-summary/`);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district: results.district,
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError("Failed to fetch THR receiving summary.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBeneficiarySummary();
  }, [fetchBeneficiarySummary]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return {
          ...prevFilters,
          [filterName]: currentValues.filter((v) => v !== value),
        };
      } else {
        return {
          ...prevFilters,
          [filterName]: [...currentValues, value],
        };
      }
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const { fin_year, months, district, project, sector, food_item, bene_category } = filters;
      const itemMonths = (Array.isArray(item.months) ? item.months : quarterToMonths[item.quarter] || []).map(m => monthLabels[m] || m);
      const monthMatch = months.length === 0 || months.some(filterMonth => itemMonths.includes(filterMonth));

      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        monthMatch &&
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector)) &&
        (food_item.length === 0 || food_item.includes(item.food_item)) &&
        (bene_category.length === 0 || bene_category.includes(item.bene_category))
      );
    });
  }, [reports, filters]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handlePageChange = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter((c) => c.visible);

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
      pdf.text("Beneficiary Summary Report", 20, 30);
      pdf.addImage(
        imgData,
        "PNG",
        20,
        40,
        width,
        height > pdfHeight - 60 ? pdfHeight - 60 : height
      );
      pdf.save("beneficiary_summary_report.pdf");
    });
  };

  const exportToExcel = () => {
    const visCols = columns.filter((c) => c.visible && c.dataField !== "#");
    const dataToExport = filteredReports.map((row, index) => {
      const newRow = { "#": index + 1 };
      visCols.forEach((col) => {
        newRow[col.text] = row[col.dataField];
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiary Summary");
    XLSX.writeFile(workbook, "beneficiary_summary.xlsx");
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 3;
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    items.push(
      <Pagination.First
        key="first"
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      />
    );
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    items.push(
      <Pagination.Item
        key={1}
        active={1 === currentPage}
        onClick={() => handlePageChange(1)}
      >
        {1}
      </Pagination.Item>
    );

    if (startPage > 2) {
      items.push(<Pagination.Ellipsis key="start-ellipsis" />);
    }

    for (let number = startPage; number <= endPage; number++) {
      if (number > 1 && number < totalPages) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      }
    }

    if (endPage < totalPages - 1) {
      items.push(<Pagination.Ellipsis key="end-ellipsis" />);
    }

    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );
    items.push(
      <Pagination.Last
        key="last"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-section">
            <h4 className="section-title">THR प्राप्ति सारांश</h4>

            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : summaryData ? (
              <Tabs
                defaultActiveKey="awc_report"
                id="beneficiary-summary-tabs"
                className="mb-3"
              >
                <Tab eventKey="district_summary" title="District Summary">
                  <h5 className="mt-4">District Summary: {summaryData.district}</h5>
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
                      {summaryData.district_summary.map((item, index) => (
                        <tr key={index}>
                          <td>{item.food_item}</td>
                          <td>{item.bene_category}</td>
                          <td>{item.unit}</td>
                          <td>{item.total_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="project_summary" title="Project Summary">
                  <h5 className="mt-4">Project-wise Summary (Total)</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>Project</th>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Unit</th>
                        <th>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((project) => (
                        <tr key={project.project}>
                          <td>{project.project}</td>
                          <td>{project.food_item}</td>
                          <td>{project.bene_category}</td>
                          <td>{project.unit}</td>
                          <td>{project.total_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="sector_summary" title="Sector Summary">
                  <h5 className="mt-4">Sector-wise Summary (Total)</h5>
                  <Table striped bordered hover responsive className="mb-4">
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
                      {summaryData.sector_summary.map((sector, index) => (
                        <tr key={`${sector.sector}-${index}`}>
                          <td>{sector.sector}</td>
                          <td>{sector.food_item}</td>
                          <td>{sector.bene_category}</td>
                          <td>{sector.unit}</td>
                          <td>{sector.total_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="awc_report" title="AWC Report">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">AWC THR Receiving Report</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> Export PDF
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> Export Excel
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                        <FaEye className="me-1" /> Column Visibility
                      </Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-3">
                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.fin_year.length ? `${filters.fin_year.length} selected` : "All Fin. Years"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueFinYears.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange("fin_year", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100" id="dropdown-months">
                          {filters.months.length ? `${filters.months.length} selected` : "All Months"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueMonths.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange("months", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.district.length ? `${filters.district.length} selected` : "All Districts"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueDistricts.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange("district", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.project.length ? `${filters.project.length} selected` : "All Projects"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueProjects.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange("project", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.sector.length ? `${filters.sector.length} selected` : "All Sectors"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueSectors.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange("sector", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.food_item.length ? `${filters.food_item.length} selected` : "All Food Items"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueFoodItems.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange("food_item", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.bene_category.length ? `${filters.bene_category.length} selected` : "All Categories"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueBeneCategories.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.bene_category.includes(v)} onChange={() => handleMultiSelectChange("bene_category", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [] })}>
                        Clear Filters
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No THR receiving reports found for the selected filters.
                    </div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>
                              {visibleColumns.map((col) => (
                                <th key={col.dataField}>{col.text}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentItems.map((report, index) => (
                              <tr key={report.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#"
                                      ? (currentPage - 1) * itemsPerPage + index + 1
                                      : col.dataField === "months" ? (Array.isArray(report.months) ? report.months : quarterToMonths[report.quarter] || []).map(m => monthLabels[m] || m).join(', ')
                                      : col.dataField === "date" ? new Date(report[col.dataField]).toLocaleDateString()
                                      : col.dataField === "created_at" || col.dataField === "updated_at"
                                      ? new Date(report[col.dataField]).toLocaleString()
                                      : report[col.dataField]}
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

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Show/Hide Columns</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default DPOTHRReceiving;