import { Router } from 'express';
import { getAllIssues, getHeatmap, getAllWards, createWard, getDashboardStats, getAiDailySummary, getOfficerLeaderboard } from '../controllers/adminController';
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

// Dashboard / Analytics
router.get('/dashboard/stats', authorizeRoles('ADMIN'), getDashboardStats);
router.get('/dashboard/ai-summary', authorizeRoles('ADMIN'), getAiDailySummary);
router.get('/dashboard/leaderboard', authorizeRoles('ADMIN'), getOfficerLeaderboard);

export default router;
