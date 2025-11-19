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
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getAuthStorageMode() !== 'session');
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
  
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const navigate = useNavigate();
  const { socialLogin, isLoggedIn } = useAuth();
  const { t, getLocalizedPath, language } = useLanguage();
  const seoData = t('seo.login') || { title: t('login.title'), description: '', keywords: '' };
  
  // 处理 OAuth 回调
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (typeof window === 'undefined') return;
      
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
      
      if (hash && (hash.includes('access_token') || hash.includes('type=email'))) {
        try {
          setIsLoading(true);
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('OAuth callback error:', error);
            setError(error.message || t('login.loginFailed'));
            setIsLoading(false);
            return;
          }

          if (session?.user) {
            window.location.hash = '';
            setIsLoading(false);
            navigate(getLocalizedPath('/account'));
            return;
          } else {
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                window.location.hash = '';
                setIsLoading(false);
                navigate(getLocalizedPath('/account'));
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
    if (typeof window !== 'undefined') {
      const pendingEmail = window.localStorage.getItem(PENDING_EMAIL_KEY);
      if (pendingEmail) {
        setAwaitingEmailConfirmation(true);
        setVerificationEmail(pendingEmail);
      }
    }
  }, []);

  // ========== 完全重写的邮箱登录函数 ==========
  const handleEmailLogin = async (email, password, rememberMe) => {
    try {
      console.log('[Login] ========== 开始登录 ==========');
      console.log('[Login] 邮箱:', email);
      console.log('[Login] 记住我:', rememberMe);
      
      // 1. 设置存储模式（在登录前）
      const targetMode = rememberMe ? 'local' : 'session';
      const currentMode = getAuthStorageMode();
      
      if (currentMode !== targetMode) {
        console.log('[Login] 切换存储模式:', currentMode, '->', targetMode);
        setAuthStorageMode(targetMode, true);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('[Login] 存储模式已设置:', getAuthStorageMode());
      
      // 2. 调用 signInWithPassword
      console.log('[Login] 调用 signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('[Login] 登录错误:', error);
        throw error;
      }
      
      if (!data?.session) {
        console.error('[Login] 登录失败：没有返回 session');
        throw new Error('登录失败：没有返回 session');
      }
      
      console.log('[Login] ✓ signInWithPassword 成功，已获取 session');
      console.log('[Login] Session 信息:', {
        email: data.session.user?.email,
        userId: data.session.user?.id,
        hasAccessToken: !!data.session.access_token,
        hasRefreshToken: !!data.session.refresh_token
      });
      
      // 3. 等待 session 保存到存储（Supabase 会自动保存，但需要一点时间）
      console.log('[Login] 等待 session 保存到存储...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. 验证 session 已保存
      console.log('[Login] 验证 session 是否已保存...');
      const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession();
      
      if (verifyError) {
        console.warn('[Login] ⚠️ 验证 session 时出错:', verifyError);
        // 即使验证出错，也继续导航（因为 signInWithPassword 已经成功了）
      } else if (!verifySession || verifySession.user?.email !== email) {
        console.warn('[Login] ⚠️ Session 验证失败，但继续导航');
        // 即使验证失败，也继续导航
      } else {
        console.log('[Login] ✓ Session 验证通过');
      }
      
      // 5. 导航到账户页面
      console.log('[Login] ========== 准备导航 ==========');
      const targetPath = getLocalizedPath('/account');
      console.log('[Login] 目标路径:', targetPath);
      
      // 使用硬导航，确保页面完全刷新
      window.location.href = targetPath;
      
    } catch (err) {
      console.error('[Login] 登录过程出错:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // 表单验证
    if (isLoginForm) {
      if (!email || !password) {
        setError(t('login.fillAllFields'));
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('login.invalidEmail'));
        return;
      }
      
      if (password.length < 6) {
        setError(t('login.passwordTooShort'));
        return;
      }
    } else {
      if (!username || !email || !password || !confirmPassword) {
        setError(t('login.fillAllFields'));
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t('login.invalidEmail'));
        return;
      }
      
      if (password !== confirmPassword) {
        setError(t('login.passwordsNotMatch'));
        return;
      }
      
      if (password.length < 6) {
        setError(t('login.passwordTooShort'));
        return;
      }
      
      if (username.length < 3) {
        setError(t('login.usernameTooShort') || 'Username must be at least 3 characters');
        return;
      }
    }

    try {
      setIsLoading(true);
      
      if (isLoginForm) {
        // 使用重写的登录函数
        await handleEmailLogin(email, password, rememberMe);
        // 如果成功，handleEmailLogin 会导航，不会执行到这里
        setIsLoading(false);
      } else {
        // 注册逻辑保持不变
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
        setIsLoading(false);
      }
    } catch (err) {
      console.error('❌ 处理过程发生异常:', err);
      setError(err.message || t('common.error') || '发生错误，请稍后重试');
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLoginForm(!isLoginForm);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSocialLogin = async (provider) => {
    try {
      setIsLoading(true);
      setError('');
      
      const redirectUrl = `${window.location.origin}${getLocalizedPath('/login')}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl
        }
      });
      
      if (error) {
        console.error('Social login error:', error);
        setError(error.message || t('login.socialLoginFailed'));
        setIsLoading(false);
        return;
      }
      
      // OAuth 会重定向，不需要手动导航
    } catch (err) {
      console.error('Social login exception:', err);
      setError(err.message || t('login.socialLoginFailed'));
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    
    setIsResending(true);
    setResendStatus('');
    setResendStatusType('');
    
    try {
      const result = await sendVerificationEmail(verificationEmail);
      if (result.success) {
        setResendStatus(t('login.verificationEmailSent') || '验证邮件已重新发送');
        setResendStatusType('success');
      } else {
        setResendStatus(result.error || t('login.resendFailed') || '重新发送失败');
        setResendStatusType('error');
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      setResendStatus(err.message || t('login.resendFailed') || '重新发送失败');
      setResendStatusType('error');
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetStatus(t('login.enterEmail') || '请输入邮箱');
      setResetStatusType('error');
      return;
    }
    
    setIsResetting(true);
    setResetStatus('');
    setResetStatusType('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}${getLocalizedPath('/reset-password')}`
      });
      
      if (error) {
        setResetStatus(error.message || t('login.resetFailed') || '重置密码失败');
        setResetStatusType('error');
      } else {
        setResetStatus(t('login.resetEmailSent') || '重置密码邮件已发送');
        setResetStatusType('success');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setResetStatus(err.message || t('login.resetFailed') || '重置密码失败');
      setResetStatusType('error');
    } finally {
      setIsResetting(false);
    }
  };

  // 如果已登录，重定向到账户页面
  useEffect(() => {
    if (isLoggedIn) {
      navigate(getLocalizedPath('/account'), { replace: true });
    }
  }, [isLoggedIn, navigate, getLocalizedPath]);

  // 其余 UI 代码保持不变...
  return (
    <>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
      />
      <div className="login-container">
        <div className="login-card">
          {awaitingEmailConfirmation ? (
            <div className="verification-message">
              <h2>{t('login.verificationTitle') || '验证您的邮箱'}</h2>
              <p>{t('login.verificationMessage') || `我们已向 ${verificationEmail} 发送了验证邮件。请点击邮件中的链接完成注册。`}</p>
              <button 
                onClick={handleResendVerification}
                disabled={isResending}
                className="btn btn-primary"
              >
                {isResending ? t('login.sending') || '发送中...' : t('login.resendEmail') || '重新发送邮件'}
              </button>
              {resendStatus && (
                <p className={resendStatusType === 'success' ? 'success-message' : 'error-message'}>
                  {resendStatus}
                </p>
              )}
              <button 
                onClick={() => {
                  setAwaitingEmailConfirmation(false);
                  setVerificationEmail('');
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(PENDING_EMAIL_KEY);
                    window.localStorage.removeItem(PENDING_USERNAME_KEY);
                  }
                }}
                className="btn btn-secondary"
              >
                {t('login.backToLogin') || '返回登录'}
              </button>
            </div>
          ) : showResetPassword ? (
            <div className="reset-password-form">
              <h2>{t('login.resetPassword') || '重置密码'}</h2>
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="reset-email">{t('login.email') || '邮箱'}</label>
                  <input
                    type="email"
                    id="reset-email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder') || '请输入您的邮箱'}
                    required
                  />
                </div>
                {resetStatus && (
                  <p className={resetStatusType === 'success' ? 'success-message' : 'error-message'}>
                    {resetStatus}
                  </p>
                )}
                <button type="submit" disabled={isResetting} className="btn btn-primary">
                  {isResetting ? t('login.sending') || '发送中...' : t('login.sendResetEmail') || '发送重置邮件'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="btn btn-secondary"
                >
                  {t('login.backToLogin') || '返回登录'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <h1>{t('login.title') || 'Login'}</h1>
              <p className="login-subtitle">{t('login.subtitle') || 'Welcome back'}</p>
              
              {error && <div className="error-message">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                {!isLoginForm && (
                  <div className="form-group">
                    <label htmlFor="username">{t('login.username') || 'Username'}</label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('login.usernamePlaceholder') || 'Username'}
                      required
                      minLength={3}
                    />
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="email">{t('login.email') || 'Email'}</label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder') || 'Email'}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">{t('login.password') || 'Password'}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.passwordPlaceholder') || 'Password'}
                      required
                      minLength={6}
                      autoComplete={isLoginForm ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('login.hidePassword') || 'Hide password' : t('login.showPassword') || 'Show password'}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <p className="password-hint">{t('login.passwordHint') || 'Password must be at least 6 characters'}</p>
                </div>
                
                {!isLoginForm && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">{t('login.confirmPassword') || 'Confirm Password'}</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('login.confirmPasswordPlaceholder') || 'Confirm Password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? t('login.hidePassword') || 'Hide password' : t('login.showPassword') || 'Show password'}
                      >
                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                )}
                
                {isLoginForm && (
                  <div className="form-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>{t('login.rememberMe') || 'Remember me'}</span>
                    </label>
                    <Link to="#" onClick={(e) => { e.preventDefault(); setShowResetPassword(true); }} className="forgot-password">
                      {t('login.forgotPassword') || 'Forgot password?'}
                    </Link>
                  </div>
                )}
                
                <button type="submit" disabled={isLoading} className="btn btn-primary btn-large">
                  {isLoading ? (t('login.loading') || 'Loading...') : (isLoginForm ? t('login.login') || 'Login' : t('login.register') || 'Register')}
                </button>
              </form>
              
              <p className="form-switch">
                {isLoginForm 
                  ? (<>Don't have an account? <Link to="#" onClick={(e) => { e.preventDefault(); toggleForm(); }}>{t('login.register') || 'Register'}</Link></>)
                  : (<>Already have an account? <Link to="#" onClick={(e) => { e.preventDefault(); toggleForm(); }}>{t('login.login') || 'Login'}</Link></>)
                }
              </p>
              
              <div className="social-login-divider">
                <span>{t('login.orLoginWith') || 'Or login with'}</span>
              </div>
              
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="btn btn-social google-login"
              >
                <span className="google-icon">G</span>
                {t('login.loginWithGoogle') || 'Login with Google'}
              </button>
              
              <p className="terms-text">
                {t('login.termsText') || 'By logging in or registering, you agree to our'} 
                <Link to={getLocalizedPath('/terms')}>{t('login.termsOfService') || 'Terms of Service'}</Link> 
                {t('login.and') || ' and '}
                <Link to={getLocalizedPath('/privacy')}>{t('login.privacyPolicy') || 'Privacy Policy'}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
