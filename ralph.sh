#!/bin/bash
MAX_ITERATIONS=${1:-30}
ITERATION=0

echo "🎂 CakeCraft Ralph Loop started"
echo "Max iterations: $MAX_ITERATIONS"
echo "---"

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "=== Iteration $ITERATION / $MAX_ITERATIONS ==="
  echo "$(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  PENDING=$(grep -c '"status": "pending"' tasks.json 2>/dev/null || echo 0)
  IN_PROGRESS=$(grep -c '"status": "in_progress"' tasks.json 2>/dev/null || echo 0)
  DONE=$(grep -c '"status": "done"' tasks.json 2>/dev/null || echo 0)

  echo "Tasks: pending=$PENDING, in_progress=$IN_PROGRESS, done=$DONE"

  if [ "$PENDING" -eq 0 ] && [ "$IN_PROGRESS" -eq 0 ]; then
    echo "✅ All tasks completed!"
    break
  fi

  codex "Read tasks.json and CODEX.md. Find the highest-priority task with status pending whose dependencies are all done. Implement it fully following acceptance_criteria. Update existing files in place. When done, update task status to done in tasks.json, append results to progress.txt, and run git add -A and git commit. Ralph iteration $ITERATION of $MAX_ITERATIONS."

  EXIT_CODE=$?

  if [ $EXIT_CODE -ne 0 ]; then
    echo "⚠️  Agent exited with code $EXIT_CODE. Continuing..."
    sleep 5
  fi

  echo "--- Iteration $ITERATION complete ---"
  sleep 2
done

echo ""
echo "🏁 Ralph Loop finished after $ITERATION iterations"
echo "Final stats:"
echo "  Done: $(grep -c '"status": "done"' tasks.json 2>/dev/null || echo 0)"
echo "  Pending: $(grep -c '"status": "pending"' tasks.json 2>/dev/null || echo 0)"
echo "  In Progress: $(grep -c '"status": "in_progress"' tasks.json 2>/dev/null || echo 0)"
