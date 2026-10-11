# Browser tests (headless Chromium, real WebGL via software rendering)

Python + Playwright. `./run.sh test_build.py` starts a fresh `vite` dev server, runs the script, stops the server.
They drive the real app (and import the real Zustand stores through Vite) to check: Build/Buy placement, cancel/buy/exit
without a black screen, no double charge, New Life from the phone (twice in a row), loading overlay, automatic graphics tiers.
Software rendering runs at ~1.5 fps, so the perf test exercises the *degrade* path only; recovery to a higher tier needs a real GPU.
