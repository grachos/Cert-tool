import { Request, Response } from 'express';
import db from '../db';
import cache from '../cache';

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const uocId = typeof req.query.uocId === 'string' ? req.query.uocId : 'all';
    const cacheKey = `dashboard_stats_${uocId}`;
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      res.status(200).json(cachedStats);
      return;
    }

    // 1. Calcular Cumplimiento Global
    const [reqRows] = await db.query('SELECT status FROM Requirement');
    const requirements = reqRows as any[];
    let overallCompliance = 0;
    if (requirements.length > 0) {
      const totalScore = requirements.reduce((acc, r) => {
        if (r.status === 'COMPLIANT') return acc + 1;
        if (r.status === 'PARTIAL') return acc + 0.5;
        return acc;
      }, 0);
      overallCompliance = Math.round((totalScore / requirements.length) * 100);
    }

    // 2. Documentos pendientes de revisión
    const [pendingRows] = await db.query('SELECT COUNT(*) AS count FROM Document WHERE status = "PENDING"');
    const pendingReviews = (pendingRows as any[])[0]?.count || 0;

    // 3. Riesgos activos (OPEN)
    const [activeRiskRows] = await db.query('SELECT COUNT(*) AS count FROM Risk WHERE status = "OPEN"');
    const activeRisks = (activeRiskRows as any[])[0]?.count || 0;

    // Calcular cuántos de esos riesgos activos son críticos
    const [criticalRiskRows] = await db.query('SELECT COUNT(*) AS count FROM Risk WHERE status = "OPEN" AND level = "CRITICAL"');
    const criticalRisks = (criticalRiskRows as any[])[0]?.count || 0;

    // 4. Planes vencidos
    const actionScope = uocId === 'all' ? '' : ' AND uocId = ?';
    const actionParams = uocId === 'all' ? [] : [uocId];
    const [overdueRows] = await db.query(
      `SELECT COUNT(*) AS count FROM ActionPlan WHERE (status = "OVERDUE" OR (status IN ("PENDING", "IN_PROGRESS") AND dueDate < NOW()))${actionScope}`,
      actionParams
    );
    const overdueActions = (overdueRows as any[])[0]?.count || 0;

    // 5. No Conformidades abiertas / cerradas
    const [openFindingsRows] = await db.query('SELECT COUNT(*) AS count FROM NonConformance WHERE status != "CLOSED"');
    const openFindings = (openFindingsRows as any[])[0]?.count || 0;

    const [closedFindingsRows] = await db.query('SELECT COUNT(*) AS count FROM NonConformance WHERE status = "CLOSED"');
    const closedFindings = (closedFindingsRows as any[])[0]?.count || 0;

    // 6. Avance promedio de planes de acción
    const [avgProgressRows] = await db.query(`SELECT AVG(progress) AS avg FROM ActionPlan WHERE 1=1${actionScope}`, actionParams);
    const averagePlansProgress = Math.round(Number((avgProgressRows as any[])[0]?.avg || 0));

    const stats = {
      overallCompliance,
      pendingReviews,
      activeRisks,
      criticalRisks,
      overdueActions,
      openFindings,
      closedFindings,
      averagePlansProgress
    };

    cache.set(cacheKey, stats);
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular estadísticas del dashboard.' });
  }
};

export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'dashboard_activities';
    const cachedActivities = cache.get(cacheKey);
    if (cachedActivities) {
      res.status(200).json(cachedActivities);
      return;
    }

    const [actRows] = await db.query(
      `SELECT a.id, a.action, a.description, a.timestamp, u.name AS userName, s.name AS standardName
       FROM Activity a
       JOIN User u ON a.userId = u.id
       LEFT JOIN Standard s ON a.standardId = s.id
       ORDER BY a.timestamp DESC
       LIMIT 10`
    );
    const activities = actRows as any[];

    const formattedActivities = activities.map(act => ({
      id: act.id,
      action: act.action,
      description: act.description,
      timestamp: new Date(act.timestamp).toLocaleDateString(),
      user: act.userName,
      standard: act.standardName || null
    }));

    cache.set(cacheKey, formattedActivities);
    res.status(200).json(formattedActivities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener actividades recientes.' });
  }
};
