# Guardarraíles para migraciones Supabase

Este proyecto usa una instancia Supabase compartida. Las migraciones deben tratarse como cambios sensibles aunque las tablas de esta app sean nuevas.

## Reglas obligatorias

- Todos los objetos propios de esta app deben usar prefijo `mv_`.
- Las tablas permitidas en este corte son `mv_households`, `mv_household_members`, `mv_vehiculos`, `mv_eventos_vehiculo` y `mv_platform_roles`.
- No se permite ejecutar reset global de base de datos.
- No se permite `drop schema`, `drop database` ni borrados no acotados.
- Cualquier borrado de datos de prueba debe limitarse explícitamente a tablas `mv_*`.
- Las migraciones se versionan en este directorio antes de aplicarse en el servidor.
- El SQL se revisa antes de ejecutarse contra la instancia real.
- No se crean tablas futuras de adjuntos, OCR, IA, manuales ni notificaciones en este MVP.
- La matrícula debe ser única por `(household_id, matricula)` en `mv_vehiculos`, incluyendo vehículos inactivos.
- Vehículos y eventos requieren `household_id`; los eventos deben usar una FK compuesta `(household_id, vehiculo_id)` hacia vehículos para impedir cruces entre hogares.
- El borrado explícito de un hogar elimina en cascada sus membresías, vehículos y eventos. La FK vehículo→eventos también implica que borrar directamente un vehículo elimina su historial: PostgreSQL no distingue la causa del borrado padre, por lo que se acepta este tradeoff para mantener coherencia y el borrado directo sigue reservado a `admin` por RLS.
- Los roles son `admin` y `editor`: solo `admin` administra hogares y membresías; ambos operan vehículos y eventos. El primer `admin` se crea únicamente mediante bootstrap server-only, nunca mediante una policy autenticada.
- Un hogar no puede perder su último `admin` mediante un `update` o `delete` normal de membresía autenticada; esta invariante crítica se aplica en PostgreSQL con triggers `mv_*`, no solo en RLS o en código de aplicación.
- Las funciones RLS de membresía usan `security definer`, `stable`, `search_path` vacío, referencias cualificadas y ejecución solo para `authenticated`.
- Los grants directos a `authenticated` existen exclusivamente para que PostgreSQL pueda evaluar y aplicar RLS bajo el rol Supabase autenticado. No autorizan acceso directo desde producto o navegador.
- Kilometrajes y costes no pueden ser negativos.
- No se guarda ninguna clave privilegiada o `service_role` en código cliente.
- El acceso de aplicación a datos `mv_*` debe pasar por servidor/adaptadores de servidor. El acceso directo desde producto o navegador queda fuera de alcance hasta que se decida el adaptador futuro.
- Las tablas nuevas deben quedar protegidas a nivel de base de datos antes de aplicar la migración real: RLS activado sin políticas permisivas por defecto, o privilegios `anon`/`authenticated` explícitamente revocados, o una excepción privada documentada y autorizada.
- Una prueba RLS runtime completa en una base local o efímera es un bloqueo de despliegue: debe pasar antes de aplicar esta migración a cualquier Supabase real.

## Limpieza segura de datos de prueba

Si hace falta limpiar solo datos de esta app, usar una operación acotada a tablas `mv_*` y sin `cascade`.

Ejemplo permitido:

```sql
truncate table mv_eventos_vehiculo, mv_vehiculos restart identity;
```

Reglas para limpieza:

- No usar `cascade`.
- No incluir tablas sin prefijo `mv_`.
- Si PostgreSQL rechaza la limpieza por dependencias externas, detenerse y revisar; no forzar con `cascade`.
- Confirmar explícitamente el comando antes de ejecutarlo contra la instancia real.

## Recuperación posterior a una aplicación real

Cada despliegue debe nombrar en su registro un **operador responsable** con acceso autorizado. Antes de aplicar, ese operador debe registrar un backup restaurable (snapshot/PITR o export equivalente), comprobar su retención y ensayar una restauración y un fix-forward en local/efímero.

Si aparece un defecto:

