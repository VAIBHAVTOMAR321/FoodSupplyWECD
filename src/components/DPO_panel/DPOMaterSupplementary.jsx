import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Col,
  Container,
  Form,
  Pagination,
  Row,
  Spinner,
  Table,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import dpoHindi from "./DPOTranslations.json";
import "../../assets/css/dashboard.css";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const API_URL = "/supplementary-nutrition-master/";
const QUARTERS = ["Apr-May-Jun", "Jul-Aug-Sep", "Oct-Nov-Dec", "Jan-Feb-Mar"];
const ITEMS_PER_PAGE = 10;

const COLUMNS = [
  { key: "serial", label: "#" },
  { key: "district", label: "District" },
  { key: "project", label: "Project" },
  { key: "quarter", label: "Trimester" },
  { key: "financial_year", label: "Financial Year" },
  { key: "pregnant_woman_lactating_mother", label: "PW & LM" },
  { key: "poushik_sattu_preg_lat", label: "Poushik Sattu" },
  { key: "children_6m_3y", label: "Children 6m-3y" },
  { key: "panjeeri_6m_3y", label: "Panjeeri 6m-3y" },
  { key: "sam_children_6m_5y_suw_children_6m_6y", label: "SAM 6M-5Y/SUW 6M-6Y" },
  { key: "panjeeri_sam_6m_5y_suw_6m_6y", label: "Panjeeri SAM" },
  { key: "sam_children_3y_5y_suw_children_3y_6y", label: "SAM 3Y-5Y/SUW 3Y-6Y" },
  { key: "sattu_sam_3y_5y_suw_3y_6y", label: "Sattu SAM" },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3Y-6Y" },
  { key: "mung_dal_khichdi_3y_6y", label: "Mung Dal Khichdi" },
  { key: "multi_grain_aata_3y_6y", label: "Multi Grain Aata" },
];

const getRecords = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results?.data)) return data.results.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  throw new Error("Unexpected supplementary nutrition records response.");
};

const displayValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : value;

