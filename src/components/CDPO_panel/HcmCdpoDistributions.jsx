import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const getTrimesterRaw = (row) => {
  if (!row || typeof row !== "object") return "";
  const candidates = [
    row.trimester, row.trimester_months, row.trimesterMonths,
    row.trimester_name, row.trimesterName, row.quarter, row.quarter_name,
    row.quarterName, row.quarter_months, row.quarterMonths,
    row.months, row.months_allotted, row.monthsAllotted, row.month,
    row.distribution_quarter, row.distributionQuarter,
    row.allocation?.trimester, row.allocation?.quarter,
    row.food_item_details?.trimester, row.food_item_details?.quarter,
  ];
  return candidates.find(value => value !== undefined && value !== null && value !== "") ?? "";
};

const normalizeTrimesterKey = (row) => {
  const raw = getTrimesterRaw(row);
  if (raw === "") return "-";
  const token = (Array.isArray(raw) ? raw.join("-") : String(raw))
    .trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  const aliases = {
    "april-may-june": "apr-may-jun", "april-may-jun": "apr-may-jun",
    "july-august-september": "jul-aug-sep", "july-aug-sep": "jul-aug-sep",
    "october-november-december": "oct-nov-dec", "october-nov-dec": "oct-nov-dec",
    "january-february-march": "jan-feb-mar", "january-feb-mar": "jan-feb-mar",
    "apr-may-jun": "apr-may-jun", "jul-aug-sep": "jul-aug-sep",
    "oct-nov-dec": "oct-nov-dec", "jan-feb-mar": "jan-feb-mar",
  };
  if (aliases[token]) return aliases[token];
  const monthAliases = { april:"apr", may:"may", june:"jun", july:"jul", august:"aug", september:"sep", october:"oct", november:"nov", december:"dec", january:"jan", february:"feb", march:"mar" };
  const months = token.split(/[;,\s/-]+/).filter(Boolean).map(m => monthAliases[m] || m);
  const groups = { "apr-may-jun":["apr","may","jun"], "jul-aug-sep":["jul","aug","sep"], "oct-nov-dec":["oct","nov","dec"], "jan-feb-mar":["jan","feb","mar"] };
  for (const [key, group] of Object.entries(groups)) if (group.every(m => months.includes(m))) return key;
  if (["1", "2", "3", "4"].includes(token)) return ({"1":"Apr-May-Jun", "2":"Jul-Aug-Sep", "3":"Oct-Nov-Dec", "4":"Jan-Feb-Mar"})[token];
  return token || "-";
};

const formatTrimester = (row) => {
  const key = normalizeTrimesterKey(row);
  return ({"apr-may-jun":"Apr-May-Jun", "jul-aug-sep":"Jul-Aug-Sep", "oct-nov-dec":"Oct-Nov-Dec", "jan-feb-mar":"Jan-Feb-Mar"})[key] || key;
};

const getMonthsRaw = (row) => {
  if (!row || typeof row !== "object") return "";
  const candidates = [
    row.months, row.month, row.distribution_months, row.distributionMonths,
    row.month_names, row.monthNames, row.months_allotted, row.monthsAllotted,
    row.allotted_months, row.allottedMonths, row.selected_months, row.selectedMonths,
    row.trimester_months, row.trimesterMonths, row.quarter_months, row.quarterMonths,
    row.allocation?.months, row.food_item_details?.months,
  ];
  return candidates.find(value => value !== undefined && value !== null && value !== "") ?? "";
};

const formatMonths = (row) => {
  const raw = getMonthsRaw(row);
  const quarterMonths = {
    "1": ["April", "May", "June"], "2": ["July", "August", "September"],
    "3": ["October", "November", "December"], "4": ["January", "February", "March"],
    "apr-may-jun": ["April", "May", "June"], "jul-aug-sep": ["July", "August", "September"],
    "oct-nov-dec": ["October", "November", "December"], "jan-feb-mar": ["January", "February", "March"],
  };
  const names = {
    jan:"January", january:"January", feb:"February", february:"February",
    mar:"March", march:"March", apr:"April", april:"April", may:"May",
    jun:"June", june:"June", jul:"July", july:"July", aug:"August", august:"August",
    sep:"September", sept:"September", september:"September", oct:"October", october:"October",
    nov:"November", november:"November", dec:"December", december:"December",
  };
  const source = raw !== "" ? raw : getTrimesterRaw(row);
  if (source === "" || source == null) return "—";
  if (Array.isArray(source)) {
    const values = source.map(v => names[String(v).trim().toLowerCase()] || names[String(v).trim().toLowerCase().slice(0,3)] || String(v));
    return values.join(", ");
  }
  const token = String(source).trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "");
  if (quarterMonths[token]) return quarterMonths[token].join(", ");
  const split = String(source).split(/[;,|]+/).map(v => v.trim()).filter(Boolean);
  if (split.length > 1) return split.map(v => names[v.toLowerCase()] || names[v.toLowerCase().slice(0,3)] || v).join(", ");
  if (names[token] || names[token.slice(0,3)]) return names[token] || names[token.slice(0,3)];
  // Also accept a quarter written as "April-May-June" or "Apr May Jun".
  const parts = String(source).split(/[\s,/-]+/).filter(Boolean);
  if (parts.length > 1 && parts.every(v => names[v.toLowerCase()] || names[v.toLowerCase().slice(0,3)])) {
    return parts.map(v => names[v.toLowerCase()] || names[v.toLowerCase().slice(0,3)]).join(", ");
  }
  return String(source);
};

