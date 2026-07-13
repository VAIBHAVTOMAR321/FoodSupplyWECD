import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const HcmCdpoDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isPrinting, setIsPrinting] = useState(false);
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
    { dataField: 'date', text: 'Date', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const [filters, setFilters] = useState({
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    awc_type: [],
    startDate: '',
    endDate: '',
  });
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueAwcTypes, setUniqueAwcTypes] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

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
      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueAwcTypes([...new Set(distributions.map(item => item.awc_type))]);
      setUniqueBeneCategories([...new Set(distributions.map(item => item.bene_category))]);
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
      const { district, project, sector, food_item, awc_type, bene_category, startDate, endDate } = filters;
      const matchesFilters = (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project)) &&
             (sector.length === 0 || sector.includes(item.sector)) &&
             (food_item.length === 0 || food_item.includes(item.food_item)) &&
             (bene_category.length === 0 || bene_category.includes(item.bene_category)) &&
             (awc_type.length === 0 || awc_type.includes(item.awc_type));

      const itemDate = item.date ? new Date(item.date) : null;
      const matchesDateRange = (!startDate || (itemDate && itemDate >= new Date(startDate))) &&
                               (!endDate || (itemDate && itemDate <= new Date(endDate + 'T23:59:59')));

      return matchesFilters && matchesDateRange;
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hcm-cdpo-distributions/");
      const raw = response.data?.data || response.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setDistributions(items);
    } catch (err) {
      setError("Failed to fetch HCM distributions.");
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

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter(c => c.visible);

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
      if (!input) {
        console.error("Table element not found for PDF export.");
        setIsPrinting(false);
        return;
      }
      html2canvas(input, {
        scale: 2, // Higher scale for better quality
        useCORS: true
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: 'a4'
        });
  
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        const width = pdfWidth - 40; // with some margin
        const height = width / ratio;
  
        pdf.text("HCM CDPO Distributions Report", 20, 30);
        pdf.addImage(imgData, 'PNG', 20, 40, width, height);
        pdf.save('hcm_cdpo_distributions.pdf');
        setIsPrinting(false);
      });
    }, 100);
  };

  const exportToExcel = () => {
    const visCols = columns.filter(c => c.visible && c.dataField !== '#');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visCols.forEach(col => {
        if (col.dataField !== '#') {
          if (col.dataField === 'date' && row[col.dataField]) {
            newRow[col.text] = new Date(row[col.dataField]).toLocaleDateString('en-GB');
          } else {
            newRow[col.text] = row[col.dataField];
          }
        }
      });
      return newRow;
    });

    const beneficiaryIndex = visCols.findIndex(c => c.dataField === 'total_beneficiaries');
    const totalRow = { '#': '' };
    visCols.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = '';
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HCM CDPO Distributions");
    XLSX.writeFile(workbook, "hcm_cdpo_distributions.xlsx");
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
            <h3 className="mb-0">HCM CDPO Distributions</h3>
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
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-awc-type" className="w-100">
                  {filters.awc_type.length ? `${filters.awc_type.length} types selected` : 'All AWC Types'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueAwcTypes.map(t => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check type="checkbox" label={t} checked={filters.awc_type.includes(t)} onChange={() => handleMultiSelectChange('awc_type', t)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(t => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check type="checkbox" label={t} checked={filters.bene_category.includes(t)} onChange={() => handleMultiSelectChange('bene_category', t)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={3}>
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
            </Col>
            <Col md={2}>
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ district: [], project: [], sector: [], food_item: [], awc_type: [], bene_category: [], startDate: '', endDate: '' })} className="me-2">
                Clear Filters
              </Button>
            </Col>
          </Row>

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <Card className="shadow-sm">
          
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-muted">No HCM distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table 
                    striped 
                    bordered 
                    hover 
                    responsive 
                    className="mb-0" 
                    ref={tableRef}
                    style={{ border: '1px solid #988c8c' }}
                  >
                     <thead>
                       <tr>
                         {visibleColumns.map((col) => <th key={`th-${col.dataField}`}>{col.text}</th>)}
                       </tr>
                     </thead>
                      <tbody>
                        {currentItems.length > 0 ? currentItems.map((row, index) => (
                          <tr key={`row-${row.id}`}>
                            {visibleColumns.map((col) => {
                              let cellContent;
                              if (col.dataField === '#') {
                                cellContent = index + 1;
                              } else if (col.dataField === 'date' && row[col.dataField]) {
                                cellContent = new Date(row[col.dataField]).toLocaleDateString('en-GB');
                              } else {
                                cellContent = row[col.dataField];
                              }
                              return <td key={`td-${row.id}-${col.dataField}`}>{cellContent}</td>;
                            })}
                          </tr>
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
                              cellContent = (
                                <div className="d-flex align-items-center justify-content-end">
                                 
                                  {!isPrinting && (
                                    <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)} className="p-1">
                                      View Total
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                            return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                          })}
                        </tr>
                      </tfoot>
                   </Table>
                  {renderPagination()}
                </div>
              )}
           
          </Card>
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
                
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default HcmCdpoDistributions;
