import React from 'react';
import Button from 'react-bootstrap/Button';
import { useLanguage } from './LanguageContext';

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const nextLanguage = language === 'en' ? 'hi' : 'en';
  const nextLanguageLabel = nextLanguage === 'hi' ? 'हिन्दी' : 'English';

  return (
    <Button
      type="button"
      variant="outline-primary"
      size="sm"
      className="language-toggle"
      onClick={() => setLanguage(nextLanguage)}
      aria-label={`Switch language to ${nextLanguage === 'hi' ? 'Hindi' : 'English'}`}
      title={`Switch language to ${nextLanguage === 'hi' ? 'Hindi' : 'English'}`}
      style={{ whiteSpace: 'nowrap', flexShrink: 0, marginRight: '8px' }}
    >
      <i className="bi bi-translate me-1" aria-hidden="true" />
      {nextLanguageLabel}
    </Button>
  );
}

export default LanguageToggle;