1. Pausar escrituras cuando exista riesgo para integridad o aislamiento.
2. Preferir SQL aditivo de fix-forward si los datos siguen íntegros, el aislamiento puede restablecerse de inmediato y la corrección fue revisada.
3. Elegir rollback/restauración si integridad o aislamiento no pueden garantizarse, o si el fix-forward no es seguro dentro de la ventana de emergencia.
4. Preservar datos: no usar `drop`, `truncate`, resets ni cascadas sobre datos inciertos. Revertir solo objetos demostrablemente no usados; en los demás casos restaurar el backup verificado y reconciliar escrituras posteriores bajo revisión.
5. Registrar la decisión, SQL revisado, operador, timestamps y resultado. No improvisar comandos en producción.

## Monitorización inmediata de release

La monitorización debe quedar preparada **antes** de aplicar a Supabase real. El registro de despliegue identifica hora UTC, release owner, suplente, responsable Supabase/Postgres, destino de avisos que todos vigilan (canal operativo o contacto on-call existente; no se exige un servicio externo), y enlaces/rutas a las vistas usadas.

Usar las fuentes disponibles en el Supabase self-hosted:

- Supabase Studio Logs Explorer, vistas de Postgres y API; MCP Supabase puede leer esos mismos logs cuando esté conectado.
- El dashboard de API/Postgres incluido en el despliegue para latencia p95/p99 y solicitudes fuera del SLO.
- SQL Editor de Studio únicamente para el smoke query read-only siguiente.

Antes de aplicar, guardar una línea base de 30 minutos. Al terminar, repetir el control cada 5 minutos durante 30 minutos y a los 60 y 120 minutos:

1. Para el mismo intervalo UTC, filtrar logs Postgres/API por errores de consultas `mv_*` y por `permission denied`, `row-level security`, `violates check constraint`, `duplicate key`, `foreign key`, `deadlock` o `canceling statement`. Registrar filtro, total de solicitudes DB/API y errores; `tasa = errores / solicitudes × 100`.
2. Registrar p95/p99 y porcentaje fuera del SLO desde el dashboard y compararlos con la línea base. Si no hay denominador o percentiles reproducibles, no aplicar hasta habilitar y documentar una vista equivalente en Studio/logs.
3. Ejecutar este `select` y conservar su resultado; todos los contadores deben ser `0`:

```sql
select 'cross_household_or_orphan_events' as check_name, count(*) as violations
from public.mv_eventos_vehiculo e
left join public.mv_vehiculos v
  on v.household_id = e.household_id and v.id = e.vehiculo_id
where v.id is null
union all
select 'duplicate_plates_per_household', count(*)
from (
  select household_id, matricula
  from public.mv_vehiculos
  group by household_id, matricula
  having count(*) > 1
) duplicates
union all
select 'households_without_admin', count(*)
from public.mv_households h
where not exists (
  select 1
  from public.mv_household_members m
  where m.household_id = h.id and m.rol = 'admin'
);
```

Umbrales para tasa de errores o porcentaje fuera de SLO: **>1%** el release owner investiga y detiene ampliaciones; **>2%** avisa al suplente y al responsable Supabase/Postgres, activa emergencia y prepara recuperación; **>5%** convoca al equipo responsable en el destino registrado y congela escrituras/despliegues. Cualquier contador no cero o sospecha de acceso cruzado activa emergencia inmediatamente. Registrar cada control y aviso con timestamp UTC, fuente, filtro/consulta, resultado y responsable.

## Checklist antes de aplicar una migración real

