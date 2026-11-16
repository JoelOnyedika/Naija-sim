export function Logo({ size = 'md', center = false }: { size?: 'md' | 'lg' | 'xl'; center?: boolean }) {
  const text = size === 'xl' ? 'text-[3.4rem]' : size === 'lg' ? 'text-5xl' : 'text-2xl';
  return (
    <div className={`leading-none ${center ? 'text-center' : ''}`}>
      <div className={`font-display font-black uppercase tracking-tight text-white drop-shadow ${text}`}>
        One <span className="logo-naija">Naija</span>
      </div>
      <div className={`stripe-flow mt-1.5 flex h-1.5 overflow-hidden rounded-full ${size === 'xl' ? 'w-32' : 'w-20'} ${center ? 'mx-auto' : ''}`}><i className="flex-1" /><i className="flex-1 bg-white" /><i className="flex-1" /></div>
    </div>
  );
}
