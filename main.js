/* ==========================================================================
   FMG — main
   Lenis smooth scroll on GSAP's ticker (one RAF for scroll, ScrollTrigger and
   the canvas), preloader + hero choreography, scroll scenes, HUD, charts.
   Every feature is isolated so one failure never blanks the page.
   ========================================================================== */
(function () {
  "use strict";

  var D = window.FMG || {};
  var CH = window.FMGCharts;
  var BG = window.FMGBackground;
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var HAS = !!(window.gsap && window.ScrollTrigger);
  var SPLIT = HAS && !!window.SplitText;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  if (HAS) {
    gsap.registerPlugin(ScrollTrigger);
    if (SPLIT) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.warn("[FMG] " + name + " failed:", e); } }
  function waLink(text) { return "https://wa.me/" + D.whatsapp + "?text=" + encodeURIComponent(text || D.whatsappMessage || ""); }

  var DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* ------------------------------------------------------------------------
     1. Content from data.js
     ------------------------------------------------------------------------ */
  safe("links", function () {
    var L = D.links || {};
    $$("[data-link]").forEach(function (a) {
      var k = a.getAttribute("data-link");
      if (k === "whatsapp") a.href = waLink(a.getAttribute("data-wa"));
      else if (k === "tel") a.href = "tel:" + D.phoneTel;
      else if (L[k]) a.href = L[k];
    });
    $$("[data-year]").forEach(function (e) { e.textContent = new Date().getFullYear(); });
  });

  safe("status", function () {
    if (!CH) return;
    function info() {
      var now = CH.klNow(D.timezone), H = D.hours, today = H[now.day];
      if (today && now.mins >= today[0] && now.mins < today[1]) {
        var left = today[1] - now.mins;
        return { open: true, text: left <= 60 ? "Open · closes in " + left + " min" : "Open now · until " + CH.fmtTime(today[1]) };
      }
      for (var i = 0; i < 8; i++) {
        var d = (now.day + i) % 7, h = H[d];
        if (!h) continue;
        if (i === 0) { if (now.mins < h[0]) return { open: false, text: "Closed · opens today " + CH.fmtTime(h[0]) }; continue; }
        return { open: false, text: "Closed · opens " + (i === 1 ? "tomorrow" : DAY_LONG[d]) + " " + CH.fmtTime(h[0]) };
      }
      return { open: false, text: "Closed" };
    }
    function render() {
      var s = info();
      $$("[data-status]").forEach(function (el) {
        el.classList.toggle("is-open", s.open);
        var t = $("[data-status-text]", el);
        if (t) t.textContent = s.text;
      });
    }
    render();
    setInterval(render, 60000);
  });

  safe("reviews", function () {
    var stack = $("[data-review-stack]"), community = $("[data-community]");
    if (!stack || !D.reviews) return;
    D.reviews.forEach(function (r) {
      var fig = document.createElement("figure");
      fig.className = "review-card card";
      fig.innerHTML = "<blockquote>" + esc(r.quote) + "</blockquote>" +
        '<figcaption><span class="avatar" aria-hidden="true">' + esc(r.name.charAt(0)) + "</span>" +
        "<span><b>" + esc(r.name) + '</b><br><span class="fine">' + esc(r.meta) + "</span></span></figcaption>";
      stack.insertBefore(fig, community);
    });
  });

  safe("bench", function () {
    var list = $("[data-bench]");
    if (!list) return;
    var rows = (D.bench || []).concat([{ model: "Your bike?", make: "", note: "Any kapcai or 150 — ask the crew", ask: true }]);
    rows.forEach(function (b) {
      var li = document.createElement("li");
      var msg = b.ask ? "Hi FMG, can you work on my bike? It's a " : "Hi FMG, I ride a " + b.make + " " + b.model + " and I'm interested in " + b.note.toLowerCase() + ".";
      li.innerHTML = '<a class="bench-row' + (b.ask ? " is-ask" : "") + '" href="' + esc(waLink(msg)) + '" target="_blank" rel="noopener">' +
        '<span class="bench-name">' + esc(b.model) + (b.make ? "<small>" + esc(b.make) + "</small>" : "") + "</span>" +
        '<span class="bench-note">' + esc(b.note) + "</span>" +
        '<span class="bench-go" aria-hidden="true"><svg class="icon"><use href="#i-arrow"/></svg></span></a>';
      list.appendChild(li);
    });
  });

  safe("fuelmap", function () {
    $$("[data-fuelmap]").forEach(function (grid) {
      for (var r = 0; r < 8; r++) {
        for (var c = 0; c < 12; c++) {
          var v = clamp(0.12 + (1 - r / 7) * 0.5 + Math.sin((c / 11) * Math.PI) * 0.32 + Math.sin(c * 1.7 + r) * 0.04, 0, 1);
          var g = Math.round(181 - (181 - 74) * v), b = Math.round(71 - (71 - 28) * v);
          var cell = document.createElement("i");
          cell.style.background = "rgba(255," + g + "," + b + "," + (0.12 + v * 0.85).toFixed(2) + ")";
          grid.appendChild(cell);
        }
      }
    });
  });

  safe("tach", function () {
    var t = $("[data-tach]");
    if (!t) return;
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("i");
      if (i >= 10) s.className = i >= 12 ? "red" : "warn";
      t.appendChild(s);
    }
  });

  /* ------------------------------------------------------------------------
     1b. Shop & dyno booking — payment links (config in data.js → shop)
     ------------------------------------------------------------------------ */
  var SHOP = D.shop || null;
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function money(n) { return "RM " + Number(n).toLocaleString("en-MY", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function newRef() { return "FMG-" + (Date.now().toString(36).slice(-3) + Math.random().toString(36).slice(2, 4)).toUpperCase(); }
  function withRef(link, ref) {
    if (!link || !SHOP || !SHOP.refParam || !ref) return link;
    return link + (link.indexOf("?") > -1 ? "&" : "?") + encodeURIComponent(SHOP.refParam) + "=" + encodeURIComponent(ref);
  }
  function remember(o) { try { localStorage.setItem("fmg:last", JSON.stringify(o)); } catch (e) {} }
  function recall() { try { return JSON.parse(localStorage.getItem("fmg:last") || "null"); } catch (e) { return null; } }
  function klToday() {
    try {
      var p = {};
      new Intl.DateTimeFormat("en-CA", { timeZone: D.timezone || "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return [+p.year, +p.month, +p.day];
    } catch (e) { var d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; }
  }
  function fmtISO(iso, long) {
    var d = new Date(iso + "T00:00:00Z");
    return (long ? DAY_LONG[d.getUTCDay()] : WD[d.getUTCDay()]) + " " + d.getUTCDate() + " " + MON[d.getUTCMonth()] + (long ? " " + d.getUTCFullYear() : "");
  }

  /* Vector product drawings (used when a product has no photo) */
  var ART = (function () {
    var o = '<svg viewBox="0 0 160 120" aria-hidden="true">', c = "</svg>";
    function d(attrs, cls) { return '<path class="draw' + (cls ? " " + cls : "") + '" pathLength="1" d="' + attrs + '"/>'; }
    var spokes = "";
    for (var k = 0; k < 5; k++) {
      [-7, 7].forEach(function (off) {
        var a1 = (k * 72 + off * 0.6) * Math.PI / 180, a2 = (k * 72 + off) * Math.PI / 180;
        spokes += "M" + (80 + Math.cos(a1) * 10).toFixed(1) + " " + (60 + Math.sin(a1) * 10).toFixed(1) +
          "L" + (80 + Math.cos(a2) * 37).toFixed(1) + " " + (60 + Math.sin(a2) * 37).toFixed(1);
      });
    }
    var fins = "";
    for (var x = 40; x <= 120; x += 8) fins += "M" + x + " 34V90";
    return {
      ecu: o + '<rect class="draw" pathLength="1" x="36" y="30" width="88" height="60" rx="8"/>' +
        d("M36 44H22M36 52H22M36 60H22M36 68H22M36 76H22") +
        '<rect class="draw" pathLength="1" x="50" y="44" width="42" height="26" rx="3"/>' + d("M57 53H85M57 61H77") +
        '<circle class="draw accent" pathLength="1" cx="108" cy="46" r="4"/><circle class="draw" pathLength="1" cx="108" cy="72" r="7"/>' +
        d("M108 67V72") + d("M124 42H138V78H124") + c,
      oil: o + d("M66 30H90V40L108 50V100A6 6 0 0 1 102 106H58A6 6 0 0 1 52 100V52L66 42Z") +
        '<rect class="draw" pathLength="1" x="68" y="16" width="20" height="14" rx="2"/>' +
        d("M108 58H116A6 6 0 0 1 122 64V78A6 6 0 0 1 116 84H108") +
        d("M52 76C60 71 68 81 76 76S92 71 108 76", "accent") + d("M62 90H96") + c,
      radiator: o + '<rect class="draw" pathLength="1" x="32" y="30" width="96" height="64" rx="4"/>' + d(fins) +
        d("M32 40H24A6 6 0 0 0 18 46V58") + d("M128 84H136A6 6 0 0 1 142 90V102") +
        '<circle class="draw accent" pathLength="1" cx="116" cy="20" r="6"/>' + d("M116 26V30") + c,
      rim: o + '<g class="rim-spin"><circle class="draw" pathLength="1" cx="80" cy="60" r="46"/>' +
        '<circle class="draw" pathLength="1" cx="80" cy="60" r="38"/><circle class="draw" pathLength="1" cx="80" cy="60" r="10"/>' +
        d(spokes) + '<circle class="draw accent" pathLength="1" cx="' + (80 + Math.cos(0.63) * 42).toFixed(1) + '" cy="' + (60 + Math.sin(0.63) * 42).toFixed(1) + '" r="2.5"/></g>' + c,
    };
  })();

  safe("shop-note", function () {
    var note = $("[data-shop-note]");
    if (!note || !SHOP) return;
    var anyLink = !!SHOP.deposit.payLink || SHOP.products.some(function (p) {
      return p.payLink || (p.options || []).some(function (o) { return o.payLink; });
    });
    var bits = [];
    if (!anyLink) bits.push("Online payment is coming soon. Until then, buttons send your order or booking on WhatsApp.");
    if (!SHOP.pricesConfirmed) bits.push("Prices shown are samples; the crew confirms the final price.");
    if (bits.length) { note.textContent = bits.join(" "); note.hidden = false; }
  });

  safe("products", function () {
    var box = $("[data-products]");
    if (!box || !SHOP) return;
    SHOP.products.forEach(function (p) {
      var opts = p.options && p.options.length ? p.options : null;
      var el = document.createElement("article");
      el.className = "prod card";
      var pre = p.stock === "preorder";
      var html =
        '<div class="prod-art">' + (p.image ? '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">' : (ART[p.art] || "")) + "</div>" +
        '<div class="prod-top"><span class="mono prod-tag">' + esc(p.tag) + '</span><span class="stock' + (pre ? " is-pre" : "") + '"><i></i>' + (pre ? "Pre-order" : "Ready stock") + "</span></div>" +
        '<h3 class="prod-name">' + esc(p.name) + "</h3>" +
        '<p class="prod-blurb">' + esc(p.blurb) + "</p>";
      if (opts) {
        html += '<fieldset class="opts"><legend class="mono">Fits</legend><div class="pick sm">' +
          opts.map(function (o, i) {
            return '<label class="chip-radio"><input type="radio" name="opt-' + esc(p.id) + '" value="' + i + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(o.label) + "</span></label>";
          }).join("") + "</div></fieldset>";
      } else html += "<div></div>";
      html += '<div class="prod-foot"><span class="price">' + money(p.price) + (SHOP.pricesConfirmed ? "" : "<small>Sample</small>") + "</span>" +
        '<a class="btn btn-primary" data-buy target="_blank" rel="noopener"></a>' +
        '<a class="prod-ask" data-ask target="_blank" rel="noopener">Ask about fitting <svg class="icon"><use href="#i-arrow"/></svg></a></div>';
      el.innerHTML = html;
      box.appendChild(el);

      var buy = $("[data-buy]", el), ask = $("[data-ask]", el), label = p.name, link = "";
      function update() {
        var c = opts ? $("input:checked", el) : null, o = opts ? opts[c ? +c.value : 0] : null;
        label = p.name + (o ? " (" + o.label + ")" : "");
        link = (o && o.payLink) || p.payLink || "";
        if (link) {
          buy.innerHTML = '<svg class="icon"><use href="#i-lock"/></svg> ' + (pre ? "Pre-order now" : "Buy now");
          buy.href = link;
        } else {
          buy.innerHTML = '<svg class="icon"><use href="#i-chat"/></svg> ' + (pre ? "Pre-order on WhatsApp" : "Order on WhatsApp");
          buy.href = waLink("Hi FMG, I'd like to " + (pre ? "pre-order" : "order") + ": " + label + " (" + money(p.price) + "). Is it available?");
        }
        buy.setAttribute("aria-label", buy.textContent.trim() + ": " + label);
        ask.href = waLink("Hi FMG, a question about the " + label + ": ");
      }
      el.addEventListener("change", update);
      buy.addEventListener("click", function () {
        if (!link) return;
        var ref = newRef();
        buy.href = withRef(link, ref);
        remember({ kind: "order", ref: ref, text: "Hi FMG, I've just paid online for: " + label + " (ref " + ref + "). I'd like to collect it / have it delivered to: " });
      });
      update();
    });
  });

  safe("booking", function () {
    var form = $("[data-book-form]");
    if (!form || !SHOP || !SHOP.deposit) return;
    var dep = SHOP.deposit, ref = newRef();
    var pay = $("[data-book-pay]"), wa = $("[data-book-wa]"), sum = $("[data-book-summary]"), sumBox = sum.parentNode;
    var steps = $$("[data-book-steps] li");
    $("[data-deposit-amount]").textContent = money(dep.price);
    $("[data-deposit-note]").textContent = dep.note;
    $("[data-book-ref]").textContent = "Ref " + ref;

    var bikes = (D.bench || []).map(function (b) { return b.model; }).concat(["Other"]);
    $('[data-pick="bike"]').innerHTML = bikes.map(function (b) {
      return '<label class="chip-radio"><input type="radio" name="bike" value="' + esc(b) + '"><span>' + esc(b) + "</span></label>";
    }).join("");
    $('[data-pick="slot"]').innerHTML = dep.slots.map(function (s, i) {
      return '<label class="chip-radio"><input type="radio" name="slot" value="' + esc(s.key) + '"' + (i === 0 ? " checked" : "") + "><span>" + esc(s.label) + " <small>" + esc(s.time) + "</small></span></label>";
    }).join("");

    var t = klToday(), first = true, cells = "";
    for (var i = 1; i <= (dep.days || 14); i++) {
      var dt = new Date(Date.UTC(t[0], t[1] - 1, t[2] + i)), wd = dt.getUTCDay(), open = !!D.hours[wd];
      var iso = dt.toISOString().slice(0, 10);
      cells += '<label class="day-cell"><input type="radio" name="day" value="' + iso + '"' + (open ? "" : " disabled") + (open && first ? " checked" : "") +
        ' aria-label="' + fmtISO(iso, true) + (open ? "" : ", closed") + '"><span><small>' + WD[wd] + "</small><b>" + dt.getUTCDate() + "</b><small>" + (open ? MON[dt.getUTCMonth()] : "Shut") + "</small></span></label>";
      if (open) first = false;
    }
    $('[data-pick="day"]').innerHTML = cells;

    if (!dep.payLink) {
      pay.hidden = true;
      wa.classList.replace("btn-ghost", "btn-primary");
      $("span", wa).textContent = "Request this slot on WhatsApp";
      steps[1].lastChild.textContent = "Send the request on WhatsApp";
      steps[2].lastChild.textContent = "Pay the deposit once the crew confirms";
    } else {
      $("span", pay).textContent = "Pay " + money(dep.price) + " deposit";
    }

    var paid = false, msg = "";
    function read() {
      var f = new FormData(form), slotKey = f.get("slot"), slot = null;
      dep.slots.forEach(function (s) { if (s.key === slotKey) slot = s; });
      return { bike: f.get("bike"), day: f.get("day"), slot: slot, mods: String(f.get("mods") || "").trim() };
    }
    function update() {
      var s = read(), ok = !!(s.bike && s.day && s.slot);
      sumBox.classList.remove("is-error");
      sum.textContent = ok ? s.bike + " · " + fmtISO(s.day) + " · " + s.slot.label : "Pick your bike to continue";
      msg = "Hi FMG, I'd like to book a dyno session." +
        "\nBike: " + (s.bike || "-") +
        "\nDay: " + (s.day ? fmtISO(s.day, true) : "-") +
        "\nSlot: " + (s.slot ? s.slot.label + " (" + s.slot.time + ")" : "-") +
        (s.mods ? "\nCurrent mods: " + s.mods : "") +
        "\nRef: " + ref +
        (dep.payLink ? (paid ? "\nDeposit: paid online (" + money(dep.price) + ")" : "") : "\nDeposit: " + money(dep.price) + ", please send payment details");
      wa.href = waLink(msg);
      if (dep.payLink) pay.href = withRef(dep.payLink, ref);
      [pay, wa].forEach(function (a) { a.setAttribute("aria-disabled", String(!ok)); });
      steps.forEach(function (li, i) {
        var state = !ok ? (i === 0 ? "now" : "") : dep.payLink ? (paid ? (i < 2 ? "done" : "now") : (i === 0 ? "done" : i === 1 ? "now" : "")) : (i === 0 ? "done" : i === 1 ? "now" : "");
        li.classList.toggle("is-done", state === "done");
        li.classList.toggle("is-now", state === "now");
      });
      return ok;
    }
    form.addEventListener("change", update);
    form.addEventListener("input", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    [pay, wa].forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (update()) return;
        e.preventDefault();
        sumBox.classList.add("is-error");
        sum.textContent = "Pick your bike first";
        var firstBike = $('input[name="bike"]', form);
        if (firstBike) firstBike.focus();
      });
    });
    pay.addEventListener("click", function () {
      if (pay.getAttribute("aria-disabled") === "true") return;
      paid = true;
      update();
      remember({ kind: "booking", ref: ref, text: msg });
      pay.classList.replace("btn-primary", "btn-ghost");
      wa.classList.replace("btn-ghost", "btn-primary");
    });
    update();
  });

  /* Back from the payment page (gateway success URL → …/#paid) */
  safe("paid-toast", function () {
    var toast = $("[data-toast]");
    if (!toast || location.hash !== "#paid") return;
    var last = recall();
    $("[data-toast-body]", toast).textContent = last
      ? (last.kind === "booking" ? "Send your booking details so the crew can lock in your slot." : "Send your order details so the crew can get it ready.") + " Ref " + last.ref + "."
      : "Send your receipt on WhatsApp so the crew can match your payment.";
    $("[data-toast-wa]", toast).href = waLink(last ? last.text : "Hi FMG, I've just paid online. Here's my receipt: ");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    function show() { toast.hidden = false; if (window.gsap && !RM) gsap.from(toast, { y: 30, autoAlpha: 0, duration: 0.7, ease: "expo.out" }); }
    setTimeout(show, $(".preloader") && !RM ? 2800 : 300);
    $("[data-toast-close]", toast).addEventListener("click", function () { toast.hidden = true; });
  });

  /* ------------------------------------------------------------------------
     2. Lenis smooth scroll (darkroom.engineering) on GSAP's ticker
     ------------------------------------------------------------------------ */
  var lenis = null;
  safe("lenis", function () {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.1 });
    if (HAS) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  });

  /* Scroll state shared by HUD, marquee, nav, background */
  var vel = 0, dir = 1;
  safe("scroll-state", function () {
    var nav = $("[data-nav]"), bar = $(".progress i"), hudEl = $(".hud");
    var hidden = false, scrolled = false, hudOn = false, lastY = window.scrollY;
    function onScroll(y, v) {
      vel = v;
      if (Math.abs(v) > 0.2) dir = v > 0 ? 1 : -1;
      if (BG) { BG.setScroll(y); BG.setVelocity(v); }
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ")";
      var s = y > 40;
      if (s !== scrolled) { scrolled = s; nav.classList.toggle("is-scrolled", s); }
      var hOn = y > window.innerHeight * 0.6 && y < max - window.innerHeight * 0.4;
      if (hudEl && hOn !== hudOn) { hudOn = hOn; hudEl.classList.toggle("is-on", hOn); }
      var h = hidden;
      if (y < 320 || document.body.classList.contains("menu-open")) h = false;
      else if (v > 1.5) h = true;
      else if (v < -1.5) h = false;
      if (h !== hidden) { hidden = h; nav.classList.toggle("is-hidden", h); }
    }
    if (lenis) lenis.on("scroll", function (e) { onScroll(e.scroll, e.velocity); });
    else window.addEventListener("scroll", function () { var y = window.scrollY; onScroll(y, y - lastY); lastY = y; }, { passive: true });
    if (!lenis && HAS) gsap.ticker.add(function () { vel *= 0.9; });
    onScroll(window.scrollY, 0);
  });

  /* Anchors, back-to-top, mobile menu */
  var closeMenu = function () {};
  safe("menu", function () {
    var btn = $(".menu-btn"), mm = $("#mobile-menu");
    if (!btn || !mm) return;
    function open() {
      document.body.classList.add("menu-open");
      btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Close menu");
      mm.setAttribute("aria-hidden", "false");
      if (lenis) lenis.stop();
    }
    closeMenu = function () {
      if (!document.body.classList.contains("menu-open")) return;
      document.body.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Open menu");
      mm.setAttribute("aria-hidden", "true");
      if (lenis) lenis.start();
    };
    btn.addEventListener("click", function () { document.body.classList.contains("menu-open") ? closeMenu() : open(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  });

  safe("anchors", function () {
    var expo = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
    function go(target) {
      if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: expo });
      else if (typeof target === "number") window.scrollTo({ top: target, behavior: RM ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
    }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id.length < 2) return;
        var t = document.getElementById(id.slice(1));
        if (!t) return;
        e.preventDefault();
        closeMenu();
        go(id === "#top" ? 0 : t);
        if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
        setTimeout(function () { t.focus({ preventScroll: true }); }, 50);
      });
    });
    $$("[data-to-top]").forEach(function (b) { b.addEventListener("click", function () { go(0); }); });
  });

  /* ------------------------------------------------------------------------
     3. Charts (Bklit-style)
     ------------------------------------------------------------------------ */
  var charts = {};

  safe("dyno", function () {
    var host = $("#dyno-chart");
    if (!host || !CH || !D.dyno) return;
    var ro = {};
    $$("[data-ro]").forEach(function (el) { ro[el.getAttribute("data-ro")] = el; });
    var shown = { stock: 0, tuned: 0, gain: 0 };
    function setNum(key, v, unit, sign) {
      var el = ro[key];
      var write = function (x) {
        if (key === "gain") el.innerHTML = (x >= 0 ? "+" : "") + x.toFixed(1) + "<small>%</small>";
        else el.innerHTML = x.toFixed(1) + "<small>" + unit + "</small>";
      };
      if (HAS && !RM) {
        var o = { v: shown[key] };
        gsap.to(o, { v: v, duration: 0.9, ease: "expo.out", overwrite: true, onUpdate: function () { write(o.v); } });
      } else write(v);
      shown[key] = v;
    }
    function onChange(info) {
      var u = info.metric === "hp" ? "hp" : "Nm";
      setNum("stock", info.stock.v, u);
      setNum("tuned", info.tuned.v, u);
      setNum("gain", info.gainPct);
      ro["stock-rpm"].textContent = "@ " + info.stock.rpm.toLocaleString("en-MY") + " rpm · " + info.model.label;
      ro["tuned-rpm"].textContent = "@ " + info.tuned.rpm.toLocaleString("en-MY") + " rpm";
      ro["gain-abs"].textContent = "+" + info.gain.toFixed(1) + " " + u + " at peak";
      host.setAttribute("aria-label", info.model.label + " dyno chart, " + (info.metric === "hp" ? "power" : "torque") +
        ". Stock peak " + info.stock.v.toFixed(1) + " " + u + ", FMG tune peak " + info.tuned.v.toFixed(1) + " " + u +
        ". Use left and right arrow keys to step through rpm.");
    }
    var models = D.dyno.models, modelsBox = $("[data-dyno-models]");
    Object.keys(models).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = k; b.setAttribute("aria-pressed", String(k === D.dyno.initial));
      b.addEventListener("click", function () {
        $$("button", modelsBox).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        charts.dyno.setModel(k);
      });
      modelsBox.appendChild(b);
    });
    charts.dyno = new CH.DynoChart(host, { models: models, initial: D.dyno.initial, onChange: onChange });
    $$("[data-dyno-metric] button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-dyno-metric] button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        charts.dyno.setMetric(b.getAttribute("data-metric"));
      });
    });
    $$("[data-dyno-legend] button").forEach(function (b) {
      b.addEventListener("click", function () {
        var on = b.getAttribute("aria-pressed") !== "true";
        var other = $$("[data-dyno-legend] button").filter(function (x) { return x !== b; })[0];
        if (!on && other.getAttribute("aria-pressed") !== "true") return; // keep one series visible
        b.setAttribute("aria-pressed", String(on));
        charts.dyno.toggle(b.getAttribute("data-series"), on);
      });
    });
  });

  safe("radar", function () {
    var host = $("#radar"), st = D.stages;
    if (!host || !CH || !st) return;
    var tabs = $("[data-stage-tabs]"), name = $("[data-stage-name]"), blurb = $("[data-stage-blurb]"), parts = $("[data-stage-parts]");
    charts.radar = new CH.RadarChart(host, { metrics: st.metrics, base: st.stock, values: st.options[st.initial].values });
    function copy(key, animate) {
      var o = st.options[key];
      name.textContent = o.label;
      blurb.textContent = o.blurb;
      parts.innerHTML = o.parts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("");
      if (animate && HAS && !RM) gsap.from([blurb].concat($$("li", parts)), { y: 12, autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: "power3.out" });
    }
    Object.keys(st.options).forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = st.options[k].label; b.setAttribute("aria-pressed", String(k === st.initial));
      b.addEventListener("click", function () {
        $$("button", tabs).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        charts.radar.set(st.options[k].values);
        copy(k, true);
      });
      tabs.appendChild(b);
    });
    copy(st.initial, false);
  });

  safe("ring", function () {
    var host = $("#ring");
    if (!host || !CH || !D.reach) return;
    charts.ring = new CH.RingChart(host, { items: D.reach, max: 20000, legendHost: $("[data-ring-legend]"), centerLabel: "Followers" });
  });

  safe("hours", function () {
    var host = $("#hours");
    if (!host || !CH) return;
    charts.hours = new CH.HoursHeat(host, { hours: D.hours, tz: D.timezone });
  });

  /* Race line: rebuilt in pixel space so the stroke stays uniform */
  safe("raceline", function () {
    var svg = $(".race-line");
    if (!svg) return;
    var paths = $$("path", svg);
    var T = [[50, 0], [92, 90], [92, 160], [50, 250], [8, 410], [50, 500], [92, 660], [50, 750], [8, 910], [50, 1000]];
    function build() {
      var w = svg.clientWidth, h = svg.clientHeight;
      if (!w || !h) return;
      var p = T.map(function (q) { return [(q[0] / 100) * w, (q[1] / 1000) * h]; });
      var f = function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); };
      var d = "M" + f(p[0]) + "C" + f(p[1]) + " " + f(p[2]) + " " + f(p[3]) + "S" + f(p[4]) + " " + f(p[5]) + "S" + f(p[6]) + " " + f(p[7]) + "S" + f(p[8]) + " " + f(p[9]);
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      paths.forEach(function (pa) { pa.setAttribute("d", d); });
    }
    build();
    if (window.ResizeObserver) new ResizeObserver(build).observe(svg);
  });

  /* ------------------------------------------------------------------------
     4. Without GSAP or with reduced motion: show final states and stop here
     ------------------------------------------------------------------------ */
  function revealAllStatic() {
    var pre = $(".preloader");
    if (pre) pre.remove();
    Object.keys(charts).forEach(function (k) { safe("reveal " + k, function () { charts[k].reveal(); }); });
    $$(".stars").forEach(function (s) { s.style.setProperty("--fill", (D.stats.googleRating / 5 * 100) + "%"); });
    $$(".step").forEach(function (s) { s.classList.add("is-active"); });
    var map = $(".visit-map");
    if (map) loadMap(map);
    if (HAS && BG) {
      $$("[data-scene]").forEach(function (el) {
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: function (self) { if (self.isActive) BG.setScene(el.getAttribute("data-scene")); } });
      });
    }
  }

  function loadMap(box) {
    if (!box || box.querySelector("iframe") || !D.links || !D.links.mapEmbed) return;
    var f = document.createElement("iframe");
    f.src = D.links.mapEmbed;
    f.title = "Map: FMG Falix Motor Garage, Jalan Bandar Baru 4, Sungai Petani";
    f.loading = "lazy";
    f.referrerPolicy = "no-referrer-when-downgrade";
    f.setAttribute("allowfullscreen", "");
    box.insertBefore(f, box.querySelector(".map-tag"));
  }

  if (!HAS || RM) {
    revealAllStatic();
    return;
  }

  /* ------------------------------------------------------------------------
     5. Motion layer
     ------------------------------------------------------------------------ */
  var hud = $(".hud");

  function fontsReady() {
    var f = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.race([f, new Promise(function (r) { setTimeout(r, 2000); })]);
  }

  /* Preloader → hero */
  safe("intro", function () {
    var pre = $(".preloader");
    var heroChars = [];
    var heroLines = $$(".hero-line");
    // Split once fonts are in (the preloader covers the hero until then)
    function splitHero() {
      if (SPLIT) {
        $$(".hero-split").forEach(function (el) {
          var s = SplitText.create(el, { type: "chars", charsClass: "char" });
          heroChars = heroChars.concat(s.chars);
        });
      } else heroChars = $$(".hero-split");
      gsap.set(heroChars, { yPercent: 118 });
    }
    gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 26 });

    function heroIn() {
      var tl = gsap.timeline();
      tl.to(heroChars, { yPercent: 0, duration: 1.25, ease: "expo.out", stagger: 0.026 })
        .fromTo(".hero-foot", { borderTopColor: "rgba(244,237,229,0)" }, { borderTopColor: "rgba(244,237,229,0.12)", duration: 1 }, 0.3)
        .to("[data-hero-fade]", { autoAlpha: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.09 }, 0.5)
        .from(".scroll-cue", { autoAlpha: 0, duration: 0.8 }, 0.9);
      return tl;
    }

    if (!pre) { fontsReady().then(function () { splitHero(); heroIn(); }); return; }
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);

    var count = { v: 0 }, num = $(".pre-count", pre), bar = $(".pre-bar i", pre), letters = $$(".pre-word span", pre);
    gsap.set(letters, { y: 0, yPercent: 110 });
    var load = gsap.timeline();
    load.to(letters, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.07 }, 0.05)
      .to(count, { v: 100, duration: 1.35, ease: "power2.inOut", onUpdate: function () { num.textContent = String(Math.round(count.v)).padStart(3, "0"); } }, 0)
      .to(bar, { scaleX: 1, duration: 1.35, ease: "power2.inOut" }, 0);
    var loaded = new Promise(function (res) { load.eventCallback("onComplete", res); });

    fontsReady().then(splitHero);
    Promise.all([fontsReady(), loaded]).then(function () {
      var out = gsap.timeline({ onComplete: function () { pre.remove(); } });
      out.to(letters, { yPercent: -110, duration: 0.55, ease: "expo.in", stagger: 0.04 })
        .to(pre, { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "expo.inOut" }, 0.3)
        .add(heroIn(), 0.8)
        .add(function () { if (lenis) lenis.start(); ScrollTrigger.refresh(); }, 0.9);
    });

    // Hero scroll-out: lines drift apart, foot lifts away
    gsap.to(heroLines[0], { xPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(heroLines[1], { xPercent: 7, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-title", { yPercent: -28, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero-foot", { y: -80, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "20% top", end: "85% top", scrub: true } });
  });

  /* Headline line reveals */
  fontsReady().then(function () { safe("titles", function () {
    $$("[data-reveal]").forEach(function (el) {
      if (SPLIT) {
        SplitText.create(el, {
          type: "lines", mask: "lines", autoSplit: true, linesClass: "line",
          onSplit: function (self) {
            return gsap.from(self.lines, { yPercent: 112, duration: 1.15, ease: "expo.out", stagger: 0.09, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
          },
        });
      } else {
        gsap.from(el, { y: 50, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      }
    });
  });

  /* Manifesto: words light up as you scroll */
  safe("manifesto", function () {
    var m = $("[data-manifesto]");
    if (!m) return;
    var targets = SPLIT ? SplitText.create(m, { type: "words", wordsClass: "w" }).words : [m];
    gsap.fromTo(targets, { opacity: 0.13 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: m, start: "top 78%", end: "bottom 45%", scrub: true },
    });
  });
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });

  safe("fade-ups", function () {
    $$("[data-fade-up]").forEach(function (el) {
      gsap.from(el, { y: 48, autoAlpha: 0, duration: 1.05, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    });
    gsap.from(".manifesto-sign", { x: -30, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".manifesto-sign", start: "top 92%", once: true } });
  });

  /* Marquee: speed and direction follow the scroll, skews with velocity */
  safe("marquee", function () {
    $$("[data-marquee]").forEach(function (row) {
      var track = $(".marquee-track", row);
      var originals = $$(".marquee-item", track);
      var base = parseFloat(row.getAttribute("data-marquee")) || -1;
      function w0() { return originals.reduce(function (a, e) { return a + e.offsetWidth; }, 0); }
      var guard = 0;
      while (track.scrollWidth < w0() * 2 + row.clientWidth && guard++ < 8) {
        originals.forEach(function (it) { var c = it.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); });
      }
      var width = w0(), x = 0;
      window.addEventListener("resize", function () { width = w0(); });
      var setX = gsap.quickSetter(track, "x", "px"), setSkew = gsap.quickSetter(track, "skewX", "deg");
      var skew = 0;
      gsap.ticker.add(function (t, dt) {
        var boost = 1 + Math.min(Math.abs(vel) * 0.32, 12);
        x += base * dir * 46 * boost * (Math.min(dt, 50) / 1000);
        if (x <= -width) x += width;
        if (x > 0) x -= width;
        skew += (clamp(-vel * 0.22, -12, 12) - skew) * 0.12;
        setX(x); setSkew(skew);
      });
    });
  });

  /* Services: pinned horizontal scroll on wide screens, stacked reveals otherwise */
  safe("services", function () {
    var sec = $(".services"), track = $(".services-track"), pin = $(".services-pin");
    if (!sec) return;
    var mm = gsap.matchMedia();

    function panelFx(p, extra) {
      var draws = $$(".draw[pathLength]:not([stroke-dasharray])", p);
      if (draws.length) {
        gsap.fromTo(draws, { strokeDasharray: 1, strokeDashoffset: 1 }, {
          strokeDashoffset: 0, ease: "none", stagger: 0.06,
          scrollTrigger: Object.assign({ trigger: p, scrub: true }, extra.draw),
        });
      }
      var body = $$(".svc-body > *", p);
      if (body.length) gsap.from(body, { y: 46, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: Object.assign({ trigger: p, toggleActions: "play none none reverse" }, extra.body) });
      var cells = $$(".fuelmap-grid i", p);
      if (cells.length) gsap.from(cells, { scale: 0, autoAlpha: 0, duration: 0.45, ease: "power3.out", stagger: { grid: [8, 12], from: "end", amount: 0.7 }, scrollTrigger: Object.assign({ trigger: p, toggleActions: "play none none reverse" }, extra.body) });
      var spin = $("[data-spin]", p);
      if (spin) gsap.to(spin, { rotation: 200, svgOrigin: "60 60", ease: "none", scrollTrigger: Object.assign({ trigger: p, scrub: true }, extra.spin) });
    }

    mm.add("(min-width: 900px)", function () {
      sec.classList.add("is-horizontal");
      var panels = $$("[data-svc]", track);
      var services = $$("[data-svc]:not(.svc-end)", track);
      var barI = $(".services-progress .bar i"), count = $("[data-svc-count]");
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var lastIdx = -1;
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: pin, start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            barI.style.transform = "scaleX(" + self.progress.toFixed(4) + ")";
            var idx = clamp(Math.floor(self.progress * services.length), 0, services.length - 1);
            if (idx !== lastIdx) { lastIdx = idx; count.textContent = (idx + 1) + "/" + services.length; }
          },
        },
      });
      panels.forEach(function (p) {
        panelFx(p, {
          draw: { containerAnimation: tween, start: "left 90%", end: "left 35%" },
          body: { containerAnimation: tween, start: "left 78%" },
          spin: { containerAnimation: tween, start: "left right", end: "right left" },
        });
        // panels lean in as they travel
        gsap.fromTo(p, { rotateZ: 1.2, y: 30 }, { rotateZ: -1.2, y: -10, ease: "none", scrollTrigger: { trigger: p, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      });
      return function () { sec.classList.remove("is-horizontal"); gsap.set(track, { clearProps: "transform" }); gsap.set(panels, { clearProps: "transform" }); };
    });

    mm.add("(max-width: 899px)", function () {
      $$("[data-svc]", track).forEach(function (p) {
        panelFx(p, {
          draw: { start: "top 85%", end: "top 35%" },
          body: { start: "top 80%" },
          spin: { start: "top bottom", end: "bottom top" },
        });
        gsap.from(p, { y: 60, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: p, start: "top 92%", once: true } });
      });
    });
  });

  /* Chart reveals on enter */
  safe("chart-reveals", function () {
    var map = [["dyno", "#dyno-chart"], ["radar", "#radar"], ["ring", "#ring"], ["hours", "#hours"]];
    map.forEach(function (m) {
      var c = charts[m[0]], el = $(m[1]);
      if (!c || !el) return;
      ScrollTrigger.create({ trigger: el, start: "top 82%", once: true, onEnter: function () { c.reveal(); } });
    });
  });

  /* Bench rows */
  safe("bench-fx", function () {
    var rows = $$(".bench-row");
    if (!rows.length) return;
    gsap.from(rows, { y: 40, autoAlpha: 0, duration: 0.9, ease: "power3.out", stagger: 0.07, scrollTrigger: { trigger: ".bench-list", start: "top 85%", once: true } });
  });

  /* Shop: cards stagger in, drawings trace on, day picker cascades, tilt on hover */
  safe("shop-fx", function () {
    var cards = $$(".prod");
    if (cards.length) {
      gsap.from(cards, { y: 70, autoAlpha: 0, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: "[data-products]", start: "top 88%", once: true } });
      cards.forEach(function (c) {
        var draws = $$(".draw[pathLength]", c);
        if (draws.length) gsap.fromTo(draws, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", stagger: 0.05, scrollTrigger: { trigger: c, start: "top 85%", once: true } });
      });
      if (FINE) cards.forEach(function (c) {
        var rx = gsap.quickTo(c, "rotationX", { duration: 0.6, ease: "power3.out" });
        var ry = gsap.quickTo(c, "rotationY", { duration: 0.6, ease: "power3.out" });
        gsap.set(c, { transformPerspective: 900 });
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 7);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
        });
        c.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
    }
    var days = $$(".day-cell");
    if (days.length) gsap.from(days, { y: 16, autoAlpha: 0, duration: 0.6, ease: "power3.out", stagger: { each: 0.035, grid: [2, 7], from: "start" }, scrollTrigger: { trigger: ".days", start: "top 90%", once: true } });
    var dep = $("[data-deposit-amount]");
    if (dep && SHOP) {
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: dep, start: "top 88%", once: true, onEnter: function () {
        gsap.to(o, { v: SHOP.deposit.price, duration: 1.4, ease: "expo.out", onUpdate: function () { dep.textContent = money(Math.round(o.v)); }, onComplete: function () { dep.textContent = money(SHOP.deposit.price); } });
      } });
    }
  });

  /* Reviews: score count-up, stars fill, stacking cards */
  safe("reviews-fx", function () {
    var score = $(".proof-score");
    if (score) {
      ScrollTrigger.create({
        trigger: score, start: "top 80%", once: true,
        onEnter: function () {
          gsap.to(".stars", { "--fill": (D.stats.googleRating / 5 * 100) + "%", duration: 1.6, ease: "expo.out", delay: 0.2 });
          $$("[data-count]").forEach(function (el) {
            var to = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-decimals") || "0", 10), o = { v: 0 };
            gsap.to(o, { v: to, duration: 1.6, ease: "expo.out", onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
          });
        },
      });
    }
    var cards = $$(".review-card");
    cards.forEach(function (c, i) {
      gsap.from(c, { y: 80, duration: 1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 95%", once: true } });
      if (i === cards.length - 1) return;
      gsap.to(c, {
        scale: 0.9, autoAlpha: 0.25, ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 25%", scrub: true },
      });
    });
  });

  /* Process: racing line draws, steps light up as the line reaches them */
  safe("process", function () {
    var track = $("[data-process]"), line = $(".rl-draw");
    if (!track) return;
    if (line) gsap.fromTo(line, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: track, start: "top 65%", end: "bottom 65%", scrub: true } });
    $$(".step", track).forEach(function (s, i) {
      ScrollTrigger.create({
        trigger: s, start: "top 68%",
        onEnter: function () { s.classList.add("is-active"); },
        onLeaveBack: function () { s.classList.remove("is-active"); },
      });
      gsap.from(s, { x: i % 2 ? 50 : -50, duration: 1, ease: "expo.out", scrollTrigger: { trigger: s, start: "top 85%", once: true } });
    });
  });

  /* Visit: lazy map */
  safe("map", function () {
    var box = $(".visit-map");
    if (!box) return;
    ScrollTrigger.create({ trigger: box, start: "top bottom+=600", once: true, onEnter: function () { loadMap(box); } });
  });

  /* Footer wordmark rises letter by letter */
  safe("footer", function () {
    var letters = $$("[data-footer-mark] span");
    if (!letters.length) return;
    gsap.from(letters, { yPercent: 105, ease: "none", stagger: 0.12, scrollTrigger: { trigger: "[data-footer-mark]", start: "top bottom", end: "bottom bottom", scrub: true } });
  });

  /* Background scenes + gearbox HUD + nav active state */
  safe("scenes", function () {
    if (BG) {
      $$("[data-scene]").forEach(function (el) {
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: function (self) { if (self.isActive) BG.setScene(el.getAttribute("data-scene")); } });
      });
    }
    var gearOut = $("[data-gear-out]"), gear = "N", flash;
    function setGear(g) {
      if (g === gear || !gearOut) return;
      gear = g;
      gearOut.textContent = g;
      gearOut.classList.add("is-shift");
      clearTimeout(flash);
      flash = setTimeout(function () { gearOut.classList.remove("is-shift"); }, 450);
      gsap.fromTo(gearOut, { yPercent: dir > 0 ? 60 : -60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: "expo.out" });
    }
    $$("[data-gear]").forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: function (self) { if (self.isActive) setGear(el.getAttribute("data-gear")); } });
    });
    var links = $$(".nav-links a");
    links.forEach(function (a) {
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (!t) return;
      ScrollTrigger.create({ trigger: t, start: "top 50%", end: "bottom 50%", onToggle: function (self) { a.classList.toggle("is-active", self.isActive); } });
    });
  });

  /* Tacho: scroll velocity → rpm */
  safe("tacho", function () {
    var cells = $$("[data-tach] i"), out = $("[data-rpm-out]");
    if (!cells.length) return;
    var rpm = 1300, lastLit = -1, lastTxt = "";
    // On phones the HUD only shows while you're scrolling, so it never sits on a button you want to tap
    var hudEl = $(".hud"), narrow = window.matchMedia("(max-width: 899px)"), lastMove = 0, idle = false;
    gsap.ticker.add(function () {
      var now = performance.now();
      if (Math.abs(vel) > 0.5) lastMove = now;
      var isIdle = narrow.matches && now - lastMove > 1400;
      if (hudEl && isIdle !== idle) { idle = isIdle; hudEl.classList.toggle("is-idle", isIdle); }
      var target = 1300 + Math.min(Math.abs(vel) * 280, 12700);
      rpm += (target - rpm) * (target > rpm ? 0.25 : 0.06);
      var lit = Math.round((rpm / 14000) * 14);
      if (lit !== lastLit) {
        lastLit = lit;
        cells.forEach(function (c, i) { c.classList.toggle("on", i < lit); });
      }
      var txt = (Math.round(rpm / 100) * 100).toLocaleString("en-MY");
      if (txt !== lastTxt) { lastTxt = txt; out.textContent = txt; }
    });
  });

  /* Velocity skew on display type */
  safe("skew", function () {
    var targets = $$("[data-skew], .sec-head .h-display, .builds-grid > div > .h-display, .visit-info .h-display");
    if (!targets.length) return;
    var to = gsap.quickTo(targets, "skewY", { duration: 0.6, ease: "power3.out" });
    var last = 0;
    gsap.ticker.add(function () {
      var v = clamp(-vel * 0.09, -3.5, 3.5);
      if (Math.abs(v - last) > 0.05) { last = v; to(v); }
    });
  });

  /* Cursor follower + magnetic buttons (fine pointers only) */
  safe("cursor", function () {
    if (!FINE) return;
    document.documentElement.classList.add("has-cursor");
    var cur = $(".cursor");
    var xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3.out" });
    var yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3.out" });
    var seen = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      if (!seen) { seen = true; gsap.set(cur, { x: e.clientX, y: e.clientY }); }
      xTo(e.clientX); yTo(e.clientY);
      cur.classList.remove("is-hidden");
    }, { passive: true });
    document.addEventListener("pointerover", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var link = t.closest("a, button, [role=button], label");
      var chart = t.closest("[data-cursor='chart']");
      cur.classList.toggle("is-link", !!link);
      cur.classList.toggle("is-chart", !!chart && !link);
    });
    document.documentElement.addEventListener("pointerleave", function () { cur.classList.add("is-hidden"); });
  });

  safe("magnetic", function () {
    if (!FINE) return;
    $$(".magnetic").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
      });
      el.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  });

  /* Triggers below the pinned services section were partly created before it:
     sort by page position so pin spacing is applied in the right order. */
  ScrollTrigger.sort();
  window.addEventListener("load", function () { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
