import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button } from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/itcellLeftnav.css";

import ITCellLeftNav from "./ITCellLeftNav";
import ITCellHeader from "./ITCellHeader";

const ITCellDashBoard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  const { user, api } = useAuth();
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
            <h3 className="mb-4 fw-bold">
              IT Dashboard
            </h3>
          </div>

        
        </Container>

     
      </div>
    </div>
  );
};

export default ITCellDashBoard;