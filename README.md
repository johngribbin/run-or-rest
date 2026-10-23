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
