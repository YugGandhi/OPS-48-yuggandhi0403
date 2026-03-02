"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import Map, { Source, Layer, LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity, Map as MapIcon, BarChart3, AlertTriangle, CheckCircle, Clock, Trophy } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_LAT = 23.0225;
const DEFAULT_LNG = 72.5714;

const heatmapLayer: LayerProps = {
    id: 'earthquakes-heat',
    type: 'heatmap',
    source: 'issues-data',
    maxzoom: 15,
    paint: {
        // Increase the heatmap weight based on frequency and property magnitude
        'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 0,
            1, 1
        ],
        // Increase the heatmap color weight weight by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3
        ],
        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
        // Begin color ramp at 0-stop with a 0-transparancy color
        // to create a blur-like effect.
        'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            15, 20
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            15, 0.5
        ]
    }
};

export default function AdminDashboard() {
    const [heatmapData, setHeatmapData] = useState<any>(null);
    const [statsData, setStatsData] = useState<any>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [allIssues, setAllIssues] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, reported: 0, inProgress: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [heatmapRes, issuesRes, statsRes, aiRes] = await Promise.all([
                    api.get('/admin/heatmap'),
                    api.get('/admin/issues'),
                    api.get('/admin/dashboard/stats'),
                    api.get('/admin/dashboard/ai-summary')
                ]);

                setHeatmapData(heatmapRes.data);
                setStatsData(statsRes.data);
                setAiSummary(aiRes.data.summary);

                // Calculate basic stats
                const allIssuesData: any[] = issuesRes.data;
                setAllIssues(allIssuesData);
                setStats({
                    total: allIssuesData.length,
                    reported: allIssuesData.filter(i => i.status === 'REPORTED').length,
                    inProgress: allIssuesData.filter(i => i.status === 'IN_PROGRESS').length,
                    resolved: allIssuesData.filter(i => i.status === 'RESOLVED').length,
                });

            } catch (err) {
                console.error("Failed to fetch admin data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const mapCenter = useMemo(() => {
        if (!heatmapData || heatmapData.features.length === 0) return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };

        // Auto-center map based on average of feature points
        let latSum = 0;
        let lngSum = 0;
        heatmapData.features.forEach((f: any) => {
            lngSum += f.geometry.coordinates[0];
            latSum += f.geometry.coordinates[1];
        });
        return {
            latitude: latSum / heatmapData.features.length,
            longitude: lngSum / heatmapData.features.length
        };
    }, [heatmapData]);

    const handleExportCSV = () => {
        if (allIssues.length === 0) return alert("No issues to export!");

        const headers = [
            "Incident ID",
            "Report Timestamp",
            "Category",
            "Status",
            "Severity / AI Summary",
            "Incident Title",
            "Detailed Description",
            "Ward / Zone",
            "Latitude",
            "Longitude",
            "Reporter Name",
            "Reporter Email"
        ];

        const escapeCSV = (str: string | undefined | null) => {
            if (!str) return '""';
            return `"${str.toString().replace(/"/g, '""')}"`;
        };

        const formatDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return `${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN')}`;
        };

        const csvRows = [headers.join(",")];

        for (const issue of allIssues) {
            const row = [
                escapeCSV(issue.id),
                escapeCSV(formatDate(issue.createdAt)),
                escapeCSV(issue.category),
                escapeCSV(issue.status),
                escapeCSV(issue.aiSummary),
                escapeCSV(issue.title),
                escapeCSV(issue.description),
                escapeCSV(issue.ward?.name || 'Unassigned'),
                issue.latitude,
                issue.longitude,
                escapeCSV(issue.reporter?.name),
                escapeCSV(issue.reporter?.email)
            ];
            csvRows.push(row.join(","));
        }

        const blob = new Blob([csvRows.join("\\n")], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("download", `civicpulse_incidents_${new Date().toISOString().split('T')[0]}.csv`);
        a.click();
    };

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-6rem)]">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">City Analytics Overview</h1>
                    <p className="text-neutral-400 mt-1">Global view of all municipal issues and density heatmaps.</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/admin/leaderboard"
                        className="inline-flex items-center px-4 py-2 border border-neutral-600 rounded-lg shadow-sm text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 focus:ring-offset-neutral-900 transition-colors"
                    >
                        <Trophy className="mr-2 -ml-1 h-5 w-5 text-amber-500" aria-hidden="true" />
                        Officer Leaderboard
                    </Link>
                    <Link
                        href="/admin/heatmap"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-neutral-900 transition-colors"
                    >
                        <MapIcon className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
                        Expand Heatmap View
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 flex items-center shadow-lg">
                    <div className="bg-neutral-700/50 p-3 rounded-lg mr-4">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Total Issues</p>
                        {loading ? <div className="h-6 w-12 bg-neutral-700 rounded animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{stats.total}</p>}
                    </div>
                </div>

                <div className="bg-neutral-800 rounded-xl p-5 border border-amber-500/20 flex items-center shadow-lg">
                    <div className="bg-amber-500/10 p-3 rounded-lg mr-4 border border-amber-500/20">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Reported</p>
                        {loading ? <div className="h-6 w-12 bg-neutral-700 rounded animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-amber-500">{stats.reported}</p>}
                    </div>
                </div>

                <div className="bg-neutral-800 rounded-xl p-5 border border-blue-500/20 flex items-center shadow-lg">
                    <div className="bg-blue-500/10 p-3 rounded-lg mr-4 border border-blue-500/20">
                        <Clock className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">In Progress</p>
                        {loading ? <div className="h-6 w-12 bg-neutral-700 rounded animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>}
                    </div>
                </div>

                <div className="bg-neutral-800 rounded-xl p-5 border border-emerald-500/20 flex items-center shadow-lg">
                    <div className="bg-emerald-500/10 p-3 rounded-lg mr-4 border border-emerald-500/20">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Resolved</p>
                        {loading ? <div className="h-6 w-12 bg-neutral-700 rounded animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-emerald-500">{stats.resolved}</p>}
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

                {/* Main Map View */}
                <div className="lg:col-span-3 bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 relative shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex justify-between items-center z-10 relative">
                        <h3 className="text-lg font-bold text-white flex items-center">
                            <MapIcon className="w-5 h-5 mr-2 text-emerald-500" />
                            Live Heatmap
                        </h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20">Density View</span>
                    </div>
                    <div className="flex-1 relative">
                        {heatmapData && (
                            <Map
                                initialViewState={{
                                    longitude: mapCenter.longitude,
                                    latitude: mapCenter.latitude,
                                    zoom: 12
                                }}
                                mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                            >
                                <Source id="issues-data" type="geojson" data={heatmapData}>
                                    <Layer {...heatmapLayer} />
                                </Source>
                            </Map>
                        )}
                    </div>
                </div>

                {/* Analytics & Controls Panel */}
                <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex flex-col shadow-xl">
                    <div className="p-4 border-b border-neutral-700 bg-neutral-900/50">
                        <h3 className="text-lg font-bold text-white flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-emerald-500" />
                            Metrics
                        </h3>
                    </div>
                    <div className="p-4 flex-1">
                        <p className="text-sm text-neutral-400 mb-6">
                            The heatmap aggregates the geographical density of open issues across the city using PostGIS coordinate plotting. Red zones denote critical infrastructure load.
                        </p>

                        {/* Ward Performance rendering */}
                        {statsData?.wardPerformance && statsData.wardPerformance.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Ward Performance (Avg Resolution Time)</h4>
                                <div className="space-y-2">
                                    {statsData.wardPerformance.slice(0, 3).map((ward: any) => (
                                        <div key={ward.wardId} className="flex justify-between items-center bg-neutral-900/50 p-2 rounded text-xs border border-neutral-700">
                                            <span className="text-neutral-300 truncate w-32">{ward.wardName}</span>
                                            <span className={`font-mono font-bold ${ward.avgResolutionTimeHours > 48 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {ward.avgResolutionTimeHours.toFixed(1)} hrs
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* AI Summary rendering */}
                        {aiSummary && (
                            <div className="mt-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2 flex items-center">
                                    ✨ AI Daily Critical Summary
                                </h4>
                                <div className="text-xs text-neutral-300 whitespace-pre-wrap">
                                    {aiSummary}
                                </div>
                            </div>
                        )}

                        <button onClick={handleExportCSV} className="w-full mt-8 py-2.5 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-lg text-sm font-medium text-white transition-colors">
                            Export CSV Report
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
