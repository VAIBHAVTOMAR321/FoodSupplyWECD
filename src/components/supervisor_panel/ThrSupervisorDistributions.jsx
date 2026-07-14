import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/supervisorleftnav.css";
import SupervisorHeader from "./SupervisorHeader";
import SupervisorLeftNav from "./SupervisorLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
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

const ThrSupervisorDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [openRemarkId, setOpenRemarkId] = useState(null);
  const [openRemarkAction, setOpenRemarkAction] = useState("");
  const [remarkValue, setRemarkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isPrinting, setIsPrinting] = useState(false);

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const tableRef = useRef(null);

  const [columns, setColumns] = useState([
    { dataField: '#', text: '#', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'fin_year', text: 'Fin Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'action', text: 'Action', visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const visibleColumns = columns.filter(c => c.visible);

  const [filters, setFilters] = useState({
    finYear: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    sector_status: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [beneficiaryCategories, setBeneficiaryCategories] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);

  useEffect(() => {
    if (distributions.length > 0) {
      setUniqueFinYears([...new Set(distributions.map(item => item.fin_year))]);
      const allMonths = distributions.flatMap(item => {
        const monthData = item.months || item.quarter;
        if (Array.isArray(monthData)) {
          return monthData;
        }
        if (typeof monthData === 'string' && quarterToMonths[monthData]) {
          return quarterToMonths[monthData];
        }
        return [];
      });
      setUniqueMonths([...new Set(allMonths)].map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)));
      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueSectorStatuses([...new Set(distributions.map(item => item.sector_status))]);
    }
  }, [distributions]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const filteredData = useMemo(() => {
    return distributions.filter(item => {
      const { finYear, months, district, project, sector, food_item, bene_category, sector_status } = filters;
      const itemMonths = (Array.isArray(item.months) ? item.months : quarterToMonths[item.quarter] || []).map(m => monthLabels[m] || m);      
      const monthMatch = months.length === 0 || months.some(filterMonth => itemMonths.includes(filterMonth));
      return (finYear.length === 0 || finYear.includes(item.fin_year)) &&
             monthMatch &&
             (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project)) &&
             (sector.length === 0 || sector.includes(item.sector)) &&
             (food_item.length === 0 || food_item.includes(item.food_item)) &&
             (bene_category.length === 0 || bene_category.includes(item.bene_category)) &&
             (sector_status.length === 0 || sector_status.includes(item.sector_status));
    });
  }, [distributions, filters]);


  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-supervisor-distributions/");
      const raw = response.data?.data || response.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setDistributions(items);
    } catch (err) {
      setError("Failed to fetch THR distributions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBeneficiaryCategories = async () => {
    try {
      const response = await api.get("/beneficiary-categories/");
      // Ensure we handle both direct array responses and object-wrapped arrays
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setBeneficiaryCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch beneficiary categories.", err);
      setError("Failed to fetch beneficiary categories.");
    }
  };

  useEffect(() => {
    if (api) {
      fetchDistributions();
      fetchBeneficiaryCategories();
    }
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleToggleRemark = (item, action) => {
    if (openRemarkId === item.id) {
      setOpenRemarkId(null);
      setOpenRemarkAction("");
    } else {
      setOpenRemarkId(item.id);
      setOpenRemarkAction(action);
      setRemarkValue("");
      setActionError("");
    }
  };

  const handleStatusUpdate = async (item) => {
    const action = openRemarkAction;
    const remark = remarkValue.trim();
    setActionError("");

    if (action === "rejected" && !remark) {
      setActionError("Please enter a remark for rejection.");
      return;
    }

    setSubmitting(true);
    setLoadingAction(prev => ({ ...prev, [item.id]: true }));
    try {
      const response = await api.put("/thr-supervisor-distributions/", {
        id: item.id,
        sector_status: action,
        sector_remark: remark || null,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Status updated to ${action} successfully.`);
        setDistributions(prev => prev.map(d =>
          d.id === item.id ? { ...d, sector_status: action, sector_remark: remark || null } : d
        ));
        setOpenRemarkId(null);
        setOpenRemarkAction("");
        setRemarkValue("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || "Failed to update status.");
      }
    } catch (err) {
      setActionError("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setLoadingAction(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleViewRemark = (item) => {
    setSelectedRemarks(item);
    setShowRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);
    setSelectedRemarks(null);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
        acc.beneficiaries += Number(item.total_beneficiaries) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const unit = item.unit || 'N/A';

        acc.quantity += quantity;
        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }
        acc.quantityByUnit[unit] += quantity;
        return acc;
    }, { beneficiaries: 0, quantity: 0, quantityByUnit: {} });
  }, [filteredData]);

  const exportToPDF = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const input = tableRef.current;
      const totalsTableContainer = document.createElement('div');
      // Styling for the totals table to ensure it's rendered properly
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

      if (!input) {
        console.error("Table element not found for PDF export.");
        setIsPrinting(false);
        return;
      }
      Promise.all([
        html2canvas(input, { scale: 2, useCORS: true }),
        html2canvas(totalsTableContainer, { scale: 2, useCORS: true })
      ]).then(([mainCanvas, totalsCanvas]) => {
        const mainImgData = mainCanvas.toDataURL('image/png');
        const totalsImgData = totalsCanvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        let yPos = 40;
        const mainRatio = mainCanvas.width / mainCanvas.height;
        const mainWidth = pdfWidth - 40;
        const mainHeight = mainWidth / mainRatio;
        pdf.text("THR Supervisor Distributions Report", 20, 30);
        pdf.addImage(mainImgData, 'PNG', 20, yPos, mainWidth, mainHeight);
        yPos += mainHeight + 20;
        const totalsRatio = totalsCanvas.width / totalsCanvas.height;
        const totalsWidth = pdfWidth / 2;
        const totalsHeight = totalsWidth / totalsRatio;
        if (yPos + totalsHeight < pdfHeight - 40) {
          pdf.addImage(totalsImgData, 'PNG', 20, yPos, totalsWidth, totalsHeight);
        }
        pdf.save('thr_supervisor_distributions.pdf');
        document.body.removeChild(totalsTableContainer);
        setIsPrinting(false);
      });
    }, 100);
  };

  const exportToExcel = () => {
    const visibleColumns = columns.filter(c => c.visible && c.dataField !== '#' && c.dataField !== 'action');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visibleColumns.forEach(col => {
        if (col.dataField === 'months') {
          newRow[col.text] = formatMonths(row.months || row.quarter);
        } else {
          newRow[col.text] = row[col.dataField];
        }
      });
      return newRow;
    });

    const totalRow = { '#': '' };
    visibleColumns.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = '';
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Supervisor Distributions");
    XLSX.writeFile(workbook, "thr_supervisor_distributions.xlsx");
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    items.push(
      <Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />,
      <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
    );
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    items.push(
      <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />,
      <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
    );
    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination size="sm">{items}</Pagination>
      </div>
    );
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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">THR Supervisor Distributions</h3>
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

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-finyear" className="w-100">
                  {filters.finYear.length ? `${filters.finYear.length} years selected` : 'All Fin. Years'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFinYears.map(year => (
                    <Dropdown.Item key={year} as="div">
                      <Form.Check type="checkbox" label={year} checked={filters.finYear.includes(year)} onChange={() => handleMultiSelectChange('finYear', year)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-months" className="w-100">
                  {filters.months.length ? `${filters.months.length} selected` : 'All Months'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueMonths.map(q => (
                    <Dropdown.Item key={q} as="div">
                      <Form.Check type="checkbox" label={q} checked={filters.months.includes(q)} onChange={() => handleMultiSelectChange('months', q)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district" className="w-100">
                  {filters.district.length ? `${filters.district.length} districts selected` : 'All Districts'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDistricts.map(d => (
                    <Dropdown.Item key={d} as="div">
                      <Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-project" className="w-100">
                  {filters.project.length ? `${filters.project.length} projects selected` : 'All Projects'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueProjects.map(p => (
                    <Dropdown.Item key={p} as="div">
                      <Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector" className="w-100">
                  {filters.sector.length ? `${filters.sector.length} sectors selected` : 'All Sectors'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectors.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-food-item" className="w-100">
                  {filters.food_item.length ? `${filters.food_item.length} items selected` : 'All Food Items'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFoodItems.map(item => (
                    <Dropdown.Item key={item} as="div">
                      <Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} >
              <Dropdown className="mt-2">
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {beneficiaryCategories.map(cat => (
                    <Dropdown.Item key={cat.id} as="div">
                      <Form.Check type="checkbox" label={cat.category_name} checked={filters.bene_category.includes(cat.category_name)} onChange={() => handleMultiSelectChange('bene_category', cat.category_name)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="d-flex align-items-end mt-2">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ finYear: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [], sector_status: [] })} className="me-2">Clear Filters</Button>
            </Col>
          </Row>

          {!isPrinting && successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {actionError && <Alert variant="danger" className="mb-3">{actionError}</Alert>}

          <Card className="shadow-sm">
           
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-muted">No THR distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table 
                    striped 
                    bordered 
                    hover 
                    responsive 
                    className="mb-0" 
                    ref={tableRef}
                    style={{ border: '1px solid #dee2e6' }}
                  >
                      <thead>
                        <tr>
                          {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col) => <th key={col.dataField} style={(col.dataField === 'bene_category' || col.dataField === 'food_item') ? { width: '200px' } : {}}>{col.text}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.length > 0 ? currentItems.map((row, index) => (
                          <React.Fragment key={row.id}>
                            <tr>
                                {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col, i) => {
                                  let cellContent;
                                  switch (col.dataField) {
                                    case '#':
                                      cellContent = index + 1;
                                      break;
                                    case 'food_item':
                                    case 'bene_category':
                                      cellContent = (
                                        <div className="bene-category-cell" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                          {row[col.dataField]}
                                        </div>
                                      );
                                      break;
                                    case 'months':
                                      cellContent = formatMonths(row.months || row.quarter);
                                      break;
                                    case 'sector_status':
                                      cellContent = isPrinting ? row[col.dataField] : <Badge bg={getStatusVariant(row[col.dataField])}>{row[col.dataField]}</Badge>;
                                      break;
                                    case 'action':
                                      cellContent = (
                                        <div className="d-flex align-items-center gap-2">
                                          <Button
                                            variant="outline-success"
                                            size="sm"
                                            disabled={row.sector_status === "approved" || row.sector_status === "rejected" || loadingAction[row.id]}
                                            onClick={() => handleToggleRemark(row, "approved")}
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            disabled={row.sector_status === "approved" || row.sector_status === "rejected" || loadingAction[row.id]}
                                            onClick={() => handleToggleRemark(row, "rejected")}
                                          >
                                            Reject
                                          </Button>
                                          <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleViewRemark(row)}
                                          >
                                            View Remark
                                          </Button>
                                        </div>
                                      );
                                      break;
                                    default:
                                      cellContent = row[col.dataField];
                                  }
                                  return <td key={col.dataField}>{cellContent}</td>;
                                })}
                            </tr>
                            {openRemarkId === row.id && (
                              <tr>
                                <td colSpan={visibleColumns.length}>
                                  <div className="d-flex align-items-start gap-2">
                                    <Form.Control
                                      type="text"
                                      size="sm"
                                      placeholder="Enter remark"
                                      value={remarkValue}
                                      onChange={(e) => setRemarkValue(e.target.value)}
                                      className="me-2"
                                      style={{ maxWidth: "300px" }}
                                    />
                                    <Button
                                      size="sm"
                                      variant={openRemarkAction === "approved" ? "success" : "danger"}
                                      disabled={submitting || loadingAction[row.id]}
                                      onClick={() => handleStatusUpdate(row)}
                                    >
                                      {loadingAction[row.id] ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={submitting || loadingAction[row.id]}
                                      onClick={() => {
                                        setOpenRemarkId(null);
                                        setOpenRemarkAction("");
                                        setRemarkValue("");
                                        setActionError("");
                                      }}
                                    >
                                       Cancel
                                     </Button>
           </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )) : (
                          <tr>
                            <td colSpan={visibleColumns.length} className="text-center">No data available</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col, i) => {
                            let cellContent = '';
                            if (i === 0) {
                              cellContent = <strong>Total</strong>;
                            } else if (col.dataField === 'total_beneficiaries') {
                              cellContent = <strong>{totals.beneficiaries}</strong>;
                            } else if (col.dataField === 'quantity') {
                              cellContent = (
                                <>
                                  
                                  {!isPrinting && (
                                    <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                      View Total
                                    </Button>
                                  )}
                                </>
                              );
                            }
                            return <td key={`total-${col.dataField}`}>{cellContent}</td>;
                          })}
                        </tr>
                      </tfoot>
                   </Table>
                  {renderPagination()}
                </div>
              )}
          
          </Card>
        </Container>

        <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>All Remarks - {selectedRemarks?.awc_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedRemarks && (
              <div>
                <div className="mb-3">
                  <h6>Sector Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.sector_status)}>{selectedRemarks.sector_status}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.sector_remark || "No remark"}</p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRemarkModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Show/Hide Columns</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={col.text}
                checked={col.visible}
                onChange={() => handleColumnToggle(index)}
              />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>
              Close
            </Button>
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
                  <tr key={unit}>
                    <td>{unit}</td>
                    <td>{qty.toFixed(2)}</td>
                  </tr>
                ))}
                {/* <tr className="table-active">
                  <td><strong>Grand Total</strong></td>
                  <td><strong>{totals.quantity.toFixed(2)}</strong></td>
                </tr> */}
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default ThrSupervisorDistributions;
