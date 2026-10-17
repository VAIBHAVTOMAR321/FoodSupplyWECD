import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import {
  Container,
  Table,
  Spinner,
  Alert,
  Tabs,
  Tab,
  Badge,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import "../../assets/css/DirectorFoodItems.css";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const FOOD_ITEMS_API =
  "https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/categoryandfooditem/";

const FOOD_COLUMNS = [
  { key: "serial", label: "Serial No." },
  { key: "category", label: "Category" },
  { key: "food_item", label: "Food Item" },
  { key: "beneficiary_category", label: "Beneficiary Category" },
];

const normalizeFoodData = (foodData) =>
  foodData
    .filter((item) =>
      ["THR", "HCM"].includes(String(item?.category || "").trim().toUpperCase()),
    )
    .map((item, index) => ({
      id: `${String(item.category || "").trim().toUpperCase()}-${index}`,
      category: String(item.category || "").trim().toUpperCase(),
      food_item: String(item.food_item || "").trim(),
      beneficiary_category: String(item.beneficiary_category || "").trim(),
    }));

const DirectorFoodItems = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024,
  );
  const { api } = useAuth();
  const { t } = useLanguage();

  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const localizedFoodColumns = FOOD_COLUMNS.map((column) => ({
    ...column,
    label: t(column.label, ({
      "Serial No.": "क्रम संख्या",
      Category: "श्रेणी",
      "Food Item": "खाद्य सामग्री",
      "Beneficiary Category": "लाभार्थी श्रेणी",
    })[column.label]),
  }));

  const fetchFoodItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(FOOD_ITEMS_API, {
        headers: { Accept: "application/json" },
      });
      const result = response?.data;

      if (result?.success !== true || !Array.isArray(result?.food_data)) {
        console.error("Unexpected categoryandfooditem API response:", result);
        throw new Error(t(
          "The API response did not include success=true and a food_data array.",
          "एपीआई प्रतिक्रिया में success=true और food_data array शामिल नहीं है।",
        ));
      }

      const normalizedItems = normalizeFoodData(result.food_data);
      setFoodItems(normalizedItems);
      if (normalizedItems.length === 0) {
        console.warn(
          "categoryandfooditem API succeeded but returned no THR/HCM items.",
          result.food_data,
        );
      }
    } catch (err) {
      console.error("Failed to fetch category and food items:", {
        status: err?.response?.status,
        response: err?.response?.data,
        message: err?.message,
      });
      setFoodItems([]);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError(t(`API access denied (HTTP ${status}). Please check login/token permissions.`, `एपीआई पहुँच अस्वीकृत (HTTP ${status})। कृपया लॉगिन/टोकन अनुमतियाँ जाँचें।`));
      } else if (status) {
        setError(t(`Food items could not be loaded (HTTP ${status}). Check the Console for the API response.`, `खाद्य सामग्री प्राप्त नहीं हो सकी (HTTP ${status})। एपीआई प्रतिक्रिया के लिए कंसोल देखें।`));
      } else if (err?.message?.toLowerCase().includes("network")) {
        setError(t(
          "Could not connect to the API. If the Console shows a CORS error, the backend must allow the frontend domain.",
          "एपीआई से कनेक्ट नहीं हो सका। यदि कंसोल में CORS त्रुटि दिखती है, तो बैकएंड में फ़्रंटएंड डोमेन को अनुमति दें।",
        ));
      } else {
        setError(err?.message || t("Food items could not be loaded. Check the API connection and try again.", "खाद्य सामग्री प्राप्त नहीं हो सकी। एपीआई कनेक्शन जाँचें और पुनः प्रयास करें।"));
      }
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  useEffect(() => {
    fetchFoodItems();
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fetchFoodItems]);

  const toggleSidebar = () => setSidebarOpen((previous) => !previous);

  const groupedItems = useMemo(
    () => ({
      HCM: foodItems.filter((item) => item.category === "HCM"),
      THR: foodItems.filter((item) => item.category === "THR"),
    }),
    [foodItems],
  );

  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();

    ["HCM", "THR"].forEach((category) => {
      const rows = groupedItems[category].map((item, index) => ({
        [localizedFoodColumns[0].label]: index + 1,
        [localizedFoodColumns[1].label]: category,
        [localizedFoodColumns[2].label]: item.food_item || "—",
        [localizedFoodColumns[3].label]: item.beneficiary_category || "—",
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows, {
        header: localizedFoodColumns.map((column) => column.label),
      });
      worksheet["!cols"] = [
        { wch: 14 },
        { wch: 12 },
        { wch: 42 },
        { wch: 38 },
      ];
      if (rows.length) {
        worksheet["!autofilter"] = {
          ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: rows.length, c: FOOD_COLUMNS.length - 1 },
          }),
        };
      }
      worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(workbook, worksheet, category);
    });

    XLSX.writeFile(workbook, "Director_HCM_THR_Food_Items.xlsx", {
      compression: true,
    });
  }, [groupedItems, localizedFoodColumns]);

  const exportToPDF = useCallback(async () => {
    if (!foodItems.length || exportingPdf) return;
    setExportingPdf(true);

    // jsPDF standard fonts cannot render Devanagari. Use a browser-rendered table
    // with a real Devanagari webfont, then compress the page images into the PDF.
    const fontId = "director-fooditems-noto-devanagari";
    let fontLink = document.getElementById(fontId);
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = fontId;
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap";
      document.head.appendChild(fontLink);
    }

    const root = document.createElement("div");
    root.style.cssText = [
      "position:fixed",
      "left:-30000px",
      "top:0",
      "width:1100px",
      "padding:32px",
      "box-sizing:border-box",
      "background:#ffffff",
      "color:#172033",
      'font-family:"Noto Sans Devanagari","Nirmala UI","Mangal",sans-serif',
    ].join(";");

    const addSection = (category, items) => {
      const heading = document.createElement("h2");
      heading.textContent = t(
        category === "HCM" ? "HCM Food Items" : "THR Food Items",
        category === "HCM" ? "एचसीएम खाद्य सामग्री" : "टीएचआर खाद्य सामग्री",
      );
      heading.style.cssText =
        "font-size:20px;margin:0 0 10px;font-weight:700;line-height:1.5;";
      root.appendChild(heading);

      const table = document.createElement("table");
      table.style.cssText =
        "width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;margin-bottom:28px;";
      const colgroup = document.createElement("colgroup");
      ["9%", "12%", "39%", "40%"].forEach((width) => {
        const col = document.createElement("col");
        col.style.width = width;
        colgroup.appendChild(col);
      });
      table.appendChild(colgroup);

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      localizedFoodColumns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column.label;
        th.style.cssText =
          "background:#3546c8;color:#fff;border:1px solid #cbd5e1;padding:9px 8px;text-align:left;font-weight:700;line-height:1.4;white-space:normal;";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      items.forEach((item, index) => {
        const tr = document.createElement("tr");
        const values = [
          index + 1,
          category,
          item.food_item || "—",
          item.beneficiary_category || "—",
        ];
        values.forEach((value, colIndex) => {
          const td = document.createElement("td");
          td.textContent = String(value);
          td.style.cssText =
            "border:1px solid #cbd5e1;padding:8px;vertical-align:top;white-space:normal;overflow-wrap:break-word;line-height:1.5;" +
            (colIndex === 0 ? "text-align:center;white-space:nowrap;" : "");
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      if (!items.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = FOOD_COLUMNS.length;
        td.textContent = t("No food items available.", "कोई खाद्य सामग्री उपलब्ध नहीं है।");
        td.style.cssText = "border:1px solid #cbd5e1;padding:10px;";
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      root.appendChild(table);
    };

    addSection("HCM", groupedItems.HCM);
    addSection("THR", groupedItems.THR);
    document.body.appendChild(root);

    try {
      await new Promise((resolve) => {
        if (document.fonts?.check('14px "Noto Sans Devanagari"')) return resolve();
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        fontLink.addEventListener("load", finish, { once: true });
        fontLink.addEventListener("error", finish, { once: true });
        window.setTimeout(finish, 3500);
      });
      try {
        await document.fonts?.load('14px "Noto Sans Devanagari"');
        await document.fonts?.ready;
      } catch (fontError) {
        console.warn("Hindi font load failed; using installed fallback font.", fontError);
      }

      const canvas = await (await import("html2canvas")).default(root, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const pagePixelHeight = Math.floor((usableHeight / imageWidth) * canvas.width);
      const sliceCanvas = document.createElement("canvas");
      const context = sliceCanvas.getContext("2d");
      let offsetY = 0;
      let pageIndex = 0;

      while (offsetY < canvas.height) {
        let endY = Math.min(offsetY + pagePixelHeight, canvas.height);
        if (endY < canvas.height) {
          // Prefer a table row boundary to avoid cutting through a row.
          const rows = Array.from(root.querySelectorAll("tbody tr"));
          const rootRect = root.getBoundingClientRect();
          const scale = canvas.width / root.offsetWidth;
          const boundaries = rows
            .map((row) => Math.round((row.getBoundingClientRect().bottom - rootRect.top) * scale))
            .filter((boundary) => boundary > offsetY && boundary <= endY);
          if (boundaries.length) endY = boundaries[boundaries.length - 1];
        }
        if (endY <= offsetY) endY = Math.min(offsetY + pagePixelHeight, canvas.height);

        sliceCanvas.width = canvas.width;
        sliceCanvas.height = endY - offsetY;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        context.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceCanvas.height,
          0,
          0,
          sliceCanvas.width,
          sliceCanvas.height,
        );
        if (pageIndex > 0) pdf.addPage();
        const image = sliceCanvas.toDataURL("image/jpeg", 0.78);
        const imageHeight = (sliceCanvas.height * imageWidth) / sliceCanvas.width;
        pdf.addImage(
          image,
          "JPEG",
          margin,
          margin,
          imageWidth,
          Math.min(imageHeight, usableHeight),
          undefined,
          "FAST",
        );
        offsetY = endY;
        pageIndex += 1;
      }

      pdf.save("Director_HCM_THR_Food_Items.pdf");
    } catch (err) {
      console.error("Failed to export food items PDF:", err);
      window.alert(t("PDF export failed. Please try again.", "पीडीएफ निर्यात विफल हुआ। कृपया पुनः प्रयास करें।"));
    } finally {
      root.remove();
      setExportingPdf(false);
    }
  }, [foodItems, groupedItems, exportingPdf, localizedFoodColumns, t]);

  const renderFoodItems = (category) => {
    const items = groupedItems[category];

    if (loading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status" />
          <div className="mt-2">{t("Loading food items...", "खाद्य सामग्री लोड हो रही है...")}</div>
        </div>
      );
    }
    if (error) {
      return (
        <Alert variant="danger" className="mt-3">
          <div>{error}</div>
          <button
            className="btn btn-sm btn-outline-danger mt-2"
            onClick={fetchFoodItems}
          >
            {t("Try Again", "पुनः प्रयास करें")}
          </button>
        </Alert>
      );
    }
    if (items.length === 0) {
      return (
        <div className="empty-state mt-3">
          {t(`No ${category} food items available.`, `कोई ${category} खाद्य सामग्री उपलब्ध नहीं है।`)}
        </div>
      );
    }

    return (
      <div className="food-items-table-container mt-3">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h5 className="mb-0">{t(`${category} Food Items Details`, `${category} खाद्य सामग्री विवरण`)}</h5>
          <Badge bg={category === "THR" ? "primary" : "success"}>
            {t("Total Items", "कुल सामग्री")}: {items.length}
          </Badge>
        </div>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th style={{ width: "75px" }}>{t("Serial No.", "क्रम संख्या")}</th>
              <th>{t("Food Item", "खाद्य सामग्री")}</th>
              <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.category}-${item.food_item}-${index}`}>
                <td>{index + 1}</td>
                <td>{item.food_item}</td>
                <td>{item.beneficiary_category}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
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
        <div className="food-items-container">
          <Container fluid className="dashboard-box food-items-content">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
              <h3 className="page-title-heading mb-0">{t("THR & HCM Food Items", "टीएचआर एवं एचसीएम खाद्य सामग्री")}</h3>
              <div className="d-flex gap-2 flex-wrap">
                <Button
                  variant="outline-danger"
                  onClick={exportToPDF}
                  disabled={loading || !foodItems.length || exportingPdf}
                >
                  <FaFilePdf className="me-2" />
                  {exportingPdf ? t("Preparing PDF…", "पीडीएफ तैयार हो रही है…") : "PDF"}
                </Button>
                <Button
                  variant="outline-success"
                  onClick={exportToExcel}
                  disabled={loading || !foodItems.length}
                >
                  <FaFileExcel className="me-2" />
                  Excel
                </Button>
                <Button
                  variant="outline-primary"
                  onClick={fetchFoodItems}
                  disabled={loading}
                >
                  {loading ? t("Loading...", "लोड हो रहा है...") : t("Refresh Data", "डेटा रीफ़्रेश करें")}
                </Button>
              </div>
            </div>
            <Tabs
              defaultActiveKey="HCM"
              id="food-items-tabs"
              className="mb-4 food-items-tabs"
            >
              <Tab eventKey="HCM" title={t("HCM Food Items", "एचसीएम खाद्य सामग्री")}>
                {renderFoodItems("HCM")}
              </Tab>
              <Tab eventKey="THR" title={t("THR Food Items", "टीएचआर खाद्य सामग्री")}>
                {renderFoodItems("THR")}
              </Tab>
            </Tabs>
          </Container>
        </div>
      </div>
    </div>
  );
};

export default DirectorFoodItems;
