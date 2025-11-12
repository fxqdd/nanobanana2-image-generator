import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Showcase.css'

function Showcase() {
  const { t, getLocalizedPath } = useLanguage()
  const seoData = t('seo.showcase')

  const showcaseItems = [
    {
      id: 1,
      title: t('showcase.case1Title'),
      description: t('showcase.case1Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/FFA500/FFFFFF?text=案例1',
      prompt: t('showcase.case1Prompt')
    },
    {
      id: 2,
      title: t('showcase.case2Title'),
      description: t('showcase.case2Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/FFD700/333333?text=案例2',
      prompt: t('showcase.case2Prompt')
    },
    {
      id: 3,
      title: t('showcase.case3Title'),
      description: t('showcase.case3Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/87CEEB/FFFFFF?text=案例3',
      prompt: t('showcase.case3Prompt')
    },
    {
      id: 4,
      title: t('showcase.case4Title'),
      description: t('showcase.case4Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/9370DB/FFFFFF?text=案例4',
      prompt: t('showcase.case4Prompt')
    },
    {
      id: 5,
      title: t('showcase.case5Title'),
      description: t('showcase.case5Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/191970/FFFFFF?text=案例5',
      prompt: t('showcase.case5Prompt')
    },
    {
      id: 6,
      title: t('showcase.case6Title'),
      description: t('showcase.case6Desc'),
      imageUrl: 'https://via.placeholder.com/400x300/228B22/FFFFFF?text=案例6',
      prompt: t('showcase.case6Prompt')
    }
  ]

  return (
    <div className="showcase-page">
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        path={getLocalizedPath('/showcase')}
      />
      
      <div className="container">
        {/* 页面标题 */}
        <div className="showcase-header">
          <h1 className="showcase-title">{t('showcase.title')}</h1>
          <p className="showcase-subtitle">
            {t('showcase.subtitle')}
          </p>
        </div>

        {/* 案例网格 */}
        <div className="showcase-grid">
          {showcaseItems.map((item) => (
            <div key={item.id} className="showcase-card">
              <div className="showcase-image-container">
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  className="showcase-image"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/400x300/CCCCCC/666666?text=${encodeURIComponent(t('showcase.imageLoadError'))}`
                  }}
                />
                <div className="showcase-overlay">
                  <span className="showcase-badge">{t('showcase.aiGenerated')}</span>
                </div>
              </div>
              <div className="showcase-content">
                <h3 className="showcase-card-title">{item.title}</h3>
                <p className="showcase-description">{item.description}</p>
                <div className="showcase-prompt">
                  <span className="prompt-label">{t('showcase.promptLabel')}</span>
                  <span className="prompt-text">{item.prompt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 行动号召 */}
        <div className="showcase-cta">
          <h2 className="cta-title">{t('showcase.ctaTitle')}</h2>
          <p className="cta-description">
            {t('showcase.ctaDescription')}
          </p>
          <div className="cta-buttons">
            <Link to={getLocalizedPath('/editor')} className="btn btn-primary">
              {t('showcase.startEditing')}
            </Link>
            <Link to={getLocalizedPath('/pricing')} className="btn btn-secondary">
              {t('showcase.viewPricing')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Showcase

