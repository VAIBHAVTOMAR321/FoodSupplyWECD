import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container, Alert, Spinner, Card, Table, Row, Col, Button, Modal, Form,
  Badge, Dropdown,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/cdpo.css";
import "../../assets/css/foodSupplementary.css";
import CDPOHeader from "./CDPOHeader";
import CDPOLeftNav from "./CDPOLeftNav";
import {
  FaPlus, FaEdit, FaTrash, FaChartBar, FaUsers, FaBox, FaBaby,
  FaSave, FaTimes, FaSearch, FaSyncAlt, FaUserFriends, FaArrowLeft,
} from "react-icons/fa";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const initialFormData = {
  id: null,
  month: "July",
  financial_year: "2026-27",
  active_beneficiaries: "",
  thr_25_days_frs_hcm_beneficiaries_3y_6y: "",
  hcm_beneficiaries_3y_6y: "",
  quarterly_packets_mung_dal_khichdi: "",
  pregnant_women_lactating_mothers: "",
  poushik_sattu_mix_75_days_packet_size_gm: "",
  quarterly_packets_poushik_sattu_mix: "",
  children_6m_3y_beneficiaries: "",
  panjeeri_75_days_2625gm_quarterly_packets: "",
  sam_children_6m_6y: "",
  suw_children_6m_6y: "",
  panjeeri_75_days_4625gm_quarterly_packets: "",
  sam_children_3y_6y: "",
  quarterly_packets_sattu_2250gm: "",
  suw_children_3y_6y: "",
  quarterly_packets_mix_1000gm: "",
  quarterly_packets_multi_grain_aata_1250gm: "",
  total_beneficiaries: "",
};

const StatCard = ({ icon, title, value, color, subtext }) => (
  <Card className="fs-card h-100 shadow-sm">
    <Card.Body className="fs-card-body">
      <div className="fs-card-icon-wrap" style={{ background: color }}>
        {icon}
      </div>
      <div className="fs-card-info">
        <div className="fs-card-title">{title}</div>
        <div className="fs-card-value">{value}</div>
        {subtext && <div className="fs-card-sub">{subtext}</div>}
      </div>
    </Card.Body>
  </Card>
);

