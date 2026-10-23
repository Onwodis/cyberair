'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  StopCircle,
  Zap,
} from 'lucide-react';

interface TestMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  serverCrashCount: number;
}

interface TestResult {
  status?: number;
  duration?: number;
  payload: any;
  error?: string;
}

interface ApiResponse {
  summary: TestMetrics;
  sampleResults: TestResult[];
}

export default function TestDashboard() {
  const [targetUrl, setTargetUrl] = useState('');
  const [totalRequests, setTotalRequests] = useState(50);
  const [concurrency, setConcurrency] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    setLoading(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-runner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUrl,
          totalRequests: Number(totalRequests),
          concurrency: Number(concurrency),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute test harness');
      }

      setResults(data);
    } catch (err: any) {
      setErrorMsg(
        err.message || 'An unexpected error occurred during execution.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" /> API Resilience & Load
              Test Harness
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Internal development utility to evaluate input validation and rate
              limiting.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-3.5 w-3.5" /> Dev Environment Only
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Configuration */}
          <section className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-slate-200 flex items-center gap-2">
              <Server className="h-5 w-5 text-indigo-400" /> Target
              Configuration
            </h2>

            <form onSubmit={handleRunTest} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Target Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="http://localhost:3000/api/endpoint"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Total Requests
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={totalRequests}
                  onChange={(e) => setTotalRequests(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Concurrency Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-lg shadow-indigo-600/20 disabled:cursor-not-allowed text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                    Executing Test Suite...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Run Test Harness
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Results Section */}
          <section className="lg:col-span-2 space-y-6">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">{errorMsg}</div>
              </div>
            )}

            {!results && !loading && !errorMsg && (
              <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 text-center text-slate-500">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  Configure your target endpoint and click "Run Test Harness" to
                  inspect response behaviors.
                </p>
              </div>
            )}

            {results && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Total Sent
                    </div>
                    <div className="text-2xl font-bold text-slate-100">
                      {results.summary.totalRequests}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                      Success (2xx)
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {results.summary.successCount}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                      Handled Err (4xx)
                    </div>
                    <div className="text-2xl font-bold text-amber-400">
                      {results.summary.errorCount}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
                      Server Crashes (5xx)
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {results.summary.serverCrashCount}
                    </div>
                  </div>
                </div>

                {/* Sample Logs */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center justify-between">
                    <span>Sample Request Inspector (First 10)</span>
                    <span className="text-xs font-normal text-slate-500">
                      Execution Stream
                    </span>
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Latency</th>
                          <th className="px-4 py-3">Injected Payload Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {results.sampleResults.map((item, idx) => {
                          const isSuccess =
                            item.status &&
                            item.status >= 200 &&
                            item.status < 300;
                          const isHandledError =
                            item.status &&
                            item.status >= 400 &&
                            item.status < 500;
                          const isServerCrash =
                            (item.status && item.status >= 500) || item.error;

                          return (
                            <tr
                              key={idx}
                              className="hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-mono">
                                {item.status ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                                      isSuccess
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : isHandledError
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}
                                  >
                                    {isSuccess && (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    {isHandledError && (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    {isServerCrash && (
                                      <StopCircle className="h-3 w-3" />
                                    )}
                                    {item.status}
                                  </span>
                                ) : (
                                  <span className="text-red-400">Failed</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400">
                                {item.duration
                                  ? `${item.duration.toFixed(2)} ms`
                                  : 'N/A'}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400 max-w-xs truncate">
                                {JSON.stringify(item.payload)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
