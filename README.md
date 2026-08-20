# RSPO TECH

Plataforma operativa para gestionar unidades de certificación (UoC), cumplimiento RSPO P&C, cadena de suministro, trazabilidad de RFF, balance SCC, evidencias, planes de acción y preparación interna de operaciones PRISMA.

## Puesta en marcha

Requisitos: Node.js 20+, npm y MySQL 8.

1. Copie `.env.example` como `.env` y configure `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` y `VITE_API_URL`.
2. Instale dependencias con `npm install` y `npm install --prefix server`.
3. Cree la base inicial con `mysql --database SU_BASE < server/schema.sql`.
4. Aplique, en orden, los archivos de `server/migrations/` con el cliente MySQL (procesa `DELIMITER`): primero `001_rspo_tech_core.sql` y después `002_producer_plantation_structure.sql`. Las migraciones consultan `information_schema`, son incrementales y no eliminan datos.
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

- Base de suministro: productores naturales o jurídicos, vínculo con la extractora, identificación, representante legal, autorización de datos, riesgo y elegibilidad.
- P&C Plantaciones: plantaciones vinculadas a cada productor, ubicación, coordenadas, un KML por plantación, trabajadores, residentes autorizados y lotes con control de áreas; además BPA, mantenimiento, sanidad, insumos, visitas, documentos y evaluaciones.
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

## Datos de prueba reproducibles

El seed solo acepta `TEST_DATABASE_URL`; nunca usa la base productiva. Los correos, nombres e identificadores están marcados como `TEST` y la contraseña se recibe por entorno para almacenarla únicamente como hash bcrypt.

```powershell
$env:TEST_DATABASE_URL="mysql://usuario:clave@localhost:3306/rspo_tech_test"
$env:TEST_SEED_PASSWORD=Read-Host "Contraseña temporal para usuarios TEST"
npm run test:seed --prefix server
npm run test:seed:count --prefix server
npm test --prefix server
npm run test:seed:clean --prefix server
```

El seed idempotente crea 2 UoC, 4 usuarios, 3 asignaciones, 6 fuentes, 2 predios, 2 actividades, 2 entregas RFF, 1 transacción SCC, 1 evidencia, 1 auditoría, 1 hallazgo, 1 plan, 1 operación PRISMA y 3 entradas de historial PRISMA. Puede cargarse varias veces sin duplicar identificadores.

Los usuarios existentes no se asignan automáticamente a todas las UoC, porque eso vulneraría el aislamiento. Después de aplicar la migración, un ADMIN debe abrir Usuarios → UoC y asignar el alcance de MANAGER, AUDITOR y USER antes de habilitarles el acceso operativo.

Las pruebas cubren los cálculos críticos de peso RFF y las reglas de alcance administrativo por UoC. Para una validación integrada se requiere una base MySQL preparada con el esquema y las migraciones.

## Brechas externas

- La integración oficial con RSPO PRISMA requiere credenciales, contrato de API y especificaciones del entorno RSPO.
- Los polígonos se almacenan como referencia; un visor SIG completo requiere un proveedor/cartografía acordados.
- El análisis asistido por IA solo se ejecuta con `GEMINI_API_KEY`; sin clave, la evidencia permanece pendiente de revisión y no se simula una aprobación.
