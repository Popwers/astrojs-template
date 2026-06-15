#!/usr/bin/env bash
# Tests run under BOTH `bun test` and Vitest (see vite.config.ts test.alias).
# These bun:test-only APIs pass under bun but break the Vitest runner.
# We match real calls only: `//` line comments are stripped first so that
# documentation mentioning these APIs (e.g. "use a manual spy, not mock()")
# does not trip the guard. A `://` in a URL is left intact (no leading space).
set -euo pipefail

PATTERN='setSystemTime\(|spyOn\(|(^|[^a-zA-Z.])mock\('

CANDIDATES=$(grep -rEn "$PATTERN" tests/ --include='*.test.ts' --include='*.test.tsx' || true)

violations=""
while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    # Strip a trailing ` //...` line comment before re-checking the code portion.
    code=$(printf '%s' "$entry" | sed -E 's@[[:space:]]//.*$@@')
    if printf '%s' "$code" | grep -Eq "$PATTERN"; then
        violations+="$entry"$'\n'
    fi
done <<< "$CANDIDATES"

if [ -n "$violations" ]; then
    echo "Bun-only test APIs found (break the Vitest runner):"
    printf '%s' "$violations"
    echo "Use manual save/replace/restore spies instead (see tests/lib/userRefresh.test.ts)."
    exit 1
fi
