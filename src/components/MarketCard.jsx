import { useNavigate } from 'react-router-dom'
import { getYesPrice, fmtPct } from '../lib/cpmm'

const CATEGORY_EMOJI = {
  Food: '🍕', Fitness: '💪', Finance: '💰', Life: '🎲', Fun: '🎉',
}

const STATUS_BADGE = {
  open: 'bg-green-900/60 text-green-400',
  voting: 'bg-yellow-900/60 text-yellow-400',
  resolved: 'bg-gray-800 text-gray-400',
  cancelled: 'bg-gray-800 text-gray-500',
}

export default function MarketCard({ market, userPosition }) {
  const navigate = useNavigate()
  const yesProb = getYesPrice(market.yes_pool, market.no_pool)
  const noProb = 1 - yesProb
  const closeDate = new Date(market.close_date)
  const isExpired = closeDate < new Date()

  return (
    <button
      onClick={() => navigate(`/market/${market.id}`)}
      className="card w-full text-left hover:border-gray-700 active:bg-gray-800 transition-colors"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{CATEGORY_EMOJI[market.category] || '🎯'}</span>
          <p className="font-semibold text-sm leading-snug line-clamp-2">{market.title}</p>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[market.status]}`}>
          {market.status}
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-green-400">YES {fmtPct(yesProb)}</span>
          <span className="text-red-400">NO {fmtPct(noProb)}</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${yesProb * 100}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>{isExpired ? 'Closed' : `Closes ${closeDate.toLocaleDateString()}`}</span>
        {userPosition && (
          <span className={`font-medium ${userPosition.side === 'YES' ? 'text-green-400' : 'text-red-400'}`}>
            You: {userPosition.side} ({userPosition.shares.toFixed(1)} shares)
          </span>
        )}
      </div>
    </button>
  )
}
