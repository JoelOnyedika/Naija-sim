import { sfx } from '@/audio/sfx';
import type { AppId } from '@/data/apps';
import { usePhoneStore } from '@/stores/phoneStore';
import { useUiStore } from '@/stores/uiStore';

/** Pushes a phone notification and, if the phone is closed, drops an in-world banner. */
export function notify(n: { title: string; body: string; icon: string; appId?: AppId }) {
  usePhoneStore.getState().push(n);
  if (!usePhoneStore.getState().open) useUiStore.getState().showBanner(n);
  sfx.notify();
}
