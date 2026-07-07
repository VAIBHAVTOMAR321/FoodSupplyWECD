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

import "../../assets/css/itcellLeftnav.css";

import { useAuth } from "../all_login/AuthContext";
import { FaFilePdf, FaFileExcel, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const ITCellTHRReceiving = () => {
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
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);

  const [filters, setFilters] = useState({
    fin_year: [],
    quarter: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });

  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "quarter", text: "Quarter", visible: true },
    { dataField: "action", text: "Action", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const API_URL = "/director/thr-receiving-summary/";

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
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const fetchReceivingSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(API_URL);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        const reportData = results.data || [];
        setReports(reportData);
        setUniqueFinYears([...new Set(reportData.map((item) => item.fin_year))]);
        setUniqueQuarters([...new Set(reportData.map((item) => item.quarter))]);
        setUniqueDistricts([...new Set(reportData.map((item) => item.district))]);
        setUniqueProjects([...new Set(reportData.map((item) => item.project))]);
        setUniqueSectors([...new Set(reportData.map((item) => item.sector))]);
        setUniqueFoodItems([...new Set(reportData.map((item) => item.food_item))]);
        setUniqueBeneCategories([...new Set(reportData.map((item) => item.bene_category))]);
      }
    } catch (err) {
      setError("Failed to fetch THR receiving summary.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchReceivingSummary();
  }, [fetchReceivingSummary]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      return {
        ...prevFilters,
        [filterName]: currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value],
      };
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const { fin_year, quarter, district, project, sector, food_item, bene_category } = filters;
      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        (quarter.length === 0 || quarter.includes(item.quarter)) &&
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

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter((c) => c.visible);

  const handleShowEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    const payload = { ...editFormData, id: editingItem.id };

    try {
      await api.put(API_URL, payload);
      setSuccess("Record updated successfully.");
      handleCloseEditModal();
      fetchReceivingSummary();
    } catch (err) {
      setError("Failed to update record.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await api.delete(API_URL, { data: { id: [id] } });
        setSuccess("Record deleted successfully.");
        fetchReceivingSummary();
      } catch (err) {
        setError("Failed to delete record.");
        console.error(err);
      }
    }
  };

  const exportToPDF = () => {
    const input = tableRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a2" });
      pdf.text("THR Receiving Report", 20, 30);
      pdf.addImage(imgData, "PNG", 20, 40, pdf.internal.pageSize.getWidth() - 40, 0);
      pdf.save("thr_receiving_report.pdf");
    });
  };

  const exportToExcel = () => {
    const visCols = columns.filter((c) => c.visible && c.dataField !== "#" && c.dataField !== "action");
    const dataToExport = filteredReports.map((row, index) => {
      const newRow = { "#": index + 1 };
      visCols.forEach((col) => {
        newRow[col.text] = row[col.dataField];
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Receiving");
    XLSX.writeFile(workbook, "thr_receiving_report.xlsx");
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <ITCellLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          <div className="dashboard-section">
            <h4 className="section-title">THR Receiving Summary</h4>

            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : summaryData ? (
              <Tabs defaultActiveKey="awc_report" id="receiving-summary-tabs" className="mb-3">
                <Tab eventKey="district_summary" title="District Summary">
                  <Table striped bordered hover responsive>
                    <thead><tr><th>District</th><th>Food Item</th><th>Category</th><th>Unit</th><th>Total Quantity</th></tr></thead>
                    <tbody>{summaryData.district_summary.map((item, index) => (<tr key={index}><td>{item.district}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="project_summary" title="Project Summary">
                  <Table striped bordered hover responsive>
                    <thead><tr><th>Project</th><th>Food Item</th><th>Category</th><th>Unit</th><th>Total Quantity</th></tr></thead>
                    <tbody>{summaryData.project_summary.map((item, index) => (<tr key={index}><td>{item.project}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="sector_summary" title="Sector Summary">
                  <Table striped bordered hover responsive>
                     <thead><tr><th>Sector</th><th>Food Item</th><th>Category</th><th>Unit</th><th>Total Quantity</th></tr></thead>
                    <tbody>{summaryData.sector_summary.map((item, index) => (<tr key={index}><td>{item.sector}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="awc_report" title="AWC Report">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">AWC THR Receiving Report</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf /> PDF</Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2"><FaFileExcel /> Excel</Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}><FaEye /> Columns</Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-3">
                    {/* Filters */}
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.fin_year.length ? `${filters.fin_year.length} selected` : "All Fin. Years"}</Dropdown.Toggle><Dropdown.Menu>{uniqueFinYears.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange("fin_year", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.quarter.length ? `${filters.quarter.length} selected` : "All Quarters"}</Dropdown.Toggle><Dropdown.Menu>{uniqueQuarters.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.quarter.includes(v)} onChange={() => handleMultiSelectChange("quarter", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} selected` : "All Districts"}</Dropdown.Toggle><Dropdown.Menu>{uniqueDistricts.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange("district", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} selected` : "All Projects"}</Dropdown.Toggle><Dropdown.Menu>{uniqueProjects.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange("project", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} selected` : "All Sectors"}</Dropdown.Toggle><Dropdown.Menu>{uniqueSectors.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange("sector", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} selected` : "All Food Items"}</Dropdown.Toggle><Dropdown.Menu>{uniqueFoodItems.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange("food_item", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">No reports found.</div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>{visibleColumns.map((col) => (<th key={col.dataField}>{col.text}</th>))}</tr>
                          </thead>
                          <tbody>
                            {currentItems.map((report, index) => (
                              <tr key={report.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#" ? (currentPage - 1) * itemsPerPage + index + 1
                                      : col.dataField === "date" ? new Date(report.date).toLocaleDateString()
                                      : col.dataField === "action" ? (
                                        <>
                                          <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(report)}><FaEdit /></Button>
                                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)}><FaTrash /></Button>
                                        </>
                                      )
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
          <Modal.Header closeButton><Modal.Title>Show/Hide Columns</Modal.Title></Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button></Modal.Footer>
        </Modal>

        {editingItem && (
          <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Edit THR Receiving Record</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <Form.Control type="date" name="date" value={editFormData.date} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quantity</Form.Label>
                      <Form.Control type="number" name="quantity" value={editFormData.quantity} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Food Item</Form.Label>
                      <Form.Control type="text" name="food_item" value={editFormData.food_item} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Beneficiary Category</Form.Label>
                      <Form.Control type="text" name="bene_category" value={editFormData.bene_category} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                 <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Financial Year</Form.Label>
                      <Form.Control type="text" name="fin_year" value={editFormData.fin_year} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quarter</Form.Label>
                      <Form.Control type="text" name="quarter" value={editFormData.quarter} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>District</Form.Label>
                      <Form.Control type="text" name="district" value={editFormData.district} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Project</Form.Label>
                      <Form.Control type="text" name="project" value={editFormData.project} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                </Row>
                 <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sector</Form.Label>
                      <Form.Control type="text" name="sector" value={editFormData.sector} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>AWC Name</Form.Label>
                      <Form.Control type="text" name="awc_name" value={editFormData.awc_name} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button variant="secondary" onClick={handleCloseEditModal} className="me-2">Cancel</Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : 'Update'}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default ITCellTHRReceiving;