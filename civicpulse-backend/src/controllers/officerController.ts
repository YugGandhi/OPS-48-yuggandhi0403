import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { IssueStatus } from '@prisma/client';

// @desc    Get issues for the officer's assigned ward
// @route   GET /api/officer/ward/issues
// @access  Private (Officer)
export const getWardIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const officerId = req.user.id;

        // First figure out what ward they belong to
        const officer = await prisma.user.findUnique({
            where: { id: officerId },
            select: { assignedWardId: true }
        });

        if (!officer?.assignedWardId) {
            res.status(400).json({ message: 'Officer is not assigned to any ward' });
            return;
        }

        const issues = await (prisma.issue.findMany as any)({
            where: { wardId: officer.assignedWardId },
            include: {
                reporter: { select: { name: true, email: true } },
                _count: {
                    select: { upvotes: true }
                }
            }
        });

        // Sort by Priority: Severity + Upvote count
        issues.sort((a: any, b: any) => {
            const scoreA = (a.severityScore || 0) + a._count.upvotes;
            const scoreB = (b.severityScore || 0) + b._count.upvotes;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        res.status(200).json(issues);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update issue status
// @route   PATCH /api/officer/issues/:id/status
// @access  Private (Officer)
export const updateIssueStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status, internalNotes } = req.body;

        // Validate enum if status is provided
        if (status && !Object.values(IssueStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid status provided' });
            return;
        }

        // Must check if this issue belongs to the officer's ward
        const issue = await prisma.issue.findUnique({ where: { id } });
        if (!issue) {
            res.status(404).json({ message: 'Issue not found' });
            return;
        }

        if (issue.wardId !== req.user.assignedWardId && req.user.role !== 'ADMIN') {
            res.status(403).json({ message: 'Not authorized to update issues outside assigned ward' });
            return;
        }

        const updatedIssue = await prisma.issue.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(internalNotes !== undefined && { internalNotes })
            }
        });

        // Add Audit Log if status changed
        if (status && issue.status !== status) {
            await (prisma as any).issueAudit.create({
                data: {
                    issueId: id,
                    changedById: req.user.id,
                    previousStatus: issue.status,
                    newStatus: status
                }
            });
        }

        res.status(200).json(updatedIssue);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Bulk Update issue status
// @route   POST /api/officer/issues/bulk-status
// @access  Private (Officer)
export const bulkUpdateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { issueIds, status } = req.body;

        if (!Array.isArray(issueIds) || !Object.values(IssueStatus).includes(status)) {
            res.status(400).json({ message: 'Invalid payload' });
            return;
        }

        const issues = await prisma.issue.findMany({
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
        await prisma.issue.updateMany({
            where: { id: { in: issueIds } },
            data: { status }
        });

        // Add audits
        const audits = issues.map(issue => ({
            issueId: issue.id,
            changedById: req.user.id,
            previousStatus: issue.status,
            newStatus: status as IssueStatus,
        }));

        await (prisma as any).issueAudit.createMany({
            data: audits
        });

        res.status(200).json({ message: 'Issues updated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
