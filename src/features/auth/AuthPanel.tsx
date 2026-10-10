import { motion } from 'framer-motion';
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

const Field = ({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-white/70">{label}</span>
    <input {...p} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-[16px] text-white outline-none ring-1 ring-white/15 placeholder:text-white/35 focus:bg-white/15 focus:ring-2 focus:ring-danfo" />
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
  const isSignup = mode === 'signup';

  const submit = () => {
    const err = isSignup ? signup(username, password) : login(username, password);
    if (err) { setError(err); setShake((n) => n + 1); sfx.error(); return; }
    sfx.reward();
    go(isSignup ? 'character' : nextPhase());
  };

  return (
    <motion.div className="absolute inset-0 z-30 flex items-end justify-center bg-night/55 px-3 pb-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        key={shake} className={`glass-dark w-full max-w-sm rounded-[2rem] p-6 ${shake ? 'animate-shake' : ''}`}
        initial={{ y: 80, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="mb-5 flex items-center justify-between"><Logo /><button onClick={() => go('landing')} aria-label="Close" className="glass flex h-9 w-9 items-center justify-center rounded-full text-white/80">✕</button></div>
        <h2 className="font-display text-2xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mb-4 text-sm text-white/70">{isSignup ? 'Free forever. Your Nigerian story starts here.' : 'Log in and continue your hustle.'}</p>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label="Username" value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }} placeholder="e.g. tunde_yaba" autoComplete="username" autoCapitalize="none" />
          <Field label="Password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="At least 4 characters" autoComplete={isSignup ? 'new-password' : 'current-password'} />
          {error && <p className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-200">{error}</p>}
          <Button type="submit" size="lg" className="w-full">{isSignup ? 'Sign Up Free' : 'Login'}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-white/40"><i className="h-px flex-1 bg-white/15" />or<i className="h-px flex-1 bg-white/15" /></div>
        <Button variant="glass" className="w-full" onClick={() => { google(); sfx.reward(); go(nextPhase()); }}>
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8a6.1 6.1 0 1 1 0-12.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.9H12Z" /></svg>
          Continue with Google
        </Button>
        <p className="mt-4 text-center text-sm text-white/65">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button onClick={() => go(isSignup ? 'login' : 'signup')} className="font-semibold text-danfo">{isSignup ? 'Login' : 'Sign up free'}</button>
        </p>
        <p className="mt-2 text-center text-[11px] text-white/35">Prototype: accounts are stored on this device only.</p>
      </motion.div>
    </motion.div>
  );
}
