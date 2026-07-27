# RSPO TECH

Plataforma operativa para gestionar unidades de certificación (UoC), cumplimiento RSPO P&C, cadena de suministro, trazabilidad de RFF, balance SCC, evidencias, planes de acción y preparación interna de operaciones PRISMA.

## Puesta en marcha

Requisitos: Node.js 20+, npm y MySQL 8.

1. Copie `.env.example` como `.env` y configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` y `VITE_API_URL`.
2. Instale dependencias con `npm install` y `npm install --prefix server`.
3. Cree la base inicial con `server/schema.sql`.
4. Aplique, en orden, los archivos de `server/migrations/`; la migración `001_rspo_tech_core.sql` es incremental y no elimina datos.
5. Inicie el backend con `npm run dev --prefix server`.
6. Inicie el frontend con `npm run dev`.

En producción, el backend no inicia sin `JWT_SECRET` ni `DATABASE_URL`. Los archivos admitidos son PDF, DOCX, JPEG, PNG, TXT y CSV; el límite se configura con `MAX_UPLOAD_MB`.

## Alcance por UoC y seguridad

- Cada usuario no administrador solo recibe las UoC asignadas en `UserCertificationUnit`.
- Las rutas operativas exigen una UoC seleccionada y validan su autorización en el servidor.
- Solo los administradores pueden usar la vista consolidada “Todas las UoC”.
- Evidencias y archivos se sirven mediante endpoints autenticados; `uploads/` no es público.
- Las contraseñas se almacenan con bcrypt y los JWT requieren un secreto explícito.
- CORS usa la lista de orígenes de `CORS_ORIGINS`.

## Módulos RSPO TECH

- Supply Base: fuentes, áreas, polígonos, riesgo, elegibilidad y certificación.
- P&C Plantaciones: fincas/lotes, BPA, mantenimiento, sanidad, insumos, visitas, documentos y evaluaciones.
- Trazabilidad RFF: báscula, pesos bruto/tara/neto, lotes, vehículo, origen, elegibilidad, producción estimada/acumulada y alertas.
- SCC: cada recepción RFF aceptada crea su transacción de entrada en el balance.
- PRISMA interno: anuncios, confirmaciones, remociones, ajustes, fechas límite y bitácora. No representa una integración oficial con RSPO PRISMA.
- Evidencias: metadatos por UoC, empresa, fuente, lote, requisito, indicador, responsable y observaciones.
- Planes de acción: brecha, causa raíz, corrección, eficacia y fecha real de cierre.

## Calidad

```powershell
npm run build
npm run typecheck --prefix server
npm test --prefix server
npm run lint
```

Las pruebas cubren los cálculos críticos de peso RFF y las reglas de alcance administrativo por UoC. Para una validación integrada se requiere una base MySQL preparada con el esquema y las migraciones.

## Brechas externas

- La integración oficial con RSPO PRISMA requiere credenciales, contrato de API y especificaciones del entorno RSPO.
- Los polígonos se almacenan como referencia; un visor SIG completo requiere un proveedor/cartografía acordados.
- El análisis asistido por IA solo se ejecuta con `GEMINI_API_KEY`; sin clave, la evidencia permanece pendiente de revisión y no se simula una aprobación.
