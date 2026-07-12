# Propuesta: autenticación y acceso familiar tras el login

Este cambio sustituye el acceso temporal de desarrollo por un flujo autenticado que resuelve de forma segura la familia activa del usuario. El primer despliegue productivo se vinculará a la familia fija `Familia Altadill`, sin introducir todavía administración de superusuarios ni selección entre varios paneles.

## Problema

La aplicación es privada y familiar, pero el acceso actual no representa todavía el flujo productivo: un usuario debe autenticarse, pertenecer a una familia y operar únicamente sobre los datos autorizados por esa membresía. Si la sesión, la membresía y el contexto familiar no se resuelven como una única frontera de acceso, la aplicación puede mostrar estados ambiguos, fallar de forma tardía o, en el peor caso, consultar datos con un contexto familiar incorrecto.

También debe evitarse convertir una excepción futura —un superadministrador de plataforma sin familia— en un camino normal del producto actual. En este primer corte no existe panel general de plataforma, por lo que una cuenta autenticada sin familia no tiene un destino funcional válido.

## Objetivos

- Incorporar login real y proteger las rutas privadas de la aplicación.
- Resolver el contexto familiar desde la sesión autenticada y la membresía persistida, sin identificadores familiares confiados al cliente.
- Garantizar que cada usuario ordinario tenga una familia asignada para poder entrar en la aplicación.
- Preparar de forma segura la familia productiva inicial `Familia Altadill` y sus membresías, sin duplicar ni sobrescribir datos existentes.
- Tratar de forma explícita, controlada y sin acceso a datos el caso autenticado sin familia.
- Mantener separadas conceptualmente la condición de superadministrador de plataforma y la pertenencia o rol dentro de una familia.

## No objetivos

- No crear un panel general de superadministración.
- No implementar la pantalla futura para elegir entre panel general y panel familiar.
- No permitir crear, editar, eliminar o seleccionar familias desde la interfaz.
- No implementar recuperación de contraseña, invitaciones, alta pública ni gestión completa de cuentas, salvo que sean imprescindibles para cerrar de forma segura el login acordado.
- No rediseñar los roles familiares existentes `admin` y `editor`.
- No relajar RLS ni usar `service_role` como identidad de las operaciones normales de usuario.
- No migrar ni alterar tablas ajenas a los objetos `mv_*` propiedad de esta aplicación.

## Usuarios y flujos

### Usuario no autenticado

1. Accede a una ruta privada.
2. El sistema no carga datos familiares y lo dirige al login.
3. Tras autenticarse correctamente, el servidor resuelve su identidad y membresía antes de permitir el acceso.

### Usuario familiar autenticado

1. Inicia sesión con credenciales válidas.
2. El sistema obtiene su usuario desde la sesión confiable del servidor.
3. El sistema resuelve su membresía y la familia correspondiente.
4. Si pertenece a `Familia Altadill`, entra directamente en el panel familiar con el contexto de esa familia.
5. Las consultas y operaciones continúan limitadas por `household_id` y por RLS.

### Usuario autenticado sin familia

1. La autenticación es válida, pero no existe una membresía familiar utilizable.
2. El sistema no selecciona una familia por defecto, no muestra datos operativos y no permite entrar al panel familiar.
3. Se muestra un estado explícito de acceso pendiente/no disponible, con salida segura de sesión y sin revelar información sobre otras familias.
4. Este estado se considera una excepción controlada u operacionalmente pendiente, no un flujo normal para usuarios ordinarios.

### Credenciales o sesión inválidas

El login informa del fallo sin revelar si una cuenta concreta existe. Una sesión ausente, inválida o caducada vuelve a la frontera de autenticación y nunca conserva un contexto familiar anterior.

## Reglas de negocio y seguridad

