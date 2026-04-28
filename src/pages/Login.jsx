import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  async function handleResend() {
    setResendLoading(true)
    setResendMsg('')
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendMsg(error ? 'Could not resend — try signing up again.' : 'Email resent! Check your inbox.')
    setResendLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { data, error } = await signUp(email, password, name)
      if (error) setError(error.message)
      else if (!data.session) { setConfirmed(true); setMode('signin') } // email confirmation required
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold">FamilyBets</h1>
          <p className="text-gray-400 text-sm mt-1">Prediction markets for friends & family</p>
        </div>

        {confirmed && (
          <div className="card mb-4 border-green-700 bg-green-900/20 text-center">
            <div className="text-3xl mb-2">📬</div>
            <p className="font-semibold text-green-400">Check your email</p>
            <p className="text-sm text-gray-400 mt-1">
              We sent a confirmation link to <span className="text-white">{email}</span>. Click it to activate your account, then sign in.
            </p>
            <div className="mt-3 pt-3 border-t border-green-800/50">
              <p className="text-xs text-gray-500 mb-2">Didn't get it? Check spam or</p>
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
              >
                {resendLoading ? 'Resending…' : 'Resend confirmation email'}
              </button>
              {resendMsg && <p className="text-xs mt-2 text-gray-300">{resendMsg}</p>}
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex rounded-xl bg-gray-800 p-1 mb-5">
            {['signin', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="label">Your name</label>
                <input className="input" type="text" placeholder="Alex" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
