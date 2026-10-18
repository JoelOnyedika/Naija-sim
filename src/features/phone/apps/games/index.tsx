import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { CITY_CATALOG } from '@/content/cities';
import { formatNaira } from '@/core/format';
import { cityName } from '@/data/land';
import { LUDO_RULES, joinTable, leaveTable, tablesFor, type Table } from '@/game/games';
import { useEconomyStore } from '@/stores/economyStore';
import { useGamesStore } from '@/stores/gamesStore';
import { currentStateId } from '@/stores/mapStore';
import { toast } from '@/stores/uiStore';
import { Btn, Card, Chip, Note, Row } from '../../ui';

function TableCard({ t }: { t: Table }) {
  const [open, setOpen] = useState(false);
  const seat = useGamesStore((s) => s.seat), money = useEconomyStore((s) => s.money), mine = seat?.tableId === t.id;
  const full = t.status === 'full';
  return (
    <Card className={mine ? 'ring-2 ring-fuchsia-500' : ''}>
      <button className="w-full text-left" onClick={() => { sfx.click(); setOpen(!open); }} aria-expanded={open}>
        <Row glyph="🎲" title="Ludo" sub={`@${t.creator}'s table · ${t.seated}/${t.max} players`} right={<span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${full ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>{full ? 'Full' : 'Waiting'}</span>} />
      </button>
      {open && <div className="mt-2 rounded-xl bg-slate-50 p-3"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">House rules</p><ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-slate-700">{LUDO_RULES.map((r) => <li key={r}>{r}</li>)}</ul><p className="mt-2 text-xs text-slate-500">Stake: {t.wager ? `${formatNaira(t.wager)} (in-game, not charged yet)` : 'none'}</p></div>}
      {mine ? <Btn tone="light" className="mt-2 w-full" onClick={() => { leaveTable(); sfx.click(); }}>Leave table</Btn>
        : <Btn className="mt-2 w-full !bg-fuchsia-700" disabled={full || !!seat || t.wager > money} onClick={() => { const r = joinTable(t); if (!r.ok) { sfx.error(); toast(r.error, 'bad'); } else { sfx.pop(); toast('You have a seat', 'good'); } }}>{full ? 'Table full' : seat ? 'You already have a seat' : t.wager > money ? `Need ${formatNaira(t.wager)}` : t.wager ? `Sit for ${formatNaira(t.wager)}` : 'Join table'}</Btn>}
      {mine && <p className="mt-1.5 text-[12px] text-slate-500">Seat reserved. Ludo gameplay is not built yet, so the match cannot start and nothing is charged.</p>}
    </Card>
  );
}

/** Games lobby (Ludo). Tables are simulated: see game/games.ts. */
export function GamesApp() {
  const [city, setCity] = useState(currentStateId());
  const seat = useGamesStore((s) => s.seat);
  const tables = tablesFor(city);
  return (
    <div className="p-3">
      <div className="rounded-3xl bg-gradient-to-br from-fuchsia-600 to-purple-900 p-5 text-white shadow-lg"><p className="font-display text-2xl font-extrabold">🎲 Ludo lobby</p><p className="mt-1 text-sm text-white/80">Pick a table in {cityName(city)}. {seat ? 'You have a seat reserved.' : 'Tap a table to see its rules.'}</p></div>
      <div className="no-scrollbar -mx-3 mt-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label="City">{CITY_CATALOG.map((c) => <Chip key={c.id} active={city === c.id} onClick={() => setCity(c.id)}>{c.name}{c.id === currentStateId() ? ' 📍' : ''}</Chip>)}</div>
      <div className="mt-2 space-y-2">{tables.map((t) => <TableCard key={t.id} t={t} />)}</div>
      <Note>These tables are simulated and the players at them are scripted characters, not real people. Stakes are in-game naira only and are never charged yet.</Note>
    </div>
  );
}
