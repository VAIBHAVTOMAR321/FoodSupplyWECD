import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "../../assets/css/footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="gov-footer py-2">
      <Container>
        <Row className="align-items-center">
          <Col md={12} className="text-center">
            <p className="mb-0">
  © 2026 Food Chain &amp; Supply. All Rights Reserved.
</p>

<p className="mb-0 mt-1">
  Designed &amp; Developed by{" "}
  <a
    href="https://brainrock.in"
    target="_blank"
    rel="noopener noreferrer"
    className="footer-link"
  >
    Brainrock
  </a>
</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;