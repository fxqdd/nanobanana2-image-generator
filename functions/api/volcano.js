// 处理所有 HTTP 方法（GET, POST, OPTIONS 等）
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
        'Allow': 'POST, OPTIONS'
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

  // 从请求头或环境变量中获取 API Key（优先使用请求头中的）
  const requestApiKey = context.request.headers.get('x-volcano-api-key') || apiKey;
  
  // 获取路径（例如 /api/volcano/chat/completions -> /api/v3/chat/completions）
  const url = new URL(context.request.url);
  const path = url.pathname.replace('/api/volcano', '/api/v3');
  const targetUrl = `https://ark.cn-beijing.volces.com${path}`;

  console.log('Proxying to Volcano API:', {
    method: context.request.method,
    path: url.pathname,
    targetUrl,
    hasApiKey: !!requestApiKey
  });

  try {
    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requestApiKey}`,
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

