import { Request, Response } from 'express';
import { FindingType, Severity } from '@prisma/client';
import prisma from '../db';
import cache from '../cache';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pdfParse from 'pdf-parse';

interface MockFinding {
  type: FindingType;
  severity: Severity;
  description: string;
  clause: string;
}

const getFallbackMockData = (standardId: string) => {
  const findings: MockFinding[] = [];
  let aiScore = 85;

  switch (standardId) {
    case 'ISO9001':
      aiScore = 78;
      findings.push(
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
      );
      break;
    case 'BASC':
      aiScore = 88;
      findings.push(
        {
          type: FindingType.GAP,
          severity: Severity.HIGH,
          description: 'Inspección de contenedores físicos y sellos de seguridad carece de registro fotográfico mandatorio.',
          clause: '5.2'
        },
        {
          type: FindingType.IMPROVEMENT,
          severity: Severity.LOW,
          description: 'Reemplazar las hojas físicas de registro de visitantes por un sistema digital basado en la nube.',
          clause: '4.2'
        }
      );
      break;
    default:
      aiScore = 92;
      findings.push(
        {
          type: FindingType.GAP,
          severity: Severity.MEDIUM,
          description: 'Falta documentación de soporte para evidenciar la capacitación del personal del área involucrada.',
          clause: '7.2'
        },
        {
          type: FindingType.RECOMMENDATION,
          severity: Severity.LOW,
          description: 'Implementar controles documentales con firmas digitales en lugar de formatos escaneados a mano.',
          clause: '7.5'
        }
      );
  }

  return {
    aiScore,
    status: aiScore >= 80 ? 'REVIEWED' : 'ISSUES_FOUND',
    findings
  };
};

const runRealAiAnalysis = async (docId: string, compoundName: string, standardId: string, userId: string) => {
  const parts = compoundName.split('|');
  const originalName = parts[0];
  const filename = parts[1];

  if (!filename) {
    console.error(`[AI Analysis] No filename found in compound name: ${compoundName}`);
    return;
  }

  const filePath = path.join(__dirname, '../../uploads', filename);

  try {
    // 1. Extract text from PDF if it exists
    let documentText = '';
    if (fs.existsSync(filePath)) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      documentText = pdfData.text || '';
    } else {
      console.warn(`[AI Analysis] File not found at: ${filePath}. Using fallback mock text.`);
      documentText = `Este es un documento de prueba para la norma ${standardId}.`;
    }

    // Truncate document text to stay within tokens limit if extremely large
    if (documentText.length > 20000) {
      documentText = documentText.substring(0, 20000) + '... [Texto Truncado]';
    }

    // 2. Call Google Gemini API if key is present
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let aiScore = 80;
    let status = 'REVIEWED';
    let findings: any[] = [];

    if (geminiApiKey) {
      console.log(`[AI Analysis] Running real Gemini analysis for document ${docId}...`);
      
      const prompt = `Analiza el contenido de este documento de política corporativa para el estándar de cumplimiento normativo "${standardId}".
Evalúa el nivel de alineación y cumplimiento de las cláusulas y requisitos del estándar.
El texto del documento es el siguiente:
---
${documentText}
---`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                aiScore: {
                  type: "INTEGER",
                  description: "Puntaje de cumplimiento global del documento contra el estándar (entre 0 y 100)"
                },
                status: {
                  type: "STRING",
                  enum: ["REVIEWED", "ISSUES_FOUND"],
                  description: "REVIEWED si el puntaje es mayor o igual a 80, ISSUES_FOUND si tiene hallazgos críticos o puntaje de cumplimiento bajo"
                },
                findings: {
                  type: "ARRAY",
                  description: "Lista de hallazgos encontrados en el análisis",
                  items: {
                    type: "OBJECT",
                    properties: {
                      type: {
                        type: "STRING",
                        enum: ["GAP", "RECOMMENDATION", "RISK", "IMPROVEMENT"]
                      },
                      severity: {
                        type: "STRING",
                        enum: ["HIGH", "MEDIUM", "LOW"]
                      },
                      description: {
                        type: "STRING",
                        description: "Descripción clara, concisa y redactada en español del hallazgo, indicando qué brecha se encontró o qué recomendación de mejora se propone"
                      },
                      clause: {
                        type: "STRING",
                        description: "Cláusula o sección del estándar afectada (ej. '9.3', '4.2')"
                      }
                    },
                    required: ["type", "severity", "description", "clause"]
                  }
                }
              },
              required: ["aiScore", "status", "findings"]
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const result = JSON.parse(responseText);
        aiScore = result.aiScore || 80;
        status = result.status || (aiScore >= 80 ? 'REVIEWED' : 'ISSUES_FOUND');
        findings = result.findings || [];
      } else {
        throw new Error('No se recibió texto válido de la API de Gemini.');
      }
    } else {
      console.log(`[AI Analysis] GEMINI_API_KEY not configured. Using fallback simulation for ${docId}...`);
      await new Promise(resolve => setTimeout(resolve, 4000));
      const fallback = getFallbackMockData(standardId);
      aiScore = fallback.aiScore;
      status = fallback.status;
      findings = fallback.findings;
    }

    // 3. Save findings & update DB
    await prisma.$transaction(async (tx) => {
      // Update document
      await tx.document.update({
        where: { id: docId },
        data: {
          aiScore,
          status: status as any,
          reviewer: 'Auditor IA'
        }
      });

      // Create findings
      for (const finding of findings) {
        await tx.aIFinding.create({
          data: {
            type: finding.type as any,
            severity: finding.severity as any,
            description: finding.description,
            clause: finding.clause,
            documentId: docId
          }
        });
      }

      // Create activity
      await tx.activity.create({
        data: {
          action: 'Análisis de IA Completado',
          description: `El documento "${originalName}" fue analizado automáticamente contra la norma ${standardId}. Resultado: ${aiScore}% de cumplimiento.`,
          userId,
          standardId
        }
      });
    });

    console.log(`[AI Analysis] Document ${docId} successfully analyzed. Status: ${status}, Score: ${aiScore}%`);
  } catch (error: any) {
    console.error(`[AI Analysis] Error running analysis for document ${docId}:`, error?.response?.data || error?.message || error);
    
    // In case of error, mark status as ISSUES_FOUND so it does not stay pending forever
    try {
      await prisma.document.update({
        where: { id: docId },
        data: {
          status: 'ISSUES_FOUND',
          reviewer: 'Auditor IA (Fallo API)'
        }
      });
    } catch (dbErr) {
      console.error('Error al actualizar estado de fallo de documento:', dbErr);
    }
  } finally {
    // Invalidate related caches
    cache.del('documents_all');
    cache.del('dashboard_stats');
    cache.del('dashboard_activities');
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${standardId}`);
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
    
    // Strip file physical suffix before returning
    const formattedDocs = documents.map(doc => {
      const parts = doc.name.split('|');
      return {
        ...doc,
        name: parts[0]
      };
    });
    
    cache.set(cacheKey, formattedDocs);
    res.status(200).json(formattedDocs);
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
    runRealAiAnalysis(newDoc.id, name, standardId, userId);

    // Invalidate cache immediately for document list & dashboard stats
    cache.del('documents_all');
    cache.del('dashboard_stats');
    
    res.status(201).json({
      ...newDoc,
      name: name.split('|')[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear documento.' });
  }
};
