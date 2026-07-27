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

    const isAll = (req as any).user?.role === 'ADMIN' && uocId === 'all';
    const scope = isAll ? '' : ' WHERE uocId=?';
    const scopeParams = isAll ? [] : [uocId];
    const [evaluationRows] = await db.query(`SELECT AVG(score) average FROM PlantationActivity${scope}${scope ? ' AND' : ' WHERE'} category='EVALUATION' AND score IS NOT NULL`, scopeParams);
    const overallCompliance = Math.round(Number((evaluationRows as any[])[0]?.average || 0));

    // 2. Documentos pendientes de revisión
    const [pendingRows] = await db.query(`SELECT COUNT(*) AS count FROM Evidence${scope}${scope ? ' AND' : ' WHERE'} status='PENDING_REVIEW'`, scopeParams);
    const pendingReviews = (pendingRows as any[])[0]?.count || 0;

    // 3. Riesgos activos (OPEN)
    const [activeRiskRows] = await db.query(`SELECT COUNT(*) AS count FROM Risk${scope}${scope ? ' AND' : ' WHERE'} status='OPEN'`, scopeParams);
    const activeRisks = (activeRiskRows as any[])[0]?.count || 0;

    // Calcular cuántos de esos riesgos activos son críticos
    const [criticalRiskRows] = await db.query(`SELECT COUNT(*) AS count FROM Risk${scope}${scope ? ' AND' : ' WHERE'} status='OPEN' AND level='CRITICAL'`, scopeParams);
    const criticalRisks = (criticalRiskRows as any[])[0]?.count || 0;

    // 4. Planes vencidos
    const actionScope = isAll ? '' : ' AND uocId = ?';
    const actionParams = isAll ? [] : [uocId];
    const [overdueRows] = await db.query(
      `SELECT COUNT(*) AS count FROM ActionPlan WHERE (status = "OVERDUE" OR (status IN ("PENDING", "IN_PROGRESS") AND dueDate < NOW()))${actionScope}`,
      actionParams
    );
    const overdueActions = (overdueRows as any[])[0]?.count || 0;

    // 5. No Conformidades abiertas / cerradas
    const [openFindingsRows] = await db.query(`SELECT COUNT(*) AS count FROM NonConformance${scope}${scope ? ' AND' : ' WHERE'} status <> 'CLOSED'`, scopeParams);
    const openFindings = (openFindingsRows as any[])[0]?.count || 0;

    const [closedFindingsRows] = await db.query(`SELECT COUNT(*) AS count FROM NonConformance${scope}${scope ? ' AND' : ' WHERE'} status = 'CLOSED'`, scopeParams);
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
    const uocId = typeof req.query.uocId === 'string' ? req.query.uocId : '';
    const isAll = (req as any).user?.role === 'ADMIN' && uocId === 'all';
    const cacheKey = `dashboard_activities_${isAll ? 'all' : uocId}`;
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
       ${isAll ? '' : 'WHERE a.uocId = ?'}
       ORDER BY a.timestamp DESC
       LIMIT 10`,
      isAll ? [] : [uocId]
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
