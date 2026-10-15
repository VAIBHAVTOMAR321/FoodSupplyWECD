import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Spinner,
  Alert,
  Table,
  Tabs,
  Tab,
  Pagination,
  Button,
  ButtonGroup,
} from "react-bootstrap";
import { useLocation } from "react-router-dom";
import "../../assets/css/itcellLeftnav.css";
import { useAuth } from "../all_login/AuthContext";
import {
  FaUserShield,
  FaUserCog,
  FaUserTie,
  FaHome,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const TAB_CONFIG = {
  dpo: {
    title: "DPO List",
    endpoint: "/director/districts/",
    excluded: ["id", "role", "unique_id", "name"],
    filterDpo: true,
  },
  cdpo: {
    title: "CDPO List",
    endpoint: "/director/projects/",
    excluded: ["id", "unique_id", "name", "stat_fin", "ang_pur", "adhar_stat"],
  },
  supervisor: {
    title: "Supervisor List",
    endpoint: "/director/sectors/",
    excluded: ["id", "unique_id", "name", "sdname"],
  },
  anganwadi: {
    title: "Anganwadi List",
    endpoint: "/director/awc-list/",
    excluded: [
      "id", "unique_id", "name", "code1", "district_code",
      "updated_on", "bill_use", "db_use",
    ],
  },
};

const humanize = (key) =>
  String(key).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const cellValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => (
    item && typeof item === "object" ? JSON.stringify(item) : String(item)
  )).join(", ");
  if (typeof value === "object") return value.name ?? value.label ?? value.title ?? JSON.stringify(value);
  return String(value);
};

const DirectorAwcList = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState("dpo");
  const [roleCounts, setRoleCounts] = useState({});
  const [dpoData, setDpoData] = useState([]);
  const [cdpoData, setCdpoData] = useState([]);
  const [supervisorData, setSupervisorData] = useState([]);
  const [anganwadiData, setAnganwadiData] = useState([]);
  const [loading, setLoading] = useState({
    dpo: true, cdpo: true, supervisor: true, anganwadi: true,
  });
  const [loadingCounts, setLoadingCounts] = useState({
    dpo: true, cdpo: true, supervisor: true, anganwadi: true,
  });
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [exportingPdf, setExportingPdf] = useState(false);

  const queryTab = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") || "dpo";
    return TAB_CONFIG[tab] ? tab : "dpo";
  }, [location.search]);

  useEffect(() => {
    setActiveTab(queryTab);
    setCurrentPage(1);
  }, [queryTab]);

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

  const fetchDataForTab = useCallback(async (tab) => {
    const config = TAB_CONFIG[tab];
    if (!config) return;
    setLoading((prev) => ({ ...prev, [tab]: true }));
    setLoadingCounts((prev) => ({ ...prev, [tab]: true }));
    setError("");
    try {
      const response = await api.get(config.endpoint);
      let data = Array.isArray(response.data?.data) ? response.data.data : [];
      if (config.filterDpo) data = data.filter((user) => user.role === "dpo");
      if (tab === "dpo") setDpoData(data);
      if (tab === "cdpo") setCdpoData(data);
      if (tab === "supervisor") setSupervisorData(data);
      if (tab === "anganwadi") setAnganwadiData(data);
      setRoleCounts((prev) => ({ ...prev, [tab]: data.length }));
    } catch (err) {
      setError(`Failed to fetch ${config.title.toLowerCase()}.`);
      console.error(`Failed to fetch ${tab} data:`, err);
    } finally {
      setLoadingCounts((prev) => ({ ...prev, [tab]: false }));
      setLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [api]);

  useEffect(() => {
    if (api) {
      Object.keys(TAB_CONFIG).forEach((tab) => fetchDataForTab(tab));
    }
  }, [api, fetchDataForTab]);

  const toggleSidebar = () => setSidebarOpen((previous) => !previous);

  const dataByTab = {
    dpo: dpoData,
    cdpo: cdpoData,
    supervisor: supervisorData,
    anganwadi: anganwadiData,
  };

  const getExportRows = useCallback((tab) => {
    const data = dataByTab[tab] || [];
    const config = TAB_CONFIG[tab];
    if (!data.length) return { headers: [], rows: [] };
    // Match the visible table: keys are determined by the data objects and
    // excluded fields are not included in either export.
    const headers = Object.keys(data[0]).filter((key) => !config.excluded.includes(key));
    return {
      headers: ["#", ...headers.map(humanize)],
      rows: data.map((item, index) => [
        index + 1,
        ...headers.map((key) => cellValue(item[key])),
      ]),
    };
  }, [dpoData, cdpoData, supervisorData, anganwadiData]);

  const exportToExcel = useCallback(() => {
    const { headers, rows } = getExportRows(activeTab);
    if (!rows.length) return;
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = headers.map((header, columnIndex) => {
      const longest = Math.max(
        String(header).length,
        ...rows.map((row) => String(row[columnIndex] ?? "").length),
      );
      return { wch: Math.min(Math.max(longest + 2, 10), 34) };
    });
    worksheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length, c: headers.length - 1 },
      }),
    };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, TAB_CONFIG[activeTab].title.slice(0, 31));
    XLSX.writeFile(workbook, `Director_${activeTab}_list.xlsx`, { compression: true });
  }, [activeTab, getExportRows]);

  const exportToPDF = useCallback(() => {
    const { headers, rows } = getExportRows(activeTab);
    if (!rows.length || exportingPdf) return;
    setExportingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
        compress: true,
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(15);
      pdf.text(TAB_CONFIG[activeTab].title, 10, 12);
      pdf.setFontSize(9);
      pdf.text(`Total records: ${rows.length}`, 10, 18);
      autoTable(pdf, {
        startY: 23,
        head: [headers],
        body: rows,
        theme: "grid",
        margin: { top: 10, right: 8, bottom: 12, left: 8 },
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [79, 96, 207],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: { 0: { cellWidth: 10, halign: "center" } },
        showHead: "everyPage",
        rowPageBreak: "avoid",
      });
      pdf.save(`Director_${activeTab}_list.pdf`);
    } catch (err) {
      console.error("Failed to export Director list PDF:", err);
      window.alert("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }, [activeTab, exportingPdf, getExportRows]);

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil((Number(totalItems) || 0) / itemsPerPage);
    if (!Number.isFinite(totalPages) || totalPages <= 1) return null;
    const handlePageChange = (pageNumber) => {
      setCurrentPage(Math.max(1, Math.min(totalPages, pageNumber)));
    };
    let startPage;
    let endPage;
    const maxPagesToShow = 5;
    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
      startPage = 1;
      endPage = maxPagesToShow;
    } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
      startPage = totalPages - maxPagesToShow + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - Math.floor(maxPagesToShow / 2);
      endPage = currentPage + Math.floor(maxPagesToShow / 2);
    }
    const items = [];
    for (let page = Math.max(1, startPage); page <= Math.min(totalPages, endPage); page++) {
      items.push(
        <Pagination.Item
          key={page}
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>,
      );
    }
    return (
      <Pagination className="justify-content-end mt-3">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        {startPage > 1 && <Pagination.Ellipsis disabled />}
        {items}
        {endPage < totalPages && <Pagination.Ellipsis disabled />}
        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  const renderTable = (data, tabKey) => {
    if (loading[tabKey]) {
      return <div className="text-center p-4"><Spinner animation="border" /></div>;
    }
    if (!data || data.length === 0) {
      return <div className="text-center p-4 text-muted">No users found for this role.</div>;
    }
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const indexOfLastItem = safeCurrentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
    const headers = Object.keys(data[0]).filter((key) => !TAB_CONFIG[tabKey].excluded.includes(key));

    return (
      <>
        <div className="table-responsive">
          <Table striped bordered hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                {headers.map((key) => (
                  <th key={key} className="text-capitalize">{humanize(key)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{indexOfFirstItem + index + 1}</td>
                  {headers.map((key) => <td key={key}>{cellValue(item[key])}</td>)}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {renderPagination(data.length)}
      </>
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
        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h3 className="mb-0 fw-bold">
              <FaUserShield className="me-2" />DPO CDPO Sector &amp; AWC List
            </h3>
            <ButtonGroup>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={exportToPDF}
                disabled={loading[activeTab] || !(dataByTab[activeTab] || []).length || exportingPdf}
              >
                <FaFilePdf className="me-1" />
                {exportingPdf ? "Preparing PDF…" : "Export PDF"}
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={exportToExcel}
                disabled={loading[activeTab] || !(dataByTab[activeTab] || []).length}
              >
                <FaFileExcel className="me-1" /> Export Excel
              </Button>
            </ButtonGroup>
          </div>

          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

          <Tabs
            activeKey={activeTab}
            onSelect={(key) => {
              if (!key || !TAB_CONFIG[key]) return;
              setActiveTab(key);
              setCurrentPage(1);
            }}
            id="director-awc-list-tabs"
            className="mb-4"
          >
            <Tab
              eventKey="dpo"
              title={<span><FaUserCog className="me-2" />DPO List {loadingCounts.dpo ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.dpo ?? 0})`}</span>}
            >
              {renderTable(dpoData, "dpo")}
            </Tab>
            <Tab
              eventKey="cdpo"
              title={<span><FaUserShield className="me-2" />CDPO List {loadingCounts.cdpo ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.cdpo ?? 0})`}</span>}
            >
              {renderTable(cdpoData, "cdpo")}
            </Tab>
            <Tab
              eventKey="supervisor"
              title={<span><FaUserTie className="me-2" />Supervisor List {loadingCounts.supervisor ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.supervisor ?? 0})`}</span>}
            >
              {renderTable(supervisorData, "supervisor")}
            </Tab>
            <Tab
              eventKey="anganwadi"
              title={<span><FaHome className="me-2" />Anganwadi List {loadingCounts.anganwadi ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.anganwadi ?? 0})`}</span>}
            >
              {renderTable(anganwadiData, "anganwadi")}
            </Tab>
          </Tabs>
        </Container>
      </div>
    </div>
  );
};

export default DirectorAwcList;
