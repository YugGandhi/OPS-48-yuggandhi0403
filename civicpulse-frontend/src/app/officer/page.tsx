"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react';

interface Issue {
    id: string;
    title: string;
    description: string;
    category: string;
    status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    latitude: number;
    longitude: number;
    aiSummary: string | null;
    createdAt: string;
    reporter: { name: string; email: string };
    severityScore: number | null;
    internalNotes: string | null;
    _count: { upvotes: number };
}

const DEFAULT_LAT = 23.0225;
const DEFAULT_LNG = 72.5714;

export default function OfficerDashboard() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
    const [internalNote, setInternalNote] = useState('');
    const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

    // Sorting state
    const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'oldest'>('priority');
    const fetchIssues = async () => {
        try {
            const res = await api.get('/officer/ward/issues');
            setIssues(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/officer/issues/${id}/status`, { status: newStatus, internalNotes: internalNote });
            // Update local state to reflect change quickly
            setIssues(prev => prev.map(i => i.id === id ? { ...i, status: newStatus as any, internalNotes: internalNote } : i));
            if (selectedIssue && selectedIssue.id === id) {
                setSelectedIssue({ ...selectedIssue, status: newStatus as any, internalNotes: internalNote });
            }
            setInternalNote('');
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update status");
        }
    };

    const handleBulkUpdate = async (newStatus: string) => {
        if (selectedIssues.size === 0) return;
        try {
            await api.post(`/officer/issues/bulk-status`, {
                issueIds: Array.from(selectedIssues),
                status: newStatus
            });
            // Reflect changes locally
            setIssues(prev => prev.map(i => selectedIssues.has(i.id) ? { ...i, status: newStatus as any } : i));
            setSelectedIssues(new Set());
        } catch (err) {
            console.error("Failed bulk update", err);
            alert("Failed bulk update");
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIssues);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIssues(newSet);
    };

    const sortedIssues = useMemo(() => {
        let sorted = [...issues];
        if (sortBy === 'priority') {
            // Backend already sorts by priority, but we enforce it here if state updates
            sorted.sort((a, b) => {
                const scoreA = (a.severityScore || 0) + a._count.upvotes;
                const scoreB = (b.severityScore || 0) + b._count.upvotes;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        } else if (sortBy === 'newest') {
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sortBy === 'oldest') {
            sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
        return sorted;
    }, [issues, sortBy]);

    const calculateSLA = (createdAt: string, status: string) => {
        if (status === 'RESOLVED' || status === 'REJECTED') return null;
        const daysOpen = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOpen > 3) return <span className="text-red-500 font-bold ml-2">SLA BREACHED ({daysOpen} days)</span>;
        if (daysOpen > 1) return <span className="text-amber-500 font-bold ml-2">SLA Warning ({daysOpen} days)</span>;
        return <span className="text-emerald-500 font-bold ml-2">On Track ({daysOpen} days)</span>;
    };

    const getStatusColorClass = (status: string) => {
        if (status === 'REPORTED') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (status === 'IN_PROGRESS') return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        if (status === 'RESOLVED') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    };

    const mapCenter = useMemo(() => {
        if (issues.length === 0) return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
        const avgLat = issues.reduce((acc, i) => acc + i.latitude, 0) / issues.length;
        const avgLng = issues.reduce((acc, i) => acc + i.longitude, 0) / issues.length;
        return { latitude: avgLat, longitude: avgLng };
    }, [issues]);

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-6rem)]">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">Ward Operations</h1>
                <p className="text-neutral-400 mt-1">Manage and resolve reported issues in your assigned ward.</p>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

                {/* Map View */}
                <div className="lg:col-span-2 bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 relative">
                    {!loading && (
                        <Map
                            initialViewState={{
                                longitude: mapCenter.longitude,
                                latitude: mapCenter.latitude,
                                zoom: 12
                            }}
                            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                        >
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
                                    <MapPin className={`w-8 h-8 cursor-pointer drop-shadow-md transition-transform hover:scale-110 ${issue.status === 'RESOLVED' ? 'text-emerald-500' : issue.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-amber-500'}`} />
                                </Marker>
                            ))}

                            {selectedIssue && (
                                <Popup
                                    anchor="top"
                                    longitude={selectedIssue.longitude}
                                    latitude={selectedIssue.latitude}
                                    onClose={() => setSelectedIssue(null)}
                                    closeButton={true}
                                    closeOnClick={false}
                                    className="civilpulse-popup bg-neutral-800 rounded-lg overflow-hidden border-0"
                                    style={{ maxWidth: '300px' }}
                                >
                                    <div className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white shadow-xl">
                                        <div className="flex justify-between items-start mb-2 pr-4">
                                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{selectedIssue.category}</span>
                                        </div>
                                        <h3 className="font-bold text-base mb-2">{selectedIssue.title}</h3>

                                        {selectedIssue.aiSummary && (
                                            <div className="mb-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-neutral-300">
                                                <span className="text-emerald-400 font-semibold block mb-0.5">AI Summary</span>
                                                {selectedIssue.aiSummary}
                                            </div>
                                        )}

                                        <div className="text-xs text-neutral-400 flex flex-col gap-1 mb-3">
                                            <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {selectedIssue.reporter.name}</span>
                                            {calculateSLA(selectedIssue.createdAt, selectedIssue.status)}
                                            {selectedIssue.severityScore !== null && <span className="text-amber-400 font-bold">Severity: {selectedIssue.severityScore}/10</span>}
                                        </div>

                                        {/* Internal Notes Input */}
                                        {selectedIssue.status !== 'RESOLVED' && selectedIssue.status !== 'REJECTED' && (
                                            <textarea
                                                className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-xs mb-3 text-white focus:outline-none focus:border-emerald-500"
                                                placeholder="Add internal notes (hidden from citizen)..."
                                                value={internalNote}
                                                onChange={(e) => setInternalNote(e.target.value)}
                                            />
                                        )}
                                        {selectedIssue.internalNotes && selectedIssue.status === 'RESOLVED' && (
                                            <div className="mb-3 p-2 bg-neutral-900/50 border border-neutral-700 rounded text-xs text-neutral-400 italic">
                                                <span className="font-semibold block not-italic">Internal Notes:</span>
                                                {selectedIssue.internalNotes}
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-2">
                                            {selectedIssue.status === 'REPORTED' && (
                                                <button
                                                    onClick={() => updateStatus(selectedIssue.id, 'ASSIGNED')}
                                                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                                                >
                                                    Assign to self
                                                </button>
                                            )}
                                            {selectedIssue.status === 'ASSIGNED' && (
                                                <button
                                                    onClick={() => updateStatus(selectedIssue.id, 'IN_PROGRESS')}
                                                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                                                >
                                                    Mark In Progress
                                                </button>
                                            )}
                                            {selectedIssue.status === 'IN_PROGRESS' && (
                                                <button
                                                    onClick={() => updateStatus(selectedIssue.id, 'RESOLVED')}
                                                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition"
                                                >
                                                    Mark Resolved
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Popup>
                            )}
                        </Map>
                    )}
                </div>

                {/* List View */}
                <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex flex-col">
                    <div className="p-4 border-b border-neutral-700 bg-neutral-900/50">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-white">Issue Queue</h3>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="bg-neutral-800 border border-neutral-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                            >
                                <option value="priority">Priority (Severity + Upvote)</option>
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                        {selectedIssues.size > 0 && (
                            <div className="flex gap-2 items-center text-xs">
                                <span className="text-emerald-400 font-bold">{selectedIssues.size} selected</span>
                                <button onClick={() => handleBulkUpdate('IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition">Mark In Progress</button>
                                <button onClick={() => handleBulkUpdate('RESOLVED')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition">Mark Resolved</button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-neutral-700 rounded-lg"></div>)}
                            </div>
                        ) : issues.length === 0 ? (
                            <p className="text-neutral-500 text-center py-8">No issues reported in this ward.</p>
                        ) : (
                            sortedIssues.map(issue => (
                                <div
                                    key={issue.id}
                                    onClick={() => setSelectedIssue(issue)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedIssue?.id === issue.id ? 'border-emerald-500 bg-neutral-700/50' : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIssues.has(issue.id)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelect(issue.id); }}
                                                className="mr-1 accent-emerald-500"
                                            />
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${getStatusColorClass(issue.status)}`}>
                                                {issue.status.replace('_', ' ')}
                                            </span>
                                            {issue.severityScore && <span className="text-[10px] bg-red-500/20 text-red-500 border border-red-500/30 px-1.5 py-0.5 rounded">LVL {issue.severityScore}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <span className="text-emerald-400 flex items-center">⇧ {issue._count.upvotes}</span>
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">{issue.title}</h4>
                                    <p className="text-xs text-neutral-400 line-clamp-2">{issue.aiSummary || issue.description}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
