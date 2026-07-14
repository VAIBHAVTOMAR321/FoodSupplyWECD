import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const HCMDirectorReport = () => {
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
    startDate: "",
    endDate: "",
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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
    { dataField: 'date', text: 'Date', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
  ];

  const [columns, setColumns] = useState(initialColumns);
  const tableRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hcm-director-distributions/");
      const data = response.data.data || [];
      setReportData(data);
      setUniqueDistricts([...new Set(data.map((item) => item.district))]);
      setUniqueProjects([...new Set(data.map((item) => item.project))]);
      setUniqueSectors([...new Set(data.map((item) => item.sector))]);
      setUniqueFoodItems([...new Set(data.map((item) => item.food_item))]);
      setUniqueBeneCategories([...new Set(data.map((item) => item.bene_category))]);
    } catch (err) {
      setError("Failed to fetch HCM report data.");
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
    if (filters.startDate && filters.endDate) {
      data = data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= new Date(filters.startDate) && itemDate <= new Date(filters.endDate);
      });
    }
    if (filters.district.length) data = data.filter((item) => filters.district.includes(item.district));
    if (filters.project.length) data = data.filter((item) => filters.project.includes(item.project));
    if (filters.sector.length) data = data.filter((item) => filters.sector.includes(item.sector));
    if (filters.food_item.length) data = data.filter((item) => filters.food_item.includes(item.food_item));
    if (filters.bene_category.length) data = data.filter((item) => filters.bene_category.includes(item.bene_category));
    setFilteredData(data);
    setCurrentPage(1);
  }, [filters, reportData]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
      const unit = item.unit || 'N/A';
      const quantity = parseFloat(item.quantity) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      return acc;
    }, {
      beneficiaries: 0,
      quantityByUnit: {}
    });
  }, [filteredData]);

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
        pdf.text("HCM Distribution Report", 20, 30);
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
        pdf.save('hcm_director_report.pdf');
        document.body.removeChild(totalsTableContainer);
        setIsPrinting(false);
      });
    }, 100);
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
      return newRow;
    });

    const totalRow = { '#': 'Total' };
    visibleColumns.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = ''; // Keep quantity total empty in main sheet
      else if (col.text !== '#') totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const quantityTotalsData = Object.entries(totals.quantityByUnit).map(([unit, total]) => ({
      'Unit': unit,
      'Total Quantity': total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const quantityWorksheet = XLSX.utils.json_to_sheet(quantityTotalsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HCM Director Report");
    XLSX.utils.book_append_sheet(workbook, quantityWorksheet, "Quantity Totals");
    XLSX.writeFile(workbook, "hcm_director_report.xlsx");
  };

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
            <h3 className="mb-0">HCM Distribution Report</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf className="me-1" /> Export PDF</Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel}><FaFileExcel className="me-1" /> Export Excel</Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)} className="ms-2"><FaEye className="me-1" /> Column Visibility</Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col md={2}><Form.Control type="date" name="startDate" onChange={handleFilterChange} value={filters.startDate} /></Col>
            <Col md={2}><Form.Control type="date" name="endDate" onChange={handleFilterChange} value={filters.endDate} /></Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district-hcm" className="w-100">
                  {filters.district.length ? `${filters.district.length} districts selected` : 'All Districts'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDistricts.map(d => (<Dropdown.Item key={d} as="div"><Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-project-hcm" className="w-100">
                  {filters.project.length ? `${filters.project.length} projects selected` : 'All Projects'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueProjects.map(p => (<Dropdown.Item key={p} as="div"><Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-hcm" className="w-100">
                  {filters.sector.length ? `${filters.sector.length} sectors selected` : 'All Sectors'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectors.map(s => (<Dropdown.Item key={s} as="div"><Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-food-item-hcm" className="w-100">
                  {filters.food_item.length ? `${filters.food_item.length} items selected` : 'All Food Items'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFoodItems.map(item => (<Dropdown.Item key={item} as="div"><Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category-hcm" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (<Dropdown.Item key={cat} as="div"><Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} /></Dropdown.Item>))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          {loading ? <div className="text-center"><Spinner animation="border" /></div> : error ? <Alert variant="danger">{error}</Alert> : (
            <>
              <Table striped bordered hover responsive className="bg-white" ref={tableRef} style={{ border: '1px solid #dee2e6' }}>
                <thead>
                  <tr>
                    {columns.map((col, index) => col.visible && (
                      <th key={index}>
                        {col.dataField === 'food_item' ? (
                          <div className="food-item-cell" style={{ width: '180px' }}>{col.text}</div>
                        ) : col.dataField === 'bene_category' ? (
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
                        if (col.dataField === '#') {
                          cellContent = indexOfFirstItem + index + 1;
                        } else if (col.dataField === 'food_item') {
                          cellContent = <div className="food-item-cell" style={{ width: '180px' }}>{row[col.dataField]}</div>;
                        } else if (col.dataField === 'bene_category') {
                          cellContent = <div className="bene-category-cell" style={{ width: '150px' }}>{row[col.dataField]}</div>;
                        } else {
                          cellContent = row[col.dataField];
                        }
                        return <td key={i}>{cellContent}</td>
                      })}
                    </tr>
                  )) : <tr><td colSpan={columns.filter(c => c.visible).length} className="text-center">No data available</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')}>Total</td>
                    {columns.filter(c => c.visible).slice(columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')).map(col => {
                      if (col.dataField === 'total_beneficiaries') {
                        return <td key="total_beneficiaries">{totals.beneficiaries}</td>;
                      }
                      if (col.dataField === 'quantity') {
                        return (
                          <td key="total_quantity">
                            {!isPrinting && <Button variant="link" size="sm" onClick={() => setShowQuantityModal(true)}>View Totals</Button>}
                          </td>
                        );
                      }
                      return <td key={col.dataField}></td>;
                    })}
                  </tr>
                </tfoot>
              </Table>
              {totalPages > 1 && <Pagination className="justify-content-end">{paginationItems}</Pagination>}
            </>
          )}
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton><Modal.Title>Show/Hide Columns</Modal.Title></Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (<Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />))}
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowColumnModal(false)}>Close</Button></Modal.Footer>
        </Modal>

        <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Total Quantity by Unit</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {Object.keys(totals.quantityByUnit).length > 0 ? (
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Total Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.quantityByUnit).map(([unit, total]) => (
                    <tr key={unit}><td>{unit}</td><td>{total.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </Table>
            ) : <p>No quantity data to display.</p>}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default HCMDirectorReport;