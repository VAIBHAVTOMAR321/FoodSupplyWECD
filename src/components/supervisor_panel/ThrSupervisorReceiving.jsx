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
  Modal,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dashboard.css";
import { FaUserCircle, FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import * as XLSX from "xlsx";
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
  const tableRef = React.useRef(null);

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
  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "fin_year", text: "Financial Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const visibleColumns = columns.filter((c) => c.visible);

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

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
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

      pdf.text("THR Supervisor Receiving Report", 20, 30);
      pdf.addImage(
        imgData,
        "PNG",
        20,
        40,
        width,
        height > pdfHeight - 60 ? pdfHeight - 60 : height
      );
      pdf.save("thr-supervisor-receiving.pdf");
    });
  };

  const exportToExcel = () => {
    const visCols = visibleColumns.filter(c => c.dataField !== '#');
    const dataToExport = filteredReceivings.map((item, index) => {
      const row = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField === 'date') {
          row[col.text] = new Date(item.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
        } else if (col.dataField === 'months') {
          row[col.text] = (item.months || []).map(m => monthLabels[m] || m).join(', ');
        } else {
          row[col.text] = item[col.dataField];
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths
    const colWidths = visCols.map(col => ({
      wch: Math.max(col.text.length, ...dataToExport.map(row => (row[col.text] || '').toString().length)) + 2
    }));
    ws['!cols'] = [{ wch: 5 }, ...colWidths];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "THR Receiving");
    XLSX.writeFile(wb, "thr-supervisor-receiving.xlsx");
  };

  const renderColumnModal = () => (
    <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Show/Hide Columns</Modal.Title>
      </Modal.Header>
      <Modal.Body>{columns.map((col, index) => (<Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />))}</Modal.Body>
      <Modal.Footer><Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button></Modal.Footer>
    </Modal>
  );

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
          <div className="d-flex justify-content-end mb-3">
            <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf /> PDF</Button>
            <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2"><FaFileExcel /> Excel</Button>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}><FaEye /> Columns</Button>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : (
              <Table striped bordered hover responsive ref={tableRef}>
                <thead>
                  <tr>
                    {visibleColumns.map((col) => (<th key={col.dataField}>{col.text}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr key={item.id}>
                        {visibleColumns.map((col) => {
                          let cellContent;
                          switch (col.dataField) {
                            case "#":
                              cellContent = indexOfFirstItem + index + 1;
                              break;
                            case "date":
                              cellContent = new Date(item.date).toLocaleDateString();
                              break;
                            case "months":
                              cellContent = (item.months || []).map(m => monthLabels[m] || m).join(', ');
                              break;
                            default:
                              cellContent = item[col.dataField];
                          }
                          return <td key={col.dataField}>{cellContent}</td>;
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="text-center">
                        No receiving records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </div>
          {filteredReceivings.length > 0 && renderPagination()}
          {renderColumnModal()}
        </Container>
      </div>
    </div>
  );
};

export default ThrSupervisorReceiving;
