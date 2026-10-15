"""Walking, arrive-then-act, poses, cleanup and AFK in a real browser. Software rendering is slow (~1.5 fps), so every wait is a
poll with a long timeout, not a fixed sleep. Run: ./run.sh test_navigation.py   (SHOTS=/dir keeps screenshots)"""
import os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from lib import *

SHOTS = os.environ.get("SHOTS", "/tmp/nav_shots"); os.makedirs(SHOTS, exist_ok=True)
SETUP = """async()=>{
 const P=await import('/src/stores/propertyStore.ts'); const PL=await import('/src/world/placement.ts');
 const I=await import('/src/data/items.ts'); const E=await import('/src/stores/economyStore.ts');
 const H=await import('/src/game/housing.ts'); const R=await import('/src/world/registry.ts'); const G=await import('/src/game/active.ts');
 E.useEconomyStore.getState().reset(5e9);
 const ids=R.propertiesOfState('lagos').map(p=>p.id); const target=ids[ids.length-1]; H.acquireProperty(target);
 const home=G.getActiveHome(); const placed=[]; const z=k=>home.layout.zones.filter(q=>q.kind===k); const c=q=>[(q.x0+q.x1)/2,(q.z0+q.z1)/2];
 const liv=z('living')[0], beds=z('bedroom'), kit=z('kitchen')[0], bath=z('bathroom')[0];
 const put=(id,x,zz,rot)=>{const def=I.getFurniture(id); const pose=PL.resolvePlacement(def,home.layout,x,zz,rot); if(PL.validatePlacement(def,home.layout,pose,placed)) placed.push({uid:id+'1',defId:id,...pose})};
 const [lx,lz]=c(liv); const [bx,bz]=c(beds[0]);
 put('bed',bx,bz,0); put('sofa',lx-1,lz-1.2,0); put('tv',lx-1,lz+1.4,2); put('desk',lx+2.2,lz-1.5,0); put('chair',lx+2.2,lz-0.6,2);
 put('fridge',lx+3.2,lz+1,0); put('gym_rug',lx-3.4,lz+0.2,0); put('bathtub',lx+1,lz+3,1);
 if(kit){const [kx,kz]=c(kit); put('cooker',kx-0.5,kz,0);} if(bath){const [tx,tz]=c(bath); put('shower',tx,tz,0);}
 P.usePropertyStore.getState().setFurniture(target,placed); return placed.map(p=>p.defId);
}"""
USE = """async(id)=>{const G=await import('/src/game/active.ts'); const X=await import('/src/game/interactions.ts');
 const S=await import('/src/stores/statsStore.ts'); S.useStatsStore.getState().apply({energy:-70, hygiene:-40});
 const h=G.getActiveHome(); const it=[...h.placed,...h.fixtures].find(i=>i.defId===id); X.interactWith(it); return !!it}"""
ST = """async()=>{const S=await import('/src/stores/statsStore.ts'); const A=await import('/src/stores/actorStore.ts');
 const s=S.useStatsStore.getState(); return {act:s.activity&&s.activity.label, started:!!s.activity, order:!!A.useActorStore.getState().order, cos:A.useActorStore.getState().cosmetic&&A.useActorStore.getState().cosmetic.kind, av:window.__avatar}}"""

def poll(pg, cond, timeout=120):
    t0 = time.time(); st = None
    while time.time() - t0 < timeout:
        st = pg.evaluate(ST)
        if cond(st): return st
        pg.wait_for_timeout(700)
    raise AssertionError(f"timeout; last state {st}")
def stop(pg): pg.evaluate("async()=>{(await import('/src/stores/statsStore.ts')).useStatsStore.getState().stop()}")

