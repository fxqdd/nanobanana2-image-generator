import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Showcase.css'

function Showcase() {
  const { t, getLocalizedPath } = useLanguage()
  const seoData = t('seo.showcase')
  
  // 跟踪每个卡片当前显示的图片索引（0 或 1）
  const [currentImageIndex, setCurrentImageIndex] = useState({})

  const showcaseItems = [
    {
      id: 1,
      title: t('showcase.case1Title'),
      description: t('showcase.case1Desc'),
      images: [
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=600&fit=crop', // 红发女性肖像
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop' // 中世纪盔甲女性
      ],
      prompt: t('showcase.case1Prompt')
    },
    {
      id: 2,
      title: t('showcase.case2Title'),
      description: t('showcase.case2Desc'),
      images: [
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop', // 咖啡店场景
        'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800&h=600&fit=crop' // 花园场景
      ],
      prompt: t('showcase.case2Prompt')
    },
    {
      id: 3,
      title: t('showcase.case3Title'),
      description: t('showcase.case3Desc'),
      images: [
        'https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&h=600&fit=crop', // 雪地海滩场景
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop' // 夏日海滩场景
      ],
      prompt: t('showcase.case3Prompt')
    },
    {
      id: 4,
      title: t('showcase.case4Title'),
      description: t('showcase.case4Desc'),
      images: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // 日落女性肖像
        'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop' // 油画风格日落
      ],
      prompt: t('showcase.case4Prompt')
    },
    {
      id: 5,
      title: t('showcase.case5Title'),
      description: t('showcase.case5Desc'),
      images: [
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop', // 城市日景街道（请替换为实际图片URL）
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&h=600&fit=crop' // 城市夜景街道，有"BLUE ALICE"霓虹灯（请替换为实际图片URL）
      ],
      prompt: t('showcase.case5Prompt')
    },
    {
      id: 6,
      title: t('showcase.case6Title'),
      description: t('showcase.case6Desc'),
      images: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop', // 普通客厅阅读场景（请替换为实际图片URL）
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop' // 魔法森林阅读场景（请替换为实际图片URL）
      ],
      prompt: t('showcase.case6Prompt')
    }
  ]

  const [transitioningItems, setTransitioningItems] = useState(new Set())

  const handleImageClick = (itemId) => {
    // 如果正在过渡中，忽略点击
    if (transitioningItems.has(itemId)) {
      return
    }

    setCurrentImageIndex(prev => {
      const currentIndex = prev[itemId] || 0
      const nextIndex = currentIndex === 0 ? 1 : 0
      
      // 标记为正在过渡
      setTransitioningItems(prevSet => new Set(prevSet).add(itemId))
      
      // 1秒后完成过渡，更新图片并清除过渡状态
      setTimeout(() => {
        setCurrentImageIndex(prevState => ({
          ...prevState,
          [itemId]: nextIndex
        }))
        setTransitioningItems(prevSet => {
          const newSet = new Set(prevSet)
          newSet.delete(itemId)
          return newSet
        })
      }, 1000) // 与CSS动画时间一致
      
      // 返回当前索引以触发动画
      return prev
    })
  }

  const getCurrentImage = (item) => {
    const index = currentImageIndex[item.id] || 0
    return item.images[index]
  }

  const isTransitioning = (itemId) => {
    return transitioningItems.has(itemId)
  }

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
          {showcaseItems.map((item) => {
            const currentIndex = currentImageIndex[item.id] || 0
            const nextIndex = currentIndex === 0 ? 1 : 0
            const transitioning = isTransitioning(item.id)
            
            return (
              <div key={item.id} className="showcase-card">
                <div 
                  className="showcase-image-container"
                  onClick={() => handleImageClick(item.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* 底层图片（显示当前图片） */}
                  <img 
                    src={item.images[currentIndex]} 
                    alt={item.title}
                    className="showcase-image showcase-image-base"
                    key={`base-${item.id}-${currentIndex}`}
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/400x300/CCCCCC/666666?text=${encodeURIComponent(t('showcase.imageLoadError'))}`
                    }}
                  />
                  {/* 顶层图片（用于渐变效果，显示下一张图片） */}
                  <img 
                    src={item.images[nextIndex]} 
                    alt={item.title}
                    className={`showcase-image showcase-image-overlay ${transitioning ? 'showcase-image-transitioning' : ''}`}
                    key={`overlay-${item.id}-${nextIndex}`}
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
            )
          })}
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

