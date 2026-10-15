import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { sfx } from '@/audio/sfx';
import { LIFE_TYPES } from '@/data/lifeTypes';
import { TASKS } from '@/data/tasks';
import { HAIR_COLORS, HAIR_STYLES, SKIN_TONES, TOP_STYLES, CLOTH_COLORS } from '@/data/clothing';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useLifeStore } from '@/stores/lifeStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { SKILLS, levelOf, useSkillStore, xpForLevel } from '@/stores/skillStore';
import { moodOf, useStatsStore } from '@/stores/statsStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUiStore } from '@/stores/uiStore';
import { STAT_KEYS, type StatKey } from '@/types/game';
import { Portrait } from '@/ui/Portrait';
import { STAT_META } from './statMeta';

// the 3D preview is only loaded (and its canvas only created) while the Profile tab is showing
const AvatarPreview = lazy(() => import('@/three/avatar/AvatarPreview').then((m) => ({ default: m.AvatarPreview })));

type Tab = 'profile' | 'needs' | 'goals' | 'skills' | 'career' | 'people';
const TABS: { id: Tab; label: string }[] = [{ id: 'profile', label: 'Profile' }, { id: 'needs', label: 'Needs' }, { id: 'goals', label: 'Goals' }, { id: 'skills', label: 'Skills' }, { id: 'career', label: 'Career' }, { id: 'people', label: 'People' }];

const Chip = ({ on, onClick, children }: { on?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={() => { sfx.pop(); onClick(); }} aria-pressed={on} className={`rounded-full px-3.5 py-2 text-sm font-bold ${on ? 'bg-slate-200 text-night' : 'bg-white/10 text-white/85'}`}>{children}</button>
);
const Swatches = ({ list, value, onPick, label }: { list: string[]; value: string; onPick: (c: string) => void; label: string }) => (
  <div className="flex flex-wrap gap-2" role="group" aria-label={label}>{list.map((c) => <button key={c} onClick={() => { sfx.pop(); onPick(c); }} aria-label={`${label} ${c}`} aria-pressed={value === c} className={`h-8 w-8 rounded-full ring-2 ${value === c ? 'ring-white' : 'ring-white/15'}`} style={{ background: c }} />)}</div>
);

function ProfileTab() {
  const a = useCharacterStore((s) => s.appearance), set = useCharacterStore((s) => s.set);
  const user = useAuthStore((s) => s.session);
  return (
    <div className="space-y-4">
      <div className="relative h-72 overflow-hidden rounded-[1.6rem] bg-gradient-to-b from-[#163152] to-[#0B1623]">
        <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-white/50">Loading preview…</div>}><AvatarPreview appearance={a} focus="full" /></Suspense>
        <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-white/45">Drag to spin</span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/[0.07] px-4 py-3"><b className="text-lg">@{user ?? 'guest'}</b><span className="text-xs text-white/50">your username</span></div>
      <section><h4 className="mb-2 text-sm font-bold text-white/60">Hairstyle</h4><div className="flex flex-wrap gap-2">{HAIR_STYLES.map((h) => <Chip key={h.id} on={a.hairStyle === h.id} onClick={() => set({ hairStyle: h.id })}>{h.label}</Chip>)}</div></section>
      <section><h4 className="mb-2 text-sm font-bold text-white/60">Hair colour</h4><Swatches list={HAIR_COLORS} value={a.hairColor} onPick={(c) => set({ hairColor: c })} label="Hair colour" /></section>
      <section><h4 className="mb-2 text-sm font-bold text-white/60">Outfit</h4><div className="flex flex-wrap gap-2">{TOP_STYLES.map((t) => <Chip key={t.id} on={a.top === t.id} onClick={() => set({ top: t.id })}>{t.label}</Chip>)}</div></section>
      <section><h4 className="mb-2 text-sm font-bold text-white/60">Top colour</h4><Swatches list={CLOTH_COLORS} value={a.topColor} onPick={(c) => set({ topColor: c })} label="Top colour" /></section>
      <section><h4 className="mb-2 text-sm font-bold text-white/60">Skin tone</h4><Swatches list={SKIN_TONES} value={a.skin} onPick={(c) => set({ skin: c })} label="Skin tone" /></section>
      <p className="text-center text-xs text-white/45">Changes save instantly. Buy more clothes in the Boutique app.</p>
    </div>
  );
}

function NeedsTab() {
  const stats = useStatsStore((s) => s.stats);
  return (
    <div className="space-y-3">
      {STAT_KEYS.map((k: StatKey) => { const { Icon, color, label } = STAT_META[k], v = Math.round(stats[k]); return (
        <div key={k}><div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Icon size={16} color={color} />{label}<span className="ml-auto tabular-nums text-white/60">{v}</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${v}%`, background: v < 25 && k !== 'charisma' ? '#FF4D6D' : color }} /></div></div>
      ); })}
    </div>
  );
}

function GoalsTab() {
  const active = useTaskStore((s) => s.active), done = useTaskStore((s) => s.done);
  const list = TASKS.filter((t) => active.includes(t.id));
  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="rounded-2xl bg-white/[0.06] p-4 text-sm text-white/60">No open goals. {done.length} completed.</p>}
      {list.map((t) => <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3"><span className="text-2xl">{t.icon}</span><span className="min-w-0 flex-1 text-sm font-bold">{t.title}</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-bold text-emerald-300">{t.rewardLabel}</span></div>)}
      <p className="pt-1 text-center text-xs text-white/45">{done.length} goal{done.length === 1 ? '' : 's'} completed</p>
    </div>
  );
}

function SkillsTab() {
  const xp = useSkillStore((s) => s.xp);
  return (
    <div className="space-y-3">
      {SKILLS.map((sk) => { const x = xp[sk.id] ?? 0, lv = levelOf(x), lo = xpForLevel(lv), hi = xpForLevel(lv + 1); return (
        <div key={sk.id} className="rounded-2xl bg-white/[0.07] p-3"><div className="mb-1.5 flex items-center justify-between text-sm font-bold"><span>{sk.icon} {sk.name} · Level {lv}</span><span className="text-xs text-white/50">{x - lo}/{hi - lo} XP</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ((x - lo) / (hi - lo)) * 100)}%` }} /></div></div>
      ); })}
      <p className="text-center text-xs text-white/45">More skills arrive with careers and hustles. Practise coding at a desk.</p>
    </div>
  );
}

