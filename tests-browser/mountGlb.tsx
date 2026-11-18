// TEST-ONLY: shows a GLB with a simple camera, to inspect imported models.
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { createRoot } from 'react-dom/client';
function M({ url, ry }: { url: string; ry: number }) { const g = useGLTF(url); return <primitive object={g.scene} rotation={[0, ry, 0]} />; }
export function mountGlb(urls: string[], ry = 0, w = 900, h = 500, y = 1.1, dist = 4.2) {
  const d = document.createElement('div'); d.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;z-index:99999;background:#3a3748`; document.body.appendChild(d);
  createRoot(d).render(<Canvas camera={{ position: [0, y, dist], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, y, 0)} gl={{ preserveDrawingBuffer: true }}>
    <hemisphereLight args={['#fff', '#889', 1.1]} /><directionalLight position={[2, 4, 4]} intensity={2} />
    {urls.map((u, i) => <group key={u} position={[(i - (urls.length - 1) / 2) * 2.2, 0, 0]}><M url={u} ry={ry} /></group>)}
  </Canvas>);
}
