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
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiProfile.css";
import { FaEye, FaEyeSlash, FaUserCircle, FaLock } from "react-icons/fa";

const AnganwadiProfile = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { api, uniqueId } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const response = await api.get(`/anganwadi/profile/`);
        if (response.data.success) {
          setProfileData(response.data.data);
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (password.length < 4) {
      setPasswordError("Password should be at least 4 characters long.");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await api.put(`/anganwadi/profile/`, {
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
      <AnganwadiLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />
      <div className="main-content-dash">
        <AnganwadiHeader toggleSidebar={toggleSidebar} />
        <Container fluid className="dashboard-box mt-3">
          <h3 className="mb-4 profile-page-title">
            <FaUserCircle className="me-2" /> Anganwadi Profile
          </h3>
          {loading && <Spinner animation="border" />}
          {error && <Alert variant="danger">{error}</Alert>}
          {profileData && (
            <Row>
              <Col md={8}>
                <Card className="mb-4 profile-card">
                  <Card.Header>
                    Profile Details
                  </Card.Header>
                  <Card.Body>
                    <Form>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>District</Form.Label>
                            <Form.Control type="text" value={profileData.district_name || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Project</Form.Label>
                            <Form.Control type="text" value={profileData.project || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Sector</Form.Label>
                            <Form.Control type="text" value={profileData.sector || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>AWC Code</Form.Label>
                            <Form.Control type="text" value={profileData.awc_code || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>AWC Name</Form.Label>
                            <Form.Control type="text" value={profileData.awc || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>AWC Name (Hindi)</Form.Label>
                            <Form.Control type="text" value={profileData.awc_hindi || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>AWC Type</Form.Label>
                            <Form.Control type="text" value={profileData.awc_type || ""} disabled />
                          </Form.Group>
                        </Col>
                      </Row>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="password-card">
                  <Card.Header>
                    <FaLock className="me-2" /> Change Password
                  </Card.Header>
                  <Card.Body>
                    {passwordError && <Alert variant="danger">{passwordError}</Alert>}
                    {passwordSuccess && <Alert variant="success">{passwordSuccess}</Alert>}
                    <Form onSubmit={handlePasswordChange}>
                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <InputGroup>
                          <Form.Control type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" required />
                          <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Confirm Password</Form.Label>
                        <InputGroup>
                          <Form.Control type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
                          <Button variant="outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                      <Button type="submit" variant="primary" disabled={passwordLoading}>
                        {passwordLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : "Update Password"}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
      </div>
    </div>
  );
};

export default AnganwadiProfile;