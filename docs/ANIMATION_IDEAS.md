# Nigeria Life: animation ideas

These are suggestions for the next phase (the owner will start on animation). Nothing here is built yet.

**How to read this**
- **Trigger**: what the player does to start it.
- **Scene**: what they see, beat by beat.
- **Build**: how to make it procedurally (no hand-drawn animation, no model files needed).
- **Naija touch**: the funny, Nigerian detail that makes it ours.
- **Effort**: S (a day), M (two to four days), L (a week or more).

The owner's two seeds are both in here: the Agbero fight (a dust cloud with fists and feet poking out) and the Polanco test drive (reckless driving). Everything else is a suggestion for him to accept, change or throw away.

---

## 0. The foundation (build this once, everything else is cheap)

Almost every idea below is the same few ingredients. Build them once.

### 0.1 A tiny cinematic player
- One component, `CinematicScene`, that takes a **timeline** (a small JSON or TypeScript list of beats) and plays it over the real 3D scene. A beat is: `{ at: seconds, do: 'camera' | 'pose' | 'particles' | 'bubble' | 'sound' | 'move' | 'cut' }`.
- It pauses the game clock for the scene, hides the HUD except a **Skip** button, and gives control back with the result already applied (the stat changes and money still come from the normal task code; the scene is only the show).
- Every scene is **skippable** and has a "Don't show again for this task" toggle, because a funny scene is funny twice, not forty times.
- It respects a **Reduce motion** setting (jump to the end card).
- Keep each scene **3 to 6 seconds**. The player is doing this task dozens of times.

### 0.2 A pose library for the avatar
The avatar is built from simple parts, so poses are just joint angles. A small library covers almost all the ideas below:
`idle, walk, run, carry, sit, lie, punch, kick, dodge, fall, get_up, point, shrug, wave, clap, dance_a, dance_b, dance_c, pray, kneel, drive, swim, jog, sneeze, sweat, fan_face (flap hand at mouth), count_money, hold_phone, type, stamp, lift_box, push_cart`.
Each pose is a list of target joint angles plus easing. Blending two poses over 0.2 seconds looks smooth enough.

### 0.3 Particle presets (cheap, instanced quads)
`dust_cloud` (brown puffs that billow), `sweat_drops`, `stars` (dizzy), `hearts`, `money_rain` (naira notes), `confetti`, `steam` (from ears or a pot), `sparks`, `smoke` (exhaust, generator), `speed_lines`, `water_splash`, `leaf_fall`, `fire_flicker`, `exclamation` and `question` marks that pop above heads.

### 0.4 Speech bubbles and captions
We already have bubbles (vendors speak in bubbles now). Reuse them for all dialogue. Add **comic-book captions** ("POW!", "WAHALA!", "NO BE SMALL THING") as big stylised text that pops and shakes.

### 0.5 Camera rigs
`orbit`, `push_in`, `pull_back`, `shake` (hits, bumps), `whip_pan`, `follow` (for the car and chases), `top_down` (for the open world later), `two_shot` (two people in frame). All of them are just a camera position and look-at animated over time.

### 0.6 Sound stings
Short, loud, funny synth stings from the audio module we already have: a "boing", a coin cascade, a danfo horn, a generator splutter, a crowd "ooooh", a church bell, a referee whistle. Real recorded sounds can replace them later.

### 0.7 Rules for every scene
1. Always show **what changed** at the end (the stats and money chips, like the task cards).
2. Failures must be **funny, never mean**. The player laughs, loses a little, and tries again.
3. Never block the player for more than six seconds.
4. Reuse the same scene for similar tasks with different props (one "haggle" scene serves every vendor).

---

## 1. Travel (the first thing every player sees, so make it good)

The map's travel sheet already has Trek, Keke, Danfo, Okada, Cab and your own car. Each one gets its own 3 to 5 second scene while the next place loads. The loading screen is the stage, so the load time is free.

### 1.1 Danfo ride
- **Scene**: side view of a yellow-and-black danfo bus bouncing along. The conductor hangs out of the door shouting the route ("Oshodi! Oshodi! Oshodi o!"). Passengers sway together on every turn. A goat on the roof. The bus jerks to a stop and everyone falls forward.
- **Build**: a simple bus model (boxes), a parallax strip of Lagos buildings sliding by, a looping bounce on the bus, bubbles for the conductor.
- **Naija touch**: the conductor argues about change ("I no get change o"), a passenger sleeps on a stranger's shoulder, the bus has a painted slogan ("No condition is permanent"). Final beat: conductor slaps the side of the bus twice, "Owner!"
- **Effort**: M

