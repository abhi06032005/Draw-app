#!/usr/bin/env bash
set -euo pipefail

cd "$DUNEA_WORKTREE_PATH"

port="${DUNEA_PORT:-3000}"
http_port=$((port + 1))
ws_port=$((port + 2))

export NEXT_PUBLIC_BACKEND_URL="http://localhost:$http_port"
export NEXT_PUBLIC_WS_URL="http://localhost:$ws_port"
export NEXTAUTH_URL="http://localhost:$port"
export ALLOWED_ORIGINS="http://localhost:$port,http://127.0.0.1:$port"

PORT="$http_port" pnpm --filter http-backend dev &
http_pid=$!
PORT="$ws_port" pnpm --filter ws-backend dev &
ws_pid=$!
PORT="$port" pnpm --filter excelidraw-frontend dev -- --port "$port" &
frontend_pid=$!

trap 'kill "$http_pid" "$ws_pid" "$frontend_pid" 2>/dev/null || true' EXIT
wait "$http_pid" "$ws_pid" "$frontend_pid"
