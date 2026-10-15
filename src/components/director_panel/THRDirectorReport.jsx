import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf"; import autoTable from "jspdf-autotable";
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

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const fieldAliases = {
  district: ["district", "district_name", "districtName"],
  project: ["project", "project_name", "projectName"],
  sector: ["sector", "sector_name", "sectorName"],
  awc_name: ["awc_name", "awcName", "anganwadi_name", "anganwadiName"],
  awc_code: ["awc_code", "awcCode", "anganwadi_code", "anganwadiCode"],
  awc_type: ["awc_type", "awcType", "anganwadi_type", "anganwadiType"],
  food_item: ["food_item", "foodItem", "food_item_name", "foodItemName"],
  bene_category: ["bene_category", "beneCategory", "beneficiary_category", "beneficiaryCategory"],
  days_allotted: ["days_allotted", "daysAllotted", "allotted_days", "allottedDays"],
  fin_year: ["fin_year", "finYear", "financial_year", "financialYear"],
  months: ["months", "month", "allotted_months", "allottedMonths", "distribution_months", "distributionMonths", "month_name", "monthName", "months_allotted", "monthsAllotted", "allocation_months", "allocationMonths"],
  trimester: ["trimester", "trimester_name", "trimesterName", "quarter", "quarter_name", "quarterName", "quarter_months", "quarterMonths", "distribution_quarter", "distributionQuarter", "allocation_trimester", "allocationTrimester"],
  total_beneficiaries: ["total_beneficiaries", "totalBeneficiaries", "beneficiaries", "beneficiary_count", "beneficiaryCount"],
  quantity: ["quantity", "total_quantity", "totalQuantity", "qty", "distributed_quantity", "distributedQuantity"],
  unit: ["unit", "quantity_unit", "quantityUnit"],
  expired_quantity: ["expired_quantity", "expiredQuantity", "expiry_quantity", "expiryQuantity"],
  anganwadi_remark: ["anganwadi_remark", "anganwadiRemark", "awc_remark", "awcRemark", "remark", "remarks"],
  sector_status: ["sector_status", "sectorStatus", "status"],
  cdpo_status: ["cdpo_status", "cdpoStatus", "project_status", "projectStatus"],
  sector_remark: ["sector_remark", "sectorRemark", "supervisor_remark", "supervisorRemark"],
};

const getField = (row, field) => firstValue(row, fieldAliases[field] || [field]);

const getMonthsRaw = (row) => getField(row, "months") || getField(row, "trimester");

