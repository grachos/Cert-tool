# RSPO TECH — brechas y propuesta de integración

## Funcionalidad reutilizada

- Autenticación JWT y roles `ADMIN`, `MANAGER`, `AUDITOR` y `USER`.
- Cumplimiento RSPO, documentos, evidencias, auditorías, hallazgos y planes de acción.
- Unidades de certificación y transacciones SCC para IP, SG, MB y BC.
- Dashboard, riesgos, alertas, usuarios y partes interesadas.

## Trazabilidad RFF

La vista usa `GET /api/scc/transactions?type=RECEPTION` y filtra producto `RFF`. Los campos disponibles son fecha, lote, contraparte/origen, referencia documental, volumen y modelo de suministro.

Faltan campos estructurados para vehículo, tiquete de báscula, peso bruto/tara/neto, predio y lote agrícola, elegibilidad a la fecha de recepción, condición certificada/convencional, producción estimada y alertas. Se propone:

1. Crear `SupplySource`, `FarmPlot`, `RffDelivery` y `TraceabilityAlert`.
2. Relacionar `RffDelivery` con `CertificationUnit`, fuente, predio y transacción SCC.
3. Agregar endpoints autenticados `/api/traceability/deliveries`, `/eligibility` y `/alerts`.
4. Calcular diferencias producción–entrega en backend y registrar el motivo de cada excepción.

## PRISMA by RSPO

No existe tabla ni endpoint PRISMA. La interfaz sólo presenta el esquema futuro y declara explícitamente que PRISMA es la plataforma oficial.

Se propone:

1. Crear `PrismaOperation`, `PrismaAdjustment` y `PrismaAttachment`.
2. Incluir referencia interna, producto, modelo, volumen, fecha física, fecha límite, estado y soporte.
3. Mantener auditoría inmutable de confirmaciones, removes y ajustes.
4. Implementar importación/conciliación únicamente mediante exportaciones o API autorizada por RSPO; no almacenar credenciales de PRISMA en el frontend.

## Evidencias, planes y hallazgos

Las funciones están conectadas a tablas y endpoints existentes. Para cubrir completamente el detalle solicitado, se recomienda agregar a `Evidence` empresa/plantación, requisito, indicador, responsable y vigencia; y asegurar migraciones versionadas para `ActionPlan` (`brecha`, `causaRaiz`, `correccion`, `eficacia`) que hoy aparecen en el controlador.

## Seguridad y operación

- Requerir `JWT_SECRET` en producción y eliminar el secreto de respaldo.
- Restringir CORS por entorno.
- Versionar migraciones MySQL y validar permisos por operación.
- Añadir pruebas de integración para autenticación, SCC, evidencias, hallazgos y planes de acción.
