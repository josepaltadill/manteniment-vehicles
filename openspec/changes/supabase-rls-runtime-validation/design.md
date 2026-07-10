# Diseño: validación runtime local de RLS Supabase

## Decisión arquitectónica

Se implementará un harness de shell y SQL ejecutado con **Supabase CLI + Docker** sobre un proyecto temporal creado por cada ejecución. El harness no acepta URL, project ref, contraseña ni claves externas: obtiene y usa exclusivamente el contenedor PostgreSQL que acaba de crear y cuya identidad puede demostrar.

El comando público será:

```bash
./scripts/validate-supabase-rls.sh
```

Flujo único:

```text
preflight no mutante
  → crear workspace e identidad aleatoria
  → iniciar Supabase local
  → demostrar propiedad/localidad del contenedor
  → aplicar migración desde cero
  → fixtures privilegiados
  → matriz RLS/integridad
  → concurrencia en dos sesiones
  → resumen y código de salida
  → limpieza de recursos propios
```

No se usará PostgreSQL genérico: la imagen local de Supabase aporta `auth.users`, `auth.uid()`, `anon`, `authenticated`, grants y semántica compatible con la migración.

## Componentes y cambios previstos

| Archivo | Responsabilidad |
| --- | --- |
| `scripts/validate-supabase-rls.sh` | Orquestación, preflight, guardas, ejecución, concurrencia, reporte y cleanup. |
| `supabase/validation/config.toml` o plantilla mínima equivalente | Configuración local fija, sin secretos, copiada al workspace temporal. |
| `supabase/validation/fixtures.sql` | Usuarios Auth, dos hogares y datos válidos; solo se ejecuta como `postgres`. |
| `supabase/validation/assertions.sql` | Helpers y matriz secuencial de RLS e integridad. |
| `supabase/validation/concurrency/*.sql` | Dos sesiones y comprobación final del último admin. |
| `supabase/migrations/README.md` | Comando reproducible y bloqueo de despliegue. |

La implementación podrá reducir el número de SQL agrupándolos si mejora el presupuesto de revisión, pero mantendrá separadas preparación privilegiada y assertions bajo roles de aplicación. La migración existente no se modifica.

## Runner y preflight

El script comienza con `set -Eeuo pipefail` y comprueba, sin iniciar contenedores ni conectarse a bases:

1. repositorio y migración esperada presentes;
2. `supabase --version` ejecutable;
3. `docker --version`, `docker info` y acceso al daemon;
4. comandos auxiliares usados por el script (`mktemp`, `docker`, `awk`/`sed`, `timeout` si la concurrencia lo requiere);
5. compatibilidad de la versión CLI con las opciones realmente usadas, mediante `--help`, sin asumirlas.

Se registran versiones exactas de CLI, cliente y servidor Docker. Cualquier ausencia o incompatibilidad termina con código no cero y estado `BLOCKED`, antes de crear o limpiar recursos. No existe fallback a MCP, URL de entorno, Supabase remoto ni PostgreSQL compartido.

La configuración mínima se copia a `mktemp -d` y recibe un `project_id` aleatorio con prefijo `mv-rls-validation-`. Los puertos se reservan para esa ejecución o se dejan asignar por el mecanismo soportado por la versión detectada. Se deshabilitan servicios no necesarios cuando la CLI lo permita; Auth y DB permanecen habilitados.

## Guarda fail-closed del destino

`supabase start` se ejecuta únicamente con el workspace temporal explícito. Antes de aplicar SQL o fixtures, el script debe probar todas estas condiciones:

- el identificador empieza por `mv-rls-validation-` y coincide exactamente con el generado en memoria;
- existe exactamente un contenedor DB asociado a ese proyecto;
- `docker inspect` confirma simultáneamente nombre/labels de proyecto de Supabase, red del proyecto y creación posterior al inicio de esta ejecución;
- el contenedor publica DB solo en loopback (`127.0.0.1`/`::1`) o no publica el puerto;
- dentro del contenedor, `current_database()` es la base local esperada y `inet_server_addr()`/metadatos son coherentes con ese contenedor;
- la ejecución no ha consumido `DATABASE_URL`, `SUPABASE_URL`, project refs, MCP endpoints ni credenciales aportadas por entorno.

