import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Modal, Form, Pagination, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/itcellLeftnav.css";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const ITCellTHRDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [selectedItems, setSelectedItems] = useState([]);

  const [filters, setFilters] = useState({
    finYear: [],
    quarter: [],
    district: [],
    project: [],
  });
  const [uniqueFinYears, setUniqueFinYears] = useState([]);
  const [uniqueQuarters, setUniqueQuarters] = useState([]);
  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [uniqueProjects, setUniqueProjects] = useState([]);

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

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/thr-director-distributions/");
      const data = response.data?.data || [];
      setDistributions(Array.isArray(data) ? data : []);
      setUniqueFinYears([...new Set(data.map(item => item.fin_year))]);
      setUniqueQuarters([...new Set(data.map(item => item.quarter))]);
      setUniqueDistricts([...new Set(data.map(item => item.district))]);
      setUniqueProjects([...new Set(data.map(item => item.project))]);
    } catch (err) {
      setError("Failed to fetch THR distributions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (api) {
      fetchDistributions();
    }
  }, [api, fetchDistributions]);

  const filteredData = useMemo(() => {
    return distributions.filter(item => {
      const { finYear, quarter, district, project } = filters;
      return (finYear.length === 0 || finYear.includes(item.fin_year)) &&
             (quarter.length === 0 || quarter.includes(item.quarter)) &&
             (district.length === 0 || district.includes(item.district)) &&
             (project.length === 0 || project.includes(item.project));
    });
  }, [distributions, filters]);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      total_beneficiaries: item.total_beneficiaries,
      quantity: item.quantity,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.total_beneficiaries || isNaN(formData.total_beneficiaries) || Number(formData.total_beneficiaries) < 0) {
      errors.total_beneficiaries = "Must be a non-negative number.";
    }
    if (!formData.quantity || isNaN(formData.quantity) || Number(formData.quantity) < 0) {
      errors.quantity = "Must be a non-negative number.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        id: editingItem.id,
        ...formData,
      };
      await api.put("/thr-director-distributions/", payload);
      setSuccessMsg("Distribution updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
      handleCloseModal();
      fetchDistributions(); // Refresh data
    } catch (err) {
      setFormErrors({ api: "Failed to update distribution. Please try again." });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(currentItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) {
      setError("Please select items to delete.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items?`)) {
      setLoading(true);
      try {
        await api.delete("/thr-director-distributions/", { data: { id: selectedItems } });
        setSuccessMsg("Selected distributions deleted successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
        setSelectedItems([]);
        fetchDistributions(); // Refresh data
      } catch (err) {
        setError("Failed to delete selected distributions.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    items.push(<Pagination.First key="first" onClick={() => paginate(1)} disabled={currentPage === 1} />);
    items.push(<Pagination.Prev key="prev" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} />);
    for (let i = startPage; i <= endPage; i++) {
      items.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => paginate(i)}>{i}</Pagination.Item>);
    }
    items.push(<Pagination.Next key="next" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} />);
    items.push(<Pagination.Last key="last" onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} />);
    return <Pagination>{items}</Pagination>;
  };

  const FilterDropdown = ({ title, items, selected, onSelect }) => (
    <Dropdown>
      <Dropdown.Toggle variant="outline-secondary" id={`dropdown-${title.toLowerCase()}`} className="w-100">
        {selected.length ? `${selected.length} ${title}(s) selected` : `All ${title}s`}
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {items.map(item => (
          <Dropdown.Item key={item} as="div">
            <Form.Check
              type="checkbox"
              label={item}
              checked={selected.includes(item)}
              onChange={() => onSelect(item)}
            />
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );

  return (
    <div className="dashboard-container">
      <ITCellLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading">
            <h3 className="mb-3 fw-bold">THR Distributions Management</h3>
            <div className="d-flex justify-content-end mb-3">
              <Button
                variant="danger"
                onClick={handleDeleteSelected}
                disabled={selectedItems.length === 0 || loading}
              >
                <FaTrash className="me-2" /> Delete Selected ({selectedItems.length})
              </Button>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {successMsg && <Alert variant="success">{successMsg}</Alert>}

          <Row className="mb-3 g-3">
            <Col md={3}><FilterDropdown title="Fin. Year" items={uniqueFinYears} selected={filters.finYear} onSelect={(val) => handleMultiSelectChange('finYear', val)} /></Col>
            <Col md={3}><FilterDropdown title="Quarter" items={uniqueQuarters} selected={filters.quarter} onSelect={(val) => handleMultiSelectChange('quarter', val)} /></Col>
            <Col md={3}><FilterDropdown title="District" items={uniqueDistricts} selected={filters.district} onSelect={(val) => handleMultiSelectChange('district', val)} /></Col>
            <Col md={3}><FilterDropdown title="Project" items={uniqueProjects} selected={filters.project} onSelect={(val) => handleMultiSelectChange('project', val)} /></Col>
          </Row>

          {loading ? (
            <div className="text-center"><Spinner animation="border" /></div>
          ) : (
            <>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th><Form.Check type="checkbox" onChange={handleSelectAll} checked={selectedItems.length === currentItems.length && currentItems.length > 0} /></th>
                    <th>#</th>
                    <th>AWC Name</th>
                    <th>Food Item</th>
                    <th>Beneficiaries</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Fin. Year</th>
                    <th>Quarter</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={item.id}>
                      <td><Form.Check type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => handleSelectItem(item.id)} /></td>
                      <td>{indexOfFirstItem + index + 1}</td>
                      <td>{item.awc_name} ({item.awc_code})</td>
                      <td>{item.food_item}</td>
                      <td>{item.total_beneficiaries}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.fin_year}</td>
                      <td>{item.quarter}</td>
                      <td>
                        <Button variant="outline-primary" size="sm" onClick={() => handleEdit(item)}>
                          <FaEdit />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="d-flex justify-content-center">
                {renderPagination()}
              </div>
            </>
          )}
        </Container>

        <Modal show={showEditModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Edit THR Distribution</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editingItem && (
              <Form onSubmit={handleFormSubmit}>
                <p><strong>AWC:</strong> {editingItem.awc_name} ({editingItem.awc_code})</p>
                <p><strong>Food Item:</strong> {editingItem.food_item}</p>

                <Form.Group className="mb-3" controlId="total_beneficiaries">
                  <Form.Label>Total Beneficiaries</Form.Label>
                  <Form.Control
                    type="number"
                    name="total_beneficiaries"
                    value={formData.total_beneficiaries || ''}
                    onChange={handleFormChange}
                    isInvalid={!!formErrors.total_beneficiaries}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.total_beneficiaries}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="quantity">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="quantity"
                    value={formData.quantity || ''}
                    onChange={handleFormChange}
                    isInvalid={!!formErrors.quantity}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.quantity}
                  </Form.Control.Feedback>
                </Form.Group>

                {formErrors.api && <Alert variant="danger">{formErrors.api}</Alert>}

                <div className="d-flex justify-content-end">
                  <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : 'Save Changes'}
                  </Button>
                </div>
              </Form>
            )}
          </Modal.Body>
        </Modal>
      </div>
    </div>
  );
};

export default ITCellTHRDistributions;