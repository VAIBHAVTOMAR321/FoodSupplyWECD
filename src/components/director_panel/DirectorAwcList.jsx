import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Table, Tabs, Tab, Pagination } from "react-bootstrap";
import { useLocation } from "react-router-dom";

import "../../assets/css/itcellLeftnav.css";

import { useAuth } from "../all_login/AuthContext";import { FaUserShield, FaUserGraduate, FaUserCog, FaUserTie, FaHome } from "react-icons/fa";
import DirectorLeftNav from "./DirectorLeftNav";
import DirectorHeader from "./DirectorHeader";

const DirectorAwcList = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState("dpo"); // Default tab
  const [roleCounts, setRoleCounts] = useState({});
  const [dpoData, setDpoData] = useState([]);
  const [cdpoData, setCdpoData] = useState([]);
  const [supervisorData, setSupervisorData] = useState([]);
  const [anganwadiData, setAnganwadiData] = useState([]);
  const [loading, setLoading] = useState({
    dpo: true,
    cdpo: true,
    supervisor: true,
    anganwadi: true,
  });
  const [loadingCounts, setLoadingCounts] = useState({
    dpo: true,
    cdpo: true,
    supervisor: true,
    anganwadi: true,
  });
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Read the 'tab' query parameter from the URL
  const queryTab = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("tab") || "dpo"; // Default to 'dpo' if not present
  }, [location.search]);

  useEffect(() => {
    setActiveTab(queryTab);
    setCurrentPage(1);
  }, [queryTab]);

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

  const fetchDataForTab = useCallback(async (tab) => {
    setLoading(prev => ({ ...prev, [tab]: true }));
    setLoadingCounts(prev => ({ ...prev, [tab]: true }));
    setError("");

    const endpoints = {
      dpo: '/director/districts/',
      cdpo: '/director/projects/',
      supervisor: '/director/sectors/',
      anganwadi: '/director/awc-list/',
    };

    try {
      const response = await api.get(endpoints[tab]);
      let data = response.data?.data || [];

      switch (tab) {
        case 'dpo':
          data = data.filter(u => u.role === 'dpo');
          setDpoData(data);
          break;
        case 'cdpo':
          setCdpoData(data);
          break;
        case 'supervisor':
          setSupervisorData(data);
          break;
        case 'anganwadi':
          setAnganwadiData(data);
          break;
        default:
          break;
      }

      setRoleCounts(prev => ({ ...prev, [tab]: data.length }));
    } catch (err) {
      setError(`Failed to fetch ${tab} list.`);
      console.error(`Failed to fetch ${tab} data:`, err);
    } finally { 
      setLoadingCounts(prev => ({ ...prev, [tab]: false }));
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [api]);

  useEffect(() => {
    if (api) {
      fetchDataForTab('dpo');
      fetchDataForTab('cdpo');
      fetchDataForTab('supervisor');
      fetchDataForTab('anganwadi');
    }
  }, [api, fetchDataForTab]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const handlePageChange = (pageNumber) => {
      setCurrentPage(pageNumber);
    };

    let items = [];
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

    for (let i = startPage; i <= endPage; i++) {
      items.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>{i}</Pagination.Item>);
    }

    return (
      <Pagination className="justify-content-end mt-3">
        <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
        {startPage > 1 && <Pagination.Ellipsis />}
        {items}
        {endPage < totalPages && <Pagination.Ellipsis />}
        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
      </Pagination>
    );
  };

  const renderTable = (data, tabKey, columnsToExclude = [], totalItems) => {
    if (loading[tabKey]) return <div className="text-center p-4"><Spinner animation="border" /></div>;
    if (!data || data.length === 0) return <div className="text-center p-4 text-muted">No users found for this role.</div>;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
    const headers = Object.keys(currentItems[0]).filter(key => !columnsToExclude.includes(key));

    return (
      <>
        <div className="table-responsive">
          <Table striped bordered hover responsive className="mb-0">
            <thead className="table-light">
              <tr>
                <th>#</th>
                {headers.map(key => <th key={key} className="text-capitalize">{key.replace(/_/g, ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{indexOfFirstItem + index + 1}</td>
                  {headers.map(key => <td key={key}>{item[key]}</td>)}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {renderPagination(totalItems)}
      </>
    );
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
            <h3 className="mb-4 fw-bold"><FaUserShield className="me-2" />DPO CDPO Sector  &  AWC List</h3>
          </div>

          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => {
              setActiveTab(k);
              setCurrentPage(1);
            }}
            id="director-awc-list-tabs"
            className="mb-4"
          >
            <Tab eventKey="dpo" title={
              <span>
                <FaUserCog className="me-2" /> DPO List {loadingCounts.dpo ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.dpo ?? 0})`}
              </span>
            }>
              {renderTable(dpoData, 'dpo', ['id', 'role', 'unique_id', 'name'], roleCounts.dpo)}
            </Tab>

            <Tab eventKey="cdpo" title={
              <span>
                <FaUserShield className="me-2" /> CDPO List {loadingCounts.cdpo ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.cdpo ?? 0})`}
              </span>
            }>
              {renderTable(cdpoData, 'cdpo', ['id', 'unique_id', 'name', 'stat_fin', 'ang_pur', 'adhar_stat'], roleCounts.cdpo)}
            </Tab>

            <Tab eventKey="supervisor" title={
              <span>
                <FaUserTie className="me-2" /> Supervisor List {loadingCounts.supervisor ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.supervisor ?? 0})`}
              </span>
            }>
              {renderTable(supervisorData, 'supervisor', ['id', 'unique_id', 'name', 'sdname'], roleCounts.supervisor)}
            </Tab>

            <Tab eventKey="anganwadi" title={
              <span>
                <FaHome className="me-2" /> Anganwadi List {loadingCounts.anganwadi ? <Spinner as="span" size="sm" animation="border" /> : `(${roleCounts.anganwadi ?? 0})`}
              </span>
            }>
              {renderTable(anganwadiData, 'anganwadi', ['id', 'unique_id', 'name', 'code1', 'district_code', 'updated_on', 'bill_use', 'db_use'], roleCounts.anganwadi)}
            </Tab>
          </Tabs>

        </Container>
      </div>
    </div>
  );
};

export default DirectorAwcList;