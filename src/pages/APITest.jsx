import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import modelAPI from '../utils/modelAPI';
import '../styles/APITest.css';

const APITest = () => {
  const [testPrompt, setTestPrompt] = useState('猫在房子上揭瓦');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [errors, setErrors] = useState([]);
  const [apiKeyStatus, setApiKeyStatus] = useState('检查中...');
  const navigate = useNavigate();

  // 检查API密钥状态
  React.useEffect(() => {
    const checkApiKey = () => {
      const apiKey = modelAPI.geminiApiKey;
      if (!apiKey || apiKey === 'YOUR_API_KEY') {
        setApiKeyStatus('未配置或使用默认值');
      } else {
        setApiKeyStatus('已配置');
      }
    };
    checkApiKey();
  }, []);

  // 捕获控制台错误
  React.useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = (...args) => {
      // 记录API相关的错误
      if (args[0] && (typeof args[0] === 'string' && args[0].includes('API') || 
          (args[0] && typeof args[0] === 'object' && args[0].endpoint))) {
        setErrors(prev => [...prev, args[0]]);
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // 测试API连接
  const testApiConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrors([]);

    try {
      console.log('提示词优化功能已删除');
      setErrors(prev => [...prev, '提示词优化功能已从系统中删除']);
    } catch (error) {
      console.error('API测试失败:', error);
      setErrors(prev => [...prev, error.message || error]);
    } finally {
      setIsTesting(false);
    }
  };

  // 清除结果
  const clearResults = () => {
    setTestResult(null);
    setErrors([]);
  };

  // 复制错误信息
  const copyErrorInfo = () => {
    const errorText = errors.map(err => 
      typeof err === 'string' ? err : JSON.stringify(err, null, 2)
    ).join('\n\n');
    navigator.clipboard.writeText(errorText);
    alert('错误信息已复制到剪贴板');
  };

  return (
    <div className="api-test-container">
      <div className="api-test-header">
        <h1>Gemini API 连接测试</h1>
        <p>测试您的Gemini API连接状态并查看详细诊断信息</p>
      </div>

      <div className="api-test-status">
        <div className="status-item">
          <span className="status-label">API密钥状态:</span>
          <span className={`status-value ${apiKeyStatus === '已配置' ? 'status-ok' : 'status-error'}`}>
            {apiKeyStatus}
          </span>
        </div>
      </div>

      <div className="api-test-form">
        <div className="form-group">
          <label htmlFor="testPrompt">测试提示词:</label>
          <input
            id="testPrompt"
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="输入测试提示词"
            disabled={isTesting}
          />
        </div>
        
        <div className="form-actions">
          <button 
            className="test-button" 
            onClick={testApiConnection}
            disabled={isTesting}
          >
            {isTesting ? '测试中...' : '测试API连接'}
          </button>
          <button 
            className="clear-button" 
            onClick={clearResults}
            disabled={isTesting}
          >
            清除结果
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="api-test-errors">
          <div className="errors-header">
            <h3>错误信息</h3>
            <button onClick={copyErrorInfo} className="copy-button">复制错误信息</button>
          </div>
          <div className="errors-content">
            {errors.map((error, index) => (
              <div key={index} className="error-item">
                {typeof error === 'string' ? (
                  <pre>{error}</pre>
                ) : (
                  <pre>{JSON.stringify(error, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
          
          <div className="error-solution">
            <h4>可能的解决方案:</h4>
            <ul>
              <li>在Google Cloud Console中启用Generative Language API</li>
              <li>确保API密钥与正确的项目关联</li>
              <li>验证项目已启用结算功能（即使使用免费配额）</li>
              <li>检查网络连接是否能访问Google API服务</li>
              <li>如仍无法解决，系统会自动使用本地优化引擎</li>
            </ul>
          </div>
        </div>
      )}

      {testResult && (
        <div className="api-test-result">
          <div className="result-header">
            <h3>测试结果</h3>
            <span className={`result-status ${testResult.success ? 'status-ok' : 'status-error'}`}>
              {testResult.success ? '成功' : '失败'}
            </span>
          </div>
          
          <div className="result-content">
            <div className="result-section">
              <h4>原始提示词:</h4>
              <p>{testResult.data.originalPrompt}</p>
            </div>
            
            <div className="result-section">
              <h4>优化提示词:</h4>
              <p>{testResult.data.optimizedPrompt}</p>
            </div>
            
            <div className="result-section">
              <h4>优化说明:</h4>
              <p>{testResult.data.optimizationNotes}</p>
            </div>
            
            <div className="result-section">
              <h4>使用模型:</h4>
              <p>{testResult.data.model}</p>
            </div>
            
            <div className="result-section">
              <h4>生成时间:</h4>
              <p>{testResult.data.generationTime} 秒</p>
            </div>
            
            {testResult.data.parameters.isLocalOptimization && (
              <div className="result-warning">
                <p>⚠️ 当前使用的是本地优化引擎，因为Gemini API服务不可用</p>
              </div>
            )}
            
            {testResult.data.apiError && (
              <div className="result-error-details">
                <h4>API错误详情:</h4>
                <pre>{JSON.stringify(testResult.data.apiError, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="api-test-info">
        <h3>API服务状态检查说明</h3>
        <p>这个测试页面会帮助您检查Gemini API的连接状态，并在API不可用时验证本地降级方案是否正常工作。</p>
        
        <div className="info-grid">
          <div className="info-item">
            <h4>📋 测试步骤</h4>
            <ol>
              <li>确认API密钥状态</li>
              <li>输入测试提示词</li>
              <li>点击"测试API连接"</li>
              <li>查看测试结果和错误信息</li>
            </ol>
          </div>
          
          <div className="info-item">
            <h4>🔧 故障排除</h4>
            <ul>
              <li>404错误: 通常表示未启用Generative Language API</li>
              <li>403错误: 通常表示API密钥无效或无权限</li>
              <li>超时错误: 通常表示网络连接问题</li>
              <li>本地降级: 当API不可用时，系统会自动切换到本地优化</li>
              <li>检查.env.local文件中的API密钥配置</li>
              <li>确保Google Cloud项目已启用结算功能</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="api-test-footer">
        <Link to="/editor" className="back-link">返回编辑器</Link>
      </div>
    </div>
  );
};

export default APITest;