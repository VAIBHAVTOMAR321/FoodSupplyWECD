import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/itcellLeftnav.css";

import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";
import { FaFilePdf, FaFileExcel, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const ITCellTHRReport = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [filters, setFilters] = useState({
    finYear: [],
    quarter: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [foodItems, setFoodItems] = useState([]);

  const initialColumns = [
    { dataField: '#', text: '#', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'fin_year', text: 'Fin. Year', visible: true },
    { dataField: 'quarter', text: 'Quarter', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'cdpo_status', text: 'CDPO Status', visible: true },
    { dataField: 'dpo_status', text: 'DPO Status', visible: true },
    { dataField: 'action', text: 'Action', visible: true },
  ];

  const [columns, setColumns] = useState(initialColumns);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-director-distributions/");
      const data = response.data.data || [];
      setReportData(data);
      setUniqueFinYears([...new Set(data.map((item) => item.fin_year))]);
      setUniqueQuarters([...new Set(data.map((item) => item.quarter))]);
      setUniqueDistricts([...new Set(data.map((item) => item.district))]);
      setUniqueProjects([...new Set(data.map((item) => item.project))]);
      setUniqueSectors([...new Set(data.map((item) => item.sector))]);
      setUniqueFoodItems([...new Set(data.map((item) => item.food_item))]);
      fetchFoodItems();
    } catch (err) {
      setError("Failed to fetch THR report data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchFoodItems = useCallback(async () => {
    try {
      const response = await api.get("/thr-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      setFoodItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch THR food items.", err);
    }
  }, [api]);

  useEffect(() => {
    fetchData();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  useEffect(() => {
    let data = [...reportData];
    if (filters.finYear.length) data = data.filter((item) => filters.finYear.includes(item.fin_year));
    if (filters.quarter.length) data = data.filter((item) => filters.quarter.includes(item.quarter));
    if (filters.district.length) data = data.filter((item) => filters.district.includes(item.district));
    if (filters.project.length) data = data.filter((item) => filters.project.includes(item.project));
    if (filters.sector.length) data = data.filter((item) => filters.sector.includes(item.sector));
    if (filters.food_item.length) data = data.filter((item) => filters.food_item.includes(item.food_item));
    setFilteredData(data);
    setCurrentPage(1);
  }, [filters, reportData]);

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

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const handleShowEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({ ...item });
    setFormErrors({});
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
    setFormErrors({});

    const payload = {
      ...editFormData,
      id: editingItem.id, // Ensure id is correctly passed
      total_beneficiaries: parseInt(editFormData.total_beneficiaries, 10),
      quantity: parseFloat(editFormData.quantity).toFixed(2),
    };
    delete payload.created_at; // Do not send these fields on update
    delete payload.updated_at;

    try {
      await api.put("/thr-director-distributions/", payload);
      handleCloseEditModal();
      fetchData(); // Refresh data
    } catch (err) {
      setFormErrors({ api: "Failed to update record. Please try again." });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await api.delete("/thr-director-distributions/", { data: { id: [id] } });
        fetchData(); // Refresh data
      } catch (err) {
        setError("Failed to delete record. Please try again.");
        console.error(err);
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
        acc.beneficiaries += Number(item.total_beneficiaries) || 0;
        acc.quantity += parseFloat(item.quantity) || 0;
        return acc;
    }, { beneficiaries: 0, quantity: 0 });
  }, [filteredData]);

  const exportToPDF = () => {
    const visibleColumns = columns.filter(c => c.visible);
    const head = [visibleColumns.map(c => c.text)];
    const body = filteredData.map((row, index) =>
      visibleColumns.map(col => {
        if (col.dataField === '#') return index + 1;
        if (col.dataField === 'action') return ''; // Skip action column in PDF
        const value = row[col.dataField];
        return value !== null && value !== undefined ? String(value) : '';
      })
    );

    const totalRow = visibleColumns.map((col, idx) => {
      if (idx === 0) return 'Total';
      if (col.dataField === 'total_beneficiaries') return totals.beneficiaries.toString();
      if (col.dataField === 'quantity') return totals.quantity.toFixed(2).toString();
      return '';
    });
    body.push(totalRow);

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("THR Distribution Report", 14, 16);
    autoTable(doc, {
      startY: 20,
      head: head,
      body: body,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
    doc.save('thr_it_cell_report.pdf');
  };

  const exportToExcel = () => {
    const visibleColumns = columns.filter(c => c.visible && c.dataField !== '#' && c.dataField !== 'action');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visibleColumns.forEach(col => {
        newRow[col.text] = row[col.dataField];
      });
      return newRow;
    });

    const totalRow = { '#': 'Total' };
    visibleColumns.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = totals.quantity.toFixed(2);
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Report");
    XLSX.writeFile(workbook, "thr_it_cell_report.xlsx");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item key={number} active={number === currentPage} onClick={() => paginate(number)}>
        {number}
      </Pagination.Item>,
    );
  }

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">THR Distribution Report</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                <FaFilePdf className="me-1" /> Export PDF
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel}>
                <FaFileExcel className="me-1" /> Export Excel
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)} className="ms-2">
                <FaEye className="me-1" /> Column Visibility
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            {/* Filter Dropdowns */}
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.finYear.length ? `${filters.finYear.length} years selected` : 'All Fin. Years'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueFinYears.map(year => (<Dropdown.Item key={year} as="div"><Form.Check type="checkbox" label={year} checked={filters.finYear.includes(year)} onChange={() => handleMultiSelectChange('finYear', year)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.quarter.length ? `${filters.quarter.length} quarters selected` : 'All Quarters'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueQuarters.map(q => (<Dropdown.Item key={q} as="div"><Form.Check type="checkbox" label={q} checked={filters.quarter.includes(q)} onChange={() => handleMultiSelectChange('quarter', q)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} districts selected` : 'All Districts'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueDistricts.map(d => (<Dropdown.Item key={d} as="div"><Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} projects selected` : 'All Projects'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueProjects.map(p => (<Dropdown.Item key={p} as="div"><Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} sectors selected` : 'All Sectors'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueSectors.map(s => (<Dropdown.Item key={s} as="div"><Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} items selected` : 'All Food Items'}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueFoodItems.map(item => (<Dropdown.Item key={item} as="div"><Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
          </Row>

          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              <Table striped bordered hover responsive className="bg-white">
                <thead>
                  <tr>{columns.map((col, index) => col.visible && <th key={index}>{col.text}</th>)}</tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? currentItems.map((row, index) => (
                    <tr key={row.id}>
                      {columns.map((col, i) => {
                        if (!col.visible) return null;
                        let cellContent;
                        switch (col.dataField) {
                          case '#':
                            cellContent = indexOfFirstItem + index + 1;
                            break;
                          case 'sector_status':
                          case 'cdpo_status':
                          case 'dpo_status':
                            cellContent = <span className={`badge bg-${row[col.dataField] === 'approved' ? 'success' : row[col.dataField] === 'rejected' ? 'danger' : 'warning'}`}>{row[col.dataField]}</span>;
                            break;
                          case 'action':
                            cellContent = (
                              <>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(row)}><FaEdit /></Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(row.id)}><FaTrash /></Button>
                              </>
                            );
                            break;
                          default:
                            cellContent = row[col.dataField];
                        }
                        return <td key={i}>{cellContent}</td>;
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={columns.filter(c => c.visible).length} className="text-center">No data available</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')}>Total</td>
                    {columns.filter(c => c.visible).slice(columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')).map(col => {
                      if (col.dataField === 'total_beneficiaries') {
                        return <td key="total_beneficiaries">{totals.beneficiaries}</td>;
                      }
                      if (col.dataField === 'quantity') {
                        return <td key="total_quantity">{totals.quantity.toFixed(2)}</td>;
                      }
                      // Render empty cells for other columns in the footer, including the action column
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
              </Table>
              {totalPages > 1 && (
                <Pagination className="justify-content-end">
                  {paginationItems}
                </Pagination>
              )}
            </>
          )}
        </Container>

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

        {editingItem && (
          <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Edit THR Distribution</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {formErrors.api && <Alert variant="danger">{formErrors.api}</Alert>}
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Food Item</Form.Label>
                      <Form.Control as="select" name="food_item" value={editFormData.food_item} onChange={handleEditFormChange} required>
                        <option value="">Select Food Item</option>
                        {foodItems.map(fi => <option key={fi.id} value={fi.food_item}>{fi.food_item}</option>)}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Total Beneficiaries</Form.Label>
                      <Form.Control type="number" name="total_beneficiaries" value={editFormData.total_beneficiaries} onChange={handleEditFormChange} required />
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
                      <Form.Control as="select" name="quarter" value={editFormData.quarter} onChange={handleEditFormChange} required>
                        <option value="">Select Quarter</option>
                        <option value="apr-may-jun">April-May-June</option>
                        <option value="jul-aug-sep">July-August-September</option>
                        <option value="oct-nov-dec">October-November-December</option>
                        <option value="jan-feb-mar">January-February-March</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>AWC Name</Form.Label>
                      <Form.Control type="text" name="awc_name" value={editFormData.awc_name} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>AWC Code</Form.Label>
                      <Form.Control type="text" name="awc_code" value={editFormData.awc_code} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                 <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sector Status</Form.Label>
                      <Form.Control as="select" name="sector_status" value={editFormData.sector_status} onChange={handleEditFormChange}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>CDPO Status</Form.Label>
                      <Form.Control as="select" name="cdpo_status" value={editFormData.cdpo_status} onChange={handleEditFormChange}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>DPO Status</Form.Label>
                      <Form.Control as="select" name="dpo_status" value={editFormData.dpo_status} onChange={handleEditFormChange}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Quantity</Form.Label>
                      <Form.Control type="number" step="0.01" name="quantity" value={editFormData.quantity} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end">
                  <Button variant="secondary" onClick={handleCloseEditModal} className="me-2">
                    Cancel
                  </Button>
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

export default ITCellTHRReport;