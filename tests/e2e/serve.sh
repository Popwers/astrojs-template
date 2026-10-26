#!/usr/bin/env bash
# App under test for the e2e suite (`e2e.config.ts` runs it as `app.command`, which passes the env).
# Starts the in-memory Strapi stub, builds the app, then serves the build four times with `start.mjs`:
# on PORT with the Turnstile always-pass keys, on REJECT_PORT with the always-fail secret, on
# CHALLENGE_PORT with the site key that always asks for a click, and on BLOCK_PORT with the site key
# that always fails. The runner stops the process group with SIGTERM and SIGKILLs it 10 s later, so
# the trap never waits on a child.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$PWD/node_modules/.bin:$PATH"

pids=()
cleanup() {
	# bash 3.2 with `set -u` treats an empty array as unbound.
	for pid in ${pids[@]+"${pids[@]}"}; do
		kill -TERM "$pid" 2>/dev/null || true
	done
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# Waits until the last started child answers $1; a dead child fails fast instead of timing out.
await_answer() {
	local pid="${pids[${#pids[@]}-1]}"
	until curl -s -o /dev/null "$1"; do
		kill -0 "$pid" 2>/dev/null || { echo "$2 exited before it answered" >&2; exit 1; }
		sleep 0.2
	done
}

# Serves the build on port $1 with the Turnstile site key $2 and secret $3.
serve() {
	PORT="$1" TURNSTILE_SITE_KEY="$2" TURNSTILE_SECRET_KEY="$3" bun ./start.mjs &
	pids+=("$!")
	await_answer "http://localhost:$1/login" "Server on port $1"
}

bun tests/e2e/strapi-stub.ts &
pids+=("$!")
# Any HTTP answer (even 401) proves the stub listens.
await_answer "http://localhost:${STRAPI_STUB_PORT}/api/users/me" "Strapi stub"
vp run build
serve "$REJECT_PORT" "$TURNSTILE_SITE_KEY" "$TURNSTILE_REJECT_SECRET_KEY"
serve "$CHALLENGE_PORT" "$TURNSTILE_CHALLENGE_SITE_KEY" "$TURNSTILE_SECRET_KEY"
serve "$BLOCK_PORT" "$TURNSTILE_BLOCK_SITE_KEY" "$TURNSTILE_SECRET_KEY"
# Last: the runner's readyUrl is this one, so the others already answer when the tests start.
serve "$PORT" "$TURNSTILE_SITE_KEY" "$TURNSTILE_SECRET_KEY"
# Exit as soon as any child dies (portable: macOS ships bash 3.2, which lacks `wait -n`).
while true; do
	for pid in "${pids[@]}"; do
		kill -0 "$pid" 2>/dev/null || exit 1
	done
	sleep 1
done
