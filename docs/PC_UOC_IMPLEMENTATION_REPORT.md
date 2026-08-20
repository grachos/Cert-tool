# Informe de implementación — Cumplimiento P&C por UoC

Fecha de cierre: 29 de julio de 2026  
Rama: `feat/rspo-tech-integration`

## Resultado

El módulo **Cumplimiento P&C** quedó consolidado por Unidad de Certificación (UoC), sin duplicar la navegación y conservando los módulos operativos existentes. La interfaz mantiene el lenguaje visual de NexoPalma y organiza la operación en diez vistas:

1. Resumen ejecutivo.
2. Extractora.
3. Base de suministro.
4. Plantaciones.
5. Matriz P&C.
6. Evidencias.
7. Hallazgos y planes de acción.
8. Auditorías.
9. Revisión por la Dirección.
10. Reportes.

## Matriz normativa

- Matriz activa: **162 indicadores** de RSPO P&C 2024 v4.2.
- Indicadores críticos identificados: **105**.
- Todos los indicadores activos conservan versión, idioma y enlace a la fuente oficial.
- Los registros anteriores que no pertenecen a la matriz oficial se desactivan de manera no destructiva.
- El importador valida la versión y la cantidad esperada antes de modificar datos y utiliza una transacción.
- El texto oficial no se guarda en el repositorio. Para otra instalación se debe proporcionar una copia autorizada del PDF oficial:

```powershell
cd server
npm run import:rspo-pc -- "C:\ruta\al\documento-oficial.pdf"
```

## Cálculo de cumplimiento

- Los indicadores marcados como **No aplica** solo salen del denominador después de su aprobación.
- Un indicador crítico **no conforme** limita el resultado global a 49 %.
- Un indicador crítico **pendiente** limita el resultado global a 79 %.
- El resumen presenta estado por principio, críticos conformes, pendientes y no conformes, evidencias, hallazgos, acciones y alertas.

## Trazabilidad y controles

- Evaluación por indicador y UoC.
- Historial de cambios de evaluación.
- Evidencias vinculadas a requisito y UoC.
- Historial de creación y revisión de evidencias.
- Hallazgos, responsables, fechas y planes de acción.
- Auditorías vinculadas a UoC y estándar.
- Revisión por la Dirección con decisiones y seguimiento.
- Alertas filtradas por UoC.
- Permisos de operación y consulta reforzados por rol y UoC.
- Las antiguas rutas generales de mutación de cumplimiento quedaron restringidas a `SUPERADMIN`.

## Reportes

La vista de reportes genera archivos reales desde el backend:

- CSV.
- Excel XML compatible con `.xls`.
- PDF.

Se comprobó localmente la estructura de los tres archivos: CSV con datos, Excel XML válido y PDF con cabecera `%PDF-`.

## Datos de demostración

El comando siguiente crea datos identificados expresamente como demostración:

```powershell
cd server
npm run seed:pc-demo
```

La base local validada contiene 6 fuentes, 6 plantaciones, 12 evaluaciones y una revisión gerencial de demostración.

## Base de datos y respaldo

- Migración incremental e idempotente: `server/migrations/003_pc_uoc_compliance.sql`.
- No elimina registros existentes.
- Copia de seguridad previa a la migración:
  `C:\Users\vivia\Documents\Codex\backups\Cert-tool\before-pc-uoc-20260729-221618.sql`

## Pruebas realizadas

### Compilación y pruebas automáticas

- Frontend: compilación de producción correcta.
- Backend: TypeScript correcto.
- Pruebas: **22 en total; 17 aprobadas y 5 omitidas**.
- Las cinco pruebas omitidas requieren una base aislada mediante `TEST_DATABASE_URL`. No se afirmó que esos escenarios hubieran pasado.

### Base local

- Matriz activa: 162.
- Indicadores críticos: 105.
- Indicadores con fuente oficial: 162.
- Migración ejecutada dos veces para comprobar idempotencia.
- Operaciones de evaluación, revisión gerencial y edición de UoC comprobadas.
- Rutas API principales comprobadas con respuesta HTTP 200.

### Navegador y responsive

- Las diez vistas cargan sin pantalla en blanco ni mensaje de error.
- Consola final: 0 errores y 0 advertencias.
- Escritorio: 1440 × 1000.
- Tableta: 768 y 1024 px.
- Celular: 360 y 390 px.
- En 390 px: ancho de documento 384 px dentro de una ventana de 390 px; no hay desbordamiento horizontal global.

## Capturas

- [Vista de escritorio](screenshots/pc-uoc-desktop.png)
- [Vista móvil](screenshots/pc-uoc-mobile.png)

## Limitaciones honestas

- Las cinco pruebas de integración MySQL aisladas no se ejecutan sin `TEST_DATABASE_URL`.
- La importación normativa requiere que el responsable de la instalación suministre el PDF oficial autorizado.
- No se presentó como “IA” una validación determinística. La verificación de cierre de auditoría informa lo que realmente revisa el sistema.
