#!/usr/bin/env bash
# Validates only a harness-created local Supabase runtime. It never accepts a target.
set -Eeuo pipefail

readonly ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly MIGRATIONS_DIR="$ROOT_DIR/supabase/migrations"
readonly VALIDATION_DIR="$ROOT_DIR/supabase/validation"
readonly PROJECT_PREFIX='mv-rls-validation-'

workspace=''
project_id=''
container_id=''
started_at=''
phase='preflight'
status='BLOCKED'
passed=0
failed=0
blocked=0
safe_cleanup=false
concurrency='pending'
sessions_finished=true

report() { printf '%s\n' "$1"; }
block() { blocked=$((blocked + 1)); status='BLOCKED'; report "BLOCKED|$1"; }
fail() { failed=$((failed + 1)); status='FAIL'; report "FAIL|$1"; }
pass() { passed=$((passed + 1)); report "PASS|$1"; }
summary() {
  report "SUMMARY|status=$status|passed=$passed|failed=$failed|blocked=$blocked|concurrency=$concurrency"
  if [[ "$concurrency" != 'passed' ]]; then
    report "BLOCKED: concurrency $concurrency"
  fi
}
final_exit_code() {
  local validation_exit_code=$1
  local cleanup_failure=${2:-}
  if (( validation_exit_code == 0 )) && [[ -n "$cleanup_failure" ]]; then
    printf '1\n'
  else
    printf '%s\n' "$validation_exit_code"
  fi
}
cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ "$sessions_finished" != true ]]; then
    block 'cleanup|concurrency-process-still-live|manual-inspection-required'
    exit_code="$(final_exit_code "$exit_code" 'concurrency-process-still-live')"
  elif [[ "$safe_cleanup" == true && -n "$workspace" && -n "$container_id" ]] && owns_runtime; then
    # This stop is scoped to the generated project and is never run after an ambiguous guard.
    if supabase stop --workdir "$workspace" >/dev/null 2>&1; then
      rm -rf -- "$workspace"
      report 'PASS|cleanup|owned-runtime-stopped-and-workspace-removed'
    else
      safe_cleanup=false
      block "cleanup|stop-failed|workspace=$workspace|manual-inspection-required"
      # Cleanup is part of the gate: it must fail a future otherwise-successful cut.
      exit_code="$(final_exit_code "$exit_code" 'stop-failed')"
    fi
  elif [[ -n "$workspace" ]]; then
    report 'BLOCKED|cleanup|ownership-not-proven|manual-inspection-required'
    # An unproven cleanup is also a failed gate, never a successful validation.
    exit_code="$(final_exit_code "$exit_code" 'ownership-not-proven')"
  fi
  summary
  exit "$exit_code"
}
reject_external_inputs() {
  local name
  for name in DATABASE_URL SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
    SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF MCP_ENDPOINT MCP_SUPABASE_URL; do
    if [[ -n "${!name:-}" ]]; then
      block "preflight|external-target|$name"
      return 1
    fi
  done
  for name in DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH \
    DOCKER_API_VERSION DOCKER_CONFIG; do
    if [[ -n "${!name:-}" ]]; then
      block "preflight|docker-routing-env|$name"
      return 1
    fi
  done
}
verify_local_docker_endpoint() {
  local context endpoint
  context="$(docker context show)" || { block 'preflight|docker-context-unavailable'; return 1; }
  endpoint="$(docker context inspect "$context" --format '{{.Endpoints.docker.Host}}')" || {
    block 'preflight|docker-endpoint-unavailable'; return 1;
  }
  case "$endpoint" in
    unix:///*) ;;
    *) block "preflight|docker-endpoint-not-local|context=$context"; return 1 ;;
  esac
  report "PASS|preflight|docker-context=$context|endpoint=local-unix-socket"
}
require_command() {
  local command=$1
  if ! command -v "$command" >/dev/null 2>&1; then
    block "preflight|missing-tool|$command"
    return 1
  fi
}
preflight() {
  reject_external_inputs || return 1
  [[ -f "$MIGRATIONS_DIR/20260710000000_supabase_persistence_short.sql" ]] || { block 'preflight|missing-base-migration'; return 1; }
  [[ -f "$MIGRATIONS_DIR/20260711000000_mv_households_nombre_unique.sql" ]] || { block 'preflight|missing-household-name-migration'; return 1; }
  [[ -f "$MIGRATIONS_DIR/20260712000000_mv_platform_roles.sql" ]] || { block 'preflight|missing-platform-roles-migration'; return 1; }
  [[ -f "$VALIDATION_DIR/config.toml" ]] || { block 'preflight|missing-config'; return 1; }
  require_command supabase || return 1
  require_command docker || return 1
  require_command mktemp || return 1
  require_command awk || return 1
  require_command grep || return 1
  require_command sed || return 1
  require_command timeout || return 1
  local supabase_version docker_version
  supabase_version="$(supabase --version)" || { block 'preflight|supabase-version'; return 1; }
  docker_version="$(docker --version)" || { block 'preflight|docker-version'; return 1; }
  verify_local_docker_endpoint || return 1
  docker info >/dev/null || { block 'preflight|docker-daemon-unavailable'; return 1; }
  supabase start --help | grep -q -- '--workdir' || { block 'preflight|unsupported-cli|start-workdir'; return 1; }
  supabase stop --help | grep -q -- '--workdir' || { block 'preflight|unsupported-cli|stop-workdir'; return 1; }
  report "PASS|preflight|supabase=$supabase_version"
  report "PASS|preflight|docker=$docker_version"
}

