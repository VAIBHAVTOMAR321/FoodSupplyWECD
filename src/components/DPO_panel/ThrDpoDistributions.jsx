import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Card, Spinner, Table, Button, Alert, Badge, Form, Modal, Pagination, Dropdown, Row, Col } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/dpo.css";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import { FaFilePdf, FaFileExcel, FaEye } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const monthLabels = {
  apr: 'April',
  may: 'May',
  jun: 'June',
  jul: 'July',
  aug: 'August',
  sep: 'September',
  oct: 'October',
  nov: 'November',
  dec: 'December',
  jan: 'January',
  feb: 'February',
  mar: 'March',
};

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'],
  'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'],
  'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const firstValue = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const getMonthsRaw = (row) => firstValue(row, [
  "months", "month", "allotted_months", "allottedMonths", "distribution_months",
  "distributionMonths", "month_name", "monthName", "months_allotted", "monthsAllotted",
  "allocation_months", "allocationMonths"
]);

const getTrimesterRaw = (row) => firstValue(row, [
  "trimester", "trimester_name", "trimesterName", "quarter", "quarter_name", "quarterName",
  "quarter_months", "quarterMonths", "distribution_quarter", "distributionQuarter",
  "months", "month", "allocation_trimester", "allocationTrimester"
]);

const formatMonthsValue = (value) => {
  const names = {
    apr: 'April', april: 'April', may: 'May', jun: 'June', june: 'June',
    jul: 'July', july: 'July', aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October', nov: 'November', november: 'November',
    dec: 'December', december: 'December', jan: 'January', january: 'January',
    feb: 'February', february: 'February', mar: 'March', march: 'March'
  };
  const quarters = {
    'apr-may-jun': ['April', 'May', 'June'], 'april-may-june': ['April', 'May', 'June'],
    'jul-aug-sep': ['July', 'August', 'September'], 'july-august-september': ['July', 'August', 'September'],
    'oct-nov-dec': ['October', 'November', 'December'], 'october-november-december': ['October', 'November', 'December'],
    'jan-feb-mar': ['January', 'February', 'March'], 'january-february-march': ['January', 'February', 'March']
  };
  if (Array.isArray(value)) return value.map(m => names[String(m).trim().toLowerCase()] || m).join(', ');
  const token = String(value ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  if (quarters[token]) return quarters[token].join(', ');
  const parts = token.split(/[,-/]+/).filter(Boolean);
  if (parts.length > 1) return parts.map(m => names[m] || m).join(', ');
  return names[token] || value || '-';
};

const formatMonths = (row) => {
  const raw = getMonthsRaw(row);
  return formatMonthsValue(raw !== "" ? raw : getTrimesterRaw(row));
};

const normalizeTrimesterKey = (row) => {
  const raw = getTrimesterRaw(row);
  const token = (Array.isArray(raw) ? raw.join('-') : String(raw))
    .trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '-');
  const aliases = {
    'april-may-june': 'apr-may-jun', 'july-august-september': 'jul-aug-sep',
    'october-november-december': 'oct-nov-dec', 'january-february-march': 'jan-feb-mar',
    'apr-may-jun': 'apr-may-jun', 'jul-aug-sep': 'jul-aug-sep',
    'oct-nov-dec': 'oct-nov-dec', 'jan-feb-mar': 'jan-feb-mar'
  };
  if (aliases[token]) return aliases[token];
  const monthAliases = {
    april: 'apr', june: 'jun', july: 'jul', august: 'aug', september: 'sep',
    october: 'oct', november: 'nov', december: 'dec', january: 'jan',
    february: 'feb', march: 'mar'
  };
  const months = token.split(/[,-/]+/).filter(Boolean).map(m => monthAliases[m] || m);
  const groups = {
    'apr-may-jun': ['apr', 'may', 'jun'], 'jul-aug-sep': ['jul', 'aug', 'sep'],
    'oct-nov-dec': ['oct', 'nov', 'dec'], 'jan-feb-mar': ['jan', 'feb', 'mar']
  };
  for (const [key, group] of Object.entries(groups)) {
    if (group.every(month => months.includes(month))) return key;
  }
  return token || '-';
};

const formatTrimester = (row) => ({
  'apr-may-jun': 'Apr-May-Jun', 'jul-aug-sep': 'Jul-Aug-Sep',
  'oct-nov-dec': 'Oct-Nov-Dec', 'jan-feb-mar': 'Jan-Feb-Mar'
})[normalizeTrimesterKey(row)] || normalizeTrimesterKey(row);

const ThrDpoDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [itemsPerPage] = useState(20);

  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRemarks, setSelectedRemarks] = useState(null);
  const [showQtyModal, setShowQtyModal] = useState(false);
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
    { dataField: 'fin_year', text: 'Fin Year', visible: true },
    { dataField: 'months', text: 'Months', visible: true },
    { dataField: 'trimester', text: 'Trimester', visible: true },
    { dataField: 'total_beneficiaries', text: 'Beneficiaries', visible: true },
    { dataField: 'quantity', text: 'Qty', visible: true },
    { dataField: 'unit', text: 'Unit', visible: true },
    { dataField: 'anganwadi_remark', text: 'Anganwadi Remark', visible: true },
    { dataField: 'sector_status', text: 'Sector Status', visible: true },
    { dataField: 'action', text: 'Remarks', visible: true },
  ]);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const visibleColumns = columns.filter(c => c.visible);

  const [filters, setFilters] = useState({
    finYear: [],
    months: [],
    district: [],
    project: [],
    sector: [],
    food_item: [],
    bene_category: [],
    sector_status: [],
    cdpo_status: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);
  const [uniqueSectors, setUniqueSectors] = useState([]);
  const [uniqueFoodItems, setUniqueFoodItems] = useState([]);
  const [uniqueBeneCategories, setUniqueBeneCategories] = useState([]);
  const [uniqueSectorStatuses, setUniqueSectorStatuses] = useState([]);
  const [uniqueCdpoStatuses, setUniqueCdpoStatuses] = useState([]);
  const [uniqueMonths, setUniqueMonths] = useState([]);

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
      setUniqueFinYears([...new Set(distributions.map(item => item.fin_year))].sort().reverse());
      const allMonths = distributions.flatMap(item => formatMonths(item).split(', ').filter(m => m && m !== '-'));
      const monthOrder = Object.values(monthLabels);
      setUniqueMonths([...new Set(allMonths)].sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)));

      setUniqueDistricts([...new Set(distributions.map(item => item.district))]);
      setUniqueProjects([...new Set(distributions.map(item => item.project))]);
      setUniqueSectors([...new Set(distributions.map(item => item.sector))]);
      setUniqueFoodItems([...new Set(distributions.map(item => item.food_item))]);
      setUniqueBeneCategories([...new Set(distributions.map(item => item.bene_category))]);
      setUniqueSectorStatuses([...new Set(distributions.map(item => item.sector_status).filter(Boolean))]);
      setUniqueCdpoStatuses([...new Set(distributions.map(item => item.cdpo_status))].filter(Boolean));
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
      const { finYear, months, district, project, sector, food_item, bene_category, sector_status, cdpo_status } = filters;
      const itemMonths = formatMonths(item).split(', ').filter(m => m && m !== '-');
      const monthMatch = months.length === 0 || months.some(filterMonth => itemMonths.includes(filterMonth));

      return (finYear.length === 0 || finYear.includes(item.fin_year)) &&
        monthMatch &&
        (district.length === 0 || district.includes(item.district)) &&
        (project.length === 0 || project.includes(item.project)) &&
        (sector.length === 0 || sector.includes(item.sector)) &&
        (food_item.length === 0 || food_item.includes(item.food_item)) &&
        (bene_category.length === 0 || bene_category.includes(item.bene_category)) &&
        (sector_status.length === 0 || sector_status.includes(item.sector_status)) &&
        (cdpo_status.length === 0 || cdpo_status.includes(item.cdpo_status));
    });
  }, [distributions, filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const fetchDistributions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-dpo-distributions/");
      const raw = response.data?.data || response.data || [];
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      setDistributions(items);
    } catch (err) {
      setError("Failed to fetch THR distributions.");
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

  const handleColumnToggle = (index) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

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
   setIsPrinting(true);
   let container;
   try {
     const cols = columns.filter(c => c.visible && c.dataField !== 'action');
     const esc = v => String(v ?? '-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
     container = document.createElement('div');
     Object.assign(container.style, {position:'fixed',left:'-20000px',top:'0',width:'1500px',padding:'10px',background:'#fff',color:'#212529',fontFamily:'Arial, Noto Sans Devanagari, sans-serif'});
     const headers = cols.map(c => `<th>${esc(c.text)}</th>`).join('');
     const rows = filteredData.map((r,i) => `<tr>${cols.map(c => {
       let v = c.dataField === '#' ? i+1 : c.dataField === 'months' ? formatMonths(r) : c.dataField === 'trimester' ? formatTrimester(r) : c.dataField === 'sector_status' ? (r.sector_status || 'pending') : r[c.dataField];
       return `<td>${esc(v)}</td>`;
     }).join('')}</tr>`).join('');
     const foot = cols.map(c => `<td>${esc(c.dataField === '#' ? 'Total' : c.dataField === 'total_beneficiaries' ? totals.beneficiaries : '')}</td>`).join('');
     container.innerHTML = `<div style="font-size:15px;font-weight:bold;margin-bottom:8px">THR DPO Distributions Report</div><table style="width:100%;border-collapse:collapse;font-size:10px;line-height:1.2"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody><tfoot><tr>${foot}</tr></tfoot></table>`;
     const style = document.createElement('style');
     style.textContent = 'th,td{border:1px solid #cfd4da;padding:4px;vertical-align:top;white-space:normal;overflow-wrap:anywhere}th{background:#eef1f4}tbody tr:nth-child(even){background:#f8f9fa}tfoot td{font-weight:bold;background:#e9ecef}';
     container.appendChild(style); document.body.appendChild(container);
     const canvas = await html2canvas(container,{scale:1.1,useCORS:true,backgroundColor:'#fff',logging:false});
     const pdf = new jsPDF({orientation:'landscape',unit:'pt',format:'a3',compress:true});
     const margin=20, pw=pdf.internal.pageSize.getWidth(), ph=pdf.internal.pageSize.getHeight();
     const rw=pw-margin*2, maxH=ph-margin*2, sliceH=Math.max(1,Math.floor(maxH*canvas.width/rw));
     let y=0,page=0;
     while(y<canvas.height){
       if(page) pdf.addPage('a3','landscape');
       const h=Math.min(sliceH,canvas.height-y), part=document.createElement('canvas');
       part.width=canvas.width; part.height=h;
       part.getContext('2d').drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h);
       pdf.addImage(part.toDataURL('image/jpeg',0.65),'JPEG',margin,margin,rw,Math.min(h*rw/canvas.width,maxH),undefined,'FAST');
       y+=h; page++; part.width=1; part.height=1;
     }
     pdf.save('thr_dpo_distributions.pdf'); canvas.width=1; canvas.height=1;
   } catch(err) { console.error('Failed to export THR PDF:',err); setError('Failed to export PDF. Please try again.'); }
   finally { if(container?.parentNode) container.parentNode.removeChild(container); setIsPrinting(false); }
 };

 const exportToExcel = () => {
    const cols = columns.filter(c => c.visible && c.dataField !== 'action');
    const rows = filteredData.map((row, i) => {
      const result = {};
      cols.forEach(c => {
        if (c.dataField === '#') result[c.text] = i + 1;
        else if (c.dataField === 'months') result[c.text] = formatMonths(row);
        else if (c.dataField === 'trimester') result[c.text] = formatTrimester(row);
        else result[c.text] = row[c.dataField] ?? '';
      });
      return result;
    });
    const total = {};
    cols.forEach(c => { total[c.text] = c.dataField === '#' ? 'Total' : c.dataField === 'total_beneficiaries' ? totals.beneficiaries : ''; });
    rows.push(total);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = cols.map(c => ({ wch: Math.max(12, Math.min(28, c.text.length + 3)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'THR DPO Distributions');
    XLSX.writeFile(workbook, 'thr_dpo_distributions.xlsx', { compression: true });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
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
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">THR DPO Distributions</h3>
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
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-finyear" className="w-100">
                  {filters.finYear.length ? `${filters.finYear.length} years selected` : 'All Fin. Years'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueFinYears.map(year => (
                    <Dropdown.Item key={year} as="div">
                      <Form.Check type="checkbox" label={year} checked={filters.finYear.includes(year)} onChange={() => handleMultiSelectChange('finYear', year)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-months" className="w-100">
                  {filters.months.length ? `${filters.months.length} selected` : 'All Months'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueMonths.map(q => (
                    <Dropdown.Item key={q} as="div">
                      <Form.Check type="checkbox" label={q} checked={filters.months.includes(q)} onChange={() => handleMultiSelectChange('months', q)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
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
            <Col md={2} className="mt-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-bene-category" className="w-100">
                  {filters.bene_category.length ? `${filters.bene_category.length} categories selected` : 'All Bene. Categories'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueBeneCategories.map(cat => (
                    <Dropdown.Item key={cat} as="div">
                      <Form.Check type="checkbox" label={cat} checked={filters.bene_category.includes(cat)} onChange={() => handleMultiSelectChange('bene_category', cat)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-cdpo-status" className="w-100">
                  {filters.cdpo_status.length ? `${filters.cdpo_status.length} selected` : 'All CDPO Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueCdpoStatuses.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.cdpo_status.includes(s)} onChange={() => handleMultiSelectChange('cdpo_status', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2}>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" id="dropdown-sector-status" className="w-100">
                  {filters.sector_status.length ? `${filters.sector_status.length} selected` : 'All Sector Status'}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {uniqueSectorStatuses.map(s => (
                    <Dropdown.Item key={s} as="div">
                      <Form.Check type="checkbox" label={s} checked={filters.sector_status.includes(s)} onChange={() => handleMultiSelectChange('sector_status', s)} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ finYear: [], months: [], district: [], project: [], sector: [], food_item: [], bene_category: [], sector_status: [], cdpo_status: [] })}>Clear Filters</Button>
            </Col>
          </Row>

          {successMsg && <Alert variant="success" className="mb-3">{successMsg}</Alert>}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {actionError && <Alert variant="danger" className="mb-3">{actionError}</Alert>}

          <Card className="shadow-sm">
           
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-4 text-muted">No THR distributions found.</div>
              ) : (
                <div className="table-responsive">
                  <Table 
                    striped 
                    bordered 
                    hover 
                    responsive 
                    className="mb-0" 
                    ref={tableRef}
                    style={{ border: '1px solid #dee2e6' }}
                  >
                     <thead>
                       <tr>
                         {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col) => {
                           const thStyle = {};
                           if (col.dataField === 'awc_name') thStyle.minWidth = '250px';
                           if (col.dataField === 'food_item') thStyle.minWidth = '200px';
                           if (col.dataField === 'bene_category') thStyle.minWidth = '200px';
                           if (col.dataField === 'anganwadi_remark' || col.dataField === 'action') thStyle.minWidth = '150px';
                           return <th key={`th-${col.dataField}`} style={thStyle}>{col.text}</th>;
                         })}
                       </tr>
                     </thead>
                      <tbody>
                        {currentItems.length > 0 ? currentItems.map((row, index) => (
                          <tr key={row.id}>
                            {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col) => {
                              let cellContent;
                              switch (col.dataField) {
                                case '#':
                                  cellContent = index + 1;
                                  break;
                                case 'bene_category':
                                  cellContent = <div>{row[col.dataField] || '-'}</div>;
                                  break;
                                case 'months':
                                  cellContent = formatMonths(row);
                                  break;
                                case 'trimester':
                                  cellContent = formatTrimester(row);
                                  break;
                                case 'sector_status': {
                                  const status = row[col.dataField] || 'pending';
                                  cellContent = isPrinting ? status : <Badge bg={getStatusVariant(status)}>{status}</Badge>;
                                  break;
                                }
                                case 'anganwadi_remark':
                                  cellContent = row.anganwadi_remark || '-';
                                  break;
                                case 'action':
                                  cellContent = (
                                    <div className="d-flex align-items-center gap-2 no-print">
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => handleViewRemark(row)}
                                      >
                                        View Remarks
                                      </Button>
                                    </div>
                                  );
                                  break;
                                default:
                                  cellContent = row[col.dataField];
                              }
                              const cellStyle = {};
                              if (col.dataField === 'awc_name') cellStyle.minWidth = '250px';
                              if (col.dataField === 'food_item') cellStyle.minWidth = '200px';
                              if (col.dataField === 'bene_category') cellStyle.minWidth = '200px';
                              if (['food_item', 'bene_category', 'anganwadi_remark', 'sector_remark'].includes(col.dataField)) {
                                cellStyle.wordBreak = 'break-word';
                                cellStyle.whiteSpace = 'normal';
                              }
                              return <td key={`td-${row.id}-${col.dataField}`} style={cellStyle}>{cellContent ?? '-'}</td>;
                            })}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').length} className="text-center">No data available</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          {visibleColumns.filter(col => !isPrinting || col.dataField !== 'action').map((col) => {
                            let cellContent = '';
                            if (col.dataField === '#') {
                              cellContent = <strong>Total</strong>;
                            } else if (col.dataField === 'total_beneficiaries') {
                              cellContent = <strong>{totals.beneficiaries}</strong>;
                            } else if (col.dataField === 'quantity') {
                              cellContent = (
                                <>
                                 
                                  {!isPrinting && (
                                    <Button variant="link" size="sm" onClick={() => setShowQtyModal(true)}>
                                      View Total
                                    </Button>
                                  )}
                                </>
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

        <Modal show={showRemarkModal} onHide={handleCloseRemarkModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>All Remarks - {selectedRemarks?.awc_name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedRemarks && (
              <div>
                <div className="mb-3">
                  <h6>Sector Remark</h6>
                  <p className="mb-1"><strong>Status:</strong>{' '}
                    <Badge bg={getStatusVariant(selectedRemarks.sector_status)}>
                      {selectedRemarks.sector_status || 'pending'}
                    </Badge>
                  </p>
                  <p className="mb-0"><strong>Remark:</strong> {selectedRemarks.sector_remark || 'No remark'}</p>
                </div>
                <div className="mb-3">
                  <h6>Anganwadi Details</h6>
                  <p className="mb-0"><strong>Anganwadi Remark:</strong> {selectedRemarks.anganwadi_remark || 'No remark'}</p>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRemarkModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

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
                {/* <tr className="table-active">
                  <td><strong>Grand Total</strong></td>
                  <td><strong>{totals.quantity.toFixed(2)}</strong></td>
                </tr> */}
              </tbody>
            </Table>
          </Modal.Body>
        </Modal>

      </div>
    </div>
  );
};

export default ThrDpoDistributions;
