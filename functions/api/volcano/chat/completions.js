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

  // 从请求头或环境变量中获取 API Key（优先使用请求头中的，但必须是有效的）
  const headerApiKey = context.request.headers.get('x-volcano-api-key');
  const requestApiKey = (headerApiKey && headerApiKey.trim()) ? headerApiKey : apiKey;
  
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
    apiKeySource: headerApiKey && headerApiKey.trim() ? 'request-header' : 'environment-variable',
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

