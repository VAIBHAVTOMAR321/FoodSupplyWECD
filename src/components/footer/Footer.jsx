import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "../../assets/css/footer.css";
import { useLanguage } from "../all_login/LanguageContext";

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="gov-footer py-2">
      <Container>
        <Row className="align-items-center">
          <Col md={12} className="text-center">
            <p className="mb-0">
  © {currentYear} {t("Food Chain & Supply. All Rights Reserved.", "फूड चेन एंड सप्लाई। सर्वाधिकार सुरक्षित।")}
</p>

<p className="mb-0 mt-1">
  {t("Designed & Developed by", "डिज़ाइन एवं विकास")}{" "}
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