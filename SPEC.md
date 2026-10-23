# Run or Rest: Specification

Repository `run-or-rest`, Python package `run_or_rest`.

This file defines what gets built. Agents build only what is written here; anything else is out of scope. Changes to this file need the human's approval.

## 1. The question

For a bitcoin mining fleet buying power at the ERCOT West load zone real-time price, June 1 to September 30, 2026:

1. Which curtailment rule made the most money: always on, strike price, or strike price plus peak guard?
2. How much of each rule's gain came from avoiding high power prices, and how much from avoiding 4CP transmission charges?
3. How many hours was each rule switched off?

### Glossary

| Term | Meaning in this project |
| --- | --- |
| Index pricing | The miner pays the live wholesale price for each 15-minute interval, not a fixed contract rate |
| ERCOT | The grid operator for most of Texas |
| LZ_WEST | ERCOT's West load zone. Loads in a zone settle at its real-time price, so this is the price the fleet pays |
| Hub (e.g. HB_WEST) | A trading reference point used to price contracts; not where loads settle |
| Settlement point price (SPP) | ERCOT's price for a location and interval, in USD per MWh |
| System load | Total ERCOT electricity demand, in MW |
| MW, MWh | Power (rate) and energy (power over time); 1 MW for 15 minutes is 0.25 MWh |
| Curtail | Switch the fleet off to avoid cost |
| Breakeven | The power price at which an interval's mining revenue exactly equals its energy cost |
| 4CP | ERCOT's four coincident peaks: the highest 15-minute system load in each of June, July, August and September. A customer's load during those four intervals sets its next year's transmission charge |
| Interval | One 15-minute period, identified by its UTC start time; the unit every decision and price applies to |
| H/s, TH/s | Hashes per second; 1 TH/s is 10^12 H/s |
| Efficiency (J/TH) | Joules of energy a machine uses per terahash; lower is better. 1 J/TH equals 1 W per TH/s |
| Hashrate | Hashes per second the fleet computes |
| Difficulty | The network's mining target. On average a block takes difficulty × 2^32 hashes to find |
| Bits | The compact encoding of a block's target in its header; difficulty is computed from it with `Decimal`, never a float |
| Expected blocks | Blocks the fleet would find on average in a period: its hashes divided by the hashes one block takes. Usually a tiny fraction |
| Subsidy, fees | The new BTC in each block, and the transaction fees paid to its miner |
| Block reward | Subsidy plus fees for one block |
| Sats | Satoshis; 1 BTC = 100,000,000 sats. The smallest unit of bitcoin |
| Pool fee | The share of rewards a mining pool keeps (default in section 10) |
| Negative price | A power price below zero: consumers are paid to use power, usually when wind and solar exceed demand |
| FPPS | A pool payout method that pays miners their expected share of subsidy and fees, regardless of the pool's luck |
| Decision information | What the miner knew at the start of an interval (section 3.7) |
| Settlement information | What actually happened in that interval (section 3.7) |
| Hashprice | What 1 PH/s of hashrate earns in one day, in USD, after the pool fee (section 3.9). The number miners use to compare revenue across days |
| Difficulty adjustment | A change of difficulty, every 2,016 blocks (about two weeks), that keeps blocks about 10 minutes apart. Higher difficulty means fewer expected blocks for the same hashrate |
| Transmission charge | The part of a power bill that pays for the grid's wires. In ERCOT it is set by the customer's load during the 4CP intervals |

## 2. Deliverables

- Three fetch scripts: Grid Status (prices, load), Bitcoin node (chain data), Coin Metrics (BTC price)
- Pure Python core: economics, strategies, 4CP, backtest
- Data layer: loads files with Polars, validates rows into typed values for the core
- One FastAPI endpoint: `GET /api/backtest` (section 8)
- One React page (section 9)
- Guardrails (section 12), run by `make verify` and `make verify-ci`
- `README.md` and `CLAUDE.md` (contains only `@AGENTS.md`): both human-owned

## 3. Domain model and formulas

Each formula is a small pure function in `core/` with its own unit tests. The examples are the first test cases.

### 3.1 Types and units

| Quantity | Type | Unit |
| --- | --- | --- |
| BTC amounts | `Sats` (`NewType` over `int`) | satoshis; 1 BTC = 100,000,000 sats |
| USD amounts | `Decimal` | full precision internally |
| Power price | `Decimal` | USD per MWh |
| System load | `Decimal` | MW |
| Fleet size | `Decimal` | MW |
| Efficiency | `Decimal` | J/TH |
| Hashrate | `int` | hashes per second |
| Difficulty | `Decimal` | computed from `bits` (section 6.3); never from the node's floating-point `difficulty` field |
| Timestamps | timezone-aware `datetime` | UTC |
| Interval decision | `Decision` enum | `RUN`, `OFF` |
| Strategy | `StrategyId` enum | `ALWAYS_ON`, `STRIKE_PRICE`, `STRIKE_PEAK_GUARD` |

