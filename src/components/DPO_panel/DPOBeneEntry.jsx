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
import dpoHindi from "./DPOTranslations.json";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import DPOLeftNav from "./DPOLeftNav";
import DPOHeader from "./DPOHeader";

const DPOBeneEntry = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );
  const { api } = useAuth();
  const [summaryData, setSummaryData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef(null);

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
      const response = await api.get(`/dpo/beneficiary-summary/`);
      const results = response.data.results;

      if (results && results.success) {
        setSummaryData({
          district: results.district,
          district_total: results.district_total,
          project_summary: results.project_summary,
          sector_summary: results.sector_summary,
        });
        setReports(results.data || []);
      }
    } catch (err) {
      setError(t("Failed to fetch beneficiary summary.", "लाभार्थी सारांश प्राप्त करने में विफल।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchBeneficiarySummary();
  }, [fetchBeneficiarySummary]);

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
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      />
    );
    items.push(
      <Pagination.Prev
        key="prev"
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
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    );
    items.push(
      <Pagination.Last
        key="last"
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    );

    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

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
                <Tab eventKey="district_total" title={t("District Total", "जिला कुल")}>
                  <h5 className="mt-4">
                    {t("District Total", "जिला कुल")}: {summaryData.district}
                  </h5>
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>{t("District", "जिला")}</th>
                            <th>{t("PW & LM", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}</th>
                            <th>{t("Child (6m-3y)", "बच्चे (6 माह-3 वर्ष)")}</th>
                            <th>{t("Child (3-6y)", "बच्चे (3-6 वर्ष)")}</th>
                            <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                            <th>{t("SAM (6m-3y)", "SAM (6 माह-3 वर्ष)")}</th>
                            <th>{t("SAM (3-5y)", "SAM (3-5 वर्ष)")}</th>
                            <th>{t("SUW (6m-3y)", "SUW (6 माह-3 वर्ष)")}</th>
                            <th>{t("SUW (3-6y)", "SUW (3-6 वर्ष)")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{summaryData.district}</td>
                            <td>{summaryData.district_total.total_pw_lm}</td>
                            <td>{summaryData.district_total.total_children_6m_3y}</td>
                            <td>{summaryData.district_total.total_children_3_6y}</td>
                            <td>{summaryData.district_total.total_adolescent_girls}</td>
                            <td>{summaryData.district_total.total_sam_6m_3y}</td>
                            <td>{summaryData.district_total.total_sam_3_5y}</td>
                            <td>{summaryData.district_total.total_suw_6m_3y}</td>
                            <td>{summaryData.district_total.total_suw_3_6y}</td>
                          </tr>
                        </tbody>
                      </Table>
                </Tab>

                <Tab eventKey="project_summary" title={t("Project Summary", "परियोजना सारांश")}>
                  <h5 className="mt-4">{t("Project-wise Summary (Total)", "परियोजना-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Project", "परियोजना")}</th>
                        <th>{t("PW & LM", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह-3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3-6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "SAM (6 माह-3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "SAM (3-5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "SUW (6 माह-3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "SUW (3-6 वर्ष)")}</th>
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
                  </Table>   {/* FIX: was </Card> */}
                </Tab>

                <Tab eventKey="sector_summary" title={t("Sector Summary", "सेक्टर सारांश")}>
                  <h5 className="mt-4">{t("Sector-wise Summary (Total)", "सेक्टर-वार सारांश (कुल)")}</h5>
                  <Table striped bordered hover responsive className="mb-4">
                    <thead>
                      <tr>
                        <th>{t("Sector", "सेक्टर")}</th>
                        <th>{t("PW & LM", "गर्भवती एवं स्तनपान कराने वाली माताएँ")}</th>
                        <th>{t("Child (6m-3y)", "बच्चे (6 माह-3 वर्ष)")}</th>
                        <th>{t("Child (3-6y)", "बच्चे (3-6 वर्ष)")}</th>
                        <th>{t("Adol. Girls", "किशोरियाँ")}</th>
                        <th>{t("SAM (6m-3y)", "SAM (6 माह-3 वर्ष)")}</th>
                        <th>{t("SAM (3-5y)", "SAM (3-5 वर्ष)")}</th>
                        <th>{t("SUW (6m-3y)", "SUW (6 माह-3 वर्ष)")}</th>
                        <th>{t("SUW (3-6y)", "SUW (3-6 वर्ष)")}</th>
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

                <Tab eventKey="awc_report" title={t("AWC Report", "आंगनवाड़ी रिपोर्ट")}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">{t("AWC Beneficiary Report", "आंगनवाड़ी लाभार्थी रिपोर्ट")}</h5>
                    <div>
                      <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                        <FaFilePdf className="me-1" /> {t("Export PDF", "PDF निर्यात करें")}
                      </Button>
                      <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                        <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
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
                          {filters.fin_year.length ? `${filters.fin_year.length} ${t("selected", "चयनित")}` : t("All Fin. Years", "सभी वित्तीय वर्ष")}
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
                          {filters.month.length ? `${filters.month.length} ${t("selected", "चयनित")}` : t("All Months", "सभी महीने")}
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
                          {filters.district.length ? `${filters.district.length} ${t("selected", "चयनित")}` : t("All Districts", "सभी जिले")}
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
                          {filters.project.length ? `${filters.project.length} ${t("selected", "चयनित")}` : t("All Projects", "सभी परियोजनाएँ")}
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
                          {filters.sector.length ? `${filters.sector.length} ${t("selected", "चयनित")}` : t("All Sectors", "सभी सेक्टर")}
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
                        {t("Clear Filters", "फ़िल्टर हटाएँ")}
                      </Button>
                    </Col>
                  </Row>

                  {filteredReports.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No beneficiary reports found for the selected filters.
                    </div>
                  ) : (
                    <Card className="shadow-sm">
                      <div className="table-responsive">
                        <Table striped bordered hover responsive className="mb-0" ref={tableRef}>
                          <thead>
                            <tr>
                              {visibleColumns.map((col) => (
                                <th key={col.dataField}>{translateLabel(col.text)}</th>
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
            {columns.map((col, index) => (
              <Form.Check key={index} type="checkbox" label={translateLabel(col.text)} checked={col.visible} onChange={() => handleColumnToggle(index)} />
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

export default DPOBeneEntry;