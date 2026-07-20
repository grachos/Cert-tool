import { v4 as uuidv4 } from 'uuid';
import pool from './db';

export async function alertRequisitoAsignado(userEmail: string, userName: string, indicadorId: string, clausula: string, fechaLimite: string) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
    [id, `Requisito ${indicadorId} asignado`, `${userName} tiene hasta ${fechaLimite} para responder ${clausula}.`, 'alta', 'alta', 'Ir a Cumplimiento', 'RSPO']
  );
}

export async function alertTareaVencida(indicadorId: string, clausula: string, responsable: string) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
    [id, `Tarea vencida: ${indicadorId}`, `El indicador ${clausula} está vencido. Responsable: ${responsable}. Registrar causa y nueva fecha.`, 'critico', 'critico', 'Ir a Cumplimiento', 'RSPO']
  );
}

export async function alertProximoVencimiento(indicadorId: string, clausula: string, dias: number, responsable: string) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
    [id, `Vence en ${dias} días: ${indicadorId}`, `El indicador ${clausula} vence en ${dias} días. Responsable: ${responsable}.`, 'media', 'media', 'Ir a Cumplimiento', 'RSPO']
  );
}

export async function alertEvidenciaCargada(documento: string, revisor: string) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
    [id, 'Evidencia pendiente de revisión', `Documento "${documento}" cargado. ${revisor} debe validarlo.`, 'media', 'media', 'Ir a Evidencias', 'Evidence']
  );
}

export async function alertCriticoNoConforme(indicadorId: string, clausula: string, responsable: string) {
  const id = uuidv4();
  await pool.query(
    'INSERT INTO Alert (id, title, message, type, priority, action, module) VALUES (?,?,?,?,?,?,?)',
    [id, `CRÍTICO no conforme: ${indicadorId}`, `El indicador crítico ${clausula} no cumple. Responsable: ${responsable}. Plan de acción obligatorio.`, 'critico', 'critico', 'Crear Plan de Acción', 'RSPO']
  );
}
