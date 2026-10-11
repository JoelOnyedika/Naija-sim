from lib import *
with sync_playwright() as p:
    b,pg,logs=boot(p)
    seed(pg)
    for round in (1,2):
        pg.evaluate("""async()=>{const P=await import('/src/stores/phoneStore.ts');P.usePhoneStore.getState().openPhone();P.usePhoneStore.getState().openApp('settings');}""")
        pg.wait_for_timeout(900)
        pg.click("text=Start New Life"); pg.wait_for_timeout(300); pg.click("text=Spin again"); pg.wait_for_timeout(1500)
        pg.click("button:has-text('Spin')"); pg.wait_for_selector("text=Enter your life", timeout=30000)
        pg.click("text=Enter your life"); pg.wait_for_timeout(1500)
        print(round, "summary:", pg.inner_text("body")[:60].replace("\n"," | "))
        btn=pg.locator("button", has_text="Start").or_(pg.locator("button", has_text="Enter")).or_(pg.locator("button", has_text="Continue")).first
        print(" buttons:", [t[:20] for t in pg.locator("button").all_inner_texts()][:8])
        btn.click(); pg.wait_for_timeout(2500)
        print(round, "game:", pg.inner_text("body")[:60].replace("\n"," | "), "canvas", pg.locator("canvas").count())
        pg.screenshot(path=f"/tmp/nl_round{round}.png")
    for l in logs: print(l)
    b.close()
