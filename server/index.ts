import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import db from './src/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
import path from 'path';
import fs from 'fs';
import multer from 'multer';

import authRoutes from './src/routes/auth.routes';
import documentRoutes from './src/routes/documents.routes';
import risksRoutes from './src/routes/risks.routes';
import evidenceRoutes from './src/routes/evidence.routes';
import automationRoutes from './src/routes/automation.routes';
import usersRoutes from './src/routes/users.routes';
import dashboardRoutes from './src/routes/dashboard.routes';
import complianceRoutes from './src/routes/compliance.routes';
import auditsRoutes from './src/routes/audits.routes';
import sccRoutes from './src/routes/scc.routes';
import stakeholdersRoutes from './src/routes/stakeholders.routes';
import alertsRoutes from './src/routes/alerts.routes';
import approvalsRoutes from './src/routes/approvals.routes';
import plantRoutes from './src/routes/plant.routes';
import rspoRoutes from './src/routes/rspo.routes';
import pcRoutes from './src/routes/pc.routes';
import operationsRoutes from './src/routes/operations.routes';
import { authenticateToken, AuthRequest } from './src/middleware/auth.middleware';
import { canAccessUoc } from './src/middleware/uoc.middleware';
import { getPlantationScope } from './src/middleware/plantation.middleware';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/csv'
]);
const allowedExtensions = new Set(['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.csv']);
const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null,
    allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(path.extname(file.originalname).toLowerCase())
  )
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8080,http://localhost:5173,http://localhost:3000').split(',').map(v => v.trim());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/risks', risksRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/audits', auditsRoutes);
app.use('/api/scc', sccRoutes);
app.use('/api/stakeholders', stakeholdersRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/plant', plantRoutes);
app.use('/api/rspo', rspoRoutes);
app.use('/api/pc', pcRoutes);
app.use('/api/operations', operationsRoutes);

// File Upload Endpoint
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No se subió ningún archivo.' });
    return;
  }
  
  // Format file size
  const sizeInKb = Math.round(req.file.size / 1024);
  const sizeStr = sizeInKb > 1024 
    ? `${(sizeInKb / 1024).toFixed(1)} MB` 
    : `${sizeInKb} KB`;

  res.status(200).json({
    url: `/api/files/${req.file.filename}`,
    name: `${req.file.originalname}|${req.file.filename}`,
    size: sizeStr,
    mimeType: req.file.mimetype
  });
});

app.get('/api/files/:filename', authenticateToken, async (req: AuthRequest, res) => {
  const filename = path.basename(String(req.params.filename));
  const [rows] = await db.query('SELECT uocId,farmPlotId FROM Evidence WHERE fileName = ? LIMIT 1', [filename]);
  const evidence = (rows as any[])[0];
  if (!evidence || !evidence.uocId || !req.user || !(await canAccessUoc(req.user, evidence.uocId))) {
    res.status(404).json({ error: 'Archivo no encontrado.' });
    return;
  }
  const plantationScope = await getPlantationScope(req.user, evidence.uocId);
  if (plantationScope.restricted && (
    !evidence.farmPlotId || !plantationScope.farmPlotIds.includes(evidence.farmPlotId)
  )) {
    res.status(404).json({ error: 'Archivo no encontrado.' });
    return;
  }
  res.sendFile(path.join(uploadsDir, filename));
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'RSPO TECH API running' });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño permitido.' : 'Carga de archivo inválida.' });
    return;
  }
  console.error('Unhandled API error:', error?.message || error);
  res.status(500).json({ error: 'Ocurrió un error interno. Consulte los registros del servidor.' });
});

// Start server
async function main() {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await db.end();
    process.exit(1);
  }
}

main();
