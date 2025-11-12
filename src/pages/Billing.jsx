import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import '../styles/Settings.css';
import { getMyProfile, getMySubscription } from '../services/db';

const Billing = () => {
  const { t, getLocalizedPath } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, s] = await Promise.all([getMyProfile(), getMySubscription()]);
      if (!mounted) return;
      if (p) setProfile(p);
      if (s) setSubscription(s);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="container page billing-page">
      <SEO
        title={t('seo.billing?.title') || `${t('nav.billing')} - ${t('common.appName')}`}
        description={t('seo.billing?.description') || t('billing.subtitle')}
        keywords={t('seo.billing?.keywords') || 'billing, subscription, invoices'}
        path={getLocalizedPath('/billing')}
      />

      <h1>{t('billing.title') || t('nav.billing')}</h1>
      <p>{t('billing.subtitle')}</p>

      {/* 订阅计划 */}
      <div className="card list-card">
        <h3>{t('billing.plan') || 'Subscription plan'}</h3>
        <div className="row">
          <div className="col">
            <label>{t('billing.currentPlan') || 'Current plan'}</label>
            <span>{profile?.plan || t('pricing.professional') || 'Professional'}{subscription?.status ? ` · ${subscription.status}` : ''}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('billing.renewalDate') || 'Renewal date'}</label>
            <span>{subscription?.renew_at ? new Date(subscription.renew_at).toLocaleDateString() : (t('common.notAvailable') || '—')}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('billing.actions') || 'Actions'}</label>
            <span>{t('billing.planDesc') || 'Upgrade, downgrade or cancel'}</span>
          </div>
        </div>
      </div>

      {/* 发票记录 */}
      <div className="card list-card">
        <h3>{t('billing.invoices') || 'Invoices'}</h3>
        <div className="row">
          <div className="col">
            <label>{t('billing.lastInvoice') || 'Last invoice'}</label>
            <span>{t('common.notAvailable') || '—'}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('billing.download') || 'Download'}</label>
            <span>{t('billing.invoicesDesc') || 'Download past invoices'}</span>
          </div>
        </div>
      </div>

      {/* 支付方式 */}
      <div className="card list-card">
        <h3>{t('billing.paymentMethods') || 'Payment methods'}</h3>
        <div className="row">
          <div className="col">
            <label>{t('billing.primaryMethod') || 'Primary'}</label>
            <span>{t('common.notAvailable') || '—'}</span>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <label>{t('billing.manage') || 'Manage'}</label>
            <span>{t('billing.paymentMethodsDesc') || 'Add, remove or set default'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;