### 1.2 Keke (tricycle)
- **Scene**: three-wheel keke squeezes between two big trucks, takes a corner on two wheels, the driver waves cheerfully.
- **Build**: tilt animation on corners, a camera shake, speed lines, a close shave with trucks (scale tricks).
- **Naija touch**: the driver has a small football jersey and a phone mounted with a rubber band.
- **Effort**: S

### 1.3 Okada
- **Scene**: the player holds on for dear life behind a rider. The bike weaves through a go-slow (traffic jam), mirrors fold, a woman with a basket on her head stays perfectly calm.
- **Build**: bike plus two riders, a slalom of cars, speed lines, a shake, the player's bag flapping.
- **Naija touch**: the rider honks at nothing, the player pulls the "oga, slow down!" face. Helmet is a pot lid.
- **Effort**: S

### 1.4 Cab (Bolt-style)
- **Scene**: calm interior shot, the driver chats, a "Your driver is 2 minutes away" card, then a gentle ride, then a rating screen with stars. A funny version: the driver cancels, comes back, argues about the price.
- **Build**: a car interior with a rear camera, a window with parallax city behind.
- **Naija touch**: the driver calls to confirm "where you dey?" three times.
- **Effort**: S

### 1.5 Trek (walking)
- **Scene**: the avatar walks past a set of street details with a time-lapse sun moving, a hawker follows for a few steps ("oga, buy water!"), the player's shoes slowly get dusty.
- **Build**: a looping walk cycle on a conveyor-belt street, sun angle animates with distance.
- **Naija touch**: a "Beware of area boys" sign, a billboard of a politician smiling too much.
- **Effort**: S

### 1.6 Own car
- **Scene**: the car you bought, from behind, driving through a small montage with the car's real colour. Radio plays afrobeats. If you drive a keke or a fancy sports car the scene changes.
- **Build**: reuse the vehicle display model from the showroom (`VehicleDisplay`) driving on a looping road.
- **Naija touch**: a policeman waves you down, you hand over a "dash" through the window and drive on (comic, no bribe taken: the policeman just wants a fist bump). Keep it a joke.
- **Effort**: M (and it is the seed for the real driving later)

### 1.7 Boat ride (beach and marina)
- **Scene**: a wooden fishing boat bobs, the boatman paddles, a bird follows, a wave splashes the player.
- **Build**: sine-wave bob, water plane with moving normal, splash particles.
- **Effort**: S

---

## 2. Fights, crime and risk (the funniest ones)

### 2.1 Fight the Agbero (the owner's idea)
- **Trigger**: "Fight the Agbero" at the viewing centre.
- **Scene**: the camera pulls to a two-shot. The player and an area boy (loud shirt, towel on the shoulder) square up. Then **one big dust cloud** rolls over both of them. Inside it: only fists, feet, a flip-flop and stars popping out, "POW", "WAHALA", a crowd of bystanders cheering and filming on phones. The cloud shakes for three seconds. The cloud clears:
  - **Win**: the player stands with a torn shirt, the Agbero sits dazed with stars circling, the crowd cheers, a bubble says "Respect!".
  - **Lose**: the player lies flat while the Agbero fans him with a flip-flop; a bubble: "E don do?".
- **Build**: dust_cloud particles at the middle, the two avatars hidden inside the cloud (just move the cloud), occasional limbs and items launched out of it with simple ballistic paths, camera shake, comic captions. The win or lose end pose uses the existing result.
- **Naija touch**: a "stay in school" sign in the background, a neighbour holding his phone sideways. The Agbero's belt buckle is a bottle cap.
- **Effort**: M

### 2.2 Pickpocketing
- **Scene**: three outcomes in 3 seconds.
  - **Success**: sneak walk (knees bent), the hand dips, a subtle "ting" and a naira note floats out, the player strolls away whistling.
  - **Fail, caught**: the victim's head turns slowly, an exclamation mark, the player freezes, the crowd points.
  - **Chase**: the player runs, the crowd chases in a conga line, a goat joins.
- **Build**: sneak pose, a head-turn pose, a chase path with a trail of dust.
- **Naija touch**: "Thief! Thief!" bubbles, a woman throws a slipper, someone sells pure water while chasing.
- **Effort**: M