- [ ] El archivo de migración está versionado en `supabase/migrations/`.
- [ ] Todos los objetos creados/modificados empiezan por `mv_`.
- [ ] No hay comandos globales peligrosos.
- [ ] No hay referencias a tablas de otros proyectos.
- [ ] Hay constraints para datos críticos: matrícula única por hogar, `household_id` obligatorio, FK compuesta evento/vehículo, kilometrajes no negativos, costes no negativos, estados/tipos válidos.
- [ ] RLS está activado en las cinco tablas sin policies permisivas globales; `anon` está revocado y los privilegios de `authenticated` tienen policies correspondientes. `mv_platform_roles` no concede grants ni policies a `anon` o `authenticated`.
- [ ] Las policies de escritura usan `with check`; las funciones RLS tienen `security definer` endurecido, `search_path` vacío y no aceptan identidad de usuario del cliente.
- [ ] Los triggers de membresía rechazan borrar al último `admin`, degradar su rol o moverlo a otro hogar; se permite el borrado en cascada de membresías cuando se elimina el propio hogar.
- [ ] Los grants a `authenticated` están respaldados por RLS y se entienden solo como habilitación de su enforcement; no habilitan acceso directo de producto/navegador.
- [ ] La prueba RLS runtime pasó en una base local o efímera, incluyendo aislamiento, roles y preservación del último admin. Si no pasó, el despliegue está bloqueado.
- [ ] Hay operador responsable asignado, backup restaurable identificado y ensayo local/efímero de fix-forward y restauración completado.
- [ ] Release owner, suplente, responsable Supabase/Postgres y destino de avisos están registrados y vigilados.
- [ ] Las rutas de Logs Explorer/dashboard, la línea base, los filtros reproducibles, el smoke query y los umbrales >1% / >2% / >5% están preparados antes de aplicar.
- [ ] No se usa `cascade` en limpiezas de datos.
- [ ] La migración fue revisada antes de ejecutarse.
- [ ] La operación contra la instancia real fue autorizada explícitamente.

## Validación runtime local de RLS (PR/corte 2)

El harness del primer corte está disponible para revisar su contrato y ejecutarlo **solo** cuando estén disponibles Supabase CLI y Docker locales:

```bash
./scripts/validate-supabase-rls.sh
```

### Requisitos y recorrido seguro

1. Ejecutar desde un checkout limpio, sin `DATABASE_URL`, `SUPABASE_URL`, project ref, endpoint MCP ni credenciales Supabase en el entorno.
2. El script comprueba primero, sin mutar, la migración, `supabase --version`, `docker --version`, acceso al daemon y la ayuda de la CLI que va a usar.
3. Solo después crea un directorio `mktemp` privado y un proyecto con prefijo `mv-rls-validation-`; nunca acepta ni deriva un destino externo.
4. Antes de SQL, exige un único contenedor DB con labels, red y fecha que demuestren su propiedad. SQL se ejecuta únicamente mediante `docker exec` sobre el ID capturado.

Supabase CLI 2.109.1 publica los servicios locales en `0.0.0.0`/`[::]`. El harness permite esa exposición únicamente después de probar que Docker usa un socket Unix local y que el contenedor pertenece al proyecto efímero generado; la informa como `WARN`, no como `PASS` silencioso. Mientras se ejecuta, esos puertos pueden ser accesibles desde otras interfaces del host, por lo que debe usarse solo en una máquina de desarrollo confiable y detenerse al finalizar.

El comando no usa ni permite `db push`, `db reset`, `migration up`, URLs externas, MCP, claves compartidas, `drop database` ni `drop schema`. Si falta una herramienta o la guardia no puede demostrar el destino, informa `BLOCKED` y termina distinto de cero sin iniciar SQL ni limpiar recursos ambiguos. La salida de `supabase start` se captura en un log privado del workspace y nunca se reimprime; tampoco se ejecuta ni imprime `supabase status`, porque ambas salidas pueden incluir secretos.

### Gate completo del corte 2

El corte 2 añade dos sesiones reales y acotadas que retiran simultáneamente los dos administradores del hogar A. Ambas alcanzan una barrera en la base antes de ejecutar la operación autenticada; el trigger serializa las retiradas, una queda aceptada y la otra recibe `23514`. El harness exige evidencias `CASE` de ambas sesiones, rechaza timeout, deadlock o códigos de proceso no cero y comprueba como `postgres` que queda exactamente un administrador.

El código de salida es `0` solo cuando preflight, guardas, migración, fixtures, matriz secuencial, concurrencia y cleanup seguro pasan. Esto sigue sin autorizar por sí mismo aplicar la migración a Supabase real, compartido o persistente: sigue siendo necesaria la autorización explícita y el checklist de esta guía.

