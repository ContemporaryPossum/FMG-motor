/* ==========================================================================
   FMG — vector background "video"
   One fixed 2D canvas. A field of vector lines that:
     · flows around a spinning wave brake rotor (hero / footer)
     · stretches into speed streaks (services, builds, process)
     · rises into stacked dyno-curve ridges (dyno lab)
     · pinches into a location ping (visit)
   Scroll speed is the throttle: it speeds the field up, bows the lines and
   heats the rotor. The pointer pushes lines aside. Driven by GSAP's ticker so
   Lenis, ScrollTrigger and this canvas share one requestAnimationFrame.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  function hexToRgb(hex) {
    hex = (hex || "").replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [244, 237, 229];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var css = getComputedStyle(document.documentElement);
  var C_BG = (css.getPropertyValue("--canvas-bg") || "#110d0b").trim();
  var INK = hexToRgb(css.getPropertyValue("--canvas-ink") || "#f4ede5");
  var ACC = hexToRgb(css.getPropertyValue("--canvas-accent") || "#ff4a1c");
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")"; }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var W = 0, H = 0, DPR = 1, LINES = 40, PTS = 100, GAP = 20, TOP = 0, portrait = false;
  var xs = new Float32Array(260), ys = new Float32Array(260);

  var S = {
    t: 0, vel: 0, velS: 0, heat: 0, scroll: 0, spin: 0,
    mx: -9999, my: -9999, mxS: -9999, myS: -9999, mA: 0, mAT: 0,
    w: { flow: 1, ridge: 0, streak: 0, contour: 0 },
    rotor: { x: 0.7, y: 0.47, r: 0.36, a: 1 },
    cp: { x: 0.72, y: 0.44 },
  };

  /* Scenes. *P variants are used on portrait screens. */
  var SCENES = {
    hero:    { w: { flow: 1, ridge: 0, streak: 0, contour: 0 },     rotor: { x: 0.7, y: 0.46, r: 0.37, a: 1 },    rotorP: { x: 0.62, y: 0.3, r: 0.52, a: 1 } },
    flow:    { w: { flow: 0.75, ridge: 0, streak: 0.25, contour: 0 }, rotor: { x: 0.88, y: 0.78, r: 0.24, a: 0.6 }, rotorP: { x: 0.9, y: 0.86, r: 0.34, a: 0.5 } },
    streak:  { w: { flow: 0, ridge: 0, streak: 1, contour: 0 },     rotor: { x: 1.04, y: 0.9, r: 0.2, a: 0.35 },  rotorP: { x: 1.02, y: 0.94, r: 0.3, a: 0.3 } },
    ridge:   { w: { flow: 0, ridge: 1, streak: 0, contour: 0 },     rotor: { x: 0.5, y: 1.35, r: 0.3, a: 0 } },
    contour: { w: { flow: 0, ridge: 0, streak: 0, contour: 1 },     rotor: { x: 0.74, y: 0.4, r: 0.12, a: 0 },    cp: { x: 0.74, y: 0.42 }, cpP: { x: 0.5, y: 0.6 } },
    footer:  { w: { flow: 1, ridge: 0, streak: 0, contour: 0 },     rotor: { x: 0.5, y: 0.5, r: 0.42, a: 0.85 },  rotorP: { x: 0.5, y: 0.45, r: 0.62, a: 0.85 } },
  };
  var current = "hero";

  function resize() {
    var w = window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (Math.abs(w - W) < 2 && Math.abs(h - H) < 120 && W) return;
    W = w; H = h;
    var small = W < 700;
    DPR = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    portrait = W < H * 0.9;
    GAP = clamp(H / 44, 14, 22);
    LINES = Math.ceil(H / GAP) + 4;
    TOP = -GAP * 2;
    PTS = small ? 64 : 120;
    applyScene(current, true);
    if (RM) draw();
  }

  function applyScene(name, instant) {
    var sc = SCENES[name];
    if (!sc) return;
    current = name;
    var rotor = (portrait && sc.rotorP) || sc.rotor;
    var cp = (portrait && sc.cpP) || sc.cp;
    var useTween = !instant && !RM && window.gsap;
    if (useTween) {
      gsap.to(S.w, Object.assign({}, sc.w, { duration: 1.6, ease: "power3.inOut", overwrite: true }));
      gsap.to(S.rotor, Object.assign({}, rotor, { duration: 1.8, ease: "power3.inOut", overwrite: true }));
      if (cp) gsap.to(S.cp, Object.assign({}, cp, { duration: 1.6, ease: "power3.inOut", overwrite: true }));
    } else {
      Object.assign(S.w, sc.w);
      Object.assign(S.rotor, rotor);
      if (cp) Object.assign(S.cp, cp);
      if (RM) draw();
    }
  }

  /* ---------------- Rotor (wave brake disc) ---------------- */
  function drawRotor(cx, cy, R, ang, alpha, heat) {
    ctx.save();
    ctx.translate(cx, cy);

    // occlude the line field behind the disc
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle = C_BG;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;

    // static gauge ring with redline
    ctx.lineWidth = 1;
    for (var k = 0; k < 120; k++) {
      var a = -Math.PI / 2 + (k / 120) * TAU;
      var major = k % 10 === 0;
      var red = k >= 92 && k <= 108;
      var r1 = R * 1.1, r2 = r1 + (major ? R * 0.065 : R * 0.028);
      ctx.strokeStyle = red ? rgba(ACC, (0.5 + heat * 0.5) * alpha) : rgba(INK, (major ? 0.32 : 0.16) * alpha);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }

    ctx.rotate(ang);
    var edge = mix(INK, ACC, clamp(heat * 1.2, 0, 1));

    // braking surface glow when "hot"
    if (heat > 0.03) {
      ctx.fillStyle = rgba(ACC, heat * 0.2 * alpha);
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.95, 0, TAU);
      ctx.arc(0, 0, R * 0.66, 0, TAU, true);
      ctx.fill();
    }

    // wave (petal) outer edge
    ctx.strokeStyle = rgba(edge, 0.62 * alpha);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var s = 0; s <= 280; s++) {
      var th = (s / 280) * TAU;
      var rad = R * (0.962 + 0.038 * Math.cos(th * 14));
      if (s === 0) ctx.moveTo(Math.cos(th) * rad, Math.sin(th) * rad);
      else ctx.lineTo(Math.cos(th) * rad, Math.sin(th) * rad);
    }
    ctx.closePath();
    ctx.stroke();

    // inner edge of braking ring
    ctx.strokeStyle = rgba(INK, 0.32 * alpha);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, TAU); ctx.stroke();

    // drilled holes — three staggered rows
    ctx.strokeStyle = rgba(edge, 0.5 * alpha);
    var hr = Math.max(1.5, R * 0.017);
    for (var q = 0; q < 3; q++) {
      var rr = R * (0.725 + q * 0.075);
      for (var h = 0; h < 18; h++) {
        var ha = (h / 18) * TAU + q * (TAU / 54);
        ctx.beginPath();
        ctx.arc(Math.cos(ha) * rr, Math.sin(ha) * rr, hr, 0, TAU);
        ctx.stroke();
      }
    }

    // carrier spokes
    ctx.strokeStyle = rgba(INK, 0.38 * alpha);
    for (var sp = 0; sp < 6; sp++) {
      var sa = (sp / 6) * TAU;
      for (var side = -1; side <= 1; side += 2) {
        var off = side * 0.09;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sa + off * 1.6) * R * 0.33, Math.sin(sa + off * 1.6) * R * 0.33);
        ctx.lineTo(Math.cos(sa + off * 0.75) * R * 0.63, Math.sin(sa + off * 0.75) * R * 0.63);
        ctx.stroke();
      }
    }

    // floating buttons
    for (var b = 0; b < 12; b++) {
      var ba = (b / 12) * TAU + TAU / 24;
      ctx.fillStyle = C_BG;
      ctx.beginPath();
      ctx.arc(Math.cos(ba) * R * 0.655, Math.sin(ba) * R * 0.655, R * 0.024, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(b % 3 === 0 ? ACC : INK, 0.55 * alpha);
      ctx.stroke();
    }

    // hub + bolts
    ctx.strokeStyle = rgba(INK, 0.45 * alpha);
    ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.12, 0, TAU); ctx.stroke();
    for (var bo = 0; bo < 5; bo++) {
      var boa = (bo / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(boa) * R * 0.21, Math.sin(boa) * R * 0.21, R * 0.026, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------------- Location ping ---------------- */
  function drawPing(x, y, a, t) {
    ctx.save();
    for (var i = 0; i < 3; i++) {
      var p = ((t * 0.5 + i / 3) % 1);
      ctx.strokeStyle = rgba(ACC, (1 - p) * 0.6 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, 10 + p * 120, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = rgba(INK, 0.4 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 28, y); ctx.lineTo(x - 12, y);
    ctx.moveTo(x + 12, y); ctx.lineTo(x + 28, y);
    ctx.moveTo(x, y - 28); ctx.lineTo(x, y - 12);
    ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 28);
    ctx.stroke();
    ctx.fillStyle = rgba(ACC, a);
    ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------- Field ---------------- */
  function draw() {
    if (!W) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = C_BG;
    ctx.fillRect(0, 0, W, H);

    var w = S.w, t = S.t, minD = Math.min(W, H);
    var R = S.rotor;
    var rx = R.x * W, ry = R.y * H, rr = R.r * minD, rr2 = rr * rr;
    var cpx = S.cp.x * W, cpy = S.cp.y * H, sig2 = 2 * Math.pow(minD * 0.3, 2);
    var drift = S.scroll * 0.12;
    var par = ((drift % GAP) + GAP) % GAP;
    var shift = Math.floor(drift / GAP);
    var bow = clamp(S.velS, -60, 60) * 0.7;
    var MR = 130, MR2 = MR * MR;
    var mouse = S.mA > 0.01;
    var flowOn = w.flow > 0.002, ridgeOn = w.ridge > 0.002, contourOn = w.contour > 0.002, streakOn = w.streak > 0.02;
    var step = (W + 40) / (PTS - 1);

    for (var i = 0; i < LINES; i++) {
      var y0 = TOP + i * GAP - par;
      var li = i + shift;
      var accent = ((li % 7) + 7) % 7 === 3;

      for (var j = 0; j < PTS; j++) {
        var x = -20 + j * step;
        var d = 0;

        if (flowOn) {
          var dx = x - rx, dy = y0 - ry;
          var k = (rr2 * 1.15) / (dx * dx + dy * dy + rr2 * 0.25);
          d += w.flow * (dy * k * 0.55 * R.a + Math.sin(x * 0.0045 + t * 0.9 + li * 0.33) * GAP * 0.3);
        }
        if (ridgeOn) {
          var nx = x / W;
          var env = Math.exp(-Math.pow((nx - 0.5) / 0.24, 2));
          var n = Math.sin(x * 0.012 + li * 1.31 + t * 1.1) * 0.45 +
                  Math.sin(x * 0.027 - t * 0.7 + li * 0.47) * 0.3 +
                  Math.sin(x * 0.0061 + t * 0.35 + li * 2.1) * 0.25;
          n = n > 0 ? n * n : 0;
          d -= w.ridge * env * (n * 3.4 + env * 0.5) * GAP * 2.3;
        }
        if (contourOn) {
          var cdx = x - cpx, cdy = y0 - cpy, cr2 = cdx * cdx + cdy * cdy;
          var g = Math.exp(-cr2 / sig2);
          d += w.contour * (-cdy * 0.6 * g + Math.sin(Math.sqrt(cr2) * 0.045 - t * 2.4) * GAP * 0.55 * g);
        }
        if (streakOn) {
          d += w.streak * Math.sin(x * 0.002 + li * 0.9 + t * 0.4) * GAP * 0.18;
        }
        if (mouse) {
          var mdx = x - S.mxS, mdy = y0 + d - S.myS;
          var mk = MR2 / (mdx * mdx + mdy * mdy + MR2 * 0.6);
          d += S.mA * mdy * mk * 0.5;
        }
        d += bow * Math.sin((x / W) * Math.PI);

        xs[j] = x; ys[j] = y0 + d;
      }

      var path = new Path2D();
      path.moveTo(xs[0], ys[0]);
      for (var p = 1; p < PTS; p++) path.lineTo(xs[p], ys[p]);

      // ridge occlusion (draw-order depth like a stacked dyno printout)
      if (ridgeOn) {
        var fill = new Path2D(path);
        fill.lineTo(W + 20, H + 60);
        fill.lineTo(-20, H + 60);
        fill.closePath();
        ctx.globalAlpha = clamp(w.ridge * 1.25, 0, 1);
        ctx.fillStyle = C_BG;
        ctx.fill(fill);
        ctx.globalAlpha = 1;
      }

      var base = accent ? 0.5 : 0.12;
      if (ridgeOn) base += w.ridge * (accent ? 0.25 : 0.06);
      if (contourOn && accent) base += w.contour * 0.1;
      var col = accent ? ACC : INK;
      ctx.lineWidth = accent ? 1.35 : 1;

      var solidA = base * (1 - w.streak * 0.8);
      if (solidA > 0.01) {
        ctx.strokeStyle = rgba(col, solidA);
        ctx.stroke(path);
      }
      if (streakOn) {
        var dash = 30 + ((li * 37) % 140 + 140) % 140;
        var gap = 60 + ((li * 53) % 220 + 220) % 220;
        ctx.setLineDash([dash, gap]);
        ctx.lineDashOffset = t * (160 + (((li % 5) + 5) % 5) * 45);
        ctx.strokeStyle = rgba(col, Math.min(0.9, (base + 0.1) * 1.6) * w.streak);
        ctx.lineWidth = accent ? 1.8 : 1.2;
        ctx.stroke(path);
        ctx.setLineDash([]);
      }
    }

    if (R.a > 0.01) {
      var ang = S.scroll * 0.0018 + S.spin;
      drawRotor(rx, ry, rr, ang, R.a, S.heat);
    }
    if (w.contour > 0.05) drawPing(cpx, cpy, w.contour, t);
  }

  /* ---------------- Loop ---------------- */
  var last = 0;
  function tick(time, dtMs) {
    if (document.hidden) return;
    var dt = Math.min(dtMs || 16, 50) / 1000;
    S.velS += (S.vel - S.velS) * 0.08;
    S.vel *= 0.92; // decay if Lenis stops reporting
    var throttle = 1 + Math.min(Math.abs(S.velS) * 0.06, 4);
    S.t += dt * 0.6 * throttle;
    S.spin += dt * (0.06 + Math.abs(S.velS) * 0.01);
    S.heat += (clamp(Math.abs(S.velS) / 45, 0, 1) - S.heat) * 0.05;
    if (S.mx > -9000) {
      if (S.mxS < -9000) { S.mxS = S.mx; S.myS = S.my; }
      S.mxS += (S.mx - S.mxS) * 0.12;
      S.myS += (S.my - S.myS) * 0.12;
    }
    S.mA += (S.mAT - S.mA) * 0.06;
    draw();
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    S.mx = e.clientX; S.my = e.clientY; S.mAT = 1;
  }, { passive: true });
  document.addEventListener("pointerleave", function () { S.mAT = 0; });
  window.addEventListener("blur", function () { S.mAT = 0; });

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  resize();

  if (!RM) {
    if (window.gsap) gsap.ticker.add(function (time, dt) { tick(time, dt); });
    else {
      var rafLoop = function (ts) { tick(ts, last ? ts - last : 16); last = ts; requestAnimationFrame(rafLoop); };
      requestAnimationFrame(rafLoop);
    }
  } else {
    draw();
  }

  window.FMGBackground = {
    setScene: function (name) { if (name && name !== current) applyScene(name, false); },
    setVelocity: function (v) { S.vel = v; },
    setScroll: function (y) { S.scroll = y; if (RM) draw(); },
    state: S,
  };
})();