No floats for money, BTC, prices, load or difficulty.

### 3.2 Fleet hashrate

hashrate_hs = floor(fleet_mw × 10^6 × 10^12 / efficiency_j_per_th)

Watts divided by J/TH gives TH/s; × 10^12 converts TH/s to H/s.

Example: 1 MW at 25 J/TH = 40,000 TH/s = 40,000,000,000,000,000 H/s.

### 3.3 Expected blocks (FPPS)

expected_blocks = hashrate_hs × seconds / (difficulty × 2^32)

One interval is 900 seconds.

Example: 4,294,967,296 H/s (2^32) for 900 seconds at difficulty 900 = 1 block.

### 3.4 Interval mining revenue

reward_per_block_sats = (day_subsidy_sats + day_fees_sats) / day_block_count, as an unrounded `Decimal`

net_sats = floor(expected_blocks × reward_per_block_sats × (1 − pool_fee_rate))

revenue_usd = net_sats × btc_price_usd / 100,000,000

The day totals come from `chain_daily.csv` and `btc_price_usd` from `btc_price_daily.csv` (section 6.3); which day's values apply is set in section 3.7.

Example: 1 expected block, reward 317,500,000 sats, 2% pool fee: 311,150,000 sats. At $100,000/BTC: $311,150.00.

### 3.5 Interval energy cost

energy_cost_usd = fleet_mw × 0.25 × price_usd_per_mwh

Examples: 1 MW at $40/MWh = $10.00. At −$20/MWh = −$5.00 (the miner is paid to consume).

### 3.6 Breakeven price

breakeven_usd_per_mwh = revenue_usd (section 3.4, including its floor) / (fleet_mw × 0.25)

Example: $25.00 interval revenue at 1 MW = $100.00/MWh.

### 3.7 Decision vs settlement

- **Settlement** (what happened): revenue uses the difficulty in effect at the interval's start, and its UTC day's reward per block and BTC price; energy cost uses the interval's own price.
- **Decision** (what the miner knew at the start of the interval): the most recent previous price, the most recent previous system load, and the breakeven estimate (section 3.6, using the previous UTC day's BTC price and reward per block, and the difficulty in effect at the interval's start).

Strategies see only decision information.

### 3.8 Model assumptions

The UI shows exactly this list:

1. The fleet pays the LZ_WEST real-time settlement point price for every interval it runs (index pricing).
2. The pool pays FPPS: the expected share of subsidy and fees every interval, regardless of luck.
3. The fleet switches fully on or off instantly; no partial load.
4. The full next-year 4CP transmission charge is attributed to this season.
5. Excluded: hardware, hosting and staffing costs; demand response and ancillary service payments; retail adders and other bill components.

### 3.9 Hashprice

hashprice_usd_per_ph_day = revenue_usd (section 3.4) of net_sats (section 3.4) for expected_blocks (section 3.3) at 10^15 H/s for 86,400 seconds

It uses the same difficulty, reward per block, pool fee and BTC price as the row it belongs to (section 3.10). It explains the breakeven line; strategies never use it.

Example: difficulty 20,599,365,234,375 (27 × 5^17): 10^15 H/s for 86,400 seconds is 0.0009765625 expected blocks (1/1024). Reward 320,000,000 sats per block, 2% pool fee: 306,250 sats. At $80,000/BTC: $245.00 per PH/s per day.

### 3.10 Bitcoin inputs by day

For each UTC day that holds at least one window interval, one row:

- `btc_price_usd`, `reward_per_block_sats` (section 3.4): the UTC day's values
- `difficulty`: the difficulty used by the day's first window interval
- `fees_share` = fees_sats / (subsidy_sats + fees_sats), the UTC day's totals
- `hashprice_usd_per_ph_day` (section 3.9) from the values above

Example (`fees_share`): subsidy 312,500,000 sats, fees 2,500,000 sats: 0.0079 (to 4 places).

### 3.11 Difficulty adjustments

One entry for the difficulty in effect at the first window interval, then one for every window interval whose difficulty differs from the previous window interval's. Each has the interval's start, the difficulty, and change_ratio = difficulty / previous difficulty − 1. The first entry has no previous difficulty; its change_ratio is null.

Example: 100 then 110: change_ratio 0.1000.

## 4. Strategies

Each strategy returns `RUN` (full load) or `OFF` (zero load) for every window interval. Strategies are plain functions of a `DecisionContext`, which core builds for each window interval:

| Field | Meaning |
| --- | --- |
| `previous_price_usd_per_mwh` | Price of the most recent earlier interval that has a price |
| `previous_load_mw` | Load of the most recent earlier interval that has a load |
| `breakeven_estimate_usd_per_mwh` | Section 3.7 |
| `previous_month_peak_mw` | Highest load in the previous Chicago calendar month |
| `month_to_date_peak_mw` | Highest load in the current Chicago calendar month, up to and including the previous interval; zero for the month's first interval |
| `peak_guard_threshold` | From the request |

