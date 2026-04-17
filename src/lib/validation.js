/**
 * Safe to import in both client and server components.
 */

export function sanitizeInput(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\0/g, '')
}

export function validateSignupFields({ email, password, groupName, adminName }) {
  if (!email || !email.includes('@')) return 'Please enter a valid email address.'
  if (!password || password.length < 8) return 'Password must be at least 8 characters.'
  if (!groupName || groupName.length < 2) return 'Please enter your group or church name.'
  if (!adminName || adminName.length < 2) return 'Please enter your name.'
  if (password.length > 72) return 'Password must be under 72 characters.'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address.'
  return null
}