.DEFAULT_GOAL := help

MAKEFLAGS += --no-print-directory

# Prefer the repo Vite+ binary when it is installed.
export PATH := $(CURDIR)/node_modules/.bin:$(PATH)

.PHONY: help install hooks check test dev build preview

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_-]+:.*##/ {printf "  %-12s %s\n", $$1, $$2} END {printf "\n"}' $(MAKEFILE_LIST)

install: ## Install dependencies and Git hooks
	@vp i
	@$(MAKE) hooks

hooks: ## Install Git hooks (vp config)
	@vp config >/dev/null
	@echo "Hooks installed (.vite-hooks/ -> vp staged)"

check: ## Lint, format, and typecheck (Oxlint + Oxfmt + tsgo)
	@vp check

test: ## Run the bun:test suite (vp run test)
	@vp run test

dev: ## Start the Astro dev server (astro dev --host)
	@vp run dev

build: ## Build the production app (astro build)
	@vp run build

preview: ## Preview the production build (astro preview)
	@vp run preview
