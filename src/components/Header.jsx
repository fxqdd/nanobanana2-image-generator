import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'
import '../styles/Header.css'
import logo from '../assets/banana.svg'

function Header() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isLoggedIn, user, logout } = useAuth()
  const { t, getLocalizedPath } = useLanguage()
  const navigate = useNavigate()

  // 处理主题切换
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)
    if (prefersDark) {
      document.body.classList.add('dark-mode')
    }
  }, [])

  // 处理滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.body.classList.toggle('dark-mode')
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to={getLocalizedPath('/')} className="logo">
            <img src={logo} alt="Nano Banana2" className="logo-icon" />
            <span className="logo-text">Nano Banana2</span>
          </Link>

          {/* 桌面导航 */}
          <nav className="nav-desktop">
            <ul className="nav-links">
              <li><Link to={getLocalizedPath('/')} className="nav-link">{t('nav.home')}</Link></li>
              <li><Link to={getLocalizedPath('/editor')} className="nav-link">{t('nav.editor')}</Link></li>
              <li><Link to={getLocalizedPath('/showcase')} className="nav-link">{t('nav.showcase')}</Link></li>
              <li><Link to={getLocalizedPath('/pricing')} className="nav-link">{t('nav.pricing')}</Link></li>
            </ul>
          </nav>

          <div className="header-actions">
            <LanguageSwitcher />
            
            <button 
              className="theme-toggle" 
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <Link to={getLocalizedPath('/editor')} className="btn btn-primary btn-small">
              {t('nav.startNow')}
            </Link>

            {isLoggedIn ? (
              // 登录状态显示用户菜单
              <div className="user-menu">
                <button className="user-menu-button">
                  {user?.avatar ? (
                    <span className="user-avatar">
                      <img src={user.avatar} alt={user.name} className="avatar-image" />
                    </span>
                  ) : (
                    <span className="user-avatar">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                  <span className="user-name">
                    {user?.name || '用户'}
                  </span>
                </button>
                <div className="user-dropdown">
                  <Link to={getLocalizedPath('/account')} className="dropdown-item">
                    {t('nav.account')}
                  </Link>
                  <Link to={getLocalizedPath('/billing')} className="dropdown-item">
                    {t('nav.billing')}
                  </Link>
                  <Link to={getLocalizedPath('/settings')} className="dropdown-item">
                    {t('nav.settings')}
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            ) : (
              // 未登录状态显示登录按钮
              <Link to={getLocalizedPath('/login')} className="btn btn-secondary btn-small">
                {t('nav.login')}
              </Link>
            )}

            {/* 移动端菜单按钮 */}
            <button 
              className="menu-toggle" 
              onClick={toggleMenu}
              aria-label="切换菜单"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div className={`mobile-menu ${isMenuOpen ? 'mobile-menu-open' : ''}`}>
        <ul className="mobile-nav-links">
          <li><Link to={getLocalizedPath('/')} className="mobile-nav-link" onClick={toggleMenu}>{t('nav.home')}</Link></li>
          <li><Link to={getLocalizedPath('/editor')} className="mobile-nav-link" onClick={toggleMenu}>{t('nav.editor')}</Link></li>
          <li><Link to={getLocalizedPath('/showcase')} className="mobile-nav-link" onClick={toggleMenu}>{t('nav.showcase')}</Link></li>
          <li><Link to={getLocalizedPath('/pricing')} className="mobile-nav-link" onClick={toggleMenu}>{t('nav.pricing')}</Link></li>
          <li><Link to={getLocalizedPath('/login')} className="mobile-nav-link" onClick={toggleMenu}>{t('nav.login')}</Link></li>
        </ul>
      </div>
    </header>
  )
}

export default Header