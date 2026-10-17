import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Modal, Form, Pagination, Dropdown } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";
import "../../assets/css/itcellLeftnav.css";
import { FaEdit, FaTrash, FaEye } from "react-icons/fa";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const ITCellTHRDistributions = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const { t } = useLanguage();
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
      setError(t("Failed to fetch THR distributions.", "टीएचआर वितरण प्राप्त नहीं हो सका।"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, t]);

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
      errors.total_beneficiaries = t("Must be a non-negative number.", "कृपया शून्य या उससे अधिक संख्या दर्ज करें।");
    }
    if (!formData.quantity || isNaN(formData.quantity) || Number(formData.quantity) < 0) {
      errors.quantity = t("Must be a non-negative number.", "कृपया शून्य या उससे अधिक संख्या दर्ज करें।");
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
      setSuccessMsg(t("Distribution updated successfully.", "वितरण सफलतापूर्वक अपडेट किया गया।"));
      setTimeout(() => setSuccessMsg(""), 3000);
      handleCloseModal();
      fetchDistributions(); // Refresh data
    } catch (err) {
      setFormErrors({ api: t("Failed to update distribution. Please try again.", "वितरण अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।") });
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
      setError(t("Please select items to delete.", "कृपया हटाने के लिए आइटम चुनें।"));
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (window.confirm(t(`Are you sure you want to delete ${selectedItems.length} selected items?`, `क्या आप वाकई ${selectedItems.length} चयनित आइटम हटाना चाहते हैं?`))) {
      setLoading(true);
      try {
        await api.delete("/thr-director-distributions/", { data: { id: selectedItems } });
        setSuccessMsg(t("Selected distributions deleted successfully.", "चयनित वितरण सफलतापूर्वक हटाए गए।"));
        setTimeout(() => setSuccessMsg(""), 3000);
        setSelectedItems([]);
        fetchDistributions(); // Refresh data
      } catch (err) {
        setError(t("Failed to delete selected distributions.", "चयनित वितरण हटाए नहीं जा सके।"));
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

  const FilterDropdown = ({ title, titleHindi, items, selected, onSelect }) => {
    const translatedTitle = t(title, titleHindi);
    return (
      <Dropdown>
        <Dropdown.Toggle variant="outline-secondary" id={`dropdown-${title.toLowerCase()}`} className="w-100">
          {selected.length ? `${selected.length} ${translatedTitle} ${t("selected", "चयनित")}` : `${t("All", "सभी")} ${translatedTitle}`}
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
  };

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
            <h3 className="mb-3 fw-bold">{t("THR Distributions Management", "टीएचआर वितरण प्रबंधन")}</h3>
            <div className="d-flex justify-content-end mb-3">
              <Button
                variant="danger"
                onClick={handleDeleteSelected}
                disabled={selectedItems.length === 0 || loading}
              >
                <FaTrash className="me-2" /> {t("Delete Selected", "चयनित हटाएं")} ({selectedItems.length})
              </Button>
            </div>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}
          {successMsg && <Alert variant="success">{successMsg}</Alert>}

          <Row className="mb-3 g-3">
            <Col md={3}><FilterDropdown title="Fin. Year" titleHindi="वित्तीय वर्ष" items={uniqueFinYears} selected={filters.finYear} onSelect={(val) => handleMultiSelectChange('finYear', val)} /></Col>
            <Col md={3}><FilterDropdown title="Quarter" titleHindi="तिमाही" items={uniqueQuarters} selected={filters.quarter} onSelect={(val) => handleMultiSelectChange('quarter', val)} /></Col>
            <Col md={3}><FilterDropdown title="District" titleHindi="जिला" items={uniqueDistricts} selected={filters.district} onSelect={(val) => handleMultiSelectChange('district', val)} /></Col>
            <Col md={3}><FilterDropdown title="Project" titleHindi="परियोजना" items={uniqueProjects} selected={filters.project} onSelect={(val) => handleMultiSelectChange('project', val)} /></Col>
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
                    <th>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</th>
                    <th>{t("Food Item", "खाद्य पदार्थ")}</th>
                    <th>{t("Beneficiaries", "लाभार्थी")}</th>
                    <th>{t("Quantity", "मात्रा")}</th>
                    <th>{t("Unit", "इकाई")}</th>
                    <th>{t("Fin. Year", "वित्तीय वर्ष")}</th>
                    <th>{t("Quarter", "तिमाही")}</th>
                    <th>{t("Action", "कार्रवाई")}</th>
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
                        <Button variant="outline-primary" size="sm" onClick={() => handleEdit(item)} aria-label={t("Edit", "संपादित करें")}>
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
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
            <Modal.Title>{t("Edit THR Distribution", "टीएचआर वितरण संपादित करें")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editingItem && (
              <Form onSubmit={handleFormSubmit}>
                <p><strong>{t("AWC:", "आंगनवाड़ी केंद्र:")}</strong> {editingItem.awc_name} ({editingItem.awc_code})</p>
                <p><strong>{t("Food Item:", "खाद्य पदार्थ:")}</strong> {editingItem.food_item}</p>

                <Form.Group className="mb-3" controlId="total_beneficiaries">
                  <Form.Label>{t("Total Beneficiaries", "कुल लाभार्थी")}</Form.Label>
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
                  <Form.Label>{t("Quantity", "मात्रा")}</Form.Label>
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
                    {t("Cancel", "रद्द करें")}
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : t("Save Changes", "परिवर्तन सहेजें")}
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