import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Row,
  Col,
  Button,
  Spinner,
  Alert,
  InputGroup,
} from "react-bootstrap";
import { useAuth } from "../all_login/AuthContext";

import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiProfile.css";
import { FaEye, FaEyeSlash, FaUserCircle, FaLock } from "react-icons/fa";
import SupervisorLeftNav from "./SupervisorLeftNav";
import SupervisorHeader from "./SupervisorHeader";

const ThrSupervisorReceiving = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api, uniqueId } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/sector-profile/`);
        if (response.data.success) {
          setProfileData(response.data.data);
          setSectorIncharge(response.data.data.sector_incharge || "");
          setInchargeMob(response.data.data.incharge_mob || "");
        } else {
          setError("Failed to fetch profile data.");
        }
      } catch (err) {
        setError("An error occurred while fetching profile data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (api) {
      fetchProfile();
    }

    return () => window.removeEventListener("resize", handleResize);
  }, [api]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    setProfileSaving(true);
    try {
      const response = await api.put(`/sector-profile/`, {
        sector_incharge: sectorIncharge,
        incharge_mob: inchargeMob,
        password: profileData?.password || "",
      });
      if (response.data.success) {
        setProfileData(response.data.data);
        setSectorIncharge(response.data.data.sector_incharge || "");
        setInchargeMob(response.data.data.incharge_mob || "");
        setProfileSuccess("Profile updated successfully!");
      } else {
        setProfileError("Failed to update profile.");
      }
    } catch (err) {
      setProfileError("Failed to update profile. Please try again.");
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    // if (password.length < 3) {
    //   setPasswordError("Password should be at least 3 characters long.");
    //   return;
    // }

    setPasswordLoading(true);
    try {
      const response = await api.put(`/sector-profile/`, {
        sector_incharge: sectorIncharge,
        incharge_mob: inchargeMob,
        password: password,
      });
      setPasswordSuccess("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError("Failed to update password. Please try again.");
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
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
          <h3 className="mb-4 profile-page-title">
            <FaUserCircle className="me-2" /> THR Supervisor Receiving
          </h3>
        
        </Container>
      </div>
    </div>
  );
};

export default ThrSupervisorReceiving;
