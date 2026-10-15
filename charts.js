/* ==========================================================================
   FMG charts — dependency-free SVG charts modelled on Bklit UI
   (composable root → grid → series → axes → tooltip, CSS-token theming,
   ~1100 ms left-to-right enter reveal, crosshair tooltips).
   Bklit itself is a React + shadcn registry library that needs a build step,
   so these are hand-built equivalents for a flat, no-build static site.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var uid = 0;

  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function gsapOK() { return !!window.gsap && !RM; }
  function fmtInt(n) { return Math.round(n).toLocaleString("en-MY"); }
  function fmtK(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 1 : 2).replace(/\.?0+$/, "") + "K" : String(n); }

  /* Monotone cubic interpolation (same family as d3.curveMonotoneX) */
  function monotonePath(pts) {
    var n = pts.length;
    if (n === 0) return "";
    if (n === 1) return "M" + pts[0][0] + "," + pts[0][1];
    var dx = [], m = [], t = [], i;
    for (i = 0; i < n - 1; i++) {
      dx[i] = pts[i + 1][0] - pts[i][0];
      m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
    }
    t[0] = m[0];
    for (i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) t[i] = 0;
      else {
        var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
      }
    }
    t[n - 1] = m[n - 2];
    var d = "M" + pts[0][0].toFixed(2) + "," + pts[0][1].toFixed(2);
    for (i = 0; i < n - 1; i++) {
      var h = dx[i] / 3;
      d += "C" + (pts[i][0] + h).toFixed(2) + "," + (pts[i][1] + h * t[i]).toFixed(2) + " " +
        (pts[i + 1][0] - h).toFixed(2) + "," + (pts[i + 1][1] - h * t[i + 1]).toFixed(2) + " " +
        pts[i + 1][0].toFixed(2) + "," + pts[i + 1][1].toFixed(2);
    }
    return d;
  }

  /* --------------------------------------------------------------------------
     Malaysia time helper (shared with main.js)
     -------------------------------------------------------------------------- */
  var DAY_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function klNow(tz) {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz || "Asia/Kuala_Lumpur", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (p) { o[p.type] = p.value; });
      var hour = parseInt(o.hour, 10) % 24;
      var minute = parseInt(o.minute, 10);
      return { day: DAY_IDX[o.weekday], hour: hour, minute: minute, mins: hour * 60 + minute };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), hour: d.getHours(), minute: d.getMinutes(), mins: d.getHours() * 60 + d.getMinutes() };
    }
  }

  /* ==========================================================================
     Dyno chart — line + area, crosshair tooltip, keyboard stepping
     ========================================================================== */
  var HP_TO_NM = 7121; // torque (Nm) = hp × 7121 / rpm

  function hpShape(r, pk, limit) {
    if (r <= pk) {
      var u = clamp((pk - r) / (pk - 2000), 0, 1);
      return 1 - Math.pow(u, 1.4) * 0.85;
    }
    var v = clamp((r - pk) / (limit - pk), 0, 1);
    return 1 - v * v * 0.18;
  }

  function buildCurves(model, rpmMin, rpmMax, step) {
    var s = model.stock, t = model.tune;
    var tunedPk = s.hpRpm + (t.peakShift || 250);
    var rows = [];
    for (var r = rpmMin; r <= rpmMax; r += step) {
      var stockHp = r <= s.limit ? s.hp * hpShape(r, s.hpRpm, s.limit) : null;
      var tunedHp = r <= t.limit ? s.hp * (1 + t.hpGain) * hpShape(r, tunedPk, t.limit) : null;
      rows.push({
        rpm: r,
        hp: { stock: stockHp, tuned: tunedHp },
        nm: { stock: stockHp == null ? null : stockHp * HP_TO_NM / r, tuned: tunedHp == null ? null : tunedHp * HP_TO_NM / r },
      });
    }
    return rows;
  }

  function peakOf(rows, metric, series) {
    var best = { v: -1, rpm: 0 };
    rows.forEach(function (r) { var v = r[metric][series]; if (v != null && v > best.v) best = { v: v, rpm: r.rpm }; });
    return best;
  }

  function DynoChart(host, opts) {
    this.host = host;
    this.models = opts.models;
    this.key = opts.initial;
    this.metric = "hp";
    this.visible = { stock: true, tuned: true };
    this.onChange = opts.onChange || function () {};
    this.rpmMin = 3000; this.step = 250;
    this.rpmMax = 0;
    for (var k in this.models) this.rpmMax = Math.max(this.rpmMax, this.models[k].tune.limit);
    this.idx = null;
    this.revealed = false;
    this.id = "dy" + (++uid);
    this._build();
    this.setModel(this.key, true);
    var self = this;
    if (window.ResizeObserver) new ResizeObserver(function () { self._layout(); }).observe(host);
  }

  DynoChart.prototype._build = function () {
    var host = this.host, id = this.id;
    this.svg = svgEl("svg", { "aria-hidden": "true" }, host);
    var defs = svgEl("defs", null, this.svg);
    var grad = svgEl("linearGradient", { id: id + "-fill", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl("stop", { offset: "0%", "stop-color": "var(--chart-1)", "stop-opacity": 0.38 }, grad);
    svgEl("stop", { offset: "100%", "stop-color": "var(--chart-1)", "stop-opacity": 0 }, grad);
    var cp = svgEl("clipPath", { id: id + "-clip" }, defs);
    this.clipRect = svgEl("rect", { x: 0, y: -20, width: 0, height: 2000 }, cp);

    this.gGrid = svgEl("g", null, this.svg);
    this.gY = svgEl("g", null, this.svg);
    this.gX = svgEl("g", null, this.svg);
    this.gSeries = svgEl("g", { "clip-path": "url(#" + id + "-clip)" }, this.svg);
    this.area = svgEl("path", { fill: "url(#" + id + "-fill)" }, this.gSeries);
    this.lineStock = svgEl("path", { fill: "none", stroke: "var(--chart-2)", "stroke-width": 1.75, "stroke-dasharray": "5 5", "stroke-linecap": "round" }, this.gSeries);
    this.lineTuned = svgEl("path", { fill: "none", stroke: "var(--chart-1)", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, this.gSeries);
    this.peakDot = svgEl("circle", { r: 4, fill: "var(--chart-1)", stroke: "var(--bg-2)", "stroke-width": 2 }, this.gSeries);

    this.gCross = svgEl("g", { opacity: 0 }, this.svg);
    this.crossLine = svgEl("line", { stroke: "var(--chart-crosshair)", "stroke-width": 1, "stroke-dasharray": "3 3" }, this.gCross);
    this.mStock = svgEl("circle", { r: 4.5, fill: "var(--bg-2)", stroke: "var(--chart-2)", "stroke-width": 2 }, this.gCross);
    this.mTuned = svgEl("circle", { r: 5.5, fill: "var(--chart-1)", stroke: "var(--ink)", "stroke-width": 2 }, this.gCross);
    this.crossLabel = svgEl("text", { "text-anchor": "middle" }, this.gCross);

    this.hit = svgEl("rect", { fill: "transparent" }, this.svg);

    this.tip = document.createElement("div");
    this.tip.className = "chart-tip";
    host.appendChild(this.tip);

    var self = this;
    this.hit.addEventListener("pointermove", function (e) { self._pointer(e); });
    this.hit.addEventListener("pointerdown", function (e) { self._pointer(e); });
    this.hit.addEventListener("pointerleave", function () { self._hide(); });
    host.addEventListener("keydown", function (e) {
      var n = self.rows.length;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var i = self.idx == null ? Math.floor(n / 2) : self.idx + (e.key === "ArrowRight" ? 1 : -1);
        self._show(clamp(i, 0, n - 1));
      } else if (e.key === "Home") { e.preventDefault(); self._show(0); }
      else if (e.key === "End") { e.preventDefault(); self._show(n - 1); }
      else if (e.key === "Escape") self._hide();
    });
    host.addEventListener("blur", function () { self._hide(); });
  };

  DynoChart.prototype._layout = function () {
    var w = Math.max(280, this.host.clientWidth);
    var h = clamp(Math.round(w * 0.46), 240, 440);
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.m = { t: 18, r: 14, b: 30, l: w < 480 ? 34 : 44 };
    this.svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    this.svg.setAttribute("height", h);
    this.hit.setAttribute("x", this.m.l); this.hit.setAttribute("y", this.m.t);
    this.hit.setAttribute("width", w - this.m.l - this.m.r); this.hit.setAttribute("height", h - this.m.t - this.m.b);
    this._render(false);
  };

  DynoChart.prototype._scales = function () {
    var m = this.m, w = this.w, h = this.h, self = this;
    var maxV = 0;
    this.rows.forEach(function (r) {
      ["stock", "tuned"].forEach(function (s) { var v = r[self.metric][s]; if (v != null) maxV = Math.max(maxV, v); });
    });
    var stepY = this.metric === "hp" ? 5 : 4;
    this.yMax = Math.ceil((maxV * 1.12) / stepY) * stepY;
    this.yStep = stepY;
    var x0 = m.l, x1 = w - m.r, y0 = h - m.b, y1 = m.t;
    this.sx = function (rpm) { return x0 + (rpm - self.rpmMin) / (self.rpmMax - self.rpmMin) * (x1 - x0); };
    this.sy = function (v) { return y0 - (v / self.yMax) * (y0 - y1); };
  };

  DynoChart.prototype._render = function (animate) {
    if (!this.w) { this._layout(); return; }
    this._scales();
    var self = this, m = this.m, w = this.w, h = this.h;

    // Grid + Y axis
    this.gGrid.textContent = ""; this.gY.textContent = ""; this.gX.textContent = "";
    for (var v = 0; v <= this.yMax; v += this.yStep) {
      var y = this.sy(v);
      svgEl("line", { x1: m.l, x2: w - m.r, y1: y, y2: y, stroke: "var(--chart-grid)" }, this.gGrid);
      var t = svgEl("text", { x: m.l - 10, y: y + 4, "text-anchor": "end" }, this.gY);
      t.textContent = v;
    }
    var unit = svgEl("text", { x: m.l - 10, y: m.t - 6, "text-anchor": "end" }, this.gY);
    unit.textContent = this.metric === "hp" ? "hp" : "Nm";
    // X axis
    var stepX = w < 520 ? 2000 : 1000;
    for (var r = this.rpmMin; r <= this.rpmMax; r += stepX) {
      var tx = svgEl("text", { x: this.sx(r), y: h - 8, "text-anchor": "middle" }, this.gX);
      tx.textContent = (r / 1000) + "k";
      svgEl("line", { x1: this.sx(r), x2: this.sx(r), y1: h - m.b, y2: h - m.b + 5, stroke: "var(--chart-grid)" }, this.gX);
    }
    var rpmLbl = svgEl("text", { x: w - m.r, y: h - m.b - 8, "text-anchor": "end" }, this.gX);
    rpmLbl.textContent = "rpm";

    // Series
    var ptsT = [], ptsS = [];
    this.rows.forEach(function (row) {
      if (row[self.metric].tuned != null) ptsT.push([self.sx(row.rpm), self.sy(row[self.metric].tuned)]);
      if (row[self.metric].stock != null) ptsS.push([self.sx(row.rpm), self.sy(row[self.metric].stock)]);
    });
    var dT = monotonePath(ptsT);
    this.lineTuned.setAttribute("d", dT);
    this.lineStock.setAttribute("d", monotonePath(ptsS));
    var base = this.sy(0);
    this.area.setAttribute("d", dT + "L" + ptsT[ptsT.length - 1][0].toFixed(2) + "," + base + "L" + ptsT[0][0].toFixed(2) + "," + base + "Z");
    this.lineTuned.style.display = this.visible.tuned ? "" : "none";
    this.area.style.display = this.visible.tuned ? "" : "none";
    this.lineStock.style.display = this.visible.stock ? "" : "none";

    var pk = peakOf(this.rows, this.metric, "tuned");
    this.peakDot.setAttribute("cx", this.sx(pk.rpm));
    this.peakDot.setAttribute("cy", this.sy(pk.v));
    this.peakDot.style.display = this.visible.tuned ? "" : "none";

    this.crossLine.setAttribute("y1", m.t);
    this.crossLine.setAttribute("y2", h - m.b);

    var fullW = w + 40;
    if (animate && gsapOK()) {
      gsap.killTweensOf(this.clipRect);
      gsap.fromTo(this.clipRect, { attr: { width: 0 } }, { attr: { width: fullW }, duration: 1.1, ease: "power3.out" });
      gsap.fromTo(this.peakDot, { attr: { r: 0 } }, { attr: { r: 4 }, duration: 0.5, delay: 0.9, ease: "back.out(2)", overwrite: true });
    } else if (this.revealed || !gsapOK()) {
      this.clipRect.setAttribute("width", fullW);
    }
    if (this.idx != null) this._show(this.idx);
  };

  DynoChart.prototype.reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    this._render(true);
  };

  DynoChart.prototype.setModel = function (key, silent) {
    this.key = key;
    this.rows = buildCurves(this.models[key], this.rpmMin, this.rpmMax, this.step);
    this._render(!silent && this.revealed);
    this._emit();
  };
  DynoChart.prototype.setMetric = function (metric) {
    this.metric = metric;
    this._render(this.revealed);
    this._emit();
  };
  DynoChart.prototype.toggle = function (series, on) {
    this.visible[series] = on;
    this._render(false);
  };

  DynoChart.prototype._emit = function () {
    var ps = peakOf(this.rows, this.metric, "stock"), pt = peakOf(this.rows, this.metric, "tuned");
    this.onChange({
      model: this.models[this.key], metric: this.metric,
      stock: ps, tuned: pt, gain: pt.v - ps.v, gainPct: (pt.v / ps.v - 1) * 100,
    });
  };

  DynoChart.prototype._pointer = function (e) {
    var rect = this.svg.getBoundingClientRect();
    var scale = this.w / rect.width;
    var x = (e.clientX - rect.left) * scale;
    var rpm = this.rpmMin + (x - this.m.l) / (this.w - this.m.l - this.m.r) * (this.rpmMax - this.rpmMin);
    var i = clamp(Math.round((rpm - this.rpmMin) / this.step), 0, this.rows.length - 1);
    if (i !== this.idx) this._show(i);
  };

  DynoChart.prototype._show = function (i) {
    this.idx = i;
    var row = this.rows[i], mt = this.metric, x = this.sx(row.rpm);
    var vs = row[mt].stock, vt = row[mt].tuned;
    this.crossLine.setAttribute("x1", x); this.crossLine.setAttribute("x2", x);
    this.gCross.setAttribute("opacity", 1);
    this.crossLabel.setAttribute("x", x); this.crossLabel.setAttribute("y", this.m.t - 6);
    this.crossLabel.textContent = fmtInt(row.rpm);
    if (vs != null && this.visible.stock) { this.mStock.style.display = ""; this.mStock.setAttribute("cx", x); this.mStock.setAttribute("cy", this.sy(vs)); }
    else this.mStock.style.display = "none";
    if (vt != null && this.visible.tuned) { this.mTuned.style.display = ""; this.mTuned.setAttribute("cx", x); this.mTuned.setAttribute("cy", this.sy(vt)); }
    else this.mTuned.style.display = "none";

    var u = mt === "hp" ? "hp" : "Nm";
    var html = '<div class="tip-head">' + fmtInt(row.rpm) + " rpm</div>";
    if (this.visible.tuned) html += '<div class="tip-row"><span><i style="background:var(--chart-1)"></i>FMG tune</span><b>' + (vt == null ? "—" : vt.toFixed(1) + " " + u) + "</b></div>";
    if (this.visible.stock) html += '<div class="tip-row"><span><i style="background:#8a7d70"></i>Stock</span><b>' + (vs == null ? "limiter" : vs.toFixed(1) + " " + u) + "</b></div>";
    if (vs != null && vt != null && this.visible.stock && this.visible.tuned) {
      var d = vt - vs;
      html += '<div class="tip-delta">' + (d >= 0 ? "+" : "") + d.toFixed(1) + " " + u + " (" + (d >= 0 ? "+" : "") + ((vt / vs - 1) * 100).toFixed(1) + "%)</div>";
    }
    this.tip.innerHTML = html;

    // Position (in CSS px of the host)
    var rect = this.svg.getBoundingClientRect(), hostRect = this.host.getBoundingClientRect();
    var k = rect.width / this.w;
    var px = x * k + (rect.left - hostRect.left);
    var py = this.sy(vt != null ? vt : (vs || 0)) * k + (rect.top - hostRect.top);
    var tw = this.tip.offsetWidth || 170, th = this.tip.offsetHeight || 90;
    var left = px + 16;
    if (left + tw > hostRect.width) left = px - tw - 16;
    var top = clamp(py - th - 12, 0, Math.max(0, rect.height - th));
    this.tip.style.transform = "";
    this.tip.style.left = left + "px";
    this.tip.style.top = top + "px";
    this.tip.classList.add("is-on");
  };

  DynoChart.prototype._hide = function () {
    this.idx = null;
    this.gCross.setAttribute("opacity", 0);
    this.tip.classList.remove("is-on");
  };

  /* ==========================================================================
     Radar chart — multi-series, spring-ish morph between stages
     ========================================================================== */
  function RadarChart(host, opts) {
    this.host = host;
    this.metrics = opts.metrics;
    this.base = opts.base;
    this.values = {};
    this.target = opts.values;
    var self = this;
    this.metrics.forEach(function (m) { self.values[m.key] = 0; });
    this.size = 440; this.margin = 74; this.levels = 5;
    this.R = this.size / 2 - this.margin;
    this.revealed = false;
    this._build();
    this._draw();
  }

  RadarChart.prototype._pt = function (i, v) {
    var a = -Math.PI / 2 + (i / this.metrics.length) * Math.PI * 2;
    var r = (v / 100) * this.R;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };

  RadarChart.prototype._build = function () {
    var s = this.size, self = this;
    this.svg = svgEl("svg", { viewBox: (-s / 2) + " " + (-s / 2) + " " + s + " " + s, role: "img" }, this.host);
    this.gGrid = svgEl("g", null, this.svg);
    this.rings = [];
    for (var l = 1; l <= this.levels; l++) {
      var c = svgEl("circle", { cx: 0, cy: 0, r: (l / this.levels) * this.R, fill: "none", stroke: "var(--border)", "stroke-width": 1 }, this.gGrid);
      this.rings.push(c);
    }
    this.axes = this.metrics.map(function (m, i) {
      var p = self._pt(i, 100);
      return svgEl("line", { x1: 0, y1: 0, x2: p[0], y2: p[1], stroke: "var(--border)", "stroke-width": 1 }, self.gGrid);
    });
    this.labels = this.metrics.map(function (m, i) {
      var p = self._pt(i, 100), a = Math.atan2(p[1], p[0]);
      var lx = Math.cos(a) * (self.R + 18), ly = Math.sin(a) * (self.R + 18);
      var anchor = Math.abs(lx) < 4 ? "middle" : lx > 0 ? "start" : "end";
      var t = svgEl("text", { x: lx, y: ly + (ly > 4 ? 12 : ly < -4 ? -4 : 4), "text-anchor": anchor }, self.svg);
      t.textContent = m.label;
      return t;
    });
    this.basePoly = svgEl("polygon", { fill: "rgba(244,237,229,0.04)", stroke: "var(--ink-3)", "stroke-width": 1.25, "stroke-dasharray": "4 4" }, this.svg);
    this.poly = svgEl("polygon", { fill: "rgba(255,74,28,0.2)", stroke: "var(--chart-1)", "stroke-width": 2, "stroke-linejoin": "round" }, this.svg);
    this.dots = this.metrics.map(function (m) {
      var g = svgEl("g", { tabindex: -1 }, self.svg);
      var hitC = svgEl("circle", { r: 14, fill: "transparent" }, g);
      var dot = svgEl("circle", { r: 4.5, fill: "var(--chart-1)", stroke: "var(--ink)", "stroke-width": 1.5 }, g);
      var val = svgEl("text", { "class": "pt-val", "text-anchor": "middle", opacity: 0 }, g);
      g.addEventListener("pointerenter", function () { val.setAttribute("opacity", 1); dot.setAttribute("r", 6.5); });
      g.addEventListener("pointerleave", function () { val.setAttribute("opacity", 0); dot.setAttribute("r", 4.5); });
      return { g: g, dot: dot, hit: hitC, val: val };
    });
    var desc = svgEl("title", null, this.svg);
    this.title = desc;
  };

  RadarChart.prototype._draw = function () {
    var self = this;
    var pts = this.metrics.map(function (m, i) { return self._pt(i, self.values[m.key]); });
    this.poly.setAttribute("points", pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
    var bp = this.metrics.map(function (m, i) { return self._pt(i, self.revealed || !gsapOK() ? self.base[m.key] : 0); });
    if (!this._baseDone) this.basePoly.setAttribute("points", bp.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
    this.dots.forEach(function (d, i) {
      var p = pts[i];
      d.dot.setAttribute("cx", p[0]); d.dot.setAttribute("cy", p[1]);
      d.hit.setAttribute("cx", p[0]); d.hit.setAttribute("cy", p[1]);
      d.val.setAttribute("x", p[0]); d.val.setAttribute("y", p[1] - 12);
      d.val.textContent = Math.round(self.values[self.metrics[i].key]);
    });
    this.title.textContent = "Build stage targets: " + this.metrics.map(function (m) { return m.label + " " + Math.round(self.target[m.key]); }).join(", ");
  };

  RadarChart.prototype.set = function (values) {
    this.target = values;
    var self = this;
    if (!this.revealed && gsapOK()) { this._draw(); return; }
    if (gsapOK()) {
      var from = {}, to = {};
      this.metrics.forEach(function (m) { from[m.key] = self.values[m.key]; to[m.key] = values[m.key]; });
      gsap.to(this.values, Object.assign({}, to, { duration: 0.9, ease: "expo.out", onUpdate: function () { self._draw(); } }));
    } else {
      this.metrics.forEach(function (m) { self.values[m.key] = values[m.key]; });
      this._draw();
    }
  };

  RadarChart.prototype.reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    var self = this;
    if (!gsapOK()) { this.set(this.target); return; }
    var tl = gsap.timeline();
    tl.from(this.rings, { attr: { r: 0 }, duration: 0.8, ease: "expo.out", stagger: 0.06 })
      .from(this.axes, { attr: { x2: 0, y2: 0 }, duration: 0.7, ease: "expo.out", stagger: 0.04 }, 0.1)
      .from(this.labels, { opacity: 0, y: 6, duration: 0.5, ease: "power2.out", stagger: 0.05 }, 0.3);
    var bv = {}; this.metrics.forEach(function (m) { bv[m.key] = 0; });
    var baseTarget = this.base;
    tl.to(bv, Object.assign({}, baseTarget, {
      duration: 0.9, ease: "expo.out",
      onUpdate: function () {
        var bp = self.metrics.map(function (m, i) { return self._pt(i, bv[m.key]); });
        self.basePoly.setAttribute("points", bp.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "));
      },
      onComplete: function () { self._baseDone = true; },
    }), 0.35);
    tl.to(this.values, Object.assign({}, this.target, { duration: 1.1, ease: "expo.out", onUpdate: function () { self._draw(); } }), 0.5);
    tl.from(this.dots.map(function (d) { return d.dot; }), { attr: { r: 0 }, duration: 0.4, stagger: 0.05, ease: "back.out(2)" }, 0.9);
  };

  /* ==========================================================================
     Ring chart — multi-ring progress with centre readout and synced legend
     ========================================================================== */
  function RingChart(host, opts) {
    this.host = host;
    this.items = opts.items;
    this.max = opts.max;
    this.total = this.items.reduce(function (a, b) { return a + b.value; }, 0);
    this.legendHost = opts.legendHost;
    this.centerLabel = opts.centerLabel || "Total";
    this.sw = 13; this.gap = 7; this.inner = 62;
    this.revealed = false;
    this._build();
  }

  RingChart.prototype._build = function () {
    var self = this, n = this.items.length;
    var outer = this.inner + n * (this.sw + this.gap);
    var s = (outer + 10) * 2;
    this.svg = svgEl("svg", { viewBox: (-s / 2) + " " + (-s / 2) + " " + s + " " + s, role: "img" }, this.host);
    svgEl("title", null, this.svg).textContent = this.items.map(function (it) { return it.label + " " + fmtInt(it.value); }).join(", ");

    this.rings = this.items.map(function (it, i) {
      // index 0 = outermost (largest audience)
      var r = self.inner + (n - 1 - i) * (self.sw + self.gap) + self.sw / 2;
      var C = 2 * Math.PI * r;
      var g = svgEl("g", { transform: "rotate(-90)" }, self.svg);
      var track = svgEl("circle", { r: r, fill: "none", stroke: "var(--border)", "stroke-width": self.sw }, g);
      var arc = svgEl("circle", {
        r: r, fill: "none", stroke: it.color, "stroke-width": self.sw, "stroke-linecap": "round",
        "stroke-dasharray": C, "stroke-dashoffset": C,
      }, g);
      var target = C * (1 - clamp(it.value / self.max, 0, 1));
      [track, arc].forEach(function (el) {
        el.style.cursor = "pointer";
        el.addEventListener("pointerenter", function () { self.focus(i); });
        el.addEventListener("pointerleave", function () { self.focus(null); });
      });
      return { g: g, arc: arc, track: track, C: C, target: target };
    });

    this.center = document.createElement("div");
    this.center.className = "ring-center";
    this.center.innerHTML = "<b>" + fmtK(this.total) + "</b><span>" + this.centerLabel + "</span>";
    this.host.appendChild(this.center);
    this.cVal = this.center.querySelector("b");
    this.cLbl = this.center.querySelector("span");

    if (this.legendHost) {
      this.legend = this.items.map(function (it, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = '<i style="background:' + it.color + '"></i><span>' + it.label + '</span><span class="v">' + fmtInt(it.value) +
          '</span><span class="track"><span style="background:' + it.color + ';transform:scaleX(0)"></span></span>';
        b.addEventListener("pointerenter", function () { self.focus(i); });
        b.addEventListener("pointerleave", function () { self.focus(null); });
        b.addEventListener("focus", function () { self.focus(i); });
        b.addEventListener("blur", function () { self.focus(null); });
        self.legendHost.appendChild(b);
        return { btn: b, bar: b.querySelector(".track span"), pct: clamp(it.value / self.max, 0, 1) };
      });
    }
    if (!gsapOK()) this._final();
  };

  RingChart.prototype._final = function () {
    this.revealed = true;
    this.rings.forEach(function (r) { r.arc.setAttribute("stroke-dashoffset", r.target); });
    if (this.legend) this.legend.forEach(function (l) { l.bar.style.transform = "scaleX(" + l.pct + ")"; });
  };

  RingChart.prototype.reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    if (!gsapOK()) { this._final(); return; }
    var self = this;
    gsap.from(this.rings.map(function (r) { return r.track; }), { opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" });
    this.rings.forEach(function (r, i) {
      gsap.to(r.arc, { attr: { "stroke-dashoffset": r.target }, duration: 1.3, delay: 0.15 + i * 0.12, ease: "expo.out" });
    });
    var c = { v: 0 };
    gsap.to(c, { v: this.total, duration: 1.4, ease: "expo.out", onUpdate: function () { self.cVal.textContent = fmtK(Math.round(c.v / 100) * 100); }, onComplete: function () { self.cVal.textContent = fmtK(self.total); } });
    gsap.from(this.center, { opacity: 0, scale: 0.9, duration: 0.6, delay: 0.3, ease: "power3.out" });
    if (this.legend) this.legend.forEach(function (l, i) {
      gsap.from(l.btn, { x: 16, opacity: 0, duration: 0.6, delay: 0.2 + i * 0.08, ease: "power3.out" });
      gsap.to(l.bar, { scaleX: l.pct, duration: 1.1, delay: 0.3 + i * 0.1, ease: "expo.out" });
    });
  };

  RingChart.prototype.focus = function (i) {
    var self = this;
    this.rings.forEach(function (r, j) {
      var dim = i != null && i !== j;
      r.g.style.transition = "opacity .25s";
      r.g.style.opacity = dim ? 0.3 : 1;
      r.arc.style.filter = i === j ? "drop-shadow(0 2px 8px rgba(255,74,28,.45))" : "";
    });
    if (this.legend) this.legend.forEach(function (l, j) { l.btn.classList.toggle("is-dim", i != null && i !== j); });
    if (i == null) { this.cVal.textContent = fmtK(this.total); this.cLbl.textContent = this.centerLabel; }
    else { this.cVal.textContent = fmtK(this.items[i].value); this.cLbl.textContent = this.items[i].label; }
  };

  /* ==========================================================================
     Hours heatmap — 7 days × 24 hours, live "now" marker in Malaysia time
     ========================================================================== */
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  var DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function hh(h) { return (h < 10 ? "0" : "") + h + ":00"; }

  function HoursHeat(host, opts) {
    this.host = host;
    this.hours = opts.hours;
    this.tz = opts.tz;
    this.cells = [];
    this.revealed = false;
    this._build();
    this.tick();
    var self = this;
    setInterval(function () { self.tick(); }, 60000);
  }

  HoursHeat.prototype._build = function () {
    var host = this.host, self = this;
    host.setAttribute("role", "img");
    var summary = [];
    // Header row
    host.appendChild(document.createElement("span"));
    for (var h = 0; h < 24; h += 3) {
      var lab = document.createElement("span");
      lab.className = "hh";
      lab.style.gridColumn = "span 3";
      lab.textContent = (h < 10 ? "0" : "") + h;
      host.appendChild(lab);
    }
    DAY_ORDER.forEach(function (d) {
      var rowLabel = document.createElement("span");
      rowLabel.className = "hl";
      rowLabel.textContent = DAY_NAME[d];
      host.appendChild(rowLabel);
      var span = self.hours[d];
      summary.push(DAY_LONG[d] + (span ? " open" : " closed"));
      for (var hr = 0; hr < 24; hr++) {
        var c = document.createElement("span");
        c.className = "cell";
        var frac = 0;
        if (span) {
          var a = Math.max(span[0], hr * 60), b = Math.min(span[1], hr * 60 + 60);
          frac = Math.max(0, b - a) / 60;
        }
        if (frac >= 0.99) c.classList.add("l3");
        else if (frac > 0) c.classList.add("l2");
        c.dataset.day = d; c.dataset.hour = hr; c.dataset.frac = frac;
        host.appendChild(c);
        self.cells.push(c);
      }
      self["row" + d] = rowLabel;
    });
    host.setAttribute("aria-label", "Opening hours: " + summary.join(", ") + ". Open days run 9:30 am to 7:30 pm.");

    this.tip = document.createElement("div");
    this.tip.className = "chart-tip heat-tip";
    host.appendChild(this.tip);
    host.addEventListener("pointerover", function (e) {
      var c = e.target.closest(".cell");
      if (!c) return;
      var d = +c.dataset.day, hr = +c.dataset.hour, f = +c.dataset.frac, span = self.hours[d];
      var state = "Closed";
      if (f >= 0.99) state = "Open";
      else if (f > 0) state = span[0] >= hr * 60 && span[0] < hr * 60 + 60 ? "Opens " + fmtTime(span[0]) : "Closes " + fmtTime(span[1]);
      self.tip.innerHTML = '<div class="tip-head">' + DAY_LONG[d] + " · " + hh(hr) + "</div><b>" + state + "</b>";
      var hr2 = host.getBoundingClientRect(), cr = c.getBoundingClientRect();
      var left = cr.left - hr2.left + cr.width / 2 - 70;
      self.tip.style.left = clamp(left, 0, hr2.width - 150) + "px";
      self.tip.style.top = (cr.top - hr2.top - 62) + "px";
      self.tip.classList.add("is-on");
    });
    host.addEventListener("pointerleave", function () { self.tip.classList.remove("is-on"); });
  };

  function fmtTime(mins) {
    var h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? "pm" : "am";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }

  HoursHeat.prototype.tick = function () {
    var now = klNow(this.tz);
    this.cells.forEach(function (c) { c.classList.toggle("is-now", +c.dataset.day === now.day && +c.dataset.hour === now.hour); });
    for (var d = 0; d < 7; d++) if (this["row" + d]) this["row" + d].classList.toggle("is-today", d === now.day);
  };

  HoursHeat.prototype.reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    if (!gsapOK()) return;
    gsap.from(this.cells, { scale: 0.3, opacity: 0, duration: 0.5, ease: "power3.out", stagger: { grid: [7, 24], from: "start", amount: 0.9 } });
  };

  window.FMGCharts = {
    DynoChart: DynoChart,
    RadarChart: RadarChart,
    RingChart: RingChart,
    HoursHeat: HoursHeat,
    klNow: klNow,
    fmtTime: fmtTime,
    fmtK: fmtK,
  };
})();
