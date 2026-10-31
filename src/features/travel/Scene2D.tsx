import { memo, useMemo } from 'react';
import type { Appearance } from '@/types/game';
import type { Building, TripPlan } from './plan';
import './travel.css';

/**
 * The quick version of a trip: a flat side-on street drawn in SVG, scrolling in layers (a "2.5D" parallax), with the ride, the
 * weather and the event on top. It is all CSS animation, so it costs almost nothing per frame and suits weak phones.
 * Units are SVG user units in a 400 x 240 view; the road surface is at y = 205.
 */
const GROUND = 205;
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
/** Colour of the sky at the top of the frame, so the area above the drawing blends into it. */
export const skyTop = (w: TripPlan['weather']) => SKY[w][0];
const SKY: Record<TripPlan['weather'], [string, string]> = { clear: ['#5FB6FF', '#DDF1FF'], rain: ['#46525F', '#8E9BA6'], dusk: ['#FF8A5B', '#FFD98A'] };

// ---------------------------------------------------------------- a person
const HAIR_TOP = (a: Appearance) => a.hairColor;
export const Person = memo(function Person({ a, scale = 1, walking = false, umbrella = false, facing = 1 }: { a: Appearance; scale?: number; walking?: boolean; umbrella?: boolean; facing?: 1 | -1 }) {
  const fem = a.body === 'femme', skirt = a.bottom === 'skirt' || a.bottom === 'dress';
  const hair = a.hairStyle, hc = HAIR_TOP(a);
  const limb = walking ? 'tv-limb walker' : '';
  return (
    <g transform={`scale(${scale * facing} ${scale})`}>
      {/* legs */}
      <g className={`${limb}`}><rect x={-5} y={-20} width={5} height={20} rx={2} fill={skirt ? a.skin : a.bottomColor} /><rect x={-5.5} y={-4} width={8} height={4} rx={2} fill={a.shoeColor} /></g>
      <g className={`${limb} b`}><rect x={1} y={-20} width={5} height={20} rx={2} fill={skirt ? a.skin : a.bottomColor} /><rect x={0.5} y={-4} width={8} height={4} rx={2} fill={a.shoeColor} /></g>
      {/* torso */}
      <rect x={-8} y={-36} width={16} height={18} rx={4} fill={a.topColor} />
      {skirt && <path d="M-9 -20 L9 -20 L12 -8 L-12 -8 Z" fill={a.bottomColor} />}
      {/* back arm */}
      <g className={limb}><rect x={-11} y={-35} width={4.5} height={15} rx={2.2} fill={a.skin} /></g>
      {/* head */}
      <rect x={-2.5} y={-40} width={5} height={5} fill={a.skin} />
      <circle cx={0} cy={-45} r={7} fill={a.skin} />
      {hair === 'afro' && <circle cx={-0.5} cy={-47} r={9.5} fill={hc} />}
      {hair === 'bun' && <><path d="M-7 -46 a7 7 0 0 1 14 0 z" fill={hc} /><circle cx={-6} cy={-53} r={3.5} fill={hc} /></>}
      {(hair === 'braids' || hair === 'dreads' || hair === 'twists') && <><path d="M-7.5 -45 a7.5 7.5 0 0 1 15 0 z" fill={hc} /><rect x={-8.5} y={-46} width={3} height={14} rx={1.5} fill={hc} /><rect x={5.5} y={-46} width={3} height={14} rx={1.5} fill={hc} /></>}
      {(hair === 'fade' || hair === 'lowcut' || hair === 'cornrows') && <path d="M-7 -45 a7 7 0 0 1 14 0 q-7 -3 -14 0z" fill={hc} />}
      {a.beard && a.beard !== 'none' && !fem && <path d="M-6 -44 q6 11 12 0 q-6 4 -12 0z" fill={hc} opacity={a.beard === 'stubble' ? 0.45 : 0.95} />}
      <circle cx={2.6} cy={-45} r={1} fill="#1b1410" /><circle cx={-1.6} cy={-45} r={1} fill="#1b1410" />
      {/* front arm */}
      <g className={`${limb} b`}><rect x={6.5} y={-35} width={4.5} height={15} rx={2.2} fill={a.skin} /></g>
      {umbrella && <g><rect x={9} y={-72} width={1.4} height={38} fill="#2b2b2b" /><path d="M-18 -66 Q10 -92 38 -66 Q30 -70 24 -66 Q17 -71 10 -66 Q3 -71 -4 -66 Q-11 -70 -18 -66 Z" fill="#E4572E" /></g>}
    </g>
  );
});

