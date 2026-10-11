import { CONFIG } from '@/data/config';
import { LIFE_TYPES } from '@/data/lifeTypes';
import { copy, pickCopy } from '@/data/copy';
import type { LifeTypeId } from '@/types/game';
import { useAppsStore } from '@/stores/appsStore';
import { useClockStore } from '@/stores/clockStore';
import { useEconomyStore } from '@/stores/economyStore';
import { useEditorStore } from '@/stores/editorStore';
import { useFinishStore } from '@/stores/finishStore';
import { useSkillStore } from '@/stores/skillStore';
import { useFlowStore } from '@/stores/flowStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useLifeStore } from '@/stores/lifeStore';
import { currentStateId, useMapStore } from '@/stores/mapStore';
import { usePhoneStore } from '@/stores/phoneStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useStatsStore } from '@/stores/statsStore';
import { useTaskStore } from '@/stores/taskStore';
import { useUiStore } from '@/stores/uiStore';
import { useVehicleStore } from '@/stores/vehicleStore';
import { getLayout, getProperty, getState } from '@/world/registry';
import { autoPlace } from './housing';

/** Decide the roulette result. Odds live in CONFIG.nepoChance. */
export const rollLifeType = (): LifeTypeId => (Math.random() < CONFIG.nepoChance ? 'nepo' : 'lapo');

// const between = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) / 500) * 500;

/** Create a brand-new life from the roulette result. Seeds every store. */
export function startNewLife(type: LifeTypeId) {
  const def = LIFE_TYPES[type];
  const state = getState(currentStateId())!;
  const pool = state.startingProperties[type];
  const propertyId = pool[Math.floor(Math.random() * pool.length)];
  const property = getProperty(propertyId)!;
  const layout = getLayout(property.layoutId)!;
  // const money = between(def.moneyRange[0], def.moneyRange[1]);
  const money = 50000000000;

  useEconomyStore.getState().reset(money);
  useStatsStore.getState().reset();
  useInventoryStore.getState().reset(def.startingInventory);
  useVehicleStore.getState().reset(def.startingVehicles);
  usePropertyStore.getState().reset();
  useFinishStore.getState().reset();
  useSkillStore.getState().reset();
  usePropertyStore.getState().own(propertyId);
  usePropertyStore.getState().setActive(propertyId);
  const { placed, leftover } = autoPlace(layout, def.startingFurniture);
  usePropertyStore.getState().setFurniture(propertyId, placed);
  leftover.forEach((id) => useInventoryStore.getState().add(id));
  useTaskStore.getState().reset();
  useClockStore.getState().reset();
  useAppsStore.getState().reset();
  useMapStore.getState().reset();
  usePhoneStore.getState().reset();
  const phone = usePhoneStore.getState();
  phone.say('mama', 'them', pickCopy(copy.welcome));
  phone.push({ title: 'Mama', body: 'Have you eaten? Do not skip meals.', icon: '👩🏾', appId: 'messages' });
  useUiStore.setState({ mode: 'home', buySpent: 0, taskPanelOpen: typeof window === 'undefined' || window.innerWidth >= 640, statsExpanded: false });
  useLifeStore.getState().begin({ type, money, propertyId });
}

/** Drop every transient, life-specific UI state so nothing from the old life leaks into the next one. */
export function resetTransientUi() {
  useEditorStore.setState({ draft: null, dragging: false });
  useFinishStore.getState().clearPreview();
  usePhoneStore.getState().closePhone();
  useStatsStore.getState().stop();
  useUiStore.setState({
    mode: 'home', catalogOpen: true, buySpent: 0, detailPropertyId: null, housesAreaFilter: null, foodPickerUid: null, banner: null, toasts: [],
  });
}

/** "Start New Life": wipe the current life (account and character stay) and go back to the roulette. */
export function restartLife() {
  resetTransientUi();
  useLifeStore.getState().clear();
  usePropertyStore.getState().reset();
  useFinishStore.getState().reset();
  useFlowStore.getState().go('roulette');
}
