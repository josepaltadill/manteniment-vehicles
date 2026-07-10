# Diseño técnico: persistencia Supabase corta

## Decisión de arquitectura

El primer corte será una única migración SQL transaccional, versionada y **no aplicada**, que crea el límite de tenancy por hogar antes de incorporar adaptadores. Las cuatro tablas vivirán en `public`, todos los objetos propios usarán el prefijo `mv_` y RLS autorizará cada operación a partir de `auth.uid()` y la membresía del hogar.

La creación del primer hogar y su miembro `admin` será una operación futura de bootstrap server-only con privilegios; no se abrirá una política de `insert` de hogares a usuarios autenticados porque no puede autorizarse por una membresía todavía inexistente.

## Forma del esquema

Los identificadores serán `uuid`; las fechas con hora serán `timestamptz`. Los nombres siguientes son contratos de la migración.

### `mv_households`

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `nombre` | `text` | no vacío |
| `created_at` | `timestamptz` | no nulo, `default now()` |

### `mv_household_members`

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `household_id` | `uuid` | FK a `mv_households(id)`, no nulo, `on delete cascade` |
| `user_id` | `uuid` | FK a `auth.users(id)`, no nulo, `on delete cascade` |
| `rol` | `text` | no nulo, `check ('admin', 'editor')` |
| `created_at` | `timestamptz` | no nulo, `default now()` |

PK compuesta `(household_id, user_id)`. Un usuario podrá pertenecer a varios hogares. `admin` administra hogar y miembros; `editor` lee el hogar y modifica datos operativos. El bootstrap privilegiado debe crear hogar y primer `admin` en una misma transacción.

### `mv_vehiculos`

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `household_id` | `uuid` | FK a hogares, no nulo, `on delete cascade` |
| `marca`, `modelo`, `combustible`, `matricula` | `text` | no nulos y no vacíos |
| `anio` | `integer` | no nulo, positivo |
| `kilometros_actuales` | `integer` | no nulo, `>= 0` |
| `estado` | `text` | `activo` o `inactivo` |
| `fecha_compra`, `fecha_alta_aplicacion` | `timestamptz` | no nulas |
| `fecha_desactivacion` | `timestamptz` | nullable; obligatoria si está inactivo y nula si está activo |

Constraints propias prefijadas:

- `mv_vehiculos_household_matricula_key`: `unique (household_id, matricula)`, sin excluir inactivos.
- `mv_vehiculos_household_id_id_key`: `unique (household_id, id)`, objetivo de la FK compuesta de eventos.
- Checks `mv_vehiculos_*_check` para textos, año, kilometraje, estado y coherencia de desactivación.

La migración no normalizará matrículas silenciosamente. El futuro adaptador deberá persistir el formato canónico del dominio; la unicidad de PostgreSQL será sobre ese valor.

### `mv_eventos_vehiculo`

| Columna | Tipo | Reglas |
| --- | --- | --- |
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `household_id`, `vehiculo_id` | `uuid` | no nulos |
| `tipo` | `text` | `mantenimiento` o `averia` |
| `descripcion` | `text` | no nula y no vacía |
| `kilometros` | `integer` | no nulo, `>= 0` |
| `fecha` | `timestamptz` | no nula |
| `proveedor`, `moneda`, `notas` | `text` | nullable |
| `coste` | `numeric(12,2)` | nullable, `>= 0` |
| `proximo_vencimiento_km` | `integer` | nullable, `>= 0` |
| `proximo_vencimiento_fecha` | `timestamptz` | nullable |
| `fecha_creacion` | `timestamptz` | no nula |

`mv_eventos_vehiculo_vehiculo_household_fkey` será una FK compuesta:

```sql
foreign key (household_id, vehiculo_id)
  references mv_vehiculos (household_id, id)
  on delete cascade
```

Así la base impide eventos cruzados entre hogares sin trigger y mantiene coherente el borrado explícito de un hogar: hogar → vehículos → eventos. PostgreSQL no puede distinguir en una FK simple si un vehículo se elimina directamente o como consecuencia del borrado del hogar; por eso la misma cascada también elimina el historial al borrar directamente un vehículo. Se acepta este tradeoff para evitar hogares parcialmente borrados y eventos huérfanos; la autorización RLS de borrado de vehículos sigue limitada a `admin`.

## Índices

Además de PK y uniques:

- `mv_household_members_user_household_idx` sobre `(user_id, household_id)` para resolver RLS desde `auth.uid()`.
- `mv_vehiculos_household_estado_idx` sobre `(household_id, estado)`.
- `mv_eventos_vehiculo_household_vehiculo_fecha_idx` sobre `(household_id, vehiculo_id, fecha desc)`.
- `mv_eventos_vehiculo_vencimiento_km_idx` y `mv_eventos_vehiculo_vencimiento_fecha_idx`, parciales cuando el vencimiento no sea nulo.

## Modelo RLS

### Funciones auxiliares