// ---------------------------------------------------------------- rides (all face right, origin = bottom centre on the road)
const Wheel = ({ x, y, r }: { x: number; y: number; r: number }) => (
  <g transform={`translate(${x} ${y})`}><circle r={r} fill="#15181B" /><g className="tv-wheel"><circle r={r * 0.55} fill="#C9CED1" /><rect x={-r * 0.5} y={-1} width={r} height={2} fill="#6b7075" /><rect x={-1} y={-r * 0.5} width={2} height={r} fill="#6b7075" /></g></g>
);
const Head = ({ x, y, skin = '#8A5A3C', r = 5 }: { x: number; y: number; skin?: string; r?: number }) => <circle cx={x} cy={y} r={r} fill={skin} />;

function Keke({ color = '#FFC21A' }: { color?: string }) {
  return (
    <g>
      <Wheel x={-20} y={-9} r={9} /><Wheel x={26} y={-9} r={9} />
      <path d="M-34 -12 L-34 -34 L12 -34 L30 -18 L32 -12 Z" fill={color} />
      <rect x={-33} y={-48} width={46} height={6} rx={2} fill="#1F6B52" /><rect x={-30} y={-44} width={2} height={12} fill="#15181B" /><rect x={8} y={-44} width={2} height={12} fill="#15181B" />
      <path d="M12 -38 L26 -22 L12 -22 Z" fill="#9FD0E8" />
      <Head x={-8} y={-34} skin="#6B4128" /><rect x={-13} y={-30} width={10} height={9} rx={3} fill="#2B8C5B" />
      <Head x={-24} y={-33} skin="#B77B4E" /><circle cx={30} cy={-16} r={2.4} fill="#FFF3B0" />
      <rect x={-34} y={-14} width={66} height={3} fill="#15181B" opacity={0.25} />
    </g>
  );
}
function Danfo({ passengers }: { passengers: string[] }) {
  return (
    <g>
      <Wheel x={-34} y={-10} r={10} /><Wheel x={34} y={-10} r={10} />
      <rect x={-58} y={-64} width={116} height={50} rx={7} fill="#FFC21A" />
      <rect x={-58} y={-38} width={116} height={9} fill="#15181B" />
      <rect x={-52} y={-58} width={98} height={17} rx={3} fill="#9FD0E8" />
      {passengers.map((c, i) => <Head key={i} x={-44 + i * 20} y={-48} skin={c} />)}
      {[-44, -24, -4, 16, 36].map((x) => <rect key={x} x={x - 1} y={-58} width={2} height={17} fill="#FFC21A" />)}
      <path d="M46 -58 L58 -42 L58 -41 L46 -41 Z" fill="#9FD0E8" />
      <text x={-46} y={-31} fontSize={7} fontWeight="800" fill="#FFC21A" fontFamily="sans-serif">NO CONDITION IS PERMANENT</text>
      <g className="tv-shake"><rect x={52} y={-48} width={5} height={14} rx={2} fill="#2B8C5B" /><Head x={60} y={-52} skin="#4A2C1B" r={5} /><rect x={55} y={-47} width={14} height={3.5} rx={1.7} fill="#4A2C1B" /></g>
      <g><rect x={-30} y={-72} width={46} height={8} rx={2} fill="#7c5a2a" /><ellipse cx={-6} cy={-80} rx={9} ry={7} fill="#F4F1EA" /><circle cx={4} cy={-84} r={3.6} fill="#F4F1EA" /></g>
      <circle cx={56} cy={-22} r={2.4} fill="#FFF3B0" /><circle cx={-58} cy={-24} r={2} fill="#C21F2E" className="tv-blink" />
    </g>
  );
}
function Okada({ rider, pot }: { rider: Appearance; pot: boolean }) {
  return (
    <g>
      <Wheel x={-24} y={-11} r={11} /><Wheel x={24} y={-11} r={11} />
      <path d="M-24 -11 L-6 -30 L14 -30 L24 -11 M-6 -30 L-10 -42 L2 -42" stroke="#15181B" strokeWidth={3} fill="none" />
      <rect x={-14} y={-34} width={26} height={6} rx={3} fill="#C21F2E" />
      <g transform="translate(-6 -32) scale(.9)"><rect x={-5} y={-18} width={12} height={16} rx={4} fill="#8A63D2" /><Head x={3} y={-24} skin="#B77B4E" r={6} />{pot && <path d="M-3 -27 h12 l-1 -3 h-10 z" fill="#B0B6BA" />}<rect x={6} y={-16} width={14} height={4} rx={2} fill="#B77B4E" transform="rotate(-18 6 -16)" /></g>
      <g transform="translate(10 -34) scale(.95)"><rect x={-5} y={-19} width={12} height={17} rx={4} fill={rider.topColor} /><Head x={3} y={-25} skin={rider.skin} r={6} />{pot && <path d="M-3 -28 h12 l-1 -3 h-10 z" fill="#B0B6BA" />}<rect x={6} y={-17} width={14} height={4} rx={2} fill={rider.skin} transform="rotate(-8 6 -17)" /></g>
      <circle cx={30} cy={-34} r={2.2} fill="#FFF3B0" />
    </g>
  );
}
function Car({ body = 'sedan', color = '#C9CED1', taxi = false, brake = false }: { body?: string; color?: string; taxi?: boolean; brake?: boolean }) {
  const suv = body === 'suv', truck = body === 'truck', sport = body === 'sport';
  const L = sport ? 84 : suv ? 90 : truck ? 98 : 84, H = sport ? 20 : suv ? 32 : 26;
  return (
    <g>
      <Wheel x={-L * 0.3} y={-10} r={suv || truck ? 11 : 10} /><Wheel x={L * 0.3} y={-10} r={suv || truck ? 11 : 10} />
      <rect x={-L / 2} y={-14 - H} width={L} height={H} rx={8} fill={color} />
      {truck ? <><path d={`M${-L * 0.05} ${-14 - H} L${L * 0.05} ${-14 - H - 18} L${L / 2 - 8} ${-14 - H - 18} L${L / 2 - 2} ${-14 - H} Z`} fill={color} /><rect x={-L / 2 + 2} y={-14 - H - 6} width={L * 0.5} height={7} fill="#3a3d40" /></>
        : <path d={`M${-L * 0.28} ${-14 - H} Q${-L * 0.2} ${-14 - H - (sport ? 12 : suv ? 20 : 17)} ${-L * 0.02} ${-14 - H - (sport ? 12 : suv ? 20 : 17)} L${L * 0.2} ${-14 - H - (sport ? 12 : suv ? 20 : 17)} Q${L * 0.3} ${-14 - H - 8} ${L * 0.34} ${-14 - H} Z`} fill={color} />}
      {!truck && <path d={`M${-L * 0.22} ${-14 - H - 1} Q${-L * 0.16} ${-14 - H - (sport ? 10 : suv ? 17 : 14)} ${-L * 0.02} ${-14 - H - (sport ? 10 : suv ? 17 : 14)} L${L * 0.18} ${-14 - H - (sport ? 10 : suv ? 17 : 14)} Q${L * 0.26} ${-14 - H - 6} ${L * 0.29} ${-14 - H - 1} Z`} fill="#9FD0E8" />}
      {taxi && <rect x={-6} y={-14 - H - 25} width={16} height={6} rx={2} fill="#fff" />}
      <circle cx={L / 2 - 3} cy={-14 - H / 2} r={2.6} fill="#FFF3B0" /><rect x={-L / 2} y={-14 - H / 2 - 3} width={4} height={6} rx={2} fill="#C21F2E" className={brake ? 'tv-blink' : ''} opacity={brake ? 1 : 0.8} />
      <Head x={L * 0.05} y={-14 - H - 6} skin="#6B4128" r={4} />
    </g>
  );
}

