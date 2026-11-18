# makefun-btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/mwhbonk/makefun-btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/mwhbonk/makefun-btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A dip-and-ride trading bot for Coinbase Wrapped BTC (cbBTC) on 1-minute bars, built for make.fun's "Race a BTC trading bot live for 24 hours" bounty ($250 in USDC).

The bot buys a 30-bar dip below -1.3% that is already bouncing (5-bar return above 0), then rides the move with a 0.7% trailing stop that only arms once the trade is already +1.0% in profit — so chop can't shake it out of a bounce that is still forming, while a real swing still gets its gains locked in. No fixed take-profit, stop loss -1.5%, max hold 480 bars, 30-bar cooldown after a sell, no entries in the last 60 bars. Long only, 100% of cash per trade, at most one position. Deterministic: decisions come from bar closes only — no clock, no randomness, no network, no files.

Backtest on the frozen dev window (exact harness cost model, fills at next open): +$13.80 net, 2 round trips, max drawdown 1.5%. The same parameters on two earlier frozen windows: +$12.20 net (20261117-0603, flat day) and +$10.68 net (20261115-0828, falling day, buy-and-hold -4.0%). Profitable on all three windows; buy-and-hold loses on two of them.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 (newline-delimited JSON on stdin/stdout) through the vendored shim in `vendor/makefun-bars.ts`. Grade it locally with the kit:

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=4eah64kh&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