Para evitar recursión al consultar membresías desde políticas de `mv_household_members`, se crearán funciones `security definer`, `stable`, con `set search_path = ''` y referencias totalmente cualificadas:

- `mv_es_miembro(uuid) -> boolean`: existe membresía del `auth.uid()` actual.
- `mv_tiene_rol(uuid, text[]) -> boolean`: la membresía actual tiene uno de los roles pedidos.

Sus propietarios deben ser el rol de migración; se revoca `execute` a `public` y se concede solo a `authenticated`. No aceptan un `user_id` del llamador. Esta superficie requiere revisión específica porque omite RLS únicamente para comprobar membresía.

### Políticas

Se habilita RLS en las cuatro tablas. No se crean políticas para `anon` y se revocan sus privilegios. Para `authenticated` se conceden solo los privilegios que tengan política correspondiente.

| Tabla | `select` | `insert` / `update` | `delete` |
| --- | --- | --- | --- |
| `mv_households` | miembro | solo `admin` (`update`) | solo `admin` |
| `mv_household_members` | propia fila o `admin` del hogar | solo `admin` del hogar | solo `admin` del hogar |
| `mv_vehiculos` | miembro | `admin` o `editor` | solo `admin` |
| `mv_eventos_vehiculo` | miembro | `admin` o `editor` | solo `admin` |

Cada policy tendrá nombre `mv_<tabla>_<operacion>_<alcance>`. `using` protege filas existentes y `with check` valida el `household_id` resultante en inserciones/actualizaciones. No habrá policy autenticada para insertar hogares; tampoco una policy que permita a un usuario otorgarse el rol `admin` inicial.

### Invariante del último administrador

RLS controla quién puede modificar membresías, pero no basta para conservar el último `admin`. PostgreSQL aplica la invariante con `mv_preservar_admin_hogar()` y triggers `mv_*` sobre `update` y `delete`: una operación normal no puede borrar, degradar ni trasladar al último administrador. La función bloquea el hogar para serializar retiradas concurrentes. El cascade iniciado por el borrado explícito del propio hogar sigue permitido porque ya no existe un hogar que administrar.

El cliente de producto seguirá siendo server-only. RLS es defensa en profundidad para JWT de usuario; no justifica exponer consultas directas desde browser ni usar `service_role` en cliente.

## Orden de la migración

1. Abrir transacción y crear tablas padre: hogares y membresías.
2. Crear vehículos y después eventos, incluyendo FK compuesta y checks.
3. Crear índices.
4. Crear funciones auxiliares RLS, fijar propietario y ajustar permisos de ejecución.
5. Habilitar RLS en las cuatro tablas y revocar privilegios de `anon`.
6. Conceder privilegios mínimos a `authenticated` y crear políticas.
7. Cerrar transacción.

No se incluyen seeds, bootstrap, RPC de evento+kms ni sentencias destructivas. La atomicidad de registrar evento y actualizar kilometraje se diseñará junto al adaptador en otro cambio.

## Validación sin mutar Supabase real

La revisión de este corte será estática; **no** se ejecutarán `supabase db push`, `supabase migration up`, `supabase db reset` ni `psql` contra la instancia compartida.

Checklist de evidencia:

- [ ] Un único archivo versionado crea exactamente las cuatro tablas permitidas.
- [ ] Tablas, constraints, índices, funciones y policies propias empiezan por `mv_`.
- [ ] No aparecen `drop schema`, `drop database`, resets ni `cascade` destructivo no justificado.
- [ ] `(household_id, matricula)` es unique y la FK compuesta evento/vehículo usa el mismo `household_id`.
- [ ] Checks cubren valores no negativos, `activo`/`inactivo` y `mantenimiento`/`averia`.
- [ ] RLS se habilita en las cuatro tablas; `anon` no tiene acceso y no existen policies permisivas globales.
- [ ] Las policies de escritura tienen `with check` y usan las funciones de membresía/rol.
- [ ] Las funciones `security definer` fijan `search_path`, cualifican objetos y no aceptan identidad arbitraria.
- [ ] No hay adapter TypeScript, UI, seeds ni evidencia de ejecución real.
- [ ] El diff completo declara que supera 400 líneas por los artefactos SDD; el payload de implementación sigue pequeño y la excepción `size:exception` para un único commit queda registrada.

Una prueba runtime de RLS en una base local/efímera será obligatoria antes de autorizar aplicación real, pero queda fuera de este corte si no existe harness local seguro.

## Aplicación real: recuperación y salud de release

La aplicación real tendrá un **operador responsable** identificado en el registro de despliegue (release owner con acceso autorizado; no el cliente browser). Antes de ejecutar deberá verificar un backup restaurable —snapshot/PITR o export equivalente según el entorno—, registrar su identificador y ensayar en local/efímero tanto fix-forward como restauración.

### Decisión posterior a la aplicación

