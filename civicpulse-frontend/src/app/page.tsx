"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MapPin } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        if (user.role === 'ADMIN') router.push('/admin');
        else if (user.role === 'OFFICER') router.push('/officer');
        else router.push('/citizen');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <MapPin className="text-emerald-500 w-16 h-16 animate-pulse mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">CivicPulse Dashboard</h1>
        <div className="flex items-center text-neutral-400">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500 mr-2"></div>
          Redirecting securely...
        </div>
      </div>
    </div>
  );
}