const getDistributionDateValue = (row) => {
  if (!row || typeof row !== "object") return row;
  const candidates = [row.date, row.distribution_date, row.distributionDate,
    row.distributed_date, row.distributedDate, row.date_of_distribution,
    row.dateOfDistribution, row.allotment_date, row.allotmentDate,
    row.created_at, row.createdAt, row.date_created, row.dateCreated,
    row.submitted_at, row.submittedAt, row.timestamp];
  return candidates.find(value => value !== undefined && value !== null && value !== "") ?? "";
};

const formatDistributionDate = (value) => {
  const dateValue = getDistributionDateValue(value);
  if (!dateValue) return "—";
  const raw = String(dateValue).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? raw : `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}/${date.getFullYear()}`;
};

const HcmCdpoDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);
  const tableRef = useRef(null);

  const [columns, setColumns] = useState([
    { dataField: '#', text: '#', visible: true },
    { dataField: 'awc_name', text: 'AWC Name', visible: true },
    { dataField: 'awc_code', text: 'AWC Code', visible: true },
    { dataField: 'awc_type', text: 'AWC Type', visible: true },
    { dataField: 'sector', text: 'Sector', visible: true },
    { dataField: 'project', text: 'Project', visible: true },
    { dataField: 'district', text: 'District', visible: true },
    { dataField: 'food_item', text: 'Food Item', visible: true },
    { dataField: 'bene_category', text: 'Beneficiary Category', visible: true },
    { dataField: 'days_allotted', text: 'Days Allotted', visible: true },
    { dataField: 'date', text: 'Date', visible: true },
    { dataField: 'fin_year', text: 'Fin Year', visible: true },
    { dataField: 'trimester', text: 'Trimester', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'anganwadi_remark', text: 'Anganwadi Remark', visible: true },
    { dataField: 'action', text: 'Remarks', visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);

  const [filters, setFilters] = useState({
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    awc_type: [],
    startDate: '',
    endDate: '',
  });
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueAwcTypes, setUniqueAwcTypes] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (distributions.length > 0) {
      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueAwcTypes([...new Set(distributions.map(item => item.awc_type))]);
      setUniqueBeneCategories([...new Set(distributions.map(item => item.bene_category))]);
    }
  }, [distributions]);

  const handleMultiSelectChange = (filterName, value) => {
    setFilters(prevFilters => {
      const currentValues = prevFilters[filterName];
      if (currentValues.includes(value)) {
        return { ...prevFilters, [filterName]: currentValues.filter(v => v !== value) };
      } else {
        return { ...prevFilters, [filterName]: [...currentValues, value] };
      }
    });
  };

  const filteredData = useMemo(() => {
    return distributions.filter(item => {
      const { district, project, sector, food_item, awc_type, bene_category, startDate, endDate } = filters;
      const matchesFilters = (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project)) &&
             (sector.length === 0 || sector.includes(item.sector)) &&
             (food_item.length === 0 || food_item.includes(item.food_item)) &&
             (bene_category.length === 0 || bene_category.includes(item.bene_category)) &&
             (awc_type.length === 0 || awc_type.includes(item.awc_type));

      const itemDate = item.date ? new Date(item.date) : null;
      const matchesDateRange = (!startDate || (itemDate && itemDate >= new Date(startDate))) &&
                               (!endDate || (itemDate && itemDate <= new Date(endDate + 'T23:59:59')));

      return matchesFilters && matchesDateRange;
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/hcm-cdpo-distributions/");
      const raw = response.data?.data || response.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setDistributions(items);
    } catch (err) {
      setError("Failed to fetch HCM distributions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchDistributions();
    }
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewRemark = (item) => {
    setSelectedRemarks(item);
    setShowRemarkModal(true);
  };

  const handleCloseRemarkModal = () => {
    setShowRemarkModal(false);
    setSelectedRemarks(null);
  };

  const getStatusVariant = (status) => {
    const normalized = String(status || "pending").toLowerCase();
    if (normalized === "approved" || normalized === "complete" || normalized === "completed") return "success";
    if (normalized === "rejected" || normalized === "failed") return "danger";
    return "warning";
  };

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const visibleColumns = columns.filter(c => c.visible);

  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => {
        acc.beneficiaries += Number(item.total_beneficiaries) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const unit = item.unit || 'N/A';

        acc.quantity += quantity;
        if (!acc.quantityByUnit[unit]) {
          acc.quantityByUnit[unit] = 0;
        }
        acc.quantityByUnit[unit] += quantity;
        return acc;
    }, { beneficiaries: 0, quantity: 0, quantityByUnit: {} });
  }, [filteredData]);

  const exportToPDF = async () => {
    const sourceTable = tableRef.current;
    if (!sourceTable) return;
    setIsPrinting(true);
    let exportHost;
    try {
      // Build a clean export-only table from all filtered rows. Browser rendering
      // preserves Hindi Unicode; the compact JPEG keeps the PDF file size small.
      const exportColumns = visibleColumns.filter((col) => col.dataField !== 'action');
      exportHost = document.createElement('div');
      Object.assign(exportHost.style, {
        position: 'fixed', left: '-100000px', top: '0', width: '1800px',
        background: '#ffffff', color: '#111111', padding: '12px', zIndex: '-1',
        fontFamily: 'Arial, Noto Sans Devanagari, sans-serif', boxSizing: 'border-box'
      });
      const table = document.createElement('table');
      Object.assign(table.style, {
        width: '100%', borderCollapse: 'collapse', tableLayout: 'auto',
        fontSize: '10px', lineHeight: '1.25', background: '#fff'
      });
      const makeCell = (tag, text, header = false) => {
        const cell = document.createElement(tag);
        cell.textContent = text == null ? '' : String(text);
        Object.assign(cell.style, {
          border: '1px solid #b8c0c8', padding: '4px 5px',
          verticalAlign: 'top', whiteSpace: 'normal', overflowWrap: 'anywhere',
          wordBreak: 'normal', textAlign: 'left',
          background: header ? '#e9eef3' : '#ffffff',
          fontWeight: header ? '700' : '400'
        });
        return cell;
      };
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      exportColumns.forEach((col) => headerRow.appendChild(makeCell('th', col.text, true)));
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      filteredData.forEach((row, index) => {
        const tr = document.createElement('tr');
        exportColumns.forEach((col) => {
          let value = '';
          if (col.dataField === '#') value = index + 1;
          else if (col.dataField === 'date') value = formatDistributionDate(row);
          else if (col.dataField === 'trimester') value = formatTrimester(row);
          else if (col.dataField === 'months') value = formatMonths(row);
          else if (col.dataField === 'fin_year') value = row.fin_year ?? row.financial_year ?? row.financialYear ?? '—';
          else if (col.dataField === 'sector_status') value = row.sector_status || 'pending';
          else if (col.dataField === 'anganwadi_remark') value = row.anganwadi_remark || '—';
          else value = row[col.dataField] ?? '';
          tr.appendChild(makeCell('td', value));
        });
        tbody.appendChild(tr);
      });
      const tfoot = document.createElement('tfoot');
      const totalTr = document.createElement('tr');
      exportColumns.forEach((col, index) => {
        let value = '';
        if (col.dataField === '#') value = 'Total';
        if (col.dataField === 'total_beneficiaries') value = totals.beneficiaries;
        const cell = makeCell('td', value, true);
        cell.style.background = '#e9eef3';
        totalTr.appendChild(cell);
      });
      tfoot.appendChild(totalTr);
      table.appendChild(tbody);
      table.appendChild(tfoot);
      exportHost.appendChild(table);
      document.body.appendChild(exportHost);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = await html2canvas(exportHost, {
        scale: 1.25, useCORS: true, backgroundColor: '#ffffff',
        logging: false, windowWidth: 1850, scrollX: 0, scrollY: 0
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3', compress: true });
      const margin = 24;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const pxPerPt = canvas.width / printableWidth;
      const sliceHeightPx = Math.max(1, Math.floor(printableHeight * pxPerPt));
      let y = 0;
      let page = 0;
      while (y < canvas.height) {
        const chunkHeight = Math.min(sliceHeightPx, canvas.height - y);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = chunkHeight;
        const ctx = pageCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, y, canvas.width, chunkHeight, 0, 0, canvas.width, chunkHeight);
        if (page > 0) pdf.addPage();
        const image = pageCanvas.toDataURL('image/jpeg', 0.76);
        const imageHeightPt = chunkHeight / pxPerPt;
        pdf.addImage(image, 'JPEG', margin, margin, printableWidth, imageHeightPt, undefined, 'FAST');
        y += chunkHeight;
        page += 1;
      }
      pdf.save('hcm_cdpo_distributions.pdf');
    } catch (err) {
      console.error('Failed to export HCM CDPO PDF:', err);
    } finally {
      if (exportHost?.parentNode) exportHost.parentNode.removeChild(exportHost);
      setIsPrinting(false);
    }
  };

  const exportToExcel = () => {
    const exportColumns = columns.filter(c => c.visible && c.dataField !== 'action');
    const dataToExport = filteredData.map((row, index) => {
      const newRow = {};
      exportColumns.forEach(col => {
        if (col.dataField === '#') newRow[col.text] = index + 1;
        else if (col.dataField === 'date') newRow[col.text] = formatDistributionDate(row);
        else if (col.dataField === 'trimester') newRow[col.text] = formatTrimester(row);
        else if (col.dataField === 'months') newRow[col.text] = formatMonths(row);
        else if (col.dataField === 'fin_year') newRow[col.text] = row.fin_year ?? row.financial_year ?? row.financialYear ?? '';
        else if (col.dataField === 'sector_status') newRow[col.text] = row.sector_status || 'pending';
        else newRow[col.text] = row[col.dataField] ?? '';
      });
      return newRow;
    });
    const totalRow = {};
    exportColumns.forEach(col => {
      if (col.dataField === '#') totalRow[col.text] = 'Total';
      else if (col.dataField === 'total_beneficiaries') totalRow[col.text] = totals.beneficiaries;
      else totalRow[col.text] = '';
    });
    dataToExport.push(totalRow);
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = exportColumns.map(col => ({ wch: Math.max(12, Math.min(32, String(col.text).length + 4)) }));
    worksheet['!rows'] = dataToExport.map(() => ({ hpt: 22 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HCM CDPO Distributions');
    XLSX.writeFile(workbook, 'hcm_cdpo_distributions.xlsx', { compression: true });
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    items.push(
      <Pagination.First key="first" onClick={() => handlePageChange(1)} disabled={currentPage === 1} />,
      <Pagination.Prev key="prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
    );
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    items.push(
      <Pagination.Next key="next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />,
      <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
    );
    return (
      <div className="d-flex justify-content-center mt-3">
        <Pagination size="sm">{items}</Pagination>
      </div>
    );
  };

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">HCM CDPO Distributions</h3>
            <div>
              <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="me-2">
                <FaFilePdf className="me-1" /> Export PDF
              </Button>
              <Button variant="outline-success" size="sm" onClick={exportToExcel} className="me-2">
                <FaFileExcel className="me-1" /> Export Excel
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowColumnModal(true)}>
                <FaEye className="me-1" /> Column Visibility
              </Button>
            </div>
          </div>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-district" className="w-100">
                  {filters.district.length ? `${filters.district.length} districts selected` : 'All Districts'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueDistricts.map(d => (
                    <Dropdown.Item key={d} as="div">
                      <Form.Check type="checkbox" label={d} checked={filters.district.includes(d)} onChange={() => handleMultiSelectChange('district', d)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-project" className="w-100">
                  {filters.project.length ? `${filters.project.length} projects selected` : 'All Projects'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueProjects.map(p => (
                    <Dropdown.Item key={p} as="div">
                      <Form.Check type="checkbox" label={p} checked={filters.project.includes(p)} onChange={() => handleMultiSelectChange('project', p)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector" className="w-100">
                  {filters.sector.length ? `${filters.sector.length} sectors selected` : 'All Sectors'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectors.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.sector.includes(s)} onChange={() => handleMultiSelectChange('sector', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-food-item" className="w-100">
                  {filters.food_item.length ? `${filters.food_item.length} items selected` : 'All Food Items'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFoodItems.map(item => (
                    <Dropdown.Item key={item} as="div">
                      <Form.Check type="checkbox" label={item} checked={filters.food_item.includes(item)} onChange={() => handleMultiSelectChange('food_item', item)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-awc-type" className="w-100">
                  {filters.awc_type.length ? `${filters.awc_type.length} types selected` : 'All AWC Types'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueAwcTypes.map(t => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check type="checkbox" label={t} checked={filters.awc_type.includes(t)} onChange={() => handleMultiSelectChange('awc_type', t)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(t => (
                    <Dropdown.Item key={t} as="div">
                      <Form.Check type="checkbox" label={t} checked={filters.bene_category.includes(t)} onChange={() => handleMultiSelectChange('bene_category', t)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={3}>
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
            </Col>
            <Col md={2}>
              <Form.Label>End Date</Form.Label>
              <Form.Control type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ district: [], project: [], sector: [], food_item: [], awc_type: [], bene_category: [], startDate: '', endDate: '' })} className="me-2">
                Clear Filters
              </Button>
            </Col>
          </Row>

          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

          <Card className="shadow-sm">
          
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-muted">No HCM distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table 
                    striped 
                    bordered 
                    hover 
                    responsive 
                    className="mb-0" 
                    ref={tableRef}
                    style={{ border: '1px solid #988c8c' }}
                  >
                     <thead>
                       <tr>
                         {visibleColumns.map((col) => <th key={`th-${col.dataField}`}>{col.text}</th>)}
                       </tr>
                     </thead>
                      <tbody>
                        {currentItems.length > 0 ? currentItems.map((row, index) => (
                          <tr key={`row-${row.id}`}>
                            {visibleColumns.map((col) => {
                              let cellContent;
                              if (col.dataField === '#') {
                                cellContent = index + 1;
                              } else if (col.dataField === 'date') {
                                cellContent = formatDistributionDate(row);
                              } else if (col.dataField === 'trimester') {
                                cellContent = formatTrimester(row);
                              } else if (col.dataField === 'months') {
                                cellContent = formatMonths(row);
                              } else if (col.dataField === 'fin_year') {
                                cellContent = row.fin_year ?? row.financial_year ?? row.financialYear ?? '—';
                              } else if (col.dataField === 'sector_status') {
                                cellContent = isPrinting
                                  ? (row.sector_status || 'pending')
                                  : <Badge bg={getStatusVariant(row.sector_status)}>{row.sector_status || 'pending'}</Badge>;
                              } else if (col.dataField === 'anganwadi_remark') {
                                cellContent = row.anganwadi_remark || '—';
                              } else if (col.dataField === 'action') {
                                cellContent = (
                                  <Button variant="outline-primary" size="sm" onClick={() => handleViewRemark(row)}>
                                    View Remark
                                  </Button>
                                );
                              } else {
                                cellContent = row[col.dataField] ?? '';
                              }
                              return <td key={`td-${row.id}-${col.dataField}`}>{cellContent}</td>;
                            })}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={visibleColumns.length} className="text-center">No data available</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          {visibleColumns.map((col) => {
                            let cellContent = '';
                            if (col.dataField === '#') {
                              cellContent = <strong>Total</strong>;
                            } else if (col.dataField === 'total_beneficiaries') {
                              cellContent = <strong>{totals.beneficiaries}</strong>;
                            } else if (col.dataField === 'quantity') {
                              cellContent = (
                                <div className="d-flex align-items-center justify-content-end">
                                 
                                  {!isPrinting && (
                                    <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)} className="p-1">
                                      View Total
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                            return <td key={`tf-${col.dataField}`}>{cellContent}</td>;
                          })}
                        </tr>
                      </tfoot>
                   </Table>
                  {renderPagination()}
                </div>
              )}
           
          </Card>
        </Container>

        <Modal show={showColumnModal} onHide={() => setShowColumnModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Show/Hide Columns</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {columns.map((col, index) => (
              <Form.Check
                key={index}
                type="checkbox"
                label={col.text}
                checked={col.visible}
                onChange={() => handleColumnToggle(index)}
              />
            ))}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowColumnModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Distribution Remarks - {selectedRemarks?.awc_name || "AWC"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedRemarks && (
              <div>
                <div className="mb-3">
                  <h6>Sector Remark</h6>
                  <p className="mb-1">
                    <strong>Status:</strong>{" "}
                    <Badge bg={getStatusVariant(selectedRemarks.sector_status)}>
                      {selectedRemarks.sector_status || "pending"}
                    </Badge>
                  </p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.sector_remark || "No remark"}</p>
                </div>
                <div>
                  <h6>Anganwadi Remark</h6>
                  <p className="mb-0">{selectedRemarks.anganwadi_remark || "No remark"}</p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRemarkModal}>Close</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showQtyModal} onHide={() => setShowQtyModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Quantity Breakdown by Unit</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Total Quantity</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(totals.quantityByUnit).map(([unit, qty]) => (
                  <tr key={unit}>
                    <td>{unit}</td>
                    <td>{qty.toFixed(2)}</td>
                  </tr>
                ))}
                
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default HcmCdpoDistributions;
