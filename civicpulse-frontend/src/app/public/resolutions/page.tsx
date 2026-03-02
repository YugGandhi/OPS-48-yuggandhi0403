"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { ArrowLeft, Clock, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface AuditLog {
    id: string;
    issueId: string;
    previousStatus: string | null;
    newStatus: string;
    timestamp: string;
    issue: {
        id: string;
        title: string;
        category: string;
        ward: { name: string } | null;
    }
}

export default function PublicResolutionLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/issues/public/resolutions');
                setLogs(res.data);
            } catch (error) {
                console.error("Failed to load resolution logs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 mb-4 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                    <ShieldCheck className="w-8 h-8 mr-3 text-emerald-500" />
                    Public Resolution Log
                </h1>
                <p className="text-neutral-400 mt-2 text-lg">
                    Transparency matters. View the most recently resolved civic issues across the city.
                </p>
            </div>

            <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 shadow-xl">
                <div className="p-5 border-b border-neutral-700 bg-neutral-900/50">
                    <h2 className="text-lg font-bold text-white">Latest Resolutions</h2>
                </div>

                <div className="divide-y divide-neutral-700">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-neutral-500">
                            No recent resolutions found.
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="p-5 hover:bg-neutral-700/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-neutral-700 text-neutral-300 uppercase tracking-wider">
                                            {log.issue.category}
                                        </span>
                                        {log.issue.ward && (
                                            <span className="text-xs text-neutral-400 flex items-center">
                                                <MapPin className="w-3 h-3 mr-0.5" />
                                                {log.issue.ward.name}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-white truncate mb-1">
                                        {log.issue.title}
                                    </h3>
                                    <div className="flex items-center text-xs text-neutral-500">
                                        <span className="text-emerald-400 font-medium mr-2">Status changed to RESOLVED</span>
                                        <Clock className="w-3 h-3 mr-1" />
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                                <div className="sm:text-right flex-shrink-0">
                                    <span className="text-xs font-mono text-neutral-600">ID: {log.issue.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
