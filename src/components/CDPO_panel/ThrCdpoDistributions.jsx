import React, { useState, useEffect, useMemo } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ThrCdpoDistributions = () => {
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

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);

  const [columns, setColumns] = useState([
    { dataField: '#', text: '#', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'fin_year', text: 'Fin Year', visible: true },
    { dataField: 'quarter', text: 'Quarter', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'cdpo_status', text: 'CDPO Status', visible: true },
    { dataField: 'dpo_status', text: 'DPO Status', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'cdpo_remark', text: 'CDPO Remark', visible: true },
    { dataField: 'action', text: 'Action', visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const visibleColumns = columns.filter(c => c.visible);

  const [filters, setFilters] = useState({
    finYear: [],
    quarter: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    cdpo_status: [],
    dpo_status: [],
    sector_status: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueCdpoStatuses, setUniqueCdpoStatuses] = useState([]);
  const [uniqueDpoStatuses, setUniqueDpoStatuses] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);

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

  useEffect(() => {
    if (distributions.length > 0) {
      setUniqueFinYears([...new Set(distributions.map(item => item.fin_year))]);
      setUniqueQuarters([...new Set(distributions.map(item => item.quarter))]);
      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueCdpoStatuses([...new Set(distributions.map(item => item.cdpo_status))]);
      setUniqueDpoStatuses([...new Set(distributions.map(item => item.dpo_status))]);
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
      const { finYear, quarter, district, project, sector, food_item, cdpo_status, dpo_status, sector_status } = filters;
      return (finYear.length === 0 || finYear.includes(item.fin_year)) &&
             (quarter.length === 0 || quarter.includes(item.quarter)) &&
             (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project)) &&
             (sector.length === 0 || sector.includes(item.sector)) &&
             (food_item.length === 0 || food_item.includes(item.food_item)) &&
             (cdpo_status.length === 0 || cdpo_status.includes(item.cdpo_status)) &&
             (dpo_status.length === 0 || dpo_status.includes(item.dpo_status)) &&
             (sector_status.length === 0 || sector_status.includes(item.sector_status));
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-cdpo-distributions/");
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

  useEffect(() => {
    if (api) {
      fetchDistributions();
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
      const response = await api.put("/thr-cdpo-distributions/", {
        id: item.id,
        cdpo_status: action,
        cdpo_remark: remark || null,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Status updated to ${action} successfully.`);
        setDistributions(prev => prev.map(d =>
          d.id === item.id ? { ...d, cdpo_status: action, cdpo_remark: remark || null } : d
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
        acc.quantity += parseFloat(item.quantity) || 0;
        return acc;
    }, { beneficiaries: 0, quantity: 0 });
  }, [filteredData]);

  const exportToPDF = () => {
    const visCols = columns.filter(c => c.visible);
    const head = [visCols.map(c => c.text)];
    const body = filteredData.map((row, index) =>
      visCols.map(col => {
        if (col.dataField === '#') return index + 1;
        const value = row[col.dataField];
        return value !== null && value !== undefined ? String(value) : '';
      })
    );

    const beneficiaryIndex = visCols.findIndex(c => c.dataField === 'total_beneficiaries');
    const totalRow = visCols.map((col, idx) => {
      if (idx < beneficiaryIndex) return '';
      if (col.dataField === 'total_beneficiaries') return String(totals.beneficiaries);
      if (col.dataField === 'quantity') return totals.quantity.toFixed(2);
      return '';
    });
    body.push(totalRow);

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("THR CDPO Distributions Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: head,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save('thr_cdpo_distributions.pdf');
  };

  const exportToExcel = () => {
    const visCols = columns.filter(c => c.visible && c.dataField !== '#');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField !== '#') {
          newRow[col.text] = row[col.dataField];
        }
      });
      if (columns.find(c => c.dataField === 'cdpo_remark')?.visible) newRow['CDPO Remark'] = row.cdpo_remark;
      if (columns.find(c => c.dataField === 'sector_status')?.visible) newRow['Sector Remark'] = row.sector_remark;
      return newRow;
    });

    const beneficiaryIndex = visCols.findIndex(c => c.dataField === 'total_beneficiaries');
    const totalRow = { '#': '' };
    visCols.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = totals.quantity.toFixed(2);
      else totalRow[col.text] = '';
    });
    if (columns.find(c => c.dataField === 'cdpo_remark')?.visible) totalRow['CDPO Remark'] = '';
    if (columns.find(c => c.dataField === 'sector_status')?.visible) totalRow['Sector Remark'] = '';
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR CDPO Distributions");
    XLSX.writeFile(workbook, "thr_cdpo_distributions.xlsx");
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
      <CDPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">THR CDPO Distributions</h3>
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
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-quarter" className="w-100">
                  {filters.quarter.length ? `${filters.quarter.length} quarters selected` : 'All Quarters'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueQuarters.map(q => (
                    <Dropdown.Item key={q} as="div">
                      <Form.Check type="checkbox" label={q} checked={filters.quarter.includes(q)} onChange={() => handleMultiSelectChange('quarter', q)} />
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
          </Row>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-cdpo-status" className="w-100">
                  {filters.cdpo_status.length ? `${filters.cdpo_status.length} selected` : 'All CDPO Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueCdpoStatuses.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.cdpo_status.includes(s)} onChange={() => handleMultiSelectChange('cdpo_status', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-dpo-status" className="w-100">
                  {filters.dpo_status.length ? `${filters.dpo_status.length} selected` : 'All DPO Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDpoStatuses.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.dpo_status.includes(s)} onChange={() => handleMultiSelectChange('dpo_status', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status" className="w-100">
                  {filters.sector_status.length ? `${filters.sector_status.length} selected` : 'All Sector Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectorStatuses.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.sector_status.includes(s)} onChange={() => handleMultiSelectChange('sector_status', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          {successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {actionError && <Alert variant="danger" className="mb-3">{actionError}</Alert>}

          <Card className="shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-muted">No THR distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover responsive className="mb-0">
                     <thead>
                       <tr>
                         {visibleColumns.map((col) => <th key={`th-${col.dataField}`}>{col.text}</th>)}
                       </tr>
                     </thead>
                      <tbody>
                        {currentItems.length > 0 ? currentItems.map((row, index) => (
                          <React.Fragment key={row.id}>
                            <tr>
                                {visibleColumns.map((col) => {
                                  let cellContent;
                                  switch (col.dataField) {
                                    case '#':
                                      cellContent = index + 1;
                                      break;
                                    case 'cdpo_status':
                                    case 'dpo_status':
                                    case 'sector_status':
                                      cellContent = <Badge bg={getStatusVariant(row[col.dataField])}>{row[col.dataField]}</Badge>;
                                      break;
                                    case 'action':
                                      cellContent = (
                                        <div className="d-flex align-items-center gap-2">
                                          <Button
                                            variant="outline-success"
                                            size="sm"
                                            disabled={row.sector_status === "pending" || row.sector_status === "pendings" || row.cdpo_status === "approved" || row.cdpo_status === "rejected" || loadingAction[row.id]}
                                            onClick={() => handleToggleRemark(row, "approved")}
                                          >
                                            Approve
                                          </Button>
                                          <Button
                                            variant="outline-danger"
                                            size="sm"
                                            disabled={row.sector_status === "pending" || row.sector_status === "pendings" || row.cdpo_status === "approved" || row.cdpo_status === "rejected" || loadingAction[row.id]}
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
                                  return <td key={`td-${row.id}-${col.dataField}`}>{cellContent}</td>;
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
                          {visibleColumns.map((col) => {
                            let cellContent = '';
                            if (col.dataField === '#') {
                              cellContent = <strong>Total</strong>;
                            } else if (col.dataField === 'total_beneficiaries') {
                              cellContent = <strong>{totals.beneficiaries}</strong>;
                            } else if (col.dataField === 'quantity') {
                              cellContent = <strong>{totals.quantity.toFixed(2)}</strong>;
                            }
                            return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                          })}
                        </tr>
                      </tfoot>
                   </Table>
                  {renderPagination()}
                </div>
              )}
            </Card.Body>
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
                  <h6>CDPO Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.cdpo_status)}>{selectedRemarks.cdpo_status || "pending"}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.cdpo_remark || "No remark"}</p>
                </div>
                <hr />
                <div className="mb-3">
                  <h6>DPO Remark</h6>
                  <p className="mb-1"><strong>Status:</strong> <Badge bg={getStatusVariant(selectedRemarks.dpo_status)}>{selectedRemarks.dpo_status || "pending"}</Badge></p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.dpo_remark || "No remark"}</p>
                </div>
                <hr />
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

      </div>
    </div>
  );
};

export default ThrCdpoDistributions;
