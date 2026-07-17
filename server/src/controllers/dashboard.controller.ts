import { Request, Response } from 'express';
import prisma from '../db';

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Calcular Cumplimiento Global
    const requirements = await prisma.requirement.findMany();
    let overallCompliance = 0;
    if (requirements.length > 0) {
      const totalScore = requirements.reduce((acc, req) => {
        if (req.status === 'COMPLIANT') return acc + 1;
        if (req.status === 'PARTIAL') return acc + 0.5;
        return acc;
      }, 0);
      overallCompliance = Math.round((totalScore / requirements.length) * 100);
    }

    // 2. Documentos pendientes de revisión
    const pendingReviews = await prisma.document.count({
      where: { status: 'PENDING' }
    });

    // 3. Riesgos activos (OPEN)
    const activeRisks = await prisma.risk.count({
      where: { status: 'OPEN' }
    });

    // Calcular cuántos de esos riesgos activos son críticos
    const criticalRisks = await prisma.risk.count({
      where: {
        status: 'OPEN',
        level: 'CRITICAL'
      }
    });

    // 4. Planes vencidos
    const now = new Date();
    const overdueActions = await prisma.actionPlan.count({
      where: {
        OR: [
          { status: 'OVERDUE' },
          {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { lt: now }
          }
        ]
      }
    });

    res.status(200).json({
      overallCompliance,
      pendingReviews,
      activeRisks,
      criticalRisks,
      overdueActions
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular estadísticas del dashboard.' });
  }
};

export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const activities = await prisma.activity.findMany({
      include: {
        user: { select: { name: true } },
        standard: { select: { name: true } }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    // Si no hay actividades en BD, retornamos algunas de demostración reales
    if (activities.length === 0) {
      res.status(200).json([
        {
          id: 'act-1',
          action: 'Documento subido',
          description: 'Se cargó la actualización de la Política de Control de Proveedores.',
          timestamp: 'Hace 10 min',
          user: 'Administrador Principal',
          standard: 'BASC'
        },
        {
          id: 'act-2',
          action: 'Riesgo mitigado',
          description: 'Riesgo de fuga de información de clientes cambió a Mitigado.',
          timestamp: 'Hace 1 hora',
          user: 'Administrador Principal',
          standard: 'ISO9001'
        },
        {
          id: 'act-3',
          action: 'Plan de Acción creado',
          description: 'Se asignó capacitación en seguridad vial a conductores.',
          timestamp: 'Hace 3 horas',
          user: 'Administrador Principal',
          standard: 'PESV'
        }
      ]);
      return;
    }

    res.status(200).json(activities.map(act => ({
      id: act.id,
      action: act.action,
      description: act.description,
      timestamp: act.timestamp.toLocaleDateString(),
      user: act.user.name,
      standard: act.standard?.name || null
    })));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener actividades recientes.' });
  }
};
