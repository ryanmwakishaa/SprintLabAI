import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Moon, Play, Zap } from 'lucide-react';
import { useData, todayStr } from '../lib/data';
import { assessReadiness } from '../lib/coach';
import { Badge, Card, PageHeader, ProgressRing, SectionTitle, Spinner } from './ui';
import SessionRunner from './SessionRunner';

const INTENSITY_TONE = { low: 'info', moderate: 'neutral', high: 'warn', max: 'bad' } as const;

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { profile, readinessLogs, sessions, results, saveReadiness, loading } = useData();
  const [runnerOpen, setRunnerOpen] = useState(false);
  const today = todayStr();

  const todaySession = sessions.find((s) => s.session_date === today);
  const todayReadiness = readinessLogs.find((r) => r.log_date === today) ?? null;
  const assessment = useMemo(
    () => (todayReadiness ? assessReadiness(todayReadiness, sessions) : null),
    [todayReadiness, sessions],
  );

  const completedThisWeek = sessions.filter(
    (s) => s.status === 'completed' && s.session_date >= getWeekStartIso(),
  ).length;

  const latest100 = results
    .filter((r) => r.metric === '100m')
    .sort((a, b) => (a.result_date < b.result_date ? 1 : -1))[0];

  if (loading) return <Spinner fullPage />;

  if (runnerOpen && todaySession) {
    return <SessionRunner session={todaySession} onClose={() => setRunnerOpen(false)} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hey ${profile?.display_name ?? 'Athlete'}`}
        subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      {/* Today's workout card */}
      <Card>
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge tone={INTENSITY_TONE[todaySession?.intensity ?? 'low']}>
                {todaySession ? `${todaySession.intensity} intensity` : 'No session yet'}
              </Badge>
              {todaySession && <Badge>{todaySession.day_type}</Badge>}
            </div>
            <h2 className="text-lg font-semibold text-white">
              {todaySession?.title ?? 'Your week is being planned'}
            </h2>
            {todaySession && <p className="mt-0.5 text-sm text-zinc-400">{todaySession.objective}</p>}
          </div>
          {todaySession && todaySession.status !== 'completed' && (
            <ProgressRing
              value={
                todaySession.planned.blocks
                  ? (todaySession.completed_items.length / Math.max(1, todaySession.planned.blocks.reduce((acc, b) => acc + b.items.length, 0))) * 100
                  : 0
              }
              size={56}
            />
          )}
        </div>

        {todaySession && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={13} /> ~{todaySession.planned.estimated_duration_min} min
              </span>
              <span>{todaySession.planned.blocks.reduce((acc, b) => acc + b.items.length, 0)} exercises</span>
              {todaySession.volume_multiplier < 1 && (
                <span className="text-amber-400">Volume at {Math.round(todaySession.volume_multiplier * 100)}% (coach adjusted)</span>
              )}
            </div>

            <div className="flex gap-2">
              {todaySession.status === 'completed' ? (
                <div className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-center font-semibold text-emerald-400">
                  Session complete — great work
                </div>
              ) : (
                <button onClick={() => setRunnerOpen(true)} className="btn-primary flex flex-1 items-center justify-center gap-2">
                  <Play size={17} />
                  {todaySession.completed_items.length > 0 ? 'Resume workout' : 'Start workout'}
                </button>
              )}
            </div>
          </>
        )}
        {!todaySession && (
          <button
            onClick={() => onNavigate('training')}
            className="btn-ghost mt-1 flex items-center justify-center gap-2"
          >
            Go to Training <ChevronRight size={16} />
          </button>
        )}
      </Card>

      {/* Coach reasoning */}
      {todaySession && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <div className="mb-1 flex items-center gap-2">
            <Zap size={15} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-400">Why this session?</h3>
          </div>
          <p className="text-sm leading-relaxed text-zinc-300">{todaySession.coach_notes}</p>
        </Card>
      )}

      {/* Readiness snapshot */}
      <div>
        <SectionTitle
          action={
            !todayReadiness && (
              <button onClick={() => onNavigate('recovery')} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
                Log now
              </button>
            )
          }
        >
          Today's readiness
        </SectionTitle>
        {todayReadiness && assessment ? (
          <Card>
            <div className="flex items-center gap-4">
              <ProgressRing value={todayReadiness.readiness_score} label="ready" />
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${assessment.status === 'ready' ? 'text-emerald-400' : assessment.status === 'modify' ? 'text-amber-400' : 'text-red-400'}`}>
                  {assessment.headline}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{assessment.reasons[0]}</p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon size={20} className="text-zinc-500" />
              <div>
                <p className="font-medium text-zinc-200">Readiness not logged yet</p>
                <p className="text-xs text-zinc-500">Log sleep and energy to tune today's session</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await saveReadiness({
                  log_date: today,
                  sleep_hours: 7.5,
                  sleep_quality: 3,
                  soreness: 2,
                  energy: 3,
                  motivation: 3,
                  fatigue: 2,
                });
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"
            >
              Quick log 7.5h
            </button>
          </Card>
        )}
      </div>

      {/* Snapshot stats */}
      <div>
        <SectionTitle>Snapshot</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{completedThisWeek}</p>
            <p className="text-[11px] text-zinc-500">Sessions this week</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-white">{latest100 ? latest100.value.toFixed(2) : '—'}</p>
            <p className="text-[11px] text-zinc-500">Last 100m ({latest100?.timing_method === 'electronic' ? 'electronic' : 'hand'})</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xl font-bold text-white">{profile?.weight_kg ?? '—'}</p>
            <p className="text-[11px] text-zinc-500">Bodyweight (kg)</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getWeekStartIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
