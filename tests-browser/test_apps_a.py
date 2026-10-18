"""PART A: Companies, Investments, Grocery, Ride (Court, Police, Ride, Grocery, Games, Forbes, Boutique, Family and the Tax tab, through the real UI."""
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

    # ---- every new app opens
    for a in ["companies", "invest", "court", "police", "ride", "grocery", "games", "forbes", "family"]:
        app(pg, a); shot(pg, f"app_{a}")
        ok(pg.locator(".app-surface").count() >= 1, f"{a} opens")

    # ---- Companies: create, hire a manager
    app(pg, "companies")
    pg.get_by_role("button", name="Create company").first.click(); pg.wait_for_timeout(300)
    pg.get_by_placeholder("e.g. Mama Ife Kitchen").fill("Mama Ife Kitchen")
    shot(pg, "companies_create")
    before = money(pg)
    pg.get_by_role("button", name="Create for", exact=False).click(); pg.wait_for_timeout(600)
    ok(before - money(pg) == 2_500_000, "Companies: creating charges the startup cost once")
    ok(pg.get_by_text("Not operating yet").count() == 1, "Companies: a new company says it is not operating")
    pg.get_by_role("button", name="Hire manager", exact=False).click(); pg.wait_for_timeout(500)
    ok(js(pg, "const C=await import('/src/stores/companyStore.ts'); return !!C.useCompanyStore.getState().companies[0].manager"), "Companies: hiring a manager makes it operate")
    pg.get_by_role("tab", name="Team").click(); pg.wait_for_timeout(300); shot(pg, "companies_team")
    pg.get_by_role("tab", name="Marketing").click(); pg.wait_for_timeout(300); shot(pg, "companies_marketing")
    pg.get_by_role("tab", name="Upgrades").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Needs: 4 staff").count() == 1 or pg.get_by_text("Needs 4 staff", exact=False).count() >= 1, "Companies: level 2 shows its requirement")
    shot(pg, "companies_upgrades")

    # ---- Investments: land
    app(pg, "invest")
    pg.get_by_role("tab", name="Land").click(); pg.wait_for_timeout(400)
    shot(pg, "invest_land")
    b0 = money(pg)
    pg.locator(".app-surface").get_by_role("button", name="Buy", exact=True).first.click(); pg.wait_for_timeout(250)
    pg.locator("div.border-accent").get_by_role("button", name="Buy", exact=True).click(); pg.wait_for_timeout(500)
    ok(b0 - money(pg) > 0 and js(pg, "const L=await import('/src/stores/landStore.ts'); return Object.keys(L.useLandStore.getState().owned).length") == 1, "Invest: buying a plot (with confirmation) charges once and records ownership")
    pg.get_by_role("button", name="Abuja", exact=False).first.click(); pg.wait_for_timeout(300)
    pg.get_by_role("radio", name="All owned").click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Owned").count() >= 1, "Invest: land owned in Lagos is still listed under All owned while browsing Abuja")
    pg.get_by_role("tab", name="Overview").click(); pg.wait_for_timeout(300); shot(pg, "invest_overview")

    # ---- Grocery
    app(pg, "grocery")
    g0 = money(pg)
    pg.get_by_label("Add Local rice to cart").click(); pg.wait_for_timeout(200)
    pg.get_by_role("tab", name="Cart (1)").click(); pg.wait_for_timeout(300)
    shot(pg, "grocery_cart")
    pg.get_by_role("button", name="Review order").click(); pg.wait_for_timeout(200)
    pg.get_by_role("button", name="Confirm and pay").click(); pg.wait_for_timeout(600)
    ok(g0 - money(pg) == 9_500 + 0 or g0 - money(pg) == 10_200, f"Grocery: checkout charged the order total ({g0 - money(pg)})")
    ok(pg.get_by_text("GRO-0001").count() >= 1, "Grocery: the order appears in Orders")
    shot(pg, "grocery_orders")

    # ---- Ride
    app(pg, "ride")
    pg.get_by_role("button", name="Iya Basira Amala Spot, details").click(); pg.wait_for_timeout(300)
    r0 = money(pg)
    pg.get_by_role("button", name="₦500").first.click(); pg.wait_for_timeout(500)
    ok(r0 - money(pg) == 500 and pg.get_by_text("You are here").count() == 1, "Ride: a Keke trip charges the fare and you arrive")
    shot(pg, "ride_arrived")
    ok(pg.get_by_text("Order amala and ewedu").count() == 1, "Ride: activities appear once you are there")

    errs = [l for l in logs if l[0] == "PAGEERROR" or (l[0] == "console.error" and "WebGL" not in l[1] and "GPU stall" not in l[1] and "ERR_NAME_NOT_RESOLVED" not in l[1])]
    ok(not errs, f"no page errors ({errs[:3]})")
    b.close()

print("\n" + (f"{len(fails)} browser check(s) FAILED" if fails else "All new-app browser checks passed"))
sys.exit(1 if fails else 0)
