import React, { useState, useEffect } from "react";
import { Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert, Row, Col } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/directorleftnav.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiDashboard.css";
import { FaEdit, FaTrash } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

const API_URLS = {
  hcm_receiving: "/hcm-food-receiving-items/",
  thr_receiving: "/thr-food-receiving-items/",
  hcm_items: "/hcm-food-items/",
  thr_items: "/thr-food-items/",
  beneficiary_categories: "/beneficiary-categories/",
};

const DirFoodItemReceiving = () => {
  const { api, user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [activeTab, setActiveTab] = useState("hcm");
  const [hcmReceivings, setHcmReceivings] = useState([]);
  const [thrReceivings, setThrReceivings] = useState([]);
  const [hcmFoodItems, setHcmFoodItems] = useState([]);
  const [thrFoodItems, setThrFoodItems] = useState([]);
  const [beneficiaryCategories, setBeneficiaryCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [hcmRec, thrRec, hcmItems, thrItems, benCategories] = await Promise.all([
        api.get(API_URLS.hcm_receiving),
        api.get(API_URLS.thr_receiving),
        api.get(API_URLS.hcm_items),
        api.get(API_URLS.thr_items),
        api.get(API_URLS.beneficiary_categories),
      ]);
      setHcmReceivings(hcmRec.data || []);
      setThrReceivings(thrRec.data || []);
      setHcmFoodItems(hcmItems.data || []);
      setThrFoodItems(thrItems.data || []);
      setBeneficiaryCategories(benCategories.data || []);
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

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setFormData(item ? {
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
    } : {
      food_item: '',
      qty: '',
      bene_category: '',
      date: new Date().toISOString().split('T')[0],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'food_item') {
      const foodItemsList = activeTab === 'hcm' ? hcmFoodItems : thrFoodItems;
      const selectedFoodItem = foodItemsList.find(item => item.food_item === value);
      if (selectedFoodItem) {
        setFormData(prev => ({
          ...prev,
          food_item: value,
          bene_category: selectedFoodItem.bene_category,
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    const isThr = activeTab === 'thr';
    const foodItemsList = isThr ? thrFoodItems : hcmFoodItems;
    const selectedFoodItem = foodItemsList.find(fi => fi.food_item === formData.food_item);

    if (!selectedFoodItem) {
      setFormError("Invalid food item selected.");
      setSubmitting(false);
      return;
    }

    let payload = {
      ...formData,
      qty: parseFloat(formData.qty),
      created_by: user?.role || 'director',
      updated_by: user?.role || 'director',
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

  const renderTable = (records) => {
    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Food Item</th>
            <th>Beneficiary Category</th>
            <th>Quantity</th>
            <th>Unit</th>
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
              <td>{rec.qty}</td>
              <td>{rec.unit}</td>
              <td>
                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenModal(rec)}>
                  <FaEdit />
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(rec.id)}>
                  <FaTrash />
                </Button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="7" className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
      </Table>
    );
  };

  const renderFilters = () => {
    return null;
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
      <DirectorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="fw-bold mb-4">
              Food Item Receiving
            </h3>
            <Button onClick={() => handleOpenModal()}>Add New Receiving</Button>
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">
            <Tab eventKey="hcm" title="HCM Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">HCM Receiving Records</h5>
                  {renderTable(hcmReceivings)}
                </>
              )}
            </Tab>
            <Tab eventKey="thr" title="THR Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">THR Receiving Records</h5>
                  {renderTable(thrReceivings)}
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
                    <Form.Label>Food Item</Form.Label>
                    <Form.Select
                      name="food_item"
                      value={formData.food_item || ''}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select Food Item</option>
                      {(activeTab === 'hcm' ? hcmFoodItems : thrFoodItems).map(item => [
                        <option key={item.id} value={item.food_item} style={{ fontWeight: 'bold' }}>
                          {item.food_item}
                        </option>,
                        <option key={`${item.id}-cat`} disabled style={{ color: '#6c757d', paddingLeft: '15px' }}>&nbsp;&nbsp;↳ Category: {item.bene_category}</option>
                      ])}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="qty"
                      value={formData.qty || ''}
                      onChange={handleFormChange}
                      placeholder="Enter quantity"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                     <Form.Control
                       type="text"
                       name="unit"
                       value={formData.unit || ''}
                       onChange={handleFormChange}
                     />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Control type="text" name="bene_category" value={formData.bene_category || ''} readOnly disabled />
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
      </div>
    </div>
  );
};

export default DirFoodItemReceiving;