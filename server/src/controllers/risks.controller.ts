import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../db';

export const getRisks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    
    const risks = await prisma.risk.findMany({
      where: standardId ? { standardId: String(standardId) } : undefined,
      include: {
        standard: true
      },
      orderBy: {
        level: 'asc' // Custom sorting would be needed for Enum, but this is a simple fallback
      }
    });
    
    res.status(200).json(risks);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener riesgos.' });
  }
};

export const createRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    
    // Calculate level based on probability * impact
    const score = data.probability * data.impact;
    let level = 'LOW';
    if (score >= 15) level = 'CRITICAL';
    else if (score >= 10) level = 'HIGH';
    else if (score >= 5) level = 'MEDIUM';

    const newRisk = await prisma.risk.create({
      data: {
        ...data,
        level,
        owner: req.user?.name || data.owner,
      }
    });
    
    res.status(201).json(newRisk);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear riesgo.' });
  }
};
