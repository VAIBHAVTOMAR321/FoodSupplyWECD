import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Badge,
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

const HcmSupervisorReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const tableRef = React.useRef(null);

  const { api } = useAuth();
  const [receivings, setReceivings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkRemark, setBulkRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    awc_name: [],
    food_item: [],
    project: [],
    sector: [],
    district: [],
    bene_category: [],
    startDate: "",
    endDate: "",
  });
  const [columns, setColumns] = useState([
    { dataField: "select", text: "Select", visible: true },
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
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "sector_remark", text: "Sector Remark", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const visibleColumns = columns.filter((c) => c.visible);

  const fetchReceivings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supervisor/hcm-receiving/");
      setReceivings(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch HCM receiving data.");
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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = pendingItemsOnPage.map((item) => item.id);
      // Add only pending IDs to the selection, preserving other selections if any
      setSelectedIds(prev => [...new Set([...prev, ...pendingIds])]);
    } else {
      // Deselect only the pending items shown on the current page
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter((v) => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
    setCurrentPage(1);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      awc_name: [],
      food_item: [],
      project: [],
      sector: [],
      district: [],
      bene_category: [],
      startDate: "",
      endDate: "",
    });
    setCurrentPage(1);
  };

  const uniqueValues = useMemo(() => {
    const values = {
      awc_name: [...new Set(receivings.map((item) => item.awc_name))],
      food_item: [...new Set(receivings.map((item) => item.food_item))],
      project: [...new Set(receivings.map((item) => item.project))],
      sector: [...new Set(receivings.map((item) => item.sector))],
      district: [...new Set(receivings.map((item) => item.district))],
      bene_category: [...new Set(receivings.map((item) => item.bene_category))],
    };
    Object.keys(values).forEach((key) => values[key].sort());
    return values;
  }, [receivings]);

  const filteredReceivings = useMemo(() => {
    return receivings.filter((item) => {
      const { startDate, endDate, ...otherFilters } = filters;
      const itemDate = new Date(item.date);

      const dateFilter =
        (!startDate || itemDate >= new Date(startDate)) &&
        (!endDate || itemDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999)));

      const multiSelectFilter = Object.keys(otherFilters).every((key) => {
        return filters[key].length === 0 || filters[key].includes(String(item[key]));
      });

      return dateFilter && multiSelectFilter;
    });
  }, [receivings, filters]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReceivings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReceivings.length / itemsPerPage);

  const pendingItemsOnPage = useMemo(() => 
    currentItems.filter(item => item.sector_status === 'pending' || !item.sector_status),
    [currentItems]
  );

  const areAllPendingSelected = useMemo(() => {
    if (pendingItemsOnPage.length === 0) return false;
    return pendingItemsOnPage.every(item => selectedIds.includes(item.id));
  }, [pendingItemsOnPage, selectedIds]);

  const canApprove = useMemo(() => {
    return selectedIds.some(id => {
      const item = receivings.find(r => r.id === id);
      return item && item.sector_status !== 'approved';
    });
  }, [selectedIds, receivings]);

  const canReject = useMemo(() => {
    return selectedIds.some(id => receivings.find(r => r.id === id)?.sector_status !== 'rejected');
  }, [selectedIds, receivings]);
  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      setActionError("No items selected for bulk action.");
      return;
    }
    if (bulkAction === "rejected" && !bulkRemark) {
      setActionError("Remark is required for rejection.");
      return;
    }

    setSubmitting(true);
    setActionError("");
    setSuccessMsg("");

    try {
      await api.put("/supervisor/hcm-receiving/", {
        ids: selectedIds,
        sector_status: bulkAction,
        sector_remark: bulkRemark,
      });

      setSuccessMsg(`Successfully ${bulkAction} ${selectedIds.length} items.`);
      fetchReceivings(); // Refetch data
      setSelectedIds([]);
      setShowBulkActionModal(false);
      setBulkRemark("");
    } catch (err) {
      setActionError("Failed to perform bulk action. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "pending":
      default:
        return "warning";
    }
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

      pdf.text("HCM Supervisor Receiving Report", 20, 30);
      pdf.addImage(
        imgData,
        "PNG",
        20,
        40,
        width,
        height > pdfHeight - 60 ? pdfHeight - 60 : height
      );
      pdf.save("hcm-supervisor-receiving.pdf");
    });
  };

  const exportToExcel = () => {
    const visCols = visibleColumns.filter(c => c.dataField !== '#' && c.dataField !== 'select' && c.dataField !== 'actions');
    const dataToExport = filteredReceivings.map((item, index) => {
      const row = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField === 'date') {
          row[col.text] = new Date(item.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
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
    XLSX.utils.book_append_sheet(wb, ws, "HCM Receiving");
    XLSX.writeFile(wb, "hcm-supervisor-receiving.xlsx");
  };

  const renderColumnModal = () => (
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
          <h3 className="mb-4">
            <FaUserCircle className="me-2" /> HCM Supervisor Receiving
          </h3>
          {successMsg && <Alert variant="success">{successMsg}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <Row className="mb-3 g-2 align-items-center">
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} selected` : 'All Districts'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.district.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange('district', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} selected` : 'All Sectors'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.sector.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange('sector', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} selected` : 'All Projects'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.project.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange('project', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.awc_name.length ? `${filters.awc_name.length} selected` : 'All AWC Names'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.awc_name.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.awc_name.includes(v)} onChange={() => handleMultiSelectChange('awc_name', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} selected` : 'All Food Items'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.food_item.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange('food_item', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.bene_category.length ? `${filters.bene_category.length} selected` : 'All Bene. Categories'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueValues.bene_category.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.bene_category.includes(v)} onChange={() => handleMultiSelectChange('bene_category', v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
          </Row>
          <Row className="mb-3 g-2 align-items-end">
            <Col md={3}><Form.Group><Form.Label>Start Date</Form.Label><Form.Control type="date" name="startDate" value={filters.startDate} onChange={handleDateChange} /></Form.Group></Col>
            <Col md={3}><Form.Group><Form.Label>End Date</Form.Label><Form.Control type="date" name="endDate" value={filters.endDate} onChange={handleDateChange} /></Form.Group></Col>
            <Col xs="auto"><Button variant="secondary" onClick={resetFilters}>Reset Filters</Button></Col>
          </Row>
          <Row className="mb-3">
            <Col>
              {selectedIds.length > 0 && (
                <div className="d-flex gap-2">
                  <Button variant="success" size="sm" onClick={() => { setBulkAction("approved"); setShowBulkActionModal(true); }} disabled={!canApprove}>
                    Approve Selected ({selectedIds.length})
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setBulkAction("rejected"); setShowBulkActionModal(true); }} disabled={!canReject}>
                    Reject Selected ({selectedIds.length})
                  </Button>
                </div>
              )}
            </Col>
          </Row>
          <div className="d-flex justify-content-end mb-3">
            <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf /> PDF</Button>
            <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2"><FaFileExcel /> Excel</Button>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}><FaEye /> Columns</Button>
          </div>
          <div className="table-responsive">
            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : (
              <Table striped bordered hover responsive ref={tableRef}>
                <thead>
                  <tr>
                    {visibleColumns.map((col) => (
                      <th key={col.dataField}>
                        {col.dataField === "select" ? (
                          <Form.Check type="checkbox" onChange={handleSelectAll} checked={areAllPendingSelected}
                          />
                        ) : (
                          col.text
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                      <tr key={item.id}>
                        {visibleColumns.map((col) => {
                          if (col.dataField === 'select') {
                            return <td key="select"><Form.Check type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} /></td>;
                          }
                          let cellContent;
                          switch (col.dataField) {
                            case "#":
                              cellContent = indexOfFirstItem + index + 1;
                              break;
                            case "date":
                              cellContent = new Date(item.date).toLocaleDateString();
                              break;
                            case "sector_status":
                              cellContent = <Badge bg={getStatusVariant(item.sector_status)}>{item.sector_status || 'pending'}</Badge>;
                              break;
                            case "actions":
                              return (<td key="actions" className="d-flex gap-1">
                                <Button variant="outline-success" size="sm" disabled={item.sector_status === 'approved'} onClick={() => { setBulkAction("approved"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>Approve</Button>
                                <Button variant="outline-danger" size="sm" disabled={item.sector_status === 'rejected'} onClick={() => { setBulkAction("rejected"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>Reject</Button>
                              </td>);
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
          <Modal show={showBulkActionModal} onHide={() => setShowBulkActionModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Bulk Action: {bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Remark {bulkAction === 'rejected' && '(Required)'}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter remark"
                  value={bulkRemark}
                  onChange={(e) => setBulkRemark(e.target.value)}
                />
              </Form.Group>
              {actionError && <Alert variant="danger" className="mt-3">{actionError}</Alert>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowBulkActionModal(false)}>Cancel</Button>
              <Button variant={bulkAction === 'approved' ? 'success' : 'danger'} onClick={handleBulkAction} disabled={submitting}>{submitting ? "Submitting..." : `Confirm ${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)}`}</Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default HcmSupervisorReceiving;
