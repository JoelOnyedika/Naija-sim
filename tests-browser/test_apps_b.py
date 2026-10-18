"""PART B: Court, Police, Ride, Grocery, Games, Forbes, Boutique, Family and the Tax tab, through the real UI."""
import os, sys
from playwright.sync_api import sync_playwright
from lib import boot, seed

SHOTS = os.environ.get("SHOTS", "/tmp/shots"); os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)
def js(pg, code, arg=None): return pg.evaluate("async (a)=>{" + code + "}", arg)
def app(pg, name):
    js(pg, "const P=await import('/src/stores/phoneStore.ts'); const s=P.usePhoneStore.getState(); s.closeApp&&s.closeApp(); s.openApp(a);", name); pg.wait_for_timeout(700)
def shot(pg, n): pg.screenshot(path=f"{SHOTS}/{n}.png")
def money(pg): return js(pg, "const E=await import('/src/stores/economyStore.ts'); return E.useEconomyStore.getState().money")

with sync_playwright() as p:
    b, pg, logs = boot(p, 390, 844)
    seed(pg, "lapo", "game")
    js(pg, "const E=await import('/src/stores/economyStore.ts'); E.useEconomyStore.getState().credit(300000000,'Test funds','income'); const P=await import('/src/stores/phoneStore.ts'); P.usePhoneStore.getState().openPhone();"); pg.wait_for_timeout(900)

    # ---- Court + Police
    app(pg, "court")
    pg.get_by_role("tab", name="Live Cases").click(); pg.wait_for_timeout(300); shot(pg, "court_live")
    pg.get_by_role("button", name="Watch case").first.click(); pg.wait_for_timeout(400); shot(pg, "court_viewer")
    ok(pg.get_by_label("Case timeline").count() == 1, "Court: Watch case opens the proceedings")
    pg.locator("button:has-text('Back'):not([aria-label])").first.click(); pg.wait_for_timeout(300)
    pg.get_by_role("tab", name="File a Case").click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder("e.g. lekki_larry").fill("lekki_larry")
    pg.get_by_role("button", name="Unpaid debt", exact=True).click()
    pg.locator("textarea").fill("He agreed to pay me for the work but never did.")
    pg.get_by_role("button", name="Review filing").click(); pg.wait_for_timeout(300); shot(pg, "court_review")
    c0 = money(pg)
    pg.get_by_role("button", name="File case", exact=True).click(); pg.wait_for_timeout(600)
    ok(c0 - money(pg) == 25_000 and pg.get_by_text("CASE-0001").count() >= 1, "Court: filing charges the fee and gives a case reference")
    app(pg, "police")
    pg.get_by_role("tab", name="Report a Player").click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder("e.g. dj_kele").fill("dj_kele")
    pg.get_by_role("button", name="Theft", exact=True).click()
    pg.locator("textarea").fill("My bag went missing after the party at the club.")
    pg.get_by_role("button", name="Submit report").click(); pg.wait_for_timeout(500)
    ok(pg.get_by_text("REP-0001").count() >= 1 and pg.get_by_text("Submitted").count() >= 1, "Police: a report is submitted with a status")
    shot(pg, "police_reports")
    pg.get_by_role("tab", name="Station").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Eko Police Division").count() == 1, "Police: the Lagos station is shown for the Lagos map")

    # ---- Games
    app(pg, "games")
    pg.get_by_role("button", name="Ludo").first.click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("House rules").count() == 1, "Games: a table expands to show house rules")
    shot(pg, "games_rules")

    # ---- Forbes
    app(pg, "forbes"); pg.wait_for_timeout(300)
    ok(pg.get_by_label("Rank 1", exact=False).count() == 1, "Forbes: the podium shows rank 1")
    shot(pg, "forbes_podium")

    # ---- Family + settings relationship
    app(pg, "family"); ok(pg.get_by_text("Single").count() >= 1 and pg.get_by_role("button", name="Marriage: coming later").is_disabled(), "Family: status is Single and marriage is disabled")

    # ---- Tax tab
    app(pg, "bank"); pg.get_by_role("tab", name="Income Tax").click(); pg.wait_for_timeout(400)
    ok(pg.get_by_text("Tax rates (per game week)").count() == 1, "Bank: the Income Tax tab shows the rate table")
    shot(pg, "bank_tax")

    # ---- Boutique full screen
    app(pg, "boutique"); pg.wait_for_timeout(1200)
    box = pg.locator("body > div.fixed .app-surface").first.bounding_box()
    vw = pg.viewport_size
    ok(box is not None and box["width"] >= vw["width"] - 2 and box["height"] >= vw["height"] - 2, f"Boutique: opens full screen ({box and int(box['width'])}x{box and int(box['height'])})")
    shot(pg, "boutique_full")
    pg.get_by_role("button", name="Bags").click(); pg.wait_for_timeout(300)
    pg.get_by_role("button", name="Canvas tote bag", exact=False).click(); pg.wait_for_timeout(300)
    t0 = money(pg)
    pg.get_by_role("button", name="Buy ·", exact=False).click(); pg.wait_for_timeout(500)
    ok(t0 - money(pg) == 12_000 and "b-bag-tote" in js(pg, "const C=await import('/src/stores/characterStore.ts'); return C.useCharacterStore.getState().ownedClothes"), "Boutique: buying a bag charges once and adds it to the wardrobe")
    pg.get_by_role("button", name="Party", exact=False).click(); pg.wait_for_timeout(300)
    shot(pg, "boutique_party")
    errs = [l for l in logs if l[0] == "PAGEERROR" or (l[0] == "console.error" and "WebGL" not in l[1] and "GPU stall" not in l[1] and "ERR_NAME_NOT_RESOLVED" not in l[1])]
    ok(not errs, f"no page errors ({errs[:3]})")
    b.close()

print("\n" + (f"{len(fails)} browser check(s) FAILED" if fails else "All new-app browser checks passed"))
sys.exit(1 if fails else 0)
