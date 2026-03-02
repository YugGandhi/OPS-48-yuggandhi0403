"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const issueController_1 = require("../controllers/issueController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect); // All issue routes require authentication
router.route('/')
    .post(issueController_1.createIssue);
router.route('/me')
    .get(issueController_1.getMyIssues);
router.route('/:id')
    .get(issueController_1.getIssueById);
exports.default = router;
