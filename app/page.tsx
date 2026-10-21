'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Terminal,
  Info,
  ExternalLink,
  Key,
  Lock,
} from 'lucide-react';

const FREE_LIMIT = 15;

export default function LandingPage() {
  const [targetUrl, setTargetUrl] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scansLeft, setScansLeft] = useState(FREE_LIMIT);

  // Bypass Code / Access Pass States
  const [bypassCode, setBypassCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState('');

  // Score states
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [securityGrade, setSecurityGrade] = useState<string>('');
  const [uiUxScore, setUiUxScore] = useState<number>(0);
  const [uiUxGrade, setUiUxGrade] = useState<string>('');

  useEffect(() => {
    const savedScansLeft = localStorage.getItem('sec_scans_remaining');
    if (savedScansLeft !== null) {
      setScansLeft(parseInt(savedScansLeft, 10));
    } else {
      const legacyUsed = localStorage.getItem('sec_scans_used');
      if (legacyUsed) {
        const remaining = FREE_LIMIT - parseInt(legacyUsed, 10);
        setScansLeft(Math.max(0, remaining));
        localStorage.setItem(
          'sec_scans_remaining',
          Math.max(0, remaining).toString()
        );
      } else {
        localStorage.setItem('sec_scans_remaining', FREE_LIMIT.toString());
      }
    }
  }, []);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scansLeft <= 0) {
      setError(
        'Free tier scan limit reached. Please enter a bypass code to continue.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);
    setOverallScore(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        setResults(data.results);
        setOverallScore(data.score);
        setSecurityGrade(data.grade);
        setUiUxScore(data.uiUxScore);
        setUiUxGrade(data.uiUxGrade);

        const newRemaining = Math.max(0, scansLeft - 1);
        setScansLeft(newRemaining);
        localStorage.setItem('sec_scans_remaining', newRemaining.toString());
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Audit failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemBypassCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassCode.trim()) return;

    setRedeeming(true);
    setError('');
    setRedeemSuccess('');

    try {
      const res = await fetch('/api/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: bypassCode }),
      });

      const data = await res.json();
      if (res.ok) {
        const newTotal = scansLeft + data.queriesGranted;
        setScansLeft(newTotal);
        localStorage.setItem('sec_scans_remaining', newTotal.toString());
        setRedeemSuccess(data.message);
        setBypassCode('');
      } else {
        throw new Error(data.error || 'Invalid code.');
      }
    } catch (err: any) {
      setError(err.message || 'Bypass verification failed.');
    } finally {
      setRedeeming(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-purple-950 text-purple-300 border-purple-700/80';
      case 'HIGH':
        return 'bg-rose-950 text-rose-300 border-rose-700/80';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-300 border-amber-700/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-mono relative overflow-hidden flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* 3D Cyberpunk Navbar */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="w-full border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 z-30 shadow-2xl"
      >
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50"
            />
            <span className="font-bold tracking-wider text-cyan-400 text-sm sm:text-base">
              CYBERAIR
            </span>
          </div>

          <Link
            href="/admin/login"
            className="sm:hidden bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1 rounded border border-slate-700 text-[11px] cursor-pointer"
          >
            Admin
          </Link>
        </div>

        {/* Developer Credit Badge */}
        <motion.div
          whileHover={{ scale: 1.08, rotateX: 10, rotateY: -10, z: 30 }}
          style={{ perspective: 1000 }}
          className="flex items-center px-4 py-1 rounded-full bg-gradient-to-r from-cyan-950/80 to-emerald-950/80 border border-cyan-500/40 text-[11px] sm:text-xs text-cyan-300 shadow-cyan-500/20 shadow-xl cursor-default"
        >
          Built by{' '}
          <span className="text-white font-bold ml-1">Samuel Onwodi</span>
        </motion.div>

        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            Scans Remaining:{' '}
            <strong
              className={scansLeft > 0 ? 'text-emerald-400' : 'text-rose-400'}
            >
              {scansLeft}
            </strong>
          </span>
          <Link
            href="/admin/login"
            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3.5 py-1.5 rounded-lg border border-slate-700 transition-all hover:border-cyan-500 cursor-pointer"
          >
            Admin Portal
          </Link>
        </div>
      </motion.nav>

      {/* Main Content Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 z-10 space-y-8 mt-4">
        <header className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            SECURITY AUDITOR
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Deep directive analysis, OWASP Top 10 mapping and
            threat scenarios.
            <span className="block sm:inline text-emerald-400 mt-1 sm:ml-2">
              ({scansLeft} scans remaining)
            </span>
          </p>
        </header>

        {/* URL Input Form or Bypass Code Request Prompt */}
        {scansLeft > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl space-y-4"
          >
            <form
              onSubmit={handleAudit}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                required
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs sm:text-sm font-mono shadow-inner"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'ANALYZING THREATS...' : 'EXECUTE FULL SCAN'}
              </motion.button>
            </form>

            {redeemSuccess && (
              <p className="text-emerald-400 text-xs text-center">
                {redeemSuccess}
              </p>
            )}
            {error && (
              <p className="text-rose-400 text-xs text-center font-sans">
                {error}
              </p>
            )}
          </motion.div>
        ) : (
          /* Locked State - Bypass Code Prompt */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/90 border border-rose-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-rose-950/40 backdrop-blur-xl space-y-6 text-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-400">
                <Lock className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-rose-300 uppercase tracking-wider">
                SCAN QUOTA EXHAUSTED (0 REMAINING)
              </h2>
              <p className="text-xs text-slate-400 max-w-md font-sans">
                You have reached the maximum allowed free URL audits. Enter an
                Access Pass or Master Bypass Code below to unlock additional
                scans.
              </p>
            </div>

            <form
              onSubmit={handleRedeemBypassCode}
              className="max-w-md mx-auto flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4 text-cyan-400" />
                </span>
                <input
                  type="text"
                  placeholder="ENTER BYPASS CODE"
                  value={bypassCode}
                  onChange={(e) => setBypassCode(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs font-mono uppercase tracking-widest"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={redeeming}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {redeeming ? 'VERIFYING...' : 'REDEEM CODE'}
              </motion.button>
            </form>

            {redeemSuccess && (
              <p className="text-emerald-400 text-xs font-bold">
                {redeemSuccess}
              </p>
            )}
            {error && (
              <p className="text-rose-400 text-xs font-sans">{error}</p>
            )}
          </motion.div>
        )}

        {/* Dual Score Banner */}
        {overallScore !== null && (
          <div className="grid grid-cols-1 text-end gap-4">
            {/* Security Posture Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl border-2 shadow-xl ${
                    overallScore >= 80
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500 shadow-emerald-500/20'
                      : overallScore >= 50
                      ? 'bg-amber-950/80 text-amber-400 border-amber-500 shadow-amber-500/20'
                      : 'bg-rose-950/80 text-rose-400 border-rose-500 shadow-rose-500/20'
                  }`}
                >
                  {securityGrade}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    SECURITY POSTURE
                  </span>
                  <div className="text-2xl font-extrabold text-slate-100 flex items-baseline gap-1.5">
                    <span>{overallScore}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Headers & vulnerability mitigation
                  </p>
                </div>
              </div>
            </motion.div>

            {/* UI/UX & Professionalism Card */}
            {/* <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl border-2 shadow-xl ${
                    uiUxScore >= 80
                      ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500 shadow-cyan-500/20'
                      : uiUxScore >= 50
                      ? 'bg-amber-950/80 text-amber-400 border-amber-500 shadow-amber-500/20'
                      : 'bg-rose-950/80 text-rose-400 border-rose-500 shadow-rose-500/20'
                  }`}
                >
                  {uiUxGrade}
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    UI/UX & PROFESSIONALISM
                  </span>
                  <div className="text-2xl font-extrabold text-slate-100 flex items-baseline gap-1.5">
                    <span>{uiUxScore}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Responsiveness, markup & branding
                  </p>
                </div>
              </div>
            </motion.div> */}
          </div>
        )}

        {/* Detailed Results List */}
        {results.length > 0 && (
          <div className="space-y-6 pt-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Vulnerability Diagnostic
                Assessment Report
              </h2>
              <span className="text-[11px] text-slate-400">
                Target: <strong className="text-slate-200">{targetUrl}</strong>
              </span>
            </div>

            {results.map((res, i) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ scale: 1.01 }}
                className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
                  res.present && !res.isWeak
                    ? 'bg-slate-900/90 border-emerald-800/60 shadow-emerald-950/20'
                    : res.isWeak
                    ? 'bg-slate-900/90 border-amber-800/80 shadow-amber-950/20'
                    : 'bg-slate-900/90 border-rose-800/80 shadow-rose-950/20'
                }`}
              >
                {/* Card Title Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {res.present && !res.isWeak ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : res.isWeak ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    )}
                    <span className="font-bold text-sm text-slate-100">
                      {res.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(
                        res.severity
                      )}`}
                    >
                      {res.severity}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-[11px] border ${
                        res.present && !res.isWeak
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : res.isWeak
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {res.present && !res.isWeak
                        ? 'SECURE'
                        : res.isWeak
                        ? 'WEAK DIRECTIVE'
                        : 'VULNERABLE'}
                    </span>
                  </div>
                </div>

                {/* Sub Metadata Tags */}
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-4 border-b border-slate-800/80 pb-3">
                  <span>
                    Category:{' '}
                    <strong className="text-slate-300">{res.category}</strong>
                  </span>
                  <span>
                    OWASP:{' '}
                    <strong className="text-cyan-300">{res.owasp}</strong>
                  </span>
                  <span>
                    CIA Triad:{' '}
                    <strong className="text-purple-300">{res.cia}</strong>
                  </span>
                </div>

                {/* Technical Finding */}
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
                  <span className="text-slate-500 block">
                    Technical Finding:
                  </span>
                  <p
                    className={
                      res.present && !res.isWeak
                        ? 'text-emerald-400'
                        : res.isWeak
                        ? 'text-amber-300'
                        : 'text-rose-400'
                    }
                  >
                    {res.finding}
                  </p>
                  {res.value && (
                    <div className="text-slate-400 pt-1 text-[10px] break-all">
                      Raw Header:{' '}
                      <span className="text-cyan-300">{res.value}</span>
                    </div>
                  )}
                </div>

                {/* Non-Technical Explanation & Exploitation Scenario */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-slate-300">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Plain-English Explanation
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {res.explanation}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                    <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Exploitation
                      Scenario
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {res.exploit}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
