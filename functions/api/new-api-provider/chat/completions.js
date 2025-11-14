// 处理 /api/new-api-provider/chat/completions 路径
// 用于代理新 API 提供商的请求，避免 CORS 问题和暴露 API Key

export async function onRequest(context) {
  // 处理 OPTIONS 预检请求
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // 从环境变量获取配置
  const apiBaseUrl = context.env.NEW_API_PROVIDER_BASE || context.env.VITE_NEW_API_PROVIDER_BASE;
  const apiKey = context.env.NEW_API_PROVIDER_KEY || context.env.VITE_NEW_API_PROVIDER_KEY;
  
  if (!apiBaseUrl || !apiKey) {
    return new Response(JSON.stringify({ 
      error: 'Missing NEW_API_PROVIDER_BASE or NEW_API_PROVIDER_KEY environment variables' 
    }), {
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
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // 构建目标 URL
  const targetUrl = `${apiBaseUrl.replace(/\/+$/, '')}/chat/completions`;

  console.log('Proxying to New API Provider:', {
    method: context.request.method,
    targetUrl: targetUrl.replace(apiKey, 'API_KEY_HIDDEN'),
    model: body.model,
    hasApiKey: !!apiKey
  });

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const responseData = await resp.text();
    
    return new Response(responseData, {
      status: resp.status,
      statusText: resp.statusText,
      headers: {
        'Content-Type': resp.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Proxy request failed',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

