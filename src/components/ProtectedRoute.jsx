import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 受保护的路由组件，只有登录用户才能访问
 * @param {Object} props 组件属性
 * @param {React.ReactNode} props.children 子组件
 * @returns {React.ReactNode} 保护的路由组件
 */
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // 添加加载动画样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .auth-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-top-color: var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      body.dark-mode .auth-loading-spinner {
        border-color: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !loading) {
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setShouldRedirect(false);
    }
  }, [isLoggedIn, loading]);

  const renderLoading = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      color: 'var(--text-color)'
    }}>
      <div className="auth-loading-spinner"></div>
      <p style={{ fontSize: '18px', fontWeight: '500' }}>验证中...</p>
    </div>
  );

  if (loading) {
    return renderLoading();
  }
  
  if (!isLoggedIn && shouldRedirect) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!isLoggedIn && !shouldRedirect) {
    return renderLoading();
  }

  // 如果已登录，渲染子组件
  return children;
};

export default ProtectedRoute;