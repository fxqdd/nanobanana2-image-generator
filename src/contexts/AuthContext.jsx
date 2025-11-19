import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../lib/supabaseClient';
import { DEFAULT_FREE_PLAN, DEFAULT_FREE_CREDITS } from '../constants/subscription';

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  // 初始化时进入加载，防止路由在 session 恢复前重定向
  const [loading, setLoading] = useState(true);

  const buildDefaultProfilePayload = (supabaseUser) => {
    const fallbackName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.email?.split('@')[0] ||
      'User';

    return {
      user_id: supabaseUser.id,
      username: fallbackName,
      email: supabaseUser.email,
      plan: DEFAULT_FREE_PLAN,
      credits_remaining: DEFAULT_FREE_CREDITS,
      is_admin: false
    };
  };

  const createDefaultProfile = async (supabaseUser) => {
    if (!supabaseUser) return null;
    const defaultProfile = buildDefaultProfilePayload(supabaseUser);
    try {
      const { data, error } = await supabase()
        .from('profiles')
        .insert(defaultProfile)
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to create default profile:', error);
        return defaultProfile;
      }

      console.log('✓ Default profile created with free plan');
      return data;
    } catch (createError) {
      console.warn('Error creating default profile:', createError);
      return defaultProfile;
    }
  };

  // 从 Supabase session 和 profile 获取用户信息
  const fetchUserProfile = async (supabaseUser) => {
    if (!supabaseUser) return null;

    try {
      // 从 profiles 表获取用户信息（增加超时逻辑，防止数据库响应慢导致登录卡住）
      const profilePromise = supabase()
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      // 使用 Promise.race 避免无限等待
      let profileResult = { data: null, error: null };
      try {
        profileResult = await Promise.race([profilePromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn('Profile fetch timed out, proceeding with basic info');
        // 超时后继续执行，profileResult 保持默认值
      }

      const { data: profile, error } = profileResult;

      let resolvedProfile = profile;

      if (error) {
        if (error.code === 'PGRST116') {
          // 未找到 profile，创建默认 free 计划
          resolvedProfile = await createDefaultProfile(supabaseUser);
        } else {
          console.warn('Failed to fetch profile:', error);
        }
      }

      if (!resolvedProfile) {
        // 如果 profile 为空且没有特定错误（或者是超时的情况），尝试创建或使用默认值
        if (!error) {
          // 超时情况，不尝试创建，直接使用 null，让后续逻辑处理
        } else {
          resolvedProfile = await createDefaultProfile(supabaseUser);
        }
      }

      // 构建用户数据对象
      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: resolvedProfile?.username ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email?.split('@')[0] ||
          'User',
        provider: supabaseUser.app_metadata?.provider || 'email',
        avatar: supabaseUser.user_metadata?.avatar_url ||
          supabaseUser.user_metadata?.picture ||
          resolvedProfile?.avatar_url ||
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

        // 增加重试逻辑，因为 session 可能还在保存中
        let session = null;
        let error = null;

        // 最多重试 5 次，每次间隔 200ms
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = await supabase().auth.getSession();
          session = result.data?.session;
          error = result.error;

          if (session || error) {
            break; // 有结果或错误，退出重试
          }

          if (attempt < 4) {
            console.log(`🔍 Session 未找到，重试中... (${attempt + 1}/5)`);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        if (error) {
          console.error('❌ Error getting session:', error);
          if (isMounted) {
            setLoading(false);
            setIsLoggedIn(false);
            setUser(null);
          }
          return;
        }

        console.log('✓ Session retrieved:', session ? 'has session' : 'no session');
        if (session) {
          console.log('✓ Session details:', {
            email: session.user?.email,
            userId: session.user?.id
          });
        }

        if (isMounted) {
          await syncSessionToState(session);
        }
      } catch (err) {
        console.error('❌ Error initializing auth:', err);
        if (isMounted) {
          setLoading(false);
          setIsLoggedIn(false);
          setUser(null);
        }
      }
    };

    initAuth();

    // 监听 Supabase auth 状态变化
    try {
      const { data: { subscription: authSubscription } } = supabase().auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        console.log('🔄 Session details:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email
        });
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

  // 注意：已移除 beforeunload 监听器
  // 原因：它会在每次关闭标签页时都登出用户，导致无法保持登录状态
  // Supabase 的 session 管理已经足够，不需要手动在页面卸载时登出

  // 常规邮箱登录函数（现在使用 Supabase）
  const login = async (credentials) => {
    try {
      const { data, error } = await supabase().auth.signInWithPassword({
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
      const { data, error } = await supabase().auth.signUp({
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
      const { error } = await supabase().auth.signOut();
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
    socialLogin,
    syncSessionToState
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