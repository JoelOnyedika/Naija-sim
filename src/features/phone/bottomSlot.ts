import { createContext } from 'react';

/**
 * The strip at the bottom of every app screen. An app's <Tabs> draws itself INTO this strip (through a portal), so the
 * navigation bar is always visible below the scrolling content instead of scrolling away with it.
 */
export const BottomSlot = createContext<HTMLElement | null>(null);
