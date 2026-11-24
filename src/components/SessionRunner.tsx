import { useMemo, useState } from 'react';
import { Activity, Check, Timer, X } from 'lucide-react';
import { useData } from '../lib/data';
import type { PerformanceResult, WorkoutSession } from '../lib/types';
import { TIMED_METRICS, METRIC_LABELS } from '../lib/types';
import { Modal, NumberField } from './ui';
interface Props {
  session: WorkoutSession;
  onClose: () => void;
}

export default function SessionRunner({ session, onClose }: Props) {
  const { saveSession, saveResult, refresh } = useData();
  const [completed, setCompleted] = useState<Set<string>>(new Set(session.completed_items));
  const [status] = useState<WorkoutSession['status']>(session.status);
  const [rpe, setRpe] = useState<number | null>(session.rpe ?? null);
  const [duration, setDuration] = useState<number | null>(session.duration_min ?? null);
  const [timeModal, setTimeModal] = useState<{ metric: PerformanceResult['metric'] } | null>(null);
  const [timeValue, setTimeValue] = useState('');
  const [timingMethod, setTimingMethod] = useState<'hand' | 'electronic'>('hand');
  const [saving, setSaving] = useState(false);
  const [finishMode, setFinishMode] = useState(false);

  const totalItems = session.planned.blocks?.reduce((acc, b) => acc + b.items.length, 0) ?? 0;
  const progressPct = totalItems > 0 ? (completed.size / totalItems) * 100 : 0;
  const isRest = session.day_type === 'Rest Day';

  const blockProgress = useMemo(
    () =>
      session.planned.blocks?.map((b) => ({
        title: b.title,
        purpose: b.purpose,
        done: b.items.filter((i) => completed.has(itemKey(b.title, i.name))).length,
        items: b.items,
      })) ?? [],
    [session, completed],
  );

  function itemKey(block: string, name: string): string {
    return `${block}::${name}`;
  }

  async function persistState(nextCompleted: Set<string>, nextStatus: WorkoutSession['status'], nextRpe?: number | null, nextDuration?: number | null) {
    setSaving(true);
    try {
      await saveSession({
        ...session,
        id: session.id,
        completed_items: [...nextCompleted],
        status: nextStatus,
        rpe: nextRpe ?? rpe,
        duration_min: nextDuration ?? duration,
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleItem(block: string, name: string) {
    const key = itemKey(block, name);
    const next = new Set(completed);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setCompleted(next);
    // Auto-save progress so the workout can be resumed later
    void persistState(next, next.size === totalItems && totalItems > 0 ? 'completed' : status);
  }

  async function finishSession() {
    const finalStatus: WorkoutSession['status'] = completed.size >= totalItems && totalItems > 0 ? 'completed' : status === 'skipped' ? 'skipped' : 'completed';
    await persistState(completed, finalStatus, rpe, duration);
    onClose();
  }

  async function skipSession() {
    await persistState(completed, 'skipped', rpe, duration);
    onClose();
  }

  async function logTime() {
    if (!timeModal || !timeValue) return;
    const value = parseFloat(timeValue);
    if (isNaN(value) || value <= 0) return;
    setSaving(true);
    try {
      await saveResult({
        result_date: session.session_date,
        metric: timeModal.metric,
        value,
        timing_method: timingMethod,
        is_sample: false,
        notes: `Logged during: ${session.title}`,
      });
      setTimeModal(null);
      setTimeValue('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/95 px-5 py-4 backdrop-blur">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">{session.day_type}</p>
            <h1 className="text-lg font-bold text-white">{session.title}</h1>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-zinc-400">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1"><Timer size={12} /> ~{session.planned.estimated_duration_min} min</span>
          {session.planned.target_times && <span className="text-emerald-400/80">{session.planned.target_times}</span>}
        </div>
      </div>

      <div className="mt-4 space-y-4 px-5">
        {/* Objective + coach note */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Session objective</p>
          <p className="mt-1 text-sm text-zinc-300">{session.objective}</p>
          <p className="mt-2 border-t border-emerald-500/10 pt-2 text-xs leading-relaxed text-zinc-400">{session.coach_notes}</p>
        </div>

        {/* Blocks */}
        {blockProgress.map((block, bi) => (
          <div key={bi} className="card">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold text-white">{block.title}</h3>
              {block.done === block.items.length && block.items.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <Check size={13} /> done
                </span>
              )}
            </div>
            {block.purpose && <p className="mb-3 text-xs italic text-zinc-500">{block.purpose}</p>}
            <div className="space-y-2">
              {block.items.map((item, ii) => {
                const key = itemKey(block.title, item.name);
                const done = completed.has(key);
                return (
                  <button
                    key={ii}
                    onClick={() => toggleItem(block.title, item.name)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                      done
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                        done ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600'
                      }`}
                    >
                      {done && <Check size={12} className="text-zinc-950" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${done ? 'text-zinc-400 line-through' : 'text-zinc-100'}`}>
                        {item.name}
                        {item.sets && item.reps && (
                          <span className="ml-2 text-xs font-semibold text-emerald-400/80">
                            {item.sets} × {item.reps}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{item.detail}</span>
                      {item.recovery && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/80">
                          <Timer size={10} /> Recovery: {item.recovery}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Sprint time logging */}
        {!isRest && (
          <div className="card">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <Activity size={16} className="text-emerald-400" /> Log sprint times
            </h3>
            <p className="mb-3 text-xs text-zinc-500">
              Hand-timed and electronic results are tracked separately so they're never compared directly.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TIMED_METRICS.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setTimeModal({ metric: m });
                    setTimeValue('');
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                >
                  {METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom finish bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-zinc-950/95 p-4 backdrop-blur" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
        <div className="mx-auto flex max-w-3xl gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 !py-2.5 text-sm" disabled={saving}>
            Save & close
          </button>
          <button
            onClick={() => setFinishMode(true)}
            className="btn-primary flex-1 !py-2.5 text-sm"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Finish session'}
          </button>
        </div>
      </div>

      {/* Finish modal */}
      <Modal open={finishMode} onClose={() => setFinishMode(false)} title="Finish session">
        <p className="mb-3 text-sm text-zinc-400">
          You completed {completed.size} of {totalItems} exercises.
        </p>
        <div className="mb-4">
          <label className="label">How hard was it? (RPE 1-10)</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setRpe(n)}
                className={`h-10 flex-1 rounded-lg text-sm font-semibold transition ${
                  rpe === n
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <NumberField
            label="Session duration (minutes)"
            value={duration ?? ''}
            onChange={(v) => setDuration(v ? parseInt(v) : null)}
            suffix="min"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={skipSession}
            className="btn-ghost flex-1 !text-red-400 hover:!bg-red-500/10"
          >
            Skip session
          </button>
          <button onClick={finishSession} className="btn-primary flex-1">
            Save & finish
          </button>
        </div>
      </Modal>

      {/* Time log modal */}
      <Modal open={!!timeModal} onClose={() => setTimeModal(null)} title={timeModal ? `Log ${METRIC_LABELS[timeModal.metric]}` : ''}>
        <div className="mb-3">
          <NumberField label="Time (seconds)" value={timeValue} onChange={setTimeValue} step="0.01" placeholder="e.g. 1.89" />
        </div>
        <div className="mb-4">
          <label className="label">Timing method</label>
          <div className="flex rounded-xl bg-white/5 p-1 text-sm font-medium">
            {(['hand', 'electronic'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTimingMethod(m)}
                className={`flex-1 rounded-lg py-2 transition ${
                  timingMethod === m ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {m === 'hand' ? 'Hand-timed' : 'Electronic (laser/photofinish)'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={logTime} className="btn-primary" disabled={saving || !timeValue}>
          {saving ? 'Saving…' : 'Save result'}
        </button>
      </Modal>
    </div>
  );
}
