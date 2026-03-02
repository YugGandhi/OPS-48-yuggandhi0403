import { Router } from 'express';
import { createIssue, getMyIssues, getIssueById } from '../controllers/issueController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect); // All issue routes require authentication

router.route('/')
    .post(createIssue);

router.route('/me')
    .get(getMyIssues);

router.route('/:id')
    .get(getIssueById);

export default router;
