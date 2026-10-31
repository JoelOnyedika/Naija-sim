// TEST-ONLY helper (the game never imports this): mounts the travel scene already at its destination, so screenshots do not depend on timing.
import { createRoot } from 'react-dom/client';
import { planTrip, setTripOverride, type TripPlan } from '@/features/travel/plan';
import { TravelScene } from '@/features/travel/TravelScene';
import { getLandmark } from '@/world/registry';

export function mountTravel(o: { landmark: string; ride: string; vehicleId?: string; renderer: TripPlan['renderer']; weather: TripPlan['weather']; event?: TripPlan['event'] }) {
  setTripOverride({ renderer: o.renderer, weather: o.weather, event: o.event ?? 'none', seconds: 600 });
  const plan = planTrip({ modeId: o.ride, seconds: 5, landmark: getLandmark(o.landmark)!, vehicleId: o.vehicleId });
  document.getElementById('tvtest')?.remove();
  const d = document.createElement('div'); d.id = 'tvtest'; document.body.appendChild(d);
  createRoot(d).render(<TravelScene plan={plan} onDone={() => undefined} startArrived />);
}
