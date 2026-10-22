# AGENTS.md

Rules for any AI agent working in this repository. CI enforces most of them; the rest are reviewed by a human. If a rule here conflicts with a failing check, the check wins.

## Before you start

1. Read `SPEC.md`. Build only what it describes. If something is unclear or missing, stop and ask; do not invent behavior.
2. Do only the task you were given. If you find other work that's needed, open a GitHub issue for it (`gh issue create`) and link the issue in the PR, instead of doing it.
3. Edit human-only files (below) only when the task explicitly asks you to.

## Workflow

- Start every task on a new branch from `main` and finish it with a PR. Never commit or push to `main`.
- After opening the PR, enable auto-merge with `gh pr merge --auto --squash`. Never merge a PR whose checks have not passed.
- Every change ships with its tests in the same PR. Tests cover the required cases in SPEC section 11, not just the coverage target.
- When coverage fails, add tests for real behavior. Never add tests that only execute code to raise coverage.
- Keep PRs small: one coherent change. Refactors and behavior changes go in separate PRs.
- Run `make verify` after each coherent edit and `make verify-ci` before opening a PR.
- If the checks fail twice on the same problem, stop and report what you tried. Do not keep looping.
- Report honestly: say which checks passed, failed, or did not run. Never describe a check as passing if it did not run.

## Code rules (enforced)

- No comments and no docstrings, in Python or TypeScript. Meaning lives in names, types and tests. The only allowed prose is `Field(description=...)` and FastAPI `description=` on API schemas.
- No suppressions of any kind: no `# noqa`, `# type: ignore`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`.
- No `Any`, no `typing.cast`, no TypeScript `any`, no type assertions (`as`).
- Files have at most 400 lines. Functions stay small; complexity max 10.
- Never edit `frontend/src/api/schema.ts` by hand; run `make types`.

## Human-only files

These files define what gets built and how it is checked: `SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, the `Makefile`, `.github/`, `.gitignore`, `backend/tools/`, `frontend/tools/`, every lint, type, format and test config, the dependency manifests and lockfiles, and the pinned runtime files. `.github/CODEOWNERS` lists them, so a PR that touches one waits for the human's approval (SPEC section 12).

## Design rules

- **Thin edges.** All domain values and policy are computed in `core/`: breakeven, decisions, peaks, winner, gains, totals. API handlers only validate input, call core, and map results to response models. The frontend only formats and draws what the API returns. No money math outside `core/`.
- **Validate at the boundary.** The data layer parses every file row into validated types and fails with a clear error on a malformed row. Never swallow errors, never use a bare `except`, never substitute a default for missing or invalid data.
- **Enums over booleans and strings.** Use `Decision` (`RUN`, `OFF`) and `StrategyId` enums in core, not `True`/`False` or raw strings. Match on them exhaustively.
- **One definition per constant.** Every constant and default is defined once, in `config.py` or, for frontend presentation constants, `frontend/src/config.ts` (SPEC section 7). The frontend reads domain values from the API and never copies them. Search before adding a constant.
- **Start concrete.** Strategies are plain functions. No base classes, protocols or layers unless two real uses need them. Never add an abstraction only to make mocking possible.
- **Don't game the metrics.** Never split a cohesive function into fragments just to lower its complexity or CRAP score. If a function is genuinely too complex, restructure the logic.
- **No ad hoc scripts.** Repository scripts and checks are Python under the same Ruff and Pyright rules (fetch scripts use Pyright standard mode; SPEC section 6.4). The one exception is `frontend/tools/check_ts_comments.ts`, which is TypeScript under the frontend's rules. No shell scripts beyond one-line Makefile commands.

## Test quality

- Before writing a test, be able to name three things: the behavior it checks, a plausible bug it would catch, and where the expected value comes from (the spec or a hand calculation).
- Expected values are literal numbers worked out by hand from the spec's examples. Never compute an expected value or threshold by calling the code under test, repeating its logic, or reading it from a production result.
- Don't write tests that only check setup, types, or the shape of a fixture.
- A test that checks a rejection or edge case changes exactly one fact from a valid case.
- Loops over outcomes must check the expected items by name or value, and must fail if the collection is empty.
- Test behavior through public functions, not private helpers.
- The guardrails have their own tests (SPEC section 12). This is deliberate: a broken checker or a loosened config would silently pass bad code.

## Data and secrets

- Never commit `data/raw/`, `.env`, API keys or RPC credentials. Read them from the environment only and never log them.
- Grid Status data stays local. Only aggregated results may appear in the README.
- Keep attributions for Grid Status and Coin Metrics wherever their data is shown.

## Dependencies

Packages named in SPEC.md are approved, along with the packages they need to work: peer dependencies, build plugins, test environments (such as `httpx2` for FastAPI's test client and `jsdom` for Vitest) and the linters' own packages. Any other dependency needs human approval. Prefer the standard library and what is already installed.

## PR description template

```
Task: <the task you were given>
What changed: <one or two lines>
Why: <link to the SPEC section>
Checks: make verify-ci <passed | failed: which>
Problems hit: <checks that failed and how they were fixed, or none>
Assumptions or open questions: <none, or list>
```