Earlier intervals include the history intervals (section 6.1). If no earlier price or load exists, the backtest fails with a clear error.

| Id | Label | Returns `OFF` when |
| --- | --- | --- |
| `always_on` | Always on | never |
| `strike_price` | Strike price | previous price > breakeven estimate |
| `strike_peak_guard` | Strike + peak guard | strike price says off, or the peak guard fires |

### 4.1 Peak guard

reference_mw = max(previous_month_peak_mw, month_to_date_peak_mw)

Fires when previous_load_mw ≥ peak_guard_threshold × reference_mw.

Month peaks use every interval that has a load value, including intervals skipped for a missing price.

Example: previous month peak 80,000 MW, threshold 0.95: fires at 76,000 MW or more.

### 4.2 Worked day

One day of 96 intervals at 1 MW. Running any interval earns $25.00, so the breakeven estimate is $100.00/MWh throughout. The interval before the day was $40/MWh, so interval 0 decides on $40. Intervals 0 to 39: $40. Intervals 40 to 55: $500. Intervals 56 to 95: $40. The example tests the strike price lag only: the transmission rate is 0, and the table shows only the two strategies it checks.

| Strategy | Revenue | Energy cost | Net | Intervals off |
| --- | --- | --- | --- | --- |
| Always on | $2,400.00 | $2,800.00 | −$400.00 | 0 |
| Strike price | $2,000.00 | $915.00 | $1,085.00 | 16 (41 to 56) |

The strike rule reacts one interval late: interval 40 runs at $500 ($125.00) and interval 56 is off at $40. Energy cost: 79 × $10.00 + $125.00 = $915.00.

## 5. 4CP and the gain split

### 5.1 Peaks

For each Chicago calendar month in the window (June to September for the real window), the 4CP peak is the window interval with the highest ERCOT system load; on a tie, the earliest. A month's 4CP peak is never used for decisions within that month.

### 5.2 Transmission charge

transmission_usd = transmission_rate_usd_per_mw_year × fleet_mw × (peak intervals running / peak months in the window)

Peak intervals running is how many of the window's 4CP peak intervals the strategy decided `RUN` in. The real window has four peak months.

Example: $50,000/MW-year, 1 MW, running at 1 of 4 peaks: $12,500. At all 4: $50,000.

charge_per_peak_usd = transmission_rate_usd_per_mw_year × fleet_mw / peak months in the window: what running at one peak interval costs. Example: $50,000/MW-year, 1 MW, 4 peak months: $12,500.

### 5.3 Totals, gains and winner

Per strategy, over all non-skipped window intervals:

- revenue_usd, energy_cost_usd: sums of the interval values; an `OFF` interval contributes zero to both
- mined_sats: sum of each interval's net_sats (section 3.4); an `OFF` interval contributes zero
- hours_off = intervals with decision `OFF` × 0.25
- net_profit_usd = revenue − energy_cost − transmission

For strategy s against always_on a:

- price_gain = (energy_cost_a − energy_cost_s) − (revenue_a − revenue_s)
- fourcp_gain = transmission_a − transmission_s
- total_gain = net_s − net_a, which must equal price_gain + fourcp_gain exactly

These identities hold on unrounded values; core tests check them there.

Winner: highest net profit. Exact tie: the earlier of always_on, strike_price, strike_peak_guard.

## 6. Data

### 6.1 Ranges

- **Window:** 2026-06-01 00:00 to 2026-10-01 00:00 America/Chicago. No daylight saving change falls inside, so there are exactly 122 × 96 = 11,712 window intervals.
- **History:** 2026-05-01 00:00 Chicago up to the window start. History intervals supply previous values and May's peak; they are never settled or shown.
- **Daily data:** UTC dates 2026-05-31 through 2026-10-01 inclusive.

### 6.2 Sources

| File | Source | Script | Committed | Terms |
| --- | --- | --- | --- | --- |
| `data/raw/ercot_spp_lz_west.parquet` | Grid Status `ercot_spp_real_time_15_min`, location `LZ_WEST` | `fetch_grid.py` | No | Grid Status Terms of Use: internal use and derived works; attribution required |
| `data/raw/ercot_load.parquet` | Grid Status `ercot_load` | `fetch_grid.py` | No | Same |
| `data/chain_daily.csv` | Own Bitcoin Core node (v31.1), RPC | `fetch_chain.py` | Yes | Public chain data |
| `data/difficulty_epochs.csv` | Own Bitcoin Core node (v31.1), RPC | `fetch_chain.py` | Yes | Public chain data |
| `data/btc_price_daily.csv` | Coin Metrics Community API `asset-metrics`, `PriceUSD` | `fetch_price.py` | Yes | CC BY-NC 4.0; attribution required |

### 6.3 File schemas

`ercot_spp_lz_west.parquet`: `interval_start_utc` (UTC timestamp), `price_usd_per_mwh` (decimal string, 2 places).

`ercot_load.parquet`: `interval_start_utc` (UTC timestamp), `load_mw` (decimal string, 2 places).

`chain_daily.csv`: `date_utc` (YYYY-MM-DD), `block_count` (int), `subsidy_sats` (int, day total), `fees_sats` (int, day total).

`difficulty_epochs.csv`: one row per difficulty period: `start_time_utc` (timestamp of the period's first block), `height` (that block's height), `bits` (8 hex characters). An interval uses the row with the latest `start_time_utc` at or before its start. difficulty = (0xffff × 256^26) / target, where target = mantissa × 256^(exponent − 3), exponent is the first byte of `bits` and mantissa the last three.

`btc_price_daily.csv`: `date_utc`, `price_usd` (decimal string).

### 6.4 Fetch scripts

- `fetch_grid.py`: reads `GRIDSTATUS_API_KEY` from the environment (exits with a clear message if missing); the Makefile loads it from `.env` if present; uses `gridstatusio`; fetches the history and window ranges; filters prices to `LZ_WEST`; averages load to 15-minute intervals by start time if it is finer, and exits with a clear error if it is coarser; converts prices and load to decimal strings rounded to 2 places with ROUND_HALF_EVEN; writes the two Parquet files.
- `fetch_chain.py`: reads `BITCOIN_RPC_URL`, `BITCOIN_RPC_USER`, `BITCOIN_RPC_PASSWORD` and never logs them. Heights run from the last retarget height (a multiple of 2,016) at or before the first block with time ≥ 2026-05-31 00:00 UTC, to the last block with time < 2026-10-02 00:00 UTC. Per height: `getblockhash`, `getblockstats` with `["height", "time", "subsidy", "totalfee"]`, `getblockheader` for `bits`. Writes daily totals for the daily range, grouping blocks by the UTC date of their block time, and a difficulty row at the first height and whenever `bits` changes.
- `fetch_price.py`: requests `https://community-api.coinmetrics.io/v4/timeseries/asset-metrics` with `assets=btc`, `metrics=PriceUSD` and `frequency=1d` for the daily range, following `next_page_url` while present; writes each row's `time` (midnight UTC, e.g. `2026-05-31T00:00:00.000000000Z`) as `date_utc` (YYYY-MM-DD) and its `PriceUSD` as `price_usd`.

`fetch_chain.py` and `fetch_price.py` are run once by the human (`uv run python backend/scripts/<name>.py`), and their CSVs are committed. `make fetch` runs only `fetch_grid.py`, because Grid Status data is never committed.

The fetch scripts may use Polars and the floats returned by `gridstatusio`; every value they write is a decimal string. They are type-checked in Pyright standard mode, not strict, because their third-party libraries are not fully typed.

### 6.5 Loading and missing data

- Within `backend/src`, Polars is used only in `data/`. A malformed row fails loading with an error naming the file and row.
- The data layer returns history intervals (start, price or none, load or none) and window intervals, which add the difficulty in effect, the UTC day's and previous UTC day's chain totals, and the UTC day's and previous UTC day's BTC price.
- A missing daily row or difficulty row for any window interval fails loading with a clear error.
- A window interval missing its own price or load is skipped: no revenue, no cost, not counted in hours off, counted in `missing_intervals`. Never forward-filled.
- If any 4CP peak interval is missing a price, the backtest fails with a clear error.

## 7. Architecture

```
data files → data/ (Polars, validation) → core/ (pure) → api/ (FastAPI) → React page
```

| Layer | Does | Never does |
| --- | --- | --- |
| `data/` | Reads and validates files, attaches daily data and difficulty to window intervals | Domain math, decisions, silent defaults |
| `core/` | Every calculation and decision: rewards, revenue, cost, breakeven, decision contexts, decisions, peaks, 4CP, totals, gains, winner, missing-interval count | I/O, clock, environment, Polars, HTTP |
| `api/` | Validates parameters, calls core, maps results to response models | Calculates or decides anything |
| frontend | Fetches, formats, draws | Calculates money, decides the winner or decisions |

Data loads once at startup; the backtest runs per request, with no caching or storage. If either Grid Status Parquet file is missing, the app still starts and the endpoint returns `503`. If a committed CSV is missing, or any file is invalid (a malformed row, a missing daily or difficulty row), the app refuses to start and prints the error.

The data layer, core and app take the window and history start as inputs. `config.py` supplies the real values; tests pass short windows and small data.

### Required paths

Rules in this spec and in AGENTS.md refer to these paths, so they are fixed. Everything else is the builder's choice.