La implementación fijará los nombres de labels después de verificar la salida real de la versión CLI instalada; no confiará solo en el nombre del contenedor. Si falta un label, hay más de un candidato, un puerto escucha fuera de loopback o cualquier prueba es ambigua, se aborta **sin SQL y sin cleanup destructivo**. Se informa el recurso para inspección manual.

Después de la guarda, todo SQL se ejecuta con `docker exec` sobre el ID inmutable capturado; no se construye una URL reutilizable ni se imprime la salida de `supabase status` que contiene claves. Quedan prohibidos `db push`, `db reset`, `migration up`, `drop database`, `drop schema` y conexiones recibidas por parámetros o entorno.

## Aplicación aislada y fixtures

El runtime parte de un volumen/proyecto nuevo. Tras superar la guarda, el harness aplica **solo** `supabase/migrations/20260710000000_supabase_persistence_short.sql` con `psql -X -v ON_ERROR_STOP=1` dentro del contenedor. Se verifica que las cuatro tablas esperadas existen, tienen RLS activo y que no apareció ningún objeto funcional fuera del conjunto esperado.

Los fixtures se insertan como `postgres`, nunca como `service_role`:

- usuarios UUID deterministas en `auth.users`: `admin_a`, `admin_a2`, `editor_a`, `admin_b`, `editor_b` y `non_member`;
- hogares A y B con UUID deterministas;
- membresías y vehículos/eventos válidos para ambos hogares.

Los UUID deterministas simplifican assertions y no son credenciales. Los fixtures privilegiados solo crean el estado inicial; ninguna conclusión RLS se obtiene de operaciones como `postgres`.

## Contextos de identidad Supabase

Cada caso abre una transacción nueva y establece explícitamente:

```sql
set local role authenticated;
select set_config('request.jwt.claim.sub', '<user-uuid>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
```

Para anónimo usa `set local role anon` y claims vacíos. Antes de ejecutar el caso se comprueba `current_user`, `auth.uid()` y el rol esperado; una identidad incoherente aborta el caso. `RESET ROLE` y el fin de transacción evitan contaminación entre casos.

## Matriz runtime exacta

| Actor | Operaciones obligatorias |
| --- | --- |
| `anon` | `select`, `insert`, `update` y `delete` sobre cada tabla `mv_*`: cero filas visibles/afectadas o permiso denegado, sin cambios. |
| no miembro | Lectura de A/B y escrituras sobre hogares, membresías, vehículos y eventos: rechazadas; conteos privados no observables. |
| `editor_a` | Lee A, crea/actualiza vehículo y evento A; no ve B; no inserta/actualiza/borrar hogar o membresías; no borra vehículo/evento; no inserta ni mueve filas a B. |
| `admin_a` | Lee y actualiza hogar A, administra membresías A y opera/borrar datos A; no ve ni modifica B; `with check` impide insertar o trasladar vehículo, evento o membresía a B. |
| `admin_b` | Casos espejo mínimos que prueban aislamiento bidireccional. |
| integridad | FK compuesta hogar/vehículo, texto vacío, año/kilómetros/coste negativos, estado/fecha incoherentes, tipo inválido y matrícula duplicada en el mismo hogar; matrícula igual en otro hogar permitida. |
| último admin | Borrado, degradación y traslado del único admin rechazados con `23514`; las tres operaciones se permiten cuando queda otro admin; borrar explícitamente el hogar permite su cascade. |
| concurrencia | Dos sesiones retiran administradores del mismo hogar: finaliza sin deadlock/timeout, una operación queda rechazada si ambas dejarían cero admins y el estado final conserva al menos uno. |

## Estrategia de assertions y fallos esperados

Los casos SQL emiten líneas estables `CASE|id|expected|observed|PASS|FAIL`. Los helpers usan subtransacciones PL/pgSQL para capturar únicamente SQLSTATE esperados. Un error con SQLSTATE distinto se relanza; nunca se usa `WHEN OTHERS THEN NULL`.

