import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import '../styles/Settings.css';
import { getMyProfile, getMySubscription, getMyGenerationsCountThisMonth } from '../services/db';

const Account = () => {
  const { t, getLocalizedPath } = useLanguage();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [monthlyCount, setMonthlyCount] = useState(null);

  const displayName = user?.displayName || user?.name || user?.username || '—';
  const email = profile?.email || user?.email || '—';
  const plan = profile?.plan || t('pricing.professional') || 'Professional';

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      const [p, s, m] = await Promise.all([
        getMyProfile(),
        getMySubscription(),
        getMyGenerationsCountThisMonth()
      ]);
      if (!mounted) return;
      if (p) setProfile(p);
      if (s) setSubscription(s);
      if (typeof m === 'number') setMonthlyCount(m);
    };
    
    // 立即加载一次
    loadData();
    
    // 每30秒更新一次（实时更新点数）
    const interval = setInterval(() => {
      if (mounted) {
        loadData();
      }
    }, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="container page account-page">
      <SEO
        title={t('seo.account?.title') || `${t('nav.account')} - ${t('common.appName')}`}
        description={t('seo.account?.description') || t('account.subtitle')}
        keywords={t('seo.account?.keywords') || 'account, profile, user center'}
        path={getLocalizedPath('/account')}
      />

      <h1>{t('account.title') || t('nav.account')}</h1>
      <p>{t('account.subtitle') || 'View your account information and usage statistics'}</p>

      {/* 账户信息 */}
      <div className="card list-card">
        <h3>{t('account.profile') || 'Account Information'}</h3>
        <div className="row">
          <div className="col">
            <label>{t('account.username') || 'Username'}</label>
            <span>{displayName}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('account.email') || 'Email'}</label>
            <span>{email}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('account.plan') || 'Plan'}</label>
            <span>{plan}{subscription?.status ? ` · ${subscription.status}` : ''}</span>
          </div>
        </div>
      </div>

      {/* 使用情况 */}
      <div className="card list-card">
        <h3>{t('account.usage') || 'Usage'}</h3>
        <div className="row">
          <div className="col">
            <label>{t('account.creditsRemaining') || 'Credits remaining'}</label>
            <span style={{ 
              color: (profile?.credits_remaining ?? 0) < 0 ? '#e53935' : 'inherit',
              fontWeight: (profile?.credits_remaining ?? 0) < 0 ? '600' : 'normal'
            }}>
              {profile?.credits_remaining !== null && profile?.credits_remaining !== undefined 
                ? profile.credits_remaining 
                : (t('common.notAvailable') || '—')}
            </span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('account.monthlyGeneration') || 'Monthly generations'}</label>
            <span>
              {monthlyCount !== null && monthlyCount !== undefined 
                ? monthlyCount 
                : (t('common.notAvailable') || '—')}
            </span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('account.recentActivity') || 'Recent activity'}</label>
            <span>{t('account.recentActivityDesc') || 'No recent activity'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;