| Path | Holds |
| --- | --- |
| `backend/src/run_or_rest/core/` | Pure domain logic |
| `backend/src/run_or_rest/data/` | File loading and validation |
| `backend/src/run_or_rest/api/` | FastAPI app and response models |
| `backend/src/run_or_rest/config.py` | Every domain constant and default |
| `backend/scripts/` | Fetch scripts |
| `backend/tests/`, `backend/tests/fixtures/` | Tests and their data files |
| `backend/tools/` | Python guardrail checkers, their tests and canaries |
| `frontend/tools/` | TypeScript comment checker, its tests and canaries |
| `frontend/src/config.ts` | Frontend presentation constants |
| `frontend/src/api/schema.ts` | Generated API types |
| `data/`, `data/raw/` | Committed CSVs; gitignored Grid Status files |
| `.env.example` | Template for the gitignored `.env`: `GRIDSTATUS_API_KEY=` only |
| `.github/workflows/ci.yml`, `.github/CODEOWNERS` | CI and code owners |
| `backend/.python-version` (3.13), `frontend/.nvmrc` (Node 26) | Pinned runtimes |

## 8. API

### `GET /api/backtest`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `peak_guard_threshold` | decimal | 0.95 | 0.80 to 1.00, step 0.01 |

Response `200`. Every decimal is a string, rounded independently from its unrounded value with ROUND_HALF_EVEN: USD and prices to 2 places, `hours_off` to 2, `system_load_mw` to 1, threshold values to 2, `difficulty` to 0, `fees_share` and `change_ratio` to 4, `reward_per_block_sats` to 0. `assumptions` values are unrounded: the configured defaults, and the `peak_guard_threshold` used for this request. Sats are integers. Pydantic fields carry descriptions.

```json
{
  "period": {"start_utc": "...", "end_utc": "...", "settlement_point": "LZ_WEST"},
  "controls": {"peak_guard_threshold": {"min": "0.80", "max": "1.00", "step": "0.01", "default": "0.95"}},
  "assumptions": {
    "fleet_mw": "1",
    "efficiency_j_per_th": "15",
    "pool_fee_rate": "0.02",
    "transmission_rate_usd_per_mw_year": "50000",
    "peak_guard_threshold": "0.95"
  },
  "winner": {"id": "strike_peak_guard", "advantage_over_always_on_usd": "0.00"},
  "strategies": [
    {
      "id": "always_on",
      "label": "Always on",
      "revenue_usd": "0.00",
      "energy_cost_usd": "0.00",
      "transmission_usd": "0.00",
      "net_profit_usd": "0.00",
      "mined_sats": 0,
      "hours_off": "0.00",
      "peaks_running": 4,
      "gain_vs_always_on": {"price_usd": "0.00", "fourcp_usd": "0.00", "total_usd": "0.00"}
    }
  ],
  "fourcp": {
    "charge_per_peak_usd": "12500.00",
    "peaks": [
      {
        "month": "2026-06",
        "interval_start_utc": "...",
        "system_load_mw": "0.0",
        "price_usd_per_mwh": "0.00",
        "decisions": {"always_on": "run", "strike_price": "run", "strike_peak_guard": "off"}
      }
    ]
  },
  "bitcoin": {
    "daily": [
      {
        "date_utc": "2026-06-01",
        "btc_price_usd": "0.00",
        "difficulty": "0",
        "reward_per_block_sats": "0",
        "fees_share": "0.0000",
        "hashprice_usd_per_ph_day": "0.00"
      }
    ],
    "difficulty_adjustments": [{"start_utc": "...", "difficulty": "0", "change_ratio": null}]
  },
  "series": [
    {
      "interval_start_utc": "...",
      "price_usd_per_mwh": "0.00",
      "breakeven_estimate_usd_per_mwh": "0.00",
      "decisions": {"always_on": "run", "strike_price": "run", "strike_peak_guard": "off"}
    }
  ],
  "data_quality": {"expected_intervals": 11712, "missing_intervals": 0}
}
```

| Field | Meaning |
| --- | --- |
| `period` | The window's start and end in UTC (section 6.1) and the settlement point priced |
| `controls` | The allowed range, step and default of each request parameter; the UI builds its controls from these instead of copying the values |
| `assumptions` | The inputs this run used: the defaults in section 10 and the request's `peak_guard_threshold` |
| `winner` | The strategy with the highest net profit (section 5.3) and how much more it made than always on |
| `strategies` | One entry per strategy, in the order always_on, strike_price, strike_peak_guard: the totals in section 5.3, how many 4CP peak intervals it ran in (section 5.2), and `gain_vs_always_on` split into price, 4CP and total (zero for always_on itself) |
| `fourcp` | What running at one 4CP peak costs (section 5.2), and the 4CP peak intervals (section 5.1), one per peak month, with the system load, the price and each strategy's decision at each |
| `bitcoin` | The bitcoin inputs behind the breakeven line: one row per UTC day (section 3.10) and the difficulty adjustments (section 3.11) |
| `series` | One entry per non-skipped window interval: the actual price, the breakeven estimate the strategies decided on (section 3.7), and each strategy's decision |
| `data_quality` | Window intervals expected (11,712) and how many were skipped for missing data (section 6.5) |

