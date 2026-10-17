import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Spinner, Table, Button, Alert, Pagination, Modal, Dropdown, Badge } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import "../../assets/css/itcellLeftnav.css";

import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";
import { FaFilePdf, FaFileExcel, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import jsPDF from "jspdf"; 
import autoTable from "jspdf-autotable";
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

const formatMonths = (monthsArray) => {
  if (Array.isArray(monthsArray)) {
    return monthsArray.map(m => monthLabels[m.toLowerCase()] || m).join(', ');
  }
  return monthsArray; // Fallback for old `quarter` string data
};

const ITCellTHRReport = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const { t } = useLanguage();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [filters, setFilters] = useState({
    finYear: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);
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
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'fin_year', text: 'Fin. Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Quantity', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },    
    { dataField: 'action', text: 'Action', visible: true },
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
      const allMonths = data.flatMap(item => Array.isArray(item.months) ? item.months.map(m => m.toLowerCase()) : (item.quarter ? [item.quarter] : []));
      const uniqueMonthKeys = [...new Set(allMonths)];
      const formattedUniqueMonths = uniqueMonthKeys.map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b));
      setUniqueMonths(formattedUniqueMonths);
      setUniqueDistricts([...new Set(data.map((item) => item.district))]);
      setUniqueProjects([...new Set(data.map((item) => item.project))]);
      setUniqueSectors([...new Set(data.map((item) => item.sector))]);
      setUniqueFoodItems([...new Set(data.map((item) => item.food_item))]);
      setUniqueBeneCategories([...new Set(data.map((item) => item.bene_category))]);
      // fetchFoodItems(); // This might be redundant if food items are already in the main data
    } catch (err) {
      setError(t("Failed to fetch THR report data.", "टीएचआर रिपोर्ट डेटा प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, t]);
  
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
    fetchFoodItems();
  
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
  
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  useEffect(() => {
    let data = [...reportData];
    if (filters.finYear.length) data = data.filter((item) => filters.finYear.includes(item.fin_year));
    if (filters.months.length) {
      data = data.filter(item => {
        const itemMonths = Array.isArray(item.months) ? item.months.map(m => monthLabels[m.toLowerCase()] || m) : [item.quarter];
        return itemMonths.some(month => filters.months.includes(month));
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
      setFormErrors({ api: t("Failed to update record. Please try again.", "रिकॉर्ड अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।") });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("Are you sure you want to delete this record?", "क्या आप वाकई यह रिकॉर्ड हटाना चाहते हैं?"))) {
      try {
        await api.delete("/thr-director-distributions/", { data: { id: [id] } });
        fetchData(); // Refresh data
      } catch (err) {
        setError(t("Failed to delete record. Please try again.", "रिकॉर्ड हटाया नहीं जा सका। कृपया पुनः प्रयास करें।"));
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
  
      // Create a temporary element for the totals table
      const totalsTableContainer = document.createElement('div');
      totalsTableContainer.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif;">
          <h4 style="text-align: center; margin-bottom: 15px;">${t("Total Quantity by Unit", "इकाई के अनुसार कुल मात्रा")}</h4>
          <table style="width: 50%; margin: 0 auto; border-collapse: collapse; border: 1px solid #dee2e6;">
            <thead style="background-color: #f2f2f2;">
              <tr>
                <th style="border: 1px solid #dee2e6; padding: 8px;">${t("Unit", "इकाई")}</th>
                <th style="border: 1px solid #dee2e6; padding: 8px;">${t("Total Quantity", "कुल मात्रा")}</th>
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
        try {
          const mainImgData = mainCanvas.toDataURL('image/png');
          const totalsImgData = totalsCanvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
  
          pdf.text("THR Distribution Report", 20, 30);
          let yPos = 40;
  
          // Add main table image
          const mainRatio = mainCanvas.width / mainCanvas.height;
          const mainWidth = pdfWidth - 40;
          const mainHeight = mainWidth / mainRatio;
          pdf.addImage(mainImgData, 'PNG', 20, yPos, mainWidth, mainHeight);
          yPos += mainHeight + 20;
  
          // Add totals table image, on a new page if needed
          const totalsRatio = totalsCanvas.width / totalsCanvas.height;
          const totalsWidth = pdfWidth / 2; // Smaller image for the summary
          const totalsHeight = totalsWidth / totalsRatio;
  
          if (yPos + totalsHeight > pdfHeight - 40) {
            pdf.addPage();
            yPos = 40;
          }
          pdf.addImage(totalsImgData, 'PNG', 20, yPos, totalsWidth, totalsHeight);
  
          pdf.save('thr_it_cell_report.pdf');
        } catch (e) {
          console.error("Error generating PDF:", e);
          setError(t("Could not generate PDF. Please try again.", "PDF तैयार नहीं हो सका। कृपया पुनः प्रयास करें।"));
        }

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
          newRow[col.text] = formatMonths(row.months || row.quarter);
        }
        else if (col.dataField !== '#') {
          newRow[col.text] = row[col.dataField];
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
    // Clear remark columns for the total row
    dataToExport.push(totalRow);

    const quantityTotalsData = Object.entries(totals.quantityByUnit).map(([unit, total]) => ({
      'Unit': unit,
      'Total Quantity': total.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const quantityWorksheet = XLSX.utils.json_to_sheet(quantityTotalsData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "THR IT Cell Report");
    XLSX.utils.book_append_sheet(workbook, quantityWorksheet, "Quantity Totals");

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
            <h3 className="mb-0">{t("THR Distribution Report", "टीएचआर वितरण रिपोर्ट")}</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                <FaFilePdf className="me-1" /> {t("Export PDF", "PDF निर्यात करें")}
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel}>
                <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)} className="ms-2">
                <FaEye className="me-1" /> {t("Column Visibility", "कॉलम दृश्यता")}
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            {/* Filter Dropdowns */}
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.finYear.length ? `${filters.finYear.length} ${t("years selected", "वर्ष चयनित")}` : t("All Fin. Years", "सभी वित्तीय वर्ष")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueFinYears.map(year => (<Dropdown.Item key={year} as="div"><Form.Check type="checkbox" label={year} checked={filters.finYear.includes(year)} onChange={() => handleMultiSelectChange('finYear', year)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} ${t("selected", "चयनित")}` : t("All Months", "सभी महीने")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueMonths.map(m => (<Dropdown.Item key={m} as="div"><Form.Check type="checkbox" label={m} checked={filters.months.includes(m)} onChange={() => handleMultiSelectChange('months', m)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} ${t("districts selected", "जिले चयनित")}` : t("All Districts", "सभी जिले")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueDistricts.map(d => (<Dropdown.Item key={d} as="div"><Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} ${t("projects selected", "परियोजनाएं चयनित")}` : t("All Projects", "सभी परियोजनाएं")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueProjects.map(p => (<Dropdown.Item key={p} as="div"><Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} ${t("sectors selected", "सेक्टर चयनित")}` : t("All Sectors", "सभी सेक्टर")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueSectors.map(s => (<Dropdown.Item key={s} as="div"><Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
            <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} ${t("items selected", "आइटम चयनित")}` : t("All Food Items", "सभी खाद्य पदार्थ")}</Dropdown.Toggle><Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>{uniqueFoodItems.map(item => (<Dropdown.Item key={item} as="div"><Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
          </Row>
          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} ${t("categories selected", "श्रेणियां चयनित")}` : t("All Bene. Categories", "सभी लाभार्थी श्रेणियां")}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (<Dropdown.Item key={cat} as="div"><Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} /></Dropdown.Item>))}
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
              <Table striped bordered hover responsive className="bg-white" ref={tableRef}>
                <thead>
                  <tr>{columns.map((col, index) => col.visible && <th key={index}>{t(col.text, ({ District: "जिला", Project: "परियोजना", Sector: "सेक्टर", "AWC Name": "आंगनवाड़ी केंद्र का नाम", "AWC Code": "आंगनवाड़ी केंद्र कोड", "AWC Type": "आंगनवाड़ी केंद्र का प्रकार", "Food Item": "खाद्य पदार्थ", "Beneficiary Category": "लाभार्थी श्रेणी", "Days Allotted": "आवंटित दिन", "Fin. Year": "वित्तीय वर्ष", Months: "महीने", Beneficiaries: "लाभार्थी", Quantity: "मात्रा", Unit: "इकाई", "Sector Status": "सेक्टर स्थिति", Action: "कार्रवाई" })[col.text])}</th>)}</tr>
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
                          case 'months':
                            cellContent = formatMonths(row.months || row.quarter);
                            break;
                          case 'sector_status':                          
                            cellContent = <span className={`badge bg-${row[col.dataField] === 'approved' ? 'success' : row[col.dataField] === 'rejected' ? 'danger' : 'warning'}`}>{row[col.dataField]}</span>;
                            if (isPrinting) {
                              cellContent = row[col.dataField];
                            } else {
                              cellContent = <Badge bg={row[col.dataField] === 'approved' ? 'success' : row[col.dataField] === 'rejected' ? 'danger' : 'warning'}>{row[col.dataField]}</Badge>;
                            }                            break;
                          case 'action':
                            cellContent = (
                              <>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(row)} aria-label={t("Edit", "संपादित करें")}><FaEdit /></Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(row.id)} aria-label={t("Delete", "हटाएं")}><FaTrash /></Button>
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
                      <td colSpan={columns.filter(c => c.visible).length} className="text-center">{t("No data available", "कोई डेटा उपलब्ध नहीं है")}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="fw-bold table-info">
                    <td colSpan={columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')}>{t("Total", "कुल")}</td>
                    {columns.filter(c => c.visible).slice(columns.filter(c => c.visible).findIndex(c => c.dataField === 'total_beneficiaries')).map(col => {
                      if (col.dataField === 'total_beneficiaries') {
                        return <td key="total_beneficiaries">{totals.beneficiaries}</td>;
                      }
                      if (col.dataField === 'quantity') {
                        return (
                          <td key="total_quantity">
                            {!isPrinting && <Button variant="link" size="sm" onClick={() => setShowQuantityModal(true)}>{t("View Totals", "कुल देखें")}</Button>}
                          </td>
                        );
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
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएं/छिपाएं")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={t(col.text, ({ District: "जिला", Project: "परियोजना", Sector: "सेक्टर", "AWC Name": "आंगनवाड़ी केंद्र का नाम", "AWC Code": "आंगनवाड़ी केंद्र कोड", "AWC Type": "आंगनवाड़ी केंद्र का प्रकार", "Food Item": "खाद्य पदार्थ", "Beneficiary Category": "लाभार्थी श्रेणी", "Days Allotted": "आवंटित दिन", "Fin. Year": "वित्तीय वर्ष", Months: "महीने", Beneficiaries: "लाभार्थी", Quantity: "मात्रा", Unit: "इकाई", "Sector Status": "सेक्टर स्थिति", Action: "कार्रवाई" })[col.text])}
                checked={col.visible}
                onChange={() => handleColumnToggle(index)}
              />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>
              {t("Close", "बंद करें")}
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQuantityModal} onHide={() => setShowQuantityModal(false)} centered>
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
            <Modal.Title>{t("Total Quantity by Unit", "इकाई के अनुसार कुल मात्रा")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {Object.keys(totals.quantityByUnit).length > 0 ? (
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>{t("Unit", "इकाई")}</th>
                    <th>{t("Total Quantity", "कुल मात्रा")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(totals.quantityByUnit).map(([unit, total]) => (
                    <tr key={unit}><td>{unit}</td><td>{total.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </Table>
            ) : <p>{t("No quantity data to display.", "दिखाने के लिए मात्रा का डेटा नहीं है।")}</p>}
          </Modal.Body>
        </Modal>

        {editingItem && (
          <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
            <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
              <Modal.Title>{t("Edit THR Distribution", "टीएचआर वितरण संपादित करें")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {formErrors.api && <Alert variant="danger">{formErrors.api}</Alert>}
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Food Item", "खाद्य पदार्थ")}</Form.Label>
                      <Form.Control as="select" name="food_item" value={editFormData.food_item} onChange={handleEditFormChange} required>
                        <option value="">{t("Select Food Item", "खाद्य पदार्थ चुनें")}</option>
                        {foodItems.map(fi => <option key={fi.id} value={fi.food_item}>{fi.food_item}</option>)}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Total Beneficiaries", "कुल लाभार्थी")}</Form.Label>
                      <Form.Control type="number" name="total_beneficiaries" value={editFormData.total_beneficiaries} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label>
                      <Form.Control type="text" name="fin_year" value={editFormData.fin_year} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Months", "महीने")}</Form.Label>
                      <Form.Control 
                        type="text" 
                        name="months" 
                        value={Array.isArray(editFormData.months) ? editFormData.months.join(',') : (editFormData.quarter || '')} 
                        onChange={handleEditFormChange} 
                        placeholder={t("e.g., apr,may,jun", "उदा., apr,may,jun")} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</Form.Label>
                      <Form.Control type="text" name="awc_name" value={editFormData.awc_name} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("AWC Code", "आंगनवाड़ी केंद्र कोड")}</Form.Label>
                      <Form.Control type="text" name="awc_code" value={editFormData.awc_code} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("DPO Status", "डीपीओ स्थिति")}</Form.Label>
                      <Form.Control as="select" name="dpo_status" value={editFormData.dpo_status} onChange={handleEditFormChange}>
                        <option value="pending">{t("Pending", "लंबित")}</option>
                        <option value="approved">{t("Approved", "स्वीकृत")}</option>
                        <option value="rejected">{t("Rejected", "अस्वीकृत")}</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Sector Status", "सेक्टर स्थिति")}</Form.Label>
                      <Form.Control as="select" name="sector_status" value={editFormData.sector_status} onChange={handleEditFormChange}>
                        <option value="pending">{t("Pending", "लंबित")}</option>
                        <option value="approved">{t("Approved", "स्वीकृत")}</option>
                        <option value="rejected">{t("Rejected", "अस्वीकृत")}</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>

                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Quantity", "मात्रा")}</Form.Label>
                      <Form.Control type="number" step="0.01" name="quantity" value={editFormData.quantity} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end">
                  <Button variant="secondary" onClick={handleCloseEditModal} className="me-2">
                    {t("Cancel", "रद्द करें")}
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : t("Update", "अपडेट करें")}
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