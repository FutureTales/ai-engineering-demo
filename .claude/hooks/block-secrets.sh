#!/usr/bin/env bash
# PreToolUse hook: blocks Write/Edit calls whose content looks like an API key.
# Claude Code sends the tool call as JSON on stdin. Exit code 2 = block the call
# and show stderr to the agent so it can fix its approach.
set -euo pipefail

input="$(cat)"

file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"

# .env.local is git-ignored: it is the one place where real keys are allowed.
case "$(basename "$file_path")" in
  .env.local | .env.*.local) exit 0 ;;
esac

# Everything the tool would write: Write.content, Edit.new_string, MultiEdit.edits[].new_string
content="$(printf '%s' "$input" | jq -r '
  [.tool_input.content, .tool_input.new_string, (.tool_input.edits // [] | .[].new_string)]
  | map(select(. != null)) | join("\n")')"

patterns=(
  'sk-ant-[A-Za-z0-9_-]{20,}'        # Anthropic
  'pa-[A-Za-z0-9_-]{30,}'            # Voyage AI
  'AIza[0-9A-Za-z_-]{35}'            # Google API key
  'AQ\.[A-Za-z0-9_-]{30,}'           # Google (new key format)
  'sbp_[A-Za-z0-9]{30,}'             # Supabase access token
  'sb_secret_[A-Za-z0-9_-]{20,}'     # Supabase secret key
  'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}' # JWT (e.g. service_role)
  'gh[pousr]_[A-Za-z0-9]{36,}'       # GitHub token
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)

for p in "${patterns[@]}"; do
  if printf '%s' "$content" | grep -Eq -- "$p"; then
    echo "BLOCKED by .claude/hooks/block-secrets.sh: the content for '$file_path' looks like a secret (pattern: $p)." >&2
    echo "Put secrets in .env.local (git-ignored) or in Vercel/GitHub secrets, and reference them via process.env." >&2
    exit 2
  fi
done

exit 0
