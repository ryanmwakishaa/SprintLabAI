import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, TrendingUp, TriangleAlert } from 'lucide-react';
import { useData, todayStr } from '../lib/data';
import { assessReadiness, analyseMetricProgress, shouldRecommendDeload } from '../lib/coach';
import { currentPhase, PHASE_DESCRIPTIONS } from '../lib/periodisation';
import { Card, PageHeader, SectionTitle } from './ui';
import type { PerformanceMetric } from '../lib/types';

interface Insight {
  tone: 'good' | 'warn' | 'bad' | 'info';
  title: string;
  body: string;
}

export default function CoachScreen() {
  const { sessions, readinessLogs, results, phases, profile } = useData();
  const today = todayStr();

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    const todayReadiness = readinessLogs.find((r) => r.log_date === today);
    const assessment = todayReadiness ? assessReadiness(todayReadiness, sessions) : null;

    // 1. Readiness insight
    if (assessment) {
      out.push({
        tone: assessment.status === 'ready' ? 'good' : assessment.status === 'modify' ? 'warn' : 'bad',
        title: `Readiness: ${assessment.headline}`,
        body: assessment.reasons.join(' '),
      });
    } else {
      out.push({
        tone: 'info',
        title: 'No readiness check logged today',
        body: 'Log your sleep, soreness and energy in the Recovery tab — my adjustments are only as good as the data you give me.',
      });
    }

    // 2. Consistency insight (last 7 days)
    const week = sessions.filter((s) => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return s.session_date >= d.toISOString().slice(0, 10);
    });
    const completedCount = week.filter((s) => s.status === 'completed').length;
    const skippedCount = week.filter((s) => s.status === 'skipped').length;
    if (completedCount >= 5) {
      out.push({
        tone: 'good',
        title: `Strong week — ${completedCount} sessions completed`,
        body: 'Consistency is the biggest driver of adaptation. Keep the same rhythm next week; do not add extra volume on top of it.',
      });
    } else if (skippedCount >= 3) {
      out.push({
        tone: 'warn',
        title: `${skippedCount} sessions skipped in the last 7 days`,
        body: 'After time away, consistency matters more than intensity. If the planned sessions feel too big, tell me — reducing volume slightly and completing every session builds fitness faster than restarting after skipped days.',
      });
    }

    // 3. Deload recommendation
    if (shouldRecommendDeload(sessions)) {
      out.push({
        tone: 'warn',
        title: 'Deload recommended this week',
        body: 'You have accumulated a lot of high-intensity work recently. A deload week (volume down ~40%, intensity maintained at 90%+) lets your nervous system and tissues catch up so the next block builds on fresh legs.',
      });
    }

    // 4. Metric progress / plateau detection
    const keyMetrics: PerformanceMetric[] = ['10m', '20m', '30m', '60m', '100m', '200m', 'flying_20m'];
    for (const m of keyMetrics) {
      const a = analyseMetricProgress(results, m);
      if (a && a.plateau) {
        out.push({
          tone: 'warn',
          title: `Plateau detected in ${m}`,
          body: `${a.message} If this continues for another 2-3 weeks, we should change the stimulus: vary start positions, adjust rep ranges, or schedule a short deload before restarting progression.`,
        });
        break; // one plateau message is enough
      }
      if (a && a.improving && m === '100m') {
        out.push({
          tone: 'good',
          title: '100m is trending the right way',
          body: a.message,
        });
        break;
      }
    }

    // 5. Phase context
    const phase = currentPhase(phases, today);
    if (phase) {
      out.push({
        tone: 'info',
        title: `Current phase: ${phase}`,
        body: PHASE_DESCRIPTIONS[phase],
      });
    }

    // 6. Strength-to-weight context
    const bw = results.filter((r) => r.metric === 'bodyweight').sort((a, b) => (a.result_date < b.result_date ? 1 : -1))[0];
    const squat = results.filter((r) => r.metric === 'squat_1rm').sort((a, b) => (a.result_date < b.result_date ? 1 : -1))[0];
    if (bw && squat) {
      const ratio = squat.value / bw.value;
      if (ratio < 1.8) {
        out.push({
          tone: 'warn',
          title: 'Strength-to-weight ratio needs work',
          body: `Your squat is ${ratio.toFixed(2)}× bodyweight. Elite sprinters are typically 2.0-2.5×. With your gym background this is very trainable — keep progressing the trap bar deadlift and squat while holding bodyweight steady.`,
        });
      } else {
        out.push({
          tone: 'good',
          title: 'Solid strength base',
          body: `Squat at ${ratio.toFixed(2)}× bodyweight — strong for sprinting. Maintain this while speed work becomes the priority.`,
        });
      }
    }

    return out;
  }, [sessions, readinessLogs, results, phases, today]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coach AI"
        subtitle="What I'm seeing across your training, recovery and results"
      />

      {profile && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <p className="text-sm leading-relaxed text-zinc-300">
              Coaching {profile.display_name} — {profile.level}, {profile.events}. {profile.background}.
              Goal: {profile.ambition}.
            </p>
          </div>
        </Card>
      )}

      <SectionTitle>Coaching insights</SectionTitle>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const toneStyles = {
            good: 'border-emerald-500/30 bg-emerald-500/5',
            warn: 'border-amber-500/30 bg-amber-500/5',
            bad: 'border-red-500/30 bg-red-500/5',
            info: 'border-sky-500/30 bg-sky-500/5',
          };
          const icons = { good: CheckCircle2, warn: AlertTriangle, bad: TriangleAlert, info: TrendingUp };
          const Icon = icons[insight.tone];
          return (
            <Card key={i} className={toneStyles[insight.tone]}>
              <div className="flex items-start gap-3">
                <Icon
                  size={17}
                  className={`mt-0.5 shrink-0 ${
                    insight.tone === 'good' ? 'text-emerald-400' : insight.tone === 'warn' ? 'text-amber-400' : insight.tone === 'bad' ? 'text-red-400' : 'text-sky-400'
                  }`}
                />
                <div>
                  <p className="font-medium text-zinc-100">{insight.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{insight.body}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <p className="text-xs leading-relaxed text-zinc-500">
          <strong className="text-zinc-400">How I coach:</strong> every planned session reflects your current phase,
          your last 7 days of training, and today's readiness check-in. I never raise intensity just because you
          finished a workout — progression comes from adaptation, tracked through your logged times and freshness.
          You can always override my recommendation by re-planning the week or completing sessions as written.
        </p>
      </Card>
    </div>
  );
}
