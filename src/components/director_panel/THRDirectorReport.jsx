import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const THRDirectorReport = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

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
    bene_category: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const initialColumns = [
    { dataField: '#', text: '#', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'fin_year', text: 'Fin. Year', visible: true },
    { dataField: 'quarter', text: 'Quarter', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'cdpo_status', text: 'CDPO Status', visible: true },
    { dataField: 'dpo_status', text: 'DPO Status', visible: true },
  ];

  const [columns, setColumns] = useState(initialColumns);
  const tableRef = useRef(null);

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
      setUniqueBeneCategories([...new Set(data.map((item) => item.bene_category))]);
    } catch (err) {
      setError("Failed to fetch THR report data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

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
    if (filters.bene_category.length) data = data.filter((item) => filters.bene_category.includes(item.bene_category));
    setFilteredData(data);
    setCurrentPage(1);
  }, [filters, reportData]);

  // const handleFilterChange = (e) => {
  //   setFilters({ ...filters, [e.target.name]: e.target.value });
  // };

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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
        acc.beneficiaries += Number(item.total_beneficiaries) || 0;
        acc.quantity += parseFloat(item.quantity) || 0;
        return acc;
    }, { beneficiaries: 0, quantity: 0 });
  }, [filteredData]);

  const exportToPDF = () => {
    const input = tableRef.current;
    if (!input) {
      console.error("Table element not found for PDF export.");
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

      pdf.text("THR Distribution Report", 20, 30);
      pdf.addImage(imgData, 'PNG', 20, 40, width, height);
      pdf.save('thr_director_report.pdf');
    });
  };

  const exportToExcel = () => {
    const visibleColumns = columns.filter(c => c.visible && c.dataField !== '#');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = { '#': index + 1 };
      visibleColumns.forEach(col => {
        if (col.dataField !== '#') {
          newRow[col.text] = row[col.dataField];
        }
      });
      if (columns.find(c => c.dataField === 'sector_status')?.visible) newRow['Sector Remark'] = row.sector_remark;
      if (columns.find(c => c.dataField === 'cdpo_status')?.visible) newRow['CDPO Remark'] = row.cdpo_remark;
      if (columns.find(c => c.dataField === 'dpo_status')?.visible) newRow['DPO Remark'] = row.dpo_remark;
      return newRow;
    });

    const totalRow = { '#': 'Total' };
    visibleColumns.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = totals.quantity.toFixed(2);
      else totalRow[col.text] = '';
    });
    // Clear remark columns for the total row
    if (columns.some(c => c.dataField === 'sector_status' && c.visible)) totalRow['Sector Remark'] = '';
    if (columns.some(c => c.dataField === 'cdpo_status' && c.visible)) totalRow['CDPO Remark'] = '';
    if (columns.some(c => c.dataField === 'dpo_status' && c.visible)) totalRow['DPO Remark'] = '';
    dataToExport.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Report");
    XLSX.writeFile(workbook, "thr_director_report.xlsx");
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
      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
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
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (
                    <Dropdown.Item key={cat} as="div">
                      <Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <>
              <Table striped bordered hover responsive className="bg-white" ref={tableRef} style={{ border: '1px solid #dee2e6' }}>
                <thead>
                  <tr>
                    {columns.map((col, index) => col.visible && (
                      <th key={index}>
                        {col.dataField === 'bene_category' ? (
                          <div className="bene-category-cell" style={{ width: '150px' }}>{col.text}</div>
                        ) : col.text}
                      </th>
                    ))}
                  </tr>
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
                          case 'bene_category':
                            cellContent = (
                              <div className="bene-category-cell" style={{ width: '150px' }}>
                                {row[col.dataField]}
                              </div>
                            );
                            break;
                          case 'sector_status':
                          case 'cdpo_status':
                          case 'dpo_status':
                            cellContent = <span className={`badge bg-${row[col.dataField] === 'approved' ? 'success' : row[col.dataField] === 'rejected' ? 'danger' : 'warning'}`}>{row[col.dataField]}</span>;
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
      </div>
    </div>
  );
};

export default THRDirectorReport;