'use client';

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts';
import { PieChart as PieIcon, Radar as RadarIcon, BarChart3 } from 'lucide-react';

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#a855f7',
  HIGH: '#fb7185',
  MEDIUM: '#fbbf24',
  LOW: '#38bdf8',
  INFO: '#64748b',
};

function chartTooltip(bg = '#020617') {
  return {
    contentStyle: {
      background: bg,
      border: '1px solid #1e293b',
      borderRadius: 12,
      fontSize: 11,
      fontFamily: 'ui-monospace, monospace',
    },
    labelStyle: { color: '#94a3b8' },
    itemStyle: { color: '#e2e8f0' },
  };
}

export default function AuditCharts({
  results,
  counts,
}: {
  results: any[];
  counts: { secure: number; weak: number; vulnerable: number };
}) {
  // Findings by severity (only issues — weak/vulnerable)
  const bySeverity = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    issues: results.filter(
      (r) => r.severity === sev && r.status !== 'SECURE'
    ).length,
  })).filter((d) => d.issues > 0);

  // Category coverage radar: % of checks SECURE per category
  const categories = Array.from(new Set(results.map((r) => r.category)));
  const radarData = categories.map((cat) => {
    const inCat = results.filter((r) => r.category === cat);
    const secure = inCat.filter((r) => r.status === 'SECURE').length;
    return {
      category: cat.replace(/ .*/, ''),
      fullCategory: cat,
      coverage: Math.round((secure / inCat.length) * 100),
    };
  });

  // Posture distribution donut
  const donut = [
    { name: 'Secure', value: counts.secure, color: '#34d399' },
    { name: 'Weak', value: counts.weak, color: '#fbbf24' },
    { name: 'Vulnerable', value: counts.vulnerable, color: '#fb7185' },
  ].filter((d) => d.value > 0);

  // Score impact: how many points each failing control removed (explains grade)
  const impact = results
    .filter((r) => (r.impact ?? 0) > 0)
    .map((r) => ({
      name: r.name.replace(/\s*\(.*\)/, ''),
      points: r.impact,
      color:
        r.severity === 'CRITICAL'
          ? '#a855f7'
          : r.severity === 'HIGH'
          ? '#fb7185'
          : r.severity === 'MEDIUM'
          ? '#fbbf24'
          : '#38bdf8',
    }))
    .sort((a, b) => b.points - a.points);
  const totalLost = impact.reduce((s, d) => s + d.points, 0);

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Posture donut */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-2">
          <PieIcon className="w-3.5 h-3.5 text-cyan-400" /> Posture Distribution
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={donut}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={3}
              stroke="#020617"
              strokeWidth={2}
              animationDuration={900}
              animationBegin={120}
            >
              {donut.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip {...chartTooltip()} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-3 text-[10px] text-slate-400">
          {donut.map((d) => (
            <span key={d.name} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: d.color }}
              />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 font-sans mt-2 leading-relaxed">
          In plain terms: how many safety checks the site passed (green),
          partly passed (amber), or failed (red).
        </p>
      </div>

      {/* Severity bars */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-rose-400" /> Open Issues by Severity
        </div>
        <ResponsiveContainer width="100%" height={240}>
          {bySeverity.length ? (
            <BarChart data={bySeverity} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="severity"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <Tooltip {...chartTooltip()} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="issues" radius={[6, 6, 0, 0]} animationDuration={900}>
                {bySeverity.map((d) => (
                  <Cell key={d.severity} fill={SEVERITY_COLOR[d.severity]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <EmptyChart label="No open issues 🎉" />
          )}
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
          In plain terms: the taller the bar, the more serious the problems
          found at that level (critical is most urgent).
        </p>
      </div>

      {/* Category coverage radar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider mb-2">
          <RadarIcon className="w-3.5 h-3.5 text-emerald-400" /> Control Coverage
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData} outerRadius={82}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: '#94a3b8', fontSize: 9 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: '#475569', fontSize: 8 }}
              axisLine={false}
            />
            <Radar
              dataKey="coverage"
              stroke="#34d399"
              fill="#34d399"
              fillOpacity={0.35}
              animationDuration={1000}
            />
            <Tooltip {...chartTooltip()} />
          </RadarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
          In plain terms: how fully each area of defence is covered. A shape
          that reaches the outer edge everywhere is ideal.
        </p>
      </div>
    </div>

    {/* Score impact — why the grade is what it is */}
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-300 font-bold uppercase tracking-wider">
          <BarChart3 className="w-3.5 h-3.5 text-purple-400" /> Why This Score?
        </div>
        <span className="text-[10px] text-slate-400">
          Started at 100 · lost{' '}
          <strong className="text-rose-400">{totalLost}</strong> point(s)
        </span>
      </div>
      {impact.length ? (
        <ResponsiveContainer width="100%" height={Math.max(120, impact.length * 34)}>
          <BarChart
            data={impact}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fill: '#cbd5e1', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...chartTooltip()}
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              formatter={(v: any) => [`-${v} pts`, 'Deduction']}
            />
            <Bar dataKey="points" radius={[0, 6, 6, 0]} animationDuration={1000}>
              {impact.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="py-6 text-center text-xs text-emerald-400">
          Nothing deducted — every control passed. 🎉
        </div>
      )}
      <p className="text-[10px] text-slate-500 font-sans mt-1 leading-relaxed">
        In plain terms: every site starts at 100/100. Each missing or weak
        protection subtracts points — the longest bars are what to fix first to
        raise the grade the fastest.
      </p>
    </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-xs text-emerald-400">
      {label}
    </div>
  );
}
