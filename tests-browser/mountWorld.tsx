// TEST-ONLY: mounts the open world on its own (no landing screen behind it).
import { createRoot } from 'react-dom/client';
import { OpenWorldScreen } from '@/features/openworld/OpenWorldScreen';
export function mountWorld() { const d = document.createElement('div'); d.id = 'ow'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000'; document.body.appendChild(d); createRoot(d).render(<OpenWorldScreen />); }
