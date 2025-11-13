import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import '../styles/Privacy.css';

const Privacy = () => {
  const { t, getLocalizedPath } = useLanguage();
  
  return (
    <div className="privacy-container">
      <SEO
        title={t('privacy.title')}
        description={t('privacy.description')}
        path={getLocalizedPath('/privacy')}
        keywords="privacy policy, data protection, personal information"
      />
      <h1>{t('privacy.title')}</h1>
      
      <div className="privacy-content">
        <section>
          <h2>{t('privacy.section1.title')}</h2>
          <p>{t('privacy.section1.content')}</p>
        </section>

        <section>
          <h2>{t('privacy.section2.title')}</h2>
          <h3>{t('privacy.section2.subsection1.title')}</h3>
          <p>{t('privacy.section2.subsection1.intro')}</p>
          <ul>
            {(t('privacy.section2.subsection1.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('privacy.section2.subsection2.title')}</h3>
          <p>{t('privacy.section2.subsection2.intro')}</p>
          <ul>
            {(t('privacy.section2.subsection2.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('privacy.section2.subsection3.title')}</h3>
          <p>{t('privacy.section2.subsection3.intro')}</p>
          <ul>
            {(t('privacy.section2.subsection3.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section3.title')}</h2>
          <h3>{t('privacy.section3.subsection1.title')}</h3>
          <p>{t('privacy.section3.subsection1.intro')}</p>
          <ul>
            {(t('privacy.section3.subsection1.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('privacy.section3.subsection2.title')}</h3>
          <p>{t('privacy.section3.subsection2.intro')}</p>
          <ul>
            {(t('privacy.section3.subsection2.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('privacy.section3.subsection3.title')}</h3>
          <p>{t('privacy.section3.subsection3.intro')}</p>
          <ul>
            {(t('privacy.section3.subsection3.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('privacy.section3.subsection4.title')}</h3>
          <p>{t('privacy.section3.subsection4.intro')}</p>
          <ul>
            {(t('privacy.section3.subsection4.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section4.title')}</h2>
          <h3>{t('privacy.section4.subsection1.title')}</h3>
          <p>{t('privacy.section4.subsection1.content')}</p>
          <h3>{t('privacy.section4.subsection2.title')}</h3>
          <p>{t('privacy.section4.subsection2.intro')}</p>
          <ul>
            {(t('privacy.section4.subsection2.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{t('privacy.section5.title')}</h2>
          <p>{t('privacy.section5.intro')}</p>
          <ul>
            {(t('privacy.section5.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{t('privacy.section5.note')}</p>
        </section>

        <section>
          <h2>{t('privacy.section6.title')}</h2>
          <p>{t('privacy.section6.intro')}</p>
          <ul>
            {(t('privacy.section6.items') || []).map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{t('privacy.section6.contact')}</p>
        </section>

        <section>
          <h2>{t('privacy.section7.title')}</h2>
          <p>{t('privacy.section7.content')}</p>
        </section>

        <section>
          <h2>{t('privacy.section8.title')}</h2>
          <p>{t('privacy.section8.content')}</p>
        </section>

        <section>
          <h2>{t('privacy.section9.title')}</h2>
          <p>{t('privacy.section9.intro')}</p>
          <p>{t('privacy.section9.email')}</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
