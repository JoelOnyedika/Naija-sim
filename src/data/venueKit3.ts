import { U, stand, seat, type Kit } from './venueKitCore';

/**
 * UNILAG campus props. Drawn by the shared booth factory. Every campus task fires an event "campus:<id>" when it finishes
 * (through game/tasks.ts), which the story engine (game/story.ts) counts for the missions. The exam is a mini game (exam: true).
 */
const L = (v: NonNullable<Kit['look']>['v'], c1: string, c2: string, c3: string, sign?: string) => ({ v, c1, c2, c3, sign });
const P = (id: string, name: string, glyph: string, w: number, d: number, h: number, look: Kit['look'], uses: Kit['uses'], solid = true, sp = stand): Kit => ({ id, name, glyph, w, d, h, solid, spec: sp, look, uses });
const ev = (id: string) => ({ event: `campus:${id}` });

export const KIT3: Kit[] = [
  P('v_lecture_seats', 'Lecture hall benches', '🎓', 3.2, 1.0, 1.0, L('seats', '#5A3A20', '#E8E2D0', '#2F6B4A', 'LT1'), [
    U('attend_lecture', '🎓', 'Attend a lecture', 22, { energy: -5, happiness: -1 }, { pose: 'sit', payout: 1500, skill: { id: 'communication', xp: 3 }, ...ev('attend_lecture') }),
    U('take_notes', '📝', 'Copy the notes from the board', 12, { energy: -3 }, { pose: 'sit', skill: { id: 'teaching', xp: 2 } }),
  ], false, seat(0.46)),
  P('v_lecturer_desk', 'Lecturer’s desk', '👨🏾‍🏫', 2.6, 1.0, 1.5, L('desk', '#3A4750', '#E8E2D0', '#E9B949', 'DR. ADEBAYO'), [
    U('meet_adviser', '🤝', 'Meet your course adviser', 10, { energy: -2, social: 3 }, { payout: 1000, ...ev('meet_adviser') }),
    U('submit_assignment', '📄', 'Submit an assignment', 12, { energy: -3 }, { payout: 2500, skill: { id: 'communication', xp: 2 }, ...ev('submit_assignment') }),
    U('ask_lecturer', '🙋🏾', 'Ask the lecturer a question', 10, { energy: -2, social: 2, charisma: 1 }, { skill: { id: 'communication', xp: 2 } }),
  ]),
  P('v_registry', 'Registry window', '🗂️', 2.6, 1.0, 1.6, L('counter', '#1F6F4D', '#F4F1EA', '#E9B949', 'REGISTRY'), [
    U('reg_queue', '🧍🏾', 'Join the registration queue', 12, { energy: -3, thirst: -3 }, { ...ev('reg_queue') }),
    U('register_courses', '⌨️', 'Register your courses', 14, { energy: -3 }, { payout: 1500, ...ev('register_courses') }),
  ]),
  P('v_exam_desk', 'Exam desk', '📝', 1.8, 1.0, 1.1, L('desk', '#7A5A3A', '#F4F1EA', '#C23B3B', 'EXAM'), [
    U('write_exam', '📝', 'Write the exam', 90, { energy: -8 }, { exam: true }),
  ]),
  P('v_notice_board', 'Notice board', '📌', 2.2, 0.4, 2.0, L('board', '#8A5A2E', '#F4F1EA', '#E9B949', 'NOTICES'), [
    U('read_notices', '📌', 'Read the notice board', 8, { social: 1, happiness: 1 }),
    U('read_flyer', '🖤', 'Read the plain black flyer', 6, { happiness: 1 }, { ...ev('clue_flyer') }),
    U('find_gig', '🔎', 'Look for a campus gig', 10, { energy: -2 }, { skill: { id: 'business', xp: 2 } }),
  ]),
  P('v_photocopy', 'Photocopy shop', '🖨️', 1.8, 1.0, 1.5, L('machine', '#2E86C1', '#E8ECEF', '#FFE08A', 'COPY'), [
    U('photocopy_notes', '🖨️', 'Photocopy lecture notes', 10, { energy: -2 }, { cost: 300, skill: { id: 'teaching', xp: 2 }, ...ev('photocopy') }),
    U('buy_handout', '📘', 'Buy a handout', 6, { happiness: 1 }, { cost: 800, ...ev('buy_handout') }),
  ]),
  P('v_library_desk', 'Library desk', '📚', 2.4, 1.0, 1.2, L('desk', '#5A3A20', '#F4F1EA', '#2E86C1', 'LIBRARY'), [
    U('study_library', '📚', 'Study in the library', 20, { energy: -6, hunger: -3 }, { pose: 'sit', skill: { id: 'business', xp: 4 }, ...ev('study') }),
    U('research_paper', '🔬', 'Research for a term paper', 18, { energy: -5 }, { pose: 'sit', skill: { id: 'creativity', xp: 3 } }),
  ], true, seat(0.46)),
  P('v_sug_kiosk', 'SUG office', '🏛️', 2.4, 1.0, 1.8, L('stall', '#1F3D6B', '#F4F1EA', '#E9B949', 'SUG'), [
    U('join_sug_queue', '🧍🏾', 'Join the SUG queue', 10, { energy: -2, social: 2 }, { ...ev('sug_queue') }),
    U('sug_errand', '🏃🏾', 'Run an SUG errand', 16, { energy: -7 }, { payout: 3000, skill: { id: 'communication', xp: 2 }, ...ev('sug_errand') }),
    U('ask_about_brotherhood', '🕶️', 'Ask Senior Dayo about the brotherhood', 8, { social: 1 }, { ...ev('ask_around') }),
    U('sell_handouts', '📘', 'Sell handouts to freshers', 16, { energy: -5 }, { payout: 2800, skill: { id: 'business', xp: 3 }, ...ev('sell_handouts') }),
  ]),
  P('v_campus_cafe', 'Campus cafeteria', '🍛', 2.8, 1.0, 1.8, L('stall', '#C4552D', '#F4F1EA', '#2F6B4A', 'CAFETERIA'), [
    U('buy_snack_campus', '🥟', 'Buy a snack', 5, { hunger: 14, happiness: 3 }, { cost: 600, ...ev('eat') }),
    U('buy_jollof_campus', '🍛', 'Buy jollof and chicken', 8, { hunger: 38, happiness: 5 }, { cost: 2200, ...ev('eat') }),
    U('buy_zobo_campus', '🧃', 'Buy chilled zobo', 4, { thirst: 28 }, { cost: 400 }),
    U('overhear_gist', '👂', 'Listen to the table behind you', 8, { happiness: 1 }, { ...ev('clue_gist') }),
  ]),
  P('v_campus_field', 'Football field', '⚽', 4.6, 3.0, 0.1, L('mat', '#3F8F3A', '#F4F1EA', '#2F6B4A'), [
    U('play_football_campus', '⚽', 'Play football with the boys', 18, { energy: -9, happiness: 10, social: 4 }, { cost: 200, skill: { id: 'fitness', xp: 3 }, ...ev('football') }),
    U('jog_field', '🏃🏾', 'Jog round the field', 14, { energy: -6, happiness: 4 }, { skill: { id: 'fitness', xp: 2 } }),
  ], false),
  P('v_hostel_door', 'Hostel block', '🏠', 2.6, 0.6, 2.6, L('board', '#8A7A5A', '#E8E2D0', '#2E86C1', 'HOSTEL'), [
    U('talk_coursemate', '💬', 'Talk to a coursemate', 10, { social: 4, happiness: 2 }, { skill: { id: 'communication', xp: 1 }, ...ev('coursemate') }),
    U('tutor_fresher', '🧑🏾‍🏫', 'Tutor a fresher for pay', 16, { energy: -6 }, { payout: 3200, skill: { id: 'teaching', xp: 4 }, ...ev('tutor') }),
    U('hostel_gist', '🗣️', 'Gist in the hostel corridor', 10, { social: 5, happiness: 3 }),
    U('spot_bracelets', '👀', 'Watch the students with black bracelets', 8, { happiness: 1 }, { ...ev('clue_bracelets') }),
  ]),
];
