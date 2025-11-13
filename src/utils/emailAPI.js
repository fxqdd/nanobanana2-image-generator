/**
 * Helper utilities to call backend email proxy endpoints.
 */

export async function sendVerificationEmail(email, options = {}) {
  if (!email) {
    throw new Error('Email is required')
  }

  try {
    const response = await fetch('/api/send-signup-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        type: options.type || 'signup',
        locale: options.locale || 'zh'
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error?.error || 'Failed to send verification email')
    }

    return await response.json()
  } catch (err) {
    console.error('sendVerificationEmail error:', err)
    throw err
  }
}

export async function registerUser(payload) {
  if (!payload?.email || !payload?.password) {
    throw new Error('Email and password are required')
  }

  try {
    const response = await fetch('/api/register-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to register user')
    }

    return data
  } catch (err) {
    console.error('registerUser error:', err)
    throw err
  }
}

