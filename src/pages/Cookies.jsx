import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Terms.css'

const Cookies = () => {
  const { t, getLocalizedPath } = useLanguage()
  const sections = t('cookies.sections') || []

  return (
    <div className="terms-container">
      <SEO
        title={t('cookies.title')}
        description={t('cookies.description')}
        path={getLocalizedPath('/cookies')}
        keywords="cookies, policy, privacy, nano banana 2"
      />
      <h1>{t('cookies.title')}</h1>

      <div className="terms-content">
        {sections.map((section, index) => (
          <section key={section.title || index}>
            {section.title && <h2>{section.title}</h2>}
            {(section.paragraphs || []).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{paragraph}</p>
            ))}
            {Array.isArray(section.list) && section.list.length > 0 && (
              <ul>
                {section.list.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

export default Cookies

