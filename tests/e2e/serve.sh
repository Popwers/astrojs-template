#!/usr/bin/env bash
# App under test for the e2e suite (`e2e.config.ts` runs it as `app.command`, which passes the env).
# Starts the in-memory Strapi stub, builds the app, then serves the build twice with `start.mjs`: on
# PORT with the Turnstile always-pass secret, and on REJECT_PORT with the always-fail secret
# (TURNSTILE_REJECT_SECRET_KEY). The runner stops the process group with SIGTERM and SIGKILLs it 10 s
# later, so the trap never waits on a child.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$PWD/node_modules/.bin:$PATH"

stub=""
reject=""
server=""
cleanup() {
	for pid in $stub $reject $server; do
		kill -TERM "$pid" 2>/dev/null || true
	done
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

bun tests/e2e/strapi-stub.ts &
stub=$!
# Any HTTP answer (even 401) proves the stub listens; a dead stub fails fast instead of timing out.
until curl -s -o /dev/null "http://localhost:${STRAPI_STUB_PORT}/api/users/me"; do
	kill -0 "$stub" 2>/dev/null || { echo "Strapi stub exited before it answered" >&2; exit 1; }
	sleep 0.2
done
vp run build
PORT="$REJECT_PORT" TURNSTILE_SECRET_KEY="$TURNSTILE_REJECT_SECRET_KEY" bun ./start.mjs &
reject=$!
until curl -s -o /dev/null "http://localhost:${REJECT_PORT}/login"; do
	kill -0 "$reject" 2>/dev/null || { echo "Reject server exited before it answered" >&2; exit 1; }
	sleep 0.2
done
bun ./start.mjs &
server=$!
# Exit as soon as any child dies (portable: macOS ships bash 3.2, which lacks `wait -n`).
while kill -0 "$stub" 2>/dev/null && kill -0 "$reject" 2>/dev/null && kill -0 "$server" 2>/dev/null; do
	sleep 1
done
