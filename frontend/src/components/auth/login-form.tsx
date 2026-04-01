'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Loader2, Fingerprint, Lock, AlertCircle } from 'lucide-react';

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
                        className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
                    >
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div variants={itemVariants} className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                    Email Address
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Fingerprint className="h-5 w-5 text-slate-500" />
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
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                    Password
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500" />
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

            <motion.div variants={itemVariants} className="text-center text-sm pt-4 border-t border-white/10 mt-6 flex flex-col gap-2">
                <p className="text-slate-400">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
                <Link href="/forgot-password" className="text-slate-500 hover:text-slate-300 transition-colors text-xs">
                    Forgot your password?
                </Link>
            </motion.div>
        </motion.form>
    );
}
