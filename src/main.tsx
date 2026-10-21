import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerContent } from './content';
import { reconcileSavedHomes } from './game/reconcile';
import { useReferralStore } from './stores/referralStore';
import { registerScenes } from './content/scenes';
import './index.css';

// Install content packs (data) and their 3D scenes before anything renders.
registerContent();
registerScenes();
reconcileSavedHomes();
// an invite link (?ref=NL-XXXXXX) is only remembered; the player confirms it in the Invite app
useReferralStore.getState().capture(new URLSearchParams(window.location.search).get('ref'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
