import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import NodeCache from 'node-cache';
import prisma from '../db';

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = 'documents_all';
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      res.status(200).json(cachedData);
      return;
    }

    const documents = await prisma.document.findMany({
      include: {
        standard: true,
        findings: true
      },
      orderBy: {
        uploadDate: 'desc'
      }
    });
    
    cache.set(cacheKey, documents);
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener documentos.' });
  }
};

export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, type, standardId, size, version } = req.body;
    
    const newDoc = await prisma.document.create({
      data: {
        name,
        type,
        standardId,
        size,
        version
      }
    });

    // Invalidate cache
    cache.del('documents_all');
    
    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear documento.' });
  }
};
