import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import '../styles/Pricing.css';

const formatPrice = (value) => `$${value.toFixed(2)}`;
const formatNumber = (value) => value.toLocaleString('en-US');

const getPlanPricing = (plan, billingCycle, t) => {
  const baseMonthly = plan.monthlyPrice;
  const discountedMonthly = plan.monthlySale;
  if (billingCycle === 'monthly') {
    const yearlyApprox = discountedMonthly * 12;
    return {
      currentPrice: formatPrice(discountedMonthly),
      originalPrice: formatPrice(baseMonthly),
      periodLabel: t('pricing.perMonth'),
      totalLabel: `≈ ${formatPrice(yearlyApprox)} ${t('pricing.perYear')}`,
      savingsLabel: `${t('pricing.currentDiscount')} ${formatPrice(baseMonthly - discountedMonthly)} ${t('pricing.perMonthDiscount')}`
    };
  }

  const yearlyMonthly = Math.max(discountedMonthly - plan.yearlyDiscount, 0);
  const yearlyTotal = yearlyMonthly * 12;
  const baseTotal = baseMonthly * 12;

  return {
    currentPrice: formatPrice(yearlyMonthly),
    originalPrice: formatPrice(baseMonthly),
    periodLabel: `${t('pricing.perMonth')}（${t('pricing.payYearly').replace('：', '')}）`,
    totalLabel: `${formatPrice(yearlyTotal)} ${t('pricing.perYear')}`,
    savingsLabel: `${t('pricing.comparedToOriginal')} $${plan.yearlyDiscount.toFixed(0)} · ${t('pricing.yearlySavings')} ${formatPrice(baseTotal - yearlyTotal)}`
  };
};

