"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Trophy, Medal, Award, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface LeaderboardEntry {
    officerId: string;
    officerName: string;
    wardName: string;
    resolvedCount: number;
}

export default function OfficerLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await api.get('/admin/dashboard/leaderboard');
                setLeaderboard(res.data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-yellow-500" />;
            case 1: return <Medal className="w-6 h-6 text-gray-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-700" />;
            default: return <Award className="w-5 h-5 text-emerald-500/50" />;
        }
    };

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/50";
            case 1: return "bg-gradient-to-r from-gray-400/20 to-transparent border-gray-400/50";
            case 2: return "bg-gradient-to-r from-amber-700/20 to-transparent border-amber-700/50";
            default: return "bg-neutral-800/50 border-neutral-700 hover:border-emerald-500/30";
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                        <Trophy className="w-8 h-8 mr-3 text-emerald-500" />
                        Officer Leaderboard
                    </h1>
                    <p className="text-neutral-400 mt-2 text-lg">
                        Top performing municipal officers based on resolved city issues.
                    </p>
                </div>
                <Link href="/admin" className="px-4 py-2 border border-neutral-600 rounded bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 transition">
                    Back to Dashboard
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 flex items-center shadow-lg">
                    <div className="bg-emerald-500/10 p-3 rounded-lg mr-4 border border-emerald-500/20">
                        <Trophy className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Top Performer</p>
                        <p className="text-xl font-bold text-white truncate w-32">
                            {loading ? '...' : leaderboard[0]?.officerName || 'N/A'}
                        </p>
                    </div>
                </div>
                <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 flex items-center shadow-lg">
                    <div className="bg-blue-500/10 p-3 rounded-lg mr-4 border border-blue-500/20">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Active Officers</p>
                        <p className="text-xl font-bold text-white">{loading ? '...' : leaderboard.length}</p>
                    </div>
                </div>
                <div className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 flex items-center shadow-lg">
                    <div className="bg-indigo-500/10 p-3 rounded-lg mr-4 border border-indigo-500/20">
                        <TrendingUp className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-sm text-neutral-400 font-medium">Total Resolutions</p>
                        <p className="text-xl font-bold text-white">
                            {loading ? '...' : leaderboard.reduce((acc, curr) => acc + curr.resolvedCount, 0)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700 flex-1 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 grid grid-cols-12 gap-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    <div className="col-span-2 text-center">Rank</div>
                    <div className="col-span-5">Officer Name</div>
                    <div className="col-span-3">Assigned Ward</div>
                    <div className="col-span-2 text-right">Resolutions</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center text-neutral-500 py-10">
                            No data available for the leaderboard yet.
                        </div>
                    ) : (
                        leaderboard.map((entry, index) => (
                            <div
                                key={entry.officerId}
                                className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg border transition-all ${getRankStyle(index)}`}
                            >
                                <div className="col-span-2 flex justify-center items-center">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 shadow-inner font-bold text-lg text-white">
                                        {index < 3 ? getRankIcon(index) : index + 1}
                                    </div>
                                </div>
                                <div className="col-span-5">
                                    <p className="text-base font-bold text-white">{entry.officerName}</p>
                                    <p className="text-xs text-neutral-500 font-mono mt-0.5">ID: {entry.officerId.slice(0, 8)}</p>
                                </div>
                                <div className="col-span-3 text-sm font-medium text-neutral-300">
                                    {entry.wardName}
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-lg">
                                        {entry.resolvedCount}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
