import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { setCapture } from '../capture';

/** Registers "take a picture" for the camera button. It renders once and reads the canvas straight away, so it needs no persistent buffer. */
export function CaptureBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __r3f?: unknown }).__r3f = { gl, scene, camera }; // dev only: lets tests read the draw-call count
    setCapture(() => new Promise<Blob | null>((resolve) => { gl.render(scene, camera); gl.domElement.toBlob((b) => resolve(b), 'image/png'); }));
    return () => setCapture(null);
  }, [gl, scene, camera]);
  return null;
}
