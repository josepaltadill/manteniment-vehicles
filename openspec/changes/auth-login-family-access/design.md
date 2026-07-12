# Diseño técnico: autenticación y acceso familiar

## 1. Resumen y decisiones

Este cambio reemplaza la identidad temporal, el usuario técnico compartido y el header `x-vehiculos-access-token` por una sesión Supabase Auth real, transportada en cookies y validada en servidor. Toda entrada al panel familiar pasa por una única resolución server-side de acceso: usuario autenticado, conjunto de membresías visibles por RLS y, únicamente cuando existe una membresía válida, contexto familiar.

Decisiones principales:

- Usar `@supabase/ssr` con un cliente por solicitud y cookies `HttpOnly` administradas por Supabase; no guardar `household_id`, rol familiar ni rol de plataforma en cookies propias.
- Validar la identidad con `auth.getUser()` en la frontera del servidor. No autorizar a partir de `getSession()` sin validación remota.
- Resolver membresías consultando `mv_household_members` por `user_id = auth.uid()` bajo la sesión del usuario. Cero membresías y más de una fallan cerrado; una sola produce el contexto familiar.
- Mantener filtros explícitos por `household_id` en repositorios y conservar RLS como segunda frontera independiente.
- Eliminar por completo la prueba de acceso por header y el inicio de sesión runtime con las credenciales de bootstrap. No habrá bypass de aplicación para local ni `service_role` en runtime.
- Modelar el rol de plataforma en una tabla `mv_platform_roles` separada de `mv_household_members`. En este corte no habilita rutas ni datos; una cuenta superadmin sin familia recibe el mismo estado controlado sin acceso familiar.
- Reutilizar el bootstrap administrativo fuera de banda, reforzado con preflight y modo de verificación, para crear o reutilizar `Familia Altadill` y enlazar por UUID Auth sin modificar datos existentes de forma implícita.

## 2. Arquitectura

### 2.1 Capas y responsabilidades

1. **Frontera web (Next.js App Router)**
   - `src/proxy.ts` refresca cookies Auth cuando sea necesario y aplica una redirección temprana en rutas privadas, pero no sustituye la autorización de página o acción.
   - `/login` acepta email y contraseña mediante Server Action, devuelve un error genérico y redirige según la resolución de acceso.
   - `/acceso-no-disponible` solo muestra estado y cierre de sesión; nunca consulta datos `mv_*`.
   - La raíz y `/vehiculos/**` ejecutan la guarda server-side antes de renderizar o invocar casos de uso.

2. **Aplicación de acceso**
   - Un servicio `resolverAccesoFamiliar` devuelve una unión discriminada, sin excepciones para estados esperables:

     ```ts
     type AccesoFamiliar =
       | { estado: 'anonimo' }
       | { estado: 'sin-acceso'; motivo: 'sin-membresia' | 'multiples-membresias' }
       | { estado: 'concedido'; contexto: ContextoAplicacion };
     ```

   - Los motivos son internos; la UI presenta un mensaje común para no filtrar estructura de membresías.
   - `exigirContextoFamiliar` traduce `anonimo` a `/login`, `sin-acceso` a `/acceso-no-disponible` y entrega el contexto solo en `concedido`.

3. **Adaptadores Supabase**
   - Fábrica SSR por solicitud con `SUPABASE_URL` y `SUPABASE_ANON_KEY`, leyendo/escribiendo cookies mediante APIs de Next.
   - El mismo cliente autenticado se comparte entre resolución de identidad y repositorios durante la composición de una solicitud.
   - `ProveedorIdentidadSupabaseServidor` deja de recibir un hogar sembrado: obtiene `getUser()`, consulta hasta dos membresías propias y exige cardinalidad exactamente uno.

4. **Dominio y persistencia de vehículos**
   - `ContextoAplicacion` conserva `actor.id`, `actor.rol` familiar y `householdId`.
   - Los casos de uso y repositorios siguen recibiendo `householdId` explícito. No aceptan contexto familiar desde formularios, URL o cabeceras.

### 2.2 Dependencias y límites

Se añade `@supabase/ssr` compatible con `@supabase/supabase-js`. Los módulos de cliente SSR, resolución de acceso, composición y bootstrap se marcan `server-only`. No se crea cliente Supabase browser-side para datos operativos; el formulario puede ser un componente cliente, pero envía credenciales a una Server Action.

## 3. Flujo de rutas

### 3.1 Visitante

