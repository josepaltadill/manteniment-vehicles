# Especificación: autenticación y acceso familiar

## Propósito

Definir la frontera de autenticación y autorización del primer acceso productivo de la aplicación privada familiar. El sistema debe permitir el acceso únicamente cuando la sesión autenticada se corresponda con una membresía familiar válida resuelta en servidor, con `Familia Altadill` como familia productiva inicial, sin debilitar RLS ni introducir selección de familia confiada al cliente.

## Requisitos

### Requisito: proteger la frontera de autenticación y la raíz

La aplicación DEBE tratar la raíz y todas las rutas del panel familiar como rutas protegidas. Una solicitud sin sesión válida NO DEBE cargar datos operativos ni mostrar una vista familiar y DEBE dirigirse al login. El login DEBE comunicar credenciales inválidas con un mensaje que no permita distinguir si una cuenta existe.

#### Escenario: visitante accede a la raíz o a una ruta privada

- DADO un visitante sin sesión válida
- CUANDO solicita la raíz o cualquier ruta del panel familiar
- ENTONCES el sistema no consulta ni devuelve datos `mv_*` y lo dirige al login

#### Escenario: credenciales inválidas

- DADO un visitante que envía credenciales incorrectas
- CUANDO intenta iniciar sesión
- ENTONCES el acceso se rechaza con un error no enumerativo y no se crea contexto familiar

### Requisito: resolver identidad, membresía y familia en servidor

El sistema DEBE obtener la identidad exclusivamente de la sesión autenticada validada por el servidor y DEBE resolver desde la persistencia la membresía familiar utilizable y su `household_id` antes de renderizar o ejecutar operaciones del panel. El cliente NO DEBE poder imponer el `household_id` mediante rutas, formularios, cookies, cabeceras o parámetros.

#### Escenario: miembro familiar autenticado

- DADO un usuario con sesión válida y una única membresía familiar utilizable
- CUANDO completa el login o solicita una ruta privada
- ENTONCES el servidor resuelve su membresía y `household_id` antes de acceder a datos y permite el panel de esa familia

#### Escenario: cliente intenta cambiar de familia

- DADO un usuario autenticado con acceso a una familia
- CUANDO modifica un `household_id` en una URL, formulario, cookie, cabecera o parámetro
- ENTONCES el servidor ignora o rechaza el valor no confiable, conserva el contexto resuelto desde la membresía y RLS impide cualquier acceso cruzado

### Requisito: conceder el primer acceso productivo a Familia Altadill

El primer entorno productivo DEBE utilizar exactamente la familia `Familia Altadill`. Un miembro válido de esa familia DEBE entrar directamente en su panel familiar, sin pantalla de selección. La preparación de la familia y sus membresías DEBE ser idempotente, basarse en identificadores estables de Auth y no duplicar, sobrescribir, reasignar ni eliminar datos existentes.

#### Escenario: miembro válido de Familia Altadill

- DADO un usuario autenticado con una membresía válida en `Familia Altadill`
- CUANDO finaliza el login
- ENTONCES accede directamente al panel con el contexto de `Familia Altadill` resuelto en servidor

#### Escenario: reejecución de la preparación productiva

- DADO que `Familia Altadill` y sus membresías esperadas ya existen y han sido verificadas
- CUANDO se ejecuta de nuevo la preparación autorizada
- ENTONCES reutiliza las identidades verificadas, no crea duplicados y no modifica datos no previstos

#### Escenario: conflicto durante la preparación

- DADO un nombre ambiguo, una membresía duplicada, una pertenencia inesperada o un usuario cuya identidad Auth no puede verificarse
- CUANDO se ejecuta la preparación productiva
- ENTONCES aborta sin reasignar ni borrar datos y deja constancia del conflicto para resolución operativa

### Requisito: denegar de forma controlada el acceso sin familia

Una sesión válida sin una membresía familiar utilizable NO DEBE seleccionar una familia por defecto ni conceder acceso al panel. El sistema DEBE mostrar un estado explícito de acceso pendiente o no disponible, sin revelar otras cuentas, membresías o familias, y DEBE ofrecer cierre de sesión.

#### Escenario: usuario autenticado sin familia

- DADO un usuario con sesión válida y ninguna membresía familiar utilizable
- CUANDO completa el login
- ENTONCES ve el estado controlado sin acceso, no recibe datos operativos ni `household_id` y puede cerrar la sesión

#### Escenario: usuario ordinario sin familia intenta una ruta privada

- DADO un usuario autenticado sin familia
- CUANDO solicita una ruta del panel familiar
- ENTONCES permanece fuera del panel y el sistema no realiza una selección implícita ni devuelve datos familiares

### Requisito: fallar cerrado ante múltiples membresías en este primer corte

Este primer corte DEBE asumir un único destino familiar operativo. Si un usuario tiene dos o más membresías válidas, el sistema NO DEBE elegir una por orden accidental, por el primer resultado de una consulta ni por un valor enviado por el cliente. DEBE fallar de forma controlada y mantener al usuario sin acceso al panel hasta que exista una regla explícita o una capacidad de selección aprobada.

#### Escenario: usuario con varias membresías válidas

- DADO un usuario autenticado con más de una membresía familiar válida
- CUANDO el sistema resuelve su acceso post-login
- ENTONCES no selecciona ninguna familia silenciosamente, no carga datos familiares y muestra el estado controlado de acceso no disponible

