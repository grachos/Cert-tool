import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from './src/db';

const standardsData = [
  {
    id: 'BASC',
    name: 'BASC',
    fullName: 'Business Alliance for Secure Commerce',
    description: 'Sistema de Gestión en Control y Seguridad',
    color: '#0f172a',
    icon: 'BASC',
    requirements: [
      { clause: '1.0', title: 'Requisitos Generales', description: 'Contexto de la empresa y gestión del riesgo', status: 'COMPLIANT', evidenceCount: 5 },
      { clause: '2.0', title: 'Liderazgo y Compromiso', description: 'Política de seguridad y responsabilidades', status: 'COMPLIANT', evidenceCount: 3 },
      { clause: '3.0', title: 'Asociados de Negocio', description: 'Control de clientes y proveedores', status: 'PARTIAL', evidenceCount: 12 },
      { clause: '4.0', title: 'Seguridad del Personal', description: 'Selección, contratación y retiro', status: 'COMPLIANT', evidenceCount: 8 },
      { clause: '5.0', title: 'Seguridad Física', description: 'Control de accesos y seguridad de instalaciones', status: 'NON_COMPLIANT', evidenceCount: 2 }
    ]
  },
  {
    id: 'ISO9001',
    name: 'ISO 9001',
    fullName: 'Sistemas de Gestión de la Calidad',
    description: 'Estándar internacional para la gestión de la calidad',
    color: '#2563eb',
    icon: '9001',
    requirements: [
      { clause: '4.0', title: 'Contexto de la Organización', description: 'Comprensión de la organización y su contexto', status: 'COMPLIANT', evidenceCount: 4 },
      { clause: '5.0', title: 'Liderazgo', description: 'Liderazgo y compromiso, política de calidad', status: 'COMPLIANT', evidenceCount: 3 },
      { clause: '6.0', title: 'Planificación', description: 'Acciones para abordar riesgos y oportunidades', status: 'PARTIAL', evidenceCount: 5 },
      { clause: '7.0', title: 'Apoyo', description: 'Recursos, competencia, toma de conciencia', status: 'COMPLIANT', evidenceCount: 15 },
      { clause: '8.0', title: 'Operación', description: 'Planificación y control operacional', status: 'PENDING', evidenceCount: 0 }
    ]
  },
  {
    id: 'ISO14001',
    name: 'ISO 14001',
    fullName: 'Gestión Ambiental',
    description: 'Sistemas de gestión ambiental',
    color: '#16a34a',
    icon: '14001',
    requirements: [
      { clause: '4.0', title: 'Contexto de la Organización', description: 'Comprensión de la organización y su contexto', status: 'COMPLIANT', evidenceCount: 4 },
      { clause: '5.0', title: 'Liderazgo', description: 'Política ambiental y roles', status: 'COMPLIANT', evidenceCount: 2 },
      { clause: '6.0', title: 'Planificación', description: 'Aspectos ambientales y requisitos legales', status: 'COMPLIANT', evidenceCount: 8 },
      { clause: '7.0', title: 'Apoyo', description: 'Recursos y comunicación', status: 'COMPLIANT', evidenceCount: 6 },
      { clause: '8.0', title: 'Operación', description: 'Control operacional y preparación ante emergencias', status: 'COMPLIANT', evidenceCount: 10 }
    ]
  },
  {
    id: 'ISO45001',
    name: 'ISO 45001',
    fullName: 'Seguridad y Salud en el Trabajo',
    description: 'Sistemas de gestión de la seguridad y salud en el trabajo',
    color: '#d97706',
    icon: '45001',
    requirements: [
      { clause: '4.0', title: 'Contexto', description: 'Contexto de la organización y partes interesadas', status: 'COMPLIANT', evidenceCount: 3 },
      { clause: '5.0', title: 'Liderazgo', description: 'Participación de los trabajadores', status: 'COMPLIANT', evidenceCount: 5 },
      { clause: '6.0', title: 'Planificación', description: 'Identificación de peligros y evaluación de riesgos', status: 'PARTIAL', evidenceCount: 12 },
      { clause: '7.0', title: 'Apoyo', description: 'Competencia y toma de conciencia', status: 'COMPLIANT', evidenceCount: 8 },
      { clause: '8.0', title: 'Operación', description: 'Preparación y respuesta ante emergencias', status: 'NON_COMPLIANT', evidenceCount: 1 }
    ]
  },
  {
    id: 'SAGRILAFT',
    name: 'SAGRILAFT',
    fullName: 'Sistema de Autocontrol y Gestión del Riesgo',
    description: 'Prevención de lavado de activos y financiación del terrorismo',
    color: '#dc2626',
    icon: 'SLAF',
    requirements: [
      { clause: '1.0', title: 'Diseño y Aprobación', description: 'Aprobación del sistema por junta directiva', status: 'COMPLIANT', evidenceCount: 2 },
      { clause: '2.0', title: 'Oficial de Cumplimiento', description: 'Designación y funciones', status: 'COMPLIANT', evidenceCount: 3 },
      { clause: '3.0', title: 'Identificación de Riesgos', description: 'Metodología de segmentación', status: 'COMPLIANT', evidenceCount: 5 },
      { clause: '4.0', title: 'Debida Diligencia', description: 'Conocimiento de contrapartes', status: 'PARTIAL', evidenceCount: 20 },
      { clause: '5.0', title: 'Reportes', description: 'Reportes a la UIAF', status: 'COMPLIANT', evidenceCount: 4 }
    ]
  },
  {
    id: 'PESV',
    name: 'PESV',
    fullName: 'Plan Estratégico de Seguridad Vial',
    description: 'Gestión de riesgos en seguridad vial',
    color: '#0891b2',
    icon: 'PESV',
    requirements: [
      { clause: 'Fase 1', title: 'Planificación', description: 'Comité de seguridad vial y política', status: 'COMPLIANT', evidenceCount: 4 },
      { clause: 'Fase 2', title: 'Implementación', description: 'Programas de gestión de riesgos', status: 'PARTIAL', evidenceCount: 7 },
      { clause: 'Fase 3', title: 'Seguimiento', description: 'Indicadores de desempeño', status: 'PENDING', evidenceCount: 0 },
      { clause: 'Vehículos', title: 'Mantenimiento', description: 'Plan de mantenimiento preventivo', status: 'COMPLIANT', evidenceCount: 15 },
      { clause: 'Conductores', title: 'Idoneidad', description: 'Pruebas y capacitación', status: 'COMPLIANT', evidenceCount: 10 }
    ]
  },
  {
    id: 'RSPO',
    name: 'RSPO',
    fullName: 'Roundtable on Sustainable Palm Oil',
    description: 'Cadena de suministro responsable',
    color: '#65a30d',
    icon: 'RSPO',
    requirements: [
      { clause: '1.0', title: 'Transparencia', description: 'Compromiso con la transparencia', status: 'COMPLIANT', evidenceCount: 2 },
      { clause: '2.0', title: 'Leyes y Regulaciones', description: 'Cumplimiento de leyes aplicables', status: 'COMPLIANT', evidenceCount: 5 },
      { clause: '3.0', title: 'Viabilidad Económica', description: 'Plan de viabilidad a largo plazo', status: 'PENDING', evidenceCount: 0 },
      { clause: '4.0', title: 'Mejores Prácticas', description: 'Prácticas agrícolas y de molienda', status: 'PARTIAL', evidenceCount: 3 },
      { clause: '5.0', title: 'Responsabilidad Ambiental', description: 'Conservación de recursos naturales', status: 'COMPLIANT', evidenceCount: 6 }
    ]
  }
];

