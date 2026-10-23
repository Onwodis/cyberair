'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

const tip = {
  contentStyle: {
    background: '#020617',
    border: '1px solid #1e293b',
    borderRadius: 12,
    fontSize: 11,
    fontFamily: 'ui-monospace, monospace',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

export function QueryBars({
  day,
  month,
  year,
}: {
  day: number;
  month: number;
  year: number;
}) {
  const data = [
    { label: 'Today', value: day, color: '#22d3ee' },
    { label: 'Month', value: month, color: '#34d399' },
    { label: 'Year', value: year, color: '#a855f7' },
  ];
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="label"
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
        <Tooltip {...tip} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={900}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AttackOutcomeChart({ stats }: { stats: any }) {
  const data = [
    { name: 'Successful', value: stats.successful, color: '#34d399' },
    { name: 'Rate-Limited', value: stats.rateLimited, color: '#fbbf24' },
    { name: 'Failed', value: stats.failed, color: '#fb7185' },
    { name: 'Timeouts', value: stats.timeouts, color: '#f472b6' },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={48}
          outerRadius={78}
          paddingAngle={3}
          stroke="#020617"
          strokeWidth={2}
          animationDuration={900}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip {...tip} />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#94a3b8' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CompareRadar({
  targetA,
  targetB,
}: {
  targetA: any;
  targetB: any;
}) {
  if (!targetA?.results) return null;
  const categories = Array.from(
    new Set(targetA.results.map((r: any) => r.category))
  ) as string[];

  const coverage = (data: any, cat: string) => {
    if (!data?.results) return 0;
    const inCat = data.results.filter((r: any) => r.category === cat);
    if (!inCat.length) return 0;
    return Math.round(
      (inCat.filter((r: any) => r.status === 'SECURE').length / inCat.length) *
        100
    );
  };

  const data = categories.map((cat) => ({
    category: cat.replace(/ .*/, ''),
    A: coverage(targetA, cat),
    ...(targetB?.results ? { B: coverage(targetB, cat) } : {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius={92}>
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
          name="Target A"
          dataKey="A"
          stroke="#22d3ee"
          fill="#22d3ee"
          fillOpacity={0.3}
          animationDuration={1000}
        />
        {targetB?.results && (
          <Radar
            name="Target B"
            dataKey="B"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.25}
            animationDuration={1000}
          />
        )}
        <Legend wrapperStyle={{ fontSize: 10, color: '#94a3b8' }} />
        <Tooltip {...tip} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
