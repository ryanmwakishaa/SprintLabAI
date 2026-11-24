import { useMemo, useState } from 'react';
import { Check, Droplets, Flame, Beef, Scale } from 'lucide-react';
import { useData, todayStr } from '../lib/data';
import { calorieTarget, hydrationTarget, proteinTarget } from '../lib/coach';
import { Card, NumberField, PageHeader, SectionTitle } from './ui';

export default function NutritionScreen() {
  const { nutrition, profile, saveNutrition, loading } = useData();
  const today = todayStr();
  const existing = nutrition.find((n) => n.log_date === today);

  const weight = profile?.weight_kg ?? 79;
  const targets = {
    calories: calorieTarget(weight),
    protein: proteinTarget(weight),
    hydration: hydrationTarget(weight),
  };

  const [form, setForm] = useState({
    calories: existing?.calories ?? 0,
    protein_g: existing?.protein_g ?? 0,
    hydration_ml: existing?.hydration_ml ?? 0,
  });
  const [weightEntry, setWeightEntry] = useState('');
  const [saved, setSaved] = useState(false);

  const weightHistory = useMemo(
    () =>
      [...nutrition]
        .filter((n) => n.notes?.startsWith('weight:'))
        .map((n) => ({ date: n.log_date, kg: parseFloat(n.notes!.split(':')[1]) }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [nutrition],
  );

  // Use bodyweight results too (logged from performance screen)
  const bodyweightResults = useMemo(() => {
    if (weightHistory.length >= 2) return weightHistory;
    return [];
  }, [weightHistory]);

  async function handleSave() {
    await saveNutrition({ log_date: today, ...form, notes: existing?.notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function logWeight() {
    const kg = parseFloat(weightEntry);
    if (isNaN(kg) || kg <= 0) return;
    await saveNutrition({
      log_date: today,
      calories: form.calories,
      protein_g: form.protein_g,
      hydration_ml: form.hydration_ml,
      notes: `weight:${kg}`,
    });
    setWeightEntry('');
  }

  if (loading) return null;

  const pPct = Math.min(100, (form.calories / targets.calories) * 100);
  const prPct = Math.min(100, (form.protein_g / targets.protein) * 100);
  const hPct = Math.min(100, (form.hydration_ml / targets.hydration) * 100);

  return (
    <div className="space-y-5">
      <PageHeader title="Nutrition" subtitle="Fuel for lean muscle development and sprint performance" />

      {/* Targets for today */}
      <div className="grid grid-cols-3 gap-3">
        <MacroCard icon={Flame} label="Calories" value={form.calories} target={targets.calories} pct={pPct} unit="" color="#10b981" />
        <MacroCard icon={Beef} label="Protein" value={form.protein_g} target={targets.protein} pct={prPct} unit="g" color="#f59e0b" />
        <MacroCard icon={Droplets} label="Water" value={Math.round(form.hydration_ml / 100) / 10} target={Math.round(targets.hydration / 100) / 10} pct={hPct} unit="L" color="#38bdf8" />
      </div>

      {/* Log today */}
      <Card>
        <SectionTitle>Log today</SectionTitle>
        <NumberField label="Calories consumed" value={form.calories || ''} onChange={(v) => setForm({ ...form, calories: parseInt(v) || 0 })} suffix="kcal" />
        <NumberField label="Protein" value={form.protein_g || ''} onChange={(v) => setForm({ ...form, protein_g: parseInt(v) || 0 })} suffix="g" />
        <NumberField label="Hydration" value={form.hydration_ml || ''} onChange={(v) => setForm({ ...form, hydration_ml: parseInt(v) || 0 })} suffix="ml" />
        <button onClick={handleSave} className="btn-primary flex items-center justify-center gap-2">
          {saved ? <><Check size={16} /> Saved</> : 'Save today’s log'}
        </button>
      </Card>

      {/* Bodyweight tracking */}
      <Card>
        <SectionTitle>Bodyweight</SectionTitle>
        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <NumberField label="Today's weigh-in (kg)" value={weightEntry} onChange={setWeightEntry} step="0.1" />
          </div>
          <button onClick={logWeight} className="btn-ghost mb-3 !w-auto px-4">Log</button>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Scale size={15} className="text-zinc-500" />
          {bodyweightResults.length >= 2 ? (
            <span>
              Trend: {bodyweightResults[bodyweightResults.length - 1].kg - bodyweightResults[0].kg >= 0 ? '+' : ''}
              {(bodyweightResults[bodyweightResults.length - 1].kg - bodyweightResults[0].kg).toFixed(1)} kg over{' '}
              {bodyweightResults.length} weigh-ins
            </span>
          ) : (
            <span>Log weigh-ins on 2+ days to see your trend. Aim for +0.2-0.4 kg per week at most — faster gain risks adding non-sprint-specific mass.</span>
          )}
        </div>
        {bodyweightResults.length >= 2 && (
          <div className="mt-3 flex items-end gap-1" style={{ height: 70 }}>
            {bodyweightResults.slice(-14).map((w) => {
              const vals = bodyweightResults.slice(-14).map((x) => x.kg);
              const min = Math.min(...vals) - 0.5;
              const max = Math.max(...vals) + 0.5;
              return (
                <div
                  key={w.date}
                  className="flex-1 rounded-t bg-sky-500/70"
                  style={{ height: `${20 + ((w.kg - min) / (max - min)) * 80}%` }}
                  title={`${w.date}: ${w.kg} kg`}
                />
              );
            })}
          </div>
        )}
      </Card>

      {/* Guidance cards */}
      <div className="space-y-2">
        <GuidanceCard
          title="Pre-training fuel (2-3h before)"
          body="Carbohydrate-focused with moderate protein and low fat/fibre: rice or pasta with lean protein, fruit, or toast with honey. If training within 45 minutes, keep it light — a banana and water is enough. Caffeine 3 mg/kg ~45 min before high-intensity sessions can help."
        />
        <GuidanceCard
          title="Post-training recovery (within 60 min)"
          body="Aim for ~0.4 g/kg protein (about 30 g for you) plus 1-1.2 g/kg carbohydrate. A shake with fruit, or chicken with rice, works well. Rehydrate with 500-750 ml water per 0.5 kg of bodyweight lost during the session."
        />
        <GuidanceCard
          title="Lean muscle development"
          body={`Your daily target is ${targets.calories.toLocaleString()} kcal — a modest surplus (~300-400 kcal above maintenance) that supports muscle gain without excess. Protein target: ${targets.protein} g/day, spread over 4 feedings of ~${Math.round(targets.protein / 4)} g. This builds muscle while keeping bodyweight sprint-friendly.`}
        />
        <GuidanceCard
          title="Hydration strategy"
          body={`Base target: ${(targets.hydration / 1000).toFixed(1)} L/day, more on hot or heavy session days. Pale-yellow urine is your simplest daily check.`}
        />
      </div>
    </div>
  );
}

function MacroCard({
  icon: Icon,
  label,
  value,
  target,
  pct,
  unit,
  color,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  target: number;
  pct: number;
  unit: string;
  color: string;
}) {
  return (
    <Card className="!p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={14} style={{ color }} />
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">
        {value.toLocaleString()}
        <span className="text-xs font-normal text-zinc-500">{unit}</span>
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] text-zinc-600">of {target.toLocaleString()}{unit} target</p>
    </Card>
  );
}

function GuidanceCard({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="!p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-medium text-zinc-100">{title}</span>
        <span className={`text-xs text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && <p className="mt-2 border-t border-white/5 pt-2 text-xs leading-relaxed text-zinc-400">{body}</p>}
    </Card>
  );
}
