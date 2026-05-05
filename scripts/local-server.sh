#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.advice-server"
PID_FILE="$STATE_DIR/server.pid"
LOG_FILE="$STATE_DIR/server.log"
HOST="127.0.0.1"
PORT="${ADVICE_PORT:-3000}"

mkdir -p "$STATE_DIR"

is_running() {
  if [[ ! -f "$PID_FILE" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null || true)"

  if [[ -z "$pid" ]]; then
    return 1
  fi

  kill -0 "$pid" 2>/dev/null
}

start_server() {
  if is_running; then
    echo "Advice server already running on http://$HOST:$PORT"
    return 0
  fi

  cd "$ROOT_DIR"
  nohup sh -c "exec ./node_modules/.bin/next dev -H '$HOST' -p '$PORT'" >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"

  for _ in $(seq 1 40); do
    if curl -fsS "http://$HOST:$PORT" >/dev/null 2>&1; then
      echo "Advice server started on http://$HOST:$PORT"
      return 0
    fi
    sleep 0.5
  done

  echo "Advice server failed to start. Log: $LOG_FILE" >&2
  exit 1
}

stop_server() {
  if ! is_running; then
    rm -f "$PID_FILE"
    echo "Advice server is not running"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true

  for _ in $(seq 1 20); do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "Advice server stopped"
      return 0
    fi
    sleep 0.25
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Advice server force-stopped"
}

status_server() {
  if is_running; then
    echo "running http://$HOST:$PORT pid=$(cat "$PID_FILE")"
  else
    echo "stopped"
  fi
}

case "${1:-}" in
  start) start_server ;;
  stop) stop_server ;;
  restart) stop_server; start_server ;;
  status) status_server ;;
  *)
    echo "Usage: scripts/local-server.sh {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
