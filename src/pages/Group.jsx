import { useState } from 'react'
import { useGroup } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'

export default function Group() {
  const { group, members, createGroup, joinGroup, loadGroup } = useGroup()
  const { session } = useAuth()
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState(null) // 'create' | 'join' | null
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(group.join_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await createGroup(groupName)
    if (error) { setError(error.message); setLoading(false); return }
    setMode(null)
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await joinGroup(joinCode)
    if (error) { setError(error.message); setLoading(false); return }
    setMode(null)
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4">
        <p className="text-gray-400 text-center">You're not in a group yet.</p>
        <div className="flex gap-3">
          <button onClick={() => setMode('join')} className="btn-primary">Join Group</button>
          <button onClick={() => setMode('create')} className="btn-secondary">Create Group</button>
        </div>

        {mode === 'create' && (
          <div className="card w-full max-w-sm">
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Group name</label>
                <input className="input" placeholder="The Family" value={groupName} onChange={e => setGroupName(e.target.value)} required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creating…' : 'Create'}
              </button>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div className="card w-full max-w-sm">
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="label">Invite code</label>
                <input className="input text-center text-xl tracking-widest uppercase" placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} required />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Joining…' : 'Join'}
              </button>
            </form>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Group header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{group.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Invite code</p>
            <button
              onClick={copyCode}
              className="bg-gray-800 hover:bg-gray-700 transition-colors px-3 py-1.5 rounded-lg text-lg font-mono font-bold tracking-widest"
            >
              {group.join_code}
            </button>
            {copied && <p className="text-xs text-green-400 mt-1">Copied!</p>}
          </div>
        </div>
      </div>

      {/* Share link */}
      <button
        onClick={copyCode}
        className="btn-secondary w-full flex items-center justify-center gap-2"
      >
        <ShareIcon className="w-4 h-4" />
        {copied ? 'Code copied!' : 'Share invite code'}
      </button>

      {/* Members list */}
      <div className="card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Members</p>
        <div className="space-y-3">
          {members.map((m, i) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center font-semibold text-sm">
                {m.profiles?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {m.profiles?.name || 'Unknown'}
                  {m.user_id === session?.user?.id && <span className="text-gray-500 ml-1.5 text-xs">you</span>}
                  {m.user_id === group.created_by && <span className="text-yellow-500 ml-1.5 text-xs">creator</span>}
                </p>
                <p className="text-xs text-gray-500">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
              </div>
              <span className="font-bold text-green-400 tabular-nums text-sm">{m.tokens?.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShareIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  )
}