### 2.3 Arrest and jail
- **Scene**: a police pickup (a "Black Maria" van) pulls up with a siren light; two officers lift the player into the back (feet kicking); cut to the cell; a clock on the wall shows the sentence; inmates play a quiet game of draughts.
- **Build**: van model, a flashing light, a door slam sting, a cell backdrop that already exists.
- **Naija touch**: the officer is eating roasted corn while arresting.
- **Effort**: M

### 2.4 Release from jail
- **Scene**: gate opens, the player steps out into bright light, shades on, a hawker immediately sells water.
- **Effort**: S

### 2.5 Betting shop
- **Scene**: the player hands over a ticket, the clerk stamps it with a thud. Cut to the big screen: the match, the crowd leaning in. **Win**: everyone screams, the player is lifted on shoulders, naira rain. **Lose**: the ticket is torn in slow motion and the player sits down very quietly.
- **Build**: stamp pose, the shared crowd sound, money_rain or a slow paper tear (two halves falling).
- **Naija touch**: a man at the back who "knew it all along" and a "BET RESPONSIBLY" sign that is far too small.
- **Effort**: M

---

## 3. Money and work

### 3.1 Load the trailer (market loading bay)
- **Scene**: the player carries sacks from a stack onto a trailer in a rhythm, sweating more each time, a foreman shouts "Faster! Faster!", the trailer sinks a little with every sack. Final beat: the foreman pays cash with a flourish and the player collapses on the sacks.
- **Build**: carry pose, sweat_drops, a trailer suspension bounce, a counter above the pile.
- **Naija touch**: a sack bursts and rice rolls everywhere, a woman collects it into her wrapper.
- **Effort**: M

### 3.2 Haggling (any market vendor)
- **Scene**: close two-shot of the player and the vendor, a rapid back-and-forth of speech bubbles with numbers crossing out and dropping. The vendor throws her hands up, "Last price!", the player turns to leave, the vendor calls him back. A satisfying handshake and a shake of the head.
- **Build**: a bubble sequence with a price tag that animates down, a "walk away" pose, a "pull back" pose. One scene reused for every vendor (Alhaji Dansiru, Mama Chioma, Auntie Bisi).
- **Naija touch**: "Oga, I no go gain o!", the classic "you are my first customer today" (it is 4pm).
- **Effort**: S (high value, used everywhere)

### 3.3 Sell wares / carry loads / hawk pure water
- **Scene**: a fast montage: the player shouts, holds up a product, a car slows, a hand passes cash through the window, the player jogs alongside.
- **Build**: a moving-car side-cut and a "hand-off" pose.
- **Naija touch**: "Pure water! Pure water! Ice cold!" while the water is warm.
- **Effort**: S

### 3.4 Hackathon (tech hub)
- **Scene**: a time-lapse of a table of laptops and pizza boxes, the sun going down and the lights coming on, code raining on a screen (green), energy drinks pile up, a teammate falls asleep on the keyboard, the final demo with a drum roll and a spotlight. A prize cheque appears (win) or a "We try again" sticker (lose).
- **Build**: day-to-night lighting tween, instanced pizza boxes, a code-rain shader, a spotlight cone.
- **Naija touch**: the demo fails for 2 seconds because of NEPA (the screen blinks off), then the generator kicks in.
- **Effort**: M

### 3.5 Pitch to the OneNaija CEO / angel investor
- **Scene**: a polished desk, the player's slides on a screen (stick-figure chart going up), the CEO's face stays neutral, sweat drops, a long awkward pause, then a slow grin and a handshake (win) or a polite "we will get back to you" with the CEO already on the phone (lose).
- **Build**: two-shot, slide chart that animates, sweat_drops, a long beat of silence.
- **Naija touch**: the "traction" chart is actually a drawing of a snake.
- **Effort**: S

### 3.6 Government queue ("come back tomorrow")
- **Scene**: a very long line, the clock wheels through the day, the clerk's window closes at exactly the player's turn with a "Lunch" sign. Win version: the commissioner opens a door and waves.
- **Build**: a time-lapse of the queue, a sign flip.
- **Naija touch**: "Oga is on leave" but oga is visible in the back eating.
- **Effort**: S

### 3.7 Customs clearing
- **Scene**: a stamp thuds on a stack of papers, a container lifts into the air from a crane, it swings, a tiny wobble.
- **Build**: stamp pose with a screen thud, a crane lift on a rope.
- **Effort**: M

### 3.8 Teller / bank queue / POS withdrawal
- **Scene**: "network is slow" spinner, the teller sighs, the player sighs, both sigh together, the money finally appears. A POS version: the agent says "Network wahala" and holds the machine up to the sky to find signal.
- **Effort**: S

---

