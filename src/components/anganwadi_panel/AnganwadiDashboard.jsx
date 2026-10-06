import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Alert, Button, Modal, Form, ListGroup } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/anganwadileftnav.css";
import { useLocation } from "react-router-dom";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";
import { FaUtensils, FaBoxOpen, FaChevronDown, FaChevronUp, FaDolly, FaEdit, FaTrash, FaEye, FaBuilding, FaHashtag, FaUsers, FaWeightHanging, FaCalendarDay, FaMapMarkerAlt, FaCubes, FaProjectDiagram, FaInfoCircle, FaClock } from "react-icons/fa";
import "../../assets/css/AnganwadiDashboard.css";

const API_URLS = {
  categoryandfooditem: "/categoryandfooditem/",
  hcm_distribution: "/hcm-anganwadi-distribution/",
  thr_distribution: "/thr-anganwadi-distribution/",
};

// Configuration to map API field_name to required properties used in existing logic
const supplementaryFoodConfig = [
  { key: 'quarterly_packets_mung_dal_khichdi', bene_category: "6 माह से 3 वर्ष के सामान्य बच्चे", unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_poushik_sattu_mix', bene_category: "6 माह से 3 वर्ष के सामान्य बच्चे", unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'panjeeri_75_days_4625gm_quarterly_packets', bene_category: "3 वर्ष से 5 वर्ष के अतिकुपोषित बच्चे (अतिरिक्त THR हेतु)", unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_sattu_2250gm', bene_category: "3 वर्ष से 6 वर्ष के गंभीर कम वजन वाले बच्चे (अतिरिक्त THR हेतु)", unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_multi_grain_aata_1250gm', bene_category: "गर्भवती एवं धात्री महिलायें", unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
];

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  if (currentMonth >= 3) { // April (index 3) to December
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else { // January to March
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

const monthOptions = [
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' },
  { value: 'aug', label: 'August' },
  { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' },
  { value: 'nov', label: 'November' },
  { value: 'dec', label: 'December' },
  { value: 'jan', label: 'January' },
  { value: 'feb', label: 'February' },
  { value: 'mar', label: 'March' },
];

const quarterToMonths = {
  'apr-may-jun': ['apr', 'may', 'jun'],
  'jul-aug-sep': ['jul', 'aug', 'sep'],
  'oct-nov-dec': ['oct', 'nov', 'dec'],
  'jan-feb-mar': ['jan', 'feb', 'mar'],
};

const monthLabels = {
  apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September',
  oct: 'October', nov: 'November', dec: 'December', jan: 'January', feb: 'February', mar: 'March',
};

const formatMonths = (monthsOrQuarter) => {
  if (Array.isArray(monthsOrQuarter)) {
    return monthsOrQuarter.map((m) => monthLabels[m] || m).join(', ');
  }
  if (typeof monthsOrQuarter === 'string') {
    const mapped = quarterToMonths[monthsOrQuarter];
    if (mapped) return mapped.map((m) => monthLabels[m] || m).join(', ');
    return monthLabels[monthsOrQuarter] || monthsOrQuarter;
  }
  return '';
};

const areSameMonthSets = (monthsA, monthsB) => {
  if (!monthsA || !monthsB) return false;
  if (monthsA.length !== monthsB.length) return false;
  return monthsA.every((month) => monthsB.includes(month));
};

const AnganwadiDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [counts, setCounts] = useState({ hcm: 0, thr: 0 });
  const [loading, setLoading] = useState({ counts: true, table: false });
  const [error, setError] = useState({ counts: "", table: "" });

  const [activeScheme, setActiveScheme] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [distributionRecords, setDistributionRecords] = useState([]);
  
  // State for distribution modal
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [distributionData, setDistributionData] = useState({ total_beneficiaries: '', date: '', fin_year: '', months: [] });
  const [distributionError, setDistributionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);

  const { user, api, uniqueId } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const searchParams = new URLSearchParams(location.search);
    const openScheme = searchParams.get('open');
    if (openScheme === 'hcm' || openScheme === 'thr') {
      setTimeout(() => handleCardClick(openScheme), 100);
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [location.search]);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(prev => ({ ...prev, counts: true }));
      setError(prev => ({ ...prev, counts: "" }));
      try {
        const response = await api.get(API_URLS.categoryandfooditem);
        const foodData = response.data?.food_data || [];
        
        const hcmCount = foodData.filter(item => item.category === "HCM").length;
        const thrCount = foodData.filter(item => item.category === "THR").length;
        
        setCounts({ hcm: hcmCount, thr: thrCount });
      } catch (err) {
        setError(prev => ({ ...prev, counts: "Failed to fetch food item counts." }));
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, counts: false }));
      }
    };
    fetchCounts();
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCardClick = async (scheme) => {
    if (activeScheme === scheme) {
      setActiveScheme(null); // Hide table if clicking the active scheme again
      setFoodItems([]);
      return;
    }

    setActiveScheme(scheme);
    setLoading(prev => ({ ...prev, table: true }));
    setError(prev => ({ ...prev, table: "" }));
    setFoodItems([]);
    setDistributionRecords([]);

    try {
      const distributionUrl = scheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution;
      const [catResponse, distributionsResponse] = await Promise.all([
        api.get(API_URLS.categoryandfooditem),
        api.get(distributionUrl)
      ]);

      const allFoodData = catResponse.data?.food_data || [];
      const schemeFoodData = allFoodData.filter(f => f.category === scheme.toUpperCase());

      const mappedFoodItems = schemeFoodData.map((data, index) => {
        const config = supplementaryFoodConfig.find(c => c.key === data.field_name);
        return {
          id: index + 1,
          food_item: data.food_item,
          field_name: data.field_name,
          bene_category: config?.bene_category || 'N/A',
          unit: config?.unit || 'Packets',
          qty_per_ben: config?.qty_per_ben || 1,
          days_allotted: config?.days_allotted || 75,
          total_quantity: 0
        };
      });

      setFoodItems(mappedFoodItems);
      setDistributionRecords(distributionsResponse.data);
    } catch (err) {
      setError(prev => ({ ...prev, table: `Failed to fetch ${scheme.toUpperCase()} items.` }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  };

  const handleOpenDistributionModal = (item, scheme, existingRecord = null, isNew = false) => {
    let modalItem;
    if (isNew) {
      modalItem = { scheme, isNew: true };
    } else if (existingRecord) {
      const fullFoodItem = foodItems.find(fi => fi.food_item === existingRecord.food_item);
      modalItem = { ...fullFoodItem, ...existingRecord, scheme, isEdit: true };
    } else {
      modalItem = { ...item, scheme };
    }

    setSelectedItem(modalItem);
    setSelectedFoodItem(modalItem);

    if (existingRecord) {
      const foodItemDetails = foodItems.find(fi => fi.food_item === existingRecord.food_item);
      if (scheme === 'hcm') {
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          date: existingRecord.date,
          food_item_id: foodItemDetails?.id,
        });
      } else { // thr
        const existingMonths = Array.isArray(existingRecord.months)
          ? existingRecord.months
          : Array.isArray(existingRecord.quarter)
            ? existingRecord.quarter
            : quarterToMonths[existingRecord.quarter] || [];
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          fin_year: existingRecord.fin_year,
          months: existingMonths,
          food_item_id: foodItemDetails?.id,
        });
        setSelectedFoodItem(foodItemDetails);
      }
    } else {
      setDistributionData({ 
        total_beneficiaries: '',
        date: new Date().toISOString().split('T')[0], 
        fin_year: scheme === 'thr' ? getCurrentFinancialYear() : '', 
        months: [],
        food_item_id: '',
      });
    }

    setDistributionError('');
    setShowDistributionModal(true);
  };

  const handleCloseDistributionModal = () => {
    setShowDistributionModal(false);
    setSelectedItem(null);
    setSelectedFoodItem(null);
  };

  const handleOpenViewModal = (record) => {
    setViewItem(record);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewItem(null);
  };

  const handleDistributionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDistributionError('');

    if (!distributionData.food_item_id) {
      setDistributionError("कृपया एक खाद्य सामग्री चुनें।");
      setSubmitting(false);
      return;
    }

    const isThr = activeScheme === 'thr';

    const selectedFoodItemDetails = (selectedItem.isNew || selectedItem.isEdit)
      ? foodItems.find(fi => fi.id === parseInt(distributionData.food_item_id, 10))
      : selectedItem;

    if (!distributionData.total_beneficiaries || (isThr ? (!distributionData.fin_year || !distributionData.months?.length) : !distributionData.date)) {
      setDistributionError("कृपया सभी आवश्यक फ़ील्ड भरें।");
      setSubmitting(false);
      return;
    }

    // Prevent duplicate entries for THR
    if (isThr) {
      const duplicate = distributionRecords.find(rec => {
        if (selectedItem.isEdit && rec.id === selectedItem.id) {
          return false;
        }
        const recMonths = Array.isArray(rec.quarter) ? rec.quarter : quarterToMonths[rec.quarter] || [];
        return rec.food_item === selectedFoodItemDetails.food_item &&
               rec.fin_year === distributionData.fin_year &&
               areSameMonthSets(recMonths, distributionData.months);
      });

      if (duplicate) {
        const selectedMonthsLabel = formatMonths(distributionData.months);
        setDistributionError(`"${selectedFoodItemDetails.food_item}" के लिए ${distributionData.fin_year} - ${selectedMonthsLabel} का वितरण रिकॉर्ड पहले से मौजूद है।`);
        setSubmitting(false);
        return;
      }
    }

    const isEdit = selectedItem.isEdit;
    const calculatedQuantity = parseFloat(selectedFoodItemDetails.qty_per_ben) * parseInt(distributionData.total_beneficiaries, 10);

    let payload = {
      food_item: selectedFoodItemDetails.food_item,
      total_beneficiaries: parseInt(distributionData.total_beneficiaries, 10),
      quantity: isNaN(calculatedQuantity) ? 0 : calculatedQuantity,
      unit: selectedFoodItemDetails.unit,
      bene_category: selectedFoodItemDetails.bene_category,
      days_allotted: selectedFoodItemDetails.days_allotted,
    };

    if (isThr) {
      payload.fin_year = distributionData.fin_year;
      payload.quarter = distributionData.months;
      payload.months = distributionData.months;
    } else {
      payload.date = distributionData.date;
    }

    if (isEdit) {
      payload.id = selectedItem.id;
    } else {
      payload.food_item = selectedFoodItemDetails.food_item;
    }
    payload.bene_category = selectedFoodItemDetails.bene_category;
    payload.days_allotted = selectedFoodItemDetails.days_allotted;
    payload.unit = selectedFoodItemDetails.unit;

    const url = activeScheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution;
    const method = isEdit ? 'put' : 'post';

    try {
      await api[method](url, payload);
      alert(`Distribution ${isEdit ? 'updated' : 'recorded'} successfully!`);
      handleCloseDistributionModal();
      handleCardClick(activeScheme);
    } catch (err) {
      setDistributionError(`वितरण ${isEdit ? 'अपडेट' : 'रिकॉर्ड'} करने में विफल। कृपया पुन: प्रयास करें।`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (window.confirm(`Are you sure you want to delete the distribution record for ${record.food_item}?`)) {
      const url = activeScheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution;
      try {
        await api.delete(url, { data: { id: record.id } });
        alert('Distribution record deleted successfully!');
        handleCardClick(activeScheme);
      } catch (err) {
        alert('Failed to delete distribution record.');
        console.error(err);
      }
    }
  };

  const selectedFoodItemForCalc = (selectedItem?.isNew || selectedItem?.isEdit || selectedItem)
  ? foodItems.find(fi => fi.id === parseInt(distributionData.food_item_id, 10))
  : selectedItem;

  const calculatedQuantity = selectedFoodItemForCalc
    ? (parseFloat(selectedFoodItemForCalc.qty_per_ben) * (parseInt(distributionData.total_beneficiaries, 10) || 0)).toFixed(2)
    : '0.00';

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
            <h3 className="mb-4 fw-bold">
              Anganwadi Dashboard
            </h3>
          </div>
          <Row>
            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card className={`card-hcm ${activeScheme === 'hcm' ? 'active' : ''}`} onClick={() => handleCardClick('hcm')}>
                <Card.Body>
                  <FaUtensils className="card-icon" />
                  <Card.Title>HCM Food Items</Card.Title>
                  {loading.counts ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <h2 className="fw-bold">{counts.hcm}</h2>
                  )}
                  <Card.Text className="d-flex align-items-center">
                    Total Items 
                    {activeScheme === 'hcm' ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card className={`card-thr ${activeScheme === 'thr' ? 'active' : ''}`} onClick={() => handleCardClick('thr')}>
                <Card.Body>
                  <FaBoxOpen className="card-icon" />
                  <Card.Title>THR Food Items</Card.Title>
                  {loading.counts ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <h2 className="fw-bold">{counts.thr}</h2>
                  )}
                  <Card.Text className="d-flex align-items-center">
                    Total Items
                    {activeScheme === 'thr' ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {error.counts && !loading.counts && (
            <div className="alert alert-danger" role="alert">
              {error.counts}
            </div>
          )}

          {activeScheme && (
            <Row>
              <Col xs={12}>
                <div className="d-flex justify-content-between align-items-center mt-4 mb-3">
                  <h5 className="mb-0">{activeScheme.toUpperCase()} Distribution Records</h5>
                  <Button variant="success" onClick={() => handleOpenDistributionModal(null, activeScheme, null, true)}>
                    <FaDolly className="me-2" /> New Distribution
                  </Button>
                </div>
                {loading.table ? (
                  <div className="loading-state"><Spinner animation="border" /></div>
                ) : error.table ? (
                  <Alert variant="danger">{error.table}</Alert>
                ) : distributionRecords.length === 0 ? (
                  <div className="empty-state">No distribution records found for {activeScheme.toUpperCase()}.</div>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Food Item</th>
                        <th>Month</th>
                        <th>Year</th>
                        <th>Total Beneficiaries</th>
                        {activeScheme === 'hcm' && <th>Beneficiary Category</th>}
                        {activeScheme === 'hcm' && <th>Days Allotted</th>}
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionRecords.map((record, index) => (
                        <tr key={record.id}>
                          <td>{index + 1}</td>
                          <td>{record.food_item}</td>
                          {activeScheme === 'hcm' ? (
                            <>
                              <td>{new Date(record.date).toLocaleString('default', { month: 'long' })}</td>
                              <td>{new Date(record.date).getFullYear()}</td>
                            </>
                          ) : (
                            <>
                              <td>{formatMonths(record.months || record.quarter)}</td>
                              <td>{record.fin_year}</td>
                            </>
                          )}
                          <td>{record.total_beneficiaries}</td>
                          {activeScheme === 'hcm' && <td>{record.bene_category}</td>}
                          {activeScheme === 'hcm' && <td>{record.days_allotted}</td>}
                          <td>{record.quantity}</td>
                          <td>{record.unit}</td>
                          <td>
                            <Button variant="outline-info" size="sm" className="me-2" onClick={() => handleOpenViewModal(record)}>
                              <FaEye />
                            </Button>
                            {record.sector_status !== 'approved' && (
                              <>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenDistributionModal(record, activeScheme, record)}>
                                  <FaEdit />
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(record)}>
                                  <FaTrash />
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Col>
              <Col xs={12}>
                <div className="food-items-table-container mt-4">
                  <h5 className="mb-3">{activeScheme.toUpperCase()} Food Item List</h5>
                  {loading.table ? (
                      <div className="loading-state"><Spinner animation="border" /></div>
                    ) : error.table ? (
                      <Alert variant="danger">{error.table}</Alert>
                    ) : foodItems.length === 0 ? (
                      <div className="empty-state">No items found for {activeScheme.toUpperCase()}.</div>
                    ) : (
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Food Item</th>
                            <th>Qty Per Beneficiary</th>
                            <th>Unit</th>
                            <th>Beneficiary Category</th>
                            <th>Days Allotted</th>
                            <th>Total Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {foodItems.map((item, index) => (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td>{item.food_item}</td>
                              <td>{item.qty_per_ben}</td>
                              <td>{item.unit}</td>
                              <td>{item.bene_category}</td>
                              <td>{item.days_allotted}</td>
                              <td>{item.total_quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                </div>
              </Col>
            </Row>
          )}

          {selectedItem && (
            <Modal show={showDistributionModal} onHide={handleCloseDistributionModal} centered size="lg">
              <Modal.Header closeButton>                
                <Modal.Title>{selectedItem.isEdit ? 'Edit' : 'Record'} Distribution</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {distributionError && <Alert variant="danger">{distributionError}</Alert>}
                <Form onSubmit={handleDistributionSubmit}>                  
                  <Form.Group className="mb-3">
                    <Form.Label>Food Item</Form.Label>
                    <Form.Select
                      required
                      value={distributionData.food_item_id || ''}
                      onChange={(e) => {
                        const newFoodItemId = e.target.value;
                        setDistributionData(prev => ({ ...prev, food_item_id: newFoodItemId, total_beneficiaries: '' }));
                      }}
                    >
                      <option value="">Select a food item...</option>
                      {foodItems.map(item => [
                        <option key={item.id} value={item.id} style={{ fontWeight: 'bold' }}>
                          {item.food_item}
                        </option>,
                        <option key={`${item.id}-cat`} disabled style={{ color: '#6c757d', paddingLeft: '15px' }}>&nbsp;&nbsp;↳ Category: {item.bene_category}</option>
                      ])}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Total Beneficiaries</Form.Label>
                    {activeScheme === 'thr' && (!distributionData.months || distributionData.months.length === 0) && (
                      <Form.Text className="text-muted d-block mb-2">
                        Please select month(s) first to enable this field.
                      </Form.Text>
                    )}
                    {activeScheme === 'hcm' && !distributionData.date && (
                      <Form.Text className="text-muted d-block mb-2">
                        Please select a date first to enable this field.
                      </Form.Text>
                    )}
                    <Form.Control
                      type="text"
                      value={distributionData.total_beneficiaries}
                      onChange={(e) => {
                        setDistributionData({ ...distributionData, total_beneficiaries: e.target.value });
                      }}
                      placeholder="Enter number of beneficiaries"
                      required
                      disabled={
                        (activeScheme === 'thr' && (!distributionData.months || distributionData.months.length === 0)) ||
                        (activeScheme === 'hcm' && !distributionData.date)
                      }
                    />
                  </Form.Group>
                  {activeScheme === 'hcm' ? (
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={distributionData.date || ''}
                        onChange={(e) => {
                          setDistributionData({ ...distributionData, date: e.target.value });
                        }}
                        required
                      />
                    </Form.Group>
                  ) : (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Financial Year</Form.Label>
                        <Form.Control 
                          type="text" 
                          placeholder="e.g., 2025-26" 
                          value={distributionData.fin_year} 
                          readOnly // Changed to readOnly so the auto-filled value submits properly
                          required 
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Months</Form.Label>
                        <div className="month-checkbox-group d-flex flex-wrap gap-2">
                          {monthOptions.map((month) => {
                            const checked = distributionData.months?.includes(month.value) || false;
                            return (
                              <Form.Check
                                key={month.value}
                                inline
                                type="checkbox"
                                id={`month-${month.value}`}
                                label={month.label}
                                checked={checked}
                                onChange={(e) => {
                                  const nextMonths = e.target.checked
                                    ? [...new Set([...(distributionData.months || []), month.value])]
                                    : (distributionData.months || []).filter((m) => m !== month.value);
                                  setDistributionData({ ...distributionData, months: nextMonths });
                                }}
                              />
                            );
                          })}
                        </div>
                      </Form.Group>
                    </>
                  )}
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedFoodItemForCalc?.bene_category || ''}
                      disabled
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Days Allotted</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedFoodItemForCalc?.days_allotted || ''}
                      disabled
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Total Quantity</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={selectedFoodItemForCalc ? `${calculatedQuantity} ${selectedFoodItemForCalc.unit}` : '0.00'}
                      disabled 
                    />
                    <Form.Text>
                      ({selectedFoodItemForCalc?.qty_per_ben || 0} {selectedFoodItemForCalc?.unit} per beneficiary)
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedFoodItemForCalc?.unit || ''}
                      disabled
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button variant="secondary" onClick={handleCloseDistributionModal} className="me-2">
                      Cancel
                    </Button>
                    <Button 
                      variant="primary" 
                      type="submit" 
                      disabled={submitting}
                    >
                      {submitting ? <Spinner as="span" animation="border" size="sm" /> : (selectedItem.isEdit ? 'Update' : 'Submit')}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>
          )}

          {viewItem && (
            <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
              <Modal.Header closeButton className="view-modal-header">
                <Modal.Title>View Distribution: {viewItem.food_item}</Modal.Title>
              </Modal.Header>
              <Modal.Body className="view-modal-body">
                <ListGroup variant="flush">
                  <ListGroup.Item><FaBuilding className="view-modal-icon" /> <strong>AWC Name:</strong> {viewItem.awc_name}</ListGroup.Item>
                  <ListGroup.Item><FaHashtag className="view-modal-icon" /> <strong>AWC Code:</strong> {viewItem.awc_code}</ListGroup.Item>
                  <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>Food Item:</strong> {viewItem.food_item}</ListGroup.Item>
                  <ListGroup.Item><FaUsers className="view-modal-icon" /> <strong>Beneficiaries:</strong> {viewItem.total_beneficiaries}</ListGroup.Item>
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
                  {viewItem.sector_status && <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>Sector Status:</strong> <span className={`badge bg-${viewItem.sector_status === 'approved' ? 'success' : 'warning'}`}>{viewItem.sector_status}</span></ListGroup.Item>}
                </ListGroup>
                <hr />
                <Row className="text-muted small">
                   <Col>
                    <FaClock className="me-1" /> 
                    <strong>Recorded:</strong>
                    <br />
                    {new Date(viewItem.created_at).toLocaleString()}
                  </Col>
                  <Col className="text-end">
                     <FaEdit className="me-1" /> 
                     <strong>Updated:</strong>
                     <br />
                     {new Date(viewItem.updated_at).toLocaleString()}
                  </Col>
                </Row>
              </Modal.Body>
              <Modal.Footer className="view-modal-footer">
                <Button variant="secondary" onClick={handleCloseViewModal}>
                  Close
                </Button>
              </Modal.Footer>
            </Modal>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AnganwadiDashboard;