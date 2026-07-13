'use client';

import RegisterForm from '@/components/auth/register-form';
import { Network, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RegisterPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(79,70,229,.36),transparent_32%),radial-gradient(circle_at_20%_85%,rgba(20,184,166,.2),transparent_30%)]" />
            <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
                <section className="hidden text-white lg:block"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-slate-200"><ShieldCheck className="h-4 w-4 text-teal-300" /> Built for private device control</div><h1 className="max-w-xl text-5xl font-semibold tracking-tight">Set up your <span className="text-indigo-300">control room.</span></h1><p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Create a workspace that follows you across browser restarts, while keeping each command connected to your account.</p></section>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 mx-auto w-full max-w-md"
            >
                <div className="glass-panel relative overflow-hidden rounded-3xl p-7 sm:p-9">
                    
                    <div className="text-center mb-10 flex flex-col items-center">
                        <motion.div 
                            initial={{ rotate: 10, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                            className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30"
                        >
                            <Network className="w-8 h-8 text-white drop-shadow-md" />
                        </motion.div>
                        
                        <p className="eyebrow">Get started</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create your account</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-500">Start managing your relay devices in a few seconds.</p>
                    </div>

                    <RegisterForm />
                </div>
            </motion.div>
            </div>
        </div>
    );
}
