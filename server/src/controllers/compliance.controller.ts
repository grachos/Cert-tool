import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import cache from '../cache';

export const getStandardsCompliance = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'compliance_standards';
    const cachedCompliance = cache.get(cacheKey);
    if (cachedCompliance) {
      res.status(200).json(cachedCompliance);
      return;
    }

    const [stdRows] = await db.query('SELECT * FROM Standard');
    let standards = stdRows as any[];

    // Filter by environment variables if set (SaaS licensing check)
    const enabledStandardsEnv = process.env.ENABLED_STANDARDS;
    if (enabledStandardsEnv) {
      const allowedIds = enabledStandardsEnv.split(',').map(s => s.trim().toUpperCase());
      standards = standards.filter(std => allowedIds.includes(std.id.toUpperCase()));
    }

    const complianceStatuses = await Promise.all(standards.map(async (std) => {
      const [reqRows] = await db.query('SELECT * FROM Requirement WHERE standardId = ?', [std.id]);
      const requirements = reqRows as any[];

      const total = requirements.length;
      const compliant = requirements.filter(r => r.status === 'COMPLIANT').length;
      const nonCompliant = requirements.filter(r => r.status === 'NON_COMPLIANT').length;
      const partial = requirements.filter(r => r.status === 'PARTIAL').length;
      const pending = requirements.filter(r => r.status === 'PENDING').length;

      const score = total > 0 
        ? Math.round(((compliant + (partial * 0.5)) / total) * 100)
        : 0;

      return {
        standardId: std.id,
        name: std.name,
        fullName: std.fullName,
        description: std.description,
        color: std.color,
        icon: std.icon,
        totalRequirements: total,
        compliant,
        nonCompliant,
        partial,
        pending,
        overallScore: score
      };
    }));

    cache.set(cacheKey, complianceStatuses);
    res.status(200).json(complianceStatuses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cumplimiento de normas.' });
  }
};

export const getStandardRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check SaaS licensing
    const enabledStandardsEnv = process.env.ENABLED_STANDARDS;
    if (enabledStandardsEnv) {
      const allowedIds = enabledStandardsEnv.split(',').map(s => s.trim().toUpperCase());
      if (!allowedIds.includes((id as string).toUpperCase())) {
        res.status(403).json({ error: 'Acceso denegado a esta norma por licenciamiento.' });
        return;
      }
    }
    const cacheKey = `compliance_standard_${id}`;
    const cachedStandard = cache.get(cacheKey);
    if (cachedStandard) {
      res.status(200).json(cachedStandard);
      return;
    }

    const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [id]);
    const standard = (stdRows as any[])[0];

    if (!standard) {
      res.status(404).json({ error: 'Estándar normativo no encontrado.' });
      return;
    }

    const [reqRows] = await db.query('SELECT * FROM Requirement WHERE standardId = ? ORDER BY clause ASC', [id]);
    const requirements = reqRows as any[];

    const result = {
      ...standard,
      requirements
    };

    cache.set(cacheKey, result);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener requisitos de la norma.' });
  }
};

export const updateStandard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, fullName, description, color, icon } = req.body;
    
    await db.query(
      'UPDATE Standard SET name = ?, fullName = ?, description = ?, color = ?, icon = ? WHERE id = ?',
      [name, fullName, description, color, icon, id]
    );

    const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [id]);
    const updated = (stdRows as any[])[0];
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${id}`);
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la norma.' });
  }
};

export const createRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clause, title, description, standardId } = req.body;
    const reqId = uuidv4();
    
    await db.query(
      'INSERT INTO Requirement (id, clause, title, description, status, standardId) VALUES (?, ?, ?, ?, ?, ?)',
      [reqId, clause, title, description, 'PENDING', standardId]
    );

    const [reqRows] = await db.query('SELECT * FROM Requirement WHERE id = ?', [reqId]);
    const newReq = (reqRows as any[])[0];
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${standardId}`);
    res.status(201).json(newReq);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el requisito.' });
  }
};

export const updateRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { clause, title, description, status } = req.body;
    
    await db.query(
      'UPDATE Requirement SET clause = ?, title = ?, description = ?, status = ? WHERE id = ?',
      [clause, title, description, status, id]
    );

    const [reqRows] = await db.query('SELECT * FROM Requirement WHERE id = ?', [id]);
    const updated = (reqRows as any[])[0];
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${updated.standardId}`);
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el requisito.' });
  }
};

export const deleteRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const [reqRows] = await db.query('SELECT * FROM Requirement WHERE id = ?', [id]);
    const reqToDelete = (reqRows as any[])[0];

    if (!reqToDelete) {
      res.status(404).json({ error: 'Requisito no encontrado.' });
      return;
    }

    await db.query('DELETE FROM Requirement WHERE id = ?', [id]);
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${reqToDelete.standardId}`);
    res.status(200).json({ message: 'Requisito eliminado con éxito.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el requisito.' });
  }
};