- Todo usuario no superadministrador debe tener al menos una membresía familiar válida para acceder a la aplicación.
- En este primer corte, una cuenta autenticada sin familia no obtiene acceso funcional, aunque en el futuro pueda corresponder a un superadministrador de plataforma.
- La condición de superadministrador de plataforma y la membresía familiar son dimensiones independientes: una misma persona podrá ser superadministradora y, a la vez, `admin` o `editor` de una familia.
- El rol de plataforma no debe inferirse a partir del rol familiar, ni a la inversa.
- La familia activa se resuelve en servidor desde la identidad autenticada y las membresías persistidas; el cliente no puede imponer un `household_id` arbitrario.
- La autorización de datos sigue dependiendo de membresía, rol familiar y RLS. Estar autenticado por sí solo no concede acceso a datos `mv_*`.
- No deben existir rutas privadas que carguen datos antes de completar la resolución de sesión y familia.
- El cierre o caducidad de sesión elimina cualquier contexto familiar reutilizable.
- Los mensajes de error no deben exponer usuarios, membresías ni familias ajenas.
- El primer corte asume un único destino familiar operativo por usuario. Si aparecen varias membresías válidas, el sistema debe fallar de forma controlada o aplicar una regla explícita definida en especificación/diseño; no debe escoger silenciosamente una familia por orden accidental.

## Migración productiva y seguridad de datos

- La familia inicial de producción se denomina exactamente `Familia Altadill`.
- La preparación productiva debe ser idempotente: reutilizar la familia existente cuando su identidad haya sido verificada y evitar duplicados en reejecuciones.
- La vinculación de usuarios a `Familia Altadill` debe realizarse mediante identificadores estables de usuario Auth, no mediante coincidencias ambiguas ni valores recibidos del navegador.
- Antes de crear o modificar membresías se debe inspeccionar el estado existente y abortar ante conflictos, duplicados o pertenencias inesperadas; no se reasignarán usuarios de forma destructiva.
- No se borrarán familias, membresías, vehículos ni eventos como parte de la activación del login.
- Cualquier cambio SQL o bootstrap productivo debe limitarse a objetos `mv_*`, preservar RLS y contar con copia de seguridad o procedimiento de recuperación verificado antes de ejecutarse en producción.
- La aplicación del cambio productivo debe separar claramente preparación/verificación de datos, despliegue de código y activación. Un fallo en cualquier paso debe dejar el sistema sin ampliar acceso.
- Los secretos y credenciales administrativas usados para preparación no se incorporarán al cliente, al repositorio ni al flujo runtime ordinario.

## Áreas afectadas

- Frontera de autenticación y gestión de sesión.
- Protección de rutas y navegación post-login.
- Resolución server-side de identidad, membresía y `household_id`.
- Integración con `mv_households`, `mv_household_members` y las políticas RLS existentes.
- Estado de acceso pendiente/no disponible.
- Procedimiento seguro e idempotente para preparar `Familia Altadill` en producción.
- Pruebas de autenticación, aislamiento familiar y fallos de resolución.

## Criterios de aceptación

- [ ] Un visitante no autenticado no puede acceder a rutas ni datos familiares y es dirigido al login.
- [ ] Un usuario con sesión válida y membresía válida accede al panel de su familia con un contexto resuelto en servidor.
- [ ] El primer entorno productivo utiliza la familia `Familia Altadill` sin crear duplicados al repetir la preparación autorizada.
- [ ] Un usuario autenticado sin familia recibe un estado explícito sin acceso a datos ni selección familiar implícita.
- [ ] Una sesión inválida o caducada no reutiliza el contexto familiar de una sesión anterior.
- [ ] El cliente no puede cambiar de familia manipulando rutas, formularios, cookies o parámetros enviados.
- [ ] RLS continúa bloqueando a usuarios no miembros y no se introduce `service_role` en el acceso runtime ordinario.
- [ ] Los errores de login y membresía no revelan la existencia de otras cuentas o familias.
- [ ] La preparación productiva no elimina ni reasigna datos existentes y aborta de forma segura ante conflictos.
- [ ] Existen pruebas verificables para acceso autenticado válido, visitante anónimo, sesión inválida, usuario sin familia e intento de acceso cruzado.
- [ ] La implementación conserva separadas las capacidades de plataforma y los roles familiares, aunque la UI de superadministración quede fuera de alcance.

