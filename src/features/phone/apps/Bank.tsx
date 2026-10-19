import { ChevronRight, House, ListChecks, MoreHorizontal, PiggyBank, Send } from 'lucide-react';
import { useState } from 'react';
import { sfx } from '@/audio/sfx';
import { computeCredibility } from '@/game/credibility';
import { useBankStore } from '@/stores/bankStore';
import { Card, Segmented, Tabs } from '../ui';
import { BillsTab } from './bank/Bills';
import { BondsTab } from './bank/Bonds';
import { CredibilityTab } from './bank/Credibility';
import { HistoryTab } from './bank/History';
import { OverviewTab } from './bank/Overview';
import { ReceiptTab } from './bank/Receipt';
import { SavingsTab } from './bank/Savings';
import { SendTab } from './bank/Send';
import { TaxTab } from './bank/Tax';

type Tab = 'home' | 'send' | 'grow' | 'activity' | 'more';
type Sub = 'credibility' | 'tax' | 'bills';
const TABS = [['home', 'Home', House], ['send', 'Send', Send], ['grow', 'Grow', PiggyBank], ['activity', 'Activity', ListChecks], ['more', 'More', MoreHorizontal]] as const;

/**
 * Bank. Five sections in a bottom bar: Home, Send, Grow (savings and bonds on one page), Activity (history and receipts) and More
 * (credibility, tax, bills). This file only switches sections; rules are in game/banking.ts and game/bank.ts.
 */
export function BankApp() {
  const [tab, setTab] = useState<Tab>('home'), [grow, setGrow] = useState<'savings' | 'bonds'>('savings'), [act, setAct] = useState<'history' | 'receipt'>('history');
  const [sub, setSub] = useState<Sub | null>(null), [receiptId, setReceiptId] = useState<string | null>(null);
  const overdue = useBankStore((s) => s.bills.filter((b) => b.status === 'overdue').length);
  useBankStore((s) => s.transferSignals); useBankStore((s) => s.bonds); useBankStore((s) => s.savingsWeeks);
  const score = computeCredibility().score;

  const openReceipt = (id: string) => { setReceiptId(id); setAct('receipt'); setTab('activity'); };
  const go = (t: 'send' | 'savings' | 'bonds' | 'bills' | 'history') => {
    if (t === 'send') setTab('send');
    else if (t === 'savings' || t === 'bonds') { setGrow(t); setTab('grow'); }
    else if (t === 'bills') { setSub('bills'); setTab('more'); }
    else { setAct('history'); setTab('activity'); }
  };
  const change = (t: Tab) => { if (t === 'more') setSub(null); setTab(t); };
  const rows: { id: Sub; title: string; sub: string; badge?: string }[] = [
    { id: 'credibility', title: 'Credibility', sub: `Your in-game score is ${score} out of 100` },
    { id: 'bills', title: 'Weekly bills', sub: overdue ? `${overdue} overdue` : 'Electricity and car upkeep', badge: overdue ? String(overdue) : undefined },
    { id: 'tax', title: 'Income tax', sub: 'Rates, what you owe, payment history' },
  ];
  return (
    <div className="flex min-h-full flex-col">
      {tab === 'home' && <OverviewTab go={go} openReceipt={openReceipt} />}
      {tab === 'send' && <SendTab openReceipt={openReceipt} />}
      {tab === 'grow' && (<><div className="px-4 pt-4"><Segmented label="Savings or bonds" value={grow} onChange={setGrow} options={[['savings', 'Savings'], ['bonds', 'Bonds']]} /></div>{grow === 'savings' ? <SavingsTab /> : <BondsTab />}</>)}
      {tab === 'activity' && (<><div className="px-4 pt-4"><Segmented label="History or receipt" value={act} onChange={(v) => { if (v === 'receipt') setReceiptId(null); setAct(v); }} options={[['history', 'All activity'], ['receipt', 'Last receipt']]} /></div>{act === 'history' ? <HistoryTab openReceipt={openReceipt} /> : <ReceiptTab txId={receiptId} />}</>)}
      {tab === 'more' && !sub && (
        <div className="space-y-2 p-4">
          {rows.map((r) => <Card key={r.id} className="!p-0"><button onClick={() => { sfx.click(); setSub(r.id); }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left"><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{r.title}</span><span className="block text-[12.5px] text-slate-500">{r.sub}</span></span>{r.badge && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">{r.badge}</span>}<ChevronRight size={18} className="text-slate-400" /></button></Card>)}
        </div>
      )}
      {tab === 'more' && sub && (<><button onClick={() => setSub(null)} className="px-4 pt-3 text-left text-[14px] font-semibold text-accent">‹ More</button>{sub === 'credibility' ? <CredibilityTab /> : sub === 'tax' ? <TaxTab /> : <BillsTab />}</>)}
      <Tabs label="Bank sections" tabs={TABS} value={tab} onChange={change} />
    </div>
  );
}
