import { useState } from 'react';
import { Download, LogOut } from 'lucide-react';
import { useData } from '../lib/data';
import { exportAllData } from '../lib/db';
import { supabase } from '../lib/supabase';
import { Badge, Card, Modal, NumberField, PageHeader, SectionTitle, TextField } from './ui';

export default function ProfileScreen() {
  const { profile, phases, results, sessions, readinessLogs, nutrition, saveProfile, savePhases, loading } = useData();
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    height_cm: profile?.height_cm ?? 189,
    weight_kg: profile?.weight_kg ?? 79,
    events: profile?.events ?? '',
    pb_100: profile?.pb_100 ?? 10.7,
    pb_200: profile?.pb_200 ?? 22,
    level: profile?.level ?? '',
    background: profile?.background ?? '',
    ambition: profile?.ambition ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [phaseEdit, setPhaseEdit] = useState<null>(null);

  async function handleSave() {
    await saveProfile({
      display_name: form.display_name,
      height_cm: Number(form.height_cm),
      weight_kg: Number(form.weight_kg),
      events: form.events,
      pb_100: Number(form.pb_100),
      pb_200: Number(form.pb_200),
      level: form.level,
      background: form.background,
      ambition: form.ambition,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sprintlab-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shiftPhase(index: number, field: 'start_date' | 'end_date', newDate: string) {
    if (!newDate) return;
    const next = phases.map((p, i) => (i === index ? { ...p, [field]: newDate } : p));
    for (let i = 0; i < next.length - 1; i++) {
      if (next[i].end_date >= next[i + 1].start_date) {
        const d = new Date(next[i].end_date + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        next[i + 1].start_date = d.toISOString().slice(0, 10);
        if (next[i + 1].end_date < next[i + 1].start_date) {
          next[i + 1].end_date = next[i + 1].start_date;
        }
      }
    }
    await savePhases(next);
  }

  if (loading) return null;

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" subtitle="Your athletic profile — everything here is editable" />

      <Card>
        <SectionTitle>Athlete profile</SectionTitle>
        <TextField label="Name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Height" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: Number(v) })} suffix="cm" />
          <NumberField label="Weight" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: Number(v) })} suffix="kg" />
        </div>
        <TextField label="Primary events" value={form.events} onChange={(v) => setForm({ ...form, events: v })} placeholder="100m, 200m" />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="100m PB" value={form.pb_100} onChange={(v) => setForm({ ...form, pb_100: Number(v) })} step="0.01" suffix="s" />
          <NumberField label="200m PB" value={form.pb_200} onChange={(v) => setForm({ ...form, pb_200: Number(v) })} step="0.01" suffix="s" />
        </div>
        <TextField label="Athlete level" value={form.level} onChange={(v) => setForm({ ...form, level: v })} />
        <div className="mb-3">
          <label className="label">Training background</label>
          <textarea
            value={form.background}
            onChange={(e) => setForm({ ...form, background: e.target.value })}
            rows={2}
            className="input resize-none"
          />
        </div>
        <div className="mb-3">
          <label className="label">Main ambition</label>
          <textarea
            value={form.ambition}
            onChange={(e) => setForm({ ...form, ambition: e.target.value })}
            rows={2}
            className="input resize-none"
          />
        </div>
        <button onClick={handleSave} className="btn-primary">
          {saved ? 'Saved' : 'Save profile'}
        </button>
      </Card>

      {/* Periodisation plan editor */}
      <Card>
        <SectionTitle>Periodisation plan</SectionTitle>
        <p className="mb-3 text-xs text-zinc-500">
          Adjust phase boundaries to fit your competition calendar. Phases stay contiguous — dragging one end
          shifts the rest of the plan.
        </p>
        <div className="space-y-2">
          {phases.map((p, i) => {
            const isCurrent = p.start_date <= new Date().toISOString().slice(0, 10) && p.end_date >= new Date().toISOString().slice(0, 10);
            return (
              <div key={i} className={`rounded-xl border p-3 ${isCurrent ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 bg-white/[0.03]'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-100">{p.phase}</span>
                  {isCurrent && <Badge tone="good">current</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label !text-[10px]">Start</label>
                    <input
                      type="date"
                      value={p.start_date}
                      onChange={(e) => shiftPhase(i, 'start_date', e.target.value)}
                      className="input !px-2 !py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="label !text-[10px]">End</label>
                    <input
                      type="date"
                      value={p.end_date}
                      onChange={(e) => shiftPhase(i, 'end_date', e.target.value)}
                      className="input !px-2 !py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Data management */}
      <Card>
        <SectionTitle>Your data</SectionTitle>
        <div className="space-y-2 text-sm text-zinc-400">
          <p>{sessions.length} sessions · {results.length} results · {readinessLogs.length} readiness logs · {nutrition.length} nutrition logs</p>
        </div>
        <div className="mt-3 space-y-2">
          <button onClick={handleExport} className="btn-ghost flex items-center justify-center gap-2 !py-2.5 text-sm">
            <Download size={15} /> Export all data (JSON)
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="btn-ghost flex items-center justify-center gap-2 !py-2.5 text-sm"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          Your data is stored securely and privately — only your account can read it. Export any time; nothing is
          shared with anyone else.
        </p>
      </Card>

      <Modal open={!!phaseEdit} onClose={() => setPhaseEdit(null)} title="Edit phase">
        <p className="text-sm text-zinc-400">Use the date fields above to adjust phases directly.</p>
      </Modal>
    </div>
  );
}
