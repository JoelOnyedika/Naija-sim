import { motion, type HTMLMotionProps } from 'framer-motion';
import { sfx } from '@/audio/sfx';

type Variant = 'primary' | 'glass' | 'ghost' | 'danger' | 'dark';
const styles: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-danfo to-danfo-deep text-night shadow-pop disabled:from-white/20 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none',
  glass: 'glass text-white disabled:opacity-40',
  ghost: 'bg-transparent text-white ring-1 ring-white/25 disabled:opacity-40',
  danger: 'bg-gradient-to-b from-hibiscus to-[#D12F54] text-white disabled:opacity-40',
  dark: 'bg-night-700 text-white ring-1 ring-white/10 disabled:opacity-40',
};

interface Props extends HTMLMotionProps<'button'> { variant?: Variant; size?: 'sm' | 'md' | 'lg'; silent?: boolean }

/** Pressable game button: spring press, hover lift, click sound. */
export function Button({ variant = 'primary', size = 'md', silent, className = '', onClick, children, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }} whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}
      onClick={(e) => { if (!silent) sfx.click(); onClick?.(e); }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold disabled:cursor-not-allowed ${size === 'sm' ? 'px-3.5 py-2 text-sm' : size === 'lg' ? 'px-6 py-4 text-lg' : 'px-5 py-3 text-[15px]'} ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
