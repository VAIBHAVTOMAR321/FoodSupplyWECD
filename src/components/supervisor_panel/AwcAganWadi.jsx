import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Table,
  Spinner,
  Alert,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiProfile.css";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { useAuth } from "../all_login/AuthContext";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const AWC_COLUMNS = [
  { key: "serial", label: "#" },
  { key: "district_name", label: "District Name" },
  { key: "district_code", label: "District Code" },
  { key: "project", label: "Project" },
  { key: "sector", label: "Sector" },
  { key: "awc_code", label: "AWC Code" },
  { key: "awc_name", label: "AWC Name" },
  { key: "awc_type", label: "AWC Type" },
  { key: "code1", label: "Code1" },
];

const cellValue = (value) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const AwcAganWadi = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const navigate = useNavigate();
  const [awcList, setAwcList] = useState([]);
  const [awcLoading, setAwcLoading] = useState(true);
  const [awcError, setAwcError] = useState("");
  const [awcCount, setAwcCount] = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const fetchAwcList = useCallback(async () => {
    if (!api) return;
    setAwcLoading(true);
    setAwcError("");
    try {
      const response = await api.get("/sector-awc-dropdown/");
      const rawData = Array.isArray(response.data?.data) ? response.data.data : [];
      setAwcList(rawData);
      setAwcCount(Number(response.data?.count ?? rawData.length));
    } catch (err) {
      console.error("Failed to fetch AWC list:", err);
      setAwcError("Failed to load AWC list. Please try again.");
      setAwcList([]);
      setAwcCount(0);
    } finally {
      setAwcLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAwcList();
  }, [fetchAwcList]);

  const exportToExcel = () => {
    const rows = awcList.map((awc, index) => ({
      "#": index + 1,
      "District Name": cellValue(awc.district_name),
      "District Code": cellValue(awc.district_code),
      Project: cellValue(awc.project),
      Sector: cellValue(awc.sector),
      "AWC Code": cellValue(awc.awc_code),
      "AWC Name": cellValue(awc.awc_name),
      "AWC Type": cellValue(awc.awc_type),
      Code1: cellValue(awc.code1),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: AWC_COLUMNS.map((column) => column.label),
    });
    worksheet["!cols"] = [
      { wch: 7 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 34 },
      { wch: 18 },
      { wch: 16 },
    ];
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: Math.max(rows.length, 1), c: AWC_COLUMNS.length - 1 },
      }),
    };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AWC List");
    XLSX.writeFile(workbook, "awc_list.xlsx", { compression: true });
  };

  const ensureHindiFont = async () => {
    const fontId = "awc-noto-devanagari-font";
    let link = document.getElementById(fontId);
    if (!link) {
      link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    await new Promise((resolve) => {
      if (document.fonts?.check('14px "Noto Sans Devanagari"')) return resolve();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      link.addEventListener("load", finish, { once: true });
      link.addEventListener("error", finish, { once: true });
      window.setTimeout(finish, 3000);
    });
    try {
      await document.fonts?.load('14px "Noto Sans Devanagari"');
      await document.fonts?.ready;
    } catch (error) {
      console.warn("Could not load Noto Sans Devanagari; using system fonts.", error);
    }
  };

  const exportToPDF = async () => {
    if (!awcList.length || exportingPdf) return;
    setExportingPdf(true);

    const root = document.createElement("div");
    root.style.cssText = [
      "position:fixed",
      "left:-30000px",
      "top:0",
      "width:1400px",
      "padding:28px",
      "box-sizing:border-box",
      "background:#fff",
      "color:#172033",
      'font-family:"Noto Sans Devanagari","Nirmala UI","Mangal",sans-serif',
    ].join(";");

    const title = document.createElement("h2");
    title.textContent = "AWC List";
    title.style.cssText = "margin:0 0 6px;font-size:22px;font-weight:700;";
    root.appendChild(title);

    const count = document.createElement("p");
    count.textContent = `Total AWC: ${Number(awcCount || awcList.length).toLocaleString()}`;
    count.style.cssText = "margin:0 0 16px;font-size:12px;";
    root.appendChild(count);

    const table = document.createElement("table");
    table.style.cssText =
      "width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;";
    const widths = ["5%", "16%", "11%", "14%", "14%", "12%", "16%", "8%", "8%"];
    const colgroup = document.createElement("colgroup");
    widths.forEach((width) => {
      const col = document.createElement("col");
      col.style.width = width;
      colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    const makeHeader = () => {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      AWC_COLUMNS.forEach((column, index) => {
        const th = document.createElement("th");
        th.textContent = column.label;
        th.style.cssText = [
          "background:#4f60cf",
          "color:#fff",
          "border:1px solid #d1d5db",
          "padding:7px 5px",
          "text-align:left",
          "font-weight:700",
          "white-space:nowrap",
          index === 0 ? "text-align:center" : "",
        ].join(";");
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      return thead;
    };
    table.appendChild(makeHeader());

    // Render one complete set of rows per page so no row is sliced across page boundaries.
    const tbody = document.createElement("tbody");
    awcList.forEach((awc, index) => {
      const tr = document.createElement("tr");
      AWC_COLUMNS.forEach((column) => {
        const td = document.createElement("td");
        const value =
          column.key === "serial"
            ? String(index + 1)
            : cellValue(awc[column.key]);
        td.textContent = value;
        td.style.cssText = [
          "border:1px solid #d1d5db",
          "padding:6px 5px",
          "vertical-align:top",
          "white-space:normal",
          "overflow-wrap:anywhere",
          column.key === "serial"
            ? "width:42px;min-width:42px;max-width:42px;text-align:center;white-space:nowrap"
            : "",
        ].join(";");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    root.appendChild(table);
    document.body.appendChild(root);

    try {
      await ensureHindiFont();
      // Measure rendered rows and divide them into page-sized chunks, keeping rows intact.
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const marginX = 8;
      const marginTop = 12;
      const marginBottom = 12;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginTop - marginBottom;
      const canvasScale = 1.1;
      const canvas = await html2canvas(root, {
        scale: canvasScale,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Crop the rendered canvas at the row boundaries, not arbitrary pixel positions.
      const rowElements = Array.from(tbody.querySelectorAll("tr"));
      const rootRect = root.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const rowBounds = rowElements.map((row) => {
        const rect = row.getBoundingClientRect();
        return {
          top: Math.round((rect.top - rootRect.top) * canvasScale),
          bottom: Math.round((rect.bottom - rootRect.top) * canvasScale),
        };
      });
      const titleBottom = Math.round((tableRect.top - rootRect.top) * canvasScale);
      const pagePixelHeight = Math.floor((usableHeight / imageWidth) * canvas.width);
      const topPixel = Math.max(0, titleBottom - Math.round(4 * canvasScale));
      const pageCanvas = document.createElement("canvas");
      const ctx = pageCanvas.getContext("2d");
      let pageStart = 0;
      let pageIndex = 0;

      while (pageStart < canvas.height) {
        let pageEnd = Math.min(pageStart + pagePixelHeight, canvas.height);
        if (pageEnd < canvas.height) {
          const nextBoundary = rowBounds.find((bounds) => bounds.bottom > pageEnd);
          if (nextBoundary && nextBoundary.top > pageStart) {
            pageEnd = nextBoundary.top;
          }
        }
        if (pageEnd <= pageStart) pageEnd = Math.min(pageStart + pagePixelHeight, canvas.height);

        pageCanvas.width = canvas.width;
        pageCanvas.height = pageEnd - pageStart;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          pageStart,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          canvas.width,
          pageCanvas.height,
        );

        if (pageIndex > 0) pdf.addPage();
        const img = pageCanvas.toDataURL("image/jpeg", 0.58);
        const renderedHeight = (pageCanvas.height * imageWidth) / pageCanvas.width;
        pdf.addImage(
          img,
          "JPEG",
          marginX,
          marginTop,
          imageWidth,
          Math.min(renderedHeight, usableHeight),
          undefined,
          "FAST",
        );
        pageStart = pageEnd;
        pageIndex += 1;
      }
      pdf.save("awc_list.pdf");
    } catch (error) {
      console.error("Failed to export AWC list PDF:", error);
      window.alert("Failed to export PDF. Please try again.");
    } finally {
      root.remove();
      setExportingPdf(false);
    }
  };

  return (
    <div className="dashboard-container">
      <SupervisorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <SupervisorHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate("/SupervisorDashBoard")}
              >
                &larr; Back to Dashboard
              </Button>
              <h3 className="mb-0">AWC List</h3>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {awcLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <span className="text-muted">
                  Total AWC: {awcCount.toLocaleString()}
                </span>
              )}
              <ButtonGroup>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={exportToPDF}
                  disabled={awcLoading || !awcList.length || exportingPdf}
                >
                  <FaFilePdf className="me-1" />
                  {exportingPdf ? "Preparing PDF…" : "Export PDF"}
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={exportToExcel}
                  disabled={awcLoading || !awcList.length}
                >
                  <FaFileExcel className="me-1" />
                  Export Excel
                </Button>
              </ButtonGroup>
            </div>
          </div>

          {awcLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : awcError ? (
            <Alert variant="danger">{awcError}</Alert>
          ) : awcList.length === 0 ? (
            <div className="text-center py-4 text-muted">
              No AWC data available.
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District Name</th>
                    <th>District Code</th>
                    <th>Project</th>
                    <th>Sector</th>
                    <th>AWC Code</th>
                    <th>AWC Name</th>
                    <th>AWC Type</th>
                    <th>Code1</th>
                  </tr>
                </thead>
                <tbody>
                  {awcList.map((awc, index) => (
                    <tr key={`${awc.awc_code}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{cellValue(awc.district_name)}</td>
                      <td>{cellValue(awc.district_code)}</td>
                      <td>{cellValue(awc.project)}</td>
                      <td>{cellValue(awc.sector)}</td>
                      <td>{cellValue(awc.awc_code)}</td>
                      <td>{cellValue(awc.awc_name)}</td>
                      <td>{cellValue(awc.awc_type)}</td>
                      <td>{cellValue(awc.code1)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AwcAganWadi;
