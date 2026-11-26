/* G27 Ash–Growth Simulator — model (same equations as the Colab notebook, chapters 2, 3 and 8). */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.G27_DATA;

  // ---------- small numeric helpers ----------
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); };

  // inverse standard normal CDF (Acklam, relative error < 1.2e-9)
  function normInv(p) {
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const normPdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  // Student t quantile (Cornish–Fisher expansion; error < 1e-4 for dof >= 10)
  function tInv(p, v) {
    const z = normInv(p), z3 = z ** 3, z5 = z ** 5, z7 = z ** 7;
    return z + (z3 + z) / (4 * v) + (5 * z5 + 16 * z3 + 3 * z) / (96 * v * v) + (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * v ** 3);
  }
  function invert(M) {   // Gauss–Jordan
    const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      const pv = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= pv;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map(r => r.slice(n));
  }
  // np.interp(q, c, v) for ascending c
  function interp(q, c, v) {
    if (q <= c[0]) return v[0];
    let lo = 0, hi = c.length - 1;
    if (q >= c[hi]) return v[hi];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < q) lo = m; else hi = m; }
    return v[lo] + (q - c[lo]) * (v[hi] - v[lo]) / (c[hi] - c[lo]);
  }

  // ---------- chain: load -> ash g -> EC -> growth ----------
  function makeModel(over = {}) {
    const P = Object.assign({}, D.PARAMS, over);
    const area = P.cellSide ** 2;
    const soilVol = over.soilVol != null ? over.soilVol : P.cellSide ** 2 * (P.cellDepth - P.topGap);
    const water = soilVol * P.porosity;
    const ashG = L => L * area / 100;                                              // m = L x A / 100
    const ec = (L, k = P.ashEC * P.f) => P.soilEC + k * (P.ratio * ashG(L) / water);  // k = ash EC x f
    return { P, area, soilVol, water, ashG, ec };
  }
  function growth(ecv, sp) {                                                       // Maas & Hoffman
    const s = D.SPECIES[sp], b = 100 / (s.ec0 - s.a);
    return clamp(100 - b * (ecv - s.a), 0, 100);
  }
  const slopeB = sp => 100 / (D.SPECIES[sp].ec0 - D.SPECIES[sp].a);
  // ash load (Mg/ha) at which a species starts to lose growth, for a given model (EC reaches threshold a)
  function thresholdLoad(M, sp) {
    const a = D.SPECIES[sp].a, k = M.P.ashEC * M.P.f;
    if (a <= M.P.soilEC || k <= 0) return a <= M.P.soilEC ? 0 : Infinity;
    const m = (a - M.P.soilEC) * M.water / (M.P.ratio * k); return m * 100 / M.area;
  }

  // ---------- measured: barley on 6 Nov, log(height) = level + set ----------
  const DOSE_KEYS = [1, 3, 6];
  const doseG = k => D.ASH_LEVELS.find(l => l.key === k).g;
  function finalRows(exclude168 = false) {
    const rows = [];
    D.BARLEY.filter(r => r.date === '11/6').forEach(r => {
      for (const k of [0, 1, 3, 6]) r.h[k].forEach(v => {
        if (exclude168 && r.set === 1 && k === 6 && v === 16.8) return;
        rows.push({ set: r.set, level: k, h: v });
      });
    });
    return rows;
  }
  function observedRatios(exclude168 = false) {
    const rows = finalRows(exclude168);
    const X = rows.map(r => [1, +(r.level === 1), +(r.level === 3), +(r.level === 6), +(r.set === 2)]);
    const y = rows.map(r => Math.log(r.h));
    const p = 5, n = rows.length;
    const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, x) => s + x[i] * x[j], 0)));
    const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, x, r) => s + x[i] * y[r], 0));
    const inv = invert(XtX);
    const beta = inv.map(r => r.reduce((s, v, j) => s + v * Xty[j], 0));
    const res = y.map((v, r) => v - X[r].reduce((s, x, j) => s + x * beta[j], 0));
    const dof = n - p, s2 = res.reduce((s, v) => s + v * v, 0) / dof;
    const cov = [1, 2, 3].map(i => [1, 2, 3].map(j => s2 * inv[i][j]));
    const L = [beta[1], beta[2], beta[3]];
    const t = tInv(0.975, dof);
    const se = [0, 1, 2].map(i => Math.sqrt(cov[i][i]));
    return {
      n, dof, L, cov, covInv: invert(cov), setDiff: beta[4],
      nByLevel: [0, 1, 3, 6].map(k => rows.filter(r => r.level === k).length),
      pct: L.map(v => 100 * Math.exp(v)),
      lo: L.map((v, i) => 100 * Math.exp(v - t * se[i])),
      hi: L.map((v, i) => 100 * Math.exp(v + t * se[i])),
    };
  }

  // ---------- pots (barley second trial): soil water from the pot area and soil depth ----------
  function potModel(M, depth = D.POT.soilDepthMin) {
    const vol = D.POT.area * depth, water = vol * M.P.porosity;  // soil depth is at least 2 cm (seeds sown 2 cm deep)
    return { vol, depth, water,
      ec: (g, k = M.P.ashEC * M.P.f) => M.P.soilEC + k * (M.P.ratio * g / water) };
  }
  // pots where seedlings grew (ash > 0): used only when the pot constraint is switched on
  const grownPots = () => D.POT.pots.filter(p => p.g > 0 && D.POT.records.some(r => r.h[p.id].length));

  // ---------- before -> after (Bayes on a grid of f x ash EC) ----------
  // ash EC and f only appear as their product k (effective ash EC), so k carries everything.
  function makeGrid(P = D.PARAMS) {
    const fs = linspace(0, 1, 201), as = linspace(1, 90, 90);
    let wa = as.map(a => normPdf(a, P.ashEC, P.ashEC_sd)); const sa = wa.reduce((s, v) => s + v, 0); wa = wa.map(v => v / sa);
    const cells = [];
    for (const f of fs) for (let j = 0; j < as.length; j++) cells.push({ k: as[j] * f, w: wa[j] / fs.length });
    cells.sort((a, b) => a.k - b.k);
    return { k: Float64Array.from(cells.map(c => c.k)), prior: Float64Array.from(cells.map(c => c.w)) };
  }

  function createCalibrator(M, obs, grid) {
    const N = grid.k.length;
    const loads = DOSE_KEYS.map(k => doseG(k) * 100 / M.area);     // measured grams -> Mg/ha
    function logLik(scale = 1) {
      const ll = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const d = loads.map((L, j) => Math.log(Math.max(growth(M.ec(L * scale, grid.k[i]), 'barley'), 0.5) / 100) - obs.L[j]);
        let q = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) q += d[a] * obs.covInv[a][b] * d[b];
        ll[i] = -0.5 * q;
      }
      return ll;
    }
    // after = before x agreement with the measured barley heights at the doses we really used.
    // usePot: also keep only values for which barley can grow (growth > 0) in the pots where seedlings grew.
    const GP = grownPots();
    function posterior(opts = {}) {
      const PM = potModel(M, opts.potDepth);
      const ll = logLik(opts.scale || 1);
      let mx = -Infinity; for (let i = 0; i < N; i++) mx = Math.max(mx, ll[i]);
      const w = new Float64Array(N); let s = 0;
      for (let i = 0; i < N; i++) {
        const ok = !opts.usePot || GP.every(p => growth(PM.ec(p.g, grid.k[i]), 'barley') > 0);
        w[i] = ok ? grid.prior[i] * Math.exp(ll[i] - mx) : 0; s += w[i];
      }
      for (let i = 0; i < N; i++) w[i] /= s;
      return w;
    }
    // weighted quantiles exactly as numpy: sort values, cumulative weights, np.interp
    function kQuant(w, qs = [0.025, 0.5, 0.975]) {
      const c = new Float64Array(N); let s = 0; for (let i = 0; i < N; i++) { s += w[i]; c[i] = s; }
      return qs.map(q => interp(q, c, grid.k));
    }
    function growthQuant(L, sp, w, qs = [0.025, 0.5, 0.975]) {
      // growth falls as k rises, so ascending growth = descending k
      const c = new Float64Array(N), v = new Float64Array(N); let s = 0;
      for (let i = 0; i < N; i++) { const j = N - 1 - i; s += w[j]; c[i] = s; v[i] = growth(M.ec(L, grid.k[j]), sp); }
      return qs.map(q => interp(q, c, v));
    }
    function growthBand(Ls, sp, w, qs = [0.025, 0.5, 0.975]) {
      // same result as growthQuant for every load, but the interpolation position is found once:
      // the cumulative weights (in descending-k order) do not depend on the load.
      const c = new Float64Array(N); let s = 0;
      for (let i = 0; i < N; i++) { s += w[N - 1 - i]; c[i] = s; }
      const pos = qs.map(q => {
        if (q <= c[0]) return [0, 0, 0];
        if (q >= c[N - 1]) return [N - 1, N - 1, 0];
        let lo = 0, hi = N - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < q) lo = m; else hi = m; }
        return [lo, hi, (q - c[lo]) / (c[hi] - c[lo])];
      });
      return Ls.map(L => pos.map(([lo, hi, fr]) => {
        const vlo = growth(M.ec(L, grid.k[N - 1 - lo]), sp), vhi = growth(M.ec(L, grid.k[N - 1 - hi]), sp);
        return vlo + fr * (vhi - vlo);
      }));
    }
    return { posterior, kQuant, growthQuant, growthBand, prior: grid.prior, loads, grownPots: GP };
  }

  const api = { clamp, linspace, mean, sd, normInv, tInv, invert, interp, makeModel, growth, slopeB, thresholdLoad, potModel, grownPots, DOSE_KEYS, doseG, finalRows, observedRatios, makeGrid, createCalibrator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.G27_MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
