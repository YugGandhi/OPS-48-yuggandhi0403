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

        const issues = await prisma.issue.findMany({
            where: { wardId: officer.assignedWardId },
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: { select: { name: true, email: true } }
            }
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
        const { status } = req.body;

        // Validate enum
        if (!Object.values(IssueStatus).includes(status)) {
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
            data: { status }
        });

        res.status(200).json(updatedIssue);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
