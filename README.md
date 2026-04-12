# FamilyBets

A private prediction market for family and friends. Think Kalshi, but for "who breaks their diet first." No real money — just tokens and bragging rights.

## Concept

Everyone in a group starts with 100 tokens each month. Anyone can create a market, everyone bets, and tokens redistribute when the outcome resolves. Leaderboard tracks monthly and all-time performance.

---

## Core Mechanics

- Every user starts with **100 tokens** per month (resets on the 1st)
- Anyone can **create a market** with a question, close date, and resolution criteria
- Betting uses a **Constant Product Market Maker (CPMM)** — price shifts dynamically as people bet
- Markets resolve via **majority vote** among group members (24–48hr voting window after close)
- Tokens redistribute to winning shareholders on resolution
- Open positions at month-end are marked-to-market before reset

### CPMM Pricing

Each market has a YES pool and NO pool. Invariant: `yes_pool × no_pool = k`

- Initial liquidity seeded 50/50 at market creation (k = 2500)
- **Price of YES** = `no_pool / (yes_pool + no_pool)`
- Buying YES with `c` tokens: `new_yes_pool = k / (no_pool + c)`, shares = `old_yes_pool − new_yes_pool`
- Early bettors get better odds; price shifts as more people bet
- On resolution, winning shares pay out proportionally from the losing pool

---

## Features

### Markets
- Create: title, description, category, close date, resolution criteria
- Categories: Food · Fitness · Finance · Life · Fun
- States: `open → voting → resolved | cancelled`

### Betting
- Tap YES or NO, enter token amount
- See probability shift and potential payout before confirming
- Live price updates as others bet (Supabase Realtime)

### Resolution
- After close date, 24–48hr voting window opens for all group members
- Majority vote wins; ties go to market creator's vote
- Tokens redistribute automatically on resolution

### Leaderboard
- **Monthly:** net tokens earned in current month
- **All-time:** cumulative net tokens across all months
- Stats: win rate, biggest win, markets created, markets bet

### Groups
- Invite-only with a 6-character join code
- Share invite link to add members

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + Tailwind CSS (PWA, mobile-first) |
| Backend | Supabase (Postgres + Auth + Realtime + Edge Functions) |
| Hosting | Vercel |
| Real-time | Supabase Realtime — live market prices and activity feed |

---

## Data Model

```
users
  id, name, avatar_url, created_at

groups
  id, name, join_code (6-char), created_by, created_at

group_members
  user_id, group_id, tokens, joined_at

markets
  id, group_id, creator_id, title, description, category
  close_date, resolution_criteria
  status: open | voting | resolved | cancelled
  yes_pool, no_pool
  resolution: YES | NO | null
  resolved_at, created_at

positions
  id, user_id, market_id, side (YES/NO), shares, cost_basis

transactions
  id, user_id, market_id, type (bet | payout | reset | refund)
  tokens_delta, shares_delta, created_at

resolution_votes
  id, user_id, market_id, vote (YES/NO), created_at

leaderboard_snapshots
  id, user_id, group_id, month (YYYY-MM)
  tokens_earned, win_rate, biggest_win, markets_bet
```

---

## Screens

1. **Home / Feed** — active markets sorted by close date, live activity ticker
2. **Market Detail** — probability display, YES/NO bet UI, comments, resolution vote
3. **Create Market** — title, category, close date, resolution criteria
4. **Leaderboard** — monthly / all-time toggle
5. **Profile** — your open positions, token history, stats
6. **Group** — member list, join code, invite link

---

## Roadmap

### v1 (MVP)
- [x] Spec
- [ ] Supabase setup — schema, auth, RLS policies
- [ ] Group creation + join flow
- [ ] Market creation + CPMM betting engine
- [ ] Resolution voting + payout logic
- [ ] Monthly reset + leaderboard snapshots
- [ ] React PWA — all 6 screens
- [ ] Real-time price + activity updates
- [ ] Deploy (Vercel + Supabase)

### v2
- [ ] Multiple groups per user
- [ ] Push notifications
- [ ] Price history charts
- [ ] Admin override on resolution disputes
- [ ] Market categories / filtering
