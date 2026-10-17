import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Tabs,
  Tab,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import dpoHindi from "./DPOTranslations.json";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const TABLE_CONFIG = {
  awc: {
    title: "AWC List",
    filename: "DPO_AWC_List",
    columns: [
      { key: "serial", label: "#" },
      { key: "awc_code", label: "AWC Code" },
      { key: "awc_name", label: "AWC Name" },
      { key: "awc_type", label: "AWC Type" },
      { key: "code1", label: "Code" },
      { key: "sector", label: "Sector" },
      { key: "project", label: "Project" },
      { key: "district_name", label: "District" },
    ],
  },
  sector: {
    title: "Sector List",
    filename: "DPO_Sector_List",
    columns: [
      { key: "serial", label: "#" },
      { key: "sdname", label: "SD Name" },
      { key: "district", label: "District" },
      { key: "project_code", label: "Project Code" },
      { key: "project_name", label: "Project Name" },
      { key: "sector", label: "Sector" },
      { key: "sector_incharge", label: "Sector Incharge" },
      { key: "incharge_mob", label: "Incharge Mobile" },
    ],
  },
  project: {
    title: "Project List",
    filename: "DPO_Project_List",
    columns: [
      { key: "serial", label: "#" },
      { key: "project_code", label: "Project Code" },
      { key: "project_name", label: "Project Name" },
      { key: "project_show", label: "Project Show" },
      { key: "stat_fin", label: "Status" },
      { key: "ang_pur", label: "ANG Pur" },
      { key: "adhar_stat", label: "Adhar Status" },
    ],
  },
};

const valueForColumn = (item, key) => {
  if (key === "serial") return "";
  if (key === "district_name") return item.district_name ?? item.district ?? "—";
  const value = item?.[key];
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => (
    v && typeof v === "object" ? JSON.stringify(v) : String(v)
  )).join(", ");
  if (typeof value === "object") return value.name ?? value.label ?? value.title ?? JSON.stringify(value);
  return String(value);
};

