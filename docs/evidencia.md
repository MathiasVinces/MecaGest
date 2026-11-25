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
- Versión de la API comprobada en esa etapa: `931f4984a1514ea969e5d81e4fab5695d835b010`. La interfaz se incorpora en los incrementos posteriores descritos abajo.
- GitHub Actions en Ubuntu/Node.js 24: [main, ejecución 45349646637](https://github.com/MathiasVinces/MecaGest/actions/runs/45349646637) y [codex/criterio-2, ejecución 45349679517](https://github.com/MathiasVinces/MecaGest/actions/runs/45349679517), ambas con resultado **success**. Se observaron instalación, regeneración OpenAPI sin diferencias y `npm run check` aprobados.

Los incrementos locales se publicaron usando la API de GitHub, conservando sus archivos y mensajes en el mismo orden. Se comprobó la igualdad del árbol Git en cada incremento; sus SHA cambiaron al crear los commits remotos. Se añadió un commit inicial para crear el repositorio vacío. No se alteraron fechas para simular trabajo previo.

## Aplicación web: escritorio y móvil

El 24-11-2026 se incorporó la interfaz en `/`. La última ejecución local de `npm run check` aprobó tipos, sintaxis JavaScript, **42/42 pruebas** y compilación. `npm run test:e2e` aprobó **14/14 pruebas en 29,8 segundos**, con Chrome local en Windows. Es tiempo de suite, no latencia de la aplicación.

Los siete escenarios se ejecutaron con tamaños 1440×1000 y 390×844: recorrido completo por formularios; acceso fallido y revocación al salir; restricciones de recepción/otro mecánico; permisos del mecánico asignado; placa duplicada y conservación del formulario; búsquedas, escape de HTML y salto por teclado; sesión caducada. Cada prueba inicia un servidor real y SQLite aislado.

Se revisaron capturas de acceso, resumen y orden finalizada en ambos tamaños. Los reportes y capturas locales se excluyen del repositorio. Se corrigió la separación de placa y modelo, y el salto al contenido sin cambiar de vista. Vitest quedó limitado a `tests/` para evitar descubrir copias temporales del proyecto.

CI ahora instala Chromium y ejecuta pruebas de navegador además de los controles previos. El resultado remoto debe comprobarse en Actions después de publicar; los enlaces anteriores corresponden a la etapa de API. Estas pruebas automatizadas no acreditan el estudio con cinco participantes.

## Rediseño del 25 de noviembre de 2026

- `npm run check`: **47 pruebas aprobadas en 8 archivos**, tipos, sintaxis y compilación. Las cinco nuevas pruebas cubren recepción atómica, reutilización de datos, errores/roles, rollback de las tres entidades y reenvío sin duplicación. El contrato incorpora la operación 18 y valida su respuesta real.
- `npm run test:e2e`: **20/20 pruebas aprobadas en 22,5 segundos**, diez escenarios en escritorio y móvil. Incluye reconocimiento de placas, continuación de trabajo abierto, segunda visita y conservación del formulario al fallar el servidor.
- Revisión visual: inicio, ficha de ingreso y trabajo terminado. Se corrigió el espacio entre lupa y texto del buscador, y se ocultó completamente el enlace de salto salvo al recibir foco. Los cuatro recorridos visuales y de teclado afectados volvieron a aprobarse.
- Paleta elegida por el usuario: blanco, azul oscuro y amarillo; 60–30–10 como criterio de composición. Los datos de las capturas de pruebas son ficticios. No se ha medido usabilidad con adultos mayores ni se declara cumplido QA-04.
- La comprobación remota de este rediseño se consulta en Actions para el SHA entregado; los enlaces de la etapa anterior se conservan como evidencia histórica.
