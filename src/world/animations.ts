import type { Action } from './navigation';

/**
 * Which arm animation plays while the player does an activity. The activity's own entry decides first (rules below, matched on the
 * activity id, then on the object), and anything standing and busy that matches nothing gets the DEFAULT, 'work' (both hands
 * busy in front of the body), so no timed activity ever shows a statue. Sitting activities keep the seat's own pose.
 * To give an activity its own animation, add its id (or part of it) to the right line.
 */
export const DEFAULT_WORK: Action = 'work';

const BY_ACTIVITY: [RegExp, Action][] = [
  [/carry|load|unload|cargo|lorry|trailer|bags|trays|push_bike|clear_container|pallet|bundle|container|crane/, 'lift'],
  [/repair|fix|solder|replace_screen|sew|print|build|castle|unlock|fill_fuel|learn_gen|wash_bike|dig/, 'hammer'],
  [/mop|wash_plates|clean|sweep|stir|grill|roast|make_zobo|chop|scrub|usher/, 'sweep'],
  [/haggle|bargain|negotiate|gist|chat|talk|pitch|network|argue|debate|meet|ask|sell|promote|request|attend|counsel|complain|lodge|complaint|interview|join_|hustle|podcast|spoken|sing|jam|mix|club_mix|speech|persuade|babysit|tax_sigh|queue_story|swear/, 'talk'],
  [/pray|candle|offering|sermon|reflect|swear_oath|hear_sermon|give_offering/, 'pray'],
  [/cheer|clap|spray|owambe|celebrate|selfie|pose|attend_wedding|dance_battle|club_dance|dance_/, 'cheer'],
  [/tennis|penalty|match|volley|football|pool|snooker|putt|kite|play_|street_match|swim|surf|ayo|draughts|chess|arcade/, 'swing'],
  [/lift_weights|pullups|dips|stretch|jog|treadmill|march|yoga/, 'curl'],
  [/buy_snack|buy_chinchin|buy_popcorn|buy_pastry|jollof|chapman|pepper|suya|chicken|corn|amala|fruit|plate|taste|buffet|snack|meat|fish|prawns|order_plate/, 'eat'],
  [/zobo|kunu|water|cold_drink|coffee|smoothie|mocktail|drink|fridge/, 'drink'],
  [/code|ws_|st_|cowork|bench_code|use_pos|run_pos|atm|check_balance|count_cash|file_tax|submit_forms|apply_passport|register|learn_|edit|record|film|social|study|sd_|read_|browse|window|try_|specs|board|poster|posters|study_art|sketch|paint/, 'type'],
];
const BY_OBJECT: [RegExp, Action][] = [
  [/stall|hawker|counter|booth/, 'talk'], [/altar|pulpit|candle|donation|choir/, 'pray'], [/pallet|loading|bay|rank/, 'lift'],
  [/pc_desk|bench|printer|repair|gen_repair|tailor|3d/, 'hammer'], [/dish|oven|grill|pot|butcher/, 'sweep'],
  [/desk|board|teller|atm|pos|counter/, 'type'],
];

/** `key` is the activity table key ("v_pallet:load_cargo") when the activity came from one. Returns what the hands do. */
export function animFor(defId: string | undefined, activityKey: string | undefined, current: Action | undefined): Action {
  if (current && current !== 'idle') return current; // the object already has its own (typing at a desk, watching TV...)
  const id = (activityKey?.split(':')[1] ?? '').toLowerCase();
  for (const [re, a] of BY_ACTIVITY) if (id && re.test(id)) return a;
  for (const [re, a] of BY_OBJECT) if (defId && re.test(defId)) return a;
  return DEFAULT_WORK;
}
