import { useMemo, useState } from 'react';
import { Check, HeartPulse, History } from 'lucide-react';
import { useData, todayStr } from '../lib/data';
import { assessReadiness, computeReadiness } from '../lib/coach';
import { Badge, Card, PageHeader, ProgressRing, SectionTitle, Slider, TextField } from './ui';

interface FormState {
  sleep_hours: number;
  sleep_quality: number;
  soreness: number;
  energy: number;
  motivation: number;
  fatigue: number;
  notes: string;
}

export default function RecoveryScreen() {
  const { readinessLogs, sessions, saveReadiness, loading } = useData();
  const existing = readinessLogs.find((r) => r.log_date === todayStr());
  const [form, setForm] = useState<FormState>({
    sleep_hours: existing?.sleep_hours ?? 7.5,
    sleep_quality: existing?.sleep_quality ?? 3,
    soreness: existing?.soreness ?? 2,
    energy: existing?.energy ?? 3,
    motivation: existing?.motivation ?? 3,
    fatigue: existing?.fatigue ?? 2,
    notes: existing?.notes ?? '',
  });
  const [saved, setSaved] = useState(false);

  const score = computeReadiness(form);
  const assessment = useMemo(
    () => assessReadiness({ ...form, readiness_score: score, log_date: todayStr() }, sessions),
    [form, score, sessions],
  );

  async function handleSave() {
    await saveReadiness({ log_date: todayStr(), ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const recent = readinessLogs.slice(0, 14).sort((a, b) => (a.log_date < b.log_date ? -1 : 1));

  if (loading) return null;

  const statusTone = assessment.status === 'ready' ? 'good' : assessment.status === 'modify' ? 'warn' : 'bad';

  return (
    <div className="space-y-5">
      <PageHeader title="Recovery" subtitle="Daily readiness check and recovery guidance" />

      {/* Assessment result */}
      <Card className={assessment.status === 'ready' ? 'border-emerald-500/30' : assessment.status === 'modify' ? 'border-amber-500/30' : 'border-red-500/30'}>
        <div className="flex items-center gap-4">
          <ProgressRing value={score} size={72} label="ready" />
          <div className="min-w-0 flex-1">
            <div className="mb-1">
              <Badge tone={statusTone}>{assessment.headline}</Badge>
            </div>
            <ul className="space-y-1">
              {assessment.reasons.slice(0, 3).map((r, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-zinc-400">
                  <span className="text-emerald-400">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-zinc-600">
          This score is a training-guidance signal only. It is not a medical assessment and does not diagnose injury or illness.
        </p>
      </Card>

      {/* Daily check-in form */}
      <Card>
        <SectionTitle>{existing ? 'Update today’s check-in' : 'Daily check-in'}</SectionTitle>
        <Slider
          label="Sleep duration"
          value={form.sleep_hours}
          onChange={(v) => setForm({ ...form, sleep_hours: v })}
          min={3}
          max={12}
          step={0.5}
          suffix="h"
          hint={form.sleep_hours < 6.5 ? 'Under 6.5h — high-intensity work not recommended today' : undefined}
        />
        <Slider label="Sleep quality" value={form.sleep_quality} onChange={(v) => setForm({ ...form, sleep_quality: v })} suffix="/5" />
        <Slider label="Muscle soreness" value={form.soreness} onChange={(v) => setForm({ ...form, soreness: v })} suffix="/5" hint="1 = none, 5 = very sore" />
        <Slider label="Energy level" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} suffix="/5" />
        <Slider label="Motivation" value={form.motivation} onChange={(v) => setForm({ ...form, motivation: v })} suffix="/5" />
        <Slider label="General fatigue" value={form.fatigue} onChange={(v) => setForm({ ...form, fatigue: v })} suffix="/5" hint="1 = fresh, 5 = exhausted" />
        <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Anything relevant — life stress, niggles, travel…" />
        <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-2">
          {saved ? <><Check size={16} /> Saved</> : <><HeartPulse size={16} /> Save check-in</>}
        </button>
      </Card>

      {/* Recovery routines */}
      <div>
        <SectionTitle>Recovery toolkit</SectionTitle>
        <div className="space-y-2">
          <RecoveryCard
            title="Full-body mobility flow (15 min)"
            items={[
              'Cat-cow × 10 slow reps',
              'World’s greatest stretch × 5 each side',
              '90/90 hip transitions × 8 each side',
              'Deep squat hold — 3 × 30s',
              'Couch stretch — 90s each side',
              'Thoracic windmills × 8 each side',
              'Ankle wall rocks × 10 each side',
            ]}
          />
          <RecoveryCard
            title="Post-session stretch routine (8 min)"
            items={[
              'Standing hamstring fold — 45s each leg',
              'Couch stretch — 60s each side',
              'Calf wall stretch (straight + bent knee) — 30s each',
              'Figure-4 glute stretch — 45s each side',
              'Pec doorway stretch — 30s each side',
              'Slow nasal breathing — 2 min (4s in, 6s out)',
            ]}
          />
          <RecoveryCard
            title="Rest day guidance"
            items={[
              'Complete rest beats active recovery when readiness is below 45',
              'Walk if you feel stiff — 10-20 minutes easy, no more',
              'Prioritise 8+ hours of sleep; adaptation happens overnight',
              'Hit your full protein target even on rest days',
              'No "extra" training — trust the plan',
            ]}
          />
        </div>
      </div>

      {/* History chart */}
      {recent.length >= 2 && (
        <div>
          <SectionTitle>Readiness history</SectionTitle>
          <Card>
            <div className="flex items-end gap-1" style={{ height: 90 }}>
              {recent.map((r) => (
                <div key={r.log_date} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full rounded-t ${
                      r.readiness_score >= 75 ? 'bg-emerald-500' : r.readiness_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${Math.max(6, r.readiness_score)}%`, opacity: 0.85 }}
                    title={`${r.log_date}: ${r.readiness_score}`}
                  />
                  <span className="text-[8px] text-zinc-600">{r.log_date.slice(8)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-zinc-600">
              <History size={11} /> Last {recent.length} check-ins
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function RecoveryCard({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-medium text-zinc-100">{title}</span>
        <span className={`text-xs text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
              <span className="text-emerald-500/60">•</span> {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
