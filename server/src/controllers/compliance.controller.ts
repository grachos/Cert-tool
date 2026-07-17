import { Request, Response } from 'express';
import prisma from '../db';

export const getStandardsCompliance = async (req: Request, res: Response): Promise<void> => {
  try {
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

    res.status(200).json(complianceStatuses);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cumplimiento de normas.' });
  }
};

export const getStandardRequirements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    res.status(200).json(standard);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener requisitos de la norma.' });
  }
};
