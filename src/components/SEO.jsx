import { Helmet } from 'react-helmet-async'
import { useLanguage } from '../contexts/LanguageContext'

const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  type = 'website',
  path = ''
}) => {
  const { language, getLocalizedPath } = useLanguage()
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://nanobanana2.online'
  const currentPath = path || window.location.pathname
  const url = `${baseUrl}${currentPath}`
  const imageUrl = image || `${baseUrl}/banana.svg`

  // 根据语言设置html lang属性
  const langMap = {
    zh: 'zh-CN',
    en: 'en',
    ja: 'ja',
    fr: 'fr',
    de: 'de',
    ru: 'ru'
  }

  return (
    <Helmet>
      <html lang={langMap[language] || 'zh-CN'} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Alternate language versions */}
      <link rel="alternate" hreflang="zh-CN" href={`${baseUrl}/zh${path}`} />
      <link rel="alternate" hreflang="en" href={`${baseUrl}/en${path}`} />
      <link rel="alternate" hreflang="ja" href={`${baseUrl}/ja${path}`} />
      <link rel="alternate" hreflang="fr" href={`${baseUrl}/fr${path}`} />
      <link rel="alternate" hreflang="de" href={`${baseUrl}/de${path}`} />
      <link rel="alternate" hreflang="ru" href={`${baseUrl}/ru${path}`} />
      <link rel="alternate" hreflang="x-default" href={`${baseUrl}/zh${path}`} />
    </Helmet>
  )
}

export default SEO

