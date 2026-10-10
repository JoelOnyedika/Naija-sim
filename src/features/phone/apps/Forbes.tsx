import { useEffect, useMemo } from 'react';
import { formatNaira } from '@/core/format';
import { getVehicle } from '@/data/vehicles';
import { fireTask } from '@/game/tasks';
import { useAuthStore } from '@/stores/authStore';
import { useEconomyStore } from '@/stores/economyStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { getProperty } from '@/world/registry';
import { Card, Row } from '../ui';

const NPCS = [['Aliko-style Magnate', 9_800_000_000, '🏭'], ['Chief Obi Holdings', 4_200_000_000, '🛢️'], ['Madam Funmi Textiles', 1_650_000_000, '🧵'], ['Femi (Lekki Tech)', 820_000_000, '💻'], ['Alhaji Bello', 560_000_000, '🌾'], ['Zainab Estates', 340_000_000, '🏘️'], ['DJ Kele', 90_000_000, '🎧'], ['Emeka the Importer', 24_000_000, '📦'], ['Tunde (Yaba)', 3_500_000, '🧑🏾'], ['Chioma', 1_200_000, '👩🏾‍🦱']] as const;

export function ForbesApp() {
  const money = useEconomyStore((s) => s.money);
  const owned = usePropertyStore((s) => s.ownedIds);
  const cars = useVehicleStore((s) => s.owned);
  const me = useAuthStore((s) => s.session) ?? 'You';
  useEffect(() => fireTask('app:forbes'), []);
  const worth = money + owned.reduce((s, id) => s + (getProperty(id)?.price ?? 0), 0) + cars.reduce((s, id) => s + (getVehicle(id)?.price ?? 0) * 0.8, 0);
  const rows = useMemo(() => [...NPCS.map(([n, w, g]) => ({ n, w: w as number, g, me: false })), { n: me, w: worth, g: '⭐', me: true }].sort((a, b) => b.w - a.w), [me, worth]);
  return (
    <div className="space-y-2 p-3">
      <p className="px-1 text-xs text-slate-500">Net worth = cash + homes + cars. Richest players in Nigeria.</p>
      {rows.map((r, i) => <Card key={r.n} className={r.me ? 'ring-2 ring-amber-400' : ''}><Row glyph={r.g} title={`#${i + 1} ${r.n}${r.me ? ' (you)' : ''}`} right={<span className="font-display text-sm font-extrabold tabular-nums text-emerald-700">{formatNaira(r.w)}</span>} /></Card>)}
    </div>
  );
}
