import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Tabs,
  Tab,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const AWC_COLUMNS = [
  { key: "serial", label: "#" },
  { key: "awc_code", label: "AWC Code" },
  { key: "awc_name", label: "AWC Name" },
  { key: "awc_type", label: "AWC Type" },
  { key: "code1", label: "Code" },
  { key: "sector", label: "Sector" },
  { key: "project", label: "Project" },
  { key: "district", label: "District" },
];

const SECTOR_COLUMNS = [
  { key: "serial", label: "#" },
  { key: "sdname", label: "SD Name" },
  { key: "district", label: "District" },
  { key: "project_code", label: "Project Code" },
  { key: "project_name", label: "Project Name" },
  { key: "sector", label: "Sector" },
  { key: "sector_incharge", label: "Sector Incharge" },
  { key: "incharge_mob", label: "Incharge Mobile" },
];

const valueFor = (item, key, index) => {
  if (key === "serial") return index + 1;
  if (key === "district" && item.district_name !== undefined) {
    return item.district_name ?? item.district ?? "—";
  }
  const value = item[key];
  return value === null || value === undefined || value === "" ? "—" : value;
};

const safeText = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

function CdpoAWCList() {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState("awc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [awcData, setAwcData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [awcCount, setAwcCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { api } = useAuth();

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
    const fetchLists = async () => {
      setLoading(true);
      setError("");
      try {
        const [awcResponse, sectorResponse] = await Promise.all([
          api.get("/cdpo-awc-dropdown/"),
          api.get("/cdpo-sector/"),
        ]);
        const awcPayload = awcResponse.data;
        const sectorPayload = sectorResponse.data;
        setAwcData(Array.isArray(awcPayload?.data) ? awcPayload.data : []);
        setAwcCount(
          awcPayload?.count ??
            (Array.isArray(awcPayload?.data) ? awcPayload.data.length : 0),
        );
        setSectorData(
          Array.isArray(sectorPayload?.data) ? sectorPayload.data : [],
        );
        setSectorCount(
          sectorPayload?.count ??
            (Array.isArray(sectorPayload?.data) ? sectorPayload.data.length : 0),
        );
      } catch (err) {
        console.error("Failed to fetch CDPO AWC/Sector lists:", err);
        setError(t("Failed to load AWC and sector data. Please try again.", "आंगनवाड़ी केंद्र और सेक्टर डेटा लोड नहीं हो सका। कृपया पुनः प्रयास करें।"));
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, [api]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const exportExcel = useCallback(() => {
    const isAwc = activeTab === "awc";
    const columns = isAwc ? AWC_COLUMNS : SECTOR_COLUMNS;
    const data = isAwc ? awcData : sectorData;
    const rows = data.map((item, index) =>
      Object.fromEntries(
        columns.map((column) => [
          column.label,
          safeText(valueFor(item, column.key, index)),
        ]),
      ),
    );
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: columns.map((column) => column.label),
    });
    worksheet["!cols"] = columns.map((column) => {
      const maxValue = Math.max(
        column.label.length,
        ...rows.map((row) => String(row[column.label] ?? "").length),
      );
      return { wch: Math.min(Math.max(maxValue + 2, 10), 36) };
    });
    if (rows.length) {
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: rows.length, c: columns.length - 1 },
        }),
      };
    }
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      isAwc ? "AWC List" : "Sector List",
    );
    XLSX.writeFile(
      workbook,
      isAwc ? "CDPO_AWC_List.xlsx" : "CDPO_Sector_List.xlsx",
      { compression: true },
    );
  }, [activeTab, awcData, sectorData]);

  const exportPdf = useCallback(async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    const isAwc = activeTab === "awc";
    const columns = isAwc ? AWC_COLUMNS : SECTOR_COLUMNS;
    const data = isAwc ? awcData : sectorData;
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(15);
      pdf.text(isAwc ? "CDPO AWC List" : "CDPO Sector List", 10, 12);
      pdf.setFontSize(9);
      pdf.text(`Total records: ${data.length}`, 10, 18);
      autoTable(pdf, {
        startY: 23,
        head: [columns.map((column) => column.label)],
        body: data.map((item, index) =>
          columns.map((column) =>
            safeText(valueFor(item, column.key, index)),
          ),
        ),
        theme: "grid",
        margin: { top: 12, right: 8, bottom: 12, left: 8 },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [79, 96, 207],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
        },
        showHead: "everyPage",
        rowPageBreak: "avoid",
        horizontalPageBreak: true,
        horizontalPageBreakRepeat: [0],
      });
      pdf.save(isAwc ? "CDPO_AWC_List.pdf" : "CDPO_Sector_List.pdf");
    } catch (err) {
      console.error("Failed to export CDPO list PDF:", err);
      window.alert(t("Failed to export PDF. Please try again.", "पीडीएफ़ निर्यात नहीं हो सका। कृपया पुनः प्रयास करें।"));
    } finally {
      setExportingPdf(false);
    }
  }, [activeTab, awcData, sectorData, exportingPdf]);

  const activeData = activeTab === "awc" ? awcData : sectorData;
  const activeCount = activeTab === "awc" ? awcCount : sectorCount;

  return (
    <div className="dashboard-container">
      <CDPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <div className="dashboard-section">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h4 className="section-title mb-0">{t("CDPO AWC & Sector List", "सीडीपीओ आंगनवाड़ी केंद्र एवं सेक्टर सूची")}</h4>
              <div className="d-flex align-items-center gap-2">
                <ButtonGroup>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={exportPdf}
                    disabled={loading || !activeData.length || exportingPdf}
                  >
                    <FaFilePdf className="me-1" />
                    {exportingPdf ? t("Preparing PDF…", "पीडीएफ़ तैयार हो रही है…") : t("Export PDF", "पीडीएफ़ निर्यात करें")}
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={exportExcel}
                    disabled={loading || !activeData.length}
                  >
                    <FaFileExcel className="me-1" />
                    {t("Export Excel", "एक्सेल निर्यात करें")}
                  </Button>
                </ButtonGroup>
              </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {loading ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
              </div>
            ) : (
              <Tabs
                activeKey={activeTab}
                onSelect={(key) => key && setActiveTab(key)}
                id="cdpo-awc-list-tabs"
                className="mb-4"
              >
                <Tab eventKey="awc" title={`${t("AWC List", "आंगनवाड़ी केंद्र सूची")} (${awcCount})`}>
                  <div className="table-responsive">
                    <Table striped bordered hover responsive className="mb-0">
                      <thead className="table-light">
                        <tr>
                          {AWC_COLUMNS.map((column) => (
                            <th key={column.key}>{t(column.label, ({
                              "AWC Code": "आंगनवाड़ी केंद्र कोड",
                              "AWC Name": "आंगनवाड़ी केंद्र का नाम",
                              "AWC Type": "आंगनवाड़ी केंद्र का प्रकार",
                              Code: "कोड",
                              Sector: "सेक्टर",
                              Project: "परियोजना",
                              District: "जिला",
                            })[column.label] || column.label)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {awcData.map((item, index) => (
                          <tr key={item.awc_code ?? item.id ?? index}>
                            {AWC_COLUMNS.map((column) => (
                              <td key={column.key}>
                                {safeText(valueFor(item, column.key, index))}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Tab>
                <Tab eventKey="sector" title={`${t("Sector List", "सेक्टर सूची")} (${sectorCount})`}>
                  <div className="table-responsive">
                    <Table striped bordered hover responsive className="mb-0">
                      <thead className="table-light">
                        <tr>
                          {SECTOR_COLUMNS.map((column) => (
                            <th key={column.key}>{t(column.label, ({
                              "SD Name": "एसडी का नाम",
                              District: "जिला",
                              "Project Code": "परियोजना कोड",
                              "Project Name": "परियोजना का नाम",
                              Sector: "सेक्टर",
                              "Sector Incharge": "सेक्टर प्रभारी",
                              "Incharge Mobile": "प्रभारी का मोबाइल",
                            })[column.label] || column.label)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sectorData.map((item, index) => (
                          <tr key={item.id ?? index}>
                            {SECTOR_COLUMNS.map((column) => (
                              <td key={column.key}>
                                {safeText(valueFor(item, column.key, index))}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Tab>
              </Tabs>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}

export default CdpoAWCList;