These meanings are also the Pydantic field descriptions.

Errors: `422` for an out-of-range or off-step parameter; `503` with `{"detail": "Grid data not found. Run make fetch with GRIDSTATUS_API_KEY set."}` when a Grid Status data file is missing (section 7); `500` with a clear `detail` when a 4CP peak interval has no price.

## 9. UI

The audience knows bitcoin mining (hashrate, difficulty, hashprice, pools) but not the Texas grid. The page explains the grid side in plain words and shows the bitcoin inputs behind every result.

**Header:** title "Run or Rest", subtitle "ERCOT curtailment backtest for bitcoin miners"; chips for the period, the settlement point, and the fleet (`fleet_mw`, `efficiency_j_per_th`, `pool_fee_rate`). The page has one colour scheme, dark; there is no light scheme or toggle.

One page, top to bottom:

1. **Answer:** the label "Which rule made the most money this summer?", the winner's label, its advantage over always on as a signed amount ("+$32,739 net profit vs. always on"), and one sentence built from the winner's `hours_off`, `gain_vs_always_on.price_usd` and `gain_vs_always_on.fourcp_usd`: a negative price gain reads "gave up $X of mining margin", a positive one "saved $X on power", and a positive 4CP gain "avoided $Y of next year's transmission charge". Then a row with the winner's net profit, BTC mined, hours off, and 4CP peaks run in ("0 of 4").
   **4CP explainer** beside it: label "New to ERCOT?", heading "4CP: four 15-minute windows that set a year of transmission cost", and the static text: "Each summer month, ERCOT marks the single 15 minutes when Texas used the most power. How much your site draws in those four intervals sets next year's transmission charge." and "Every peak you run through costs this fleet {charge_per_peak_usd}. Nobody knows the exact peak in advance, so the peak guard powers down whenever demand gets close to the month's high." Then a callout "Peaks are not price spikes" that gives the lowest and highest price across the peaks and the text "A price-only rule cannot see a peak coming." When always on wins, the answer reads "Always on made the most money; neither curtailment rule beat it."
2. **Peak guard trigger:** Mantine slider using `controls.peak_guard_threshold` (min, max, step, default), the current value beside it, the helper text "Switch off when ERCOT demand reaches {value}% of the month's peak so far." with the current value, and end labels "off more" (min) and "off less" (max). A change refetches `/api/backtest` after 300 ms without further input and updates every section; while it loads, the sections dim and a status reads "Updating…".
3. **Strategy cards:** one card per strategy, in API order: its label, its description (table below) as visible text, net profit, change vs always on ("Baseline" for always on), hours off, BTC mined, and 4CP peaks run in. The winner's card has the accent border and a "Best" badge.
4. **Price chart (ECharts):** heading "Power price vs. mining breakeven", subtitle "LZ_WEST real-time price, $/MWh, Central time. Above the breakeven line, mining loses money." Price as a line, the breakeven estimate as a dashed reference line, each 4CP peak as a marker labelled "4CP · Jun 18". Range buttons "Season" and one per window month, plus zoom. Shaded bands mark the intervals the selected strategy decided `off` (legend "Miners off"); a segmented control "Show when the miners were off under" picks between the strategies that can switch off, defaulting to the winner (the first such strategy when always on wins). The hover tooltip gives the interval's time, both prices, and whether the selected strategy was off or running.
5. **What sets the breakeven line:** a formula strip "BTC price × block reward ÷ difficulty = hashprice ÷ efficiency = breakeven $/MWh"; tiles for BTC price (first and last day), difficulty adjustments (count, after the first entry), hashprice (first and last day) and fees share (first and last day); then three charts that share the price chart's time axis, zoom and hover: BTC price (source "Coin Metrics"), difficulty as a step line with each adjustment's change as a signed percent (source "own Bitcoin Core node"), and hashprice in USD per PH/s per day. One series per chart; no chart has two y-axes.
6. **Breakdown table:** per strategy: revenue, energy cost, transmission, net profit; price gain and 4CP gain ("—" for always on); BTC mined and hours off. The winner's row highlighted. Above it: "{expected − missing} of {expected} intervals priced · {missing} skipped for missing data". Below it, in the same panel, "4CP peaks": one row per peak with its start in Central time, system load, price, and for each strategy the charge it incurred there: {charge_per_peak_usd} in the loss colour if it ran, $0 in the gain colour if it was off.
7. **Assumptions:** collapsed by default under "Model and assumptions": the `assumptions` values from the API, and the list in section 3.8 as static text.
8. **Footer:** "Data provided by Grid Status" linking to https://www.gridstatus.io/; Coin Metrics attribution with licence link.

