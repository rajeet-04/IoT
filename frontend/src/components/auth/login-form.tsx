'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Loader2, Mail, LockKeyhole, AlertCircle } from 'lucide-react';

export default function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed. Neural uplink disconnected.');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.3 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.form 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            onSubmit={handleSubmit} 
            className="space-y-5"
        >
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div variants={itemVariants} className="space-y-1.5">
                <label htmlFor="email" className="block pl-1 text-sm font-semibold text-slate-700">
                    Email Address
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input !pl-11"
                        placeholder="you@example.com"
                    />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1.5">
                <label htmlFor="password" className="block pl-1 text-sm font-semibold text-slate-700">
                    Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <LockKeyhole className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="input !pl-11"
                        placeholder="••••••••••••"
                    />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center justify-center gap-2 group w-full"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin text-white" />
                            Signing In...
                        </>
                    ) : (
                        <>
                            Sign In
                            <span className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300">
                                →
                            </span>
                        </>
                    )}
                </button>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-5 text-center text-sm">
                <p className="text-slate-500">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500">
                        Sign up
                    </Link>
                </p>
                <Link href="/forgot-password" className="text-xs text-slate-400 transition-colors hover:text-slate-700">
                    Forgot your password?
                </Link>
            </motion.div>
        </motion.form>
    );
}