## 4. Social and fun

### 4.1 Dance battle (club)
- **Scene**: the crowd forms a circle with the player and a rival in the middle, a camera orbit, a series of dance poses, the crowd "ooooh" after each move, spraying naira in the air at the end for the winner (a classic owambe moment).
- **Build**: dance poses, instanced onlookers, money_rain, orbit camera.
- **Naija touch**: an auntie in the front row with a wrapper tied tight, filming everything.
- **Effort**: M

### 4.2 Pepper soup challenge
- **Scene**: the player takes a spoonful, face goes red, **steam shoots from both ears**, eyes bulge, he flaps his hand at his mouth, drinks a whole bottle of water, the crowd counts down. Win: raises the empty bowl. Lose: runs out of frame with steam trailing.
- **Build**: steam particles at ears, a face-flush tint, fan_face pose, a countdown caption.
- **Naija touch**: Mama Put laughing and saying "I tell you say na pepper".
- **Effort**: S (very funny for the cost)

### 4.3 Argue football (viewing centre)
- **Scene**: two benches of fans in a heated debate, arms flying, bubbles with silly claims ("Messi never won anything for Nigeria!"), a referee whistle comes from nowhere. The player leans in with a finger up.
- **Build**: gesture poses, overlapping bubbles, a crowd "heh" sting.
- **Effort**: S

### 4.4 Watch the match
- **Scene**: the screen shows a simple match, a goal, the whole centre jumps in unison, a man throws his cap, then VAR check: everyone goes silent.
- **Build**: a very simple 2D pitch on the TV, jump synchronisation.
- **Effort**: M

### 4.5 Street football and the penalty
- **Scene**: kick pose, the ball arcs, a slow-motion goalkeeper dive, "GOAL!" in big text, the player slides on his knees across the grass.
- **Effort**: S

### 4.6 Quick conversations (Say hello, Gist, Crack a joke, Compliment)
- **Scene**: a simple two-shot with a bubble each. Joke success: the other person doubles over laughing (a wobble), joke fail: a cricket sound and a tumbleweed (leaf) rolling past.
- **Effort**: S

### 4.7 Influencer photo wall and selfie with an actor
- **Scene**: a camera flash (white fade), the avatar strikes three poses in a row, a "Likes" counter ticks up, a fan screams in the background.
- **Effort**: S

### 4.8 Red carpet (cinema)
- **Scene**: a row of photographers with big flashes, the player walks the carpet, fake-confident, one foot trips on the carpet but recovers.
- **Effort**: S

### 4.9 Open mic / spoken word
- **Scene**: the player taps the mic, a loud feedback screech, the crowd winces, then a flow of floating words, a snap-snap-snap from the crowd.
- **Effort**: S

### 4.10 Church
- **Offering**: a basket passes along the pew, coins ping, a child drops a button.
- **Choir**: the choir sways in unison with a small camera push-in, a drum builds.
- **Sermon**: the pastor's pointing finger, the congregation says "Amen!" together, someone falls asleep and is nudged awake.
- **Prayer**: the player kneels, a gentle light cone from the stained glass, floating dust motes.
- **Effort**: S each

---

## 5. Health, home and daily life (the actions people do most)

### 5.1 Eat jollof
- **Scene**: a huge plate of jollof appears, steam rises, a slow spoonful with a close-up, a satisfied sigh and a loud "Naija jollof!". A rival "Ghana jollof" joke if you pick the wrong side.
- **Effort**: S

### 5.2 Power outage (NEPA took light)
- **Scene**: all the lights go out together with a sad "ooooh" sting, a neighbour's generator roars to life far away (smoke puffs), the player lights a candle. When light returns: everyone cheers "UP NEPA!".
- **Build**: a lighting tween to dark, a flicker, a cheer.
- **Effort**: S

### 5.3 Sleep
- **Scene**: a time-lapse where the sun moves, the moon crosses, a mosquito buzzes then gets swatted, a rooster crows at dawn.
- **Effort**: S

### 5.4 Shower / bath
- **Scene**: water particles, a bucket pouring, steam, the player singing off-key (music notes).
- **Effort**: S

### 5.5 Cooking
- **Scene**: pots, steam, a pepper grinder, a "taste" moment with a thumbs up. A fail: a burst of smoke and a black pot.
- **Effort**: S

### 5.6 Jogging, yoga, swimming, tennis, volleyball
- **Scene**: a short loop of the movement with a sunrise or splash, and a "stat change" burst at the end.
- **Effort**: S each (share the pose library)