Strategy descriptions, shown as text on the cards:

| Strategy | Description |
| --- | --- |
| Always on | Never switches off. The baseline every other rule is measured against. |
| Strike price | Switches off when the last 15 minutes’ power price was above breakeven. |
| Strike + peak guard | Strike price, plus switching off when grid demand nears the month’s peak. |

Tooltips: these terms show a Mantine `Tooltip` with exactly this text, marked by a dotted underline: the breakdown table's transmission, price gain, 4CP gain and hours off headers, "Breakeven" in the chart legend, and "Block reward", "Difficulty", "Hashprice" and "Efficiency" in the formula strip. The tooltip and description text is defined once in `frontend/src/config.ts` and not served by the API; only the Efficiency tooltip inserts a value, `assumptions.efficiency_j_per_th`.

| Term | Tooltip |
| --- | --- |
| Transmission | Next year’s charge, set by power used during this summer’s four 4CP peak intervals. |
| Price gain | Saved by avoiding expensive power, minus mining revenue given up, compared with always on. |
| 4CP gain | Transmission charges avoided compared with always on. |
| Hours off | Total time the fleet was switched off. |
| Breakeven | The power price where mining just pays for itself, using yesterday’s bitcoin price and rewards. |
| Block reward | The new bitcoin each block creates (the subsidy) plus the transaction fees paid to its miner. |
| Hashprice | What 1 PH/s of hashrate earns in a day, in USD, after the pool fee. |
| Efficiency | Energy the fleet uses per terahash in this run: {efficiency_j_per_th} J/TH. Lower is better. |
| Difficulty | How hard it is to find a block. It adjusts every 2,016 blocks, about every two weeks, to keep blocks near 10 minutes apart. |

React + TypeScript + Vite, Mantine, TanStack Query, ECharts. Types come from `schema.ts`. States: loading (only a centred spinner, with its status text visually hidden; nothing else on the page), error (shows `detail`), success.

Look: one type scale of five sizes (40, 24, 16, 14 and 12 px), the system font stack with tabular figures, three text colours (primary, secondary, muted), and colour tokens defined once. Gains and losses show a sign as well as a colour. Text meets WCAG AA contrast. The page works at 390 px wide with no horizontal page scroll; the breakdown table scrolls inside its box.

Formatting: in the breakdown table, USD as `$1,234.56`; elsewhere, USD rounded with ROUND_HALF_EVEN to whole dollars as `$1,235`; negatives as `−$1,234.56`, and gains with an explicit sign (`+$1,235`); hours to one decimal outside the table and two in it; BTC as sats ÷ 100,000,000 to 4 places; sats with thousands separators; prices as `$12.34/MWh`; difficulty in T (÷ 10^12) to one decimal; ratios as percents to one decimal. Formatting only; no rounding of values used in any calculation.

## 10. Defaults

Defined once, in `config.py`. Values are fixed; never tune them to the backtest's results.

| Setting | Default |
| --- | --- |
| Fleet size | 1 MW |
| Efficiency | 15 J/TH |
| Pool fee | 2% |
| Transmission rate | $50,000 per MW-year |
| Peak guard threshold | 0.95 (range 0.80 to 1.00, step 0.01) |
| Settlement point | LZ_WEST |
| Month timezone | America/Chicago |

## 11. Testing

- Expected values are literal numbers from the examples above or hand calculations; never computed by the code under test.
- Required cases, each asserting the exact values given:
  - Every example in section 3 (3.2 to 3.6, 3.9 to 3.11)
  - Charge per peak (5.2): $12,500; `peaks_running` 0, 1 and 4 match transmission $0, $12,500, $50,000
  - A UTC day's bitcoin row uses that day's price and rewards and its first window interval's difficulty
  - Difficulty from `bits`: `1d00ffff` gives exactly 1
  - The worked day (4.2), asserting every value in its table
  - The peak guard example (4.1): fires at 76,000 MW, not at 75,999 MW
  - Price exactly at breakeven: the fleet runs
  - First interval of a month: the peak guard uses the previous month's peak
  - Transmission at 0, 1 and 4 peaks running (5.2): $0, $12,500, $50,000
  - A skipped interval adds nothing to totals or hours off, and is counted in `missing_intervals`
  - An interval starting at or after a difficulty change uses the new difficulty
  - A missing daily row fails loading; a missing 4CP price fails the backtest
  - The gain split adds up exactly (5.3)
  - Winner tie-break (5.3)
  - An off-step or out-of-range threshold returns `422`
