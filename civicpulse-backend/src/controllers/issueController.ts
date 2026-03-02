import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';
import { generateActionableSummary } from '../services/aiSummarizer';

// @desc    Create a new issue
// @route   POST /api/issues
// @access  Private (Citizen)
export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let { title, description, category, latitude, longitude, imageUrls, wardId, isAnonymous, severityScore } = req.body;

        if (!title || !description || !category || !latitude || !longitude) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }

        // Call AI Summarizer (could be done fully asynchronously in background queue)
        const aiSummary = await generateActionableSummary(description);

        // Create Issue via Prisma
        const issue = await (prisma.issue as any).create({
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
                isAnonymous: isAnonymous || false,
                severityScore: severityScore || null,
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
        const issues = await (prisma.issue.findMany as any)({
            where: { reporterId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                ward: { select: { name: true } },
                _count: {
                    select: { upvotes: true }
                }
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
        const issue = await (prisma.issue.findUnique as any)({
            where: { id: req.params.id as string },
            include: {
                reporter: { select: { name: true, email: true } },
                ward: { select: { name: true } },
                _count: {
                    select: { upvotes: true }
                }
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

        // If it's anonymous, don't return the reporter
        if (issue.isAnonymous && issue.reporterId !== req.user.id && req.user.role === 'CITIZEN') {
            const { reporter, reporterId, ...anonymousIssue } = issue;
            res.status(200).json(anonymousIssue);
            return;
        }

        res.status(200).json(issue);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get nearby issues (radius search)
// @route   GET /api/issues/nearby
// @access  Private (Citizen)
export const getNearbyIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // Radius in meters

        if (!lat || !lng) {
            res.status(400).json({ message: 'Please provide lat and lng' });
            return;
        }

        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        const radiusInMeters = parseFloat(radius as string);

        // Raw SQL for PostGIS radius search
        const issues = await prisma.$queryRaw`
            SELECT id, title, description, category, status, latitude, longitude, "createdAt", "isAnonymous", "severityScore",
                   ST_Distance(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) as distance
            FROM "Issue"
            WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusInMeters})
            ORDER BY distance ASC
            LIMIT 50;
        `;

        res.status(200).json(issues);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// @desc    Upvote/downvote an issue
// @route   POST /api/issues/:id/upvote
// @access  Private
export const toggleUpvote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const issueId = req.params.id as string;
        const userId = req.user.id;

        const existingUpvote = await (prisma as any).upvote.findUnique({
            where: {
                userId_issueId: { userId, issueId }
            }
        });

        if (existingUpvote) {
            // Remove upvote
            await (prisma as any).upvote.delete({
                where: { id: existingUpvote.id }
            });
            // Return current count using transaction for consistency if needed, but for simplicity:
            res.status(200).json({ message: 'Upvote removed' });
        } else {
            // Add upvote
            await (prisma as any).upvote.create({
                data: { userId, issueId }
            });
            res.status(200).json({ message: 'Upvote added' });
        }
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// @desc    Get Public Resolution Log
// @route   GET /api/issues/public/resolutions
// @access  Public
export const getPublicResolutionLog = async (req: Request, res: Response): Promise<void> => {
    try {
        const resolvedIssues = await (prisma as any).issueAudit.findMany({
            where: { newStatus: 'RESOLVED' },
            orderBy: { timestamp: 'desc' },
            take: 20,
            include: {
                issue: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        ward: { select: { name: true } },
                    }
                }
            }
        });

        res.status(200).json(resolvedIssues);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// @desc    Submit Resolution Feedback
// @route   POST /api/issues/:id/feedback
// @access  Private (Citizen)
export const submitResolutionFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const issueId = req.params.id as string;
        const { rating } = req.body;
        const userId = req.user.id;

        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
            return;
        }

        const issue = await (prisma.issue.findUnique as any)({
            where: { id: issueId }
        });

        if (!issue) {
            res.status(404).json({ message: 'Issue not found' });
            return;
        }

        if (issue.reporterId !== userId) {
            res.status(403).json({ message: 'Not authorized to rate this issue' });
            return;
        }

        if (issue.status !== 'RESOLVED') {
            res.status(400).json({ message: 'Can only rate resolved issues' });
            return;
        }

        const updatedIssue = await (prisma.issue.update as any)({
            where: { id: issueId },
            data: { resolutionRating: rating }
        });

        res.status(200).json(updatedIssue);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}
