export async function onRequestPost(context) {
  const apiKey = context.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body = {};
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  const payload = body?.payload || body || {};
  const siteUrl = body?.siteUrl || '';
  const siteName = body?.siteName || 'NanoBanana2';

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': siteName
    },
    body: JSON.stringify(payload)
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      'Content-Type': resp.headers.get('content-type') || 'application/json'
    }
  });
}


