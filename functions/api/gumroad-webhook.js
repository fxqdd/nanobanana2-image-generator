import { createClient } from '@supabase/supabase-js'

// Gumroad 付款回调（Ping/Webhook）处理函数
// 文档：https://help.gumroad.com/article/76-ping
//
// 你需要在 Gumroad 后台 Settings → Advanced → Ping 中填写：
// https://你的域名/api/gumroad-webhook
//
// 推荐同时在环境变量中配置：
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - GUMROAD_WEBHOOK_SECRET  （可选，如果你在 Ping URL 后面加了 ?secret=xxxx）

const PLAN_CONFIG = {
  // basic
  qxdec: { code: 'basic-monthly', points: 800, periodMonths: 1 },
  hljpr: { code: 'basic-yearly', points: 9600, periodMonths: 12 },

  // professional
  fdbdc: { code: 'professional-monthly', points: 2500, periodMonths: 1 },
  prskkk: { code: 'professional-yearly', points: 30000, periodMonths: 12 },

  // master
  toihfe: { code: 'master-monthly', points: 5400, periodMonths: 1 },
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = env.SUPABASE_URL
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing Supabase service credentials for gumroad-webhook')
    return jsonResponse({ error: 'Server misconfigured' }, 500)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false }
  })

  // 可选：简单的 secret 校验
  const expectedSecret = env.GUMROAD_WEBHOOK_SECRET
  if (expectedSecret) {
    const url = new URL(request.url)
    const incomingSecret = url.searchParams.get('secret')
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      console.warn('Invalid webhook secret')
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }
  }

  let payload = {}
  try {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      payload = await request.json()
    } else {
      // Gumroad 默认以 form-urlencoded 发送
      const form = await request.formData()
      payload = Object.fromEntries(form.entries())
    }
  } catch (err) {
    console.error('Failed to parse Gumroad webhook payload:', err)
    return jsonResponse({ error: 'Invalid payload' }, 400)
  }

  console.log('📩 Gumroad webhook payload:', payload)

  const email = (payload.email || payload.purchaser_email || '').toLowerCase()
  const productPermalink = payload.product_permalink || ''
  const shortId = productPermalink.split('/').pop() || payload.product_id

  if (!email || !shortId) {
    console.warn('Missing email or product id in Gumroad payload')
    return jsonResponse({ success: false })
  }

  const planCfg = PLAN_CONFIG[shortId]
  if (!planCfg) {
    console.warn('Unknown Gumroad product id:', shortId)
    return jsonResponse({ success: true }) // 忽略未知产品
  }

  try {
    // 1. 根据邮箱找到用户 profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('Failed to query profile by email:', profileError)
      return jsonResponse({ error: 'Profile query failed' }, 500)
    }

    if (!profile) {
      console.warn('No profile found for email:', email)
      return jsonResponse({ success: false, message: 'No matching profile' })
    }

    const userId = profile.user_id

    // 2. 使用 RPC 原子化处理：更新 profile + 写入 subscription + 写入 invoice
    const priceCents = Number(payload.price) || 0
    const currency = payload.currency || 'usd'
    const saleId = payload.sale_id || payload.id || null
    const now = payload.purchased_at ? new Date(payload.purchased_at) : new Date()
    const renewAt = addMonths(now, planCfg.periodMonths)

    const { error: rpcError } = await supabaseAdmin.rpc('handle_gumroad_purchase', {
      p_user_id: userId,
      p_plan_code: planCfg.code,
      p_points: planCfg.points,
      p_sale_id: saleId,
      p_price_cents: priceCents,
      p_currency: currency.toUpperCase(),
      p_renew_at: renewAt.toISOString(),
      p_metadata: payload
    })

    if (rpcError) {
      console.error('Failed to process purchase via RPC:', rpcError)
      return jsonResponse({ error: 'Processing failed' }, 500)
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('Unexpected error in gumroad-webhook:', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
}

function addMonths(date, months) {
  const d = new Date(date.getTime())
  d.setMonth(d.getMonth() + months)
  return d
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })


