#!/usr/bin/env bash
# App under test for the e2e suite (`e2e.config.ts` runs it as `app.command`, which passes the env).
# Starts the in-memory Strapi stub, builds the app, then serves it with `start.mjs`. The runner stops
# the process group with SIGTERM and SIGKILLs it 10 s later, so the trap never waits on a child.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$PWD/node_modules/.bin:$PATH"

stub=""
server=""
cleanup() {
	for pid in $stub $server; do
		kill -TERM "$pid" 2>/dev/null || true
	done
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

bun tests/e2e/strapi-stub.ts &
stub=$!
vp run build
bun ./start.mjs &
server=$!
wait "$server"
