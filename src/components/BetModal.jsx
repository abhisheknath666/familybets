import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { calcBuy, fmtPct } from '../lib/cpmm'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'

export default function BetModal({ market, onClose, onBetPlaced }) {
  const { session } = useAuth()
  const { membership, refreshMembership } = useGroup()
  const [side, setSide] = useState('YES')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cost = parseFloat(amount) || 0
  const preview = cost > 0 ? calcBuy(market.yes_pool, market.no_pool, cost, side) : null
  const maxTokens = membership?.tokens || 0

  async function handleBet() {
    if (cost <= 0 || cost > maxTokens) return
    setLoading(true)
    setError('')

    // All writes in a sequence — ideally a DB function, but doing client-side for MVP
    try {
      // 1. Deduct tokens from user
      const { error: balErr } = await supabase
        .from('group_members')
        .update({ tokens: maxTokens - cost })
        .eq('user_id', session.user.id)
        .eq('group_id', market.group_id)
      if (balErr) throw balErr

      // 2. Update market pools
      const { error: mktErr } = await supabase
        .from('markets')
        .update({ yes_pool: preview.new_yes_pool, no_pool: preview.new_no_pool })
        .eq('id', market.id)
      if (mktErr) throw mktErr

      // 3. Upsert position (accumulate shares)
      const { data: existing } = await supabase
        .from('positions')
        .select('shares, cost_basis')
        .eq('user_id', session.user.id)
        .eq('market_id', market.id)
        .eq('side', side)
        .maybeSingle()

      const newShares = (existing?.shares || 0) + preview.shares
      const newCost = (existing?.cost_basis || 0) + cost

      const { error: posErr } = await supabase
        .from('positions')
        .upsert({ user_id: session.user.id, market_id: market.id, side, shares: newShares, cost_basis: newCost })
      if (posErr) throw posErr

      // 4. Record transaction
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        market_id: market.id,
        group_id: market.group_id,
        type: 'bet',
        tokens_delta: -cost,
        shares_delta: preview.shares,
        side,
      })

      await refreshMembership()
      onBetPlaced()
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-gray-900 rounded-t-3xl p-6 pb-8 border-t border-gray-800" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />

        <h2 className="font-bold text-lg mb-1 line-clamp-2">{market.title}</h2>
        <p className="text-gray-400 text-sm mb-4">You have <span className="text-white font-semibold">{maxTokens.toFixed(1)} tokens</span></p>

        {/* YES / NO toggle */}
        <div className="flex gap-3 mb-4">
          {['YES', 'NO'].map(s => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                side === s
                  ? s === 'YES' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <label className="label">Amount (tokens)</label>
          <div className="relative">
            <input
              className="input pr-16 text-lg"
              type="number"
              min="1"
              max={maxTokens}
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button
              onClick={() => setAmount(String(Math.floor(maxTokens)))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-semibold"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-gray-800 rounded-xl p-3 mb-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Shares received</span>
              <span className="font-semibold">{preview.shares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg price</span>
              <span className="font-semibold">{fmtPct(cost / preview.shares)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">New {side} probability</span>
              <span className={`font-semibold ${side === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
                {side === 'YES' ? fmtPct(1 - preview.new_no_pool / (preview.new_yes_pool + preview.new_no_pool))
                  : fmtPct(1 - preview.new_yes_pool / (preview.new_yes_pool + preview.new_no_pool))}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {cost > maxTokens && <p className="text-red-400 text-sm mb-3">Not enough tokens</p>}

        <button
          onClick={handleBet}
          disabled={loading || cost <= 0 || cost > maxTokens}
          className={side === 'YES' ? 'btn-yes w-full' : 'btn-no w-full'}
        >
          {loading ? 'Placing bet…' : `Bet ${cost > 0 ? cost : ''} tokens on ${side}`}
        </button>
      </div>
    </div>
  )
}