// ---------------------------------------------------------------- the destination, built up as you arrive
function DestinationBuilding({ type, name, icon }: { type: Building; name: string; icon: string }) {
  const sign = <g><rect x={-64} y={-12} width={128} height={20} rx={5} fill="#0E141B" opacity={0.9} /><text x={0} y={2} textAnchor="middle" fontSize={10} fontWeight={800} fill="#FFC21A" fontFamily="sans-serif">{icon} {name.length > 22 ? name.slice(0, 21) + '…' : name}</text></g>;
  const door = (x: number) => <rect x={x - 7} y={-26} width={14} height={26} rx={2} fill="#2b1a10" />;
  switch (type) {
    case 'tower': case 'bank':
      return <g><rect x={-30} y={-176} width={60} height={176} fill="#3C6E9C" />{Array.from({ length: 11 }).map((_, r) => [-22, -8, 6, 20].map((x) => <rect key={`${r}-${x}`} x={x - 3} y={-168 + r * 14} width={8} height={9} fill={(r * 7 + x) % 5 === 0 ? '#FFE9A0' : '#BEE3F8'} />))}<rect x={-34} y={-34} width={68} height={34} fill="#274A6B" />{door(0)}<rect x={-2} y={-196} width={4} height={20} fill="#9aa4ad" /><g transform="translate(0 -44)">{sign}</g></g>;
    case 'market':
      return <g><rect x={-70} y={-62} width={140} height={62} fill="#E8D8B0" />{Array.from({ length: 7 }).map((_, i) => <path key={i} d={`M${-70 + i * 20} -62 h20 v-14 h-20 z`} fill={i % 2 ? '#E4572E' : '#FFC21A'} />)}{[-50, -10, 30].map((x) => <rect key={x} x={x} y={-40} width={26} height={22} fill="#B58A52" />)}<g transform="translate(0 -92)">{sign}</g></g>;
    case 'church':
      return <g><rect x={-44} y={-70} width={88} height={70} fill="#F1ECE0" /><path d="M-48 -70 L0 -106 L48 -70 Z" fill="#B8523D" /><rect x={-9} y={-130} width={18} height={60} fill="#F1ECE0" /><path d="M-12 -130 L0 -152 L12 -130 Z" fill="#B8523D" /><rect x={-1.4} y={-168} width={2.8} height={18} fill="#FFC21A" /><rect x={-6} y={-162} width={12} height={2.8} fill="#FFC21A" />{door(0)}<g transform="translate(0 -122)">{sign}</g></g>;
    case 'mosque':
      return <g><rect x={-46} y={-62} width={92} height={62} fill="#EFE7D2" /><path d="M-34 -62 a34 34 0 0 1 68 0 z" fill="#2B8C5B" /><rect x={-60} y={-110} width={10} height={110} fill="#EFE7D2" /><path d="M-62 -110 L-55 -126 L-48 -110 Z" fill="#2B8C5B" />{door(0)}<g transform="translate(0 -112)">{sign}</g></g>;
    case 'stadium':
      return <g><ellipse cx={0} cy={-30} rx={90} ry={34} fill="#C9CED1" /><ellipse cx={0} cy={-38} rx={70} ry={22} fill="#2B8C5B" />{[-80, -40, 40, 80].map((x) => <rect key={x} x={x - 2} y={-90} width={4} height={56} fill="#8A929A" />)}<g transform="translate(0 -102)">{sign}</g></g>;
    case 'club':
      return <g><rect x={-54} y={-82} width={108} height={82} fill="#1C1330" /><rect x={-46} y={-74} width={92} height={10} fill="#FF2E93" className="tv-blink" /><rect x={-46} y={-60} width={92} height={5} fill="#19C3A6" /><circle cx={-24} cy={-36} r={6} fill="#FFC21A" className="tv-blink" /><circle cx={24} cy={-36} r={6} fill="#8A63D2" className="tv-blink" />{door(0)}<g transform="translate(0 -96)">{sign}</g></g>;
    case 'gate':
      return <g><rect x={-60} y={-46} width={10} height={46} fill="#8A5A3C" /><rect x={50} y={-46} width={10} height={46} fill="#8A5A3C" /><rect x={-64} y={-56} width={128} height={12} rx={3} fill="#2B8C5B" />{[-30, 0, 30].map((x) => <circle key={x} cx={x} cy={-20} r={14} fill="#3FA66B" />)}<g transform="translate(0 -72)">{sign}</g></g>;
    default:
      return <g><rect x={-46} y={-60} width={92} height={60} fill="#E9DCC2" /><path d="M-50 -60 h100 l-6 -16 h-88 z" fill="#E4572E" />{door(-14)}<rect x={6} y={-44} width={30} height={22} fill="#9FD0E8" /><g transform="translate(0 -88)">{sign}</g></g>;
  }
}

