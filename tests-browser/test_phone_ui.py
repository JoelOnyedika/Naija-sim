"""The phone itself: home screen, clock, App Library, bottom navigation, and sending money by username. Usage: test_phone_ui.py nepo|lapo"""
import re, sys
from playwright.sync_api import sync_playwright
from lib import boot, seed

which = sys.argv[1] if len(sys.argv) > 1 else "nepo"
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)
def js(pg, code, arg=None): return pg.evaluate("async (a)=>{" + code + "}", arg)
def money(pg): return js(pg, "const E=await import('/src/stores/economyStore.ts'); return E.useEconomyStore.getState().money")

with sync_playwright() as p:
    b, pg, logs = boot(p, 390, 844)
    seed(pg, which, "game")
    js(pg, "const E=await import('/src/stores/economyStore.ts'); E.useEconomyStore.getState().reset(2000000); const P=await import('/src/stores/phoneStore.ts'); P.usePhoneStore.getState().openPhone();"); pg.wait_for_timeout(1000)

    # ---- home screen
    time_text = pg.get_by_label(re.compile(r"^Time \d\d:\d\d$")).first.inner_text()
    ok(re.fullmatch(r"\d\d:\d\d", time_text.strip()) is not None and pg.get_by_label(re.compile(r"^Time ")).first.is_visible(), f"[{which}] the clock is visible in the status bar ({time_text.strip()})")
    box = pg.get_by_label(re.compile(r"^Time ")).first.bounding_box()
    ok(box is not None and box["y"] < 80 and box["height"] >= 10, f"[{which}] the clock is at the top of the screen and readable")
    icons = pg.locator("button:has(> span > span.relative):has-text('')").count()
    for name in ["Contacts", "Grocery", "Ride", "Boutique", "Invest", "Companies", "Hustle", "Houses", "Cars", "Forbes", "Food", "Settings"]:
        if pg.get_by_role("button", name=name, exact=True).count() != 1: ok(False, f"home icon {name}")
    ok(all(pg.get_by_role("button", name=n, exact=True).count() == 1 for n in ["Messages", "Bank", "Jobs", "App library"]), f"[{which}] the dock has Messages, Bank, Jobs and the App library button")

    # ---- App Library: search finds an app and opens it
    pg.get_by_role("button", name="App library").click(); pg.wait_for_timeout(400)
    ok(pg.get_by_text("Money", exact=True).count() == 1 and pg.get_by_text("Law and order", exact=True).count() == 1, f"[{which}] the library groups every app")
    pg.get_by_label("Search apps").fill("pol"); pg.wait_for_timeout(300)
    ok(pg.get_by_role("button", name="Police", exact=True).count() == 1 and pg.get_by_role("button", name="Bank", exact=True).count() == 0, f"[{which}] typing narrows the library to matching apps")
    pg.get_by_role("button", name="Police", exact=True).click(); pg.wait_for_timeout(800)
    ok(pg.get_by_role("tablist").count() == 1, f"[{which}] opening an app from the library works and shows its bottom navigation")
    tabs = pg.get_by_role("tab").count()
    ok(2 <= tabs <= 5, f"[{which}] the app's navigation has {tabs} items (never more than 5)")
    fits = pg.evaluate("(()=>{const t=document.querySelector('[role=tablist]'); return t.scrollWidth <= t.clientWidth + 1})()")
    ok(fits, f"[{which}] the navigation bar fits without sideways scrolling")

    # ---- Bank > Send by username
    js(pg, "const P=await import('/src/stores/phoneStore.ts'); const s=P.usePhoneStore.getState(); s.closeApp(); s.openApp('bank');"); pg.wait_for_timeout(800)
    pg.get_by_role("tab", name="Send", exact=True).click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Mama").count() == 0 and pg.get_by_text("Daddy").count() == 0, f"[{which}] Send shows no pre-filled names")
    ok(pg.get_by_label("Receiver's username").count() == 1 and pg.get_by_label("Amount in naira").count() == 1, f"[{which}] Send has just a username box and an amount box")
    pg.get_by_label("Receiver's username").fill("nobody_here"); pg.get_by_label("Amount in naira").fill("5000"); pg.wait_for_timeout(300)
    ok(pg.get_by_text("No player has the username @nobody_here").count() >= 1 and pg.get_by_role("button", name="Send", exact=True).is_disabled(), f"[{which}] an unknown username is refused with a clear message")
    pg.get_by_label("Receiver's username").fill("@DJ_Kele"); pg.wait_for_timeout(300)
    ok(pg.get_by_label("Username found").count() == 1, f"[{which}] a real username (any case, with or without @) is accepted")
    before = money(pg)
    pg.get_by_role("button", name="Send ₦5,000").click(); pg.wait_for_timeout(250)
    ok(money(pg) == before, f"[{which}] one confirmation step before money leaves")
    pg.get_by_role("button", name="Send", exact=True).last.click(); pg.wait_for_timeout(600)
    ok(before - money(pg) == 5000 and pg.get_by_text("Money sent").count() == 1, f"[{which}] the transfer takes exactly the amount once ({before - money(pg)})")
    ok(js(pg, "const P=await import('/src/stores/phoneStore.ts'); return (P.usePhoneStore.getState().threads['p:dj_kele']||[]).some(m=>m.kind==='transaction')"), f"[{which}] the chat with that player holds the transaction card")
    ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"[{which}] no horizontal page overflow")
    errs = [l for l in logs if l[0] == "PAGEERROR" or (l[0] == "console.error" and "WebGL" not in l[1] and "GPU stall" not in l[1] and "ERR_NAME_NOT_RESOLVED" not in l[1])]
    ok(not errs, f"[{which}] no page errors ({errs[:3]})")
    b.close()

print("\n" + (f"{len(fails)} phone check(s) FAILED" if fails else f"All {which} phone checks passed"))
sys.exit(1 if fails else 0)
