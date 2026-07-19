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
const upload = multer({ storage });

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(uploadsDir));

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

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
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
    url: `/uploads/${req.file.filename}`,
    name: `${req.file.originalname}|${req.file.filename}`,
    size: sizeStr
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Cert-TechCol API running' });
});

// Start server
async function main() {
  try {
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
