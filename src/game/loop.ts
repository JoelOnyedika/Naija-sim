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
import { skillName, useSkillStore } from '@/stores/skillStore';
import { useStatsStore, type Activity } from '@/stores/statsStore';
import { toast, useUiStore } from '@/stores/uiStore';
import { notify } from './notify';
import { completeCareerShift } from './jobs';
import { runDueEvents } from './scheduler';
import { fireTask } from './tasks';
import { getActiveHome } from './active';
import { backupIn, powerMode } from './power';
import { usePowerStore } from '@/stores/powerStore';
import { finishPetAction, stepPets } from './petCare';
import { stepJail } from './crime';
import { stepChatter } from './chatter';
import { makeCode } from './referrals';
import { getAuthority } from './authority';
import { useReferralStore } from '@/stores/referralStore';
import { useAuthStore } from '@/stores/authStore';

function onFinished(a: Activity) {
  // a gamble: lost means no pay, no XP, and a penalty; won adds a bonus
  if (a.risk) {
    if (Math.random() >= a.risk.winChance) { useStatsStore.getState().apply(a.risk.loseEffects); sfx.error(); toast(a.risk.loseMessage, 'bad'); return; }
    useStatsStore.getState().apply(a.risk.winEffects); toast(a.risk.winMessage, 'good');
    const prize = a.activityKey && a.risk.winMoney ? getAuthority().approvePayout(`${a.activityKey}:win`, a.risk.winMoney) : 0;
    if (prize) { useEconomyStore.getState().credit(prize, a.label, 'salary'); sfx.coin(); }
  }
  // activities with a key (venue hustles, the coding task) are paid what the authority says, never what the running activity claims
  const paid = a.activityKey ? getAuthority().approvePayout(a.activityKey, a.payout ?? 0) : a.payout;
  if (paid) {
    useEconomyStore.getState().credit(paid, a.label, 'salary');
    toast(copy.workDone(formatNaira(paid)), 'good');
    sfx.coin();
    if (a.careerId) completeCareerShift(a.careerId);
  } else if (a.doneMessage) toast(a.doneMessage, 'good');
  if (a.slept) toast('You woke up rested.', 'good');
  if (a.skill) {
    const { before, after } = useSkillStore.getState().add(a.skill.id, a.skill.xp);
    toast(after > before ? `${skillName(a.skill.id)} level ${after}! +${a.skill.xp} XP` : `${skillName(a.skill.id)} +${a.skill.xp} XP`, 'good');
  }
  if (a.petAction) finishPetAction(a.targetUid, a.petAction);
  if (a.event) fireTask(a.event);
}

const warned = { hunger: false, energy: false };

/** NEPA: advance the outage schedule and tell the player what happened, in words that match what they own. */
function stepPower(dt: number) {
  const home = getActiveHome();
  if (!home) return;
  const ps = usePowerStore.getState();
  const event = ps.step(dt, home.layout.publicPower);
  if (!event) return;
  const b = backupIn(home.placed);
  if (event === 'outage-end') { if (!b.hasSolar) toast('NEPA don bring light. Everything is back to normal.', 'good'); return; }
  const mode = powerMode({ outage: true, ibetaOn: false, ...b });
  if (mode === 'solar') toast('NEPA take light, but your solar dey carry the house.', 'good');
  else if (mode === 'generator') toast('NEPA take light. Your generator don start by itself.', 'good');
  else if (mode === 'ibeta') toast('NEPA take light! Tap your Ibeta to start it.', 'bad');
  else toast('NEPA take light! Buy a lamp or a generator, or wait for them to bring it back.', 'bad');
}

/** One simulation step. Everything time-based lives here. */
export function advance(dt: number) {
  const finished = useStatsStore.getState().tick(dt);
  if (finished) onFinished(finished);
  useClockStore.getState().advance(dt);
  runDueEvents();
  stepPower(dt);
  stepPets(dt);
  stepJail();
  stepChatter();
  if (useReferralStore.getState().referredBy) { const e = useEconomyStore.getState(); useReferralStore.getState().absorb(e.transactions, e.seq, makeCode(useAuthStore.getState().session ?? 'player')); }

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
