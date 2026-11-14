# UNILAG campus, the Bayo storyline and the interaction system (v39)

## The story, stage by stage (data/story.ts `Stage`, rules in game/story.ts)
| Stage | What the player sees | How it moves on |
|---|---|---|
| `arrival` | the existing university tasks and missions, untouched | mission "Welcome, Fresher" done (4 intro tasks) |
| `watcher` | a student with a black bracelet stands in view (5 to 14 m away), a short camera glance at him, a phone banner "Someone seems to have noticed you around campus." | he watches 7 seconds (or until the player walks within 4.5 m), then walks out of the gate |
| `talk_bayo` | objective **TALK TO SENIOR BAYO**: marker over Bayo near the cafeteria, edge arrow, map pin, prompt button when close | tap the prompt: the player walks up, both face each other, cinematic dialogue |
| group scene | Bayo takes the player to meet Seaman, Pablo and Baron; two sit on a bench, others stand in a loose arc | dialogue ends in the invitation with three choices |
| `declined` | normal university life, no objective, no pressure | one soft phone message after the next mission (max 2 per decline); talking to Bayo again re-opens the offer |
| `meeting` | real phone message from Bayo, objective **MEET SENIOR BAYO** with 22:00, a countdown, "Open now" and the back-gate marker | be at the gate in the 4-hour window |
| `follow` | Bayo walks up to the player, objective **FOLLOW BAYO** | prompt, short cinematic, then he leads the way; "Stop following" is always on screen |
| `initiation` | fade into the forest, circle, oath, two tests, stylised beating, new name, handshake, bracelet | rank 1 |
| `member` / `ended` | Brotherhood app unlocked in Phone > App Library > More, bracelet in Inventory | |

Missed meeting: one friendly message and an optional objective to reschedule; missed twice, the story ends quietly. There are no random rolls, no hidden timers, no harassment and no threats any more.

## Reusable systems
- **Camera** (`stores/viewStore.ts`, `stores/cameraStore.ts`, `three/property/CameraRig.tsx`, `world/cameraShots.ts`): Normal View (the original top-down orbit), Close View (elevated, follows the player smoothly, kept inside the venue) and a temporary cinematic camera (establishing, two-shot, group, close-up). The Normal/Close choice is saved and survives venues and reloads (toggle button under Rotate, key `V`). A cinematic shot always has a deadline and is dropped on venue change.
- **Interaction** (`game/interact.ts`, `world/actors.ts`, `world/arrangement.ts`, `three/property/StoryActors.tsx`): `startTalk`, `startGroup` (benches first, no rows, nobody closer than 0.85 m), `startFollow` (leader waits when you fall behind; cancel any time), `beginScene`, `setSpeaker` (speaker gestures, others listen), `playBeat('handshake' | 'give')`, `glanceAt`, `endInteraction`. Everything goes through an `IO` object, so it runs in tests without a renderer. Stuck people are snapped to their marks after a timeout.
- **Cast** (`data/cast.ts`): Bayo, Tobi, Seaman, Pablo, Baron: black shirt and trousers, black bracelet, red-and-gold insignia, some with a beret, each with a different face, hair, build, accessory, idle poses and way of talking.
- **Objectives** (`stores/objectiveStore.ts`, `features/game/ObjectiveHud.tsx`, `three/property/InteractionDriver.tsx`): card, "new objective" flash, completion banner, 3D marker, edge arrow, prompt, map highlight (the map flies to the place and offers the trip). Saved with the game; rebuilt from the stage after a reload.
- **Dialogue** (`features/game/StoryDialogue.tsx`): standard (slim box, small portrait) and cinematic (letterbox, large portrait with name and role, numbered choice cards). Portraits are the real 3D characters. Tap to finish typing, tap to continue, Skip, keyboard Enter/Space/Esc. Narration has no portrait.

## Saving
Stage, objective, flags, view mode and membership are saved. Scenes are never saved half way: a reload in the forest returns to "FOLLOW BAYO"; older saves are upgraded (`recruit` becomes a stage).

## Not built / limits
See the end-of-task report in the chat; the short version: no new 3D models or animation clips (poses are procedural), no real hand clasp in the handshake, props are not ray-cast for camera clipping (only the venue bounds), movement is tap-to-walk (the game never had WASD).
