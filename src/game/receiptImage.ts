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

/** The club bill as a picture: a long paper ticket with notched sides, every line, the running total and a barcode. Drawn on this device. */
export function renderBillPng(o: { club: string; player: string; since: number; rows: { at: number; name: string; qty: number; price: number; running: number }[]; total: number }): Promise<Blob> {
  const SHOW = 40, rows = o.rows.slice(-SHOW), hidden = o.rows.length - rows.length;
  const W = 640, rowH = 44, top = 330, H = top + Math.max(1, rows.length) * rowH + (hidden ? 40 : 0) + 330;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2A1246'); bg.addColorStop(1, '#0E1424'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // paper with a zigzag top and bottom
  const paper = '#FBF7EE', L = 28, R = W - 28, T = 28, B = H - 28;
  g.fillStyle = paper; g.beginPath(); g.moveTo(L, T + 10);
  for (let x = L; x < R; x += 20) { g.lineTo(x + 10, T); g.lineTo(x + 20, T + 10); }
  g.lineTo(R, B - 10); for (let x = R; x > L; x -= 20) { g.lineTo(x - 10, B); g.lineTo(x - 20, B - 10); } g.closePath(); g.fill();
  g.textAlign = 'center'; g.fillStyle = '#1B1B22'; g.font = '800 40px sans-serif'; g.fillText(o.club.toUpperCase(), W / 2, 112);
  g.fillStyle = '#8A6D2B'; g.font = '700 18px sans-serif'; g.fillText('T H E   B I L L', W / 2, 146);
  g.fillStyle = '#6B6B72'; g.font = '500 18px sans-serif'; g.fillText(`${o.player}  ·  ${new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' })}`, W / 2, 178);
  g.fillStyle = '#7A1FA2'; g.font = '800 22px sans-serif'; g.fillText('BURNED TONIGHT', W / 2, 232);
  g.fillStyle = '#1B1B22'; g.font = '800 56px sans-serif'; g.fillText(naira(o.total), W / 2, 296);
  const dash = (y: number) => { g.strokeStyle = '#BBA877'; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(L + 28, y); g.lineTo(R - 28, y); g.stroke(); g.setLineDash([]); };
  dash(top - 12);
  let y = top + 24; g.textAlign = 'left';
  if (hidden) { g.fillStyle = '#8A8A92'; g.font = '500 18px sans-serif'; g.fillText(`…and ${hidden} earlier ${hidden === 1 ? 'line' : 'lines'}`, L + 36, y); y += 40; }
  for (const r of rows) {
    g.fillStyle = '#8A8A92'; g.font = '500 16px sans-serif'; g.fillText(new Date(r.at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }), L + 36, y - 2);
    g.fillStyle = '#1B1B22'; g.font = '600 22px sans-serif'; g.fillText(`${r.qty > 1 ? `${r.qty}× ` : ''}${r.name}`.slice(0, 26), L + 118, y - 2);
    g.textAlign = 'right'; g.font = '700 22px sans-serif'; g.fillText(naira(r.price), R - 36, y - 2); g.textAlign = 'left'; y += rowH;
  }
  if (!rows.length) { g.fillStyle = '#8A8A92'; g.font = '500 20px sans-serif'; g.fillText('Nothing ordered yet.', L + 36, y); y += rowH; }
  dash(y - 14); y += 26;
  g.fillStyle = '#1B1B22'; g.font = '800 26px sans-serif'; g.fillText('TOTAL', L + 36, y); g.textAlign = 'right'; g.font = '800 36px sans-serif'; g.fillText(naira(o.total), R - 36, y);
  y += 56; g.textAlign = 'center'; g.fillStyle = '#D9F2E3'; g.beginPath(); g.roundRect(W / 2 - 190, y - 30, 380, 44, 22); g.fill(); g.fillStyle = '#0E7A43'; g.font = '800 20px sans-serif'; g.fillText('PAID FROM CASH · ALL DEDUCTED', W / 2, y);
  // barcode (the same bill always draws the same bars)
  y += 40; let seed = Math.round(o.total) % 9973 + o.rows.length * 31 + 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  g.fillStyle = '#1B1B22'; for (let x = L + 80; x < R - 80;) { const w = 2 + Math.floor(rnd() * 5); g.fillRect(x, y, w, 62); x += w + 2 + Math.floor(rnd() * 4); }
  g.fillStyle = '#8A8A92'; g.font = '500 15px sans-serif'; g.fillText('In-game naira. Not proof of any real-money purchase.', W / 2, y + 94);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));
}
