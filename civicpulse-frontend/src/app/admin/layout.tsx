import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute allowedRoles={['ADMIN']}>
            <div className="min-h-screen bg-neutral-900 pt-16 flex flex-col">
                <Navbar />
                <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
