'use client';

import LoginForm from '@/components/auth/login-form';
import { Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050505] selection:bg-cyan-500/30">
            {/* Ambient Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md p-6"
            >
                <div className="glass-panel rounded-3xl p-8 sm:p-10 relative overflow-hidden">
                    {/* Inner glowing top border */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
                    
                    <div className="text-center mb-10 flex flex-col items-center">
                        <motion.div 
                            initial={{ rotate: -10, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                            className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-6 ring-1 ring-white/20"
                        >
                            <Cpu className="w-8 h-8 text-white drop-shadow-md" />
                        </motion.div>
                        
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            IoT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Control</span>
                        </h1>
                        <p className="text-slate-400 mt-3 text-sm font-medium">
                            Control your ESP32 relays from anywhere
                        </p>
                    </div>

                    <LoginForm />
                </div>
            </motion.div>
        </div>
    );
}
