import { Router } from 'express';
import authRoutes from './authRoutes';
import issueRoutes from './issueRoutes';
import officerRoutes from './officerRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/issues', issueRoutes);
router.use('/officer', officerRoutes);
router.use('/admin', adminRoutes);

export default router;