---

## 6. Shopping and big purchases

### 6.1 Test drive at Polanco Motors (the owner's idea)
- **Trigger**: "Book a test drive" at the sales desk.
- **Scene**: the sales rep, Mr. Emeka, climbs into the passenger seat with a very confident smile. The player drives off a ramp. Then a **reckless drive**: weaving through traffic cones, a wheelie over a speed bump, a goat crosses the road, a drift in a cloud of dust, a danfo honks furiously, a policeman jumps out of the way. Mr. Emeka goes from "smooth salesman" to "gripping the door and praying" in three beats (bubbles: "My brother, this is a test drive, not Fast and Furious!"). Return to the showroom: the car smoking slightly, Mr. Emeka stumbles out and says "Oga, that one is already sold."
- **Build**: the showroom car model drives a short looping road, a follow camera, dust_cloud on drifts, a shake, bubbles for Mr. Emeka, cones that fly (simple ballistic).
- **Naija touch**: a "Slow, school zone" sign the player ignores, a keke driver gives a thumbs up.
- **Effort**: L (this is also the prototype for real driving)

### 6.2 Buy a car
- **Scene**: a gold key is handed over, a ribbon on the bonnet, the car rolls out of the showroom to a cheering crowd with confetti.
- **Effort**: S

### 6.3 Buying furniture and moving in
- **Scene**: boxes fly into the rooms, items pop into place with a bounce, a "welcome home" caption.
- **Effort**: S

---

## 7. Travel-adjacent places

### 7.1 Airport
- **Check-in**: a bag slides on the conveyor, the scale shows "OVERWEIGHT", the agent raises one eyebrow, the player pulls a shoe out of the bag.
- **Taxi rank haggling**: reuse the haggle scene.
- **Departures board**: flipping letters, one flight says "DELAYED" and then "DELAYED" again.
- **Effort**: S to M

### 7.2 Port
- **Scene**: a crane lifts a container, the camera follows it up and over, a gull sits on top.
- **Effort**: M

### 7.3 Beach
- **Scene**: waves, a hawker with roasted corn, a kid builds a sandcastle and the wave takes it. The player laughs.
- **Effort**: S

---

## 8. Moments that make the game feel alive

- **Level up a skill**: a golden burst with the skill icon, a short fanfare.
- **Daily reward**: a gift box that wobbles, then pops with naira and confetti.
- **Wanted level goes up**: a small police light flicks on the corner of the screen with a siren blip.
- **Notification arrives in the world**: the phone buzzes in the avatar's pocket (a small shake) before the banner drops.
- **Random street events**: a danfo conductor shouts and runs past, a goat crosses, a wedding party (owambe) dances through with sprayed naira.
- **Rain season**: puddles, umbrellas pop up, a hawker sells umbrellas immediately.

---

## 9. Suggested order

1. **The foundation (section 0)**: cinematic player, three or four poses, dust, sweat, steam, money rain, bubbles, camera shake. Everything else rides on this.
2. **Haggling, quick conversations, pepper soup challenge**: cheapest and funniest, used all over the venues.
3. **Fight the Agbero and the Polanco test drive**: the two the owner asked for. They prove the camera rigs and the driving.
4. **Travel scenes (danfo, keke, okada, cab, trek)**: seen by every player, every session, so they pay for themselves.
5. **Pickpocket, arrest, release**: ties the crime system together.
6. **Work scenes (loading bay, hackathon, pitches)**.
7. **Everyday scenes (eat, sleep, shower, power outage)**.
8. **Polish**: reduce motion option, skip memory, sound design.

## 10. Where this plugs into the code

- Tasks and their results already come from `data/activities.ts`, `data/venueKit.ts`, `game/loop.ts` (`onFinished`) and `game/talk.ts`. Add a `scene?: string` to a task definition; when the task starts (or finishes) the game calls `playScene(task.scene, result)`.
- Vendors already speak in bubbles (`stores/vendorTalkStore.ts`, `VendorActor` in `three/property/Npcs.tsx`); that is the seed of the dialogue system.
- Travel already has a loading scene in `features/map/MapOverlay.tsx` and the mode list in `features/map/LocationSheet.tsx`. Replace the emoji with a scene per mode.
- The showroom car (`three/models/VehicleDisplay.tsx`) is the model for the test drive and the "own car" travel scene.
- Sounds: `audio/sfx.ts` and `audio/ambience.ts` have the synth helpers for stings.
- The camera is `three/property/CameraRig.tsx`; add a `scripted` mode that takes a path.
