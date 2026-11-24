# Trazabilidad con avances y rúbrica

Fuentes: C1P1 del 05-11-2026, C1P2 del 12-11-2026 e instrucciones/rúbrica del Criterio 2, semana 5, proporcionadas por el equipo. Los PDF no se copian al repositorio público. Las reglas del taller siguen siendo propuestas, pendientes de entrevistas F-03/F-04/F-05.

| Criterio | Máximo | Evidencia |
|---|---:|---|
| Flujos funcionales | 15 | `src/presentation/web/`, `src/application/`, `tests/api.test.ts`, `e2e/workshop.spec.ts` |
| Capas y dependencias | 12 | presentation/application/persistence, bootstrap, `tests/architecture.test.ts` |
| OpenAPI | 8 | `docs/openapi.yaml`, `/docs/`, `tests/contract.test.ts` |
| Pruebas | 10 | `npm run check`, `npm run test:e2e`, `tests/`, `e2e/`, workflow CI |
| Bitácora y drivers | 5 | `docs/bitacora.md`, esta matriz, `docs/evidencia.md` |

Los máximos son de la rúbrica, no una nota autoasignada. La evaluación corresponde al docente.

| Caso | Operación | Alternos/errores comprobados |
|---|---|---|
| CU-01 Ingreso | POST clients, vehicles, orders | Faltantes, placa duplicada, inexistentes, orden abierta, asignación inválida |
| CU-02 Diagnóstico | PUT orders/{id}/diagnosis | Borrador, vacío, otro mecánico, orden inexistente, estado inválido |
| CU-03 Autorización | POST orders/{id}/authorization | Rechazo, sin diagnóstico/constancia, sin rol, sobrescritura |
| CU-04 Reparación | POST orders/{id}/repair/start y repairs | Sin aprobación, vacío, incidencia, reanudación, orden cerrada |
| CU-05 Historial | GET vehicles/by-plate/{plate}/history | Historial vacío, vehículo inexistente, placa inválida, rol restringido |

Las rutas de negocio tienen prefijo `/api/`.

| Driver | Prioridad | Evidencia y estado |
|---|---|---|
| QA-03 Integridad | P1 | 30 fallos SQL controlados y rollback comprobado en `tests/quality.test.ts` |
| QA-02 Roles | P1* | 20 intentos bloqueados y autorizaciones intactas; control de asignación |
| QA-04 Usabilidad | P2 | Formularios, errores, navegación por teclado y pruebas en dos tamaños; pendiente prueba con 5 participantes |
| QA-01 Rendimiento | P2 | Índices; pendiente carga de 2.000 vehículos/10.000 órdenes, 200 búsquedas y 10 usuarios |
| QA-05 Disponibilidad | P2 | `/health` y reapertura; pendiente jornada de 8 horas/480 verificaciones |
| QA-06 Modificabilidad | P3 | Capas y regresión; pendiente modificación de campo cronometrada |

R-01 se refleja en claves foráneas; R-02 en autorización previa; R-03 en roles; R-04 en alcance excluido; R-05 sigue siendo supuesto del taller; R-06 se materializa como asignación obligatoria de mecánico. La interfaz y sus pruebas automatizadas no sustituyen el estudio con participantes de QA-04.
