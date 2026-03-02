"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_1 = __importDefault(require("./authRoutes"));
const issueRoutes_1 = __importDefault(require("./issueRoutes"));
const officerRoutes_1 = __importDefault(require("./officerRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.use('/auth', authRoutes_1.default);
router.use('/issues', issueRoutes_1.default);
router.use('/officer', officerRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
exports.default = router;
