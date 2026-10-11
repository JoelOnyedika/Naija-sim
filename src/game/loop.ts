import { useEffect } from 'react';
import { sfx } from '@/audio/sfx';
import { copy, pickCopy } from '@/data/copy';
import { formatNaira } from '@/core/format';
import { getFood } from '@/data/foods';
import { useAppsStore } from '@/stores/appsStore';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useLifeStore } from '@/stores/lifeStore';
import { useSkillStore } from '@/stores/skillStore';
import { useStatsStore, type Activity } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { notify } from './notify';
import { fireTask } from './tasks';

function onFinished(a: Activity) {
  if (a.payout) {
    useEconomyStore.getState().credit(a.payout, a.label, 'salary');
    toast(copy.workDone(formatNaira(a.payout)), 'good');
    sfx.coin();
  } else if (a.doneMessage) toast(a.doneMessage, 'good');
  if (a.slept) toast('You woke up rested.', 'good');
  if (a.skill) {
    const { before, after } = useSkillStore.getState().add(a.skill.id, a.skill.xp);
    toast(after > before ? `Coding level ${after}! +${a.skill.xp} XP` : `Coding +${a.skill.xp} XP`, 'good');
  }
  if (a.event) fireTask(a.event);
}

const warned = { hunger: false, energy: false };

/** One simulation step. Everything time-based lives here. */
export function advance(dt: number) {
  const finished = useStatsStore.getState().tick(dt);
  if (finished) onFinished(finished);
  useClockStore.getState().advance(dt);

  // food deliveries
  const now = Date.now();
  for (const o of useAppsStore.getState().orders) {
    if (o.dueAt <= now) {
      const food = getFood(o.foodId);
      useAppsStore.getState().removeOrder(o.id);
      useInventoryStore.getState().add(o.foodId);
      notify({ title: 'Food delivery', body: `${copy.foodArrived()} ${food?.name ?? ''}`, icon: food?.glyph ?? '🍛', appId: 'food' });
    }
  }
  useAppsStore.getState().walkPrices();

  // gentle warnings (once per dip)
  const s = useStatsStore.getState().stats;
  if (s.hunger < 15 && !warned.hunger) { warned.hunger = true; toast(copy.hungry(), 'bad'); } else if (s.hunger > 30) warned.hunger = false;
  if (s.energy < 15 && !warned.energy) { warned.energy = true; toast(copy.tired(), 'bad'); } else if (s.energy > 30) warned.energy = false;

  // Lapo babies get the odd support alert from family
  if (useLifeStore.getState().lifeType === 'lapo' && Math.random() < dt / 300) {
    const amount = Math.round((3000 + Math.random() * 5000) / 500) * 500;
    useEconomyStore.getState().credit(amount, 'Mama (family support)', 'income', 'Mama');
    notify({ title: 'Bank alert', body: copy.alert(formatNaira(amount)), icon: '🏦', appId: 'bank' });
  }
  void pickCopy;
}

/** Runs the simulation while the game screen is mounted. Catches up (at half rate, capped) after tab sleep. */
export function useGameLoop() {
  useEffect(() => {
    let last = Date.now(), tick = 0;
    const id = window.setInterval(() => {
      const t = Date.now();
      let dt = (t - last) / 1000;
      last = t;
      if (dt > 5) dt = Math.min(dt, 240) * 0.5;
      advance(dt);
      if (++tick % 4 === 0) useUiStore.getState().tickOnline();
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
}
