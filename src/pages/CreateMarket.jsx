import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'
import { INITIAL_LIQUIDITY } from '../lib/cpmm'

const CATEGORIES = ['Food', 'Fitness', 'Finance', 'Life', 'Fun']
const CATEGORY_EMOJI = { Food: '🍕', Fitness: '💪', Finance: '💰', Life: '🎲', Fun: '🎉' }

const EXAMPLES = [
  'Who will break their diet first?',
  'Will Jake finish his home renovation by June?',
  'Will Mum remember everyone\'s birthday this year?',
  'Who will be first to get a promotion?',
]

export default function CreateMarket() {
  const { session } = useAuth()
  const { group } = useGroup()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Fun')
  const [closeDate, setCloseDate] = useState('')
  const [criteria, setCriteria] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Min close date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function handleSubmit(e) {
    e.preventDefault()
    if (!group) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase.from('markets').insert({
      group_id: group.id,
      creator_id: session.user.id,
      title,
      description: description || null,
      category,
      close_date: new Date(closeDate).toISOString(),
      resolution_criteria: criteria,
      yes_pool: INITIAL_LIQUIDITY,
      no_pool: INITIAL_LIQUIDITY,
      status: 'open',
    }).select().single()

    if (error) { setError(error.message); setLoading(false); return }
    navigate(`/market/${data.id}`)
  }

  if (!group) return (
    <div className="text-center py-16 text-gray-400">
      <p>Join a group first to create markets.</p>
    </div>
  )

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">New Market</h1>

      {/* Examples for inspiration */}
      <div className="mb-5">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ideas</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setTitle(ex)}
              className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Question *</label>
          <input
            className="input"
            placeholder="Who will break their diet first?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </div>

        <div>
          <label className="label">Description (optional)</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Add context or rules…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  category === c ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {CATEGORY_EMOJI[c]} {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Close date *</label>
          <input
            className="input"
            type="date"
            min={minDate}
            value={closeDate}
            onChange={e => setCloseDate(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Betting stops on this date. Voting opens next.</p>
        </div>

        <div>
          <label className="label">Resolution criteria *</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="How will we know who wins? E.g. 'Whoever is first seen eating fast food after the bet starts.'"
            value={criteria}
            onChange={e => setCriteria(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={loading}>
          {loading ? 'Creating…' : 'Create Market'}
        </button>
      </form>
    </div>
  )
}
