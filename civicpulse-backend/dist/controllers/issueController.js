"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicResolutionLog = exports.toggleUpvote = exports.getNearbyIssues = exports.getIssueById = exports.getMyIssues = exports.createIssue = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const aiSummarizer_1 = require("../services/aiSummarizer");
// @desc    Create a new issue
// @route   POST /api/issues
// @access  Private (Citizen)
const createIssue = async (req, res) => {
    try {
        let { title, description, category, latitude, longitude, imageUrls, wardId, isAnonymous, severityScore } = req.body;
        if (!title || !description || !category || !latitude || !longitude) {
            res.status(400).json({ message: 'Please provide all required fields' });
            return;
        }
        // Call AI Summarizer (could be done fully asynchronously in background queue)
        const aiSummary = await (0, aiSummarizer_1.generateActionableSummary)(description);
        // Create Issue via Prisma
        const issue = await prisma_1.default.issue.create({
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
        await prisma_1.default.$executeRaw `UPDATE "Issue" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${issue.id}`;
        res.status(201).json(issue);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.createIssue = createIssue;
// @desc    Get logged in user issues
// @route   GET /api/issues/me
// @access  Private (Citizen)
const getMyIssues = async (req, res) => {
    try {
        const issues = await prisma_1.default.issue.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getMyIssues = getMyIssues;
// @desc    Get issue by ID
// @route   GET /api/issues/:id
// @access  Private
const getIssueById = async (req, res) => {
    try {
        const issue = await prisma_1.default.issue.findUnique({
            where: { id: req.params.id },
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getIssueById = getIssueById;
// @desc    Get nearby issues (radius search)
// @route   GET /api/issues/nearby
// @access  Private (Citizen)
const getNearbyIssues = async (req, res) => {
    try {
        const { lat, lng, radius = 5000 } = req.query; // Radius in meters
        if (!lat || !lng) {
            res.status(400).json({ message: 'Please provide lat and lng' });
            return;
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        // Raw SQL for PostGIS radius search
        const issues = await prisma_1.default.$queryRaw `
            SELECT id, title, description, category, status, latitude, longitude, "createdAt", "isAnonymous", "severityScore",
                   ST_Distance(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) as distance
            FROM "Issue"
            WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radius})
            ORDER BY distance ASC
            LIMIT 50;
        `;
        res.status(200).json(issues);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getNearbyIssues = getNearbyIssues;
// @desc    Upvote/downvote an issue
// @route   POST /api/issues/:id/upvote
// @access  Private
const toggleUpvote = async (req, res) => {
    try {
        const issueId = req.params.id;
        const userId = req.user.id;
        const existingUpvote = await prisma_1.default.upvote.findUnique({
            where: {
                userId_issueId: { userId, issueId }
            }
        });
        if (existingUpvote) {
            // Remove upvote
            await prisma_1.default.upvote.delete({
                where: { id: existingUpvote.id }
            });
            // Return current count using transaction for consistency if needed, but for simplicity:
            res.status(200).json({ message: 'Upvote removed' });
        }
        else {
            // Add upvote
            await prisma_1.default.upvote.create({
                data: { userId, issueId }
            });
            res.status(200).json({ message: 'Upvote added' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.toggleUpvote = toggleUpvote;
// @desc    Get Public Resolution Log
// @route   GET /api/issues/public/resolutions
// @access  Public
const getPublicResolutionLog = async (req, res) => {
    try {
        const resolvedIssues = await prisma_1.default.issueAudit.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getPublicResolutionLog = getPublicResolutionLog;
