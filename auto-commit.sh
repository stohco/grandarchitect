#!/bin/bash
cd /home/z/my-project
while true; do
  sleep 900  # 15 minutes
  git add -A 2>/dev/null
  CHANGES=$(git diff --cached --stat | tail -1)
  if [ -n "$CHANGES" ]; then
    git commit -m "Auto-commit: $(date -u '+%Y-%m-%d %H:%M UTC') — bible expansion iteration" 2>/dev/null
    echo "[$(date)] Committed: $CHANGES" >> /home/z/my-project/auto-commit.log
  fi
done
