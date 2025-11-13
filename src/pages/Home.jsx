import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Home.css'
import bananaLeft from '../assets/banana-left.svg'
import bananaRight from '../assets/banana-right.svg'

function Home() {
  const { t, getLocalizedPath } = useLanguage()
  const seoData = t('seo.home')

  return (
    <div className="home-page">
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        path={getLocalizedPath('/')}
      />

      {/* 免责声明 */}
      <div className="disclaimer">
        <div className="container">
          <p>
            {t('home.disclaimer')}
          </p>
        </div>
      </div>

      {/* 主横幅 */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badges">
              <span className="hero-badge">
                {t('home.heroBadge')}
                <Link to={getLocalizedPath('/editor')} className="badge-link">{t('home.heroBadgeLink')}</Link>
              </span>
            </div>
            
            <h1 className="hero-title fade-in">{t('home.heroTitle')}</h1>
            <p className="hero-description fade-in">
              {t('home.heroDescription')}
            </p>
            
            <div className="hero-buttons fade-in">
              <Link to={getLocalizedPath('/editor')} className="btn btn-primary">
                {t('home.startEditing')}
                <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"/>
                </svg>
              </Link>
              <Link to={getLocalizedPath('/showcase')} className="btn btn-secondary">
                {t('home.viewExamples')}
              </Link>
            </div>
            
            {/* 特性卡片 */}
            <div className="hero-features fade-in">
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <span className="feature-text">{t('home.featureOneClick')}</span>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🌈</div>
                <span className="feature-text">{t('home.featureMultiSupport')}</span>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <span className="feature-text">{t('home.featureNaturalLanguage')}</span>
              </div>
            </div>
          </div>
          
          {/* 装饰香蕉图片 */}
          <div className="hero-decorations">
            <img src={bananaLeft} alt="装饰" className="banana-left" />
            <img src={bananaRight} alt="装饰" className="banana-right" />
          </div>
        </div>
      </section>

      {/* Nano Banana 2 介绍 */}
      <section className="nb2-intro">
        <div className="container">
          <div className="nb2-card">
            <h2 className="nb2-title">
              {t('home.nb2Title') || 'Nano Banana 2（Gempix2）'}
            </h2>
            <p className="nb2-subtitle">
              {t('home.nb2Subtitle') || '由 Google 先进的 Gemini 3 Pro 模型驱动的新一代图像生成引擎'}
            </p>
            <h3 className="nb2-features-heading" style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '1.5rem', marginBottom: '1rem' }}>
              核心特性
            </h3>
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

      {/* 特性介绍 */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">{t('home.featuresTitle')}</h2>
          <p className="section-description">
            {t('home.featuresDescription')}
          </p>
          
          <div className="features-grid">
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">🎨</div>
              <h3 className="feature-item-title">{t('home.featureSmartGen')}</h3>
              <p className="feature-item-description">
                {t('home.featureSmartGenDesc')}
              </p>
            </div>
            
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">🖌️</div>
              <h3 className="feature-item-title">{t('home.featurePreciseEdit')}</h3>
              <p className="feature-item-description">
                {t('home.featurePreciseEditDesc')}
              </p>
            </div>
            
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">⚡</div>
              <h3 className="feature-item-title">{t('home.featureFastProcess')}</h3>
              <p className="feature-item-description">
                {t('home.featureFastProcessDesc')}
              </p>
            </div>
            
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">💾</div>
              <h3 className="feature-item-title">{t('home.featureMultiFormat')}</h3>
              <p className="feature-item-description">
                {t('home.featureMultiFormatDesc')}
              </p>
            </div>
            
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">👥</div>
              <h3 className="feature-item-title">{t('home.featureConsistency')}</h3>
              <p className="feature-item-description">
                {t('home.featureConsistencyDesc')}
              </p>
            </div>
            
            <div className="feature-item hover-scale">
              <div className="feature-item-icon">🔧</div>
              <h3 className="feature-item-title">{t('home.featureBatch')}</h3>
              <p className="feature-item-description">
                {t('home.featureBatchDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 为什么选择Nano Banana 2 */}
      <section className="why-choose">
        <div className="container">
          <h2 className="section-title">{t('home.whyChooseTitle')}</h2>
          <p className="section-description">
            {t('home.whyChooseDescription')}
          </p>
          
          <div className="why-choose-grid">
            <div className="why-choose-item">
              <div className="why-choose-icon">🚀</div>
              <h3 className="why-choose-title">{t('home.whyChoose1')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose1Desc')}
              </p>
            </div>
            
            <div className="why-choose-item">
              <div className="why-choose-icon">🎯</div>
              <h3 className="why-choose-title">{t('home.whyChoose2')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose2Desc')}
              </p>
            </div>
            
            <div className="why-choose-item">
              <div className="why-choose-icon">⚡</div>
              <h3 className="why-choose-title">{t('home.whyChoose3')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose3Desc')}
              </p>
            </div>
            
            <div className="why-choose-item">
              <div className="why-choose-icon">🔒</div>
              <h3 className="why-choose-title">{t('home.whyChoose4')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose4Desc')}
              </p>
            </div>
            
            <div className="why-choose-item">
              <div className="why-choose-icon">💡</div>
              <h3 className="why-choose-title">{t('home.whyChoose5')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose5Desc')}
              </p>
            </div>
            
            <div className="why-choose-item">
              <div className="why-choose-icon">🌟</div>
              <h3 className="why-choose-title">{t('home.whyChoose6')}</h3>
              <p className="why-choose-description">
                {t('home.whyChoose6Desc')}
              </p>
            </div>
          </div>
          
          <h2 className="section-title" style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>
            技术优势
          </h2>
          <p className="section-description" style={{ marginBottom: '2rem' }}>
            Nano Banana 2 采用最新的 AI 技术，为您提供卓越的图像编辑体验
          </p>
        </div>
      </section>

      {/* 号召行动 */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">{t('home.ctaTitle')}</h2>
              <p className="cta-description">
              {t('home.ctaDescription')}
              </p>
            <div className="cta-buttons">
              <Link to={getLocalizedPath('/editor')} className="btn btn-primary">
                {t('home.freeTrial')}
              </Link>
              <Link to={getLocalizedPath('/pricing')} className="btn btn-secondary">
                {t('home.viewPricing')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
