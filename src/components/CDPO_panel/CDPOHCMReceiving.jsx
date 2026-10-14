import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container, Alert, Spinner, Card, Table, Row, Col,
  Pagination, Dropdown, Tabs, Tab, Button, Modal, Form,
  ListGroup, Badge,
} from "react-bootstrap";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { useAuth } from "../all_login/AuthContext";
import { FaFileExcel, FaEye, FaFilePdf, FaCalendarCheck } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

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

const formatMonths = (monthsOrQuarter) => {
  if (Array.isArray(monthsOrQuarter)) {
    return monthsOrQuarter.map((m) => monthLabels[m] || m).join(', ');
  }
  if (typeof monthsOrQuarter === 'string' && quarterToMonths[monthsOrQuarter]) {
    return quarterToMonths[monthsOrQuarter].map(m => monthLabels[m] || m).join(', ');
  }
  return monthsOrQuarter; // Fallback for single month strings or other formats
};

const getStatusVariant = (status) => {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    default: return "warning";
  }
};

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
  const [isPrinting, setIsPrinting] = useState(false);

  const [filters, setFilters] = useState({ fin_year: [], months: [], sector: [], food_item: [], bene_category: [] });
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  
  // Updated columns state to include 'curr_month' and 'max_expirydate'
  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "max_expirydate", text: "Max Expiry Date", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);

  // ── NEW: Expiry details modal state ──
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryViewItem, setExpiryViewItem] = useState(null);

  // ── NEW: Helper to check if a record has packet_expiry data ──
  const hasPacketExpiry = (rec) => {
    if (!rec) return false;
    if (!Array.isArray(rec.packet_expiry) || rec.packet_expiry.length === 0) return false;
    return rec.packet_expiry.some(pe => {
      const count = Array.isArray(pe) ? pe[0] : (pe && pe.count);
      const date = Array.isArray(pe) ? pe[1] : (pe && pe.date);
      return (count !== '' && count != null) || (date !== '' && date != null);
    });
  };

  // ── NEW: Expiry modal handlers ──
  const handleOpenExpiryModal = (record) => {
    setExpiryViewItem(record);
    setShowExpiryModal(true);
  };

  const handleCloseExpiryModal = () => {
    setShowExpiryModal(false);
    setExpiryViewItem(null);
  };

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

  const uniqueValues = (key) => {
    if (key === 'months') {
      const allMonths = reports.flatMap(item => {
        const monthData = item.months || item.quarter;
        if (Array.isArray(monthData)) return monthData;
        if (typeof monthData === 'string' && quarterToMonths[monthData]) return quarterToMonths[monthData];
        return [];
      });
      return [...new Set(allMonths)].map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b));
    }
    return [...new Set(reports.map((r) => r[key]))];
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: prev[filterName].includes(value)
        ? prev[filterName].filter((v) => v !== value)
        : [...prev[filterName], value],
    }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      return Object.entries(filters).every(([key, vals]) => {
        if (vals.length === 0) return true;
        if (key === 'months') {
          const itemMonths = (Array.isArray(item.months) ? item.months : quarterToMonths[item.quarter] || []).map(m => monthLabels[m] || m);
          return vals.some(filterMonth => itemMonths.includes(filterMonth));
        }
        return vals.includes(item[key]);
      });
    });
  }, [reports, filters]);

  const totals = useMemo(() => {
    return filteredReports.reduce((acc, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unit = item.unit || 'N/A';
        
        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }
        acc.quantityByUnit[unit] += quantity;
        return acc;
    }, { quantityByUnit: {} });
  }, [filteredReports]);

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
      visCols.forEach((col) => {
        if (col.dataField === 'months') {
          r[col.text] = formatMonths(row.months || row.quarter);
        } else if (col.dataField === 'quarter') {
          r[col.text] = row.quarter || '';
        } else if (col.dataField === 'sector_status') {
          r[col.text] = row.sector_status || 'pending';
        } else if (col.dataField === 'max_expirydate') {
          r[col.text] = row.max_expirydate ? new Date(row.max_expirydate).toLocaleDateString('en-CA') : '';
        } else {
          r[col.text] = row[col.dataField];
        }
      });
      return r;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HCM Receiving");
    XLSX.writeFile(wb, "hcm_receiving.xlsx");
  };

  const exportToPDF = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const mainTable = tableRef.current;
      const totalsTableContainer = document.createElement('div');
      totalsTableContainer.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; text-align: center;">
          <h4 style="margin-bottom: 15px;">Total Quantity by Unit</h4>
          <table style="width: 50%; margin: 0 auto; border-collapse: collapse; border: 1px solid #dee2e6;">
            <thead style="background-color: #f2f2f2;">
              <tr>
                <th style="border: 1px solid #dee2e6; padding: 8px;">Unit</th>
                <th style="border: 1px solid #dee2e6; padding: 8px;">Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(totals.quantityByUnit)
                .map(([unit, total]) => `
                  <tr>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${unit}</td>
                    <td style="border: 1px solid #dee2e6; padding: 8px;">${total.toFixed(2)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      `;
      document.body.appendChild(totalsTableContainer);

      if (!mainTable) {
        console.error("Table element not found for PDF export.");
        setIsPrinting(false);
        return;
      }

      Promise.all([
        html2canvas(mainTable, { scale: 2, useCORS: true }),
        html2canvas(totalsTableContainer, { scale: 2, useCORS: true })
      ]).then(([mainCanvas, totalsCanvas]) => {
        const mainImgData = mainCanvas.toDataURL('image/png');
        const totalsImgData = totalsCanvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.text("HCM Receiving Report", 20, 30);
        let yPos = 40;
        const mainRatio = mainCanvas.width / mainCanvas.height;
        const mainWidth = pdfWidth - 40;
        const mainHeight = mainWidth / mainRatio;
        pdf.addImage(mainImgData, 'PNG', 20, yPos, mainWidth, mainHeight);
        yPos += mainHeight + 20;
        const totalsRatio = totalsCanvas.width / totalsCanvas.height;
        const totalsWidth = pdfWidth / 2;
        const totalsHeight = totalsWidth / totalsRatio;
        if (yPos + totalsHeight < pdfHeight - 40) {
          pdf.addImage(totalsImgData, 'PNG', 20, yPos, totalsWidth, totalsHeight);
        }
        pdf.save('hcm_receiving_report.pdf');
        document.body.removeChild(totalsTableContainer);
        setIsPrinting(false);
      });
    }, 100);
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

  const filterKeys = ["fin_year", "months", "sector", "food_item", "bene_category"];
  const filterLabels = { fin_year: "Fin. Year", months: "Months", sector: "Sector", food_item: "Food Item", bene_category: "Category" };

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
                        <th>Project</th>
                        <th>Food Item</th>
                        <th>Beneficiary Category</th>
                        <th>Total Quantity</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{summaryData.project}</td>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.unit}</td>
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
                        <th>Total Quantity</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.sector_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{row.sector}</td>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.unit}</td>
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
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], months: [], sector: [], food_item: [], bene_category: [] })}>
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
                                        : col.dataField === 'months'
                                        ? formatMonths(row.months || row.quarter)
                                        : col.dataField === 'quarter'
                                        ? (row.quarter || '-')
                                        : col.dataField === 'sector_status'
                                        ? <Badge bg={getStatusVariant(row.sector_status)}>{row.sector_status || 'pending'}</Badge>
                                        : col.dataField === 'max_expirydate'
                                        ? (row.max_expirydate ? new Date(row.max_expirydate).toLocaleDateString() : '-')
                                        : col.dataField === 'actions'
                                        ? (
                                            <div className="d-flex gap-1 flex-wrap">
                                              {hasPacketExpiry(row) && (
                                                <Button
                                                  variant="outline-warning"
                                                  size="sm"
                                                  onClick={() => handleOpenExpiryModal(row)}
                                                  title="View Packet Expiry Details"
                                                >
                                                  <FaCalendarCheck /> Expiry
                                                </Button>
                                              )}
                                            </div>
                                          )
                                        : row[col.dataField]}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                          </tbody>
                          {!isPrinting && (
                            <tfoot>
                              <tr>
                                {visibleColumns.map((col) => {
                                  let cellContent = '';
                                  if (col.dataField === '#') {
                                    cellContent = <strong>Total</strong>;
                                  } else if (col.dataField === 'quantity') {
                                    cellContent = (
                                      <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                        View Total
                                      </Button>
                                    );
                                  }
                                  return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                                })}
                              </tr>
                            </tfoot>
                          )}
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

      <Modal show={showQtyModal} onHide={() => setShowQtyModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Quantity Breakdown by Unit</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Total Quantity</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals.quantityByUnit).map(([unit, qty]) => (
                <tr key={unit}><td>{unit}</td><td>{qty.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* ── NEW: Expiry Details Modal ── */}
      {expiryViewItem && (
        <Modal show={showExpiryModal} onHide={handleCloseExpiryModal} centered>
          <Modal.Header closeButton className="view-modal-header">
            <Modal.Title>
              <FaCalendarCheck className="me-2" />
              Packet Expiry Details: {expiryViewItem.food_item}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="view-modal-body">
            <ListGroup variant="flush">
              <ListGroup.Item>
                <strong>AWC Name:</strong> {expiryViewItem.awc_name}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>AWC Code:</strong> {expiryViewItem.awc_code}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Food Item:</strong> {expiryViewItem.food_item}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Total Packets:</strong> {expiryViewItem.quantity} {expiryViewItem.unit}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Date of Receiving:</strong>{' '}
                {expiryViewItem.date ? new Date(expiryViewItem.date).toLocaleDateString() : '-'}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Months:</strong>{' '}
                {formatMonths(expiryViewItem.months || expiryViewItem.quarter)}
              </ListGroup.Item>
              <ListGroup.Item>
                <strong>Max Expiry Date:</strong>{' '}
                {expiryViewItem.max_expirydate ? new Date(expiryViewItem.max_expirydate).toLocaleDateString() : '-'}
              </ListGroup.Item>
            </ListGroup>

            <hr />

            <h6 className="mb-2">
              <FaCalendarCheck className="me-1" /> Packet-wise Expiry List
            </h6>
            <Table bordered striped size="sm" className="mb-0">
              <thead>
                <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
                  <th className="text-center" style={{ width: '50px' }}>S. No.</th>
                  <th className="text-center">Packets</th>
                  <th className="text-center">Expiry Date</th>
                  <th className="text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(expiryViewItem.packet_expiry) && expiryViewItem.packet_expiry.length > 0 ? (
                  expiryViewItem.packet_expiry.map((pe, i) => {
                    const count = Array.isArray(pe) ? pe[0] : (pe && pe.count);
                    const date = Array.isArray(pe) ? pe[1] : (pe && pe.date);
                    const remark = Array.isArray(pe) ? pe[2] : (pe && (pe.remark || pe.remarks));
                    return (
                      <tr key={i}>
                        <td className="text-center">{i + 1}</td>
                        <td className="text-center fw-semibold">{count == null || count === '' ? '-' : count}</td>
                        <td className="text-center">
                          {date ? new Date(date).toLocaleDateString() : '-'}
                        </td>
                        <td>{remark || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-muted p-3">
                      No packet expiry details available.
                    </td>
                  </tr>
                )}
              </tbody>
              {Array.isArray(expiryViewItem.packet_expiry) && expiryViewItem.packet_expiry.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
                    <td className="text-end">Total:</td>
                    <td className="text-center">
                      {expiryViewItem.packet_expiry.reduce((sum, pe) => {
                        const c = Array.isArray(pe) ? pe[0] : (pe && pe.count);
                        return sum + (parseFloat(c) || 0);
                      }, 0)}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseExpiryModal}>Close</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default CDPOHCMReceiving;