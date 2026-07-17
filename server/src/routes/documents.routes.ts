import { Router } from 'express';
import { getDocuments, createDocument } from '../controllers/documents.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas de documentos requieren autenticación
router.use(authenticateToken);

router.get('/', getDocuments);
// Solo Admin o Manager pueden subir documentos
router.post('/', requireRole(['ADMIN', 'MANAGER']), createDocument);

export default router;
