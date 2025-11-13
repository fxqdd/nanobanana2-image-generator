import { createClient } from '@supabase/supabase-js'
import { sendVerificationEmail } from './send-signup-email'

/**
 * Registers a user with Supabase using the service role key,
 * preventing Supabase from sending its own confirmation email.
 * After creation we generate a verification link and deliver it via Resend.
 */

export const onRequestPost = async (context) => {
  try {
    const { request, env } = context
    const body = await request.json()
    const { email, password, username = '', locale = 'zh' } = body || {}

    if (!email || !password) {
      return jsonResponse({ error: 'Missing email or password' }, 400)
    }

    const supabaseUrl = env.SUPABASE_URL
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRole) {
      console.error('Missing Supabase credentials for register-user')
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false }
    })

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username }
    })

    if (createError) {
      console.error('Failed to create user via admin:', createError)

      // Duplicate user friendly message
      if (
        createError.message?.includes('already registered') ||
        createError.message?.includes('duplicate key value')
      ) {
        return jsonResponse(
          { error: 'Email already registered. Please log in instead.' },
          409
        )
      }

      return jsonResponse(
        { error: 'Failed to create user', details: createError.message },
        500
      )
    }

    const sendResult = await sendVerificationEmail({
      env,
      email,
      locale,
      type: 'signup',
      origin: new URL(request.url).origin
    })

    if (!sendResult.success) {
      return jsonResponse(
        {
          error: sendResult.error || 'Failed to send verification email',
          details: sendResult.details
        },
        sendResult.status || 500
      )
    }

    return jsonResponse({
      success: true,
      userId: userData?.user?.id,
      email
    })
  } catch (err) {
    console.error('Unexpected error in register-user:', err)
    return jsonResponse(
      { error: 'Internal server error', details: err.message },
      500
    )
  }
}

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })

