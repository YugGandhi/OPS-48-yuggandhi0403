"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const issueController_1 = require("../controllers/issueController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Public route for transparency
router.get('/public/resolutions', issueController_1.getPublicResolutionLog);
router.use(authMiddleware_1.protect); // All other issue routes require authentication
router.route('/')
    .post(issueController_1.createIssue);
router.route('/me')
    .get(issueController_1.getMyIssues);
router.route('/nearby')
    .get(issueController_1.getNearbyIssues);
router.route('/:id')
    .get(issueController_1.getIssueById);
router.route('/:id/upvote')
    .post(issueController_1.toggleUpvote);
exports.default = router;
