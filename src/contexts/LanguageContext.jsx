import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import zh from '../locales/zh'
import en from '../locales/en'
import ja from '../locales/ja'
import fr from '../locales/fr'
import de from '../locales/de'
import ru from '../locales/ru'

const translations = {
  zh,
  en,
  ja,
  fr,
  de,
  ru
}

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('zh')
  const location = useLocation()
  const navigate = useNavigate()

  // 从URL路径中提取语言代码
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const langCode = pathParts[0]
    
    // 如果路径以语言代码开头且是支持的语言
    if (langCode && translations[langCode]) {
      setLanguage(langCode)
    } else {
      // 如果没有语言代码，默认使用中文，并重定向到 /zh
      const currentPath = location.pathname
      if (currentPath === '/' || !translations[pathParts[0]]) {
        navigate(`/zh${currentPath === '/' ? '' : currentPath}`, { replace: true })
      }
    }
  }, [location.pathname, navigate])

  const changeLanguage = (newLang) => {
    if (!translations[newLang]) return
    
    setLanguage(newLang)
    
    // 更新URL路径
    const pathParts = location.pathname.split('/').filter(Boolean)
    const currentLang = pathParts[0]
    const isCurrentLangSupported = translations[currentLang]
    
    let newPath = ''
    if (isCurrentLangSupported) {
      // 如果当前路径有语言代码，替换它
      newPath = `/${newLang}/${pathParts.slice(1).join('/')}`
    } else {
      // 如果当前路径没有语言代码，添加它
      newPath = `/${newLang}${location.pathname === '/' ? '' : location.pathname}`
    }
    
    // 确保路径不以 / 结尾（除非是根路径）
    if (newPath === `/${newLang}/`) {
      newPath = `/${newLang}`
    }
    
    navigate(newPath)
    
    // 保存语言偏好到localStorage
    localStorage.setItem('preferredLanguage', newLang)
  }

  // 从localStorage加载语言偏好（仅在首次加载时）
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const currentLang = pathParts[0]
    
    // 如果URL中没有语言代码，检查localStorage
    if (!translations[currentLang]) {
      const savedLang = localStorage.getItem('preferredLanguage')
      if (savedLang && translations[savedLang]) {
        const currentPath = location.pathname
        navigate(`/${savedLang}${currentPath === '/' ? '' : currentPath}`, { replace: true })
      } else if (location.pathname === '/') {
        // 如果访问根路径且没有保存的语言偏好，默认重定向到中文
        navigate('/zh', { replace: true })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // 如果找不到翻译，返回key
      }
    }
    
    return value || key
  }

  const getCurrentPath = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const currentLang = pathParts[0]
    if (translations[currentLang]) {
      return '/' + pathParts.slice(1).join('/')
    }
    return location.pathname
  }

  const getLocalizedPath = (path) => {
    if (path.startsWith('/')) {
      return `/${language}${path}`
    }
    return `/${language}/${path}`
  }

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      t,
      getCurrentPath,
      getLocalizedPath,
      supportedLanguages: Object.keys(translations)
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

