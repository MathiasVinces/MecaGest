# Exposición de MecaGest — jueves 26 de noviembre de 2026

## Qué vas a presentar

MecaGest es una aplicación web local para registrar el servicio de un taller: ingreso, diagnóstico, autorización, reparación e historial. El navegador muestra las pantallas; Node.js ejecuta las reglas; SQLite guarda los datos. GitHub permite entregar el código y consultar los cambios. Para mostrar la app hay que encender su servidor.

La entrega pide un monolito ejecutable en capas, contrato OpenAPI, pruebas y bitácora. La interfaz permite demostrar esos requisitos mediante formularios. Los avances PDF explican el problema y los drivers; el repositorio contiene su implementación.

## Prepararte antes de clase

1. Completar nombres, paralelo y responsable del equipo para Moodle.
2. Instalar Node.js 24 y ejecutar `npm ci` antes de la exposición. La primera instalación requiere internet.
3. En Windows, abrir **INICIAR-MECAGEST.cmd** con doble clic. Dejar esa ventana abierta. Si el servidor ya está funcionando, usarlo sin abrir otro.
4. En otra terminal de la carpeta, ejecutar `npm run credenciales`. Consultar la contraseña de `admin` en privado y cerrar esa salida antes de proyectar.
5. Abrir **http://127.0.0.1:3000/** e iniciar sesión. No necesitas copiar tokens para operar los formularios.
6. Ensayar una vez el recorrido siguiente. Los registros permanecen: para repetir, usar otra placa, por ejemplo DEM0027.
7. Tener abiertos el código, esta guía, la bitácora y el resultado de pruebas. Con dependencias instaladas, la app y sus recursos visuales funcionan sin conexión a internet.

Si no arranca, revisar la terminal. `EADDRINUSE` significa que el puerto está ocupado, normalmente porque ya hay un servidor abierto. Si aparece una versión de Node incompatible, instalar Node.js 24. No borrar la base para repetir una demostración.

## Guion de ocho minutos

| Tiempo | Mostrar | Explicar con tus palabras |
|---|---|---|
| 0:00–1:00 | Acceso y resumen | Problema del taller, alcance y cinco pasos |
| 1:00–2:00 | Carpetas y diagrama | Qué hace cada capa y cómo viaja una solicitud |
| 2:00–6:00 | Formularios | Crear datos, diagnosticar, autorizar, reparar e historial |
| 6:00–7:00 | Pruebas, contrato y GitHub | Evidencia funcional, permisos e integridad |
| 7:00–8:00 | Bitácora y pendientes | Qué se implementó y qué falta validar |

Inicio posible: «MecaGest organiza el seguimiento de un vehículo dentro de un taller. Registramos quién lo recibe, qué se diagnostica, qué autoriza el cliente y qué trabajo se realiza. Esta versión implementa los cinco flujos definidos en nuestros avances».

## Recorrido por la app

Usar `admin`: representa al encargado y puede recorrer todos los pasos. Los otros roles tienen permisos más limitados; no existe un selector que cambie tu rol sin iniciar sesión.

1. **Clientes:** crear un cliente ficticio llamado `Cliente demostración`. Usar datos de contacto ficticios.
2. **Vehículos:** asociarle la placa `DEM0026`, marca `Toyota`, modelo `Corolla`. Si esa placa ya existe, elegir una nueva.
3. **Órdenes:** crear una orden para ese vehículo, seleccionar `mecanico` como responsable y escribir `Ruido al frenar` como motivo.
4. **Diagnóstico:** abrir la orden, escribir `Desgaste de pastillas delanteras; se propone reemplazo y prueba de frenado` y marcarlo completo. Explicar que ahora espera autorización.
5. **Autorización:** registrar aceptación y una constancia ficticia: `Cliente de demostración acepta el cambio de pastillas`. El encargado registra la decisión; el cliente no tiene cuenta en esta versión.
6. **Reparación:** iniciar, añadir `Se retiraron las pastillas desgastadas` y finalizar con `Pastillas reemplazadas y prueba de frenado realizada`. Si queda tiempo, demostrar una incidencia y su reanudación antes del cierre.
7. **Historial:** buscar la placa y mostrar diagnóstico, autorización y actividades. Recargar la página para mostrar que los datos se conservan.

Frase para explicar una regla: «El servidor no permite iniciar la reparación sin aprobación. Ocultar el botón ayuda al usuario, pero el permiso también se verifica en el servicio de aplicación».

