# RSPO TECH — estado del backend e integraciones pendientes

## Implementado en este PR

- Autorización por UoC con `UserCertificationUnit`: administradores con alcance global y demás roles limitados a sus asignaciones.
- UoC reales desde backend; `localStorage` conserva únicamente la selección.
- Migración incremental `server/migrations/001_rspo_tech_core.sql`.
- Supply Base persistente (`SupplySource`, `FarmPlot`) con riesgo, elegibilidad, certificación, áreas y referencia de polígono.
- Cumplimiento de plantaciones persistente (`FarmPlot`, `PlantationActivity`) para BPA, mantenimiento, sanidad, insumos, visitas, documentos y evaluaciones.
- Recepción RFF real (`RffDelivery`) con cálculo de báscula, alertas de elegibilidad, sobreproducción, duplicidad e incompatibilidad de certificación, y asiento relacionado en SCC.
- Preparación interna PRISMA (`PrismaOperation`, `PrismaAdjustment`, `PrismaAttachment`) con trazabilidad de cambios.
- Evidencias ampliadas y aisladas por UoC; carga y descarga autenticadas, límite de tamaño y lista de tipos permitidos.
- Planes de acción con brecha, corrección inmediata, causa raíz, acción correctiva, eficacia y fecha de cierre.
- `VITE_API_URL`, CORS por entorno, secreto JWT obligatorio y respuestas internas de error no expuestas.

## Endpoints RSPO

- `GET|POST|PUT /api/rspo/supply-sources`
- `GET|POST /api/rspo/farm-plots`
- `GET|POST /api/rspo/plantation-activities`
- `GET|POST|PUT /api/rspo/deliveries`
- `GET /api/rspo/traceability-alerts`
- `GET|POST|PUT /api/rspo/prisma-operations`
- `GET /api/scc/uocs`
- `GET|POST /api/scc/transactions`
- `GET /api/scc/dashboard`
- `GET|POST /api/evidence`
- `POST /api/upload` y `GET /api/files/:filename`

Todos los endpoints operativos anteriores requieren JWT; los asociados con UoC validan además la asignación en el servidor.

## Dependencias externas pendientes

- **RSPO PRISMA oficial:** la aplicación no simula conexión. Se necesitan contrato, credenciales de servicio, especificación y ambiente autorizado por RSPO para importar/conciliar directamente.
- **Cartografía/SIG:** se persiste la referencia del polígono y su estado. Un mapa geoespacial completo requiere definir proveedor, formato y controles de precisión.
- **Análisis de evidencias:** requiere `GEMINI_API_KEY`. Sin ella el documento conserva `PENDING_REVIEW`; no se genera una aprobación ficticia.
- **Almacenamiento productivo:** los archivos están protegidos localmente. Para alta disponibilidad conviene un almacén de objetos privado con URLs firmadas y política de retención.

## Validación adicional recomendada antes de producción

- Ejecutar pruebas de integración contra una copia anonimizada de MySQL con la migración aplicada.
- Validar permisos con usuarios reales de cada rol y UoC.
- Realizar prueba de carga, respaldo/restauración, análisis de dependencias y revisión de seguridad.
- Confirmar las reglas de negocio de elegibilidad y tolerancia de producción con el responsable RSPO.
