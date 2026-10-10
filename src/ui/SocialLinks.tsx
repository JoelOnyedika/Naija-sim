const links = [
  { name: 'X', href: '#', path: 'M18.2 3h3.1l-6.8 7.8L22.5 21h-6.2l-4.9-6.4L5.8 21H2.7l7.3-8.3L2 3h6.4l4.4 5.8L18.2 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l11.6 14.5Z' },
  { name: 'TikTok', href: '#', path: 'M16.6 3c.3 2.4 1.7 3.9 4 4.1v3a7 7 0 0 1-4-1.3v6.1a5.8 5.8 0 1 1-5-5.8v3.2a2.7 2.7 0 1 0 1.9 2.6V3h3.1Z' },
  { name: 'LinkedIn', href: '#', path: 'M4.5 8.5h3.9V20H4.5V8.5ZM6.4 3a2.2 2.2 0 1 1 0 4.5 2.2 2.2 0 0 1 0-4.5ZM10.6 8.5h3.7v1.6c.6-1 1.9-1.9 3.8-1.9 4 0 4.7 2.6 4.7 6V20H19v-5.1c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V20h-3.9V8.5Z' },
  { name: 'Instagram', href: '#', path: 'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.3-3.1a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z' },
];

export function SocialLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map((l) => (
        <a key={l.name} href={l.href} aria-label={l.name} onClick={(e) => e.preventDefault()} className="glass flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:scale-110 hover:text-danfo active:scale-95">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d={l.path} /></svg>
        </a>
      ))}
    </div>
  );
}
