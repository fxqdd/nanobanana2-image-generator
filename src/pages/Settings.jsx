import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import '../styles/Settings.css';

const Settings = () => {
  const { t, getLocalizedPath, language, changeLanguage } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  // Initialize from current DOM state first to avoid toggling on enter
  const initialAppearance =
    (typeof document !== 'undefined' &&
      document.body.classList.contains('dark-mode'))
      ? 'dark'
      : (localStorage.getItem('appearance') || 'light');
  const [appearance, setAppearance] = useState(initialAppearance);
  // Only apply theme change after explicit user action
  const hasUserChangedAppearance = useRef(false);

  useEffect(() => {
    if (!hasUserChangedAppearance.current) {
      return;
    }
    const isDark = appearance === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('appearance', appearance);
  }, [appearance]);

  return (
    <div className="container page settings-page">
      <SEO
        title={t('seo.settings?.title') || `${t('nav.settings')} - ${t('common.appName')}`}
        description={t('seo.settings?.description') || t('settings.subtitle')}
        keywords={t('seo.settings?.keywords') || 'settings, profile, security'}
        path={getLocalizedPath('/settings')}
      />

      <h1>{t('settings.title') || t('nav.settings')}</h1>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          {t('settings.tabSettings') || 'Settings'}
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          {t('settings.tabNotifications') || 'Notifications'}
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="settings-section">
          <h2>{t('settings.sectionTitle') || 'Settings'}</h2>

          <div className="card">
            <div className="row">
              <div className="col">
                <label>{t('settings.email') || 'Email'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{user?.email || '—'}</span>
                  <span className="badge badge-success">
                    {t('settings.verified') || 'Verified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col">
                <label>{t('settings.language') || 'Language'}</label>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ru">Русский</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col">
                <label>{t('settings.appearance') || 'Dashboard appearance'}</label>
                <select
                  value={appearance}
                  onChange={(e) => {
                    hasUserChangedAppearance.current = true;
                    setAppearance(e.target.value);
                  }}
                >
                  <option value="light">{t('settings.appearanceLight') || 'Light'}</option>
                  <option value="dark">{t('settings.appearanceDark') || 'Dark'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* danger zone removed per request */}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="settings-section">
          <h2>{t('settings.notifications') || 'Notifications'}</h2>
          <div className="card">
            <p>{t('settings.notificationsDesc') || 'Email and in-app notification preferences.'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;


