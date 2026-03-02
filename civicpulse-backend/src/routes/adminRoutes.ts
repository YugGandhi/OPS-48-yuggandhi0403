import { Router } from 'express';
import { getAllIssues, getHeatmap, getAllWards, createWard } from '../controllers/adminController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

// Public routes
router.get('/wards', getAllWards);

// Protected routes
router.use(protect);

router.get('/issues', authorizeRoles('ADMIN', 'OFFICER'), getAllIssues);
router.get('/heatmap', authorizeRoles('ADMIN'), getHeatmap);
router.post('/wards', authorizeRoles('ADMIN'), createWard);

export default router;
