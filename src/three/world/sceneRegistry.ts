import type { ComponentType } from 'react';
import type { StateDefinition } from '@/types/world';

/** A state's 3D world (terrain, landmark models). Registered by content/scenes.ts. */
export type WorldSceneComponent = ComponentType<{ state: StateDefinition }>;
const scenes = new Map<string, WorldSceneComponent>();
export const registerScene = (id: string, c: WorldSceneComponent) => scenes.set(id, c);
export const getScene = (id: string) => scenes.get(id);
