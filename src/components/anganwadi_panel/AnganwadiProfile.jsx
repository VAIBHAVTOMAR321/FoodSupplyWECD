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
import { useLanguage } from "../all_login/LanguageContext";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";
import "../../assets/css/AnganwadiProfile.css";
import { FaEye, FaEyeSlash, FaUserCircle, FaLock } from "react-icons/fa";

const AnganwadiProfile = () => {
  const { t } = useLanguage();
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
          setError(t("Failed to fetch profile data.", "प्रोफ़ाइल डेटा प्राप्त नहीं हो सका।"));
        }
      } catch (err) {
        setError(t("An error occurred while fetching profile data.", "प्रोफ़ाइल डेटा प्राप्त करते समय त्रुटि हुई।"));
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
      setPasswordError(t("Passwords do not match.", "पासवर्ड मेल नहीं खाते।"));
      return;
    }
    if (password.length < 4) {
      setPasswordError(t("Password should be at least 4 characters long.", "पासवर्ड कम से कम 4 अक्षर का होना चाहिए।"));
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await api.put(`/anganwadi/profile/`, {
        password: password,
      });
      setPasswordSuccess(t("Password updated successfully!", "पासवर्ड सफलतापूर्वक अपडेट किया गया!"));
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(t("Failed to update password. Please try again.", "पासवर्ड अपडेट नहीं हो सका। कृपया पुनः प्रयास करें।"));
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
            <FaUserCircle className="me-2" /> {t("Anganwadi Profile", "आंगनवाड़ी प्रोफ़ाइल")}
          </h3>
          {loading && <Spinner animation="border" />}
          {error && <Alert variant="danger">{error}</Alert>}
          {profileData && (
            <Row>
              <Col md={8}>
                <Card className="mb-4 profile-card">
                  <Card.Header>
                    {t("Profile Details", "प्रोफ़ाइल विवरण")}
                  </Card.Header>
                  <Card.Body>
                    <Form>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("District", "ज़िला")}</Form.Label>
                            <Form.Control type="text" value={profileData.district_name || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("Project", "परियोजना")}</Form.Label>
                            <Form.Control type="text" value={profileData.project || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("Sector", "सेक्टर")}</Form.Label>
                            <Form.Control type="text" value={profileData.sector || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("AWC Code", "आंगनवाड़ी केंद्र कोड")}</Form.Label>
                            <Form.Control type="text" value={profileData.awc_code || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("AWC Name", "आंगनवाड़ी केंद्र का नाम")}</Form.Label>
                            <Form.Control type="text" value={profileData.awc || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("AWC Name (Hindi)", "आंगनवाड़ी केंद्र का नाम (हिंदी)")}</Form.Label>
                            <Form.Control type="text" value={profileData.awc_hindi || ""} disabled />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>{t("AWC Type", "आंगनवाड़ी केंद्र का प्रकार")}</Form.Label>
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
                    <FaLock className="me-2" /> {t("Change Password", "पासवर्ड बदलें")}
                  </Card.Header>
                  <Card.Body>
                    {passwordError && <Alert variant="danger">{passwordError}</Alert>}
                    {passwordSuccess && <Alert variant="success">{passwordSuccess}</Alert>}
                    <Form onSubmit={handlePasswordChange}>
                      <Form.Group className="mb-3">
                        <Form.Label>{t("New Password", "नया पासवर्ड")}</Form.Label>
                        <InputGroup>
                          <Form.Control type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("Enter new password", "नया पासवर्ड दर्ज करें")} required />
                          <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>{t("Confirm Password", "पासवर्ड की पुष्टि करें")}</Form.Label>
                        <InputGroup>
                          <Form.Control type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("Confirm new password", "नए पासवर्ड की पुष्टि करें")} required />
                          <Button variant="outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                      </Form.Group>
                      <Button type="submit" variant="primary" disabled={passwordLoading}>
                        {passwordLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : t("Update Password", "पासवर्ड अपडेट करें")}
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