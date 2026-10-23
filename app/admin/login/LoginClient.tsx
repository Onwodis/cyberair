'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import CyberBackground from '../../components/CyberBackground';

export default function LoginClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Authentication successful! Welcome to the Command Center.');
        router.push('/admin/dashboard');
      } else {
        toast.error(data.error || 'Invalid admin credentials.');
      }
    } catch {
      toast.error('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden scanlines">
      <CyberBackground />

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="absolute top-6 left-6 z-20"
      >
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 transition-all text-xs backdrop-blur-md shadow-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Go Back Home
        </Link>
      </motion.div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        whileHover={{ rotateX: 4, rotateY: -4 }}
        style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full bg-slate-900/80 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6 z-10 glow-border"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-cyan-400 tracking-wider neon">
            cyberAir Gateway
          </h1>
          <p className="text-xs text-slate-400">Super Admin Authentication Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 block">Admin Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@meraki.com"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-cyan-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold py-3.5 rounded-xl transition-all text-xs shadow-lg shadow-cyan-600/20 mt-2"
          >
            {loading ? 'AUTHENTICATING…' : 'ACCESS COMMAND CENTER'}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
