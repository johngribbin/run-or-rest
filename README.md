# Run or Rest

Backtests curtailment rules for a bitcoin mining fleet on ERCOT West (LZ_WEST) real-time power prices, June to September 2026. It compares always on, strike price, and strike price plus a 4CP peak guard, and shows which made the most money and why. See `SPEC.md`.

![The 4CP explainer and the three strategies, with Strike + peak guard marked best](docs/images/overview.png)

## Get started

Needs uv 0.13.4, Node 26 and GNU Make.

```sh
make setup
cp .env.example .env    # then add your GRIDSTATUS_API_KEY
make fetch
make dev
```

`make dev` serves the page at http://localhost:5173.

## How it works

```mermaid
flowchart LR
  grid["Grid Status<br/>prices and load"] --> raw[("data/raw/<br/>Parquet, not committed")]
  chain["Bitcoin Core node<br/>Coin Metrics"] --> csv[("data/<br/>CSV, committed")]
  raw --> data["data/<br/>load and validate"]
  csv --> data
  data --> core["core/<br/>every calculation and decision"]
  core --> api["api/<br/>GET /api/backtest"]
  api --> page["React page<br/>formats and draws"]
```

Data loads once at startup. Each request reruns the backtest for the chosen peak guard threshold; nothing is cached or stored.

The page also shows where the breakeven line comes from: BTC price, difficulty and hashprice over the season.

![BTC price, network difficulty and hashprice, June to September 2026](docs/images/bitcoin-inputs.png)

BTC price data from [Coin Metrics](https://coinmetrics.io/), licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

## The backend

All the logic lives in `backend/src/run_or_rest/core/`, which is pure Python with no I/O. Money, prices, load and difficulty are `Decimal`, never floats.

- `economics.py`: hashrate, expected blocks, mining revenue, energy cost, breakeven price, hashprice, and difficulty from a block's `bits`.
- `context.py`: builds what the miner knew at the start of each 15-minute interval: the last price, the last load, and a breakeven estimate from the previous day's BTC price and block rewards. Strategies only ever see this, so a backtest can't peek at the price it is deciding on.
- `strategies.py`: the three rules, as plain functions that return run or off.
- `peaks.py`: finds each month's 4CP peak and prices the transmission charge.
- `backtest.py`: settles every interval, totals each rule, splits each gain into price and 4CP, and picks the winner.

`data/` reads the files with Polars and rejects any malformed row by file and row number. `api/` validates the threshold, calls core and rounds the results; it calculates nothing. The frontend formats and draws what the API returns.

## Tech stack

- Backend: Python 3.13, uv, FastAPI, Pydantic, Polars
- Frontend: React 19, TypeScript, Vite, Mantine, TanStack Query, ECharts
- Data: Grid Status (ERCOT prices and load), a Bitcoin Core node (blocks and difficulty), Coin Metrics (BTC price)

## Working with agents

The project was built spec first: `SPEC.md` defines the behaviour, tests encode it, and code makes the tests pass. `AGENTS.md` holds the rules an agent follows.

An agent works on a branch, opens a PR, and can merge it itself once CI passes. A PR that touches a human-owned file waits for the owner's review: `SPEC.md`, `AGENTS.md`, `CLAUDE.md`, this README, the Makefile, `.github/`, every lint, type and test config, the lockfiles and the guardrail tools. `.github/CODEOWNERS` lists them, and the `main` ruleset requires code-owner review and a passing `verify-ci` check, merges by squash only, and blocks force pushes.

CI runs `make verify-ci`, which fails on any of these:

- Ruff with every rule enabled, and complexity above 10
- Pyright strict, with `Any` and `cast` banned
- TypeScript strict and typescript-eslint strict, with `any` and type assertions banned
- Any comment, docstring or lint suppression, in Python or TypeScript
- A source or test file over 400 lines
- Backend branch coverage below 100%
- A CRAP score above 10
- Generated API types out of date with the backend
- Unformatted code, a failing build or an empty test run; tests never retry and stop at the first failure

Each guardrail has its own test. A canary file with one deliberate violation runs through the real tool, and the test fails if the tool lets it pass, so a loosened config can't slip through.

## Check

```sh
make verify       # lint, format, types, source rules, tests
make verify-ci    # what CI runs
```

## Bitcoin data

Bitcoin chain data and BTC price history are committed to `data/`, so you don't need to fetch them to run the app. To fetch them again, the price history comes from the Coin Metrics Community API (no key needed), and the chain data needs a fully synced Bitcoin Core node with RPC access:

```sh
cd backend
uv run python -m scripts.fetch_price
BITCOIN_RPC_URL=… BITCOIN_RPC_USER=… BITCOIN_RPC_PASSWORD=… \
  uv run python -m scripts.fetch_chain
```
