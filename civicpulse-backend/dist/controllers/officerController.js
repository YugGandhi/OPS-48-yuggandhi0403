"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateStatus = exports.updateIssueStatus = exports.getWardIssues = void 0;
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
            include: {
                reporter: { select: { name: true, email: true } },
                _count: {
                    select: { upvotes: true }
                }
            }
        });
        // Sort by Priority: Severity + Upvote count
        issues.sort((a, b) => {
            const scoreA = (a.severityScore || 0) + a._count.upvotes;
            const scoreB = (b.severityScore || 0) + b._count.upvotes;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
        const { status, internalNotes } = req.body;
        // Validate enum if status is provided
        if (status && !Object.values(client_1.IssueStatus).includes(status)) {
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
            data: {
                ...(status && { status }),
                ...(internalNotes !== undefined && { internalNotes })
            }
        });
        // Add Audit Log if status changed
        if (status && issue.status !== status) {
            await prisma_1.default.issueAudit.create({
                data: {
                    issueId: id,
                    changedById: req.user.id,
                    previousStatus: issue.status,
                    newStatus: status
                }
            });
        }
        res.status(200).json(updatedIssue);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.updateIssueStatus = updateIssueStatus;
// @desc    Bulk Update issue status
// @route   POST /api/officer/issues/bulk-status
// @access  Private (Officer)
const bulkUpdateStatus = async (req, res) => {
    try {
        const { issueIds, status } = req.body;
        if (!Array.isArray(issueIds) || !Object.values(client_1.IssueStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid payload' });
            return;
        }
        const issues = await prisma_1.default.issue.findMany({
            where: { id: { in: issueIds } }
        });
        // Verify all belong to ward or user is admin
        for (const issue of issues) {
            if (issue.wardId !== req.user.assignedWardId && req.user.role !== 'ADMIN') {
                res.status(403).json({ message: `Not authorized for issue ${issue.id}` });
                return;
            }
        }
        // Update all
        await prisma_1.default.issue.updateMany({
            where: { id: { in: issueIds } },
            data: { status }
        });
        // Add audits
        const audits = issues.map(issue => ({
            issueId: issue.id,
            changedById: req.user.id,
            previousStatus: issue.status,
            newStatus: status,
        }));
        await prisma_1.default.issueAudit.createMany({
            data: audits
        });
        res.status(200).json({ message: 'Issues updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.bulkUpdateStatus = bulkUpdateStatus;
