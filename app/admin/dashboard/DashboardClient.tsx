'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LogOut,
  ShieldCheck,
  Activity,
  Key,
  CreditCard,
  RefreshCw,
  Clock,
  TrendingUp,
  Zap,
  Globe,
  FileText,
  Bot,
  Sparkles,
  Database,
  Crosshair,
  Gauge,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Timer,
  Wrench,
  ChevronDown,
  BarChart3,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import CyberBackground from '../../components/CyberBackground';
import Reveal from '../../components/Reveal';
import {
  QueryBars,
  AttackOutcomeChart,
  CompareRadar,
} from '../../components/DashboardCharts';

export default function DashboardClient() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [maxQueries, setMaxQueries] = useState(25);
  const [createdCode, setCreatedCode] = useState('');
  const [generating, setGenerating] = useState(false);

  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);

  const [aiModeActive, setAiModeActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  const [attackUrl, setAttackUrl] = useState('');
  const [requestsCount, setRequestsCount] = useState(150);
  const [concurrency, setConcurrency] = useState(50);
  const [authorized, setAuthorized] = useState(false);
  const [attackLoading, setAttackLoading] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);

  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 401 || res.status === 403) {
        toast.error('Session expired. Please log in again.');
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch {
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxQueries }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedCode(data.code.code);
        toast.success(`Access pass created: ${data.code.code}`);
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to generate code.');
      }
    } catch {
      toast.error('Network error generating pass.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA) {
      toast.error('Provide at least Target URL A.');
      return;
    }
    setAuditLoading(true);
    setAuditResults(null);
    setAiReport(null);
    try {
      const res = await fetch('/api/admin/audit-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA, urlB }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuditResults(data);
        toast.success('Comparative header audit completed.');
      } else {
        toast.error(data.error || 'Audit failed.');
      }
    } catch {
      toast.error('Network error executing comparative audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRunRagAiAnalysis = async () => {
    if (!urlA) {
      toast.error('Enter Target URL A before AI evaluation.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch('/api/admin/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA, urlB, auditData: auditResults }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiReport(data.analysis);
        toast.success('RAG-enhanced AI analysis generated.');
      } else {
        toast.error(data.error || 'AI RAG evaluation failed.');
      }
    } catch {
      toast.error('Network error reaching AI endpoint.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunAttack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attackUrl) {
      toast.error('Enter a target URL you are authorized to test.');
      return;
    }
    if (!authorized) {
      toast.error('Confirm authorization before launching the simulation.');
      return;
    }
    setAttackLoading(true);
    setAttackResult(null);
    try {
      const res = await fetch('/api/admin/stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: attackUrl,
          requestsCount,
          concurrency,
          authorized,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttackResult(data.stats);
        toast.success('Resilience simulation complete.');
      } else {
        toast.error(data.error || 'Simulation failed.');
      }
    } catch {
      toast.error('Network error during simulation.');
    } finally {
      setAttackLoading(false);
    }
  };

  const handleDownloadPDF = () => window.print();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out safely.');
      router.push('/admin/login');
    } catch {
      toast.error('Logout error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex flex-col items-center justify-center font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs tracking-widest">LOADING COMMAND CENTER…</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-mono p-4 sm:p-8 space-y-6 sm:space-y-8 relative scanlines">
      <CyberBackground />

      {/* Header */}
      <header className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/60 rounded-xl glow-border">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-cyan-400 tracking-wide neon flex items-center gap-2">
              cyberAir · Command Center
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                <UserCog className="w-3 h-3" /> Super Admin
              </span>
              Security Assessment • Resilience Simulation • RAG AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/20"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </motion.button>
        </div>
      </header>

      <div ref={reportRef} className="relative z-10 space-y-6 sm:space-y-8">
        {/* KPI + trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: 'Queries Today',
                value: stats?.analytics?.day || 0,
                icon: <Clock className="w-4 h-4 text-cyan-400" />,
                color: 'text-cyan-400',
              },
              {
                label: 'Queries This Month',
                value: stats?.analytics?.month || 0,
                icon: <Activity className="w-4 h-4 text-emerald-400" />,
                color: 'text-emerald-400',
              },
              {
                label: 'Queries This Year',
                value: stats?.analytics?.year || 0,
                icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
                color: 'text-purple-400',
              },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 70}>
                <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-2 glow-border h-full">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span>{s.label}</span>
                    {s.icon}
                  </div>
                  <div className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>
                    {s.value}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md h-full">
              <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Query Volume
              </div>
              <QueryBars
                day={stats?.analytics?.day || 0}
                month={stats?.analytics?.month || 0}
                year={stats?.analytics?.year || 0}
              />
            </div>
          </Reveal>
        </div>

        {/* Attack simulation */}
        <Reveal>
          <div className="bg-slate-900/70 border border-rose-900/50 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-5">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
              <Crosshair className="w-5 h-5 text-rose-400" />
              <h2>Adversarial Resilience Simulation (Bot / Load)</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-sans max-w-3xl">
              Generates a bounded burst of concurrent bot-like requests (max 500
              requests / 100 concurrency) to measure how a target holds up under
              traffic — observing rate-limiting, latency degradation and
              availability. Use only against infrastructure you own or are
              explicitly contracted to test.
            </p>

            <form onSubmit={handleRunAttack} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="text-xs text-slate-400 block mb-1">
                  Authorized Target URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://your-own-target.com"
                    value={attackUrl}
                    onChange={(e) => setAttackUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-rose-200 focus:outline-none focus:border-rose-500 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Requests: <span className="text-rose-300">{requestsCount}</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={500}
                  step={10}
                  value={requestsCount}
                  onChange={(e) => setRequestsCount(Number(e.target.value))}
                  className="w-full accent-rose-500 mt-3"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Concurrency: <span className="text-rose-300">{concurrency}</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="w-full accent-rose-500 mt-3"
                />
              </div>

              <label className="lg:col-span-3 flex items-start gap-2 text-[11px] text-slate-300 font-sans bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span>
                  I confirm I own this target or have explicit written
                  authorization to perform load / resilience testing against it.
                </span>
              </label>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: authorized ? 1.02 : 1 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={attackLoading || !authorized}
                  className="w-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-rose-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {attackLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> SIMULATING…
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" /> LAUNCH SIMULATION
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {attackResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 pt-2"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
                  <ResultTile label="Total" value={attackResult.totalRequests} icon={<Gauge className="w-4 h-4" />} color="text-cyan-400" />
                  <ResultTile label="Successful" value={attackResult.successful} icon={<CheckCircle2 className="w-4 h-4" />} color="text-emerald-400" />
                  <ResultTile label="Rate-Limited" value={attackResult.rateLimited} icon={<ShieldCheck className="w-4 h-4" />} color="text-amber-400" />
                  <ResultTile label="Failed" value={attackResult.failed} icon={<XCircle className="w-4 h-4" />} color="text-rose-400" />
                  <ResultTile label="Timeouts" value={attackResult.timeouts} icon={<Timer className="w-4 h-4" />} color="text-rose-300" />
                  <ResultTile label="Avg Latency" value={`${attackResult.avgLatencyMs}ms`} icon={<Activity className="w-4 h-4" />} color="text-purple-400" />
                  <div className="col-span-2 sm:col-span-3">
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-sans ${
                        attackResult.siteInaccessible
                          ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                          : attackResult.rateLimited > 0
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                          : 'bg-amber-950/30 border-amber-800 text-amber-300'
                      }`}
                    >
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      {attackResult.siteInaccessible
                        ? 'Target degraded under load — availability controls (rate limiting, autoscaling, WAF) need review.'
                        : attackResult.rateLimited > 0
                        ? 'Target actively rate-limited the burst — healthy abuse protection detected.'
                        : 'Target absorbed the burst without visible throttling. Confirm rate limiting exists at the edge.'}
                    </div>
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 min-w-[260px]">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Outcome Distribution
                  </div>
                  <AttackOutcomeChart stats={attackResult} />
                </div>
              </motion.div>
            )}
          </div>
        </Reveal>

        {/* Comparative audit + AI */}
        <Reveal>
          <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2>Comparative Audit &amp; RAG AI Analysis</h2>
              </div>
              <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-300 font-medium">Jina RAG Mode</span>
                <button
                  type="button"
                  onClick={() => setAiModeActive(!aiModeActive)}
                  className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
                    aiModeActive ? 'bg-purple-600' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                      aiModeActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <form onSubmit={handleRunAudit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Target URL A</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://site-a.com"
                    value={urlA}
                    onChange={(e) => setUrlA(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Target URL B (optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://site-b.com"
                    value={urlB}
                    onChange={(e) => setUrlB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={auditLoading}
                  className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {auditLoading ? 'RUNNING AUDIT…' : 'RUN HEADER AUDIT'}
                </motion.button>
              </div>
            </form>

            {auditResults && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TargetSummary title="Target A" data={auditResults.targetA} />
                  {auditResults.targetB && (
                    <TargetSummary title="Target B" data={auditResults.targetB} />
                  )}
                </div>

                {auditResults.targetA?.results && (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Control
                      Coverage by Category
                    </div>
                    <CompareRadar
                      targetA={auditResults.targetA}
                      targetB={auditResults.targetB}
                    />
                  </div>
                )}

                {auditResults.targetA?.results && (
                  <DetailedFindings title="Target A" data={auditResults.targetA} />
                )}
                {auditResults.targetB?.results && (
                  <DetailedFindings title="Target B" data={auditResults.targetB} />
                )}
              </div>
            )}

            {aiModeActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="pt-2"
              >
                <div className="bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/30 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-purple-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-purple-300">
                        Jina AI Embeddings + RAG Pipeline Ready
                      </h3>
                      <p className="text-[11px] text-slate-400 font-sans">
                        Vector similarity search over security benchmarks for an
                        executive design & vulnerability summary.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunRagAiAnalysis}
                    disabled={aiLoading}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20 shrink-0 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiLoading ? 'QUERYING RAG…' : 'EXECUTE AI RAG EVALUATION'}
                  </button>
                </div>
              </motion.div>
            )}

            {aiReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950 border border-purple-800/60 p-6 rounded-xl space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Bot className="w-5 h-5" />
                  <span>Executive RAG Analysis (OpenAI + Jina AI Vector Search)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <AiScore label="Design & Aesthetics" value={aiReport.aestheticsScore} color="text-cyan-400" />
                  <AiScore label="Layout & Responsiveness" value={aiReport.responsivenessScore} color="text-emerald-400" />
                  <AiScore label="Overall Security" value={aiReport.securityScore} color="text-purple-400" />
                </div>
                <div className="space-y-3 text-xs text-slate-300 font-sans">
                  <p className="leading-relaxed">
                    <strong className="text-purple-300 font-mono">Executive Summary:</strong>{' '}
                    {aiReport.summary}
                  </p>
                  <div>
                    <strong className="text-cyan-300 font-mono block mb-1">
                      RAG Context Recommendations:
                    </strong>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                      {aiReport.recommendations?.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Reveal>

        {/* Access code + transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Reveal className="lg:col-span-1">
            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4 h-full">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Key className="w-4 h-4" />
                <h2>Generate Access Pass</h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Create access passes with custom scan limits.
              </p>
              <form onSubmit={handleGenerateCode} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Max Allowable Queries
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={maxQueries}
                    onChange={(e) => setMaxQueries(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-cyan-600/20"
                >
                  {generating ? 'GENERATING…' : 'GENERATE CODE'}
                </motion.button>
              </form>
              {createdCode && (
                <div className="bg-slate-950 border border-cyan-800/80 p-4 rounded-xl text-center space-y-1 mt-4">
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Generated Code
                  </span>
                  <span className="text-lg font-bold text-cyan-400 tracking-wider">
                    {createdCode}
                  </span>
                </div>
              )}
            </div>
          </Reveal>

          <Reveal className="lg:col-span-2" delay={80}>
            <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4 h-full">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <CreditCard className="w-4 h-4" />
                <h2>Paystack Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 pr-4">Reference</th>
                      <th className="pb-3 pr-4">Email</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stats?.transactions?.length > 0 ? (
                      stats.transactions.map((tx: any) => (
                        <tr key={tx._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 pr-4 font-mono text-cyan-300 font-semibold">
                            {tx.reference}
                          </td>
                          <td className="py-3 pr-4 text-slate-300">{tx.email}</td>
                          <td className="py-3 pr-4 text-slate-200">₦{tx.amount}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                tx.status === 'success'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          No Paystack transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}

function ResultTile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
        <span>{label}</span>
        <span className={color}>{icon}</span>
      </div>
      <span className={`text-lg font-extrabold ${color}`}>{value}</span>
    </div>
  );
}

function AiScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
      <span className="text-[10px] text-slate-400 block">{label}</span>
      <span className={`text-xl font-extrabold ${color}`}>{value}/100</span>
    </div>
  );
}

function TargetSummary({ title, data }: { title: string; data: any }) {
  if (!data) return null;
  if (data.error) {
    return (
      <div className="bg-slate-950/60 border border-rose-800/60 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-200 mb-1">{title}</div>
        <div className="text-[11px] text-rose-400 break-all">{data.error}</div>
        <div className="text-[10px] text-slate-500 break-all mt-1">{data.url}</div>
      </div>
    );
  }
  const band =
    data.score >= 80 ? 'text-emerald-400' : data.score >= 50 ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-200">
          {title} · <span className="text-slate-400">{data.grade}</span>
        </div>
        <div className={`text-2xl font-extrabold ${band}`}>
          {data.score}
          <span className="text-xs text-slate-500">/100</span>
        </div>
      </div>
      <div className="text-[10px] text-slate-500 break-all">{data.url}</div>
      <div className="flex gap-2 text-[11px] flex-wrap">
        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
          {data.meta?.counts?.secure ?? 0} secure
        </span>
        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
          {data.meta?.counts?.weak ?? 0} weak
        </span>
        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
          {data.meta?.counts?.vulnerable ?? 0} vulnerable
        </span>
        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {data.meta?.responseTimeMs ?? 0}ms
        </span>
      </div>
    </div>
  );
}

function DetailedFindings({ title, data }: { title: string; data: any }) {
  const [open, setOpen] = useState(false);
  const issues = data.results.filter((r: any) => r.status !== 'SECURE');
  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-200 hover:bg-slate-900/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-emerald-400" />
          {title} — Detailed Findings &amp; Fixes ({issues.length} open)
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto">
          {data.results.map((r: any) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-100">{r.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{r.owasp}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      r.status === 'SECURE'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : r.status === 'WEAK'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
              <p
                className={`text-[11px] ${
                  r.status === 'SECURE'
                    ? 'text-emerald-400'
                    : r.status === 'WEAK'
                    ? 'text-amber-300'
                    : 'text-rose-400'
                }`}
              >
                {r.finding}
              </p>
              {r.analogy && (
                <p className="text-[11px] text-cyan-100/80 font-sans bg-cyan-950/20 border border-cyan-800/40 rounded-lg p-2 break-words">
                  <span className="font-bold text-cyan-400">In plain terms: </span>
                  {r.analogy}
                </p>
              )}
              {r.status !== 'SECURE' && (
                <p className="text-[11px] text-emerald-100/80 font-sans bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-2 break-words">
                  <span className="font-bold text-emerald-400">Fix: </span>
                  {r.remediation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
