from playwright.sync_api import sync_playwright
URL="http://127.0.0.1:5173/"
ARGS=["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl"]
def boot(p, w=390, h=844, mobile=True):
    b=p.chromium.launch(args=ARGS)
    ctx=b.new_context(viewport={"width":w,"height":h}, has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
    pg=ctx.new_page()
    logs=[]
    pg.on("console", lambda m: logs.append(("console."+m.type, m.text[:300])) if m.type in("error","warning") else None)
    pg.on("pageerror", lambda e: logs.append(("PAGEERROR", str(e)[:500])))
    return b,pg,logs
def seed(pg, life="lapo", phase="game"):
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("""async ([life,phase])=>{
      const A=await import('/src/stores/authStore.ts'); const C=await import('/src/stores/characterStore.ts');
      const L=await import('/src/game/life.ts'); const F=await import('/src/stores/flowStore.ts');
      A.useAuthStore.getState().signup('tester'+Math.floor(Math.random()*9999),'pass1234');
      C.useCharacterStore.getState().finish();
      if(life) L.startNewLife(life);
      F.useFlowStore.getState().go(phase);
    }""",[life,phase])
    pg.wait_for_timeout(2500)

def brightness(pg, path="/tmp/_b.png"):
    from PIL import Image, ImageStat
    pg.screenshot(path=path)
    return round(ImageStat.Stat(Image.open(path).convert("L")).mean[0],1)
