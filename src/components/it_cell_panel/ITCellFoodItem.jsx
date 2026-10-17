import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Spinner, Table, Button, Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import { useLanguage } from "../all_login/LanguageContext";

import { FaPlus, FaEdit, FaTrash, FaUpload, FaFileExcel } from "react-icons/fa";
import "../../assets/css/itcellLeftnav.css";
import * as XLSX from "xlsx";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const API_URLS = {
  hcm: "/hcm-food-items/",
  thr: "/thr-food-items/",
};

const ITCellFoodItem = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  const { api } = useAuth();
  const { t } = useLanguage();

  const [hcmItems, setHcmItems] = useState([]);
  const [thrItems, setThrItems] = useState([]);
  const [loading, setLoading] = useState({ hcm: false, thr: false });
  const [error, setError] = useState({ hcm: "", thr: "" });

  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ scheme: "", item: null });
  const [formData, setFormData] = useState({ food_item: "", qty_per_ben: "", unit: "", bene_category: "", days_allotted: "" });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadScheme, setBulkUploadScheme] = useState("");
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkPreviewData, setBulkPreviewData] = useState([]);
  const [bulkValidationErrors, setBulkValidationErrors] = useState([]);
  const [beneficiaryCategories, setBeneficiaryCategories] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);

  const fetchData = useCallback(async (scheme) => {
    setLoading(prev => ({ ...prev, [scheme]: true }));
    setError(prev => ({ ...prev, [scheme]: "" }));
    try {
      const response = await api.get(API_URLS[scheme]);
      // Handle both array and object responses for data
      const data = Array.isArray(response.data) ? response.data : response.data.data || [];
      if (scheme === 'hcm') {
        setHcmItems(Array.isArray(data) ? data : []);
      } else if (scheme === 'thr') {
        setThrItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(prev => ({ ...prev, [scheme]: t(`Failed to fetch ${scheme.toUpperCase()} items.`, `${scheme.toUpperCase()} आइटम प्राप्त नहीं हो सके।`) }));
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, [scheme]: false }));
    }
  }, [api, t]);

  const fetchBeneficiaryCategories = useCallback(async () => {
    try {
        const response = await api.get("/beneficiary-categories/");
        setBeneficiaryCategories(response.data || []);
    } catch (err) {
        console.error("Failed to fetch beneficiary categories:", err);
        setError(prev => ({ ...prev, thr: t("Failed to load beneficiary categories.", "लाभार्थी श्रेणियां लोड नहीं हो सकीं।") }));
    }
  }, [api, t]);

  useEffect(() => {
    fetchData('hcm');
    fetchData('thr');
    fetchBeneficiaryCategories();

    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchData, fetchBeneficiaryCategories]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleShowModal = (scheme, item = null) => {
    setModalConfig({ scheme, item });
    if (item) {
      setFormData({
        food_item: item.food_item,
        qty_per_ben: item.qty_per_ben,
        unit: item.unit,
        bene_category: item.bene_category || "",
        days_allotted: item.days_allotted || ""
      });
    } else {
      setFormData({ food_item: "", qty_per_ben: "", unit: "", bene_category: "", days_allotted: "" });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const validateForm = (scheme) => {
    const errors = {};
    if (!formData.food_item.trim()) errors.food_item = t("Food item is required.", "खाद्य पदार्थ आवश्यक है।");
    if (!formData.bene_category.trim()) errors.bene_category = t("Beneficiary category is required.", "लाभार्थी श्रेणी आवश्यक है।");
    if (!formData.days_allotted) errors.days_allotted = t("Days allotted is required.", "आवंटित दिन आवश्यक हैं।");
    if (!formData.qty_per_ben) errors.qty_per_ben = t("Quantity is required.", "मात्रा आवश्यक है।");
    else if (isNaN(formData.qty_per_ben)) errors.qty_per_ben = t("Quantity must be a number.", "मात्रा संख्या में होनी चाहिए।");
    if (!formData.unit.trim()) errors.unit = t("Unit is required.", "इकाई आवश्यक है।");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const { scheme, item } = modalConfig;
    if (!validateForm(scheme)) return;

    setSubmitting(true);
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
      setFormErrors({ api: t(`Failed to ${item ? 'update' : 'add'} item. Please try again.`, `आइटम ${item ? "अपडेट" : "जोड़"} नहीं हो सका। कृपया पुनः प्रयास करें।`) });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheme, itemId) => {
    if (window.confirm(t("Are you sure you want to delete this item?", "क्या आप वाकई इस आइटम को हटाना चाहते हैं?"))) {
      try {
        await api.delete(API_URLS[scheme], { data: { id: itemId } });
        fetchData(scheme);
      } catch (err) {
        alert(t("Failed to delete item. Please try again.", "आइटम हटाया नहीं जा सका। कृपया पुनः प्रयास करें।"));
        console.error(err);
      }
    }
  };

  const handleShowBulkUploadModal = (scheme) => {
    setBulkUploadScheme(scheme);
    setBulkFile(null);
    setBulkPreviewData([]);
    setBulkValidationErrors([]);
    setBulkUploadError("");
    setShowBulkUploadModal(true);
  };

  const handleCloseBulkUploadModal = () => setShowBulkUploadModal(false);
  
  const handleBulkUpload = async () => {
    if (!bulkFile) {
      setBulkUploadError(t("Please select a file to upload.", "कृपया अपलोड करने के लिए फ़ाइल चुनें।"));
      return;
    }
    setBulkUploading(true);
    setBulkUploadError("");
    
    try {
      if (bulkValidationErrors.length > 0) {
        setBulkUploadError(t("Cannot upload. Please fix the errors in the file.", "अपलोड नहीं किया जा सकता। कृपया फ़ाइल की त्रुटियां ठीक करें।"));
        return;
      }
      
      const url = API_URLS[bulkUploadScheme];
      const payload = bulkPreviewData.map((item) => ({
        ...item.data,
        // Ensure qty_per_ben is sent as a number
        qty_per_ben: Number(item.data.qty_per_ben),
      }));

      console.log("Bulk upload payload:", payload);
      
      // The backend expects a single object, not a list.
      // We send each item as a separate request in parallel.
      const uploadPromises = payload.map(item => api.post(url, item));
      await Promise.all(uploadPromises);

      handleCloseBulkUploadModal();
      fetchData(bulkUploadScheme);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "An error occurred during bulk upload. Please check the console for details.";
      setBulkUploadError(errorMessage);
      console.error("Bulk upload failed:", err.response || err);
    } finally {
      setBulkUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setBulkPreviewData([]);
    setBulkValidationErrors([]);
    setBulkUploadError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json.length === 0) {
          setBulkUploadError(t("The Excel file is empty.", "Excel फ़ाइल खाली है।"));
          return;
        }
        
        // More robust header validation: trim and convert to a consistent format.
        const headerMapping = {
          "food item": "food_item",
          "food_item": "food_item",
          "qty per ben": "qty_per_ben",
          "qty_per_ben": "qty_per_ben",
          "qtyperben": "qty_per_ben",
          "qty_per_beneficiary": "qty_per_ben",
          "quantity_per_beneficiary": "qty_per_ben",
          "unit": "unit"
        };

        const firstRow = json[0] || {};
        const fileHeaders = Object.keys(firstRow).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_'));
        const requiredHeaders = ["food_item", "qty_per_ben", "unit", "bene_category", "days_allotted"];

        const missingHeaders = requiredHeaders.filter(h => !fileHeaders.some(fh => headerMapping[fh] === h || fh === h));

        if (missingHeaders.length > 0) {
          setBulkUploadError(`Missing required columns: ${missingHeaders.join(", ")}`);
          setBulkUploading(false);
          return;
        }

        const previewData = [];
        const validationErrorList = [];

        json.forEach((row, index) => {
          const newRow = {};
          const rowErrors = [];

          for (const key in row) {
            // Normalize the key from the file to find its mapping
            const fileKey = key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/_+/g, '_');
            const normalizedKey = headerMapping[fileKey] || fileKey;
            
            if (requiredHeaders.includes(normalizedKey)) {
              newRow[normalizedKey] = row[key];
            }
          }

          // Validate each row
          if (!newRow.food_item || String(newRow.food_item).trim() === "") rowErrors.push("'food_item' is missing.");
          if (newRow.qty_per_ben === undefined || newRow.qty_per_ben === null || String(newRow.qty_per_ben).trim() === "") {
            rowErrors.push("'qty_per_ben' is missing.");
          } else if (isNaN(Number(newRow.qty_per_ben))) {
            rowErrors.push("'qty_per_ben' must be a number.");
          }
          if (!newRow.bene_category || String(newRow.bene_category).trim() === "") rowErrors.push("'bene_category' is missing.");
          if (newRow.days_allotted === undefined || newRow.days_allotted === null || String(newRow.days_allotted).trim() === "") {
            rowErrors.push("'days_allotted' is missing.");
          } else if (isNaN(Number(newRow.days_allotted))) {
            rowErrors.push("'days_allotted' must be a number.");
          }
          if (!newRow.unit || String(newRow.unit).trim() === "") rowErrors.push("'unit' is missing.");

          if (rowErrors.length > 0) {
            validationErrorList.push(`Row ${index + 2}: ${rowErrors.join(' ')}`);
          }

          previewData.push({ data: newRow, errors: rowErrors });
        });

        setBulkPreviewData(previewData);
        setBulkValidationErrors(validationErrorList);
        if (validationErrorList.length > 0) {
          setBulkUploadError(t("Your file contains errors. Please fix them before uploading.", "फ़ाइल में त्रुटियां हैं। कृपया अपलोड करने से पहले उन्हें ठीक करें।"));
        }
      } catch (err) {
        setBulkUploadError(t("Failed to parse the Excel file. Please ensure it's a valid .xlsx or .xls file.", "Excel फ़ाइल पढ़ी नहीं जा सकी। कृपया सुनिश्चित करें कि यह मान्य .xlsx या .xls फ़ाइल है।"));
        console.error(err);
      }
    };
    reader.onerror = () => {
      setBulkUploadError(t("Failed to read the file.", "फ़ाइल पढ़ी नहीं जा सकी।"));
      setBulkUploading(false);
    };
    reader.readAsArrayBuffer(file);
  }

  const downloadSampleFile = () => {
    const sampleData = [
      { food_item: "Sample Rice", qty_per_ben: 5, unit: "Kg", bene_category: "6month-3yr", days_allotted: 25 },
      { food_item: "Sample Dal", qty_per_ben: 2, unit: "Kg", bene_category: "3yr-6yr", days_allotted: 25 },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "FoodItems");
    XLSX.writeFile(workbook, "SampleFoodItems.xlsx");
  };

  const renderTable = (scheme, items) => (
    <div className="food-items-table-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{scheme.toUpperCase()} {t("Food Items", "खाद्य पदार्थ")}</h5>
        <div>
          <Button variant="success" size="sm" onClick={() => handleShowBulkUploadModal(scheme)} className="me-2">
            <FaUpload className="me-2" /> {t("Bulk Upload", "बल्क अपलोड")}
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleShowModal(scheme)}>
            <FaPlus className="me-2" /> {t("Add New Item", "नया आइटम जोड़ें")}
          </Button>
        </div>
      </div>
      {loading[scheme] ? (
        <div className="text-center p-5"><Spinner animation="border" /></div>
        ) : error[scheme] ? (
          <Alert variant="danger">{error[scheme]}</Alert>
        ) : items.length === 0 ? (
          <div className="empty-state">{t("No items found for", "के लिए कोई आइटम नहीं मिला")} {scheme.toUpperCase()}.</div>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("Food Item", "खाद्य पदार्थ")}</th>
                <th>{t("Qty Per Beneficiary", "प्रति लाभार्थी मात्रा")}</th>
                <th>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</th>
                <th>{t("Days Allotted", "आवंटित दिन")}</th>
                <th>{t("Unit", "इकाई")}</th>
                <th>{t("Action", "कार्रवाई")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{index + 1}</td>
                  <td>{item.food_item}</td>
                  <td>{item.qty_per_ben}</td>
                  <td>{item.bene_category}</td>
                  <td>{item.days_allotted}</td>
                  <td>{item.unit}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="btn-action" onClick={() => handleShowModal(scheme, item)} aria-label={t("Edit", "संपादित करें")}>
                      <FaEdit />
                    </Button>
                    <Button variant="outline-danger" size="sm" className="btn-action" onClick={() => handleDelete(scheme, item.id)} aria-label={t("Delete", "हटाएं")}>
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
      <ITCellLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <ITCellHeader toggleSidebar={toggleSidebar} />
        <div className="food-items-container">
          <Container fluid className="dashboard-box food-items-content">
            <h3 className="page-title-heading">{t("Food Items Management", "खाद्य पदार्थ प्रबंधन")}</h3>
            <Tabs defaultActiveKey="hcm" id="food-items-tabs" className="mb-4 food-items-tabs">
              <Tab eventKey="hcm" title={t("HCM Food Items", "एचसीएम खाद्य पदार्थ")}>
                {renderTable('hcm', hcmItems)}
              </Tab>
              <Tab eventKey="thr" title={t("THR Food Items", "टीएचआर खाद्य पदार्थ")}>
                {renderTable('thr', thrItems)}
              </Tab>
            </Tabs>
          </Container>
        </div>

        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
            <Modal.Title>{t(modalConfig.item ? "Edit" : "Add", modalConfig.item ? "संपादित करें" : "जोड़ें")} {modalConfig.scheme.toUpperCase()} {t("Food Item", "खाद्य पदार्थ")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formErrors.api && <Alert variant="danger">{formErrors.api}</Alert>}
            <Form onSubmit={handleFormSubmit}>
              <Form.Group className="mb-3" controlId="food_item">
                <Form.Label>{t("Food Item", "खाद्य पदार्थ")}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("Enter food item name", "खाद्य पदार्थ का नाम दर्ज करें")}
                  value={formData.food_item}
                  onChange={(e) => setFormData({ ...formData, food_item: e.target.value })}
                  isInvalid={!!formErrors.food_item}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.food_item}
                </Form.Control.Feedback>
              </Form.Group>

              <>
                <Form.Group className="mb-3" controlId="bene_category">
                  <Form.Label>{t("Beneficiary Category", "लाभार्थी श्रेणी")}</Form.Label>
                  <Form.Select
                    value={formData.bene_category}
                    onChange={(e) => setFormData({ ...formData, bene_category: e.target.value })}
                    isInvalid={!!formErrors.bene_category}
                  >
                    <option value="">{t("Select a category", "श्रेणी चुनें")}</option>
                    {beneficiaryCategories.map(cat => (
                      <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {formErrors.bene_category}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3" controlId="days_allotted">
                  <Form.Label>{t("Days Allotted", "आवंटित दिन")}</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder={t("Enter days allotted", "आवंटित दिन दर्ज करें")}
                    value={formData.days_allotted}
                    onChange={(e) => setFormData({ ...formData, days_allotted: e.target.value })}
                    isInvalid={!!formErrors.days_allotted}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.days_allotted}
                  </Form.Control.Feedback>
                </Form.Group>
              </>

              <Form.Group className="mb-3" controlId="qty_per_ben">
                <Form.Label>{t("Quantity Per Beneficiary", "प्रति लाभार्थी मात्रा")}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("Enter quantity", "मात्रा दर्ज करें")}
                  value={formData.qty_per_ben}
                  onChange={(e) => setFormData({ ...formData, qty_per_ben: e.target.value })}
                  isInvalid={!!formErrors.qty_per_ben}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.qty_per_ben}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="unit">
                <Form.Label>{t("Unit", "इकाई")}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t("Enter unit (e.g., grams, ml)", "इकाई दर्ज करें (जैसे, ग्राम, मिलीलीटर)")}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  isInvalid={!!formErrors.unit}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.unit}
                </Form.Control.Feedback>
              </Form.Group>

              <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                {t("Cancel", "रद्द करें")}
              </Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? <Spinner as="span" animation="border" size="sm" /> : t("Save Changes", "परिवर्तन सहेजें")}
              </Button>
            </Form>
          </Modal.Body>
        </Modal>
      </div>

      <Modal show={showBulkUploadModal} onHide={handleCloseBulkUploadModal} centered>
        <Modal.Header closeButton closeLabel={t("Close", "बंद करें")}>
          <Modal.Title>{t("Bulk Upload", "बल्क अपलोड")} {bulkUploadScheme.toUpperCase()} {t("Food Items", "खाद्य पदार्थ")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkUploadError && <Alert variant="danger">{bulkUploadError}</Alert>}
          <p>{t("Upload an Excel file with columns:", "इन कॉलम वाली Excel फ़ाइल अपलोड करें:")} <strong>food_item</strong>, <strong>qty_per_ben</strong>, <strong>unit</strong>, <strong>bene_category</strong>, <strong>days_allotted</strong>.</p>
          <Button variant="link" onClick={downloadSampleFile} className="p-0 mb-3">
            <FaFileExcel className="me-1" /> {t("Download Sample File", "नमूना फ़ाइल डाउनलोड करें")}
          </Button>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>{t("Select Excel File", "Excel फ़ाइल चुनें")}</Form.Label>
            <Form.Control 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileSelect} 
            />
          </Form.Group>

          {bulkPreviewData.length > 0 && (
            <div className="mt-4">
              <h6>{t("File Preview", "फ़ाइल पूर्वावलोकन")}</h6>
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("Food Item", "खाद्य पदार्थ")}</th>
                    <th>{t("Qty Per Ben", "प्रति लाभार्थी मात्रा")}</th>
                    <th>{t("Bene. Category", "लाभार्थी श्रेणी")}</th>
                    <th>{t("Days Allotted", "आवंटित दिन")}</th>
                    <th>{t("Unit", "इकाई")}</th>
                    <th>{t("Status", "स्थिति")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreviewData.map((item, index) => (
                    <tr key={index} className={item.errors.length > 0 ? 'table-danger' : ''}>
                      <td>{index + 1}</td>
                      <td>{item.data.food_item}</td>
                      <td>{item.data.qty_per_ben}</td>
                      <td>{item.data.bene_category}</td>
                      <td>{item.data.days_allotted}</td>
                      <td>{item.data.unit}</td>
                      <td>{item.errors.length > 0 ? <span className="text-danger">{t("Error", "त्रुटि")}</span> : <span className="text-success">{t("OK", "ठीक है")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseBulkUploadModal} disabled={bulkUploading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleBulkUpload} disabled={bulkUploading || !bulkFile || bulkValidationErrors.length > 0}>
            {bulkUploading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">{t("Uploading...", "अपलोड हो रहा है...")}</span>
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ITCellFoodItem;