const DpoAwcList = () => {
  const { t } = useLanguage();
  const translateLabel = (text) => t(text, dpoHindi[text] || text);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState("awc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [awcData, setAwcData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [projectData, setProjectData] = useState([]);
  const [awcCount, setAwcCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { api } = useAuth();

  const queryTab = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "awc";
    return TABLE_CONFIG[tab] ? tab : "awc";
  }, [location.search]);

  useEffect(() => setActiveTab(queryTab), [queryTab]);

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

  useEffect(() => {
    if (!api) return;
    let isActive = true;

    const fetchLists = async () => {
      setLoading(true);
      setError("");
      try {
        const [awcResponse, sectorResponse, projectResponse] = await Promise.all([
          api.get("/dpo-awc-dropdown/"),
          api.get("/dpo-sector-list/"),
          api.get("/dpo-project-list/"),
        ]);

        if (!isActive) return;
        const awcPayload = awcResponse.data;
        const sectorPayload = sectorResponse.data;
        const projectPayload = projectResponse.data;

        const awcs = Array.isArray(awcPayload?.data) ? awcPayload.data : [];
        const sectors = Array.isArray(sectorPayload?.data) ? sectorPayload.data : [];
        const projects = Array.isArray(projectPayload?.data) ? projectPayload.data : [];

        setAwcData(awcs);
        setAwcCount(awcPayload?.count ?? awcs.length);
        setSectorData(sectors);
        setSectorCount(sectorPayload?.count ?? sectors.length);
        setProjectData(projects);
        setProjectCount(projectPayload?.count ?? projects.length);
      } catch (err) {
        console.error("Failed to fetch DPO AWC/Sector/Project lists:", err);
        if (isActive) setError(t("Failed to load AWC, sector, or project data. Please try again.", "आंगनवाड़ी केंद्र, सेक्टर या परियोजना डेटा लोड करने में विफल। कृपया पुनः प्रयास करें।"));
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchLists();
    return () => { isActive = false; };
  }, [api]);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const dataByTab = useMemo(() => ({
    awc: awcData,
    sector: sectorData,
    project: projectData,
  }), [awcData, sectorData, projectData]);

  const exportRows = useMemo(() => {
    const config = TABLE_CONFIG[activeTab];
    const data = dataByTab[activeTab] || [];
    return data.map((item, index) =>
      config.columns.map((column) =>
        column.key === "serial" ? index + 1 : valueForColumn(item, column.key)
      )
    );
  }, [activeTab, dataByTab]);

  const exportToExcel = useCallback(() => {
    if (!exportRows.length) return;
    const config = TABLE_CONFIG[activeTab];
    const headers = config.columns.map((column) => column.label);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportRows]);
    worksheet["!cols"] = config.columns.map((column, colIndex) => {
      const maxLength = Math.max(
        column.label.length,
        ...exportRows.map((row) => String(row[colIndex] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), column.key === "awc_name" || column.key === "project_name" ? 32 : 24) };
    });
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: exportRows.length, c: headers.length - 1 },
      }),
    };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.title.slice(0, 31));
    XLSX.writeFile(workbook, `${config.filename}.xlsx`, { compression: true });
  }, [activeTab, exportRows]);

  const exportToPDF = useCallback(() => {
    if (!exportRows.length || exportingPdf) return;
    setExportingPdf(true);
    try {
      const config = TABLE_CONFIG[activeTab];
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
        compress: true,
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(15);
      pdf.text(config.title, 10, 12);
      pdf.setFontSize(9);
      pdf.text(`Total records: ${exportRows.length}`, 10, 18);

      autoTable(pdf, {
        startY: 23,
        head: [config.columns.map((column) => column.label)],
        body: exportRows,
        theme: "grid",
        margin: { top: 20, right: 9, bottom: 18, left: 9 },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.5,
          overflow: "linebreak",
          valign: "middle",
          minCellHeight: 8,
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [79, 96, 207],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          minCellHeight: 10,
        },
        columnStyles: { 0: { cellWidth: 12, halign: "center" } },
        showHead: "everyPage",
        rowPageBreak: "avoid",
        pageBreak: "auto",
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0],
        willDrawPage: () => {
          // Reserve consistent header/footer space on every page.
        },
      });
      pdf.save(`${config.filename}.pdf`);
    } catch (err) {
      console.error("Failed to export DPO list PDF:", err);
      window.alert(t("PDF export failed. Please try again.", "PDF निर्यात विफल रहा। कृपया पुनः प्रयास करें।"));
    } finally {
      setExportingPdf(false);
    }
  }, [activeTab, exportRows, exportingPdf]);

  const renderTable = (data, columns, rowKey) => (
    <div className="table-responsive">
      <Table striped bordered hover responsive className="mb-0">
        <thead className="table-light">
          <tr>{columns.map((column) => <th key={column.key}>{translateLabel(column.label)}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item[rowKey] ?? item.id ?? index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.key === "serial" ? index + 1 : valueForColumn(item, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );

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
          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h4 className="section-title mb-0">{t("CDPO AWC & Sector List", "सीडीपीओ आंगनवाड़ी केंद्र एवं सेक्टर सूची")}</h4>
              <ButtonGroup>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={loading || !exportRows.length || exportingPdf}
                >
                  <FaFilePdf className="me-1" />
                  {exportingPdf ? t("Preparing PDF…", "PDF तैयार हो रही है…") : t("Export PDF", "PDF निर्यात करें")}
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={exportToExcel}
                  disabled={loading || !exportRows.length}
                >
                  <FaFileExcel className="me-1" /> {t("Export Excel", "Excel निर्यात करें")}
                </Button>
              </ButtonGroup>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {loading ? (
              <div className="text-center p-4"><Spinner animation="border" /></div>
            ) : (
              <Tabs
                activeKey={activeTab}
                onSelect={(key) => {
                  if (key && TABLE_CONFIG[key]) setActiveTab(key);
                }}
                id="dpo-awc-list-tabs"
                className="mb-4"
              >
                <Tab eventKey="awc" title={`${t("AWC List", "आंगनवाड़ी केंद्र सूची")} (${awcCount})`}>
                  {renderTable(awcData, TABLE_CONFIG.awc.columns, "awc_code")}
                </Tab>
                <Tab eventKey="sector" title={`${t("Sector List", "सेक्टर सूची")} (${sectorCount})`}>
                  {renderTable(sectorData, TABLE_CONFIG.sector.columns, "id")}
                </Tab>
                <Tab eventKey="project" title={`${t("Project List", "परियोजना सूची")} (${projectCount})`}>
                  {renderTable(projectData, TABLE_CONFIG.project.columns, "id")}
                </Tab>
              </Tabs>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
};

export default DpoAwcList;