async function main() {
  // 1. Crear Admin por Defecto
  const adminEmail = 'admin@cert-techcol.com';
  const [userRows] = await db.query('SELECT * FROM User WHERE email = ?', [adminEmail]);
  const adminUser = (userRows as any[])[0];

  if (!adminUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    const adminId = uuidv4();

    await db.query(
      'INSERT INTO User (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
      [adminId, adminEmail, hashedPassword, 'Administrador Principal', 'ADMIN']
    );
    console.log('✅ Default Admin created: admin@cert-techcol.com / admin123');
  } else {
    console.log('ℹ️ Default Admin already exists.');
  }

  // 2. Sembrar Standards y Requirements
  for (const std of standardsData) {
    const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [std.id]);
    const existingStd = (stdRows as any[])[0];

    if (!existingStd) {
      await db.query(
        'INSERT INTO Standard (id, name, fullName, description, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
        [std.id, std.name, std.fullName, std.description, std.color, std.icon]
      );

      // Insert requirements
      for (const req of std.requirements) {
        const reqId = uuidv4();
        await db.query(
          'INSERT INTO Requirement (id, clause, title, description, status, evidenceCount, standardId) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [reqId, req.clause, req.title, req.description, req.status, req.evidenceCount, std.id]
        );
      }

      console.log(`✅ Standard ${std.id} y sus requisitos sembrados.`);
    } else {
      console.log(`ℹ️ Standard ${std.id} ya existe.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
