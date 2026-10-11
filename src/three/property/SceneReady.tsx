import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';

/** Mounted inside the Canvas, keyed by home: clears the loading overlay once a few real frames have been drawn. */
export function SceneReady() {
  const frames = useRef(0);
  useEffect(() => () => { frames.current = 0; }, []);
  useFrame(() => {
    if (frames.current > 3) return;
    frames.current += 1;
    if (frames.current === 3) useUiStore.getState().setSceneLoading(false);
  });
  return null;
}
