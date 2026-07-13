'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/auth';
import type { User } from '@/lib/auth';
import { LayoutDashboard, LogOut, Menu, X, History, Cpu, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
    user?: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
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
                aria-label="Open navigation"
                className="fixed left-4 top-4 z-50 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm lg:hidden"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-white
                    transform transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Mobile close button */}
                <div className="flex justify-end p-4 lg:hidden">
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        aria-label="Close navigation"
                        className="rounded-lg p-2 hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Logo */}
                <div className="border-b border-white/10 px-6 pb-6 pt-2 lg:pt-7">
                    <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/25"><Cpu className="h-5 w-5" /></span><div><h1 className="font-semibold tracking-tight">IoT Control</h1><p className="text-xs text-slate-400">Relay workspace</p></div></div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1 p-4">
                    <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">Workspace</p>
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </Link>
                    <Link onClick={() => setIsMobileOpen(false)} href="/dashboard/transactions" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${pathname === '/dashboard/transactions' ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                        <History className="w-5 h-5" />
                        <span>Transaction History</span>
                    </Link>
                </nav>

                {/* User info & logout */}
                <div className="mt-auto border-t border-white/10 p-4">
                    {user && (
                        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">{user.email[0]?.toUpperCase()}</span>
                            <p className="truncate text-sm text-slate-300">{user.email}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                        <ChevronRight className="ml-auto h-4 w-4" />
                    </button>
                </div>
            </aside>
        </>
    );
}