## Riesgos y mitigaciones

- **Fuga entre familias por contexto incorrecto.** Mitigación: resolver la familia en servidor, exigir filtro explícito por `household_id` y conservar RLS como última frontera.
- **Asignación productiva al usuario equivocado.** Mitigación: usar IDs Auth estables, preflight del estado y operación idempotente que aborte ante ambigüedad.
- **Bloqueo accidental de usuarios por membresía ausente.** Mitigación: estado controlado sin acceso, observabilidad operativa sin datos sensibles y procedimiento explícito para corregir la membresía.
- **Elección silenciosa si un usuario tiene varias familias.** Mitigación: no depender del orden de consulta; cerrar la regla en especificación/diseño antes de implementar ese caso.
- **Acoplar superadministración futura al rol familiar.** Mitigación: modelar ambas dimensiones por separado y no añadir atajos basados en `admin` familiar.
- **Crecimiento del PR por mezclar auth, migración destructiva y UI futura.** Mitigación: mantener este corte en login, protección, resolución familiar, estado sin acceso y preparación mínima segura; reevaluar si el forecast supera 400 líneas.

## Rollback y recuperación

- El rollback de código debe poder restaurar la frontera anterior sin borrar datos familiares ni membresías creadas correctamente.
- Si el despliegue falla antes de validar la resolución familiar, se desactiva la nueva entrada y se mantiene el acceso cerrado antes que degradar la autorización.
- Las membresías productivas válidas no se eliminan automáticamente al revertir código; cualquier corrección de datos requiere revisión explícita y evidencia del estado previo.
- Ante una posible exposición cruzada, se revocan sesiones o se deshabilita temporalmente el acceso, se preserva evidencia y se aplica fix-forward o rollback verificado antes de reabrir.

## Éxito

El cambio tiene éxito cuando una persona autorizada puede iniciar sesión y entrar directamente en el entorno de `Familia Altadill`, mientras visitantes, sesiones inválidas y cuentas sin familia quedan fuera de los datos; la familia se determina en servidor, RLS sigue activa y el despliegue no sobrescribe ni duplica información productiva.

## Decisión futura: superadministración y familia

Cuando exista el panel general de plataforma, un superadministrador podrá no pertenecer a ninguna familia y acceder únicamente a dicho panel. Si además pertenece a una familia —incluso como administrador familiar—, después del login verá una pantalla de elección entre:

- panel general de plataforma;
- panel de la familia.

Esa pantalla, la persistencia de la elección, el cambio posterior de contexto y las políticas exactas del panel general requieren una propuesta separada. El presente cambio solo preserva el modelo necesario para no impedir esa evolución.

## Límite propuesto del primer PR

Un único PR, salvo que el desglose de tareas anticipe más de 400 líneas o concentre riesgo que justifique encadenarlo, debe incluir como una unidad revisable:

1. login y sesión real;
2. protección de rutas privadas;
3. resolución server-side de la membresía y familia activa;
4. acceso directo a `Familia Altadill` para miembros válidos;
5. estado controlado para usuario autenticado sin familia;
6. preparación productiva mínima, idempotente y no destructiva de familia/membresías;
7. pruebas del flujo y de aislamiento correspondientes.

Quedan fuera de este PR el panel de superadministración, la pantalla de elección general/familia, la gestión de familias y cualquier selección multi-familia completa.

## Próxima fase recomendada

Continuar con `sdd-spec` para convertir estas reglas en requisitos y escenarios verificables, cerrando de forma explícita el comportamiento ante múltiples membresías antes del diseño técnico.