1. Solicita `/`, `/vehiculos` o una subruta.
2. `src/proxy.ts` intenta refrescar/validar la sesión y, si no hay usuario, redirige a `/login?next=...` usando únicamente destinos internos permitidos.
3. La página o Server Action vuelve a ejecutar `exigirContextoFamiliar`; esta guarda es autoritativa y ocurre antes de consultar `mv_*`.

La doble comprobación es deliberada: el proxy mejora navegación y refresco de cookies; la guarda localizada impide que una configuración incompleta del matcher abra acceso.

### 3.2 Login

1. La Server Action valida formato y llama a `signInWithPassword` con el cliente SSR.
2. Ante cualquier error devuelve un único mensaje: “No se pudo iniciar sesión con esas credenciales.”
3. Tras éxito ejecuta `resolverAccesoFamiliar` con la sesión recién establecida.
4. Una membresía redirige al destino interno validado o `/vehiculos`; cero o varias redirigen a `/acceso-no-disponible`.
5. Si la resolución falla técnicamente, se cierra la sesión creada y se presenta un error genérico; no se conserva contexto parcial.

`next` debe aceptarse solo si es una ruta relativa de una allowlist privada; no se admiten URLs absolutas ni esquemas para evitar open redirects.

### 3.3 Cierre y caducidad

La acción de logout llama a `auth.signOut()`, elimina cookies mediante la respuesta SSR y redirige a `/login`. No existe cache global del contexto. Las funciones dependientes de cookies se ejecutan dinámicamente y no usan `unstable_cache` ni memoización entre usuarios. Ante token expirado o inválido, `getUser()` produce estado anónimo y no se consulta ningún dato familiar.

### 3.4 Usuario sin destino familiar único

`/acceso-no-disponible` exige una sesión válida pero no una familia. Si aparece exactamente una membresía en una solicitud posterior, redirige al panel; si pierde sesión, al login. Cero y múltiples membresías comparten presentación pública y ofrecen logout. La razón concreta puede registrarse de forma estructurada sin email, nombre familiar ni UUID completos.

## 4. Estrategia Supabase Auth y sesión

- El navegador conserva únicamente las cookies Auth emitidas por Supabase SSR.
- El servidor crea un cliente por solicitud con anon key; el JWT de la cookie establece `auth.uid()` en PostgREST y activa RLS.
- `getUser()` es la fuente de identidad autorizativa. `getSession()` puede ayudar al refresco, pero no decide acceso.
- La composición actual que ejecuta `signInWithPassword` con `SUPABASE_BOOTSTRAP_EMAIL/PASSWORD` en cada solicitud se elimina. Esas credenciales quedan exclusivas del runner administrativo de bootstrap.
- `SUPABASE_HOUSEHOLD_ID_DESARROLLO` deja de ser entrada runtime: el hogar siempre se deriva de la membresía del usuario actual.
- No se introduce `SUPABASE_SERVICE_ROLE_KEY`; una guarda automatizada debe rechazar ese nombre en módulos/runtime y documentación de entorno de aplicación.
- Las Server Actions sensibles llaman siempre a `exigirContextoFamiliar`, incluso si la página padre ya fue protegida.

## 5. Resolución server-side del contexto familiar

Algoritmo:

1. `getUser()`; error o ausencia => `anonimo`.
2. Consulta a `mv_household_members` seleccionando `household_id, rol`, filtrada por `user_id` validado, limitada a 2 filas. RLS solo permite al usuario leer sus propias filas.
3. Cero filas => `sin-acceso/sin-membresia`.
4. Dos filas => `sin-acceso/multiples-membresias`; no se ordena ni elige.
5. Una fila => validar UUID y rol (`admin|editor`). Opcionalmente consultar `mv_households(id)` para confirmar existencia y obtener nombre visible, también bajo RLS.
6. Construir `ContextoAplicacion`; cualquier dato inválido o error de persistencia falla cerrado.

La consulta no recibe `household_id` del cliente. Aunque un formulario incluya ese campo, solo puede usarse como dato de recurso y debe contrastarse con el contexto; los repositorios continúan agregando `.eq('household_id', contexto.householdId)` y RLS rechaza cruces.

## 6. Modelo de datos

### 6.1 Rol familiar

`mv_household_members` continúa siendo la fuente de pertenencia y rol familiar:

