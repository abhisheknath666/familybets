import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useGroup } from '../context/GroupContext'
import { useAuth } from '../context/AuthContext'

export default function Leaderboard() {
  const { group, members } = useGroup()
  const { session } = useAuth()
  const [tab, setTab] = useState('monthly') // 'monthly' | 'alltime'
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)

  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

  useEffect(() => {
    if (!group) return
    if (tab === 'monthly') loadMonthly()
    else loadAllTime()
  }, [group, tab])

  async function loadMonthly() {
    setLoading(true)
    const { data } = await supabase
      .from('leaderboard_snapshots')
      .select('*, profiles(name)')
      .eq('group_id', group.id)
      .eq('month', currentMonth)
      .order('tokens_earned', { ascending: false })
    setSnapshots(data || [])
    setLoading(false)
  }

  async function loadAllTime() {
    setLoading(true)
    // Sum all months per user
    const { data } = await supabase
      .from('leaderboard_snapshots')
      .select('user_id, tokens_earned, biggest_win, markets_bet, win_rate')
      .eq('group_id', group.id)

    // Aggregate by user
    const agg = {}
    for (const row of data || []) {
      if (!agg[row.user_id]) agg[row.user_id] = { user_id: row.user_id, tokens_earned: 0, biggest_win: 0, markets_bet: 0 }
      agg[row.user_id].tokens_earned += row.tokens_earned
      agg[row.user_id].markets_bet += row.markets_bet || 0
      agg[row.user_id].biggest_win = Math.max(agg[row.user_id].biggest_win, row.biggest_win || 0)
    }

    // Attach names from members
    const result = Object.values(agg).map(u => {
      const member = members.find(m => m.user_id === u.user_id)
      return { ...u, profiles: member?.profiles }
    }).sort((a, b) => b.tokens_earned - a.tokens_earned)

    setSnapshots(result)
    setLoading(false)
  }

  // Live leaderboard from current tokens (supplementary)
  const liveRanking = [...members].sort((a, b) => b.tokens - a.tokens)

  const MEDALS = ['🥇', '🥈', '🥉']

  if (!group) return <div className="text-center py-16 text-gray-400">Join a group to see the leaderboard.</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Leaderboard</h1>

      {/* Live token standings */}
      <div className="card mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current Standings</p>
        <div className="space-y-2.5">
          {liveRanking.map((m, i) => (
            <div key={m.user_id} className={`flex items-center gap-3 ${m.user_id === session?.user?.id ? 'opacity-100' : 'opacity-80'}`}>
              <span className="text-lg w-6 text-center">{MEDALS[i] || `${i + 1}`}</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="font-medium text-sm">{m.profiles?.name || 'Unknown'}</span>
                {m.user_id === session?.user?.id && <span className="text-xs text-gray-500">(you)</span>}
              </div>
              <span className="font-bold text-green-400 tabular-nums">{m.tokens?.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical tabs */}
      <div className="flex gap-2 mb-4">
        {['monthly', 'alltime'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {t === 'monthly' ? `${currentMonth}` : 'All Time'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">No history yet for {tab === 'monthly' ? 'this month' : 'any time'}.</p>
          <p className="text-xs text-gray-600 mt-1">Snapshots are saved monthly when markets resolve.</p>
        </div>
      ) : (
        <div className="card space-y-3">
          {snapshots.map((s, i) => (
            <div key={s.user_id || i} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{MEDALS[i] || `${i + 1}`}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{s.profiles?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500">{s.markets_bet} bets · biggest win {s.biggest_win?.toFixed(0) ?? '—'}</p>
              </div>
              <span className={`font-bold tabular-nums ${s.tokens_earned >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {s.tokens_earned >= 0 ? '+' : ''}{s.tokens_earned?.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
