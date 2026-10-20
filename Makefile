.DEFAULT_GOAL := help

MAKEFLAGS += --no-print-directory

# Prefer the repo Vite+ binary when it is installed.
export PATH := $(CURDIR)/node_modules/.bin:$(PATH)

.PHONY: help install hooks check test verify dev build preview

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-12s %s\n", $$1, $$2} END {printf "\n"}' $(MAKEFILE_LIST)

install: ## Install dependencies and Git hooks
	@vp i
	@$(MAKE) hooks

hooks: ## Install Git hooks (vp config)
	@vp config >/dev/null
	@echo "Hooks installed (.vite-hooks/: pre-commit runs vp staged, pre-push runs make verify)"

check: ## Lint, format, and typecheck (Oxlint + Oxfmt + tsgo)
	@vp check

test: ## Run the Vitest suite (vp test)
	@vp test

# Dummy values the former CI used: `make verify` needs no .env and never reaches a real Strapi.
# The Turnstile values are Cloudflare's always-pass test keys.
VERIFY_ENV = STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=ci-dummy-token COOKIE_SIGNING_SECRET=ci-cookie-signing-secret TURNSTILE_SITE_KEY=1x00000000000000000000AA TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Runs on every push through .vite-hooks/pre-push. `vp test run` never enters watch mode.
verify: ## Pre-push gate: astro sync, check, astro check, tests, build
	@$(VERIFY_ENV) vp exec astro sync
	@$(MAKE) check
	@$(VERIFY_ENV) vp exec astro check
	@vp test run
	@bash scripts/check-test-portability.sh
	@$(VERIFY_ENV) $(MAKE) build

dev: ## Start the Astro dev server (astro dev --host)
	@vp run dev

build: ## Build the production app (astro build)
	@vp run build

preview: ## Preview the production build (astro preview)
	@vp run preview
