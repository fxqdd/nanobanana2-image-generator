import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/NotFound.css';

const NotFound = () => {
  const { t, getLocalizedPath } = useLanguage();
  
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="banana-icon">🍌</div>
        <h1 className="not-found-title">{t('notFound.title')}</h1>
        <p className="not-found-message">{t('notFound.message')}</p>
        <p className="not-found-submessage">
          {t('notFound.submessage')}
        </p>
        <Link to={getLocalizedPath('/')} className="back-home-button">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;