const formatMonthsValue = (value) => {
  const names = {
    apr: 'April', april: 'April', may: 'May', jun: 'June', june: 'June',
    jul: 'July', july: 'July', aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October', nov: 'November', november: 'November',
    dec: 'December', december: 'December', jan: 'January', january: 'January',
    feb: 'February', february: 'February', mar: 'March', march: 'March'
  };
  const quarters = {
    'apr-may-jun': ['April', 'May', 'June'], 'april-may-june': ['April', 'May', 'June'],
    'jul-aug-sep': ['July', 'August', 'September'], 'july-august-september': ['July', 'August', 'September'],
    'oct-nov-dec': ['October', 'November', 'December'], 'october-november-december': ['October', 'November', 'December'],
    'jan-feb-mar': ['January', 'February', 'March'], 'january-february-march': ['January', 'February', 'March']
  };
  if (Array.isArray(value)) return value.map(m => names[String(m).trim().toLowerCase()] || m).join(', ');
  const token = String(value ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (quarters[token]) return quarters[token].join(', ');
  const parts = token.split(/[,-/]+/).filter(Boolean);
  if (parts.length > 1) return parts.map(m => names[m] || m).join(', ');
  return names[token] || value || '-';
};

const formatMonths = (rowOrValue) => {
  if (rowOrValue && typeof rowOrValue === 'object' && !Array.isArray(rowOrValue)) {
    return formatMonthsValue(getMonthsRaw(rowOrValue));
  }
  return formatMonthsValue(rowOrValue);
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();
const statusBadgeClass = (value) => {
  const status = normalizeStatus(value);
  if (status === 'approved' || status === 'accepted') return 'success';
  if (status === 'rejected' || status === 'declined') return 'danger';
  return 'warning';
};

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
    finYear: [], //
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
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);
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
    { dataField: 'fin_year', text: 'Fin. Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'trimester', text: 'Trimester', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'anganwadi_remark', text: 'Anganwadi Remark', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'sector_remark', text: 'Sector Remark', visible: true }
  ];

  const [columns, setColumns] = useState(initialColumns);
  const tableRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-director-distributions/");
      const raw = response.data?.data || response.data || [];
      const data = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setReportData(data);
      setUniqueFinYears([...new Set(data.map(item => getField(item, 'fin_year')).filter(Boolean))].sort().reverse());
      const allMonths = data.flatMap(item => formatMonths(item).split(', ').filter(m => m && m !== '-'));
      const monthOrder = Object.values(monthLabels);
      setUniqueMonths([...new Set(allMonths)].sort((a, b) => {
        const ai = monthOrder.indexOf(a); const bi = monthOrder.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      }));
      setUniqueDistricts([...new Set(data.map(item => getField(item, 'district')).filter(Boolean))]);
      setUniqueProjects([...new Set(data.map(item => getField(item, 'project')).filter(Boolean))]);
      setUniqueSectors([...new Set(data.map(item => getField(item, 'sector')).filter(Boolean))]);
      setUniqueFoodItems([...new Set(data.map(item => getField(item, 'food_item')).filter(Boolean))]);
      setUniqueBeneCategories([...new Set(data.map(item => getField(item, 'bene_category')).filter(Boolean))]);
      setUniqueSectorStatuses([...new Set(data.map(item => getField(item, 'sector_status')).filter(Boolean))]);
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
    if (filters.finYear.length) data = data.filter(item => filters.finYear.includes(getField(item, 'fin_year')));
    if (filters.months.length) {
      data = data.filter(item => filters.months.some(month => formatMonths(item).split(', ').includes(month)));
    }
    if (filters.district.length) data = data.filter(item => filters.district.includes(getField(item, 'district')));
    if (filters.project.length) data = data.filter(item => filters.project.includes(getField(item, 'project')));
    if (filters.sector.length) data = data.filter(item => filters.sector.includes(getField(item, 'sector')));
    if (filters.food_item.length) data = data.filter(item => filters.food_item.includes(getField(item, 'food_item')));
    if (filters.bene_category.length) data = data.filter(item => filters.bene_category.includes(getField(item, 'bene_category')));
    if (filters.sector_status.length) data = data.filter(item => filters.sector_status.includes(getField(item, 'sector_status')));
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
      acc.beneficiaries += Number(getField(item, 'total_beneficiaries')) || 0;
      const unit = getField(item, 'unit') || 'N/A';
      const quantity = parseFloat(getField(item, 'quantity')) || 0;
      if (!acc.quantityByUnit[unit]) {
        acc.quantityByUnit[unit] = 0;
      }
      acc.quantityByUnit[unit] += quantity;
      acc.quantity += quantity;
      return acc;
    }, {
      beneficiaries: 0,
      quantityByUnit: {},
      quantity: 0
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
        pdf.text("THR Distribution Report", 20, 30);
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
        pdf.save('thr_director_report.pdf');
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
        if (col.dataField === 'months') {
          newRow[col.text] = formatMonths(row);
        } else if (col.dataField === 'trimester') {
          newRow[col.text] = formatMonths(getField(row, 'trimester'));
        } else {
          newRow[col.text] = getField(row, col.dataField);
        }
      });
      return newRow;
    });

    const totalRow = { '#': 'Total' };
    visibleColumns.forEach(col => {
      if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else if (col.dataField === 'quantity') totalRow[col.text] = ''; // Keep quantity total empty in main sheet
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);

    const quantityTotalsData = Object.entries(totals.quantityByUnit).map(([unit, total]) => ({
      'Unit': unit,
      'Total Quantity': total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const quantityWorksheet = XLSX.utils.json_to_sheet(quantityTotalsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR Report");
    XLSX.utils.book_append_sheet(workbook, quantityWorksheet, "Quantity Totals");

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
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-months" className="w-100">
                  {filters.months.length ? `${filters.months.length} months selected` : 'All Months'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueMonths.map(m => (
                    <Dropdown.Item key={m} as="div">
                      <Form.Check type="checkbox" label={m} checked={filters.months.includes(m)} onChange={() => handleMultiSelectChange('months', m)} />
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
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status" className="w-100">
                  {filters.sector_status.length ? `${filters.sector_status.length} selected` : 'All Sector Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectorStatuses.map(status => (
                    <Dropdown.Item key={status} as="div">
                      <Form.Check type="checkbox" label={status} checked={filters.sector_status.includes(status)} onChange={() => handleMultiSelectChange('sector_status', status)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="mt-2">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ finYear: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [], sector_status: [] })}>Clear Filters</Button>
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
                          case 'months':
                            cellContent = formatMonths(row);
                            break;
                          case 'sector_status': {
                            const status = getField(row, col.dataField);
                            cellContent = isPrinting || !status
                              ? (status || '-')
                              : <span className={`badge bg-${statusBadgeClass(status)}`}>{status}</span>;
                            break;
                          }
                          case 'trimester':
                            cellContent = formatMonths(getField(row, 'trimester'));
                            break;
                          default:
                            cellContent = getField(row, col.dataField) || '-';
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
                        return <td key="total_quantity">
                          {!isPrinting && (
                            <Button variant="link" size="sm" onClick={() => setShowQuantityModal(true)}>
                              View Totals
                            </Button>
                          )}
                        </td>;
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

export default THRDirectorReport;