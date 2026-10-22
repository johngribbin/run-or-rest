# Run or Rest

Backtests curtailment rules for a bitcoin mining fleet on ERCOT West (LZ_WEST) real-time power prices, June to September 2026. It compares always on, strike price, and strike price plus a 4CP peak guard, and shows which made the most money and why. See `SPEC.md`.

## Get started

Needs uv 0.13.4, Node 26 and GNU Make.

```sh
make setup
cp .env.example .env    # then add your GRIDSTATUS_API_KEY
make fetch
make dev
```

`make dev` serves the page at http://localhost:5173.

Chain and BTC price data are fetched once and committed to `data/`:

```sh
uv run --project backend python backend/scripts/fetch_price.py
BITCOIN_RPC_URL=… BITCOIN_RPC_USER=… BITCOIN_RPC_PASSWORD=… \
  uv run --project backend python backend/scripts/fetch_chain.py
```

## Check

```sh
make verify       # lint, format, types, source rules, tests
make verify-ci    # what CI runs
```
