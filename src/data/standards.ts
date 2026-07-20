import type { Standard } from '../types';

export const standards: Standard[] = [
  {
    id: 'BASC',
    name: 'BASC',
    fullName: 'Business Alliance for Secure Commerce',
    description: 'Sistema de Gestión en Control y Seguridad',
    color: '#0f172a',
    icon: 'BASC', // Text instead of emoji
    requirements: [
      { id: 'b1', clause: '1.0', title: 'Requisitos Generales', description: 'Contexto de la empresa y gestión del riesgo', status: 'compliant', evidenceCount: 5 },
      { id: 'b2', clause: '2.0', title: 'Liderazgo y Compromiso', description: 'Política de seguridad y responsabilidades', status: 'compliant', evidenceCount: 3 },
      { id: 'b3', clause: '3.0', title: 'Asociados de Negocio', description: 'Control de clientes y proveedores', status: 'partial', evidenceCount: 12 },
      { id: 'b4', clause: '4.0', title: 'Seguridad del Personal', description: 'Selección, contratación y retiro', status: 'compliant', evidenceCount: 8 },
      { id: 'b5', clause: '5.0', title: 'Seguridad Física', description: 'Control de accesos y seguridad de instalaciones', status: 'non-compliant', evidenceCount: 2 }
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
      { id: 'q1', clause: '4.0', title: 'Contexto de la Organización', description: 'Comprensión de la organización y su contexto', status: 'compliant', evidenceCount: 4 },
      { id: 'q2', clause: '5.0', title: 'Liderazgo', description: 'Liderazgo y compromiso, política de calidad', status: 'compliant', evidenceCount: 3 },
      { id: 'q3', clause: '6.0', title: 'Planificación', description: 'Acciones para abordar riesgos y oportunidades', status: 'partial', evidenceCount: 5 },
      { id: 'q4', clause: '7.0', title: 'Apoyo', description: 'Recursos, competencia, toma de conciencia', status: 'compliant', evidenceCount: 15 },
      { id: 'q5', clause: '8.0', title: 'Operación', description: 'Planificación y control operacional', status: 'pending', evidenceCount: 0 }
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
      { id: 'e1', clause: '4.0', title: 'Contexto de la Organización', description: 'Comprensión de la organización y su contexto', status: 'compliant', evidenceCount: 4 },
      { id: 'e2', clause: '5.0', title: 'Liderazgo', description: 'Política ambiental y roles', status: 'compliant', evidenceCount: 2 },
      { id: 'e3', clause: '6.0', title: 'Planificación', description: 'Aspectos ambientales y requisitos legales', status: 'compliant', evidenceCount: 8 },
      { id: 'e4', clause: '7.0', title: 'Apoyo', description: 'Recursos y comunicación', status: 'compliant', evidenceCount: 6 },
      { id: 'e5', clause: '8.0', title: 'Operación', description: 'Control operacional y preparación ante emergencias', status: 'compliant', evidenceCount: 10 }
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
      { id: 'o1', clause: '4.0', title: 'Contexto', description: 'Contexto de la organización y partes interesadas', status: 'compliant', evidenceCount: 3 },
      { id: 'o2', clause: '5.0', title: 'Liderazgo', description: 'Participación de los trabajadores', status: 'compliant', evidenceCount: 5 },
      { id: 'o3', clause: '6.0', title: 'Planificación', description: 'Identificación de peligros y evaluación de riesgos', status: 'partial', evidenceCount: 12 },
      { id: 'o4', clause: '7.0', title: 'Apoyo', description: 'Competencia y toma de conciencia', status: 'compliant', evidenceCount: 8 },
      { id: 'o5', clause: '8.0', title: 'Operación', description: 'Preparación y respuesta ante emergencias', status: 'non-compliant', evidenceCount: 1 }
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
      { id: 's1', clause: '1.0', title: 'Diseño y Aprobación', description: 'Aprobación del sistema por junta directiva', status: 'compliant', evidenceCount: 2 },
      { id: 's2', clause: '2.0', title: 'Oficial de Cumplimiento', description: 'Designación y funciones', status: 'compliant', evidenceCount: 3 },
      { id: 's3', clause: '3.0', title: 'Identificación de Riesgos', description: 'Metodología de segmentación', status: 'compliant', evidenceCount: 5 },
      { id: 's4', clause: '4.0', title: 'Debida Diligencia', description: 'Conocimiento de contrapartes', status: 'partial', evidenceCount: 20 },
      { id: 's5', clause: '5.0', title: 'Reportes', description: 'Reportes a la UIAF', status: 'compliant', evidenceCount: 4 }
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
      { id: 'p1', clause: 'Fase 1', title: 'Planificación', description: 'Comité de seguridad vial y política', status: 'compliant', evidenceCount: 4 },
      { id: 'p2', clause: 'Fase 2', title: 'Implementación', description: 'Programas de gestión de riesgos', status: 'partial', evidenceCount: 7 },
      { id: 'p3', clause: 'Fase 3', title: 'Seguimiento', description: 'Indicadores de desempeño', status: 'pending', evidenceCount: 0 },
      { id: 'p4', clause: 'Vehículos', title: 'Mantenimiento', description: 'Plan de mantenimiento preventivo', status: 'compliant', evidenceCount: 15 },
      { id: 'p5', clause: 'Conductores', title: 'Idoneidad', description: 'Pruebas y capacitación', status: 'compliant', evidenceCount: 10 }
    ]
  },
  {
    id: 'RSPO',
    name: 'RSPO P&C 2024',
    fullName: 'RSPO Principles & Criteria 2024',
    description: 'Aceite de palma sostenible — Principios y Criterios RSPO 2024 (7 Principios, 162 Indicadores)',
    color: '#65a30d',
    icon: 'RSPO',
    requirements: [
      { id: 'r1', clause: '1.1.1', title: 'Politica de divulgacion publica', description: 'La UoC cuenta con una politica de transparencia y divulgacion publica aprobada por la alta direccion.', status: 'compliant', evidenceCount: 2 },
      { id: 'r2', clause: '2.1.1', title: 'Cumplimiento legal', description: 'Se identifican y cumplen todas las leyes, regulaciones y requisitos aplicables.', status: 'compliant', evidenceCount: 5 },
      { id: 'r3', clause: '3.1.1', title: 'Plan de negocios', description: 'Existe un plan de negocios o de gestion a mediano/largo plazo.', status: 'compliant', evidenceCount: 1 },
      { id: 'r4', clause: '4.1.1', title: 'Evaluacion de impacto social', description: 'Se realiza una evaluacion de impacto social y de derechos humanos.', status: 'partial', evidenceCount: 3 },
      { id: 'r5', clause: '5.1.1', title: 'Apoyo a pequenos productores', description: 'Existen procesos para conducta justa y transparente con pequenos productores.', status: 'pending', evidenceCount: 0 },
      { id: 'r6', clause: '6.1.1', title: 'Politica de no discriminacion', description: 'Existe politica de no discriminacion e igualdad de oportunidades.', status: 'compliant', evidenceCount: 4 },
      { id: 'r7', clause: '7.1.1', title: 'Plan MIP', description: 'Existe un plan de Manejo Integrado de Plagas.', status: 'compliant', evidenceCount: 6 }
    ]
  }
];
