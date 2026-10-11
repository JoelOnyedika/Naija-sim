from lib import *
fails=[]
def check(name,cond,extra=""):
    print(("PASS " if cond else "FAIL ")+name, extra)
    if not cond: fails.append(name)
with sync_playwright() as p:
    b,pg,logs=boot(p)
    seed(pg)
    ev=lambda js,arg=None: pg.evaluate(js,arg) if arg is not None else pg.evaluate(js)
    S=lambda: ev("""async()=>{const M=await import('/src/stores/economyStore.ts');const F=await import('/src/stores/finishStore.ts');const P=await import('/src/stores/propertyStore.ts');const f=F.useFinishStore.getState();return {money:M.useEconomyStore.getState().money,preview:f.preview,by:f.byProperty,owned:f.owned,active:P.usePropertyStore.getState().activeId}}""")
    ev("""async()=>{const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:5000000})}""")
    pg.click("button[aria-label=Buy]"); pg.wait_for_timeout(900)
    pg.locator("[role=tab]", has_text="Floors").click(); pg.wait_for_timeout(500)
    check("floors tab selected (blue)","bg-accent" in pg.locator("[role=tab][aria-selected=true]").get_attribute("class"))
    m0=S()["money"]; home0=S()["active"]
    pg.locator("button", has_text="Plain tile").first.click(); pg.wait_for_timeout(800)
    s=S(); check("preview set, nothing charged",s["preview"].get("floor")=="floor_tile" and s["money"]==m0,s["preview"])
    check("scope text shown", pg.locator("text=All interior floors").count()>0)
    pg.wait_for_timeout(4000); pg.screenshot(path="/tmp/fin_floor_preview.png")
    pg.click("button[aria-label='Cancel preview']"); pg.wait_for_timeout(800)
    s=S(); check("cancel: no charge, nothing applied",s["money"]==m0 and not s["preview"] and not s["by"].get(home0),s["by"])
    pg.locator("button", has_text="Plain tile").first.click(); pg.wait_for_timeout(600)
    pg.locator("button:has-text('Buy & apply')").dblclick(); pg.wait_for_timeout(1200)
    s=S(); check("floor bought once (150,000)",m0-s["money"]==150000 and s["by"][home0]["floor"]=="floor_tile",(m0-s["money"],s["by"]))
    # walls
    pg.locator("[role=tab]", has_text="Walls").click(); pg.wait_for_timeout(500)
    m1=S()["money"]
    pg.locator("button", has_text="Striped wallpaper").first.click(); pg.wait_for_timeout(600)
    pg.locator("button:has-text('Buy & apply')").click(); pg.wait_for_timeout(1500)
    s=S(); check("wall bought once (120,000)",m1-s["money"]==120000 and s["by"][home0]["wall"]=="wall_stripes",(m1-s["money"],s["by"]))
    pg.wait_for_timeout(5000); pg.screenshot(path="/tmp/fin_applied.png")
    # re-applying an owned finish is free
    m2=S()["money"]
    pg.locator("button", has_text="Striped wallpaper").first.click(); pg.wait_for_timeout(500)
    pg.click("button:has-text('Apply')"); pg.wait_for_timeout(800)
    check("re-apply same finish is free & no-op",S()["money"]==m2)
    # unaffordable
    ev("""async()=>{const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:1000})}""")
    pg.locator("[role=tab]", has_text="Floors").click(); pg.wait_for_timeout(400)
    pg.locator("button", has_text="White marble").first.click(); pg.wait_for_timeout(600)
    check("unaffordable: apply disabled", pg.locator("button:has-text('Buy & apply')").is_disabled())
    r=ev("""async()=>{const G=await import('/src/game/finishes.ts');return G.applyFinish('floor')}""")
    s=S(); check("unaffordable: direct call fails, no deduction/no change",(not r["ok"]) and s["money"]==1000 and s["by"][home0]["floor"]=="floor_tile",r)
    pg.click("button[aria-label='Cancel preview']"); pg.wait_for_timeout(400)
    # per-property isolation
    ev("""async()=>{const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:900000000});const H=await import('/src/game/housing.ts');H.acquireProperty('lagos.3-bedroom-flat-ikeja')}""")
    pg.wait_for_timeout(1500); s=S()
    check("other home has no finishes (no leak)", s["active"]!=home0 and not s["by"].get(s["active"]),s["by"])
    ev("""async()=>{const H=await import('/src/game/housing.ts');H.moveInto('%s')}"""%home0); pg.wait_for_timeout(800)
    check("first home remembers its finishes", S()["by"][home0]["floor"]=="floor_tile" and S()["by"][home0]["wall"]=="wall_stripes")
    raw=ev("()=>localStorage.getItem('nigerialife.finishes')")
    check("persisted to storage", raw and "floor_tile" in raw and "preview" not in raw)
    # independent bathroom fixtures in the bigger home
    ev("""async()=>{const H=await import('/src/game/housing.ts');H.moveInto('lagos.3-bedroom-flat-ikeja')}"""); pg.wait_for_timeout(800)
    res=ev("""async()=>{const B=await import('/src/game/buy.ts');const A=await import('/src/game/active.ts');const E=await import('/src/stores/editorStore.ts');const out={};
      for(const id of ['toilet','toilet','shower','bathtub','jacuzzi','washbasin']){ const ok=B.beginPlace(id); const d=E.useEditorStore.getState().draft; out[id+(out[id]!==undefined?'2':'')]=ok&&!!d&&d.valid?B.confirmDraft():'invalid'; }
      const h=A.getActiveHome(); const c={}; for(const p of h.placed) c[p.defId]=(c[p.defId]||0)+1; return {out,c}}""")
    print(res)
    c=res["c"]
    check("two toilets coexist",c.get("toilet",0)==2); check("bathtub and jacuzzi are separate items",c.get("bathtub")==1 and c.get("jacuzzi")==1)
    check("shower unaffected by tub/jacuzzi",c.get("shower")==1)
    check("no page errors",not [l for l in logs if l[0]=="PAGEERROR"],[l for l in logs if l[0]=="PAGEERROR"])
    b.close()
print("FAILS:",fails)
