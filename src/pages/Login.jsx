import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import supabase, { setAuthStorageMode, getAuthStorageMode } from '../lib/supabaseClient';
import { sendVerificationEmail, registerUser } from '../utils/emailAPI';
import { DEFAULT_FREE_PLAN, DEFAULT_FREE_CREDITS } from '../constants/subscription';
import '../styles/Login.css';

const PENDING_EMAIL_KEY = 'nb-pending-email';
const PENDING_USERNAME_KEY = 'nb-pending-username';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginForm, setIsLoginForm] = useState(true); // 登录/注册切换
  const [showPassword, setShowPassword] = useState(false); // 密码可见性
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // 确认密码可见性
  const [rememberMe, setRememberMe] = useState(() => getAuthStorageMode() !== 'session'); // 记住我
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [resendStatusType, setResendStatusType] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [resetStatusType, setResetStatusType] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // 注册表单额外字段
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 已移除测试账号
  
  const navigate = useNavigate();
  const { socialLogin } = useAuth();
  const { t, getLocalizedPath, language } = useLanguage();
  const seoData = t('seo.login') || { title: t('login.title'), description: '', keywords: '' };
  
  // 组件加载时检查URL是否有OAuth回调（包括Google和邮箱确认）
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (typeof window === 'undefined') return;
      
      // 检查是否是 OAuth 回调（包含 access_token）
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const hashType = params.get('type');
        if (hashType === 'recovery') {
          const origin = window.location.origin;
          const recoveryPath = `${origin}${getLocalizedPath('/reset-password')}${hash}`;
          window.location.replace(recoveryPath);
          return;
        }
      }
      
      // 处理 Supabase OAuth 回调（包括 Google 登录和邮箱确认）
      if (hash && (hash.includes('access_token') || hash.includes('type=email'))) {
        try {
          setIsLoading(true);
          
          // Supabase 会自动处理 URL hash 中的 token 并设置 session
          // 我们只需要获取当前的 session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('OAuth callback error:', error);
            setError(error.message || t('login.loginFailed'));
            setIsLoading(false);
            return;
          }

          if (session?.user) {
            console.log('✓ OAuth login successful:', {
              userId: session.user.id,
              email: session.user.email,
              provider: session.user.app_metadata?.provider
            });
          
            // 清除 URL 中的 hash
            window.location.hash = '';
            
            // 如果是新用户，可能需要创建或更新 profile
            try {
              // 检查 profile 是否存在
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();
              
              if (profileError && profileError.code === 'PGRST116') {
                // Profile 不存在，创建新的
                const username = session.user.user_metadata?.full_name || 
                                session.user.user_metadata?.name ||
                                session.user.email?.split('@')[0] || 
                                'User';
                
                const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                    user_id: session.user.id,
                    username: username,
                    email: session.user.email,
                    plan: DEFAULT_FREE_PLAN,
                    credits_remaining: DEFAULT_FREE_CREDITS
                  });
                
                if (insertError) {
                  console.warn('Failed to create profile after OAuth login:', insertError);
                } else {
                  console.log('✓ Profile created for OAuth user');
                }
              } else if (profile) {
                // Profile 已存在，可能需要更新邮箱（如果不同）
                if (profile.email !== session.user.email) {
                  await supabase
                    .from('profiles')
                    .update({ email: session.user.email })
                    .eq('user_id', session.user.id);
                }
              }
            } catch (profileErr) {
              console.warn('Error checking/creating profile:', profileErr);
            }
            
            // 处理邮箱确认时的用户名更新
            const storedUsername = window.localStorage.getItem(PENDING_USERNAME_KEY);
            if (storedUsername && session.user.id) {
              try {
                await supabase.from('profiles').update({ username: storedUsername }).eq('user_id', session.user.id);
                window.localStorage.removeItem(PENDING_USERNAME_KEY);
              } catch (updateError) {
                console.warn('Failed to update profile username after email confirmation', updateError);
              }
            }
            
            // 清除待处理的邮箱信息
            window.localStorage.removeItem(PENDING_EMAIL_KEY);
            setAwaitingEmailConfirmation(false);
            setVerificationEmail('');
            
            // 返回登录页，让用户自行登录
            setIsLoading(false);
            navigate(getLocalizedPath('/'));
            return;
          } else {
            // 没有 session，可能是 token 还未处理完成，等待一下再试
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                window.location.hash = '';
                setIsLoading(false);
                navigate(getLocalizedPath('/'));
              } else {
                setError(t('login.loginFailed') || '登录失败，请重试');
                setIsLoading(false);
              }
            }, 1000);
            return;
          }
        } catch (err) {
          console.error('Failed to handle OAuth callback:', err);
          setError(err.message || t('common.error'));
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    handleOAuthCallback();
  }, [navigate, t, getLocalizedPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pendingEmail = window.localStorage.getItem(PENDING_EMAIL_KEY);
    if (pendingEmail) {
      setAwaitingEmailConfirmation(true);
      setVerificationEmail(pendingEmail);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // 表单验证
    if (isLoginForm) {
      if (!email || !password) {
        setError(t('login.fillAllFields'));
        return;
      }
      
      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('login.invalidEmail'));
        return;
      }
      
      // 密码强度验证
      if (password.length < 6) {
        setError(t('login.passwordTooShort'));
        return;
      }
    } else {
      if (!username || !email || !password || !confirmPassword) {
        setError(t('login.fillAllFields'));
        return;
      }
      
      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('login.invalidEmail'));
        return;
      }
      
      if (password !== confirmPassword) {
        setError(t('login.passwordsNotMatch'));
        return;
      }
      
      // 密码强度验证
      if (password.length < 6) {
        setError(t('login.passwordTooShort'));
        return;
      }
      
      // 用户名验证
      if (username.length < 3) {
        setError(t('login.usernameTooShort') || 'Username must be at least 3 characters');
        return;
      }
    }

    try {
      console.log('[Login] handleSubmit start, isLoginForm=', isLoginForm);
      setIsLoading(true);
      
      if (isLoginForm) {
        // 在登录之前设置存储模式，但保留已有的 session（如果有）
        // 这样 Supabase 客户端会在正确的存储中创建新的 session
        const targetMode = rememberMe ? 'local' : 'session';
        const currentMode = getAuthStorageMode();
        
        if (currentMode !== targetMode) {
          console.log('[Login] Setting storage mode to:', targetMode, '(before login)');
          console.log('[Login] Current storage mode:', currentMode);
          // 在登录前切换存储，但保留已有 session（如果有）
          // 这样如果切换后没有 session，Supabase 会在新存储中创建
          setAuthStorageMode(targetMode, true);
          
          // 等待存储切换完成，并验证切换是否成功
          await new Promise(resolve => setTimeout(resolve, 100));
          const verifyMode = getAuthStorageMode();
          console.log('[Login] Storage mode after switch:', verifyMode);
          if (verifyMode !== targetMode) {
            console.warn('[Login] Storage mode switch may have failed!');
          }
        }
        
        console.log('[Login] Calling signInWithPassword...');
        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          console.log('[Login] signInWithPassword result:', { 
            hasSession: !!data?.session, 
            error: signInError,
            sessionUser: data?.session?.user?.email 
          });
          
          if (signInError) {
            console.error('[Login] Sign in error:', signInError);
            setError(signInError.message || t('login.loginFailed'));
            setIsLoading(false);
            return;
          }
          
          if (!data?.session) {
            console.error('[Login] No session returned from signInWithPassword');
            setError(t('login.loginFailed') || '登录失败，请重试');
            setIsLoading(false);
            return;
          }
          
          // 登录成功后，确保 session 在正确的存储中
          // 如果存储模式在登录前已经切换，Supabase 应该已经在正确的存储中创建了 session
          console.log('[Login] Login successful, session created in', targetMode, 'storage');
          
          // 提前取消 Loading，再导航，避免按钮长时间停在 Loading
          setIsLoading(false);
          const targetPath = getLocalizedPath('/account');
          console.log('[Login] navigating to account after email login:', targetPath);
          navigate(targetPath);
          return;
        } catch (signInErr) {
          console.error('[Login] signInWithPassword exception:', signInErr);
          setError(signInErr.message || t('login.loginFailed') || '登录失败，请重试');
          setIsLoading(false);
          return;
        }
      }

      // 构建重定向 URL - 使用简单的 /login 路径，避免语言路径问题
      const redirectUrl = `${window.location.origin}/login`;
      console.log('Attempting register via service endpoint:', {
        email,
        username,
        hasSiteUrl: !!import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
      });

      const registerResult = await registerUser({
        email,
        password,
        username,
        locale: language
      });

      console.log('✅ 用户创建成功，等待邮箱验证:', registerResult);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PENDING_EMAIL_KEY, email);
        window.localStorage.setItem(PENDING_USERNAME_KEY, username);
      }

      setVerificationEmail(email);
      setAwaitingEmailConfirmation(true);
      setResendStatus('');
      setError('');
      setIsResending(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('❌ 注册过程发生异常 - Auth error:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        error: err
      });
      console.error('🔍 异常详情:', {
        email,
        username,
        isLoginForm,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      });
      setError(err.message || t('common.error') || '发生错误，请稍后重试');
    } finally {
      // 对于登录分支，我们在成功时已经手动 setIsLoading(false)
      // 这里主要处理错误场景
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
    setError('');
    // 重置表单
    setEmail('');
    setPassword('');
    setUsername('');
    setConfirmPassword('');
    setAwaitingEmailConfirmation(false);
    setVerificationEmail('');
    setResendStatus('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PENDING_EMAIL_KEY);
      window.localStorage.removeItem(PENDING_USERNAME_KEY);
    }
  };

  const handleForgotPassword = () => {
    setShowResetPassword(true);
    setResetEmail(email || '');
    setResetStatus('');
    setResetStatusType('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetStatus(t('login.invalidEmail') || '请输入有效的邮箱地址');
      setResetStatusType('error');
      return;
    }

    try {
      setIsResetting(true);
      setResetStatus('');
      setResetStatusType('');

      await sendVerificationEmail(resetEmail, {
        type: 'recovery',
        locale: language
      });

      setResetStatus(t('login.resetPasswordSuccess') || '密码重置邮件已发送，请查收邮箱。');
      setResetStatusType('success');
    } catch (resetErr) {
      console.error('❌ Password reset email send error:', resetErr);
      setResetStatus(
        resetErr.message ||
          t('login.resetPasswordError') ||
          '密码重置邮件发送失败，请稍后重试。'
      );
      setResetStatusType('error');
    } finally {
      setIsResetting(false);
    }
  };

  const closeResetPanel = () => {
    setShowResetPassword(false);
    setResetEmail('');
    setResetStatus('');
    setResetStatusType('');
  };

  // 社交媒体登录处理函数
  const handleSocialLogin = async (provider) => {
    try {
      setIsLoading(true);
      
      if (provider === 'Google') {
        // 使用 Supabase 的内置 Google OAuth
        const redirectUrl = `${window.location.origin}${getLocalizedPath('/login')}`;
        
        console.log('Initiating Google OAuth with Supabase...');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        
        if (error) {
          console.error('Google OAuth initiation error:', error);
          setError(error.message || t('login.googleLoginFailed'));
          setIsLoading(false);
          return;
        }
        
        // Supabase 会自动处理重定向，这里不需要手动跳转
        // 如果返回了 URL，说明需要重定向
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        // 其他社交登录保持模拟流程（如果需要）
        console.log(`正在重定向到${provider}授权页面...`);
        
        // 模拟授权码获取和用户信息请求
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟从社交媒体API获取的用户信息
        const socialUserInfo = {
          id: `${provider.toLowerCase()}-${Date.now()}`,
          name: `${provider} 用户_${Math.floor(Math.random() * 1000)}`,
          email: `${provider.toLowerCase()}_${Math.floor(Math.random() * 10000)}@example.com`,
          avatar: `https://via.placeholder.com/150?text=${provider.charAt(0)}`
        };
        
        console.log(`从${provider}获取到用户信息:`, socialUserInfo);
        
        // 调用社交媒体登录函数
        const result = await socialLogin(provider, socialUserInfo);
        
        if (result.success) {
          // 可以根据是否是新用户显示不同的欢迎信息
          if (result.isNewUser) {
            console.log(`欢迎新用户通过${provider}登录！`);
          }
          navigate('/');
        } else {
          setError(result.error || `${provider}登录失败，请稍后重试`);
        }
        setIsLoading(false);
      }
    } catch (error) {
      setError(`${provider}登录失败，请稍后重试`);
      console.error(`${provider}登录错误:`, error);
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!verificationEmail) return;
    try {
      setIsResending(true);
      setResendStatus('');
      setResendStatusType('');
      
      console.log('📧 Resending verification email via Resend to:', verificationEmail);

      await sendVerificationEmail(verificationEmail, {
        type: 'signup',
        locale: language
      });

      setResendStatus(t('login.verificationResendSuccess') || '已重新发送，请查收邮箱');
      setResendStatusType('success');
    } catch (err) {
      console.error('❌ 重新发送邮件时发生异常 - Resend verification email exception:', err);
      setResendStatus(
        err.message ||
          t('login.verificationResendError') ||
          '重新发送失败，请检查网络连接和邮箱地址'
      );
      setResendStatusType('error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="login-page">
      <SEO
        title={seoData.title}
        description={seoData.description || t('login.subtitle')}
        keywords={seoData.keywords || 'login, register, Nano Banana 2'}
        path={getLocalizedPath('/login')}
      />
      
      <div className="login-container">
        {showResetPassword && (
          <div
            className="reset-password-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <div
              className="reset-password-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '28px 32px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 18px 48px rgba(0,0,0,0.18)',
                position: 'relative'
              }}
            >
              <button
                onClick={closeResetPanel}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
                aria-label={t('common.close') || '关闭'}
              >
                ×
              </button>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>
                {t('login.resetPasswordTitle') || '重置密码'}
              </h3>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('login.resetPasswordDescription') ||
                  '输入注册邮箱，我们将发送密码重置链接。'}
              </p>
              <form onSubmit={handleResetPassword}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="reset-email">{t('login.email')}</label>
                  <input
                    type="email"
                    id="reset-email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={t('login.email')}
                    required
                  />
                </div>
                {resetStatus && (
                  <div
                    style={{
                      background:
                        resetStatusType === 'success'
                          ? 'rgba(76, 175, 80, 0.12)'
                          : 'rgba(244, 67, 54, 0.12)',
                      color: resetStatusType === 'success' ? '#256029' : '#b71c1c',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      lineHeight: 1.5
                    }}
                  >
                    {resetStatus}
                  </div>
                )}
                <button
                  type="submit"
                  className="login-button"
                  style={{ width: '100%' }}
                  disabled={isResetting}
                >
                  {isResetting
                    ? t('common.loading') || '发送中...'
                    : t('login.resetPasswordAction') || '发送重置邮件'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="login-header">
          <h2>{isLoginForm ? t('login.title') : t('login.registerTitle')}</h2>
          <p className="login-subtitle">
            {isLoginForm 
              ? t('login.subtitle') 
              : t('login.registerSubtitle')}
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          {!isLoginForm && (
            <div className="form-group">
              <label htmlFor="username">{t('login.username')}</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.username')}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.email')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
                required
              />
              <button
                type="button"
                className="toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('common.hide') : t('common.show')}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            <small className="password-hint">{t('login.passwordTooShort')}</small>
          </div>

          {!isLoginForm && (
            <div className="form-group">
            <label htmlFor="confirm-password">{t('login.confirmPassword')}</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('login.confirmPassword')}
                required
              />
              <button
                type="button"
                className="toggle-password-visibility"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? t('common.hide') : t('common.show')}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>
          )}

          {isLoginForm && (
            <div className="password-options">
              <div className="remember-me">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
                <label htmlFor="remember">{t('login.rememberMe')}</label>
          </div>
              <button 
                type="button" 
                className="forgot-password"
                onClick={handleForgotPassword}
              >
                {t('login.forgotPassword')}
              </button>
            </div>
          )}

          {!isLoginForm && awaitingEmailConfirmation && (
            <div className="verification-box">
              <h4>{t('login.verificationTitle') || '完成邮箱验证'}</h4>
              <p>
                {t('login.verificationLinkDesc') || '验证邮件已发送，请点击邮件中的确认链接完成注册。如未收到，请检查垃圾邮件文件夹。'}
                <br />
                <strong>{verificationEmail}</strong>
              </p>
              <div className="verification-actions">
                <button
                  type="button"
                  className="verification-button secondary"
                  onClick={handleResendEmail}
                  disabled={isResending}
                >
                  {isResending ? t('common.loading') : (t('login.verificationResend') || '重新发送邮件')}
                </button>
                {resendStatus && (
                  <span className={`verification-status ${resendStatusType}`}>
                    {resendStatus}
                  </span>
                )}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                {t('common.loading')}
              </>
            ) : (
              isLoginForm ? t('login.login') : t('login.register')
            )}

          </button>

          <div className="form-toggle">
            <span>
              {isLoginForm 
                ? t('login.noAccount') + ' ' 
                : t('login.alreadyHaveAccount') + ' '}
              <button 
                type="button" 
                className="toggle-link"
                onClick={toggleForm}
              >
                {isLoginForm ? t('login.register') : t('login.login')}
              </button>
            </span>
          </div>
        </form>

        <div className="login-divider">
          <span>{t('login.orLoginWith') || '或使用以下方式登录'}</span>
        </div>

        <div className="social-login">
          <button className="social-button google" onClick={() => handleSocialLogin('Google')} disabled={isLoading}>
            <span className="social-icon">G</span>
            {t('login.loginWithGoogle')}
          </button>
        </div>

        <div className="login-footer">
          <p>{t('login.agreeTerms') || '登录或注册即表示您同意我们的'}
            <Link to={getLocalizedPath('/terms')}>{t('footer.terms')}</Link>
            {t('login.and') || '和'}
            <Link to={getLocalizedPath('/privacy')}>{t('footer.privacy')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;