import { Router } from 'express';
import { getWardIssues, updateIssueStatus, bulkUpdateStatus } from '../controllers/officerController';
import { protect } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(protect);
router.use(authorizeRoles('OFFICER', 'ADMIN')); // Admins can also do officer things

router.get('/ward/issues', getWardIssues);
router.patch('/issues/:id/status', updateIssueStatus);
router.post('/issues/bulk-status', bulkUpdateStatus);

export default router;
