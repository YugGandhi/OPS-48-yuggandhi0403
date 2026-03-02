"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/wards', adminController_1.getAllWards);
// Protected routes
router.use(authMiddleware_1.protect);
router.get('/issues', (0, roleMiddleware_1.authorizeRoles)('ADMIN', 'OFFICER'), adminController_1.getAllIssues);
router.get('/heatmap', (0, roleMiddleware_1.authorizeRoles)('ADMIN'), adminController_1.getHeatmap);
router.post('/wards', (0, roleMiddleware_1.authorizeRoles)('ADMIN'), adminController_1.createWard);
// Dashboard / Analytics
router.get('/dashboard/stats', (0, roleMiddleware_1.authorizeRoles)('ADMIN'), adminController_1.getDashboardStats);
router.get('/dashboard/ai-summary', (0, roleMiddleware_1.authorizeRoles)('ADMIN'), adminController_1.getAiDailySummary);
router.get('/dashboard/leaderboard', (0, roleMiddleware_1.authorizeRoles)('ADMIN'), adminController_1.getOfficerLeaderboard);
exports.default = router;
