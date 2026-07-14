import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Container,
  Card,
  Form,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  Table,
  Badge,
  Pagination,
  Modal,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/dashboard.css";
import { FaUserCircle } from "react-icons/fa";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";

const SupervisorBeneficiarieEntry = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadingAction, setLoadingAction] = useState({});
  const [openRemarkId, setOpenRemarkId] = useState(null);
  const [openRemarkAction, setOpenRemarkAction] = useState("");
  const [remarkValue, setRemarkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkRemarkModal, setShowBulkRemarkModal] = useState(false);
  const [bulkRemark, setBulkRemark] = useState("");
  const [bulkAction, setBulkAction] = useState("");


  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/supervisor-beneficiary-registration/");
      setReports(response.data.data || []);
    } catch (err) {
      setError("Failed to fetch beneficiary reports.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = currentItems.map(item => item.id);
      setSelectedIds(allFilteredIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    const pendingIds = reports
      .filter(item => item.sector_status === 'pending')
      .map(item => item.id);
    setSelectedIds(pendingIds);
  };

  const isAllSelected = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = reports.slice(indexOfFirstItem, indexOfLastItem);
    return currentItems.length > 0 && currentItems.every(item => selectedIds.includes(item.id));
  }, [reports, selectedIds, currentPage, itemsPerPage]);


  const handleToggleRemark = (item, action) => {
    if (openRemarkId === item.id && openRemarkAction === action) {
      setOpenRemarkId(null);
      setOpenRemarkAction("");
    } else {
      setOpenRemarkId(item.id);
      setOpenRemarkAction(action);
      setRemarkValue("");
      setActionError("");
    }
  };

  const handleStatusUpdate = async (item) => {
    const action = openRemarkAction;
    const remark = remarkValue.trim();
    setActionError("");

    if (action === "rejected" && !remark) {
      setActionError("Please enter a remark for rejection.");
      return;
    }

    setSubmitting(true);
    setLoadingAction((prev) => ({ ...prev, [item.id]: true }));
    try {
      const response = await api.put("/supervisor-beneficiary-registration/", {
        id: item.id,
        sector_status: action,
        sector_remark: remark || null,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Status updated to ${action} successfully.`);
        setReports((prev) =>
          prev.map((d) =>
            d.id === item.id
              ? { ...d, sector_status: action, sector_remark: remark || null }
              : d
          )
        );
        setOpenRemarkId(null);
        setOpenRemarkAction("");
        setRemarkValue("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || "Failed to update status.");
      }
    } catch (err) {
      setActionError("Failed to update status. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setLoadingAction((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      setActionError("No items selected.");
      return;
    }
    if (bulkAction === "approved" && !bulkRemark) {
      setActionError("Please enter a remark for bulk approval.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put("/supervisor-beneficiary-registration/", {
        ids: selectedIds,
        sector_status: bulkAction,
        sector_remark: bulkRemark,
      });

      if (response.data?.success !== false) {
        setSuccessMsg(`Successfully updated ${selectedIds.length} items.`);
        fetchReports(); // Refetch to get updated data
        setSelectedIds([]);
        setShowBulkRemarkModal(false);
        setBulkRemark("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setActionError(response.data?.message || "Failed to perform bulk action.");
      }
    } catch (err) {
      setActionError("Failed to perform bulk action. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
      setShowBulkRemarkModal(false);
    }
  };

  const handleCancelAction = () => {
    setOpenRemarkId(null);
    setActionError("");
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      default:
        return "warning";
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = reports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reports.length / itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return <Pagination>{items}</Pagination>;
  };

  return (
    <div className="dashboard-container">
      <SupervisorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <SupervisorHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <h3 className="mb-4 fw-bold">
            <FaUserCircle className="me-2" /> लाभार्थी रिपोर्ट स्वीकृति
          </h3>
          {successMsg && <Alert variant="success">{successMsg}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          {actionError && <Alert variant="danger">{actionError}</Alert>}

          <div className="mb-3 d-flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="primary" size="sm" onClick={() => { setBulkAction("approved"); setShowBulkRemarkModal(true); }}>
                Approve Selected ({selectedIds.length})
              </Button>
            )}
            <Button variant="info" size="sm" onClick={handleSelectAllPending}>Select All Pending</Button>
          </div>


          <h5 className="mt-4">आंगनबाड़ियों से लाभार्थी रिपोर्ट</h5>
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>
                      <Form.Check
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={isAllSelected}
                      />
                    </th>
                    <th>#</th>
                    <th>AWC का नाम</th>
                    <th>वित्तीय वर्ष</th>
                    <th>महीना</th>
                    <th>PW & LM</th>
                    <th>बच्चे (6 महीने-3 वर्ष)</th>
                    <th>बच्चे (3-6 वर्ष)</th>
                    <th>किशोरी लड़कियां</th>
                    <th>SAM (6 महीने-3 वर्ष)</th>
                    <th>SAM (3-5 वर्ष)</th>
                    <th>SUW (6 महीने-3 वर्ष)</th>
                    <th>SUW (3-6 वर्ष)</th>
                    <th>सेक्टर स्थिति</th>
                    <th>क्रियाएं</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((report, index) => (
                      <React.Fragment key={report.id}>
                        <tr>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedIds.includes(report.id)}
                              onChange={() => handleSelectOne(report.id)}
                            />
                          </td>
                          <td>{indexOfFirstItem + index + 1}</td>
                          <td>{report.awc_name}</td>
                          <td>{report.fin_year}</td>
                          <td>{report.month}</td>
                          <td>{report.pw_lm}</td>
                          <td>{report.children_6m_3y}</td>
                          <td>{report.children_3_6y}</td>
                          <td>{report.adolescent_girls}</td>
                          <td>{report.sam_6m_3y}</td>
                          <td>{report.sam_3_5y}</td>
                          <td>{report.suw_6m_3y}</td>
                          <td>{report.suw_3_6y}</td>
                          <td>
                            <Badge bg={getStatusVariant(report.sector_status)}>
                              {report.sector_status}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-success" size="sm" className="me-2" disabled={report.sector_status === "approved" || loadingAction[report.id]} onClick={() => handleToggleRemark(report, "approved")}>स्वीकृत</Button>
                            <Button variant="outline-danger" size="sm" disabled={report.sector_status === "rejected" || loadingAction[report.id]} onClick={() => handleToggleRemark(report, "rejected")}>अस्वीकार</Button>
                          </td>
                        </tr>
                        {openRemarkId === report.id && (
                          <tr>
                            <td colSpan="15">
                              <div className="d-flex align-items-start gap-2 p-2">
                                <Form.Control
                                  type="text"
                                  size="sm"
                                  placeholder="टिप्पणी दर्ज करें (अस्वीकृति के लिए आवश्यक)"
                                  value={remarkValue}
                                  onChange={(e) => setRemarkValue(e.target.value)}
                                  className="me-2"
                                  style={{ maxWidth: "300px" }}
                                />
                                <Button size="sm" variant={openRemarkAction === "approved" ? "success" : "danger"} disabled={submitting} onClick={() => handleStatusUpdate(report)}>
                                  {submitting ? "सहेजा जा रहा है..." : "सहेजें"}
                                </Button>
                                <Button size="sm" variant="secondary" disabled={submitting} onClick={handleCancelAction}>
                                  रद्द करें
                                </Button>
                              </div>
                              {actionError && openRemarkAction === 'rejected' && <small className="text-danger ms-2">{actionError}</small>}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="15" className="text-center">
                        कोई रिपोर्ट नहीं मिली।
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
          {reports.length > 0 && (
            <div className="d-flex justify-content-end">
              {renderPagination()}
            </div>
          )}
          <Modal show={showBulkRemarkModal} onHide={() => setShowBulkRemarkModal(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Bulk Approve Remark</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Remark for Approval</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter remark (e.g., approved)"
                  value={bulkRemark}
                  onChange={(e) => setBulkRemark(e.target.value)}
                />
              </Form.Group>
              {actionError && <Alert variant="danger" className="mt-3">{actionError}</Alert>}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowBulkRemarkModal(false)}>Cancel</Button>
              <Button variant="success" onClick={handleBulkAction} disabled={submitting}>
                {submitting ? "Submitting..." : `Approve ${selectedIds.length} items`}
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default SupervisorBeneficiarieEntry;