- PK `(household_id, user_id)`;
- `rol in ('admin', 'editor')`;
- FK a `auth.users` y `mv_households`;
- múltiples filas por usuario siguen siendo posibles en el modelo para evolución futura, pero el primer corte las deniega en aplicación.

No se añade un `household_id` a perfil Auth ni metadatos JWT: quedaría obsoleto, sería difícil de revocar y mezclaría selección con autorización.

### 6.2 Rol de plataforma

Migración aditiva propuesta:

```sql
create table public.mv_platform_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol = 'superadmin'),
  created_at timestamptz not null default now()
);
```

RLS queda habilitada desde la misma migración; `anon` sin privilegios. En este corte, como el runtime familiar no necesita consultar el rol, se prefiere **no otorgar privilegios a `authenticated` ni crear policies de capacidad de plataforma**. La tabla se administra exclusivamente mediante procedimiento PostgreSQL operador fuera de banda. Una futura propuesta deberá añadir policies/RPC específicas antes de usarla. Esto mantiene separadas las dimensiones sin crear un bypass latente.

La existencia de una fila `superadmin` no altera `resolverAccesoFamiliar`: con una membresía familiar única entra como el rol familiar correspondiente; sin membresía o con varias falla cerrado. No hay panel general.

La guía y validación de migraciones deben ampliar explícitamente la allowlist de objetos `mv_*` a esta quinta tabla y verificar RLS/privilegios. Si se decide aplazar físicamente esta tabla para reducir el primer PR, el contrato deberá conservar un puerto de rol de plataforma separado y no inferirlo jamás; sin embargo, la recomendación de este diseño es crearla ahora para satisfacer de forma comprobable la separación del modelo.

## 7. Migración y bootstrap de `Familia Altadill`

### 7.1 Preservación de datos existentes

No se renombra automáticamente `Hogar de desarrollo`, no se crea otra familia por intuición y no se reasignan vehículos o eventos. El procedimiento productivo se divide en **inspectar**, **planificar** y **aplicar**:

1. Backup/restauración verificados según `supabase/migrations/README.md`.
2. Preflight de nombres normalizados para `Familia Altadill`; debe encontrar cero o exactamente una fila.
3. El operador proporciona el UUID Auth exacto del admin esperado (el email puede usarse para localizarlo, pero debe mostrarse y confirmarse su UUID antes de mutar).
4. Inspeccionar todas sus membresías, la membresía del hogar candidato, administradores actuales y contadores de vehículos/eventos por hogar.
5. Si ya existe `Familia Altadill` y la membresía exacta `admin`, el resultado es no-op verificable.
6. Si no existe la familia, solo se crea después de confirmar que no hay un hogar existente que ya contenga los datos que deben conservarse.
7. Si el hogar que contiene los datos existentes es inequívocamente el hogar inicial correcto, se prepara un **plan explícito de renombrado** a `Familia Altadill` dentro de una transacción, preservando su mismo UUID; no se copian ni mueven vehículos/eventos. El plan aborta si el nombre destino existe, hay ambigüedad o el operador no confirmó el UUID origen.
8. La membresía admin se inserta solo si no existe. Una membresía existente `editor`, una pertenencia a otro hogar, varios hogares candidatos o administradores inesperados abortan; nunca se promueve, mueve ni sobrescribe automáticamente.

Así, el camino preferido para no perder datos es reutilizar el UUID del hogar que ya los posee y, cuando esté probado que corresponde, renombrarlo; crear un hogar nuevo es válido solo cuando no hay datos previos que deban quedar asociados.

### 7.2 Cambios al bootstrap

El runner administrativo debe aceptar modo `--check` (por defecto recomendado en producción), UUID Auth esperado y nombre exacto. Su salida debe ser un plan sin secretos con IDs, acciones `noop/create/rename/insert-membership` y conflictos. `--apply` requiere confirmación operativa fuera del runtime y ejecuta en transacción cuando las operaciones son solo SQL; la creación de Auth, si fuera necesaria, se separa y se verifica antes.

Para el admin inicial:

- su rol familiar esperado es `admin` en `Familia Altadill`;
- no recibe `superadmin` automáticamente;
- una asignación futura de `superadmin` es otra operación explícita sobre `mv_platform_roles` y no modifica su membresía familiar.

La conexión PostgreSQL administrativa existe solo durante `npm run bootstrap:admin`; no se empaqueta ni invoca desde Next. No se usa una key `service_role`.

## 8. RLS