const DPOMaterSupplementary = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const { api } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [filters, setFilters] = useState({ financial_year: "", quarter: "" });

  useEffect(() => {
    let isActive = true;
    api.get(API_URL, { timeout: 30000 })
      .then((response) => {
        if (isActive) setReports(getRecords(response.data));
      })
      .catch((err) => {
        console.error("Fetch supplementary nutrition records error:", err);
        if (isActive) setError(t("Failed to fetch supplementary nutrition records. Please try again.", "पूरक पोषण रिकॉर्ड प्राप्त करने में विफल। कृपया पुनः प्रयास करें।"));
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => { isActive = false; };
  }, [api]);

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

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
    setCurrentPage(1);
  };

  const uniqueFinYears = useMemo(
    () => [...new Set(reports.map((report) => report.financial_year).filter(Boolean))]
      .sort((a, b) => String(b).localeCompare(String(a))),
    [reports],
  );

  const uniqueQuarters = useMemo(
    () => [...new Set(reports.map((report) => report.quarter).filter(Boolean))]
      .sort((a, b) => {
        const aOrder = QUARTERS.indexOf(a);
        const bOrder = QUARTERS.indexOf(b);
        if (aOrder === -1 && bOrder === -1) return String(a).localeCompare(String(b));
        if (aOrder === -1) return 1;
        if (bOrder === -1) return -1;
        return aOrder - bOrder;
      }),
    [reports],
  );

  const filteredReports = useMemo(
    () => reports.filter(
      (report) =>
        (!filters.financial_year || report.financial_year === filters.financial_year) &&
        (!filters.quarter || report.quarter === filters.quarter),
    ),
    [reports, filters],
  );

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const indexOfFirstItem = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfFirstItem + ITEMS_PER_PAGE);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const exportToExcel = useCallback(() => {
    const rows = filteredReports.map((report, index) =>
      Object.fromEntries(COLUMNS.map((column) => [
        column.label,
        column.key === "serial" ? index + 1 : displayValue(report[column.key]),
      ])),
    );
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: COLUMNS.map((column) => column.label),
    });
    worksheet["!cols"] = COLUMNS.map((column) => {
      const maxLength = Math.max(
        column.label.length,
        ...rows.map((row) => String(row[column.label] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), 32) };
    });
    if (rows.length) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: rows.length, c: COLUMNS.length - 1 },
        }),
      };
    }
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplementary Nutrition");
    XLSX.writeFile(workbook, "DPO_Supplementary_Nutrition.xlsx", { compression: true });
  }, [filteredReports]);

  const exportToPDF = useCallback(() => {
    if (!filteredReports.length || exportingPdf) return;
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
        compress: true,
      });
      autoTable(pdf, {
        head: [COLUMNS.map((column) => column.label)],
        body: filteredReports.map((report, index) =>
          COLUMNS.map((column) =>
            String(column.key === "serial" ? index + 1 : displayValue(report[column.key])),
          ),
        ),
        theme: "grid",
        margin: { top: 20, right: 8, bottom: 14, left: 8 },
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
          minCellHeight: 7,
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [79, 96, 207],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          minCellHeight: 9,
        },
        columnStyles: { 0: { cellWidth: 9, halign: "center" } },
        showHead: "everyPage",
        rowPageBreak: "avoid",
        pageBreak: "auto",
        willDrawPage: (data) => {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(13);
          pdf.text("Supplementary Nutrition Master", data.settings.margin.left, 10);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text(`Records: ${filteredReports.length}`, data.settings.margin.left, 15);
        },
      });
      pdf.save("DPO_Supplementary_Nutrition.pdf");
    } catch (err) {
      console.error("Failed to export supplementary nutrition PDF:", err);
      window.alert(t("PDF export failed. Please try again.", "PDF निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    } finally {
      setExportingPdf(false);
    }
  }, [filteredReports, exportingPdf]);

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
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
            <h3 className="fw-bold mb-0">{t("Supplementary Nutrition Master", "पूरक पोषण मास्टर")}</h3>
            <ButtonGroup>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={exportToPDF}
                disabled={loading || !filteredReports.length || exportingPdf}
              >
                <FaFilePdf className="me-1" />
                {exportingPdf ? t("Preparing PDF…", "PDF तैयार हो रही है…") : t("Export PDF", "PDF निर्यात करें")}
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={exportToExcel}
                disabled={loading || !filteredReports.length}
              >
                <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
              </Button>
            </ButtonGroup>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>{t("Filter by Financial Year", "वित्तीय वर्ष के अनुसार फ़िल्टर करें")}</Form.Label>
                <Form.Select
                  name="financial_year"
                  value={filters.financial_year}
                  onChange={handleFilterChange}
                >
                  <option value="">{t("All Years", "सभी वर्ष")}</option>
                  {uniqueFinYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>{t("Filter by Trimester", "त्रैमासिक के अनुसार फ़िल्टर करें")}</Form.Label>
                <Form.Select
                  name="quarter"
                  value={filters.quarter}
                  onChange={handleFilterChange}
                >
                  <option value="">{t("All Trimester", "सभी त्रैमासिक")}</option>
                  {uniqueQuarters.map((quarter) => (
                    <option key={quarter} value={quarter}>{quarter}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="table-responsive">
            {loading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">{t("Fetching records, please wait...", "रिकॉर्ड प्राप्त किए जा रहे हैं, कृपया प्रतीक्षा करें...")}</p>
              </div>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => <th key={column.key}>{translateLabel(column.label)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((report, index) => (
                      <tr key={report.id ?? index}>
                        {COLUMNS.map((column) => (
                          <td key={column.key}>
                            {displayValue(
                              column.key === "serial"
                                ? indexOfFirstItem + index + 1
                                : report[column.key],
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={COLUMNS.length} className="text-center">
                        {t("No supplementary nutrition records found.", "पूरक पोषण का कोई रिकॉर्ड नहीं मिला।")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            )}
          </div>
          {totalPages > 1 && (
            <Pagination className="justify-content-center">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Pagination.Item
                  key={page}
                  active={page === currentPage}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Pagination.Item>
              ))}
            </Pagination>
          )}
        </Container>
      </div>
    </div>
  );
};

export default DPOMaterSupplementary;
