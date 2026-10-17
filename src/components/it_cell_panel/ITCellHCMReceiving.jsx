import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container,
  Alert,
  Spinner,
  Card,
  Table,
  Row,
  Col,
  Pagination,
  Dropdown,
  Tabs,
  Button,
  Modal,
  Form,
  Tab,
} from "react-bootstrap";

import "../../assets/css/itcellLeftnav.css";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import { FaFilePdf, FaFileExcel, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

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

const formatMonths = (months) => {
  if (Array.isArray(months)) {
    return months.map(m => monthLabels[m.toLowerCase()] || m).join(', ');
  }
  return months; // Fallback for old `quarter` string data
};

const ITCellHCMReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();
  const { t } = useLanguage();
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [filters, setFilters] = useState({
    fin_year: [],
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

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "action", text: "Action", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const API_URL = "/director/hcm-receiving-summary/";

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const fetchReceivingSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(API_URL);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        const reportData = results.data || [];
        setReports(reportData);
        setUniqueFinYears([...new Set(reportData.map((item) => item.fin_year))]);
        const allMonths = reportData.flatMap(item => Array.isArray(item.months) ? item.months.map(m => m.toLowerCase()) : (item.quarter ? [item.quarter] : []));
        const uniqueMonthKeys = [...new Set(allMonths)];
        setUniqueMonths(uniqueMonthKeys.map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)));
        setUniqueDistricts([...new Set(reportData.map((item) => item.district))]);
        setUniqueProjects([...new Set(reportData.map((item) => item.project))]);
        setUniqueSectors([...new Set(reportData.map((item) => item.sector))]);
        setUniqueFoodItems([...new Set(reportData.map((item) => item.food_item))]);
        setUniqueBeneCategories([...new Set(reportData.map((item) => item.bene_category))]);
      }
    } catch (err) {
      setError(t("Failed to fetch HCM receiving summary.", "एचसीएम प्राप्ति सारांश प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    fetchReceivingSummary();
  }, [fetchReceivingSummary]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      return {
        ...prevFilters,
        [filterName]: currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value],
      };
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const { fin_year, months, district, project, sector, food_item, bene_category } = filters;
      const itemMonths = Array.isArray(item.months) ? item.months.map(m => monthLabels[m.toLowerCase()] || m) : (item.quarter ? [item.quarter] : []);
      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        (months.length === 0 || itemMonths.some(month => months.includes(month))) &&
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector)) &&
        (food_item.length === 0 || food_item.includes(item.food_item)) &&
        (bene_category.length === 0 || bene_category.includes(item.bene_category))
      );
    });
  }, [reports, filters]);

  const totals = useMemo(() => {
    return filteredReports.reduce((acc, item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unit = item.unit || 'N/A';
        
        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }
        acc.quantityByUnit[unit] += quantity;
        return acc;
    }, { quantityByUnit: {} });
  }, [filteredReports]);

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter((c) => c.visible);

  const handleShowEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
    });
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
    setError("");
    setSuccess("");

    const payload = { ...editFormData, id: editingItem.id };

    try {
      await api.put(API_URL, payload);
      setSuccess(t("Record updated successfully.", "रिकॉर्ड सफलतापूर्वक अपडेट किया गया।"));
      handleCloseEditModal();
      fetchReceivingSummary();
    } catch (err) {
      setError(t("Failed to update record.", "रिकॉर्ड अपडेट नहीं हो सका।"));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(t("Are you sure you want to delete this record?", "क्या आप वाकई यह रिकॉर्ड हटाना चाहते हैं?"))) {
      try {
        await api.delete(API_URL, { data: { id: [id] } });
        setSuccess(t("Record deleted successfully.", "रिकॉर्ड सफलतापूर्वक हटाया गया।"));
        fetchReceivingSummary();
      } catch (err) {
        setError(t("Failed to delete record.", "रिकॉर्ड हटाया नहीं जा सका।"));
        console.error(err);
      }
    }
  };

  const exportToPDF = () => {
    setIsPrinting(true);
    setTimeout(() => {
      const mainTable = tableRef.current;
      const totalsTableContainer = document.createElement('div');
      totalsTableContainer.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; text-align: center;">
          <h4 style="margin-bottom: 15px;">${t("Total Quantity by Unit", "इकाई के अनुसार कुल मात्रा")}</h4>
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

      if (!mainTable) {
        console.error("Table element not found for PDF export.");
        setIsPrinting(false);
        return;
      }

      Promise.all([
        html2canvas(mainTable, { scale: 2, useCORS: true }),
        html2canvas(totalsTableContainer, { scale: 2, useCORS: true })
      ]).then(([mainCanvas, totalsCanvas]) => {
        const mainImgData = mainCanvas.toDataURL('image/png');
        const totalsImgData = totalsCanvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a2' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.text("HCM Receiving Report", 20, 30);
        let yPos = 40;
        const mainRatio = mainCanvas.width / mainCanvas.height;
        const mainWidth = pdfWidth - 40;
        const mainHeight = mainWidth / mainRatio;
        pdf.addImage(mainImgData, 'PNG', 20, yPos, mainWidth, mainHeight);
        yPos += mainHeight + 20;
        const totalsRatio = totalsCanvas.width / totalsCanvas.height;
        const totalsWidth = pdfWidth / 2;
        const totalsHeight = totalsWidth / totalsRatio;
        if (yPos + totalsHeight < pdfHeight - 40) {
          pdf.addImage(totalsImgData, 'PNG', 20, yPos, totalsWidth, totalsHeight);
        }
        pdf.save('it_cell_hcm_receiving_report.pdf');
        document.body.removeChild(totalsTableContainer);
        setIsPrinting(false);
      });
    }, 100);
  };

  const exportToExcel = () => {
    const visCols = columns.filter((c) => c.visible && c.dataField !== "#" && c.dataField !== "action");
    const dataToExport = filteredReports.map((row, index) => {
      const newRow = { "#": index + 1 };
      visCols.forEach((col) => {
        if (col.dataField === 'months') {
          newRow[col.text] = formatMonths(row.months || row.quarter);
        } else {
          newRow[col.text] = row[col.dataField];
        }
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HCM Receiving");
    XLSX.writeFile(workbook, "hcm_receiving_report.xlsx");
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item key={number} active={number === currentPage} onClick={() => handlePageChange(number)}>
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

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
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          <div className="dashboard-section">
            <h4 className="section-title">{t("HCM Receiving Summary", "एचसीएम प्राप्ति सारांश")}</h4>

            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : summaryData ? (
              <Tabs defaultActiveKey="awc_report" id="receiving-summary-tabs" className="mb-3">
                <Tab eventKey="district_summary" title={t("District Summary", "जिला सारांश")}>
                  <Table striped bordered hover responsive>
                    <thead><tr><th>{t("District", "जिला")}</th><th>{t("Food Item", "खाद्य पदार्थ")}</th><th>{t("Category", "श्रेणी")}</th><th>{t("Unit", "इकाई")}</th><th>{t("Total Quantity", "कुल मात्रा")}</th></tr></thead>
                    <tbody>{summaryData.district_summary.map((item, index) => (<tr key={index}><td>{item.district}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="project_summary" title={t("Project Summary", "परियोजना सारांश")}>
                  <Table striped bordered hover responsive>
                    <thead><tr><th>{t("Project", "परियोजना")}</th><th>{t("Food Item", "खाद्य पदार्थ")}</th><th>{t("Category", "श्रेणी")}</th><th>{t("Unit", "इकाई")}</th><th>{t("Total Quantity", "कुल मात्रा")}</th></tr></thead>
                    <tbody>{summaryData.project_summary.map((item, index) => (<tr key={index}><td>{item.project}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="sector_summary" title={t("Sector Summary", "सेक्टर सारांश")}>
                  <Table striped bordered hover responsive>
                     <thead><tr><th>{t("Sector", "सेक्टर")}</th><th>{t("Food Item", "खाद्य पदार्थ")}</th><th>{t("Category", "श्रेणी")}</th><th>{t("Unit", "इकाई")}</th><th>{t("Total Quantity", "कुल मात्रा")}</th></tr></thead>
                    <tbody>{summaryData.sector_summary.map((item, index) => (<tr key={index}><td>{item.sector}</td><td>{item.food_item}</td><td>{item.bene_category}</td><td>{item.unit}</td><td>{item.total_quantity}</td></tr>))}</tbody>
                  </Table>
                </Tab>
                <Tab eventKey="awc_report" title={t("AWC Report", "आंगनवाड़ी केंद्र रिपोर्ट")}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{t("AWC HCM Receiving Report", "आंगनवाड़ी केंद्र एचसीएम प्राप्ति रिपोर्ट")}</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2"><FaFilePdf /> PDF</Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2"><FaFileExcel /> Excel</Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}><FaEye /> {t("Columns", "कॉलम")}</Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-3">
                    {/* Filters */}
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.fin_year.length ? `${filters.fin_year.length} ${t("selected", "चयनित")}` : t("All Fin. Years", "सभी वित्तीय वर्ष")}</Dropdown.Toggle><Dropdown.Menu>{uniqueFinYears.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange("fin_year", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} ${t("selected", "चयनित")}` : t("All Months", "सभी महीने")}</Dropdown.Toggle><Dropdown.Menu>{uniqueMonths.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange("months", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.district.length ? `${filters.district.length} ${t("selected", "चयनित")}` : t("All Districts", "सभी जिले")}</Dropdown.Toggle><Dropdown.Menu>{uniqueDistricts.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange("district", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.project.length ? `${filters.project.length} ${t("selected", "चयनित")}` : t("All Projects", "सभी परियोजनाएं")}</Dropdown.Toggle><Dropdown.Menu>{uniqueProjects.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange("project", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.sector.length ? `${filters.sector.length} ${t("selected", "चयनित")}` : t("All Sectors", "सभी सेक्टर")}</Dropdown.Toggle><Dropdown.Menu>{uniqueSectors.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange("sector", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                    <Col md={2}><Dropdown><Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.food_item.length ? `${filters.food_item.length} ${t("selected", "चयनित")}` : t("All Food Items", "सभी खाद्य पदार्थ")}</Dropdown.Toggle><Dropdown.Menu>{uniqueFoodItems.map((v) => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.food_item.includes(v)} onChange={() => handleMultiSelectChange("food_item", v)} /></Dropdown.Item>))}</Dropdown.Menu></Dropdown></Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">{t("No reports found.", "कोई रिपोर्ट नहीं मिली।")}</div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>{visibleColumns.map((col) => (<th key={col.dataField}>{t(col.text, ({ Date: "तारीख", "AWC Name": "आंगनवाड़ी केंद्र का नाम", District: "जिला", Project: "परियोजना", Sector: "सेक्टर", "Food Item": "खाद्य पदार्थ", Category: "श्रेणी", Unit: "इकाई", Quantity: "मात्रा", "Fin. Year": "वित्तीय वर्ष", Months: "महीने", Action: "कार्रवाई" })[col.text])}</th>))}</tr>
                          </thead>
                          <tbody>
                            {currentItems.map((report, index) => (
                              <tr key={report.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#" ? (currentPage - 1) * itemsPerPage + index + 1
                                      : col.dataField === "months" ? formatMonths(report.months || report.quarter) : col.dataField === "date" ? new Date(report.date).toLocaleDateString()
                                      : col.dataField === "action" ? (
                                        <>
                                          <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowEditModal(report)} aria-label={t("Edit", "संपादित करें")}><FaEdit /></Button>
                                          <Button variant="outline-danger" size="sm" onClick={() => handleDelete(report.id)} aria-label={t("Delete", "हटाएं")}><FaTrash /></Button>
                                        </>
                                      )
                                      : report[col.dataField]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                          {!isPrinting && (
                            <tfoot>
                              <tr>
                                {visibleColumns.map((col) => {
                                  let cellContent = '';
                                  if (col.dataField === '#') {
                                    cellContent = <strong>{t("Total", "कुल")}</strong>;
                                  } else if (col.dataField === 'quantity') {
                                    cellContent = (
                                      <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                        View Total
                                      </Button>
                                    );
                                  }
                                  return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                                })}
                              </tr>
                            </tfoot>
                          )}
                        </Table>
                        {renderPagination()}
                      </div>
                    </Card>
                  )}
                </Tab>
              </Tabs>
            ) : null}
          </div>
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}><Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएं/छिपाएं")}</Modal.Title></Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={t(col.text, ({ Date: "तारीख", "AWC Name": "आंगनवाड़ी केंद्र का नाम", District: "जिला", Project: "परियोजना", Sector: "सेक्टर", "Food Item": "खाद्य पदार्थ", "Beneficiary Category": "लाभार्थी श्रेणी", Quantity: "मात्रा", Unit: "इकाई", "Fin. Year": "वित्तीय वर्ष", Months: "महीने", Action: "कार्रवाई" })[col.text])} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer><Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button></Modal.Footer>
        </Modal>

        {editingItem && (
          <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
            <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
              <Modal.Title>{t("Edit HCM Receiving Record", "एचसीएम प्राप्ति रिकॉर्ड संपादित करें")}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form onSubmit={handleUpdate}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Date", "तारीख")}</Form.Label>
                      <Form.Control type="date" name="date" value={editFormData.date} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Quantity", "मात्रा")}</Form.Label>
                      <Form.Control type="number" name="quantity" value={editFormData.quantity} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Food Item", "खाद्य पदार्थ")}</Form.Label>
                      <Form.Control type="text" name="food_item" value={editFormData.food_item} onChange={handleEditFormChange} required />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</Form.Label>
                      <Form.Control type="text" name="bene_category" value={editFormData.bene_category} onChange={handleEditFormChange} required />
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
                      <Form.Control type="text" name="months" value={Array.isArray(editFormData.months) ? editFormData.months.join(',') : (editFormData.quarter || '')} onChange={handleEditFormChange} placeholder={t("e.g., apr,may,jun", "उदा., apr,may,jun")} required />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("District", "जिला")}</Form.Label>
                      <Form.Control type="text" name="district" value={editFormData.district} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Project", "परियोजना")}</Form.Label>
                      <Form.Control type="text" name="project" value={editFormData.project} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                </Row>
                 <Row>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("Sector", "सेक्टर")}</Form.Label>
                      <Form.Control type="text" name="sector" value={editFormData.sector} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                   <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</Form.Label>
                      <Form.Control type="text" name="awc_name" value={editFormData.awc_name} onChange={handleEditFormChange} disabled />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button variant="secondary" onClick={handleCloseEditModal} className="me-2">{t("Cancel", "रद्द करें")}</Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : t("Update", "अपडेट करें")}
                  </Button>
                </div>
              </Form>
            </Modal.Body>
          </Modal>
        )}

        <Modal show={showQtyModal} onHide={() => setShowQtyModal(false)} centered>
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
            <Modal.Title>{t("Quantity Breakdown by Unit", "इकाई के अनुसार मात्रा का विवरण")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>{t("Unit", "इकाई")}</th>
                  <th>{t("Total Quantity", "कुल मात्रा")}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals.quantityByUnit).map(([unit, qty]) => (
                  <tr key={unit}><td>{unit}</td><td>{qty.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default ITCellHCMReceiving;