import { Crown } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { formatNaira, formatNairaCompact } from '@/core/format';
import { computeNetWorth } from '@/game/wealth';
import { fireTask } from '@/game/tasks';
import { useAppsStore } from '@/stores/appsStore';
import { useAuthStore } from '@/stores/authStore';
import { useBankStore } from '@/stores/bankStore';
import { useCompanyStore } from '@/stores/companyStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useLandStore } from '@/stores/landStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { Note } from '../ui';

/** Fictional wealthy characters. The leaderboard is LOCAL: you are ranked against these scripted names, not against real players. */
const NPCS: [string, number, string][] = [
  ['Aliko-style Magnate', 9_800_000_000, '🏭'], ['Chief Obi Holdings', 4_200_000_000, '🛢️'], ['Madam Funmi Textiles', 1_650_000_000, '🧵'], ['Femi (Lekki Tech)', 820_000_000, '💻'],
  ['Alhaji Bello Logistics', 560_000_000, '🚚'], ['Dr. Ada Pharma', 310_000_000, '💊'], ['Tunde Estates', 190_000_000, '🏘️'], ['Mama Nkechi Foods', 96_000_000, '🍲'], ['Kola Auto Parts', 41_000_000, '🔧'], ['Zainab Fashion House', 18_000_000, '👗'],
];
interface Row { n: string; w: number; g: string; me: boolean }

function Podium({ r, rank, tall }: { r: Row; rank: number; tall: number }) {
  const gold = rank === 1;
  return (
    <div className="flex flex-1 flex-col items-center" aria-label={`Rank ${rank}: ${r.n}, ${formatNaira(r.w)}`}>
      {gold && <Crown size={26} className="mb-1 text-amber-400" aria-hidden />}
      <span className={`flex items-center justify-center rounded-full bg-white/10 text-3xl ring-2 ${gold ? 'h-20 w-20 text-4xl ring-amber-400' : 'h-16 w-16 ring-white/30'} ${r.me ? 'ring-4 ring-sky-400' : ''}`}>{r.g}</span>
      <p className="mt-1 max-w-full truncate px-1 text-center text-[12.5px] font-bold text-white">{r.n}{r.me ? ' (you)' : ''}</p>
      <p className="text-[12px] font-bold tabular-nums text-amber-300">{formatNairaCompact(r.w)}</p>
      <div className={`mt-1 flex w-full items-start justify-center rounded-t-xl pt-1.5 font-display text-lg font-extrabold ${gold ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-stone-900' : 'bg-gradient-to-b from-stone-400/70 to-stone-600/70 text-white'}`} style={{ height: tall }}>{rank}</div>
    </div>
  );
}

/** Forbes: ranks by NET WORTH (wallet + savings + bonds + homes + land + markets + company funds + cars; see game/wealth.ts). */
export function ForbesApp() {
  const money = useEconomyStore((s) => s.money), owned = usePropertyStore((s) => s.ownedIds), cars = useVehicleStore((s) => s.owned);
  const savings = useBankStore((s) => s.savings.balance), bonds = useBankStore((s) => s.bonds), land = useLandStore((s) => s.owned), cos = useCompanyStore((s) => s.companies), hold = useAppsStore((s) => s.holdings);
  const me = useAuthStore((s) => s.session) ?? 'You';
  useEffect(() => fireTask('app:forbes'), []);
  const worth = useMemo(() => computeNetWorth().total, [money, owned, cars, savings, bonds, land, cos, hold]);
  const rows: Row[] = useMemo(() => [...NPCS.map(([n, w, g]) => ({ n, w, g, me: false })), { n: me, w: worth, g: '⭐', me: true }].sort((a, b) => b.w - a.w), [me, worth]);
  const top = rows.slice(0, 9), myRank = rows.findIndex((r) => r.me) + 1;
  return (
    <div className="min-h-full bg-gradient-to-b from-stone-900 to-black px-3 pb-6 pt-4 text-white">
      <p className="text-center text-[11px] tracking-[0.3em] text-amber-400">NIGERIA LIFE</p>
      <h2 className="text-center font-display text-2xl font-extrabold">Richest players</h2>
      <div className="mt-4 flex items-end gap-2" role="list">
        <Podium r={top[1]} rank={2} tall={64} /><Podium r={top[0]} rank={1} tall={92} /><Podium r={top[2]} rank={3} tall={46} />
      </div>
      <ol className="mt-3 space-y-1.5" start={4}>
        {top.slice(3).map((r, i) => <li key={r.n} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.me ? 'bg-sky-500/20 ring-2 ring-sky-400' : 'bg-white/[0.06]'}`}><span className="w-6 text-center font-display font-extrabold text-amber-400">{i + 4}</span><span className="text-2xl">{r.g}</span><span className="min-w-0 flex-1 truncate text-[14px] font-bold">{r.n}{r.me ? ' (you)' : ''}</span><b className="text-sm tabular-nums">{formatNairaCompact(r.w)}</b></li>)}
      </ol>
      {myRank > 9 && <div className="mt-2 flex items-center gap-3 rounded-2xl bg-sky-500/20 px-3 py-2.5 ring-2 ring-sky-400"><span className="w-6 text-center font-display font-extrabold">{myRank}</span><span className="text-2xl">⭐</span><span className="flex-1 truncate text-[14px] font-bold">{me} (you)</span><b className="text-sm tabular-nums">{formatNairaCompact(worth)}</b></div>}
      <div className="mt-4"><Note><span className="text-white/60">Ranked by net worth: wallet, savings, bonds, homes, land, market holdings, company funds and cars, each counted once. This is a local leaderboard. The other names are fictional characters, not real players.</span></Note></div>
    </div>
  );
}
