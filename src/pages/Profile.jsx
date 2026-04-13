import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { getYesPrice, fmtPct } from '../lib/cpmm'

export default function Profile() {
  const { session, profile, signOut } = useAuth()
  const { membership, group } = useGroup()
  const [positions, setPositions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    loadData()
  }, [session])

  async function loadData() {
    setLoading(true)
    const [{ data: pos }, { data: txs }] = await Promise.all([
      supabase
        .from('positions')
        .select('*, markets(title, yes_pool, no_pool, status, resolution)')
        .eq('user_id', session.user.id)
        .gt('shares', 0)
        .order('markets(created_at)', { ascending: false }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ])
    setPositions(pos || [])
    setTransactions(txs || [])
    setLoading(false)
  }

  const openPositions = positions.filter(p => p.markets?.status === 'open' || p.markets?.status === 'voting')
  const resolvedPositions = positions.filter(p => p.markets?.status === 'resolved')

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-800 flex items-center justify-center text-xl font-bold">
          {profile?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg">{profile?.name || 'You'}</p>
          <p className="text-gray-400 text-sm">{session?.user?.email}</p>
        </div>
        <button onClick={signOut} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
          Sign out
        </button>
      </div>

      {/* Token balance */}
      <div className="card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Tokens</p>
        <p className="text-3xl font-bold text-green-400">{membership?.tokens?.toFixed(1) ?? '—'}</p>
        <p className="text-xs text-gray-500 mt-1">Resets on the 1st of each month</p>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Open positions */}
          {openPositions.length > 0 && (
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Open Positions</p>
              <div className="space-y-3">
                {openPositions.map(pos => {
                  const m = pos.markets
                  const prob = m ? (pos.side === 'YES' ? getYesPrice(m.yes_pool, m.no_pool) : 1 - getYesPrice(m.yes_pool, m.no_pool)) : 0
                  const currentValue = pos.shares * prob
                  const pnl = currentValue - pos.cost_basis
                  return (
                    <div key={pos.id}>
                      <p className="text-sm font-medium text-gray-200 line-clamp-1">{m?.title}</p>
                      <div className="flex justify-between mt-1 text-xs">
                        <span className={pos.side === 'YES' ? 'text-green-400' : 'text-red-400'}>
                          {pos.side} · {pos.shares.toFixed(2)} shares @ {fmtPct(prob)}
                        </span>
                        <span className={pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Transaction history */}
          {transactions.length > 0 && (
            <div className="card">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recent Activity</p>
              <div className="space-y-2.5">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm capitalize text-gray-300">{tx.note || `${tx.type}${tx.side ? ` ${tx.side}` : ''}`}</p>
                      <p className="text-xs text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-semibold tabular-nums text-sm ${tx.tokens_delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.tokens_delta >= 0 ? '+' : ''}{tx.tokens_delta.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {openPositions.length === 0 && transactions.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              <p className="text-3xl mb-2">🎯</p>
              <p>No bets yet. Head to the feed to start!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
