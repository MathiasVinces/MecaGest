# Evidencia de verificación

Fecha: **24 de noviembre de 2026, America/Guayaquil**. Entorno local: Windows, Node.js **24.21.0**, npm **11.19.0**, SQLite incluido en Node.js. Datos ficticios; no se utilizaron registros de un taller real.

## Ejecución local

`npm run check` terminó correctamente: comprobación TypeScript, **42 pruebas aprobadas en 7 archivos** y compilación. La ejecución conjunta de Vitest registró **15,78 segundos**; es tiempo de la suite, no una medición de rendimiento de consultas.

| Archivo | Pruebas | Evidencia principal |
|---|---:|---|
| persistence.test.ts | 3 | Claves foráneas, rollback y reapertura de archivo |
| auth.test.ts | 4 | Login, tokens, revocación, expiración y permisos |
| application.test.ts | 3 | Flujo completo, transición inválida y rechazo |
| api.test.ts | 24 | Éxito y errores HTTP en los cinco casos de uso |
| quality.test.ts | 4 | 20 intentos restringidos y 30 fallos SQL |
| architecture.test.ts | 1 | Dependencias descendentes |
| contract.test.ts | 3 | OpenAPI válido, rutas y respuestas reales |

`npm run demo` se ejecutó contra el servidor compilado en `127.0.0.1:3000`: terminó con `COMPLETED`, tres actividades persistidas y diagnóstico/autorización visibles en historial. El intento de autorización del mecánico devolvió 403. `npm run seed` es idempotente y no sobrescribe las credenciales existentes.

## Drivers prioritarios

- **QA-02:** se enviaron 20 intentos con roles mecánico/recepción; 20 respuestas 403; autorizaciones y estado conservados en cada intento.
- **QA-03:** se provocaron 10 errores antes de insertar actividad, 10 después de insertarla y 10 después de modificar el estado. Las 30 respuestas fueron 500 controladas y la consulta posterior coincidió con el estado anterior. Al retirar cada trigger, el reintento completó una única reparación.

Son pruebas técnicas controladas del motor SQL. No prueban pérdidas de energía, conectividad del taller ni aceptación del cliente real.

## Reproducir

```sh
npm ci
npm run check
```

Los tests no necesitan credenciales, servidor externo ni seed. El contrato puede regenerarse con `npm run api:generate`; el workflow comprueba que no difiera del archivo versionado.

## Pendientes y límites

QA-01 (carga), QA-04 (participantes), QA-05 (8 horas) y QA-06 (modificación cronometrada) no se presentan como cumplidos. Las reglas y roles siguen pendientes de validación con un taller.

## Instalación limpia, revisión visual y CI remota

- Se clonó el contenido versionado en una carpeta nueva sin base ni credenciales. `npm ci` y `npm run check` finalizaron correctamente: 42/42 pruebas, 7 archivos y compilación. Vitest registró 12,36 segundos en esa segunda ejecución.
- Se abrió Swagger en Chrome sin interfaz, con contexto aislado: título `MecaGest | API del taller`, 17 operaciones visibles. Se inspeccionó una captura para comprobar legibilidad y ausencia de errores de carga.
- Repositorio público: [MathiasVinces/MecaGest](https://github.com/MathiasVinces/MecaGest).
- Versión funcional comprobada: `931f4984a1514ea969e5d81e4fab5695d835b010`. Los cambios posteriores de cierre actualizan documentación/evidencia.
- GitHub Actions en Ubuntu/Node.js 24: [main, ejecución 45349646637](https://github.com/MathiasVinces/MecaGest/actions/runs/45349646637) y [codex/criterio-2, ejecución 45349679517](https://github.com/MathiasVinces/MecaGest/actions/runs/45349679517), ambas con resultado **success**. Se observaron instalación, regeneración OpenAPI sin diferencias y `npm run check` aprobados.

Los incrementos locales se publicaron usando la API de GitHub, conservando sus archivos y mensajes en el mismo orden. Se comprobó la igualdad del árbol Git en cada incremento; sus SHA cambiaron al crear los commits remotos. Se añadió un commit inicial para crear el repositorio vacío. No se alteraron fechas para simular trabajo previo.
