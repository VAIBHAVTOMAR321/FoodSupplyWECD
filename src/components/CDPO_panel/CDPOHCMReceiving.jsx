import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Container, Alert, Spinner, Card, Table, Row, Col,
  Pagination, Dropdown, Tabs, Tab, Button, Modal, Form,
  ListGroup, Badge,
} from "react-bootstrap";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import { FaFileExcel, FaEye, FaFilePdf, FaCalendarCheck } from "react-icons/fa";
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
const receivingColumnTranslations = {
  "AWC Name": "आंगनवाड़ी केंद्र का नाम",
  "AWC Code": "आंगनवाड़ी केंद्र कोड",
  Sector: "सेक्टर",
  "Food Item": "खाद्य सामग्री",
  "Beneficiary Category": "लाभार्थी श्रेणी",
  Quantity: "मात्रा",
  Unit: "इकाई",
  "Fin. Year": "वित्तीय वर्ष",
  Months: "माह",
  Trimester: "तिमाही",
  "Sector Status": "सेक्टर स्थिति",
  "Current Month": "वर्तमान माह",
  Date: "तिथि",
  Actions: "कार्रवाइयां",
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


const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
};

const getStatusVariant = (status) => {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    default: return "warning";
  }
};

const CDPOHCMReceiving = () => {
  const { t } = useLanguage();
  const translateColumn = (text) => t(text, receivingColumnTranslations[text] || text);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const { api } = useAuth();

  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const tableRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [filters, setFilters] = useState({ fin_year: [], months: [], sector: [], food_item: [], bene_category: [] });
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  
  // Receiving report columns.
  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "awc_code", text: "AWC Code", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "food_item", text: "Food Item", visible: true },
    { dataField: "bene_category", text: "Beneficiary Category", visible: true },
    { dataField: "quantity", text: "Quantity", visible: true },
    { dataField: "unit", text: "Unit", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "months", text: "Months", visible: true },
    { dataField: "quarter", text: "Trimester", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "curr_month", text: "Current Month", visible: true },
    { dataField: "date", text: "Date", visible: true },
    { dataField: "actions", text: "Actions", visible: true },
  ]);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/cdpo/hcm-receiving-summary/?page=1");
      const results = response.data.results;
      if (results?.success) {
        setSummaryData({
          project: results.project,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError(t("Failed to fetch HCM receiving data.", "एचसीएम प्राप्ति डेटा प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uniqueValues = (key) => {
    if (key === 'months') {
      const allMonths = reports.flatMap(item => {
        const monthData = item.months || item.quarter;
        if (Array.isArray(monthData)) return monthData;
        if (typeof monthData === 'string' && quarterToMonths[monthData]) return quarterToMonths[monthData];
        return [];
      });
      return [...new Set(allMonths)].map(m => monthLabels[m] || m).sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b));
    }
    return [...new Set(reports.map((r) => r[key]))];
  };

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: prev[filterName].includes(value)
        ? prev[filterName].filter((v) => v !== value)
        : [...prev[filterName], value],
    }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      return Object.entries(filters).every(([key, vals]) => {
        if (vals.length === 0) return true;
        if (key === 'months') {
          const itemMonths = (Array.isArray(item.months) ? item.months : quarterToMonths[item.quarter] || []).map(m => monthLabels[m] || m);
          return vals.some(filterMonth => itemMonths.includes(filterMonth));
        }
        return vals.includes(item[key]);
      });
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
  const currentItems = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleColumnToggle = (i) => {
    const updated = [...columns];
    updated[i].visible = !updated[i].visible;
    setColumns(updated);
  };
  const visibleColumns = columns.filter((c) => c.visible);

    // Refresh the report immediately before export
  // so the downloaded file uses
  // the latest API data rather than only the first page render's state.
  const fetchLatestExportReports = async () => {
    try {
      const response = await api.get("/cdpo/hcm-receiving-summary/?page=1");
      const results = response?.data?.results;
      const latest = results?.success && Array.isArray(results.data) ? results.data : reports;
      const byKey = new Map(latest.map(item => [
        String(item?.id ?? `${item?.awc_code ?? ""}|${item?.sector ?? ""}|${item?.food_item ?? ""}|${item?.bene_category ?? ""}|${item?.date ?? ""}`),
        item
      ]));
      return filteredReports.map(row => {
        const key = String(row?.id ?? `${row?.awc_code ?? ""}|${row?.sector ?? ""}|${row?.food_item ?? ""}|${row?.bene_category ?? ""}|${row?.date ?? ""}`);
        const fresh = byKey.get(key);
        return fresh ? { ...row, ...fresh } : row;
      });
    } catch (err) {
      console.error("Could not refresh HCM data before export; using currently loaded rows.", err);
      return filteredReports;
    }
  };

  const exportToExcel = async () => {
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter(col => col.visible && col.dataField !== "#" && col.dataField !== "actions");
       const data = exportReports.map((row, index) => {
         const record = { "#": index + 1 };
         exportColumns.forEach(col => {
           const value = row[col.dataField];
           if (col.dataField === "months") record[col.text] = formatMonths(row.months || row.quarter) || "";
           else if (col.dataField === "quarter") record[col.text] = row.quarter || "";
           else if (col.dataField === "sector_status") record[col.text] = row.sector_status || "pending";
           else if (col.dataField === "date") record[col.text] = value ? formatDate(value) : "";
           else record[col.text] = value ?? "";
         });
         return record;
       });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const headers = Object.keys(data[0] || { "#": "" });
      worksheet["!cols"] = headers.map(key => ({
        wch: Math.min(36, Math.max(key.length + 2, ...data.map(row => Math.min(34, String(row[key] ?? "").length + 2))))
      }));
      if (worksheet["!ref"]) worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "HCM Receiving");
      const totalsRows = Object.entries(totals.quantityByUnit).map(([unit, quantity]) => ({
        "इकाई / Unit": unit, "कुल मात्रा / Total Quantity": Number(quantity.toFixed(2))
      }));
      if (totalsRows.length) {
        const totalsSheet = XLSX.utils.json_to_sheet(totalsRows);
        totalsSheet["!cols"] = [{ wch: 28 }, { wch: 26 }];
        XLSX.utils.book_append_sheet(workbook, totalsSheet, "Quantity Totals");
      }
      XLSX.writeFile(workbook, "hcm_receiving_report.xlsx", { bookType: "xlsx", compression: true });
    } catch (err) {
      console.error("HCM Excel export failed:", err);
      setError(t("Excel export failed. Please try again.", "एक्सेल निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    }
  };

  const exportToPDF = async () => {
    setIsPrinting(true);
    setError("");
    let exportRoot;
    try {
      const exportReports = await fetchLatestExportReports();
      const exportColumns = columns.filter(col => col.visible && col.dataField !== "actions");
      const headers = exportColumns.map(col => col.text);
       const body = exportReports.map((row, index) => {
         return exportColumns.map(col => {
           if (col.dataField === "#") return String(index + 1);
           if (col.dataField === "months") return String(formatMonths(row.months || row.quarter) || "");
           if (col.dataField === "quarter") return String(row.quarter || "-");
           if (col.dataField === "sector_status") return String(row.sector_status || "pending");
           if (col.dataField === "date") return formatDate(row.date) || "-";
           const value = row[col.dataField];
           return value === null || value === undefined || value === "" ? "-" : String(value);
         });
       });


      // Render HTML with browser fonts first; this preserves Devanagari/Hindi.
      exportRoot = document.createElement("div");
      exportRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:1800px;background:#fff;color:#111;padding:24px;font-family:Arial,'Noto Sans Devanagari',Mangal,sans-serif;z-index:-1;";
      const title = document.createElement("h2");
      title.textContent = "HCM प्राप्ति रिपोर्ट / HCM Receiving Report";
      title.style.cssText = "font-size:22px;margin:0 0 16px;text-align:center;font-weight:700;";
      exportRoot.appendChild(title);
      const table = document.createElement("table");
      table.style.cssText = "width:100%;border-collapse:collapse;font-size:12px;table-layout:auto;";
      const thead = document.createElement("thead");
      const hr = document.createElement("tr");
      headers.forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.cssText = "border:1px solid #777;background:#e9eef5;padding:7px;white-space:normal;text-align:left;";
        hr.appendChild(th);
      });
      thead.appendChild(hr); table.appendChild(thead);
      const tbody = document.createElement("tbody");
      body.forEach(values => {
        const tr = document.createElement("tr");
        values.forEach(value => {
          const td = document.createElement("td");
          td.textContent = value;
          td.style.cssText = "border:1px solid #999;padding:6px;vertical-align:top;white-space:normal;overflow-wrap:anywhere;";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); exportRoot.appendChild(table);
      const totalsTitle = document.createElement("h3");
      totalsTitle.textContent = "इकाई के अनुसार कुल मात्रा / Total Quantity by Unit";
      totalsTitle.style.cssText = "font-size:16px;margin:20px 0 8px;";
      exportRoot.appendChild(totalsTitle);
      const totalsTable = document.createElement("table");
      totalsTable.style.cssText = "border-collapse:collapse;font-size:12px;";
      Object.entries(totals.quantityByUnit).forEach(([unit, total], i) => {
        const tr = document.createElement("tr");
        [unit, total.toFixed(2)].forEach(value => {
          const td = document.createElement("td");
          td.textContent = String(value);
          td.style.cssText = "border:1px solid #999;padding:7px;";
          tr.appendChild(td);
        });
        totalsTable.appendChild(tr);
      });
      exportRoot.appendChild(totalsTable);
      document.body.appendChild(exportRoot);
      const canvas = await html2canvas(exportRoot, { scale: 1.25, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1900, logging: false });
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a3", compress: true });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * (pdfWidth - 40)) / canvas.width;
      let y = 20;
      let remaining = imgHeight;
      let sourceY = 0;
      const scale = (pdfWidth - 40) / canvas.width;
      while (remaining > 0) {
        const sliceHeight = Math.min((pdfHeight - 40) / scale, canvas.height - sourceY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.ceil(sliceHeight);
        pageCanvas.getContext("2d").drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.72), "JPEG", 20, y, pdfWidth - 40, sliceHeight * scale, undefined, "FAST");
        sourceY += sliceHeight;
        remaining -= sliceHeight * scale;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save("hcm_receiving_report.pdf");
    } catch (err) {
      console.error("HCM PDF export failed:", err);
      setError(t("PDF export failed. Please try again.", "पीडीएफ़ निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    } finally {
      if (exportRoot?.parentNode) exportRoot.parentNode.removeChild(exportRoot);
      setIsPrinting(false);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);
    const go = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

    items.push(<Pagination.First key="first" onClick={() => go(1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Prev key="prev" onClick={() => go(currentPage - 1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Item key={1} active={currentPage === 1} onClick={() => go(1)}>{1}</Pagination.Item>);
    if (startPage > 2) items.push(<Pagination.Ellipsis key="e1" />);
    for (let n = startPage; n <= endPage; n++) {
      if (n > 1 && n < totalPages)
        items.push(<Pagination.Item key={n} active={n === currentPage} onClick={() => go(n)}>{n}</Pagination.Item>);
    }
    if (endPage < totalPages - 1) items.push(<Pagination.Ellipsis key="e2" />);
    if (totalPages > 1)
      items.push(<Pagination.Item key={totalPages} active={currentPage === totalPages} onClick={() => go(totalPages)}>{totalPages}</Pagination.Item>);
    items.push(<Pagination.Next key="next" onClick={() => go(currentPage + 1)} disabled={currentPage === totalPages} />);
    items.push(<Pagination.Last key="last" onClick={() => go(totalPages)} disabled={currentPage === totalPages} />);
    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  const filterKeys = ["fin_year", "months", "sector", "food_item", "bene_category"];
  const filterLabels = { fin_year: "Fin. Year", months: "Months", sector: "Sector", food_item: "Food Item", bene_category: "Category" };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="dashboard-section">
            <h4 className="section-title">{t("HCM Receiving Summary", "एचसीएम प्राप्ति सारांश")}</h4>

            {loading ? (
              <div className="text-center"><Spinner animation="border" /></div>
            ) : summaryData ? (
              <Tabs defaultActiveKey="awc_report" id="hcm-receiving-tabs" className="mb-3">

                {/* Project Summary Tab */}
                <Tab eventKey="project_summary" title={t("Project Summary", "परियोजना सारांश")}>
                  <h5 className="mt-3">{t("Project:", "परियोजना:")} {summaryData.project}</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>{t("Project", "परियोजना")}</th>
                        <th>{t("Food Item", "खाद्य सामग्री")}</th>
                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                        <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        <th>{t("Unit", "इकाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{summaryData.project}</td>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                {/* Sector Summary Tab */}
                <Tab eventKey="sector_summary" title={t("Sector Summary", "सेक्टर सारांश")}>
                  <Table striped bordered hover responsive className="mt-3">
                    <thead>
                      <tr>
                        <th>{t("Sector", "सेक्टर")}</th>
                        <th>{t("Food Item", "खाद्य सामग्री")}</th>
                        <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                        <th>{t("Total Quantity", "कुल मात्रा")}</th>
                        <th>{t("Unit", "इकाई")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.sector_summary.map((row, i) => (
                        <tr key={i}>
                          <td>{row.sector}</td>
                          <td>{row.food_item}</td>
                          <td>{row.bene_category}</td>
                          <td>{row.total_quantity}</td>
                          <td>{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                {/* AWC Report Tab */}
                <Tab eventKey="awc_report" title={t("AWC Report", "आंगनवाड़ी केंद्र रिपोर्ट")}>
                  <div className="d-flex justify-content-between align-items-center mb-3 mt-2">
                    <h5 className="mb-0">{t("AWC HCM Receiving Report", "आंगनवाड़ी केंद्र एचसीएम प्राप्ति रिपोर्ट")}</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> Export PDF
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> Export Excel
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                        <FaEye className="me-1" /> Columns
                      </Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-2">
                    {filterKeys.map((key) => (
                      <Col md={2} key={key}>
                        <Dropdown>
                          <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100">
                            {filters[key].length ? `${filters[key].length} selected` : `All ${filterLabels[key]}`}
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {uniqueValues(key).map((v) => (
                              <Dropdown.Item key={v} as="div">
                                <Form.Check type="checkbox" label={v} checked={filters[key].includes(v)} onChange={() => handleMultiSelectChange(key, v)} />
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown>
                      </Col>
                    ))}
                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], months: [], sector: [], food_item: [], bene_category: [] })}>
                        Clear Filters
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">{t("No data found for selected filters.", "चयनित फ़िल्टर के लिए कोई डेटा नहीं मिला।")}</div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>{visibleColumns.map((col) => <th key={col.dataField}>{translateColumn(col.text)}</th>)}</tr>
                          </thead>
                          <tbody>
                            {currentItems.map((row, index) => (
                              <tr key={row.id ?? `${row.awc_code ?? "row"}-${row.food_item ?? index}`}>
{visibleColumns.map((col) => (
                                    <td key={col.dataField}>
                                      {col.dataField === "#"
                                        ? (currentPage - 1) * itemsPerPage + index + 1
                                        : col.dataField === 'months'
                                        ? formatMonths(row.months || row.quarter)
                                        : col.dataField === 'quarter'
                                        ? (row.quarter || '-')
                                        : col.dataField === 'sector_status'
                                        ? <Badge bg={getStatusVariant(row.sector_status)}>{row.sector_status || 'pending'}</Badge>
                                       : col.dataField === 'actions'
                                       ? (
                                           <div className="d-flex gap-1 flex-wrap">
                                           </div>
                                         )
                                       : row[col.dataField] ?? "-"}

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
      </div>

      <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
        <Modal.Header closeButton><Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएं/छिपाएं")}</Modal.Title></Modal.Header>
        <Modal.Body>
          {columns.map((col, i) => (
            <Form.Check key={i} type="checkbox" label={translateColumn(col.text)} checked={col.visible} onChange={() => handleColumnToggle(i)} />
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showQtyModal} onHide={() => setShowQtyModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t("Quantity Breakdown by Unit", "इकाई के अनुसार मात्रा विवरण")}</Modal.Title>
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
  );
};

export default CDPOHCMReceiving;
