#!/bin/bash
cd /home/z/my-project
while true; do
  if ! pgrep -f "next-server" > /dev/null 2>&1; then
    echo "[$(date)] dev server dead, restarting..." >> /home/z/my-project/watchdog.log
    pkill -9 -f "next" 2>/dev/null
    pkill -9 -f "bun run dev" 2>/dev/null
    sleep 2
    nohup bun run dev > /home/z/my-project/dev.log 2>&1 &
    echo "[$(date)] restarted, pid $!" >> /home/z/my-project/watchdog.log
    sleep 8
  fi
  sleep 3
done
