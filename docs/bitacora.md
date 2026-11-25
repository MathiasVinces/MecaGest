# Bitácora de incrementos

Fecha de esta sesión: **24 de noviembre de 2026 (America/Guayaquil)**.
Los commits corresponden a trabajo realizado en esta sesión; no representan días anteriores ni contribuciones de integrantes distintos.

## 01. Preparar el proyecto

- Drivers: separación en capas del Criterio 2; QA-06 (modificabilidad).
- Cambios: configuración de Node.js 24, TypeScript, scripts npm y exclusión de bases de datos y credenciales locales.
- Decisión: SQLite persistente en archivo permite instalar sin servicios externos. Conserva SQL, claves foráneas y transacciones; PostgreSQL figura como tecnología de referencia, no obligatoria, en la consigna.
- Verificación: Node.js 24.21.0 disponible; repositorio inicial sin código ni commits.
- Pendientes: implementar persistencia, cinco casos de uso, contrato y pruebas.

## 02. Persistencia relacional y transacciones

- Drivers: R-01 (vínculos de registros), QA-03 (integridad), CU-01 a CU-05.
- Cambios: modelos, migración versionada, claves foráneas, índices, repositorios de identidades y taller; transacciones con rollback.
- Pruebas: `npm run typecheck`; `npm test -- tests/persistence.test.ts`.
- Resultado: compilación sin errores y 3/3 pruebas aprobadas (FK, rollback, reapertura de archivo).
- Pendientes: integrar reglas de aplicación y HTTP; simular fallos durante reparaciones completas.

## 03. Autenticación y permisos básicos

- Drivers: R-03, QA-02 (P1), precondición autenticada de CU-01.
- Cambios: contraseñas con scrypt y sal aleatoria; sesiones de 8 horas con token almacenado como hash; cierre de sesión; roles ADMIN, RECEPTIONIST y MECHANIC; preparación local idempotente de usuarios.
- Pruebas: `npm run typecheck`; `npm test -- tests/auth.test.ts`.
- Resultado: 4/4 pruebas aprobadas (sesión, revocación, expiración, credenciales y permisos).
- Pendientes: aplicar estos permisos a las operaciones HTTP; la preparación genera contraseñas nuevas solo en archivos ignorados por Git.

## 04. Implementar los cinco casos de uso

- Drivers: CU-01 a CU-05, R-01/R-02/R-03/R-06, QA-02 y QA-03.
- Cambios: servicios de catálogo y órdenes; validación de entradas; asignación al mecánico; diagnóstico borrador/completo; decisión con constancia; inicio, incidencias y cierre; historial por placa normalizada.
- Reglas propuestas adicionales: una orden abierta por vehículo; rechazo y cierre son terminales; solo el mecánico asignado o administrador modifica el trabajo; la autorización queda inmutable.
- Pruebas: `npm run typecheck`; `npm test -- tests/application.test.ts`.
- Resultado: 3/3 pruebas aprobadas; recorrido completo y caminos de rechazo/transición indebida.
- Pendientes: HTTP, contrato, pruebas de errores de cada flujo y evidencia cuantitativa de QA-02/QA-03.

## 05. Exponer y comprobar la API HTTP

- Drivers: CU-01 a CU-05; separación de responsabilidades del Criterio 2; QA-02.
- Cambios: controladores Express, composición de capas, servidor local, errores JSON, límite de tamaño y de intentos de login; punto de entrada Swagger (contrato pendiente del siguiente incremento).
- Pruebas: `npm run typecheck`; `npm test -- tests/api.test.ts`.
- Resultado: 24/24 pruebas HTTP aprobadas, con base SQLite real, casos exitosos y no exitosos para cada flujo.
- Pendientes: completar OpenAPI y la guía de demostración; medir escenarios de calidad prioritarios.

## 06. Comprobar permisos, atomicidad y dependencias

