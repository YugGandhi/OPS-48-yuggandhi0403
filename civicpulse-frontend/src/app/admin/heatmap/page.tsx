"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import Map, { Source, Layer, LayerProps } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_LAT = 23.0225;
const DEFAULT_LNG = 72.5714;

const heatmapLayer: LayerProps = {
    id: 'earthquakes-heat',
    type: 'heatmap',
    source: 'issues-data',
    maxzoom: 15,
    paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 1, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0.5]
    }
};

export default function FullscreenHeatmap() {
    const [heatmapData, setHeatmapData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                const res = await api.get('/admin/heatmap');
                setHeatmapData(res.data);
            } catch (err) {
                console.error("Failed to fetch heatmap data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHeatmap();
    }, []);

    const mapCenter = useMemo(() => {
        if (!heatmapData || heatmapData.features.length === 0) return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
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

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <Link href="/admin" className="inline-flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 mb-2 transition">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                        <MapIcon className="w-8 h-8 mr-3 text-emerald-500" />
                        Fullscreen Density Heatmap
                    </h1>
                </div>
            </div>

            <div className="flex-1 bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 relative shadow-2xl">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-neutral-900/50 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                        <p className="text-emerald-400 font-medium tracking-widest uppercase">Loading GIS Data...</p>
                    </div>
                )}
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
    );
}
