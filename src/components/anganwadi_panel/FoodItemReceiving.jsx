import React, { useState, useEffect, useMemo } from "react";
import { Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert, Row, Col, InputGroup, Badge, ListGroup, Dropdown } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";

import "../../assets/css/anganwadileftnav.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiDashboard.css";
import { FaEdit, FaTrash, FaEye, FaBuilding, FaHashtag, FaUtensils, FaUsers, FaWeightHanging, FaCalendarDay, FaMapMarkerAlt, FaCubes, FaProjectDiagram, FaInfoCircle, FaClock } from "react-icons/fa";

const API_URLS = {
  hcm_receiving: "/hcm-anganwadi-receiving/",
  thr_receiving: "/thr-anganwadi-receiving/",
  supp_nutrition: "/supplementary-nutrition-anganwadi/",
};

// Extracted from Supplementary Nutrition table columns and mapped to Beneficiary Categories, Units, and Supp API Keys
const quarterlyPacketsOptions = [
  { label: "Mung Dal Khichdi", bene_category: "Children (6m-3y)", supp_key: "quarterly_packets_mung_dal_khichdi", unit: "Packets" },
  { label: "Sattu Mix (Packets)", bene_category: "Children (6m-3y)", supp_key: "quarterly_packets_poushik_sattu_mix", unit: "Packets" },
  { label: "Panjeeri (2625gm)", bene_category: "SAM Children", supp_key: "panjeeri_75_days_2625gm_quarterly_packets", unit: "Packets" },
  { label: "Panjeeri (4625gm)", bene_category: "SAM Children", supp_key: "panjeeri_75_days_4625gm_quarterly_packets", unit: "Packets" },
  { label: "Sattu (2250gm)", bene_category: "SUW Children", supp_key: "quarterly_packets_sattu_2250gm", unit: "Packets" },
  { label: "Mix (1000gm)", bene_category: "SUW Children", supp_key: "quarterly_packets_mix_1000gm", unit: "Packets" },
  { label: "Aata (1250gm)", bene_category: "PW & LM", supp_key: "quarterly_packets_multi_grain_aata_1250gm", unit: "Packets" }
];

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const monthOptions = [
  { value: 'apr', label: 'April' }, { value: 'may', label: 'May' }, { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' }, { value: 'aug', label: 'August' }, { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' }, { value: 'nov', label: 'November' }, { value: 'dec', label: 'December' },
  { value: 'jan', label: 'January' }, { value: 'feb', label: 'February' }, { value: 'mar', label: 'March' },
];

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'], 'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'], 'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const monthLabels = monthOptions.reduce((acc, month) => {
  acc[month.value] = month.label;
  return acc;
}, {});

const formatMonths = (months = []) => {
  if (!Array.isArray(months)) return '';
  return months.map((month) => monthLabels[month] || month).join(', ');
};

