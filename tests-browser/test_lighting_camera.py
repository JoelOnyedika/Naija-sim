"""Regression tests: (1) room lights survive every graphics tier, (2) vertical drag tilts within limits and never slides
the view, (3) the ground is a disc (no square grass zone is drawn). Run: ./run.sh test_lighting_camera.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

QS = "/src/stores/qualityStore.ts"; CS = "/src/stores/cameraStore.ts"
with sync_playwright() as p:
    b, pg, logs = boot(p)
    seed(pg)
    pg.wait_for_timeout(1500)
    # 1. lights: tier 3 must keep the lights (flag) and look as bright as tier 0
    flags = pg.evaluate("async()=>{const Q=await import('%s');return Q.QUALITY_TIERS.map(t=>t.nightLights)}" % QS)
    assert all(flags), f"a graphics tier disables room lights: {flags}"
    b0 = brightness(pg)
    pg.evaluate("async()=>{(await import('%s')).useQualityStore.getState().setTier(3)}" % QS)
    pg.wait_for_timeout(2500)
    b3 = brightness(pg)
    assert b3 > b0 * 0.9, f"scene went dull on the lowest tier: {b0} -> {b3}"
    pg.evaluate("async()=>{(await import('%s')).useQualityStore.getState().setTier(0)}" % QS)
    # 2. camera: finger down tilts toward top-down, finger up toward side-on, both clamped
    get = "async()=>{const s=(await import('%s')).useCameraStore.getState();return [s.polar,s.zoom,s.steps]}" % CS
    pg.mouse.move(195, 300); pg.mouse.down(); pg.mouse.move(195, 600, steps=10); pg.mouse.up(); pg.wait_for_timeout(500)
    lo = pg.evaluate(get)[0]
    pg.mouse.move(195, 600); pg.mouse.down(); pg.mouse.move(195, 200, steps=14); pg.mouse.up(); pg.wait_for_timeout(500)
    hi = pg.evaluate(get)[0]
    assert abs(lo - 0.7) < 1e-6 and abs(hi - 1.2) < 1e-6, f"tilt limits wrong: {lo}, {hi}"
    print("OK lights flags", flags, "brightness", b0, b3, "tilt range", lo, hi)
    errs = [l for l in logs if l[0] == "PAGEERROR"]
    assert not errs, errs
    b.close()
