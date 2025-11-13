import { createClient } from '@supabase/supabase-js'

/**
 * Cloudflare Pages Function to resend verification emails via Resend,
 * reusing the same helper that registration uses.
 */

const ACCEPTED_TYPES = new Set(['signup', 'email_change'])

export const onRequestPost = async (context) => {
  try {
    const { request, env } = context
    const body = await request.json()
    const { email, type = 'signup', locale = 'zh' } = body || {}

    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'Missing email' }, 400)
    }

    if (!ACCEPTED_TYPES.has(type)) {
      return jsonResponse({ error: `Unsupported email type: ${type}` }, 400)
    }

    const origin = new URL(request.url).origin
    const result = await sendVerificationEmail({
      env,
      email,
      type,
      locale,
      origin
    })

    if (!result.success) {
      return jsonResponse(
        { error: result.error || 'Failed to send verification email', details: result.details },
        result.status || 500
      )
    }

    return jsonResponse({ success: true })
  } catch (err) {
    console.error('Unexpected error in send-signup-email:', err)
    return jsonResponse(
      { error: 'Internal server error', details: err.message },
      500
    )
  }
}

export async function sendVerificationEmail({
  env,
  email,
  type = 'signup',
  locale = 'zh',
  origin
}) {
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = env.SUPABASE_URL
  const resendApiKey = env.RESEND_API_KEY
  const fromEmail = env.RESEND_FROM_EMAIL

  if (!serviceRole || !supabaseUrl || !resendApiKey || !fromEmail) {
    console.error('Missing environment variables for Resend flow')
    return {
      success: false,
      status: 500,
      error: 'Server configuration error'
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false }
  })

  const redirectUrl = resolveRedirectUrl(env, origin)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type,
    email,
    options: {
      emailRedirectTo: redirectUrl,
      data: { locale }
    }
  })

  if (error || !data) {
    console.error('Failed to generate Supabase email link', error)
    return {
      success: false,
      status: 500,
      error: 'Failed to generate verification link',
      details: error?.message
    }
  }

  const actionLink =
    data.properties?.action_link || data.properties?.email_otp || data.properties?.link

  if (!actionLink) {
    console.error('Supabase did not return an action link', data)
    return {
      success: false,
      status: 500,
      error: 'No action link returned from Supabase'
    }
  }

  const emailSendResult = await sendViaResend({
    resendApiKey,
    fromEmail,
    fromName: env.RESEND_FROM_NAME || 'Nano Banana 2',
    email,
    locale,
    type,
    actionLink
  })

  if (!emailSendResult.success) {
    return {
      success: false,
      status: 502,
      error: 'Failed to send verification email',
      details: emailSendResult.details
    }
  }

  return { success: true, link: actionLink }
}

const sendViaResend = async ({ resendApiKey, fromEmail, fromName, email, locale, type, actionLink }) => {
  const subject =
    type === 'email_change'
      ? '确认您的 Nano Banana 2 邮箱变更'
      : '请验证您的 Nano Banana 2 账号'

  const html = getEmailTemplate({ actionLink, locale })
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject,
        html
      })
    })

    if (!resp.ok) {
      const text = await resp.text()
      console.error('Resend API error:', text)
      return { success: false, details: text }
    }

    return { success: true }
  } catch (err) {
    console.error('Resend API network error:', err)
    return { success: false, details: err.message }
  }
}

const resolveRedirectUrl = (env, origin) => {
  const normalizedSiteUrl =
    typeof env.PUBLIC_SITE_URL === 'string' && env.PUBLIC_SITE_URL.trim().length > 0
      ? env.PUBLIC_SITE_URL.trim().replace(/\/$/, '')
      : null

  return normalizedSiteUrl ? `${normalizedSiteUrl}/login` : `${origin}/login`
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })

const getEmailTemplate = ({ actionLink, locale = 'zh' }) => {
  const copy = EMAIL_COPY[locale] || EMAIL_COPY.zh
  return `
  <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background:#f7f7f9; padding:32px;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;">
      <div style="padding:24px 28px;">
        <h1 style="font-size:20px;margin:0 0 16px;color:#191919;font-weight:600;">${copy.title}</h1>
        <p style="color:#4a4a4a;font-size:14px;line-height:1.6;margin:0 0 24px;">${copy.description}</p>
        <a href="${actionLink}" style="display:inline-block;background:#f7b408;color:#1d1d1d;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;box-shadow:0 6px 16px rgba(247,180,8,0.25);">${copy.button}</a>
        <p style="margin:24px 0 8px;font-size:13px;color:#666;">${copy.expire}</p>
        <p style="color:#8b8b8b;font-size:12px;line-height:1.6;">${copy.fallback} <br /><a href="${actionLink}" style="color:#f7b408;">${actionLink}</a></p>
      </div>
      <div style="background:#fafafa;padding:16px 28px;border-top:1px solid rgba(0,0,0,0.05);">
        <p style="margin:0;font-size:12px;color:#9b9b9b;">${copy.footer}</p>
      </div>
    </div>
  </div>
  `
}

const EMAIL_COPY = {
  zh: {
    title: '请确认您的邮箱',
    description:
      '点击下方按钮，完成 Nano Banana 2 账号邮箱验证。该链接仅在 30 分钟内有效。',
    button: '立即完成验证',
    expire: '如果您没有请求此操作，可以忽略这封邮件。',
    fallback: '如果按钮无法点击，请复制以下链接到浏览器中打开：',
    footer: '© 2025 Nano Banana 2. 激发你的创意灵感。'
  },
  en: {
    title: 'Confirm your email address',
    description:
      'Click the button below to verify your Nano Banana 2 account. This link expires in 30 minutes.',
    button: 'Verify email',
    expire: 'If you did not request this, you can safely ignore this email.',
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    footer: '© 2025 Nano Banana 2. Empower your creativity.'
  }
}

