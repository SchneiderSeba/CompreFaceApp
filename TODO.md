# TODO — Face Recognition Check-in

Documento de planificación para mejorar la aplicación de control de acceso facial.

## Estado actual

- [x] Frontend responsive para escritorio, tablets y celulares.
- [x] Captura desde cámara y carga de imágenes.
- [x] Reconocimiento facial mediante CompreFace.
- [x] Login administrativo protegido por sesión/cookie.
- [x] Alta y edición básica de empleados.
- [x] Registro de check-ins.
- [x] Dashboard administrativo inicial con métricas.
- [x] Persistencia PostgreSQL en Railway.
- [x] Health checks de backend, base de datos y CompreFace.
- [x] Resolver completamente la asociación entre sujetos antiguos de CompreFace y empleados actuales mediante diagnóstico y reasignación explícita.
- [x] Añadir pruebas de integración contra PostgreSQL y CompreFace de producción (opt-in, sin modificar datos).

## Prioridad P0 — estabilidad y datos

- [x] Crear una migración explícita de sujetos faciales legacy y reasignarlos desde `/admin`.
- [x] Añadir una pantalla de diagnóstico que muestra empleado, `compreface_subject`, `image_id` y estado de sincronización.
- [x] Implementar transacciones y compensación cuando falla la creación de PostgreSQL o la limpieza de CompreFace.
- [x] Añadir idempotencia para altas y check-ins para evitar duplicados por reintentos.
- [x] Documentar backups y restauración de PostgreSQL. La activación del plan de backups de Railway queda como configuración operativa de la cuenta.
- [x] Añadir migraciones versionadas de esquema mediante `migration_history`.
- [x] Añadir y probar renovación de sesiones administrativas.

## Prioridad P1 — experiencia de check-in

- [ ] Mejorar el flujo de estados: cámara lista, procesando, rostro detectado, coincidencia, no coincidencia y error.
- [ ] Mostrar un mensaje accionable cuando CompreFace reconoce una cara sin empleado vinculado.
- [ ] Evitar que el usuario pueda iniciar varios reconocimientos simultáneos.
- [ ] Añadir reintento controlado ante errores temporales de red o CompreFace.
- [ ] Configurar umbral de similitud desde administración y mostrar el motivo de rechazo.
- [ ] Añadir soporte para seleccionar cámara frontal/trasera en celulares y tablets.
- [ ] Mejorar accesibilidad: foco visible, navegación con teclado, labels, contraste y mensajes para lectores de pantalla.
- [ ] Añadir modo kiosco/pantalla completa y reinicio automático después de un check-in.
- [ ] Mostrar fecha, hora y zona horaria del check-in de forma consistente.
- [ ] Añadir internacionalización (español/inglés) y formatos regionales configurables.

## Prioridad P1 — administración de empleados

- [ ] Completar la tabla con búsqueda, filtros, ordenamiento y paginación.
- [ ] Modal de empleado con edición completa y validación en tiempo real.
- [ ] Permitir reemplazar/eliminar una foto facial y volver a registrar el sujeto.
- [ ] Añadir baja lógica/reactivación de empleados, conservando el historial.
- [ ] Importar empleados desde CSV/XLSX con vista previa y validación de duplicados.
- [ ] Exportar empleados y check-ins a CSV/PDF.
- [ ] Añadir auditoría: quién creó, editó o desactivó cada empleado y cuándo.
- [ ] Añadir roles y permisos futuros (administrador, supervisor, solo lectura).
- [ ] Confirmaciones explícitas y protección contra eliminación accidental.

## Prioridad P1 — dashboard y reportes

- [x] Gráficos y agregaciones por día, semana, mes y rango personalizado.
- [x] Métricas de primeros ingresos, retrasos, ausencias y empleados activos.
- [x] Filtros por empleado, legajo indirectamente mediante empleado y rango de fechas.
- [x] Vista paginada de cada check-in con similitud y probabilidad de detección; la imagen biométrica queda protegida en CompreFace y no se duplica en PostgreSQL.
- [x] Reporte diario descargable en CSV; el envío programado por correo queda preparado para conectar un proveedor SMTP/transactional.
- [x] Paginación server-side para historiales grandes.

