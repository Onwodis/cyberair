'use client';

import { useState, useEffect, useRef } from 'react';
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
  Wrench,
  Gauge,
  Radar,
  Server,
  Timer,
  ChevronRight,
  BarChart3,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import CyberBackground from './CyberBackground';
import Reveal from './Reveal';
import ScoreGauge from './ScoreGauge';
import AuditCharts from './AuditCharts';
import { useIsDark } from './useIsDark';

const FREE_LIMIT = 15;

const THREAT_TAGS = [
  'XSS',
  'Clickjacking',
  'SSL Stripping',
  'CORS Abuse',
  'Session Hijack',
  'MIME Confusion',
  'XS-Leaks',
  'CSRF',
  'Info Disclosure',
  'Mixed Content',
  'Credential Theft',
  'Injection',
];

export default function LandingClient() {
  const [targetUrl, setTargetUrl] = useState('');
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scansLeft, setScansLeft] = useState(FREE_LIMIT);

  const [bypassCode, setBypassCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState('');

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const isDark = useIsDark();

  useEffect(() => {
    const saved = localStorage.getItem('sec_scans_remaining');
    if (saved !== null) {
      setScansLeft(parseInt(saved, 10));
    } else {
      localStorage.setItem('sec_scans_remaining', FREE_LIMIT.toString());
    }
  }, []);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scansLeft <= 0) {
      setError('Free tier scan limit reached. Enter a bypass code to continue.');
      return;
    }
    setLoading(true);
    setError('');
    setAudit(null);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setAudit(data);
        const next = Math.max(0, scansLeft - 1);
        setScansLeft(next);
        localStorage.setItem('sec_scans_remaining', next.toString());
        // Reveal the results: smoothly scroll them into view after render.
        setTimeout(
          () =>
            resultsRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            }),
          180
        );
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
        const total = scansLeft + data.queriesGranted;
        setScansLeft(total);
        localStorage.setItem('sec_scans_remaining', total.toString());
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

  const severityBadge = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return 'bg-purple-950 text-purple-300 border-purple-700/80';
      case 'HIGH':
        return 'bg-rose-950 text-rose-300 border-rose-700/80';
      case 'MEDIUM':
        return 'bg-amber-950 text-amber-300 border-amber-700/80';
      case 'LOW':
        return 'bg-sky-950 text-sky-300 border-sky-700/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const results = audit?.results || [];
  const meta = audit?.meta;

  return (
    <main
      className={`min-h-screen bg-slate-950 text-slate-100 font-mono relative flex flex-col scanlines selection:bg-cyan-500 selection:text-slate-950 ${
        isDark ? 'app-wash-dark' : 'app-wash-light'
      }`}
    >
      <CyberBackground />

      {/* Navbar */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="no-print sticky top-0 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 z-30 shadow-2xl"
      >
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="pulse-ring absolute inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
            </span>
            <span className="font-bold tracking-[0.15em] text-cyan-400 neon text-sm sm:text-base">
              cyberAir
            </span>
          </div>
          <Link
            href="/admin/login"
            className="sm:hidden bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1 rounded border border-slate-700 text-[11px]"
          >
            Admin
          </Link>
        </div>

        <motion.div
          whileHover={{ scale: 1.08, rotateX: 10, rotateY: -10 }}
          style={{ perspective: 1000 }}
          className="hidden md:flex items-center px-4 py-1 rounded-full bg-gradient-to-r from-cyan-950/80 to-emerald-950/80 border border-cyan-500/40 text-[11px] text-cyan-300 glow-border cursor-default"
        >
          Built by{' '}
          <span className="text-slate-100 font-bold ml-1">Samuel Onwodi</span>
        </motion.div>

        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            Scans Remaining:{' '}
            <strong className={scansLeft > 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {scansLeft}
            </strong>
          </span>
          <Link
            href="/admin/login"
            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3.5 py-1.5 rounded-lg border border-slate-700 transition-all hover:border-cyan-500"
          >
            Admin Portal
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 text-center">
        <Reveal>
          <motion.div
            whileHover={{ rotateX: 6, rotateY: -6 }}
            style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-[11px] text-cyan-300 mb-6"
          >
            <Radar className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            Non-destructive • OWASP-mapped • Deep header & transport analysis
          </motion.div>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 neon">
            cyberAir
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm tracking-[0.3em] uppercase mt-2">
            Security Auditor
          </p>
        </Reveal>
        <Reveal delay={160}>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-4 font-sans">
            Point it at any URL. In seconds you get a graded security posture,
            per-vulnerability exploit scenarios, animated analytics, and
            copy-paste fixes — mapped to the OWASP Top 10.
          </p>
        </Reveal>
      </section>

      {/* Infinite threat ticker */}
      <div className="relative z-10 overflow-hidden mt-8 border-y border-slate-800/60 bg-slate-950/40 py-2.5">
        <div className="marquee gap-3">
          {[...THREAT_TAGS, ...THREAT_TAGS].map((t, i) => (
            <span
              key={i}
              className="shrink-0 mx-1.5 px-3 py-1 rounded-full border border-slate-700/70 text-[11px] text-slate-300 bg-slate-900/60"
            >
              <span className="text-cyan-400 mr-1">◈</span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Scan form / locked state */}
      <div className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8">
        {scansLeft > 0 ? (
          <Reveal>
            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-xl glow-border space-y-4">
              <form onSubmit={handleAudit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-cyan-500">
                    <Terminal className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs sm:text-sm shadow-inner"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-6 py-3.5 rounded-xl transition-all text-xs sm:text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Radar className="w-4 h-4 animate-spin" /> ANALYZING…
                    </>
                  ) : (
                    <>
                      EXECUTE FULL SCAN <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
              {redeemSuccess && (
                <p className="text-emerald-400 text-xs text-center">{redeemSuccess}</p>
              )}
              {error && (
                <p className="text-rose-400 text-xs text-center font-sans">{error}</p>
              )}
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="bg-slate-900/90 border border-rose-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-2xl text-rose-400">
                  <Lock className="w-8 h-8 animate-bounce" />
                </div>
                <h2 className="text-lg font-bold text-rose-300 uppercase tracking-wider">
                  Scan Quota Exhausted
                </h2>
                <p className="text-xs text-slate-400 max-w-md font-sans">
                  You have used every free audit. Enter an Access Pass or Master
                  Bypass Code to unlock more scans.
                </p>
              </div>
              <form
                onSubmit={handleRedeemBypassCode}
                className="max-w-md mx-auto flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-cyan-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="ENTER BYPASS CODE"
                    value={bypassCode}
                    onChange={(e) => setBypassCode(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs uppercase tracking-widest"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={redeeming}
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition-all text-xs disabled:opacity-50"
                >
                  {redeeming ? 'VERIFYING…' : 'REDEEM CODE'}
                </motion.button>
              </form>
              {redeemSuccess && (
                <p className="text-emerald-400 text-xs font-bold">{redeemSuccess}</p>
              )}
              {error && <p className="text-rose-400 text-xs font-sans">{error}</p>}
            </div>
          </Reveal>
        )}

        {/* Results */}
        {audit && (
          <div ref={resultsRef} className="space-y-8 scroll-mt-24">
            {/* Summary band: gauge + stat tiles */}
            <Reveal>
              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 bg-slate-900/70 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl glow-border">
                <div className="flex items-center justify-center">
                  <ScoreGauge
                    score={audit.score}
                    grade={audit.grade}
                    label="Security posture"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-center">
                  <StatTile
                    icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
                    label="Secure"
                    value={meta?.counts?.secure ?? 0}
                    accent="text-emerald-400"
                  />
                  <StatTile
                    icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
                    label="Weak"
                    value={meta?.counts?.weak ?? 0}
                    accent="text-amber-400"
                  />
                  <StatTile
                    icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
                    label="Vulnerable"
                    value={meta?.counts?.vulnerable ?? 0}
                    accent="text-rose-400"
                  />
                  <StatTile
                    icon={<Server className="w-4 h-4 text-cyan-400" />}
                    label="Status"
                    value={meta?.statusCode ?? '—'}
                    accent="text-cyan-400"
                  />
                  <StatTile
                    icon={<Timer className="w-4 h-4 text-cyan-400" />}
                    label="Latency"
                    value={`${meta?.responseTimeMs ?? 0}ms`}
                    accent="text-cyan-400"
                  />
                  <StatTile
                    icon={<Gauge className="w-4 h-4 text-purple-400" />}
                    label="Protocol"
                    value={(meta?.protocol ?? '—').toUpperCase()}
                    accent="text-purple-400"
                  />
                </div>
              </div>
            </Reveal>

            {/* Animated analytics */}
            <Reveal delay={60}>
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Visual Analytics
                </h2>
                <AuditCharts
                  results={results}
                  counts={
                    meta?.counts ?? { secure: 0, weak: 0, vulnerable: 0 }
                  }
                />
              </div>
            </Reveal>

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                <Terminal className="w-4 h-4" /> Vulnerability Diagnostic Report
              </h2>
              <span className="text-[11px] text-slate-400 truncate max-w-[55%]">
                Target: <strong className="text-slate-200">{audit.url}</strong>
              </span>
            </div>

            <div className="space-y-5">
              {results.map((res: any, i: number) => (
                <Reveal key={res.id} delay={(i % 4) * 60}>
                  <motion.div
                    whileHover={{ scale: 1.008 }}
                    className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md space-y-4 ${
                      res.status === 'SECURE'
                        ? 'bg-slate-900/80 border-emerald-800/60'
                        : res.status === 'WEAK'
                        ? 'bg-slate-900/80 border-amber-800/70'
                        : 'bg-slate-900/80 border-rose-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {res.status === 'SECURE' ? (
                          <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        ) : res.status === 'WEAK' ? (
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
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${severityBadge(
                            res.severity
                          )}`}
                        >
                          {res.severity}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full font-bold text-[11px] border ${
                            res.status === 'SECURE'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : res.status === 'WEAK'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-800/80 pb-3">
                      <span>
                        Category:{' '}
                        <strong className="text-slate-300">{res.category}</strong>
                      </span>
                      <span>
                        OWASP: <strong className="text-cyan-300">{res.owasp}</strong>
                      </span>
                      <span>
                        CIA: <strong className="text-purple-300">{res.cia}</strong>
                      </span>
                    </div>

                    <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
                      <span className="text-slate-500 block">Technical Finding:</span>
                      <p
                        className={
                          res.status === 'SECURE'
                            ? 'text-emerald-400'
                            : res.status === 'WEAK'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }
                      >
                        {res.finding}
                      </p>
                      {res.value && (
                        <div className="text-slate-400 pt-1 text-[10px] break-all">
                          Raw: <span className="text-cyan-300">{res.value}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
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
                          <ExternalLink className="w-3.5 h-3.5" /> Exploitation Scenario
                        </span>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          {res.exploit}
                        </p>
                      </div>
                    </div>

                    {res.analogy && (
                      <div className="bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-800/40 space-y-1 font-sans">
                        <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> In Plain Terms
                        </span>
                        <p className="text-[11px] leading-relaxed text-cyan-100/90">
                          {res.analogy}
                        </p>
                      </div>
                    )}

                    {res.remediation && res.status !== 'SECURE' && (
                      <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-800/50 space-y-1 font-sans">
                        <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" /> Recommended Fix
                        </span>
                        <p className="text-[11px] leading-relaxed text-emerald-100/90 break-words">
                          {res.remediation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                </Reveal>
              ))}
            </div>

            {/* SEO & Discoverability */}
            {audit.seo?.length > 0 && (
              <div className="space-y-5 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                    <Search className="w-4 h-4" /> SEO &amp; Discoverability
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Score:{' '}
                    <strong
                      className={
                        audit.seoScore >= 80
                          ? 'text-emerald-400'
                          : audit.seoScore >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    >
                      {audit.seoScore}/100 ({audit.seoGrade})
                    </strong>
                  </span>
                </div>

                <Reveal>
                  <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 bg-slate-900/70 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center justify-center">
                      <ScoreGauge
                        score={audit.seoScore}
                        grade={audit.seoGrade}
                        label="SEO score"
                        size={130}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-center">
                      {audit.seo.map((s: any) => (
                        <div
                          key={s.id}
                          className={`rounded-xl border p-3 space-y-1 ${
                            s.status === 'PASS'
                              ? 'bg-slate-950/60 border-emerald-800/50'
                              : s.status === 'WARN'
                              ? 'bg-slate-950/60 border-amber-800/60'
                              : 'bg-slate-950/60 border-rose-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                              {s.status === 'PASS' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : s.status === 'WARN' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              )}
                              {s.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                s.status === 'PASS'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : s.status === 'WARN'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-rose-950 text-rose-400 border-rose-800'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                            {s.finding}
                          </p>
                          <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                            {s.explanation}
                          </p>
                          {s.status !== 'PASS' && (
                            <p className="text-[10px] text-emerald-300/90 font-sans leading-relaxed">
                              <span className="font-bold">Fix: </span>
                              {s.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Reveal>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="relative z-10 border-t border-slate-800/60 py-6 text-center text-[11px] text-slate-500 font-sans">
        cyberAir — non-destructive security posture analysis. Scan only targets
        you are authorized to test.
      </footer>
    </main>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
        <span>{label}</span>
        {icon}
      </div>
      <span className={`text-lg font-extrabold ${accent}`}>{value}</span>
    </div>
  );
}
