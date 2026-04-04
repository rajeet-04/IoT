'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { LayoutDashboard, LogOut, Menu, X, History } from 'lucide-react';

interface SidebarProps {
    user?: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
    const router = useRouter();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white
                    transform transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* Mobile close button */}
                <div className="md:hidden flex justify-end p-4">
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="p-2 hover:bg-slate-800 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Logo */}
                <div className="px-6 py-4 border-b border-slate-700">
                    <h1 className="text-xl font-bold">IoT Control</h1>
                    <p className="text-xs text-slate-400 mt-1">Device Dashboard</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    <a
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 text-white"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </a>
                    <a
                        href="/dashboard/transactions"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    >
                        <History className="w-5 h-5" />
                        <span>Transaction History</span>
                    </a>
                </nav>

                {/* User info & logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
                    {user && (
                        <div className="mb-3 px-2">
                            <p className="text-sm text-slate-300 truncate">{user.email}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
