import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Row, Col, Modal, Button, Card, Table } from 'react-bootstrap'
import logo from "../../assets/images/gyandharalogo2.png";
import heroImg from "../../assets/images/CBSEimg.png";
import '../../assets/css/home.css'
import Footer from '../footer/Footer'
import Login from '../all_login/Login';

function Home() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  // All content in Hindi - Government Portal Style
  const content = {
    platformBadge: "🤝 स्वास्थ्य एवं परिवार कल्याण मंत्रालय",
    signInBtn: "साइन इन",
    getStartedBtn: "शुरू करें",
    learnMoreBtn: "अधिक जानें",
    heroTitle: "स्वास्थ्य एवं पोषण दशक: सूचना एवं प्रबंधन प्रणाली",
    heroSubtitle: "माता एवं शिशु के स्वास्थ्य एवं पोषण की निगरानी के लिए एक एकीकृत डैशबोर्ड। 1000 दिनों (गर्भावधि से 2 वर्ष तक) के दौरान जन्म से लेकर बाल्यकाल तक की जाँच, पोषण एवं टीकाकरण की निगरानी करें।",
    
    // Key Statistics Table (Yellow Highlighted Section as requested)
    statsTitle: "मुख्य आंकड़े एवं प्रगति",
    statsSubtitle: "वर्ष 2024-25 के दौरान किए गए उपलब्धियों का संक्षिप्त विवरण",
    statsTable: [
      { label: "कुल पंजीकृत गर्भवती महिलाएँ", value: "1,45,000+", change: "+12%", color: "blue" },
      { label: "पूर्ण टीकाकरण दर", value: "87.5%", change: "+5.2%", color: "green" },
      { label: "माता-शिशु सेवाएँ केंद्र", value: "3,200+", change: "+8%", color: "orange" },
      { label: "पोषण सम्बन्धित आहार", value: "92%", change: "+3%", color: "purple" },
     
    ],

    // Life Stages - Critical Phases (Yellow Marked Table Content)
    lifeStagesTitle: "महत्वपूर्ण जीवनचक्र",
    lifeStagesSubtitle: "सोने के 1000 दिनों (1000 Days) की समय सीमाएँ",
    lifeStages: [
      { 
        icon: "bi-calendar3", 
        title: "गर्भावधि (0-3 माह)", 
        desc: "प्रारंभिक पंजीकरण, ANC जाँच, आहार उपचार",
        color: "saffron",
        highlight: true
      },
      { 
        icon: "bi-heart-pulse", 
        title: "द्वितीय त्रैमासिक (3-6 माह)", 
        desc: "वृद्धि निगरानी, एनामली स्कैन, आहार सलाह",
        color: "blue",
        highlight: false
      },
      { 
        icon: "bi-activity", 
        title: "तृतीय त्रैमासिक (6-9 माह)", 
        desc: "जन्म तैयारी, जटिलता पूर्व तैयारी, पूरक पोषण",
        color: "green",
        highlight: true
      },
      { 
        icon: "bi-hospital", 
        title: "प्रसव एवं जन्म", 
        desc: "सुरक्षित प्रसव ट्रैकिंग एवं तात्कालिक पोषण",
        color: "orange",
        highlight: false
      },
      { 
        icon: "bi-baby", 
        title: "शिशुकाल (0-6 माह)", 
        desc: "विशेषत: स्तनपान और टीकाकरण समर्थन",
        color: "teal",
        highlight: true
      },
      { 
        icon: "bi-emoji-smile", 
        title: "बाल्यकाल (7-2 माह)", 
        desc: "पूरक आहार, विटामिन ए, सामान्य स्वास्थ्य जाँच",
        color: "purple",
        highlight: false
      },
     
    ],

    // Intervention Opportunities - Departmental Services
    servicesTitle: "विभागीय सेवाएँ एवं अवसर",
    servicesSubtitle: "माता-शिशु के लिए उपलब्ध मुख्य योजनाएँ",
    services: [
      { 
        icon: "bi-capsule", 
        title: "पोषण सहायता",
        desc: "टीकाकरण, पूरक आहार, आयरन एवं फोलिक अम्ल",
        items: ["THR (Take Home Ration)", "गर्म पकाया भोजन", "IFA गोलियाँ"],
        color: "saffron"
      },
    
    
      { 
        icon: "bi-bank", 
        title: "वित्तीय सहायता", 
        desc: "पीएमएमवायी, जीएसएयी, जननी आशीर्वाद योजना",
        items: ["₹6,000 (पीएमएमवायी)", "₹1,000 (जीएसएयी)", "₹5,000 (जननी आशीर्वाद)"],
        color: "orange"
      }
    ],

     // New Features / Recent Updates (Yellow Highlighted)
     newFeaturesTitle: "नई सुविधाएँ एवं अद्यतन",
     newFeaturesSubtitle: "बाल सहायता, महिला सहायता एवं स्वास्थ्य सेवाओं के लिए हेल्पलाइन नंबर",
     newFeatures: [
       { icon: "bi-telephone", title: "बाल सहायता हेल्पलाइन", desc: "बाल अधिकारों एवं सुरक्षा के लिए 24x7 सहायता", color: "saffron",  },
       { icon: "bi-phone", title: "महिला सहायता हेल्पलाइन", desc: "महिलाओं के लिए आपात सहायता एवं सुरक्षा", color: "green", },
       { icon: "bi-capsule", title: "स्वास्थ्य सेवा हेल्पलाइन", desc: "स्वास्थ्य संबंधी आपातकालीन सहायता", color: "blue",  }
     ],

  

    
    // Modal
    modalTitle: "पहुंच प्रतिबंधित",
    modalMessage: "स्वास्थ्य रिकॉर्ड देखने के लिए कृपया अपने विभागीय आईडी से लॉगिन करें।",
    modalLogin: "लॉगिन",
    modalRegister: "संस्था पंजीकरण"
  }

  const handleCardClick = () => setShowModal(true)
  const handleClose = () => setShowModal(false)

  // Statistics Card Component
  const StatCard = ({ stat, index }) => (
    <Col xs={6} md={4} lg={3} key={index} className="mb-3">
      <Card className={`stat-card stat-${stat.color} h-100 border-0 shadow-sm transition-hover`}>
        <Card.Body className="text-center p-2">
          <div className="stat-value fs-5 fw-bold">{stat.value}</div>
          <div className="stat-label small fw-medium">{stat.label}</div>
          <div className={`stat-change x-small text-${stat.color === 'red' ? 'danger' : 'success'}`}>
            <i className="bi bi-arrow-up-short"></i> {stat.change}
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <div className="home-wrapper">
     <Login />
    
    </div>
  )
}

export default Home
