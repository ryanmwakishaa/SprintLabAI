import type { PerformanceResult } from './types';

// Generates clearly-labelled SAMPLE performance data for the past 8 weeks
// so the analytics screens have meaningful trends before the athlete logs
// their own results. Every row is flagged is_sample = true and rendered with
// a "sample" badge in the UI.
export function generateSampleResults(): Array<Omit<PerformanceResult, 'id'>> {
  const out: Array<Omit<PerformanceResult, 'id'>> = [];
  const today = new Date();
  function d(weeksAgo: number): string {
    const date = new Date(today);
    date.setDate(today.getDate() - weeksAgo * 7);
    return date.toISOString().slice(0, 10);
  }

  // Hand-timed sample trend: gradual improvement across 8 weeks.
  // Note the athlete's baseline is unknown after time away — these are demo values only.
  const samples: Array<{ metric: PerformanceResult['metric']; values: number[]; method: 'hand' | 'electronic'; }> = [
    { metric: '10m', values: [1.95, 1.93, 1.91, 1.9, 1.89, 1.88, 1.88, 1.87], method: 'hand' },
    { metric: '20m', values: [3.15, 3.12, 3.09, 3.07, 3.05, 3.04, 3.03, 3.02], method: 'hand' },
    { metric: '30m', values: [4.25, 4.22, 4.18, 4.15, 4.13, 4.11, 4.1, 4.09], method: 'hand' },
    { metric: '60m', values: [7.5, 7.46, 7.42, 7.39, 7.36, 7.34, 7.32, 7.3], method: 'hand' },
    { metric: '100m', values: [11.4, 11.35, 11.28, 11.22, 11.18, 11.12, 11.08, 11.05], method: 'hand' },
    { metric: '150m', values: [17.8, 17.7, 17.6, 17.5, 17.42, 17.35, 17.28, 17.2], method: 'hand' },
    { metric: 'flying_20m', values: [2.35, 2.33, 2.31, 2.29, 2.28, 2.26, 2.25, 2.24], method: 'hand' },
    { metric: 'bodyweight', values: [78.2, 78.4, 78.5, 78.7, 78.9, 79.0, 79.1, 79.3], method: 'hand' },
    { metric: 'squat_1rm', values: [140, 140, 145, 145, 150, 150, 155, 155], method: 'hand' },
    { metric: 'trap_bar_1rm', values: [160, 160, 165, 170, 170, 175, 175, 180], method: 'hand' },
  ];

  samples.forEach((s) => {
    s.values.forEach((value, i) => {
      out.push({
        result_date: d(s.values.length - 1 - i),
        metric: s.metric,
        value,
        timing_method: s.method,
        is_sample: true,
        notes: 'Sample data — replace with your own logged result',
      });
    });
  });

  return out;
}
