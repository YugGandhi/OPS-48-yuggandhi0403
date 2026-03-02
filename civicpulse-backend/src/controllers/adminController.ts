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

        const issues = await prisma.issue.findMany({
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
