import React, { useEffect } from 'react';
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

  // 如果正在加载认证状态，返回加载指示器
  if (loading) {
    return (
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
  }

  // 如果未登录，重定向到登录页面，并记录当前位置以便登录后返回
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果已登录，渲染子组件
  return children;
};

export default ProtectedRoute;