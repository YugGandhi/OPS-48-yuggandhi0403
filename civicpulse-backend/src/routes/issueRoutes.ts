import { Router } from 'express';
import { createIssue, getMyIssues, getIssueById, toggleUpvote, getNearbyIssues, getPublicResolutionLog, submitResolutionFeedback } from '../controllers/issueController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Public route for transparency
router.get('/public/resolutions', getPublicResolutionLog);

router.use(protect); // All other issue routes require authentication

router.route('/')
    .post(createIssue);

router.route('/me')
    .get(getMyIssues);

router.route('/nearby')
    .get(getNearbyIssues);

router.route('/:id')
    .get(getIssueById);

router.route('/:id/upvote')
    .post(toggleUpvote);

router.route('/:id/feedback')
    .post(submitResolutionFeedback);

export default router;
