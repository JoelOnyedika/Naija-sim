#!/bin/bash
# usage: run.sh script.py  — starts a fresh dev server, runs the script, stops the server
cd /home/claude/nl/nigeria-life
npx vite --port 5173 --host 127.0.0.1 > /tmp/vite.log 2>&1 &
VP=$!
for i in $(seq 1 30); do sleep 0.5; curl -s -o /dev/null http://127.0.0.1:5173/ && break; done
cd /home/claude/nl/e2e && timeout ${2:-200} python3 "$1"
kill $VP 2>/dev/null; wait $VP 2>/dev/null
