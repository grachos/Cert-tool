import { Request, Response } from 'express';
import { FindingType, Severity } from '@prisma/client';
import prisma from '../db';
import cache from '../cache';

interface MockFinding {
  type: FindingType;
  severity: Severity;
  description: string;
  clause: string;
}

const getMockFindingsForStandard = (standardId: string): MockFinding[] => {
  switch (standardId) {
    case 'ISO9001':
      return [
        {
          type: FindingType.GAP,
          severity: Severity.HIGH,
          description: 'No se encontraron registros de la revisión anual del sistema de calidad por parte de la alta dirección.',
          clause: '9.3'
        },
        {
          type: FindingType.RISK,
          severity: Severity.MEDIUM,
          description: 'Riesgo de desactualización del catálogo de perfiles de cargos críticos debido a cambios recientes en la estructura organizacional.',
          clause: '7.2'
        },
        {
          type: FindingType.RECOMMENDATION,
          severity: Severity.LOW,
          description: 'Se recomienda definir un formato estandarizado digital para documentar las no conformidades detectadas en sitio.',
          clause: '10.2'
        }
      ];
    case 'BASC':
      return [
        {
          type: FindingType.GAP,
          severity: Severity.HIGH,
          description: 'Inspección de contenedores físicos y sellos de seguridad carece de registro fotográfico mandatorio.',
          clause: '5.2'
        },
        {
          type: FindingType.RISK,
          severity: Severity.MEDIUM,
          description: 'Riesgo de ingreso no autorizado por debilidad en el control biométrico de la puerta auxiliar.',
          clause: '4.1'
        },
        {
          type: FindingType.IMPROVEMENT,
          severity: Severity.LOW,
          description: 'Reemplazar las hojas físicas de registro de visitantes por un sistema digital basado en la nube.',
          clause: '4.2'
        }
      ];
    case 'SAGRILAFT':
      return [
        {
          type: FindingType.GAP,
          severity: Severity.HIGH,
          description: 'La debida diligencia intensificada no se aplicó de manera sistemática a clientes clasificados como PEPs.',
          clause: '4.0'
        },
        {
          type: FindingType.RISK,
          severity: Severity.HIGH,
          description: 'Riesgo de sanciones por reportes extemporáneos de operaciones sospechosas (ROS) a la UIAF.',
          clause: '5.0'
        },
        {
          type: FindingType.RECOMMENDATION,
          severity: Severity.MEDIUM,
          description: 'Establecer alertas automatizadas periódicas para renovar el conocimiento de proveedores críticos cada 12 meses.',
          clause: '4.2'
        }
      ];
    default:
      return [
        {
          type: FindingType.GAP,
          severity: Severity.HIGH,
          description: 'Falta documentación de soporte para evidenciar la capacitación del personal del área involucrada.',
          clause: '7.2'
        },
        {
          type: FindingType.RISK,
          severity: Severity.MEDIUM,
          description: 'Falta de auditorías de control periódicas incrementa el riesgo de incidentes de cumplimiento.',
          clause: '9.2'
        },
        {
          type: FindingType.RECOMMENDATION,
          severity: Severity.LOW,
          description: 'Implementar controles documentales con firmas digitales en lugar de formatos escaneados a mano.',
          clause: '7.5'
        }
      ];
  }
};

const simulateAiAnalysis = async (docId: string, standardId: string, userId: string) => {
  // Wait 5 seconds to simulate processing
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const findings = getMockFindingsForStandard(standardId);
    
    // If there is a high severity GAP, calculate a lower score
    const hasHighGap = findings.some(f => f.type === 'GAP' && f.severity === 'HIGH');
    const aiScore = hasHighGap ? Math.floor(Math.random() * 15) + 65 : Math.floor(Math.random() * 15) + 85;
    const status = aiScore >= 80 ? 'REVIEWED' : 'ISSUES_FOUND';

    await prisma.$transaction(async (tx) => {
      // 1. Update the document with AI analysis results
      await tx.document.update({
        where: { id: docId },
        data: {
          aiScore,
          status: status as any,
          reviewer: 'Auditor IA'
        }
      });

      // 2. Create the findings
      for (const finding of findings) {
        await tx.aIFinding.create({
          data: {
            type: finding.type,
            severity: finding.severity,
            description: finding.description,
            clause: finding.clause,
            documentId: docId
          }
        });
      }

      // 3. Log a new Activity entry
      await tx.activity.create({
        data: {
          action: 'Análisis de IA Completado',
          description: `El documento fue analizado automáticamente contra la norma ${standardId}. Resultado: ${aiScore}% de cumplimiento.`,
          userId,
          standardId
        }
      });
    });

    // Invalidate all related caches
    cache.del('documents_all');
    cache.del('dashboard_stats');
    cache.del('dashboard_activities');
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${standardId}`);

    console.log(`[AI Analysis] Document ${docId} successfully analyzed. Status: ${status}, Score: ${aiScore}%`);
  } catch (error) {
    console.error(`[AI Analysis] Error running analysis for document ${docId}:`, error);
  }
};

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
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }
    
    const newDoc = await prisma.document.create({
      data: {
        name,
        type,
        standardId,
        size,
        version,
        status: 'PENDING'
      }
    });

    // Trigger AI analysis in the background
    simulateAiAnalysis(newDoc.id, standardId, userId);

    // Invalidate cache immediately for document list & dashboard stats
    cache.del('documents_all');
    cache.del('dashboard_stats');
    
    res.status(201).json(newDoc);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear documento.' });
  }
};
