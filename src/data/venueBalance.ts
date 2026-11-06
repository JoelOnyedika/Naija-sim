import type { UseDef } from './items';
import type { Kit } from './venueKitCore';
import { fairPrice } from './pricing';

/**
 * Nothing in a venue is free for nothing. After the prop kit is written, every activity goes through these rules so that it either
 * costs naira (priced by data/pricing.ts from what it gives you, so nobody has to price 300 activities by hand), or drains energy, thirst or hunger, or risks your charisma, or at the very least costs the time it takes. Hand-priced
 * activities (a swim, a seat at the match) are kept as written by the kit; this only fills the gaps.
 * Naira here are balance values; a server must own them (game/authority.ts).
 */
type Fx = NonNullable<UseDef['effects']>;
const add = (e: Fx, k: keyof Fx, d: number): Fx => ({ ...e, [k]: ((e[k] as number | undefined) ?? 0) + d });

/** Places that are free by nature (a bench, a prayer room, the waves). They still cost the time: a little hunger and thirst. */
const FREE_BY_NATURE = new Set(['wait_turn', 'sit_bench', 'relax_fountain', 'shade_relax', 'pray_quietly', 'pray_together', 'hear_sermon', 'rest_reflect', 'watch_waves', 'rest_porter', 'wait_ferry', 'watch_boats', 'watch_cranes', 'read_board', 'read_predictions', 'memory_verse', 'hand_bulletins', 'swear_oath', 'wait_in_line', 'tax_sigh', 'watch_chess', 'watch_painter', 'study_sculpture', 'read_specs', 'smell_notes', 'smell_chicken', 'watch_wash', 'count_dollars', 'test_mic', 'atm_wahala', 'network_wahala', 'check_odds', 'browse_fabric', 'book_test_drive', 'look_phones', 'window_gadgets', 'pose_photos2', 'check_score', 'youth_fellowship', 'castle_zone']);
/** High-stakes conversations: you can win charisma or lose some. */
const GAMBLES = new Set(['meet_actor', 'meet_influencer', 'meet_collectors', 'give_interview', 'pose_press', 'chat_board', 'coffee_chat', 'guest_podcast', 'vip_gist', 'talk_manager', 'chat_officer', 'network_lounge', 'swap_cards', 'seek_counsel', 'attend_town_hall', 'drop_idea', 'post_idea', 'chat_band', 'lounge_gist', 'network_coffee', 'critique_art', 'meet_actor']);

function rebalanceUse(u: UseDef): UseDef {
  const id = u.id ?? '';
  if (u.cost || u.payout || u.risk) return u; // already has a price, a pay or a gamble
  let out: UseDef = { ...u };
  const e = u.effects ?? {}, up = (e.social ?? 0) + (e.charisma ?? 0) * 3, fun = e.happiness ?? 0;
  if (GAMBLES.has(id)) { // talking to important people tires you and can go wrong
    const strong = (e.charisma ?? 0) >= 2;
    return { ...out, effects: add(add({}, 'energy', -3), 'thirst', -2), risk: { winChance: strong ? 0.55 : 0.65, winEffects: e, loseEffects: { happiness: -3, social: -2, charisma: strong ? -2 : -1 }, winMessage: 'It went well. People will remember you.', loseMessage: 'You said the wrong thing. Somebody laughed.' } };
  }
  if (up > 0 && !FREE_BY_NATURE.has(id)) { const fx = add(add(e, 'energy', -3), 'thirst', -2); return { ...out, effects: fx, cost: fairPrice(fx, 0.4) }; } // gist and networking: you buy a round and it tires you
  if (!FREE_BY_NATURE.has(id) && (fun >= 2 || Object.values(e).some((v) => (v ?? 0) !== 0))) return { ...out, cost: fairPrice(e) }; // paid fun, priced by what it gives you
  out = { ...out, effects: add(add(e, 'hunger', -2), 'thirst', -1) }; // the time it takes
  return out;
}

export function rebalanceKit(kit: Kit[]): Kit[] {
  return kit.map((k) => (k.uses ? { ...k, uses: k.uses.map(rebalanceUse) } : k));
}
