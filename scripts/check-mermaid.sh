#!/usr/bin/env bash
# Render every Mermaid block in docs/ and README.md; fail if any diagram has a syntax error.
# Requires mermaid-cli: npm i -g @mermaid-js/mermaid-cli
set -uo pipefail
out="$(mktemp -d)"
status=0
while IFS= read -r f; do
  if mmdc -i "$f" -o "$out/$(echo "$f" | tr '/' '_')" >"$out/log" 2>&1; then
    echo "ok    $f"
  else
    echo "FAIL  $f"; grep -m1 -iE "error" "$out/log"; status=1
  fi
done < <(grep -rl '```mermaid' README.md docs/)
rm -rf "$out"
exit $status
