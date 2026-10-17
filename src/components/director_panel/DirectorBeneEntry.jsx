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
import "../../assets/css/dpo.css";

import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";


const DirectorBeneEntry = () => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);

  const [monthWiseData, setMonthWiseData] = useState([]);
  const [monthWiseLoading, setMonthWiseLoading] = useState(true);
  const [monthWiseError, setMonthWiseError] = useState("");
  const [selectedFinYear, setSelectedFinYear] = useState("");
  const [selectedMonths, setSelectedMonths] = useState([]);

  const [filters, setFilters] = useState({
    fin_year: [],
    month: [],
    district: [],
    project: [],
    sector: [],
  });

  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);

  const [columns, setColumns] = useState([
    { dataField: "#", text: "#", visible: true },
    { dataField: "awc_name", text: "AWC Name", visible: true },
    { dataField: "district", text: "District", visible: true },
    { dataField: "project", text: "Project", visible: true },
    { dataField: "sector", text: "Sector", visible: true },
    { dataField: "fin_year", text: "Fin. Year", visible: true },
    { dataField: "month", text: "Month", visible: true },
    { dataField: "pw_lm", text: "PW & LM", visible: true },
    { dataField: "children_6m_3y", text: "Child (6m-3y)", visible: true },
    { dataField: "children_3_6y", text: "Child (3-6y)", visible: true },
    { dataField: "adolescent_girls", text: "Adol. Girls", visible: true },
    { dataField: "sam_6m_3y", text: "SAM (6m-3y)", visible: true },
    { dataField: "sam_3_5y", text: "SAM (3-5y)", visible: true },
    { dataField: "suw_6m_3y", text: "SUW (6m-3y)", visible: true },
    { dataField: "suw_3_6y", text: "SUW (3-6y)", visible: true },
    { dataField: "sector_status", text: "Sector Status", visible: true },
    { dataField: "sector_remark", text: "Sector Remark", visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const localizedColumns = columns.map((column) => ({
    ...column,
    text: t(column.text, ({
      "AWC Name": "आंगनवाड़ी केंद्र का नाम", District: "ज़िला", Project: "परियोजना",
      Sector: "सेक्टर", "Fin. Year": "वित्तीय वर्ष", Month: "महीना",
      "PW & LM": "गर्भवती एवं धात्री माताएँ", "Child (6m-3y)": "बच्चे (6 माह–3 वर्ष)",
      "Child (3-6y)": "बच्चे (3–6 वर्ष)", "Adol. Girls": "किशोरियाँ",
      "SAM (6m-3y)": "एसएएम (6 माह–3 वर्ष)", "SAM (3-5y)": "एसएएम (3–5 वर्ष)",
      "SUW (6m-3y)": "एसयूडब्ल्यू (6 माह–3 वर्ष)", "SUW (3-6y)": "एसयूडब्ल्यू (3–6 वर्ष)",
      "Sector Status": "सेक्टर की स्थिति", "Sector Remark": "सेक्टर टिप्पणी",
    })[column.text] || column.text),
  }));

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

  useEffect(() => {
    if (reports.length > 0) {
      setUniqueFinYears([...new Set(reports.map((item) => item.fin_year))]);
      setUniqueMonths([...new Set(reports.map((item) => item.month))]);
      setUniqueDistricts([...new Set(reports.map((item) => item.district))]);
      setUniqueProjects([...new Set(reports.map((item) => item.project))]);
      setUniqueSectors([...new Set(reports.map((item) => item.sector))]);
    }
  }, [reports]);

  const fetchBeneficiarySummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/director/beneficiary-summary/`);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          state_total: results.state_total,
          district_summary: results.district_summary,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError(t("Failed to fetch beneficiary summary.", "लाभार्थी सारांश प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  const fetchMonthWiseStateTotal = useCallback(async () => {
    setMonthWiseLoading(true);
    setMonthWiseError("");
    try {
      const response = await api.get(`/director/beneficiary/month-state-total/`);
      if (response.data.success) {
        const data = response.data.data || [];
        setMonthWiseData(data);
        if (data.length > 0 && !selectedFinYear) {
          setSelectedFinYear(data[0].fin_year);
        }
      } else {
        setMonthWiseError(response.data.message || t("Failed to fetch month-wise state total.", "माह-वार राज्य कुल डेटा प्राप्त नहीं हो सका।"));
      }
    } catch (err) {
      setMonthWiseError(t("Failed to fetch month-wise state total.", "माह-वार राज्य कुल डेटा प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setMonthWiseLoading(false);
    }
  }, [api, selectedFinYear, t]);

  useEffect(() => {
    fetchBeneficiarySummary();
    fetchMonthWiseStateTotal();
  }, [fetchBeneficiarySummary]);

  const monthWiseFinYears = useMemo(() => monthWiseData.map(d => d.fin_year), [monthWiseData]);
  const monthsForSelectedFinYear = useMemo(() => {
    const yearData = monthWiseData.find(d => d.fin_year === selectedFinYear);
    return yearData ? yearData.month_wise.map(m => m.month) : [];
  }, [monthWiseData, selectedFinYear]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters((prevFilters) => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return {
          ...prevFilters,
          [filterName]: currentValues.filter((v) => v !== value),
        };
      } else {
        return {
          ...prevFilters,
          [filterName]: [...currentValues, value],
        };
      }
    });
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const { fin_year, month, district, project, sector } = filters;
      return (
        (fin_year.length === 0 || fin_year.includes(item.fin_year)) &&
        (month.length === 0 || month.includes(item.month)) &&
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector))
      );
    });
  }, [reports, filters]);

  const filteredMonthWiseReport = useMemo(() => {
    if (!selectedFinYear) return [];
    const yearData = monthWiseData.find(d => d.fin_year === selectedFinYear);
    if (!yearData) return [];

    if (selectedMonths.length === 0) {
      return yearData.month_wise;
    }

    return yearData.month_wise.filter(item => selectedMonths.includes(item.month));
  }, [monthWiseData, selectedFinYear, selectedMonths]);

  const handleMonthFilterChange = (month) => {
    setSelectedMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handleSelectAllMonths = () => {
    setSelectedMonths(monthsForSelectedFinYear);
  };

  const handleDeselectAllMonths = () => {
    setSelectedMonths([]);
  };

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentItems = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handlePageChange = (page) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter((c) => c.visible);

  const exportToPDF = () => {
    const input = tableRef.current;
    if (!input) return;
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a2",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      const width = pdfWidth - 40;
      const height = width / ratio;
      pdf.text("Beneficiary Summary Report", 20, 30);
      pdf.addImage(
        imgData,
        "PNG",
        20,
        40,
        width,
        height > pdfHeight - 60 ? pdfHeight - 60 : height
      );
      pdf.save("beneficiary_summary_report.pdf");
    });
  };

  const exportToExcel = () => {
    const visCols = columns.filter((c) => c.visible && c.dataField !== "#");
    const dataToExport = filteredReports.map((row, index) => {
      const newRow = { "#": index + 1 };
      visCols.forEach((col) => {
        newRow[col.text] = row[col.dataField];
      });
      return newRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Beneficiary Summary");
    XLSX.writeFile(workbook, "beneficiary_summary.xlsx");
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 3;
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    items.push(
      <Pagination.First
        key="first"
        aria-label={t("First page", "पहला पृष्ठ")}
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      />
    );
    items.push(
      <Pagination.Prev
        key="prev"
        aria-label={t("Previous page", "पिछला पृष्ठ")}
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
    );

    items.push(
      <Pagination.Item
        key={1}
        active={1 === currentPage}
        onClick={() => handlePageChange(1)}
      >
        {1}
      </Pagination.Item>
    );

    if (startPage > 2) {
      items.push(<Pagination.Ellipsis key="start-ellipsis" />);
    }

    for (let number = startPage; number <= endPage; number++) {
      if (number > 1 && number < totalPages) {
        items.push(
          <Pagination.Item
            key={number}
            active={number === currentPage}
            onClick={() => handlePageChange(number)}
          >
            {number}
          </Pagination.Item>
        );
      }
    }

    if (endPage < totalPages - 1) {
      items.push(<Pagination.Ellipsis key="end-ellipsis" />);
    }

    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={totalPages === currentPage}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        aria-label={t("Next page", "अगला पृष्ठ")}
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );
    items.push(
      <Pagination.Last
        key="last"
        aria-label={t("Last page", "अंतिम पृष्ठ")}
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <DirectorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-section">
            <h4 className="section-title">{t("Beneficiary Summary", "लाभार्थी सारांश")}</h4>

            {loading ? (
              <div className="text-center">
                <Spinner animation="border" />
              </div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : summaryData ? (
              <Tabs
                defaultActiveKey="awc_report"
                id="beneficiary-summary-tabs"
                className="mb-3"
              >
                <Tab eventKey="state_total" title={t("State Total", "राज्य कुल")}>
                  <h5 className="mt-4">{t("State-wise Summary (Total)", "राज्य-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>{t("PW & LM", "गर्भवती एवं धात्री माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह–3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3–6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "एसएएम (6 माह–3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "एसएएम (3–5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "एसयूडब्ल्यू (6 माह–3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "एसयूडब्ल्यू (3–6 वर्ष)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{summaryData.state_total.total_pw_lm}</td>
                        <td>{summaryData.state_total.total_children_6m_3y}</td>
                        <td>{summaryData.state_total.total_children_3_6y}</td>
                        <td>{summaryData.state_total.total_adolescent_girls}</td>
                        <td>{summaryData.state_total.total_sam_6m_3y}</td>
                        <td>{summaryData.state_total.total_sam_3_5y}</td>
                        <td>{summaryData.state_total.total_suw_6m_3y}</td>
                        <td>{summaryData.state_total.total_suw_3_6y}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="month_wise_summary" title={t("Month-wise State Summary", "माह-वार राज्य सारांश")}>
                  <h5 className="mt-4">{t("Month-wise State Beneficiary Summary", "माह-वार राज्य लाभार्थी सारांश")}</h5>
                  {monthWiseLoading ? (
                    <div className="text-center"><Spinner animation="border" /></div>
                  ) : monthWiseError ? (
                    <Alert variant="danger">{monthWiseError}</Alert>
                  ) : (
                    <>
                      <Row className="mb-3 g-3 align-items-center">
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>{t("Financial Year", "वित्तीय वर्ष")}</Form.Label>
                            <Form.Select
                              value={selectedFinYear}
                              onChange={(e) => {
                                setSelectedFinYear(e.target.value);
                                setSelectedMonths([]); // Reset month filter on year change
                              }}
                            >
                              {monthWiseFinYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>{t("Months", "महीने")}</Form.Label>
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" className="w-100">
                                {selectedMonths.length ? t(`${selectedMonths.length} selected`, `${selectedMonths.length} चयनित`) : t("All Months", "सभी महीने")}
                              </Dropdown.Toggle>
                              <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                                <Dropdown.Item as="div" className="d-flex justify-content-between">
                                  <Button variant="link" size="sm" onClick={handleSelectAllMonths}>{t("Select All", "सभी चुनें")}</Button>
                                  <Button variant="link" size="sm" onClick={handleDeselectAllMonths}>{t("Deselect All", "सभी हटाएँ")}</Button>
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                {monthsForSelectedFinYear.map((month) => (
                                  <Dropdown.Item key={month} as="div">
                                    <Form.Check type="checkbox" label={month} checked={selectedMonths.includes(month)} onChange={() => handleMonthFilterChange(month)} />
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown>
                          </Form.Group>
                        </Col>
                      </Row>
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>{t("Month", "महीना")}</th>
                            <th>{t("Total Beneficiaries", "कुल लाभार्थी")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMonthWiseReport.map((item, index) => (
                            <tr key={index}><td>{item.month}</td><td>{item.total_beneficiaries}</td></tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </Tab>

                <Tab eventKey="district_summary" title={t("District Summary", "ज़िला सारांश")}>
                  <h5 className="mt-4">{t("District-wise Summary (Total)", "ज़िला-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("District", "ज़िला")}</th>
                        <th>{t("PW & LM", "गर्भवती एवं धात्री माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह–3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3–6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "एसएएम (6 माह–3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "एसएएम (3–5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "एसयूडब्ल्यू (6 माह–3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "एसयूडब्ल्यू (3–6 वर्ष)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.district_summary.map((district) => (
                        <tr key={district.district}>
                          <td>{district.district}</td>
                          <td>{district.total_pw_lm}</td>
                          <td>{district.total_children_6m_3y}</td>
                          <td>{district.total_children_3_6y}</td>
                          <td>{district.total_adolescent_girls}</td>
                          <td>{district.total_sam_6m_3y}</td>
                          <td>{district.total_sam_3_5y}</td>
                          <td>{district.total_suw_6m_3y}</td>
                          <td>{district.total_suw_3_6y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="project_summary" title={t("Project Summary", "परियोजना सारांश")}>
                  <h5 className="mt-4">{t("Project-wise Summary (Total)", "परियोजना-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Project", "परियोजना")}</th>
                        <th>{t("PW & LM", "गर्भवती एवं धात्री माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह–3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3–6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "एसएएम (6 माह–3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "एसएएम (3–5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "एसयूडब्ल्यू (6 माह–3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "एसयूडब्ल्यू (3–6 वर्ष)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.project_summary.map((project) => (
                        <tr key={project.project}>
                          <td>{project.project}</td>
                          <td>{project.total_pw_lm}</td>
                          <td>{project.total_children_6m_3y}</td>
                          <td>{project.total_children_3_6y}</td>
                          <td>{project.total_adolescent_girls}</td>
                          <td>{project.total_sam_6m_3y}</td>
                          <td>{project.total_sam_3_5y}</td>
                          <td>{project.total_suw_6m_3y}</td>
                          <td>{project.total_suw_3_6y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="sector_summary" title={t("Sector Summary", "सेक्टर सारांश")}>
                  <h5 className="mt-4">{t("Sector-wise Summary (Total)", "सेक्टर-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Sector", "सेक्टर")}</th>
                        <th>{t("PW & LM", "गर्भवती एवं धात्री माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह–3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3–6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "एसएएम (6 माह–3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "एसएएम (3–5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "एसयूडब्ल्यू (6 माह–3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "एसयूडब्ल्यू (3–6 वर्ष)")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.sector_summary.map((sector) => (
                        <tr key={sector.sector}>
                          <td>{sector.sector}</td>
                          <td>{sector.total_pw_lm}</td>
                          <td>{sector.total_children_6m_3y}</td>
                          <td>{sector.total_children_3_6y}</td>
                          <td>{sector.total_adolescent_girls}</td>
                          <td>{sector.total_sam_6m_3y}</td>
                          <td>{sector.total_sam_3_5y}</td>
                          <td>{sector.total_suw_6m_3y}</td>
                          <td>{sector.total_suw_3_6y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Tab>

                <Tab eventKey="awc_report" title={t("AWC Report", "आंगनवाड़ी केंद्र रिपोर्ट")}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{t("AWC Beneficiary Report", "आंगनवाड़ी केंद्र लाभार्थी रिपोर्ट")}</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> {t("Export PDF", "पीडीएफ निर्यात करें")}
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> {t("Export Excel", "एक्सेल निर्यात करें")}
                      </Button>
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                        <FaEye className="me-1" /> {t("Column Visibility", "कॉलम दृश्यता")}
                      </Button>
                    </div>
                  </div>

                  <Row className="mb-3 g-3">
                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.fin_year.length ? t(`${filters.fin_year.length} selected`, `${filters.fin_year.length} चयनित`) : t("All Fin. Years", "सभी वित्तीय वर्ष")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueFinYears.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.fin_year.includes(v)} onChange={() => handleMultiSelectChange("fin_year", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.month.length ? t(`${filters.month.length} selected`, `${filters.month.length} चयनित`) : t("All Months", "सभी महीने")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueMonths.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.month.includes(v)} onChange={() => handleMultiSelectChange("month", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.district.length ? t(`${filters.district.length} selected`, `${filters.district.length} चयनित`) : t("All Districts", "सभी ज़िले")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueDistricts.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.district.includes(v)} onChange={() => handleMultiSelectChange("district", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.project.length ? t(`${filters.project.length} selected`, `${filters.project.length} चयनित`) : t("All Projects", "सभी परियोजनाएँ")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueProjects.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.project.includes(v)} onChange={() => handleMultiSelectChange("project", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2}>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" className="w-100">
                          {filters.sector.length ? t(`${filters.sector.length} selected`, `${filters.sector.length} चयनित`) : t("All Sectors", "सभी सेक्टर")}
                        </Dropdown.Toggle>
                        <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {uniqueSectors.map((v) => (
                            <Dropdown.Item key={v} as="div">
                              <Form.Check type="checkbox" label={v} checked={filters.sector.includes(v)} onChange={() => handleMultiSelectChange("sector", v)} />
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Col>

                    <Col md={2} className="d-flex align-items-end">
                      <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ fin_year: [], month: [], district: [], project: [], sector: [] })}>
                        {t("Clear Filters", "फ़िल्टर साफ़ करें")}
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      {t("No beneficiary reports found for the selected filters.", "चुने गए फ़िल्टर के लिए कोई लाभार्थी रिपोर्ट नहीं मिली।")}
                    </div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>
                              {localizedColumns.filter((col) => col.visible).map((col) => (
                                <th key={col.dataField}>{col.text}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {currentItems.map((report, index) => (
                              <tr key={report.id}>
                                {visibleColumns.map((col) => (
                                  <td key={col.dataField}>
                                    {col.dataField === "#"
                                      ? (currentPage - 1) * itemsPerPage + index + 1
                                      : col.dataField === "created_at" || col.dataField === "updated_at"
                                      ? new Date(report[col.dataField]).toLocaleString()
                                      : report[col.dataField]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
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
          <Modal.Header closeButton>
            <Modal.Title>{t("Show/Hide Columns", "कॉलम दिखाएँ/छिपाएँ")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {localizedColumns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={col.text} checked={col.visible} onChange={() => handleColumnToggle(index)} />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>{t("Close", "बंद करें")}</Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default DirectorBeneEntry;