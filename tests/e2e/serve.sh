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
# Any HTTP answer (even 401) proves the stub listens; a dead stub fails fast instead of timing out.
until curl -s -o /dev/null "http://localhost:${STRAPI_STUB_PORT}/api/users/me"; do
	kill -0 "$stub" 2>/dev/null || { echo "Strapi stub exited before it answered" >&2; exit 1; }
	sleep 0.2
done
vp run build
bun ./start.mjs &
server=$!
# Exit as soon as either child dies: the app is useless without the stub.
# Exit as soon as either child dies (portable: macOS ships bash 3.2, which lacks `wait -n`).
while kill -0 "$stub" 2>/dev/null && kill -0 "$server" 2>/dev/null; do
	sleep 1
done
