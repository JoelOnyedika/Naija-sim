/** Lets the UI take a picture of the 3D scene. The scene registers a function that renders once and returns the canvas as a PNG. */
let grab: (() => Promise<Blob | null>) | null = null;
export const setCapture = (fn: (() => Promise<Blob | null>) | null) => { grab = fn; };
export async function captureScene(): Promise<Blob | null> { return grab ? grab() : null; }
