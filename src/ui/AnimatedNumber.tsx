import { animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatNaira } from '@/core/format';

/** Counts smoothly to its new value. Flashes green/red on change. */
export function AnimatedNumber({ value, format = formatNaira, className = '' }: { value: number; format?: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    setFlash(value > prev.current ? 'up' : 'down');
    const c = animate(prev.current, value, { duration: 0.7, ease: 'easeOut', onUpdate: setShown, onComplete: () => setFlash(null) });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span className={`tabular-nums transition-colors duration-300 ${flash === 'up' ? 'text-emerald-300' : flash === 'down' ? 'text-rose-300' : ''} ${className}`}>{format(shown)}</span>;
}
