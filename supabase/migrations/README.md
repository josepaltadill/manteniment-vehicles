# Guardarraíles para migraciones Supabase

Este proyecto usa una instancia Supabase compartida. Las migraciones deben tratarse como cambios sensibles aunque las tablas de esta app sean nuevas.

## Reglas obligatorias

- Todos los objetos propios de esta app deben usar prefijo `mv_`.
- Las tablas iniciales permitidas son `mv_vehiculos` y `mv_eventos_vehiculo`.
- No se permite ejecutar reset global de base de datos.
- No se permite `drop schema`, `drop database` ni borrados no acotados.
- Cualquier borrado de datos de prueba debe limitarse explícitamente a tablas `mv_*`.
- Las migraciones se versionan en este directorio antes de aplicarse en el servidor.
- El SQL se revisa antes de ejecutarse contra la instancia real.
- No se crean tablas futuras de adjuntos, OCR, IA, manuales ni notificaciones en este MVP.
- La matrícula debe ser única globalmente en `mv_vehiculos`, incluyendo vehículos inactivos.
- Los eventos deben referenciar vehículos mediante clave foránea.
- Kilometrajes y costes no pueden ser negativos.
- No se guarda ninguna clave privilegiada o `service_role` en código cliente.
- El acceso de aplicación a datos `mv_*` debe pasar por servidor/adaptadores de servidor.
- Las tablas nuevas deben quedar protegidas a nivel de base de datos antes de aplicar la migración real: RLS activado sin políticas permisivas por defecto, o privilegios `anon`/`authenticated` explícitamente revocados, o una excepción privada documentada y autorizada.

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

## Checklist antes de aplicar una migración real

- [ ] El archivo de migración está versionado en `supabase/migrations/`.
- [ ] Todos los objetos creados/modificados empiezan por `mv_`.
- [ ] No hay comandos globales peligrosos.
- [ ] No hay referencias a tablas de otros proyectos.
- [ ] Hay constraints para datos críticos: matrícula única, kilometrajes no negativos, costes no negativos, estados/tipos válidos.
- [ ] La migración define una postura de acceso segura para Supabase: RLS activado sin políticas permisivas por defecto, revocación explícita de `anon`/`authenticated`, o excepción privada documentada y autorizada.
- [ ] No se usa `cascade` en limpiezas de datos.
- [ ] La migración fue revisada antes de ejecutarse.
- [ ] La operación contra la instancia real fue autorizada explícitamente.

## Estado de conexión actual

En esta sesión no hay MCP Supabase conectado ni script de puente Supabase detectado en el repositorio. Hasta que exista ese puente, las migraciones se preparan como archivos SQL versionados y su aplicación real requiere autorización explícita.
