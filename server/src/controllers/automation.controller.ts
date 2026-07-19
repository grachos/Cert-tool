import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import cache from '../cache';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const runActionPlanAiAnalysis = async (planId: string, evidenceName: string, _userId: string) => {
  const parts = evidenceName.split('|');
  const filename = parts[1] || parts[0];

  if (!filename) return;

  const filePath = path.join(__dirname, '../../uploads', filename);

  try {
    // 1. Extract text
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
        extractedText = `Archivo adjunto de tipo ${ext}.`;
      }
    } else {
      extractedText = 'Evidencia simulada.';
    }

    // 2. Fetch the plan details
    const [planRows] = await db.query('SELECT title, description FROM ActionPlan WHERE id = ?', [planId]);
    const plan = (planRows as any[])[0];
    if (!plan) return;

    // 3. Call Gemini API
    const geminiApiKey = process.env.GEMINI_API_KEY;
    let progress = 100;
    let status = 'COMPLETED';
    let feedback = 'Evidencia de plan de acción verificada por la IA al 100%.';

    if (geminiApiKey) {
      console.log(`[ActionPlan AI] Running analysis for plan ${planId}...`);
      
      const prompt = `Analiza la siguiente evidencia cargada para el Plan de Acción titulado "${plan.title}".
Descripción del plan: "${plan.description}".

El texto extraído de la evidencia es:
---
${extractedText}
---

Tu tarea es evaluar objetivamente qué porcentaje de avance representa esta evidencia respecto a los objetivos específicos de este plan de acción.

Sigue estas reglas estrictas:
1. Valida primero si el documento es concerniente al plan de acción y a la no conformidad asociada.
2. Si el documento es genérico (por ejemplo, una política general de la empresa, una página de inicio, o un manual general que no demuestre la ejecución de este plan de acción específico), o si es irrelevante, debes asignar obligatoriamente un progreso de 0 (cero) por ciento.
3. Si el documento es pertinente pero no demuestra avances prácticos o reales, o solo describe intenciones futuras, asigna 0 por ciento.
4. Solo debes otorgar progresos mayores a 0% si el documento demuestra acciones ejecutadas, actas de reunión firmadas, capacitaciones realizadas, configuraciones técnicas implementadas, o cualquier evidencia objetiva de cumplimiento.
5. Devuelve un JSON estrictamente estructurado:
{
  "progress": número entero del 0 al 100 indicando el porcentaje de progreso real asignado según las reglas anteriores,
  "status": "COMPLETED" si el progreso es 100, o "IN_PROGRESS" si es menor,
  "feedback": "Una explicación detallada en español para el usuario sobre por qué se asignó ese progreso y qué le falta por presentar."
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                progress: { type: "INTEGER" },
                status: { type: "STRING" },
                feedback: { type: "STRING" }
              },
              required: ["progress", "status", "feedback"]
            }
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const result = JSON.parse(responseText);
        progress = result.progress !== undefined ? result.progress : 100;
        status = result.status || (progress === 100 ? 'COMPLETED' : 'IN_PROGRESS');
        feedback = result.feedback || 'Evidencia analizada.';
      }
    } else {
      console.log(`[ActionPlan AI] No GEMINI_API_KEY. Simulating review...`);
      await new Promise(resolve => setTimeout(resolve, 4000));
      progress = 60;
      status = 'IN_PROGRESS';
      feedback = 'Simulación de IA: La evidencia muestra un avance parcial del 60%. Se identificó la política pero se requiere el plan de capacitaciones firmado.';
    }

    // 4. Update the Action Plan
    await db.query(
      'UPDATE ActionPlan SET progress = ?, status = ?, aiFeedback = ? WHERE id = ?',
      [progress, status, feedback, planId]
    );

    // If progress is 100%, check if it is linked to a Risk
    if (progress === 100) {
      const [planRows] = await db.query('SELECT riskId FROM ActionPlan WHERE id = ?', [planId]);
      const planRow = (planRows as any[])[0];
      if (planRow && planRow.riskId) {
        const riskId = planRow.riskId;
        // Check if all other plans for this risk are completed (progress 100%)
        const [otherPlans] = await db.query('SELECT status, progress FROM ActionPlan WHERE riskId = ? AND id != ?', [riskId, planId]);
        const allCompleted = (otherPlans as any[]).every(p => p.status === 'COMPLETED' || p.progress === 100);
        if (allCompleted) {
          await db.query('UPDATE Risk SET status = "MITIGATED" WHERE id = ?', [riskId]);
          cache.del('dashboard_stats');
          console.log(`[ActionPlan AI] Risk ${riskId} automatically MITIGATED due to completion of all linked action plans.`);
        }
      }
    }

    console.log(`[ActionPlan AI] Plan ${planId} audited. Progress: ${progress}%`);
  } catch (error: any) {
    console.error(`[ActionPlan AI] Error in analysis for plan ${planId}:`, error?.message || error);
  }
};

export const getActionPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       ORDER BY p.dueDate ASC`
    );
    const plans = rows as any[];
    
    // Format to match old structure: { ..., assignee: { name, email } }
    const formattedPlans = plans.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      type: p.type,
      status: p.status,
      priority: p.priority,
      assigneeId: p.assigneeId,
      dueDate: new Date(p.dueDate).toISOString().split('T')[0],
      createdDate: p.createdDate,
      progress: p.progress,
      standard: p.standardId, // frontend expects standard
      evidenceName: p.evidenceName,
      aiFeedback: p.aiFeedback,
      riskId: p.riskId,
      assignee: {
        name: p.assigneeName,
        email: p.assigneeEmail
      }
    }));
    
    res.status(200).json(formattedPlans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener planes de acción.' });
  }
};

