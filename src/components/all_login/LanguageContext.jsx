import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext(null);

const hindiTranslations = {
  Dashboard: 'डैशबोर्ड',
  DashBoard: 'डैशबोर्ड',
  'Anganwadi Panel': 'आंगनवाड़ी पैनल',
  'Supervisor Panel': 'पर्यवेक्षक पैनल',
  'CDPO Panel': 'सीडीपीओ पैनल',
  'DPO Panel': 'डीपीओ पैनल',
  'Director Panel': 'निदेशक पैनल',
  'IT Panel': 'आईटी पैनल',
  'Anganwadi Profile': 'आंगनवाड़ी प्रोफ़ाइल',
  'Food Item Receiving': 'खाद्य सामग्री प्राप्ति',
  Distribution: 'वितरण',
  Distributions: 'वितरण',
  'HCM Distribution': 'एचसीएम वितरण',
  'THR Distribution': 'टीएचआर वितरण',
  'HCM Distributions': 'एचसीएम वितरण',
  'THR Distributions': 'टीएचआर वितरण',
  Receiving: 'प्राप्ति',
  'Food Receiving': 'खाद्य सामग्री प्राप्ति',
  'HCM Receiving': 'एचसीएम प्राप्ति',
  'THR Receiving': 'टीएचआर प्राप्ति',
  'AWC List': 'आंगनवाड़ी केंद्र सूची',
  'Stock Allocation': 'स्टॉक आवंटन',
  'Sector Profile': 'सेक्टर प्रोफ़ाइल',
  'Master Supplementary': 'मास्टर पूरक पोषण',
  'Beneficiarie Entry': 'लाभार्थी प्रविष्टि',
  'Beneficiary Entry': 'लाभार्थी प्रविष्टि',
  'AWC & Sector List': 'आंगनवाड़ी केंद्र एवं सेक्टर सूची',
  'AWC, Sector & Project List': 'आंगनवाड़ी केंद्र, सेक्टर एवं परियोजना सूची',
  'Our Staff List': 'हमारे कर्मचारी सूची',
  'Food Items': 'खाद्य सामग्री',
  'Beneficiary  Distribution': 'लाभार्थी वितरण',
  'Center Receiving  Report': 'केंद्र प्राप्ति रिपोर्ट',
  'HCM Report': 'एचसीएम रिपोर्ट',
  'THR Report': 'टीएचआर रिपोर्ट',
  'Password Reset': 'पासवर्ड रीसेट',
  'Food Item': 'खाद्य सामग्री',
  'Reports & Distribution': 'रिपोर्ट एवं वितरण',
  Recieving: 'प्राप्ति',
  'THR Distribution ': 'टीएचआर वितरण',
  Logout: 'लॉग आउट',
  Save: 'सहेजें',
  Submit: 'जमा करें',
  Cancel: 'रद्द करें',
  Close: 'बंद करें',
  Search: 'खोजें',
  Filter: 'फ़िल्टर',
  View: 'देखें',
  Edit: 'संपादित करें',
  Delete: 'हटाएं',
  Add: 'जोड़ें',
  Update: 'अपडेट करें',
  Back: 'वापस',
  Download: 'डाउनलोड',
  Export: 'निर्यात',
  Print: 'प्रिंट',
  'Loading...': 'लोड हो रहा है...',
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const savedLanguage = window.localStorage.getItem('food-supply-language');
    return savedLanguage === 'hi' ? 'hi' : 'en';
  });

  const setLanguage = (nextLanguage) => {
    const next = typeof nextLanguage === 'function' ? nextLanguage(language) : nextLanguage;
    const normalizedLanguage = next === 'hi' ? 'hi' : 'en';
    window.localStorage.setItem('food-supply-language', normalizedLanguage);
    setLanguageState(normalizedLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (text, hindiText) => (
    language === 'hi' ? hindiText || hindiTranslations[text] || text : text
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// The context hook must be exported alongside the provider for consumers.
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}