Las denegaciones RLS que producen cero filas, en vez de excepción, se comprueban mediante `ROW_COUNT`, resultados visibles y una verificación privilegiada posterior del estado. Cada caso mutante se ejecuta en transacción y revierte, salvo fixtures específicos de concurrencia. Los positivos verifican exactamente filas y valores afectados. `psql` siempre usa `ON_ERROR_STOP=1`; cualquier assertion fallida genera excepción y salida no cero.

La concurrencia usa dos procesos `docker exec ... psql` en segundo plano, scripts con barrera determinista y timeout acotado. Se conservan temporalmente stdout/stderr y códigos de ambas sesiones, se espera a ambos procesos sin ocultar el primero que falle y se valida el conteo final como `postgres`. El cleanup no comienza mientras quede una sesión viva.

## Cortes de implementación

La concurrencia será un **segundo corte explícito** si incluirla supera 400 líneas o mezcla demasiado shell/process control con la matriz secuencial. El primer corte entrega preflight, guarda, runtime y matriz secuencial; su resultado debe indicar `BLOCKED: concurrency pending` y terminar no cero para el gate completo. El segundo corte añade las dos sesiones y es obligatorio antes de considerar la validación aprobada. Un modo interno podrá ejecutar solo la matriz secuencial para desarrollo, pero nunca reportará autorización de despliegue.

## Comando, evidencia y reporte

La salida del comando incluye, sin secretos:

- comando exacto y commit/migración probada;
- versiones de Supabase CLI, Docker e imagen/runtime DB;
- identificador efímero y prueba resumida de localidad/propiedad;
- una línea por caso con actor, operación, hogar, esperado y observado;
- resumen `passed/failed/blocked`, estado de concurrencia, cleanup y código de salida.

No se versionan logs de ejecución. Durante `sdd-apply`, `apply-progress.md` conservará el comando reproducible y un resumen manual conciso con versiones, totales, fallos y bloqueos; no copiará tokens, contraseñas, URLs con credenciales ni output volátil completo.

Código `0` significa que **toda** la matriz, incluida concurrencia y cleanup seguro, pasó. Herramienta ausente, guarda incierta, caso no ejecutado, timeout, cleanup ambiguo o concurrencia pendiente producen código no cero.

## Limpieza

Un trap registra el resultado y detiene únicamente el proyecto cuyo ID y contenedor fueron demostrados como propios. Antes de `supabase stop` o eliminación de volumen repite la comprobación de identidad contra el ID capturado. No ejecuta truncados, cascadas ni limpieza sobre otro destino. Si la identidad cambió o es ambigua, deja el recurso intacto y reporta cleanup manual.

Los archivos temporales usan permisos restrictivos y se eliminan solo tras terminar procesos. Una interrupción conserva la regla de propiedad; seguridad prevalece sobre limpieza automática.

## Riesgos y tradeoffs

- **Dependencia de CLI/imágenes:** puede bloquear entornos offline; no se añade fallback menos fiel.
- **Labels variables por versión:** el preflight valida el contrato real y la implementación documentará la versión probada.
- **Simulación de JWT:** `SET ROLE` + claims prueba PostgreSQL/RLS, no el gateway HTTP; es suficiente para este alcance y evita claves.
- **RLS silencioso:** conteos y verificación posterior evitan confundir cero filas con éxito.
- **Concurrencia no determinista:** barrera, timeout, códigos por sesión y estado final reducen falsos positivos.
- **Tamaño:** separar concurrencia controla revisión, pero mantiene el despliegue bloqueado hasta el segundo corte.

## Fuera de alcance

Supabase real/compartido/persistente, MCP, credenciales compartidas, API HTTP, adaptador TypeScript, UI, seeds permanentes, cambios funcionales de esquema, monitorización/backup de producción y aplicación de la migración real. Un defecto de la migración descubierto por el harness abre una decisión separada; no se corrige silenciosamente aquí.

## Bloqueadores de despliegue

El despliegue permanece bloqueado hasta que una ejecución limpia demuestre: guarda de destino, migración aplicada, matriz completa, integridad, último admin secuencial, concurrencia en dos sesiones, evidencia sin secretos y cleanup seguro. También bloquean cualquier cambio necesario en la migración, una versión de tooling no validada o un caso omitido/blocked.
