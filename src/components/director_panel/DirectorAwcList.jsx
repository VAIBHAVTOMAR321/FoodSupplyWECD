import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, Collapse, Table, Pagination } from "react-bootstrap";

import "../../assets/css/itcellLeftnav.css";

import { useAuth } from "../all_login/AuthContext";import { FaUserShield, FaUserGraduate, FaUserCog, FaUserTie, FaHome } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

const DirectorAwcList = () => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState("");

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
      const [
        directorDpoResponse,
        cdpoResponse,
        anganwadiResponse,
        supervisorResponse,
      ] = await Promise.all([
        api.get('/director/districts/'),
        api.get('/director/projects/'),
        api.get('/director/awc-list/'),
        api.get('/director/sectors/'),
      ]);

      const directorDpoUsers = directorDpoResponse.data?.data || [];

      const newCounts = {
        director: directorDpoUsers.filter(u => u.role === 'director').length,
        dpo: directorDpoUsers.filter(u => u.role === 'dpo').length,
        cdpo: cdpoResponse.data?.data?.length || 0,
        anganwadi: anganwadiResponse.data?.data?.length || 0,
        supervisor: supervisorResponse.data?.data?.length || 0,
      };
      setRoleCounts(newCounts);
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
      } else if (role === 'anganwadi') {
          const response = await api.get('/director/awc-list/');
          const allUsers = response.data?.data || [];
          const filteredUsers = allUsers.map(user => ({
            ...user,
            name: user.awc_name,
            unique_id: user.username,
          }));
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
    setCurrentPage(1); // Reset to first page
    setUsers([]);
  };

  const handleDirectReset = async (userToReset) => {
    if (!userToReset) return;

    if (!window.confirm(`Are you sure you want to reset the password for ${userToReset.name}? This will happen immediately.`)) {
      return;
    }

    setLoadingUsers(true);
    setError("");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const items = [];
    const maxPagesToShow = 5;
    let startPage, endPage;

    if (totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = totalPages;
    } else {
      if (currentPage <= Math.floor(maxPagesToShow / 2) + 1) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (currentPage + Math.floor(maxPagesToShow / 2) >= totalPages) {
        startPage = totalPages - maxPagesToShow + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - Math.floor(maxPagesToShow / 2);
        endPage = currentPage + Math.floor(maxPagesToShow / 2);
      }
    }

    for (let i = startPage; i <= endPage; i++) { items.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => setCurrentPage(i)}>{i}</Pagination.Item>); }

    return (<Pagination className="justify-content-end mt-3"> <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} /> <Pagination.Prev onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} /> {startPage > 1 && <Pagination.Ellipsis />} {items} {endPage < totalPages && <Pagination.Ellipsis />} <Pagination.Next onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} /> <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} /> </Pagination>);
  };


  return (
    <div className="dashboard-container">
      <DirectorLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <DirectorHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading">
            <h3 className="mb-4 fw-bold"><FaUserShield className="me-2" />all list</h3>
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

          <Collapse in={!!selectedRole}>
            <div>
              <Row className="justify-content-center">
                <Col md={12}>
                  <Card className="shadow-sm">
                    <Card.Header as="h5" className="bg-primary text-white text-capitalize d-flex justify-content-between align-items-center">
                      <span>
                        {selectedRole} List {users.length > 0 && `(${users.length} Users)`}
                      </span>
                    </Card.Header>
                   
                      {loadingUsers ? (
                        <div className="text-center"><Spinner animation="border" /></div>
                      ) : users.length > 0 ? (
                        <>
                          <Table striped bordered hover responsive>
                          <thead>
                            <tr>
                              <th style={{ width: '5%' }}>#</th>
                              {users.length > 0 && Object.keys(users[0]).map(key => {
                                // Don't create columns for internal/unwanted keys
                                if (['id', 'role', 'stat_fin', 'db_use', 'sdname', 'unique_id', 'bill_use', 'updated_on', 'district_code', 'code1', 'ang_pur_adhar_stat'].includes(key)) return null;
                                return (
                                  <th key={key} className="text-capitalize">{key.replace(/_/g, ' ')}</th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {currentUsers.map((user, index) => (
                              <tr key={user.unique_id || user.username}>
                                <td>{indexOfFirstItem + index + 1}</td>
                                {Object.keys(user).map(key => {
                                  if (['id', 'role', 'stat_fin', 'db_use', 'sdname', 'unique_id', 'bill_use', 'updated_on', 'district_code', 'code1', 'ang_pur_adhar_stat'].includes(key)) return null;
                                  return (
                                    <td key={key}>{user[key]}</td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                          </Table>
                          {renderPagination()}
                        </>
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

export default DirectorAwcList;