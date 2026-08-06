#!/bin/bash
# Robust dev server watchdog — survives session termination
# Uses setsid to create a new session independent of the calling shell.
#
# Usage: setsid nohup bash ./dev-watchdog.sh </dev/null &>/dev/null & disown

cd /home/z/my-project

LOG="/home/z/my-project/dev.log"
PIDFILE="/home/z/my-project/.dev-server.pid"

while true; do
  # Check if next dev is running
  if ! pgrep -f "next dev" > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server down — starting..." >> "$LOG"
    
    # Start next dev in a new session
    setsid bash -c 'NODE_OPTIONS="--max-old-space-size=2048" /home/z/my-project/node_modules/.bin/next dev -p 3000 >> '"$LOG"' 2>&1' &
    NEW_PID=$!
    echo "$NEW_PID" > "$PIDFILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Started next dev (pid=$NEW_PID)" >> "$LOG"
    
    # Wait for it to be ready
    for i in $(seq 1 30); do
      sleep 1
      if curl -sf -o /dev/null http://localhost:3000/ 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server ready (after ${i}s)" >> "$LOG"
        break
      fi
    done
  fi
  
  # Check every 5 seconds
  sleep 5
done
