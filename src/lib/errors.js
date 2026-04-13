/**
 * Translate raw Supabase/Postgres errors into human-readable messages.
 */
export function friendlyError(error) {
  if (!error) return null
  const msg = (error.message || String(error)).toLowerCase()

  if (msg.includes('row-level security')) return 'Permission denied. Please try signing out and back in.'
  if (msg.includes('duplicate key') && msg.includes('join_code')) return 'Bad luck — invite code collision. Please try again.'
  if (msg.includes('duplicate key') && msg.includes('group_members')) return "You're already a member of this group."
  if (msg.includes('duplicate key') && msg.includes('resolution_votes')) return "You've already voted on this market."
  if (msg.includes('duplicate key')) return 'This already exists. Please try again.'
  if (msg.includes('violates foreign key')) return 'Something went wrong. Please refresh and try again.'
  if (msg.includes('jwt') || msg.includes('session')) return 'Your session expired. Please sign in again.'
  if (msg.includes('email not confirmed')) return 'Please confirm your email before signing in.'
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('user already registered')) return 'An account with this email already exists. Try signing in.'
  if (msg.includes('password should be at least')) return 'Password must be at least 6 characters.'
  if (msg.includes('unable to validate email')) return 'Please enter a valid email address.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your connection and try again.'
  if (msg.includes('not found') || msg.includes('pgrst116')) return 'Not found. Check the invite code and try again.'
  if (msg.includes('group not found')) return 'No group found with that invite code.'

  // Fallback — strip postgres boilerplate but show something
  return error.message || 'Something went wrong. Please try again.'
}
