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
exports.default = router;
