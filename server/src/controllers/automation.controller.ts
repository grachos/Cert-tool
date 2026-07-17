import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../db';

export const getActionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await prisma.actionPlan.findMany({
      include: {
        assignee: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });
    
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener planes de acción.' });
  }
};

export const createActionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    
    const newPlan = await prisma.actionPlan.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate)
      }
    });
    
    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear plan de acción.' });
  }
};
