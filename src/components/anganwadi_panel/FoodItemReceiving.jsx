import React, { useState, useEffect } from "react";
import { Container, Tabs, Tab, Form, Button, Table, Modal, Spinner, Alert, Row, Col } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";

import "../../assets/css/anganwadileftnav.css";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiDashboard.css";
import { FaEdit, FaTrash } from "react-icons/fa";

const API_URLS = {
  hcm_receiving: "/hcm-anganwadi-receiving/",
  thr_receiving: "/thr-anganwadi-receiving/",
  hcm_items: "/hcm-food-items/",
  thr_items: "/thr-food-items/",
  beneficiary_categories: "/beneficiary-categories/",
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  return currentMonth >= 3 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
};

const allQuarters = [
  { value: 'apr-may-jun', label: 'April-May-June' },
  { value: 'jul-aug-sep', label: 'July-August-September' },
  { value: 'oct-nov-dec', label: 'October-November-December' },
  { value: 'jan-feb-mar', label: 'January-February-March' },
];

const FoodItemReceiving = () => {
  const { api } = useAuth();

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

  const [filters, setFilters] = useState({ fin_year: '', quarter: '' });
  const [uniqueFilterOptions, setUniqueFilterOptions] = useState({
    hcm: { fin_year: [], quarter: [] },
    thr: { fin_year: [], quarter: [] },
  });

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
      const hcmData = hcmRec.data || [];
      const thrData = thrRec.data || [];

      setHcmReceivings(hcmData);
      setThrReceivings(thrData);
      setHcmFoodItems(hcmItems.data || []);
      setThrFoodItems(thrItems.data || []);
      setBeneficiaryCategories(benCategories.data || []);

      // Extract unique filter options for each tab
      setUniqueFilterOptions({
        hcm: {
          fin_year: [...new Set(hcmData.map(item => item.fin_year).filter(Boolean))],
          quarter: [...new Set(hcmData.map(item => item.quarter).filter(Boolean))],
        },
        thr: {
          fin_year: [...new Set(thrData.map(item => item.fin_year).filter(Boolean))],
          quarter: [...new Set(thrData.map(item => item.quarter).filter(Boolean))],
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
    // Reset filters when tab changes
    setFilters({ fin_year: '', quarter: '' });
  }, [activeTab]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.fin_year) params.append('fin_year', filters.fin_year);
    if (filters.quarter) params.append('quarter', filters.quarter);

    const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
    try {
      const response = await api.get(`${url}?${params.toString()}`);
      if (activeTab === 'thr') {
        setThrReceivings(response.data || []);
      } else {
        setHcmReceivings(response.data || []);
      }
    } catch (err) {
      setError(`Failed to fetch filtered data. Please try again.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Sidebar
  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    const isThr = activeTab === 'thr';
    setFormData(item ? {
      ...item,
      date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
    } : {
      food_item: '',
      quantity: '',
      bene_category: '',
      date: new Date().toISOString().split('T')[0],
      fin_year: isThr ? getCurrentFinancialYear() : '',
      quarter: '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
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
      unit: selectedFoodItem.unit,
      quantity: parseFloat(formData.quantity),
    };

    if (editingItem) {
      payload.id = editingItem.id;
    }

    const url = isThr ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
    const method = editingItem ? 'put' : 'post';

    try {
      await api[method](url, payload);
      handleCloseModal();
      fetchData(); // Refresh data
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
        fetchData(); // Refresh data
      } catch (err) {
        alert("Failed to delete record.");
        console.error(err);
      }
    }
  };

  const renderTable = (records) => {
    const isThr = activeTab === 'thr';
    return (
      <Table striped bordered hover responsive className="mt-4">
        <thead>
          <tr>
            <th>#</th>
            <th>Food Item</th>
            <th>Quantity</th>
            <th>Beneficiary Category</th>
            <th>Unit</th>
            <th>Date</th>
            {isThr && <><th>Fin. Year</th><th>Quarter</th></>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? records.map((rec, index) => (
            <tr key={rec.id}>
              <td>{index + 1}</td>
              <td>{rec.food_item}</td>
              <td>{rec.quantity}</td>
              <td>{rec.bene_category}</td>
              <td>{rec.unit}</td>
              <td>{new Date(rec.date).toLocaleDateString()}</td>
              {isThr && <><td>{rec.fin_year}</td><td>{rec.quarter}</td></>}
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
              <td colSpan={isThr ? "9" : "7"} className="text-center">No records found.</td>
            </tr>
          )}
        </tbody>
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
              {currentFilters.fin_year.map(year => <option key={year} value={year}>{year}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group>
            <Form.Label>Quarter</Form.Label>
            <Form.Select name="quarter" value={filters.quarter} onChange={handleFilterChange}>
              <option value="">All Quarters</option>
              {currentFilters.quarter.map(q => <option key={q} value={q}>{q}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-end">
          <Button onClick={applyFilters} className="me-2">Apply Filters</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setFilters({ fin_year: '', quarter: '' });
              // Refetch all data for the current tab after resetting
              const url = activeTab === 'thr' ? API_URLS.thr_receiving : API_URLS.hcm_receiving;
              api.get(url).then(response => {
                if (activeTab === 'thr') setThrReceivings(response.data || []);
                else setHcmReceivings(response.data || []);
              });
            }}
          >
            Reset
          </Button>
        </Col>
      </Row>
    );
  };

  // Responsive
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
            <Button onClick={() => handleOpenModal()}>Add New Receiving</Button>
          </div>

          {loading && <div className="text-center"><Spinner animation="border" /></div>}
          {error && <Alert variant="danger">{error}</Alert>}

          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="receiving-tabs" className="mb-3">
            <Tab eventKey="hcm" title="HCM Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">HCM Receiving Records</h5>
                  {renderFilters()}
                  {renderTable(hcmReceivings)}
                </>
              )}
            </Tab>
            <Tab eventKey="thr" title="THR Receiving">
              {!loading && !error && (
                <>
                  <h5 className="mt-4">THR Receiving Records</h5>
                  {renderFilters()}
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
                      {(activeTab === 'hcm' ? hcmFoodItems : thrFoodItems).map(item => (
                        <option key={item.id} value={item.food_item}>{item.food_item}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleFormChange}
                      placeholder="Enter quantity"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Form.Group className="mb-3">
                    <Form.Label>Beneficiary Category</Form.Label>
                    <Form.Select name="bene_category" value={formData.bene_category || ''} onChange={handleFormChange} required>
                      <option value="">Select Category</option>
                      {beneficiaryCategories.map(cat => (
                        <option key={cat.id} value={cat.category_name}>
                          {cat.category_name}
                        </option>
                      ))}
                    </Form.Select>
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
                {activeTab === 'thr' && (
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
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quarter</Form.Label>
                        <Form.Select
                          name="quarter"
                          value={formData.quarter || ''}
                          onChange={handleFormChange}
                          required
                        >
                          <option value="">Select Quarter</option>
                          {allQuarters.map(q => (
                            <option key={q.value} value={q.value}>{q.label}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </>
                )}
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

export default FoodItemReceiving;