# Presentación y entrega

## Preparación

Completar integrantes, paralelo y responsable con datos del equipo. Ejecutar `npm ci`, `npm run seed`, `npm run check` y `npm start`. Abrir Swagger, código y bitácora. Consultar credenciales solo localmente, sin mostrarlas en grabaciones ni copiarlas a Moodle.

## Recorrido de 6 a 8 minutos

1. **Problema y alcance:** explicar los cinco pasos del servicio y que las necesidades siguen pendientes de validación con un taller real.
2. **Capas:** mostrar `presentation/app.ts`, `application/order-service.ts` y `persistence/workshop-repository.ts`. Seguir una solicitud desde HTTP hasta SQL y la respuesta.
3. **Demo:** ejecutar `npm run demo` en otra terminal y consultar en Swagger la placa generada. Mostrar diagnóstico, autorización y tres actividades persistidas.
4. **Seguridad:** explicar el 403 del mecánico que intenta autorizar y el rechazo a iniciar una reparación sin aprobación.
5. **Integridad:** mostrar la transacción y las pruebas de 30 interrupciones SQL. Explicar por qué actividad y estado deben persistirse juntos.
6. **Evidencia:** mostrar las pruebas del contrato, `npm run check`, commits y bitácora. Distinguir lo medido de las entrevistas, carga, disponibilidad y pruebas con participantes pendientes.

## Preguntas para practicar

- ¿Por qué SQLite? Permite reproducir la entrega con SQL y transacciones sin servicios adicionales; la consigna acepta equivalentes. Tiene límites para alta carga.
- ¿Dónde están las reglas? En los servicios de aplicación, no en controladores ni en consultas SQL.
- ¿Qué pasa si falla el guardado? Se hace rollback y la prueba verifica que la orden no cambió.
- ¿Cómo se comprueba OpenAPI? Comparando rutas y validando respuestas reales contra los esquemas.
- ¿El cliente tiene acceso? No; el encargado deja constancia de su decisión.
- ¿Se usó IA? Sí, como asistencia. El equipo debe comprender y revisar la entrega; los commits son incrementos reales, no historial retrospectivo.

## Texto para Moodle

```text
MecaGest - Criterio 2 del RdA1, semana 5
Repositorio: https://github.com/MathiasVinces/MecaGest
Rama: codex/criterio-2
Commit: [copiar el SHA publicado con git rev-parse HEAD]
Requisitos: Node.js 24.x y npm
Instalar: npm ci
Preparar usuarios: npm run seed
Compilar: npm run build
Arrancar: npm start
Pruebas: npm run check
Demo: npm run demo (con el servidor encendido)
Explorador API local: http://127.0.0.1:3000/docs/
Integrantes y paralelo: [completar por el equipo]
```

Verificar que el repositorio público y el commit indicado sean accesibles antes de enviar. El envío en Moodle lo realiza el equipo.
