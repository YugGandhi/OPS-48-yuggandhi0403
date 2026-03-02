"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, Shield, Star, Award, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    issuesReported: number;
    issuesResolved: number;
    upvotesGiven: number;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking user profile stats based on issues endpoint for now, 
        // ideally there'd be a GET /api/users/me/stats route.
        const fetchProfileData = async () => {
            try {
                // Fetch logged in user issues to calculate stats
                const issuesRes = await api.get('/issues/me');
                const myIssues = issuesRes.data;

                // Get user info from local storage (set during login)
                const userStr = localStorage.getItem('user');
                const userData = userStr ? JSON.parse(userStr) : null;

                setProfile({
                    id: userData?.id || 'Unknown',
                    email: userData?.email || 'Unknown',
                    name: userData?.name || 'Citizen',
                    role: userData?.role || 'CITIZEN',
                    issuesReported: myIssues.length,
                    issuesResolved: myIssues.filter((i: any) => i.status === 'RESOLVED').length,
                    upvotesGiven: 0 // Mocked for now
                });
            } catch (error) {
                console.error("Failed to load profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    const BADGES = [
        { id: 'first_report', name: 'Civic Observer', description: 'Reported your first issue.', icon: <Shield className="w-8 h-8 text-blue-500" />, condition: (p: UserProfile) => p.issuesReported >= 1 },
        { id: 'active_reporter', name: 'Community Voice', description: 'Reported 5+ issues.', icon: <Award className="w-8 h-8 text-amber-500" />, condition: (p: UserProfile) => p.issuesReported >= 5 },
        { id: 'problem_solver', name: 'City Fixer', description: 'Had 3 issues successfully resolved.', icon: <Star className="w-8 h-8 text-emerald-500" />, condition: (p: UserProfile) => p.issuesResolved >= 3 },
    ];

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!profile) return <div className="text-white text-center py-10">Please log in to view profile.</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 mt-6">
            <div className="mb-8">
                <Link href={`/${profile.role.toLowerCase()}`} className="inline-flex items-center text-sm font-medium text-emerald-500 hover:text-emerald-400 mb-4 transition">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                    <User className="w-8 h-8 mr-3 text-emerald-500" />
                    Citizen Profile & Badges
                </h1>
                <p className="text-neutral-400 mt-2 text-lg">
                    Track your contributions to the city and view your earned achievements.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1 bg-neutral-800 rounded-xl p-6 border border-neutral-700 shadow-xl flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border-4 border-emerald-500/30 mb-4">
                        <span className="text-4xl font-bold text-emerald-500">{profile.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                    <p className="text-sm text-neutral-400 mb-4">{profile.email}</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-neutral-700 text-neutral-300 border border-neutral-600 uppercase tracking-widest">
                        {profile.role}
                    </span>
                </div>

                <div className="md:col-span-2 bg-neutral-800 rounded-xl p-6 border border-neutral-700 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-4 border-b border-neutral-700 pb-2">Impact Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                            <p className="text-sm font-medium text-neutral-400">Total Reports</p>
                            <p className="text-3xl font-bold text-white mt-1">{profile.issuesReported}</p>
                        </div>
                        <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
                            <p className="text-sm font-medium text-emerald-500">Successfully Resolved</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">{profile.issuesResolved}</p>
                        </div>
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700 col-span-2 flex justify-between items-center cursor-pointer hover:bg-neutral-700/50 transition">
                            <div>
                                <p className="text-sm font-medium text-neutral-400">Community Rank</p>
                                <p className="text-xl font-bold text-white mt-1">Top {Math.max(10, 100 - profile.issuesReported * 2)}%</p>
                            </div>
                            <ChevronRight className="w-6 h-6 text-neutral-500" />
                        </div>
                    </div>
                </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Earned Badges</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {BADGES.map(badge => {
                    const earned = badge.condition(profile);
                    return (
                        <div key={badge.id} className={`p-5 rounded-xl border ${earned ? 'bg-gradient-to-br from-neutral-800 to-neutral-900 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-neutral-900/50 border-neutral-800 opacity-60 grayscale'}`}>
                            <div className="flex justify-center mb-4">
                                <div className={`p-4 rounded-full ${earned ? 'bg-emerald-500/10' : 'bg-neutral-800'}`}>
                                    {badge.icon}
                                </div>
                            </div>
                            <h4 className={`text-center font-bold mb-1 ${earned ? 'text-white' : 'text-neutral-500'}`}>{badge.name}</h4>
                            <p className="text-center text-xs text-neutral-400">{badge.description}</p>
                            {earned && (
                                <div className="mt-4 flex justify-center">
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Unlocked</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