### Requisito: invalidar el contexto al perder la sesión

Una sesión ausente, inválida o caducada DEBE devolver al usuario a la frontera de autenticación y DEBE invalidar cualquier contexto familiar derivado de una sesión anterior. El sistema NO DEBE reutilizar `household_id`, membresía ni datos cacheados de otra sesión.

#### Escenario: sesión caducada en una ruta privada

- DADO un usuario que tenía un contexto familiar y cuya sesión ha caducado o sido invalidada
- CUANDO solicita una ruta privada
- ENTONCES el sistema descarta el contexto anterior, no carga datos familiares y lo dirige al login

#### Escenario: cierre de sesión

- DADO un usuario autenticado con contexto familiar
- CUANDO cierra sesión
- ENTONCES la sesión y el contexto familiar quedan invalidados y una nueva solicitud se trata como anónima

### Requisito: separar rol de plataforma y rol familiar

El sistema DEBE modelar y evaluar por separado la condición de superadministrador de plataforma y la pertenencia y rol familiar (`admin` o `editor`). El rol familiar NO DEBE conceder privilegios de plataforma, y la ausencia de membresía familiar NO DEBE reinterpretarse como superadministración en este primer corte.

#### Escenario: administrador familiar sin privilegios de plataforma

- DADO un usuario con rol familiar `admin` y sin rol de plataforma
- CUANDO accede a la aplicación
- ENTONCES recibe únicamente las capacidades autorizadas por su membresía familiar y no capacidades de plataforma

#### Escenario: superadministrador con membresía familiar

- DADO un usuario que tiene un rol de plataforma y también una membresía familiar
- CUANDO se autentica en este primer corte
- ENTONCES la UI disponible sigue siendo únicamente el acceso familiar resuelto por su membresía, sin inferir ni activar un panel general

### Requisito: mantener RLS y prohibir service_role en el runtime ordinario

Las operaciones normales iniciadas por usuarios DEBEN ejecutarse con la identidad autenticada del usuario y permanecer sujetas a las políticas RLS existentes sobre los objetos `mv_*`. El runtime ordinario NO DEBE usar credenciales `service_role`, y estar autenticado por sí solo NO DEBE conceder acceso a datos operativos.

#### Escenario: usuario no miembro intenta leer datos

- DADO un usuario autenticado sin membresía en una familia
- CUANDO intenta leer o modificar datos operativos de esa familia
- ENTONCES RLS rechaza la operación y no se exponen datos

#### Escenario: acceso cruzado entre familias

- DADO un miembro de una familia
- CUANDO intenta consultar o modificar un vehículo o evento perteneciente a otra familia
- ENTONCES RLS rechaza la operación aunque el cliente conozca el identificador del registro o de la familia

### Requisito: preservar la seguridad de los datos en producción

La preparación y activación productiva DEBEN limitarse a los objetos `mv_*` previstos, inspeccionar el estado antes de crear o modificar membresías, preservar RLS y disponer de copia de seguridad o procedimiento de recuperación verificado. No DEBEN eliminar familias, membresías, vehículos ni eventos. La preparación de datos, el despliegue y la activación DEBEN poder verificarse por separado; ante un fallo, el sistema DEBE mantener el acceso cerrado antes que ampliar una autorización incierta. Las credenciales administrativas NO DEBEN llegar al cliente, al repositorio ni al runtime ordinario.

#### Escenario: fallo durante activación

- DADO un fallo al validar datos, desplegar el código o activar la nueva entrada
- CUANDO se aplica el procedimiento de despliegue
- ENTONCES no se amplía el acceso, no se eliminan datos y queda disponible un procedimiento de rollback o recuperación verificable

#### Escenario: rollback de código

- DADO que debe revertirse el despliegue
- CUANDO se restaura la versión anterior
- ENTONCES no se eliminan automáticamente las membresías válidas ni otros datos productivos y el acceso no se reabre sin validar de nuevo la autorización

### Requisito: excluir la selección futura de paneles sin bloquear su evolución

Este cambio NO DEBE implementar panel general de plataforma, pantalla de elección entre panel general y panel familiar, persistencia de elección, cambio posterior de contexto ni gestión de familias. La separación de roles y la resolución server-side DEBEN conservar la posibilidad de que una propuesta futura permita a un superadministrador sin familia usar el panel general y a uno con familia elegir entre ambos paneles.

#### Escenario: superadministrador sin familia en el primer corte

- DADO un usuario con rol de plataforma y sin membresía familiar
- CUANDO se autentica mientras no existe panel general
- ENTONCES recibe el estado controlado sin acceso familiar y no obtiene una ruta o UI de superadministración

#### Escenario: alcance futuro

- DADO que posteriormente se proponga un panel general y selección de contexto
- CUANDO se diseñe ese cambio
- ENTONCES podrá definir por separado acceso de plataforma, acceso familiar y elección de panel sin depender de una selección de familia confiada al cliente en este corte

## Límites de alcance

- No se implementan recuperación de contraseña, invitaciones, alta pública, gestión de cuentas, creación o edición de familias ni selección multi-familia completa.
- No se rediseñan los roles familiares existentes `admin` y `editor`.
- No se migran ni alteran tablas ajenas a los objetos `mv_*` de la aplicación.
