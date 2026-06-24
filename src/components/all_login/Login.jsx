import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import '../../assets/css/login.css';
import UkLogo from '../../assets/images/new_logo_uk.png';
import ResetPasswordModal from './ResetPasswordModal';
import Womenlogo from '../../assets/images/women_logo.jpeg';

const Login = () => {
  const [formData, setFormData] = useState({
    role: 'it-cell',
    email_or_phone: 'IT Cell',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New state for password reset modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUsername, setResetPasswordUsername] = useState('');
  const [resetPasswordRole, setResetPasswordRole] = useState('');

  // New state for Anganwadi dropdowns
  const [districts, setDistricts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [anganwadis, setAnganwadis] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [supervisorProjectsData, setSupervisorProjectsData] = useState([]);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Content in Hindi - Government Portal Style (consistent with Home.jsx)
  const content = {
    brandSubtitle: "आज का कौशल, कल का सशक्तिकरण",
   
    roleLabel: "अपनी भूमिका चुनें",
    userIdLabel: "लॉगिन टाइप",
    userIdPlaceholder: "लॉगिन प्रकार दर्ज करें",
    passwordLabel: "पासवर्ड",
    districtLabel: "जिला चुनें",
    projectLabel: "परियोजना चुनें",
    sectorLabel: "सेक्टर चुनें",
    anganwadiLabel: "आंगनबाड़ी केंद्र चुनें",
    passwordPlaceholder: "पासवर्ड दर्ज करें",
    rememberMe: "मुझे याद रखें",
    signIn: "साइन इन करें",
    signingIn: "साइन इन हो रहा है...",
    
    learnTitle: "सीखें",
    learnDesc: "गुणवत्तापूर्ण शिक्षा और नए पाठ्यक्रमों तक पहुंच प्राप्त करें",
    growTitle: "बढ़ें",
    growDesc: "अपनी शैक्षणिक प्रगति को ट्रैक करें",
    succeedTitle: "सफल हों",
    succeedDesc: "कक्षा 9 से 12 तक अपना करियर बनाएं",
    errors: {
      userIdRequired: "यूजर आईडी / फोन आवश्यक है",
      passwordRequired: "पासवर्ड आवश्यक है",
      loginFailed: "लॉगिन विफल रहा। कृपया पुनः प्रयास करें।",
      loginSuccess: "लॉगिन सफल!",
      invalidCredentials: "गलत क्रेडेंशियल। कृपया पुनः प्रयास करें।",
      userNotFound: "उपयोगकर्ता नहीं मिला।",
      defaultPasswordNotAllowed: "डिफ़ॉल्ट पासवर्ड की अनुमति नहीं है। कृपया अपना पासवर्ड रीसेट करें।"
    },
    resetPassword: {
      title: "पासवर्ड रीसेट करें",
      newPasswordLabel: "नया पासवर्ड",
      confirmPasswordLabel: "पासवर्ड की पुष्टि करें",
      resetButton: "पासवर्ड रीसेट करें",
      resettingButton: "रीसेट हो रहा है...",
      passwordMismatch: "पासवर्ड मेल नहीं खाते।",
      resetSuccess: "पासवर्ड सफलतापूर्वक रीसेट किया गया।",
      resetFailed: "पासवर्ड रीसेट विफल रहा। कृपया पुनः प्रयास करें।"
    }
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
    const selectedRole = roleOptions.find(r => r.value === formData.role);
    return selectedRole ? selectedRole.label : 'लॉगिन';
  }, [formData.role, roleOptions]);

  useEffect(() => {
    if (roleOptions.length > 0 && !formData.role) {
      setFormData(prev => ({ ...prev, role: roleOptions[0].value }));
    }
  }, [roleOptions]);

   const handleChange = (e) => {
     const { name, value } = e.target;
     setFormData(prev => ({ ...prev, [name]: value }));
     setError('');

     // Reset dropdown selections and dependent data when role changes
     if (name === 'role') {
       setSelectedDistrict('');
       setSelectedProject('');
       setSelectedSector('');
       setFormData(prev => ({ ...prev, email_or_phone: '' }));
       const emailValue = value === 'director' ? 'Directorate' : value === 'it-cell' ? 'IT Cell' : '';
       setFormData(prev => ({ ...prev, email_or_phone: emailValue }));
       setDistricts([]);
       setProjects([]);
       setSectors([]);
       setAnganwadis([]);
       setSupervisorProjectsData([]);
     }
   };

  // Fetching logic for Anganwadi dropdowns
  useEffect(() => {
    if (['anganwadi', 'supervisor', 'cdpo', 'dpo'].includes(formData.role)) {
      fetchDistricts();
    }
  }, [formData.role]);

  const fetchDistricts = async () => {
    let url = '';
    if (formData.role === 'anganwadi') {
      url = 'https://mahadevaaya.com/golden100days/golden100days_backend/api/anganwadi-dropdown/';
    } else if (formData.role === 'supervisor') {
      url = 'https://mahadevaaya.com/golden100days/golden100days_backend/api/sector-dropdown/';
    } else if (formData.role === 'cdpo') {
      url = 'https://mahadevaaya.com/golden100days/golden100days_backend/api/cdpo-dropdown/';
    } else if (formData.role === 'dpo') {
      url = 'https://mahadevaaya.com/golden100days/golden100days_backend/api/district-list/';
    }
    try {
      const res = await axios.get(url || '');
      if (res.data.success) setDistricts(res.data.data);
    } catch (err) { console.error("Error fetching districts", err); }
  };

  const handleDistrictChange = async (e) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    setSelectedProject('');
    setSelectedSector('');
    setFormData(prev => ({ ...prev, email_or_phone: '' }));
    setProjects([]); setSectors([]); setAnganwadis([]);
    setSupervisorProjectsData([]);

    if (district) {
      if (formData.role === 'dpo') {
        const selectedObj = districts.find(d => d.district === district);
        if (selectedObj) {
          setFormData(prev => ({ ...prev, email_or_phone: selectedObj.sdname }));
        }
        return;
      }

      let url = '';
      if (formData.role === 'anganwadi') {
        url = `https://mahadevaaya.com/golden100days/golden100days_backend/api/anganwadi-dropdown/?district=${district}`;
      } else if (formData.role === 'supervisor') {
        url = `https://mahadevaaya.com/golden100days/golden100days_backend/api/sector-dropdown/?district=${district}`;
      } else if (formData.role === 'cdpo') {
        url = `https://mahadevaaya.com/golden100days/golden100days_backend/api/cdpo-dropdown/?district=${district}`;
      }

      try {
        const res = await axios.get(url);
        if (res.data.success) {
          if (formData.role === 'supervisor') {
            setSupervisorProjectsData(res.data.data);
            setProjects(res.data.data.map(item => ({ project: item.project_code })));
          } else if (formData.role === 'cdpo') {
            setProjects(res.data.data.map(item => ({ project: item.project_name })));
          } else {
            setProjects(res.data.data);
          }
        }
      } catch (err) { console.error("Error fetching projects", err); }
    }
  };

  const handleProjectChange = async (e) => {
    const project = e.target.value;
    setSelectedProject(project);
    setSelectedSector('');
    setSectors([]); setAnganwadis([]);

    if (project) {
      if (formData.role === 'supervisor') {
        setFormData(prev => ({ ...prev, email_or_phone: '' }));
        const projData = supervisorProjectsData.find(p => p.project_code === project);
        if (projData) setSectors(projData.sectors);
      } else if (formData.role === 'cdpo') {
        setFormData(prev => ({ ...prev, email_or_phone: project }));
      } else {
        setFormData(prev => ({ ...prev, email_or_phone: '' }));
        try {
          const res = await axios.get(`https://mahadevaaya.com/golden100days/golden100days_backend/api/anganwadi-dropdown/?district=${selectedDistrict}&project=${project}`);
          if (res.data.success) setSectors(res.data.data);
        } catch (err) { console.error("Error fetching sectors", err); }
      }
    } else {
      setFormData(prev => ({ ...prev, email_or_phone: '' }));
    }
  };

  const handleSectorChange = async (e) => {
    const sector = e.target.value;
    setSelectedSector(sector);
    setAnganwadis([]);

    if (formData.role === 'supervisor') {
      // For supervisor, the selected sector name is the username
      setFormData(prev => ({ ...prev, email_or_phone: sector }));
    } else {
      setFormData(prev => ({ ...prev, email_or_phone: '' }));
      if (sector) {
        try {
          const res = await axios.get(`https://mahadevaaya.com/golden100days/golden100days_backend/api/anganwadi-dropdown/?district=${selectedDistrict}&project=${selectedProject}&sector=${sector}`);
          if (res.data.success) setAnganwadis(res.data.data);
        } catch (err) { console.error("Error fetching anganwadis", err); }
      }
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
    alert(content.errors.loginSuccess);

    // Role-based redirection to specific dashboards
    const userRole = data.role;
    switch (userRole) {
      case 'director':
        navigate('/DirectorDashboard');
        break;
      case 'dpo':
        navigate('/DPODashboard');
        break;
      case 'cdpo':
        navigate('/CDPODashboard');
        break;
      case 'supervisor':
        navigate('/SupervisorDashBoard');
        break;
      case 'anganwadi':
        navigate('/AnganwadiDashboard');
        break;
      case 'it-cell':
        navigate('/ITCellDashboard');
        break;
      default:
        navigate('/UserDashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email_or_phone) {
      setError(content.errors.userIdRequired);
      return;
    }
    if (!formData.password) {
      setError(content.errors.passwordRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        username: formData.email_or_phone,
        password: formData.password,
        role: formData.role,
      };

      const response = await axios.post(
        'https://mahadevaaya.com/golden100days/golden100days_backend/api/login/',
        payload
      );

      if (response.data.access) {
        handleLoginSuccess(response.data);
      }
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.action === 'FORGOT_PASSWORD_REQUIRED') {
        setError(responseData.error || content.errors.defaultPasswordNotAllowed);
      } else if (responseData?.error === 'Invalid credentials') {
        setError(content.errors.invalidCredentials);
      } else if (responseData?.error === 'User not found') {
        setError(content.errors.userNotFound);
      } else if (responseData?.error) {
        setError(responseData.error);
      } else {
        setError(responseData?.message || content.errors.loginFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetSuccess = async (newPassword) => {
    setShowResetPasswordModal(false);
    // After successful password reset, attempt to log in with the new password
    setLoading(true);
    try {
      const payload = { username: resetPasswordUsername, password: newPassword, role: resetPasswordRole };
      const response = await axios.post('https://mahadevaaya.com/golden100days/golden100days_backend/api/login/', payload);
      if (response.data.access) {
        handleLoginSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || content.errors.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-pattern"></div>
      <div className="login-container">
          <div className="login-right">
          <div className="uttarakhand-section">
            <img src={UkLogo} alt="Uttarakhand Logo" className="uttarakhand-logo" />
            <h2 className="uttarakhand-title">महिला सशक्तिकरण एवं बाल विकास विभाग<br/>Women Empowerment & Child Development Department</h2>
            
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

            {/* Radio Button Selection */}
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

              {['anganwadi', 'supervisor', 'cdpo', 'dpo'].includes(formData.role) ? (
                <>
                  <div className="form-group">
                    <label>{content.districtLabel}</label>
                    <select className="form-select custom-login-select" value={selectedDistrict} onChange={handleDistrictChange}>
                      <option value="">{content.districtLabel}</option>
                      {districts.map((d, i) => (
                        <option key={i} value={d.district}>{d.district}</option>
                      ))}
                    </select>
                  </div>

                  {formData.role !== 'dpo' && (
                    <div className="form-group">
                      <label>{content.projectLabel}</label>
                      <select 
                        className="form-select custom-login-select" 
                        value={selectedProject} 
                        onChange={handleProjectChange} 
                        disabled={!selectedDistrict}
                      >
                        <option value="">{content.projectLabel}</option>
                        {projects.map((p, i) => (
                          <option key={i} value={p.project}>{p.project}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!['cdpo', 'dpo'].includes(formData.role) && (
                    <div className="form-group">
                      <label>{content.sectorLabel}</label>
                      <select 
                        className="form-select custom-login-select" 
                        value={selectedSector} 
                        onChange={handleSectorChange} 
                        disabled={!selectedProject}
                      >
                        <option value="">{content.sectorLabel}</option>
                        {sectors.map((s, i) => (
                          <option key={i} value={s.sector}>{s.sector}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.role === 'anganwadi' && (
                    <div className="form-group">
                    <label>{content.anganwadiLabel}</label>
                    <select 
                      className="form-select custom-login-select" 
                      name="email_or_phone" 
                      value={formData.email_or_phone} 
                      onChange={handleChange} 
                      disabled={!selectedSector}
                    >
                      <option value="">{content.anganwadiLabel}</option>
                      {anganwadis.map((a) => (
                        <option key={a.id} value={a.awc_code}>{a.display_name}</option>
                      ))}
                    </select>
                  </div>
                  )}
                </>
               ) : (
                 <div className="form-group">
                   <label>{content.userIdLabel}</label>
                   <div className="input-wrapper">
                     <i className="bi bi-person"></i>
                     <input
                       type="text"
                       name="email_or_phone"
                       value={formData.email_or_phone}
                       onChange={handleChange}
                       placeholder={content.userIdPlaceholder}
                       readOnly={['director', 'it-cell'].includes(formData.role)}
                     />
                   </div>
                 </div>
               )}

              <div className="form-group">
                <label>{content.passwordLabel}</label>
                <div className="input-wrapper">
                  <i className="bi bi-lock"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={content.passwordPlaceholder}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>{content.rememberMe}</span>
                </label>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {content.signingIn}
                  </>
                ) : (
                  content.signIn
                )}
              </button>
            </form>

            <div className="login-footer">
              <p>{content.needAccess}<Link to="/contact">{content.contactAdmin}</Link></p>
            </div>
          </div>
        </div>

      
      </div>

      {showResetPasswordModal && (
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => setShowResetPasswordModal(false)}
          username={resetPasswordUsername}
          role={resetPasswordRole}
          onPasswordResetSuccess={handlePasswordResetSuccess}
          content={content.resetPassword}
        />
      )}
    </div>
  );
};

export default Login;