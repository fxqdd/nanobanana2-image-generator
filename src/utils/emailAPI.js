/**
 * Helper utilities to call backend email proxy endpoints.
 */

const API_BASE = '/api'

export async function sendVerificationEmail(email, options = {}) {
  if (!email) {
    throw new Error('Email is required')
  }

  try {
    const response = await fetch(`${API_BASE}/send-signup-email`, {
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

