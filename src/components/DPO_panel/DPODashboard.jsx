
import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Form, Button, ButtonGroup, InputGroup, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";

import { FaUsers, FaUserFriends, FaBaby, FaChartBar, FaLayerGroup, FaFileExcel, FaFilePdf, FaSyncAlt, FaSearch, FaBoxes, FaChevronDown, FaWarehouse } from "react-icons/fa";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TABLE_COLUMNS = [
  { label: "District", key: "district" },
  { label: "Project", key: "project" },
  { label: "Sector", key: "sector" },
  { label: "AWC Code", key: "awc_code" },
  { label: "Month", key: "month" },
  { label: "Fin. Year", key: "financial_year" },
  { label: "Active Bene.", key: "active_beneficiaries", num: true },
  { label: "Total Bene.", key: "total_beneficiaries", strong: true },
  { label: "Pregnant/Lact", key: "pregnant_women_lactating_mothers", num: true },
  { label: "6m-3y", key: "children_6m_3y_beneficiaries", num: true },
  { label: "THR 25d", key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", num: true },
  { label: "HCM 3-6y", key: "hcm_beneficiaries_3y_6y", num: true },
  { label: "SAM 6m-6y", key: "sam_children_6m_6y", num: true },
  { label: "SUW 6m-6y", key: "suw_children_6m_6y", num: true },
  { label: "SAM 3-6y", key: "sam_children_3y_6y", num: true },
  { label: "SUW 3-6y", key: "suw_children_3y_6y", num: true },
  { label: "Mung Dal", key: "quarterly_packets_mung_dal_khichdi", num: true },
  { label: "P. Sattu", key: "quarterly_packets_poushik_sattu_mix", num: true },
  { label: "Sattu(gm)", key: "poushik_sattu_mix_75_days_packet_size_gm", num: true },
  { label: "Panj 2625", key: "panjeeri_75_days_2625gm_quarterly_packets", num: true },
  { label: "Panj 4625", key: "panjeeri_75_days_4625gm_quarterly_packets", num: true },
  { label: "Sattu 2250", key: "quarterly_packets_sattu_2250gm", num: true },
  { label: "Mix 1000", key: "quarterly_packets_mix_1000gm", num: true },
  { label: "Multi Aata", key: "quarterly_packets_multi_grain_aata_1250gm", num: true },
];

const NUMERIC_AGG_FIELDS = TABLE_COLUMNS.filter(c => c.num || c.strong);

const SUMMARY_PILLS = [
  { key: "total_beneficiaries", label: "Total", icon: <FaUsers size={10} /> },
  { key: "active_beneficiaries", label: "Active", icon: <FaUserFriends size={10} /> },
  { key: "pregnant_women_lactating_mothers", label: "Preg/Lact", icon: <FaBaby size={10} /> },
  { key: "children_6m_3y_beneficiaries", label: "6m-3y", icon: <FaBaby size={10} /> },
  { key: "thr_25_days_frs_hcm_beneficiaries_3y_6y", label: "THR 25d", icon: <FaUsers size={10} /> },
  { key: "hcm_beneficiaries_3y_6y", label: "HCM 3-6y", icon: <FaUsers size={10} /> },
  { key: "sam_children_6m_6y", label: "SAM 6m-6y", icon: <FaBaby size={10} /> },
  { key: "suw_children_6m_6y", label: "SUW 6m-6y", icon: <FaBaby size={10} /> },
  { key: "sam_children_3y_6y", label: "SAM 3-6y", icon: <FaBaby size={10} /> },
  { key: "suw_children_3y_6y", label: "SUW 3-6y", icon: <FaBaby size={10} /> },
  { key: "quarterly_packets_mung_dal_khichdi", label: "Mung Dal", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_poushik_sattu_mix", label: "P. Sattu", icon: <FaBoxes size={10} /> },
  { key: "poushik_sattu_mix_75_days_packet_size_gm", label: "Sattu(gm)", icon: <FaBoxes size={10} /> },
  { key: "panjeeri_75_days_2625gm_quarterly_packets", label: "Panj 2625", icon: <FaBoxes size={10} /> },
  { key: "panjeeri_75_days_4625gm_quarterly_packets", label: "Panj 4625", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_sattu_2250gm", label: "Sattu 2250", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_mix_1000gm", label: "Mix 1000", icon: <FaBoxes size={10} /> },
  { key: "quarterly_packets_multi_grain_aata_1250gm", label: "Multi Aata", icon: <FaBoxes size={10} /> },
];

// Dummy Data for Supplies Table
const SUPPLIES_DATA = [
  { project: "Bhaisiachana", sector: "Barechhina", received: 3500, distributed: 3000, remaining: 500 },
  { project: "Bhaisiachana", sector: "Sheragat", received: 2800, distributed: 2500, remaining: 300 },
  { project: "Bhikiyasain", sector: "Basot", received: 1500, distributed: 1200, remaining: 300 },
  { project: "Bhikiyasain", sector: "Bhikiyasen", received: 1600, distributed: 1400, remaining: 200 },
  { project: "Bhikiyasain", sector: "Daula", received: 2000, distributed: 1800, remaining: 200 },
  { project: "Bhikiyasain", sector: "Vinayak", received: 1300, distributed: 1100, remaining: 200 },
];

// Custom Multi-Select Dropdown Component
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((o) => o !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const getLabel = () => {
    if (!selected || selected.length === 0) return `All ${label}s`;
    if (selected.length === 1) return selected[0];
    return `${selected.length} ${label}s selected`;
  };

  return (
    <div className="dpo-filter-group">
      <Form.Label className="dpo-filter-label">{label}</Form.Label>
      <Dropdown autoClose="outside">
        <Dropdown.Toggle size="sm" variant="light" className="dpo-multi-toggle">
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getLabel()}</span>
          <FaChevronDown className="dpo-multi-caret" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="dpo-multi-menu">
          {options.length === 0 ? (
            <Dropdown.Item disabled>No options</Dropdown.Item>
          ) : (
            options.map((opt) => (
              <div key={opt} className="dpo-multi-item" onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}>
                <Form.Check 
                  type="checkbox" 
                  checked={selected.includes(opt)} 
                  onChange={() => {}} 
                  label={opt} 
                />
              </div>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

const DPODashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-Select States
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  
  const [aggregateView, setAggregateView] = useState("sector"); // 'sector' | 'project'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-details/");
      const data = Array.isArray(response.data) ? response.data : (response.data?.results || response.data?.data || []);
      setRecords(data);
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const uniqueMonths = useMemo(() => [...new Set(records.map(r => r.month).filter(Boolean))].sort(), [records]);
  const uniqueFYs = useMemo(() => [...new Set(records.map(r => r.financial_year).filter(Boolean))].sort(), [records]);
  const uniqueProjects = useMemo(() => [...new Set(records.map(r => r.project).filter(Boolean))].sort(), [records]);
  const uniqueSectors = useMemo(() => [...new Set(records.map(r => r.sector).filter(Boolean))].sort(), [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const m = selectedMonths.length === 0 ? true : selectedMonths.includes(r.month);
      const y = selectedFYs.length === 0 ? true : selectedFYs.includes(r.financial_year);
      const p = selectedProjects.length === 0 ? true : selectedProjects.includes(r.project);
      const s = selectedSectors.length === 0 ? true : selectedSectors.includes(r.sector);
      return m && y && p && s;
    });
  }, [records, selectedMonths, selectedFYs, selectedProjects, selectedSectors]);

  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return filteredRecords;
    const term = searchTerm.toLowerCase();
    return filteredRecords.filter(r =>
      (r.month || "").toLowerCase().includes(term) ||
      (r.financial_year || "").toLowerCase().includes(term) ||
      (r.district || "").toLowerCase().includes(term) ||
      (r.project || "").toLowerCase().includes(term) ||
      (r.sector || "").toLowerCase().includes(term) ||
      (r.awc_code || "").toLowerCase().includes(term)
    );
  }, [filteredRecords, searchTerm]);

  const summaryStats = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      NUMERIC_AGG_FIELDS.forEach(({ key }) => {
        acc[key] = (acc[key] || 0) + (parseInt(r[key]) || 0);
      });
      return acc;
    }, {});
  }, [filteredRecords]);

  const aggregatedData = useMemo(() => {
    if (!filteredRecords.length) return [];
    const grouped = {};
    filteredRecords.forEach(r => {
      const groupKey = r[aggregateView] || "—";
      if (!grouped[groupKey]) {
        grouped[groupKey] = { groupKey, months: new Set(), fys: new Set(), totals: NUMERIC_AGG_FIELDS.reduce((a, { key }) => ({ ...a, [key]: 0 }), {}) };
      }
      if (r.month) grouped[groupKey].months.add(r.month);
      if (r.financial_year) grouped[groupKey].fys.add(r.financial_year);
      NUMERIC_AGG_FIELDS.forEach(({ key }) => { grouped[groupKey].totals[key] += parseInt(r[key]) || 0; });
    });
    return Object.values(grouped).map(g => ({
      groupKey: g.groupKey, months: Array.from(g.months).join(", "), fys: Array.from(g.fys).join(", "), ...g.totals
    }));
  }, [filteredRecords, aggregateView]);

  const totalAggregated = useMemo(() => {
    return NUMERIC_AGG_FIELDS.reduce((acc, { key }) => {
      acc[key] = aggregatedData.reduce((sum, row) => sum + (row[key] || 0), 0);
      return acc;
    }, {});
  }, [aggregatedData]);

  const totalDetailed = useMemo(() => {
    return NUMERIC_AGG_FIELDS.reduce((acc, { key }) => {
      acc[key] = searchedRecords.reduce((sum, row) => sum + (parseInt(row[key]) || 0), 0);
      return acc;
    }, {});
  }, [searchedRecords]);

  const totalSupplies = useMemo(() => {
    return SUPPLIES_DATA.reduce((acc, item) => {
      acc.received += item.received;
      acc.distributed += item.distributed;
      acc.remaining += item.remaining;
      return acc;
    }, { received: 0, distributed: 0, remaining: 0 });
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  /* --- Export Functions --- */
  const exportSuppliesToExcel = () => {
    const data = SUPPLIES_DATA.map((r, i) => ({ "S. No.": i + 1, Project: r.project, Sector: r.sector, Received: r.received, Distributed: r.distributed, Remaining: r.remaining }));
    data.push({ "S. No.": "", Project: "Total", Sector: "", Received: totalSupplies.received, Distributed: totalSupplies.distributed, Remaining: totalSupplies.remaining });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    XLSX.writeFile(wb, "Supplies_Summary.xlsx");
  };

  const exportSuppliesToPDF = () => {
    const head = [["S. No.", "Project", "Sector", "Received", "Distributed", "Remaining"]];
    const body = SUPPLIES_DATA.map((r, i) => [i + 1, r.project, r.sector, r.received, r.distributed, r.remaining]);
    const doc = new jsPDF("p", "pt", "a4");
    doc.text("Supplies Received & Distributed Summary", 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [111, 66, 193] }, 
      foot: [["", "Total", "", totalSupplies.received, totalSupplies.distributed, totalSupplies.remaining]],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" }
    });
    doc.save("Supplies_Summary.pdf");
  };

  const exportAggToExcel = () => {
    const data = aggregatedData.map((r, i) => ({ "S. No.": i + 1, [aggregateView]: r.groupKey, Months: r.months, "Fin. Years": r.fys, ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: r[f.key] }), {}) }));
    data.push({ "S. No.": "", [aggregateView]: "Total", ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: totalAggregated[f.key] }), {}) });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `${aggregateView}_Summary.xlsx`);
  };

  const exportAggToPDF = () => {
    const head = [["S. No.", aggregateView, "Months", "Fin. Years", ...NUMERIC_AGG_FIELDS.map(f => f.label)]];
    const body = aggregatedData.map((r, i) => [i + 1, r.groupKey, r.months, r.fys, ...NUMERIC_AGG_FIELDS.map(f => r[f.key])]);
    const doc = new jsPDF("l", "pt", "a3");
    doc.text(`${aggregateView}-wise Aggregated Summary`, 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [111, 66, 193] }, 
      foot: [["", "Total", "", "", ...NUMERIC_AGG_FIELDS.map(f => totalAggregated[f.key])]],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" }
    });
    doc.save(`${aggregateView}_Summary.pdf`);
  };

  const exportDetailsToExcel = () => {
    const data = searchedRecords.map((r, i) => ({ "S. No.": i + 1, ...TABLE_COLUMNS.reduce((o, c) => ({ ...o, [c.label]: r[c.key] || 0 }), {}) }));
    data.push({ "S. No.": "", [TABLE_COLUMNS[0].label]: "Total", ...NUMERIC_AGG_FIELDS.reduce((o, f) => ({ ...o, [f.label]: totalDetailed[f.key] }), {}) });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, "Supplementary_Records.xlsx");
  };

  const exportDetailsToPDF = () => {
    const head = [["S. No.", ...TABLE_COLUMNS.map(c => c.label)]];
    const body = searchedRecords.map((r, i) => [i + 1, ...TABLE_COLUMNS.map(c => r[c.key] || "—")]);
    const totalRow = ["", ...TABLE_COLUMNS.map(c => (c.num || c.strong) ? totalDetailed[c.key] : (c.key === "district" ? "Total" : ""))];
    const doc = new jsPDF("l", "pt", "a3");
    doc.text("Supplementary Nutrition Records", 40, 40);
    autoTable(doc, {
      head, body, startY: 50,
      styles: { fontSize: 5, cellPadding: 1.5 },
      headStyles: { fillColor: [111, 66, 193] }, 
      foot: [totalRow],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" }
    });
    doc.save("Supplementary_Records.pdf");
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />
        
        <Container fluid className="mt-3">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          {/* DPO Purple Header Section */}
          <div className="dashboard-header-section">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Supplementary Nutrition Overview
              </h4>
              <p className="dashboard-subtitle">View aggregated and detailed supplementary nutrition data across sectors and projects.</p>
            </div>
            <Button className="dpo-btn-light" onClick={fetchData} disabled={loading}>
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          {/* Compact Multi-Select Filter Bar */}
          <div className="dpo-filter-bar">
            <MultiSelectDropdown label="Month" options={uniqueMonths} selected={selectedMonths} onChange={setSelectedMonths} />
            <MultiSelectDropdown label="Financial Year" options={uniqueFYs} selected={selectedFYs} onChange={setSelectedFYs} />
            <MultiSelectDropdown label="Project" options={uniqueProjects} selected={selectedProjects} onChange={setSelectedProjects} />
            <MultiSelectDropdown label="Sector" options={uniqueSectors} selected={selectedSectors} onChange={setSelectedSectors} />
            <Button variant="outline-secondary" size="sm" className="dpo-filter-reset" onClick={() => { setSelectedMonths([]); setSelectedFYs([]); setSelectedProjects([]); setSelectedSectors([]); }}>
              Reset
            </Button>
          </div>

          {/* Wrapped Summary Pills */}
          {summaryStats && (
            <div className="dpo-stat-strip">
              {SUMMARY_PILLS.map(field => (
                <div key={field.key} className="dpo-stat-pill">
                  <span className="dpo-stat-pill-icon">{field.icon}</span>
                  <span className="dpo-stat-pill-label">{field.label}</span>
                  <span className="dpo-stat-pill-value">{summaryStats[field.key]?.toLocaleString() || 0}</span>
                </div>
              ))}
            </div>
          )}

          {/* Supplies Received & Distributed Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Supplies Received & Distributed Summary
              </h5>
              <div className="dpo-export-btns">
                <Button className="dpo-export-btn" onClick={exportSuppliesToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                <Button className="dpo-export-btn" onClick={exportSuppliesToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                <Table hover className="dpo-data-table mb-0">
                  <thead>
                    <tr>
                      <th>S. No.</th>
                      <th>Project</th>
                      <th>Sector</th>
                      <th className="text-end">Received</th>
                      <th className="text-end">Distributed</th>
                      <th className="text-end">Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUPPLIES_DATA.map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{row.project}</strong></td>
                        <td>{row.sector}</td>
                        <td className="text-end">{row.received.toLocaleString()}</td>
                        <td className="text-end">{row.distributed.toLocaleString()}</td>
                        <td className="text-end text-primary"><strong>{row.remaining.toLocaleString()}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th></th>
                      <th>Total</th>
                      <th></th>
                      <th className="text-end">{totalSupplies.received.toLocaleString()}</th>
                      <th className="text-end">{totalSupplies.distributed.toLocaleString()}</th>
                      <th className="text-end">{totalSupplies.remaining.toLocaleString()}</th>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* Aggregated Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaLayerGroup /> {aggregateView === "sector" ? "Sector-wise" : "Project-wise"} Aggregated Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button className={`dpo-toggle-btn ${aggregateView === 'project' ? 'active' : ''}`} onClick={() => setAggregateView('project')}>Project-wise</Button>
                  <Button className={`dpo-toggle-btn ${aggregateView === 'sector' ? 'active' : ''}`} onClick={() => setAggregateView('sector')}>Sector-wise</Button>
                </ButtonGroup>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportAggToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportAggToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        <th style={{textTransform: 'capitalize'}}>{aggregateView}</th>
                        <th>Months</th>
                        <th>Fin. Years</th>
                        {NUMERIC_AGG_FIELDS.map((col, i) => <th key={i} className="text-end">{col.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedData.length === 0 ? (
                        <tr><td colSpan={NUMERIC_AGG_FIELDS.length + 4} className="text-center p-4 text-muted">No data available</td></tr>
                      ) : aggregatedData.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><strong>{row.groupKey}</strong></td>
                          <td>{row.months}</td>
                          <td>{row.fys}</td>
                          {NUMERIC_AGG_FIELDS.map((col, c) => <td key={c} className="text-end">{row[col.key]?.toLocaleString() || 0}</td>)}
                        </tr>
                      ))}
                    </tbody>
                    {aggregatedData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          <th>Total</th><th></th><th></th>
                          {NUMERIC_AGG_FIELDS.map((col, c) => <th key={c} className="text-end">{totalAggregated[col.key]?.toLocaleString() || 0}</th>)}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Detailed Records Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaChartBar /> Detailed Records
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <InputGroup style={{maxWidth: '300px'}}>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control 
                    placeholder="Search AWC, District..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportDetailsToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportDetailsToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {loading ? <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div> : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th>S. No.</th>
                        {TABLE_COLUMNS.map((col, i) => <th key={i} className={col.num || col.strong ? "text-end" : ""}>{col.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {searchedRecords.length === 0 ? (
                        <tr><td colSpan={TABLE_COLUMNS.length + 1} className="text-center p-5 text-muted">No records found.</td></tr>
                      ) : searchedRecords.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {TABLE_COLUMNS.map((col, c) => {
                            const val = row[col.key];
                            if (col.strong) return <td key={c} className="text-end"><strong className="text-primary">{val ? Number(val).toLocaleString() : 0}</strong></td>;
                            if (col.num) return <td key={c} className="text-end">{val ? Number(val).toLocaleString() : 0}</td>;
                            return <td key={c}>{val || "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {searchedRecords.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          {TABLE_COLUMNS.map((col, c) => (
                            <th key={c} className={col.num || col.strong ? "text-end" : ""}>
                              {col.num || col.strong ? (totalDetailed[col.key]?.toLocaleString() || 0) : (c === 0 ? "Total" : "")}
                            </th>
                          ))}
                        </tr>
                      </tfoot>
                    )}
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

export default DPODashboard;