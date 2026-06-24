import React, { useState, useEffect, useMemo } from "react";
import { Container, Card, Table, Modal, Button, Form, Row, Col, Spinner } from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../all_login/AuthContext";
import "../../assets/css/anganwadileftnav.css";
import AnganwadiLeftNav from "./AnganwadiLeftNav";
import AnganwadiHeader from "./AnganwadiHeader";
import "../../assets/css/dashboard.css";

const interventions = [
  { id: 1, name: "Intervention 1", apiName: "intervention-1", propName: "intervention1", monthsAfterLMP: 3, dependsOn: null },
  { id: 2, name: "Intervention 2", apiName: "intervention-2", propName: "intervention2", monthsAfterLMP: 6, dependsOn: 1 },
  { id: 3, name: "Intervention 3", apiName: "intervention-3", propName: "intervention3", monthsAfterLMP: 9, dependsOn: 2 },
  { id: 4, name: "Intervention 4", apiName: "intervention-4", propName: "intervention4", monthsAfterLMP: 12, dependsOn: 3 },
];

const AnganwadiDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); 
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const { user, api, uniqueId } = useAuth();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

const [candidates, setCandidates] = useState([]);
   const [loading, setLoading] = useState(false);
   const [totalRegistrations, setTotalRegistrations] = useState(0);
   const [eligibleCount, setEligibleCount] = useState(0);
    const [showTable, setShowTable] = useState(false);
    const [filterEligible, setFilterEligible] = useState(false);
    const [selectedInterventionFilter, setSelectedInterventionFilter] = useState(null); // null = all, 1-4 for specific
    const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage] = useState(50);
   const [selectedCandidateDetails, setSelectedCandidateDetails] = useState(null);
   const [showDetailsModal, setShowDetailsModal] = useState(false);
 const [formData, setFormData] = useState({
      candidate_name: "",
      phone: "",
      aadhar_number: "",
      aadhar_file: null,
      lmp_date: "",
      pan_no: "",
      pan_file: null,
      account_number: "",
      ifsc_code: "",
      bank_name: ""
    });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const [currentIntervention, setCurrentIntervention] = useState(null); // New state to store the full intervention object
  // States for Eligibility Questionnaire
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [eligibilityAnswers, setEligibilityAnswers] = useState({});
  const [eligibilityRemarks, setEligibilityRemarks] = useState("");
  const [isEligibleCheck, setIsEligibleCheck] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
   const [currentInterventionStage, setCurrentInterventionStage] = useState(1);
   const [previousInterventionsData, setPreviousInterventionData] = useState([]);
   const [payingCandidate, setPayingCandidate] = useState(null);
   const [payingStage, setPayingStage] = useState(null);

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

  // Logic for a single intervention's status for display in the table
  const getInterventionStatusForDisplay = (candidate, intervention) => {
    if (!candidate.lmp_date) {
      return { text: "LMP Missing", variant: "outline-secondary", disabled: true };
    }

    const lmp = new Date(candidate.lmp_date);
    if (isNaN(lmp.getTime())) {
      return { text: "Invalid LMP", variant: "outline-secondary", disabled: true };
    }

    const today = new Date();
    const diffTime = today.getTime() - lmp.getTime();
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Approximate months

    const completed = Array.isArray(candidate.completed_interventions) ? candidate.completed_interventions : [];

    const isCompleted = completed.includes(intervention.id);

    if (isCompleted) {
      return { text: "Passed", variant: "success", disabled: true };
    }

    // Check dependencies
    if (intervention.dependsOn) {
      const isPrevCompleted = completed.includes(intervention.dependsOn);
      const prevInt = interventions.find(i => i.id === intervention.dependsOn);
      const prevEndMonth = prevInt.monthsAfterLMP + 3;
      const isPrevPassed = diffMonths >= prevEndMonth;

      if (!isPrevCompleted && !isPrevPassed) {
        return { text: `Requires Stage ${intervention.dependsOn}`, variant: "warning", disabled: true };
      }
    }

    // Check time window
    const startMonth = intervention.monthsAfterLMP;
    const endMonth = intervention.monthsAfterLMP + 3; // Strict 3-month window for all stages
    
    if (diffMonths < startMonth) {
      return { text: `Opens in ${Math.ceil(startMonth - diffMonths)} mo`, variant: "info", disabled: true };
    } else if (diffMonths >= endMonth) {
      return { text: "Missed", variant: "danger", disabled: true };
    } else {
      return { text: "Apply", variant: "primary", disabled: false };
    }
  };

  const handleApplyClick = async (candidate, intervention) => {
    setSelectedCandidate(candidate);
    setCurrentInterventionStage(intervention.id);
    setCurrentIntervention(intervention); // Store the full intervention object
    setLoadingQuestions(true);
    setSubmitError("");

    // Extract history from candidate details nested arrays
    const history = [];
    interventions.forEach(int => {
      if (int.id < intervention.id && candidate[int.propName]?.length > 0) {
        const record = candidate[int.propName][0];
        history.push({ ...record, stage: int.id, name: int.name });
      }
    });
    setPreviousInterventionData(history);

    try {
      // 1. Fetch Questions (shared endpoint)
      const qResponse = await api.get("/questionnaire-intervention/");

      if (qResponse.data && qResponse.data.data) {
        // Filter questions based on the current stage (intervention-1, intervention-2, etc.)
        const stageLabel = intervention.apiName;
        const filteredQuestions = qResponse.data.data.filter(q => q.intervention === stageLabel);

        setCurrentQuestions(filteredQuestions);
        // Initialize all questions as false (No)
        const initialAnswers = {};
        filteredQuestions.forEach((q) => {
          initialAnswers[q.id] = false;
        });
        setEligibilityAnswers(initialAnswers);
        setEligibilityRemarks("");
        setIsEligibleCheck(true);
        setShowEligibilityModal(true);
      }
    } catch (err) {
      console.error("❌ Failed to fetch questions:", err);
      alert("Failed to load questionnaire. Please try again.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setEligibilityAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

   const handleEligibilitySubmit = async () => {
     if (!selectedCandidate) return;
     
     setSubmitting(true);
     setSubmitError("");

     const answersArray = currentQuestions.map((q) => [
       q.id, 
       eligibilityAnswers[q.id] === true
     ]);

     const payload = {
       candidate_id: selectedCandidate.candidate_id,
       intervention_opportunity: "Nutrition Support",
       ques_answer: answersArray,
       remarks: eligibilityRemarks,
       is_eligible: isEligibleCheck
     };

     try {
       const apiEndpoint = currentInterventionStage === 1 
         ? "/intervention1/create/" 
         : `/intervention${currentInterventionStage}/create/`;

       await api.post(apiEndpoint, payload);
       
       alert("Eligibility details submitted successfully!");
       setShowEligibilityModal(false);
       setSelectedCandidate(null);
       fetchCandidates();
       setEligibilityAnswers({});
     } catch (err) {
       const errorData = err.response?.data;
       if (errorData?.message?.toLowerCase().includes("already exists") || 
           errorData?.error?.toLowerCase().includes("already exists")) {
         
         alert(`Intervention ${currentInterventionStage} already exists for this candidate. Advancing stage...`);
         setShowEligibilityModal(false);
         fetchCandidates();
       } else {
         const errorMsg = errorData?.message || err.message || "Failed to submit eligibility.";
         setSubmitError(errorMsg);
       }
     } finally {
       setSubmitting(false);
     }
   };

   const handleMoneyTransfer = async (candidate, stage) => {
     setPayingCandidate(candidate);
     setPayingStage(stage);
     
     if (!confirm(`Confirm payment transfer for ${candidate.candidate_name} - Stage ${stage}?`)) {
       setPayingCandidate(null);
       setPayingStage(null);
       return;
     }

     try {
       const response = await api.post("/money-transferred-status/", {
         candidate_id: candidate.candidate_id,
         stage: stage
       });

       if (response.data.success) {
         alert("Payment status updated successfully!");
         fetchCandidates();
       }
     } catch (err) {
       console.error("❌ Payment update failed:", err);
       alert("Failed to update payment status. Please try again.");
     } finally {
       setPayingCandidate(null);
       setPayingStage(null);
     }
   };

    const handleInputChange = (e) => {
      const { name, value, files } = e.target;
      let newValue = value;

      // Format IFSC code
      if (name === "ifsc_code") {
        newValue = value.toUpperCase().substring(0, 11);
      }

      // Enforce numeric-only fields
      if (name === "phone" || name === "aadhar_number" || name === "account_number") {
        newValue = value.replace(/\D/g, '').substring(0, name === 'account_number' ? 18 : (name === 'phone' ? 10 : 12));
      }

      // Enforce alphanumeric for PAN (already handled by regex validation, but we limit length)
      if (name === "pan_no") {
        newValue = value.replace(/[^A-Za-z0-9]/g, '').substring(0, 10);
      }

      // Update form data
      setFormData({ ...formData, [name]: newValue });

      // Live validation
      const errors = { ...validationErrors };

      if (name === "phone") {
        if (newValue.length < 10) {
          errors.phone = `Phone: ${10 - newValue.length} more digits needed`;
        } else {
          delete errors.phone;
        }
      }

      if (name === "aadhar_number") {
        if (newValue.length < 12) {
          errors.aadhar_number = `Aadhar: ${12 - newValue.length} more digits needed`;
        } else {
          delete errors.aadhar_number;
        }
      }

      if (name === "pan_no") {
        if (newValue.length < 10 && newValue.length > 0) {
          errors.pan_no = `PAN: ${10 - newValue.length} more characters needed`;
        } else if (newValue.length === 10) {
          delete errors.pan_no;
        } else if (newValue.length === 0) {
          delete errors.pan_no;
        }
      }

      if (name === "account_number") {
        if (newValue.length > 0 && newValue.length < 6) {
          errors.account_number = `Account too short (min 6 digits)`;
        } else if (newValue.length > 18) {
          errors.account_number = "Max 18 digits allowed";
        } else {
          delete errors.account_number;
        }
      }

      if (name === "ifsc_code") {
        if (newValue.length < 11 && newValue.length > 0) {
          errors.ifsc_code = `IFSC: ${11 - newValue.length} more characters`;
        } else if (newValue.length === 11) {
          delete errors.ifsc_code;
        } else if (newValue.length === 0) {
          delete errors.ifsc_code;
        }
      }

      setValidationErrors(errors);
    };

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await api.get("/candidate/details/", {
        params: { ca_id: user?.user_id || "USR-000002" }
      });
      const processedData = (response?.data?.data || [])
        .filter(c => c.registered_by === uniqueId)
        .map(c => {
          const completed = [];
          interventions.forEach(int => {
            if (c[int.propName]?.length > 0) completed.push(int.id);
          });
          return {
            ...c,
            completed_interventions: completed
          };
        });
      setCandidates(processedData);
      setTotalRegistrations(processedData.length);
      
      const eligible = processedData.filter(candidate => {
        return interventions.some(int => {
          const records = candidate[int.propName];
          if (records && records.length > 0) {
            const latestRecord = records[0];
            return latestRecord.is_eligible === true;
          }
          return false;
        });
      }).length;
      setEligibleCount(eligible);
    } catch (err) {
      console.error("❌ Failed to fetch candidates:", err);
      setCandidates([]);
      setTotalRegistrations(0);
      setEligibleCount(0);
    } finally {
      setLoading(false);
    }
};

  useEffect(() => {
    fetchCandidates();
  }, [user, uniqueId]);

   const displayCandidates = useMemo(() => {
     let filtered = candidates;

     // Filter by eligible status if filterEligible is true
     if (filterEligible) {
       filtered = filtered.filter(candidate => {
         return interventions.some(int => {
           const records = candidate[int.propName];
           if (records && records.length > 0) {
             const latestRecord = records[0];
             return latestRecord.is_eligible === true;
           }
           return false;
         });
       });
     }

     // Filter by specific intervention if selected
     if (selectedInterventionFilter) {
       filtered = filtered.filter(candidate => {
         const int = interventions.find(i => i.id === selectedInterventionFilter);
         if (!int) return false;
         const records = candidate[int.propName];
         if (records && records.length > 0) {
           const latestRecord = records[0];
           return latestRecord.is_eligible === true;
         }
         return false;
       });
     }

     return filtered;
   }, [candidates, filterEligible, selectedInterventionFilter]);

  const totalPages = Math.ceil(displayCandidates.length / itemsPerPage);

    useEffect(() => {
      if (totalPages === 0) {
        setCurrentPage(1);
      } else if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }, [displayCandidates.length, itemsPerPage, currentPage, filterEligible, selectedInterventionFilter]);

     // Fetch bank name when IFSC code is entered
     useEffect(() => {
       const fetchBankByIfsc = async () => {
         if (formData.ifsc_code.length === 11) {
           setLoading(true);
           try {
             const response = await axios.get(
               `https://mahadevaaya.com/backend/api/get-bank-details/?ifsc_code=${formData.ifsc_code}`
             );
             console.log("response", response);

             if (response.data && response.data.Bank) {
               setFormData((prev) => ({
                 ...prev,
                 bank_name: response.data.Bank,
               }));
             } else {
               setFormData((prev) => ({ ...prev, bank_name: "" }));
               alert("Bank name not found for this IFSC code.");
             }
           } catch (error) {
             console.error("Error fetching bank name:", error);
             alert("Invalid IFSC code or server error.");
           } finally {
             setLoading(false);
           }
         } else {
           setFormData((prev) => ({ ...prev, bank_name: "" }));
         }
       };

       fetchBankByIfsc();
     }, [formData.ifsc_code]);

  const handleCardClick = (filterType) => {
    setFilterEligible(filterType === 'eligible');
    setShowTable(true);
    setCurrentPage(1);
  };

  const handleCloseTable = () => {
    setShowTable(false);
    setFilterEligible(false);
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    // Validate before submission
    const errors = {};
    if (formData.phone.length !== 10) {
      errors.phone = "Phone must be exactly 10 digits";
    }
    if (formData.aadhar_number.length !== 12) {
      errors.aadhar_number = "Aadhar must be exactly 12 digits";
    }
    if (formData.pan_no && formData.pan_no.length !== 10) {
      errors.pan_no = "PAN must be exactly 10 characters";
    }
    if (formData.account_number && formData.account_number.length < 6) {
      errors.account_number = "Account number too short (min 6 digits)";
    }
    if (formData.ifsc_code && formData.ifsc_code.length !== 11) {
      errors.ifsc_code = "IFSC must be exactly 11 characters";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      // Always use FormData for proper multipart/form-data encoding
      const submitData = new FormData();
      
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        
        // For file inputs
        if (key === "aadhar_file" || key === "pan_file") {
          if (value instanceof File) {
            submitData.append(key, value);
          }
        } 
        // For regular fields, skip empty strings and null
        else if (value !== null && value !== undefined && value !== "") {
          submitData.append(key, value);
        }
      });

        console.log("📤 Submitting payload:", {
          candidate_name: formData.candidate_name,
          phone: formData.phone,
          aadhar_number: formData.aadhar_number,
          aadhar_file: formData.aadhar_file?.name || "not provided",
          lmp_date: formData.lmp_date,
          pan_no: formData.pan_no,
          pan_file: formData.pan_file?.name || "not provided",
          account_number: formData.account_number,
          ifsc_code: formData.ifsc_code,
          bank_name: formData.bank_name
        });

      const response = await api.post("/candidate-reg/", submitData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      console.log("✅ Registration successful:", response.data);
      alert("Candidate registered successfully!");
      setShowRegistrationForm(false);
      fetchCandidates();
         setFormData({
           candidate_name: "",
           phone: "",
           aadhar_number: "",
           aadhar_file: null,
           lmp_date: "",
           pan_no: "",
           pan_file: null,
           account_number: "",
           ifsc_code: "",
           bank_name: ""
         });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.errors ||
                      err.response?.data?.error || 
                      JSON.stringify(err.response?.data) ||
                      err.message || 
                      "Failed to register candidate. Please try again.";
      setSubmitError(errorMsg);
      console.error(" Registration error:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
    } finally {
      setSubmitting(false);
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
          <div className="main-heading d-flex justify-content-between align-items-center">
            <h3 className="mb-4 fw-bold">
              Anganwadi Dashboard
            </h3>
             <Button variant="primary" onClick={() => setShowRegistrationForm(true)}>
               <i className="bi bi-person-plus me-2"></i>
               Register Candidate
             </Button>
          </div>

          {showRegistrationForm ? (
            <Card className="p-4 shadow-sm border-0 mt-4">
              <Card.Title className="mb-4 fw-bold">Register New Candidate</Card.Title>
              <Form onSubmit={handleSubmit}>
                {submitError && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <strong>Error:</strong> {submitError}
                    <button type="button" className="btn-close" onClick={() => setSubmitError("")}></button>
                  </div>
                )}
                
                 <Row>
                   <Col md={3} lg={3}>
<Form.Group className="mb-3">
  <Form.Label className="form-label-custom">Candidate Name</Form.Label>
  <Form.Control
    type="text"
    name="candidate_name"
    value={formData.candidate_name}
    onChange={handleInputChange}
    required
    placeholder="Enter candidate name"
  />
</Form.Group>
                   </Col>
                    <Col md={3} lg={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-custom">Phone</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter phone number"
                          maxLength={10}
                          isInvalid={!!validationErrors.phone}
                        />
                        {validationErrors.phone && (
                          <div className="invalid-feedback d-block">
                            {validationErrors.phone}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={3} lg={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-custom">Aadhar Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="aadhar_number"
                          value={formData.aadhar_number}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter Aadhar number"
                          maxLength={12}
                          isInvalid={!!validationErrors.aadhar_number}
                        />
                        {validationErrors.aadhar_number && (
                          <div className="invalid-feedback d-block">
                            {validationErrors.aadhar_number}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                    <Form.Group className="mb-3">
<Form.Label className="form-label-custom">LMP Date</Form.Label>
                       <Form.Control
                         type="date"
                         name="lmp_date"
                         value={formData.lmp_date}
                         onChange={handleInputChange}
                         required
                         placeholder="Select LMP date"
                       />
                    </Form.Group>
                  </Col>
                  </Row>

                 <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-custom">PAN Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="pan_no"
                          value={formData.pan_no}
                          onChange={handleInputChange}
                          placeholder="Enter PAN number"
                          maxLength={10}
                          isInvalid={!!validationErrors.pan_no}
                        />
                        {validationErrors.pan_no && (
                          <div className="invalid-feedback d-block">
                            {validationErrors.pan_no}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-custom">Account Number</Form.Label>
                        <Form.Control
                          type="text"
                          name="account_number"
                          value={formData.account_number}
                          onChange={handleInputChange}
                          placeholder="Enter account number"
                          maxLength={18}
                          isInvalid={!!validationErrors.account_number}
                        />
                        {validationErrors.account_number && (
                          <div className="invalid-feedback d-block">
                            {validationErrors.account_number}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label className="form-label-custom">IFSC Code</Form.Label>
                        <Form.Control
                          type="text"
                          name="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={handleInputChange}
                          placeholder="Enter IFSC code"
                          maxLength={11}
                          isInvalid={!!validationErrors.ifsc_code}
                        />
                        {validationErrors.ifsc_code && (
                          <div className="invalid-feedback d-block">
                            {validationErrors.ifsc_code}
                          </div>
                        )}
                      </Form.Group>
                    </Col>
                   <Col md={3}>
                     <Form.Group className="mb-3">
                       <Form.Label className="form-label-custom">Bank Name</Form.Label>
                       <Form.Control
                         type="text"
                         name="bank_name"
                         value={formData.bank_name}
                         onChange={handleInputChange}
                         placeholder="Bank name (auto-filled)"
                         readOnly
                         disabled
                       />
                     </Form.Group>
                   </Col>
                 </Row>

                 <Row>
                   <Col md={3}>
                     <Form.Group className="mb-3">
                       <Form.Label className="form-label-custom">PAN File</Form.Label>
                       <Form.Control
                         type="file"
                         name="pan_file"
                         onChange={handleInputChange}
                         accept=".pdf,.jpg,.jpeg,.png"
                       />
                     </Form.Group>
                   </Col>
                 </Row>

                 <Row>
                   <Col md={3}>
                     <Form.Group className="mb-3">
                       <Form.Label className="form-label-custom">Aadhar File</Form.Label>
                       <Form.Control
                         type="file"
                         name="aadhar_file"
                         onChange={handleInputChange}
                         accept=".pdf,.jpg,.jpeg,.png"
                       />
                     </Form.Group>
                   </Col>
                 </Row>

                <div className="d-flex justify-content-end gap-2">
                  <Button variant="secondary" onClick={() => setShowRegistrationForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? "Registering..." : "Register Candidate"}
                  </Button>
                </div>
              </Form>
            </Card>
          ) : (
            <Row>
              <Col md={3}>
                <Card className="h-100 shadow-sm border-0" style={{ cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '200px' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; }} onClick={() => handleCardClick('all')}>
                  <Card.Body className="text-center py-3">
                    <div className="mb-2">
                      <i className="bi bi-people-fill" style={{ fontSize: '2rem', color: '#0d6efd' }}></i>
                    </div>
                    <Card.Title as="h6" className="mb-1 text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Total Registrations
                    </Card.Title>
                    <Card.Text as="h3" className="fw-bold text-primary mb-0" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                      {totalRegistrations}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="h-100 shadow-sm border-0" style={{ cursor: 'pointer', transition: 'all 0.2s ease', minWidth: '200px' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'; }} onClick={() => handleCardClick('eligible')}>
                  <Card.Body className="text-center py-3">
                    <div className="mb-2">
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '2rem', color: '#198754' }}></i>
                    </div>
                    <Card.Title as="h6" className="mb-1 text-muted text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', fontWeight: 600 }}>
                      Total Eligible
                    </Card.Title>
                    <Card.Text as="h3" className="fw-bold text-success mb-0" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
                      {eligibleCount}
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
          </Container>

           {showTable && (
             <Container fluid className="mt-4">
               <div className="d-flex justify-content-between align-items-center mb-3">
                 <div className="d-flex align-items-center gap-3">
                   <h4 className="mb-0">{filterEligible ? 'Eligible Candidates' : 'Registered Candidates'}</h4>
                   <Form.Select 
                     size="sm" 
                     style={{ width: 'auto', minWidth: '200px' }}
                     value={selectedInterventionFilter || ''}
                     onChange={(e) => setSelectedInterventionFilter(e.target.value ? parseInt(e.target.value) : null)}
                   >
                     <option value="">All Interventions</option>
                     {interventions.map(int => (
                       <option key={int.id} value={int.id}>{int.name}</option>
                     ))}
                   </Form.Select>
                 </div>
                 <Button variant="secondary" size="sm" onClick={handleCloseTable}>
                   <i className="bi bi-arrow-up me-2"></i>
                   Collapse
                 </Button>
               </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading candidates...</p>
                </div>
              ) : displayCandidates.length === 0 ? (
                <div className="text-center py-4">
                  <p>{filterEligible ? 'No eligible candidates found.' : 'No candidates found.'}</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm" className="table-hover align-middle mb-0">
                      <thead className="table-dark text-white" style={{ backgroundColor: '#2c3e50' }}>
                        <tr>
                          <th rowSpan={filterEligible ? 2 : 1} className="text-center align-middle" style={{ minWidth: '50px' }}>#</th>
                          {interventions.map(int => (
                            filterEligible ? (
                              <th key={int.id} colSpan={3} className="text-center align-middle">{int.name}</th>
                            ) : (
                              <th key={int.id} className="text-center align-middle" style={{ minWidth: '110px' }}>{int.name}<br/></th>
                            )
                          ))}
                          <th rowSpan={filterEligible ? 2 : 1} className="text-center align-middle" style={{ minWidth: '130px' }}>Candidate ID</th>
                          <th rowSpan={filterEligible ? 2 : 1} className="text-center align-middle" style={{ minWidth: '120px' }}>Full Details</th>
                        </tr>
                        {filterEligible && (
                          <tr>
                            {interventions.map(int => (
                              <React.Fragment key={`${int.id}-sub`}>
                                <th className="text-center" style={{ minWidth: '80px', fontSize: '11px' }}>Eligible</th>
                                <th className="text-center" style={{ minWidth: '100px', fontSize: '11px' }}>Remark</th>
                                <th className="text-center" style={{ minWidth: '110px', fontSize: '11px' }}>Payment</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        )}
                      </thead>
                        <tbody>
                          {(() => {
                             const totalItems = displayCandidates.length;
                             const startIndex = (currentPage - 1) * itemsPerPage;
                             const endIndex = startIndex + itemsPerPage;
                             const paginatedCandidates = displayCandidates.slice(startIndex, endIndex);

                             return paginatedCandidates.map((c, index) => {
                              return (
                                <tr key={c.id} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                                  <td className="text-center fw-bold">{startIndex + index + 1}</td>
                                  {interventions.map(int => {
                                    const record = c[int.propName]?.length > 0 ? c[int.propName][0] : null;
                                    const isEligible = record?.is_eligible === true;
                                    const remark = record?.remark || record?.remarks || "-";
                                    const moneyTransferred = record?.money_transferred_status === true;
                                    
                                    // For stages with no record, check if they can apply (time window & dependencies)
                                    let status = null;
                                    if (!record) {
                                      status = getInterventionStatusForDisplay(c, int);
                                    }
                                    
                                    return (
                                      <React.Fragment key={int.id}>
                                        <td className="text-center" style={{ display: filterEligible ? 'table-cell' : 'none' }}>
                                          {record ? (
                                            <span className={`badge ${isEligible ? 'bg-success' : 'bg-danger'}`} style={{ fontSize: '9px' }}>
                                              {isEligible ? 'Yes' : 'No'}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="text-center" style={{ display: filterEligible ? 'table-cell' : 'none' }}>
                                          {record ? (
                                            <span title={remark} style={{ fontSize: '10px' }}>
                                              {remark.length > 20 ? `${remark.substring(0, 20)}...` : remark}
                                            </span>
                                          ) : '-'}
                                        </td>
                                        <td className="text-center">
                                          {record ? (
                                            isEligible && !moneyTransferred && filterEligible ? (
                                              <Button
                                                variant="warning"
                                                size="sm"
                                                className="fw-bold"
                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                onClick={() => handleMoneyTransfer(c, int.id)}
                                                disabled={payingCandidate?.id === c.id && payingStage === int.id}
                                              >
                                                {payingCandidate?.id === c.id && payingStage === int.id ? 'Processing...' : 'Pay Now'}
                                              </Button>
                                            ) : isEligible && !moneyTransferred && !filterEligible ? (
                                              <span className="badge bg-success" style={{ fontSize: '9px' }}>Pass</span>
                                            ) : moneyTransferred ? (
                                              <span className="badge bg-success" style={{ fontSize: '9px' }}>Paid</span>
                                            ) : (
                                              <span className="text-muted">-</span>
                                            )
                                          ) : status ? (
                                            <Button
                                              variant={status.variant}
                                              size="sm"
                                              className="fw-bold"
                                              style={{ fontSize: '10px', padding: '2px 6px' }}
                                              disabled={status.disabled}
                                              onClick={() => !status.disabled && handleApplyClick(c, int)}
                                            >
                                              {status.text}
                                            </Button>
                                          ) : (
                                            <span className="text-muted">-</span>
                                          )}
                                        </td>
                                      </React.Fragment>
                                    )})}
                                  <td><span className="badge bg-primary" style={{ fontSize: '10px' }}>{c.candidate_id}</span></td>
                                  <td>
                                    <Button 
                                      variant="info" 
                                      size="sm" 
                                      className="text-white"
                                      style={{ fontSize: '10px', padding: '2px 6px' }}
                                      onClick={() => { setSelectedCandidateDetails(c); setShowDetailsModal(true); }}>
                                      Full Details
                                    </Button>
                                  </td>
                                </tr>
                            )});
                          })()}
                      </tbody>
                    </Table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                    <span className="text-muted small">
                      Showing {displayCandidates.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, displayCandidates.length)} of {displayCandidates.length} entries
                    </span>

                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        <i className="bi bi-chevron-double-left"></i>
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <i className="bi bi-chevron-left"></i>
                      </Button>

                      <span className="badge bg-light text-dark border px-3 py-2">
                        Page {currentPage} of {totalPages || 1}
                      </span>

                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                        disabled={currentPage === (totalPages || 1)}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages || 1)}
                        disabled={currentPage === (totalPages || 1)}
                      >
                        <i className="bi bi-chevron-double-right"></i>
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Container>
          )}
      </div>

      {/* Eligibility Questionnaire Modal */}
      <Modal show={showEligibilityModal} onHide={() => !submitting && setShowEligibilityModal(false)} size="lg" centered>
        <Modal.Header closeButton={!submitting}>
          <Modal.Title className="fw-bold">
            Intervention Stage {currentInterventionStage} - {selectedCandidate?.candidate_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingQuestions ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Fetching questions...</p>
            </div>
          ) : (
            <Form>
              {submitError && <div className="alert alert-danger mb-4">{submitError}</div>}

              {/* Detailed Intervention Timeline (History & Missed Stages) */}
              <div className="mb-4">
                <h6 className="text-primary fw-bold border-bottom pb-2">Previous Intervention Status</h6>
                {interventions.filter(int => int.id < currentInterventionStage).map((int) => {
                  const history = previousInterventionsData.find(h => h.stage === int.id);
                  
                  const lmp = new Date(selectedCandidate.lmp_date);
                  const today = new Date();
                  const diffTime = today.getTime() - lmp.getTime();
                  const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
                  const isWindowClosed = diffMonths >= (int.monthsAfterLMP + 3);

                  return (
                    <Card key={int.id} className={`mb-2 border-0 ${history ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                      <Card.Body className="py-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold">Stage {int.id}: {int.name}</span>
                          {history ? (
                            <span className="badge bg-success">Passed ({new Date(history.created_at).toLocaleDateString()})</span>
                          ) : isWindowClosed ? (
                            <span className="badge bg-danger">Missed</span>
                          ) : (
                            <span className="badge bg-secondary">Pending</span>
                          )}
                        </div>
                        {history && (
                          <div className="mt-1 small">
                            <strong>Remarks:</strong> {history.remarks}
                            <span className="ms-3 text-primary"><strong>Eligible:</strong> {history.is_eligible ? 'Yes' : 'No'}</span>
                            {history.ques_answer && (
                              <div className="mt-2 p-2 bg-white rounded border">
                                {history.ques_answer.map((qa, qi) => (
                                  <div key={qi} className={`text-muted ${qi === history.ques_answer.length - 1 ? '' : 'border-bottom mb-1 pb-1'}`}>
                                    <small>{qa[1]}: <strong>{qa[2] ? 'True' : 'False'}</strong></small>
                                 </div>
                               ))}
                               </div>
                             )}
                           </div>
                         )}
                       </Card.Body>
                     </Card>
                   );
                 })}
               </div>

              <h6 className="fw-bold mb-3">Current Questionnaire:</h6>
              
              {currentQuestions.map((q, idx) => (
                <Form.Group key={q.id} className="mb-4 p-3 border rounded bg-light">
                  <Form.Label className="fw-bold mb-3">{idx + 1}. {q.question_text}</Form.Label>
                  <div className="d-flex gap-4">
                    <Form.Check
                      type="radio"
                      id={`q-${q.id}-yes`}
                      label="true"
                      name={`q-${q.id}`}
                      checked={eligibilityAnswers[q.id] === true}
                      onChange={() => handleAnswerChange(q.id, true)}
                    />
                    <Form.Check
                      type="radio"
                      id={`q-${q.id}-no`}
                      label="false"
                      name={`q-${q.id}`}
                      checked={eligibilityAnswers[q.id] === false}
                      onChange={() => handleAnswerChange(q.id, false)}
                    />
                  </div>
                </Form.Group>
              ))}

              <Form.Group className="mb-4 d-flex align-items-center gap-3">
                <Form.Label className="fw-bold mb-0">Is Eligible?</Form.Label>
                <Form.Check 
                  type="switch"
                  id="eligibility-switch"
                  checked={isEligibleCheck}
                  onChange={(e) => setIsEligibleCheck(e.target.checked)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Remarks</Form.Label>
                <Form.Control as="textarea" rows={3} value={eligibilityRemarks} onChange={(e) => setEligibilityRemarks(e.target.value)} placeholder="Enter remarks..." />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
<Modal.Footer>
           <Button variant="secondary" onClick={() => setShowEligibilityModal(false)} disabled={submitting}>Cancel</Button>
           <Button variant="primary" onClick={handleEligibilitySubmit} disabled={submitting || loadingQuestions}>
             {submitting ? "Submitting..." : "Submit Answers"}
           </Button>
         </Modal.Footer>
       </Modal>

       {/* Full Details Modal */}
       <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered>
         <Modal.Header closeButton>
           <Modal.Title className="fw-bold">Candidate Full Details</Modal.Title>
         </Modal.Header>
         <Modal.Body>
           {selectedCandidateDetails && (
             <Row className="g-3">
               <Col md={6}>
                 <strong>Name:</strong> {selectedCandidateDetails.candidate_name || '-'}
               </Col>
               <Col md={6}>
                 <strong>Phone:</strong> {selectedCandidateDetails.phone || '-'}
               </Col>
               <Col md={6}>
                 <strong>LMP Date:</strong> {selectedCandidateDetails.lmp_date || '-'}
               </Col>
               <Col md={6}>
                 <strong>Aadhaar Number:</strong> {selectedCandidateDetails.aadhar_number || '-'}
               </Col>
               <Col md={6}>
                 <strong>PAN Number:</strong> {selectedCandidateDetails.pan_no || '-'}
               </Col>
               <Col md={6}>
                 <strong>Account Number:</strong> {selectedCandidateDetails.account_number || '-'}
               </Col>
                <Col md={6}>
                  <strong>IFSC Code:</strong> {selectedCandidateDetails.ifsc_code || '-'}
                </Col>
                <Col md={6}>
                  <strong>Bank Name:</strong> {selectedCandidateDetails.bank_name || '-'}
                </Col>
                <Col md={6}>
                  <strong>Verified:</strong> {selectedCandidateDetails.is_verified ? 'Yes' : 'No'}
                </Col>
               <Col md={6}>
                 <strong>Active:</strong> {selectedCandidateDetails.is_active ? 'Yes' : 'No'}
               </Col>
               <Col md={6}>
                 <strong>Candidate ID:</strong> {selectedCandidateDetails.candidate_id || '-'}
               </Col>
               <Col md={6}>
                 <strong>Aadhar File:</strong>{' '}
                 {selectedCandidateDetails.aadhar_file ? (
                   <a href={`https://mahadevaaya.com/golden100days/golden100days_backend${selectedCandidateDetails.aadhar_file}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                     <i className="bi bi-eye"></i> View
                   </a>
                 ) : '-'}
               </Col>
               <Col md={6}>
                 <strong>PAN File:</strong>{' '}
                 {selectedCandidateDetails.pan_file ? (
                   <a href={`https://mahadevaaya.com/golden100days/golden100days_backend${selectedCandidateDetails.pan_file}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                     <i className="bi bi-eye"></i> View
                   </a>
                 ) : '-'}
               </Col>
             </Row>
           )}
         </Modal.Body>
         <Modal.Footer>
           <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Close</Button>
         </Modal.Footer>
       </Modal>
     </div>
  );
};

export default AnganwadiDashboard;