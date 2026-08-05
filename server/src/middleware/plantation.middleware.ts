import { NextFunction, Response } from 'express';
import db from '../db';
import { ScopedRequest } from './uoc.middleware';

export type PlantationAccessLevel = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export type PlantationScope = {
  restricted: boolean;
  farmPlotIds: string[];
  accessByFarmPlot: Record<string, PlantationAccessLevel>;
  readOnly: boolean;
};

export interface PlantationScopedRequest extends ScopedRequest {
  plantationScope?: PlantationScope;
}

export const CENTRAL_ROLES = new Set([
  'SUPERADMIN', 'ADMIN', 'MILL_ADMIN', 'MANAGER', 'SUSTAINABILITY',
  'TECHNICAL_REVIEWER', 'REVIEWER', 'AUDITOR', 'CERTIFIER',
  'COORDINATOR', 'PROCESS_OWNER', 'PLANT_ADMIN'
]);

export const PLANTATION_ROLES = new Set([
  'PLANTATION_ADMIN', 'PLANTATION_OPERATOR', 'USER', 'VIEWER', 'READ_ONLY'
]);

export const isCentralRole = (role?: string) => CENTRAL_ROLES.has(String(role || ''));

export async function getPlantationScope(
  user: { id: string; role: string },
  uocId: string
): Promise<PlantationScope> {
  if (isCentralRole(user.role)) {
    return { restricted: false, farmPlotIds: [], accessByFarmPlot: {}, readOnly: false };
  }
  const [rows] = await db.query(
    `SELECT upa.farmPlotId,upa.accessLevel
     FROM UserPlantationAccess upa
     JOIN FarmPlot fp ON fp.id=upa.farmPlotId AND fp.uocId=upa.uocId
     WHERE upa.userId=? AND upa.uocId=? AND upa.status='ACTIVE'`,
    [user.id, uocId]
  );
  const accessByFarmPlot: Record<string, PlantationAccessLevel> = {};
  for (const row of rows as any[]) {
    accessByFarmPlot[row.farmPlotId] = row.accessLevel;
  }
  const farmPlotIds = Object.keys(accessByFarmPlot);
  return {
    restricted: true,
    farmPlotIds,
    accessByFarmPlot,
    readOnly: ['VIEWER', 'READ_ONLY'].includes(user.role) ||
      farmPlotIds.every(id => accessByFarmPlot[id] === 'VIEWER')
  };
}

export const loadPlantationScope = async (
  req: PlantationScopedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado.' });
      return;
    }
    if (!req.uocId && isCentralRole(req.user.role)) {
      req.plantationScope = { restricted: false, farmPlotIds: [], accessByFarmPlot: {}, readOnly: false };
      next();
      return;
    }
    if (!req.uocId) {
      res.status(400).json({ error: 'Seleccione una Unidad de Certificación.' });
      return;
    }
    req.plantationScope = await getPlantationScope(req.user, req.uocId);
    if (req.plantationScope.restricted && !req.plantationScope.farmPlotIds.length) {
      res.status(403).json({
        error: 'El usuario no tiene una plantación activa asignada en esta unidad de certificación.'
      });
      return;
    }
    next();
  } catch (error) {
    console.error('Plantation scope error', error);
    res.status(500).json({ error: 'No fue posible validar el acceso a la plantación.' });
  }
};

export function canAccessFarmPlot(req: PlantationScopedRequest, farmPlotId: unknown): boolean {
  const id = String(farmPlotId || '').trim();
  if (!id) return false;
  const scope = req.plantationScope;
  return !scope?.restricted || scope.farmPlotIds.includes(id);
}

export function canEditFarmPlot(req: PlantationScopedRequest, farmPlotId: unknown): boolean {
  const id = String(farmPlotId || '').trim();
  const scope = req.plantationScope;
  if (!scope?.restricted) return true;
  if (!scope.farmPlotIds.includes(id) || scope.readOnly) return false;
  return ['ADMIN', 'OPERATOR'].includes(scope.accessByFarmPlot[id]);
}

export function restrictedFarmPlotSql(
  req: PlantationScopedRequest,
  column: string
): { clause: string; params: string[] } {
  const scope = req.plantationScope;
  if (!scope?.restricted) return { clause: '', params: [] };
  const placeholders = scope.farmPlotIds.map(() => '?').join(',');
  return {
    clause: ` AND ${column} IN (${placeholders})`,
    params: [...scope.farmPlotIds]
  };
}

export function requireCentralRole(
  req: PlantationScopedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!isCentralRole(req.user?.role)) {
    res.status(403).json({ error: 'Esta función está reservada para la administración de la extractora.' });
    return;
  }
  next();
}

export function requirePlantationWrite(
  req: PlantationScopedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.plantationScope?.readOnly) {
    res.status(403).json({ error: 'El perfil asignado es únicamente de consulta.' });
    return;
  }
  next();
}
