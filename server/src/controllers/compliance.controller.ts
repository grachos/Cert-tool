import { Request, Response } from 'express';
import prisma from '../db';
import cache from '../cache';

export const getStandardsCompliance = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'compliance_standards';
    const cachedCompliance = cache.get(cacheKey);
    if (cachedCompliance) {
      res.status(200).json(cachedCompliance);
      return;
    }

    const standards = await prisma.standard.findMany({
      include: {
        requirements: true
      }
    });

    const complianceStatuses = standards.map(std => {
      const total = std.requirements.length;
      const compliant = std.requirements.filter(r => r.status === 'COMPLIANT').length;
      const nonCompliant = std.requirements.filter(r => r.status === 'NON_COMPLIANT').length;
      const partial = std.requirements.filter(r => r.status === 'PARTIAL').length;
      const pending = std.requirements.filter(r => r.status === 'PENDING').length;

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
    });

    cache.set(cacheKey, complianceStatuses);
    res.status(200).json(complianceStatuses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cumplimiento de normas.' });
  }
};

export const getStandardRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cacheKey = `compliance_standard_${id}`;
    const cachedStandard = cache.get(cacheKey);
    if (cachedStandard) {
      res.status(200).json(cachedStandard);
      return;
    }

    const standard = await prisma.standard.findUnique({
      where: { id },
      include: {
        requirements: {
          orderBy: { clause: 'asc' }
        }
      }
    });

    if (!standard) {
      res.status(404).json({ error: 'Estándar normativo no encontrado.' });
      return;
    }

    cache.set(cacheKey, standard);
    res.status(200).json(standard);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener requisitos de la norma.' });
  }
};

export const updateStandard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, fullName, description, color, icon } = req.body;
    
    const updated = await prisma.standard.update({
      where: { id },
      data: { name, fullName, description, color, icon }
    });
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${id}`);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la norma.' });
  }
};

export const createRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clause, title, description, standardId } = req.body;
    
    const newReq = await prisma.requirement.create({
      data: {
        clause,
        title,
        description,
        status: 'PENDING',
        standardId
      }
    });
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${standardId}`);
    res.status(201).json(newReq);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el requisito.' });
  }
};

export const updateRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { clause, title, description, status } = req.body;
    
    const updated = await prisma.requirement.update({
      where: { id },
      data: { clause, title, description, status }
    });
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${updated.standardId}`);
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el requisito.' });
  }
};

export const deleteRequirement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const deleted = await prisma.requirement.delete({
      where: { id }
    });
    
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${deleted.standardId}`);
    res.status(200).json({ message: 'Requisito eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el requisito.' });
  }
};

