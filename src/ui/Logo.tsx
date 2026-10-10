export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="leading-none">
      <div className={`font-display font-extrabold tracking-tight text-white drop-shadow ${size === 'lg' ? 'text-5xl' : 'text-2xl'}`}>
        Nigeria <span className="text-danfo">Life</span>
      </div>
      <div className="mt-1.5 flex h-1.5 w-20 overflow-hidden rounded-full"><i className="flex-1 bg-naija" /><i className="flex-1 bg-white" /><i className="flex-1 bg-naija" /></div>
    </div>
  );
}
