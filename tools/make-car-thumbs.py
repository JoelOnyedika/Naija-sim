"""Renders each car's picture (public/models/cars/thumbs/<model>.webp) from its GLB, for the dealership cards.
Needs: the dev server running (`npm run dev`, port 5173), `pip install playwright pillow`, and a Chromium for Playwright.
Run from the project root: python3 tools/make-car-thumbs.py"""
import io, re, sys
from playwright.sync_api import sync_playwright
from PIL import Image
src = open('src/data/vehicles.ts', encoding='utf-8').read()
cars = re.findall(r"color: '(#[0-9A-Fa-f]{6})'.*?model: '(\w+)'", src)
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={"width": 800, "height": 500})
    for color, model in cars:
        pg.goto(f"http://127.0.0.1:5173/tools/thumbs/index.html?model={model}&color={color.replace('#', '%23')}")
        pg.wait_for_function("window.__done", timeout=120000)
        if pg.evaluate("window.__done") == 'error': sys.exit(f"could not load {model}")
        png = pg.locator('#c').screenshot(omit_background=True)
        im = Image.open(io.BytesIO(png)).convert('RGBA'); im = im.resize((640, 400), Image.LANCZOS)
        im.save(f"public/models/cars/thumbs/{model}.webp", quality=88, method=6); print("made", model)
    b.close()
