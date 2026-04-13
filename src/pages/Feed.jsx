import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import MarketCard from '../components/MarketCard'

export default function Feed() {
  const { session } = useAuth()
  const { group, membership, loading: groupLoading } = useGroup()
  const navigate = useNavigate()
  const [markets, setMarkets] = useState([])
  const [positions, setPositions] = useState({})
  const [filter, setFilter] = useState('open') // 'open' | 'voting' | 'resolved'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!group) return
    loadMarkets()

    // Realtime: update market when pools change
    const sub = supabase
      .channel('markets-feed')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `group_id=eq.${group.id}` },
        payload => setMarkets(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [group])

  async function loadMarkets() {
    setLoading(true)
    const { data: mkt } = await supabase
      .from('markets')
      .select('*')
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })

    setMarkets(mkt || [])

    // Load user's positions indexed by market_id+side
    const { data: pos } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', session.user.id)
    const posMap = {}
    for (const p of pos || []) posMap[p.market_id] = p
    setPositions(posMap)
    setLoading(false)
  }

  if (groupLoading) return <Spinner />

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <p className="text-gray-400">You're not in a group yet.</p>
        <button onClick={() => navigate('/onboarding')} className="btn-primary">Join or Create a Group</button>
      </div>
    )
  }

  const filtered = markets.filter(m => m.status === filter)

  return (
    <div>
      {/* Token balance */}
      <div className="card mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Your tokens</p>
          <p className="text-2xl font-bold text-green-400">{membership?.tokens?.toFixed(1) ?? '—'}</p>
        </div>
        <button onClick={() => navigate('/create')} className="btn-primary text-sm py-2">
          + New Bet
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['open', 'voting', 'resolved'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-16">
          {filter === 'open' ? (
            <>
              <p className="text-4xl mb-3">🎯</p>
              <p>No open markets yet.</p>
              <button onClick={() => navigate('/create')} className="btn-primary mt-4 text-sm">Create one</button>
            </>
          ) : <p>No {filter} markets.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <MarketCard key={m.id} market={m} userPosition={positions[m.id]} />
          ))}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
