import { useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, Play, RefreshCw } from 'lucide-react';
import { useData } from '../lib/data';
import type { WorkoutSession } from '../lib/types';
import { Badge, Card, Modal, PageHeader, ProgressRing, SectionTitle, Spinner } from './ui';
import SessionRunner from './SessionRunner';

const INTENSITY_TONE = { low: 'info', moderate: 'neutral', high: 'warn', max: 'bad' } as const;

export default function TrainingScreen() {
  const { sessions, regenerateWeek, loading, error } = useData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [runnerSession, setRunnerSession] = useState<WorkoutSession | null>(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (a.session_date < b.session_date ? 1 : -1)),
    [sessions],
  );
  const thisWeek = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    const startIso = d.toISOString().slice(0, 10);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    const endIso = end.toISOString().slice(0, 10);
    return sorted.filter((s) => s.session_date >= startIso && s.session_date <= endIso).sort((a, b) =>
      a.session_date < b.session_date ? -1 : 1,
    );
  }, [sorted]);

  const history = sorted.filter((s) => !thisWeek.some((w) => w.id === s.id));

  if (loading) return <div className="py-10"><Spinner /></div>;

  if (runnerSession) {
    return <SessionRunner session={runnerSession} onClose={() => setRunnerSession(null)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Training" subtitle="Your weekly programme and session history" />

      <div>
        <SectionTitle
          action={
            <button
              onClick={() => setConfirmRegen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-emerald-400"
            >
              <RefreshCw size={12} /> Re-plan week
            </button>
          }
        >
          This week
        </SectionTitle>
        <div className="space-y-2">
          {thisWeek.length === 0 ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <p className="font-medium text-amber-300">Your weekly programme has not loaded yet.</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                {error ?? 'Generate this week from your current training phase to see every session.'}
              </p>
              <button
                onClick={async () => {
                  const d = new Date();
                  const day = d.getDay();
                  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
                  d.setHours(0, 0, 0, 0);
                  await regenerateWeek(d);
                }}
                className="btn-primary mt-3 !w-auto px-4 !py-2 text-sm"
              >
                <span className="inline-flex items-center gap-2"><RefreshCw size={14} /> Generate this week</span>
              </button>
            </Card>
          ) : thisWeek.map((session) => {
            const totalItems = session.planned.blocks?.reduce((acc, b) => acc + b.items.length, 0) ?? 0;
            const pct = totalItems > 0 ? (session.completed_items.length / totalItems) * 100 : 0;
            const isRest = session.day_type === 'Rest Day';
            const isExpanded = expanded === session.id;
            return (
              <Card key={session.id} className={session.session_date === new Date().toISOString().slice(0, 10) ? 'border-emerald-500/30' : ''}>
                <button
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => setExpanded(isExpanded ? null : session.id!)}
                >
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] font-medium uppercase text-zinc-500">
                      {new Date(session.session_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {new Date(session.session_date + 'T12:00:00').getDate()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={session.status === 'completed' ? 'good' : INTENSITY_TONE[session.intensity]}>
                        {session.status === 'completed' ? 'completed' : session.intensity}
                      </Badge>
                      {!isRest && <span className="text-xs text-zinc-500">{session.day_type}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-zinc-100">{session.title}</p>
                  </div>
                  {session.status !== 'completed' && !isRest && (
                    <ProgressRing value={pct} size={36} stroke={4} />
                  )}
                  <ChevronDown size={16} className={`shrink-0 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="mt-3 border-t border-white/5 pt-3">
                    <p className="mb-2 text-xs leading-relaxed text-zinc-400">{session.objective}</p>
                    <p className="mb-3 rounded-lg bg-white/5 p-2.5 text-xs leading-relaxed text-emerald-300/90">
                      <span className="font-semibold">Coach: </span>
                      {session.coach_notes}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRunnerSession(session)}
                        className="btn-primary flex flex-1 items-center justify-center gap-2 !py-2 text-sm"
                      >
                        {session.status === 'completed' ? (
                          <><ClipboardList size={15} /> View session</>
                        ) : (
                          <><Play size={15} /> {session.completed_items.length > 0 ? 'Resume' : 'Start'}</>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <SectionTitle>History</SectionTitle>
          <div className="space-y-2">
            {history.slice(0, 14).map((session) => (
              <Card key={session.id} className="flex items-center gap-3 !p-3">
                <div className="w-16 shrink-0 text-xs text-zinc-500">
                  {new Date(session.session_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">{session.title}</p>
                  {session.rpe && <p className="text-xs text-zinc-500">RPE {session.rpe}</p>}
                </div>
                <Badge tone={session.status === 'completed' ? 'good' : session.status === 'skipped' ? 'bad' : 'neutral'}>
                  {session.status}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={confirmRegen} onClose={() => setConfirmRegen(false)} title="Re-plan this week?">
        <p className="mb-4 text-sm leading-relaxed text-zinc-300">
          I'll rebuild this week's sessions from your current phase and today's readiness. Sessions you've
          already started or completed will be kept as they are.
        </p>
        <div className="flex gap-2">
          <button onClick={() => setConfirmRegen(false)} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={async () => {
              const d = new Date();
              const day = d.getDay();
              d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
              d.setHours(0, 0, 0, 0);
              await regenerateWeek(d);
              setConfirmRegen(false);
            }}
            className="btn-primary flex-1"
          >
            Re-plan
          </button>
        </div>
      </Modal>
    </div>
  );
}
