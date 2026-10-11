import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerContent } from './content';
import { reconcileSavedHomes } from './game/reconcile';
import { registerScenes } from './content/scenes';
import './index.css';

// Install content packs (data) and their 3D scenes before anything renders.
registerContent();
registerScenes();
reconcileSavedHomes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
