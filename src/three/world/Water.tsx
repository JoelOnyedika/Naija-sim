import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, DoubleSide, ShaderMaterial } from 'three';

/** Cheap animated water: one calm blue surface with slow, wide tone changes and faint broad glints. No thin lines, so it never reads as a grid or a network of crossing lines. */
export function Water({ size, position = [0, 0, 0], deep = '#2477CC', shallow = '#4DB0EE', opacity = 1 }: { size: [number, number]; position?: [number, number, number]; deep?: string; shallow?: string; opacity?: number }) {
  const mat = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uDeep: { value: new Color(deep) }, uShallow: { value: new Color(shallow) }, uOpacity: { value: opacity } }), [deep, shallow, opacity]);
  useFrame((_, dt) => { if (mat.current) mat.current.uniforms.uTime.value += dt; });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <planeGeometry args={[size[0], size[1], 1, 1]} />
      <shaderMaterial
        ref={mat} uniforms={uniforms} transparent={opacity < 1} side={DoubleSide}
        vertexShader={`varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`}
        fragmentShader={`uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uOpacity; varying vec3 vW;
          void main(){
            float a = sin(vW.x*0.05 + uTime*0.2)*0.5 + sin(vW.z*0.045 - uTime*0.16)*0.5;
            float b = sin((vW.x*0.7 + vW.z)*0.12 + uTime*0.3);
            float mixv = 0.5 + 0.2*a + 0.08*b;
            vec3 col = mix(uDeep, uShallow, mixv);
            float glint = smoothstep(0.88, 1.0, sin(vW.x*0.35 + vW.z*0.22 + uTime*0.5)*0.5 + 0.5) * 0.05;
            col += glint;
            gl_FragColor = vec4(col, uOpacity);
          }`}
      />
    </mesh>
  );
}