const renderStars = (rating) =>
  Array(5)
    .fill(0)
    .map((_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : 'empty'}`}>
        ★
      </span>
    ));

const renderComparisonCell = (value, type = 'boolean') => {
  if (type === 'boolean') {
    return value ? <span className="comparison-check">✓</span> : <span className="comparison-x">✗</span>;
  }
  if (type === 'array') {
    return (
      <div className="feature-tags">
        {value.map((item, index) => (
          <span key={index} className="feature-tag">
            {item}
          </span>
        ))}
      </div>
    );
  }
  return <span className="comparison-text">{value}</span>;
};

const GUMROAD_BASIC_MONTHLY_URL = 'https://fxqdd.gumroad.com/l/qxdec';

const Pricing = () => {
  const { t, getLocalizedPath } = useLanguage();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const seoData = t('seo.pricing');

  const getCheckoutLink = (plan) => {
    return billingCycle === 'monthly' ? plan.gumroadMonthly : plan.gumroadYearly;
  };

  const handleCheckout = (plan) => {
    const checkoutLink = getCheckoutLink(plan);
    if (!checkoutLink) {
      alert(t('pricing.checkoutUnavailable') || 'Payment link is not ready for this plan. Please contact support.');
      return;
    }
    window.open(checkoutLink, '_blank', 'noopener');
  };

  // 使用翻译的定价计划数据
  const pricingPlans = [
    {
      id: 'basic',
      name: t('pricing.basic'),
      icon: '⚡',
      badge: 'limitedOffer',
      description: t('pricing.basicDesc'),
      monthlyPrice: 30,
      monthlySale: 24.9,
      yearlyDiscount: 5,
      pointsPerYear: 9600,
      highlight: false,
      cta: t('pricing.subscribe'),
      gumroadMonthly: GUMROAD_BASIC_MONTHLY_URL,
      gumroadYearly: '',
      features: [
        t('pricing.feature1'),
        t('pricing.feature2'),
        t('pricing.feature3'),
        t('pricing.feature4'),
        t('pricing.feature5'),
        t('pricing.feature6'),
        t('pricing.feature7'),
        t('pricing.feature8'),
        t('pricing.feature9'),
        t('pricing.feature10')
      ]
    },
    {
      id: 'professional',
      name: t('pricing.professional'),
      icon: '🌟',
      badge: 'mostPopular',
      description: t('pricing.professionalDesc'),
      monthlyPrice: 70,
      monthlySale: 59.9,
      yearlyDiscount: 10,
      pointsPerYear: 30000,
      highlight: true,
      cta: t('pricing.subscribe'),
      gumroadMonthly: '',
      gumroadYearly: '',
      features: [
        t('pricing.proFeature1'),
        t('pricing.proFeature2'),
        t('pricing.proFeature3'),
        t('pricing.proFeature4'),
        t('pricing.proFeature5'),
        t('pricing.proFeature6'),
        t('pricing.proFeature7'),
        t('pricing.proFeature8'),
        t('pricing.proFeature9'),
        t('pricing.proFeature10'),
        t('pricing.proFeature11')
      ]
    },
    {
      id: 'master',
      name: t('pricing.master'),
      icon: '👑',
      badge: 'flagship',
      description: t('pricing.masterDesc'),
      monthlyPrice: 135,
      monthlySale: 114.9,
      yearlyDiscount: 15,
      pointsPerYear: 65000,
      highlight: false,
      cta: t('pricing.subscribe'),
      gumroadMonthly: '',
      gumroadYearly: '',
      features: [
        t('pricing.masterFeature1'),
        t('pricing.masterFeature2'),
        t('pricing.masterFeature3'),
        t('pricing.masterFeature4'),
        t('pricing.masterFeature5'),
        t('pricing.masterFeature6'),
        t('pricing.masterFeature7'),
        t('pricing.masterFeature8'),
        t('pricing.masterFeature9'),
        t('pricing.masterFeature10')
      ]
    }
  ];

  // 使用翻译的对比数据
  const comparisonData = [
    { feature: t('pricing.comparisonFeature1'), type: 'text', basic: t('pricing.comparisonBasic1'), professional: t('pricing.comparisonPro1'), master: t('pricing.comparisonMaster1') },
    { feature: t('pricing.comparisonFeature2'), type: 'text', basic: '9,600', professional: '30,000', master: '65,000' },
    { feature: t('pricing.comparisonFeature3'), type: 'boolean', basic: true, professional: true, master: true },
    { feature: t('pricing.comparisonFeature4'), type: 'boolean', basic: false, professional: true, master: true },
    { feature: t('pricing.comparisonFeature5'), type: 'boolean', basic: true, professional: true, master: true },
    { feature: t('pricing.comparisonFeature6'), type: 'boolean', basic: true, professional: true, master: true },
    { feature: t('pricing.comparisonFeature7'), type: 'boolean', basic: false, professional: true, master: true },
    { feature: t('pricing.comparisonFeature8'), type: 'boolean', basic: false, professional: true, master: true },
    { feature: t('pricing.comparisonFeature9'), type: 'boolean', basic: true, professional: true, master: true },
    { feature: t('pricing.comparisonFeature10'), type: 'array', basic: ['JPG', 'PNG', 'WebP'], professional: ['JPG', 'PNG', 'WebP', 'PSD'], master: ['JPG', 'PNG', 'WebP', 'PSD', 'TIFF'] }
  ];

  // 用户评价数据
  const testimonials = [
    {
      id: 1,
      name: t('pricing.testimonial1Name'),
      role: t('pricing.testimonial1Role'),
      avatar: 'ZM',
      content: t('pricing.testimonial1Content'),
      rating: 5
    },
    {
      id: 2,
      name: t('pricing.testimonial2Name'),
      role: t('pricing.testimonial2Role'),
      avatar: 'LH',
      content: t('pricing.testimonial2Content'),
      rating: 5
    },
    {
      id: 3,
      name: t('pricing.testimonial3Name'),
      role: t('pricing.testimonial3Role'),
      avatar: 'WF',
      content: t('pricing.testimonial3Content'),
      rating: 4
    }
  ];

  return (
    <div className="pricing-page">
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        path={getLocalizedPath('/pricing')}
      />
      
      <div className="pricing-hero">
        <span className="pricing-label">{t('pricing.heroLabel')}</span>
        <h1>{t('pricing.heroTitle')}</h1>
        <p>{t('pricing.heroDescription')}</p>

        <div className="billing-toggle">
          <button
            type="button"
            className={`billing-button ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            className={`billing-button ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            {t('pricing.yearly')}
            <span className="billing-saving">{t('pricing.extraDiscount')}</span>
          </button>
        </div>
      </div>

      <div className="pricing-plans">
        {pricingPlans.map((plan) => {
          const pricing = getPlanPricing(plan, billingCycle, t);
          const checkoutLink = getCheckoutLink(plan);
          return (
            <div key={plan.id} className={`pricing-card ${plan.highlight ? 'popular' : ''}`}>
              <div className="plan-topline">
                <span className="plan-icon">{plan.icon}</span>
                {plan.badge && <span className="plan-badge">{t(`pricing.${plan.badge === '限时优惠' ? 'limitedOffer' : plan.badge === '最受欢迎' ? 'mostPopular' : 'flagship'}`)}</span>}
              </div>

              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>

              <div className="price-block">
                <div className="price-current">
                  <span className="price-amount">{pricing.currentPrice}</span>
                  <span className="price-period">{pricing.periodLabel}</span>
                </div>
                <div className="price-original">{t('pricing.originalPrice')} {pricing.originalPrice} {t('pricing.perMonth')}</div>
                <div className="price-total">{billingCycle === 'yearly' ? `${t('pricing.payYearly')}${pricing.totalLabel}` : pricing.totalLabel}</div>
                <div className="price-savings">{pricing.savingsLabel}</div>
              </div>

              <div className="plan-points">
                <span>{formatNumber(plan.pointsPerYear)} {t('pricing.pointsPerYear')}</span>
              </div>

              <ul className="plan-feature-list">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <span className="feature-icon">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`plan-button ${plan.highlight ? 'primary' : 'secondary'}`}
                type="button"
                onClick={() => handleCheckout(plan)}
                disabled={!checkoutLink}
              >
                {checkoutLink ? t('pricing.subscribe') : t('pricing.contactUs') || 'Contact us'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="comparison-section">
        <h2>{t('pricing.comparisonTitle')}</h2>
        <div className="comparison-table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('pricing.feature')}</th>
                <th>{t('pricing.basic')}</th>
                <th>{t('pricing.professional')}</th>
                <th>{t('pricing.master')}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                  <td className="feature-column">{row.feature}</td>
                  <td>{renderComparisonCell(row.basic, row.type)}</td>
                  <td>{renderComparisonCell(row.professional, row.type)}</td>
                  <td>{renderComparisonCell(row.master, row.type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="testimonials-section">
        <h2>{t('pricing.testimonialsTitle')}</h2>
        <div className="testimonials">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="testimonial-card">
              <div className="testimonial-rating">{renderStars(testimonial.rating)}</div>
              <p className="testimonial-content">{testimonial.content}</p>
              <div className="testimonial-user">
                <div className="user-avatar">{testimonial.avatar}</div>
                <div className="user-info">
                  <h4 className="user-name">{testimonial.name}</h4>
                  <p className="user-role">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nano Banana 2 介绍（移动到 FAQ 上方） */}
      <section className="nb2-intro">
        <div className="container">
          <div className="nb2-card">
            <h2 className="nb2-title">
              {t('home.nb2Title') || 'Nano Banana 2（Gempix2）'}
            </h2>
            <p className="nb2-subtitle">
              {t('home.nb2Subtitle') || '由 Google 先进的 Gemini 3 Pro 模型驱动的新一代图像生成引擎'}
            </p>
            <div className="nb2-notice">
              {t('home.nb2Notice') || '提示：Gempix2 模型尚未正式发布。一旦开放会第一时间接入，目前线上仍由 Nano Banana 模型提供服务。'}
            </div>
            <ul className="nb2-list">
              <li>✓ {t('home.nb2Gemini') || 'Gemini 3 Pro 支持，语义理解更深'}</li>
              <li>✓ {t('home.nb22k') || '2K 原生（2048×2048）'}</li>
              <li>✓ {t('home.nb24k') || '4K 上采样'}</li>
              <li>✓ {t('home.nb2TextCharts') || '文本、图表、信息图的准确性大幅提升'}</li>
              <li>✓ {t('home.nb2Consistency') || '近乎完美的一致性'}</li>
              <li>✓ {t('home.nb2Semantic') || '更深层的语境理解'}</li>
              <li>✓ {t('home.nb2Blend') || '无缝融合（混合 2–5 张图像）'}</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="faq-section">
        <h2>{t('pricing.faqTitle')}</h2>
        <div className="faq-container">
          <div className="faq-item">
            <button className="faq-question">{t('pricing.question1')}</button>
            <div className="faq-answer">
              <p>{t('pricing.answer1')}</p>
            </div>
          </div>
          <div className="faq-item">
            <button className="faq-question">{t('pricing.question2')}</button>
            <div className="faq-answer">
              <p>{t('pricing.answer2')}</p>
            </div>
          </div>
          <div className="faq-item">
            <button className="faq-question">{t('pricing.question3')}</button>
            <div className="faq-answer">
              <p>{t('pricing.answer3')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="cta-section">
        <h2>{t('pricing.ctaTitle') || '准备好升级创作体验了吗？'}</h2>
        <p>{t('pricing.ctaDescription') || '立即注册，领取 14 天专业版试用，体验旗舰级 AI 图像编辑能力'}</p>
        <div className="cta-buttons">
          <Link to={getLocalizedPath('/login')} className="primary-button">
            {t('pricing.ctaButton1') || '免费开始'}
          </Link>
          <Link to={getLocalizedPath('/editor')} className="secondary-button">
            {t('pricing.ctaButton2') || '预约产品演示'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Pricing;