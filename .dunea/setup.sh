#!/usr/bin/env bash
set -euo pipefail

cd "$DUNEA_WORKTREE_PATH"

pnpm install --frozen-lockfile

database_url="${DATABASE_URL:-}"
if [[ -z "$database_url" && -f .env ]]; then
  database_url="$(sed -n 's/^DATABASE_URL=//p' .env | tail -n 1)"
fi
if [[ -z "$database_url" ]]; then
  echo "DATABASE_URL is required to provision the worktree database."
  exit 1
fi

database_name="drawapp_${DUNEA_WORKSPACE_NAME//[^a-zA-Z0-9_]/_}"
database_name="${database_name:0:63}"
database_host="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(u.hostname)' "$database_url")"
database_port="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(String(u.port || 5432))' "$database_url")"
database_user="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.username))' "$database_url")"
database_password="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.password))' "$database_url")"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to provision the worktree database."
  exit 1
fi

export PGPASSWORD="$database_password"
if ! psql --host="$database_host" --port="$database_port" --username="$database_user" --dbname=postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
  echo "Postgres is not reachable at ${database_host}:${database_port}."
  exit 1
fi

if ! psql --host="$database_host" --port="$database_port" --username="$database_user" --dbname=postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$database_name'" | grep -q 1; then
  psql --host="$database_host" --port="$database_port" --username="$database_user" --dbname=postgres -c "CREATE DATABASE \"$database_name\""
fi

worktree_database_url="$(node -e 'const u = new URL(process.argv[1]); u.pathname = "/" + process.argv[2]; process.stdout.write(u.toString())' "$database_url" "$database_name")"
echo "DATABASE_URL=$worktree_database_url" >> "$DUNEA_ENV_FILE"
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:$(( ${DUNEA_PORT:-3000} + 1 ))" >> "$DUNEA_ENV_FILE"
echo "NEXT_PUBLIC_WS_URL=http://localhost:$(( ${DUNEA_PORT:-3000} + 2 ))" >> "$DUNEA_ENV_FILE"
echo "NEXTAUTH_URL=http://localhost:${DUNEA_PORT:-3000}" >> "$DUNEA_ENV_FILE"
echo "ALLOWED_ORIGINS=http://localhost:${DUNEA_PORT:-3000},http://127.0.0.1:${DUNEA_PORT:-3000}" >> "$DUNEA_ENV_FILE"

DATABASE_URL="$worktree_database_url" pnpm exec prisma generate --schema=packages/db/prisma/schema.prisma
DATABASE_URL="$worktree_database_url" pnpm exec prisma migrate deploy --schema=packages/db/prisma/schema.prisma
