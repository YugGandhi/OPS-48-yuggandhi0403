import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { generateActionableSummary } from '../services/aiSummarizer';

// @desc    Create a new issue
// @route   POST /api/issues
// @access  Private (Citizen)
export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, description, category, latitude, longitude, imageUrls, wardId } = req.body;

        if (!title || !description || !category || !latitude || !longitude) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }

        // Call AI Summarizer (could be done fully asynchronously in background queue)
        const aiSummary = await generateActionableSummary(description);

        // Create Issue via Prisma
        const issue = await prisma.issue.create({
            data: {
                title,
                description,
                category,
                latitude,
                longitude,
                imageUrls: imageUrls || [],
                aiSummary,
                reporterId: req.user.id,
                wardId: wardId || null,
            },
        });

        // Update PostGIS geometry point
        await prisma.$executeRaw`UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${issue.id}`;

        res.status(201).json(issue);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get logged in user issues
// @route   GET /api/issues/me
// @access  Private (Citizen)
export const getMyIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const issues = await prisma.issue.findMany({
            where: { reporterId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                ward: { select: { name: true } },
            }
        });
        res.status(200).json(issues);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get issue by ID
// @route   GET /api/issues/:id
// @access  Private
export const getIssueById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const issue = await prisma.issue.findUnique({
            where: { id: req.params.id as string },
            include: {
                reporter: { select: { name: true, email: true } },
                ward: { select: { name: true } }
            }
        });

        if (!issue) {
            res.status(404).json({ message: 'Issue not found' });
            return;
        }

        // Citizens can only view their own issues, officers/admins can view any
        if (issue.reporterId !== req.user.id && req.user.role === 'CITIZEN') {
            res.status(403).json({ message: 'Not authorized to view this issue' });
            return;
        }

        res.status(200).json(issue);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