## Prioridad P1 — seguridad y privacidad

- [ ] Aplicar rate limiting por IP y por usuario en login, captura y reconocimiento.
- [ ] Añadir CSRF protection si se mantienen cookies de sesión.
- [ ] Rotar `SESSION_SECRET` y documentar gestión de secretos en Railway.
- [ ] No registrar imágenes, tokens ni credenciales en logs.
- [ ] Cifrar o restringir el acceso a imágenes temporales y limpiar archivos con TTL.
- [ ] Definir retención y borrado de datos biométricos conforme a la normativa aplicable.
- [ ] Registrar consentimiento, finalidad y fecha de alta del empleado cuando corresponda.
- [ ] Añadir Content Security Policy, cabeceras de seguridad y auditoría de CORS.
- [ ] Revisar permisos de PostgreSQL con un usuario de aplicación de privilegios mínimos.

## Prioridad P2 — infraestructura y operación

- [ ] Añadir despliegues separados para staging y producción.
- [ ] Configurar healthcheck de Railway para impedir despliegues rotos.
- [ ] Añadir logs estructurados con request ID y duración de llamadas a CompreFace.
- [ ] Añadir monitoreo, alertas y métricas de latencia/error.
- [ ] Configurar límites de CPU, memoria y pool de conexiones PostgreSQL.
- [ ] Documentar procedimiento de rollback y recuperación ante caída de CompreFace.
- [ ] Añadir Dockerfile reproducible para backend y configuración de desarrollo local.
- [ ] Automatizar CI: lint, tests, build frontend, pruebas de seguridad y migraciones.
- [ ] Añadir pruebas de carga para múltiples tablets haciendo check-in al mismo tiempo.

## Prioridad P2 — calidad de código

- [x] Separar validadores y acceso a errores HTTP en módulos independientes; las rutas y repositorios existentes quedan aislados por sus adaptadores.
- [x] Sustituir errores nuevos por códigos centralizados y respuestas consistentes (`src/http-errors.js`).
- [x] Añadir validación compartida de entradas en los límites de la API (`src/validators.js`).
- [x] Mantener tipadas las respuestas principales del frontend y documentar el contrato backend.
- [x] Documentar la API con OpenAPI en `openapi.yaml`.
- [x] Añadir cobertura de tests para autenticación, reasignación facial, duplicados/idempotencia y errores de CompreFace.
- [x] Añadir smoke tests de integración opt-in para login/health y flujo de producción.
- [x] Eliminar `index2.js`, código experimental no utilizado, y añadir `npm run check` para revisar sintaxis.

## Ideas de producto futuras

- [ ] Multiempresa o múltiples sedes, con aislamiento de datos por organización.
- [ ] Turnos, horarios y reglas de tolerancia.
- [ ] Notificaciones ante entradas fuera de horario.
- [ ] Integración con sistemas de RR. HH. o lectores de tarjetas.
- [ ] Aplicación PWA instalable con funcionamiento degradado sin conexión.
- [ ] Webhooks para enviar eventos de check-in a otros sistemas.
- [ ] Detección de vida anti-spoofing y políticas contra fotografías/pantallas.
- [ ] Comparación de modelos de reconocimiento y configuración por sede.

## Orden recomendado de ejecución

1. Corregir la vinculación de sujetos legacy y añadir diagnóstico de sincronización.
2. Añadir pruebas de integración y E2E del flujo completo de check-in.
3. Implementar backups, migraciones versionadas y auditoría.
4. Completar búsqueda, filtros, edición y baja de empleados.
5. Mejorar dashboard y exportación de reportes.
6. Endurecer seguridad, privacidad, observabilidad y CI/CD.
7. Incorporar funciones avanzadas de turnos, multiempresa y anti-spoofing.

