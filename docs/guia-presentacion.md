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

1. En **Taller**, pulsar **Recibir vehículo**.
2. Escribir `DEM0026`. Si no existe, completar marca `Toyota`, modelo `Corolla`, cliente `Cliente demostración` y teléfono ficticio `0000000000`. Para repetir, usar otra placa. Si el cliente ya existe, elegirlo en la lista.
3. Escribir `Ruido al frenar`, elegir `mecanico` y pulsar **Guardar ingreso**. Explicar que antes eran tres formularios separados y ahora se guardan juntos, sin perder los registros requeridos.
4. En **¿Qué necesita el vehículo?**, escribir `Pastillas delanteras desgastadas` y `Cambiar pastillas y comprobar frenado`. Dejar marcada la revisión terminada y pulsar **Guardar revisión**.
5. En **¿El cliente acepta el trabajo?**, marcar aceptación y escribir una constancia ficticia: `El cliente de demostración confirmó por teléfono que acepta el cambio`. Pulsar **Guardar decisión**. El encargado registra la decisión; el cliente no tiene cuenta en esta versión.
6. Pulsar **Iniciar reparación**. Describir la actividad, elegir si sigue en reparación, hay una demora o el trabajo está terminado, y guardar. Para cerrar: `Pastillas reemplazadas y prueba de frenado realizada`, opción **Trabajo terminado**.
7. Abrir **Ver lo registrado** para enseñar la revisión, el permiso y las actividades. Después, buscar la placa en **Historial**. Recargar la página para mostrar la conservación de los datos.


Frase para explicar una regla: «El servidor no permite iniciar la reparación sin aprobación. Ocultar el botón ayuda al usuario, pero el permiso también se verifica en el servicio de aplicación».

Para mostrar roles, cerrar sesión y entrar como `recepcion`: puede registrar ingresos, pero no diagnosticar ni autorizar. El mecánico puede trabajar únicamente las órdenes asignadas. No proyectar contraseñas al cambiar de sesión.

## Explicar el código sin memorizarlo

Seguir una solicitud de ingreso:

1. `src/presentation/web/app.js` envía los datos del formulario a `/api/`.
2. `src/presentation/app.ts` recibe HTTP, identifica la sesión y llama al servicio.
3. `src/application/order-service.ts` comprueba rol, entradas y estado.
4. `src/persistence/workshop-repository.ts` lee o escribe SQL en una transacción. El ingreso nuevo revierte cliente, vehículo y orden si falla alguno de los guardados.
5. La respuesta vuelve al navegador y se actualiza la pantalla.

«Es un monolito porque se ejecuta como una sola aplicación. Está dividido en capas para que la interfaz no ejecute SQL y para que las reglas del taller se mantengan en los servicios».

## Evidencia para mostrar

- `npm run check`: tipos, sintaxis, 47 pruebas de backend/contrato y compilación.
- `npm run test:e2e`: 20 pruebas de navegador, diez escenarios en dos tamaños. Instalar antes Chromium con `npx playwright install chromium`.
- QA-02: 20 intentos de autorización prohibidos fueron rechazados.
- QA-03: 30 fallos SQL provocados comprobaron rollback, sin cambios parciales. No son pruebas de cortes eléctricos.
- `/docs/`: Swagger presenta las 18 operaciones de `docs/openapi.yaml`.
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

## Explicar el rediseño

«Aplicamos 60–30–10 como guía: blanco para leer, azul oscuro para orientar y amarillo para destacar la acción principal. Pasamos de cinco opciones principales a Taller, Historial y Archivo. En lugar de entrar a tres catálogos, el ingreso reúne los datos en una ficha y reconoce las placas existentes. Cada trabajo muestra primero la acción que corresponde a su estado».

El tamaño base es 18 px en escritorio y 17 px en móvil, con controles amplios, texto además del color y foco visible para teclado. Esto busca facilitar el uso, pero no acredita que cualquier persona mayor pueda utilizarlo sin ayuda: sigue pendiente la evaluación con participantes de QA-04.