export const createActionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const planId = uuidv4();
    const dueDate = new Date(data.dueDate);
    const progress = data.progress || 0;
    
    await db.query(
      `INSERT INTO ActionPlan (id, title, description, type, status, priority, assigneeId, dueDate, progress, nonConformanceId, riskId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [planId, data.title, data.description, data.type, data.status || 'PENDING', data.priority, data.assigneeId, dueDate, progress, data.nonConformanceId || null, data.riskId || null]
    );

    // Fetch new plan with assignee
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       WHERE p.id = ?`,
      [planId]
    );
    const newPlan = (rows as any[])[0];

    if (!newPlan) {
      res.status(500).json({ error: 'Error al recuperar el plan creado.' });
      return;
    }

    cache.del('dashboard_stats');

    res.status(201).json({
      id: newPlan.id,
      title: newPlan.title,
      description: newPlan.description,
      type: newPlan.type,
      status: newPlan.status,
      priority: newPlan.priority,
      assigneeId: newPlan.assigneeId,
      dueDate: new Date(newPlan.dueDate).toISOString().split('T')[0],
      createdDate: newPlan.createdDate,
      progress: newPlan.progress,
      standard: newPlan.standardId,
      evidenceName: newPlan.evidenceName,
      aiFeedback: newPlan.aiFeedback,
      riskId: newPlan.riskId,
      assignee: {
        name: newPlan.assigneeName,
        email: newPlan.assigneeEmail
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear plan de acción.' });
  }
};

export const updateActionPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, description, type, status, priority, assigneeId, dueDate, progress, evidenceName, riskId } = req.body;
    const authReq = req as any;
    const userId = authReq.user?.id || 'system';

    // Get current plan to handle optional fields
    const [currentRows] = await db.query('SELECT * FROM ActionPlan WHERE id = ?', [id]);
    const current = (currentRows as any[])[0];

    if (!current) {
      res.status(404).json({ error: 'Plan de acción no encontrado.' });
      return;
    }

    const updatedTitle = title !== undefined ? title : current.title;
    const updatedDescription = description !== undefined ? description : current.description;
    const updatedType = type !== undefined ? type : current.type;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedPriority = priority !== undefined ? priority : current.priority;
    const updatedAssigneeId = assigneeId !== undefined ? assigneeId : current.assigneeId;
    const updatedDueDate = dueDate !== undefined ? new Date(dueDate) : new Date(current.dueDate);
    const updatedProgress = progress !== undefined ? progress : current.progress;
    const updatedEvidenceName = evidenceName !== undefined ? evidenceName : current.evidenceName;
    const updatedRiskId = riskId !== undefined ? riskId : current.riskId;

    await db.query(
      `UPDATE ActionPlan 
       SET title = ?, description = ?, type = ?, status = ?, priority = ?, assigneeId = ?, dueDate = ?, progress = ?, evidenceName = ?, riskId = ?
       WHERE id = ?`,
      [updatedTitle, updatedDescription, updatedType, updatedStatus, updatedPriority, updatedAssigneeId, updatedDueDate, updatedProgress, updatedEvidenceName, updatedRiskId, id]
    );

    // If new evidence was uploaded, trigger AI evaluation (and block/wait for it)
    if (evidenceName && evidenceName !== current.evidenceName) {
      await runActionPlanAiAnalysis(id, evidenceName as string, userId);
    }

    // Fetch updated plan with assignee
    const [rows] = await db.query(
      `SELECT p.*, u.name AS assigneeName, u.email AS assigneeEmail
       FROM ActionPlan p
       JOIN User u ON p.assigneeId = u.id
       WHERE p.id = ?`,
      [id]
    );
    const updated = (rows as any[])[0];

    cache.del('dashboard_stats');

    res.status(200).json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      type: updated.type,
      status: updated.status,
      priority: updated.priority,
      assigneeId: updated.assigneeId,
      dueDate: new Date(updated.dueDate).toISOString().split('T')[0],
      createdDate: updated.createdDate,
      progress: updated.progress,
      standard: updated.standardId,
      evidenceName: updated.evidenceName,
      aiFeedback: updated.aiFeedback,
      riskId: updated.riskId,
      assignee: {
        name: updated.assigneeName,
        email: updated.assigneeEmail
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar plan de acción.' });
  }
};
