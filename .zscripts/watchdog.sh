#!/usr/bin/env bash
# Watchdog: keeps the dev server alive by restarting it if it dies.
set -u
cd /home/z/my-project

while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[$(date)] Server down — restarting..."
    pkill -9 -f "next dev" 2>/dev/null
    sleep 1
    setsid env NODE_OPTIONS="--max-old-space-size=900" ./node_modules/.bin/next dev -p 3000 > dev.log 2>&1 < /dev/null &
    disown
    # Wait for ready
    for i in $(seq 1 30); do
      if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
        echo "[$(date)] Server ready (${i}s)"
        break
      fi
      sleep 1
    done
  fi
  sleep 5
done
