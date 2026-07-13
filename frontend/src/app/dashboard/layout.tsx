'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreBrowserSession, type User } from '@/lib/auth';
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
        restoreBrowserSession().then((u) => {
            if (!u) {
                router.replace('/login');
            } else {
                setUser(u);
            }
        }).finally(() => setChecking(false));
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 lg:flex">
            <Sidebar user={user} />
            <main className="min-w-0 flex-1 lg:ml-72">
                {children}
            </main>
        </div>
    );
}
