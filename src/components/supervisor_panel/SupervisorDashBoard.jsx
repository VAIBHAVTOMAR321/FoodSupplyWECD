import React, { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/dpo.css";

import "../../assets/css/supervisorleftnav.css";

import SupervisorHeader from "./SupervisorHeader";

import SupervisorLeftNav from "./SupervisorLeftNav";

import {
  FaBox,
  FaBoxes,
  FaChartBar,
  FaFileAlt,
  FaFilePdf,
  FaFileExcel,
  FaSyncAlt,
  FaTruckLoading,
  FaUserFriends,
  FaUsers,
  FaUtensils,
  FaWarehouse,
} from "react-icons/fa";

const getArrayPayload = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const formatCount = (value) => (Number(value) || 0).toLocaleString();

const getTotal = (items, key) =>
  (Array.isArray(items) ? items : []).reduce(
    (total, item) => total + (Number(item?.[key]) || 0),
    0,
  );


const ExportActions = ({ onPdf, onExcel }) => (
  <ButtonGroup size="sm" aria-label="Export table">
    <Button variant="outline-danger" onClick={onPdf} title="Export this table to PDF">
      <FaFilePdf className="me-1" /> PDF
    </Button>
    <Button variant="outline-success" onClick={onExcel} title="Export this table to Excel">
      <FaFileExcel className="me-1" /> Excel
    </Button>
  </ButtonGroup>
);

const ensureHindiFont = async () => {
  // Load an actual Devanagari webfont; jsPDF's built-in fonts do not contain Hindi glyphs.
  const fontId = "supervisor-dashboard-noto-devanagari";
  let link = document.getElementById(fontId);
  if (!link) {
    link = document.createElement("link");
    link.id = fontId;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }

  await new Promise((resolve) => {
    if (document.fonts?.check('16px "Noto Sans Devanagari"')) return resolve();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
    // Do not block exports indefinitely if the network/font service is unavailable.
    window.setTimeout(finish, 4000);
  });

  if (document.fonts?.load) {
    try {
      await document.fonts.load('16px "Noto Sans Devanagari"');
      await document.fonts.ready;
    } catch (error) {
      console.warn("Hindi font could not be loaded; using available system fonts.", error);
    }
  }
};

const getRowSafePdfSlices = (root, canvas, maxSliceHeight) => {
  // Convert DOM row boundaries to canvas pixels so a PDF page break is placed
  // between rows whenever possible instead of cutting through a row.
  const rootRect = root.getBoundingClientRect();
  const scaleY = canvas.height / Math.max(rootRect.height, 1);
  const rowBottoms = [...root.querySelectorAll("tr")]
    .map((row) => Math.round((row.getBoundingClientRect().bottom - rootRect.top) * scaleY))
    .filter((bottom) => bottom > 0 && bottom < canvas.height)
    .sort((a, b) => a - b);

  const slices = [];
  let start = 0;
  while (start < canvas.height) {
    const limit = Math.min(start + maxSliceHeight, canvas.height);
    let end = limit;
    if (limit < canvas.height) {
      const safeBoundary = rowBottoms.filter((bottom) => bottom > start + 20 && bottom <= limit - 12).pop();
      if (safeBoundary) end = safeBoundary;
    }
    if (end <= start) end = limit;
    slices.push({ start, end });
    start = end;
  }
  return slices;
};

const exportRowsToPDF = async (title, headers, rows, filename) => {
  const exportRoot = document.createElement("div");
  exportRoot.style.cssText = [
    "position:fixed", "left:-20000px", "top:0", "z-index:-1",
    "width:1400px", "padding:28px", "box-sizing:border-box",
    "background:#ffffff", "color:#172033",
    'font-family:"Noto Sans Devanagari","Nirmala UI","Mangal",sans-serif'
  ].join(";");

  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.cssText = "font-size:22px;margin:0 0 16px;font-weight:700;";
  exportRoot.appendChild(heading);

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;table-layout:auto;font-size:12px;";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cssText = `background:#1f4e79;color:#fff;border:1px solid #cbd5e1;padding:5px;text-align:left;font-weight:700;white-space:${header === "#" ? "nowrap" : "normal"};${header === "#" ? "width:34px;min-width:34px;max-width:34px;" : ""}`;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const exportRows = rows.length
    ? rows
    : [Object.fromEntries(headers.map((header, index) => [header, index === 0 ? "No records found" : ""]))];

  exportRows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      const value = row[header];
      td.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
      td.style.cssText = `border:1px solid #cbd5e1;padding:4px;white-space:${header === "#" ? "nowrap" : "normal"};overflow-wrap:${header === "#" ? "normal" : "anywhere"};vertical-align:top;${header === "#" ? "width:34px;min-width:34px;max-width:34px;text-align:center;" : ""}`;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  exportRoot.appendChild(table);
  document.body.appendChild(exportRoot);

  try {
    await ensureHindiFont();
    const canvas = await html2canvas(exportRoot, {
      scale: 1.0,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: Math.max(document.documentElement.clientWidth, 1440),
    });
    const pdf = new jsPDF({
      orientation: headers.length > 6 ? "landscape" : "portrait",
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
    const pageContentHeight = pageHeight - marginTop - marginBottom;
    const maxSliceHeight = Math.floor(canvas.width * pageContentHeight / imageWidth);
    const pageCanvas = document.createElement("canvas");
    const ctx = pageCanvas.getContext("2d");
    pageCanvas.width = canvas.width;
    const slices = getRowSafePdfSlices(exportRoot, canvas, maxSliceHeight);

    slices.forEach(({ start, end }, pageIndex) => {
      const sliceHeight = end - start;
      pageCanvas.height = sliceHeight;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (pageIndex > 0) pdf.addPage();
      const imageData = pageCanvas.toDataURL("image/jpeg", 0.48);
      const renderedHeight = sliceHeight * imageWidth / canvas.width;
      pdf.addImage(imageData, "JPEG", marginX, marginTop, imageWidth, Math.min(renderedHeight, pageContentHeight), undefined, "FAST");
    });
    pdf.save(filename);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    window.alert("Could not generate the PDF. Please try again.");
  } finally {
    exportRoot.remove();
  }
};

const exportRowsToExcel = (title, headers, rows, filename) => {
  const data = rows.length
    ? rows.map(row => Object.fromEntries(headers.map(header => [header, row[header] ?? ""])))
    : [Object.fromEntries(headers.map(header => [header, ""]))];
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  worksheet["!cols"] = headers.map(header => ({
    wch: Math.min(34, Math.max(header.length + 2, ...data.map(row => String(row[header] ?? "").length + 2))),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31));
  XLSX.writeFile(workbook, filename, { compression: true });
};

const DistributionSummaryTable = ({ items, loading }) => (
  <div className="dpo-table-wrapper">
    <Table hover className="dpo-data-table mb-0">
      <thead>
        <tr>
          <th>#</th>

          <th className="text-end">Total Beneficiaries</th>

          <th className="text-end">Total Quantity</th>

          <th>Unit</th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={4} className="text-center p-4">
              <Spinner animation="border" size="sm" />
            </td>
          </tr>
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center p-4 text-muted">
              No distribution records found.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={`${item.unit || "unit"}-${index}`}>
              <td>{index + 1}</td>

              <td className="text-end">
                {formatCount(item.total_beneficiaries)}
              </td>

              <td className="text-end">{formatCount(item.total_quantity)}</td>

              <td>{item.unit || "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  </div>
);

const ReceivingSummaryTable = ({ items, loading }) => (
  <div className="dpo-table-wrapper">
    <Table hover className="dpo-data-table mb-0">
      <thead>
        <tr>
          <th>#</th>

          <th className="text-end">Quantity Received</th>

          <th>Unit</th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <tr>
            <td colSpan={3} className="text-center p-4">
              <Spinner animation="border" size="sm" />
            </td>
          </tr>
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-center p-4 text-muted">
              No receiving records found.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={`${item.unit || "unit"}-${index}`}>
              <td>{index + 1}</td>

              <td className="text-end">{formatCount(item.total_quantity)}</td>

              <td>{item.unit || "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  </div>
);

const SupervisorDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [isMobile, setIsMobile] = useState(false);

  const [isTablet, setIsTablet] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [hcmSummary, setHcmSummary] = useState(null);

  const [thrSummary, setThrSummary] = useState(null);

  const [hcmFoodItems, setHcmFoodItems] = useState([]);

  const [thrFoodItems, setThrFoodItems] = useState([]);

  const [awcCount, setAwcCount] = useState(0);

  const [foodItemsTab, setFoodItemsTab] = useState("hcm");
  const [hcmReconciliation, setHcmReconciliation] = useState([]);
  const [thrReconciliation, setThrReconciliation] = useState([]);
  const [reconciliationTab, setReconciliationTab] = useState("hcm");

  const navigate = useNavigate();

  const { api } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);

      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!api) return;

    setLoading(true);

    setError("");

    const requests = await Promise.allSettled([
      api.get("/supervisor/dashboard-hcm/"),

      api.get("/supervisor/dashboard-thr/"),

      api.get("/categoryandfooditem/"),

      api.get("/sector-awc-dropdown/"),

      api.get("/supervisor-hcm-awc-reconciliation/"),

      api.get("/supervisor-thr-awc-reconciliation/"),
    ]);

    const [hcm, thr, foodResponse, awcs, hcmReconciliation, thrReconciliation] =
      requests;

    let failed = false;

    if (hcm.status === "fulfilled") setHcmSummary(hcm.value.data);
    else {
      failed = true;

      console.error("Failed to fetch HCM dashboard summary:", hcm.reason);
    }

    if (thr.status === "fulfilled") setThrSummary(thr.value.data);
    else {
      failed = true;

      console.error("Failed to fetch THR dashboard summary:", thr.reason);
    }

    if (foodResponse.status === "fulfilled") {
      const foodData = Array.isArray(foodResponse.value.data?.food_data)
        ? foodResponse.value.data.food_data
        : [];
      setHcmFoodItems(foodData.filter((item) => item.category === "HCM"));
      setThrFoodItems(foodData.filter((item) => item.category === "THR"));
    } else {
      failed = true;
      console.error("Failed to fetch food items:", foodResponse.reason);
      setHcmFoodItems([]);
      setThrFoodItems([]);
    }

    const normalizeReconciliation = (result, label) => {
      if (result.status !== "fulfilled") {
        failed = true;
        console.error(
          `Failed to fetch ${label} reconciliation:`,
          result.reason,
        );
        return [];
      }
      const payload = result.value.data;
      return payload?.success && Array.isArray(payload.data)
        ? payload.data
        : [];
    };
    setHcmReconciliation(normalizeReconciliation(hcmReconciliation, "HCM"));
    setThrReconciliation(normalizeReconciliation(thrReconciliation, "THR"));

    if (awcs.status === "fulfilled") {
      const data = awcs.value.data;

      setAwcCount(
        Number(data?.count) ||
          (Array.isArray(data?.data) ? data.data.length : 0),
      );
    } else {
      failed = true;

      console.error("Failed to fetch AWC count:", awcs.reason);
    }

    if (failed)
      setError(
        "Some dashboard information could not be loaded. Please refresh and try again.",
      );

    setLoading(false);
  }, [api]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const hcmDistributions = Array.isArray(hcmSummary?.distribution_summary)
    ? hcmSummary.distribution_summary
    : [];

  const thrDistributions = Array.isArray(thrSummary?.distribution_summary)
    ? thrSummary.distribution_summary
    : [];

  const hcmReceipts = Array.isArray(hcmSummary?.receiving_summary)
    ? hcmSummary.receiving_summary
    : [];

  const thrReceipts = Array.isArray(thrSummary?.receiving_summary)
    ? thrSummary.receiving_summary
    : [];

  const foodItems = foodItemsTab === "hcm" ? hcmFoodItems : thrFoodItems;

  const stats = [
    {
      label: "HCM Beneficiaries",
      value: getTotal(hcmDistributions, "total_beneficiaries"),
      icon: <FaUserFriends />,
    },

    {
      label: "THR Beneficiaries",
      value: getTotal(thrDistributions, "total_beneficiaries"),
      icon: <FaUserFriends />,
    },

    {
      label: "HCM Distribution Records",
      value: hcmDistributions.length,
      icon: <FaChartBar />,
    },

    {
      label: "THR Distribution Records",
      value: thrDistributions.length,
      icon: <FaChartBar />,
    },

    {
      label: "HCM Received Records",
      value: hcmReceipts.length,
      icon: <FaTruckLoading />,
    },

    {
      label: "THR Received Records",
      value: thrReceipts.length,
      icon: <FaTruckLoading />,
    },
  ];


  const makeDistributionRows = (items) => items.map((item, index) => ({
    "#": index + 1,
    "Total Beneficiaries": Number(item.total_beneficiaries) || 0,
    "Total Quantity": Number(item.total_quantity) || 0,
    Unit: item.unit || "—",
  }));
  const makeReceivingRows = (items) => items.map((item, index) => ({
    "#": index + 1,
    "Quantity Received": Number(item.total_quantity) || 0,
    Unit: item.unit || "—",
  }));
  const makeReconciliationRows = (items, scheme) => items.map((row, index) => {
    const formatQty = (value) => {
      const n = Number(value) || 0;
      return scheme === "hcm"
        ? `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} g (${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg)`
        : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} packets`;
    };
    return {
      "#": index + 1,
      "AWC Name": row.awc_name || "—",
      "AWC Code": row.awc_code || "—",
      Sector: row.sector || "—",
      Trimester: row.month || "—",
      "Financial Year": row.financial_year || "—",
      "Food Item": row.food_item || "—",
      "Beneficiary Category": row.bene_category || "—",
      Received: formatQty(row.received_quantity),
      Distributed: formatQty(row.distributed_quantity),
      Remaining: formatQty(row.balance_quantity),
    };
  });
  const makeFoodRows = (items) => items.map((item, index) => ({
    "#": index + 1,
    "Food Item": item.food_item || "—",
    "Beneficiary Category": item.beneficiary_category || item.bene_category || "—",
  }));
  const exportDistribution = (scheme, items, type) => {
    const headers = ["#", "Total Beneficiaries", "Total Quantity", "Unit"];
    const rows = makeDistributionRows(items);
    const title = `${scheme} Distribution Summary`;
    const base = `${scheme.toLowerCase()}_distribution_summary`;
    type === "pdf" ? exportRowsToPDF(title, headers, rows, `${base}.pdf`) : exportRowsToExcel(title, headers, rows, `${base}.xlsx`);
  };
  const exportReceiving = (scheme, items, type) => {
    const headers = ["#", "Quantity Received", "Unit"];
    const rows = makeReceivingRows(items);
    const title = `${scheme} Received Summary`;
    const base = `${scheme.toLowerCase()}_received_summary`;
    type === "pdf" ? exportRowsToPDF(title, headers, rows, `${base}.pdf`) : exportRowsToExcel(title, headers, rows, `${base}.xlsx`);
  };
  const activeReconciliation = reconciliationTab === "hcm" ? hcmReconciliation : thrReconciliation;
  const exportReconciliation = (type) => {
    const headers = ["#", "AWC Name", "AWC Code", "Sector", "Trimester", "Financial Year", "Food Item", "Beneficiary Category", "Received", "Distributed", "Remaining"];
    const rows = makeReconciliationRows(activeReconciliation, reconciliationTab);
    const title = `${reconciliationTab.toUpperCase()} Supplies Reconciliation`;
    const base = `${reconciliationTab}_supplies_reconciliation`;
    type === "pdf" ? exportRowsToPDF(title, headers, rows, `${base}.pdf`) : exportRowsToExcel(title, headers, rows, `${base}.xlsx`);
  };
  const exportFoodItems = (type) => {
    const headers = ["#", "Food Item", "Beneficiary Category"];
    const rows = makeFoodRows(foodItems);
    const title = `${foodItemsTab.toUpperCase()} Food Items`;
    const base = `${foodItemsTab}_food_items`;
    type === "pdf" ? exportRowsToPDF(title, headers, rows, `${base}.pdf`) : exportRowsToExcel(title, headers, rows, `${base}.xlsx`);
  };

  // Export all four HCM/THR distribution and receiving summaries into one file.
  const exportAllDistributionReceiving = (type) => {
    const sections = [
      { title: "HCM Distribution Summary", headers: ["#", "Total Beneficiaries", "Total Quantity", "Unit"], rows: makeDistributionRows(hcmDistributions) },
      { title: "HCM Received Summary", headers: ["#", "Quantity Received", "Unit"], rows: makeReceivingRows(hcmReceipts) },
      { title: "THR Distribution Summary", headers: ["#", "Total Beneficiaries", "Total Quantity", "Unit"], rows: makeDistributionRows(thrDistributions) },
      { title: "THR Received Summary", headers: ["#", "Quantity Received", "Unit"], rows: makeReceivingRows(thrReceipts) },
    ];

    if (type === "pdf") {
      // Render through the browser so Devanagari/Hindi uses a real system font;
      // jsPDF's built-in fonts do not support Hindi glyphs and show garbled text.
      const exportRoot = document.createElement("div");
      exportRoot.style.cssText = "position:fixed;left:-10000px;top:0;width:1100px;background:#fff;color:#172033;padding:28px;font-family:'Noto Sans Devanagari','Nirmala UI','Mangal',Arial,sans-serif;box-sizing:border-box;";
      sections.forEach((section) => {
        const sectionEl = document.createElement("section");
        sectionEl.style.cssText = "width:100%;margin:0 0 22px 0;page-break-inside:avoid;";
        const heading = document.createElement("h2");
        heading.textContent = section.title;
        heading.style.cssText = "font-size:20px;margin:0 0 12px;padding:0 0 8px;border-bottom:2px solid #5967d6;font-weight:700;";
        sectionEl.appendChild(heading);
        const table = document.createElement("table");
        table.style.cssText = "width:100%;border-collapse:collapse;table-layout:auto;font-size:12px;";
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        section.headers.forEach((header) => {
          const th = document.createElement("th");
          th.textContent = header;
          th.style.cssText = `background:#5967d6;color:#fff;border:1px solid #d5d9e8;padding:5px;text-align:left;font-weight:700;white-space:${header === "#" ? "nowrap" : "normal"};${header === "#" ? "width:34px;min-width:34px;max-width:34px;" : ""}`;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        const exportRows = section.rows.length ? section.rows : [Object.fromEntries(section.headers.map((h, i) => [h, i === 0 ? "No records found" : ""]))];
        exportRows.forEach((row) => {
          const tr = document.createElement("tr");
          section.headers.forEach((header) => {
            const td = document.createElement("td");
            const value = row[header];
            td.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
            td.style.cssText = `border:1px solid #d5d9e8;padding:4px;overflow-wrap:${header === "#" ? "normal" : "anywhere"};white-space:${header === "#" ? "nowrap" : "normal"};${header === "#" ? "width:34px;min-width:34px;max-width:34px;text-align:center;" : ""}`;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        sectionEl.appendChild(table);
        exportRoot.appendChild(sectionEl);
      });
      document.body.appendChild(exportRoot);
      // Wait for available system fonts before rasterizing the HTML table.
      const renderPdf = async () => {
        if (document.fonts?.ready) await document.fonts.ready;
        return html2canvas(exportRoot, { scale: 1.0, useCORS: true, backgroundColor: "#ffffff", logging: false });
      };
      renderPdf().then((canvas) => {
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginX = 8;
        const marginTop = 12;
        const marginBottom = 12;
        const imageWidth = pageWidth - marginX * 2;
        const pageContentHeight = pageHeight - marginTop - marginBottom;
        const maxSliceHeight = Math.floor(canvas.width * pageContentHeight / imageWidth);
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");
        pageCanvas.width = canvas.width;
        const slices = getRowSafePdfSlices(exportRoot, canvas, maxSliceHeight);
        slices.forEach(({ start, end }, pageIndex) => {
          const sliceHeight = end - start;
          pageCanvas.height = sliceHeight;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(canvas, 0, start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          if (pageIndex > 0) pdf.addPage();
          const imageData = pageCanvas.toDataURL("image/jpeg", 0.48);
          const renderedHeight = sliceHeight * imageWidth / canvas.width;
          pdf.addImage(imageData, "JPEG", marginX, marginTop, imageWidth, Math.min(renderedHeight, pageContentHeight), undefined, "FAST");
        });
        pdf.save("hcm_thr_distribution_receiving_summary.pdf");
      }).catch((err) => {
        console.error("Failed to generate combined summary PDF:", err);
        window.alert("Could not generate the PDF. Please try again.");
      }).finally(() => {
        exportRoot.remove();
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    sections.forEach(section => {
      const data = section.rows.length
        ? section.rows.map(row => Object.fromEntries(section.headers.map(header => [header, row[header] ?? ""])))
        : [Object.fromEntries(section.headers.map(header => [header, "No records found"]))];
      const worksheet = XLSX.utils.json_to_sheet(data, { header: section.headers });
      worksheet["!cols"] = section.headers.map(header => ({
        wch: Math.min(34, Math.max(header.length + 2, ...data.map(row => String(row[header] ?? "").length + 2))),
      }));
      XLSX.utils.book_append_sheet(workbook, worksheet, section.title.slice(0, 31));
    });
    XLSX.writeFile(workbook, "hcm_thr_distribution_receiving_summary.xlsx", { compression: true });
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
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="dashboard-header-section">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Supervisor Dashboard
              </h4>

              <p className="dashboard-subtitle">
                Overview of HCM and THR distribution, receiving, food items, and
                assigned AWCs.
              </p>
            </div>

            <Button
              className="dpo-btn-light"
              onClick={fetchAllData}
              disabled={loading}
            >
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          <Row className="g-3 mb-3">
            <Col xs={12} md={4}>
              <Card className="dpo-table-card h-100 mb-0">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{
                      width: 42,
                      height: 42,
                      background: "rgba(255, 193, 7, 0.12)",
                      color: "#b58100",
                    }}
                  >
                    <FaBox />
                  </div>

                  <div>
                    <div className="small text-uppercase text-muted fw-bold">
                      HCM Food Items
                    </div>

                    <div className="fs-4 fw-bold">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        formatCount(hcmFoodItems.length)
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={4}>
              <Card className="dpo-table-card h-100 mb-0">
                <Card.Body className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{
                      width: 42,
                      height: 42,
                      background: "rgba(13, 202, 240, 0.12)",
                      color: "#0786a0",
                    }}
                  >
                    <FaBox />
                  </div>

                  <div>
                    <div className="small text-uppercase text-muted fw-bold">
                      THR Food Items
                    </div>

                    <div className="fs-4 fw-bold">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        formatCount(thrFoodItems.length)
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={4}>
              <Card
                className="dpo-table-card h-100 mb-0"
                role="button"
                tabIndex={0}
                onClick={() => navigate("/AwcAganWadi")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    navigate("/AwcAganWadi");
                }}
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded"
                    style={{
                      width: 42,
                      height: 42,
                      background: "rgba(111, 66, 193, 0.12)",
                      color: "#6f42c1",
                    }}
                  >
                    <FaUsers />
                  </div>

                  <div>
                    <div className="small text-uppercase text-muted fw-bold">
                      Assigned AWCs
                    </div>

                    <div className="fs-4 fw-bold">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        formatCount(awcCount)
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <div className="dpo-stat-strip">
            {stats.map((stat) => (
              <div key={stat.label} className="dpo-stat-pill">
                <span className="dpo-stat-pill-icon">{stat.icon}</span>

                <span className="dpo-stat-pill-label">{stat.label}</span>

                <span className="dpo-stat-pill-value">
                  {loading ? "—" : formatCount(stat.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-end flex-wrap gap-2 mb-2">
            <Button
              variant="outline-danger"
              onClick={() => exportAllDistributionReceiving("pdf")}
              disabled={loading}
              title="Export all four HCM and THR summary tables to one PDF"
            >
              <FaFilePdf className="me-1" /> Export Summary PDF
            </Button>
            <Button
              variant="outline-success"
              onClick={() => exportAllDistributionReceiving("excel")}
              disabled={loading}
              title="Export all four HCM and THR summary tables to one Excel workbook"
            >
              <FaFileExcel className="me-1" /> Export Summary Excel
            </Button>
          </div>

          <Row className="g-3">
            {[
              {
                label: "HCM",

                summary: hcmSummary,

                distributions: hcmDistributions,

                receipts: hcmReceipts,

                distributionRoute: "/HcmSupervisorDistributions",

                receivingRoute: "/HcmSupervisorReceiving",
              },

              {
                label: "THR",

                summary: thrSummary,

                distributions: thrDistributions,

                receipts: thrReceipts,

                distributionRoute: "/thr-supervisor-distributions",

                receivingRoute: "/ThrSupervisorReceiving",
              },
            ].map((scheme) => (
              <Col key={scheme.label} xs={12} xl={6}>
                <Card className="dpo-table-card h-100">
                  <Card.Header className="dpo-table-header">
                    <h5 className="dpo-section-title">
                      <FaWarehouse /> {scheme.label} Distribution &amp;
                      Receiving
                    </h5>

                    <div className="d-flex gap-2 flex-wrap">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(scheme.distributionRoute)}
                      >
                        <FaFileAlt className="me-1" /> View distributions
                      </Button>

                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate(scheme.receivingRoute)}
                      >
                        <FaTruckLoading className="me-1" /> View receiving
                      </Button>
                    </div>
                  </Card.Header>

                  <Card.Body className="p-0">
                    <div className="px-3 pt-3 pb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <span className="fw-bold text-secondary small text-uppercase">Distribution Summary</span>
                    </div>

                    <DistributionSummaryTable
                      items={scheme.distributions}
                      loading={loading && !scheme.summary}
                    />

                    <div className="px-3 pt-3 pb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <span className="fw-bold text-secondary small text-uppercase">Received Summary</span>
                    </div>

                    <ReceivingSummaryTable
                      items={scheme.receipts}
                      loading={loading && !scheme.summary}
                    />
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="dpo-table-card mt-3">
            <Card.Header className="dpo-table-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Supplies Received, Distributed &amp; Remaining
              </h5>
              <ButtonGroup
                className="dpo-toggle-group"
                aria-label="Reconciliation scheme"
              >
                <Button
                  className={`dpo-toggle-btn ${reconciliationTab === "hcm" ? "active" : ""}`}
                  onClick={() => setReconciliationTab("hcm")}
                >
                  HCM ({formatCount(hcmReconciliation.length)})
                </Button>
                <Button
                  className={`dpo-toggle-btn ${reconciliationTab === "thr" ? "active" : ""}`}
                  onClick={() => setReconciliationTab("thr")}
                >
                  THR ({formatCount(thrReconciliation.length)})
                </Button>
              </ButtonGroup>
              <ExportActions
                onPdf={() => exportReconciliation("pdf")}
                onExcel={() => exportReconciliation("excel")}
              />
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? (
                  <div className="text-center p-4">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : (
                  (() => {
                    const rows =
                      reconciliationTab === "hcm"
                        ? hcmReconciliation
                        : thrReconciliation;
                    const fmtQty = (value) => {
                      const n = Number(value) || 0;
                      return reconciliationTab === "hcm"
                        ? `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} g (${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} kg)`
                        : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} packets`;
                    };
                    return rows.length === 0 ? (
                      <div className="text-center p-4 text-muted">
                        No {reconciliationTab.toUpperCase()} reconciliation
                        records found.
                      </div>
                    ) : (
                      <Table hover responsive className="dpo-data-table mb-0">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>AWC Name</th>
                            <th>AWC Code</th>
                            <th>Sector</th>
                            <th>Trimester</th>
                            <th>Financial Year</th>
                            <th>Food Item</th>
                            <th>Beneficiary Category</th>
                            <th className="text-end">Received</th>
                            <th className="text-end">Distributed</th>
                            <th className="text-end">Remaining</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => (
                            <tr
                              key={
                                row.id ??
                                `${row.awc_code}-${row.food_item}-${index}`
                              }
                            >
                              <td>{index + 1}</td>
                              <td>{row.awc_name || "—"}</td>
                              <td>{row.awc_code || "—"}</td>
                              <td>{row.sector || "—"}</td>
                              <td>{row.month || "—"}</td>
                              <td>{row.financial_year || "—"}</td>
                              <td>{row.food_item || "—"}</td>
                              <td>{row.bene_category || "—"}</td>
                              <td className="text-end">
                                {fmtQty(row.received_quantity)}
                              </td>
                              <td className="text-end">
                                {fmtQty(row.distributed_quantity)}
                              </td>
                              <td className="text-end">
                                {fmtQty(row.balance_quantity)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    );
                  })()
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="dpo-table-card mt-3">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaUtensils /> Food Items Overview
              </h5>

              <ButtonGroup
                className="dpo-toggle-group"
                aria-label="Food item scheme"
              >
                <Button
                  className={`dpo-toggle-btn ${foodItemsTab === "hcm" ? "active" : ""}`}
                  onClick={() => setFoodItemsTab("hcm")}
                >
                  HCM ({formatCount(hcmFoodItems.length)})
                </Button>

                <Button
                  className={`dpo-toggle-btn ${foodItemsTab === "thr" ? "active" : ""}`}
                  onClick={() => setFoodItemsTab("thr")}
                >
                  THR ({formatCount(thrFoodItems.length)})
                </Button>
              </ButtonGroup>
              <ExportActions
                onPdf={() => exportFoodItems("pdf")}
                onExcel={() => exportFoodItems("excel")}
              />
            </Card.Header>

            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? (
                  <div className="text-center p-5">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : foodItems.length === 0 ? (
                  <div className="text-center p-5 text-muted">
                    No {foodItemsTab.toUpperCase()} food items found.
                  </div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>#</th>

                        <th>Food Item</th>

                        <th>Beneficiary Category</th>
                      </tr>
                    </thead>

                    <tbody>
                      {foodItems.map((item, index) => (
                        <tr
                          key={
                            item.id ??
                            `${item.food_item || "food-item"}-${index}`
                          }
                        >
                          <td>{index + 1}</td>

                          <td>{item.food_item || "—"}</td>

                          <td>
                            {item.beneficiary_category ||
                              item.bene_category ||
                              "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default SupervisorDashBoard;
