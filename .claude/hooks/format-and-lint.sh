#!/usr/bin/env bash
# PostToolUse hook: after the agent edits a file, format it with prettier and
# lint it with eslint. If eslint finds errors, exit 2 so the agent sees them
# and fixes them right away. Does nothing until dependencies are installed.
set -uo pipefail

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
[ -z "$file_path" ] || [ ! -f "$file_path" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
bin="node_modules/.bin"

case "$file_path" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.json | *.css | *.md | *.yml | *.yaml)
    [ -x "$bin/prettier" ] && "$bin/prettier" --write --log-level=warn "$file_path" >/dev/null 2>&1
    ;;
esac

case "$file_path" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs)
    if [ -x "$bin/eslint" ]; then
      if ! out="$("$bin/eslint" --fix "$file_path" 2>&1)"; then
        echo "eslint found problems in $file_path:" >&2
        echo "$out" >&2
        exit 2
      fi
    fi
    ;;
esac

exit 0
