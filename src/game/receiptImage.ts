import type { Receipt } from '@/stores/clubStore';

/** Draws a receipt picture on this device with a canvas. No server, no outside service. */
export function renderReceiptPng(r: Receipt): Promise<Blob> {
  const W = 640, rowH = 38, H = 520 + r.lines.length * rowH;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  g.fillStyle = '#1B1B26'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#FBF7EE'; g.beginPath(); g.roundRect(24, 24, W - 48, H - 48, 28); g.fill();
  g.fillStyle = '#1B1B22'; g.textAlign = 'center'; g.font = '800 40px sans-serif'; g.fillText(r.club.toUpperCase(), W / 2, 100);
  g.fillStyle = '#8A6D2B'; g.font = '600 18px sans-serif'; g.fillText('O F F I C I A L   R E C E I P T', W / 2, 132);
  g.textAlign = 'left'; let y = 190;
  const row = (a: string, b: string, bold = false) => { g.fillStyle = '#6B6B72'; g.font = '500 20px sans-serif'; g.fillText(a, 56, y); g.fillStyle = '#1B1B22'; g.font = `${bold ? 800 : 700} 20px sans-serif`; g.textAlign = 'right'; g.fillText(b, W - 56, y); g.textAlign = 'left'; y += rowH; };
  row('Guest', r.player); row('Date', new Date(r.at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })); row('Receipt no.', r.id); row('Transaction', r.txId);
  y += 10; g.strokeStyle = '#BBA877'; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(56, y - 24); g.lineTo(W - 56, y - 24); g.stroke(); g.setLineDash([]);
  for (const l of r.lines) { g.fillStyle = '#1B1B22'; g.font = '500 22px sans-serif'; g.fillText(l.name, 56, y); g.textAlign = 'right'; g.font = '700 22px sans-serif'; g.fillText(naira(l.price), W - 56, y); g.textAlign = 'left'; y += rowH; }
  y += 6; g.fillStyle = '#1B1B22'; g.fillRect(56, y - 22, W - 112, 3); y += 26;
  g.font = '800 24px sans-serif'; g.fillText('TOTAL', 56, y); g.textAlign = 'right'; g.font = '800 34px sans-serif'; g.fillText(naira(r.total), W - 56, y); g.textAlign = 'center'; y += 56;
  g.fillStyle = '#D9F2E3'; g.beginPath(); g.roundRect(W / 2 - 60, y - 28, 120, 40, 20); g.fill(); g.fillStyle = '#0E7A43'; g.font = '800 20px sans-serif'; g.fillText('PAID', W / 2, y);
  g.fillStyle = '#8A8A92'; g.font = '500 15px sans-serif'; g.fillText('In-game naira. Not proof of any real-money purchase.', W / 2, H - 56);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));
}
