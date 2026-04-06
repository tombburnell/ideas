#!/usr/bin/env bash
set -euo pipefail

redis-server --save "" --appendonly no --bind 127.0.0.1 --port "${REDIS_PORT:-6379}" --daemonize yes
npx prisma db push
node dist/server/index.js
