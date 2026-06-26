import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Spinner, Table, Button, Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import "../../assets/css/DirectorFoodItems.css";

const API_URLS = {
  hcm: "/hcm-food-items/",
  thr: "/thr-food-items/",
};

const DirectorFoodItems = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  const { api } = useAuth();

  const [hcmItems, setHcmItems] = useState([]);
  const [thrItems, setThrItems] = useState([]);
  const [loading, setLoading] = useState({ hcm: false, thr: false });
  const [error, setError] = useState({ hcm: "", thr: "" });

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ scheme: "", item: null });
  const [formData, setFormData] = useState({ food_item: "", qty_per_ben: "", unit: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async (scheme) => {
    setLoading(prev => ({ ...prev, [scheme]: true }));
    setError(prev => ({ ...prev, [scheme]: "" }));
    try {
      const response = await api.get(API_URLS[scheme]);
      if (scheme === 'hcm') setHcmItems(response.data);
      if (scheme === 'thr') setThrItems(response.data);
    } catch (err) {
      setError(prev => ({ ...prev, [scheme]: `Failed to fetch ${scheme.toUpperCase()} items.` }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, [scheme]: false }));
    }
  }, [api]);

  useEffect(() => {
    fetchData('hcm');
    fetchData('thr');

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleShowModal = (scheme, item = null) => {
    setModalConfig({ scheme, item });
    setFormData(item ? { food_item: item.food_item, qty_per_ben: item.qty_per_ben, unit: item.unit } : { food_item: "", qty_per_ben: "", unit: "" });
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const validateForm = () => {
    const errors = {};
    if (!formData.food_item.trim()) errors.food_item = "Food item is required.";
    if (!formData.qty_per_ben) errors.qty_per_ben = "Quantity is required.";
    else if (isNaN(formData.qty_per_ben)) errors.qty_per_ben = "Quantity must be a number.";
    if (!formData.unit.trim()) errors.unit = "Unit is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const { scheme, item } = modalConfig;
    const url = API_URLS[scheme];
    const method = item ? 'put' : 'post';
    let payload = { ...formData };
    if (item) {
      payload.id = item.id;
    }

    try {
      // For PUT requests, include the item id in the payload
      await api[method](url, payload);
      handleCloseModal();
      fetchData(scheme);
    } catch (err) {
      setFormErrors({ api: `Failed to ${item ? 'update' : 'add'} item. Please try again.` });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheme, itemId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await api.delete(API_URLS[scheme], { data: { id: itemId } });
        fetchData(scheme);
      } catch (err) {
        alert(`Failed to delete item. Please try again.`);
        console.error(err);
      }
    }
  };

  const renderTable = (scheme, items) => (
    <div className="food-items-table-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{scheme.toUpperCase()} Food Items</h5>
        <Button variant="primary" size="sm" onClick={() => handleShowModal(scheme)}>
          <FaPlus className="me-2" /> Add New Item
        </Button>
      </div>
      {loading[scheme] ? (
        <div className="text-center p-5"><Spinner animation="border" /></div>
        ) : error[scheme] ? (
          <Alert variant="danger">{error[scheme]}</Alert>
        ) : items.length === 0 ? (
          <div className="empty-state">No items found for {scheme.toUpperCase()}.</div>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>Food Item</th>
                <th>Qty Per Beneficiary</th>
                <th>Unit</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.food_item}</td>
                  <td>{item.qty_per_ben}</td>
                  <td>{item.unit}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="btn-action" onClick={() => handleShowModal(scheme, item)}>
                      <FaEdit />
                    </Button>
                    <Button variant="outline-danger" size="sm" className="btn-action" onClick={() => handleDelete(scheme, item.id)}>
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
    </div>
  );

  return (
    <div className="dashboard-container">
      <DirectorLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />
        <div className="food-items-container">
          <Container fluid className="dashboard-box food-items-content">
            <h3 className="page-title">Food Items Management</h3>
            <Tabs defaultActiveKey="hcm" id="food-items-tabs" className="mb-4 food-items-tabs">
              <Tab eventKey="hcm" title="HCM Scheme">
                {renderTable('hcm', hcmItems)}
              </Tab>
              <Tab eventKey="thr" title="THR Scheme">
                {renderTable('thr', thrItems)}
              </Tab>
            </Tabs>
          </Container>
        </div>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>{modalConfig.item ? 'Edit' : 'Add'} {modalConfig.scheme.toUpperCase()} Food Item</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formErrors.api && <Alert variant="danger">{formErrors.api}</Alert>}
            <Form onSubmit={handleFormSubmit}>
              <Form.Group className="mb-3" controlId="food_item">
                <Form.Label>Food Item</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter food item name"
                  value={formData.food_item}
                  onChange={(e) => setFormData({ ...formData, food_item: e.target.value })}
                  isInvalid={!!formErrors.food_item}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.food_item}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="qty_per_ben">
                <Form.Label>Quantity Per Beneficiary</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter quantity"
                  value={formData.qty_per_ben}
                  onChange={(e) => setFormData({ ...formData, qty_per_ben: e.target.value })}
                  isInvalid={!!formErrors.qty_per_ben}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.qty_per_ben}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="unit">
                <Form.Label>Unit</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter unit (e.g., grams, ml)"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  isInvalid={!!formErrors.unit}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.unit}
                </Form.Control.Feedback>
              </Form.Group>

              <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? <Spinner as="span" animation="border" size="sm" /> : 'Save Changes'}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default DirectorFoodItems;