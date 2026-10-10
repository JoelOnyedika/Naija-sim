import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Color, DoubleSide, ShaderMaterial } from 'three';

/** Cheap animated water: two colour bands and drifting sparkle lines. */
export function Water({ size, position = [0, 0, 0], deep = '#0B6E8A', shallow = '#3FD0C9', opacity = 1 }: { size: [number, number]; position?: [number, number, number]; deep?: string; shallow?: string; opacity?: number }) {
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
            float a = sin(vW.x*0.9 + uTime*0.9) * 0.5 + sin(vW.z*1.3 - uTime*0.7) * 0.5;
            float b = sin((vW.x+vW.z)*2.2 + uTime*1.6);
            float mixv = 0.5 + 0.25*a;
            vec3 col = mix(uDeep, uShallow, mixv);
            float sp = smoothstep(0.93, 1.0, b*0.5+0.5) * 0.35;
            gl_FragColor = vec4(col + sp, uOpacity);
          }`}
      />
    </mesh>
  );
}
