#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f graphify-out/graph.json ]; then
  echo "No graphify-out/graph.json found. Run a full build first: /graphify ." >&2
  exit 1
fi

if [ ! -f graphify-out/.graphify_python ]; then
  GRAPHIFY_BIN="$(command -v graphify 2>/dev/null || true)"
  if [ -n "$GRAPHIFY_BIN" ]; then
    PY="$(head -1 "$GRAPHIFY_BIN" | tr -d '#!')"
    case "$PY" in *[!a-zA-Z0-9/_.@-]*) PY="python3" ;; esac
  else
    PY="python3"
  fi
  mkdir -p graphify-out
  "$PY" -c "import sys; open('graphify-out/.graphify_python','w',encoding='utf-8').write(sys.executable)"
fi
PYTHON="$(cat graphify-out/.graphify_python)"

if ! "$PYTHON" -c "import graphify" 2>/dev/null; then
  echo "graphify is not importable by $PYTHON. Install with: uv tool install graphifyy" >&2
  exit 1
fi

BEFORE="$("$PYTHON" -c "import json;print(len(json.load(open('graphify-out/graph.json')).get('nodes',[])))" 2>/dev/null || echo 0)"

echo "==> Updating code nodes via AST (no LLM, no tokens)..."
graphify update . "$@"

echo "==> Reclustering and regenerating report + HTML..."
graphify cluster-only . --no-label

AFTER="$("$PYTHON" -c "import json;print(len(json.load(open('graphify-out/graph.json')).get('nodes',[])))" 2>/dev/null || echo 0)"

echo "==> Done. Nodes: ${BEFORE} -> ${AFTER}"
echo "    Report: graphify-out/GRAPH_REPORT.md"
echo "    Graph:  graphify-out/graph.html"

if [ -z "${GEMINI_API_KEY:-}" ] && [ -z "${GOOGLE_API_KEY:-}" ]; then
  echo
  echo "Note: this refresh covers CODE only (free AST extraction)."
  echo "Docs/markdown/OpenAPI need semantic extraction, which requires either:"
  echo "  - running '/graphify --update' inside a Claude Code session (uses parallel subagents), or"
  echo "  - setting GEMINI_API_KEY / GOOGLE_API_KEY so graphify extracts docs in parallel itself."
fi
