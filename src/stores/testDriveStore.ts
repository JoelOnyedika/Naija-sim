import { create } from 'zustand';

/** Which car is on the Polanco test track right now (null = no test drive). Not persisted. */
interface TestDriveState { vehicleId: string | null; open: (id: string) => void; close: () => void }
export const useTestDriveStore = create<TestDriveState>((set) => ({ vehicleId: null, open: (vehicleId) => set({ vehicleId }), close: () => set({ vehicleId: null }) }));
