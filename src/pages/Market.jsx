import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { getYesPrice, calcPayoutPerShare, fmtPct } from '../lib/cpmm'
import BetModal from '../components/BetModal'
import { friendlyError } from '../lib/errors'

export default function Market() {
  const { id } = useParams()
  const { session } = useAuth()
  const { group, members, refreshMembership } = useGroup()
  const navigate = useNavigate()

  const [market, setMarket] = useState(null)
  const [position, setPosition] = useState(null)
  const [allPositions, setAllPositions] = useState([])
  const [votes, setVotes] = useState([])
  const [userVote, setUserVote] = useState(null)
  const [showBet, setShowBet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    loadMarket()
    const sub = supabase
      .channel(`market-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets', filter: `id=eq.${id}` },
        payload => setMarket(prev => ({ ...prev, ...payload.new }))
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions', filter: `market_id=eq.${id}` },
        () => loadPositions()
      )
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [id])

  async function loadMarket() {
    const { data: m } = await supabase.from('markets').select('*').eq('id', id).single()
    setMarket(m)
    await loadPositions()
    await loadVotes()
    setLoading(false)
  }

  async function loadPositions() {
    const { data: pos } = await supabase.from('positions').select('*').eq('market_id', id)
    setAllPositions(pos || [])
    setPosition(pos?.find(p => p.user_id === session.user.id) || null)
  }

  async function loadVotes() {
    const { data: v } = await supabase.from('resolution_votes').select('*').eq('market_id', id)
    setVotes(v || [])
    setUserVote(v?.find(v => v.user_id === session.user.id) || null)
  }

  async function castVote(voteYes) {
    setVoting(true)
    await supabase.from('resolution_votes').upsert({ user_id: session.user.id, market_id: id, vote: voteYes })
    await loadVotes()

    // Check if majority reached — resolve if so
    const { data: allVotes } = await supabase.from('resolution_votes').select('vote').eq('market_id', id)
    const memberCount = members.length
    const yesVotes = allVotes.filter(v => v.vote).length
    const noVotes = allVotes.filter(v => !v.vote).length
    const majority = Math.floor(memberCount / 2) + 1

    if (yesVotes >= majority) await resolveMarket(true)
    else if (noVotes >= majority) await resolveMarket(false)

    setVoting(false)
  }

  async function resolveMarket(outcome) {
    setResolving(true)
    const winningSide = outcome ? 'YES' : 'NO'
    const loserSide = outcome ? 'NO' : 'YES'

    const winningPositions = allPositions.filter(p => p.side === winningSide)
    const totalWinningShares = winningPositions.reduce((sum, p) => sum + p.shares, 0)
    const payoutPerShare = calcPayoutPerShare(market.yes_pool, market.no_pool, winningSide, totalWinningShares)

    // Pay out each winner
    for (const pos of winningPositions) {
      const payout = pos.shares * payoutPerShare
      // Get current tokens
      const { data: mem } = await supabase
        .from('group_members')
        .select('tokens')
        .eq('user_id', pos.user_id)
        .eq('group_id', market.group_id)
        .single()

      await supabase.from('group_members')
        .update({ tokens: (mem?.tokens || 0) + payout })
        .eq('user_id', pos.user_id)
        .eq('group_id', market.group_id)

      await supabase.from('transactions').insert({
        user_id: pos.user_id,
        market_id: id,
        group_id: market.group_id,
        type: 'payout',
        tokens_delta: payout,
        shares_delta: -pos.shares,
        side: winningSide,
        note: `Resolved ${winningSide}`,
      })
    }

    // Mark market resolved
    await supabase.from('markets').update({
      status: 'resolved',
      resolution: outcome,
      resolved_at: new Date().toISOString(),
    }).eq('id', id)

    await refreshMembership()
    await loadMarket()
    setResolving(false)
  }

  if (loading || !market) return <Spinner />

  const yesProb = getYesPrice(market.yes_pool, market.no_pool)
  const noProb = 1 - yesProb
  const totalWinningShares = allPositions.filter(p => p.side === 'YES').reduce((s, p) => s + p.shares, 0)
  const payoutPerShare = calcPayoutPerShare(market.yes_pool, market.no_pool, 'YES', totalWinningShares)

  const yesVotes = votes.filter(v => v.vote).length
  const noVotes = votes.filter(v => !v.vote).length

  const canBet = market.status === 'open' && new Date(market.close_date) > new Date()
  const canVote = market.status === 'voting' || (market.status === 'open' && new Date(market.close_date) <= new Date())

  return (
    <div className="space-y-4 pb-4">
      <button onClick={() => navigate(-1)} className="text-gray-400 text-sm flex items-center gap-1">
        ← Back
      </button>

      {/* Market header */}
      <div className="card">
        <div className="flex items-start justify-between gap-2 mb-4">
          <h1 className="font-bold text-xl leading-tight">{market.title}</h1>
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
            market.status === 'open' ? 'bg-green-900/60 text-green-400' :
            market.status === 'voting' ? 'bg-yellow-900/60 text-yellow-400' :
            'bg-gray-800 text-gray-400'
          }`}>{market.status}</span>
        </div>

        {market.description && <p className="text-gray-400 text-sm mb-4">{market.description}</p>}

        {/* Big probability display */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-green-900/30 border border-green-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{fmtPct(yesProb)}</p>
            <p className="text-xs text-gray-400 mt-0.5">YES</p>
          </div>
          <div className="flex-1 bg-red-900/30 border border-red-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{fmtPct(noProb)}</p>
            <p className="text-xs text-gray-400 mt-0.5">NO</p>
          </div>
        </div>

        {/* Probability bar */}
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${yesProb * 100}%` }} />
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>Closes {new Date(market.close_date).toLocaleDateString()}</span>
          <span>Pool: {(market.yes_pool + market.no_pool).toFixed(0)} tokens</span>
        </div>
      </div>

      {/* Resolution criteria */}
      <div className="card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Resolution criteria</p>
        <p className="text-sm text-gray-300">{market.resolution_criteria}</p>
      </div>

      {/* Your position */}
      {position && (
        <div className="card border-green-800/40">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your position</p>
          <div className="flex justify-between">
            <div>
              <span className={`font-bold text-lg ${position.side === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
                {position.side}
              </span>
              <span className="text-gray-400 text-sm ml-2">{position.shares.toFixed(2)} shares</span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Cost basis</p>
              <p className="font-semibold">{position.cost_basis.toFixed(1)} tokens</p>
            </div>
          </div>
        </div>
      )}

      {/* Bet button */}
      {canBet && (
        <button onClick={() => setShowBet(true)} className="btn-primary w-full text-base py-3">
          Place Bet
        </button>
      )}

      {/* Resolution voting */}
      {canVote && market.status !== 'resolved' && (
        <div className="card">
          <p className="font-semibold mb-1">Vote on outcome</p>
          <p className="text-xs text-gray-500 mb-3">{market.resolution_criteria}</p>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => castVote(true)}
              disabled={voting || !!userVote}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                userVote?.vote === true ? 'bg-green-600 text-white' : 'btn-secondary'
              }`}
            >
              YES ({yesVotes})
            </button>
            <button
              onClick={() => castVote(false)}
              disabled={voting || !!userVote}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                userVote?.vote === false ? 'bg-red-600 text-white' : 'btn-secondary'
              }`}
            >
              NO ({noVotes})
            </button>
          </div>
          {userVote && <p className="text-xs text-gray-500 text-center">Vote cast — resolves when majority is reached</p>}
        </div>
      )}

      {/* Resolved result */}
      {market.status === 'resolved' && (
        <div className={`card text-center border ${market.resolution ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
          <p className="text-3xl mb-1">{market.resolution ? '✅' : '❌'}</p>
          <p className="font-bold text-lg">{market.resolution ? 'YES' : 'NO'}</p>
          <p className="text-gray-400 text-xs mt-1">Resolved {new Date(market.resolved_at).toLocaleDateString()}</p>
        </div>
      )}

      {/* All positions */}
      {allPositions.length > 0 && (
        <div className="card">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">All positions</p>
          <div className="space-y-2">
            {allPositions.map(pos => {
              const member = members.find(m => m.user_id === pos.user_id)
              return (
                <div key={pos.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{member?.profiles?.name || 'Unknown'}</span>
                  <span className={`font-semibold ${pos.side === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
                    {pos.side} · {pos.shares.toFixed(1)} shares
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showBet && <BetModal market={market} onClose={() => setShowBet(false)} onBetPlaced={loadMarket} />}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
