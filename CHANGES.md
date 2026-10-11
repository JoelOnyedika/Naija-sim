# Nigeria Life - improvement pass

## Fixed
- **Start a New Life froze** when started from the phone: the game screen waited forever on exit animations. It now unmounts immediately, and `restartLife()` clears build mode, drafts, sheets, toasts and running activities.
- **Build mode black screen**: after Cancel/Buy/Place the exiting placement bar re-read the store (draft = null) and threw, which unmounted the whole app. The bar now gets the draft as a prop; error boundaries wrap the app and the 3D scene.
- Build/Buy: separate exit X (always visible) and catalogue X; "Apartment Budget" removed; move pad (camera-relative) + 90 deg CW/CCW; tab remembered; no double charge.
- Preview camera easing is time-based (was per-frame) so slow devices still frame correctly.

## Added / changed
- Design tokens (blue accent, neutral ink surfaces), compact HUD (short money form, no wrap), collapsible left task panel, blue active dock/tabs.
- New low-poly character kit (`three/avatar/parts.ts`, `Avatar.tsx`): shaped torso/limbs/hands/head, hair (low cut, fade, afro, braids, locs, bun), shirt/tee/hoodie/jacket/kaftan/jersey, jeans/trousers/shorts/skirt/dress, shoes, accessories. Shared geometry + materials.
- Character creation, Boutique and New Life screens re-laid out so the character is never covered.
- Camera: full 360 deg orbit, pan clamped to the plot, fit-to-plot framing; back walls drop when the camera is behind them; veranda roof hides while building / viewed from above.
- Catalogue cut from 29 to 6 houses; old saves are mapped to the nearest tier (furniture returns to inventory). Lapo compound enlarged and squared.
- Loading screen (indeterminate, watchdog) for entering the game and changing homes.
- Automatic graphics tiers (PerfGovernor) with hysteresis/cooldowns + WebGL context-loss recovery.

## Customisation pass
- **Floors and walls**: 7 floors, 9 walls (paint, wallpaper, marble cladding). Try-on in Build mode (Floors / Walls tabs) is free and reversible; Buy & apply charges once via the shared economy store. Scope is stated in the UI: all interior floors / all interior walls of the home. Walls are interior-only overlay panels (outside faces, openings and furniture untouched). Each home remembers its own finishes; owned finishes re-apply free; persisted (`nigerialife.finishes`); cleared on a new life.
- **Independent fixtures**: toilet, shower, bathtub, jacuzzi, washbasin are separate items, any number of each. Also new: bedside table, coffee table, wall shelf, tower speaker, disco light.
- **Interactions**: the desk trains a Coding skill (XP on finish, level shown in the expanded stats); the speaker starts a party and the disco light only runs while it does.
- Dock now steps aside during floor/wall previews (a hook-order bug introduced and caught by tests while doing this is fixed).

## Not done yet
Lagos map expansion, billboards, GLB vehicle loader, banking/messaging/investment upgrades, remaining house layouts (flat/duplex proportions), free-angle furniture rotation.