- Drivers: QA-02 (P1), QA-03 (P1), arquitectura por capas.
- Cambios: pruebas de intentos restringidos; interrupciones mediante triggers temporales del motor SQLite antes/después de actividad y después del cambio de estado; verificación de importaciones entre capas.
- Pruebas: `npm test -- tests/quality.test.ts tests/architecture.test.ts`.
- Resultado: 5/5 pruebas aprobadas; 20/20 intentos restringidos devuelven 403 sin alterar autorizaciones; 30/30 interrupciones revierten actividad y estado; reintentos posteriores funcionan.
- Límite de la evidencia: fallos SQL controlados, no cortes físicos de energía ni red. QA-01, QA-04, QA-05 y QA-06 completos no se declaran medidos.
- Pendientes: contrato OpenAPI, instrucciones reproducibles, revisión final y publicación.

## 07. Contrato OpenAPI verificable

- Drivers: contrato de API del Criterio 2, CU-01 a CU-05, QA-06.
- Cambios: `docs/openapi.yaml` (17 operaciones), generador versionado, Swagger UI en `/docs/`, esquemas de entrada/salida, errores, ejemplos ficticios y permisos de cada operación.
- Pruebas: validación del documento con Swagger Parser y validación de respuestas reales con AJV; comparación de rutas HTTP contra el contrato.
- Resultado inicial: se corrigieron dos errores de sintaxis del generador y la importación CommonJS de AJV Formats; después, 3/3 pruebas del contrato aprobaron. Los casos se aislaron para no depender del orden de ejecución.
- Pendientes: comprobación conjunta final, manual de arranque/demo y publicación.

## 08. Preparar demostración y documentación de entrega

- Drivers: cinco CU, trazabilidad con la rúbrica, reproducibilidad y QA-04 como apoyo documental.
- Cambios: README de instalación, configuración y Swagger; demo HTTP de datos ficticios; diagramas y decisiones; matriz de rúbrica/drivers; guía de exposición/Moodle; evidencia de ejecución.
- Pruebas: `npm run check`, `npm run seed`, `npm start`, `npm run demo`, `git diff --check`.
- Resultado: 42/42 pruebas en 7 archivos, TypeScript y compilación correctos; demo real completada con autorización prohibida 403, incidencia, cierre e historial persistido. Sin errores de espacios en el diff.
- Pendientes: publicación en GitHub y comprobación remota; identificación académica y validación con taller a cargo del equipo.

## 09. Automatizar la verificación en GitHub

- Drivers: reproducibilidad de pruebas y trazabilidad del Criterio 2; QA-06 como regresión.
- Cambios: workflow de GitHub Actions para instalar con lockfile, regenerar el contrato sin diferencias, comprobar tipos, ejecutar pruebas y compilar con Node.js 24.
- Verificación local: la misma secuencia `npm run check` aprobó 42 pruebas y compilación. La base y los archivos de credenciales no están versionados.
- Publicación: el equipo creó el repositorio público `MathiasVinces/MecaGest`; se verificó propiedad y permiso de escritura. La subida se realiza mediante la conexión GitHub de Mathias porque Git local no tiene credenciales guardadas.
- Pendientes: observar el resultado del workflow remoto después de subir; no se marca como aprobado anticipadamente.

## 10. Verificar publicación y cerrar la evidencia

- Drivers: reproducibilidad y evidencia verificable del Criterio 2; trazabilidad de todos los CU.
- Cambios: evidencia con enlaces a CI, referencia funcional para Moodle y precisión sobre la prueba de reapertura de SQLite.
- Pruebas adicionales justificadas: instalación con `npm ci` desde clon limpio; 42/42 pruebas y compilación correctas; revisión visual de Swagger (17 operaciones); lectura de los resultados reales de Actions en `main` y `codex/criterio-2`.
- Resultado remoto: `931f4984a1514ea969e5d81e4fab5695d835b010` aprobado en las ejecuciones 45349646637 y 45349679517. Código disponible públicamente en `https://github.com/MathiasVinces/MecaGest`.
- Publicación: los incrementos se trasladaron mediante la API de GitHub preservando mensajes, orden y árboles de archivos; cada árbol remoto coincidió con el local. Los SHA remotos son distintos; no se simularon fechas ni autores alternativos.
- Pendientes del equipo: nombres/paralelo, lectura y defensa del código, envío en Moodle, entrevistas y escenarios de calidad aún no medidos. No hay credenciales ni bases de datos versionadas.