create_workspace() {
  phase='runtime'
  workspace="$(mktemp -d -t mv-rls-validation.XXXXXXXX)"
  chmod 700 "$workspace"
  project_id="${PROJECT_PREFIX}$(date +%s)-$RANDOM"
  started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  mkdir -p "$workspace/supabase"
  sed "s/__PROJECT_ID__/$project_id/" "$VALIDATION_DIR/config.toml" > "$workspace/supabase/config.toml"
  cat "$MIGRATIONS_DIR/20260710000000_supabase_persistence_short.sql" \
    "$MIGRATIONS_DIR/20260711000000_mv_households_nombre_unique.sql" \
    "$MIGRATIONS_DIR/20260712000000_mv_platform_roles.sql" > "$workspace/migration.sql"
  cp "$VALIDATION_DIR/fixtures.sql" "$workspace/fixtures.sql"
  cp "$VALIDATION_DIR/assertions.sql" "$workspace/assertions.sql"
  cp -R "$VALIDATION_DIR/concurrency" "$workspace/concurrency"
  local start_log="$workspace/supabase-start.log"
  : > "$start_log"
  chmod 600 "$start_log"
  if ! supabase start --workdir "$workspace" >"$start_log" 2>&1; then
    fail "runtime|start-failed|details-in-restricted-workspace-log"
    return 1
  fi
  report "PASS|runtime|project=$project_id|started_at=$started_at|start-output=captured"

}

owns_runtime() {
  [[ -n "$container_id" ]] || return 1
  [[ "$project_id" == "$PROJECT_PREFIX"* ]] || return 1
  docker inspect "$container_id" >/dev/null 2>&1 || return 1
  local created created_epoch started_epoch label project_label service name network
  created="$(docker inspect -f '{{.Created}}' "$container_id")"
  created_epoch="$(date -d "$created" +%s 2>/dev/null)" || return 1
  started_epoch="$(date -d "$started_at" +%s 2>/dev/null)" || return 1
  label="$(docker inspect -f '{{index .Config.Labels "com.supabase.cli.project"}}' "$container_id")"
  project_label="$(docker inspect -f '{{index .Config.Labels "com.supabase.project"}}' "$container_id")"
  service="$(docker inspect -f '{{index .Config.Labels "com.supabase.cli.service"}}' "$container_id")"
  name="$(docker inspect -f '{{.Name}}' "$container_id")"
  network="$(docker inspect -f '{{range $k, $_ := .NetworkSettings.Networks}}{{$k}} {{end}}' "$container_id")"
  [[ "$created_epoch" -ge "$started_epoch" && ( "$label" == "$project_id" || "$project_label" == "$project_id" ) \
    && ( "$service" == 'db' || "$name" == "/supabase_db_$project_id" ) && "$network" == *"$project_id"* ]]
}

