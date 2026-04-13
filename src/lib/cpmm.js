/**
 * Constant Product Market Maker for binary prediction markets.
 * Invariant: yes_pool * no_pool = k
 */

export const INITIAL_LIQUIDITY = 50 // each side starts with 50 tokens

/**
 * Current probability of YES (0–1)
 */
export function getYesPrice(yes_pool, no_pool) {
  return no_pool / (yes_pool + no_pool)
}

/**
 * Current probability of NO (0–1)
 */
export function getNoPrice(yes_pool, no_pool) {
  return yes_pool / (yes_pool + no_pool)
}

/**
 * Calculate shares received and new pool state for a bet.
 * @param {number} yes_pool
 * @param {number} no_pool
 * @param {number} cost  - tokens to spend
 * @param {'YES'|'NO'} side
 * @returns {{ shares: number, new_yes_pool: number, new_no_pool: number, price_before: number, price_after: number }}
 */
export function calcBuy(yes_pool, no_pool, cost, side) {
  const k = yes_pool * no_pool
  const price_before = side === 'YES' ? getYesPrice(yes_pool, no_pool) : getNoPrice(yes_pool, no_pool)

  let new_yes_pool, new_no_pool, shares

  if (side === 'YES') {
    new_no_pool = no_pool + cost
    new_yes_pool = k / new_no_pool
    shares = yes_pool - new_yes_pool
  } else {
    new_yes_pool = yes_pool + cost
    new_no_pool = k / new_yes_pool
    shares = no_pool - new_no_pool
  }

  const price_after = side === 'YES' ? getYesPrice(new_yes_pool, new_no_pool) : getNoPrice(new_yes_pool, new_no_pool)

  return { shares, new_yes_pool, new_no_pool, price_before, price_after }
}

/**
 * Calculate payout per share on resolution.
 * Total pot (yes_pool + no_pool) is split among winning shareholders.
 * @param {number} yes_pool
 * @param {number} no_pool
 * @param {'YES'|'NO'} winning_side
 * @param {number} total_winning_shares - sum of all shares on winning side across all users
 * @returns {number} tokens per share
 */
export function calcPayoutPerShare(yes_pool, no_pool, winning_side, total_winning_shares) {
  if (total_winning_shares <= 0) return 0
  const total_pot = yes_pool + no_pool
  return total_pot / total_winning_shares
}

/**
 * Mark-to-market value of a position (used for monthly reset).
 * @param {number} shares
 * @param {'YES'|'NO'} side
 * @param {number} yes_pool
 * @param {number} no_pool
 * @returns {number} estimated token value
 */
export function markToMarket(shares, side, yes_pool, no_pool) {
  const price = side === 'YES' ? getYesPrice(yes_pool, no_pool) : getNoPrice(yes_pool, no_pool)
  return shares * price
}

/**
 * Format probability as percentage string.
 */
export function fmtPct(p) {
  return `${Math.round(p * 100)}%`
}
