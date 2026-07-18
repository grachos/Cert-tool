import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import cache from '../cache';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const runEvidenceAiAnalysis = async (evidenceId: string, compoundTitle: string, standardId: string, clause: string, userId: string) => {
  const parts = compoundTitle.split('|');
  const cleanTitle = parts[0];
  const filename = parts[1];

  if (!filename) {
    console.log(`[Evidence AI] No file attached to evidence ${evidenceId}. Skipping AI review.`);
    return;
  }

  const filePath = path.join(__dirname, '../../uploads', filename);

  try {
    // 1. Extract text from file
    let extractedText = '';
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || '';
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value || '';
      } else if (ext === '.txt' || ext === '.csv' || ext === '.json') {
        extractedText = fs.readFileSync(filePath, 'utf-8');
      } else {
        extractedText = `Archivo de evidencia de tipo ${ext}.`;
      }
    } else {
      console.warn(`[Evidence AI] File not found at: ${filePath}. Skipping real analysis.`);
      extractedText = 'Evidencia de prueba cargada.';
    }

    // 2. Fetch the clause description from DB
    const [reqRows] = await db.query('SELECT description FROM Requirement WHERE standardId = ? AND clause = ?', [standardId, clause]);
    const requirement = (reqRows as any[])[0];
    const reqDesc = requirement ? requirement.description : 'Requisito del estándar.';

    // 3. Call Gemini API if key is present
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let status = 'VALID';
    let feedback = 'Evidencia verificada correctamente por la IA.';

    if (geminiApiKey) {
      console.log(`[Evidence AI] Running Gemini analysis for evidence ${evidenceId} against clause ${clause}...`);
      
      const prompt = `Analiza la siguiente evidencia física cargada para cumplir con la cláusula "${clause}" del estándar "${standardId}".
El requisito de la norma exige lo siguiente: "${reqDesc}".

El texto extraído del archivo de evidencia es:
---
${extractedText}
---

Tu tarea es evaluar si este archivo demuestra objetivamente la ejecución del requisito.
Determina:
1. Si el tema del documento corresponde al requisito.
2. Si contiene firmas, fechas válidas, registros, nombres u otros indicadores de ejecución real.
Devuelve un JSON estrictamente estructurado según el siguiente formato:
{
  "status": "VALID" o "EXPIRED" (VALID si cumple y demuestra ejecución, EXPIRED si es irrelevante, está vacío o no es evidencia válida),
  "feedback": "Una breve retroalimentación en español indicando el resultado del análisis y por qué se aprobó o rechazó la evidencia."
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                status: {
                  type: "STRING",
                  enum: ["VALID", "EXPIRED"],
                  description: "VALID si cumple, EXPIRED si no cumple"
                },
                feedback: {
                  type: "STRING",
                  description: "Breve retroalimentación en español explicando el motivo"
                }
              },
              required: ["status", "feedback"]
            }
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const result = JSON.parse(responseText);
        status = result.status || 'VALID';
        feedback = result.feedback || 'Evidencia analizada.';
      }
    } else {
      console.log(`[Evidence AI] No GEMINI_API_KEY. Simulating review...`);
      await new Promise(resolve => setTimeout(resolve, 4000));
      status = 'VALID';
      feedback = 'Evidencia de auditoría simulada aprobada con éxito.';
    }

    // 4. Update the DB under transaction
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Update evidence
      await conn.query(
        'UPDATE Evidence SET status = ?, description = ? WHERE id = ?',
        [status, feedback, evidenceId]
      );

      // Create activity
      const activityId = uuidv4();
      await conn.query(
        'INSERT INTO Activity (id, action, description, userId, standardId) VALUES (?, ?, ?, ?, ?)',
        [activityId, 'Evidencia Auditada por IA', `La evidencia de "${cleanTitle}" para la cláusula ${clause} fue auditada. Estado: ${status === 'VALID' ? 'Vigente' : 'Rechazada'}.`, userId, standardId]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    console.log(`[Evidence AI] Evidence ${evidenceId} audited successfully. Status: ${status}`);
  } catch (error: any) {
    console.error(`[Evidence AI] Error in analysis for evidence ${evidenceId}:`, error?.message || error);
    try {
      await db.query(
        'UPDATE Evidence SET status = ?, description = ? WHERE id = ?',
        ['EXPIRED', 'Error en el motor de auditoría de IA.', evidenceId]
      );
    } catch (dbErr) {
      console.error(dbErr);
    }
  } finally {
    // Invalidate caches
    cache.del('dashboard_stats');
    cache.del('dashboard_activities');
    cache.del('compliance_standards');
    cache.del(`compliance_standard_${standardId}`);
  }
};

export const getEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    
    let query = 'SELECT * FROM Evidence ORDER BY uploadDate DESC';
    let params: any[] = [];
    if (standardId) {
      query = 'SELECT * FROM Evidence WHERE standardId = ? ORDER BY uploadDate DESC';
      params = [standardId];
    }

    const [evRows] = await db.query(query, params);
    const evidence = evRows as any[];

    // Format compound title to split physical file name
    const formattedEvidence = await Promise.all(evidence.map(async (ev) => {
      const parts = ev.title.split('|');
      const cleanTitle = parts[0];
      const filename = parts[1] || '';
      
      const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [ev.standardId]);
      
      return {
        ...ev,
        title: cleanTitle,
        standard: (stdRows as any[])[0] || null,
        linkedDocuments: filename ? [filename.split('-').slice(2).join('-') || filename] : []
      };
    }));
    
    res.status(200).json(formattedEvidence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener evidencias.' });
  }
};

export const createEvidence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, standardId, clause, type, status, expiryDate } = req.body;
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }
    
    const evId = uuidv4();
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    const evStatus = status || 'PENDING_REVIEW';

    await db.query(
      'INSERT INTO Evidence (id, title, description, standardId, clause, type, status, expiryDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [evId, title, description, standardId, clause, type, evStatus, parsedExpiryDate]
    );

    const [evRows] = await db.query('SELECT * FROM Evidence WHERE id = ?', [evId]);
    const newEvidence = (evRows as any[])[0];

    // Trigger AI evidence analysis in the background
    runEvidenceAiAnalysis(newEvidence.id, title, standardId, clause, userId);
    
    // Format response before sending
    const parts = newEvidence.title.split('|');
    res.status(201).json({
      ...newEvidence,
      title: parts[0],
      linkedDocuments: parts[1] ? [parts[1]] : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir evidencia.' });
  }
};
