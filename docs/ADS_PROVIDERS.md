# Billboard ad providers

`src/game/ads/providers.ts`. A billboard asks `resolveCreative()` what to show. Providers are tried in order and the first
available one with something to show wins: **advertiser** (a player's approved, running ad), **google** (off), **house**
(the board's default artwork, always available so a board is never blank).

## What works today
* Player ads (the existing Billboard Ads purchase flow) and the default artwork, through the provider layer.
* A provider that throws, returns nothing or is unavailable can never blank a board. Images are only drawn if they are small
  PNG/JPEG/WebP **data URLs** (no remote URLs, no SVG).
* `settings.adConsent` ('unknown' / 'granted' / 'denied') exists as the gate every third-party provider must check.

## What does NOT work, and why (checked, October 2026)
The goal was to put Google ads on the 3D billboards. After checking the documentation I could not find a supported way, so the
Google provider is **inert** and says why (`googleProvider.availability()`):

1. **AdMob** is described (by third-party summaries; confirm on Google's own pages) as a mobile-app SDK product for Android,
   iOS, Unity and Cocos2d-x. This project is a web app, so AdMob cannot be used in it. Google's publisher policy also says AdMob /
   Ad Manager in-app ads may sit next to a WebView only when the Google Mobile Ads SDK is in use.
2. **AdSense** ad units are elements in the page. Google's program policies (support.google.com/adsense/answer/1354736 and
   /answer/23921) forbid altering the ad code or changing the behaviour, targeting or delivery of the ads, and forbid covering
   ads with content. Drawing an ad onto a 3D texture would do exactly that, so it is not allowed without Google's written authorisation.
3. What may be possible, **unverified and needing Google's own sign-off**: (a) a normal ad unit shown in the page next to the
   game, not on the billboard; (b) Google Ad Manager with creatives you are allowed to fetch and render under its terms,
   fetched by your own server. Ask Google (or your account manager) before building either.

## Rules any real provider must follow
* Never put an ad-server secret, signing key or private token in this bundle. Only `VITE_` (public) variables are read, and the
  provider test fails if anything else appears. Secrets live on a server.
* Do not count impressions or simulate clicks. A real provider reports its own, through its own mechanism.
* Check `adConsent` before any third-party request. A real consent management platform (for example one that implements the IAB
  TCF) is required in regions that need one; the single flag here is only the gate, not a consent solution.
* Do not replace a real ad with user content unless the advertiser flow authorised it (that flow, its validation and expiry are unchanged).

## Adding a provider
Implement `AdProvider` (`availability`, `resolve`), add it to `PROVIDERS` and to `AD_PROVIDERS_CONFIG.order`. `npm run test:adsproviders` covers ordering, fallbacks, safety and the Google provider's inertness.
