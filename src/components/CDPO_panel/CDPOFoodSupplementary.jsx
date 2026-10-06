import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Form, Button, Badge, Tabs, Tab } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import * as XLSX from "xlsx";
import "../../assets/css/supplement.css"; 

const API_BASE_URL = "https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api";

function CDPOFoodSupplementary() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { api } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [thrItems, setThrItems] = useState([]);
  const [hcmItems, setHcmItems] = useState([]);
  const [records, setRecords] = useState([]); 
  const [editingId, setEditingId] = useState(null); 
  const [selectedIds, setSelectedIds] = useState([]); 
  const [recordTab, setRecordTab] = useState("all"); 

  const [formData, setFormData] = useState({
    awc_code: "5064010102",
    month: "Jan-Feb-Mar",
    financial_year: "2026-27",
    active_beneficiaries: 163,
    children_6m_3y_beneficiaries: 50,
    sam_children_6m_6y: 10,
    suw_children_6m_6y: 8,
    sam_children_3y_6y: 6,
    suw_children_3y_6y: 5,
    pregnant_women_lactating_mothers: 20,
    hcm_beneficiaries_3y_6y: 64,
    thr_25_days_frs_hcm_beneficiaries_3y_6y: 40,
    total_beneficiaries: 163,
  });

  const [foodType, setFoodType] = useState("टीएचआर");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [autoFilledData, setAutoFilledData] = useState({
    category: "", food_item: "", allo_quan: 0, qty_per_ben: 0, days_allotted: 0, daily_consumption_qty: 0,
  });

  const [foodItemsList, setFoodItemsList] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchFoodItems = async () => {
    try {
      const [thrRes, hcmRes] = await Promise.all([
        api.get(`${API_BASE_URL}/thr-food-items/`),
        api.get(`${API_BASE_URL}/hcm-food-items/`)
      ]);
      setThrItems(thrRes.data);
      setHcmItems(hcmRes.data);
    } catch (err) {
      setError("Failed to load food items");
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE_URL}/supplementary-nutrition-with-food/`);
      setRecords(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodItems();
    fetchRecords();
  }, [api]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFoodItemChange = (e) => {
    const id = e.target.value;
    setSelectedFoodId(id);
    if (!id) {
      setAutoFilledData({ category: "", food_item: "", allo_quan: 0, qty_per_ben: 0, days_allotted: 0, daily_consumption_qty: 0 });
      return;
    }
    const sourceArray = foodType === "टीएचआर" ? thrItems : hcmItems;
    const selectedItem = sourceArray.find((item) => item.id === parseInt(id));
    if (selectedItem) {
      setAutoFilledData({
        category: selectedItem.bene_category,
        food_item: selectedItem.food_item,
        qty_per_ben: selectedItem.qty_per_ben,
        days_allotted: selectedItem.days_allotted,
        daily_consumption_qty: selectedItem.daily_consumption_qty,
        allo_quan: parseFloat(selectedItem.daily_consumption_qty) || 0, 
      });
    }
  };

  const addFoodItemToList = () => {
    if (!selectedFoodId || !autoFilledData.food_item) {
      alert("कृपया पहले खाद्य आइटम का चयन करें");
      return;
    }
    const newItem = {
      category: autoFilledData.category,
      food_item: autoFilledData.food_item,
      food_type: foodType, 
      allo_quan: parseFloat(autoFilledData.allo_quan),
      id: autoFilledData.id || undefined 
    };

    setFoodItemsList([...foodItemsList, newItem]);
    setSelectedFoodId("");
    setAutoFilledData({ category: "", food_item: "", allo_quan: 0, qty_per_ben: 0, days_allotted: 0, daily_consumption_qty: 0 });
  };

  const removeFoodItem = (index) => {
    const updatedList = foodItemsList.filter((_, i) => i !== index);
    setFoodItemsList(updatedList);
  };

  const resetForm = () => {
    setFormData({
      awc_code: "", month: "Jan-Feb-Mar", financial_year: "2026-27", active_beneficiaries: 0,
      children_6m_3y_beneficiaries: 0, sam_children_6m_6y: 0, suw_children_6m_6y: 0, sam_children_3y_6y: 0,
      suw_children_3y_6y: 0, pregnant_women_lactating_mothers: 0, hcm_beneficiaries_3y_6y: 0,
      thr_25_days_frs_hcm_beneficiaries_3y_6y: 0, total_beneficiaries: 0,
    });
    setFoodItemsList([]);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = { ...formData, food_items: foodItemsList };

    try {
      if (editingId) {
        await api.put(`${API_BASE_URL}/supplementary-nutrition-with-food/`, { ...payload, id: editingId });
        setSuccess("डेटा सफलतापूर्वक अपडेट हो गया है!");
      } else {
        await api.post(`${API_BASE_URL}/supplementary-nutrition-with-food/`, payload);
        setSuccess("डेटा सफलतापूर्वक सबमिट हो गया है!");
      }
      resetForm();
      fetchRecords(); 
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record) => {
    const { food_items, id, created_at, updated_at, district, project, sector, awc_name, ...rest } = record;
    setFormData(rest);
    setFoodItemsList(food_items);
    setEditingId(id);
    window.scrollTo(0, 0);
  };

  const handleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(records.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return alert("कृपया हटाने के लिए रिकॉर्ड चुनें");
    if (!window.confirm(`क्या आप वाकई ${selectedIds.length} रिकॉर्ड हटाना चाहते हैं?`)) return;

    setLoading(true);
    try {
      await api.delete(`${API_BASE_URL}/supplementary-nutrition-with-food/`, {
        data: { ids: selectedIds }
      });
      setSuccess("चयनित रिकॉर्ड सफलतापूर्वक हटा दिए गए हैं!");
      setSelectedIds([]);
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("क्या आप वाकई इस रिकॉर्ड को हटाना चाहते हैं?")) return;

    setLoading(true);
    try {
      await api.delete(`${API_BASE_URL}/supplementary-nutrition-with-food/`, {
        data: { ids: [id] }
      });
      setSuccess("रिकॉर्ड सफलतापूर्वक हटा दिया गया है!");
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ BULK EXCEL UPLOAD ============
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const groupedPayloads = {};

        json.forEach((row) => {
          const key = `${row.awc_code}_${row.month}_${row.financial_year}`;

          if (!groupedPayloads[key]) {
            groupedPayloads[key] = {
              awc_code: String(row.awc_code),
              month: row.month,
              financial_year: row.financial_year,
              active_beneficiaries: Number(row.active_beneficiaries) || 0,
              children_6m_3y_beneficiaries: Number(row.children_6m_3y_beneficiaries) || 0,
              sam_children_6m_6y: Number(row.sam_children_6m_6y) || 0,
              suw_children_6m_6y: Number(row.suw_children_6m_6y) || 0,
              sam_children_3y_6y: Number(row.sam_children_3y_6y) || 0,
              suw_children_3y_6y: Number(row.suw_children_3y_6y) || 0,
              pregnant_women_lactating_mothers: Number(row.pregnant_women_lactating_mothers) || 0,
              hcm_beneficiaries_3y_6y: Number(row.hcm_beneficiaries_3y_6y) || 0,
              thr_25_days_frs_hcm_beneficiaries_3y_6y: Number(row.thr_25_days_frs_hcm_beneficiaries_3y_6y) || 0,
              total_beneficiaries: Number(row.total_beneficiaries) || 0,
              food_items: []
            };
          }

          if (row.food_item) {
            groupedPayloads[key].food_items.push({
              category: row.category || "",
              food_item: row.food_item,
              food_type: row.food_type || "टीएचआर",
              allo_quan: parseFloat(row.allo_quan) || 0
            });
          }
        });

        const payloadsArray = Object.values(groupedPayloads);

        for (const payload of payloadsArray) {
          await api.post(`${API_BASE_URL}/supplementary-nutrition-with-food/`, payload);
        }

        setSuccess(`बल्क एक्सेल डेटा सफलतापूर्वक अपलोड हो गया है! (${payloadsArray.length} रिकॉर्ड्स)`);
      } catch (err) {
        console.error("Excel Upload Error:", err);
        setError("एक्सेल अपलोड विफल: " + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
        e.target.value = null;
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const currentDropdownItems = foodType === "टीएचआर" ? thrItems : hcmItems;

  const filteredRecords = records.filter((rec) => {
    if (recordTab === "all") return true;
    const types = rec.food_items?.map((fi) => fi.food_type) || [];
    if (recordTab === "thr") return types.includes("टीएचआर");
    if (recordTab === "hcm") return types.includes("एचसीएम");
    return true;
  });

  // ============ DOWNLOAD EXCEL TEMPLATE ============
  const downloadTemplate = () => {
    const headers = [
      "awc_code", "month", "financial_year", "active_beneficiaries",
      "children_6m_3y_beneficiaries", "sam_children_6m_6y", "suw_children_6m_6y",
      "sam_children_3y_6y", "suw_children_3y_6y", "pregnant_women_lactating_mothers",
      "hcm_beneficiaries_3y_6y", "thr_25_days_frs_hcm_beneficiaries_3y_6y",
      "total_beneficiaries", "category", "food_item", "food_type", "allo_quan"
    ];
    const exampleRow = [
      "5064010102", "Jan-Feb-Mar", "2026-27", 163,
      50, 10, 8, 6, 5, 20,
      64, 40, 163,
      "6 माह से 3 वर्ष के सामान्य बच्चे", "पंजीरी", "टीएचआर", 50.00
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "supplementary_nutrition_template.xlsx");
  };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isMobile={isMobile} isTablet={isTablet} />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />

<Container fluid className="dashboard-box mt-3">
           <div className="dashboard-section mb-4 d-flex justify-content-between align-items-center">
             <h4 className="section-title mb-0">पूरक पोषण आहार (Supplementary Nutrition)</h4>
<div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>Template डाउनलोड</Button>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  style={{ display: "none" }}
                  id="bulkExcelFile"
                  onChange={handleExcelUpload}
                  disabled={loading}
                />
                <Button variant="warning" size="sm" onClick={() => document.getElementById("bulkExcelFile").click()} disabled={loading}>बल्क एक्सेल अपलोड</Button>
              </div>
           </div>

          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          {loading && (
            <div className="text-center my-3">
              <Spinner animation="border" variant="primary" />
            </div>
          )}

          {/* ================= FORM SECTION ================= */}
          <Form onSubmit={handleSubmit}>
            <div className="details mb-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">खाद्य आइटम जोड़ें (Add Food Items)</h5>
                  {editingId && <Button variant="light" size="sm" onClick={resetForm}>Cancel Edit</Button>}
            </div>
            <Card className="mb-4 shadow-sm food-card">
              
              
              
              
            
                <Row className="align-items-end">
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>खाद्य प्रकार (Food Type)</Form.Label>
                      <Form.Select value={foodType} onChange={(e) => { setFoodType(e.target.value); setSelectedFoodId(""); }}>
                        <option value="टीएचआर">टीएचआर (THR)</option>
                        <option value="एचसीएम">एचसीएम (HCM)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>खाद्य आइटम का चयन करें</Form.Label>
                      <Form.Select value={selectedFoodId} onChange={handleFoodItemChange}>
                        <option value="">-- चुनें --</option>
                        {currentDropdownItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.food_item} ({item.bene_category})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>आवंटित मात्रा (Allo Quan)</Form.Label>
                      <Form.Control type="number" step="0.01" value={autoFilledData.allo_quan} disabled={!selectedFoodId} onChange={(e) => setAutoFilledData({ ...autoFilledData, allo_quan: e.target.value })} />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Button variant="primary" onClick={addFoodItemToList} className="w-100" disabled={!selectedFoodId}>+ आइटम जोड़ें</Button>
                  </Col>
                </Row>

                {foodItemsList.length > 0 && (
                  <Table striped bordered hover responsive className="mt-3">
                    <thead>
                      <tr>
                        <th>#</th><th>श्रेणी (Category)</th><th>खाद्य आइटम</th><th>प्रकार (Type)</th><th>आवंटित मात्रा</th><th>कार्य</th>
                      </tr>
                    </thead>
                    <tbody>
                      {foodItemsList.map((item, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{item.category}</td>
                          <td>{item.food_item}</td>
                          <td><Badge bg={item.food_type === "टीएचआर" ? "info" : "warning"}>{item.food_type}</Badge></td>
                          <td>{item.allo_quan}</td>
                          <td><Button variant="danger" size="sm" onClick={() => removeFoodItem(index)}>हटाएं</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
           
            </Card>

            <div className="details mb-3">
              <h5 className="mb-0">लाभार्थी विवरण (Beneficiary Details)</h5>
            </div>
            <Card className="mb-4 shadow-sm food-card">
             
                <Row>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>AWC Code</Form.Label><Form.Control type="text" name="awc_code" value={formData.awc_code} onChange={handleInputChange} required /></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Month (तिमाही)</Form.Label><Form.Control type="text" name="month" value={formData.month} onChange={handleInputChange} required /></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Financial Year</Form.Label><Form.Control type="text" name="financial_year" value={formData.financial_year} onChange={handleInputChange} required /></Form.Group></Col>
                  
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>Active Beneficiaries</Form.Label><Form.Control type="number" name="active_beneficiaries" value={formData.active_beneficiaries} onChange={handleInputChange} /></Form.Group></Col>
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>Children 6m-3y</Form.Label><Form.Control type="number" name="children_6m_3y_beneficiaries" value={formData.children_6m_3y_beneficiaries} onChange={handleInputChange} /></Form.Group></Col>
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>SAM Children 6m-6y</Form.Label><Form.Control type="number" name="sam_children_6m_6y" value={formData.sam_children_6m_6y} onChange={handleInputChange} /></Form.Group></Col>
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>SUW Children 6m-6y</Form.Label><Form.Control type="number" name="suw_children_6m_6y" value={formData.suw_children_6m_6y} onChange={handleInputChange} /></Form.Group></Col>

                  <Col md={3}><Form.Group className="mb-3"><Form.Label>Pregnant/Lactating Women</Form.Label><Form.Control type="number" name="pregnant_women_lactating_mothers" value={formData.pregnant_women_lactating_mothers} onChange={handleInputChange} /></Form.Group></Col>
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>HCM Beneficiaries 3y-6y</Form.Label><Form.Control type="number" name="hcm_beneficiaries_3y_6y" value={formData.hcm_beneficiaries_3y_6y} onChange={handleInputChange} /></Form.Group></Col>
                  <Col md={3}><Form.Group className="mb-3"><Form.Label>Total Beneficiaries</Form.Label><Form.Control type="number" name="total_beneficiaries" value={formData.total_beneficiaries} onChange={handleInputChange} /></Form.Group></Col>
                </Row>
              
            </Card>

            <div className=" gap-2 mb-5">
              <Button variant="success" type="submit" size="lg" disabled={loading || foodItemsList.length === 0}>
                {loading ? "सबमिट हो रहा है..." : (editingId ? "अपडेट करें (Update Record)" : "डेटा सबमिट करें (Submit Data)")}
              </Button>
            </div>
          </Form>

          {/* ================= VIEW RECORDS TABLE (BELOW FORM) ================= */}
          <div className="details mb-3 d-flex justify-content-between align-items-center">
             <h5 className="mb-0">सबमिट किए गए रिकॉर्ड्स</h5>
               <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={selectedIds.length === 0 || loading}>
                 हटाएं ({selectedIds.length})
               </Button>
          </div>
          <Card className="mb-4 shadow-sm food-card">
               <Tabs
                 activeKey={recordTab}
                 onSelect={setRecordTab}
                 className="mb-3"
               >
                 <Tab eventKey="all" title="सभी (All)">All</Tab>
                 <Tab eventKey="thr" title="टीएचआर (THR)">THR</Tab>
                 <Tab eventKey="hcm" title="एचसीएम (HCM)">HCM</Tab>
               </Tabs>


               <Table striped bordered hover responsive className="record-table">
                  <thead>
                    <tr>
                      <th><Form.Check type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === records.length && records.length > 0} /></th>
                      <th>ID</th>
                      <th>District</th>
                      <th>Project</th>
                      <th>Sector</th>
                      <th>AWC Code</th>
                      <th>AWC Name</th>
                      <th>Month</th>
                      <th>Year</th>
                      <th>Active Ben.</th>
                      <th>6m-3y</th>
                      <th>SAM 6m-6y</th>
                      <th>SUW 6m-6y</th>
                      <th>SAM 3y-6y</th>
                      <th>SUW 3y-6y</th>
                      <th>Preg/Lac</th>
                      <th>HCM 3y-6y</th>
                      <th>THR 25d</th>
                      <th>Total Ben.</th>
                      <th>Food Items</th>
                      <th>Created</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr><td colSpan="23" className="text-center">No records found.</td></tr>
                    ) : (
                      filteredRecords.map((rec) => (
                        <tr key={rec.id}>
                          <td><Form.Check type="checkbox" checked={selectedIds.includes(rec.id)} onChange={() => handleSelect(rec.id)} /></td>
                          <td>{rec.id}</td>
                          <td>{rec.district}</td>
                          <td>{rec.project}</td>
                          <td>{rec.sector}</td>
                          <td>{rec.awc_code}</td>
                          <td>{rec.awc_name}</td>
                          <td>{rec.month}</td>
                          <td>{rec.financial_year}</td>
                          <td>{rec.active_beneficiaries}</td>
                          <td>{rec.children_6m_3y_beneficiaries}</td>
                          <td>{rec.sam_children_6m_6y}</td>
                          <td>{rec.suw_children_6m_6y}</td>
                          <td>{rec.sam_children_3y_6y}</td>
                          <td>{rec.suw_children_3y_6y}</td>
                          <td>{rec.pregnant_women_lactating_mothers}</td>
                          <td>{rec.hcm_beneficiaries_3y_6y}</td>
                          <td>{rec.thr_25_days_frs_hcm_beneficiaries_3y_6y}</td>
                          <td>{rec.total_beneficiaries}</td>
                          <td>
                            {rec.food_items?.map((fi, i) => (
                              <Badge key={i} bg="secondary" className="me-1 mb-1">{fi.food_item} ({fi.allo_quan})</Badge>
                            ))}
                          </td>
                          <td>{rec.created_at?.substring(0, 16)}</td>
                          <td>{rec.updated_at?.substring(0, 16)}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button variant="warning" size="sm" onClick={() => handleEdit(rec)}>Edit</Button>
                              <Button variant="danger" size="sm" onClick={() => handleDelete(rec.id)} disabled={loading}>Delete</Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
</Table>
            
           </Card>

        </Container>
      </div>
    </div>
  );
}

export default CDPOFoodSupplementary;