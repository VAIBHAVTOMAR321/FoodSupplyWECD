import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../../assets/css/login.css';
import UkLogo from '../../assets/images/new_logo_uk.png';
import Womenlogo from '../../assets/images/women_logo.jpeg';

const Login = () => {
  const [formData, setFormData] = useState({
    role: 'it-cell',
    phone: 'itcell', // Auto-filled by default for IT Cell
    password: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Content in Hindi - Government Portal Style
  const content = {
    brandSubtitle: 'आंगनबाड़ी केंद्र प्रबंधन प्रणाली',
    welcomeTitle: 'स्वागत है',
    welcomeSubtitle: 'कृपया लॉगिन करने के लिए अपनी भूमिका और विवरण दर्ज करें',
    roleLabel: 'अपनी भूमिका चुनें',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: 'मोबाइल नंबर दर्ज करें',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'पासवर्ड दर्ज करें',
    otpLabel: 'OTP',
    otpPlaceholder: 'OTP दर्ज करें',
    loginBtn: 'लॉगिन करें',
    loggingIn: 'लॉगिन हो रहा है...',
    sendOtp: 'OTP भेजें',
    sendingOtp: 'OTP भेजा जा रहा है...',
    verifyOtp: 'OTP सत्यापित करें',
    verifyingOtp: 'सत्यापित हो रहा है...',
    loginSuccess: 'लॉगिन सफल!',
    errors: {
      phoneRequired: 'मोबाइल नंबर आवश्यक है',
      passwordRequired: 'पासवर्ड आवश्यक है',
      otpRequired: 'OTP आवश्यक है',
      loginFailed: 'लॉगिन विफल रहा। कृपया पुनः प्रयास करें।',
      invalidCredentials: 'अमान्य क्रेडेंशियल्स। कृपया पुनः प्रयास करें।',
      userNotFound: 'उपयोगकर्ता नहीं मिला।',
      otpSendFailed: 'OTP भेजने में विफल। कृपया पुनः प्रयास करें।',
      otpVerifyFailed: 'OTP सत्यापन विफल। कृपया पुनः प्रयास करें।',
    },
  };

  const roleOptions = useMemo(() => {
    return [
      { value: 'director', label: 'Director', icon: 'bi-person-workspace' },
      { value: 'it-cell', label: 'IT Cell', icon: 'bi-cpu' },
      { value: 'dpo', label: 'District Program Officer', icon: 'bi-briefcase' },
      { value: 'cdpo', label: 'Project Program Officer', icon: 'bi-person-badge' },
      { value: 'supervisor', label: 'Supervisor', icon: 'bi-person-check' },
      { value: 'anganwadi', label: 'Anganwadi Center', icon: 'bi-house-door' },
    ];
  }, []);

  const loginTitle = useMemo(() => {
    const selectedRole = roleOptions.find((r) => r.value === formData.role);
    return selectedRole ? selectedRole.label : 'लॉगिन';
  }, [formData.role, roleOptions]);

  useEffect(() => {
    if (roleOptions.length > 0 && !formData.role) {
      setFormData((prev) => ({ ...prev, role: roleOptions[0].value }));
    }
  }, [roleOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');

    // Reset flow when role changes
    if (name === 'role') {
      // Auto-fill username for IT Cell, clear it for other roles
      const isItCell = value === 'it-cell';
      setFormData((prev) => ({ 
        ...prev, 
        phone: isItCell ? 'itcell' : '', 
        password: '', 
        otp: '' 
      }));
      setOtpSent(false);
    }
  };

  // ===== Password Login API (For IT Cell) =====
  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    if (!formData.password) {
      setError(content.errors.passwordRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        username: formData.phone, // Sending the auto-filled 'itcell' as username
        password: formData.password,
        role: formData.role,
      };

      const response = await axios.post(
        'https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/login/',
        payload
      );

      if (response.data.access) {
        handleLoginSuccess(response.data);
      } else {
        setError(response.data?.error || content.errors.loginFailed);
      }
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.error === 'Invalid credentials') {
        setError(content.errors.invalidCredentials);
      } else if (responseData?.error === 'User not found') {
        setError(content.errors.userNotFound);
      } else if (responseData?.error) {
        setError(responseData.error);
      } else {
        setError(responseData?.detail || content.errors.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== Send OTP API =====
  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!formData.phone) {
      setError(content.errors.phoneRequired);
      return;
    }

    setSendingOtp(true);
    setError('');

    try {
      const payload = {
        phone: formData.phone,
        role: formData.role,
      };

      const response = await axios.post(
        'https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/send-otp/',
        payload
      );

      if (response.data.success || response.data.message) {
        setOtpSent(true);
        setError('');
      } else {
        setError(response.data.error || content.errors.otpSendFailed);
      }
    } catch (err) {
      const responseData = err.response?.data;
      setError(
        responseData?.error ||
          responseData?.message ||
          content.errors.otpSendFailed
      );
    } finally {
      setSendingOtp(false);
    }
  };

  // ===== Verify OTP API =====
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!formData.otp) {
      setError(content.errors.otpRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        phone: formData.phone,
        role: formData.role,
        otp: formData.otp,
      };

      const response = await axios.post(
        'https://mahadevaaya.com/angfoodproject/angfoodproject_backend/api/verify-otp/',
        payload
      );

      if (response.data.access) {
        handleLoginSuccess(response.data);
      } else {
        setError(response.data?.error || content.errors.otpVerifyFailed);
      }
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.error === 'Invalid credentials') {
        setError(content.errors.invalidCredentials);
      } else if (responseData?.error === 'User not found') {
        setError(content.errors.userNotFound);
      } else if (responseData?.error) {
        setError(responseData.error);
      } else {
        setError(responseData?.message || content.errors.otpVerifyFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (data) => {
    login({
      access: data.access,
      refresh: data.refresh,
      role: data.role,
      unique_id: data.unique_id,
      user: data.user || null,
    });
    alert(content.loginSuccess);

    // Role-based redirection
    switch (data.role) {
      case 'director':
        navigate('/DirectorDashboard');
        break;
      case 'dpo':
        navigate('/DPODashboard');
        break;
      case 'cdpo':
        navigate('/FoodSupplementary');
        break;
      case 'supervisor':
        navigate('/SupervisorDashBoard');
        break;
      case 'anganwadi':
        navigate('/AnganwadiDashboard');
        break;
      case 'it-cell':
        navigate('/ITCellDashBoard');
        break;
      default:
        navigate('/UserDashboard');
    }
  };

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.role === 'it-cell') {
      handlePasswordLogin(e);
    } else if (!otpSent) {
      handleSendOtp(e);
    } else {
      handleVerifyOtp(e);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern"></div>
      <div className="login-container">
        <div className="login-right">
          <div className="uttarakhand-section">
            <img src={UkLogo} alt="Uttarakhand Logo" className="uttarakhand-logo" />
            <h2 className="uttarakhand-title-s">
              महिला सशक्तिकरण एवं बाल विकास विभाग
              <br />
              Women Empowerment &amp; Child Development Department
            </h2>
          </div>
        </div>

        <div className="login-left">
          <div className="login-content">
            <div className="login-header">
              <div className="brand-logo">
                <img src={Womenlogo} alt="Brand Logo" />
              </div>
              <h1>{loginTitle}</h1>
              <p>{content.brandSubtitle}</p>
            </div>

            <div className="welcome-section">
              <h2>{content.welcomeTitle}</h2>
              <p>{content.welcomeSubtitle}</p>
            </div>

            {/* Role Selection */}
            <div className="role-selector">
              <label className="role-selector-title">{content.roleLabel}</label>
              <div className="radio-selection">
                {roleOptions.map((option) => (
                  <label key={option.value} className="radio-option">
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={handleChange}
                    />
                    <span className="radio-label">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="alert-message error">
                  <i className="bi bi-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {/* Conditional Rendering for IT Cell vs Other Roles */}
              {formData.role === 'it-cell' ? (
                <>
                  {/* IT CELL: Direct Password Login Flow */}
                  {/* Username field is hidden and auto-filled with 'itcell' */}
                  <div className="form-group">
                    <label>{content.passwordLabel}</label>
                    <div className="input-wrapper">
                      <i className="bi bi-lock"></i>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={content.passwordPlaceholder}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        {content.loggingIn}
                      </>
                    ) : (
                      content.loginBtn
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* OTHER ROLES: OTP Login Flow */}
                  <div className="form-group">
                    <label>{content.phoneLabel}</label>
                    <div className="input-wrapper">
                      <i className="bi bi-phone"></i>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={content.phonePlaceholder}
                        maxLength={10}
                        disabled={otpSent}
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      type="submit"
                      className="login-btn"
                      disabled={sendingOtp || loading}
                    >
                      {sendingOtp ? (
                        <>
                          <span className="spinner"></span>
                          {content.sendingOtp}
                        </>
                      ) : (
                        content.sendOtp
                      )}
                    </button>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>{content.otpLabel}</label>
                        <div className="input-wrapper">
                          <i className="bi bi-shield-lock"></i>
                          <input
                            type="text"
                            name="otp"
                            value={formData.otp}
                            onChange={handleChange}
                            placeholder={content.otpPlaceholder}
                            maxLength={6}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner"></span>
                            {content.verifyingOtp}
                          </>
                        ) : (
                          content.verifyOtp
                        )}
                      </button>

                      <button
                        type="button"
                        className="login-btn-secondary"
                        onClick={() => {
                          setOtpSent(false);
                          setFormData((prev) => ({ ...prev, otp: '' }));
                          setError('');
                        }}
                      >
                        मोबाइल नंबर बदलें
                      </button>
                    </>
                  )}
                </>
              )}
            </form>

            <div className="login-footer">
              <p>OTP आधारित लॉगिन | OTP-based Login</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;