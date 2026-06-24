import React from 'react'
import { Link } from 'react-router-dom'
import { Container, Row, Col } from 'react-bootstrap'

import '../../assets/css/footer.css';

function Footer() {
  const footerContent = {
    aboutText: "",
    quickLinks: [
      { path: "/", label: "Home" },
      { path: "/", label: "About" },
      { path: "/", label: "Services" },
      { path: "/Contact", label: "Contact" }
    ],
    services: [
      { path: "/", label: "" }
    ],
    contact: {
      address: "",
      phone: "+91-0135-272-1234",
      email: "support@anganwadi.gov.in"
    },
    copyright: "© 2024 Nutrition Decade. All rights reserved."
  }

  return (
    <footer className="gov-footer pt-5 pb-4">
      <Container>
        <Row className="g-4">
          <Col lg={4} md={6}>
            <div className="footer-brand">
              <h6 className="fw-bold mb-3">About Us</h6>
              <p className="small mb-0">{footerContent.aboutText}</p>
              <div className="footer-social">
                <a href="#"><i className="bi bi-facebook"></i></a>
                <a href="#"><i className="bi bi-twitter"></i></a>
                <a href="#"><i className="bi bi-instagram"></i></a>
                <a href="#"><i className="bi bi-linkedin"></i></a>
              </div>
            </div>
          </Col>

          <Col lg={2} md={6}>
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled">
              {footerContent.quickLinks.map((link, index) => (
                <li key={index}>
                  <Link to={link.path}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </Col>

          <Col lg={3} md={6}>
            <h6 className="fw-bold mb-3">Services</h6>
            <ul className="list-unstyled">
              {footerContent.services.map((service, index) => (
                <li key={index}>
                  <Link to={service.path}>{service.label}</Link>
                </li>
              ))}
            </ul>
          </Col>

          <Col lg={3} md={6}>
            <h6 className="fw-bold mb-3">Contact</h6>
            <div className="footer-contact small">
              <p><i className="bi bi-geo-alt"></i>{footerContent.contact.address}</p>
              <p><i className="bi bi-telephone"></i>{footerContent.contact.phone}</p>
              <p><i className="bi bi-envelope"></i>{footerContent.contact.email}</p>
            </div>
          </Col>
        </Row>

        <hr className="my-4" />

        <Row className="align-items-center">
          <Col md={6}>
            <div className="footer-bottom">
              <p>{footerContent.copyright}</p>
            </div>
          </Col>
          <Col md={6} className="text-md-end mt-3 mt-md-0">
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Use</Link>
              <Link to="/disclaimer">Disclaimer</Link>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
