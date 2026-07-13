'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Cpu, Loader2, Radio, ShieldCheck } from 'lucide-react';
import { restoreBrowserSession } from '@/lib/auth';

export default function HomePage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        restoreBrowserSession().then((user) => {
            if (user) router.replace('/dashboard');
        }).finally(() => setChecking(false));
    }, [router]);

    if (checking) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;

    return (
        <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(79,70,229,.38),transparent_28%),radial-gradient(circle_at_78%_58%,rgba(13,148,136,.22),transparent_25%)]" />
            <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-7">
                <nav className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500"><Cpu className="h-5 w-5" /></span><span className="font-semibold">IoT Control</span></div><Link href="/login" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10">Sign in</Link></nav>
                <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
                    <div><div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200"><ShieldCheck className="h-4 w-4 text-teal-300" /> Secure relay control</div><h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">A clearer way to <span className="text-indigo-300">run your devices.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Control ESP32 relays remotely, see what is online at a glance and keep an immutable history of every action.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 font-semibold shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400">Create an account <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:bg-white/10">I already have an account</Link></div></div>
                    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur"><div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">Relay workspace</p><p className="mt-1 text-xl font-semibold">Home controls</p></div><span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/5 p-4"><Radio className="h-5 w-5 text-teal-300" /><p className="mt-5 text-3xl font-semibold">03</p><p className="mt-1 text-sm text-slate-400">devices online</p></div><div className="rounded-xl bg-indigo-500 p-4"><Cpu className="h-5 w-5 text-indigo-100" /><p className="mt-5 text-3xl font-semibold">02</p><p className="mt-1 text-sm text-indigo-100">relays active</p></div></div></div></div>
                </section>
                <p className="text-center text-xs text-slate-500">Built for your connected hardware.</p>
            </div>
        </main>
    );
}
