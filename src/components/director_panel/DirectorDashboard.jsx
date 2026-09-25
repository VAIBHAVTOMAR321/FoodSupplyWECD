import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Form, Button, ButtonGroup, InputGroup, Dropdown, Pagination } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/directorleftnav.css";
import "../../assets/css/dpo.css"; 

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { FaUsers, FaUserFriends, FaBaby, FaChartBar, FaLayerGroup, FaFileExcel, FaFilePdf, FaSyncAlt, FaSearch, FaBoxes, FaChevronDown, FaWarehouse, FaBox } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

const ITEMS_PER_PAGE = 100;

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
    <div className="dpo-filter-group" style={{ position: 'relative', zIndex: 20 }}>
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

const DirectorDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const navigate = useNavigate();
  const { api } = useAuth();

  // Food Items State
  const [hcmFoodItemsCount, setHcmFoodItemsCount] = useState(0);
  const [thrFoodItemsCount, setThrFoodItemsCount] = useState(0);

  // DPO Data States
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Multi-Select States
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedFYs, setSelectedFYs] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSectors, setSelectedSectors] = useState([]);
  
  const [aggregateView, setAggregateView] = useState("sector"); // 'sector' | 'project' | 'district'

  // Pagination States
  const [suppliesPage, setSuppliesPage] = useState(1);
  const [aggPage, setAggPage] = useState(1);
  const [detailsPage, setDetailsPage] = useState(1);

  // Supplies Dynamic States
  const [suppliesTab, setSuppliesTab] = useState("thr");
  const [suppliesData, setSuppliesData] = useState([]);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [suppliesGroupBy, setSuppliesGroupBy] = useState(['District', 'Project', 'Sector']);

  // Race condition prevention for API calls
  const suppliesReqId = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchHcmFoodItems = async () => {
    try {
      const response = await api.get("/hcm-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setHcmFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch HCM food items:", err);
    }
  };

  const fetchThrFoodItems = async () => {
    try {
      const response = await api.get("/thr-food-items/");
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setThrFoodItemsCount(Array.isArray(data) ? data.length : 0);
    } catch (err) {
      console.error("Failed to fetch THR food items:", err);
    }
  };

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

  // Dynamic Supplies Data Fetching (Handles both 'thr' and 'hcm' dynamically)
  const fetchSuppliesData = async (type) => {
    const reqId = ++suppliesReqId.current; // Increment and get unique ID for this request
    setSuppliesLoading(true);
    try {
      const response = await api.get(`/director/${type}-director-food-reconciliation/`);
      
      // If this is not the latest request, ignore the response to prevent overwriting newer data
      if (reqId !== suppliesReqId.current) return;

      const flatData = [];
      
      if (response.data.success && response.data.district_data) {
        response.data.district_data.forEach(d => {
          if (d.project_data) {
            d.project_data.forEach(p => {
              if (p.sector_data) {
                p.sector_data.forEach(s => {
                  flatData.push({
                    district: d.district,
                    project: p.project,
                    sector: s.sector,
                    foodData: s.food_data || []
                  });
                });
              }
            });
          }
        });
      }
      
      if (reqId === suppliesReqId.current) {
        setSuppliesData(flatData);
      }
    } catch (err) {
      if (reqId === suppliesReqId.current) {
        console.error(`Failed to fetch ${type.toUpperCase()} supplies data:`, err);
        setSuppliesData([]);
      }
    } finally {
      if (reqId === suppliesReqId.current) {
        setSuppliesLoading(false);
      }
    }
  };

  useEffect(() => { 
    if (api) {
      fetchHcmFoodItems();
      fetchThrFoodItems();
      fetchData();
    }
  }, [api]);

  useEffect(() => {
    if (api) {
      fetchSuppliesData(suppliesTab);
      setSuppliesPage(1);
    }
  }, [suppliesTab]);

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

  // Extract unique food items dynamically from suppliesData
  const suppliesFoodItems = useMemo(() => {
    const items = new Set();
    suppliesData.forEach(row => {
      row.foodData.forEach(f => items.add(f.food_item));
    });
    return Array.from(items);
  }, [suppliesData]);

  // Get active group keys based on selection
  const activeGroupKeys = useMemo(() => {
    return suppliesGroupBy.length > 0 ? suppliesGroupBy.map(g => g.toLowerCase()) : ['district', 'project', 'sector'];
  }, [suppliesGroupBy]);

  // Group and aggregate Supplies Data dynamically
  const groupedSuppliesData = useMemo(() => {
    const groups = {};
    suppliesData.forEach(item => {
      const keyVals = activeGroupKeys.map(gk => item[gk]);
      const groupKey = keyVals.join('||');
      
      if (!groups[groupKey]) {
        groups[groupKey] = { keyVals, foodData: {} };
        suppliesFoodItems.forEach(fi => {
          groups[groupKey].foodData[fi] = { received: 0, distributed: 0, balance: 0 };
        });
      }
      
      item.foodData.forEach(fd => {
        if (groups[groupKey].foodData[fd.food_item]) {
          groups[groupKey].foodData[fd.food_item].received += fd.received || 0;
          groups[groupKey].foodData[fd.food_item].distributed += fd.distributed || 0;
          groups[groupKey].foodData[fd.food_item].balance += fd.balance || 0;
        }
      });
    });

    return Object.values(groups).map(g => {
      const row = {};
      activeGroupKeys.forEach((gk, i) => row[gk] = g.keyVals[i]);
      row.foodData = Object.entries(g.foodData).map(([food_item, vals]) => ({ food_item, ...vals }));
      return row;
    });
  }, [suppliesData, activeGroupKeys, suppliesFoodItems]);

  // Calculate Totals for dynamic supplies table
  const suppliesTotals = useMemo(() => {
    const totals = {};
    suppliesFoodItems.forEach(fi => {
      totals[fi] = { received: 0, distributed: 0, balance: 0 };
    });
    groupedSuppliesData.forEach(row => {
      row.foodData.forEach(fd => {
        if (totals[fd.food_item]) {
          totals[fd.food_item].received += fd.received || 0;
          totals[fd.food_item].distributed += fd.distributed || 0;
          totals[fd.food_item].balance += fd.balance || 0;
        }
      });
    });
    return totals;
  }, [groupedSuppliesData, suppliesFoodItems]);

  // Reset Pagination on Filter Change
  useEffect(() => { setDetailsPage(1); }, [searchedRecords]);
  useEffect(() => { setAggPage(1); }, [aggregatedData]);
  useEffect(() => { setSuppliesPage(1); }, [suppliesData, suppliesGroupBy]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Pagination Renderer
  const renderPagination = (currentPage, totalItems, setPage) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages = [];
    pages.push(<Pagination.First key="first" disabled={currentPage === 1} onClick={() => setPage(1)} />);
    pages.push(<Pagination.Prev key="prev" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))} />);
    
    if (startPage > 1) {
      pages.push(<Pagination.Item key={1} onClick={() => setPage(1)}>{1}</Pagination.Item>);
      if (startPage > 2) pages.push(<Pagination.Ellipsis key="ell1" disabled />);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => setPage(i)}>{i}</Pagination.Item>);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push(<Pagination.Ellipsis key="ell2" disabled />);
      pages.push(<Pagination.Item key={totalPages} onClick={() => setPage(totalPages)}>{totalPages}</Pagination.Item>);
    }

    pages.push(<Pagination.Next key="next" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />);
    pages.push(<Pagination.Last key="last" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} />);

    const startItem = Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems);
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="d-flex justify-content-between align-items-center p-2 flex-wrap" style={{ borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
          Showing {startItem} to {endItem} of {totalItems} entries
        </div>
        <Pagination size="sm" className="mb-0">{pages}</Pagination>
      </div>
    );
  };

  // Paginated Data Slices
  const currentSupplies = useMemo(() => {
    return groupedSuppliesData.slice((suppliesPage - 1) * ITEMS_PER_PAGE, suppliesPage * ITEMS_PER_PAGE);
  }, [groupedSuppliesData, suppliesPage]);

  const currentAggregated = useMemo(() => {
    return aggregatedData.slice((aggPage - 1) * ITEMS_PER_PAGE, aggPage * ITEMS_PER_PAGE);
  }, [aggregatedData, aggPage]);

  const currentDetailed = useMemo(() => {
    return searchedRecords.slice((detailsPage - 1) * ITEMS_PER_PAGE, detailsPage * ITEMS_PER_PAGE);
  }, [searchedRecords, detailsPage]);

  /* --- Export Functions --- */
  const exportSuppliesToExcel = () => {
    const data = groupedSuppliesData.map((r, i) => {
      const row = { "S. No.": i + 1 };
      activeGroupKeys.forEach(gk => {
        row[gk.charAt(0).toUpperCase() + gk.slice(1)] = r[gk];
      });
      suppliesFoodItems.forEach(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        row[`${fi} - Received`] = fd ? fd.received : 0;
        row[`${fi} - Distributed`] = fd ? fd.distributed : 0;
        row[`${fi} - Remaining`] = fd ? fd.balance : 0;
      });
      return row;
    });
    
    const totalRow = { "S. No.": "" };
    activeGroupKeys.forEach((gk, idx) => {
      totalRow[gk.charAt(0).toUpperCase() + gk.slice(1)] = idx === 0 ? "Total" : "";
    });
    suppliesFoodItems.forEach(fi => {
      const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
      totalRow[`${fi} - Received`] = t.received.toLocaleString();
      totalRow[`${fi} - Distributed`] = t.distributed.toLocaleString();
      totalRow[`${fi} - Remaining`] = t.balance.toLocaleString();
    });
    data.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplies Summary");
    XLSX.writeFile(wb, `Supplies_${suppliesTab.toUpperCase()}_Summary.xlsx`);
  };

  const exportSuppliesToPDF = () => {
    const head = [[
      { content: 'S. No.', rowSpan: 2 },
      ...activeGroupKeys.map(gk => ({ content: gk.charAt(0).toUpperCase() + gk.slice(1), rowSpan: 2 })),
      ...suppliesFoodItems.map(fi => ({ content: fi, colSpan: 3 }))
    ], [
      ...suppliesFoodItems.flatMap(() => ['Rec.', 'Dist.', 'Rem.'])
    ]];
    
    const body = groupedSuppliesData.map((r, i) => [
      i + 1,
      ...activeGroupKeys.map(gk => r[gk]),
      ...suppliesFoodItems.flatMap(fi => {
        const fd = r.foodData.find(f => f.food_item === fi);
        return fd ? [fd.received, fd.distributed, fd.balance] : [0, 0, 0];
      })
    ]);

    const foot = [[
      { content: 'Total', colSpan: 1 + activeGroupKeys.length },
      ...suppliesFoodItems.flatMap(fi => {
        const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
        return [t.received.toLocaleString(), t.distributed.toLocaleString(), t.balance.toLocaleString()];
      })
    ]];

    const doc = new jsPDF("l", "pt", "a3");
    doc.text(`Supplies ${suppliesTab.toUpperCase()} Summary`, 40, 40);
    autoTable(doc, {
      head, body, foot, startY: 50,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [111, 66, 193] }, 
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold" }
    });
    doc.save(`Supplies_${suppliesTab.toUpperCase()}_Summary.pdf`);
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
      {/* CSS Override to fix dropdown overlapping issues inside cards */}
      <style>{`
        .dpo-table-card {
          overflow: visible !important;
        }
        .dpo-table-header {
          border-radius: 10px 10px 0 0;
          position: relative;
          z-index: 20;
        }
        .dpo-multi-menu {
          z-index: 1060 !important;
        }
      `}</style>

      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        
        <Container fluid className="dashboard-box mt-3">
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          {/* DPO Purple Header Section */}
          <div className="dashboard-header-section mt-4">
            <div>
              <h4 className="dashboard-main-title">
                <FaBoxes /> Director Dashboard
              </h4>
            </div>
            <Button className="dpo-btn-light" onClick={fetchData} disabled={loading}>
              <FaSyncAlt className={loading ? "fa-spin" : ""} /> Refresh Data
            </Button>
          </div>

          {/* Optimized Compact Food Items Overview */}
          <div className="mb-4">
            <Row className="g-3">
              <Col md={6}>
                <div 
                  onClick={() => navigate('/director/food-items')} 
                  className="d-flex align-items-center p-1 bg-white rounded shadow-sm " 
                  style={{ cursor: 'pointer', borderLeft: '4px solid #ffc107', transition: 'all 0.2s' }}
                >
                  <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107', borderRadius: '8px' }}>
                    <FaBox size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>HCM Food Items</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                      {loading ? <Spinner animation="border" size="sm" /> : hcmFoodItemsCount}
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div 
                  onClick={() => navigate('/director/food-items')} 
                  className="d-flex align-items-center p-1 bg-white rounded shadow-sm " 
                  style={{ cursor: 'pointer', borderLeft: '4px solid #0dcaf0', transition: 'all 0.2s' }}
                >
                  <div className="me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', background: 'rgba(13, 202, 240, 0.1)', color: '#0dcaf0', borderRadius: '8px' }}>
                    <FaBox size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>THR Food Items</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
                      {loading ? <Spinner animation="border" size="sm" /> : thrFoodItemsCount}
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
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

          {/* Supplies Received & Distributed Table (Dynamic with Tabs & GroupBy) */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaWarehouse /> Supplies Received & Distributed Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'thr' ? 'active' : ''}`} onClick={() => setSuppliesTab('thr')}>THR</Button>
                  <Button className={`dpo-toggle-btn ${suppliesTab === 'hcm' ? 'active' : ''}`} onClick={() => setSuppliesTab('hcm')}>HCM</Button>
                </ButtonGroup>
                <div style={{ minWidth: '180px' }}>
                  <MultiSelectDropdown label="Group By" options={['District', 'Project', 'Sector']} selected={suppliesGroupBy} onChange={setSuppliesGroupBy} />
                </div>
                <div className="dpo-export-btns">
                  <Button className="dpo-export-btn" onClick={exportSuppliesToExcel}><FaFileExcel className="text-success" /> Excel</Button>
                  <Button className="dpo-export-btn" onClick={exportSuppliesToPDF}><FaFilePdf className="text-danger" /> PDF</Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="dpo-table-wrapper">
                {suppliesLoading ? (
                  <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
                ) : (
                  <Table hover className="dpo-data-table mb-0">
                    <thead>
                      <tr>
                        <th rowSpan="2">S. No.</th>
                        {activeGroupKeys.map(gk => (
                          <th key={gk} rowSpan="2" style={{textTransform: 'capitalize'}}>{gk}</th>
                        ))}
                        {suppliesFoodItems.map((fi, idx) => (
                          <th key={`fi-${idx}`} colSpan="3" className="text-center" style={{ borderLeft: '1px solid #e9d5ff' }}>
                            {fi}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {suppliesFoodItems.map((fi, idx) => (
                          <React.Fragment key={`sub-${idx}`}>
                            <th className="text-end">Rec.</th>
                            <th className="text-end">Dist.</th>
                            <th className="text-end">Rem.</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSupplies.length === 0 ? (
                        <tr><td colSpan={1 + activeGroupKeys.length + (suppliesFoodItems.length * 3)} className="text-center p-4 text-muted">No data available</td></tr>
                      ) : currentSupplies.map((row, i) => (
                        <tr key={i}>
                          <td>{(suppliesPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                          {activeGroupKeys.map(gk => (
                            <td key={gk}>{gk === 'project' ? <strong>{row[gk]}</strong> : row[gk]}</td>
                          ))}
                          {suppliesFoodItems.map((fi, idx) => {
                            const fd = row.foodData.find(f => f.food_item === fi);
                            return (
                              <React.Fragment key={`data-${idx}`}>
                                <td className="text-end">{fd ? fd.received.toLocaleString() : 0}</td>
                                <td className="text-end">{fd ? fd.distributed.toLocaleString() : 0}</td>
                                <td className="text-end text-primary"><strong>{fd ? fd.balance.toLocaleString() : 0}</strong></td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {groupedSuppliesData.length > 0 && (
                      <tfoot>
                        <tr>
                          <th></th>
                          {activeGroupKeys.map((gk, idx) => (
                            <th key={gk}>{idx === 0 ? "Total" : ""}</th>
                          ))}
                          {suppliesFoodItems.map((fi, idx) => {
                            const t = suppliesTotals[fi] || { received: 0, distributed: 0, balance: 0 };
                            return (
                              <React.Fragment key={`foot-${idx}`}>
                                <th className="text-end">{t.received.toLocaleString()}</th>
                                <th className="text-end">{t.distributed.toLocaleString()}</th>
                                <th className="text-end">{t.balance.toLocaleString()}</th>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </Table>
                )}
              </div>
              {!suppliesLoading && renderPagination(suppliesPage, groupedSuppliesData.length, setSuppliesPage)}
            </Card.Body>
          </Card>

          {/* Aggregated Table */}
          <Card className="dpo-table-card">
            <Card.Header className="dpo-table-header">
              <h5 className="dpo-section-title">
                <FaLayerGroup /> {aggregateView === "sector" ? "Sector-wise" : aggregateView === "project" ? "Project-wise" : "District-wise"} Aggregated Summary
              </h5>
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <ButtonGroup className="dpo-toggle-group">
                  <Button className={`dpo-toggle-btn ${aggregateView === 'district' ? 'active' : ''}`} onClick={() => setAggregateView('district')}>District-wise</Button>
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
                      {currentAggregated.length === 0 ? (
                        <tr><td colSpan={NUMERIC_AGG_FIELDS.length + 4} className="text-center p-4 text-muted">No data available</td></tr>
                      ) : currentAggregated.map((row, i) => (
                        <tr key={i}>
                          <td>{(aggPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
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
              {!loading && renderPagination(aggPage, aggregatedData.length, setAggPage)}
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
                      {currentDetailed.length === 0 ? (
                        <tr><td colSpan={TABLE_COLUMNS.length + 1} className="text-center p-5 text-muted">No records found.</td></tr>
                      ) : currentDetailed.map((row, i) => (
                        <tr key={i}>
                          <td>{(detailsPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
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
              {!loading && renderPagination(detailsPage, searchedRecords.length, setDetailsPage)}
            </Card.Body>
          </Card>

        </Container>
      </div>
    </div>
  );
};

export default DirectorDashboard;
