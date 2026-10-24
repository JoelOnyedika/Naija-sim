/** Where the player and the NPCs are right now (written by the scene every frame). Used for spacing and pickpocket range. */
export const livePlayer = { x: 0, z: 0, set: false };
export const liveNpcs = new Map<string, { x: number; z: number }>();
