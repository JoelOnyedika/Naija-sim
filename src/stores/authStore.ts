import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * MOCK authentication. Accounts live in localStorage in plain text: this is a prototype stand-in
 * for a real auth service. Replace the three actions with API calls later; the shape stays the same.
 */
interface Account { username: string; password: string; google?: boolean }
interface AuthState {
  accounts: Account[];
  session: string | null;
  signup: (username: string, password: string) => string | null;
  login: (username: string, password: string) => string | null;
  google: () => void;
  logout: () => void;
}

const GOOGLE_NAMES = ['Tunde', 'Chioma', 'Emeka', 'Zainab', 'Kemi', 'Ibrahim', 'Ngozi', 'Femi'];

export const useAuthStore = create<AuthState>()(persist((set, get) => ({
  accounts: [], session: null,
  signup: (username, password) => {
    const u = username.trim();
    if (u.length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_.]+$/.test(u)) return 'Use letters, numbers, dots or underscores only.';
    if (password.length < 4) return 'Password must be at least 4 characters.';
    if (get().accounts.some((a) => a.username.toLowerCase() === u.toLowerCase())) return 'That username is taken. Try another one.';
    set((s) => ({ accounts: [...s.accounts, { username: u, password }], session: u }));
    return null;
  },
  login: (username, password) => {
    const a = get().accounts.find((x) => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!a || a.password !== password) return 'Wrong username or password.';
    set({ session: a.username });
    return null;
  },
  google: () => {
    const base = GOOGLE_NAMES[Math.floor(Math.random() * GOOGLE_NAMES.length)];
    const existing = get().accounts.find((a) => a.google);
    if (existing) return set({ session: existing.username });
    const name = `${base}${Math.floor(100 + Math.random() * 900)}`;
    set((s) => ({ accounts: [...s.accounts, { username: name, password: '', google: true }], session: name }));
  },
  logout: () => set({ session: null }),
}), { name: 'nigerialife.auth', version: 1 }));
