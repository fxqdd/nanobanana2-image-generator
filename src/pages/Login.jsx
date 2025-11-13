import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SEO from '../components/SEO';
import supabase, { setAuthStorageMode, getAuthStorageMode } from '../lib/supabaseClient';
import { sendVerificationEmail } from '../utils/emailAPI';
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
                    email: session.user.email
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
            
            // 跳转到首页
            navigate(getLocalizedPath('/'));
            return;
          } else {
            // 没有 session，可能是 token 还未处理完成，等待一下再试
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession) {
                window.location.hash = '';
                navigate(getLocalizedPath('/'));
              } else {
                setError(t('login.loginFailed') || '登录失败，请重试');
              }
              setIsLoading(false);
            }, 1000);
            return;
          }
        } catch (err) {
          console.error('Failed to handle OAuth callback:', err);
          setError(err.message || t('common.error'));
          setIsLoading(false);
        }
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
      setIsLoading(true);
      setAuthStorageMode(rememberMe ? 'local' : 'session');
      
      if (isLoginForm) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message || t('login.loginFailed'));
          return;
        }
        navigate(getLocalizedPath('/'));
        return;
      }

      // 构建重定向 URL - 使用简单的 /login 路径，避免语言路径问题
      const redirectUrl = `${window.location.origin}/login`;
      console.log('Attempting sign up with:', {
        email,
        username,
        redirectUrl,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'missing',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      });

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: redirectUrl
        }
      });

      if (signUpError) {
        console.error('❌ 注册失败 - Sign up error details:', {
          message: signUpError.message,
          status: signUpError.status,
          code: signUpError.code,
          name: signUpError.name,
          error: signUpError
        });
        console.error('📋 错误堆栈:', signUpError.stack || 'No stack trace');
        console.error('🔍 请求详情:', {
          email,
          redirectUrl,
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
        });
        setError(signUpError.message || t('login.registerFailed'));
        return;
      }

      // 记录注册结果用于调试
      console.log('✅ 注册API调用成功 - Sign up result:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id,
        email: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at,
        createdAt: data?.user?.created_at,
        lastSignInAt: data?.user?.last_sign_in_at,
        confirmedAt: data?.user?.confirmed_at,
        fullData: data
      });
      
      // 检查邮件发送状态
      if (data?.user) {
        console.log('📧 用户创建成功，检查邮件发送状态...');
        console.log('   用户ID:', data.user.id);
        console.log('   邮箱:', data.user.email);
        console.log('   邮箱确认时间:', data.user.email_confirmed_at || '未确认');
        console.log('   创建时间:', data.user.created_at);
        console.log('   是否有Session:', !!data?.session);
        
        if (!data?.session) {
          console.log('   ⚠️ 没有Session，说明需要邮箱确认');
        } else {
          console.log('   ✅ 有Session，说明邮箱确认已禁用或已完成');
        }
      }

      // 使用 Resend 发送验证邮件，绕过 Supabase SMTP
      try {
        console.log('🚀 通过 Resend 发送验证邮件...');
        await sendVerificationEmail(email, {
          type: 'signup',
          locale: language
        });
        console.log('✅ Resend 验证邮件发送成功');
      } catch (emailErr) {
        console.error('❌ 调用 Resend 发送验证邮件失败:', emailErr);
        setResendStatus(
          emailErr.message || t('login.verificationResendError') || '验证邮件发送失败，请稍后重试'
        );
        setResendStatusType('error');
      }

      // 如果注册成功但没有 session，说明需要邮箱确认
      if (data?.user && !data?.session) {
        console.log('✓ User created, awaiting email confirmation');
        console.log('User ID:', data.user.id);
        console.log('Email:', data.user.email);
        console.log('Email confirmed at:', data.user.email_confirmed_at);
        
        // 检查邮件是否真的被发送
        console.log('');
        console.log('⚠️ ⚠️ ⚠️ 重要诊断信息 ⚠️ ⚠️ ⚠️');
        console.log('');
        console.log('📊 当前状态分析：');
        console.log('   ✅ 用户创建成功');
        console.log('   ❌ 没有 Session（需要邮箱确认）');
        console.log('   ❓ 邮件发送状态：未知（需要检查 Supabase Logs）');
        console.log('');
        console.log('🔍 如果 Supabase Logs 中显示：');
        console.log('   - mail_from: null');
        console.log('   - mail_to: null');
        console.log('   - mail_type: null');
        console.log('   说明邮件根本没有被发送！');
        console.log('');
        console.log('📋 请立即检查以下配置（按优先级排序）：');
        console.log('');
        console.log('1️⃣ 【最重要】检查 SMTP 配置：');
        console.log('   Project Settings → Auth → SMTP Settings');
        console.log('   ✅ 必须配置自定义 SMTP（SendGrid/Resend/Mailgun等）');
        console.log('   ❌ 免费计划没有默认邮件服务！');
        console.log('');
        console.log('2️⃣ 检查邮件确认功能：');
        console.log('   Authentication → Settings → Enable email confirmations');
        console.log('   ✅ 必须启用');
        console.log('');
        console.log('3️⃣ 检查邮件模板：');
        console.log('   Authentication → Email Templates → Confirm signup');
        console.log('   ✅ 确认模板存在且配置正确');
        console.log('');
        console.log('4️⃣ 检查 Site URL：');
        console.log('   Project Settings → API → Site URL');
        console.log('   ✅ 应该设置为: https://nanobanana2.online');
        console.log('');
        console.log('5️⃣ 检查 Redirect URLs：');
        console.log('   Project Settings → API → Redirect URLs');
        console.log('   ✅ 应该包含: https://nanobanana2.online/login');
        console.log('');
        console.log('💡 临时解决方案（仅用于测试）：');
        console.log('   如果只是测试，可以临时禁用邮件确认：');
        console.log('   Authentication → Settings → 关闭 "Enable email confirmations"');
        console.log('   这样注册后会直接登录，无需邮件确认');
        console.log('');
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(PENDING_EMAIL_KEY, email);
          window.localStorage.setItem(PENDING_USERNAME_KEY, username);
        }
        setVerificationEmail(email);
        setAwaitingEmailConfirmation(true);
        setResendStatus('');
        setError('');
          return;
        }

      // 如果有 session，说明邮箱确认被禁用，直接登录
      if (data?.session?.user?.id) {
        try {
          await supabase.from('profiles').update({ username }).eq('user_id', data.session.user.id);
        } catch (updateError) {
          console.warn('Failed to update profile username after signup', updateError);
        }
        window.localStorage.removeItem(PENDING_EMAIL_KEY);
        window.localStorage.removeItem(PENDING_USERNAME_KEY);
        setAwaitingEmailConfirmation(false);
        navigate(getLocalizedPath('/'));
        return;
      }

      // 如果既没有 user 也没有 session，可能是配置问题
      console.warn('Unexpected sign up result: no user and no session', data);
      setError(t('login.registerUnexpectedError') || '注册过程中出现意外错误，请检查 Supabase 配置');
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
    // 实现忘记密码功能
    alert(t('login.forgotPasswordFeature') || '忘记密码功能开发中...');
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
              <div className="verification-tips" style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 165, 0, 0.1)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong style={{ display: 'block', marginBottom: '8px' }}>💡 如果未收到邮件，请按以下步骤检查：</strong>
                <ol style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
                  <li><strong>检查正确的日志位置：</strong><br />
                      Supabase Dashboard → Logs → 左侧选择 <strong>"Auth"</strong> 集合（不是 edge_logs）<br />
                      查询：<code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '3px' }}>select * from auth_logs limit 10</code></li>
                  <li><strong>检查邮件确认是否启用：</strong><br />
                      Authentication → Settings → 确认 <strong>"Enable email confirmations"</strong> 已启用<br />
                      ⚠️ 如果未启用，注册后会直接登录，不需要邮件确认</li>
                  <li><strong>检查邮件服务配置（最重要）：</strong><br />
                      Project Settings → Auth → SMTP Settings<br />
                      ⚠️ <strong>免费计划可能没有默认邮件服务</strong>，需要配置自定义 SMTP（SendGrid/Mailgun）</li>
                  <li><strong>检查邮件模板：</strong><br />
                      Authentication → Email Templates → Confirm signup → 确认模板存在</li>
                  <li><strong>检查 Site URL：</strong><br />
                      Project Settings → API → Site URL 设置为 <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '3px' }}>http://localhost:5173</code></li>
                  <li><strong>临时解决方案（仅测试）：</strong><br />
                      如果只是测试，可以临时禁用邮件确认：<br />
                      Authentication → Settings → 关闭 "Enable email confirmations" → 保存<br />
                      这样注册后会直接登录，无需邮件确认</li>
                </ol>
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <strong>⚠️ 关键问题：</strong> 如果 Logs 中完全没有邮件发送记录，说明邮件根本没有被发送。最可能的原因是：
                  <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                    <li>邮件确认功能未启用</li>
                    <li>免费计划没有配置 SMTP，邮件服务不可用</li>
                  </ul>
                </div>
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