`npm test` cubre contratos deterministas del shell, incluido el rechazo de destinos externos/remotos, la propiedad del contenedor, la captura de secretos, las sesiones concurrentes y la aceptación condicionada del binding wildcard local; no sustituye la ejecución RLS runtime con Supabase CLI + Docker.

## Decisión de credencial del adaptador de servidor (PR2, tarea 9)

Resuelta (ver también diseño §15.6/§15.7): el adaptador de servidor de esta app se
autentica como un usuario `auth.users` REAL, sembrado por un bootstrap server-only,
e inicia sesión server-side (`signInWithPassword`) como ese usuario. `service_role`
queda descartado para el código en ejecución de esta app: nunca se guarda ni se lee
una clave `service_role` en el cliente Supabase de la aplicación, en `.env.example`
ni en componentes React. RLS sigue siendo la frontera de seguridad real; el
adaptador de servidor solo puede leer/escribir lo que la membresía del usuario
sembrado permita.

### Por qué el bootstrap no puede correr con el cliente normal (anon key + RLS)

La migración `20260710000000_supabase_persistence_short.sql` no otorga privilegio
`insert` sobre `mv_households` a `authenticated` (solo `select`/`update`/`delete`), y
la política `mv_household_members_insert_admin` exige YA ser `admin` del hogar para
poder insertar la primera membresía. Es decir, RLS impide deliberadamente que
cualquier usuario autenticado normal se auto-nombre `admin` de un hogar nuevo. Por
eso el primer `admin` de un hogar solo puede sembrarse mediante un acceso
administrativo aislado, ejecutado una única vez por un operador/proceso de
bootstrap fuera de la ruta de la aplicación en ejecución — nunca con la
`service_role` key de la app, ni desde código cliente, ni mediante una policy
autenticada normal.

### Procedimiento de siembra (idempotente)

`src/nucleo-familiar/adaptadores/supabase/bootstrap-servidor.ts` expone
`sembrarHogarDeDesarrollo(operaciones, entrada)`, que busca-o-crea, en este orden:
usuario de desarrollo (`SUPABASE_BOOTSTRAP_EMAIL`/`SUPABASE_BOOTSTRAP_PASSWORD`),
hogar (`SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE`) y membresía `admin` del usuario en ese
hogar. Reejecutarlo no duplica ninguno de los tres (ver
`bootstrap-servidor.test.ts`). El `householdId` de desarrollo que usa
`ProveedorIdentidadSupabaseServidor` (`src/nucleo-familiar/adaptadores/supabase/proveedor-identidad-supabase-servidor.ts`)
es exactamente el `mv_households.id` real devuelto por este bootstrap, nunca un
valor arbitrario. El puerto `OperacionesBootstrap` representa el acceso
administrativo aislado descrito arriba; su implementación real contra
Postgres/Supabase (fuera del cliente anon-key normal) queda pendiente de entorno
Supabase real disponible — ver blocker documentado en `apply-progress.md`.

### PR3 — composición de servidor y `SUPABASE_HOUSEHOLD_ID_DESARROLLO`

PR3 (interfaz mínima + server actions, `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts`)
compone las server actions/páginas contra los adaptadores Supabase reales de PR2
(`RepositorioVehiculosSupabase`, `RepositorioEventosSupabase`), pero **no** resuelve
auth real ni ejecuta el bootstrap en cada petición: sigue usando el patrón temporal
de identidad de PR1/PR2 (`ProveedorIdentidadTemporal`), construido con un
`householdId` fijo. Como `mv_households.id`/`mv_vehiculos.household_id` son `uuid`
reales, ese valor fijo debe ser el UUID real ya sembrado por
`sembrarHogarDeDesarrollo` (ejecutado una única vez, fuera de banda, por un operador
con acceso administrativo — sigue sin implementación real en este PR, ver arriba),
no un texto arbitrario como `'hogar-desarrollo'`. Por eso se añadió la variable de
entorno obligatoria `SUPABASE_HOUSEHOLD_ID_DESARROLLO`: debe contener ese UUID real
una vez exista un entorno Supabase disponible. Sin entorno Supabase real, esta
composición sigue sin poder ejecutarse de extremo a extremo en esta sesión (mismo
blocker de infraestructura ya documentado para PR2); se valida con dobles
deterministas del cliente, igual que el resto de adaptadores de PR2.

