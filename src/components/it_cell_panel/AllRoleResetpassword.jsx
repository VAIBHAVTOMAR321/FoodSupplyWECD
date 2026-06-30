import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, InputGroup, Collapse, Table, Modal } from "react-bootstrap";

import "../../assets/css/itcellLeftnav.css";

import { useAuth } from "../all_login/AuthContext";
import { FaEye, FaEyeSlash, FaKey, FaUserShield, FaUserGraduate, FaUserCog, FaUserTie, FaHome, FaLaptopCode } from "react-icons/fa";
import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const AllRoleResetpassword = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const [roles] = useState([
    { key: "director", label: "Director", icon: <FaUserGraduate /> },
    { key: "dpo", label: "DPO", icon: <FaUserCog /> },
    { key: "cdpo", label: "CDPO", icon: <FaUserShield /> },
    { key: "supervisor", label: "Supervisor", icon: <FaUserTie /> },
    { key: "anganwadi", label: "Anganwadi", icon: <FaHome /> },
    { key: "it", label: "IT Cell", icon: <FaLaptopCode /> },
  ]);
  const [selectedRole, setSelectedRole] = useState("");
  const [users, setUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State for the reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalFormErrors, setModalFormErrors] = useState({});

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

  const fetchRoleCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      // This is a hypothetical endpoint. The backend would need to implement it.
      const response = await api.get('/user-counts-by-role/');
      setRoleCounts(response.data?.counts || {});
    } catch (err) {
      console.error("Failed to fetch role counts:", err);
      // Silently fail, as this is an enhancement, not critical functionality.
      setRoleCounts({});
    } finally {
      setLoadingCounts(false);
    }
  }, [api]);

  const fetchUsersByRole = useCallback(async (role) => {
    if (!role) {
      setUsers([]);
      return;
    }
    setLoadingUsers(true);
    setError("");
    try {
      const response = await api.get(`/list-users-by-role/?role=${role}`);
      setUsers(response.data?.users || []);
    } catch (err) {
      setError(`Failed to fetch users for role: ${role}.`);
      console.error(err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedRole) {
      fetchUsersByRole(selectedRole);
    }
  }, [selectedRole, fetchUsersByRole]);

  useEffect(() => {
    if (api) fetchRoleCounts();
  }, [api, fetchRoleCounts]);

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setUsers([]);
    setModalFormErrors({});
  };

  const handleResetClick = (user) => {
    setResettingUser(user);
    setShowResetModal(true);
    setNewPassword("");
    setConfirmNewPassword("");
    setModalFormErrors({});
    setSuccess("");
    setError("");
  };

  const handleCloseModal = () => {
    setShowResetModal(false);
    setResettingUser(null);
  };

  const validateModalForm = () => {
    const errors = {};
    if (!newPassword) {
      errors.newPassword = "New password is required.";
    } else if (newPassword.length < 4) {
      errors.newPassword = "Password must be at least 4 characters long.";
    }
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Passwords do not match.";
    }
    setModalFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateModalForm()) return;

    setModalSubmitting(true);
    try {
      const payload = {
        role: selectedRole,
        unique_id: resettingUser.unique_id,
        new_password: newPassword,
      };
      await api.put("/reset-password/", payload);
      setSuccess(`Password for ${resettingUser.name} has been reset successfully!`);
      handleCloseModal();
    } catch (err) {
      const apiError = err.response?.data?.error || "An unexpected error occurred.";
      setError(apiError);
      console.error(err);
    } finally {
      setModalSubmitting(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
            <h3 className="mb-4 fw-bold"><FaUserShield className="me-2" /> All Role Password Reset</h3>
          </div>

          <p className="text-muted mb-4">Select a role to manage user passwords.</p>

          <Row className="g-3 mb-4">
            {roles.map(role => (
              <Col key={role.key} md={4} lg={2}>
                <Card
                  className={`text-center role-card ${selectedRole === role.key ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect(role.key)}
                >
                  <Card.Body>
                    <div className="role-icon">{role.icon}</div>
                    <Card.Title as="h6" className="mt-2 mb-0">{role.label}</Card.Title>
                    <Card.Text className="text-muted small mt-1">
                      {loadingCounts ? <Spinner animation="grow" size="sm" variant="secondary" /> : `Users: ${roleCounts[role.key] || 0}`}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Collapse in={!!selectedRole}>
            <div>
              <Row className="justify-content-center">
                <Col md={12}>
                  <Card className="shadow-sm">
                    <Card.Header as="h5" className="bg-primary text-white text-capitalize">Reset Password for {selectedRole}</Card.Header>
                    <Card.Body>
                      {loadingUsers ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                      ) : users.length > 0 ? (
                        <Table striped bordered hover responsive>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>User Name</th>
                              <th>Unique ID</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user, index) => (
                              <tr key={user.unique_id}>
                                <td>{index + 1}</td>
                                <td>{user.name}</td>
                                <td>{user.unique_id}</td>
                                <td>
                                  <Button variant="outline-primary" size="sm" onClick={() => handleResetClick(user)}>
                                    <FaKey className="me-1" /> Reset Password
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <div className="text-center text-muted">No users found for this role.</div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          </Collapse>

          <Modal show={showResetModal} onHide={handleCloseModal} centered>
            <Modal.Header closeButton>
              <Modal.Title>Reset Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {resettingUser && (
                <Form onSubmit={handleModalSubmit}>
                  <p>Resetting password for <strong>{resettingUser.name}</strong> ({resettingUser.unique_id})</p>
                  
                  {error && <Alert variant="danger">{error}</Alert>}

                  <Form.Group className="mb-3" controlId="newPassword">
                    <Form.Label>New Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        isInvalid={!!modalFormErrors.newPassword}
                      />
                      <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      <Form.Control.Feedback type="invalid">{modalFormErrors.newPassword}</Form.Control.Feedback>
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-4" controlId="confirmPassword">
                    <Form.Label>Confirm New Password</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        isInvalid={!!modalFormErrors.confirmNewPassword}
                      />
                      <Button variant="outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      <Form.Control.Feedback type="invalid">{modalFormErrors.confirmNewPassword}</Form.Control.Feedback>
                    </InputGroup>
                  </Form.Group>

                  <div className="d-flex justify-content-end">
                    <Button variant="secondary" onClick={handleCloseModal} className="me-2">
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={modalSubmitting}>
                      {modalSubmitting ? (
                        <><Spinner as="span" animation="border" size="sm" /><span className="ms-2">Resetting...</span></>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Modal.Body>
          </Modal>
        </Container>
      </div>
    </div>
  );
};

export default AllRoleResetpassword;