"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, MapPin, Search, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    return (
        <nav className="bg-neutral-800 border-b border-neutral-700 w-full fixed top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href={`/${user.role.toLowerCase()}`} className="flex items-center gap-2">
                                <MapPin className="text-emerald-500 w-6 h-6" />
                                <span className="text-white font-bold text-xl tracking-tight">CivicPulse</span>
                            </Link>
                        </div>
                        <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                            {user.role === 'CITIZEN' && (
                                <>
                                    <Link
                                        href="/citizen"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/citizen' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        My Issues
                                    </Link>
                                    <Link
                                        href="/citizen/report"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/citizen/report' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        Report Issue
                                    </Link>
                                    <Link
                                        href="/profile"
                                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/profile' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        Profile & Badges
                                    </Link>
                                </>
                            )}
                            {user.role === 'OFFICER' && (
                                <Link
                                    href="/officer"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/officer' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                                >
                                    Ward Dashboard
                                </Link>
                            )}
                            {user.role === 'ADMIN' && (
                                <Link
                                    href="/admin"
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/admin' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                                >
                                    City Analytics
                                </Link>
                            )}
                            <Link
                                href="/public/resolutions"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${pathname === '/public/resolutions' ? 'border-emerald-500 text-white' : 'border-transparent text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'}`}
                            >
                                Public Log
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-neutral-400 hidden sm:block">
                                Logged in as <strong className="text-neutral-200">{user.name}</strong> ({user.role})
                            </span>
                            <Link href="/profile" className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors" title="My Profile">
                                <User className="h-5 w-5" />
                            </Link>
                            <button
                                onClick={logout}
                                className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                                title="Log Out"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
