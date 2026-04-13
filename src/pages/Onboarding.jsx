import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroup } from '../context/GroupContext'

export default function Onboarding() {
  const { createGroup, joinGroup } = useGroup()
  const navigate = useNavigate()
  const [mode, setMode] = useState('choice') // 'choice' | 'create' | 'join'
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createGroup(groupName)
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/')
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await joinGroup(joinCode)
    if (error) { setError(error.message); setLoading(false); return }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-bold">Welcome!</h1>
          <p className="text-gray-400 text-sm mt-1">Join or create a group to start betting</p>
        </div>

        {mode === 'choice' && (
          <div className="space-y-3">
            <button onClick={() => setMode('join')} className="btn-primary w-full text-base py-3">
              Join a Group
            </button>
            <button onClick={() => setMode('create')} className="btn-secondary w-full text-base py-3">
              Create a Group
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Create Group</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Group name</label>
                <input className="input" placeholder="e.g. The Family" value={groupName} onChange={e => setGroupName(e.target.value)} required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creating…' : 'Create Group'}
              </button>
              <button type="button" onClick={() => { setMode('choice'); setError('') }} className="btn-secondary w-full">
                Back
              </button>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Join Group</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="label">6-character invite code</label>
                <input
                  className="input tracking-widest text-center text-xl uppercase"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Joining…' : 'Join Group'}
              </button>
              <button type="button" onClick={() => { setMode('choice'); setError('') }} className="btn-secondary w-full">
                Back
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