1. Pausar nuevas escrituras si hay riesgo de corrupción o exposición entre hogares.
2. Preferir SQL aditivo de fix-forward cuando los datos estén íntegros, el aislamiento pueda restablecerse de inmediato y la corrección haya sido revisada.
3. Usar rollback/restauración cuando no pueda garantizarse integridad o aislamiento, el fix-forward no sea seguro dentro de la ventana de emergencia, o los controles no puedan verificarse.
4. El SQL de recuperación debe preservar datos: no usar `drop`, `truncate`, resets ni cascadas sobre datos inciertos. Un rollback solo revierte objetos demostrablemente no usados; de lo contrario restaura el backup verificado y reconcilia escrituras posteriores bajo revisión.
5. Registrar decisión, comandos revisados, operador, timestamps y resultado. No improvisar SQL directamente en producción.

### Ventana inmediata de observación

La monitorización operable es un requisito previo al despliegue, no una tarea a improvisar después. Antes de aplicar, el registro de despliegue debe contener: hora UTC prevista, release owner y suplente, destino de avisos que ambos vigilan (el canal operativo o contacto on-call ya usado por el equipo; no se exige un servicio externo), enlace/ruta a las vistas de logs, y una línea base de los 30 minutos anteriores.

Fuentes para el Supabase self-hosted actual:

- **Supabase Studio Logs Explorer**, vistas de Postgres y API; si MCP Supabase está conectado, puede usarse su lectura de esos mismos logs como alternativa read-only.
- **Dashboard de métricas incluido en el despliegue**, si expone latencia de API/Postgres. No se presupone Datadog, Sentry ni otro proveedor externo.
- **SQL Editor de Studio** solo para el smoke query `select` de integridad siguiente; nunca para mutaciones durante la observación.

El operador repetirá estos controles al finalizar la migración, cada 5 minutos durante los primeros 30 minutos y a los 60 y 120 minutos:

1. Fijar el intervalo UTC desde el final de la migración y filtrar Postgres/API por errores que contengan `permission denied`, `row-level security`, `violates check constraint`, `duplicate key`, `foreign key`, `deadlock`, `canceling statement` o errores de consultas `mv_*`. Registrar filtro, intervalo, total de solicitudes DB/API y total de errores; `tasa = errores / solicitudes × 100`.
2. En el dashboard de API/Postgres, registrar p95/p99 y el porcentaje fuera del SLO para el mismo intervalo y compararlos con la línea base. Si la instalación no ofrece denominador de solicitudes o percentiles reproducibles, el despliegue queda bloqueado hasta habilitar una vista equivalente en Studio/logs y documentar su ruta.
3. Ejecutar y guardar el resultado del smoke query read-only; todos los contadores de violaciones deben ser `0`:

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

Los umbrales se aplican a la tasa de errores o al porcentaje de solicitudes fuera del SLO: **>1%** el release owner investiga y detiene ampliaciones; **>2%** avisa al suplente y al responsable Supabase/Postgres, activa emergencia y prepara recuperación; **>5%** convoca al equipo responsable por el destino registrado y congela escrituras/despliegues. Cualquier contador no cero, sospecha de acceso cruzado o pérdida del último admin activa directamente el nivel de emergencia, aunque no alcance 1%. Cada comprobación y aviso se anota con timestamp UTC, fuente, consulta/filtro, resultado y responsable.

## Actualización de `supabase/migrations/README.md`

El cambio de implementación deberá:

- ampliar las tablas permitidas a las cuatro `mv_*` de este diseño;
- sustituir “matrícula única global” por única dentro de `(household_id, matricula)`;
- exigir `household_id` no nulo y FK compuesta para evento/vehículo;
- documentar roles `admin`/`editor`, bootstrap server-only y funciones RLS `security definer` endurecidas;
- añadir al checklist la revisión de `with check`, permisos de `anon`, `search_path` y aislamiento entre hogares;
- mantener prohibiciones de ejecución real no autorizada, resets y operaciones destructivas globales.

## Riesgos y trade-offs

- Las funciones `security definer` reducen recursión y duplicación, pero elevan el impacto de un error de permisos o `search_path`; por eso su interfaz es mínima.
- Duplicar `household_id` en eventos añade almacenamiento, pero permite RLS directa e integridad declarativa mediante FK compuesta.
- El borrado en cascada hogar→miembros y hogar→vehículos→eventos mantiene coherente la eliminación explícita del hogar. Como una FK no conoce la causa del borrado padre, eliminar directamente un vehículo también elimina sus eventos; se acepta ese riesgo frente a un hogar parcialmente borrado, y la operación continúa restringida a `admin` por RLS.
- La validación estática no demuestra el comportamiento runtime de RLS. No debe confundirse revisión satisfactoria con autorización para migrar.
- La comparación de matrícula será sensible al valor persistido hasta que el adaptador defina normalización canónica.

## Fuera de alcance

Adapter o mapeadores TypeScript, UI, selección multi-hogar, bootstrap ejecutable, RPC/transacción evento-kilometraje, seeds, aplicación o rollback real, y tablas de adjuntos, OCR, IA, manuales, recordatorios o notificaciones.
