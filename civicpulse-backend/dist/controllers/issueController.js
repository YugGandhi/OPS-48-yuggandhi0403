"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIssueById = exports.getMyIssues = exports.createIssue = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const aiSummarizer_1 = require("../services/aiSummarizer");
// @desc    Create a new issue
// @route   POST /api/issues
// @access  Private (Citizen)
const createIssue = async (req, res) => {
    try {
        const { title, description, category, latitude, longitude, imageUrls, wardId } = req.body;
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getIssueById = getIssueById;
