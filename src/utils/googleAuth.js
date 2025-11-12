import axios from 'axios';

// Google OAuth 配置
const GOOGLE_AUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo'
};

/**
 * 生成Google授权URL
 * @returns {string} Google授权URL
 */
export const generateGoogleAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_AUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_AUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'online',
    prompt: 'consent'
  });
  
  return `${GOOGLE_AUTH_CONFIG.authEndpoint}?${params.toString()}`;
};

/**
 * 使用授权码获取访问令牌
 * @param {string} code 授权码
 * @returns {Promise<object>} 包含访问令牌的响应
 */
export const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(GOOGLE_AUTH_CONFIG.tokenEndpoint, null, {
      params: {
        code,
        client_id: GOOGLE_AUTH_CONFIG.clientId,
        client_secret: GOOGLE_AUTH_CONFIG.clientSecret,
        redirect_uri: GOOGLE_AUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    throw new Error('获取Google访问令牌失败');
  }
};

/**
 * 使用访问令牌获取用户信息
 * @param {string} accessToken 访问令牌
 * @returns {Promise<object>} 用户信息
 */
export const getUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(GOOGLE_AUTH_CONFIG.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw new Error('获取Google用户信息失败');
  }
};

/**
 * 处理Google登录流程
 * @returns {Promise<object>} 包含用户信息和提供商的对象
 */
export const handleGoogleLogin = async () => {
  // 1. 生成并跳转到Google授权页面
  const authUrl = generateGoogleAuthUrl();
  console.log('重定向到Google授权页面:', authUrl);
  
  // 由于这是前端实现，我们需要模拟这个过程
  // 在实际应用中，这里应该使用window.location.href = authUrl
  // 然后在重定向回来后，从URL中获取授权码
  
  // 2. 模拟授权码（在实际应用中，这个码应该从URL查询参数中获取）
  // 注意：在真实场景中，这一步需要在登录页面加载时检查URL是否有code参数
  
  return {
    code: null, // 在真实实现中，这里应该从URL中获取
    redirectUrl: authUrl
  };
};

/**
 * 从URL中提取授权码
 * @returns {string|null} 授权码或null
 */
export const getCodeFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('code');
};