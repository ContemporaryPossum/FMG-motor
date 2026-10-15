# FMG Falix Motor Garage — website

A static, no-build site for FMG Falix Motor Garage (346 & 347, Jalan Bandar Baru 4, Taman Bandar Baru, 08000 Sungai Petani, Kedah).

Every file sits in the root folder. There is no build step, so it deploys as-is.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page: hero, services, dyno lab, builds, reviews, process, visit, footer |
| `styles.css` | All styling. Colours, fonts and spacing are tokens at the top of the file |
| `data.js` | **Business info you'll edit**: phone, hours, links, stats, reviews, dyno and build-stage data |
| `main.js` | Lenis smooth scroll, GSAP scroll animations, preloader, gear/RPM HUD, cursor, menu |
| `background.js` | The animated vector background (rotor, airflow lines, dyno ridges, speed streaks, location ping) |
| `charts.js` | Interactive charts in the style of Bklit UI: dyno curve, radar, rings, hours heatmap |
| `favicon.svg`, `site.webmanifest` | Browser icon and install metadata |
| `_headers` | Cloudflare Pages security and cache headers |
| `404.html`, `robots.txt` | Not-found page and crawler rules |

Libraries load from jsDelivr, pinned to exact versions: GSAP 3.13.0 (with ScrollTrigger and SplitText) and Lenis 1.3.26. Fonts load from Google Fonts: Archivo and Geist Mono.

## Deploy

1. Create a new GitHub repository and upload all the files to its root. Drag them in on github.com: **Add file → Upload files**.
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `/`
4. Deploy. Each later push to GitHub redeploys automatically.
5. Optional: add the client's domain under **Custom domains**.

## Editing content

Almost everything a client asks to change lives in `data.js`:

- **Phone / WhatsApp:** `phoneDisplay`, `phoneTel`, `whatsapp`, `whatsappMessage`
- **Opening hours:** `hours`. Days are 0 = Sunday … 6 = Saturday, times are minutes from midnight. The "Open now" status and the heatmap update from this automatically, in Malaysia time.
- **Social and Shopee links:** `links`
- **Follower counts and Google rating:** `stats` and `reach`
- **Reviews:** `reviews`
- **Bikes in "On the bench":** `bench`
- **Dyno curves:** `dyno.models`
- **Build stages:** `stages`

## Confirm with the client before launch

- **Dyno numbers are samples.** Stock peaks follow published manufacturer figures; the tuned curves are indicative. Swap in real dyno sheets in `data.js` (the page labels them as sample curves until then).
- **Build-stage radar values** are indicative targets. Confirm the parts listed for each stage, and whether they want stages shown at all.
- **"On the bench" models:** Y16ZR, RSX150, Y15ZR and NVX come from their own posts. RS150R is an assumption.
- **Brands in the ticker:** Redleo, UMA Racing (they're in UMA's dealer list), ESR, Motul and FRP Performance. Confirm they're happy to show these.
- **Stats** (4.6★ from 41 Google reviews, 16.5K TikTok followers, 154.7K likes, 2,454 Instagram followers, 1,857 Facebook likes) were checked in October 2026.
- **Logo:** the site uses a typographic "FMG" wordmark. If they send their logo file, it can replace the `.brand-mark` text in `index.html`.
- **Photos:** none are used, because the design is all vector. Workshop photos can be added if wanted.
- **Social preview image:** add an `og-image.png` (1200×630) and an `og:image` meta tag for nicer link previews on WhatsApp and Facebook.

## Accessibility and motion

- Visitors with "reduce motion" turned on get native scrolling, a static background and every section in its final state.
- Charts have text labels for screen readers. The dyno chart is keyboard-operable with the arrow keys.
- The custom cursor and magnetic buttons only switch on for mouse users.