with sync_playwright() as p:
    b, pg, logs = boot(p, 360, 640)
    seed(pg); print(pg.evaluate(SETUP)); pg.wait_for_timeout(4000)
    # keep AFK out of the way until step 6 (programmatic calls are not DOM input, so the idle clock would run)
    pg.evaluate("async()=>{(await import('/src/stores/actorStore.ts')).useActorStore.setState({lastInput:performance.now()+1e9})}")

    # 1. tap the floor: the avatar WALKS there (no teleport), along a path that never ends inside furniture
    start = pg.evaluate("()=>window.__avatar")
    pg.evaluate("async([x,z])=>{(await import('/src/game/interactions.ts')).walkTo(x,z)}", [start['x'] + 3, start['z'] + 0.5])
    pg.wait_for_timeout(1500); mid = pg.evaluate("()=>window.__avatar")
    assert abs(mid['x'] - start['x']) < 2.5, "must walk, not teleport"
    end = poll(pg, lambda s: s['av'] and s['av']['stage'] == 'idle' and not s['order'])['av']
    assert abs(end['x'] - (start['x'] + 3)) < 0.5, (start, end)
    print("OK walk to floor", round(end['x'], 2), round(end['z'], 2))

    # 2. sleeping: nothing starts while walking; on arrival the avatar lies ON the mattress; stopping gets it out cleanly
    pg.evaluate(USE, 'bed')
    s = pg.evaluate(ST); assert not s['started'], "activity must not start before arrival"
    s = poll(pg, lambda s: s['started'], 150); print("sleep started", s['av'])
    s = poll(pg, lambda s: s['av'] and s['av']['acting'] and s['av']['lying'], 60); av = s['av']
    assert 0.0 < av['y'] < 0.3, f"avatar should rest on the mattress, y={av['y']}"   # y is the body offset so the back meets the mattress top
    pg.wait_for_timeout(2500); pg.screenshot(path=f"{SHOTS}/sleep.png")
    stop(pg)
    s = poll(pg, lambda s: s['av'] and not s['av']['lying'] and s['av']['stage'] == 'idle' and abs(s['av']['y']) < 0.05, 90)
    print("OK sleep + clean exit", s['av'])

    # 3. TV: sits on the sofa facing the TV
    pg.evaluate(USE, 'tv'); s = poll(pg, lambda s: s['started'] and s['av'] and s['av']['acting'], 200); av = s['av']
    assert av['sitting'] and av['action'] == 'tv', av
    pg.wait_for_timeout(2000); pg.screenshot(path=f"{SHOTS}/tv.png"); stop(pg); poll(pg, lambda s: s['av'] and not s['av']['sitting'], 90)
    print("OK tv: seated, then stood up")

    # 4. bathing: blue cover appears only while bathing, gone afterwards
    pg.evaluate(USE, 'shower'); s = poll(pg, lambda s: s['started'] and s['av'] and s['av']['acting'], 200); av = s['av']
    assert av['bathing'] and av['action'] == 'shower', av
    pg.wait_for_timeout(2000); pg.screenshot(path=f"{SHOTS}/shower.png"); stop(pg)
    s = poll(pg, lambda s: s['av'] and not s['av']['bathing'] and s['av']['stage'] == 'idle', 90); print("OK shower cover cleaned up")

    pg.evaluate(USE, 'bathtub'); s = poll(pg, lambda s: s['started'] and s['av'] and s['av']['acting'], 200); assert s['av']['sitting'] and s['av']['bathing'], s['av']
    pg.wait_for_timeout(2000); pg.screenshot(path=f"{SHOTS}/bathtub.png"); stop(pg)
    poll(pg, lambda s: s['av'] and not s['av']['bathing'] and not s['av']['sitting'], 90); print("OK bathtub")

    # 4b. gym mat: the avatar walks onto it and does push-ups, body on the mat, hands animated
    pg.evaluate(USE, 'gym_rug'); s = poll(pg, lambda s: s['started'] and s['av'] and s['av']['acting'], 200); av = s['av']
    pg.wait_for_timeout(3500); av = pg.evaluate("()=>window.__avatar")   # the body height eases toward the mat surface
    assert av['action'] == 'pushup' and 0.035 < av['y'] < 0.055, av
    pg.screenshot(path=f"{SHOTS}/pushups.png"); stop(pg)
    poll(pg, lambda s: s['av'] and s['av']['stage'] == 'idle' and not s['av']['acting'], 90); print("OK push-ups on the gym mat")

    # 5. tapping the floor during an activity interrupts it and the avatar can move again
    pg.evaluate(USE, 'cooker'); poll(pg, lambda s: s['started'] and s['av'] and s['av']['acting'], 200); assert pg.evaluate(ST)['av']['action'] == 'cook'
    pg.evaluate("async()=>{const A=await import('/src/stores/actorStore.ts');const v=window.__avatar;(await import('/src/game/interactions.ts')).walkTo(v.x+1.5,v.z+1.0)}")
    s = poll(pg, lambda s: not s['started'] and s['av'] and s['av']['stage'] == 'idle' and not s['order'], 90); print("OK floor tap interrupts the activity")

    # 6. AFK: after 15 s idle only a cosmetic behaviour starts; needs and money never change; input cancels it
    before = pg.evaluate("""async()=>{const S=await import('/src/stores/statsStore.ts'); const E=await import('/src/stores/economyStore.ts'); return {m:E.useEconomyStore.getState().money, tx:E.useEconomyStore.getState().transactions.length}}""")
    pg.evaluate("async()=>{const A=await import('/src/stores/actorStore.ts');A.useActorStore.setState({lastInput:performance.now()-16000})}")
    s = poll(pg, lambda s: s['cos'] is not None, 60); print("AFK started:", s['cos']); assert s['cos'] in ('tv', 'eat', 'pushups', 'relax')
    assert not s['started'], "AFK must not start a real activity"
    pg.mouse.click(180, 300); pg.wait_for_timeout(1500)
    assert pg.evaluate(ST)['cos'] is None, "any input cancels AFK"
    after = pg.evaluate("""async()=>{const E=await import('/src/stores/economyStore.ts'); return {m:E.useEconomyStore.getState().money, tx:E.useEconomyStore.getState().transactions.length}}""")
    assert before == after, (before, after)
    errs = [l for l in logs if l[0] == "PAGEERROR"]; assert not errs, errs
    print("OK navigation, activities, cleanup and AFK"); b.close()