Las policies actuales de vehículos/eventos y helpers `mv_es_miembro`/`mv_tiene_rol` se conservan. La resolución de membresías depende de `mv_household_members_select_member_or_admin`, que permite `user_id = auth.uid()`; por tanto, una consulta por el usuario validado devuelve únicamente sus filas.

Verificaciones necesarias:

- anon no puede leer ninguna tabla `mv_*`;
- autenticado sin membresía obtiene cero filas y no puede leer/operar datos;
- miembro A no ve ni muta datos de B;
- manipular `household_id` no supera el filtro del repositorio ni RLS;
- `mv_platform_roles` no concede acceso familiar ni tiene policies permisivas;
- no hay policy basada en email, metadata editable por usuario o rol familiar para privilegios de plataforma.

No se elimina el filtro explícito de repositorio por confiar en RLS: ambas defensas deben permanecer.

## 9. Impacto en desarrollo local

`scripts/dev-local.sh` mantiene el arranque de Supabase y el bootstrap, pero:

- usa por defecto el nombre `Familia Altadill` o un nombre local explícito sin convertirlo en contexto runtime;
- deja de exportar `SUPABASE_HOUSEHOLD_ID_DESARROLLO` y `VEHICULOS_ACCESS_TOKEN`;
- elimina el proxy que inyecta headers y arranca Next directamente en loopback;
- conserva email/password únicamente para sembrar una cuenta con la que el desarrollador inicia sesión manualmente;
- imprime URL de login y email de desarrollo, pero no la contraseña salvo que el entorno local documentado lo requiera expresamente.

`leerEntornoSupabase` se divide: configuración runtime (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) y configuración del proceso bootstrap. Esto evita que Next exija secretos administrativos. Las claves no necesitan `NEXT_PUBLIC_*` porque el login y acceso a datos se ejecutan en servidor.

## 10. Cambios de archivos previstos

- `package.json`/lockfile: añadir `@supabase/ssr`.
- `src/proxy.ts`: refresco Auth y redirección temprana con matcher acotado.
- `src/app/login/*`: página y Server Action de login.
- `src/app/acceso-no-disponible/page.tsx`: estado seguro y logout.
- `src/app/page.tsx`: entrada protegida/redirección al panel.
- `src/app/vehiculos/**`: exigir contexto en páginas y todas las Server Actions.
- `src/compartido/infraestructura/supabase/*`: clientes SSR por solicitud y manejo de cookies.
- `src/modulos/vehiculos/adaptadores/supabase/proveedor-identidad-supabase-servidor.ts`: cardinalidad real de membresías, sin hogar inyectado.
- `src/modulos/vehiculos/interfaz/composicion/dependencias-servidor.ts`: eliminar header/token, usuario técnico e identidad temporal; compartir cliente y proveedor real.
- `src/compartido/infraestructura/entorno.ts`: separar runtime de bootstrap y retirar variables temporales.
- `supabase/migrations/<timestamp>_mv_platform_roles.sql`: tabla, RLS, revocaciones y guardas.
- `src/modulos/vehiculos/adaptadores/supabase/bootstrap-*` y `scripts/bootstrap-admin.ts`: preflight/plan/aplicación no destructiva por UUID.
- `scripts/dev-local.sh` y `supabase/migrations/README.md`: flujo local y procedimiento productivo actualizados.
- pruebas unitarias, integración de rutas/actions y assertions RLS asociadas a cada unidad.

Los nombres finales pueden adaptarse a las convenciones existentes, pero las responsabilidades y fronteras anteriores son contratos del diseño.

## 11. Contratos y manejo de errores

- Estados esperables (`anonimo`, sin membresía, múltiples membresías) no se registran como fallos técnicos ni exponen IDs.
- Errores de Supabase, rol desconocido o forma de datos inválida se convierten en denegación y error operativo correlacionable; nunca se degrada a una familia por defecto.
- Las respuestas de login son no enumerativas.
- Las acciones no aceptan identidad de usuario ni hogar como autoridad.
- El bootstrap devuelve código distinto de cero y no aplica cambios ante cualquier conflicto; su salida diferencia claramente preflight y mutación.

## 12. Pruebas y verificación

En Strict TDD, cada unidad comienza con prueba fallida y conserva evidencia RED/GREEN.

1. **Unitarias**
   - resolución con sesión ausente/inválida;
   - cero, una y dos membresías (consulta limitada a 2 y sin selección por orden);
   - rol inválido/error DB falla cerrado;
   - login genérico, allowlist de `next`, logout;
   - composición usa el cliente de solicitud y no variables temporales;
   - bootstrap no-op, creación limpia, reutilización, plan de renombrado y abortos por conflicto.