- Invariants: always_on mines the most sats; with all prices positive, every strategy's energy cost ≤ always_on's.
- Data tests use tiny files in `backend/tests/fixtures/`. API tests use FastAPI's test client on fixtures.
- Frontend: Vitest and React Testing Library for formatting and rendering. No browser end-to-end tests.
- Guardrails have their own tests (section 12).
- No test needs an API key or network.

## 12. Guardrails

`make verify-ci` runs the checks in this table; the last three rows are settings of the repository, CI and GitHub. CI runs `make verify-ci` verbatim.

| Rule | Enforced by |
| --- | --- |
| Lint, complexity ≤ 10 | Ruff `select = ["ALL"]`, `C901` max 10. The only ignores: `D` and `CPY001` (docstrings and copyright headers are comments, which are banned), `COM812` and `ISC001` (conflict with the formatter); in `backend/tests/` and `backend/tools/tests/`: `S101` (assert) and `PLR2004` (literal expected values); in `backend/tools/tests/` only: `S603` (canary tests run the real tools as subprocesses on repository fixtures); in `backend/scripts/`: `T201` (print) |
| Strict types; no `Any`, no `cast` | Pyright strict; Ruff `ANN401`; Ruff banned-api for `typing.Any` and `typing.cast` |
| Formatting | `ruff format --check`; Prettier `--check` |
| TypeScript strict; no `any`, no assertions, complexity ≤ 10 | `tsc --noEmit`; typescript-eslint strict-type-checked; `consistent-type-assertions: never`; ESLint `complexity: 10` |
| No comments, docstrings or suppressions (Python) | Checker in `backend/tools/` |
| No comments or suppressions (TypeScript), including triple-slash directives | `frontend/tools/check_ts_comments.ts`, run with Node. Vite client types come from `tsconfig` `types`, not a directive |
| At most 400 lines per source and test file | Checker in `backend/tools/` |
| Coverage: 100% branch on `backend/src/run_or_rest` and `backend/tools` | pytest-cov `--cov-branch --cov-fail-under=100`. `backend/scripts/` is excluded. The only excluded lines are `assert_never(...)` calls, listed in the coverage config |
| CRAP ≤ 10 on `backend/src/run_or_rest` and `backend/tools` | Guaranteed by 100% coverage plus complexity ≤ 10. crap4py 0.1.1 (pinned) also fails the build when any function it scores exceeds 10 |
| No retries; fail fast; empty test runs fail | pytest `-x`; Vitest `retry: 0`, `passWithNoTests: false` |
| Generated types current | `make types` (`openapi-typescript`), then `git diff --exit-code` |
| Pinned versions | `.python-version`, `.nvmrc`, `engines`, lockfiles, `npm ci`, Actions pinned by SHA |
| Least-privilege CI | `permissions: contents: read`; job timeout |
| Rule changes need human approval | `.github/CODEOWNERS` assigns the human-only files (AGENTS.md) to the human, and the `main` ruleset requires code-owner review. The agent opens PRs from a dedicated bot account, so it cannot approve them. The agent merges all other PRs once CI passes |

### Guardrail tests

A broken checker or a loosened config passes bad code silently, so every guardrail has a test, and the tests run in `make verify-ci` on every change:

- **Custom checkers** (comments, docstrings, suppressions, line cap): unit tests with a violating and a clean example for every rule.
- **Tool-based guardrails** (Ruff rules, complexity, `Any`, `cast`, Pyright strict, TypeScript `any` and assertions, formatting): one canary per guardrail, a fixture with exactly one violation, run through the real tool with the repository's config. The test passes only if the tool fails and names the expected rule.
- **Coverage and CRAP thresholds:** one canary each, a tiny fixture project with partial test coverage (for CRAP, a function of complexity 6 with half its branches covered, scoring about 10.5), run through the real gate. The test passes only if the gate fails.
- **Not testable from the repository:** CI running on GitHub and the `main` branch ruleset. The human checks these once.

Canary fixtures are excluded from every normal check and run only by their tests.

`frontend/src/api/schema.ts` is generated: excluded from the comment check, ESLint, Prettier, coverage and the line cap; covered by the generated-types check.

Only prose allowed in code: Pydantic `Field(description=...)` and FastAPI `description=`, which are part of the API schema.

## 13. Commands

The Makefile works with GNU Make 3.81, the macOS default.

| Command | Does |
| --- | --- |
| `make setup` | `uv sync`, `npm ci` |
| `make fetch` | runs `fetch_grid.py`; `GRIDSTATUS_API_KEY` comes from the environment, and the Makefile loads it from `.env` if present |
| `make dev` | API (started by `uvicorn` from the Makefile; no Python entry point) and frontend together, using `concurrently` so stopping one stops both |
| `make test` | all tests; no key needed |
| `make verify` | lint, format, types, source rules, tests |
| `make verify-ci` | `verify` plus coverage, CRAP, generated types, frontend build |
| `make types` | regenerates `schema.ts` from the API's OpenAPI document with `openapi-typescript` |
