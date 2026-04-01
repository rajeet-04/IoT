'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type User } from '@/lib/auth';
import Sidebar from '@/components/dashboard/sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        getCurrentUser().then((u) => {
            if (!u) {
                router.replace('/login');
            } else {
                setUser(u);
            }
        }).finally(() => setChecking(false));
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar user={user} />
            <main className="flex-1 md:ml-0">
                {children}
            </main>
        </div>
    );
}
