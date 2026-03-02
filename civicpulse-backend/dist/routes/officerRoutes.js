"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const officerController_1 = require("../controllers/officerController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect);
router.use((0, roleMiddleware_1.authorizeRoles)('OFFICER', 'ADMIN')); // Admins can also do officer things
router.get('/ward/issues', officerController_1.getWardIssues);
router.patch('/issues/:id/status', officerController_1.updateIssueStatus);
exports.default = router;