const FoodItemReceiving = () => {
  const { api } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [activeTab, setActiveTab] = useState("hcm");
  const [hcmReceivings, setHcmReceivings] = useState([]);
  const [thrReceivings, setThrReceivings] = useState([]);
  const [suppNutritionData, setSuppNutritionData] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const [filters, setFilters] = useState({ fin_year: '', months: [] });
  const [uniqueFilterOptions, setUniqueFilterOptions] = useState({
    hcm: { fin_year: [], months: [] },
    thr: { fin_year: [], months: [] },
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [hcmRec, thrRec, suppResp] = await Promise.all([
        api.get(API_URLS.hcm_receiving),
        api.get(API_URLS.thr_receiving),
        api.get(API_URLS.supp_nutrition), 
      ]);
      
      const hcmData = hcmRec.data || [];
      const thrData = thrRec.data || [];
      const suppData = suppResp.data || [];

      setHcmReceivings(hcmData);
      setThrReceivings(thrData);
      setSuppNutritionData(suppData); 

      setUniqueFilterOptions({
        hcm: {
          fin_year: [...new Set(hcmData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(hcmData.flatMap(item => item.months || []).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
        thr: {
          fin_year: [...new Set(thrData.map(item => item.fin_year).filter(Boolean))].sort().reverse(),
          months: [...new Set(thrData.flatMap(item => item.months || []).map(m => monthLabels[m] || m))].sort((a, b) => Object.values(monthLabels).indexOf(a) - Object.values(monthLabels).indexOf(b)),
        },
      });
    } catch (err) {
      setError("Failed to fetch data. Please refresh the page.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api]);

  useEffect(() => {
    setFilters({ fin_year: '', months: [] });
  }, [activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
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

  const resetFilters = () => {
    setFilters({ fin_year: '', months: [] });
  };

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? {
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
      months: item.months || (Array.isArray(item.quarter) ? item.quarter : quarterToMonths[item.quarter] || []),
    } : {
      food_item: '', quantity: '', bene_category: '', unit: '',
      date: new Date().toISOString().split('T')[0],
      fin_year: getCurrentFinancialYear(), months: [],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleOpenViewModal = (record) => {
    setViewItem(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-fill Beneficiary Category, Unit, and Quantity when selecting a Quarterly Packet
    if (name === 'food_item') {
      const selectedItem = quarterlyPacketsOptions.find(item => item.label === value);
      let autoBeneCategory = '';
      let autoUnit = '';
      let autoQuantity = '';

      if (selectedItem) {
        autoBeneCategory = selectedItem.bene_category;
        autoUnit = selectedItem.unit;
        
        // Find matching record in supplementary data to auto-fill quantity
        if (suppNutritionData.length > 0) {
          const matchingRecord = suppNutritionData.find(rec => {
            const matchesYear = formData.fin_year ? rec.financial_year === formData.fin_year : true;
            const matchesMonth = formData.months && formData.months.length > 0 
              ? formData.months.some(m => rec.month.toLowerCase().includes(m)) 
              : true;
            return matchesYear && matchesMonth;
          }) || suppNutritionData[0]; // Fallback to first record if no exact match
          
          if (matchingRecord && selectedItem.supp_key) {
            autoQuantity = matchingRecord[selectedItem.supp_key] || '';
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        food_item: value,
        bene_category: autoBeneCategory,
        unit: autoUnit,
        quantity: autoQuantity
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    const isThr = activeTab === 'thr';

    let payload = {
      ...formData,
      quantity: parseFloat(formData.quantity),
      months: formData.months || [],
    };

    if (editingItem) {
      payload.id = editingItem.id;
    }

    const url = isThr ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
    const method = editingItem ? 'put' : 'post';

    try {
      await api[method](url, payload);
      handleCloseModal();
      fetchData(); 
    } catch (err) {
      setFormError(`Failed to ${editingItem ? 'update' : 'create'} record. Please try again.`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receiving record?")) {
      const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
      try {
        await api.delete(url, { data: { id } });
        fetchData();
      } catch (err) {
        alert("Failed to delete record.");
        console.error(err);
      }
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved": return "success";
      case "rejected": return "danger";
      default: return "warning";
    }
  };

  const filteredHcmReceivings = useMemo(() => {
    return hcmReceivings.filter(item => {
      const itemMonths = (item.months || []).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
             (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [hcmReceivings, filters]);

  const filteredThrReceivings = useMemo(() => {
    return thrReceivings.filter(item => {
      const itemMonths = (item.months || []).map(m => monthLabels[m] || m);
      return (!filters.fin_year || item.fin_year === filters.fin_year) &&
             (filters.months.length === 0 || filters.months.some(m => itemMonths.includes(m)));
    });
  }, [thrReceivings, filters]);

  // HCM/THR Table with Totals
  const renderTable = (records) => {
    const totalQuantity = records.reduce((sum, rec) => sum + (parseFloat(rec.quantity) || 0), 0);
    
    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white' }}>
            <th>#</th>
            <th>Date</th>
            <th>Quarterly Packets Distribution</th>
            <th>Beneficiary Category</th>
            <th>Packets</th>
            <th>Unit</th>
            <th>Fin. Year</th>
            <th>Months</th>
            <th>Sector Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id}>
              <td>{index + 1}</td>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              <td>{rec.food_item}</td>
              <td>{rec.bene_category}</td>
              <td>{rec.quantity}</td>
              <td>{rec.unit}</td>
              <td>{rec.fin_year}</td>
              <td>{formatMonths(rec.months || (Array.isArray(rec.quarter) ? rec.quarter : quarterToMonths[rec.quarter] || []))}</td>
              <td>
                <Badge bg={getStatusVariant(rec.sector_status)}>{rec.sector_status || 'pending'}</Badge>
              </td>
              <td>
                {rec.sector_status === 'approved' || rec.sector_status === 'rejected' ? (
                  <Button variant="outline-info" size="sm" onClick={() => handleOpenViewModal(rec)}>
                    <FaEye /> View
                  </Button>
                ) : (
                  <>
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenModal(rec)}>
                      <FaEdit />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rec.id)}>
                      <FaTrash />
                    </Button>
                  </>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="10" className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold' }}>
              <td colSpan="4" className="text-end">Total Quantity:</td>
              <td>{totalQuantity}</td>
              <td colSpan="5"></td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  // Supp Table with Totals
  const renderSuppTable = (records) => {
    const totals = records.reduce((acc, rec) => {
      acc.active_beneficiaries += rec.active_beneficiaries || 0;
      acc.total_beneficiaries += rec.total_beneficiaries || 0;
      acc.hcm_beneficiaries_3y_6y += rec.hcm_beneficiaries_3y_6y || 0;
      acc.thr_25_days_frs_hcm_beneficiaries_3y_6y += rec.thr_25_days_frs_hcm_beneficiaries_3y_6y || 0;
      acc.children_6m_3y_beneficiaries += rec.children_6m_3y_beneficiaries || 0;
      acc.pregnant_women_lactating_mothers += rec.pregnant_women_lactating_mothers || 0;
      acc.sam_children_6m_6y += rec.sam_children_6m_6y || 0;
      acc.suw_children_6m_6y += rec.suw_children_6m_6y || 0;
      acc.quarterly_packets_mung_dal_khichdi += rec.quarterly_packets_mung_dal_khichdi || 0;
      acc.quarterly_packets_poushik_sattu_mix += rec.quarterly_packets_poushik_sattu_mix || 0;
      acc.panjeeri_75_days_2625gm_quarterly_packets += rec.panjeeri_75_days_2625gm_quarterly_packets || 0;
      acc.panjeeri_75_days_4625gm_quarterly_packets += rec.panjeeri_75_days_4625gm_quarterly_packets || 0;
      acc.quarterly_packets_sattu_2250gm += rec.quarterly_packets_sattu_2250gm || 0;
      acc.quarterly_packets_mix_1000gm += rec.quarterly_packets_mix_1000gm || 0;
      acc.quarterly_packets_multi_grain_aata_1250gm += rec.quarterly_packets_multi_grain_aata_1250gm || 0;
      return acc;
    }, {
      active_beneficiaries: 0, total_beneficiaries: 0, hcm_beneficiaries_3y_6y: 0, thr_25_days_frs_hcm_beneficiaries_3y_6y: 0,
      children_6m_3y_beneficiaries: 0, pregnant_women_lactating_mothers: 0, sam_children_6m_6y: 0, suw_children_6m_6y: 0,
      quarterly_packets_mung_dal_khichdi: 0, quarterly_packets_poushik_sattu_mix: 0, panjeeri_75_days_2625gm_quarterly_packets: 0,
      panjeeri_75_days_4625gm_quarterly_packets: 0, quarterly_packets_sattu_2250gm: 0, quarterly_packets_mix_1000gm: 0, quarterly_packets_multi_grain_aata_1250gm: 0
    });

    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr style={{ backgroundColor: '#073f73', color: 'white', textAlign: 'center' }}>
            <th rowSpan="2">#</th>
            <th rowSpan="2">AWC Name</th>
            <th rowSpan="2">District</th>
            <th rowSpan="2">Project</th>
            <th rowSpan="2">Sector</th>
            <th rowSpan="2">Month</th>
            <th rowSpan="2">Fin. Year</th>
            <th rowSpan="2">Active Beneficiaries</th>
            <th rowSpan="2">Total Beneficiaries</th>
            <th colSpan="4">Children & Mothers Beneficiaries</th>
            <th colSpan="2">SAM / SUW Children</th>
            <th colSpan="7">Quarterly Packets Distribution</th>
          </tr>
          <tr style={{ backgroundColor: '#073f73', color: 'white', textAlign: 'center' }}>
            <th>HCM (3-6y)</th>
            <th>THR 25d (3-6y)</th>
            <th>Children (6m-3y)</th>
            <th>PW &amp; LM</th>
            <th>SAM (6m-6y)</th>
            <th>SUW (6m-6y)</th>
            <th>Mung Dal Khichdi</th>
            <th>Sattu Mix (Packets)</th>
            <th>Panjeeri (2625gm)</th>
            <th>Panjeeri (4625gm)</th>
            <th>Sattu (2250gm)</th>
            <th>Mix (1000gm)</th>
            <th>Aata (1250gm)</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id} style={{ textAlign: 'center' }}>
              <td>{index + 1}</td>
              <td style={{ textAlign: 'left' }}>{rec.awc_name}</td>
              <td style={{ textAlign: 'left' }}>{rec.district}</td>
              <td style={{ textAlign: 'left' }}>{rec.project}</td>
              <td style={{ textAlign: 'left' }}>{rec.sector}</td>
              <td>{rec.month}</td>
              <td>{rec.financial_year}</td>
              <td>{rec.active_beneficiaries}</td>
              <td>{rec.total_beneficiaries}</td>
              
              <td>{rec.hcm_beneficiaries_3y_6y}</td>
              <td>{rec.thr_25_days_frs_hcm_beneficiaries_3y_6y}</td>
              <td>{rec.children_6m_3y_beneficiaries}</td>
              <td>{rec.pregnant_women_lactating_mothers}</td>
              
              <td>{rec.sam_children_6m_6y}</td>
              <td>{rec.suw_children_6m_6y}</td>
              
              <td>{rec.quarterly_packets_mung_dal_khichdi}</td>
              <td>{rec.quarterly_packets_poushik_sattu_mix}</td>
              <td>{rec.panjeeri_75_days_2625gm_quarterly_packets}</td>
              <td>{rec.panjeeri_75_days_4625gm_quarterly_packets}</td>
              <td>{rec.quarterly_packets_sattu_2250gm}</td>
              <td>{rec.quarterly_packets_mix_1000gm}</td>
              <td>{rec.quarterly_packets_multi_grain_aata_1250gm}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="23" className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
        {records.length > 0 && (
          <tfoot>
            <tr style={{ backgroundColor: '#e9ecef', fontWeight: 'bold', textAlign: 'center' }}>
              <td colSpan="7" className="text-end">TOTAL COUNT:</td>
              <td>{totals.active_beneficiaries}</td>
              <td>{totals.total_beneficiaries}</td>
              <td>{totals.hcm_beneficiaries_3y_6y}</td>
              <td>{totals.thr_25_days_frs_hcm_beneficiaries_3y_6y}</td>
              <td>{totals.children_6m_3y_beneficiaries}</td>
              <td>{totals.pregnant_women_lactating_mothers}</td>
              <td>{totals.sam_children_6m_6y}</td>
              <td>{totals.suw_children_6m_6y}</td>
              <td>{totals.quarterly_packets_mung_dal_khichdi}</td>
              <td>{totals.quarterly_packets_poushik_sattu_mix}</td>
              <td>{totals.panjeeri_75_days_2625gm_quarterly_packets}</td>
              <td>{totals.panjeeri_75_days_4625gm_quarterly_packets}</td>
              <td>{totals.quarterly_packets_sattu_2250gm}</td>
              <td>{totals.quarterly_packets_mix_1000gm}</td>
              <td>{totals.quarterly_packets_multi_grain_aata_1250gm}</td>
            </tr>
          </tfoot>
        )}
      </Table>
    );
  };

  const renderFilters = () => {
    const currentFilters = uniqueFilterOptions[activeTab];
    return (
      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Financial Year</Form.Label>            
            <Form.Select name="fin_year" value={filters.fin_year} onChange={handleFilterChange}>
              <option value="">All Years</option>
              {currentFilters?.fin_year.map(year => <option key={year} value={year}>{year}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>            
            <Form.Label>Months</Form.Label>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" className="w-100">{filters.months.length ? `${filters.months.length} selected` : 'All Months'}</Dropdown.Toggle>
              <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {currentFilters?.months.map(v => (<Dropdown.Item key={v} as="div"><Form.Check type="checkbox" label={v} checked={filters.months.includes(v)} onChange={() => handleMultiSelectChange('months', v)} /></Dropdown.Item>))}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button variant="secondary" onClick={resetFilters}>
            Reset
          </Button>
        </Col>
      </Row>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);

      if (width < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="dashboard-container">
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="fw-bold mb-4">
              Food Item Receiving
            </h3>
            {activeTab !== 'supp' && (
              <Button onClick={() => handleOpenModal()}>Add New Receiving</Button>
            )}
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">
            
            <Tab eventKey="hcm" title="HCM Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">HCM Receiving Records</h5>
                  {renderFilters()}                  
                  {renderTable(filteredHcmReceivings)}
                </>
              )}
            </Tab>
            
            <Tab eventKey="thr" title="THR Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">THR Receiving Records</h5>                  
                  {renderFilters()}
                  {renderTable(filteredThrReceivings)}
                </>
              )}
            </Tab>

            <Tab eventKey="supp" title="Supplementary Nutrition">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">Supplementary Nutrition Records</h5>
                  {renderSuppTable(suppNutritionData)}
                </>
              )}
            </Tab>

          </Tabs>
        </Container>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{editingItem ? 'Edit' : 'Add'} {activeTab.toUpperCase()} Receiving</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <Alert variant="danger">{formError}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quarterly Packets Distribution</Form.Label>
                    <Form.Select
                      name="food_item"
                      value={formData.food_item || ''}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Quarterly Packets Distribution</option>
                      {quarterlyPacketsOptions.map((item, index) => (
                        <option key={index} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Packets</Form.Label> 
                    <InputGroup>
                      <Form.Control
                        type="number"
                        name="quantity"
                        value={formData.quantity || ''}
                        onChange={handleFormChange}
                        placeholder="Auto-filled Quantity"
                        required
                      />
                      <Form.Control
                        type="text"
                        name="unit"
                        value={formData.unit || ''}
                        onChange={handleFormChange}
                        placeholder="Unit"
                        readOnly // Made read-only as it auto-fills
                        required
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control 
                      type="text" 
                      name="bene_category" 
                      value={formData.bene_category || ''} 
                      onChange={handleFormChange}
                      placeholder="Auto-filled Beneficiary Category" 
                      readOnly // Made read-only as it auto-fills
                      required 
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Receiving</Form.Label>
                    <Form.Control
                      type="date"
                      name="date"
                      value={formData.date || ''}
                      onChange={handleFormChange}
                      required
                    />
                  </Form.Group>
                </Col>
                
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Financial Year</Form.Label>
                      <Form.Control
                        type="text"
                        name="fin_year"
                        value={formData.fin_year || ''}
                        onChange={handleFormChange}
                        placeholder="e.g., 2025-26"
                        required disabled
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Months</Form.Label>
                      <div className="month-checkbox-group d-flex flex-wrap gap-2">
                        {monthOptions.map((month) => (
                          <Form.Check
                            key={month.value}
                            inline
                            type="checkbox"
                            id={`month-${month.value}`}
                            label={month.label}
                            checked={(formData.months || []).includes(month.value)}
                            onChange={(e) => {
                              const nextMonths = e.target.checked
                                ? [...new Set([...(formData.months || []), month.value])]
                                : (formData.months || []).filter((m) => m !== month.value);
                              setFormData(prev => ({ ...prev, months: nextMonths }));
                            }}
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Col>
                </>
              </Row>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? <Spinner as="span" animation="border" size="sm" /> : (editingItem ? 'Update' : 'Submit')}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {viewItem && (
          <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
            <Modal.Header closeButton className="view-modal-header">
              <Modal.Title>View Record: {viewItem.food_item}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="view-modal-body">
              <ListGroup variant="flush">
                <ListGroup.Item><FaBuilding className="view-modal-icon" /> <strong>AWC Name:</strong> {viewItem.awc_name}</ListGroup.Item>
                <ListGroup.Item><FaHashtag className="view-modal-icon" /> <strong>AWC Code:</strong> {viewItem.awc_code}</ListGroup.Item>
                <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>Quarterly Packets Distribution:</strong> {viewItem.food_item}</ListGroup.Item>
                <ListGroup.Item><FaWeightHanging className="view-modal-icon" /> <strong>Quantity:</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                {viewItem.date ? (
                  <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                ) : (
                  <>
                    <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Financial Year:</strong> {viewItem.fin_year}</ListGroup.Item>
                    <ListGroup.Item><FaCubes className="view-modal-icon" /> <strong>Months:</strong> {formatMonths(viewItem.months || viewItem.quarter)}</ListGroup.Item>
                  </>
                )}
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>Sector:</strong> {viewItem.sector}</ListGroup.Item>
                <ListGroup.Item><FaProjectDiagram className="view-modal-icon" /> <strong>Project:</strong> {viewItem.project}</ListGroup.Item>
                <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>District:</strong> {viewItem.district}</ListGroup.Item>
                {viewItem.sector_status && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Status:</strong> <Badge bg={getStatusVariant(viewItem.sector_status)}>{viewItem.sector_status}</Badge></ListGroup.Item>
                )}
                {viewItem.sector_remark && (
                  <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Remark:</strong> {viewItem.sector_remark}</ListGroup.Item>
                )}
              </ListGroup>
            </Modal.Body>
            <Modal.Footer className="view-modal-footer">
              <Button variant="secondary" onClick={handleCloseViewModal}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default FoodItemReceiving;