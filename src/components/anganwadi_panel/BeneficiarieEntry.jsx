import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Alert, Button, Modal, Form, ListGroup } from "react-bootstrap";

import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/anganwadileftnav.css";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";
import { FaUtensils, FaBoxOpen, FaChevronDown, FaChevronUp, FaDolly, FaEdit, FaTrash, FaEye, FaBuilding, FaHashtag, FaUsers, FaWeightHanging, FaCalendarDay, FaMapMarkerAlt, FaCubes, FaProjectDiagram, FaInfoCircle, FaClock } from "react-icons/fa";
import "../../assets/css/AnganwadiDashboard.css";



const BeneficiarieEntry = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [counts, setCounts] = useState({ hcm: 0, thr: 0 });
  const [loading, setLoading] = useState({ counts: true, table: false });
  const [error, setError] = useState({ counts: "", table: "" });

  const [activeScheme, setActiveScheme] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [distributionRecords, setDistributionRecords] = useState([]);
  
  // State for distribution modal
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [distributionData, setDistributionData] = useState({ total_beneficiaries: '', date: '', fin_year: '', quarter: '' });
  const [distributionError, setDistributionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);

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
              Anganwadi BeneficiarieEntry
            </h3>
            
          </div>
         
          </Container>

         
      </div>

   
    
     </div>
  );
};

export default BeneficiarieEntry;