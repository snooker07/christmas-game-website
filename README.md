# Fundelits website

Responsive static website for fundelits.com. No JavaScript framework, database, cookies, analytics, external fonts, or package installation is needed. Every page is a real HTML document and works without JavaScript. JavaScript adds the Christmas journey and mobile navigation; support FAQs use native HTML details.

The home page now opens into a Christmas forest with scroll-driven WebGL particles that morph between a snowflake, a Christmas tree, and a gift. A pause control stops ambient rotation, twinkling, and snowfall while preserving scroll navigation. Reduced-motion preferences show the three scenes as static sections; without WebGL, SVG sculptures accompany the same scroll experience. Rendering pauses when the journey is offscreen or the browser tab is hidden. The game collection is reachable at any point through the header and skip link. Product, support, and privacy pages keep their normal layouts.

Homepage content is in `src/homepage.html`, with styling in `src/christmas.css` and motion in `src/christmas.js`. The Christmas forest was created with the built-in Imagegen tool; `src/media/christmas-forest.webp` is the compressed website asset. The original PNG and generation prompt are retained in the local Unity workspace's `Website/Art/` folder.

All product, support, privacy, and error pages share the homepage's dark navy palette through `src/night.css`. Christmas Breaker and Snow Push product pages also use `src/ambient.js` for sparse particles and faint constellations behind their content. Christmas Breaker uses warm gold and Snow Push uses icy blue. Scrolling changes the background's parallax. Each game page has a motion pause control; reduced-motion preferences disable the ambient layer, and rendering stops in hidden tabs. Support and privacy pages remain static for comfortable reading.

## Build and preview

From this directory, run `python build.py`, then `./start-preview.ps1` (or `python -m http.server 4173 --bind 127.0.0.1 --directory dist`). Open http://127.0.0.1:4173/ . The selected font and optimized artwork are retained under `src/media/`, so future builds do not need the Unity game repository or Pillow. Pillow is optional for the first image conversion.

Edit `site-config.json` for confirmed publisher details and store links. Shared content and layout live in `build.py`; CSS, mobile navigation, favicon, and decorative Christmas art live in `src/`. Snow Push artwork and development screenshots come from the game repository. Artwork is labeled separately from game previews. Christmas Breaker’s decorative illustration is not presented as a screenshot.

## Before publication for App Store use

The default build is a **review preview**, with `noindex` metadata and `robots.txt` disallowing indexing. It is not a completed Apple support/privacy submission while publisher information is missing. The production build intentionally refuses incomplete policy/contact configuration.

Confirm in `site-config.json`:

- `publisherName`: actual publisher/data-controller identity.
- `supportEmail`: `support@fundelits.com`, taken from the original website and confirmed by the owner for both games on 2026-10-11.
- `privacyEffectiveDate`: confirmed ISO date, such as `2026-10-11`.
- `supportRetention`: truthful retention/deletion practices for support emails, including the mail provider and any necessary obligations.
- `hostingPrivacyText`: Vercel hosting, actual server/security logs, recipients, and retention. The owner confirmed Vercel hosting and Namecheap domain registration on 2026-10-11; logging and retention practices are still unconfirmed.
- `christmasBreaker.privacyHtmlFile`: points to the retained Christmas Breaker privacy article (`src/christmas-breaker-privacy.html`), dated December 16, 2025. `privacyPracticesReviewed` remains false until the current Unity Ads and purchase behavior, retention/deletion information, and publisher details are checked. The original policy is preserved rather than replaced with Snow Push's offline policy.
- Verified App Store URLs, if available. Snow Push remains labeled “In development” until a store URL is supplied. Before release, update release-specific copy and replace Windows development previews with appropriate final images.

Run `python build.py --production` and `python verify.py`, then upload **the contents of `dist/`** to the web root of fundelits.com. Preserve the previous site's files and routes until migration is checked. Directory-index routing must serve `/snow-push/support/` and `/snow-push/privacy/`. The included `_headers` file is supported by some static hosts; configure equivalent response headers on other hosts. Configure `/404.html` as the actual 404 error document, rather than rewriting missing routes to the homepage.

After deployment, open each support/privacy URL without authentication, check HTTPS, test the support mailbox, and configure App Store Connect with:

- Marketing: https://fundelits.com/snow-push/
- Support: https://fundelits.com/snow-push/support/
- Privacy: https://fundelits.com/snow-push/privacy/

Add an accessible link to the final privacy policy **inside the Snow Push app** as well. This website change does not modify Unity code or complete App Store privacy declarations, signing, or device testing.

## Routes

`/`, `/christmas-breaker/`, `/christmas-breaker/support/`, `/christmas-breaker/privacy/`, `/snow-push/`, `/snow-push/support/`, `/snow-push/privacy/`, `/support/`, `/privacy/`, `/privacy/website/`, and `/404.html`.

## Deployment notes

### Existing Namecheap + Vercel setup

Keep the existing Vercel project that already owns fundelits.com. The owner identified its repository as `https://github.com/snooker07/christmas-game-website`. The source was read from main commit `3207264f139f76d26b7e0895497dcc00e0264009`. Its initial contents were `index.html` and three screenshots, without a Vercel configuration file. Namecheap is the domain registrar; the owner reports that Vercel hosts the website. If deployment stays in that same Vercel project and the domain connection is working, website updates do not require a DNS change.

The included `vercel.json` serves `dist/`, preserves trailing-slash URLs, and sets the website's HTTP security headers. `vercel-build.mjs` checks the pre-generated files, so no Python or image libraries are required on Vercel. Generated `dist/` files must be committed with the source after each local build. Keep Vercel's framework preset on **Other**. In `snooker07/christmas-game-website`, these files are at the repository root, so retain the Vercel project's existing root directory. The separate local Unity workspace keeps its working copy under `Website/fundelits`; that local folder name is not a Vercel setting for the website repository.

Use a Vercel **Preview** deployment while contact/policy information is pending. The production build check refuses pages marked as drafts or missing confirmed publisher inputs. When all details are confirmed, run `python build.py --production` and `python verify.py`, commit the updated `dist/` files, and deploy to the existing Vercel production project. Check all direct support/privacy routes and a nonexistent URL (which should return a genuine 404). Do not add a catch-all rewrite to the home page.

The integration carries forward the three Christmas Breaker screenshots, the privacy text, and the support email. The old source's iOS download button had no destination, so no App Store URL is fabricated. Old root links `/#game`, `/#gallery`, and `/#privacy` redirect to the matching Christmas Breaker page when JavaScript is available; visible fallback links appear at those anchors without JavaScript. Original `/screen1.png`, `/screen2.png`, and `/screen3.png` asset paths remain available. Keep the previous Vercel deployment available for rollback. Namecheap email-related DNS records must be preserved if DNS changes are ever needed.

The simpler static upload ZIP includes only `dist/` contents. The Vercel ZIP includes generated pages, source, and Vercel configuration, without credentials or Git metadata. Deployment to fundelits.com uses the existing Vercel project and GitHub repository.

Vercel reference: https://vercel.com/docs/project-configuration/vercel-json

Fonts are self-hosted. Lilita One’s license is included as `dist/assets/LilitaOne-OFL.txt`.
