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
  ListGroup,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dashboard.css";
import { FaUserCircle, FaFilePdf, FaFileExcel, FaEye, FaCalendarCheck } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";
import {
  getAllocationComparisonStyle,
  getFoodItemOptions,
  getStockAllocationComparison,
} from "./stockAllocationComparison";

// Helper to format months array to string
const formatMonthsArray = (months) => {
  if (!months) return "";
  if (Array.isArray(months)) return months.join(", ");
  return months;
};

const HcmSupervisorReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const tableRef = React.useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const { api } = useAuth();
  const [receivings, setReceivings] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [foodItemOptions, setFoodItemOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [allocationError, setAllocationError] = useState("");
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

  // ── NEW: Expiry details modal state ──
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [expiryViewItem, setExpiryViewItem] = useState(null);

  // Updated Columns state to include missing fields
  const [columns, setColumns] = useState([
    { dataField: "select", text: "Select", visible: true },
    { dataField: "#", text: "#", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: false },
    { dataField: "awc_type", text: "AWC Type", visible: false },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: false },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "max_expirydate", text: "Max Expiry Date", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "sector_remark", text: "Sector Remark", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);
  
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [modalData, setModalData] = useState({ title: "", totals: {} });

  const visibleColumns = columns.filter((c) => c.visible);

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

  const fetchReceivings = useCallback(async () => {
    setLoading(true);
    setError("");
    setAllocationError("");
    const [receivingResult, allocationResult, foodItemResult] = await Promise.allSettled([
      api.get("/supervisor/hcm-receiving/"),
      api.get("/supplementary-nutrition-supervisor/"),
      api.get("/categoryandfooditem/"),
    ]);

    if (receivingResult.status === "fulfilled") {
      setReceivings(receivingResult.value.data.data || []);
    } else {
      setError("Failed to fetch HCM receiving data.");
      console.error("Failed to fetch HCM receiving data:", receivingResult.reason);
    }

    if (allocationResult.status === "fulfilled") {
      const payload = allocationResult.value.data;
      const allocationRows = Array.isArray(payload) ? payload : payload?.data;
      if (Array.isArray(allocationRows) && payload?.success !== false) {
        setAllocations(allocationRows);
      } else {
        setAllocations([]);
        setAllocationError("Stock allocation data is unavailable; receiving rows cannot be compared.");
      }
    } else {
      setAllocations([]);
      setAllocationError("Failed to fetch stock allocation data; receiving rows cannot be compared.");
      console.error("Failed to fetch stock allocation data:", allocationResult.reason);
    }
    if (foodItemResult.status === "fulfilled") {
      const payload = foodItemResult.value.data;
      const options = getFoodItemOptions(payload);
      setFoodItemOptions(options);
      if (payload?.success === false || options.length === 0) {
        setAllocationError("Food item mappings are unavailable; receiving rows cannot be compared.");
      }
    } else {
      setFoodItemOptions([]);
      setAllocationError("Failed to fetch food item mappings; receiving rows cannot be compared.");
      console.error("Failed to fetch food item allocation mappings:", foodItemResult.reason);
    }
    setLoading(false);
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
      setSelectedIds(prev => [...new Set([...prev, ...pendingIds])]);
    } else {
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

  const totals = useMemo(() => {
    return filteredReceivings.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item.quantity) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      return acc;
    }, {
      quantityByUnit: {}
    });
  }, [filteredReceivings]);

  const calculateTotals = (data) => {
    if (!data) return {};
    return data.reduce((acc, item) => {
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item.quantity) || 0;
      if (!acc[unit]) { acc[unit] = 0; }
      acc[unit] += quantity;
      return acc;
    }, {});
  };

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

  const handleViewTotals = (data, title) => {
    const totals = calculateTotals(data);
    setModalData({ title, totals });
    setShowQuantityModal(true);
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
      fetchReceivings(); 
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
    setIsPrinting(true);
    setTimeout(() => {
      const mainTable = tableRef.current;
      const totalsTableContainer = document.createElement('div');
      totalsTableContainer.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif;">
          <h4 style="text-align: center; margin-bottom: 15px;">Total Quantity by Unit</h4>
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

      Promise.all([
        html2canvas(mainTable, { scale: 2, useCORS: true }),
        html2canvas(totalsTableContainer, { scale: 2, useCORS: true })
      ]).then(([mainCanvas, totalsCanvas]) => {
        const mainImgData = mainCanvas.toDataURL('image/png');
        const totalsImgData = totalsCanvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        pdf.text("HCM Supervisor Receiving Report", 20, 30);
        let yPos = 40;

        const mainRatio = mainCanvas.width / mainCanvas.height;
        const mainWidth = pdfWidth - 40;
        const mainHeight = mainWidth / mainRatio;
        pdf.addImage(mainImgData, 'PNG', 20, yPos, mainWidth, mainHeight);
        yPos += mainHeight + 20;

        const totalsRatio = totalsCanvas.width / totalsCanvas.height;
        const totalsWidth = pdfWidth / 2;
        const totalsHeight = totalsWidth / totalsRatio;

        if (yPos + totalsHeight > pdfHeight - 40) {
          pdf.addPage();
          yPos = 40;
        }
        pdf.addImage(totalsImgData, 'PNG', 20, yPos, totalsWidth, totalsHeight);

        pdf.save('hcm-supervisor-receiving.pdf');
        document.body.removeChild(totalsTableContainer);
        setIsPrinting(false);
      });
    }, 100);
  };

  const exportToExcel = () => {
    const visCols = visibleColumns.filter(c => c.dataField !== '#' && c.dataField !== 'select' && c.dataField !== 'actions' && c.dataField !== 'sector_remark');
    const dataToExport = filteredReceivings.map((item, index) => {
      const row = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField === 'quantity' && typeof item[col.dataField] === 'number') {
          row[col.text] = item[col.dataField].toFixed(2);
          return;
        }
        if (col.dataField === 'date') {
          row[col.text] = new Date(item.date).toLocaleDateString('en-CA');
        } else if (col.dataField === 'max_expirydate') {
          row[col.text] = item.max_expirydate ? new Date(item.max_expirydate).toLocaleDateString('en-CA') : '';
        } else if (col.dataField === 'months') {
          row[col.text] = formatMonthsArray(item.months);
        } else if (col.dataField === 'quarter') {
          row[col.text] = item.quarter || '';
        } else {
          row[col.text] = item[col.dataField];
        }
      });
      return row;
    });

    const quantityTotalsData = Object.entries(totals.quantityByUnit).map(([unit, total]) => ({
      'Unit': unit,
      'Total Quantity': total.toFixed(2)
    }));

    const mainWorksheet = XLSX.utils.json_to_sheet(dataToExport);
    const quantityWorksheet = XLSX.utils.json_to_sheet(quantityTotalsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, "HCM Receiving Report");
    XLSX.utils.book_append_sheet(workbook, quantityWorksheet, "Quantity Totals");

    XLSX.writeFile(workbook, "hcm-supervisor-receiving.xlsx");
  };

  const renderColumnModal = () => (
    <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Show/Hide Columns</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {columns.map((col, index) => (col.dataField !== 'select' &&
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
          {allocationError && <Alert variant="warning">{allocationError}</Alert>}
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
                    {visibleColumns.filter(col => !isPrinting || (col.dataField !== 'select' && col.dataField !== 'actions')).map((col) => (
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
                    currentItems.map((item, index) => {
                      const comparison = getStockAllocationComparison(
                        item,
                        allocations,
                        foodItemOptions,
                        "HCM"
                      );
                      const comparisonStyle = getAllocationComparisonStyle(comparison);
                      return (
                      <tr key={item.id} title={comparison ? `Received: ${comparison.received}; allocation: ${comparison.allocated}` : undefined}>{visibleColumns.filter(col => !isPrinting || (col.dataField !== 'select' && col.dataField !== 'actions')).map((col) => {
                          if (col.dataField === 'select') {
                            return <td key="select" style={comparisonStyle}><Form.Check type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectOne(item.id)} /></td>;
                          }
                          let cellContent;
                          switch (col.dataField) {
                            case "#":
                              cellContent = indexOfFirstItem + index + 1;
                              break;
                            case "date":
                              cellContent = new Date(item.date).toLocaleDateString();
                              break;
                            case "max_expirydate":
                              cellContent = item.max_expirydate ? new Date(item.max_expirydate).toLocaleDateString() : '-';
                              break;
                            case "months":
                              cellContent = formatMonthsArray(item.months);
                              break;
                            case "quarter":
                              cellContent = item.quarter || '-';
                              break;
                            case "sector_status":
                              if (isPrinting) {
                                cellContent = <div>{item.sector_status || 'pending'}</div>;
                              } else {
                                cellContent = <Badge bg={getStatusVariant(item.sector_status)}>{item.sector_status || 'pending'}</Badge>;
                              }
                              break;
                            case "actions":
                              return (
                                <td key="actions" style={comparisonStyle}>
                                  <div className="d-flex gap-1 flex-wrap">
                                    <Button variant="outline-success" size="sm" disabled={item.sector_status === 'approved'} onClick={() => { setBulkAction("approved"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>Approve</Button>
                                    <Button variant="outline-danger" size="sm" disabled={item.sector_status === 'rejected'} onClick={() => { setBulkAction("rejected"); setSelectedIds([item.id]); setShowBulkActionModal(true); }}>Reject</Button>
                                    {/* ── NEW: Expiry button ── */}
                                    {hasPacketExpiry(item) && (
                                      <Button
                                        variant="outline-warning"
                                        size="sm"
                                        onClick={() => handleOpenExpiryModal(item)}
                                        title="View Packet Expiry Details"
                                      >
                                        <FaCalendarCheck /> Expiry
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              );
                            default:
                              cellContent = item[col.dataField];
                          }
                          return <td key={col.dataField} style={comparisonStyle}>{cellContent}</td>;
                        })}
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length} className="text-center">
                        No receiving records found.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={visibleColumns.findIndex(c => c.dataField === 'quantity')}>Total</td>
                    {visibleColumns.slice(visibleColumns.findIndex(c => c.dataField === 'quantity')).map(col => {
                      if (col.dataField === 'quantity') {
                        return (
                          <td key="total_quantity">
                            {!isPrinting && <Button variant="link" size="sm" onClick={() => handleViewTotals(filteredReceivings, 'HCM Supervisor Receiving Totals')}>View Totals</Button>}
                          </td>
                        );
                      }
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
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

          <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>{modalData.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {Object.keys(modalData.totals).length > 0 ? (
                <Table striped bordered>
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Total Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modalData.totals).map(([unit, total]) => (
                      <tr key={unit}><td>{unit}</td><td>{total.toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </Table>
              ) : <p>No quantity data to display.</p>}
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
                    {formatMonthsArray(expiryViewItem.months)}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Max Expiry Date:</strong>{' '}
                    {expiryViewItem.max_expirydate ? new Date(expiryViewItem.max_expirydate).toLocaleDateString() : '-'}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Sector Status:</strong>{' '}
                    <Badge bg={getStatusVariant(expiryViewItem.sector_status)}>
                      {expiryViewItem.sector_status || 'pending'}
                    </Badge>
                  </ListGroup.Item>
                  {expiryViewItem.sector_remark && (
                    <ListGroup.Item>
                      <strong>Sector Remark:</strong> {expiryViewItem.sector_remark}
                    </ListGroup.Item>
                  )}
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

        </Container>
      </div>
    </div>
  );
};

export default HcmSupervisorReceiving;