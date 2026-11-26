// Run: node tests/model.test.js   — checks the web model against the Colab notebook outputs.
const M = require('../assets/model.js');
let fail = 0;
const near = (name, got, want, tol) => { const ok = Math.abs(got - want) <= tol; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${(+got).toFixed(3)} (notebook ${want})`); };
const m = M.makeModel();
near('cell area cm2', m.area, 11.56, 0.005); near('cell water mL', m.water, 36.1, 0.05);
[[6.0, 3.2, 100, 59], [15.9, 8.4, 98, 0], [34.2, 18.1, 50, 0]].forEach(([L, ec, ba, be]) => {
  const e = m.ec(L); near(`EC @${L}`, e, ec, 0.05); near(`barley % @${L}`, M.growth(e, 'barley'), ba, 0.5); near(`bean % @${L}`, M.growth(e, 'bean'), be, 0.5);
});
// measured doses: 1/4 of 0.69 / 1.84 / 3.95 g
[[1, 0.1725, 1.492, 0.79], [3, 0.46, 3.979, 2.10], [6, 0.9875, 8.542, 4.51]].forEach(([k, g, L, ec]) => {
  near(`dose g (${k})`, M.doseG(k), g, 1e-9); near(`dose Mg/ha (${k})`, M.doseG(k) * 100 / m.area, L, 0.001); near(`EC f=1 (${k})`, m.ec(M.doseG(k) * 100 / m.area), ec, 0.005);
});
near('barley threshold load', M.thresholdLoad(m, 'barley'), 15.1, 0.05);
near('bean threshold load', M.thresholdLoad(m, 'bean'), 1.89, 0.01);
const o = M.observedRatios();
near('obs n', o.n, 46, 0); near('obs dof', o.dof, 41, 0);
[[101, 63, 161], [84, 53, 134], [124, 74, 208]].forEach(([p, lo, hi], i) => { near(`obs % lvl${i + 1}`, o.pct[i], p, 0.5); near(`obs lo lvl${i + 1}`, o.lo[i], lo, 0.6); near(`obs hi lvl${i + 1}`, o.hi[i], hi, 0.6); });
const g = M.makeGrid(), C = M.createCalibrator(m, o, g);
const k0 = C.kQuant(g.prior); near('prior k 2.5%', k0[0], 0.54, 0.01); near('prior k median', k0[1], 14.31, 0.01); near('prior k 97.5%', k0[2], 45.58, 0.01);
const w = C.posterior();
const k1 = C.kQuant(w); near('post k 2.5%', k1[0], 0.54, 0.01); near('post k median', k1[1], 14.30, 0.01); near('post k 97.5%', k1[2], 45.44, 0.01);
near('post barley@34.2 lo', C.growthQuant(34.2, 'barley', w)[0], 16, 0.6);
near('post barley@15.9 lo', C.growthQuant(15.9, 'barley', w)[0], 82, 0.6);
near('post bean@6 lo', C.growthQuant(6.0, 'bean', w)[0], 37, 0.6);
near('post bean@15.9 median', C.growthQuant(15.9, 'bean', w)[1], 50, 0.6);
// pots: soil at least 2 cm deep (seeds sown 2 cm deep)
const pm = M.potModel(m); near('pot depth cm', pm.depth, 2.0, 1e-9); near('pot water mL', pm.water, 134.9, 0.05);
[[5.70, 7.0, 100], [15.11, 18.5, 48], [32.49, 39.7, 0]].forEach(([gp, ec, ba]) => { near(`pot EC f=1 ${gp} g`, pm.ec(gp), ec, 0.05); near(`pot barley f=1 ${gp} g`, M.growth(pm.ec(gp), 'barley'), ba, 0.5); });
const wp = C.posterior({ usePot: true }), kp = C.kQuant(wp);
near('tray+pot(2cm) k 2.5%', kp[0], 0.38, 0.01); near('tray+pot(2cm) k median', kp[1], 9.87, 0.01); near('tray+pot(2cm) k 97.5%', kp[2], 22.42, 0.01);
near('tray+pot(2cm) barley@34.2 lo', C.growthQuant(34.2, 'barley', wp)[0], 79, 0.6);
near('tray+pot(2cm) bean@15.9 median', C.growthQuant(15.9, 'bean', wp)[1], 71, 0.6); near('tray+pot(2cm) bean@15.9 lo', C.growthQuant(15.9, 'bean', wp)[0], 11, 0.6);
near('tray+pot(2cm) bean@34.2 median', C.growthQuant(34.2, 'bean', wp)[1], 17, 0.6);
const k3 = C.kQuant(C.posterior({ usePot: true, potDepth: 3.0 })); near('tray+pot(3cm) k 97.5%', k3[2], 32.85, 0.01);
const Ls = [0, 6, 15.9, 25, 34.2, 40]; ['barley', 'bean'].forEach(sp => { const gb = C.growthBand(Ls, sp, w); Ls.forEach((Lv, i) => { const q = C.growthQuant(Lv, sp, w); q.forEach((v, j) => near(`band==quant ${sp}@${Lv} q${j}`, gb[i][j], v, 1e-9)); }); });
console.log(fail ? `\n${fail} FAILED` : '\nall checks passed'); process.exit(fail ? 1 : 0);
