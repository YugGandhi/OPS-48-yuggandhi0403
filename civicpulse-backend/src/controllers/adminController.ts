import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/prisma';

// @desc    Get all issues (with filtering)
// @route   GET /api/admin/issues
// @access  Private (Admin, Officer)
export const getAllIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { category, status, wardId } = req.query;

        const whereClause: any = {};
        if (category) whereClause.category = category;
        if (status) whereClause.status = status;
        if (wardId) whereClause.wardId = wardId;

        const issues = await (prisma.issue.findMany as any)({
            where: whereClause,
            include: {
                ward: { select: { name: true } },
                reporter: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(issues);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get Heatmap Data (Basic lat/lng dump for Mapbox)
// @route   GET /api/admin/heatmap
// @access  Private (Admin)
export const getHeatmap = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // For large scale, you would use ST_ClusterDBSCAN or similar PostGIS aggregation via $queryRaw
        // We will start by just extracting lat/lng and intensities based on status/category
        const issues = await prisma.issue.findMany({
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
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get dashboard stats (trend, ward performance)
// @route   GET /api/admin/dashboard/stats
// @access  Private (Admin)
export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentIssues = await prisma.issue.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true, category: true, status: true, wardId: true }
        });

        const wards = await prisma.ward.findMany({
            include: {
                issues: {
                    select: { status: true, createdAt: true, updatedAt: true }
                }
            }
        });

        // Ward Performance: average resolution time
        const wardPerformance = wards.map((ward: any) => {
            const resolvedIssues = ward.issues.filter((i: any) => i.status === 'RESOLVED');
            let totalTime = 0;
            resolvedIssues.forEach((i: any) => {
                totalTime += (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime());
            });
            const avgResolutionTimeHours = resolvedIssues.length > 0 ? (totalTime / resolvedIssues.length) / (1000 * 60 * 60) : 0;

            return {
                wardId: ward.id,
                wardName: ward.name,
                totalIssues: ward.issues.length,
                resolvedCount: resolvedIssues.length,
                avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 10) / 10
            }
        });

        // Daily/Weekly Trend (simple grouping by day)
        const trend: Record<string, number> = {};
        recentIssues.forEach((issue: any) => {
            const date = issue.createdAt.toISOString().split('T')[0];
            trend[date] = (trend[date] || 0) + 1;
        });

        res.status(200).json({ trend, wardPerformance });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get AI Daily Summary of critical issues
// @route   GET /api/admin/dashboard/ai-summary
// @access  Private (Admin)
export const getAiDailySummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const highSeverityIssues = await (prisma.issue.findMany as any)({
            where: { status: { not: 'RESOLVED' }, severityScore: { gte: 4 } },
            orderBy: { severityScore: 'desc' },
            take: 5,
            include: { ward: { select: { name: true } } }
        });

        let summary = "Top Critical Issues Today:\n\n";
        if (highSeverityIssues.length === 0) {
            summary += "No critical issues right now. Great job!";
        } else {
            highSeverityIssues.forEach((i: any) => {
                summary += `- [${i.ward?.name || 'Unassigned'}] ${i.title} (Severity: ${i.severityScore || 'N/A'})\n`;
            });
            summary += "\nPlease route operational teams to the Wards above immediately.";
        }

        res.status(200).json({ summary });
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Get Officer Leaderboard
// @route   GET /api/admin/dashboard/leaderboard
// @access  Private (Admin)
export const getOfficerLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Find officers and their resolved issues via their wards or directly if you assigned issues to them.
        // In our schema, issues are tied to wardId, and officers are tied to assignedWardId.
        const officers = await prisma.user.findMany({
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
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// @desc    Get all wards
// @route   GET /api/admin/wards
// @access  Public/Auth
export const getAllWards = async (req: Request, res: Response): Promise<void> => {
    try {
        const wards = await prisma.ward.findMany();
        res.status(200).json(wards);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a ward
// @route   POST /api/admin/wards
// @access  Private (Admin)
export const createWard = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, city } = req.body;

        // NOTE: If passing a boundary polygon, you would use Prisma's $executeRaw to handle the ST_GeomFromGeoJSON function
        const ward = await prisma.ward.create({
            data: { name, city }
        });

        res.status(201).json(ward);
    } catch (error: any) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