## 11. Incorporar la aplicación web del taller

- Fecha: 24-11-2026. Drivers: CU-01 a CU-05, QA-04 (formularios), QA-02 (roles).
- Cambios: interfaz HTML/CSS/JavaScript servida por el mismo monolito en `/`; acceso, resumen con datos reales, clientes, vehículos, órdenes, diagnóstico, autorización, actividades, incidencias, cierre e historial. Swagger sigue disponible en `/docs/`.
- Comportamiento: la interfaz usa las 17 operaciones existentes, respeta roles y asignación, comunica errores, evita doble envío y renueva las vistas después del guardado. La sesión se conserva solo en la pestaña y el servidor controla sus permisos y expiración.
- Verificación: recorrido completo mediante formularios en escritorio y móvil; capturas revisadas de acceso, resumen y orden finalizada. Se corrigió el marcado de la placa para separarla del modelo y el salto de teclado al contenido para conservar la vista actual.
- Resultado: interfaz conectada a SQLite mediante la API; no se añadieron reglas de negocio en los controladores ni en la persistencia.
- Pendientes: versionar pruebas de navegador y actualizar la guía de exposición. El estudio de usabilidad con cinco participantes sigue pendiente.

## 12. Probar la aplicación en escritorio y móvil

- Drivers: regresión CU-01 a CU-05, QA-02 y apoyo técnico a QA-04.
- Cambios: Playwright con siete escenarios en dos tamaños (1440×1000 y 390×844); CI instala Chromium y ejecuta la suite; exclusión de reportes; Vitest limitado a `tests/` para no descubrir clones temporales ni tests de navegador.
- Verificación: `npm run check` aprobó 42/42 pruebas de backend/contrato y compilación. `npm run test:e2e` aprobó 14/14 pruebas de navegador en 29,8 segundos con Chrome local. La ejecución inicial detectó un selector ambiguo por el marcado de placa/modelo y se corrigió antes de aprobar el recorrido.
- Casos: flujo completo, login erróneo, cierre y revocación, roles/asignación, placa duplicada, búsqueda, HTML ingresado tratado como texto, navegación por teclado y sesión vencida. Cada test crea su propio servidor y SQLite aislado.
- Pendientes: observar la nueva suite en GitHub Actions; la evaluación con personas reales no se sustituye con automatización.

## 13. Preparar el uso y la exposición de la aplicación

- Fecha: 24-11-2026. Drivers: entrega reproducible y explicación de CU-01 a CU-05.
- Cambios: lanzador de Windows, consulta local de credenciales, README actualizado, arquitectura de la interfaz, trazabilidad y evidencia; guía de ocho minutos para el jueves 26 con formularios, preguntas y texto para Moodle.
- Verificación: se conservan los resultados de 42 pruebas de backend y 14 de navegador del incremento anterior. Los comandos de la guía corresponden a los scripts versionados. No se incluyen datos ni contraseñas locales en Git.
- Pendientes del equipo: ensayar, completar integrantes/paralelo y enviar la entrega. Las entrevistas y escenarios de calidad no medidos permanecen pendientes.

## 14. Proteger el formulario mientras termina el guardado

- Hallazgo: la primera ejecución remota de la interfaz aprobó backend y 13/14 pruebas de navegador; el recorrido móvil falló al escribir la siguiente actividad antes de terminar la actualización anterior.
- Causa: solo se deshabilitaba el botón; los campos seguían editables y su contenido podía reemplazarse al refrescar la orden.
- Corrección: capturar los datos y deshabilitar todos los controles hasta terminar la solicitud y el refresco; restaurar su estado previo ante error. La prueba retiene una petición para verificar explícitamente que no se permite editar durante el guardado.
- Aislamiento de pruebas: cerrar conexiones del servidor de prueba al terminar, incluidas las conservadas por la interceptación de red, antes de cerrar SQLite.
- Verificación: repetir controles de código y las 14 pruebas de navegador; observar CI después de publicar la corrección.
