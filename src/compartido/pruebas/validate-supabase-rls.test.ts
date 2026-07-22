import { describe, expect, it } from 'vitest';
import { access, chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

type RunOptions = {
  env?: Record<string, string | undefined>;
  path?: string;
};

function runHarness(options: RunOptions = {}) {
  return spawnSync('/bin/bash', ['scripts/validate-supabase-rls.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...options.env, PATH: options.path ?? process.env.PATH },
  });
}

async function fakeExecutable(directory: string, name: string, body: string) {
  const path = join(directory, name);
  await writeFile(path, `#!/bin/bash\nset -eu\n${body}\n`);
  await chmod(path, 0o755);
}

describe('validate-supabase-rls shell contracts', () => {
  it('declares every remaining sequential RLS and integrity case in the runtime matrix', async () => {
    const assertionsPath = fileURLToPath(new URL('../../../supabase/validation/assertions.sql', import.meta.url));
    const assertions = await readFile(assertionsPath, 'utf8');

    expect(assertions).toContain("'admin-b.identity'");
    expect(assertions).toContain("'editor-a.insert-event-a'");
    expect(assertions).toContain("'admin-a.insert-member-a'");
    expect(assertions).toContain("'integrity.invalid-vehicle-kilometres'");
    expect(assertions).toContain("'last-admin.demote'");
    expect(assertions).toContain("'last-admin.move'");
    expect(assertions).toContain("'last-admin.delete-allowed-with-second-admin'");
    expect(assertions).toContain("'cascade.delete-household-as-admin-b'");
    expect(assertions).toContain("'post-negative.cross-household-event'");
  });

  it('requires the closed mv_platform_roles migration and its RLS matrix', async () => {
    const migrationPath = fileURLToPath(new URL('../../../supabase/migrations/20260712000000_mv_platform_roles.sql', import.meta.url));
    const [migration, assertions] = await Promise.all([readFile(migrationPath, 'utf8'), readFile(fileURLToPath(new URL('../../../supabase/validation/assertions.sql', import.meta.url)), 'utf8')]);

    expect(migration).toContain('create table public.mv_platform_roles');
    expect(migration).toContain("check (rol = 'superadmin')");
    expect(migration).toContain('references auth.users(id) on delete cascade');
    expect(migration).toContain('enable row level security');
    expect(migration).toContain('revoke all on public.mv_platform_roles from anon, authenticated');
    expect(assertions).toContain("'anon.select.platform-roles'");
    expect(assertions).toContain("'non-member.select.platform-roles'");
    expect(assertions).toContain("'editor-a.select.platform-roles'");
    expect(assertions).toContain("'admin-b.select.platform-roles'");
    expect(assertions).toContain("'non-member.insert.platform-roles'");
    expect(assertions).toContain("'non-member.update.platform-roles'");
    expect(assertions).toContain("'non-member.delete.platform-roles'");
  });

  it('requires two bounded concurrent last-admin sessions before the harness can pass', async () => {
    const harnessPath = fileURLToPath(new URL('../../../scripts/validate-supabase-rls.sh', import.meta.url));
    const sessionAPath = fileURLToPath(new URL('../../../supabase/validation/concurrency/session-a.sql', import.meta.url));
    const sessionBPath = fileURLToPath(new URL('../../../supabase/validation/concurrency/session-b.sql', import.meta.url));
    const [harness, sessionA, sessionB] = await Promise.all([
      readFile(harnessPath, 'utf8'),
      readFile(sessionAPath, 'utf8'),
      readFile(sessionBPath, 'utf8'),
    ]);

    expect(harness).toContain('run_concurrency');
    expect(harness).toContain('timeout --kill-after=5s 20s docker exec -i');
    expect(harness).toContain('timeout --kill-after=5s 20s docker exec "$container_id" psql');
    expect(harness).toContain("concurrency='passed'");
    expect(harness).toContain("status='PASS'");
    expect(sessionA).toContain('concurrency.session-a');
    expect(sessionB).toContain('concurrency.session-b');
  });

  it('exits zero only when sequential SQL, concurrency sessions, final admin count, and cleanup pass', async () => {
    const tools = await mkdtemp(join(tmpdir(), 'mv-rls-concurrency-success-'));
    const marker = join(tools, 'invocations');

    try {
      await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == 'start' || "$1" == 'stop' ]] && [[ "\${2:-}" == '--help' ]] && { echo --workdir; exit 0; }
if [[ "$1" == start ]]; then awk -F'"' '/^project_id/{print $2}' "$3/supabase/config.toml" > "${marker}.project"; exit 0; fi
[[ "$1" == stop ]] && exit 0
exit 1`);
      await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == info ]] && exit 0
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
[[ "$1 $2" == 'ps -aq' ]] && { echo db-owned; exit 0; }
[[ "$1" == inspect && "\${2:-}" != -f ]] && exit 0
project_id="$(cat "${marker}.project")"
if [[ "$1" == inspect ]]; then case "$3" in *project*) echo "$project_id";; *service*) echo db;; *Name*) echo "/supabase_db_$project_id";; *Created*) echo 2999-01-01T00:00:00Z;; *Networks*) echo "$project_id";; *Ports*) echo 127.0.0.1:54322;; esac; exit 0; fi
if [[ "$1" == exec ]]; then
  if [[ "$*" == *current_database* ]]; then echo postgres; exit 0; fi
  if [[ "$*" == *inet_server_addr* ]]; then echo 127.0.0.1; exit 0; fi
  if [[ "$*" == *'count(*)'* ]]; then echo 1; exit 0; fi
  input="$(cat)"
  if [[ "$input" == *concurrency.session-a* ]]; then echo 'NOTICE:  CASE|concurrency.session-a|delete-or-23514|delete|PASS'; fi
  if [[ "$input" == *concurrency.session-b* ]]; then echo 'NOTICE:  CASE|concurrency.session-b|delete-or-23514|23514|PASS'; fi
  exit 0
fi
exit 1`);

      const result = runHarness({ env: { MV_FAKE_PROJECT_ID: 'mv-rls-validation-placeholder' }, path: `${tools}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('PASS|sql|migration-fixtures-sequential-matrix');
      expect(result.stdout).toContain('PASS|concurrency|two-sessions|one-admin-remains');
      expect(result.stdout).toContain('PASS|gate|complete-runtime-validation');
      expect(result.stdout).toContain('SUMMARY|status=PASS|passed=3|failed=0|blocked=0|concurrency=passed');
      expect(invocations).toContain('supabase stop --no-backup --workdir');
    } finally { await rm(tools, { force: true, recursive: true }); }
  });

  it('stops the sequential matrix before reporting success when any SQL file fails', async () => {
    const harnessPath = fileURLToPath(new URL('../../../scripts/validate-supabase-rls.sh', import.meta.url));
    const harness = await readFile(harnessPath, 'utf8');

    expect(harness).toContain('run_sql "$workspace/migration.sql" || return 1');
    expect(harness).toContain('run_sql "$workspace/fixtures.sql" || return 1');
    expect(harness).toContain('run_sql "$workspace/assertions.sql" || return 1');
    expect(harness).toContain('20260711000000_mv_households_nombre_unique.sql');
    expect(harness).toContain('20260713000000_family_app_modularization.sql');
    expect(harness).toContain('missing-household-name-migration');
  });

  it('blocks without mutation when the Supabase CLI is unavailable', () => {
    const result = runHarness({ path: '/usr/bin:/bin' });

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('BLOCKED|preflight|missing-tool|supabase');
    expect(result.stdout).toContain('SUMMARY|status=BLOCKED');
  });

  it.each(['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'])(
    'rejects remote Docker routing variable %s before invoking any tool',
    async (variable) => {
      const workspace = await mkdtemp(join(tmpdir(), 'mv-rls-docker-env-'));
      const marker = join(workspace, 'invocations');

      try {
        await fakeExecutable(workspace, 'supabase', `echo "supabase $*" >> "${marker}"`);
        await fakeExecutable(workspace, 'docker', `echo "docker $*" >> "${marker}"`);
        const result = runHarness({
          env: { [variable]: 'remote-value' },
          path: `${workspace}:/usr/bin:/bin`,
        });

        expect(result.status).not.toBe(0);
        expect(result.stdout).toContain(`BLOCKED|preflight|docker-routing-env|${variable}`);
        await expect(access(marker)).rejects.toThrow();
      } finally {
        await rm(workspace, { force: true, recursive: true });
      }
    },
  );

  it('rejects a remote active Docker endpoint before Supabase start or Docker exec/cleanup', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mv-rls-docker-context-'));
    const marker = join(workspace, 'invocations');

    try {
      await fakeExecutable(workspace, 'supabase', `
        echo "supabase $*" >> "${marker}"
        case "$1" in
          --version) echo 'supabase fake' ;;
          start|stop) [[ "\${2:-}" == '--help' ]] && echo '--workdir' ;;
        esac
      `);
      await fakeExecutable(workspace, 'docker', `
        echo "docker $*" >> "${marker}"
        [[ "$1" == '--version' ]] && { echo 'Docker fake'; exit 0; }
        [[ "$1" == 'info' ]] && exit 0
        [[ "$1 $2" == 'context show' ]] && { echo 'remote'; exit 0; }
        [[ "$1 $2" == 'context inspect' ]] && { echo 'tcp://remote.example.test:2376'; exit 0; }
        exit 1
      `);

      const result = runHarness({ path: `${workspace}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');

      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('BLOCKED|preflight|docker-endpoint-not-local');
      expect(invocations).not.toContain('supabase start --workdir');
      expect(invocations).not.toContain('docker exec');
      expect(invocations).not.toContain('supabase stop --workdir');
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it('blocks when Docker is unavailable after Supabase is verified, without mutation', async () => {
    const tools = await mkdtemp(join(tmpdir(), 'mv-rls-no-docker-'));
    const marker = join(tools, 'invocations');
    try {
      await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
exit 1`);
      await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
[[ "$1" == info ]] && exit 1
exit 1`);
      const result = runHarness({ path: `${tools}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('BLOCKED|preflight|docker-daemon-unavailable');
      expect(invocations).toContain('supabase --version');
      expect(invocations).not.toContain('supabase start');
      expect(invocations).not.toContain('docker exec');
      expect(invocations).not.toContain('supabase stop');
    } finally { await rm(tools, { force: true, recursive: true }); }
  });

  it('fails closed when Supabase start fails, without runtime PASS, guard, or cleanup stop', async () => {
    const tools = await mkdtemp(join(tmpdir(), 'mv-rls-start-failure-'));
    const marker = join(tools, 'invocations');
    try {
      await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == 'start' || "$1" == 'stop' ]] && [[ "\${2:-}" == '--help' ]] && { echo --workdir; exit 0; }
[[ "$1" == start ]] && { echo 'invalid local config' >&2; exit 23; }
exit 1`);
      await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == info ]] && exit 0
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
exit 1`);

      const result = runHarness({ path: `${tools}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('FAIL|runtime|start-failed');
      expect(result.stdout).not.toContain('PASS|runtime|');
      expect(invocations).not.toContain('docker ps -aq');
      expect(invocations).not.toContain('supabase stop --workdir');
    } finally { await rm(tools, { force: true, recursive: true }); }
  });

  it.each([['zero', ''], ['multiple', 'db-one\\ndb-two'], ['ambiguous', 'db-ambiguous']])(
    'blocks for %s DB container candidates before SQL', async (scenario, candidates) => {
      const tools = await mkdtemp(join(tmpdir(), `mv-rls-${scenario}-`));
      const marker = join(tools, 'invocations');
      try {
        await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == 'start' || "$1" == 'stop' ]] && [[ "\${2:-}" == '--help' ]] && { echo --workdir; exit 0; }
if [[ "$1" == start ]]; then awk -F'"' '/^project_id/{print $2}' "$3/supabase/config.toml" > "${marker}.project"; exit 0; fi
exit 1`);
        await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == info ]] && exit 0
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
[[ "$1 $2" == 'ps -aq' ]] && { printf '%b\\n' '${candidates}'; exit 0; }
project_id="$(cat "${marker}.project")"
if [[ "$1" == inspect && "\${2:-}" == -f ]]; then case "$3" in *project*) echo "$project_id";; *service*) echo db;; *Name*) echo "/supabase_db_$project_id";; *Created*) echo 2999-01-01T00:00:00Z;; *Networks*) echo wrong-network;; esac; exit 0; fi
[[ "$1" == inspect ]] && exit 0
exit 1`);
        const result = runHarness({ env: { MV_FAKE_PROJECT_ID: 'mv-rls-validation-placeholder' }, path: `${tools}:/usr/bin:/bin` });
        const invocations = await readFile(marker, 'utf8');
        expect(result.status).not.toBe(0);
        expect(result.stdout).toContain(scenario === 'ambiguous' ? 'BLOCKED|guard|ownership-or-labels-unproven' : `BLOCKED|guard|db-container-count|${scenario === 'zero' ? 0 : 2}`);
        expect(invocations).not.toContain('docker exec');
        expect(invocations).not.toContain('supabase stop --workdir');
      } finally { await rm(tools, { force: true, recursive: true }); }
    },
  );

  it('captures start secrets and permits proven local wildcard bindings', async () => {
    const tools = await mkdtemp(join(tmpdir(), 'mv-rls-local-wildcard-'));
    const marker = join(tools, 'invocations');
    const secret = 'service_role_secret_must_not_leak';
    try {
      await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo '2.109.1'; exit 0; }
[[ "$1" == 'start' || "$1" == 'stop' ]] && [[ "\${2:-}" == '--help' ]] && { echo --workdir; exit 0; }
if [[ "$1" == start ]]; then awk -F'"' '/^project_id/{print $2}' "$3/supabase/config.toml" > "${marker}.project"; echo 'service_role key: ${secret}'; exit 0; fi
[[ "$1" == stop ]] && exit 0
exit 1`);
      await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo 'Docker fake'; exit 0; }
[[ "$1" == info ]] && exit 0
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
[[ "$1 $2" == 'ps -aq' ]] && { echo db-owned; exit 0; }
[[ "$1" == inspect && "\${2:-}" != -f ]] && exit 0
project_id="$(cat "${marker}.project")"
if [[ "$1" == inspect ]]; then case "$3" in *project*) echo "$project_id";; *service*) echo db;; *Name*) echo "/supabase_db_$project_id";; *Created*) echo 2999-01-01T00:00:00Z;; *Networks*) echo "$project_id";; *Ports*) echo '0.0.0.0:54322 [::]:54322';; esac; exit 0; fi
if [[ "$1" == exec ]]; then [[ "$*" == *current_database* ]] && echo postgres || echo 172.18.0.2; exit 0; fi
exit 1`);
      const result = runHarness({ path: `${tools}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');
      expect(result.status).not.toBe(0);
      expect(result.stdout).not.toContain(secret);
      expect(result.stderr).not.toContain(secret);
      expect(result.stdout).toContain('WARN|guard|wildcard-host-binding|local-docker-endpoint-and-owned-runtime');
      expect(result.stdout).toContain('PASS|sql|migration-fixtures-sequential-matrix');
      expect(result.stdout).toContain('PASS|cleanup|owned-runtime-stopped-and-workspace-removed');
      const dockerExecInvocations = invocations
        .split('\n')
        .filter((invocation) => invocation.startsWith('docker exec'));
      expect(dockerExecInvocations).toHaveLength(8);
      expect(dockerExecInvocations.every((invocation) => invocation.includes('psql -U postgres -d postgres'))).toBe(true);
      expect(dockerExecInvocations.filter((invocation) => invocation.includes('-i db-owned'))).toHaveLength(6);
      expect(invocations).toContain('supabase stop --no-backup --workdir');
    } finally { await rm(tools, { force: true, recursive: true }); }
  });

  it('exits non-zero and preserves the workspace when cleanup cannot stop an owned runtime', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mv-rls-cleanup-unit-stop-'));

    try {
      const result = spawnSync(
        '/bin/bash',
        [
          '-c',
          `source scripts/validate-supabase-rls.sh
workspace="$TEST_WORKSPACE"
project_id='mv-rls-validation-cleanup-test'
container_id='db-owned'
started_at='2000-01-01T00:00:00Z'
safe_cleanup=true
owns_runtime() { return 0; }
supabase() { return 23; }
true
cleanup`,
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: { ...process.env, TEST_WORKSPACE: workspace },
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain(`BLOCKED|cleanup|stop-failed|workspace=${workspace}`);
      await expect(access(workspace)).resolves.toBeUndefined();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it('exits non-zero and preserves the workspace when cleanup cannot prove ownership', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mv-rls-cleanup-unit-ownership-'));

    try {
      const result = spawnSync(
        '/bin/bash',
        [
          '-c',
          `source scripts/validate-supabase-rls.sh
workspace="$TEST_WORKSPACE"
project_id='mv-rls-validation-cleanup-test'
container_id='db-unproven'
started_at='2000-01-01T00:00:00Z'
safe_cleanup=true
owns_runtime() { return 1; }
supabase() { printf 'unexpected supabase invocation\\n' >&2; return 99; }
true
cleanup`,
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: { ...process.env, TEST_WORKSPACE: workspace },
        },
      );

      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('BLOCKED|cleanup|ownership-not-proven|manual-inspection-required');
      expect(result.stderr).not.toContain('unexpected supabase invocation');
      await expect(access(workspace)).resolves.toBeUndefined();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });

  it('preserves the workspace when owned-runtime cleanup stop fails', async () => {
    const tools = await mkdtemp(join(tmpdir(), 'mv-rls-cleanup-stop-'));
    const marker = join(tools, 'invocations');
    try {
      await fakeExecutable(tools, 'supabase', `echo "supabase $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == 'start' || "$1" == 'stop' ]] && [[ "\${2:-}" == '--help' ]] && { echo --workdir; exit 0; }
if [[ "$1" == start ]]; then awk -F'"' '/^project_id/{print $2}' "$3/supabase/config.toml" > "${marker}.project"; exit 0; fi
[[ "$1" == stop ]] && exit 23
exit 1`);
      await fakeExecutable(tools, 'docker', `echo "docker $*" >> "${marker}"
[[ "$1" == '--version' ]] && { echo fake; exit 0; }
[[ "$1" == info ]] && exit 0
[[ "$1 $2" == 'context show' ]] && { echo default; exit 0; }
[[ "$1 $2" == 'context inspect' ]] && { echo unix:///var/run/docker.sock; exit 0; }
[[ "$1 $2" == 'ps -aq' ]] && { echo db-owned; exit 0; }
[[ "$1" == inspect && "\${2:-}" != -f ]] && exit 0
project_id="$(cat "${marker}.project")"
if [[ "$1" == inspect ]]; then case "$3" in *project*) echo "$project_id";; *service*) echo db;; *Name*) echo "/supabase_db_$project_id";; *Created*) echo 2999-01-01T00:00:00Z;; *Networks*) echo "$project_id";; *Ports*) echo 127.0.0.1:54322;; esac; exit 0; fi
if [[ "$1" == exec ]]; then [[ "$*" == *current_database* ]] && echo postgres || echo 127.0.0.1; exit 0; fi
exit 1`);
      const result = runHarness({ env: { MV_FAKE_PROJECT_ID: 'mv-rls-validation-placeholder' }, path: `${tools}:/usr/bin:/bin` });
      const invocations = await readFile(marker, 'utf8');
      const stopMatch = invocations.match(/supabase stop --no-backup --workdir ([^\n]+)/);
      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('BLOCKED|cleanup|stop-failed|workspace=');
      expect(stopMatch).not.toBeNull();
      await expect(access(stopMatch![1])).resolves.toBeUndefined();
    } finally { await rm(tools, { force: true, recursive: true }); }
  });

  it('rejects externally supplied targets before checking tools or mutating', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mv-rls-test-'));
    const marker = join(workspace, 'mutation-marker');

    try {
      const result = runHarness({
        env: {
          DATABASE_URL: 'postgresql://shared.example.test/db',
          MV_RLS_MUTATION_MARKER: marker,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stdout).toContain('BLOCKED|preflight|external-target|DATABASE_URL');
      expect(result.stdout).toContain('SUMMARY|status=BLOCKED');
      await expect(access(marker)).rejects.toThrow();
    } finally {
      await rm(workspace, { force: true, recursive: true });
    }
  });
});
