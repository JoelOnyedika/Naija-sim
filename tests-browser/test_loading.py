from lib import *
with sync_playwright() as p:
    b,pg,logs=boot(p)
    seed(pg)
    ld=lambda: pg.evaluate("""async()=>{const U=await import('/src/stores/uiStore.ts');return U.useUiStore.getState().sceneLoading}""")
    pg.wait_for_timeout(8000); print("after entering game, overlay cleared:", not ld())
    # move house -> overlay shows then clears
    pg.evaluate("""async()=>{const M=await import('/src/stores/economyStore.ts');M.useEconomyStore.setState({money:500000000});const H=await import('/src/game/housing.ts');window.__r=H.acquireProperty('lagos.3-bedroom-flat-ikeja')}""")
    pg.wait_for_timeout(400); seen=ld(); print("overlay shown right after move:", seen)
    pg.wait_for_timeout(9000); print("overlay cleared after move:", not ld(), "| brightness", brightness(pg))
    print("house:", pg.evaluate("""async()=>{const P=await import('/src/stores/propertyStore.ts');return P.usePropertyStore.getState().activeId}"""))
    pg.screenshot(path="/tmp/ikeja.png")
    for l in logs:
        if l[0]=="PAGEERROR": print(l)
    b.close()
