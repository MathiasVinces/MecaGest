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
