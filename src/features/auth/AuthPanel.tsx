import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { useAuthStore } from '@/stores/authStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useFlowStore, type Phase } from '@/stores/flowStore';
import { useLifeStore } from '@/stores/lifeStore';
import { Button } from '@/ui/Button';
import { Logo } from '@/ui/Logo';

/** Where a signed-in player should land, based on how far they got. */
export function nextPhase(): Phase {
  if (!useCharacterStore.getState().created) return 'character';
  return useLifeStore.getState().lifeType ? 'game' : 'roulette';
}

const Field = ({ label, icon, right, ...p }: { label: string; icon: React.ReactNode; right?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-white/70">{label}</span>
    <span className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 ring-1 ring-white/15 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-danfo"><span className="text-white/55">{icon}</span>
      <input {...p} className="min-w-0 flex-1 bg-transparent py-3.5 text-[16px] text-white outline-none placeholder:text-white/35" />{right}</span>
  </label>
);

/** Mock login/signup. Real auth later: replace the three authStore actions. */
export function AuthPanel({ mode }: { mode: 'login' | 'signup' }) {
  const go = useFlowStore((s) => s.go);
  const { signup, login, google } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [show, setShow] = useState(false);
  const isSignup = mode === 'signup';

  const submit = () => {
    const err = isSignup ? signup(username, password) : login(username, password);
    if (err) { setError(err); setShake((n) => n + 1); sfx.error(); return; }
    sfx.reward();
    go(isSignup ? 'character' : nextPhase());
  };

  return (
    <motion.div className="absolute inset-0 z-[40] flex items-end justify-center bg-night/55 px-3 pb-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        key={shake} className={`glass-dark w-full max-w-sm rounded-[2rem] p-6 ${shake ? 'animate-shake' : ''}`}
        initial={{ y: 80, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="mb-4 flex items-center justify-between"><Logo /><button onClick={() => go('landing')} aria-label="Close" className="glass flex h-9 w-9 items-center justify-center rounded-full text-white/80">✕</button></div>
        <div className="mb-4 grid grid-cols-2 rounded-2xl bg-white/[0.08] p-1 text-sm font-bold" role="tablist">
          {(['signup', 'login'] as const).map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => { if (mode !== m) { sfx.click(); go(m); } }} className={`h-10 rounded-xl transition ${mode === m ? 'cta-naija' : 'text-white/70'}`}>{m === 'signup' ? 'Sign Up' : 'Login'}</button>)}
        </div>
        <h2 className="font-display text-2xl font-extrabold">{isSignup ? 'Start your Naija story' : 'Welcome back, boss'}</h2>
        <p className="mb-4 text-sm text-white/70">{isSignup ? 'Free forever. Pick a name and hit the streets.' : 'Log in and continue your hustle.'}</p>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Username" icon={<User size={18} />} value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }} placeholder="e.g. tunde_yaba" autoComplete="username" autoCapitalize="none" />
          <Field label="Password" icon={<Lock size={18} />} type={show ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="At least 4 characters" autoComplete={isSignup ? 'new-password' : 'current-password'}
            right={<button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="flex h-9 w-9 items-center justify-center text-white/60">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />
          {error && <p className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <button type="submit" className="cta-naija h-14 w-full rounded-2xl font-display text-lg font-extrabold">{isSignup ? 'Create my account' : 'Login'}</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-white/40"><i className="h-px flex-1 bg-white/15" />or<i className="h-px flex-1 bg-white/15" /></div>
        <Button variant="glass" className="w-full" onClick={() => { google(); sfx.reward(); go(nextPhase()); }}>
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.9H12Z" /></svg>
          Continue with Google
        </Button>
        <p className="mt-4 text-center text-[11px] text-white/35">Prototype: accounts are stored on this device only.</p>
      </motion.div>
    </motion.div>
  );
}