Para mostrar roles, cerrar sesión y entrar como `recepcion`: puede registrar ingresos, pero no diagnosticar ni autorizar. El mecánico puede trabajar únicamente las órdenes asignadas. No proyectar contraseñas al cambiar de sesión.

## Explicar el código sin memorizarlo

Seguir una solicitud:

1. `src/presentation/web/app.js` envía los datos del formulario a `/api/`.
2. `src/presentation/app.ts` recibe HTTP, identifica la sesión y llama al servicio.
3. `src/application/order-service.ts` comprueba rol, entradas y estado.
4. `src/persistence/workshop-repository.ts` lee o escribe SQL en una transacción.
5. La respuesta vuelve al navegador y se actualiza la pantalla.

«Es un monolito porque se ejecuta como una sola aplicación. Está dividido en capas para que la interfaz no ejecute SQL y para que las reglas del taller se mantengan en los servicios».

## Evidencia para mostrar

- `npm run check`: tipos, sintaxis, 42 pruebas de backend/contrato y compilación.
- `npm run test:e2e`: 14 pruebas de navegador, siete escenarios en dos tamaños. Instalar antes Chromium con `npx playwright install chromium`.
- QA-02: 20 intentos de autorización prohibidos fueron rechazados.
- QA-03: 30 fallos SQL provocados comprobaron rollback, sin cambios parciales. No son pruebas de cortes eléctricos.
- `/docs/`: Swagger presenta las 17 operaciones de `docs/openapi.yaml`.
- GitHub y `docs/bitacora.md`: cambios concretos y resultados. La cantidad de commits no demuestra autoría ni calidad por sí sola.

Las pruebas pueden quedar ejecutadas antes de exponer. Si el profesor quiere repetirlas, usan bases aisladas y no modifican los datos de la demostración.

## Preguntas para practicar

| Pregunta | Idea para responder |
|---|---|
| ¿Esto es una app? | Sí, una aplicación web: interfaz en navegador, servidor y base de datos. |
| ¿GitHub es donde se usa? | GitHub guarda el código. Esta entrega se ejecuta localmente con Node.js. |
| ¿Por qué SQLite? | Permite SQL, relaciones y transacciones sin instalar otro servicio. La consigna admite equivalentes. |
| ¿Qué pasa si falla el guardado? | La transacción revierte las escrituras; las pruebas comparan la orden antes y después. |
| ¿Cómo validan OpenAPI? | Contrastamos las rutas y respuestas reales con el contrato versionado. |
| ¿Por qué el mecánico no autoriza? | Se separa el trabajo técnico del registro de la decisión del cliente; es un reparto propuesto que debe validarse con el taller. |
| ¿Todo está validado? | Los flujos y controles técnicos tienen pruebas; carga, cinco participantes, ocho horas de disponibilidad y cambio cronometrado siguen pendientes. |
| ¿Se usó IA? | Sí, como asistencia de implementación y documentación. Debemos comprender y revisar lo entregado. |

Cierre posible: «La aplicación permite completar el servicio y conservar su historial. Hemos verificado los flujos, los permisos y la integridad con pruebas automatizadas. Queda validar los supuestos con un taller y medir los escenarios de calidad pendientes».

## Entrega en Moodle

Completar integrantes/paralelo y sustituir el marcador del commit por la salida de `git rev-parse HEAD` de la versión publicada. Confirmar su resultado en GitHub Actions. El envío en Moodle lo realiza el equipo.

```text
MecaGest - Criterio 2 del RdA1, semana 5
Repositorio: https://github.com/MathiasVinces/MecaGest
Rama: codex/criterio-2
Commit: [SHA de la versión publicada y verificada]
Requisitos: Node.js 24.x y npm
Instalar: npm ci
Preparar usuarios: npm run seed
Compilar: npm run build
Arrancar: npm start
Aplicación local: http://127.0.0.1:3000/
Credenciales de cada instalación: npm run credenciales
Pruebas: npm run check
Navegador: npx playwright install chromium && npm run test:e2e
Contrato/Swagger: http://127.0.0.1:3000/docs/
Guía: docs/guia-presentacion.md
Integrantes y paralelo: [completar por el equipo]
```

No adjuntar `.local`, bases con datos personales ni contraseñas. Al instalar, cada evaluador genera sus propias credenciales con `seed`.
