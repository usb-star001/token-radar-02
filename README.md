[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/usb-star001/token-radar-02/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/usb-star001/token-radar-02/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar — radar-3

A radar for pre-token protocols: which ones record no token yet, how much implied value
a token would carry, and whether farming each one is worth the cost.

Built for make.fun's **Build the best token launch radar** bounty
(`token-radar-01`), $1,325 in USDC, 1st place $1,000. This is the second entry from
this account; the first (radar-2, a TVL table with asserted category multiples) scored
68.4%. Radar-3 is a different model, built after studying what the leaderboard rewards.

## What it does

- Scores every rankable pre-token protocol in the snapshot (758 protocols, 40 on the
  watchlist, 198 rankable pre-token rows after excluding wrapped/staked products).
- Prices each one off the snapshot's own traded tokens — no asserted multiples.
- Gives each protocol a farm plan netted to the dollar, with a FARM / THIN / SKIP verdict.
- Shows the live-token protocols separately, with their market caps.

## The model — radar-3

```
implied = exp(a + b * ln(TVL))
```

`a` and `b` are fitted on every run by least squares on the snapshot's traded tokens
(the comparables: 110 of the 128 that record a token, a market cap and a TVL). On the
sealed snapshot of 2026-11-14 the fit is `ln(mcap) = 4.170 + 0.682 * ln(TVL)`,
R² 0.46. The other 18 traded tokens are set aside by a rule that names no protocol:
a versioned pool (its token is its parent's) or a market cap more than a hundredfold
from its TVL either way.

The curve is kept only because it survives two blind tests, recomputed on every run
and shown on the dashboard:

- **Leave-one-out**: 1.21 mean absolute log error, against 1.34 for a flat median
  multiple. Adding category, 7-day growth, age or chain-count terms each makes the
  held-out error worse (1.65, 1.63, 1.61, 1.65), so each stays out of the price.
- **Walk-forward**: fitted on the 41 traded tokens listed before 2024-02-09, tested on
  the 41 listed after: 1.11 against 1.28 for the flat multiple.

Every implied value carries a band (the middle half of traded tokens fetch
0.35×–3.06× the curve) and every rank carries a range from 200 bootstrap refits
(seeded, so two runs agree). Each row names the five traded tokens nearest it by
size — its price anchors.

Top of the board (snapshot 2026-11-14):

1. Sentora Curator — $176.3M implied
2. Steakhouse Financial — $176.1M implied
3. Gauntlet — $120.5M implied

## Farm plans — netted to the dollar

Each plan sizes its deposit from $100, $250, $500 or $1,000: the smallest that clears
the low end of the comparables' band is a FARM (102 rows), the smallest that clears
only the central estimate is a THIN (83), and a row no deposit up to $1,000 clears
is a SKIP (13). Expected value is pro-rata — 10% of the implied value (the share a
launch hands its farmers; Arbitrum handed its users 11.62% of supply) times the
deposit's share of the protocol's TVL. Cost is six transactions at the cheapest
chain's typical gas (November 2026), a $2 bridge fee, and the deposit's opportunity
cost at 5% a year over the hold (60/45/30 days by age).

The honest finding the triage makes plain: the biggest implied values are the worst
farms per dollar, because their TVL is already huge. The top of the board by implied
value is not the top by farm value.

## Run it

Node 22, standard library only, no network:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

That writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and
`dossier.json` into `out/`. Running it twice produces identical bytes.

## Dashboard

`dashboard/` is a static page (no network, no external assets): a sortable table,
search, category, chain, TVL, verdict and watchlist filters, a detail view per
protocol with the full model breakdown, its five price anchors and its netted farm
plan, a live-token tab, the blind-test table, and the comparables table.

## License

MIT. See [LICENSE](LICENSE).
