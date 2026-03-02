"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateIssueStatus = exports.getWardIssues = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
// @desc    Get issues for the officer's assigned ward
// @route   GET /api/officer/ward/issues
// @access  Private (Officer)
const getWardIssues = async (req, res) => {
    try {
        const officerId = req.user.id;
        // First figure out what ward they belong to
        const officer = await prisma_1.default.user.findUnique({
            where: { id: officerId },
            select: { assignedWardId: true }
        });
        if (!officer?.assignedWardId) {
            res.status(400).json({ message: 'Officer is not assigned to any ward' });
            return;
        }
        const issues = await prisma_1.default.issue.findMany({
            where: { wardId: officer.assignedWardId },
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: { select: { name: true, email: true } }
            }
        });
        res.status(200).json(issues);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getWardIssues = getWardIssues;
// @desc    Update issue status
// @route   PATCH /api/officer/issues/:id/status
// @access  Private (Officer)
const updateIssueStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;
        // Validate enum
        if (!Object.values(client_1.IssueStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid status provided' });
            return;
        }
        // Must check if this issue belongs to the officer's ward
        const issue = await prisma_1.default.issue.findUnique({ where: { id } });
        if (!issue) {
            res.status(404).json({ message: 'Issue not found' });
            return;
        }
        if (issue.wardId !== req.user.assignedWardId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Not authorized to update issues outside assigned ward' });
            return;
        }
        const updatedIssue = await prisma_1.default.issue.update({
            where: { id },
            data: { status }
        });
        res.status(200).json(updatedIssue);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.updateIssueStatus = updateIssueStatus;
