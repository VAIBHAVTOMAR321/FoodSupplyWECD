import React, { useState, useEffect } from "react";
import {
  Container,
  Table,
  Spinner,
  Alert,
  Button,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiProfile.css";
import { FaEye, FaEyeSlash, FaUserCircle, FaLock } from "react-icons/fa";
import { useAuth } from "../all_login/AuthContext";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";

const AwcAganWadi = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api } = useAuth();
  const navigate = useNavigate();
  const [awcList, setAwcList] = useState([]);
  const [awcLoading, setAwcLoading] = useState(true);
  const [awcError, setAwcError] = useState("");
  const [awcCount, setAwcCount] = useState(0);

  const [sectorIncharge, setSectorIncharge] = useState("");
  const [inchargeMob, setInchargeMob] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const fetchAwcList = async () => {
    setAwcLoading(true);
    setAwcError("");
    try {
      const response = await api.get("/sector-awc-dropdown/");
      const rawData = Array.isArray(response.data?.data) ? response.data.data : [];
      setAwcList(rawData);
      setAwcCount(Number(response.data?.count ?? rawData.length));
    } catch (err) {
      console.error("Failed to fetch AWC list:", err);
      setAwcError("Failed to load AWC list. Please try again.");
      setAwcList([]);
      setAwcCount(0);
    } finally {
      setAwcLoading(false);
    }
  };

  useEffect(() => {
    if (api) {
      fetchAwcList();
    }
  }, [api]);

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <Button variant="outline-secondary" size="sm" onClick={() => navigate("/SupervisorDashBoard")}>
                &larr; Back to Dashboard
              </Button>
              <h3 className="mb-0">AWC List</h3>
            </div>
            <div>
              {awcLoading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <span className="text-muted">Total AWC: {awcCount.toLocaleString()}</span>
              )}
            </div>
          </div>

          {awcLoading ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : awcError ? (
            <Alert variant="danger">{awcError}</Alert>
          ) : awcList.length === 0 ? (
            <div className="text-center py-4 text-muted">No AWC data available.</div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District Name</th>
                    <th>District Code</th>
                    <th>Project</th>
                    <th>Sector</th>
                    <th>AWC Code</th>
                    <th>AWC Name</th>
                    <th>AWC Type</th>
                    <th>Code1</th>
                  </tr>
                </thead>
                <tbody>
                  {awcList.map((awc, index) => (
                    <tr key={`${awc.awc_code}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{awc.district_name}</td>
                      <td>{awc.district_code}</td>
                      <td>{awc.project}</td>
                      <td>{awc.sector}</td>
                      <td>{awc.awc_code}</td>
                      <td>{awc.awc_name}</td>
                      <td>{awc.awc_type}</td>
                      <td>{awc.code1}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AwcAganWadi;
