import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Button } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/supervisorleftnav.css";
import SupervisorHeader from "./SupervisorHeader";
import SupervisorLeftNav from "./SupervisorLeftNav";

const SupervisorDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { user, api, uniqueId } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

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

   const fetchCandidates = async () => {
     setLoading(true);
     try {
       const response = await api.get("/candidate-by-sector/", {
         params: { sector_id: uniqueId }
       });
       setCandidates(response.data.data || []);
       setTotalRegistrations(response.data.count || 0);
     } catch (err) {
       console.error("Failed to fetch candidates:", err);
       setCandidates([]);
       setTotalRegistrations(0);
     } finally {
       setLoading(false);
     }
   };

 
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
          <div className="main-heading">
            <h3 className="mb-4 fw-bold">
              Supervisor Dashboard
            </h3>
          </div>

        
        </Container>

     
      </div>
    </div>
  );
};

export default SupervisorDashBoard;