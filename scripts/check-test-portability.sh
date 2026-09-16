#!/usr/bin/env bash
# Tests run under Vitest (`vp test`). These Bun-only APIs have no Node equivalent
# and fail the runner. We match real calls only: `//` line comments are stripped
# first so documentation mentioning these APIs does not trip the guard. A `://`
# in a URL is left intact (no leading space).
set -euo pipefail

PATTERN='from ['\''"]bun:test['\''"]|Bun\.file\(|setSystemTime\(|spyOn\(|(^|[^a-zA-Z.])mock\('

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
    echo "Import from vitest. Read files with node:fs/promises. Use a manual spy, not mock()."
    exit 1
fi
