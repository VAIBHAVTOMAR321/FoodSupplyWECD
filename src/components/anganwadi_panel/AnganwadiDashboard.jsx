import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Alert, Button, Modal, Form, ListGroup } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/anganwadileftnav.css";
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
};

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

const allQuarters = [
  { value: 'apr-may-jun', label: 'April-May-June' },
  { value: 'jul-aug-sep', label: 'July-August-September' },
  { value: 'oct-nov-dec', label: 'October-November-December' },
  { value: 'jan-feb-mar', label: 'January-February-March' },
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
  
  // State for distribution modal
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [distributionData, setDistributionData] = useState({ total_beneficiaries: '', date: '', fin_year: '', quarter: '' });
  const [distributionError, setDistributionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const { user, api, uniqueId } = useAuth();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);


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
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, counts: false }));
      }
    };
    fetchCounts();
  }, [api, API_URLS.hcm, API_URLS.thr]);

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
      const [itemsResponse, distributionsResponse] = await Promise.all([
        api.get(API_URLS[scheme]),
        api.get(distributionUrl)
      ]);

      setFoodItems(itemsResponse.data);
      setDistributionRecords(distributionsResponse.data);
    } catch (err) {
      setError(prev => ({ ...prev, table: `Failed to fetch ${scheme.toUpperCase()} items.` }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, table: false }));
    }
  };

  const handleOpenDistributionModal = (item, scheme, existingRecord = null, isNew = false) => {
    // If editing, the `item` is the distribution record, which also has food_item details
    // If adding, the `item` is the food item from the list
    let modalItem;
    if (isNew) {
      // For brand new entries from the main button
      modalItem = { scheme, isNew: true };
    } else if (existingRecord) {
      // Find the full food item details from the list to get qty_per_ben
      const fullFoodItem = foodItems.find(fi => fi.food_item === existingRecord.food_item);
      modalItem = { ...item, ...existingRecord, scheme, isEdit: true };
      modalItem = { ...fullFoodItem, ...existingRecord, scheme, isEdit: true };
    } else {
      // This case might be deprecated if we only add from the new modal
      // This is for adding a distribution from the food item list (not used anymore)
      modalItem = { ...item, scheme };
    }

    setSelectedItem(modalItem);

    if (existingRecord) {
      if (scheme === 'hcm') {
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          date: existingRecord.date,
        });
      } else { // thr
        setDistributionData({
          total_beneficiaries: existingRecord.total_beneficiaries,
          fin_year: existingRecord.fin_year,
          quarter: existingRecord.quarter,
        });
      }
    } else {
      setDistributionData({ 
        total_beneficiaries: '',
        date: new Date().toISOString().split('T')[0], 
        fin_year: scheme === 'thr' ? getCurrentFinancialYear() : '', 
        quarter: '' 
      });
    }

    setDistributionError('');
    setShowDistributionModal(true);
  };

  const handleCloseDistributionModal = () => {
    setShowDistributionModal(false);
    setSelectedItem(null);
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

    // If it's a new entry, a food item must be selected from the dropdown.
    if (selectedItem.isNew && !distributionData.food_item_id) {
      setDistributionError("Please select a food item.");
      return;
    }

    const isThr = activeScheme === 'thr';
    const commonFieldsFilled = selectedItem && distributionData.total_beneficiaries;
    const schemeFieldsFilled = isThr
      ? distributionData.fin_year && distributionData.quarter
      : distributionData.date;

    const selectedFoodItemDetails = selectedItem.isNew ? foodItems.find(fi => fi.id === parseInt(distributionData.food_item_id, 10)) : selectedItem;


    if (!commonFieldsFilled || !schemeFieldsFilled) {
      setDistributionError("Please fill all required fields.");
      return;
    }

    // Prevent duplicate entries for THR
    if (isThr) {
      const duplicate = distributionRecords.find(
        (rec) => {
          // When editing, selectedItem.id is the distribution record id.
          // When adding, selectedItem.id is the food item id, so it won't match a distribution record id.
          const isSameRecord = selectedItem.isEdit && rec.id === selectedItem.id;
          return !isSameRecord && // Don't compare against itself when editing
                 rec.food_item === selectedItem.food_item &&
                 rec.fin_year === distributionData.fin_year &&
                 rec.quarter === distributionData.quarter;
        }
      );
      if (duplicate) {
        setDistributionError(`A distribution for ${distributionData.fin_year} - ${distributionData.quarter} already exists.`);
        return;
      }
    }

    setSubmitting(true);
    setDistributionError('');

    const isEdit = selectedItem.isEdit;
    const calculatedQuantity = parseFloat(selectedFoodItemDetails.qty_per_ben) * parseInt(distributionData.total_beneficiaries, 10);

    let payload = {
      food_item: selectedFoodItemDetails.food_item,
      total_beneficiaries: parseInt(distributionData.total_beneficiaries, 10),
      quantity: isNaN(calculatedQuantity) ? 0 : calculatedQuantity,
      unit: selectedFoodItemDetails.unit,
    };

    if (isThr) {
      payload.fin_year = distributionData.fin_year;
      payload.quarter = distributionData.quarter;
    } else {
      payload.date = distributionData.date;
    }

    if (isEdit) {
      payload.id = selectedItem.id;
    } else {
      // For new entries, get food_item from dropdown selection
      const selectedFoodItem = foodItems.find(fi => fi.id === parseInt(distributionData.food_item_id, 10));
      payload.food_item = selectedFoodItem.food_item;
    }

    const url = activeScheme === 'hcm' ? API_URLS.hcm_distribution : API_URLS.thr_distribution;
    const method = isEdit ? 'put' : 'post';

    try {
      await api[method](url, payload);
      alert(`Distribution ${isEdit ? 'updated' : 'recorded'} successfully!`);
      handleCloseDistributionModal();
      // Refresh the table data
      handleCardClick(activeScheme);
    } catch (err) {
      setDistributionError(`Failed to ${isEdit ? 'update' : 'record'} distribution. Please try again.`);
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
        // Refresh the table data
        handleCardClick(activeScheme);
      } catch (err) {
        alert('Failed to delete distribution record.');
        console.error(err);
      }
    }
  };

  const selectedFoodItemForCalc = selectedItem?.isNew
    ? foodItems.find(fi => fi.id === parseInt(distributionData.food_item_id, 10))
    : selectedItem;

  const calculatedQuantity = selectedFoodItemForCalc
    ? (parseFloat(selectedFoodItemForCalc.qty_per_ben) * (parseInt(distributionData.total_beneficiaries, 10) || 0)).toFixed(2)
    : '0.00';

  const availableQuarters = selectedItem && activeScheme === 'thr'
    ? allQuarters.filter(q => {
        // Check if a record exists for this quarter, food item, and financial year
        const isUsedByAnotherRecord = distributionRecords.some(rec => {
          // Check if the record is for the same period but is not the one currently being edited.
          const isDifferentRecord = selectedItem.isEdit ? rec.id !== selectedItem.id : true;
          return isDifferentRecord &&
                 rec.food_item === selectedItem.food_item &&
                 rec.fin_year === distributionData.fin_year &&
                 rec.quarter === q.value;
        });
        return !isUsedByAnotherRecord;
      })
    : allQuarters;

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
                        {activeScheme === 'hcm' ? <th>Date</th> : <><th>Fin. Year</th><th>Quarter</th></>}
                        <th>Beneficiaries</th>
                        {activeScheme === 'hcm' && <th>Beneficiaries Enrolled in AWC</th>}
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
                          {activeScheme === 'hcm' ? <td>{new Date(record.date).toLocaleDateString()}</td> : <><td>{record.fin_year}</td><td>{record.quarter}</td></>}
                          <td>{record.total_beneficiaries}</td>
                          {activeScheme === 'hcm' && <td>{record.bene_in_ang}</td>}
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
                          </tr>
                        </thead>
                        <tbody>
                          {foodItems.map((item, index) => (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td>{item.food_item}</td>
                              <td>{item.qty_per_ben}</td>
                              <td>{item.unit}</td>
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
            <Modal show={showDistributionModal} onHide={handleCloseDistributionModal} centered>
              <Modal.Header closeButton>
                <Modal.Title>{selectedItem.isEdit ? 'Edit' : 'Record'} Distribution {selectedItem.food_item ? `for ${selectedItem.food_item}` : ''}</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {distributionError && <Alert variant="danger">{distributionError}</Alert>}
                <Form onSubmit={handleDistributionSubmit}>
                  {selectedItem.isNew ? (
                    <Form.Group className="mb-3">
                      <Form.Label>Food Item</Form.Label>
                      <Form.Select
                        required
                        value={distributionData.food_item_id || ''}
                        onChange={(e) => setDistributionData({ ...distributionData, food_item_id: e.target.value })}
                      >
                        <option value="">Select a food item...</option>
                        {foodItems.map(item => <option key={item.id} value={item.id}>{item.food_item}</option>)}
                      </Form.Select>
                    </Form.Group>
                  ) : (
                    <Form.Group className="mb-3"><Form.Label>Food Item</Form.Label><Form.Control type="text" value={selectedItem.food_item} disabled /></Form.Group>
                  )}
                  <Form.Group className="mb-3">
                    <Form.Label>Total Beneficiaries</Form.Label>
                    <Form.Control 
                      type="number" 
                      value={distributionData.total_beneficiaries}
                      onChange={(e) => setDistributionData({ ...distributionData, total_beneficiaries: e.target.value })}
                      placeholder="Enter number of beneficiaries"
                      required
                    />
                  </Form.Group>
                  {activeScheme === 'hcm' ? (
                    <Form.Group className="mb-3">
                      <Form.Label>Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        value={distributionData.date}
                        onChange={(e) => setDistributionData({ ...distributionData, date: e.target.value })}
                        required
                      />
                    </Form.Group>
                  ) : (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Financial Year</Form.Label>
                        <Form.Control type="text" placeholder="e.g., 2025-26" value={distributionData.fin_year} onChange={(e) => setDistributionData({...distributionData, fin_year: e.target.value})} required />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Quarter</Form.Label>
                        <Form.Select value={distributionData.quarter} onChange={(e) => setDistributionData({ ...distributionData, quarter: e.target.value })} required>
                          <option value="">Select Quarter</option>
                          {availableQuarters.map(q => (
                            <option key={q.value} value={q.value}>{q.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </>
                  )}
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
                    <Button variant="primary" type="submit" disabled={submitting}>
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
                  <ListGroup.Item><FaUsers className="view-modal-icon" /> <strong>Beneficiaries in Anganwadi:</strong> {viewItem.bene_in_ang}</ListGroup.Item>
                  <ListGroup.Item><FaUtensils className="view-modal-icon" /> <strong>Food Item:</strong> {viewItem.food_item}</ListGroup.Item>
                  <ListGroup.Item><FaUsers className="view-modal-icon" /> <strong>Beneficiaries:</strong> {viewItem.total_beneficiaries}</ListGroup.Item>
                  <ListGroup.Item><FaWeightHanging className="view-modal-icon" /> <strong>Quantity:</strong> {viewItem.quantity} {viewItem.unit}</ListGroup.Item>
                  {viewItem.date ? (
                    <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Date:</strong> {new Date(viewItem.date).toLocaleDateString()}</ListGroup.Item>
                  ) : (
                    <>
                      <ListGroup.Item><FaCalendarDay className="view-modal-icon" /> <strong>Financial Year:</strong> {viewItem.fin_year}</ListGroup.Item>
                      <ListGroup.Item><FaCubes className="view-modal-icon" /> <strong>Quarter:</strong> {viewItem.quarter}</ListGroup.Item>
                    </>
                  )}
                  <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>Sector:</strong> {viewItem.sector}</ListGroup.Item>
                  <ListGroup.Item><FaProjectDiagram className="view-modal-icon" /> <strong>Project:</strong> {viewItem.project}</ListGroup.Item>
                  <ListGroup.Item><FaMapMarkerAlt className="view-modal-icon" /> <strong>District:</strong> {viewItem.district}</ListGroup.Item>
                  {viewItem.cdpo_status && <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>CDPO Status:</strong> <span className={`badge bg-${viewItem.cdpo_status === 'approved' ? 'success' : 'warning'}`}>{viewItem.cdpo_status}</span></ListGroup.Item>}
                  {viewItem.dpo_status && <ListGroup.Item><FaInfoCircle className="view-modal-icon" /> <strong>DPO Status:</strong> <span className={`badge bg-${viewItem.dpo_status === 'approved' ? 'success' : 'warning'}`}>{viewItem.dpo_status}</span></ListGroup.Item>}
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