import { v4 as uuidv4 } from 'uuid';
import db from './src/db';

const alerts = [
  { title: 'Auditoría RSPO programada', message: 'La auditoría de certificación RSPO P&C 2024 está programada para el 15 de agosto de 2026. Verificar todos los indicadores críticos.', type: 'critico', priority: 'critico', action: 'Revisar checklist pre-auditoría', module: 'RSPO' },
  { title: 'Evidencia pendiente de revisión', message: 'Hay 3 evidencias del Principio 6 (Derechos de Trabajadores) que requieren aprobación urgente.', type: 'alta', priority: 'alta', action: 'Ir a Gestión de Evidencias', module: 'Evidence' },
  { title: 'Indicador PC24-092 vence pronto', message: 'El cálculo de Salario Digno (6.3.1) debe actualizarse antes del 30 de julio de 2026.', type: 'alta', priority: 'alta', action: 'Actualizar cálculo salarial', module: 'RSPO' },
  { title: 'Balance SCC negativo detectado', message: 'El modelo Mass Balance (MB) para CPO muestra un balance negativo de -25 TM. Verificar transacciones.', type: 'critico', priority: 'critico', action: 'Revisar transacciones SCC', module: 'SCC' },
  { title: 'Próximo contacto con stakeholders', message: 'La Junta de Acción Comunal Vereda El Palmar tiene programado contacto para el 15 de agosto. Preparar informe de avance.', type: 'media', priority: 'media', action: 'Preparar informe comunitario', module: 'RSPO' },
  { title: 'Plan de acción vencido', message: 'El plan "Implementar procedimiento CLPI" (ACT-003) está vencido desde el 1 de julio de 2026.', type: 'alta', priority: 'alta', action: 'Ir a Planes de Acción', module: 'Automation' },
  { title: 'Nuevo requisito legal ambiental', message: 'La Corporación Autónoma Regional emitió nueva resolución sobre manejo de efluentes. Actualizar matriz legal.', type: 'media', priority: 'media', action: 'Actualizar matriz legal', module: 'Compliance' },
  { title: 'Certificado RSPO por vencer', message: 'El certificado RSPO de la UoC Extractora PalmCol vence en 60 días. Iniciar proceso de recertificación.', type: 'critico', priority: 'critico', action: 'Iniciar recertificación', module: 'RSPO' },
];

async function seedAlerts() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS Alert (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type ENUM('critico', 'alta', 'media', 'info') NOT NULL DEFAULT 'info',
      priority VARCHAR(50) DEFAULT 'media',
      action VARCHAR(255),
      module VARCHAR(50),
      dismissed TINYINT(1) DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [existing] = await db.query('SELECT COUNT(*) as cnt FROM Alert');
  if ((existing as any[])[0].cnt === 0) {
    for (const a of alerts) {
      const id = uuidv4();
      await db.query(
        'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
        [id, a.title, a.message, a.type, a.priority, a.action, a.module]
      );
    }
    console.log(`✅ ${alerts.length} alerts seeded`);
  } else {
    console.log('ℹ️ Alerts already exist');
  }
  await db.end();
}

seedAlerts().catch(e => { console.error(e); process.exit(1); });
