"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWard = exports.getAllWards = exports.getHeatmap = exports.getAllIssues = void 0;
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
                ward: { select: { name: true } }
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
