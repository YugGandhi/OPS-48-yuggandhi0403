"use client";

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Navigation, Clock, AlertTriangle, CheckCircle, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

interface NearbyIssue {
    id: string;
    title: string;
    category: string;
    status: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    isAnonymous: boolean;
    severityScore: number | null;
    distance: number;
}

const DEFAULT_LAT = 23.0225;
const DEFAULT_LNG = 72.5714;

export default function NearbyIssuesPage() {
    const [issues, setIssues] = useState<NearbyIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    const [selectedIssue, setSelectedIssue] = useState<NearbyIssue | null>(null);
    const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Try to get user's actual location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    fetchNearbyIssues(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Geolocation denied or failed, using default location.");
                    fetchNearbyIssues(DEFAULT_LAT, DEFAULT_LNG);
                }
            );
        } else {
            fetchNearbyIssues(DEFAULT_LAT, DEFAULT_LNG);
        }
    }, []);

    const fetchNearbyIssues = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const res = await api.get(`/issues/nearby?lat=${lat}&lng=${lng}&radius=5000`);
            setIssues(res.data);
        } catch (error) {
            console.error("Failed to fetch nearby issues", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async (issueId: string) => {
        // Optimistic UI update
        setUpvotedIds(prev => {
            const next = new Set(prev);
            if (next.has(issueId)) {
                next.delete(issueId);
            } else {
                next.add(issueId);
            }
            return next;
        });

        try {
            await api.post(`/issues/${issueId}/upvote`);
        } catch (error) {
            console.error("Failed to upvote", error);
            // Revert on failure
            setUpvotedIds(prev => {
                const next = new Set(prev);
                if (next.has(issueId)) next.delete(issueId);
                else next.add(issueId);
                return next;
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REPORTED': return 'text-amber-500';
            case 'IN_PROGRESS': return 'text-blue-500';
            case 'RESOLVED': return 'text-emerald-500';
            default: return 'text-neutral-500';
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">Issues Near Me</h1>
                <p className="text-neutral-400 mt-1">Discover and support civic reports within a 5km radius of your location.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Map View */}
                <div className="lg:col-span-2 rounded-xl overflow-hidden border border-neutral-700 relative h-[400px] lg:h-full">
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-neutral-900/50 flex items-center justify-center backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    )}
                    <Map
                        initialViewState={{
                            longitude: userLocation.lng,
                            latitude: userLocation.lat,
                            zoom: 13
                        }}
                        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                    >
                        {/* User Location Marker */}
                        <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
                            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse"></div>
                        </Marker>

                        {/* Issue Markers */}
                        {issues.map(issue => (
                            <Marker
                                key={issue.id}
                                longitude={issue.longitude}
                                latitude={issue.latitude}
                                anchor="bottom"
                                onClick={e => {
                                    e.originalEvent.stopPropagation();
                                    setSelectedIssue(issue);
                                }}
                            >
                                <MapPin className={`w-6 h-6 cursor-pointer drop-shadow-md transition-transform hover:scale-110 ${getStatusColor(issue.status)}`} />
                            </Marker>
                        ))}

                        {/* Active Issue Popup */}
                        {selectedIssue && (
                            <Popup
                                longitude={selectedIssue.longitude}
                                latitude={selectedIssue.latitude}
                                anchor="top"
                                onClose={() => setSelectedIssue(null)}
                                className="citizen-popup"
                                closeButton={false}
                            >
                                <div className="p-3 min-w-[200px] max-w-[250px]">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{selectedIssue.category}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${selectedIssue.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {selectedIssue.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-neutral-800 mb-1 leading-tight">{selectedIssue.title}</h3>
                                    <div className="text-xs text-neutral-500 mb-3 flex items-center">
                                        <Navigation className="w-3 h-3 mr-1" />
                                        {~~selectedIssue.distance} meters away
                                    </div>
                                    <button
                                        onClick={() => handleUpvote(selectedIssue.id)}
                                        className={`w-full text-xs font-semibold py-1.5 rounded transition-colors flex items-center justify-center ${upvotedIds.has(selectedIssue.id)
                                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                            }`}
                                    >
                                        <ThumbsUp
                                            className={`w-3 h-3 mr-1.5 ${upvotedIds.has(selectedIssue.id) ? 'fill-current' : ''}`}
                                        />
                                        {upvotedIds.has(selectedIssue.id) ? 'Supported' : 'Support Issue'}
                                    </button>
                                </div>
                            </Popup>
                        )}
                    </Map>
                </div>

                {/* List View */}
                <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4 overflow-y-auto hidden lg:block custom-scrollbar">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center sticky top-0 bg-neutral-800 pb-2 z-10 border-b border-neutral-700">
                        <MapPin className="w-5 h-5 mr-2 text-emerald-500" />
                        Nearby Reports ({issues.length})
                    </h2>

                    {issues.length === 0 && !loading ? (
                        <div className="text-center py-10 text-neutral-500 text-sm">
                            No issues found within 5km.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {issues.map(issue => (
                                <div
                                    key={issue.id}
                                    className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedIssue?.id === issue.id ? 'bg-neutral-700/50 border-emerald-500/50' : 'bg-neutral-900/30 border-neutral-700 hover:border-neutral-600'}`}
                                    onClick={() => setSelectedIssue(issue)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold text-neutral-400 capitalize">{issue.category.toLowerCase()}</span>
                                        <span className="text-xs font-mono text-neutral-500">{~~issue.distance}m</span>
                                    </div>
                                    <h3 className="text-sm font-medium text-white mb-2 leading-snug break-words">
                                        {issue.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="text-[10px] text-neutral-500 flex items-center tracking-wide">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpvote(issue.id); }}
                                            className={`text-xs font-medium flex items-center px-2 py-1 rounded transition-colors ${upvotedIds.has(issue.id)
                                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                    : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                }`}
                                        >
                                            <ThumbsUp
                                                className={`w-3 h-3 mr-1 ${upvotedIds.has(issue.id) ? 'fill-current' : ''}`}
                                            />
                                            {upvotedIds.has(issue.id) ? 'Supported' : 'Upvote'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Global Styles for Map Popup to override white background text visibility */}
            <style jsx global>{`
                .citizen-popup .maplibregl-popup-content {
                    background-color: white;
                    border-radius: 8px;
                    padding: 0;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                .citizen-popup .maplibregl-popup-tip {
                    border-top-color: white;
                }
            `}</style>
        </div>
    );
}
