import { Router } from 'express';
import { getWardIssues, updateIssueStatus } from '../controllers/officerController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(protect);
router.use(authorizeRoles('OFFICER', 'ADMIN')); // Admins can also do officer things

router.get('/ward/issues', getWardIssues);
router.patch('/issues/:id/status', updateIssueStatus);

export default router;
