import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import '../styles/Footer.css'
import logo from '../assets/banana.svg'

const DEFAULT_SITE_URL = 'https://nanobanana2.online'
const SUPPORT_EMAIL = 'support@nanobanana.ai'
const CAREERS_EMAIL = 'jobs@nanobanana.ai'
const CONTACT_FORM_URL = 'https://nanobanana2.online/contact'

function Footer() {
  const { t, getLocalizedPath } = useLanguage()

  const { encodedUrl, shareMessage } = useMemo(() => {
    const rawUrl =
      (import.meta.env.VITE_BASE_URL && import.meta.env.VITE_BASE_URL.trim()) ||
      DEFAULT_SITE_URL
    const normalizedUrl = rawUrl.replace(/\/$/, '')
    return {
      encodedUrl: encodeURIComponent(normalizedUrl),
      shareMessage: encodeURIComponent(t('footer.shareMessage'))
    }
  }, [t])

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="logo-container">
              <img src={logo} alt="Nano Banana2" className="footer-logo" />
              <span className="footer-logo-text">Nano Banana2</span>
            </div>
            <p className="footer-description">
              {t('footer.description')}
            </p>
            <div className="footer-social">
              <a
                href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareMessage}`}
                className="social-link"
                aria-label="Share on X"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.5 3h5.1l3.47 5.14L17.93 3H22l-6.84 8.91L22 21h-5.1l-3.74-5.51L9.18 21H4l7-9.06L4.5 3z" />
                </svg>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                className="social-link"
                aria-label="Share on Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              <a
                href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${shareMessage}`}
                className="social-link"
                aria-label="Share on LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.71h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.52 4.78 5.8V21h-4v-5.37c0-1.28-.03-2.93-1.79-2.93-1.8 0-2.07 1.4-2.07 2.84V21H9z"/>
                </svg>
              </a>
              <a
                href={`https://www.reddit.com/submit?url=${encodedUrl}&title=${shareMessage}`}
                className="social-link"
                aria-label="Share on Reddit"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-1.1-.9-2-2-2-.55 0-1.05.23-1.41.59-1.64-1.05-3.87-1.73-6.33-1.82l1.35-3.16 2.87.68c0 1.1.9 2 2 2a2 2 0 10-1.74-2.96l-3.25-.77a.5.5 0 00-.59.3l-1.6 3.76c-2.61.03-4.97.72-6.68 1.85A2 2 0 004 10a2 2 0 000 4h.06c-.04.33-.06.66-.06 1 0 3.31 3.13 6 7 6s7-2.69 7-6c0-.34-.02-.67-.06-1H20a2 2 0 002-2zm-13.5 1.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7.75 3.35C15.08 17.63 13.63 18 12 18c-1.63 0-3.08-.37-4.25-1.15a.5.5 0 01.5-.86C9.22 16.67 10.53 17 12 17c1.47 0 2.78-.33 3.75-.99a.5.5 0 01.5.86zM16.5 12a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-links-container">
            <div className="footer-links-group">
              <h4 className="footer-heading">{t('footer.product')}</h4>
              <ul className="footer-links">
                <li><Link to={getLocalizedPath('/editor')} className="footer-link">{t('footer.imageEditor')}</Link></li>
                <li><Link to={getLocalizedPath('/pricing')} className="footer-link">{t('footer.pricing')}</Link></li>
                <li><Link to={getLocalizedPath('/showcase')} className="footer-link">{t('footer.showcase')}</Link></li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-heading">{t('footer.company')}</h4>
              <ul className="footer-info-list">
                <li className="footer-info-item">
                  <span className="footer-link-title">{t('footer.about')}</span>
                  <p className="footer-link-description">{t('footer.aboutDescription')}</p>
                </li>
                <li className="footer-info-item">
                  <span className="footer-link-title">{t('footer.careers')}</span>
                  <a
                    href={`mailto:${CAREERS_EMAIL}`}
                    className="footer-action-link"
                  >
                    {t('footer.careersAction')}
                  </a>
                  <p className="footer-link-description">{t('footer.careersDescription')}</p>
                </li>
              </ul>
            </div>

            <div className="footer-links-group">
              <h4 className="footer-heading">{t('footer.contact')}</h4>
              <ul className="footer-info-list">
                <li className="footer-info-item">
                  <span className="footer-link-title">{t('footer.contactEmailLabel')}</span>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="footer-action-link"
                  >
                    {t('footer.contactEmailAction')}
                  </a>
                  <p className="footer-link-description">{t('footer.contactEmailDescription')}</p>
                </li>
                <li className="footer-info-item">
                  <span className="footer-link-title">{t('footer.contactSupportLabel')}</span>
                  <a
                    href={CONTACT_FORM_URL}
                    className="footer-action-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('footer.contactSupportAction')}
                  </a>
                  <p className="footer-link-description">{t('footer.contactSupportDescription')}</p>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} Nano Banana2. {t('footer.allRightsReserved')}</p>
          </div>
          <div className="footer-legal">
            <Link to={getLocalizedPath('/privacy')} className="legal-link">{t('footer.privacy')}</Link>
            <Link to={getLocalizedPath('/terms')} className="legal-link">{t('footer.terms')}</Link>
            <Link to={getLocalizedPath('/cookies')} className="legal-link">{t('footer.cookiePolicy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
