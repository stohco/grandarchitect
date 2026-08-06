#!/bin/bash
# Watchdog: restart dev server if it dies
while true; do
  if ! pgrep -f "next dev" > /dev/null; then
    echo "[$(date)] Dev server down — restarting..."
    cd /home/z/my-project
    NODE_OPTIONS="--max-old-space-size=2048" ./node_modules/.bin/next dev -p 3000 >> dev.log 2>&1 &
    NEXT_PID=$!
    disown
    echo "[$(date)] Started next dev (pid=$NEXT_PID)"
    sleep 10
  else
    sleep 5
  fi
done
