.PHONY: setup fetch dev test test-backend test-frontend lint format typecheck rules verify coverage crap types types-check build verify-ci

EXPORTED_GRIDSTATUS_API_KEY := $(GRIDSTATUS_API_KEY)
-include .env
ifneq ($(strip $(EXPORTED_GRIDSTATUS_API_KEY)),)
GRIDSTATUS_API_KEY := $(EXPORTED_GRIDSTATUS_API_KEY)
endif
export GRIDSTATUS_API_KEY

BACKEND = cd backend &&
FRONTEND = cd frontend &&
CACHE = $(CURDIR)/.cache
COV_ARGS = --cov=src/run_or_rest --cov=tools
LCOV = $(CACHE)/lcov.info
CRAP_DIR = $(CURDIR)/backend
CRAP_PATHS = src/run_or_rest tools
OPENAPI_JSON = $(CACHE)/openapi.json

setup:
	$(BACKEND) uv sync --locked
	$(FRONTEND) npm ci

fetch:
	$(BACKEND) uv run python -m scripts.fetch_grid

dev:
	$(FRONTEND) npx concurrently --kill-others --names api,web "cd ../backend && uv run uvicorn --factory run_or_rest.api.app:create_app --reload --port 8000" "npx vite"

test: test-backend test-frontend

test-backend:
	$(BACKEND) uv run pytest

test-frontend:
	$(FRONTEND) npx vitest run

lint:
	$(BACKEND) uv run ruff check .
	$(FRONTEND) npx eslint .

format:
	$(BACKEND) uv run ruff format --check .
	$(FRONTEND) npx prettier --check .

typecheck:
	$(BACKEND) uv run pyright
	$(FRONTEND) npx tsc --noEmit -p tsconfig.json
	$(FRONTEND) npx tsc --noEmit -p tsconfig.node.json

rules:
	$(BACKEND) uv run python -m tools.check_python_source .
	$(BACKEND) uv run python -m tools.check_line_cap ..
	$(FRONTEND) node tools/check_ts_comments.ts

verify: lint format typecheck rules test

coverage:
	mkdir -p $(dir $(LCOV))
	$(BACKEND) uv run pytest $(COV_ARGS) --cov-branch --cov-fail-under=100 --cov-report=term-missing:skip-covered --cov-report=lcov:$(LCOV)

crap:
	cd $(CRAP_DIR) && uv run --project $(CURDIR)/backend crap4py $(CRAP_PATHS) --lcov $(LCOV) --max-crap 10

types:
	$(BACKEND) uv run python -m tools.export_openapi $(OPENAPI_JSON)
	$(FRONTEND) npx openapi-typescript $(OPENAPI_JSON) --output src/api/schema.ts

types-check: types
	git diff --exit-code -- frontend/src/api/schema.ts

build:
	$(FRONTEND) npx vite build

verify-ci: verify coverage crap types-check build
