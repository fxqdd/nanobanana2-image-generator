import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import '../styles/Settings.css';
import { getMyProfile, getMySubscription, getMyInvoices } from '../services/db';

const Billing = () => {
  const { t, getLocalizedPath } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [p, s, inv] = await Promise.all([
        getMyProfile(),
        getMySubscription(),
        getMyInvoices(10)
      ]);
      if (!mounted) return;
      if (p) setProfile(p);
      if (s) setSubscription(s);
      if (Array.isArray(inv)) setInvoices(inv);
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
        {invoices.length === 0 ? (
          <div className="row">
            <div className="col">
              <label>{t('billing.lastInvoice') || 'Last invoice'}</label>
              <span>{t('common.notAvailable') || '—'}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="row">
              <div className="col">
                <label>{t('billing.lastInvoice') || 'Last invoice'}</label>
                <span>
                  {new Date(invoices[0].issued_at).toLocaleDateString()} ·{' '}
                  {(invoices[0].amount_cents / 100).toFixed(2)}{' '}
                  {invoices[0].currency || 'USD'}
                </span>
              </div>
            </div>
            <div className="row">
              <div className="col">
                <label>{t('billing.download') || 'Download'}</label>
                <span>{t('billing.invoicesDesc') || 'Download past invoices'}</span>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Billing;


