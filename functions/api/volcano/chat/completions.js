// 处理 /api/volcano/chat/completions 路径
export async function onRequest(context) {
  // 处理 OPTIONS 预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-volcano-api-key, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // 只处理 POST 请求
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const apiKey = context.env.VOLCANO_API_KEY || context.env.VITE_VOLCANO_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing VOLCANO_API_KEY' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch (e) {
    console.error('Failed to parse request body:', e);
    body = {};
  }

  // 从请求头或环境变量中获取 API Key
  // 生产环境（Cloudflare Pages）优先使用环境变量（更安全可靠）
  // 开发环境可以使用请求头中的Key（方便本地开发）
  const headerApiKey = context.request.headers.get('x-volcano-api-key');
  
  // 判断是否为生产环境：Cloudflare Pages Functions 总是生产环境
  // 如果环境变量存在且有效，优先使用环境变量（更安全）
  // 这样可以避免前端传递错误的API Key
  let requestApiKey;
  
  // 优先使用环境变量（如果存在且有效）
  // 这样可以确保生产环境使用正确的API Key，不受前端影响
  if (apiKey && apiKey.trim()) {
    requestApiKey = apiKey;
    if (headerApiKey && headerApiKey.trim()) {
      console.log('ℹ️ 使用环境变量中的API Key（忽略请求头中的Key，确保使用正确的Key）');
    }
  } else if (headerApiKey && headerApiKey.trim()) {
    // 如果环境变量不存在，才使用请求头中的Key（开发环境场景）
    requestApiKey = headerApiKey;
    console.warn('⚠️ 环境变量中未找到API Key，使用请求头中的Key');
  } else {
    requestApiKey = null;
  }
  
  if (!requestApiKey) {
    return new Response(JSON.stringify({ 
      error: 'Missing API Key',
      message: 'API Key not found in request header or environment variables'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  // 目标 URL：火山引擎 API
  const targetUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

  console.log('Proxying to Volcano API:', {
    method: context.request.method,
    targetUrl,
    hasApiKey: !!requestApiKey,
    apiKeySource: (apiKey && apiKey.trim()) ? 'environment-variable' : (headerApiKey && headerApiKey.trim() ? 'request-header' : 'none'),
    hasEnvKey: !!apiKey,
    hasHeaderKey: !!headerApiKey,
    model: body.model
  });

  try {
    // 火山引擎 API 支持两种认证方式，同时使用以确保兼容性
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requestApiKey}`,
        'X-Volcano-API-Key': requestApiKey,  // 火山引擎专用认证头
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const responseBody = await resp.text();
    
    return new Response(responseBody, {
      status: resp.status,
      headers: {
        'Content-Type': resp.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-volcano-api-key'
      }
    });
  } catch (error) {
    console.error('Volcano API proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

