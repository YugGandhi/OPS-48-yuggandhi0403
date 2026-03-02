import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

export default function CitizenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute allowedRoles={['CITIZEN']}>
            <div className="min-h-screen bg-neutral-900 pt-16">
                <Navbar />
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
