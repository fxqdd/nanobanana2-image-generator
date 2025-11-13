import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SEO from '../components/SEO'
import { useLanguage } from '../contexts/LanguageContext'

const ResetPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, getLocalizedPath } = useLanguage()

  const [isVerifying, setIsVerifying] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [statusType, setStatusType] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 使用 ref 防止重复验证
  const hasVerifiedRef = useRef(false)
  const isVerifyingRef = useRef(false)

  useEffect(() => {
    // 如果已经验证过或正在验证，直接返回
    if (hasVerifiedRef.current || isVerifyingRef.current) {
      return
    }
    
    // 如果已经可以重置密码，说明验证成功，不需要再次验证
    if (canReset) {
      return
    }
    
    const hash = location.hash || (typeof window !== 'undefined' ? window.location.hash : '')
    const search = location.search || (typeof window !== 'undefined' ? window.location.search : '')

    const params = new URLSearchParams()
    const appendParams = (source) => {
      if (!source) return
      const normalized = source.replace(/^([#?])/, '')
      if (!normalized) return
      const entries = new URLSearchParams(normalized)
      entries.forEach((value, key) => {
        if (!params.has(key)) {
          params.set(key, value)
        }
      })
    }

    appendParams(search)
    appendParams(hash)

    const hasParams = !params.keys().next().done

    if (import.meta.env.DEV) {
      console.info('[ResetPassword] location snapshot', {
        href: typeof window !== 'undefined' ? window.location.href : '',
        search,
        hash,
        params: hasParams ? Object.fromEntries(params.entries()) : null
      })
    }

    const verifyRecoveryLink = async () => {
      // 标记正在验证，防止重复执行
      isVerifyingRef.current = true
      setIsVerifying(true)
      
      let timeoutCleared = false
      // 设置总超时，避免无限等待
      const timeoutId = setTimeout(() => {
        if (!timeoutCleared) {
          console.error('⚠️ Recovery link verification timeout')
          setStatusType('error')
          setStatusMessage(t('resetPassword.invalidLink'))
          setIsVerifying(false)
          isVerifyingRef.current = false
        }
      }, 10000)

      try {
        if (!hasParams) {
          timeoutCleared = true
          clearTimeout(timeoutId)
          hasVerifiedRef.current = true
          isVerifyingRef.current = false
          setStatusType('error')
          setStatusMessage(t('resetPassword.invalidLink'))
          setIsVerifying(false)
          return
        }

        const type = params.get('type')
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const code = params.get('code')
        const tokenHash = params.get('token_hash')
        const email = params.get('email')

        if (type !== 'recovery') {
          timeoutCleared = true
          clearTimeout(timeoutId)
          hasVerifiedRef.current = true
          isVerifyingRef.current = false
          setStatusType('error')
          setStatusMessage(t('resetPassword.invalidLink'))
          setIsVerifying(false)
          return
        }

        let sessionError = null
        let sessionPromise = null

        if (accessToken && refreshToken) {
          sessionPromise = supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
        } else if (code) {
          sessionPromise = supabase.auth.exchangeCodeForSession(code)
        } else if (tokenHash && email) {
          sessionPromise = supabase.auth.verifyOtp({
            type: 'recovery',
            token: tokenHash,
            email
          })
        } else {
          sessionError = new Error('Missing tokens for password recovery')
        }

        if (sessionPromise) {
          // 添加超时保护
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session verification timeout')), 8000)
          )

          const result = await Promise.race([sessionPromise, timeoutPromise]).catch((err) => {
            console.error('Session verification failed or timed out:', err)
            return { error: err }
          })

          sessionError = result?.error || null
        }

        if (sessionError) {
          timeoutCleared = true
          clearTimeout(timeoutId)
          hasVerifiedRef.current = true
          isVerifyingRef.current = false
          console.error('Failed to establish session from recovery link:', sessionError)
          setStatusType('error')
          setStatusMessage(t('resetPassword.invalidLink'))
          setIsVerifying(false)
          return
        }

        // 验证成功
        hasVerifiedRef.current = true
        isVerifyingRef.current = false
        setCanReset(true)
        setStatusType('')
        setStatusMessage('')

        // 清理 URL，但保留必要的 hash 以避免重复触发
        if (typeof window !== 'undefined') {
          // 只保留 type=recovery，移除所有 token
          const cleanUrl = `${window.location.pathname}#type=recovery`
          window.history.replaceState({}, document.title, cleanUrl)
        }
      } catch (err) {
        timeoutCleared = true
        clearTimeout(timeoutId)
        hasVerifiedRef.current = true
        isVerifyingRef.current = false
        console.error('Unexpected error while verifying recovery link:', err)
        setStatusType('error')
        setStatusMessage(t('resetPassword.invalidLink'))
      } finally {
        if (!timeoutCleared) {
          clearTimeout(timeoutId)
        }
        setIsVerifying(false)
      }
    }

    verifyRecoveryLink()
    
    // 清理函数
    return () => {
      isVerifyingRef.current = false
    }
  }, []) // 只在组件挂载时执行一次

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!password || !confirmPassword) {
      setStatusType('error')
      setStatusMessage(t('login.fillAllFields'))
      return
    }

    if (password.length < 6) {
      setStatusType('error')
      setStatusMessage(t('login.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setStatusType('error')
      setStatusMessage(t('login.passwordsNotMatch'))
      return
    }

    try {
      setIsSubmitting(true)
      setStatusType('')
      setStatusMessage('')

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        console.error('Failed to update password:', error)
        setStatusType('error')
        setStatusMessage(error.message || t('resetPassword.submitError'))
        return
      }

      setStatusType('success')
      setStatusMessage(t('resetPassword.submitSuccess'))

      if (typeof window !== 'undefined') {
        window.location.hash = ''
      }

      // 确保新密码生效后引导用户重新登录
      setTimeout(async () => {
        await supabase.auth.signOut()
        navigate(getLocalizedPath('/login'))
      }, 2000)
    } catch (err) {
      console.error('Unexpected error when submitting new password:', err)
      setStatusType('error')
      setStatusMessage(err.message || t('resetPassword.submitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="reset-password-page">
      <SEO
        title={t('resetPassword.pageTitle')}
        description={t('resetPassword.pageDescription')}
        path={getLocalizedPath('/reset-password')}
        keywords="reset password, recovery, account security"
      />

      <div className="auth-wrapper" style={{ padding: '80px 16px' }}>
        <div
          className="auth-card"
          style={{
            maxWidth: '420px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 18px 48px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}
        >
          <h1 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>
            {t('resetPassword.pageTitle')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            {t('resetPassword.pageDescription')}
          </p>

          {isVerifying && (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {t('resetPassword.verifying')}
            </p>
          )}

          {!isVerifying && !canReset && (
            <div
              style={{
                background: 'rgba(244, 67, 54, 0.12)',
                color: '#b71c1c',
                padding: '12px 16px',
                borderRadius: '8px',
                lineHeight: 1.6
              }}
            >
              {statusMessage || t('resetPassword.invalidLink')}
            </div>
          )}

          {!isVerifying && canReset && (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="new-password">{t('resetPassword.newPassword')}</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('resetPassword.newPassword')}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="confirm-password">{t('resetPassword.confirmPassword')}</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t('resetPassword.confirmPassword')}
                  required
                />
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
                {t('resetPassword.requirements')}
              </p>

              {statusMessage && (
                <div
                  style={{
                    background:
                      statusType === 'success'
                        ? 'rgba(76, 175, 80, 0.12)'
                        : 'rgba(244, 67, 54, 0.12)',
                    color: statusType === 'success' ? '#256029' : '#b71c1c',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    lineHeight: 1.6
                  }}
                >
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                style={{ width: '100%' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.loading') : t('resetPassword.submit')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