// ---------------------------------------------------------------- the scene
function Skyline({ seed, hues, tall }: { seed: number; hues: string[]; tall: number }) {
  const r = rng(seed); let x = 0; const out: JSX.Element[] = [];
  while (x < 400) { const w = 18 + r() * 26, h = 30 + r() * tall; out.push(<rect key={x} x={x} y={GROUND - 70 - h} width={w} height={h + 70} fill={hues[Math.floor(r() * hues.length)]} />); x += w + 2; }
  return <>{out}</>;
}
function Shops({ seed, light }: { seed: number; light: boolean }) {
  const r = rng(seed), out: JSX.Element[] = [], names = ['PURE WATER', 'CHOP LIFE', 'RECHARGE', 'GLOBACOM', 'BUKA', 'POS HERE', 'FRESH BREAD', 'GAS REFILL'];
  const awn = ['#E4572E', '#FFC21A', '#19C3A6', '#8A63D2', '#2B8C5B'];
  let x = 6, i = 0;
  while (x < 394) {
    const w = 52 + r() * 24, h = 46 + r() * 30, c = ['#E9DCC2', '#D6C7A3', '#CFD8DC', '#F1E4C8'][Math.floor(r() * 4)];
    out.push(<g key={x}><rect x={x} y={GROUND - 54 - h + 20} width={w} height={h + 34} fill={c} /><path d={`M${x - 2} ${GROUND - 54 - h + 40} h${w + 4} v10 h-${w + 4} z`} fill={awn[i % awn.length]} />{!light && <><rect x={x + 6} y={GROUND - 20} width={14} height={20} fill="#6b4a2f" /><rect x={x + w - 24} y={GROUND - 30} width={18} height={14} fill="#9FD0E8" /></>}<text x={x + 4} y={GROUND - 54 - h + 36} fontSize={6} fontWeight={800} fill="#2b2b2b" fontFamily="sans-serif">{names[(i + Math.floor(r() * 3)) % names.length]}</text></g>);
    x += w + 5; i++;
  }
  return <>{out}</>;
}

