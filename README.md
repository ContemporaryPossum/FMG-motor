# FMG Falix Motor Garage — website

A static, no-build site for FMG Falix Motor Garage (346 & 347, Jalan Bandar Baru 4, Taman Bandar Baru, 08000 Sungai Petani, Kedah).

Every file sits in the root folder. There is no build step, so it deploys as-is.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The page: hero, services, dyno lab, builds, shop & booking, reviews, process, visit, footer |
| `policies.html` | Orders, deposits, pickup/delivery, returns/refunds and privacy (PDPA). Payment gateways ask for these. **Draft: confirm with the client** |
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

## Shop & dyno booking (payment links)

The "Book. Pay. Ride." section takes payments through **payment links**: hosted checkout pages from the payment gateway. No cart, server or database is needed, so the site stays flat on Cloudflare Pages.

**Parts grid on/off.** `shop.showProducts` in `data.js` is `false` for now, so only the dyno booking shows. The menu link reads "Book" and the section text talks about booking only. Set it to `true` once FMG's real ready-stock list and prices are in `shop.products`.

**Works before the gateway is ready.** While a `payLink` is empty, its button sends the order or booking on WhatsApp instead, and a note on the page says online payment is coming soon.

### Going live

1. **Apply to a gateway** that supports FPX online banking, for example ToyyibPay, Billplz, CHIP, Stripe (Malaysia) or Fiuu. You'll need:
   - the SSM registration (202103146452)
   - a bank account in the business name
   - the live site with `policies.html` reachable from the footer
2. **Create one payment link per item.** Products with fitment options (ECU, radiator, rims) need one link per option. Then add one link for the dyno deposit.
3. **Paste the links into `data.js`** under `shop`: `deposit.payLink`, each product's `payLink`, and each option's `payLink`.
4. **Set the gateway's success / redirect URL** to `https://YOUR-DOMAIN/#paid`. Customers who return there see a prompt that sends their order or booking details (with a reference like `FMG-K3Q7A`) on WhatsApp.
5. **Confirm the prices.** Make the prices in `data.js` match the payment links, then set `pricesConfirmed: true` to remove the "Sample" labels.
6. **Stripe only:** set `refParam: "client_reference_id"`. The booking or order reference then appears on the payment in the Stripe dashboard.

### How the dyno booking works

1. The customer picks a bike, a day and a slot. The day picker shows the next 14 days in Malaysia time and blocks closed days, based on `hours`.
2. They pay the deposit on the gateway's page.
3. They send the prefilled booking on WhatsApp.

The crew confirms the slot, so there's no double-booking risk from the website. The site doesn't check availability; it only collects the request and the deposit.

### Limitations of payment links

- **No cart:** one item per payment.
- **Manual records:** stock isn't tracked automatically, and orders live in the gateway dashboard and WhatsApp.
- **Delivery:** charges are arranged on WhatsApp, unless your gateway's link collects an address and a fixed shipping fee.
- **Prices exist in two places:** the gateway decides what's charged; `data.js` only decides what's displayed.

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

- **Shop items and prices are placeholders** (hidden while `showProducts` is `false`). The four products (Redleo ECU, Motul 7100, racing radiator, ESR rims), their prices, fitments, stock status and the RM 50 dyno deposit were chosen from what FMG posts about. Swap in their real ready-stock list. Photos can go in the root folder and be referenced as `image: "file.jpg"`.
- **Policies:** `policies.html` is a sensible draft. FMG must confirm the deposit cancellation window (24 h), return period (7 days), refund timing (14 business days) and delivery terms.
- **Booking slots:** the Morning and Afternoon slot times are assumptions. Edit `shop.deposit.slots`.

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
