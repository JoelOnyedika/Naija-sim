import { registerState } from '@/world/registry';
import { lagos } from './lagos';

/** Register every installed state. To add Abuja: create content/abuja/ and add it here. */
export function registerContent() {
  [lagos].forEach(registerState);
}