### Variables de entorno de servidor (nunca `NEXT_PUBLIC_*`)

Deliberadamente ninguna variable usada por el adaptador de datos de app usa el
prefijo `NEXT_PUBLIC_*`: esta app no tiene ningún camino de acceso browser-side a
`mv_vehiculos`/`mv_eventos_vehiculo` en este PR, así que no hay necesidad de exponer
nada al cliente. Los nombres exactos (sin valores reales) son:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_BOOTSTRAP_EMAIL`,
`SUPABASE_BOOTSTRAP_PASSWORD`, `SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE` y (desde PR3)
`SUPABASE_HOUSEHOLD_ID_DESARROLLO`. Ver
`src/compartido/infraestructura/entorno.ts` para la validación, que además rechaza
explícitamente cualquier nombre `NEXT_PUBLIC_*`.

> Nota de herramienta: no se pudo crear un `.env.example` en la raíz del repo en
> este corte porque el entorno de ejecución del agente bloquea a nivel de
> sandbox la escritura de cualquier archivo `.env*`, incluso sin secretos reales
> (guarda de seguridad genérica anti-secretos, no específica de este proyecto).
> Queda documentado aquí como blocker de herramienta; un operador humano puede
> crear `.env.example` con estos cinco nombres sin valores.

## Bootstrap seguro de `Familia Altadill` (PR 1)

La migración `20260712000000_mv_platform_roles.sql` es aditiva: separa el rol de plataforma (`superadmin`) de la membresía familiar. Tiene RLS activada y no concede acceso a `anon` ni `authenticated`; no habilita rutas ni datos familiares.

Antes de cualquier operación real, el operador debe registrar un backup restaurable, verificar una restauración y conservar los UUID Auth y conteos de vehículos/eventos. Nunca usar email como autoridad ni guardar credenciales en el repositorio.

1. Ejecutar el preflight sin mutar datos (modo por defecto):
   ```sh
   SUPABASE_BOOTSTRAP_DATABASE_URL=... \
   SUPABASE_BOOTSTRAP_ADMIN_USER_ID=<uuid-auth-verificado> \
   npm run bootstrap:admin -- --check
   ```
2. Guardar el plan JSON y resolver cualquier `conflicto`. El plan muestra solo UUIDs, acciones y conteos; no imprime URL ni contraseñas.
3. Si el hogar candidato conserva los datos existentes, volver a planificar con `--rename-from=<uuid-hogar>` para pedir explícitamente el renombrado a `Familia Altadill`. El UUID del hogar y los conteos deben permanecer iguales.
4. `--apply --confirm` queda deliberadamente bloqueado en este corte: requiere ejecutar un plan transaccional revisado por el operador. No se crean, reasignan, promueven, borran ni renombran datos automáticamente.
5. Ante conflicto o fallo, no aplicar correcciones automáticas. Conservar el plan/evidencia, restaurar el backup verificado si corresponde y preparar un fix-forward SQL revisado.

El preflight rechaza UUID Auth inválido, nombre destino ambiguo, membresía `editor` inesperada y varias membresías candidatas. `mv_platform_roles` no se asigna automáticamente.

## Estado de conexión actual

En esta sesión no hay MCP Supabase conectado ni script de puente Supabase detectado en el repositorio. Hasta que exista ese puente, las migraciones se preparan como archivos SQL versionados y su aplicación real requiere autorización explícita.

## Bootstrap administrativo real y unicidad de hogares

La migración `20260711000000_mv_households_nombre_unique.sql` añade
`mv_households_nombre_key`, un índice único **normalizado**
(`lower(btrim(nombre))`) que hace seguro el buscar-o-crear concurrente del
hogar de desarrollo. Es normalizado a propósito: una restricción `unique
(nombre)` exacta dejaría pasar `"Hogar de desarrollo"`, `"hogar de
desarrollo"` y `"Hogar de desarrollo "` como tres hogares distintos, lo cual
contradice el propósito completo de la unicidad. `crearHogar` y
`buscarHogarPorNombre` en `operaciones-bootstrap-postgres.ts` comparan y
resuelven conflictos con esta misma normalización, y `crearHogar` además
recorta espacios antes de guardar.

