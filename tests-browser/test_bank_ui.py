"""Bank + Settings UI: every tab renders without errors on a phone viewport, light and dark, and key actions work end to end.
Saves screenshots to $SHOTS (default /tmp/shots). Run with a dev server on :5173 (see run.sh)."""
import os, sys
from playwright.sync_api import sync_playwright
from lib import boot, seed

SHOTS = os.environ.get("SHOTS", "/tmp/shots"); os.makedirs(SHOTS, exist_ok=True)
fails = []
def ok(c, m):
    print(("✓ " if c else "✗ ") + m)
    if not c: fails.append(m)

TABS = ["Overview", "Send", "Savings", "Bonds", "Credibility", "Income Tax", "Weekly Bills", "Last Receipt", "Money History"]

def js(pg, code, arg=None):
    return pg.evaluate("async (a)=>{" + code + "}", arg)

with sync_playwright() as p:
    b, pg, logs = boot(p, 390, 844)
    seed(pg, "lapo", "game")
    # a realistic mid-game state, built through the real game rules (not by editing stores directly)
    js(pg, """
      const E=await import('/src/stores/economyStore.ts'); const B=await import('/src/game/banking.ts');
      const S=await import('/src/game/scheduler.ts'); const C=await import('/src/stores/clockStore.ts'); const G=await import('/src/game/bank.ts');
      const D=await import('/src/data/economy.ts'); const Gd=await import('/src/game/guard.ts');
      E.useEconomyStore.getState().credit(6000000,'Shift pay','salary');
      B.depositSavings(1500000); Gd.clearGuard(); B.buyBond('nt-7d', 500000); Gd.clearGuard();
      G.sendTransfer({toId:'mama', amount:600000, description:'Upkeep'});
      E.useEconomyStore.getState().debit(5000000,'Bought a sofa','purchase');
      S.runDueEvents();
      C.useClockStore.setState({minutes: D.WEEK_MINUTES + 700}); S.runDueEvents();   // a game week passes: interest + a bill
      E.useEconomyStore.getState().debit(E.useEconomyStore.getState().money,'Spent it all','purchase');
      const BS=await import('/src/stores/bankStore.ts'); BS.useBankStore.setState((s)=>({savings:{...s.savings, balance:0}}));  // no interest this week
      C.useClockStore.setState({minutes: D.WEEK_MINUTES*2 + 700}); S.runDueEvents();   // next bill cannot be paid -> overdue
    """)
    pg.wait_for_timeout(500)
    js(pg, "const P=await import('/src/stores/phoneStore.ts'); P.usePhoneStore.getState().openPhone(); P.usePhoneStore.getState().openApp('bank');")
    pg.wait_for_timeout(1200)

    for theme in ["light", "dark"]:
        js(pg, "const S=await import('/src/stores/settingsStore.ts'); S.useSettingsStore.getState().setTheme(a);", theme)
        pg.wait_for_timeout(300)
        for t in TABS:
            pg.get_by_role("tab", name=t, exact=True).click(); pg.wait_for_timeout(350)
            pg.screenshot(path=f"{SHOTS}/bank_{theme}_{t.replace(' ','_').lower()}.png")
        # tab strip does not clip the page sideways
        ok(pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"[{theme}] no horizontal page overflow")

    # --- actions through the real UI
    js(pg, "const E=await import('/src/stores/economyStore.ts'); E.useEconomyStore.getState().credit(2000000,'Top up','income');")
    pg.get_by_role("tab", name="Savings", exact=True).click(); pg.wait_for_timeout(300)
    snap = "const E=await import('/src/stores/economyStore.ts'); const B=await import('/src/stores/bankStore.ts'); return [E.useEconomyStore.getState().money, B.useBankStore.getState().savings.balance]"
    before = js(pg, snap)
    pg.get_by_label("Quick amounts").get_by_text("25%").click()
    pg.get_by_role("button", name="Save").last.click(); pg.wait_for_timeout(600)
    after = js(pg, snap)
    moved = after[1] - before[1]
    ok(moved > 0 and before[0] - after[0] == moved, f"deposit through the UI moves exactly the same amount out of the wallet (moved {moved})")

    pg.get_by_role("tab", name="Weekly Bills", exact=True).click(); pg.wait_for_timeout(300)
    ok(pg.get_by_text("Overdue").count() > 0, "an overdue bill is shown")
    pg.get_by_role("tab", name="Money History", exact=True).click(); pg.wait_for_timeout(300)
    pg.get_by_label("Search transactions").fill("bond"); pg.wait_for_timeout(300)
    rows = pg.locator("button[aria-label$='open receipt']").count()
    ok(rows >= 1, f"history search finds the bond entries ({rows})")
    pg.locator("button[aria-label$='open receipt']").first.click(); pg.wait_for_timeout(400)
    ok(pg.get_by_text("Nigeria Life · Receipt").count() == 1, "tapping a history row opens its receipt")
    pg.screenshot(path=f"{SHOTS}/bank_light_receipt_from_history.png")

    # --- Settings
    js(pg, "const P=await import('/src/stores/phoneStore.ts'); P.usePhoneStore.getState().closeApp(); P.usePhoneStore.getState().openApp('settings');")
    pg.wait_for_timeout(700)
    pg.screenshot(path=f"{SHOTS}/settings_dark.png", full_page=False)
    pg.get_by_role("radio", name="Light", exact=True).click(); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.documentElement.dataset.theme") == "light", "theme switch applies to the page")
    pg.get_by_role("radio", name="Dark", exact=True).click(); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.documentElement.dataset.theme") == "dark", "dark theme applies")
    pg.get_by_role("switch", name="Battery saver").click(); pg.wait_for_timeout(200)
    ok(pg.evaluate("document.documentElement.classList.contains('battery-saver')"), "battery saver class applied")
    pg.get_by_role("radio", name="Off", exact=True).click(); pg.wait_for_timeout(2500)
    tier = pg.evaluate("""async()=>{const Q=await import('/src/stores/qualityStore.ts'); return Q.useQualityStore.getState().tier}""")
    ok(tier == 3, f"Graphics Off pins the lowest tier (tier {tier})")
    pg.get_by_role("radio", name="On", exact=True).click(); pg.wait_for_timeout(2500)
    tier = pg.evaluate("""async()=>{const Q=await import('/src/stores/qualityStore.ts'); return Q.useQualityStore.getState().tier}""")
    ok(tier == 2, f"Graphics On with Battery saver is capped at Low (tier {tier})")
    pg.get_by_role("button", name="Change password").click(); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{SHOTS}/settings_password.png")

    errs = [l for l in logs if l[0] in ("PAGEERROR",) or (l[0] == "console.error" and "WebGL" not in l[1] and "ERR_NAME_NOT_RESOLVED" not in l[1] and "GPU stall" not in l[1])]
    ok(not errs, f"no page errors ({errs[:3]})")
    b.close()

print("\n" + (f"{len(fails)} browser check(s) FAILED" if fails else "All Bank/Settings browser checks passed"))
sys.exit(1 if fails else 0)
