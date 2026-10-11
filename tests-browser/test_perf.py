from lib import *
with sync_playwright() as p:
    b,pg,logs=boot(p)
    pg.on("console", lambda m: print("LOG", m.text[:120]) if "[graphics]" in m.text else None)
    seed(pg)
    tier=lambda: pg.evaluate("""async()=>{const Q=await import('/src/stores/qualityStore.ts');return Q.useQualityStore.getState().tier}""")
    hist=[]
    for i in range(14):
        pg.wait_for_timeout(2000); hist.append(tier())
    print("tier history (software GL ~1.5fps, expect steady drops then settle at 3):",hist)
    ok = hist[-1]==3 and all(b>=a for a,b in zip(hist,hist[1:]))
    print("PASS sustained-degradation drops monotonic to minimal" if ok else "FAIL")
    print("brightness",brightness(pg))
    b.close()
