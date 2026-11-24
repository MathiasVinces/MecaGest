# Bitácora de incrementos

Fecha de esta sesión: **24 de noviembre de 2026 (America/Guayaquil)**.
Los commits corresponden a trabajo realizado en esta sesión; no representan días anteriores ni contribuciones de integrantes distintos.

## 01. Preparar el proyecto

- Drivers: separación en capas del Criterio 2; QA-06 (modificabilidad).
- Cambios: configuración de Node.js 24, TypeScript, scripts npm y exclusión de bases de datos y credenciales locales.
- Decisión: SQLite persistente en archivo permite instalar sin servicios externos. Conserva SQL, claves foráneas y transacciones; PostgreSQL figura como tecnología de referencia, no obligatoria, en la consigna.
- Verificación: Node.js 24.21.0 disponible; repositorio inicial sin código ni commits.
- Pendientes: implementar persistencia, cinco casos de uso, contrato y pruebas.
