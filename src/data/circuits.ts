/**
 * Two long street stories driven by street moments. Mama Agbo: buy from her again and again and she remembers you (stranger, customer,
 * regular, family), ending with a choice. The owambe circuit: say yes to party invitations and you climb from guest to the life of
 * the party, ending with a choice. Pure data; the rules are in game/circuits.ts. In-game naira only.
 */
export type ChainId = 'mama' | 'owambe';
export interface ChainDef { id: ChainId; icon: string; title: string; /** how many steps (purchases or parties) to reach level 1, 2 and 3 */ thresholds: [number, number, number]; levels: [string, string, string, string]; noun: string; hint: string; endings: Record<string, string> }
export const CHAINS: Record<ChainId, ChainDef> = {
  mama: { id: 'mama', icon: '🌿', title: 'Mama Agbo', thresholds: [3, 7, 12], levels: ['Stranger', 'Customer', 'Regular', 'Family'], noun: 'agbo bought', hint: 'Buy agbo from Mama Agbo in the market. She remembers a good customer.', endings: { recipe: 'You hold the family recipe', helper: 'Mama\'s right hand' } },
  owambe: { id: 'owambe', icon: '🎉', title: 'The owambe circuit', thresholds: [2, 5, 8], levels: ['Guest', 'Aso-ebi regular', 'Life of the party', 'Owambe celebrity'], noun: 'parties', hint: 'Say yes to owambe invitations in public places. The more you show up, the bigger the invitations.', endings: { mc: 'The MC with the mic', host: 'Host of your own owambe' } },
};
/** Level 0..3 from a step count. */
export const levelFor = (id: ChainId, steps: number): 0 | 1 | 2 | 3 => { const t = CHAINS[id].thresholds; return steps >= t[2] ? 3 : steps >= t[1] ? 2 : steps >= t[0] ? 1 : 0; };
/** Extra health every agbo gives once you hold the family recipe. */
export const RECIPE_BONUS = { health: 5 };