function OpenApp({ label, app, hint }: { label: string; app: Parameters<ReturnType<typeof usePhoneStore.getState>['openApp']>[0]; hint: string }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white/[0.07] p-4 text-center"><p className="text-sm text-white/70">{hint}</p>
      <button onClick={() => { sfx.phoneOpen(); useUiStore.getState().setProfileOpen(false); usePhoneStore.getState().openPhone(); usePhoneStore.getState().openApp(app); }} className="rounded-full bg-accent px-5 py-2.5 text-sm font-bold">{label}</button></div>
  );
}

/** Character profile: opens from the portrait in the stats bar. Everything here reads the existing stores; nothing is duplicated. */
export function ProfileSheet() {
  const open = useUiStore((s) => s.profileOpen);
  const [tab, setTab] = useState<Tab>('profile');
  const a = useCharacterStore((s) => s.appearance);
  const stats = useStatsStore((s) => s.stats);
  const life = useLifeStore((s) => s.lifeType);
  const mood = moodOf(stats);
  const user = useAuthStore((s) => s.session);
  const close = () => useUiStore.getState().setProfileOpen(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="profile" className="absolute inset-0 z-[75]" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden />
          <motion.div role="dialog" aria-label="Character profile" className="glass-dark absolute inset-x-0 bottom-0 mx-auto flex h-[88dvh] w-full max-w-md flex-col rounded-t-[2rem] pb-safe" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}>
            <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-white/25" />
            <div className="flex items-center gap-3 px-4 pb-2 pt-3">
              <Portrait a={a} size={52} className="shrink-0 rounded-full ring-2 ring-white/20" />
              <div className="min-w-0 flex-1"><div className="truncate font-display text-xl font-extrabold">{user ?? 'Guest'}</div><div className="truncate text-sm text-white/60">{mood.label}{life ? ` · ${LIFE_TYPES[life].name}` : ''}</div></div>
              <button onClick={close} aria-label="Close profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={18} /></button>
            </div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3" role="tablist">{TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { sfx.pop(); setTab(t.id); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${tab === t.id ? 'bg-slate-200 text-night' : 'bg-white/10 text-white/75'}`}>{t.label}</button>)}</div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
              {tab === 'profile' && <ProfileTab />}{tab === 'needs' && <NeedsTab />}{tab === 'goals' && <GoalsTab />}{tab === 'skills' && <SkillsTab />}
              {tab === 'career' && <OpenApp label="Open Jobs" app="jobs" hint="Your job, salary and shifts live in the Jobs app on your phone." />}
              {tab === 'people' && <OpenApp label="Open Contacts" app="contacts" hint="Friends and family are in Contacts and Messages on your phone." />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
