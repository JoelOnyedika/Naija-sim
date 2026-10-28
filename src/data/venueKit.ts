import type { FurnitureDef, UseDef } from './items';

/**
 * The prop kit for public venues (restaurants, banks, malls, cinema, hotel, airport...). One row per prop: size, how the avatar
 * uses it, and what it offers. The 3D models are in three/models/kit.tsx (same ids). Props are never sold in the shop.
 * Money rewards are balance values; a server must own them (game/authority.ts). Random outcomes (`risk`) are the same.
 */
import { stand, seat, U, type Kit, type Spec } from './venueKitCore';
import { KIT2 } from './venueKit2';

const KIT1: Kit[] = [
  // ---- shared
  { id: 'v_wait_chairs', name: 'Waiting chairs', glyph: '🪑', w: 1.9, d: 0.6, h: 1.0, solid: false, spec: seat(), uses: [U('wait_turn', '🪑', 'Wait your turn', 10, { energy: 4, happiness: 1 }, { pose: 'sit', skill: { id: 'communication', xp: 1 } })] },
  { id: 'v_palm', name: 'Palm tree', glyph: '🌴', w: 0.9, d: 0.9, h: 3.2 },
  { id: 'v_tree', name: 'Shade tree', glyph: '🌳', w: 1.6, d: 1.6, h: 3.5 },
  { id: 'v_bench', name: 'Park bench', glyph: '🪑', w: 1.8, d: 0.6, h: 0.9, solid: false, spec: seat(), uses: [U('sit_bench', '🌤️', 'Sit and watch the world', 12, { happiness: 4, energy: 5 }, { pose: 'sit' })] },
  // ---- eatery
  { id: 'v_food_counter', name: "Mama Put's counter", glyph: '🍛', w: 3.0, d: 0.9, h: 1.5, spec: stand, uses: [
    U('order_plate', '🍛', 'Order a plate', 8, { hunger: 40, thirst: 5, happiness: 4 }, { cost: 2500 }),
    U('pepper_soup', '🌶️', 'Pepper soup & cold drink', 8, { hunger: 28, thirst: 25, happiness: 5 }, { cost: 3000 }),
    U('help_buka', '🍽️', 'Help at the buka', 22, { energy: -9, hygiene: -2 }, { payout: 3000, skill: { id: 'communication', xp: 3 } }),
  ] },
  { id: 'v_buka_table', name: 'Buka table', glyph: '🪵', w: 2.4, d: 1.0, h: 0.9, spec: stand, uses: [
    U('gist_regulars', '🗣️', 'Gist with the regulars', 12, { social: 8, happiness: 5 }, { skill: { id: 'communication', xp: 3 } }),
    U('whot', '🃏', 'Whot with the regulars', 14, { happiness: 10, social: 6 }),
    U('pepper_challenge', '🌶️', 'Pepper soup challenge', 12, { hunger: 12, thirst: 6 }, { cost: 1500, risk: { winChance: 0.5, winMoney: 2000, winEffects: { charisma: 2, happiness: 10 }, loseEffects: { hygiene: -4, happiness: -4 }, winMessage: 'You finished the whole bowl. Oga, respect!', loseMessage: 'Your mouth is on fire. Everybody is laughing.' } }),
  ] },
  { id: 'v_grill', name: 'Suya grill', glyph: '🍢', w: 1.4, d: 0.8, h: 1.2, spec: stand, uses: [U('buy_suya', '🍢', 'Buy suya', 6, { hunger: 28, happiness: 4 }, { cost: 2000 })] },
  { id: 'v_drinks_fridge', name: 'Cold drinks', glyph: '🧃', w: 0.9, d: 0.7, h: 1.9, spec: stand, uses: [U('chilled_zobo', '🧃', 'Cup of chilled zobo', 4, { thirst: 30, happiness: 3 }, { cost: 800 })] },
  // ---- bank
  { id: 'v_teller', name: 'Teller counter', glyph: '🏦', w: 3.6, d: 0.9, h: 1.4, spec: stand, uses: [
    U('queue_teller', '🏦', 'Queue for the teller', 18, { energy: -4 }, { skill: { id: 'communication', xp: 3 } }),
    U('talk_manager', '🤝', 'Talk to the manager', 12, { charisma: 1, social: 3 }, { skill: { id: 'finance', xp: 4 } }),
    U('learn_savings', '📈', 'Learn about savings plans', 14, { energy: -2 }, { skill: { id: 'finance', xp: 6 } }),
  ] },
  { id: 'v_pillar', name: 'Brand pillar', glyph: '🏛️', w: 0.8, d: 0.8, h: 2.8 },
  // ---- mall
  { id: 'v_shop_rack', name: 'Clothing rack', glyph: '👗', w: 1.8, d: 0.7, h: 1.6, spec: stand, uses: [
    U('window_shop', '🛍️', 'Window-shop', 12, { happiness: 7, energy: -2 }),
    U('try_outfits', '👗', 'Try on outfits', 14, { happiness: 6, charisma: 1 }),
  ] },
  { id: 'v_arcade', name: 'Arcade cabinets', glyph: '🕹️', w: 1.8, d: 0.8, h: 1.9, spec: stand, uses: [U('play_arcade', '🕹️', 'Play arcade', 14, { happiness: 15, energy: -3 }, { cost: 1000 })] },
  { id: 'v_fountain', name: 'Fountain', glyph: '⛲', w: 2.6, d: 2.6, h: 1.0, spec: stand, uses: [U('relax_fountain', '⛲', 'Relax by the fountain', 10, { happiness: 6, energy: 3 })] },
  // ---- cinema
  { id: 'v_cinema_seats', name: 'Cinema seats', glyph: '🎬', w: 3.2, d: 1.0, h: 1.1, solid: false, spec: seat(0.5), uses: [U('watch_movie', '🎬', 'Watch a movie', 30, { happiness: 22, social: 4, energy: -2 }, { cost: 3500, pose: 'sit' })] },
  { id: 'v_popcorn', name: 'Popcorn stand', glyph: '🍿', w: 1.4, d: 0.9, h: 1.8, spec: stand, uses: [U('buy_popcorn', '🍿', 'Buy popcorn', 5, { hunger: 12, thirst: 6, happiness: 5 }, { cost: 1500 })] },
  { id: 'v_cinema_screen', name: 'Cinema screen', glyph: '🎞️', w: 6.0, d: 0.4, h: 3.4 },
  // ---- live music
  { id: 'v_stage', name: 'Live stage', glyph: '🥁', w: 5.0, d: 2.6, h: 1.0, spec: stand, uses: [
    U('jam_band', '🥁', 'Jam with the band', 16, { happiness: 14, energy: -6 }, { skill: { id: 'creativity', xp: 7 } }),
    U('dance_stage', '💃', 'Dance by the stage', 12, { happiness: 14, social: 5, energy: -8, hygiene: -3 }, { skill: { id: 'fitness', xp: 3 } }),
    U('chat_band', '🎤', 'Chat with the band', 10, { social: 6, charisma: 1, happiness: 5 }),
  ] },
  { id: 'v_drinks_bar', name: 'Drinks bar', glyph: '🥤', w: 3.2, d: 0.9, h: 1.5, spec: stand, uses: [U('cold_drink', '🥤', 'Order a cold drink', 5, { thirst: 30, happiness: 4 }, { cost: 1500 })] },
  // ---- hotel and recreation
  { id: 'v_reception', name: 'Reception desk', glyph: '🛎️', w: 3.0, d: 0.9, h: 1.3, spec: stand, uses: [
    U('chat_concierge', '🛎️', 'Chat with the concierge', 10, { social: 4, happiness: 2 }),
    U('ask_city', '🗺️', 'Ask about the city', 12, { happiness: 2 }, { skill: { id: 'communication', xp: 3 } }),
  ] },
  { id: 'v_pool', name: 'Swimming pool', glyph: '🏊', w: 5.2, d: 3.2, h: 0.3, spec: stand, uses: [
    U('swim_laps', '🏊', 'Swim laps', 18, { energy: -10, happiness: 12, hygiene: 8 }, { skill: { id: 'fitness', xp: 6 } }),
    U('float_relax', '🛟', 'Float and relax', 12, { happiness: 10, energy: 4 }),
  ] },
  { id: 'v_lounger', name: 'Sun lounger', glyph: '☀️', w: 0.8, d: 1.9, h: 0.5, solid: false, spec: seat(0.4), uses: [U('sun_lounge', '☀️', 'Lie in the sun', 14, { happiness: 8, energy: 6 }, { pose: 'sit' })] },
  { id: 'v_tennis', name: 'Tennis net', glyph: '🎾', w: 3.6, d: 0.3, h: 1.1, spec: stand, uses: [U('play_tennis', '🎾', 'Play tennis', 18, { happiness: 12, energy: -10 }, { skill: { id: 'fitness', xp: 6 } })] },
  // ---- tech
  { id: 'v_pc_desk', name: 'Computer bench', glyph: '💻', w: 2.4, d: 0.8, h: 1.4, spec: stand, uses: [
    U('bench_code', '⌨️', 'Practise coding', 12, { energy: -6, happiness: -1 }, { skill: { id: 'coding', xp: 8 }, event: 'use:study' }),
    U('repair_phone', '🔧', 'Repair a phone', 18, { energy: -8 }, { payout: 3500, skill: { id: 'coding', xp: 6 }, minSkill: { id: 'coding', level: 2 } }),
  ] },
  { id: 'v_gadget_stall', name: 'Gadget stall', glyph: '📱', w: 1.9, d: 0.9, h: 2.1, spec: stand, uses: [
    U('sell_phones', '📱', 'Sell phones', 24, { energy: -8, happiness: 1 }, { payout: 5500, skill: { id: 'communication', xp: 4 } }),
    U('haggle_customer', '🗣️', 'Haggle with a customer', 18, { energy: -5, charisma: 1 }, { payout: 3000, skill: { id: 'communication', xp: 4 } }),
  ] },
  { id: 'v_server_rack', name: 'Server rack', glyph: '🖥️', w: 0.8, d: 0.7, h: 2.0 },
  // ---- park and beach
  { id: 'v_jog_path', name: 'Jogging track', glyph: '🏃', w: 4.0, d: 1.4, h: 0.05, solid: false, spec: stand, uses: [U('jog_lap', '🏃', 'Jog a lap', 20, { energy: -10, happiness: 6 }, { skill: { id: 'fitness', xp: 6 } })] },
  { id: 'v_picnic', name: 'Picnic mat', glyph: '🧺', w: 1.8, d: 1.8, h: 0.1, solid: false, spec: seat(0.06), uses: [U('picnic', '🧺', 'Picnic with friends', 14, { happiness: 10, social: 6, hunger: 8 }, { pose: 'sit' }), U('morning_yoga', '🧘', 'Join the morning yoga', 14, { happiness: 8, energy: -3, health: 3 }, { pose: 'sit' })] },
  { id: 'v_umbrella', name: 'Beach umbrella', glyph: '⛱️', w: 1.8, d: 1.8, h: 2.2, spec: stand, uses: [U('shade_relax', '😎', 'Relax in the shade', 12, { happiness: 9, energy: 5 })] },
  { id: 'v_boat', name: 'Fishing boat', glyph: '⛵', w: 3.4, d: 1.4, h: 1.1, spec: stand, uses: [U('boat_ride', '⛵', 'Take a boat ride', 18, { happiness: 20, energy: -2, social: 3 }, { cost: 4000 })] },
  { id: 'v_volleyball', name: 'Volleyball net', glyph: '🏐', w: 3.6, d: 0.3, h: 2.4, spec: stand, uses: [U('beach_volley', '🏐', 'Play beach volleyball', 16, { happiness: 14, social: 5, energy: -9 }, { skill: { id: 'fitness', xp: 4 } })] },
  // ---- government and business
  { id: 'v_gov_desk', name: 'Service counter', glyph: '🧾', w: 3.4, d: 0.9, h: 1.4, spec: stand, uses: [
    U('join_queue', '🧾', 'Join the queue', 20, { energy: -5 }, { skill: { id: 'communication', xp: 3 } }),
    U('submit_forms', '📄', 'Submit your forms', 12, { energy: -3 }, { skill: { id: 'business', xp: 4 } }),
  ] },
  { id: 'v_flag', name: 'Flagpole', glyph: '🇳🇬', w: 0.5, d: 0.5, h: 3.6 },
  { id: 'v_exec_desk', name: 'Executive desk', glyph: '💼', w: 2.2, d: 1.0, h: 1.2, spec: stand, uses: [U('business_call', '📞', 'Take a business call', 12, { energy: -4, charisma: 1 }, { skill: { id: 'business', xp: 5 } })] },
  { id: 'v_coffee_bar', name: 'Coffee bar', glyph: '☕', w: 2.4, d: 0.8, h: 1.5, spec: stand, uses: [U('buy_coffee', '☕', 'Buy a coffee', 5, { energy: 10, thirst: 10 }, { cost: 2000 })] },
  { id: 'v_city_window', name: 'Skyline window', glyph: '🌆', w: 4.0, d: 0.3, h: 2.8 },
  // ---- airport and port
  { id: 'v_checkin', name: 'Check-in desk', glyph: '🧳', w: 3.4, d: 0.9, h: 1.3, spec: stand, uses: [U('queue_checkin', '🧳', 'Queue at check-in', 18, { energy: -4 }, { skill: { id: 'communication', xp: 2 } })] },
  { id: 'v_board', name: 'Departures board', glyph: '🛫', w: 2.4, d: 0.3, h: 2.8, spec: stand, uses: [U('read_board', '🛫', 'Read the departures board', 8, { happiness: 3 })] },
  { id: 'v_luggage', name: 'Luggage trolley', glyph: '🧳', w: 1.0, d: 0.7, h: 1.2 },
  { id: 'v_container', name: 'Shipping containers', glyph: '📦', w: 2.6, d: 1.2, h: 2.4 },
  { id: 'v_pallet', name: 'Cargo pallets', glyph: '📦', w: 1.6, d: 1.2, h: 1.0, spec: stand, uses: [U('load_cargo', '📦', 'Load cargo', 22, { energy: -12, hygiene: -3 }, { payout: 4000, skill: { id: 'fitness', xp: 4 } })] },
  { id: 'v_crane', name: 'Dock crane', glyph: '🏗️', w: 1.2, d: 1.2, h: 5.0 },
  // ---- church, market and showroom extras
  { id: 'v_candle_rack', name: 'Candle stand', glyph: '🕯️', w: 1.0, d: 0.6, h: 1.3, spec: stand, uses: [U('light_candle_rack', '🕯️', 'Light a candle', 6, { happiness: 5 }, { cost: 500 })] },
  { id: 'v_choir', name: 'Choir stand', glyph: '🎶', w: 2.6, d: 1.0, h: 1.6, spec: stand, uses: [U('sing_choir', '🎶', 'Sing with the choir', 14, { happiness: 12, social: 4, energy: -3 }, { skill: { id: 'creativity', xp: 4 } })] },
  { id: 'v_flower_stand', name: 'Flower stand', glyph: '💐', w: 0.9, d: 0.9, h: 1.5 },
  { id: 'v_fruit_stand', name: "Auntie Bisi's fruits", glyph: '🍉', w: 1.8, d: 0.9, h: 2.2, spec: stand, uses: [U('buy_fruit', '🍉', 'Buy fruit', 5, { hunger: 18, thirst: 10, happiness: 3 }, { cost: 1200 }), U('haggle_fruit', '🗣️', 'Haggle with Auntie Bisi', 8, { charisma: 1 }, { skill: { id: 'communication', xp: 2 }, risk: { winChance: 0.5, winMoney: 600, winEffects: { happiness: 4 }, loseEffects: { happiness: -2 }, winMessage: 'Auntie Bisi dropped the price.', loseMessage: 'Auntie Bisi no gree: "Last price!"' } })] },
  { id: 'v_fabric_rack', name: "Alhaji Dansiru's fabrics", glyph: '🧵', w: 1.8, d: 0.8, h: 2.0, spec: stand, uses: [U('browse_fabric', '🧵', 'Browse the fabrics', 12, { happiness: 5 }, { skill: { id: 'creativity', xp: 2 } }), U('pick_ankara', '👗', 'Buy an Ankara print', 10, { happiness: 6, charisma: 1 }, { cost: 3500 }), U('haggle_dansiru', '💬', 'Negotiate with Alhaji Dansiru', 10, { charisma: 1, social: 2 }, { skill: { id: 'communication', xp: 3 }, risk: { winChance: 0.5, winMoney: 1500, winEffects: { happiness: 6, charisma: 1 }, loseEffects: { happiness: -3 }, winMessage: 'Alhaji Dansiru: "Ah, you are a serious customer. Take am."', loseMessage: 'Alhaji Dansiru: "Oga, pay the full price!"' } })] },
  { id: 'v_spec_board', name: 'Car spec board', glyph: '📋', w: 1.6, d: 0.3, h: 2.0, spec: stand, uses: [U('read_specs', '📋', 'Compare the specs', 10, { happiness: 3 }, { skill: { id: 'driving', xp: 3 } })] },
  { id: 'v_sculpture', name: 'Large sculpture', glyph: '🗿', w: 1.6, d: 1.6, h: 3.0, spec: stand, uses: [U('study_sculpture', '🗿', 'Study the sculpture', 10, { happiness: 4 }, { skill: { id: 'creativity', xp: 4 } }), U('sketch_sculpture', '✏️', 'Sketch it', 12, { energy: -3, happiness: 3 }, { skill: { id: 'creativity', xp: 6 } })] },
  { id: 'v_gallery_bench', name: 'Gallery bench', glyph: '🪑', w: 1.8, d: 0.6, h: 0.5, solid: false, spec: seat(0.44), uses: [U('rest_reflect', '🤔', 'Rest and reflect', 10, { happiness: 3, energy: 5 }, { pose: 'sit' })] },
  { id: 'v_goal', name: 'Goal posts', glyph: '🥅', w: 3.6, d: 0.6, h: 2.4, spec: stand, uses: [U('take_penalty', '⚽', 'Take a penalty', 8, { happiness: 8, energy: -4 }, { skill: { id: 'fitness', xp: 3 } }), U('street_match', '🏃', 'Join a street match', 14, { happiness: 10, social: 5, energy: -12 }, { skill: { id: 'fitness', xp: 5 } })] },
  { id: 'v_lifeguard', name: 'Lifeguard tower', glyph: '🛟', w: 1.4, d: 1.4, h: 2.8, spec: stand, uses: [U('watch_waves', '🌊', 'Watch the waves', 10, { happiness: 5, energy: 4 })] },
  // ---- Nigerian venue tasks: named vendors, gambles, jobs and meetings (each venue has its own)
  { id: 'v_foodstuff_stall', name: "Mama Chioma's foodstuff", glyph: '🍅', w: 1.8, d: 0.9, h: 2.2, spec: stand, uses: [
    U('gala_lacasera', '🥤', 'Gala & LaCasera', 4, { hunger: 18, thirst: 12, happiness: 3 }, { cost: 150 }),
    U('buy_tomatoes', '🍅', 'Buy tomatoes and pepper', 6, { hunger: 10, happiness: 2 }, { cost: 1200 }),
    U('haggle_chioma', '💬', 'Negotiate with Mama Chioma', 10, { charisma: 1, social: 2 }, { skill: { id: 'communication', xp: 3 }, risk: { winChance: 0.5, winMoney: 800, winEffects: { happiness: 5 }, loseEffects: { happiness: -3 }, winMessage: 'Mama Chioma: "Because of you, I go reduce am small."', loseMessage: 'Mama Chioma: "My dear, na so the price be."' } }),
  ] },
  { id: 'v_loading_bay', name: 'Loading bay', glyph: '🚛', w: 3.4, d: 2.4, h: 2.6, spec: stand, uses: [
    U('load_trailer', '🚛', 'Load the trailer', 24, { energy: -14, hygiene: -3 }, { payout: 6000, skill: { id: 'fitness', xp: 5 } }),
    U('unload_lorry', '📦', 'Unload a lorry', 20, { energy: -11, hygiene: -2 }, { payout: 4500, skill: { id: 'fitness', xp: 4 } }),
  ] },
  { id: 'v_pulpit', name: "Pastor's pulpit", glyph: '📖', w: 1.2, d: 0.9, h: 1.3, spec: stand, uses: [
    U('hear_sermon', '📖', 'Listen to the sermon', 20, { happiness: 10, social: 3 }),
    U('seek_counsel', '🙏', 'Ask Pastor for counsel', 12, { happiness: 6, charisma: 1 }, { skill: { id: 'communication', xp: 2 } }),
  ] },
  { id: 'v_donation_box', name: 'Offering box', glyph: '🎁', w: 0.6, d: 0.6, h: 1.1, spec: stand, uses: [U('give_offering', '🙏', 'Give an offering', 4, { happiness: 8, social: 2 }, { cost: 1000 })] },
  { id: 'v_art_talk', name: "Artist's talk", glyph: '🎤', w: 1.8, d: 1.0, h: 2.2, spec: stand, uses: [
    U('attend_talk', '🎨', "Attend the artist's talk", 18, { energy: -2, social: 3, charisma: 1 }, { skill: { id: 'creativity', xp: 6 } }),
    U('meet_collectors', '🤝', 'Network with collectors', 14, { social: 6, charisma: 1 }, { skill: { id: 'business', xp: 3 } }),
  ] },
  { id: 'v_dance_spot', name: 'Dance battle floor', glyph: '💃', w: 3.0, d: 3.0, h: 0.05, solid: false, spec: stand, uses: [U('dance_battle', '💃', 'Join the dance battle', 12, { energy: -8 }, { skill: { id: 'fitness', xp: 3 }, risk: { winChance: 0.55, winMoney: 0, winEffects: { charisma: 3, happiness: 10 }, loseEffects: { happiness: -4 }, winMessage: 'The whole floor is shouting your name!', loseMessage: 'You tripped. Everybody saw.' } })] },
  { id: 'v_betting_counter', name: 'Betting shop', glyph: '🎰', w: 2.6, d: 0.9, h: 2.2, spec: stand, uses: [
    U('check_odds', '📊', 'Check the odds', 6, { happiness: 1 }, { skill: { id: 'communication', xp: 1 } }),
    U('small_bet', '🎟️', 'Place a small bet', 12, { energy: -1 }, { cost: 2000, risk: { winChance: 0.35, winMoney: 5000, winEffects: { happiness: 10 }, loseEffects: { happiness: -6 }, winMessage: 'Your match came in!', loseMessage: 'The ticket is torn. Better luck next week.' } }),
  ] },
  { id: 'v_photo_wall', name: 'Influencer photo wall', glyph: '📸', w: 3.0, d: 0.6, h: 2.4, spec: stand, uses: [
    U('pose_photos', '📸', 'Pose for photos', 10, { happiness: 8, charisma: 1, social: 3 }),
    U('meet_influencer', '🌟', 'Meet an influencer', 12, { social: 6, charisma: 2 }),
  ] },
  { id: 'v_food_court', name: 'Food court', glyph: '🍗', w: 2.8, d: 0.9, h: 2.0, spec: stand, uses: [
    U('jollof_chicken', '🍗', 'Jollof, chicken & plantain', 8, { hunger: 38, happiness: 4 }, { cost: 3500 }),
    U('chapman_chops', '🍹', 'Chapman & small chops', 6, { thirst: 20, hunger: 14, happiness: 4 }, { cost: 2200 }),
  ] },
  { id: 'v_red_carpet', name: 'Red carpet', glyph: '🌟', w: 4.0, d: 1.4, h: 1.4, solid: false, spec: stand, uses: [
    U('meet_actor', '🌟', 'Meet a Nollywood actor', 12, { social: 6, charisma: 2, happiness: 8 }),
    U('take_selfie', '🤳', 'Take a selfie', 6, { happiness: 6, social: 2 }),
  ] },
  { id: 'v_conference_desk', name: 'Business summit desk', glyph: '💼', w: 2.6, d: 0.9, h: 2.0, spec: stand, uses: [
    U('attend_summit', '💼', 'Attend the summit', 20, { energy: -6, social: 5 }, { skill: { id: 'business', xp: 8 } }),
    U('network_coffee', '☕', 'Network over coffee', 12, { charisma: 1, social: 6 }, { skill: { id: 'business', xp: 3 } }),
  ] },
  { id: 'v_hackathon_board', name: 'Hackathon sign-up', glyph: '🏆', w: 3.0, d: 1.0, h: 2.4, spec: stand, uses: [
    U('join_hackathon', '🏆', 'Join the hackathon', 28, { energy: -12, happiness: -1, social: 4 }, { skill: { id: 'coding', xp: 16 }, event: 'use:study' }),
    U('pitch_judges', '🎤', 'Pitch to the judges', 14, { energy: -8 }, { risk: { winChance: 0.4, winMoney: 9000, winEffects: { charisma: 2, happiness: 8 }, loseEffects: { happiness: -6 }, winMessage: 'The judges loved it. You won the prize!', loseMessage: 'The judges asked hard questions. No prize this time.' } }),
  ] },
  { id: 'v_ceo_booth', name: 'OneNaija CEO booth', glyph: '🤵', w: 2.4, d: 1.0, h: 2.4, spec: stand, uses: [
    U('network_ceo', '🤵', 'Network with the OneNaija CEO', 14, { social: 8, charisma: 2, energy: -4 }, { skill: { id: 'business', xp: 6 } }),
    U('pitch_startup', '🚀', 'Pitch your startup', 16, { energy: -8 }, { risk: { winChance: 0.4, winMoney: 10000, winEffects: { charisma: 2, happiness: 10 }, loseEffects: { happiness: -6 }, winMessage: 'The CEO wants to invest. Money don enter!', loseMessage: 'The CEO smiled, took your card, and walked away.' } }),
  ] },
  { id: 'v_open_mic', name: 'Open mic', glyph: '🎙️', w: 2.4, d: 1.6, h: 1.8, spec: stand, uses: [
    U('spoken_word', '🎙️', 'Perform spoken word', 14, { charisma: 1, social: 4, happiness: 5, energy: -3 }, { skill: { id: 'creativity', xp: 6 } }),
    U('cheer_performers', '👏', 'Cheer the performers', 8, { happiness: 6, social: 3 }),
  ] },
  { id: 'v_hawker', name: "Auntie Ronke's roasted corn", glyph: '🌽', w: 1.4, d: 0.9, h: 2.2, spec: stand, uses: [
    U('roasted_corn', '🌽', 'Buy roasted corn & ube', 5, { hunger: 18, happiness: 4 }, { cost: 800 }),
    U('haggle_ronke', '💬', 'Haggle with Auntie Ronke', 8, { charisma: 1 }, { skill: { id: 'communication', xp: 2 }, risk: { winChance: 0.5, winMoney: 400, winEffects: { happiness: 4 }, loseEffects: { happiness: -2 }, winMessage: 'Auntie Ronke added extra ube for free.', loseMessage: 'Auntie Ronke: "Fire no dey cheap, oh!"' } }),
  ] },
  { id: 'v_putting_green', name: 'Putting green', glyph: '⛳', w: 4.0, d: 2.4, h: 0.1, solid: false, spec: stand, uses: [
    U('practise_putt', '⛳', 'Practise your putt', 12, { happiness: 6, energy: -2 }, { skill: { id: 'fitness', xp: 3 } }),
    U('chat_board', '🤝', 'Chat with a board member', 12, { social: 6, charisma: 1 }, { skill: { id: 'business', xp: 3 } }),
  ] },
  { id: 'v_commissioner', name: "Commissioner's office", glyph: '🏛️', w: 2.4, d: 1.0, h: 2.4, spec: stand, uses: [
    U('request_meeting', '🏛️', 'Request a meeting', 14, { energy: -2 }, { risk: { winChance: 0.45, winMoney: 0, winEffects: { charisma: 2, social: 4, happiness: 6 }, loseEffects: { energy: -6, happiness: -3 }, winMessage: 'The Commissioner will see you now.', loseMessage: 'Oga is in a meeting. Come back tomorrow.' } }),
    U('youth_scheme', '📄', 'Apply for the youth empowerment scheme', 16, { energy: -3 }, { skill: { id: 'business', xp: 5 } }),
  ] },
  { id: 'v_boardroom', name: 'Boardroom', glyph: '📊', w: 3.4, d: 1.8, h: 2.2, spec: stand, uses: [
    U('investor_meeting', '📊', "Attend the investors' meeting", 22, { energy: -8, charisma: 1 }, { skill: { id: 'business', xp: 10 } }),
    U('pitch_angel', '💡', 'Pitch to an angel investor', 16, { energy: -9 }, { risk: { winChance: 0.35, winMoney: 14000, winEffects: { charisma: 2, happiness: 10 }, loseEffects: { happiness: -8 }, winMessage: 'The angel investor said yes!', loseMessage: 'The investors passed. Back to the drawing board.' } }),
  ] },
  { id: 'v_duty_free', name: 'Duty free shop', glyph: '🛍️', w: 2.6, d: 0.9, h: 2.2, spec: stand, uses: [
    U('buy_perfume', '🧴', 'Buy perfume', 8, { happiness: 8, charisma: 1 }, { cost: 5000 }),
    U('window_gadgets', '🎧', 'Window-shop the gadgets', 10, { happiness: 4 }),
  ] },
  { id: 'v_taxi_rank', name: 'Taxi rank', glyph: '🚕', w: 2.2, d: 4.0, h: 1.6, spec: stand, uses: [
    U('haggle_taxi', '💬', 'Haggle with a taxi man', 8, { charisma: 1 }, { skill: { id: 'communication', xp: 2 }, risk: { winChance: 0.5, winMoney: 500, winEffects: { happiness: 4 }, loseEffects: { happiness: -2 }, winMessage: 'He agreed to your price.', loseMessage: '"Oga, na final price o!"' } }),
    U('carry_bags', '🧳', "Carry passengers' bags", 18, { energy: -9 }, { payout: 3000, skill: { id: 'fitness', xp: 3 } }),
  ] },
  { id: 'v_customs_desk', name: 'Customs desk', glyph: '🛃', w: 2.8, d: 1.0, h: 2.2, spec: stand, uses: [
    U('clear_container', '🛃', 'Clear a container', 20, { energy: -6 }, { payout: 5000, skill: { id: 'business', xp: 5 } }),
    U('negotiate_agent', '💬', 'Negotiate with the clearing agent', 14, { energy: -2 }, { risk: { winChance: 0.45, winMoney: 4000, winEffects: { charisma: 1 }, loseEffects: { happiness: -4 }, winMessage: 'The agent got your cargo moving.', loseMessage: 'Wahala at customs. Come back with the right papers.' } }),
  ] },
  { id: 'v_sales_desk', name: "Sales rep, Mr. Emeka", glyph: '🤝', w: 3.0, d: 0.9, h: 1.6, spec: stand, uses: [
    U('negotiate_car', '💬', 'Negotiate a discount', 12, { energy: -3 }, { risk: { winChance: 0.45, winMoney: 0, winEffects: { charisma: 2, happiness: 8 }, loseEffects: { happiness: -4 }, winMessage: 'Mr. Emeka: "For you, my brother, I will talk to my oga."', loseMessage: 'Mr. Emeka: "This price is already a discount, sir."' } }),
    U('ask_financing', '🏦', 'Ask about car financing', 12, { energy: -2 }, { skill: { id: 'finance', xp: 4 } }),
    U('book_test_drive', '🚗', 'Book a test drive', 10, { happiness: 6 }, { skill: { id: 'driving', xp: 4 } }),
  ] },
  // ---- viewing centre
  { id: 'v_big_screen', name: 'Big screen', glyph: '📺', w: 3.2, d: 0.6, h: 2.4, spec: stand, uses: [U('watch_match', '⚽', 'Watch the match', 20, { happiness: 14, social: 5 })] },
  { id: 'v_view_bench', name: 'Viewing benches', glyph: '🪑', w: 2.4, d: 0.7, h: 0.9, solid: false, spec: seat(), uses: [
    U('argue_football', '💬', 'Argue football', 7, { happiness: 8, social: 6, charisma: 1 }, { pose: 'sit', skill: { id: 'communication', xp: 3 } }),
    U('fight_agbero', '🥊', 'Fight the Agbero', 6, { energy: -8, happiness: 4 }, { pose: 'stand', risk: { winChance: 0.5, winEffects: { charisma: 2, happiness: 8 }, loseEffects: { happiness: -8, health: -5 }, winMessage: 'You shut the Agbero up. Respect.', loseMessage: 'The Agbero embarrassed you in front of everybody.' }, skill: { id: 'communication', xp: 5 } }),
  ] },
  { id: 'v_pool_table', name: 'Pool table', glyph: '🎱', w: 2.4, d: 1.4, h: 0.9, spec: stand, uses: [U('play_pool', '🎱', 'Play pool', 14, { happiness: 12, social: 4 }, { cost: 500 })] },
];

export const KIT: Kit[] = [...KIT1, ...KIT2];

const venueDef = (k: Kit): FurnitureDef => ({
  id: k.id, name: k.name, description: 'Part of a public venue.', price: 1, category: 'fun', rarity: 'common', glyph: k.glyph, model: k.id,
  footprint: { w: k.w, d: k.d }, height: k.h, placement: { surface: 'floor', collides: k.solid !== false, rotatable: true }, place: 'any', style: 0, venue: true,
});
export const KIT_ITEMS: FurnitureDef[] = KIT.map(venueDef);
export const KIT_ACTIVITIES: Record<string, UseDef[]> = Object.fromEntries(KIT.filter((k) => k.uses).map((k) => [k.id, k.uses!]));
export const KIT_SPECS: Record<string, Spec> = Object.fromEntries(KIT.filter((k) => k.spec).map((k) => [k.id, k.spec!]));
