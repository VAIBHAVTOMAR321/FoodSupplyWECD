import React, { useState, useEffect } from "react";
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import DPOHeader from "./DPOHeader";
import DPOLeftNav from "./DPOLeftNav";
import "../../assets/css/dpo.css";

const StudentForm = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024
  );

  const [formData, setFormData] = useState({
    studentName: "",
    dob: "",
    gender: "",
    guardianName: "",
    awcCode: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    console.log(formData);

    setTimeout(() => {
      setSuccess("Student registered successfully!");
      setFormData({
        studentName: "",
        dob: "",
        gender: "",
        guardianName: "",
        awcCode: "",
      });
      setSubmitting(false);
    }, 1500);
  };

  return (
    <div className="dashboard-container">
      <DPOLeftNav
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
        isTablet={isTablet}
      />

      <div className="main-content-dash">
        <DPOHeader toggleSidebar={toggleSidebar} />

        <Container fluid className="dashboard-box mt-3">
          <div className="main-heading d-flex justify-content-between align-items-center mb-4">
            <h3 className="fw-bold">Food Item Receiving</h3>
          </div>

      
        </Container>
      </div>
    </div>
  );
};

export default StudentForm;