function Scene2DImpl({ plan, arrived }: { plan: TripPlan; arrived: boolean }) {
  const [top, bottom] = SKY[plan.weather], jam = plan.event === 'jam', crowd = plan.event === 'crowd', rain = plan.weather === 'rain';
  const spd = jam ? 1.8 : 1;
  const drops = useMemo(() => { const r = rng(7); return Array.from({ length: plan.light ? 22 : 42 }, () => ({ x: r() * 440, d: r() * 0.55, l: 8 + r() * 8 })); }, [plan.light]);
  const people = useMemo(() => {
    const r = rng(plan.key.length * 977 + 13), skins = ['#F1C9A5', '#B77B4E', '#8A5A3C', '#6B4128', '#4A2C1B'], tops = ['#E4572E', '#2B8C5B', '#8A63D2', '#FFC21A', '#2B4C7E', '#F4F1EA', '#C23B3B'];
    return Array.from({ length: plan.light ? 6 : 12 }, (_, i) => ({ x: (i / (plan.light ? 6 : 12)) * 400 + r() * 20, y: 207 + r() * 12, s: 0.62 + r() * 0.16, skin: skins[Math.floor(r() * 5)], top: tops[Math.floor(r() * 7)], bot: ['#1B1F24', '#2B4C7E', '#5A3E1E'][Math.floor(r() * 3)] }));
  }, [plan.key, plan.light]);
  const jamCars = useMemo(() => ['#C23B3B', '#F4F1EA', '#2B4C7E', '#FFC21A', '#1B1F24', '#2B8C5B'].map((c, i) => ({ x: 20 + i * 70, c })), []);
  const stopped = arrived;
  // The okada rider's pot-lid helmet is decided once per trip from the plan key (it used to be re-rolled on every render and flickered).
  const potLid = Number(plan.key.slice(-1)) % 2 === 0;
  const dur = (s: number) => `${s * spd}s`;
  const walker = plan.ride === 'trek';
  const passenger: Appearance = plan.appearance;
  const rideEl = (() => {
    switch (plan.ride) {
      case 'keke': return <Keke />;
      case 'danfo': return <Danfo passengers={['#8A5A3C', '#4A2C1B', '#F1C9A5', '#B77B4E', '#6B4128']} />;
      case 'okada': return <Okada rider={passenger} pot={rain || potLid} />;
      case 'cab': return <Car taxi color="#19C37D" brake={jam} />;
      case 'own': return <Car body={plan.vehicle?.body} color={plan.vehicle?.color} brake={jam} />;
      default: return null;
    }
  })();
  return (
    <svg viewBox="110 -10 200 250" preserveAspectRatio="xMidYMax meet" className={`h-full w-full ${stopped ? 'tv-stop' : ''}`} role="img" aria-label={`Travelling to ${plan.destination.name}`}>
      <defs><linearGradient id="tv-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
      <rect x={0} y={-10} width="400" height="250" fill="url(#tv-sky)" />
      {plan.weather === 'clear' && <circle cx={270} cy={36} r={16} fill="#FFE27A" />}
      {plan.weather === 'dusk' && <circle cx={270} cy={GROUND - 70} r={30} fill="#FFB347" opacity={0.9} />}
      {/* far skyline + clouds */}
      <g className="tv-scroll" style={{ animationDuration: dur(26) }}>
        {[0, 400].map((o) => <g key={o} transform={`translate(${o} 0)`}>
          <Skyline seed={3} hues={rain ? ['#6a7783', '#76838f'] : plan.weather === 'dusk' ? ['#9a5d6e', '#b4707a'] : ['#8FB3CE', '#9CBFD8']} tall={90} />
          {[40, 190, 320].map((x) => <ellipse key={x} cx={x} cy={26 + (x % 40)} rx={34} ry={9} fill={rain ? '#5d6873' : '#fff'} opacity={rain ? 0.9 : 0.75} />)}
        </g>)}
      </g>
      {/* shop fronts */}
      <g className="tv-scroll" style={{ animationDuration: dur(10) }}>
        {[0, 400].map((o) => <g key={o} transform={`translate(${o} 0)`}><Shops seed={11} light={plan.light} />
          <g><rect x={150} y={GROUND - 120} width={3} height={120} fill="#4b4540" /><path d="M150 -0 q50 14 100 0" transform={`translate(0 ${GROUND - 116})`} stroke="#2b2b2b" fill="none" /></g></g>)}
      </g>
      {/* arrival: the destination slides in behind the road */}
      {arrived && <g transform={`translate(250 ${GROUND - 14}) scale(.76)`}><g className="tv-slide-in"><DestinationBuilding type={plan.building} name={plan.destination.name} icon={plan.destination.icon} /></g></g>}
      {/* pavement and road */}
      <rect x={0} y={GROUND - 14} width={400} height={14} fill="#B9B3A8" />
      <rect x={0} y={GROUND} width={400} height={40} fill="#3B3F44" />
      <g className="tv-scroll" style={{ animationDuration: dur(1.1) }}>{Array.from({ length: 14 }).map((_, i) => <rect key={i} x={i * 60} y={GROUND + 22} width={30} height={3} fill="#E6E2D4" opacity={0.85} />)}</g>
      {/* crowd on the pavement */}
      {crowd && <g className="tv-scroll-r" style={{ animationDuration: dur(7) }}>{[0, 400].map((o) => <g key={o} transform={`translate(${o} 0)`}>{people.map((p, i) => <g key={i} transform={`translate(${p.x} ${p.y - 4})`}><Person a={{ ...passenger, skin: p.skin, topColor: p.top, bottomColor: p.bot, hairStyle: i % 3 === 0 ? 'afro' : i % 3 === 1 ? 'lowcut' : 'bun', beard: 'none', body: i % 2 ? 'femme' : 'masc' }} scale={p.s} walking facing={-1} /></g>)}</g>)}</g>}
      {/* the go-slow: cars crawling by with their brake lights on */}
      {jam && <g className="tv-scroll" style={{ animationDuration: '6s' }}>{[0, 400].map((o) => <g key={o} transform={`translate(${o} 0)`}>{jamCars.map((c, i) => <g key={i} transform={`translate(${c.x} ${GROUND + 30 + (i % 2) * 3}) scale(.62)`}><Car color={c.c} brake /></g>)}</g>)}</g>}
      {/* the ride, or the walker */}
      <g transform={`translate(${arrived && walker ? 205 : 172} ${GROUND + 12})`}>
        {walker ? (
          <g className={stopped ? '' : 'tv-bob'}><Person a={passenger} scale={1.55} walking={!stopped} umbrella={rain} /></g>
        ) : (
          <g className={stopped ? '' : jam ? 'tv-shake' : 'tv-bob'}>{rideEl}</g>
        )}
      </g>
      {/* getting out of the ride */}
      {arrived && !walker && <g transform={`translate(186 ${GROUND + 14})`}><g className="tv-exit"><Person a={passenger} scale={1.5} walking umbrella={rain} /></g></g>}
      {jam && !arrived && <g className="tv-pop" transform="translate(210 100)"><rect x={-26} y={-14} width={52} height={20} rx={8} fill="#fff" /><text x={0} y={0} textAnchor="middle" fontSize={11} fontWeight={900} fill="#C21F2E" fontFamily="sans-serif">BEEP BEEP!</text></g>}
      {/* rain on top of everything */}
      {rain && <g stroke="#CFE6F7" strokeWidth={1.1} opacity={0.8}>{drops.map((d, i) => <line key={i} className="tv-rain" x1={d.x} y1={0} x2={d.x - 3} y2={d.l} style={{ animationDelay: `-${d.d}s` }} />)}
        {[60, 170, 290].map((x) => <ellipse key={x} className="tv-ripple" cx={x} cy={GROUND + 28} rx={14} ry={3} fill="none" stroke="#CFE6F7" style={{ animationDelay: `-${x % 7 / 10}s` }} />)}</g>}
      {rain && <rect x={0} y={-10} width="400" height="250" fill="#1e2a36" opacity={0.18} />}
    </svg>
  );
}
export const Scene2D = memo(Scene2DImpl);
