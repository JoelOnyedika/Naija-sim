from lib import *
def ev(pg,js): return pg.evaluate(js)
fails=[]
def check(name,cond,extra=""):
    print(("PASS " if cond else "FAIL ")+name, extra); 
    if not cond: fails.append(name)
with sync_playwright() as p:
    b,pg,logs=boot(p)
    seed(pg)
    st=lambda: ev(pg,"""async()=>{const U=await import('/src/stores/uiStore.ts');const E=await import('/src/stores/editorStore.ts');const M=await import('/src/stores/economyStore.ts');const I=await import('/src/stores/propertyStore.ts');const h=I.usePropertyStore.getState();return {mode:U.useUiStore.getState().mode,cat:U.useUiStore.getState().catalogOpen,draft:!!E.useEditorStore.getState().draft,money:M.useEconomyStore.getState().money,placed:(h.furniture[h.activeId]||[]).length,rot:E.useEditorStore.getState().draft?.pose.rotation}}""")
    ev(pg,"""async()=>{const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:500000});const L=await import('/src/stores/lifeStore.ts');L.useLifeStore.setState({lifeType:'nepo'});}""")
    base=brightness(pg); check("home renders",base>40,base)
    m0=st()["money"]
    pg.click("button[aria-label=Buy]"); pg.wait_for_timeout(900)
    check("buy mode on",st()["mode"]=="buy"); check("exit X visible",pg.locator("button[aria-label='Exit Build mode']").is_visible())
    # catalog close/reopen without leaving build mode
    pg.click("button[aria-label='Close catalogue']"); pg.wait_for_timeout(700)
    s=st(); check("catalogue closes, build stays",s["mode"]=="buy" and not s["cat"]); check("exit X still visible",pg.locator("button[aria-label='Exit Build mode']").is_visible())
    pg.click("text=Catalogue"); pg.wait_for_timeout(700); check("catalogue reopens",st()["cat"])
    pg.locator("[role=tab]", has_text="Comfort").click(); pg.wait_for_timeout(300)
    check("selected tab is blue", "bg-accent" in pg.locator("[role=tab][aria-selected=true]").get_attribute("class"))
    # select an item from the UI
    pg.locator("text=Plastic chair").first.click(); pg.wait_for_timeout(900)
    s=st(); check("draft appears",s["draft"]); check("exit X visible with draft",pg.locator("button[aria-label='Exit Build mode']").is_visible())
    # rotation through 360
    seen=[]
    for i in range(4):
        pg.click("button[aria-label='Rotate clockwise']"); pg.wait_for_timeout(150); seen.append(st()["rot"])
    check("CW rotation cycles 4 steps",seen==[1,2,3,0],seen)
    pg.click("button[aria-label='Rotate counter-clockwise']"); pg.wait_for_timeout(150); check("CCW rotation",st()["rot"]==3)
    # nudge changes pose
    pose0=ev(pg,"""async()=>{const E=await import('/src/stores/editorStore.ts');const p=E.useEditorStore.getState().draft.pose;return [p.x,p.z]}""")
    pg.click("button[aria-label='Move right']"); pg.wait_for_timeout(200)
    pose1=ev(pg,"""async()=>{const E=await import('/src/stores/editorStore.ts');const p=E.useEditorStore.getState().draft.pose;return [p.x,p.z]}""")
    check("nudge moves the preview",pose0!=pose1,(pose0,pose1))
    # cancel: no charge, no dark screen
    pg.click("button[aria-label=Cancel]"); pg.wait_for_timeout(1200)
    s=st(); br=brightness(pg); check("cancel: no charge",s["money"]==m0 and not s["draft"],(m0,s["money"],s["draft"])); check("cancel: screen not dark",br>40,br)
    # buy path (unowned item)
    pg.locator("[role=tab]", has_text="Designs").click(); pg.wait_for_timeout(300)
    pg.locator("text=Potted plant").first.click(); pg.wait_for_timeout(700)
    placed0=st()["placed"]
    pg.locator("button:has-text('Buy ₦')").click(); pg.wait_for_timeout(1500)
    s=st(); br=brightness(pg); check("buy: charged once & placed",s["money"]<m0 and s["placed"]==placed0+1,(m0,s["money"],s["placed"])); check("buy: screen not dark",br>40,br)
    # second copy of same item
    pg.locator("text=Potted plant").first.click(); pg.wait_for_timeout(700); pg.locator("button:has-text('Buy ₦')").first.click(); pg.wait_for_timeout(1200)
    check("second copy placeable",st()["placed"]==placed0+2)
    # exit with a draft pending
    pg.locator("text=Potted plant").first.click(); pg.wait_for_timeout(700); mm=st()["money"]
    pg.click("button[aria-label='Exit Build mode']"); pg.wait_for_timeout(1500)
    s=st(); br=brightness(pg,"/tmp/after_exit.png"); check("exit with draft: home, no draft, no charge",s["mode"]=="home" and not s["draft"] and s["money"]==mm); check("exit: screen not dark",br>40,br)
    check("exit: dock visible",pg.locator("button[aria-label=Home]").is_visible())
    # double tap buy: second tap must not double-charge
    pg.click("button[aria-label=Buy]"); pg.wait_for_timeout(800); pg.locator("text=Potted plant").first.click(); pg.wait_for_timeout(700)
    mm=st()["money"]
    btn=pg.locator("button:has-text('Buy ₦')"); btn.dblclick(); pg.wait_for_timeout(1200)
    spent=mm-st()["money"]; check("double tap charges once",spent==12000,spent)
    # dock Home while in buy
    pg.click("button[aria-label=Home]"); pg.wait_for_timeout(1000); check("dock Home exits build",st()["mode"]=="home")
    check("no page errors",not [l for l in logs if l[0]=="PAGEERROR"],[l for l in logs if l[0]=="PAGEERROR"])
    pg.screenshot(path="/tmp/final_home.png")
    b.close()
print("FAILS:",fails)
