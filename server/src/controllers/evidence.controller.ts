import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import cache from '../cache';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import {
  PlantationScopedRequest,
  canAccessFarmPlot,
  restrictedFarmPlotSql
} from '../middleware/plantation.middleware';

const runEvidenceAiAnalysis = async (evidenceId: string, compoundTitle: string, standardId: string, clause: string, userId: string) => {
  const parts = compoundTitle.split('|');
  const cleanTitle = parts[0];
  const filename = parts[2] || parts[1];

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
        const pdfData = await (pdfParse as any)(dataBuffer);
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
      status = 'PENDING_REVIEW';
      feedback = 'Pendiente de revisión manual; el servicio externo de análisis no está configurado.';
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

export const getEvidence = async (req: PlantationScopedRequest, res: Response): Promise<void> => {
  try {
    const { standardId } = req.query;
    
    let query = 'SELECT * FROM Evidence WHERE uocId = ?';
    let params: any[] = [req.uocId];
    const access = restrictedFarmPlotSql(req, 'farmPlotId');
    query += access.clause;
    params.push(...access.params);
    if (standardId) {
      query += ' AND standardId = ?';
      params.push(standardId);
    }
    query += ' ORDER BY uploadDate DESC';

    const [evRows] = await db.query(query, params);
    const evidence = evRows as any[];

    // Format compound title to split physical file name
    const formattedEvidence = await Promise.all(evidence.map(async (ev) => {
      const parts = ev.title.split('|');
      const cleanTitle = parts[0];
      const originalFileName = ev.originalFileName || parts[1] || '';
      const filename = ev.fileName || parts[2] || parts[1] || '';
      
      const [stdRows] = await db.query('SELECT * FROM Standard WHERE id = ?', [ev.standardId]);
      
      return {
        ...ev,
        title: cleanTitle,
        standard: (stdRows as any[])[0] || null,
        fileName: filename,
        originalFileName,
        linkedDocuments: filename ? [originalFileName || filename] : []
      };
    }));
    
    res.status(200).json(formattedEvidence);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener evidencias.' });
  }
};

export const createEvidence = async (req: PlantationScopedRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, standardId, clause, type, status, expiryDate, companyName,
      supplySourceId, requirementId, requirementIds, indicator, responsible,
      observations, mimeType, moduleCode, programCode, plantationLotId,
      documentDate, evidenceVersion
    } = req.body;
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }
    
    const evId = uuidv4();
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    const evStatus = status || 'PENDING_REVIEW';
    const scopedUocId = (req as any).uocId;
    const linkedRequirementIds = [...new Set(
      (Array.isArray(requirementIds) ? requirementIds : [requirementId])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )];
    if (!linkedRequirementIds.length) { res.status(400).json({ error: 'Debe seleccionar al menos un indicador P&C válido.' }); return; }
    const placeholders = linkedRequirementIds.map(() => '?').join(',');
    const [requirements] = await db.query(
      `SELECT id FROM Requirement WHERE id IN (${placeholders}) AND standardId=?`,
      [...linkedRequirementIds, standardId]
    );
    if ((requirements as any[]).length !== linkedRequirementIds.length) {
      res.status(400).json({ error: 'Uno o más indicadores seleccionados no son válidos.' });
      return;
    }
    let farmPlotId = String(req.body.farmPlotId || '').trim() || null;
    if (req.plantationScope?.restricted) {
      if (!farmPlotId && req.plantationScope.farmPlotIds.length === 1) {
        farmPlotId = req.plantationScope.farmPlotIds[0];
      }
      if (!farmPlotId || !canAccessFarmPlot(req, farmPlotId)) {
        res.status(403).json({ error: 'La evidencia debe pertenecer a una plantación asignada al usuario.' });
        return;
      }
    }
    if (supplySourceId) {
      const [sources] = await db.query('SELECT id FROM SupplySource WHERE id=? AND uocId=?', [supplySourceId, scopedUocId]);
      if (!(sources as any[]).length) { res.status(400).json({ error: 'La fuente no pertenece a la UoC.' }); return; }
    }
    if (farmPlotId) {
      const [plots] = await db.query('SELECT id FROM FarmPlot WHERE id=? AND uocId=? AND (? IS NULL OR supplySourceId=?)', [farmPlotId, scopedUocId, supplySourceId || null, supplySourceId || null]);
      if (!(plots as any[]).length) { res.status(400).json({ error: 'La plantación no pertenece a la UoC o fuente seleccionada.' }); return; }
    }
    if (plantationLotId) {
      const [lots] = await db.query(
        'SELECT id FROM PlantationLot WHERE id=? AND farmPlotId=? AND uocId=?',
        [plantationLotId, farmPlotId, scopedUocId]
      );
      if (!(lots as any[]).length) { res.status(400).json({ error: 'El lote no pertenece a la plantación seleccionada.' }); return; }
    }

    const parts = title.split('|');
    const originalFileName = parts[1] || null;
    const fileName = parts[2] || parts[1] || null;
    await db.query(
      `INSERT INTO Evidence
       (id,title,description,standardId,clause,type,status,expiryDate,uocId,companyName,
        supplySourceId,farmPlotId,plantationLotId,requirementId,indicator,responsible,
        fileName,originalFileName,mimeType,observations,moduleCode,programCode,uploadedBy,
        documentDate,evidenceVersion)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        evId, title, description, standardId, clause, type, evStatus, parsedExpiryDate,
        scopedUocId, companyName || null, supplySourceId || null, farmPlotId,
        plantationLotId || null, linkedRequirementIds[0], indicator || null,
        responsible || null, fileName, originalFileName, mimeType || null,
        observations || null, moduleCode || null, programCode || null, userId,
        documentDate || null, evidenceVersion || '1'
      ]
    );
    for (const linkedRequirementId of linkedRequirementIds) {
      await db.query(
        `INSERT IGNORE INTO EvidenceRequirementLink
         (id,evidenceId,requirementId,uocId,farmPlotId,linkedBy)
         VALUES (?,?,?,?,?,?)`,
        [uuidv4(), evId, linkedRequirementId, scopedUocId, farmPlotId, userId]
      );
    }
    await db.query(
      'INSERT INTO EvidenceHistory (id,evidenceId,uocId,changedBy,action,snapshotJson) VALUES (?,?,?,?,?,?)',
      [uuidv4(), evId, scopedUocId, userId, 'CREATED', JSON.stringify({ title, standardId, clause, type, status: evStatus, expiryDate: parsedExpiryDate, requirementIds: linkedRequirementIds, farmPlotId, fileName })]
    );

    const [evRows] = await db.query('SELECT * FROM Evidence WHERE id = ?', [evId]);
    const newEvidence = (evRows as any[])[0];

    // Trigger AI evidence analysis in the background
    runEvidenceAiAnalysis(newEvidence.id, title, standardId, clause, userId);
    
    // Format response before sending
    const responseParts = newEvidence.title.split('|');
    res.status(201).json({
      ...newEvidence,
      title: responseParts[0],
      fileName,
      originalFileName,
      linkedDocuments: fileName ? [originalFileName || fileName] : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir evidencia.' });
  }
};

export const reviewEvidence = async (req: PlantationScopedRequest, res: Response): Promise<void> => {
  const { status, observations } = req.body;
  if (!['VALID','EXPIRED','PENDING_REVIEW','IN_REVIEW','APPROVED','REJECTED','REPLACED'].includes(status)) { res.status(400).json({ error: 'Estado de revisión inválido.' }); return; }
  const authReq = req as any;
  const [result]: any = await db.query(
    'UPDATE Evidence SET status=?,observations=COALESCE(?,observations),reviewedBy=?,reviewedAt=NOW() WHERE id=? AND uocId=?',
    [status, observations ?? null, authReq.user.id, req.params.id, authReq.uocId]
  );
  if (!result.affectedRows) { res.status(404).json({ error: 'Evidencia no encontrada.' }); return; }
  const [rows] = await db.query('SELECT * FROM Evidence WHERE id=? AND uocId=?', [req.params.id, authReq.uocId]);
  await db.query(
    'INSERT INTO EvidenceHistory (id,evidenceId,uocId,changedBy,action,snapshotJson) VALUES (?,?,?,?,?,?)',
    [uuidv4(), req.params.id, authReq.uocId, authReq.user.id, 'REVIEWED', JSON.stringify((rows as any[])[0])]
  );
  res.json((rows as any[])[0]);
};
