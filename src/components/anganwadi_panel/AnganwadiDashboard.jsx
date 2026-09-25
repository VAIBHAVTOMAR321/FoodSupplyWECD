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
  hcm: "/hcm-food-items/",
  thr: "/thr-food-items/",
  hcm_distribution: "/hcm-anganwadi-distribution/",
  thr_distribution: "/thr-anganwadi-distribution/",
  supplementary_nutrition: "/supplementary-nutrition-anganwadi/",
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  if (currentMonth >= 3) {
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else {
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

const monthOptions = [
  { value: 'apr', label: 'April' }, { value: 'may', label: 'May' }, { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' }, { value: 'aug', label: 'August' }, { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' }, { value: 'nov', label: 'November' }, { value: 'dec', label: 'December' },
  { value: 'jan', label: 'January' }, { value: 'feb', label: 'February' }, { value: 'mar', label: 'March' },
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

// Configuration to map API keys to Food Item Names, Categories, and default properties
const supplementaryFoodConfig = [
  { key: 'quarterly_packets_mung_dal_khichdi', label: 'Mung Dal Khichdi', bene_category: 'Children (6m-3y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_poushik_sattu_mix', label: 'Poushik Sattu Mix', bene_category: 'Children (6m-3y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'panjeeri_75_days_2625gm_quarterly_packets', label: 'Panjeeri 75 days (2625gm)', bene_category: 'SAM Children (6m-6y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'panjeeri_75_days_4625gm_quarterly_packets', label: 'Panjeeri 75 days (4625gm)', bene_category: 'SAM Children (3y-6y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_sattu_2250gm', label: 'Sattu Mix (2250gm)', bene_category: 'SUW Children (6m-6y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_mix_1000gm', label: 'Mix (1000gm)', bene_category: 'SUW Children (3y-6y)', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
  { key: 'quarterly_packets_multi_grain_aata_1250gm', label: 'Multi Grain Aata (1250gm)', bene_category: 'Pregnant Women/Lactating Mothers', unit: 'Packets', qty_per_ben: 1, days_allotted: 75 },
];

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

  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [distributionData, setDistributionData] = useState({ total_beneficiaries: '', date: '', fin_year: '', months: [] });
  const [distributionError, setDistributionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [beneficiaryCount, setBeneficiaryCount] = useState(null);
  const [selectedFoodItem, setSelectedFoodItem] = useState(null);
  const [supplementaryData, setSupplementaryData] = useState(null);

  const { user, api, uniqueId } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [location.search]);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(prev => ({ ...prev, counts: true }));
      setError(prev => ({ ...prev, counts: "" }));
      try {
        const [hcmResponse, thrResponse] = await Promise.all([
          api.get(API_URLS.hcm),
          api.get(API_URLS.thr),
        ]);
        setCounts({ hcm: hcmResponse.data.length, thr: thrResponse.data.length });
      } catch (err) {
        setError(prev => ({ ...prev, counts: "Failed to fetch food item counts." }));
      } finally {
        setLoading(prev => ({ ...prev, counts: false }));
      }
    };
    fetchCounts();
  }, [api]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleCardClick = async (scheme) => {
    if (activeScheme === scheme) {
      setActiveScheme(null);
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
      
      // Fetch Both Distribution Records and Supplementary Nutrition Data
      const [distributionsResponse, suppResponse] = await Promise.all([
        api.get(distributionUrl),
        api.get(API_URLS.supplementary_nutrition)
      ]);

      const supp = suppResponse.data && suppResponse.data.length > 0 ? suppResponse.data[0] : null;
      setSupplementaryData(supp);

      // Generate Food Items dynamically from supplementary API response
      if (supp) {
        const generatedItems = supplementaryFoodConfig
          .filter(config => supp[config.key] > 0)
          .map((config, index) => ({
            id: index + 1,
            food_item: config.label,
            bene_category: config.bene_category,
            unit: config.unit,
            qty_per_ben: config.qty_per_ben,
            days_allotted: config.days_allotted,
            count: supp[config.key] // Attaching beneficiary count directly
          }));
        setFoodItems(generatedItems);
      } else {
        setError(prev => ({ ...prev, table: "सप्लीमेंट्री न्यूट्रिशन डेटा उपलब्ध नहीं है।" }));
      }

      setDistributionRecords(distributionsResponse.data);
    } catch (err) {
      setError(prev => ({ ...prev, table: `Failed to fetch ${scheme.toUpperCase()} items.` }));
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  };

  const handleOpenDistributionModal = async (item, scheme, existingRecord = null, isNew = false) => {
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
        const existingMonths = Array.isArray(existingRecord.months) ? existingRecord.months : quarterToMonths[existingRecord.quarter] || [];
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          date: existingRecord.date,
          fin_year: existingRecord.fin_year,
          months: existingMonths,
          food_item_id: foodItemDetails?.id,
        });
      } else {
        const existingMonths = Array.isArray(existingRecord.months) ? existingRecord.months : quarterToMonths[existingRecord.quarter] || [];
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          fin_year: existingRecord.fin_year,
          months: existingMonths,
          food_item_id: foodItemDetails?.id,
        });
      }
    } else {
      setDistributionData({
        total_beneficiaries: '',
        date: new Date().toISOString().split('T')[0],
        fin_year: getCurrentFinancialYear(),
        months: [],
        food_item_id: '',
      });
    }

    setDistributionError('');
    setBeneficiaryCount(null);
    setShowDistributionModal(true);
  };

  const handleCloseDistributionModal = () => {
    setShowDistributionModal(false);
    setSelectedItem(null);
    setBeneficiaryCount(null);
    setSelectedFoodItem(null);
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

    if (!distributionData.total_beneficiaries || !distributionData.fin_year || !distributionData.months?.length || (!isThr && !distributionData.date)) {
      setDistributionError("कृपया सभी आवश्यक फ़ील्ड भरें।");
      setSubmitting(false);
      return;
    }

    const isEdit = selectedItem.isEdit;
    const calculatedQuantity = parseFloat(selectedFoodItemDetails.qty_per_ben) * parseInt(distributionData.total_beneficiaries, 10);

    let payload = {
      food_item: selectedFoodItemDetails.food_item,
      total_beneficiaries: parseInt(distributionData.total_beneficiaries, 10),
      quantity: isNaN(calculatedQuantity) ? 0 : calculatedQuantity,
      unit: selectedFoodItemDetails.unit,
      bene_category: selectedFoodItemDetails.bene_category,
    };

    payload.fin_year = distributionData.fin_year;
    payload.months = distributionData.months;

    if (isThr) {
      payload.quarter = distributionData.months;
    } else {
      payload.date = distributionData.date;
    }

    const url = activeScheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution;
    const method = isEdit ? 'put' : 'post';

    try {
      await api[method](url, payload);
      alert(`Distribution ${isEdit ? 'updated' : 'recorded'} successfully!`);
      handleCloseDistributionModal();
      handleCardClick(activeScheme);
    } catch (err) {
      setDistributionError(`वितरण ${isEdit ? 'अपडेट' : 'रिकॉर्ड'} करने में विफल। कृपया पुन: प्रयास करें।`);
    } finally {
      setSubmitting(false);
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
            <h3 className="mb-4 fw-bold">Anganwadi Dashboard</h3>
          </div>
          <Row>
            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card className={`card-hcm ${activeScheme === 'hcm' ? 'active' : ''}`} onClick={() => handleCardClick('hcm')}>
                <Card.Body>
                  <FaUtensils className="card-icon" />
                  <Card.Title>HCM Food Items</Card.Title>
                  {loading.counts ? <Spinner animation="border" size="sm" /> : <h2 className="fw-bold">{counts.hcm}</h2>}
                  <Card.Text className="d-flex align-items-center">
                    Total Items {activeScheme === 'hcm' ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6} md={6} xs={12} className="mb-4">
              <Card className={`card-thr ${activeScheme === 'thr' ? 'active' : ''}`} onClick={() => handleCardClick('thr')}>
                <Card.Body>
                  <FaBoxOpen className="card-icon" />
                  <Card.Title>THR Food Items</Card.Title>
                  {loading.counts ? <Spinner animation="border" size="sm" /> : <h2 className="fw-bold">{counts.thr}</h2>}
                  <Card.Text className="d-flex align-items-center">
                    Total Items {activeScheme === 'thr' ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>

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
                ) : distributionRecords.length === 0 ? (
                  <div className="empty-state">No distribution records found for {activeScheme.toUpperCase()}.</div>
                ) : (
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Food Item</th>
                        {activeScheme === 'hcm' ? <th>Date</th> : <><th>Fin. Year</th><th>Months</th></>}
                        <th>Total Beneficiaries</th>
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
                          {activeScheme === 'hcm' ? <td>{new Date(record.date).toLocaleDateString()}</td> : <><td>{record.fin_year}</td><td>{formatMonths(record.months || record.quarter)}</td></>}
                          <td>{record.total_beneficiaries}</td>
                          <td>{record.quantity}</td>
                          <td>{record.unit}</td>
                          <td>
                            <Button variant="outline-info" size="sm" className="me-2" onClick={() => setViewItem(record) & setShowViewModal(true)}>
                              <FaEye />
                            </Button>
                            <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenDistributionModal(record, activeScheme, record)}>
                              <FaEdit />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={async () => {
                               if(window.confirm(`Delete ${record.food_item}?`)) {
                                 await api.delete(activeScheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution, { data: { id: record.id }});
                                 handleCardClick(activeScheme);
                               }
                            }}>
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
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
                        
                        // 1. Clear Previous Data
                        setDistributionData({
                          food_item_id: newFoodItemId,
                          total_beneficiaries: '',
                          date: activeScheme === 'hcm' ? new Date().toISOString().split('T')[0] : '',
                          fin_year: getCurrentFinancialYear(),
                          months: []
                        });
                        setBeneficiaryCount(null);
                        setDistributionError('');

                        if (!newFoodItemId) return;

                        const currentFoodItem = foodItems.find(fi => fi.id === parseInt(newFoodItemId, 10));
                        if (!currentFoodItem) return;

                        // 2. Auto-fill from fetched supplementary data
                        if (currentFoodItem.count !== undefined) {
                          const count = currentFoodItem.count;
                          
                          setDistributionData(prev => ({
                            ...prev,
                            total_beneficiaries: count.toString(),
                          }));

                          setBeneficiaryCount(count);

                          if (count === 0) {
                            setDistributionError(`"${currentFoodItem.bene_category}" के लिए डेटा में कोई लाभार्थी नहीं मिला।`);
                          }
                        }
                      }}
                    >
                      <option value="">Select a food item...</option>
                      {foodItems
                        .filter(item => {
                          // Retain item if in Edit Mode
                          if (selectedItem?.isEdit && selectedItem.food_item === item.food_item) return true;
                          
                          // Remove previously distributed items
                          const alreadyDistributed = distributionRecords.some(rec => rec.food_item === item.food_item);
                          if (alreadyDistributed) return false;

                          return true;
                        })
                        .map(item => [
                          <option key={item.id} value={item.id} style={{ fontWeight: 'bold' }}>
                            {item.food_item}
                          </option>,
                          <option key={`${item.id}-cat`} disabled style={{ color: '#6c757d', paddingLeft: '15px' }}>&nbsp;&nbsp;↳ Category: {item.bene_category}</option>
                        ])
                      }
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Total Beneficiaries</Form.Label>
                    <Form.Control
                      type="text"
                      value={distributionData.total_beneficiaries}
                      onChange={(e) => setDistributionData({ ...distributionData, total_beneficiaries: e.target.value })}
                      placeholder="Enter number of beneficiaries"
                      required
                      disabled={beneficiaryCount === 0}
                    />
                    {beneficiaryCount !== null && (
                      <Form.Text className={beneficiaryCount > 0 ? "text-success" : "text-danger"}>
                        Auto-fetched Beneficiaries: {beneficiaryCount}
                      </Form.Text>
                    )}
                  </Form.Group>

                  {activeScheme === 'hcm' ? (
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={distributionData.date || ''}
                        onChange={(e) => setDistributionData({ ...distributionData, date: e.target.value })}
                        required
                      />
                    </Form.Group>
                  ) : null}

                  <Form.Group className="mb-3">
                    <Form.Label>Financial Year</Form.Label>
                    <Form.Control
                      type="text"
                      value={distributionData.fin_year} disabled
                      required
                    />
                  </Form.Group>
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
                          checked={distributionData.months?.includes(month.value) || false}
                          onChange={(e) => {
                            const nextMonths = e.target.checked
                              ? [...new Set([...(distributionData.months || []), month.value])]
                              : (distributionData.months || []).filter((m) => m !== month.value);
                            setDistributionData({ ...distributionData, months: nextMonths });
                          }}
                        />
                      ))}
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control type="text" value={selectedFoodItemForCalc?.bene_category || ''} disabled />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Total Quantity</Form.Label>
                    <Form.Control
                      type="text"
                      value={selectedFoodItemForCalc ? `${calculatedQuantity} ${selectedFoodItemForCalc.unit}` : '0.00'}
                      disabled
                    />
                    <Form.Text>({selectedFoodItemForCalc?.qty_per_ben || 0} {selectedFoodItemForCalc?.unit} per beneficiary)</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                    <Form.Control type="text" value={selectedFoodItemForCalc?.unit || ''} disabled />
                  </Form.Group>

                  <div className="d-flex justify-content-end">
                    <Button variant="secondary" onClick={handleCloseDistributionModal} className="me-2">Cancel</Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={submitting || beneficiaryCount === 0}
                    >
                      {submitting ? <Spinner as="span" animation="border" size="sm" /> : (selectedItem.isEdit ? 'Update' : 'Submit')}
                    </Button>
                  </div>
                </Form>
              </Modal.Body>
            </Modal>
          )}

          {viewItem && (
            <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>View Distribution: {viewItem.food_item}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <ListGroup variant="flush">
                  <ListGroup.Item><FaUtensils className="me-2" /> <strong>Food Item:</strong> {viewItem.food_item}</ListGroup.Item>
                  <ListGroup.Item><FaUsers className="me-2" /> <strong>Beneficiaries:</strong> {viewItem.total_beneficiaries}</ListGroup.Item>
                  <ListGroup.Item><FaWeightHanging className="me-2" /> <strong>Quantity:</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                  {viewItem.date ? (
                    <ListGroup.Item><FaCalendarDay className="me-2" /> <strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                  ) : (
                    <>
                      <ListGroup.Item><FaCalendarDay className="me-2" /> <strong>Financial Year:</strong> {viewItem.fin_year}</ListGroup.Item>
                      <ListGroup.Item><FaCubes className="me-2" /> <strong>Months:</strong> {formatMonths(viewItem.months || viewItem.quarter)}</ListGroup.Item>
                    </>
                  )}
                </ListGroup>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
              </Modal.Footer>
            </Modal>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AnganwadiDashboard;