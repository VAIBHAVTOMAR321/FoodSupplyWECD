import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, Collapse, Table } from "react-bootstrap";

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
  ]);
  const [selectedRole, setSelectedRole] = useState("dpo");
  const [users, setUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      const counts = {};
      // Fetch counts for director and dpo from a single endpoint
      const directorDpoResponse = await api.get('/director/districts/');
      const directorDpoUsers = directorDpoResponse.data?.data || [];
      counts.director = directorDpoUsers.filter(u => u.role === 'director').length;
      counts.dpo = directorDpoUsers.filter(u => u.role === 'dpo').length;

      // Fetch count for cdpo
      const cdpoResponse = await api.get('/director/projects/');
      counts.cdpo = cdpoResponse.data?.data?.length || 0;

      // Fetch counts for other roles individually
      const otherRoles = ["anganwadi"]; // Supervisor is now fetched from a different endpoint
      const otherRolePromises = otherRoles.map(async (role) => {
        const response = await api.get(`/list-users-by-role/?role=${role}`);
        counts[role] = response.data?.users?.length || 0;
      });

      await Promise.all(otherRolePromises);
      setRoleCounts(counts);

      // Fetch count for supervisor
      const supervisorResponse = await api.get('/director/sectors/');
      counts.supervisor = supervisorResponse.data?.data?.length || 0;
    } catch (err) {
      console.error("Failed to fetch role counts:", err);
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
      if (role === 'director' || role === 'dpo') {
          const response = await api.get('/director/districts/');
          const allUsers = response.data?.data || [];
          const filteredUsers = allUsers
            .filter(user => user.role === role)
            .map(user => {
              const baseUser = { ...user };
              baseUser.name = user.district || user.username;
              baseUser.unique_id = user.unique_id || user.username;
              return baseUser;
            });
          setUsers(filteredUsers);
      } else if (role === 'cdpo') {
          const response = await api.get('/director/projects/');
          const allUsers = response.data?.data || [];
          const filteredUsers = allUsers.map(user => {
            const baseUser = { ...user };
            baseUser.name = user.project_name || user.username;
            baseUser.unique_id = user.username; // The username is the unique identifier for reset
            return baseUser;
          });
          setUsers(filteredUsers);
      } else if (role === 'supervisor') {
          const response = await api.get('/director/sectors/');
          const allUsers = response.data?.data || [];
          const filteredUsers = allUsers.map(user => {
            const baseUser = { ...user };
            baseUser.name = user.sector_incharge || user.username;
            baseUser.unique_id = user.username;
            return baseUser;
          });
          setUsers(filteredUsers);
      } else {
          const response = await api.get(`/list-users-by-role/?role=${role}`);
          setUsers(response.data?.users || []);
      }
    } catch (err) {
      setError(`Failed to fetch users for role: ${role}.`);
      console.error(err);
      setUsers([]);
    }
    finally {
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
    setSelectedUsers([]); // Clear selections when role changes
    setUsers([]);
  };

  const handleDirectReset = async (userToReset) => {
    if (!userToReset) return;

    if (!window.confirm(`Are you sure you want to reset the password for ${userToReset.name}? This will happen immediately.`)) {
      return;
    }

    setLoadingUsers(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        users: [{
          username: userToReset.username,
          role: selectedRole,
        }],
      };
      await api.post("/bulk-password-reset/", payload);
      setSuccess(`Password for ${userToReset.name} has been reset successfully.`);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to reset password for ${userToReset.name}.`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleBulkReset = async () => {
    if (selectedUsers.length === 0) return;

    if (!window.confirm(`Are you sure you want to reset passwords for ${selectedUsers.length} selected users? This will happen immediately.`)) {
      return;
    }

    setLoadingUsers(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        users: selectedUsers.map(username => ({
          username: username,
          role: selectedRole,
        })),
      };

      await api.post("/bulk-password-reset/", payload);
      setSuccess(`Passwords for ${selectedUsers.length} selected users have been reset successfully.`);
      setSelectedUsers([]); // Clear selection after successful reset
    } catch (err) {
      setError(err.response?.data?.error || `Failed to reset passwords for selected users.`);
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSelectUser = (uniqueId) => {
    // Ensure uniqueId is a string before includes check
    const idAsString = String(uniqueId);
    setSelectedUsers(prev =>
      prev.includes(idAsString)
        ? prev.filter(id => id !== idAsString)
        : [...prev, idAsString]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(user => user.unique_id));
    } else {
      setSelectedUsers([]);
    }
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

          

          <Row className="g-3 mb-4">
            {roles.map(role => (
              <Col key={role.key} md={4} lg={3}>
                <Card
                  className={`role-card-new ${selectedRole === role.key ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect(role.key)}
                >
                  <Card.Body className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div className="role-icon-wrapper me-3 flex-shrink-0">{role.icon}</div>
                      <div className="role-details">
                        <Card.Title as="h6" className="mb-0">{role.label}</Card.Title>
                      </div>
                    </div>
                    <div className="role-count">
                      {loadingCounts ? <Spinner animation="border" size="sm" variant="secondary" /> : 
                        <span className="fw-bold">{roleCounts[role.key] !== undefined ? roleCounts[role.key] : 0}</span>
                      }
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          <Collapse in={!!selectedRole}>
            <div>
              <Row className="justify-content-center">
                <Col md={12}>
                  <Card className="shadow-sm">
                    <Card.Header as="h5" className="bg-primary text-white text-capitalize d-flex justify-content-between align-items-center">
                      <span>
                        Reset Password for {selectedRole} {users.length > 0 && `(${users.length} Users)`}
                      </span>
                      {selectedUsers.length > 0 && (
                        <Button variant="light" size="sm" onClick={handleBulkReset}>
                          Reset Password for Selected ({selectedUsers.length})
                        </Button>
                      )}
                    </Card.Header>
                   
                      {loadingUsers ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                      ) : users.length > 0 ? (
                        <Table striped bordered hover responsive>
                          <thead>
                            <tr>
                              <th>
                                <Form.Check 
                                  type="checkbox"
                                  onChange={handleSelectAll}
                                  checked={users.length > 0 && selectedUsers.length === users.length}
                                />
                              </th>
                              <th>#</th>
                              {users.length > 0 && Object.keys(users[0]).map(key => {
                                // Don't create columns for internal/unwanted keys
                                if (['id', 'role', 'stat_fin', 'db_use', 'sdname', 'unique_id', 'bill_use', 'updated_on'].includes(key)) return null;
                                return (
                                  <th key={key} className="text-capitalize">{key.replace(/_/g, ' ')}</th>
                                );
                              })}
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user, index) => (
                              <tr key={user.unique_id || user.username}>
                                <td>
                                  <Form.Check 
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.unique_id)}
                                    onChange={() => handleSelectUser(user.unique_id)}
                                  />
                                </td>
                                <td>{index + 1}</td>
                                {Object.keys(user).map(key => {
                                  if (['id', 'role', 'stat_fin', 'db_use', 'sdname', 'unique_id', 'bill_use', 'updated_on'].includes(key)) return null;
                                  return (
                                    <td key={key}>{user[key]}</td>
                                  );
                                })}
                                <td>
                                  <Button variant="outline-primary" size="sm" onClick={() => handleDirectReset(user)}>
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
                   
                  </Card>
                </Col>
              </Row>
            </div>
          </Collapse>

        </Container>
      </div>
    </div>
  );
};

export default AllRoleResetpassword;