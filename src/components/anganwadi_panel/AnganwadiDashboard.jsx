import React, { useState, useEffect, useMemo } from "react";
import { Container, Card, Table, Modal, Button, Form, Row, Col, Spinner } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/anganwadileftnav.css";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";



const AnganwadiDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { user, api, uniqueId } = useAuth();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);


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


  return (
  
    <div className="dashboard-container">
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />
  
        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="mb-4 fw-bold">
              Anganwadi Dashboard
            </h3>
            
          </div>

     
          </Container>

         
      </div>

   
    
     </div>
  );
};

export default AnganwadiDashboard;