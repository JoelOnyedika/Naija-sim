"""End-to-end ads flow in a real browser: Sea Ad wizard -> pending (not live) -> approve -> floating in the world -> persistence
across a reload; plus the city selector and category tabs. Run: ./run.sh test_ads_flow.py  (set SHOTS=/some/dir to keep screenshots)"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from lib import *
from PIL import Image, ImageDraw

SHOTS = os.environ.get("SHOTS", "/tmp/ads_shots"); os.makedirs(SHOTS, exist_ok=True)
art = os.path.join(SHOTS, "ad.png")
im = Image.new("RGB", (1600, 800), "#C23B3B"); d = ImageDraw.Draw(im); d.rectangle((60, 60, 1540, 740), outline="white", width=14); d.text((200, 360), "MAMA PUT JOLLOF  OPEN DAILY", fill="white"); im.save(art)
bad = os.path.join(SHOTS, "bad.gif"); Image.new("RGB", (900, 450), "red").save(bad, "GIF")

def store(pg, expr):
    return pg.evaluate("async()=>{const A=await import('/src/stores/adsStore.ts');const s=A.useAdsStore.getState();return (" + expr + ")}")

with sync_playwright() as p:
    b, pg, logs = boot(p, 390, 844)
    seed(pg)
    pg.evaluate("async()=>{(await import('/src/stores/adsStore.ts')).useAdsStore.getState().reset(); (await import('/src/stores/uiStore.ts')).useUiStore.getState().setMode('map')}")
    pg.wait_for_timeout(5000); pg.screenshot(path=f"{SHOTS}/01_map_ads.png")
    # city dropdown: Lagos playable, the rest disabled "Coming soon"
    pg.locator('button[aria-haspopup=listbox]').click(); pg.wait_for_timeout(400)
    opts = pg.locator('[role=listbox][aria-label=City] [role=option]')
    assert opts.count() == 4, opts.count()
    states = [(opts.nth(i).inner_text().replace("\n", " "), opts.nth(i).get_attribute("aria-disabled")) for i in range(4)]
    print("cities:", states)
    assert states[0][1] == "false" and "here" in states[0][0].lower() and all(x[1] == "true" for x in states[1:]), states
    assert "COMING SOON" in states[1][0].upper()
    before = pg.evaluate("async()=>(await import('/src/stores/mapStore.ts')).useMapStore.getState().stateId")
    opts.nth(1).click(force=True); pg.wait_for_timeout(300)
    after = pg.evaluate("async()=>(await import('/src/stores/mapStore.ts')).useMapStore.getState().stateId")
    assert before == after, "clicking Abuja must not switch city"
    pg.locator('button[aria-haspopup=listbox]').click(); pg.wait_for_timeout(300)   # close it again
    # More dropdown: Billboards, Neighbours, Sea Plots, Government, Walk (Walk is marked Soon)
    def more(name):
        pg.get_by_role("button", name="More").or_(pg.locator('button[aria-haspopup=menu]')).first.click(); pg.wait_for_timeout(300)
        pg.get_by_role("menuitem", name=name).click(); pg.wait_for_timeout(600)
    pg.locator('button[aria-haspopup=menu]').click(); pg.wait_for_timeout(300)
    items = pg.locator('[role=menu][aria-label=More] [role=menuitem]'); assert items.count() == 5
    labels = [items.nth(i).inner_text().split("\n")[0].strip() for i in range(5)]
    print("more:", labels); assert labels == ["Billboards", "Neighbours", "Sea Plots", "Government", "Walk"], labels
    assert items.nth(4).get_attribute("aria-disabled") == "true"
    pg.get_by_role("menuitem", name="Government").click(); pg.wait_for_timeout(900); pg.screenshot(path=f"{SHOTS}/02_government.png")
    assert pg.get_by_text("Tafawa Balewa Square").count() >= 1
    pg.locator('button[aria-haspopup=menu]').click(); pg.wait_for_timeout(300); pg.get_by_role("menuitem", name="Neighbours").click(); pg.wait_for_timeout(600)
    assert pg.get_by_text("The neighbourhoods of Lagos").count() == 1
    pg.locator('button[aria-haspopup=menu]').click(); pg.wait_for_timeout(300); pg.get_by_role("menuitem", name="Sea Plots").click(); pg.wait_for_timeout(900); pg.screenshot(path=f"{SHOTS}/03_sea.png")
    pg.get_by_role("button", name="Create a Sea Ad").click(); pg.wait_for_timeout(500)
    # validation: bad type and missing fields
    pg.set_input_files('input[type=file]', bad); pg.wait_for_timeout(800)
    assert pg.get_by_text("PNG, JPEG or WebP").count() >= 1, "GIF must be rejected with a message"
    pg.get_by_role("button", name="Choose placement").click(); pg.wait_for_timeout(300)
    assert pg.locator('[role=alert]').count() >= 2, "empty fields must show messages"
    pg.set_input_files('input[type=file]', art); pg.wait_for_timeout(1500)
    pg.get_by_label("Business or advertiser name").fill("Mama Put Jollof")
    pg.get_by_label("Description").fill("Hot jollof and fried plantain, open daily in Yaba.")
    pg.get_by_label("Website (optional)").fill("javascript:alert(1)")
    pg.get_by_role("button", name="Choose placement").click(); pg.wait_for_timeout(300)
    assert pg.get_by_text("http:// or https://").count() >= 1, "javascript: URL must be rejected"
    pg.get_by_label("Website (optional)").fill("https://mamaput.example")
    pg.screenshot(path=f"{SHOTS}/04_details.png")
    pg.get_by_role("button", name="Choose placement").click(); pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{SHOTS}/05_picker.png")
    greens = pg.locator('svg[aria-label="Sea Ads placement map"] g[aria-label="Available position"]').count()
    assert greens > 100, greens
    pg.get_by_role("button", name="Suggest one").click(); pg.wait_for_timeout(2500)
    pg.screenshot(path=f"{SHOTS}/06_picked.png")
    pg.get_by_role("button", name="Review").first.click(); pg.wait_for_timeout(500)
    assert pg.get_by_text("SIMULATED PAYMENT").count() >= 1
    pg.screenshot(path=f"{SHOTS}/07_review.png")
    btn = pg.get_by_role("button", name="Confirm simulated payment")
    assert btn.is_disabled(), "must accept the rules first"
    pg.get_by_role("checkbox").check(); btn.click(); pg.wait_for_timeout(800)
    pg.screenshot(path=f"{SHOTS}/08_pending.png")
    assert pg.get_by_text("Submitted: pending review").count() == 1
    subs = store(pg, "s.submissions.map(x=>({id:x.id,status:x.status,pay:x.paymentStatus,slot:x.slotId,price:x.price,exp:x.expiresAt||null}))")
    print("submissions:", subs); assert len(subs) == 1 and subs[0]["status"] == "pending" and subs[0]["pay"] == "simulated" and subs[0]["exp"] is None
    pg.get_by_role("button", name="Done").click(); pg.wait_for_timeout(500)
    # not live yet: nothing is rendered as a floating ad
    assert store(pg, "s.submissions.filter(x=>x.status==='active').length") == 0
    # approve -> live for exactly 3 days
    ok = store(pg, "s.approve(s.submissions[0].id).ok"); assert ok
    sub = store(pg, "(({activatedAt,expiresAt,status,slotId})=>({activatedAt,expiresAt,status,slotId}))(s.submissions[0])")
    assert sub["status"] == "active" and sub["expiresAt"] - sub["activatedAt"] == 3 * 86400000, sub
    pg.evaluate("""async(slot)=>{const W=await import('/src/game/ads/slots.ts');const R=await import('/src/world/registry.ts');const U=await import('/src/stores/adsUiStore.ts');
      const s=W.seaSlots(R.getState('lagos')).find(q=>q.id===slot); U.useAdsUiStore.getState().setFocus([s.x,s.z]);}""", sub["slotId"])
    pg.wait_for_timeout(5000); pg.screenshot(path=f"{SHOTS}/09_live_in_world.png")
    # reload: timestamps survive, ad still active
    pg.reload(); pg.wait_for_timeout(3000)
    sub2 = store(pg, "(({activatedAt,expiresAt,status})=>({activatedAt,expiresAt,status}))(s.submissions[0])")
    print("after reload:", sub2); assert sub2["expiresAt"] == sub["expiresAt"] and sub2["status"] == "active"
    # an expired ad is swept and releases its slot
    pg.evaluate("async()=>{const A=await import('/src/stores/adsStore.ts');A.useAdsStore.setState({submissions:A.useAdsStore.getState().submissions.map(x=>({...x,expiresAt:Date.now()-1}))});A.useAdsStore.getState().sweep()}")
    assert store(pg, "s.submissions[0].status") == "expired"
    errs = [l for l in logs if l[0] == "PAGEERROR"]; assert not errs, errs
    print("OK ads flow"); b.close()
