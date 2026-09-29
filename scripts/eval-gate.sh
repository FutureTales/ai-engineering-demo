#!/usr/bin/env bash
# Regression gate (paso-09): a change to the prompt, the model config, the tools
# or the agent loop must come with a NEW live eval result in the same PR.
# CI cannot run live evals (no API keys, no spend), so the rule is: measure
# locally with `pnpm eval --label <name>`, commit evals/results/<date>-<name>.json,
# and compare with `pnpm eval:compare <previous> <name>`.
set -euo pipefail
base="${1:-origin/main}"
changed="$(git diff --name-only "$base"...HEAD)"
sensitive="$(echo "$changed" | grep -E '^(lib/ai/(prompts|copilot|models)\.ts|lib/tools/)' || true)"
if [ -z "$sensitive" ]; then
  echo "eval-gate: no prompt/model/tool changes. OK."
  exit 0
fi
echo "eval-gate: behavior-changing files in this PR:"; echo "$sensitive" | sed 's/^/  - /'
results="$(echo "$changed" | grep -E '^evals/results/[0-9]{4}-[0-9]{2}-[0-9]{2}-.*\.json$' | grep -v -- '-mock\.json$' || true)"
if [ -z "$results" ]; then
  echo "::error::Prompt/model/tool change without a live eval result. Run 'pnpm eval --label <name>' and commit evals/results/<date>-<name>.json."
  exit 1
fi
echo "eval-gate: live eval results included:"; echo "$results" | sed 's/^/  - /'
