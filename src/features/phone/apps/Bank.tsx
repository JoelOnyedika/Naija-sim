import { useState } from 'react';
import { Tabs } from '../ui';
import { BillsTab } from './bank/Bills';
import { BondsTab } from './bank/Bonds';
import { CredibilityTab } from './bank/Credibility';
import { HistoryTab } from './bank/History';
import { OverviewTab } from './bank/Overview';
import { ReceiptTab } from './bank/Receipt';
import { SavingsTab } from './bank/Savings';
import { SendTab } from './bank/Send';
import { TaxTab } from './bank/Tax';

const TABS = [['overview', 'Overview'], ['send', 'Send'], ['savings', 'Savings'], ['bonds', 'Bonds'], ['credibility', 'Credibility'], ['tax', 'Income Tax'], ['bills', 'Weekly Bills'], ['receipt', 'Last Receipt'], ['history', 'Money History']] as const;
type Tab = (typeof TABS)[number][0];

/**
 * Bank: sections for the wallet, savings, bonds, credibility, tax, bills, receipts and the full ledger. This file only
 * switches sections. Rules live in game/banking.ts and game/bank.ts; money lives in the shared economyStore ledger.
 */
export function BankApp() {
  const [tab, setTab] = useState<Tab>('overview');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const openReceipt = (id: string) => { setReceiptId(id); setTab('receipt'); };
  return (
    <div className="flex min-h-full flex-col">
      <Tabs label="Bank sections" tabs={TABS} value={tab} onChange={(t) => { if (t === 'receipt') setReceiptId(null); setTab(t); }} />
      {tab === 'overview' && <OverviewTab go={(t) => setTab(t)} openReceipt={openReceipt} />}
      {tab === 'send' && <SendTab />}
      {tab === 'savings' && <SavingsTab />}
      {tab === 'bonds' && <BondsTab />}
      {tab === 'credibility' && <CredibilityTab />}
      {tab === 'tax' && <TaxTab />}
      {tab === 'bills' && <BillsTab />}
      {tab === 'receipt' && <ReceiptTab txId={receiptId} />}
      {tab === 'history' && <HistoryTab openReceipt={openReceipt} />}
    </div>
  );
}