El preflight ya no depende solo de disciplina de operador: la propia migración
incluye un guard (`do $$ ... raise exception ... end $$;`) que cuenta nombres
duplicados en `mv_households` **tras normalizar** mayúsculas/espacios y aborta
la transacción con un error explícito si encuentra alguno, antes de crear el
índice. Aplicar la migración a una base con duplicados (exactos o solo
variantes de mayúsculas/espacios) falla de forma segura y explícita en vez de
depender de que un operador recuerde correr una consulta manual antes.

Si la migración falla por este guard, no borrar ni fusionar hogares de forma
automática: identificar membresías, vehículos y eventos asociados, acordar cuál
hogar se conserva, reasignar las referencias dentro de una transacción revisada
y verificar de nuevo que no quedan duplicados antes de reintentar la migración.
Si no puede demostrarse una consolidación segura, restaurar el backup verificado
o preparar un fix-forward específico; nunca forzar la restricción perdiendo datos.
Para inspeccionar los duplicados manualmente antes de intervenir:

```sql
select lower(btrim(nombre)) as nombre_normalizado, count(*) as cantidad
from public.mv_households
group by lower(btrim(nombre))
having count(*) > 1;
```

`ejecutarBootstrapPostgresDesdeEntorno` es el punto de entrada **server-only**:
lee `SUPABASE_BOOTSTRAP_DATABASE_URL`, `SUPABASE_BOOTSTRAP_EMAIL`,
`SUPABASE_BOOTSTRAP_PASSWORD` y `SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE`, crea
`OperacionesBootstrapPostgres`, ejecuta `sembrarHogarDeDesarrollo` y siempre
cierra la conexión privilegiada, tanto si la siembra termina como si falla
(preservando el error original de siembra si el propio cierre también falla).
No usa claves `service_role`; la URL y contraseña se proporcionan solo al
proceso operador, sin prefijo `NEXT_PUBLIC_*` y sin guardar valores reales en
el repositorio.

El runner concreto para invocarlo es `scripts/bootstrap-admin.ts`, ejecutado con:

```sh
SUPABASE_BOOTSTRAP_DATABASE_URL=... \
SUPABASE_BOOTSTRAP_EMAIL=... \
SUPABASE_BOOTSTRAP_PASSWORD=... \
SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE=... \
npm run bootstrap:admin -- --seed-local
```

Nunca desde server actions, componentes React ni el cliente Supabase de la
aplicación. La siembra local requiere siempre `--seed-local`; sin esa bandera,
`npm run bootstrap:admin` ejecuta preflight productivo no mutante y exige un UUID
Auth. El script reporta `householdId`/`userId` sembrados y sale con código 0 en
éxito; falla con código distinto de 0 y un mensaje explícito en stderr si falta
alguna variable privada o si la siembra falla.

El presupuesto de conexión (timeout, reintentos, backoff) tiene valores por
defecto pensados para una base ya despierta (5s de timeout, 3 intentos), que
pueden no alcanzar contra un proyecto Supabase pausado/frío. Es ajustable sin
tocar código vía variables opcionales:

```sh
SUPABASE_BOOTSTRAP_CONNECT_TIMEOUT_MS=20000 \
SUPABASE_BOOTSTRAP_CONNECT_RETRIES=5 \
SUPABASE_BOOTSTRAP_CONNECT_BACKOFF_MS=500 \
npm run bootstrap:admin -- --seed-local
```

Sin definirlas, se usan los valores por defecto. Un valor no numérico o no
positivo falla explícito antes de intentar conectar.

