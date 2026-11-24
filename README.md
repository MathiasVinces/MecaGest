# MecaGest

Sistema académico para gestionar servicios de un taller. Implementa **ingreso, diagnóstico, autorización, reparación e historial** como monolito en capas. Entrega del Criterio 2 del RdA1, semana 5, continuando los avances C1P1 y C1P2.

La interfaz de demostración es **Swagger UI**. Esta versión entrega la API; no incluye un panel comercial de gestión.

## Instalación y arranque

Requisitos: **Node.js 24.x**, npm y Git. No necesita Docker, PostgreSQL ni servicios externos. Ejecutar desde la raíz del proyecto:

```sh
git clone https://github.com/MathiasVinces/MecaGest.git
cd MecaGest
npm ci
npm run seed
npm run build
npm start
```

Abrir **http://127.0.0.1:3000/docs/**. Contrato: **http://127.0.0.1:3000/openapi.yaml**. Estado del proceso: **http://127.0.0.1:3000/health**.

`seed` crea `admin`, `recepcion` y `mecanico` con contraseñas aleatorias. Las guarda en **`.local/credenciales-<marca-de-tiempo>.json`** y muestra la ruta. Abrirlo localmente; no copiarlo a GitHub ni Moodle. Repetir seed conserva usuarios, contraseñas y datos existentes. No hay recuperación web de contraseñas: si se pierde el archivo, usar una base nueva mediante `DATABASE_PATH` y ejecutar seed para otra demostración.

Durante desarrollo se puede sustituir compilación/arranque por `npm run dev`.

## Demo y pruebas

Con el servidor encendido, abrir otra terminal en esta carpeta:

```sh
npm run demo
```

La demo usa las credenciales locales, crea datos ficticios y recorre los cinco flujos, incluyendo autorización prohibida, incidencia, reanudación e historial final. Imprime los IDs y una placa nueva, sin tokens ni contraseñas. Cada ejecución añade registros persistentes. El login permite 10 intentos por IP/minuto; esperar un minuto si se repite demasiado rápido.

Comprobación completa, sin servidor ni seed:

```sh
npm run check
```

Ejecuta TypeScript estricto, Vitest y compilación. Las pruebas usan Supertest y SQLite real aislado, sin tocar la base de demostración. Cubren éxito y errores de cada flujo, sesiones, capas, contrato, 20 intentos restringidos y 30 interrupciones SQL. GitHub Actions ejecuta los mismos controles. Ver [evidencia](docs/evidencia.md).

Otros comandos: `npm test`, `npm run test:watch`, `npm run typecheck` y `npm run api:generate`.

## Demostración manual en Swagger

1. Ejecutar `POST /api/auth/login` con un usuario y su contraseña local.
2. Copiar `token`, pulsar **Authorize** y pegar solo el token; Swagger añade `Bearer`.
3. Con recepción: crear cliente, vehículo y orden. Consultar `/api/mechanics` para el UUID del responsable.
4. Con el mecánico asignado: registrar diagnóstico completo.
5. Con admin (encargado): registrar aceptación o rechazo y constancia del cliente.
6. Con el mecánico: iniciar reparación, registrar actividades y finalizar.
7. Consultar historial por placa con mecánico o admin.

Para cambiar de rol, iniciar sesión y sustituir el token de Authorize. Los UUID de los ejemplos son ilustrativos: usar los devueltos por las operaciones anteriores. No introducir datos personales reales.

## Estructura

```text
src/presentation/      rutas HTTP, autenticación de solicitudes y errores
src/application/       casos de uso, validaciones, permisos y estados
src/persistence/       SQL, esquema, repositorios y transacciones
src/domain/            tipos compartidos sin dependencias de otras capas
src/bootstrap.ts       composición de las capas
src/server.ts          arranque y cierre del servidor
tests/                 pruebas de flujos, errores, contrato y drivers
scripts/               seed, demo y generación del contrato
docs/openapi.yaml      contrato versionado de 17 operaciones
docs/bitacora.md        incrementos reales y verificaciones
```

Dependencias: **presentación → aplicación → persistencia**. `bootstrap` ensambla las capas. Los controladores no importan repositorios ni ejecutan SQL. No se usan microservicios ni arquitectura hexagonal.

## Configuración y persistencia

Opcional: copiar `.env.example` como `.env` (PowerShell: `Copy-Item .env.example .env`).

| Variable | Predeterminado | Uso |
|---|---|---|
| `HOST` | `127.0.0.1` | Interfaz de escucha local |
| `PORT` | `3000` | Puerto HTTP, también usado por la demo |
| `DATABASE_PATH` | `data/mecagest.sqlite` | Archivo SQLite relativo a la raíz |

SQLite es la alternativa elegida a PostgreSQL para reproducir la entrega sin servicios adicionales. La consigna acepta tecnologías equivalentes. Hay claves foráneas, índices, transacciones y esquema versionado (`user_version=1`); no es un arreglo en memoria. Ver [arquitectura](docs/arquitectura.md).

La base y credenciales están ignoradas por Git. Los datos permanecen al reiniciar. Para respaldar una demostración, detener el servidor y copiar el archivo SQLite fuera del repositorio público.

## Alcance y pendientes

Los cinco flujos están implementados y probados. Quedan fuera facturación, pagos, inventario avanzado, multi-taller, reautorización de trabajos adicionales y recuperación de contraseñas. Las listas no tienen paginación. SQLite síncrono y el limitador en memoria corresponden a una evaluación local de un solo proceso; no se afirma capacidad de despliegue distribuido.

QA-02 y QA-03 tienen evidencia automatizada controlada. No se declaran cumplidas la carga QA-01, usabilidad con participantes QA-04, jornada de disponibilidad QA-05 ni modificación cronometrada QA-06. Siguen pendientes las entrevistas y completar nombres/paralelo del equipo.

Ver [trazabilidad con rúbrica](docs/trazabilidad.md), [bitácora](docs/bitacora.md) y [guía de presentación/Moodle](docs/guia-presentacion.md).

Se utilizó Codex/ChatGPT como asistencia de implementación y documentación. Los commits representan incrementos reales de esta sesión. El equipo debe revisar, comprender y validar el resultado conforme a las normas del curso; no se presentan entrevistas ni mediciones de campo ficticias.
