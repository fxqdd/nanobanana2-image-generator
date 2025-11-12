import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../lib/supabaseClient';

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 从 Supabase session 和 profile 获取用户信息
  const fetchUserProfile = async (supabaseUser) => {
    if (!supabaseUser) return null;

    try {
      // 从 profiles 表获取用户信息
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Failed to fetch profile:', error);
      }

      // 构建用户数据对象
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: profile?.username || 
              supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name ||
              supabaseUser.email?.split('@')[0] || 
              'User',
        provider: supabaseUser.app_metadata?.provider || 'email',
        avatar: supabaseUser.user_metadata?.avatar_url || 
                supabaseUser.user_metadata?.picture || 
                profile?.avatar_url || 
                null
      };

      return userData;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // 如果获取 profile 失败，至少返回基本信息
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || 
              supabaseUser.user_metadata?.name ||
              supabaseUser.email?.split('@')[0] || 
              'User',
        provider: supabaseUser.app_metadata?.provider || 'email',
        avatar: supabaseUser.user_metadata?.avatar_url || 
                supabaseUser.user_metadata?.picture || 
                null
      };
    }
  };

  // 同步 Supabase session 到 AuthContext
  const syncSessionToState = async (session) => {
    try {
      if (session?.user) {
        const userData = await fetchUserProfile(session.user);
        if (userData) {
          setUser(userData);
          setIsLoggedIn(true);
          console.log('✓ Auth state synced:', userData);
        } else {
          // 如果获取 profile 失败，至少设置基本用户信息
          const basicUserData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 
                  'User',
            provider: session.user.app_metadata?.provider || 'email',
            avatar: session.user.user_metadata?.avatar_url || 
                    session.user.user_metadata?.picture || 
                    null
          };
          setUser(basicUserData);
          setIsLoggedIn(true);
          console.log('✓ Auth state synced (basic info):', basicUserData);
        }
      } else {
        setUser(null);
        setIsLoggedIn(false);
        console.log('✓ Auth state synced: no session');
      }
    } catch (error) {
      console.error('Error syncing auth state:', error);
      // 即使出错也要设置 loading 为 false，避免卡在加载状态
      if (session?.user) {
        // 如果有 session 但获取 profile 失败，至少设置基本信息
        const basicUserData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || 
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] || 
                'User',
          provider: session.user.app_metadata?.provider || 'email',
          avatar: session.user.user_metadata?.avatar_url || 
                  session.user.user_metadata?.picture || 
                  null
        };
        setUser(basicUserData);
        setIsLoggedIn(true);
        console.log('✓ Auth state synced (fallback):', basicUserData);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    } finally {
      // 确保 loading 状态总是被设置为 false
      setLoading(false);
      console.log('✓ Auth loading state set to false');
    }
  };

  // 初始化时检查 Supabase session
  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const initAuth = async () => {
      try {
        console.log('🔍 初始化认证状态...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        
        console.log('✓ Session retrieved:', session ? 'has session' : 'no session');
        if (isMounted) {
          await syncSessionToState(session);
        }
      } catch (err) {
        console.error('❌ Error initializing auth:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 监听 Supabase auth 状态变化
    try {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        if (isMounted) {
          await syncSessionToState(session);
        }
      });
      subscription = authSubscription;
    } catch (err) {
      console.error('❌ Error setting up auth state listener:', err);
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // 常规邮箱登录函数（现在使用 Supabase）
  const login = async (credentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return { success: false, error: error.message || '邮箱或密码错误' };
      }
      
      if (data?.session) {
        // session 会通过 onAuthStateChange 自动同步到 state
        // 但为了确保立即更新，我们也手动同步一次
        await syncSessionToState(data.session);
        return { success: true };
      }

      return { success: false, error: '登录失败，请稍后重试' };
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: error.message || '登录失败，请稍后重试' };
    }
  };

  // 社交媒体登录函数（现在由 Supabase 处理，这里保留接口兼容性）
  const socialLogin = async (provider, socialUserInfo) => {
    // 社交媒体登录现在由 Login.jsx 中的 signInWithOAuth 直接处理
    // session 会通过 onAuthStateChange 自动同步
    // 这个函数保留是为了向后兼容，但实际不会被调用
    console.warn('socialLogin called but should use Supabase signInWithOAuth directly');
    return { success: false, error: '请使用 Supabase OAuth 登录' };
  };

  // 注册函数（现在使用 Supabase）
  const register = async (userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.name || userData.email.split('@')[0]
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) {
        return { success: false, error: error.message || '注册失败，请稍后重试' };
      }

      // 注册成功，但需要邮箱确认
      // session 会在邮箱确认后通过 onAuthStateChange 自动同步
      return { success: true, requiresEmailConfirmation: true };
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, error: error.message || '注册失败，请稍后重试' };
    }
  };

  // 登出函数（现在使用 Supabase）
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('登出失败:', error);
      }
      // 状态会通过 onAuthStateChange 自动更新
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('登出失败:', error);
      // 即使出错也清除本地状态
    setUser(null);
    setIsLoggedIn(false);
    }
  };

  // 更新用户信息
  const updateUser = async (newUserData) => {
    if (!user?.id) return;

    try {
      // 更新 Supabase profile
      const { error } = await supabase
        .from('profiles')
        .update(newUserData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update profile:', error);
        return;
      }

      // 更新本地状态
    const updatedUser = { ...user, ...newUserData };
    setUser(updatedUser);
    } catch (error) {
      console.error('更新用户信息失败:', error);
    }
  };

  // 提供给组件使用的值
  const value = {
    isLoggedIn,
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    socialLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义Hook，方便在组件中使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};