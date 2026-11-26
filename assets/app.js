/* G27 Ash–Growth Simulator — page logic and SVG charts (no external libraries). */
(function () {
  'use strict';
  const D = window.G27_DATA, Mo = window.G27_MODEL, T = window.G27_T;
  const NS = 'http://www.w3.org/2000/svg';
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const C = { barley: '#2a78d6', barleyL: '#84b9f3', bean: '#eb6834', navy: '#1a3a5c', before: '#5d6168', beforeBand: '#d4d6d2',
    after: '#1c5cab', afterBand: 'rgba(134,182,239,.55)', ink2: '#565c64', char: '#20242a', soil: '#7b5a43', leaf: '#4e8a3a', rule: '#d2d6d1' };
  const ORD = { 0: '#84b9f3', 1: '#338ced', 3: '#1b64be', 6: '#0e3d7e' };
  const SHAPE = { 0: 'circle', 1: 'square', 3: 'triangle', 6: 'diamond' };
  const LEVELS = [0, 1, 3, 6];
  const FIELD = [['Low', D.PARAMS.loads.Low], ['High', D.PARAMS.loads.High], ['Extreme', D.PARAMS.loads.Extreme]];
  const LS = Mo.linspace(0, 40, 161);

  // ---------- state ----------
  const P0 = D.PARAMS, SOILVOL0 = +(P0.cellSide ** 2 * (P0.cellDepth - P0.topGap)).toFixed(1);
  const state = {
    load: 6.0, ashEC: P0.ashEC, f: P0.f, soilEC: P0.soilEC, soilVol: SOILVOL0, porosity: P0.porosity,
    heat: 'barley', ex168: false, usePot: false, potDepth: D.POT.soilDepthMin, lang: 'en',
  };
  try { const s = localStorage.getItem('g27-lang'); if (s === 'ko' || s === 'en') state.lang = s; else throw 0; }
  catch (e) { state.lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'; }

  const t = (key, vars) => { const e = T[key]; let s = e ? (e[state.lang] || e.en) : key; if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; };
  const L = v => (v && typeof v === 'object') ? (v[state.lang] || v.en) : v;
  const fx = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  const pct = v => Math.round(v).toString();
  const gOf = k => D.ASH_LEVELS.find(l => l.key === k).g;
  const gTxt = k => fx(gOf(k), 2);
  const lvName = k => k === 0 ? t('lvNone') : `${gTxt(k)} g`;
  const doseLoad = k => gOf(k) * 100 / (P0.cellSide ** 2);
  const model = () => Mo.makeModel({ ashEC: state.ashEC, f: state.f, soilEC: state.soilEC, soilVol: state.soilVol, porosity: state.porosity });

  // ---------- svg helpers ----------
  function S(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, attrs) { const e = S('text', Object.assign({ x, y }, attrs || {}), parent); e.textContent = s; return e; }
  function ticks(lo, hi, n) {
    const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  let clipN = 0;
  function frame(el, o) {
    const W = Math.max(240, Math.floor(el.clientWidth || 300));
    const H = o.height || Math.round(Math.min(o.maxH || 340, Math.max(o.minH || 230, W * (o.ratio || 0.62))));
    const m = Object.assign({ t: 14, r: 14, b: 46, l: 48 }, o.margin || {});
    el.innerHTML = '';
    const svg = S('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img' }, el);
    if (o.label) S('title', {}, svg).textContent = o.label;
    const iw = W - m.l - m.r, ih = H - m.t - m.b, [x0, x1] = o.x, [y0, y1] = o.y;
    const x = v => m.l + (v - x0) / (x1 - x0) * iw, y = v => m.t + ih - (v - y0) / (y1 - y0) * ih;
    const xi = px => x0 + (px - m.l) / iw * (x1 - x0), yi = py => y0 + (m.t + ih - py) / ih * (y1 - y0);
    const ax = S('g', { class: 'ax' }, svg);
    (o.yTicks || ticks(y0, y1, o.yN || 5)).forEach(v => {
      S('line', { class: 'grid', x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v) }, ax);
      txt(ax, m.l - 7, y(v) + 4, (o.yFmt || String)(v), { 'text-anchor': 'end' });
    });
    if (o.xTicks !== false) (o.xTicks || ticks(x0, x1, o.xN || (W < 420 ? 4 : 6))).forEach(v => {
      if (o.xGrid) S('line', { class: 'grid', x1: x(v), x2: x(v), y1: m.t, y2: m.t + ih }, ax);
      txt(ax, x(v), m.t + ih + 18, (o.xFmt || String)(v), { 'text-anchor': 'middle' });
    });
    S('line', { class: 'dom', x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih }, ax);
    if (o.xLabel) txt(ax, m.l + iw / 2, H - 6, o.xLabel, { 'text-anchor': 'middle', class: 'title' });
    if (o.yLabel) txt(ax, 0, 0, o.yLabel, { 'text-anchor': 'middle', class: 'title', transform: `translate(12 ${m.t + ih / 2}) rotate(-90)` });
    const id = 'clip' + (++clipN);
    S('rect', { x: m.l, y: m.t - 2, width: iw, height: ih + 4 }, S('clipPath', { id }, S('defs', {}, svg)));
    const clip = S('g', { 'clip-path': `url(#${id})` }, svg);
    const top = S('g', {}, svg);
    return { el, svg, clip, top, x, y, xi, yi, m, iw, ih, W, H, o };
  }
  const pathD = (ch, xs, ys) => 'M' + xs.map((v, i) => `${ch.x(v).toFixed(1)},${ch.y(ys[i]).toFixed(1)}`).join('L');
  const line = (ch, xs, ys, attrs, parent) => S('path', Object.assign({ d: pathD(ch, xs, ys), fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, attrs), parent || ch.clip);
  function band(ch, xs, lo, hi, attrs, parent) {
    const a = xs.map((v, i) => `${ch.x(v).toFixed(1)},${ch.y(hi[i]).toFixed(1)}`);
    const b = xs.map((v, i) => `${ch.x(v).toFixed(1)},${ch.y(lo[i]).toFixed(1)}`).reverse();
    return S('path', Object.assign({ d: 'M' + a.join('L') + 'L' + b.join('L') + 'Z', stroke: 'none' }, attrs), parent || ch.clip);
  }
  function mark(parent, shape, cx, cy, r, attrs) {
    let e;
    if (shape === 'circle') e = S('circle', { cx, cy, r }, parent);
    else if (shape === 'square') e = S('rect', { x: cx - r * 0.88, y: cy - r * 0.88, width: r * 1.76, height: r * 1.76, rx: 1 }, parent);
    else if (shape === 'triangle') e = S('path', { d: `M${cx},${cy - r * 1.2}L${cx + r * 1.1},${cy + r * 0.8}L${cx - r * 1.1},${cy + r * 0.8}Z` }, parent);
    else e = S('path', { d: `M${cx},${cy - r * 1.25}L${cx + r * 1.05},${cy}L${cx},${cy + r * 1.25}L${cx - r * 1.05},${cy}Z` }, parent);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function vline(ch, xv, label, attrs) {
    const X = ch.x(xv);
    S('line', Object.assign({ x1: X, x2: X, y1: ch.m.t, y2: ch.m.t + ch.ih, stroke: C.ink2, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, attrs || {}), ch.clip);
    if (label) txt(ch.top, X, ch.m.t - 6, label, { class: 'lbl', 'text-anchor': 'middle' });
  }

  // ---------- tooltip ----------
  const tip = $('#tip');
  function showTip(html, cx, cy) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = cx + 14, y = cy + 14;
    if (x + r.width > innerWidth - 8) x = cx - r.width - 14;
    if (y + r.height > innerHeight - 8) y = cy - r.height - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  const row = (c, label, val) => `<div class="row">${c ? `<span class="sw" style="background:${c}"></span>` : ''}<span>${label}</span><b style="margin-left:auto;padding-left:10px">${val}</b></div>`;
  document.addEventListener('pointerdown', e => { if (!e.target.closest || !e.target.closest('.hit, .pt')) hideTip(); });
  addEventListener('scroll', hideTip, { passive: true });

  function hover(ch, fn) {
    const cross = S('line', { stroke: C.char, 'stroke-width': 1, 'stroke-dasharray': '3 3', y1: ch.m.t, y2: ch.m.t + ch.ih, visibility: 'hidden' }, ch.svg);
    const dots = S('g', {}, ch.svg);
    const hit = S('rect', { class: 'hit', x: ch.m.l, y: ch.m.t, width: ch.iw, height: ch.ih, style: 'touch-action:pan-y' }, ch.svg);
    const move = ev => {
      const r = ch.svg.getBoundingClientRect();
      const xv = Math.min(ch.o.x[1], Math.max(ch.o.x[0], ch.xi(ev.clientX - r.left)));
      const res = fn(xv, ch.yi(ev.clientY - r.top)); if (!res) return;
      const X = ch.x(res.x != null ? res.x : xv);
      if (res.cross !== false) { cross.setAttribute('x1', X); cross.setAttribute('x2', X); cross.setAttribute('visibility', 'visible'); }
      dots.innerHTML = '';
      (res.pts || []).forEach(p => S('circle', { cx: p.x != null ? ch.x(p.x) : X, cy: ch.y(p.y), r: 4.5, fill: p.c, stroke: '#fff', 'stroke-width': 1.5 }, dots));
      showTip(res.html, ev.clientX, ev.clientY);
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', ev => { if (ev.pointerType === 'touch') return; cross.setAttribute('visibility', 'hidden'); dots.innerHTML = ''; hideTip(); });
    return hit;
  }
  const nearest = (arr, v) => arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
  const idxOf = xv => Math.round(xv / 40 * (LS.length - 1));

  // ---------- hero illustration ----------
  // fixed pseudo-random speckles so the drawing does not flicker
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const SPECK = Array.from({ length: 260 }, () => [rnd(), rnd(), rnd()]);
  function renderArt(M) {
    const svg = $('#cellArt');
    svg.querySelectorAll(':scope > :not(title)').forEach(n => n.remove());
    const g = M.ashG(state.load), ec = M.ec(state.load), yb = Mo.growth(ec, 'barley'), yn = Mo.growth(ec, 'bean');
    const root = S('g', { transform: 'translate(50 0)' }, svg);
    const topY = 150, soilY = 172, botY = 322, xl = 92, xr = 300, bl = 108, br = 284;
    const xAt = (yy, left) => left ? xl + (bl - xl) * (yy - topY) / (botY - topY) : xr + (br - xr) * (yy - topY) / (botY - topY);
    const th = 24 * g / Mo.makeModel().ashG(40);      // drawn thickness, illustrative only
    const ashTop = soilY - th;
    const defs = S('defs', {}, svg);
    const cp = S('clipPath', { id: 'cellClip' }, defs);
    S('path', { d: `M${xl},${topY - 40}L${xr},${topY - 40}L${br},${botY}L${bl},${botY}Z` }, cp);
    const inner = S('g', { 'clip-path': 'url(#cellClip)' }, root);
    // soil
    S('rect', { x: 80, y: soilY, width: 240, height: botY - soilY, fill: C.soil }, inner);
    SPECK.slice(0, 140).forEach(([a, b, c]) => S('circle', { cx: 90 + a * 220, cy: soilY + 4 + b * (botY - soilY - 6), r: 0.8 + c * 1.6, fill: c > 0.5 ? '#68493a' : '#94735a' }, inner));
    // salt in the soil water: pale specks, more with higher EC
    const nSalt = Math.min(120, Math.round(ec * 5));
    SPECK.slice(140, 140 + nSalt).forEach(([a, b]) => S('rect', { x: 92 + a * 216, y: soilY + 6 + b * (botY - soilY - 12), width: 2.2, height: 2.2, fill: '#f4f1e8', opacity: 0.85 }, inner));
    // ash layer
    if (th > 0.3) {
      S('rect', { x: 80, y: ashTop, width: 240, height: th, fill: '#b7bab6' }, inner);
      const nA = Math.round(Math.min(120, th * 6));
      SPECK.slice(0, nA).forEach(([a, b, c]) => S('circle', { cx: 90 + a * 220, cy: ashTop + 1 + b * Math.max(0.5, th - 2), r: 0.6 + c * 1.1, fill: c > 0.55 ? '#7e827d' : '#dcdedb' }, inner));
    }
    // cell outline (rim and walls)
    S('path', { d: `M${xl},${topY}L${bl},${botY}L${br},${botY}L${xr},${topY}`, fill: 'none', stroke: '#30353b', 'stroke-width': 3, 'stroke-linejoin': 'round' }, root);
    S('line', { x1: xl - 14, x2: xl, y1: topY, y2: topY, stroke: '#30353b', 'stroke-width': 3, 'stroke-linecap': 'round' }, root);
    S('line', { x1: xr, x2: xr + 14, y1: topY, y2: topY, stroke: '#30353b', 'stroke-width': 3, 'stroke-linecap': 'round' }, root);
    // labels with leaders
    const lab = (yy, s) => { S('line', { x1: xAt(yy, true) - 4, x2: 36, y1: yy, y2: yy, stroke: C.ink2, 'stroke-width': 1 }, root); txt(root, 34, yy + 4, s, { 'text-anchor': 'end', class: 'lbl', style: 'font-size:14px' }); };
    if (th > 2) lab(ashTop + th / 2, t('artAsh'));
    lab(soilY + 40, t('artSoil'));
    // plants
    const gy = ashTop;
    const plant = (cx, Y, kind) => {
      const grp = S('g', {}, root);
      if (Y <= 0.5) {   // seed did not grow
        S('ellipse', { cx, cy: gy - 2.5, rx: kind === 'bean' ? 6 : 3.5, ry: kind === 'bean' ? 4 : 2.5, fill: kind === 'bean' ? '#8a5a3c' : '#c9a86a', stroke: '#5b3e2a', 'stroke-width': 0.8 }, grp);
        return gy - 8;
      }
      if (kind === 'barley') {
        const H = 14 + 120 * Y / 100;
        [[-16, 1.0], [-4, 0.86], [10, 0.72], [-26, 0.6]].forEach(([dx, s], i) => {
          const h = H * s, sway = dx * (0.5 + Y / 200);
          S('path', { d: `M${cx},${gy} Q${cx + sway * 0.25},${gy - h * 0.55} ${cx + sway},${gy - h}`, fill: 'none', stroke: i % 2 ? '#5f9a49' : C.leaf, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, grp);
        });
        return gy - H - 6;
      }
      const H = 12 + 104 * Y / 100, s = 0.45 + 0.55 * Y / 100;
      S('path', { d: `M${cx},${gy} C${cx + 2},${gy - H * 0.4} ${cx - 3},${gy - H * 0.7} ${cx},${gy - H}`, fill: 'none', stroke: '#5f9a49', 'stroke-width': 3.4, 'stroke-linecap': 'round' }, grp);
      S('ellipse', { cx: cx - 15 * s, cy: gy - H - 4 * s, rx: 16 * s, ry: 8 * s, fill: C.leaf, transform: `rotate(-24 ${cx - 15 * s} ${gy - H - 4 * s})` }, grp);
      S('ellipse', { cx: cx + 15 * s, cy: gy - H - 4 * s, rx: 16 * s, ry: 8 * s, fill: '#5f9a49', transform: `rotate(24 ${cx + 15 * s} ${gy - H - 4 * s})` }, grp);
      return gy - H - 14 * s;
    };
    const tb = plant(152, yb, 'barley'), tn = plant(238, yn, 'bean');
    const tag = (cx, yy, c, name, v) => {
      const gg = S('g', {}, root);
      S('circle', { cx: cx - 30, cy: yy - 4, r: 4.5, fill: c }, gg);
      txt(gg, cx - 22, yy, `${name} ${pct(v)}%`, { class: 'lbl strong', style: 'font-size:15px' });
    };
    tag(152, Math.min(tb, 140) - 4, C.barley, t('barley'), yb);
    tag(238, Math.min(tn, 140) - 4, C.bean, t('bean'), yn);
    // EC gauge
    const gx = 350, gw = 14, gTop = 150, gBot = 322, gMax = 25;
    const gy2 = v => gBot - (Math.min(v, gMax) / gMax) * (gBot - gTop);
    S('rect', { x: gx, y: gy2(D.BARLEY_GERM_LIMIT[1]), width: gw, height: gy2(D.BARLEY_GERM_LIMIT[0]) - gy2(D.BARLEY_GERM_LIMIT[1]), fill: '#e6e2d6' }, root);
    S('rect', { x: gx, y: gTop, width: gw, height: gBot - gTop, fill: 'none', stroke: '#30353b', 'stroke-width': 1.5, rx: 3 }, root);
    S('rect', { x: gx + 2, y: gy2(ec), width: gw - 4, height: Math.max(0, gBot - 2 - gy2(ec)), fill: '#30353b', rx: 2 }, root);
    [[D.SPECIES.bean.a, t('bean')], [D.SPECIES.barley.a, t('barley')]].forEach(([v, n]) => {
      S('line', { x1: gx - 4, x2: gx + gw + 4, y1: gy2(v), y2: gy2(v), stroke: '#30353b', 'stroke-width': 1 }, root);
      txt(root, gx + gw + 7, gy2(v) + 4, `${n} ${v}`, { class: 'lbl', style: 'font-size:11px' });
    });
    txt(root, gx + gw / 2, gTop - 10, 'EC', { class: 'lbl strong', 'text-anchor': 'middle' });
    txt(root, gx + gw / 2, gBot + 15, '0', { class: 'lbl', 'text-anchor': 'middle', style: 'font-size:11px' });
    txt(root, gx - 6, gTop + 4, String(gMax), { class: 'lbl', 'text-anchor': 'end', style: 'font-size:11px' });
  }

  function renderHero() {
    const M = model(), g = M.ashG(state.load), ec = M.ec(state.load);
    $('#roAsh').textContent = fx(g, 2);
    $('#roEC').textContent = fx(ec, 1);
    $('#roBarley').textContent = pct(Mo.growth(ec, 'barley'));
    $('#roBean').textContent = pct(Mo.growth(ec, 'bean'));
    $('#heroNote').textContent = t('heroNote', { f: fx(state.f, 2) });
    $('#loadOut').textContent = fx(state.load, 1);
    $('#load').value = state.load;
    $('#potDepth').value = state.potDepth;
    $$('.presets button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.load - state.load) < 0.05));
    renderArt(M);
    // chain
    const yb = Mo.growth(ec, 'barley'), yn = Mo.growth(ec, 'bean');
    $('#chain').innerHTML = `
      <li><h3>${t('st1')}</h3><p class="eq">m = L × A ÷ 100 = ${fx(state.load, 1)} × ${fx(M.area, 2)} ÷ 100 = <b>${fx(g, 2)} g</b></p><p class="hint">${t('st1n')}</p></li>
      <li><h3>${t('st2')}</h3><p class="eq">EC = EC<sub>1:5</sub> × 5m ÷ W × f + EC<sub>soil</sub><br>= ${fx(state.ashEC, 0)} × 5 × ${fx(g, 2)} ÷ ${fx(M.water, 1)} × ${fx(state.f, 2)} + ${fx(state.soilEC, 1)} = <b>${fx(ec, 1)} dS/m</b></p><p class="hint">${t('st2n')}</p></li>
      <li><h3>${t('st3')}</h3><p class="eq">Y = 100 − b (EC − a)</p><p class="sp-row"><span class="b">${t('barley')} <b>${pct(yb)}%</b></span><span class="n">${t('bean')} <b>${pct(yn)}%</b></span></p><p class="hint">${t('st3n')}</p></li>`;
  }

  // ---------- model charts ----------
  function renderGrowthChart(M) {
    const el = $('#chGrowth');
    const ch = frame(el, { x: [0, 40], y: [0, 105], yTicks: [0, 25, 50, 75, 100], xLabel: t('axLoad'), yLabel: t('axGrowth'), label: t('tGrowth'), margin: { t: 46 } });
    FIELD.forEach(([k, v]) => vline(ch, v, t('p' + k)));
    const ys = { barley: LS.map(v => Mo.growth(M.ec(v), 'barley')), bean: LS.map(v => Mo.growth(M.ec(v), 'bean')) };
    line(ch, LS, ys.bean, { stroke: C.bean, 'stroke-width': 2.5 });
    line(ch, LS, ys.barley, { stroke: C.barley, 'stroke-width': 2.5 });
    const X = ch.x(state.load);
    S('line', { x1: X, x2: X, y1: ch.m.t, y2: ch.m.t + ch.ih, stroke: C.char, 'stroke-width': 1.5 }, ch.clip);
    ['barley', 'bean'].forEach(sp => S('circle', { cx: X, cy: ch.y(Mo.growth(M.ec(state.load), sp)), r: 5, fill: C[sp], stroke: '#fff', 'stroke-width': 2 }, ch.top));
    // legend
    const lg = S('g', {}, ch.top); let lx = ch.m.l;
    ['barley', 'bean'].forEach(sp => {
      S('line', { x1: lx, x2: lx + 18, y1: 12, y2: 12, stroke: C[sp], 'stroke-width': 2.5 }, lg);
      const tt = txt(lg, lx + 24, 16, t(sp), { class: 'lbl strong' }); lx += 34 + t(sp).length * 8 + 20;
    });
    hover(ch, xv => {
      const i = idxOf(xv), v = LS[i], e = M.ec(v);
      return { x: v, pts: [{ y: ys.barley[i], c: C.barley }, { y: ys.bean[i], c: C.bean }],
        html: `<b>${fx(v, 1)} Mg/ha</b>` + row(null, 'EC', fx(e, 1) + ' dS/m') + row(C.barley, t('barley'), pct(ys.barley[i]) + '%') + row(C.bean, t('bean'), pct(ys.bean[i]) + '%') };
    });
  }

  function renderECChart(M) {
    const el = $('#chEC');
    const lv = [['lvNone', 0], ...FIELD.map(([k, v]) => ['p' + k, v]), ['nowBar', state.load]];
    const ecs = lv.map(([, v]) => M.ec(v));
    const ymax = Math.max(22, Math.max(...ecs) * 1.15);
    const ch = frame(el, { x: [0, 5], y: [0, ymax], xTicks: false, yLabel: t('axEC'), xLabel: t('axLoad'), label: t('tEC'), margin: { r: 104, b: 60 } });
    const [g0, g1] = D.BARLEY_GERM_LIMIT;
    S('rect', { x: ch.m.l, width: ch.iw, y: ch.y(g1), height: ch.y(g0) - ch.y(g1), fill: '#e9e8e1' }, ch.clip);
    txt(ch.top, ch.m.l + ch.iw + 6, ch.y((g0 + g1) / 2) + 4, `${t('germShort')} ${g0}–${g1}`, { class: 'lbl', style: 'font-size:11px' });
    const bw = Math.min(54, ch.iw / 5 * 0.62), cols = ['#c9d3de', ORD[1], ORD[3], ORD[6], '#30353b'];
    lv.forEach(([k, v], i) => {
      const cx = ch.x(i + 0.5), e = ecs[i], yy = ch.y(e);
      const d = e < 0.3 ? `M${cx - bw / 2},${ch.y(0)}h${bw}v-1.5h${-bw}Z`
        : `M${cx - bw / 2},${ch.y(0)}V${yy + 4}Q${cx - bw / 2},${yy} ${cx - bw / 2 + 4},${yy}H${cx + bw / 2 - 4}Q${cx + bw / 2},${yy} ${cx + bw / 2},${yy + 4}V${ch.y(0)}Z`;
      const r = S('path', { d, fill: cols[i], class: 'pt' }, ch.svg);
      txt(ch.svg, cx, yy - 6, fx(e, 1), { 'text-anchor': 'middle', class: 'lbl strong' });
      txt(ch.svg, cx, ch.m.t + ch.ih + 16, t(k), { 'text-anchor': 'middle', class: i === 4 ? 'lbl strong' : 'lbl', style: 'font-size:11.5px' });
      txt(ch.svg, cx, ch.m.t + ch.ih + 30, fx(v, 1), { 'text-anchor': 'middle', class: 'lbl', style: 'font-size:11px' });
      const tipFn = ev => showTip(`<b>${t(k)}, ${fx(v, 1)} Mg/ha</b>` + row(null, t('roAsh'), fx(M.ashG(v), 2) + ' g') + row(null, 'EC', fx(e, 1) + ' dS/m') +
        row(C.barley, t('barley'), pct(Mo.growth(e, 'barley')) + '%') + row(C.bean, t('bean'), pct(Mo.growth(e, 'bean')) + '%'), ev.clientX, ev.clientY);
      r.addEventListener('pointermove', tipFn); r.addEventListener('pointerdown', tipFn);
      r.addEventListener('pointerleave', e2 => { if (e2.pointerType !== 'touch') hideTip(); });
    });
    [[D.SPECIES.bean.a, t('thrBean'), C.bean], [D.SPECIES.barley.a, t('thrBarley'), C.barley]].forEach(([v, n, c]) => {
      S('line', { x1: ch.m.l, x2: ch.m.l + ch.iw, y1: ch.y(v), y2: ch.y(v), stroke: c, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, ch.top);
      txt(ch.top, ch.m.l + ch.iw + 6, ch.y(v) + 4, `${n} ${v}`, { class: 'lbl', style: 'font-size:11px' });
    });
  }

  // growth colour ramp (single hue, light = little growth, dark = full growth)
  const RAMP = ['#f4f8fd', '#cce3fd', '#9dc8f7', '#6aabf1', '#338ced', '#2370cd', '#1757ac', '#0e3d7e'].map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  function rampRGB(v) { const p = Math.max(0, Math.min(1, v / 100)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(p)), f = p - i; return RAMP[i].map((c, j) => Math.round(c + (RAMP[i + 1][j] - c) * f)); }
  function renderHeat(M) {
    const el = $('#chHeat'), sp = state.heat;
    const ch = frame(el, { x: [0, 1], y: [0, 40], xLabel: t('axF'), yLabel: t('axLoad'), label: t('tHeat'), margin: { r: 64 }, ratio: 0.45, minH: 250, maxH: 380, xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    const nx = 101, ny = 81, cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const f = i / (nx - 1), Lv = 40 * (1 - j / (ny - 1));
      const e = M.P.soilEC + M.P.ashEC * f * (M.P.ratio * M.ashG(Lv) / M.water);
      const [r, g, b] = rampRGB(Mo.growth(e, sp)), o = (j * nx + i) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    S('image', { href: cv.toDataURL(), x: ch.m.l, y: ch.m.t, width: ch.iw, height: ch.ih, preserveAspectRatio: 'none' }, ch.clip);
    // 50% contour, solved exactly
    const s = D.SPECIES[sp], ec50 = s.a + 50 / Mo.slopeB(sp), pts = [];
    if (ec50 > M.P.soilEC) for (let i = 1; i <= 200; i++) {
      const f = i / 200, m = (ec50 - M.P.soilEC) * M.water / (M.P.ratio * M.P.ashEC * f), Lv = m * 100 / M.area;
      if (Lv <= 40) pts.push([f, Lv]);
    }
    if (pts.length > 1) {
      line(ch, pts.map(p => p[0]), pts.map(p => p[1]), { stroke: '#fff', 'stroke-width': 4, opacity: 0.9 });
      line(ch, pts.map(p => p[0]), pts.map(p => p[1]), { stroke: C.char, 'stroke-width': 1.6, 'stroke-dasharray': '6 4' });
      const lp = pts[Math.min(pts.length - 1, Math.floor(pts.length * 0.15))];
      const tl = txt(ch.top, ch.x(lp[0]) + 8, Math.max(ch.m.t + 12, ch.y(lp[1]) - 6), t('half'), { class: 'lbl strong' });
      tl.setAttribute('style', 'paint-order:stroke;stroke:#fff;stroke-width:3px');
    }
    FIELD.forEach(([k, v]) => {
      S('line', { x1: ch.m.l, x2: ch.m.l + ch.iw, y1: ch.y(v), y2: ch.y(v), stroke: '#fff', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.9 }, ch.clip);
    });
    // current point
    S('circle', { cx: ch.x(state.f), cy: ch.y(state.load), r: 7, fill: 'none', stroke: '#fff', 'stroke-width': 3.5 }, ch.top);
    S('circle', { cx: ch.x(state.f), cy: ch.y(state.load), r: 7, fill: 'none', stroke: C.char, 'stroke-width': 1.8 }, ch.top);
    // ramp legend
    const rx = ch.W - 40, rh = ch.ih, gid = 'rg' + clipN;
    const lg = S('linearGradient', { id: gid, x1: 0, y1: 1, x2: 0, y2: 0 }, S('defs', {}, ch.svg));
    RAMP.forEach((c, i) => S('stop', { offset: i / (RAMP.length - 1), 'stop-color': `rgb(${c.join(',')})` }, lg));
    S('rect', { x: rx, y: ch.m.t, width: 12, height: rh, fill: `url(#${gid})`, stroke: C.rule }, ch.svg);
    [0, 50, 100].forEach(v => txt(ch.svg, rx + 16, ch.m.t + rh * (1 - v / 100) + 4, v + '%', { class: 'lbl', style: 'font-size:11px' }));
    const hit = hover(ch, (xv, yv) => {
      const Lv = Math.max(0, Math.min(40, yv)), e = M.P.soilEC + M.P.ashEC * xv * (M.P.ratio * M.ashG(Lv) / M.water);
      return { cross: false, html: `<b>f = ${fx(xv, 2)}, ${fx(Lv, 1)} Mg/ha</b>` + row(null, 'EC', fx(e, 1) + ' dS/m') + row(C[sp], t(sp), pct(Mo.growth(e, sp)) + '%') };
    });
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', ev => {
      const r = ch.svg.getBoundingClientRect();
      state.f = +Math.max(0, Math.min(1, ch.xi(ev.clientX - r.left))).toFixed(2);
      state.load = +Math.max(0, Math.min(40, ch.yi(ev.clientY - r.top))).toFixed(1);
      syncInputs(); schedule('hero', 'model');
    });
  }

  // ---------- measured ----------
  function levelStats() {
    const out = [];
    D.BARLEY.forEach(r => LEVELS.forEach(k => {
      const v = r.h[k]; if (!v.length) return;
      out.push({ set: r.set, day: r.day, date: r.date, k, n: v.length, mean: Mo.mean(v), se: v.length > 1 ? Mo.sd(v) / Math.sqrt(v.length) : 0 });
    }));
    return out;
  }
  function levelLegendHTML() {
    return LEVELS.map(k => `<li><svg width="18" height="14" aria-hidden="true">${shapeSVG(SHAPE[k], 9, 7, 5, ORD[k])}</svg>${lvName(k)}</li>`).join('');
  }
  function shapeSVG(shape, cx, cy, r, c) {
    if (shape === 'circle') return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
    if (shape === 'square') return `<rect x="${cx - r * 0.88}" y="${cy - r * 0.88}" width="${r * 1.76}" height="${r * 1.76}" fill="${c}"/>`;
    if (shape === 'triangle') return `<path d="M${cx},${cy - r * 1.2}L${cx + r * 1.1},${cy + r * 0.8}L${cx - r * 1.1},${cy + r * 0.8}Z" fill="${c}"/>`;
    return `<path d="M${cx},${cy - r * 1.25}L${cx + r * 1.05},${cy}L${cx},${cy + r * 1.25}L${cx - r * 1.05},${cy}Z" fill="${c}"/>`;
  }
  function renderTime() {
    const el = $('#chTime'); el.innerHTML = '';
    const lg = document.createElement('ul'); lg.className = 'legend'; lg.style.margin = '0 0 6px'; lg.innerHTML = levelLegendHTML(); el.appendChild(lg);
    const wrap = document.createElement('div'); wrap.style.display = 'grid'; wrap.style.gap = '12px';
    wrap.style.gridTemplateColumns = el.clientWidth > 640 ? '1fr 1fr' : '1fr'; el.appendChild(wrap);
    const st = levelStats(), dodge = { 0: -0.27, 1: -0.09, 3: 0.09, 6: 0.27 };
    [[1, [3, 15]], [2, [3, 12]]].forEach(([s, xr]) => {
      const box = document.createElement('div'); box.className = 'chart'; wrap.appendChild(box);
      const days = [...new Set(st.filter(r => r.set === s).map(r => r.day))].sort((a, b) => a - b);
      const ch = frame(box, { x: xr, y: [0, 10], xTicks: days, yTicks: [0, 2, 4, 6, 8, 10], xLabel: t('axDay'), yLabel: t('axHeight'), label: t('tTime'), margin: { t: 26 }, ratio: 0.66, minH: 240, maxH: 320 });
      txt(ch.top, ch.m.l, 14, t(s === 1 ? 'set1d' : 'set2d'), { class: 'lbl strong', style: 'font-size:13px' });
      LEVELS.forEach(k => {
        const d = st.filter(r => r.set === s && r.k === k);
        line(ch, d.map(r => r.day + dodge[k]), d.map(r => r.mean), { stroke: ORD[k], 'stroke-width': 2.2 });
        d.forEach(r => {
          const X = ch.x(r.day + dodge[k]);
          if (r.se > 0) S('path', { d: `M${X},${ch.y(r.mean - r.se)}V${ch.y(r.mean + r.se)}M${X - 3},${ch.y(r.mean - r.se)}h6M${X - 3},${ch.y(r.mean + r.se)}h6`, stroke: ORD[k], 'stroke-width': 1.5, fill: 'none' }, ch.clip);
          mark(ch.clip, SHAPE[k], X, ch.y(r.mean), 4.6, { fill: ORD[k], stroke: '#fff', 'stroke-width': 1.2 });
        });
      });
      hover(ch, xv => {
        const dd = nearest(days, xv), rows = st.filter(r => r.set === s && r.day === dd);
        return { x: dd, html: `<b>${t(s === 1 ? 'set1' : 'set2')}, ${t('dayN', { d: dd })}</b>` + rows.map(r => row(ORD[r.k], lvName(r.k), `${fx(r.mean, 1)} ± ${fx(r.se, 1)} (n=${r.n})`)).join('') };
      });
    });
  }
  function renderDots() {
    const el = $('#chDots');
    const fin = D.BARLEY.filter(r => r.date === '11/6');
    const ch = frame(el, { x: [0, 9], y: [0, 18.5], xTicks: false, yTicks: [0, 5, 10, 15], yLabel: t('axHeight'), label: t('tDots'), margin: { t: 26, b: 58 }, ratio: 0.72, minH: 280, maxH: 380 });
    S('line', { x1: ch.x(4.5), x2: ch.x(4.5), y1: ch.m.t, y2: ch.m.t + ch.ih, stroke: C.rule }, ch.top);
    fin.forEach(r => {
      const base = r.set === 1 ? 0.5 : 5, col = r.set === 1 ? C.barley : C.barleyL;
      txt(ch.top, ch.x(base + 1.75), 14, `${t(r.set === 1 ? 'set1' : 'set2')}, ${t('dayN', { d: r.day })}`, { class: 'lbl strong', 'text-anchor': 'middle' });
      LEVELS.forEach((k, i) => {
        const v = r.h[k].slice().sort((a, b) => a - b), cx = base + i * 1.15 + 0.2;
        const n = v.length, offs = v.map((_, j) => n > 1 ? -0.22 + 0.44 * ((j * 5) % n) / (n - 1) : 0);
        const used = v.filter(h => !(state.ex168 && r.set === 1 && k === 6 && h === 16.8));
        v.forEach((h, j) => {
          const out = state.ex168 && r.set === 1 && k === 6 && h === 16.8;
          const c = S('circle', { cx: ch.x(cx + offs[j]), cy: ch.y(h), r: 4.6, fill: out ? '#fff' : col, stroke: out ? C.ink2 : '#fff', 'stroke-width': out ? 1.4 : 1.2, class: 'pt', style: 'cursor:default' }, ch.svg);
          const f = ev => showTip(`<b>${t(r.set === 1 ? 'set1' : 'set2')}, ${lvName(k)}</b>` + row(col, t('axHeight'), fx(h, 1) + ' cm'), ev.clientX, ev.clientY);
          c.addEventListener('pointermove', f); c.addEventListener('pointerdown', f); c.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
        });
        if (used.length) {
          const m = Mo.mean(used), se = used.length > 1 ? Mo.sd(used) / Math.sqrt(used.length) : 0, X = ch.x(cx + 0.42);
          S('path', { d: `M${X},${ch.y(m - se)}V${ch.y(m + se)}M${X - 4},${ch.y(m - se)}h8M${X - 4},${ch.y(m + se)}h8M${X - 9},${ch.y(m)}h18`, stroke: C.navy, 'stroke-width': 2.2, fill: 'none' }, ch.svg);
        }
        txt(ch.svg, ch.x(cx + 0.1), ch.m.t + ch.ih + 17, k === 0 ? '0' : gTxt(k), { 'text-anchor': 'middle', class: 'lbl' });
        txt(ch.svg, ch.x(cx + 0.1), ch.m.t + ch.ih + 31, `n=${used.length}`, { 'text-anchor': 'middle', class: 'lbl', style: 'font-size:10.5px' });
      });
    });
    txt(ch.svg, ch.m.l + ch.iw / 2, ch.H - 6, t('axAshG'), { 'text-anchor': 'middle', class: 'lbl', style: 'font-weight:600;fill:#20242a' });
    const lgd = S('g', {}, ch.svg);
    S('path', { d: `M${ch.m.l + ch.iw - 112},${ch.m.t + 8}h16`, stroke: C.navy, 'stroke-width': 2.2 }, lgd);
    txt(lgd, ch.m.l + ch.iw - 90, ch.m.t + 12, t('meanSE'), { class: 'lbl' });
  }
  function renderTables(obs) {
    const r = $('#tRatio');
    r.querySelectorAll('thead,tbody').forEach(n => n.remove());
    r.insertAdjacentHTML('beforeend', `<thead><tr><th>${t('colAsh')}</th><th class="num">${t('colPlants')}</th><th class="num">${t('colPct')}</th><th class="num">${t('colCI')}</th></tr></thead><tbody>` +
      `<tr><td>0</td><td class="num">${obs.nByLevel[0]}</td><td class="num">100</td><td class="num">—</td></tr>` +
      Mo.DOSE_KEYS.map((k, i) => `<tr><td>${gTxt(k)}</td><td class="num">${obs.nByLevel[i + 1]}</td><td class="num">${pct(obs.pct[i])}</td><td class="num">${pct(obs.lo[i])}–${pct(obs.hi[i])}</td></tr>`).join('') + '</tbody>');
    const e = $('#tEmerge');
    e.querySelectorAll('thead,tbody').forEach(n => n.remove());
    const mx = (s, k) => Math.max(...D.BARLEY.filter(r2 => r2.set === s).map(r2 => r2.h[k].length));
    e.insertAdjacentHTML('beforeend', `<thead><tr><th>${t('colAsh')}</th>${LEVELS.map(k => `<th class="num">${k === 0 ? '0' : gTxt(k)}</th>`).join('')}</tr></thead><tbody>` +
      [1, 2].map(s => `<tr><td>${t(s === 1 ? 'set1' : 'set2')}</td>${LEVELS.map(k => `<td class="num">${mx(s, k)}/${D.SEEDS_PER_LEVEL}</td>`).join('')}</tr>`).join('') + '</tbody>');
  }

  function renderPot() {
    const P2 = D.POT, el = $('#chPot');
    const days = P2.records.map(r => r.day);
    const ch = frame(el, { x: [4, 15], y: [0, 8], xTicks: days, yTicks: [0, 2, 4, 6, 8], xLabel: t('axDay'), yLabel: t('axHeight'), label: t('tPot'), margin: { r: 96 }, ratio: 0.62, minH: 240, maxH: 320 });
    const col = { pM: ORD[3], pH: ORD[6] }, shp = { pM: 'triangle', pH: 'diamond' };
    const ends = [];
    P2.pots.filter(p => P2.records.some(r => r.h[p.id].length)).forEach(p => {
      const n = Math.max(...P2.records.map(r => r.h[p.id].length));
      for (let j = 0; j < n; j++) {
        const pts = P2.records.filter(r => r.h[p.id].length > j).map(r => [r.day, r.h[p.id][j]]);
        line(ch, pts.map(q => q[0]), pts.map(q => q[1]), { stroke: col[p.id], 'stroke-width': 2.2 });
        pts.forEach(q => mark(ch.clip, shp[p.id], ch.x(q[0]), ch.y(q[1]), 4.4, { fill: col[p.id], stroke: '#fff', 'stroke-width': 1.2 }));
        const last = pts[pts.length - 1];
        ends.push({ y: last[1], s: `${fx(p.g, 2)} g` + (n > 1 ? ` (${t('plantN', { n: j + 1 })})` : ''), x: last[0], c: col[p.id] });
      }
    });
    ends.sort((a, b) => a.y - b.y); let prev = Infinity;
    ends.forEach(e => { let yy = ch.y(e.y) + 4; if (yy > prev - 13) yy = prev - 13; prev = yy; txt(ch.top, ch.x(e.x) + 9, yy, e.s, { class: 'lbl', style: 'font-size:11.5px' }); });
    hover(ch, xv => {
      const dd = nearest(days, xv), r = P2.records.find(q => q.day === dd);
      return { x: dd, html: `<b>${r.date}, ${t('dayN', { d: dd })}</b>` + P2.pots.map(p => row(col[p.id] || null, `${fx(p.g, 2)} g`, r.h[p.id].length ? r.h[p.id].map(v => fx(v, 1)).join(', ') + ' cm' : '—')).join('') };
    });
    const tb = $('#tPot'); tb.querySelectorAll('thead,tbody').forEach(n => n.remove());
    const lastR = P2.records[P2.records.length - 1];
    const M0 = Mo.makeModel(), pm = Mo.potModel(M0, state.potDepth);
    $('#potDepthOut').textContent = fx(state.potDepth, 1);
    tb.insertAdjacentHTML('beforeend', `<thead><tr><th>${t('colPot')}</th><th class="num">${t('colAshPot')}</th><th class="num">Mg/ha</th><th class="num">${t('colEC1')}</th><th class="num">${t('colB1')}</th><th class="num">${t('colSeedl')}</th><th class="num">${t('colH25')}</th></tr></thead><tbody>` +
      P2.pots.map(p => { const n = Math.max(...P2.records.map(r => r.h[p.id].length)), e = pm.ec(p.g); return `<tr><td>${L(p.label)}</td><td class="num">${fx(p.g, 2)}</td><td class="num">${fx(p.load, 1)}</td><td class="num">${fx(e, 1)}</td><td class="num">${pct(Mo.growth(e, 'barley'))}</td><td class="num">${n}/${P2.seeds}</td><td class="num">${lastR.h[p.id].length ? lastR.h[p.id].map(v => fx(v, 1)).join(', ') : '—'}</td></tr>`; }).join('') + '</tbody>');
    const gp = Mo.grownPots(), kmax = Math.min(...gp.map(p => D.SPECIES.barley.ec0 * pm.water / (M0.P.ratio * p.g)));
    const gmax = Math.max(...gp.map(p => p.g)), dcrit = M0.P.ashEC * M0.P.ratio * gmax / (D.SPECIES.barley.ec0 * D.POT.area * M0.P.porosity);
    const ash = D.POT.pots.filter(p => p.g > 0), e = ash.map(p => pm.ec(p.g));
    $('#potPred').textContent = t('potPred', { d: fx(state.potDepth, 1), y1: pct(Mo.growth(e[0], 'barley')), y2: pct(Mo.growth(e[1], 'barley')), y3: pct(Mo.growth(e[2], 'barley')),
      e1: fx(e[0], 1), e2: fx(e[1], 1), e3: fx(e[2], 1), kmax: fx(kmax, 1), dcrit: fx(dcrit, 1) });
  }

  // ---------- calibration ----------
  let CAL = null;
  function buildCal() {
    const M0 = Mo.makeModel(), obs = Mo.observedRatios(state.ex168), grid = Mo.makeGrid(), Cb = Mo.createCalibrator(M0, obs, grid);
    const w = Cb.posterior();
    CAL = { M0, obs, grid, Cb, w, potKey: null,
      prior: { barley: Cb.growthBand(LS, 'barley', grid.prior), bean: Cb.growthBand(LS, 'bean', grid.prior), k: Cb.kQuant(grid.prior) },
      post: { barley: Cb.growthBand(LS, 'barley', w), bean: Cb.growthBand(LS, 'bean', w), k: Cb.kQuant(w) },
      f1: { barley: LS.map(v => Mo.growth(M0.ec(v), 'barley')), bean: LS.map(v => Mo.growth(M0.ec(v), 'bean')) },
      maxDose: Math.max(...Cb.loads) };
  }
  function ensurePot() {
    if (CAL.potKey === state.potDepth) return;
    const wPot = CAL.Cb.posterior({ usePot: true, potDepth: state.potDepth });
    CAL.wPot = wPot; CAL.potKey = state.potDepth;
    CAL.postPot = { barley: CAL.Cb.growthBand(LS, 'barley', wPot), bean: CAL.Cb.growthBand(LS, 'bean', wPot), k: CAL.Cb.kQuant(wPot) };
  }
  function renderBA(sp) {
    const el = $('#chBA_' + sp), ymax = sp === 'barley' ? 170 : 105;
    const ch = frame(el, { x: [0, 40], y: [0, ymax], yTicks: sp === 'barley' ? [0, 25, 50, 75, 100, 125, 150] : [0, 25, 50, 75, 100], xLabel: t('axLoad'), yLabel: t('axGrowth'), label: t('hCalib') + ': ' + t(sp), margin: { t: 22 } });
    const pr = CAL.prior[sp], po = (state.usePot ? CAL.postPot : CAL.post)[sp];
    S('rect', { x: ch.x(0), y: ch.m.t, width: ch.x(CAL.maxDose) - ch.x(0), height: ch.ih, fill: 'rgba(26,58,92,.07)' }, ch.clip);
    band(ch, LS, pr.map(q => q[0]), pr.map(q => q[2]), { fill: C.beforeBand });
    band(ch, LS, po.map(q => q[0]), po.map(q => q[2]), { fill: C.afterBand });
    line(ch, LS, pr.map(q => q[1]), { stroke: C.before, 'stroke-width': 1.6 });
    line(ch, LS, CAL.f1[sp], { stroke: C.before, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
    line(ch, LS, po.map(q => q[1]), { stroke: C.after, 'stroke-width': 2.6 });
    FIELD.forEach(([k, v]) => vline(ch, v, t('p' + k)));
    const tl = txt(ch.top, ch.x(CAL.maxDose / 2), ch.m.t + ch.ih - 8, t('tested'), { class: 'lbl', 'text-anchor': 'middle', style: 'font-size:11px;paint-order:stroke;stroke:#fff;stroke-width:3px' });
    if (sp === 'barley') {
      const o = CAL.obs;
      Mo.DOSE_KEYS.forEach((k, i) => {
        const xv = CAL.Cb.loads[i], X = ch.x(xv), hi = Math.min(o.hi[i], ymax);
        S('path', { d: `M${X},${ch.y(o.lo[i])}V${ch.y(hi)}M${X - 4},${ch.y(o.lo[i])}h8` + (o.hi[i] <= ymax ? `M${X - 4},${ch.y(hi)}h8` : ''), stroke: C.navy, 'stroke-width': 1.8, fill: 'none' }, ch.top);
        if (o.hi[i] > ymax) txt(ch.top, X + 5, ch.y(ymax) + 10, `↑${pct(o.hi[i])}`, { class: 'lbl', style: 'font-size:11px' });
        const c = S('circle', { cx: X, cy: ch.y(o.pct[i]), r: 5.5, fill: C.navy, stroke: '#fff', 'stroke-width': 1.5, class: 'pt' }, ch.top);
        const f = ev => showTip(`<b>${t('measured')}: ${lvName(k)}</b>` + row(null, t('colLoad'), fx(xv, 1) + ' Mg/ha') + row(C.navy, t('colPct'), pct(o.pct[i]) + '%') + row(null, t('colCI'), `${pct(o.lo[i])}–${pct(o.hi[i])}%`), ev.clientX, ev.clientY);
        c.addEventListener('pointermove', f); c.addEventListener('pointerdown', f); c.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hideTip(); });
      });
    }
    hover(ch, xv => {
      const i = idxOf(xv), v = LS[i];
      return { x: v, pts: [{ y: pr[i][1], c: C.before }, { y: po[i][1], c: C.after }],
        html: `<b>${t(sp)}, ${fx(v, 1)} Mg/ha</b>` + row(C.before, t('lgBf1'), pct(CAL.f1[sp][i]) + '%') +
          row(C.before, t('before'), `${pct(pr[i][1])}% (${pct(pr[i][0])}–${pct(pr[i][2])})`) + row(C.after, t('after'), `${pct(po[i][1])}% (${pct(po[i][0])}–${pct(po[i][2])})`) };
    });
  }
  function legendItem(kind, label) {
    const svg = {
      tested: `<rect x="1" y="2" width="24" height="12" fill="rgba(26,58,92,.07)" stroke="#c9d0d8"/>`,
      bandB: `<rect x="1" y="3" width="24" height="10" fill="${C.beforeBand}"/>`,
      medB: `<line x1="1" x2="25" y1="8" y2="8" stroke="${C.before}" stroke-width="1.6"/>`,
      f1: `<line x1="1" x2="25" y1="8" y2="8" stroke="${C.before}" stroke-width="2" stroke-dasharray="6 4"/>`,
      bandA: `<rect x="1" y="3" width="24" height="10" fill="${C.afterBand}"/>`,
      medA: `<line x1="1" x2="25" y1="8" y2="8" stroke="${C.after}" stroke-width="2.6"/>`,
      obs: `<line x1="13" x2="13" y1="1" y2="15" stroke="${C.navy}" stroke-width="1.6"/><circle cx="13" cy="8" r="4.5" fill="${C.navy}" stroke="#fff" stroke-width="1.2"/>`,
    }[kind];
    return `<li><svg width="26" height="16" aria-hidden="true">${svg}</svg>${label}</li>`;
  }
  function renderCalib() {
    if (!CAL) buildCal();
    ensurePot();
    const M0 = CAL.M0, o = CAL.obs;
    // tray table: prediction before the experiment vs measurement, at the ash we added
    const tt = $('#tTray'); tt.querySelectorAll('thead,tbody').forEach(n => n.remove());
    const rowsT = LEVELS.map((k, i) => {
      const L = k === 0 ? 0 : CAL.Cb.loads[i - 1], e = M0.ec(L);
      const meas = k === 0 ? '100' : `${pct(o.pct[i - 1])} (${pct(o.lo[i - 1])}–${pct(o.hi[i - 1])})`;
      return `<tr><td>${k === 0 ? '0' : gTxt(k)}</td><td class="num">${fx(L, 1)}</td><td class="num">${fx(e, 1)}</td><td class="num">${pct(Mo.growth(e, 'barley'))}</td><td class="num">${pct(Mo.growth(e, 'bean'))}</td><td class="num">${meas}</td></tr>`;
    }).join('');
    tt.insertAdjacentHTML('beforeend', `<thead><tr><th>${t('colAsh')}</th><th class="num">${t('colEq')}</th><th class="num">${t('colEC1')}</th><th class="num">${t('colB1')}</th><th class="num">${t('colN1')}</th><th class="num">${t('colMeas')}</th></tr></thead><tbody>${rowsT}</tbody>`);
    const Lb = Mo.thresholdLoad(M0, 'barley'), Ln = Mo.thresholdLoad(M0, 'bean');
    const POST = state.usePot ? CAL.postPot : CAL.post, W = state.usePot ? CAL.wPot : CAL.w;
    $$('[data-after]').forEach(b => b.classList.toggle('on', (b.dataset.after === 'pot') === state.usePot));
    if (state.usePot) $('#verdict').textContent = t('verdictPot', { a: fx(CAL.prior.k[0], 1), b: fx(CAL.prior.k[2], 1), c: fx(POST.k[0], 1), d: fx(POST.k[2], 1), dep: fx(state.potDepth, 1) });
    else $('#verdict').textContent = t('verdict', { gmax: gTxt(6), Lmax: fx(CAL.maxDose, 1), Lb: fx(Lb, 0), gb: fx(Lb * M0.area / 100, 2), Ln: fx(Ln, 1), gn: fx(Ln * M0.area / 100, 2) });
    renderBA('barley'); renderBA('bean');
    $('#baLegend').innerHTML = legendItem('tested', t('tested')) + legendItem('bandB', t('lgB95')) + legendItem('medB', t('lgBmed')) + legendItem('f1', t('lgBf1')) + legendItem('bandA', t('lgA95')) + legendItem('medA', t('lgAmed')) + legendItem('obs', t('lgObs'));
    const k0 = CAL.prior.k, k1 = POST.k;
    $('#keyline').textContent = t('keyline', { a: fx(k0[0], 1), b: fx(k0[2], 1), c: fx(k1[0], 1), d: fx(k1[2], 1) });
    const tb = $('#tBA'); tb.querySelectorAll('thead,tbody').forEach(n => n.remove());
    let rows = '';
    ['barley', 'bean'].forEach(sp => FIELD.forEach(([k, v]) => {
      const f1 = Mo.growth(M0.ec(v), sp), b = CAL.Cb.growthQuant(v, sp, CAL.grid.prior), a = CAL.Cb.growthQuant(v, sp, W);
      rows += `<tr><td>${t(sp)}</td><td>${t('p' + k)} (${fx(v, 1)})</td><td class="num">${pct(f1)}</td><td class="num">${pct(b[1])} (${pct(b[0])}–${pct(b[2])})</td><td class="num">${pct(a[1])} (${pct(a[0])}–${pct(a[2])})</td></tr>`;
    }));
    tb.insertAdjacentHTML('beforeend', `<thead><tr><th>${t('colSp')}</th><th>${t('colLoad')} (Mg/ha)</th><th class="num">${t('colBf1')}</th><th class="num">${t('colBmed')}</th><th class="num">${t('colAmed')}</th></tr></thead><tbody>${rows}</tbody>`);
  }

  // ---------- sources ----------
  function renderSources() {
    const tb = $('#tSources');
    tb.innerHTML = `<thead><tr><th>${t('colItem')}</th><th>${t('colVal')}</th><th>${t('colUnit')}</th><th>${t('colSrc')}</th></tr></thead><tbody>` +
      D.SOURCES.map(s => {
        const val = L(s.value);
        return `<tr><td>${L(s.item)}</td><td>${val}</td><td>${s.unit}</td><td>${L(s.src)}</td></tr>`;
      }).join('') + '</tbody>';
    $('#limits').innerHTML = ['lim1', 'lim2', 'lim3', 'lim4', 'lim5', 'lim6', 'lim7'].map(k => `<li>${t(k)}</li>`).join('');
    $('#refs').innerHTML = D.REFERENCES.map(r => `<li>${r}</li>`).join('');
  }

  // ---------- i18n, inputs, scheduling ----------
  function applyText() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    $('#lang').textContent = t('langBtn');
    $('#lang').setAttribute('aria-label', state.lang === 'ko' ? 'Switch to English' : '한국어로 바꾸기');
  }
  const IN = [['ashEC', 'ashECOut', 0], ['f', 'fOut', 2], ['soilEC', 'soilECOut', 1], ['soilVol', 'soilVolOut', 1], ['porosity', 'porOut', 2]];
  function syncInputs() {
    IN.forEach(([k, o, d]) => { $('#' + k).value = state[k]; $('#' + o).textContent = fx(state[k], d); });
    $('#load').value = state.load;
    $('#ex168').checked = state.ex168;
    $$('[data-heat]').forEach(b => b.classList.toggle('on', b.dataset.heat === state.heat));
  }
  const pending = new Set(); let raf = 0;
  function schedule(...parts) { parts.forEach(p => pending.add(p)); if (!raf) raf = requestAnimationFrame(flush); }
  function flush() {
    raf = 0; const p = new Set(pending); pending.clear();
    const M = model();
    if (p.has('hero')) renderHero();
    if (p.has('model')) { renderGrowthChart(M); renderECChart(M); renderHeat(M); }
    if (p.has('measured')) { renderTime(); renderDots(); renderTables(Mo.observedRatios(state.ex168)); renderPot(); }
    if (p.has('calib')) renderCalib();
    if (p.has('sources')) renderSources();
  }
  const ALL = ['hero', 'model', 'measured', 'calib', 'sources'];

  function bind() {
    $('#load').addEventListener('input', e => { state.load = +e.target.value; schedule('hero', 'model'); });
    $$('.presets button').forEach(b => b.addEventListener('click', () => { state.load = +b.dataset.load; schedule('hero', 'model'); }));
    IN.forEach(([k, o, d]) => $('#' + k).addEventListener('input', e => { state[k] = +e.target.value; $('#' + o).textContent = fx(state[k], d); schedule('hero', 'model'); }));
    $('#reset').addEventListener('click', () => { Object.assign(state, { ashEC: P0.ashEC, f: P0.f, soilEC: P0.soilEC, soilVol: SOILVOL0, porosity: P0.porosity }); syncInputs(); schedule('hero', 'model'); });
    $$('[data-heat]').forEach(b => b.addEventListener('click', () => { state.heat = b.dataset.heat; syncInputs(); schedule('model'); }));
    $('#potDepth').addEventListener('input', e => { state.potDepth = +e.target.value; schedule('measured', 'calib'); });
    $$('[data-after]').forEach(b => b.addEventListener('click', () => { state.usePot = b.dataset.after === 'pot'; schedule('calib'); }));
    $('#ex168').addEventListener('change', e => { state.ex168 = e.target.checked; CAL = null; schedule('measured', 'calib'); });
    $('#lang').addEventListener('click', () => {
      state.lang = state.lang === 'ko' ? 'en' : 'ko';
      try { localStorage.setItem('g27-lang', state.lang); } catch (e) { /* storage blocked: language resets on reload */ }
      applyText(); schedule(...ALL);
    });
    let lastW = innerWidth, to = 0;
    addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) < 8) return; lastW = innerWidth; clearTimeout(to); to = setTimeout(() => schedule(...ALL), 150); });
  }

  $$('.presets button[data-key]').forEach(b => { b.dataset.load = doseLoad(+b.dataset.key); b.querySelector('.g').textContent = gTxt(+b.dataset.key) + ' g'; });
  syncInputs(); applyText(); bind(); schedule(...ALL);
})();
