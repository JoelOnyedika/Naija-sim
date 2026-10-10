export interface JobDef {
  id: string; title: string; company: string; salary: number; glyph: string;
  seconds: number; energyCost: number; hungerCost: number; minCharisma: number; charismaGain: number; blurb: string;
}
export const JOBS: JobDef[] = [
  { id: 'pos', title: 'POS Agent', company: 'Mama Ife Cash Point', salary: 6500, glyph: '💳', seconds: 20, energyCost: 15, hungerCost: 6, minCharisma: 0, charismaGain: 0.3, blurb: 'Withdrawals and transfers from a roadside kiosk.' },
  { id: 'shop', title: 'Shop Attendant', company: 'Alaba Provisions', salary: 8000, glyph: '🛒', seconds: 28, energyCost: 18, hungerCost: 8, minCharisma: 0, charismaGain: 0.4, blurb: 'Run the counter. Customers will haggle.' },
  { id: 'rider', title: 'Dispatch Rider', company: 'Swift Dispatch', salary: 12000, glyph: '🏍️', seconds: 34, energyCost: 22, hungerCost: 9, minCharisma: 3, charismaGain: 0.4, blurb: 'Beat the traffic with a parcel on your back.' },
  { id: 'keke', title: 'Keke Driver', company: 'Oshodi Park Union', salary: 18000, glyph: '🛺', seconds: 42, energyCost: 28, hungerCost: 11, minCharisma: 6, charismaGain: 0.5, blurb: 'Full tricycle, every trip.' },
  { id: 'bank', title: 'Bank Teller', company: 'Eko Trust Bank', salary: 34000, glyph: '🏦', seconds: 50, energyCost: 26, hungerCost: 10, minCharisma: 14, charismaGain: 0.8, blurb: 'Smile. Count. Repeat.' },
  { id: 'dev', title: 'Junior Developer', company: 'Yaba Tech Hub', salary: 65000, glyph: '💻', seconds: 55, energyCost: 30, hungerCost: 10, minCharisma: 22, charismaGain: 1, blurb: 'Ship features, survive stand-ups.' },
];
export const getJob = (id: string) => JOBS.find((j) => j.id === id);
