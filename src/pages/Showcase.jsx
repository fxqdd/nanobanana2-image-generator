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
        '/images/showcase/showcase-1-image1.jpg', // 红发女性肖像
        '/images/showcase/showcase-1-image2.jpg' // 中世纪盔甲女性
      ],
      prompt: t('showcase.case1Prompt')
    },
    {
      id: 2,
      title: t('showcase.case2Title'),
      description: t('showcase.case2Desc'),
      images: [
        '/images/showcase/showcase-2-image1.jpg', // 咖啡店场景
        '/images/showcase/showcase-2-image2.jpg' // 花园场景
      ],
      prompt: t('showcase.case2Prompt')
    },
    {
      id: 3,
      title: t('showcase.case3Title'),
      description: t('showcase.case3Desc'),
      images: [
        '/images/showcase/showcase-3-image1.jpg', // 雪地海滩场景
        '/images/showcase/showcase-3-image2.jpg' // 夏日海滩场景
      ],
      prompt: t('showcase.case3Prompt')
    },
    {
      id: 4,
      title: t('showcase.case4Title'),
      description: t('showcase.case4Desc'),
      images: [
        '/images/showcase/showcase-4-image1.jpg', // 日落女性肖像
        '/images/showcase/showcase-4-image2.jpg' // 油画风格日落
      ],
      prompt: t('showcase.case4Prompt')
    },
    {
      id: 5,
      title: t('showcase.case5Title'),
      description: t('showcase.case5Desc'),
      images: [
        '/images/showcase/showcase-5-image1.jpg', // 城市日景街道
        '/images/showcase/showcase-5-image2.jpg' // 城市夜景街道，有"BLUE ALICE"霓虹灯
      ],
      prompt: t('showcase.case5Prompt')
    },
    {
      id: 6,
      title: t('showcase.case6Title'),
      description: t('showcase.case6Desc'),
      images: [
        '/images/showcase/showcase-6-image1.jpg', // 普通客厅阅读场景
        '/images/showcase/showcase-6-image2.jpg' // 魔法森林阅读场景
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
                      // 避免无限循环：如果已经是占位符或已经处理过，直接隐藏
                      if (e.target.dataset.errorHandled === 'true') {
                        e.target.style.display = 'none'
                        return
                      }
                      // 标记为已处理
                      e.target.dataset.errorHandled = 'true'
                      // 使用 data URI 作为占位符，避免网络请求
                      const canvas = document.createElement('canvas')
                      canvas.width = 400
                      canvas.height = 300
                      const ctx = canvas.getContext('2d')
                      ctx.fillStyle = '#CCCCCC'
                      ctx.fillRect(0, 0, 400, 300)
                      ctx.fillStyle = '#666666'
                      ctx.font = '20px Arial'
                      ctx.textAlign = 'center'
                      ctx.textBaseline = 'middle'
                      ctx.fillText(t('showcase.imageLoadError') || 'Image load failed', 200, 150)
                      e.target.src = canvas.toDataURL()
                    }}
                  />
                  {/* 顶层图片（用于渐变效果，显示下一张图片） */}
                  <img 
                    src={item.images[nextIndex]} 
                    alt={item.title}
                    className={`showcase-image showcase-image-overlay ${transitioning ? 'showcase-image-transitioning' : ''}`}
                    key={`overlay-${item.id}-${nextIndex}`}
                    onError={(e) => {
                      // 避免无限循环：如果已经是占位符或已经处理过，直接隐藏
                      if (e.target.dataset.errorHandled === 'true') {
                        e.target.style.display = 'none'
                        return
                      }
                      // 标记为已处理
                      e.target.dataset.errorHandled = 'true'
                      // 使用 data URI 作为占位符，避免网络请求
                      const canvas = document.createElement('canvas')
                      canvas.width = 400
                      canvas.height = 300
                      const ctx = canvas.getContext('2d')
                      ctx.fillStyle = '#CCCCCC'
                      ctx.fillRect(0, 0, 400, 300)
                      ctx.fillStyle = '#666666'
                      ctx.font = '20px Arial'
                      ctx.textAlign = 'center'
                      ctx.textBaseline = 'middle'
                      ctx.fillText(t('showcase.imageLoadError') || 'Image load failed', 200, 150)
                      e.target.src = canvas.toDataURL()
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

