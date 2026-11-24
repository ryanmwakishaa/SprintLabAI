import { useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { useData } from '../lib/data';
import { METRIC_LABELS, STRENGTH_METRICS, TIMED_METRICS, type PerformanceMetric, type PerformanceResult } from '../lib/types';
import { analyseMetricProgress } from '../lib/coach';
import { exportAllData } from '../lib/db';
import { Badge, Card, Modal, NumberField, PageHeader, EmptyState } from './ui';

type Tab = 'sprints' | 'strength' | 'bodyweight';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'sprints', label: 'Sprint times' },
  { id: 'strength', label: 'Gym strength' },
  { id: 'bodyweight', label: 'Bodyweight' },
];

const SPRINT_METRICS: PerformanceMetric[] = TIMED_METRICS;
const BODY_METRICS: PerformanceMetric[] = ['bodyweight'];

export default function PerformanceScreen() {
  const { results, saveResult, deleteResult, clearSampleData } = useData();
  const [tab, setTab] = useState<Tab>('sprints');
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric>('100m');
  const [logOpen, setLogOpen] = useState(false);
  const [form, setForm] = useState({ metric: '100m' as PerformanceMetric, value: '', timing: 'hand' as 'hand' | 'electronic', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [exporting, setExporting] = useState(false);
  const hasSample = results.some((r) => r.is_sample);

  const metricsForTab: PerformanceMetric[] =
    tab === 'sprints' ? SPRINT_METRICS : tab === 'strength' ? STRENGTH_METRICS : BODY_METRICS;

  const series = useMemo(
    () =>
      results
        .filter((r) => r.metric === selectedMetric)
        .sort((a, b) => (a.result_date < b.result_date ? -1 : 1)),
    [results, selectedMetric],
  );

  // Separate by timing method — never mix hand and electronic times on one line
  const handSeries = series.filter((r) => r.timing_method === 'hand');
  const elecSeries = series.filter((r) => r.timing_method === 'electronic');
  const analysis = analyseMetricProgress(results, selectedMetric);
  const lowerIsBetter = !STRENGTH_METRICS.includes(selectedMetric) && selectedMetric !== 'bodyweight';

  async function handleExport() {
    setExporting(true);
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sprintlab-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSave() {
    const value = parseFloat(form.value);
    if (isNaN(value) || value <= 0) return;
    await saveResult({
      result_date: form.date,
      metric: form.metric,
      value,
      timing_method: form.timing,
      is_sample: false,
      notes: form.notes || undefined,
    });
    setSelectedMetric(form.metric);
    setLogOpen(false);
    setForm({ ...form, value: '', notes: '' });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Performance"
        subtitle="Track your progress across every measured quality"
        action={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
          >
            <Download size={13} /> Export data
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex rounded-xl bg-white/5 p-1 text-sm font-medium">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSelectedMetric(t.id === 'sprints' ? '100m' : t.id === 'strength' ? 'squat_1rm' : 'bodyweight');
            }}
            className={`flex-1 rounded-lg py-2 transition ${
              tab === t.id ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {metricsForTab.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMetric(m)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selectedMetric === m
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Analysis banner */}
      {analysis && (
        <Card
          className={`${
            analysis.plateau
              ? 'border-amber-500/30 bg-amber-500/5'
              : analysis.improving
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <p className="text-sm leading-relaxed text-zinc-200">{analysis.message}</p>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">{METRIC_LABELS[selectedMetric]}</h3>
          <div className="flex items-center gap-2">
            {handSeries.length > 0 && <Badge>Hand-timed</Badge>}
            {elecSeries.length > 0 && <Badge tone="info">Electronic</Badge>}
          </div>
        </div>
        {series.length < 2 ? (
          <EmptyState
            icon={Plus}
            title="Not enough data yet"
            description={`Log at least two ${METRIC_LABELS[selectedMetric]} results to see your trend.`}
          />
        ) : (
          <TrendChart
            series={[
              ...(handSeries.length >= 2 ? [{ label: 'hand', color: '#10b981', points: handSeries, invert: lowerIsBetter }] : []),
              ...(elecSeries.length >= 2 ? [{ label: 'electronic', color: '#38bdf8', points: elecSeries, invert: lowerIsBetter }] : []),
            ]}
          />
        )}
        {/* Table of recent results */}
        <div className="mt-4 space-y-1.5">
          {[...series]
            .sort((a, b) => (a.result_date < b.result_date ? 1 : -1))
            .slice(0, 8)
            .map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                <span className="w-20 shrink-0 text-xs text-zinc-500">
                  {new Date(r.result_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <span className="font-semibold text-zinc-100">{r.value}{selectedMetric.includes('rm') || selectedMetric === 'bodyweight' ? ' kg' : ' s'}</span>
                <div className="flex flex-1 items-center gap-2">
                  {r.is_sample && <Badge tone="warn">sample</Badge>}
                  <span className="text-xs text-zinc-500">{r.timing_method === 'electronic' ? 'electronic' : 'hand'}</span>
                </div>
                {!r.is_sample && (
                  <button
                    onClick={() => r.id && deleteResult(r.id)}
                    className="p-1 text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
        </div>
      </Card>

      {hasSample && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-300">
            Your charts include clearly-labelled <strong>sample data</strong> from the demo so trends are visible. Clear it once you've logged your own results.
          </p>
          <button
            onClick={() => clearSampleData()}
            className="mt-2 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
          >
            Remove sample data
          </button>
        </Card>
      )}

      {/* FAB */}
      <button
        onClick={() => setLogOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-500 p-3.5 text-zinc-950 shadow-lg shadow-emerald-500/25 transition active:scale-95"
        style={{ height: 52, width: 52 }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Log modal */}
      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Log a result">
        <div className="mb-3">
          <label className="label">Metric</label>
          <select
            value={form.metric}
            onChange={(e) => setForm({ ...form, metric: e.target.value as PerformanceMetric })}
            className="input"
          >
            <optgroup label="Sprint times (s)">
              {TIMED_METRICS.map((m) => (
                <option key={m} value={m}>{METRIC_LABELS[m]}</option>
              ))}
            </optgroup>
            <optgroup label="Gym strength (kg)">
              {STRENGTH_METRICS.map((m) => (
                <option key={m} value={m}>{METRIC_LABELS[m]}</option>
              ))}
            </optgroup>
            <optgroup label="Bodyweight (kg)">
              {BODY_METRICS.map((m) => (
                <option key={m} value={m}>{METRIC_LABELS[m]}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <NumberField label="Value" value={form.value} onChange={(v) => setForm({ ...form, value: v })} step="0.01" />
        <div className="mb-3">
          <label className="label">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
        </div>
        {(TIMED_METRICS.includes(form.metric)) && (
          <div className="mb-3">
            <label className="label">Timing method</label>
            <div className="flex rounded-xl bg-white/5 p-1 text-sm font-medium">
              {(['hand', 'electronic'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm({ ...form, timing: m })}
                  className={`flex-1 rounded-lg py-2 transition ${
                    form.timing === m ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
                  }`}
                >
                  {m === 'hand' ? 'Hand-timed' : 'Electronic'}
                </button>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleSave} className="btn-primary" disabled={!form.value}>
          Save result
        </button>
      </Modal>
    </div>
  );
}

interface ChartSeries {
  label: string;
  color: string;
  points: PerformanceResult[];
  invert: boolean;
}

function TrendChart({ series }: { series: ChartSeries[] }) {
  const all = series.flatMap((s) => s.points);
  if (all.length < 2) return null;

  const dates = [...new Set(all.map((p) => p.result_date))].sort();
  const values = all.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pad = (maxV - minV) * 0.15 || 0.5;
  const yMin = minV - pad;
  const yMax = maxV + pad;

  const W = 320;
  const H = 150;
  const PL = 34;
  const PR = 8;
  const PT = 10;
  const PB = 20;

  function x(date: string): number {
    return PL + (dates.indexOf(date) / (dates.length - 1)) * (W - PL - PR);
  }
  function y(v: number): number {
    return PT + (1 - (v - yMin) / (yMax - yMin)) * (H - PT - PB);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
          <g key={i}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth="0.5" />
            <text x={PL - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fill="#71717a">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {series.map((s) => {
          const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.result_date)} ${y(p.value)}`).join(' ');
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
              {s.points.map((p, i) => (
                <circle key={i} cx={x(p.result_date)} cy={y(p.value)} r="2.5" fill={s.color} />
              ))}
            </g>
          );
        })}
        <text x={PL} y={H - 6} fontSize="8" fill="#71717a">
          {new Date(dates[0] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </text>
        <text x={W - PR} y={H - 6} fontSize="8" fill="#71717a" textAnchor="end">
          {new Date(dates[dates.length - 1] + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </text>
      </svg>
      <div className="mt-1 flex justify-center gap-4">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="h-1.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
