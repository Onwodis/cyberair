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
  AlertOctagon,
  Bot,
  Sparkles,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maxQueries, setMaxQueries] = useState(25);
  const [createdCode, setCreatedCode] = useState('');
  const [generating, setGenerating] = useState(false);

  // Dual-URL Audit States
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);

  // AI & RAG Module States
  const [aiModeActive, setAiModeActive] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

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
    } catch (err) {
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
    } catch (err) {
      toast.error('Network error generating pass.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlA || !urlB) {
      toast.error('Please specify both Target URLs for comparative analysis.');
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
        toast.success('Comparative header audit completed successfully.');
      } else {
        toast.error(data.error || 'Audit failed.');
      }
    } catch (err) {
      toast.error('Network error executing comparative audit.');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRunRagAiAnalysis = async () => {
    if (!urlA || !urlB) {
      toast.error('Please enter Target URLs before executing AI evaluation.');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/admin/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlA,
          urlB,
          auditData: auditResults,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiReport(data.analysis);
        toast.success('RAG-enhanced AI analysis generated successfully.');
      } else {
        toast.error(data.error || 'AI RAG evaluation failed.');
      }
    } catch (err) {
      toast.error('Network error reaching AI endpoint.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out safely.');
      router.push('/admin/login');
    } catch (err) {
      toast.error('Logout error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex flex-col items-center justify-center font-mono gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs tracking-widest">
          LOADING COMMAND CENTER...
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-mono p-4 sm:p-8 space-y-6 sm:space-y-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/60 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-cyan-400 tracking-wide">
              COMMAND_CENTER
            </h1>
            <p className="text-[11px] text-slate-400">
              Executive Security & RAG AI Evaluation Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF Report
          </button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </motion.button>
        </div>
      </header>

      {/* Printable Report Wrapper */}
      <div ref={reportRef} className="space-y-6 sm:space-y-8">
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Queries Today</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400">
              {stats?.analytics?.day || 0}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Queries This Month</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {stats?.analytics?.month || 0}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Queries This Year</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-400">
              {stats?.analytics?.year || 0}
            </div>
          </div>
        </div>

        {/* Dual-URL Comparative Security & RAG AI Panel */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2>Comparative Audit & RAG AI Analysis</h2>
            </div>

            {/* AI Mode Toggle */}
            <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300 font-medium">
                Jina RAG Mode
              </span>
              <button
                type="button"
                onClick={() => setAiModeActive(!aiModeActive)}
                className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
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

          <form
            onSubmit={handleRunAudit}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
          >
            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Target URL A
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Globe className="w-4 h-4" />
                </span>
                <input
                  type="url"
                  placeholder="https://site-a.com"
                  value={urlA}
                  onChange={(e) => setUrlA(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Target URL B
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Globe className="w-4 h-4" />
                </span>
                <input
                  type="url"
                  placeholder="https://site-b.com"
                  value={urlB}
                  onChange={(e) => setUrlB(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={auditLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
              >
                {auditLoading ? 'RUNNING AUDIT...' : 'RUN HEADER AUDIT'}
              </motion.button>
            </div>
          </form>

          {/* AI Trigger Container */}
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
                      Uses vector similarity search over security benchmarks to
                      produce an executive design and vulnerability summary.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunRagAiAnalysis}
                  disabled={aiLoading}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-600/20 cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiLoading
                    ? 'QUERYING RAG PIPELINE...'
                    : 'EXECUTE AI RAG EVALUATION'}
                </button>
              </div>
            </motion.div>
          )}

          {/* AI Output Panel */}
          {aiReport && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950 border border-purple-800/60 p-6 rounded-xl space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Bot className="w-5 h-5" />
                <span>
                  Executive RAG Analysis (OpenAI + Jina AI Vector Search)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    Design & Aesthetics
                  </span>
                  <span className="text-xl font-extrabold text-cyan-400">
                    {aiReport.aestheticsScore}/100
                  </span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    Layout & Responsiveness
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {aiReport.responsivenessScore}/100
                  </span>
                </div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    Overall Security Score
                  </span>
                  <span className="text-xl font-extrabold text-purple-400">
                    {aiReport.securityScore}/100
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 font-sans">
                <p className="leading-relaxed">
                  <strong className="text-purple-300 font-mono">
                    Executive Summary:
                  </strong>{' '}
                  {aiReport.summary}
                </p>
                <div>
                  <strong className="text-cyan-300 font-mono block mb-1">
                    RAG Context Recommendations:
                  </strong>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    {aiReport.recommendations?.map(
                      (rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Access Code Generation & Paystack Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4 lg:col-span-1">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={generating}
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs shadow-lg shadow-cyan-600/20 cursor-pointer"
              >
                {generating ? 'GENERATING...' : 'GENERATE CODE'}
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

          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4 lg:col-span-2">
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
                      <tr
                        key={tx._id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 pr-4 font-mono text-cyan-300 font-semibold">
                          {tx.reference}
                        </td>
                        <td className="py-3 pr-4 text-slate-300">{tx.email}</td>
                        <td className="py-3 pr-4 text-slate-200">
                          ₦{tx.amount}
                        </td>
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
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 text-xs"
                      >
                        No Paystack transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
