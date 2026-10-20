#!/usr/bin/env bash
set -euo pipefail

cd "$DUNEA_WORKTREE_PATH"

database_url="${DATABASE_URL:-}"
if [[ -z "$database_url" && -f .env ]]; then
  database_url="$(sed -n 's/^DATABASE_URL=//p' .env | tail -n 1)"
fi
if [[ -z "$database_url" ]]; then
  echo "DATABASE_URL is required to remove the worktree database."
  exit 1
fi

database_name="drawapp_${DUNEA_WORKSPACE_NAME//[^a-zA-Z0-9_]/_}"
database_name="${database_name:0:63}"
database_host="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(u.hostname)' "$database_url")"
database_port="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(String(u.port || 5432))' "$database_url")"
database_user="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.username))' "$database_url")"
database_password="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(decodeURIComponent(u.password))' "$database_url")"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to remove the worktree database."
  exit 1
fi

export PGPASSWORD="$database_password"
if ! psql --host="$database_host" --port="$database_port" --username="$database_user" --dbname=postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
  echo "Postgres is not reachable at ${database_host}:${database_port}."
  exit 1
fi

psql --host="$database_host" --port="$database_port" --username="$database_user" --dbname=postgres -c "DROP DATABASE IF EXISTS \"$database_name\" WITH (FORCE)"