guard_local_runtime() {
  phase='guard'
  local candidate cli_project project_label service name
  local -a candidates=()
  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    cli_project="$(docker inspect -f '{{index .Config.Labels "com.supabase.cli.project"}}' "$candidate")"
    project_label="$(docker inspect -f '{{index .Config.Labels "com.supabase.project"}}' "$candidate")"
    service="$(docker inspect -f '{{index .Config.Labels "com.supabase.cli.service"}}' "$candidate")"
    name="$(docker inspect -f '{{.Name}}' "$candidate")"
    if [[ ( "$cli_project" == "$project_id" || "$project_label" == "$project_id" ) \
      && ( "$service" == 'db' || "$name" == "/supabase_db_$project_id" ) ]]; then
      candidates+=("$candidate")
    fi
  done < <(docker ps -aq)
  if [[ ${#candidates[@]} -ne 1 ]]; then
    block "guard|db-container-count|${#candidates[@]}"
    return 1
  fi
  container_id="${candidates[0]}"
  if ! owns_runtime; then
    block 'guard|ownership-or-labels-unproven'
    return 1
  fi
  local ports database server
  ports="$(docker inspect -f '{{range $p, $bindings := .NetworkSettings.Ports}}{{range $bindings}}{{.HostIp}}:{{.HostPort}} {{end}}{{end}}' "$container_id")"
  if [[ "$ports" == *'0.0.0.0:'* || "$ports" == *'[::]:'* ]]; then
    # CLI 2.109.1 publishes local services on wildcard host addresses. This is
    # accepted only after the local Unix Docker endpoint and runtime ownership
    # checks above have succeeded; remote routing and ambiguous ownership fail first.
    report 'WARN|guard|wildcard-host-binding|local-docker-endpoint-and-owned-runtime'
  fi
  database="$(docker exec "$container_id" psql -U postgres -d postgres -X -Atqc 'select current_database()')"
  server="$(docker exec "$container_id" psql -U postgres -d postgres -X -Atqc 'select coalesce(inet_server_addr()::text, $$local$$)')"
  if [[ "$database" != 'postgres' || -z "$server" ]]; then
    block 'guard|database-identity-unproven'
    return 1
  fi
  safe_cleanup=true
  report "PASS|guard|container=${container_id:0:12}|database=$database"
}

run_sql() {
  local file=$1
  docker exec -i "$container_id" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 < "$file"
}
apply_and_validate() {
  phase='sql'
  run_sql "$workspace/migration.sql" || return 1
  run_sql "$workspace/fixtures.sql" || return 1
  run_sql "$workspace/assertions.sql" || return 1
  pass 'sql|migration-fixtures-sequential-matrix'
}

run_concurrency() {
  phase='concurrency'
  local log_a="$workspace/concurrency-session-a.log"
  local log_b="$workspace/concurrency-session-b.log"
  local code_a code_b admins

  run_sql "$workspace/concurrency/setup.sql" || return 1
  sessions_finished=false
  timeout --kill-after=5s 20s docker exec -i "$container_id" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 \
    < "$workspace/concurrency/session-a.sql" >"$log_a" 2>&1 &
  local pid_a=$!
  timeout --kill-after=5s 20s docker exec -i "$container_id" psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 \
    < "$workspace/concurrency/session-b.sql" >"$log_b" 2>&1 &
  local pid_b=$!

  if wait "$pid_a"; then code_a=0; else code_a=$?; fi
  if wait "$pid_b"; then code_b=0; else code_b=$?; fi
  sessions_finished=true
  if (( code_a != 0 || code_b != 0 )); then
    fail "concurrency|session-exit|a=$code_a|b=$code_b"
    return 1
  fi
  if ! grep -q 'CASE|concurrency.session-a|delete-or-23514|.*|PASS' "$log_a" \
    || ! grep -q 'CASE|concurrency.session-b|delete-or-23514|.*|PASS' "$log_b"; then
    fail 'concurrency|missing-session-evidence'
    return 1
  fi
  admins="$(timeout --kill-after=5s 20s docker exec "$container_id" psql -U postgres -d postgres -X -Atqc "select count(*) from public.mv_household_members where household_id = '10000000-0000-0000-0000-00000000000a' and rol = 'admin'")"
  if [[ "$admins" != '1' ]]; then
    fail "concurrency|final-admin-count|expected=1|observed=$admins"
    return 1
  fi
  concurrency='passed'
  pass 'concurrency|two-sessions|one-admin-remains'
}

main() {
  report 'COMMAND|./scripts/validate-supabase-rls.sh'
  preflight || return 1
  create_workspace || return 1
  guard_local_runtime || return 1
  apply_and_validate || { fail "sql|$phase"; return 1; }
  run_concurrency || return 1
  status='PASS'
  pass 'gate|complete-runtime-validation'
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  trap cleanup EXIT
  trap 'exit 130' INT TERM
  main "$@"
fi
