"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWard = exports.getAllWards = exports.getOfficerLeaderboard = exports.getAiDailySummary = exports.getDashboardStats = exports.getHeatmap = exports.getAllIssues = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// @desc    Get all issues (with filtering)
// @route   GET /api/admin/issues
// @access  Private (Admin, Officer)
const getAllIssues = async (req, res) => {
    try {
        const { category, status, wardId } = req.query;
        const whereClause = {};
        if (category)
            whereClause.category = category;
        if (status)
            whereClause.status = status;
        if (wardId)
            whereClause.wardId = wardId;
        const issues = await prisma_1.default.issue.findMany({
            where: whereClause,
            include: {
                ward: { select: { name: true } },
                reporter: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(issues);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getAllIssues = getAllIssues;
// @desc    Get Heatmap Data (Basic lat/lng dump for Mapbox)
// @route   GET /api/admin/heatmap
// @access  Private (Admin)
const getHeatmap = async (req, res) => {
    try {
        // For large scale, you would use ST_ClusterDBSCAN or similar PostGIS aggregation via $queryRaw
        // We will start by just extracting lat/lng and intensities based on status/category
        const issues = await prisma_1.default.issue.findMany({
            select: {
                id: true,
                latitude: true,
                longitude: true,
                status: true,
                category: true
            }
        });
        // Formatting as basic GeoJSON
        const featureCollection = {
            type: "FeatureCollection",
            features: issues.map(i => ({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [i.longitude, i.latitude]
                },
                properties: {
                    id: i.id,
                    status: i.status,
                    category: i.category,
                    // Arbitrary "weight" based on status for heatmap density
                    weight: i.status === 'REPORTED' ? 1.0 : (i.status === 'IN_PROGRESS' ? 0.5 : 0.1)
                }
            }))
        };
        res.status(200).json(featureCollection);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getHeatmap = getHeatmap;
// @desc    Get dashboard stats (trend, ward performance)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentIssues = await prisma_1.default.issue.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true, category: true, status: true, wardId: true }
        });
        const wards = await prisma_1.default.ward.findMany({
            include: {
                issues: {
                    select: { status: true, createdAt: true, updatedAt: true }
                }
            }
        });
        // Ward Performance: average resolution time
        const wardPerformance = wards.map((ward) => {
            const resolvedIssues = ward.issues.filter((i) => i.status === 'RESOLVED');
            let totalTime = 0;
            resolvedIssues.forEach((i) => {
                totalTime += (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime());
            });
            const avgResolutionTimeHours = resolvedIssues.length > 0 ? (totalTime / resolvedIssues.length) / (1000 * 60 * 60) : 0;
            return {
                wardId: ward.id,
                wardName: ward.name,
                totalIssues: ward.issues.length,
                resolvedCount: resolvedIssues.length,
                avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10
            };
        });
        // Daily/Weekly Trend (simple grouping by day)
        const trend = {};
        recentIssues.forEach((issue) => {
            const date = issue.createdAt.toISOString().split('T')[0];
            trend[date] = (trend[date] || 0) + 1;
        });
        res.status(200).json({ trend, wardPerformance });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
// @desc    Get AI Daily Summary of critical issues
// @route   GET /api/admin/dashboard/ai-summary
// @access  Private (Admin)
const getAiDailySummary = async (req, res) => {
    try {
        const highSeverityIssues = await prisma_1.default.issue.findMany({
            where: { status: { not: 'RESOLVED' }, severityScore: { gte: 4 } },
            orderBy: { severityScore: 'desc' },
            take: 5,
            include: { ward: { select: { name: true } } }
        });
        let summary = "Top Critical Issues Today:\n\n";
        if (highSeverityIssues.length === 0) {
            summary += "No critical issues right now. Great job!";
        }
        else {
            highSeverityIssues.forEach((i) => {
                summary += `- [${i.ward?.name || 'Unassigned'}] ${i.title} (Severity: ${i.severityScore || 'N/A'})\n`;
            });
            summary += "\nPlease route operational teams to the Wards above immediately.";
        }
        res.status(200).json({ summary });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getAiDailySummary = getAiDailySummary;
// @desc    Get Officer Leaderboard
// @route   GET /api/admin/dashboard/leaderboard
// @access  Private (Admin)
const getOfficerLeaderboard = async (req, res) => {
    try {
        // Find officers and their resolved issues via their wards or directly if you assigned issues to them.
        // In our schema, issues are tied to wardId, and officers are tied to assignedWardId.
        const officers = await prisma_1.default.user.findMany({
            where: { role: 'OFFICER' },
            include: {
                assignedWard: {
                    include: {
                        issues: {
                            where: { status: 'RESOLVED' }
                        }
                    }
                }
            }
        });
        const leaderboard = officers.map(officer => {
            const resolvedCount = officer.assignedWard?.issues.length || 0;
            return {
                officerId: officer.id,
                officerName: officer.name,
                wardName: officer.assignedWard?.name || 'None',
                resolvedCount
            };
        }).sort((a, b) => b.resolvedCount - a.resolvedCount);
        res.status(200).json(leaderboard);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getOfficerLeaderboard = getOfficerLeaderboard;
// @desc    Get all wards
// @route   GET /api/admin/wards
// @access  Public/Auth
const getAllWards = async (req, res) => {
    try {
        const wards = await prisma_1.default.ward.findMany();
        res.status(200).json(wards);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.getAllWards = getAllWards;
// @desc    Create a ward
// @route   POST /api/admin/wards
// @access  Private (Admin)
const createWard = async (req, res) => {
    try {
        const { name, city } = req.body;
        // NOTE: If passing a boundary polygon, you would use Prisma's $executeRaw to handle the ST_GeomFromGeoJSON function
        const ward = await prisma_1.default.ward.create({
            data: { name, city }
        });
        res.status(201).json(ward);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
exports.createWard = createWard;
