#!/bin/bash
# CakeCraft — Ralph Loop
# Запуск: chmod +x ralph.sh && ./ralph.sh
# Или с ограничением итераций: ./ralph.sh 20

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

  # Проверяем, остались ли pending задачи
  PENDING=$(cat tasks.json | grep '"status": "pending"' | wc -l)
  IN_PROGRESS=$(cat tasks.json | grep '"status": "in_progress"' | wc -l)
  DONE=$(cat tasks.json | grep '"status": "done"' | wc -l)

  echo "Tasks: pending=$PENDING, in_progress=$IN_PROGRESS, done=$DONE"

  if [ "$PENDING" -eq 0 ] && [ "$IN_PROGRESS" -eq 0 ]; then
    echo "✅ All tasks completed!"
    break
  fi

  # Запуск Claude Code (замени на codex/opencode при необходимости)
  claude-code --print \
    --system-prompt "$(cat CLAUDE.md)" \
    "Read tasks.json and progress.txt. 
     Find the highest-priority task with status 'pending' whose dependencies are all 'done'.
     Set its status to 'in_progress' in tasks.json.
     Implement the task following its description and acceptance_criteria.
     Run tests if applicable (npm test, npm run lint).
     Commit changes: git add -A && git commit -m 'feat(task-N): title'.
     Update the task status to 'done' in tasks.json.
     APPEND your learnings to progress.txt (use >> not >).
     
     Ralph iteration $ITERATION/$MAX_ITERATIONS.
     Output <promise>DONE</promise> when the task is complete."

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
echo "  Done: $(cat tasks.json | grep '"status": "done"' | wc -l)"
echo "  Pending: $(cat tasks.json | grep '"status": "pending"' | wc -l)"
echo "  In Progress: $(cat tasks.json | grep '"status": "in_progress"' | wc -l)"
