// Dip-and-ride bot for cbBTC (CBBTC/USDC), 1-minute bars. v3.
//
// Yesterday's v2 (30-bar dip below -1.2% that is already bouncing, 0.8%
// trailing stop from the first tick, stop -1.5%, max hold 480) made +$12.20
// on its dev window but LOSES -$2.63 on this competition's dev window
// (a falling day: buy-and-hold -2.8%, range 3.35%). The unarmed trailing
// stop sold the real bounce too early in the chop, while removing the
// trail entirely fixed this window (+$13.80) but collapsed the earlier
// falling window from +$17.28 to +$1.05. v3 keeps the trail but ARMS it:
// it only starts trailing once the trade is already +1.0% in profit, so
// chop cannot shake the bot out of a bounce that is still forming, while
// a real swing still gets its gains locked in.
//
// Official kit grade-local on this comp's dev window confirms the
// backtest exactly: net PnL +$13.795627, 2 trades, win rate 100%,
// max drawdown 1.50%, fees $0.81, guardrails compliant, and the two
// runs reproduced byte-for-byte (action log 915a2de5...). Re-grade
// after any edit: the action-log hash must stay identical unless the
// logic itself changed.
//
// Validated with the exact harness cost model (fill at next open, 4 bps
// fee + 2 bps slippage + pool impact) on THREE frozen 24h windows:
//   - this comp's dev window (falling, B&H -2.8%):  +$13.80 net, 2 trades, max DD 1.5%
//   - 20261117-0603 dev window (flat, B&H +0.49%): +$12.20 net, 2 trades, max DD 0.6%
//   - 20261115-0828 dev window (falling, B&H -4.0%): +$10.68 net, 4 trades, max DD 3.8%
// Worst window +$10.68, median +$12.20, total +$36.68. Neighbouring
// parameters (dip -1.3%/-1.4%, trail 0.7%, arm 1.0%-1.2%, stop -1.5%/-1.6%)
// give the same trades and the same PnL, so this is a plateau, not a
// spike fitted to one window. Buy-and-hold loses on two of the three
// windows; v3 is profitable on all three while staying in cash through
// the chop instead of holding a falling market.
//
// Rules: one entry only — a 30-bar dip below -1.3% that is already
// bouncing (5-bar return above 0). No momentum trigger: breakouts
// mean-revert in all three windows and lose money. No fixed
// take-profit: the armed trailing stop rides a real swing instead of
// banking a few bps. Stop loss -1.5%, max hold 480 bars, 30-bar
// cooldown after any sell, no entries in the last 60 bars.
// Deterministic: decisions come from bar closes only; no clock, no
// randomness, no network, no files. Money math is integer (bigint);
// ratios are float64 on closes only, so the same bars give the same
// orders run after run.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
// 1.0% max slippage from the latest close. The modelled slippage plus
// impact on a fill is ~6-13 bps and the largest 1-minute move in any dev
// window is under 0.8%, so 1% never binds on normal bars -- but it rejects
// a fill if the next open gaps sharply away from the close the order was
// decided on, instead of chasing a gap.
const MAX_SLIPPAGE_BPS = 100;
const DIP_LOOKBACK = 30;
const DIP_DROP = -0.013;
const BOUNCE_5 = 0.0;
const TRAIL = 0.007;
const TRAIL_ARM = 0.01;
const STOP_LOSS = -0.015;
const MAX_HOLD = 480;
const COOLDOWN = 30;
const NO_ENTRY_LAST_BARS = 60;

const closes: number[] = [];
let entryPrice = 0;
let bestClose = 0;
let holdBars = 0;
let lastSellSeq = -1000000;

function ret(now: number, then: number): number {
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState) {
    const bar = state.latest.get(SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    closes.push(close);
    const i = closes.length - 1;
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      holdBars += 1;
      if (close > bestClose) bestClose = close;
      const unrealised = ret(close, entryPrice);
      // The trail only arms once the trade is TRAIL_ARM in profit. Before
      // that, ordinary chop cannot trigger an exit: the stop loss and the
      // max-hold cap are the only ways out of a trade that never got going.
      const armed = bestClose > entryPrice && ret(bestClose, entryPrice) >= TRAIL_ARM;
      const trailDown = armed && ret(close, bestClose) <= -TRAIL;
      if (trailDown || unrealised <= STOP_LOSS || holdBars >= MAX_HOLD) {
        lastSellSeq = state.seq;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    if (i < DIP_LOOKBACK) return [];
    if (state.seq - lastSellSeq < COOLDOWN) return [];
    // No total-bar count in hello; 1440 bars per window, so stop entering
    // once 1380 closes have been seen (the last 60 bars).
    if (closes.length > 1440 - NO_ENTRY_LAST_BARS) return [];

    const dipped = ret(close, closes[i - DIP_LOOKBACK]) < DIP_DROP;
    const bouncing = ret(close, closes[i - 5]) > BOUNCE_5;
    if (!dipped || !bouncing) return [];

    const cash = state.cash;
    if (cash <= 0n) return [];
    const room = state.weightRoom(SYMBOL);
    const notional = cash < room ? cash : room;
    if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    entryPrice = close;
    bestClose = close;
    holdBars = 0;
    const orders: OrderInput[] = [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    return orders;
  },
});
