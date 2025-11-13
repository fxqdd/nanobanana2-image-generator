import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import '../styles/Terms.css';

const Terms = () => {
  const { t, getLocalizedPath } = useLanguage();
  
  return (
    <div className="terms-container">
      <SEO
        title={t('terms.title')}
        description={t('terms.description')}
        path={getLocalizedPath('/terms')}
        keywords="terms of service, legal, agreement"
      />
      <h1>{t('terms.title')}</h1>
      
      <div className="terms-content">
        <section>
          <h2>{t('terms.section1.title')}</h2>
          <p>{t('terms.section1.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section2.title')}</h2>
          <p>{t('terms.section2.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section3.title')}</h2>
          <h3>{t('terms.section3.subsection1.title')}</h3>
          <p>{t('terms.section3.subsection1.content')}</p>
          
          <h3>{t('terms.section3.subsection2.title')}</h3>
          <p>{t('terms.section3.subsection2.content')}</p>
          
          <h3>{t('terms.section3.subsection3.title')}</h3>
          <p>{t('terms.section3.subsection3.content')}</p>
          
          <h3>{t('terms.section3.subsection4.title')}</h3>
          <p>{t('terms.section3.subsection4.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section4.title')}</h2>
          <h3>{t('terms.section4.subsection1.title')}</h3>
          <p>{t('terms.section4.subsection1.content')}</p>
          
          <h3>{t('terms.section4.subsection2.title')}</h3>
          <p>{t('terms.section4.subsection2.intro')}</p>
          <ul>
            {(t('terms.section4.subsection2.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('terms.section5.title')}</h2>
          <p>{t('terms.section5.content')}</p>
          <p>{t('terms.section5.reference')}</p>
        </section>

        <section>
          <h2>{t('terms.section6.title')}</h2>
          <h3>{t('terms.section6.subsection1.title')}</h3>
          <p>{t('terms.section6.subsection1.content')}</p>
          
          <h3>{t('terms.section6.subsection2.title')}</h3>
          <p>{t('terms.section6.subsection2.content')}</p>
          
          <h3>{t('terms.section6.subsection3.title')}</h3>
          <p>{t('terms.section6.subsection3.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section7.title')}</h2>
          <p>{t('terms.section7.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section8.title')}</h2>
          <p>{t('terms.section8.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section9.title')}</h2>
          <p>{t('terms.section9.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section10.title')}</h2>
          <p>{t('terms.section10.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section11.title')}</h2>
          <p>{t('terms.section11.content')}</p>
        </section>

        <section>
          <h2>{t('terms.section12.title')}</h2>
          <p>{t('terms.section12.intro')}</p>
          <p>{t('terms.section12.email')}</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;