Si el usuario/hogar sembrados ya tienen una membresía con un rol distinto de
`admin` (por ejemplo, alguien lo degradó a `editor` manualmente), el bootstrap
**no la sobrescribe**: falla explícito con `ErrorMembresiaNoAdminBootstrap` y
requiere resolución manual. Reejecutar el bootstrap nunca debe revertir en
silencio una decisión de rol tomada fuera de él.

## Entorno local: login manual

El único atajo soportado para desarrollo local es:

```sh
npm run dev:local
```

El script levanta Supabase local si hace falta, siembra o reutiliza la cuenta local con
`npm run bootstrap:admin -- --seed-local` y arranca Next directamente en
`127.0.0.1:3000`. Muestra la URL `http://127.0.0.1:3000/login` y el email local, pero
nunca la contraseña. Iniciá sesión manualmente: el runtime solo recibe `SUPABASE_URL` y
`SUPABASE_ANON_KEY`; no recibe identidad, hogar ni cabeceras de bypass.

Las credenciales `SUPABASE_BOOTSTRAP_*` pertenecen únicamente al proceso de siembra
local. Por defecto el script reutiliza `Hogar de desarrollo`, un hogar intencionalmente
local y distinto del objetivo productivo. `SUPABASE_BOOTSTRAP_HOUSEHOLD_NOMBRE` es un
override exclusivo del entorno local: usarlo solo para elegir un hogar de pruebas
conocido; no configura ni activa `Familia Altadill` en producción. El runner
administrativo exige `--seed-local` para esa siembra; sin esa bandera ejecuta solo el
preflight productivo `--check` y no muta datos.

## Activación productiva de Familia Altadill

Este procedimiento separa preparación, despliegue y activación. No ejecutar pasos de
mutación ni apuntar los comandos a un entorno compartido sin autorización operativa.

### 1. Preparación y backup

1. Registrar un backup restaurable, comprobar su retención y ensayar restauración en un
   entorno aislado.
2. Registrar el UUID Auth verificado del administrador y los conteos previos de
   vehículos/eventos del hogar candidato.
3. Ejecutar únicamente el preflight y conservar su JSON:

   ```sh
   SUPABASE_BOOTSTRAP_DATABASE_URL=... \
   SUPABASE_BOOTSTRAP_ADMIN_USER_ID=<uuid-auth-verificado> \
   npm run bootstrap:admin -- --check
   ```

4. Detenerse ante cualquier `conflicto`. El preflight no reasigna, promociona, borra ni
   renombra datos. Si hay un renombrado autorizado, registrar el UUID original y los
   conteos antes de preparar el plan explícito.

### 2. Despliegue cerrado y smoke

1. Aplicar solo migraciones revisadas y comprobar RLS/grants con
   `./scripts/validate-supabase-rls.sh` en un entorno local o efímero.
2. Desplegar el código con el acceso aún cerrado cuando la plataforma lo permita.
3. Ejecutar smoke manual: abrir `/login`, iniciar sesión con un miembro válido, confirmar
   acceso a su panel, cerrar sesión y confirmar que una ruta privada vuelve a `/login`.
4. Confirmar que el UUID de hogar y los conteos previos no cambiaron. Un fallo de
   despliegue deja el acceso cerrado; no habilitar una autorización incierta.

### 3. Activación y recuperación

1. Activar solo después de guardar evidencia de backup, plan, UUID, conteos, RLS y smoke. La activación es un gate de despliegue controlado por el operador; `--apply --confirm` no la ejecuta ni muta datos en este PR.
2. Durante la ventana, monitorizar denegaciones RLS, errores de autenticación y cualquier
   señal de cruce familiar sin registrar emails, nombres familiares ni UUID completos.
3. Ante conflicto de preflight, fallo de despliegue o sospecha de cruce: congelar
   escrituras/acceso, revocar sesiones, preservar evidencia y aplicar fix-forward o
   rollback verificado.
4. Un rollback de código no borra automáticamente familias, membresías ni roles válidos.
   La migración aditiva permanece inerte; un renombrado solo se revierte mediante una
   transacción explícita revisada con el estado previo registrado.

La separación futura entre plataforma y familia se mantiene: un rol de plataforma no
activa un panel ni sustituye la membresía familiar en este corte.