const FoodSupplementary = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const { api } = useAuth();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");

  const [view, setView] = useState("list");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({ ...initialFormData });
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    const financialYear = now.getMonth() >= 3 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;
    setSelectedMonth(currentMonth);
    setSelectedFinancialYear(financialYear);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supplementary-nutrition-details/");
      const data = Array.isArray(response.data) ? response.data : (response.data?.results || response.data?.data || []);
      setRecords(data);
      const filteredSummaryData = data.filter((r) => {
        const monthMatch = selectedMonth ? r.month === selectedMonth : true;
        const yearMatch = selectedFinancialYear ? r.financial_year === selectedFinancialYear : true;
        return monthMatch && yearMatch;
      });
      if (filteredSummaryData.length > 0) {
        const totals = filteredSummaryData.reduce((acc, r) => ({
          total_beneficiaries: (acc.total_beneficiaries || 0) + (parseInt(r.total_beneficiaries) || 0),
          active_beneficiaries: (acc.active_beneficiaries || 0) + (parseInt(r.active_beneficiaries) || 0),
          pregnant_women_lactating_mothers: (acc.pregnant_women_lactating_mothers || 0) + (parseInt(r.pregnant_women_lactating_mothers) || 0),
          quarterly_packets_mung_dal_khichdi: (acc.quarterly_packets_mung_dal_khichdi || 0) + (parseInt(r.quarterly_packets_mung_dal_khichdi) || 0),
          quarterly_packets_poushik_sattu_mix: (acc.quarterly_packets_poushik_sattu_mix || 0) + (parseInt(r.quarterly_packets_poushik_sattu_mix) || 0),
          poushik_sattu_mix_75_days_packet_size_gm: (acc.poushik_sattu_mix_75_days_packet_size_gm || 0) + (parseInt(r.poushik_sattu_mix_75_days_packet_size_gm) || 0),
          quarterly_packets_sattu_2250gm: (acc.quarterly_packets_sattu_2250gm || 0) + (parseInt(r.quarterly_packets_sattu_2250gm) || 0),
          quarterly_packets_mix_1000gm: (acc.quarterly_packets_mix_1000gm || 0) + (parseInt(r.quarterly_packets_mix_1000gm) || 0),
          quarterly_packets_multi_grain_aata_1250gm: (acc.quarterly_packets_multi_grain_aata_1250gm || 0) + (parseInt(r.quarterly_packets_multi_grain_aata_1250gm) || 0),
          panjeeri_75_days_2625gm_quarterly_packets: (acc.panjeeri_75_days_2625gm_quarterly_packets || 0) + (parseInt(r.panjeeri_75_days_2625gm_quarterly_packets) || 0),
          panjeeri_75_days_4625gm_quarterly_packets: (acc.panjeeri_75_days_4625gm_quarterly_packets || 0) + (parseInt(r.panjeeri_75_days_4625gm_quarterly_packets) || 0),
          suw_children_3y_6y: (acc.suw_children_3y_6y || 0) + (parseInt(r.suw_children_3y_6y) || 0),
          sam_children_6m_6y: (acc.sam_children_6m_6y || 0) + (parseInt(r.sam_children_6m_6y) || 0),
          suw_children_6m_6y: (acc.suw_children_6m_6y || 0) + (parseInt(r.suw_children_6m_6y) || 0),
          sam_children_3y_6y: (acc.sam_children_3y_6y || 0) + (parseInt(r.sam_children_3y_6y) || 0),
          children_6m_3y_beneficiaries: (acc.children_6m_3y_beneficiaries || 0) + (parseInt(r.children_6m_3y_beneficiaries) || 0),
          thr_25_days_frs_hcm_beneficiaries_3y_6y: (acc.thr_25_days_frs_hcm_beneficiaries_3y_6y || 0) + (parseInt(r.thr_25_days_frs_hcm_beneficiaries_3y_6y) || 0),
          hcm_beneficiaries_3y_6y: (acc.hcm_beneficiaries_3y_6y || 0) + (parseInt(r.hcm_beneficiaries_3y_6y) || 0),
        }), {});
        setSummary(totals);
      } else {
        setSummary(null);
      }
    } catch (err) {
      setError("Failed to fetch supplementary nutrition data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api, selectedMonth, selectedFinancialYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter((r) =>
      (r.month || "").toLowerCase().includes(term) ||
      (r.financial_year || "").toLowerCase().includes(term) ||
      (r.district || "").toLowerCase().includes(term) ||
      (r.project || "").toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  const validateForm = (data) => {
    const errors = {};
    if (!data.month) errors.month = "Month is required";
    if (!data.financial_year) errors.financial_year = "Financial year is required";
    if (!data.active_beneficiaries && data.active_beneficiaries !== 0) errors.active_beneficiaries = "Required";
    if (!data.total_beneficiaries && data.total_beneficiaries !== 0) errors.total_beneficiaries = "Required";
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAdd = () => {
    setFormData({ ...initialFormData });
    setFormErrors({});
    setIsEditing(false);
    setView("form");
  };

  const handleEdit = (record) => {
    setFormData({ ...record });
    setFormErrors({});
    setIsEditing(true);
    setView("form");
  };

  const handleDeleteClick = (record) => {
    setDeleteTarget(record);
    setShowDeleteModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormLoading(true);
    try {
      if (isEditing) {
        await api.put("/supplementary-nutrition-details/", formData);
        setSuccess("Record updated successfully.");
      } else {
        await api.post("/supplementary-nutrition-details/", formData);
        setSuccess("Record added successfully.");
      }
      setView("list");
      fetchData();
    } catch (err) {
      setError(isEditing ? "Failed to update record." : "Failed to add record.");
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete("/supplementary-nutrition-details/", { id: deleteTarget.id });
      setSuccess("Record deleted successfully.");
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError("Failed to delete record.");
      console.error(err);
    }
  };

  const renderFormField = (label, name, type = "text", placeholder = "") => {
    const isSelect = type === "select";
    return (
      <Form.Group className="mb-3">
        <Form.Label className="fs-field-label">{label}</Form.Label>
        {isSelect ? (
          <Form.Select
            name={name}
            value={formData[name] ?? ""}
            onChange={handleInputChange}
            className={formErrors[name] ? "is-invalid" : ""}
          >
            {monthNames.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Form.Select>
        ) : (
          <Form.Control
            type={type}
            name={name}
            value={formData[name] ?? ""}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={formErrors[name] ? "is-invalid" : ""}
          />
        )}
        {formErrors[name] && (
          <Form.Control.Feedback type="invalid">{formErrors[name]}</Form.Control.Feedback>
        )}
      </Form.Group>
    );
  };

  return (
    <div className="dashboard-container">
      <CDPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <CDPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-4">
          {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

          {view === "list" && (
            <>
              <div className="dashboard-section">
                <div className="fs-page-header">
                  <div>
                    <h4 className="fs-page-title">Food Supplementary Nutrition</h4>
                  </div>
                  <div className="fs-header-actions">
                    <Dropdown className="fs-search-dropdown">
                      <Dropdown.Toggle variant="light" size="sm">
                        <FaSearch className="me-1" /> Search
                      </Dropdown.Toggle>
                      <Dropdown.Menu style={{ minWidth: "300px", padding: "12px" }}>
                        <Form.Control
                          type="text"
                          placeholder="Search by month, year, district..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        {searchTerm && (
                          <div className="text-muted small">Results: {filteredRecords.length}</div>
                        )}
                      </Dropdown.Menu>
                    </Dropdown>
                    <Button variant="primary" size="sm" onClick={handleAdd} className="fs-btn-primary">
                      <FaPlus className="me-1" /> Add Record
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => { setRefreshing(true); setTimeout(() => { setRefreshing(false); fetchData(); }, 500); }}
                      disabled={refreshing}
                      className="fs-btn-light"
                    >
                      <FaSyncAlt className={`me-1 ${refreshing ? "fs-spin" : ""}`} /> Refresh
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading data...</p>
                </div>
              ) : (
                <>
                  {(summary || !summary) && (
                    <div className="dashboard-section">
                      <div className="fs-filter-bar">
                        <Form.Group as={Row} className="g-2 align-items-end">
                          <Col xs={12} sm={5} md={4}>
                            <Form.Label className="fs-filter-label">Month</Form.Label>
                            <Form.Select
                              size="sm"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                              <option value="">All Months</option>
                              {monthNames.map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </Form.Select>
                          </Col>
                          <Col xs={12} sm={5} md={4}>
                            <Form.Label className="fs-filter-label">Financial Year</Form.Label>
                            <Form.Select
                              size="sm"
                              value={selectedFinancialYear}
                              onChange={(e) => setSelectedFinancialYear(e.target.value)}
                            >
                              <option value="">All Years</option>
                              <option value="2025-26">2025-26</option>
                              <option value="2026-27">2026-27</option>
                            </Form.Select>
                          </Col>
                          <Col xs={12} sm={2} md={2} className="d-flex">
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="w-100 fs-filter-reset"
                              onClick={() => {
                                const now = new Date();
                                const currentMonth = monthNames[now.getMonth()];
                                const currentYear = now.getFullYear();
                                const financialYear = now.getMonth() >= 3 ? `${currentYear}-${String(currentYear + 1).slice(2)}` : `${currentYear - 1}-${String(currentYear).slice(2)}`;
                                setSelectedMonth(currentMonth);
                                setSelectedFinancialYear(financialYear);
                              }}
                            >
                              Reset
                            </Button>
                          </Col>
                        </Form.Group>
                      </div>
                      {summary ? (
                        <>
                          <Row className="g-2 g-lg-3">
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaUsers size={14} />}
                                title="Total Beneficiaries"
                                value={summary.total_beneficiaries?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #667eea, #764ba2)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaUserFriends size={14} />}
                                title="Active Beneficiaries"
                                value={summary.active_beneficiaries?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #f093fb, #f5576c)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="Pregnant & Lactating"
                                value={summary.pregnant_women_lactating_mothers?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #4facfe, #00f2fe)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaUsers size={14} />}
                                title="THR 25 Days FRS/HCM (3y-6y)"
                                value={summary.thr_25_days_frs_hcm_beneficiaries_3y_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #43e97b, #38f9d7)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaUsers size={14} />}
                                title="HCM Beneficiaries (3y-6y)"
                                value={summary.hcm_beneficiaries_3y_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #fa709a, #fee140)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="Children 6m-3y"
                                value={summary.children_6m_3y_beneficiaries?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #30cfd0, #330867)"
                              />
                            </Col>
                          </Row>
                          <Row className="g-2 g-lg-3 mt-2">
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Mung Dal Khichdi"
                                value={summary.quarterly_packets_mung_dal_khichdi?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #667eea, #764ba2)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Poushik Sattu Mix"
                                value={summary.quarterly_packets_poushik_sattu_mix?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #f093fb, #f5576c)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Sattu Mix (75d, gm)"
                                value={summary.poushik_sattu_mix_75_days_packet_size_gm?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #4facfe, #00f2fe)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Sattu 2250gm"
                                value={summary.quarterly_packets_sattu_2250gm?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #43e97b, #38f9d7)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Mix 1000gm"
                                value={summary.quarterly_packets_mix_1000gm?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #fa709a, #fee140)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Multi Grain Aata 1250gm"
                                value={summary.quarterly_packets_multi_grain_aata_1250gm?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #30cfd0, #330867)"
                              />
                            </Col>
                          </Row>
                          <Row className="g-2 g-lg-3 mt-2">
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Panjeeri 75d 2625gm"
                                value={summary.panjeeri_75_days_2625gm_quarterly_packets?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #a8edea, #fed6e3)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBox size={14} />}
                                title="Panjeeri 75d 4625gm"
                                value={summary.panjeeri_75_days_4625gm_quarterly_packets?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #ff9a9e, #fecfef)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="SAM Children 6m-6y"
                                value={summary.sam_children_6m_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #667eea, #764ba2)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="SUW Children 6m-6y"
                                value={summary.suw_children_6m_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #f093fb, #f5576c)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="SAM Children 3y-6y"
                                value={summary.sam_children_3y_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #4facfe, #00f2fe)"
                              />
                            </Col>
                            <Col xs={12} sm={6} lg={2}>
                              <StatCard
                                icon={<FaBaby size={14} />}
                                title="SUW Children 3y-6y"
                                value={summary.suw_children_3y_6y?.toLocaleString() || 0}
                                color="linear-gradient(135deg, #43e97b, #38f9d7)"
                              />
                            </Col>
                          </Row>
                        </>
                      ) : null}
                    </div>
                  )}

                  <div className="dashboard-section">
                    <Card className="fs-table-card shadow-sm">
                      <Card.Header className="fs-table-card-header">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="fs-section-title mb-0">
                            <FaChartBar className="me-2" />
                            Supplementary Nutrition Records
                          </h5>
                          <Badge bg="primary" pill className="fs-count-badge">{filteredRecords.length} entries</Badge>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="fs-table-wrapper">
                          <Table hover className="fs-data-table mb-0">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Month</th>
                                <th>Fin. Year</th>
                                <th>Active Bene.</th>
                                <th>Total Bene.</th>
                                <th>Pregnant/Lactating</th>
                                <th>Pak. (Mung Dal)</th>
                                <th>Pak. (Sattu Mix)</th>
                                <th>Children 6m-3y</th>
                                <th className="text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecords.length === 0 ? (
                                <tr>
                                  <td colSpan="10" className="text-center py-5 text-muted">
                                    No records found. Click "Add Record" to create one.
                                  </td>
                                </tr>
                              ) : (
                                filteredRecords.map((record, index) => (
                                  <tr key={record.id}>
                                    <td className="text-muted">{index + 1}</td>
                                    <td><Badge bg="info-subtle" text="info-emphasis" className="fs-month-badge">{record.month}</Badge></td>
                                    <td>{record.financial_year}</td>
                                    <td>{record.active_beneficiaries?.toLocaleString()}</td>
                                    <td><strong className="text-primary">{record.total_beneficiaries?.toLocaleString()}</strong></td>
                                    <td>{record.pregnant_women_lactating_mothers?.toLocaleString()}</td>
                                    <td>{record.quarterly_packets_mung_dal_khichdi?.toLocaleString()}</td>
                                    <td>{record.quarterly_packets_poushik_sattu_mix?.toLocaleString()}</td>
                                    <td>{record.children_6m_3y_beneficiaries?.toLocaleString()}</td>
                                    <td className="text-center">
                                      <div className="fs-action-btns">
                                        <Button
                                          variant="light"
                                          size="sm"
                                          className="fs-action-btn fs-edit-btn"
                                          onClick={() => handleEdit(record)}
                                          title="Edit"
                                        >
                                          <FaEdit />
                                        </Button>
                                        <Button
                                          variant="light"
                                          size="sm"
                                          className="fs-action-btn fs-delete-btn"
                                          onClick={() => handleDeleteClick(record)}
                                          title="Delete"
                                        >
                                          <FaTrash />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </Table>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </>
              )}
            </>
          )}

          {view === "form" && (
            <div className="dashboard-section">
              <Card className="fs-table-card shadow-sm">
                <Form onSubmit={handleSubmit}>
                  <Card.Header className="fs-form-header">
                    <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-2">
                      <h5 className="mb-0">
                        {isEditing ? <FaEdit className="me-2" /> : <FaPlus className="me-2" />}
                        {isEditing ? "Edit Supplementary Record" : "Add Supplementary Record"}
                      </h5>
                      <Button variant="light" size="sm" onClick={() => setView("list")} className="fs-btn-light">
                        <FaArrowLeft className="me-1" /> Back to List
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Basic Information</h6>
                      <Row>
                        <Col md={6} lg={4}>{renderFormField("Month", "month", "select")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Financial Year", "financial_year", "text", "e.g. 2026-27")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Active Beneficiaries", "active_beneficiaries", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Total Beneficiaries", "total_beneficiaries", "number", "0")}</Col>
                      </Row>
                    </div>

                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Beneficiaries Details</h6>
                      <Row>
                        <Col md={6} lg={4}>{renderFormField("THR 25 Days FRS/HCM (3y-6y)", "thr_25_days_frs_hcm_beneficiaries_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("HCM Beneficiaries (3y-6y)", "hcm_beneficiaries_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Children 6m-3y", "children_6m_3y_beneficiaries", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Pregnant/Lactating Mothers", "pregnant_women_lactating_mothers", "number", "0")}</Col>
                      </Row>
                    </div>

                    <div className="fs-form-section mb-4">
                      <h6 className="fs-section-subtitle">Packets & Supplies Distribution</h6>
                      <Row>
                        <Col md={6} lg={4}>{renderFormField("Mung Dal Khichdi Packets", "quarterly_packets_mung_dal_khichdi", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Poushik Sattu Mix Packets", "quarterly_packets_poushik_sattu_mix", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Poushik Sattu Mix (75d, gm)", "poushik_sattu_mix_75_days_packet_size_gm", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Sattu 2250gm Packets", "quarterly_packets_sattu_2250gm", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Mix 1000gm Packets", "quarterly_packets_mix_1000gm", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Multi Grain Aata 1250gm", "quarterly_packets_multi_grain_aata_1250gm", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Panjeeri 75d 2625gm", "panjeeri_75_days_2625gm_quarterly_packets", "number", "0")}</Col>
                        <Col md={6} lg={4}>{renderFormField("Panjeeri 75d 4625gm", "panjeeri_75_days_4625gm_quarterly_packets", "number", "0")}</Col>
                      </Row>
                    </div>

                    <div className="fs-form-section">
                      <h6 className="fs-section-subtitle">SAM & SUW Children</h6>
                      <Row>
                        <Col md={6} lg={3}>{renderFormField("SAM Children 6m-6y", "sam_children_6m_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SUW Children 6m-6y", "suw_children_6m_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SAM Children 3y-6y", "sam_children_3y_6y", "number", "0")}</Col>
                        <Col md={6} lg={3}>{renderFormField("SUW Children 3y-6y", "suw_children_3y_6y", "number", "0")}</Col>
                      </Row>
                    </div>
                  </Card.Body>
                  <Card.Footer className="fs-form-footer">
                    <Button variant="light" onClick={() => setView("list")} className="fs-btn-light px-4">
                      <FaTimes className="me-1" /> Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={formLoading} className="fs-btn-primary px-4">
                      {formLoading ? (
                        <><Spinner as="span" animation="border" size="sm" className="me-1" /> Saving...</>
                      ) : (
                        <><FaSave className="me-1" /> {isEditing ? "Update Record" : "Save Record"}</>
                      )}
                    </Button>
                  </Card.Footer>
                </Form>
              </Card>
            </div>
          )}
        </Container>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered className="fs-modal">
        <Modal.Header closeButton className="fs-modal-header fs-delete-header">
          <Modal.Title><FaTrash className="me-2" />Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this record?</p>
          {deleteTarget && (
            <div className="fs-delete-detail">
              <strong>Month:</strong> {deleteTarget.month} &nbsp;|&nbsp;
              <strong>Year:</strong> {deleteTarget.financial_year} &nbsp;|&nbsp;
              <strong>Total Beneficiaries:</strong> {deleteTarget.total_beneficiaries}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="fs-modal-footer">
          <Button variant="light" onClick={() => setShowDeleteModal(false)} className="fs-btn-light"><FaTimes className="me-1" />Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} className="fs-btn-danger"><FaTrash className="me-1" />Delete</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FoodSupplementary;