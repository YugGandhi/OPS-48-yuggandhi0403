"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Clock, MapPin, AlertTriangle, CheckCircle, ArrowRight, Star, PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface Issue {
    id: string;
    title: string;
    category: string;
    status: 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    createdAt: string;
    aiSummary: string | null;
    ward?: { name: string };
    _count?: { upvotes: number };
    resolutionRating?: number | null;
}

export default function CitizenDashboard() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [ratingLoading, setRatingLoading] = useState<string | null>(null);
    const [hoverRating, setHoverRating] = useState<{ id: string, rating: number } | null>(null);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const res = await api.get('/issues/me');
                setIssues(res.data);
            } catch (error) {
                console.error("Failed to load issues", error);
            } finally {
                setLoading(false);
            }
        };
        fetchIssues();
    }, []);

    const handleRateIssue = async (issueId: string, rating: number) => {
        setRatingLoading(issueId);
        try {
            await api.post(`/issues/${issueId}/feedback`, { rating });

            // Optimistic update
            setIssues(prev => prev.map(issue =>
                issue.id === issueId ? { ...issue, resolutionRating: rating } : issue
            ));
        } catch (error) {
            console.error("Failed to rate issue", error);
        } finally {
            setRatingLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'REPORTED': return 'bg-amber-500/20 text-amber-500 border-amber-500/50';
            case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
            case 'RESOLVED': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50';
            case 'REJECTED': return 'bg-red-500/20 text-red-500 border-red-500/50';
            default: return 'bg-neutral-500/20 text-neutral-500 border-neutral-500/50';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'REPORTED': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
            case 'IN_PROGRESS': return <Clock className="w-4 h-4 mr-1.5" />;
            case 'RESOLVED': return <CheckCircle className="w-4 h-4 mr-1.5" />;
            default: return <AlertTriangle className="w-4 h-4 mr-1.5" />;
        }
    };

    const StatusProgressBar = ({ status }: { status: string }) => {
        const steps = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
        let currentIndex = steps.indexOf(status);
        if (currentIndex === -1) currentIndex = 0; // default for unknown/rejected
        const isRejected = status === 'REJECTED';

        return (
            <div className="w-full mt-4 mb-2">
                <div className="flex justify-between mb-1 relative">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-700 -z-10 -translate-y-1/2 rounded-full hidden sm:block"></div>
                    {/* Active line */}
                    {!isRejected && <div
                        className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-500 hidden sm:block"
                        style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}>
                    </div>}

                    {steps.map((step, index) => {
                        const isCompleted = index <= currentIndex && !isRejected;
                        const isActive = index === currentIndex && !isRejected;
                        const isDestructive = isActive && isRejected;

                        return (
                            <div key={step} className="flex flex-col items-center">
                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center bg-neutral-900
                                    ${isCompleted ? 'border-emerald-500' : 'border-neutral-600'}
                                    ${isActive ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : ''}
                                    ${isDestructive ? 'border-red-500 bg-red-500' : ''}`}>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 font-medium px-1 mt-1 uppercase tracking-wider hidden sm:flex">
                    <span>Reported</span>
                    <span>Assigned</span>
                    <span>Working</span>
                    <span>Resolved</span>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">My Issues</h1>
                    <p className="text-neutral-400 mt-1">Track the status of the civic issues you have reported.</p>
                </div>
                <div className="flex gap-3 mt-4 sm:mt-0">
                    <Link
                        href="/citizen/nearby"
                        className="inline-flex items-center px-4 py-2 border border-neutral-600 rounded-lg shadow-sm text-sm font-medium text-white bg-neutral-800 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 focus:ring-offset-neutral-900 transition-colors"
                    >
                        <MapPin className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
                        Nearby Issues
                    </Link>
                    <Link
                        href="/citizen/report"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-neutral-900 transition-colors"
                    >
                        <PlusCircle className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
                        Report New Issue
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-neutral-800 rounded-xl p-6 border border-neutral-700 animate-pulse h-48"></div>
                    ))}
                </div>
            ) : issues.length === 0 ? (
                <div className="bg-neutral-800 border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
                    <MapPin className="h-12 w-12 text-neutral-500 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No issues reported yet</h3>
                    <p className="text-neutral-400 max-w-sm mb-6">Help improve your city by reporting infrastructure, sanitation or other civic problems.</p>
                    <Link
                        href="/citizen/report"
                        className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center transition-colors"
                    >
                        Submit your first report <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {issues.map(issue => (
                        <div key={issue.id} className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 hover:border-emerald-500/50 transition-colors flex flex-col group">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-neutral-700 text-neutral-300 border border-neutral-600 uppercase tracking-wide">
                                        {issue.category}
                                    </span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getStatusColor(issue.status)}`}>
                                        {getStatusIcon(issue.status)}
                                        {issue.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                                    {issue.title}
                                </h3>

                                {issue.aiSummary && (
                                    <p className="text-neutral-400 text-sm line-clamp-3 mb-4 italic">
                                        <span className="text-emerald-500/80 mr-1 not-italic block font-medium">✨ AI Summary</span>
                                        "{issue.aiSummary}"
                                    </p>
                                )}

                                <StatusProgressBar status={issue.status} />

                                {/* Resolution Feedback UI */}
                                {issue.status === 'RESOLVED' && (
                                    <div className="mt-5 p-3 bg-neutral-900/50 rounded-lg border border-neutral-700/50">
                                        <p className="text-sm font-medium text-neutral-300 mb-2 text-center">
                                            {issue.resolutionRating ? "Your Resolution Feedback" : "Was this issue resolved properly?"}
                                        </p>
                                        <div className="flex justify-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => {
                                                const currentRating = hoverRating?.id === issue.id ? hoverRating.rating : (issue.resolutionRating || 0);
                                                return (
                                                    <button
                                                        key={star}
                                                        onClick={() => !issue.resolutionRating && handleRateIssue(issue.id, star)}
                                                        onMouseEnter={() => !issue.resolutionRating && setHoverRating({ id: issue.id, rating: star })}
                                                        onMouseLeave={() => !issue.resolutionRating && setHoverRating(null)}
                                                        disabled={!!issue.resolutionRating || ratingLoading === issue.id}
                                                        className={`p-1 transition-all ${!!issue.resolutionRating ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                                                    >
                                                        <Star
                                                            className={`w-6 h-6 transition-colors ${star <= currentRating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-neutral-600'
                                                                }`}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-neutral-800/50 p-4 border-t border-neutral-700/50 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                                    <div className="flex items-center">
                                        <Clock className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                                        {new Date(issue.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                    <div className="flex items-center text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                        ⇧ {issue._count?.upvotes || 0}
                                    </div>
                                </div>
                                {issue.ward?.name && (
                                    <div className="flex items-center text-xs text-neutral-500 font-medium">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                                        Ward: <span className="text-neutral-300 ml-1">{issue.ward.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
