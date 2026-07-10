# Exploración: validación runtime RLS Supabase

Cambio: `supabase-rls-runtime-validation`
Proyecto: `manteniment-vehicles`
Fecha: 2026-07-10

## Conclusión ejecutiva
El repositorio no tiene un harness local/efímero ejecutable para PostgreSQL/Supabase. `package.json` solo ofrece `npm test` (`vitest run`) y no incluye dependencias PostgreSQL/Supabase ni scripts de base de datos. Existe `.mcp.json` apuntando a `http://127.0.0.1:8080/mcp`, pero `supabase/migrations/README.md` documenta que en la sesión no hay MCP Supabase conectado ni puente detectado. No existe `supabase/config.toml` en el repositorio. Por tanto, el siguiente SDD debe preparar un harness seguro local/efímero, preferentemente basado en Supabase CLI + Docker si esas herramientas están disponibles en el entorno, sin inventar disponibilidad ni tocar la instancia real.

## Opciones disponibles ahora
- **Vitest:** disponible como runner (`npm test`), pero no puede validar RLS por sí solo.
- **SQL existente:** la migración `supabase/migrations/20260710000000_supabase_persistence_short.sql` es transaccional y puede ser la entrada del harness.
- **Supabase local:** no hay `supabase/config.toml`; no hay evidencia repo-local de configuración, seeds, scripts o dependencia del CLI. Debe verificarse en implementación con comprobaciones no mutantes (`supabase --version`, `docker --version`/equivalente), sin iniciar/resetear nada hasta definir guardas.
- **MCP:** `.mcp.json` declara un endpoint local, pero la documentación del proyecto afirma que no hay conexión activa. No es evidencia de una base disponible ni debe usarse para la validación sin confirmar que sea local/efímera.
- **PostgreSQL directo:** no hay `DATABASE_URL`, cliente Node ni script de puente detectado. No es opción preparada.

## Comportamiento runtime obligatorio
Derivado de `design.md`, `validation-checklist.md`, `spec.md` y `supabase/migrations/README.md`:
1. Aplicar la migración únicamente en una base local/efímera aislada.
2. Preparar al menos dos hogares y usuarios Auth de prueba: `admin`, `editor`, usuario no miembro y contexto anónimo.
3. Verificar que miembros acceden solo al hogar propio; un no miembro no puede leer ni crear, actualizar o borrar filas del hogar ajeno; `anon` no accede a ninguna tabla `mv_*`.
4. Verificar permisos por rol: `admin` administra hogar/membresías y borra vehículos/eventos; `editor` lee el hogar y crea/actualiza vehículos/eventos, pero no administra membresías/hogar ni borra datos operativos; ambos deben quedar aislados por `household_id`.
5. Verificar `using` y `with check` en lecturas/escrituras, incluyendo intentos de insertar/actualizar filas con `household_id` ajeno.
6. Verificar integridad runtime: evento con vehículo de otro hogar rechazado por FK compuesta; checks de textos/valores/estado y matrícula duplicada por hogar rechazados.
7. Verificar último admin: rechazo de `delete`, degradación de rol y traslado de hogar cuando dejarían el hogar sin admin; permitir la operación si queda otro admin; permitir el cascade derivado de borrar explícitamente el hogar.
8. Verificar al menos concurrencia básica de retirada del último admin, porque el diseño usa `FOR UPDATE` para serializar por hogar.
9. Registrar versión de entorno efímero, matriz actor/operación/resultado y evidencia reproducible. Mantener el despliegue real bloqueado hasta que todos los casos pasen.

## Alcance más seguro
El corte debe ser un **harness SQL runtime local/efímero**, no una nueva migración funcional ni un adaptador de aplicación. Alcance mínimo recomendado: configuración local mínima solo si Supabase CLI/Docker están disponibles; fixture efímero de usuarios/hogares; script SQL de casos positivos/negativos con roles/JWT o mecanismo equivalente; comando reproducible y reporte/checklist de resultados. `npm test` puede validar parsing/formato del reporte o contrato del harness, pero no sustituye la prueba contra PostgreSQL. Excluir aplicación real, credenciales compartidas, `service_role` en cliente, seeds permanentes, UI, adaptador TypeScript, RPC evento-kilometraje y cambios de esquema salvo ajustes imprescindibles descubiertos por la prueba.

## Riesgos y bloqueos
- Bloqueo principal: no se conoce disponibilidad de Supabase CLI, Docker ni una imagen local; hay que verificar herramientas antes de fijar diseño.
- La migración referencia `auth.users`, `auth.uid()` y roles `anon`/`authenticated`; PostgreSQL genérico no reproduce Supabase sin un emulador/roles/funciones/fixture explícitos.
- El uso de `security definer`, propietario `postgres`, grants y RLS puede fallar distinto según versión/imagen; registrar versión exacta.
- La concurrencia del trigger requiere dos sesiones reales, no solo assertions secuenciales.
- El harness podría contaminar una base persistente si usa un proyecto no efímero, `db reset` ambiguo o credenciales reales; debe fallar cerrado ante URLs/keys no locales y limpiar solo el contenedor/proyecto efímero.
- No inventar evidencia runtime: la inspección actual sigue siendo estática y no ejecutó migración local ni real.
- Presupuesto de revisión: mantener el payload bajo 400 líneas; si Docker/Supabase setup obliga a más archivos o una configuración extensa, separar el setup de la matriz de pruebas.

## Referencias inspeccionadas
- `package.json`
- `supabase/migrations/20260710000000_supabase_persistence_short.sql`
- `supabase/migrations/README.md`
- `openspec/changes/supabase-persistence-short/design.md`
- `openspec/changes/supabase-persistence-short/validation-checklist.md`
- `openspec/changes/supabase-persistence-short/spec.md`
- `openspec/changes/supabase-persistence-short/apply-progress.md`
- `openspec/config.yaml`
- `.mcp.json`

## Siguiente fase
`next_recommended: propose` — decidir explícitamente si el repo incorpora configuración Supabase local mínima o si el harness se apoya en una infraestructura efímera ya disponible; después fijar matriz de casos y guardas anti-producción.
