import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../db';

export const getEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    
    const evidence = await prisma.evidence.findMany({
      where: standardId ? { standardId: String(standardId) } : undefined,
      include: {
        standard: true
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });
    
    res.status(200).json(evidence);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener evidencias.' });
  }
};

export const createEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    
    const newEvidence = await prisma.evidence.create({
      data
    });
    
    res.status(201).json(newEvidence);
  } catch (error) {
    res.status(500).json({ error: 'Error al subir evidencia.' });
  }
};