2. **Integración App Router**
   - `/` y cada ruta `/vehiculos/**` redirigen antes de cargar repositorios para anónimo;
   - usuario válido entra y las Server Actions reciben su contexto;
   - sin familia y múltiples familias llegan al estado controlado sin consultas operativas;
   - caducidad y logout no reutilizan contexto;
   - manipulación de URL/form/cookie/header no cambia familia.

3. **RLS runtime local**
   - ampliar `scripts/validate-supabase-rls.sh` y assertions para no-miembro, cruce A/B y `mv_platform_roles` cerrado;
   - ejecutar con JWTs/roles reales y comprobar filtros de lectura y escritura.

4. **Estáticas/seguridad**
   - búsqueda/test que prohíba `service_role`, `VEHICULOS_ACCESS_TOKEN`, `SUPABASE_HOUSEHOLD_ID_DESARROLLO` y credenciales bootstrap en el grafo runtime;
   - test de allowlist para imports bootstrap server-only.

5. **Gate final**
   - `npm test`, `npm run build`, validación RLS local completa y smoke manual de login/logout en `npm run dev:local`.

## 13. Despliegue, activación y rollback

1. Ejecutar backup y preflight de datos; guardar plan y UUIDs verificados.
2. Aplicar migración aditiva `mv_platform_roles`; verificar RLS y grants.
3. Ejecutar bootstrap `--check`; resolver manualmente cualquier conflicto.
4. Aplicar únicamente el plan autorizado para `Familia Altadill`; verificar que el UUID del hogar y los conteos de vehículos/eventos no cambiaron.
5. Desplegar código con la entrada aún cerrada si el entorno lo permite; ejecutar smoke autenticado y aislamiento.
6. Activar el acceso y monitorizar con el procedimiento existente.

Rollback de código no borra la tabla nueva, familia, membresías ni roles válidos. Si falla auth, se revierte el código o se mantiene la entrada cerrada; nunca se restaura el header temporal como bypass público. La migración es aditiva y puede permanecer inerte. Un renombrado autorizado puede revertirse solo mediante otra transacción explícita usando el estado previo registrado; no se automatiza. Ante sospecha de cruce, se congela acceso/escrituras, se revocan sesiones y se sigue el plan de incidente documentado.

## 14. Unidades de trabajo y forecast de revisión

Unidades revisables propuestas:

1. cliente SSR, login/logout, guardas y pruebas de sesión;
2. resolución de membresía y sustitución de identidad/composición temporal, con pruebas;
3. migración de rol de plataforma, RLS y validaciones;
4. bootstrap seguro de `Familia Altadill`, desarrollo local y documentación.

**Review Workload Forecast**

- Chained PRs recommended: **Yes**.
- 400-line budget risk: **High**.
- Estimated changed lines: **700–1,050**, principalmente por infraestructura SSR, cobertura de todas las rutas/actions, bootstrap conflictivo y validación SQL.
- Decision needed before apply: **Yes**.

Aunque el producto sea un solo corte, auth, migración/RLS y bootstrap son áreas de alto riesgo y probablemente excedan 400 líneas. Se recomienda encadenar al menos dos PRs: (1) migración/RLS/bootstrap verificable e inerte; (2) sesión/login, guardas y activación de la identidad real. Cada PR debe incluir sus pruebas y ser rollback-safe. Si se exige un único PR, debe registrarse explícitamente la excepción de tamaño y aplicar revisión de riesgo, resiliencia, legibilidad y fiabilidad.

## 15. Riesgos abiertos

- `@supabase/ssr` y el contrato exacto de cookies deben validarse contra Next.js 16.2 durante implementación; cambios de API podrían ajustar nombres, no la arquitectura.
- La modificación toca todas las acciones privadas: omitir una guarda sería una brecha. Debe existir inventario/test de rutas y acciones.
- El bootstrap actual busca por email y crea recursos; producción exige UUID confirmado y preflight más estricto antes de reutilizarlo.
- Añadir `mv_platform_roles` amplía la allowlist de tablas y el harness RLS; dejarla sin grants runtime reduce el riesgo, pero exige documentación precisa para el futuro.
- El volumen previsto supera el presupuesto de revisión de 400 líneas; no debe iniciarse `apply` sin resolver la estrategia de entrega.
