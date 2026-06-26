import React, { useState } from "react";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";
import { useLanguage } from "../all_login/LanguageContext";

import "../../assets/css/navbar.css";
import ukLogo from "../../assets/images/new_logo_uk.png";
import womenLogo from "../../assets/images/women_logo.jpeg";

function NavBar() {
  const [expanded, setExpanded] = useState(false);
  const { language, setLanguage } = useLanguage();

  return (
    <Navbar expand="lg" expanded={expanded} onToggle={setExpanded} fixed="top" className="custom-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="brand-logo-wrapper">
          <img 
            src={ukLogo} 
            alt="UK Logo" 
            className="navbar-logo"
          />
           <div className="brand-text-container">
            
            <div className="uttarakhand-heading">
              <span className="uttarakhand-title">
               {language === 'hi' ? (
  ''
) : (
  <>
 <div style={{ lineHeight: "1.2" }} className="women-style">
  


  <>
    Women Empowerment & <br />
    Child Development Department
  </>
</div>
</>
)}
              </span>
              <img 
                src={womenLogo} 
                alt="Women Logo" 
                className="women-logo"
              />
            </div>
           
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" className="navbar-toggler-custom">
          <span className="toggler-line"></span>
          <span className="toggler-line"></span>
          <span className="toggler-line"></span>
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto nav-links">
            {/* <Nav.Link as={Link} to="/" className="nav-link-item" onClick={() => setExpanded(false)}>
              <span className="nav-link-dot"></span>
              {language === 'hi' ? 'होम' : 'Home'}
            </Nav.Link> */}

            {/* <Nav.Link as={Link} to="/Login" className="register-btn" onClick={() => setExpanded(false)}>
              {language === 'hi' ? 'लॉगिन' : 'Login'}
              <span className="register-btn-arrow">→</span>
            </Nav.Link> */}

            {/* Desktop Language Toggle
            <Button 
              variant="outline-primary" 
              size="sm" 
              className="language-toggle-btn desktop-language-toggle"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            >
              <i className="bi bi-translate me-1"></i>
              {language === 'en' ? 'हिन्दी' : 'English'}
            </Button> */}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;