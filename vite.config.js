import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // 允许外部访问
    open: true, // 自动打开浏览器
    strictPort: false, // 如果端口被占用，尝试下一个可用端口
    proxy: {
      // 代理火山引擎 API，解决 CORS 问题
      '/api/volcano': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/volcano/, '/api/v3'),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 从请求头中获取 API Key（前端会在请求头中传递）
            const apiKey = req.headers['x-volcano-api-key'];
            if (apiKey) {
              // 火山引擎 API 支持两种认证方式，同时使用以确保兼容性
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              proxyReq.setHeader('X-Volcano-API-Key', apiKey);  // 火山引擎专用认证头
              // 移除自定义头，避免被转发
              proxyReq.removeHeader('x-volcano-api-key');
              
              // 调试信息（仅在开发环境）
              if (process.env.NODE_ENV === 'development') {
                console.log('🔧 Vite代理: 设置火山引擎API认证头', {
                  hasApiKey: !!apiKey,
                  apiKeyLength: apiKey.length,
                  apiKeyPrefix: apiKey.substring(0, 8) + '...',
                  targetUrl: proxyReq.path
                });
              }
            } else {
              console.warn('⚠️ Vite代理: 未找到 x-volcano-api-key 请求头');
            }
          });
        }
      }
    }
  },
  // 忽略node_modules中的TypeScript错误
  optimizeDeps: {
    exclude: ['stop-iteration-iterator']
  },
  // 配置TypeScript检查
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        skipLibCheck: true  // 跳过库类型检查
      }
    }
  }
})