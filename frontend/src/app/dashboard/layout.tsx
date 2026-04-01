'use client';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Server-side auth check
    const user = await getCurrentUser();
    
    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar user={user} />
            <main className="flex-1 md:ml-0">
                {children}
            </main>
        </div>
    );
}
