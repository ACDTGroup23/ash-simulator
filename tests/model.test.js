// Run: node tests/model.test.js   — checks the web model against the Colab notebook outputs.
const M = require('../assets/model.js');
const D = require('../assets/data.js');
let fail = 0;
const near = (name, got, want, tol) => { const ok = Math.abs(got - want) <= tol; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got.toFixed(3)} (notebook ${want})`); };
const m = M.makeModel();
near('cell area cm2', m.area, 11.56, 0.005); near('cell water mL', m.water, 36.1, 0.05);
[[6.0, 3.2, 100, 59], [15.9, 8.4, 98, 0], [34.2, 18.1, 50, 0]].forEach(([L, ec, ba, be]) => {
  const e = m.ec(L); near(`EC @${L}`, e, ec, 0.05); near(`barley % @${L}`, M.growth(e, 'barley'), ba, 0.5); near(`bean % @${L}`, M.growth(e, 'bean'), be, 0.5);
});
const o = M.observedRatios();
near('obs n', o.n, 46, 0); near('obs dof', o.dof, 41, 0);
[[101, 63, 161], [84, 53, 134], [124, 74, 208]].forEach(([p, lo, hi], i) => { near(`obs % ${M.PINCHES[i]}p`, o.pct[i], p, 0.5); near(`obs lo ${M.PINCHES[i]}p`, o.lo[i], lo, 0.6); near(`obs hi ${M.PINCHES[i]}p`, o.hi[i], hi, 0.6); });
const g = M.makeGrid(), C = M.createCalibrator(m, o, g);
const k0 = C.kQuant(g.prior); near('prior k 2.5%', k0[0], 0.5, 0.06); near('prior k median', k0[1], 14.3, 0.06); near('prior k 97.5%', k0[2], 45.6, 0.06);
const b0 = C.growthQuant(34.2, 'barley', g.prior); near('prior barley@34.2 lo', b0[0], 15, 0.6);
const w = C.posterior(0.5, 0.1);
const k1 = C.kQuant(w); near('post(0.5±0.1) k median', k1[1], 10.3, 0.06); near('post k 97.5%', k1[2], 28.6, 0.06);
const b1 = C.growthQuant(34.2, 'barley', w); near('post barley@34.2 lo', b1[0], 62, 0.6);
const n1 = C.growthQuant(6.0, 'bean', w); near('post bean@6 lo', n1[0], 67, 0.6);
const h1 = C.growthQuant(15.9, 'bean', w); near('post bean@15.9 median', h1[1], 69, 0.6);
// sweep threshold: barley@Extreme band narrower than 90% of prior width
const PG = M.linspace(0.02, 1.5, 75), w0 = b0[2] - b0[0];
let thr = null; for (const pg of PG) { const q = C.growthQuant(34.2, 'barley', C.posterior(pg)); if (q[2] - q[0] < 0.9 * w0) { thr = pg; break; } }
near('sweep threshold g', thr, 0.24, 0.011);
// growthBand must equal growthQuant
const Ls=[0,6,15.9,25,34.2,40]; ['barley','bean'].forEach(sp=>{const gb=C.growthBand(Ls,sp,w); Ls.forEach((Lv,i)=>{const q=C.growthQuant(Lv,sp,w); q.forEach((v,j)=>near(`band==quant ${sp}@${Lv} q${j}`,gb[i][j],v,1e-9));});});
console.log(fail ? `\n${fail} FAILED` : '\nall checks passed'); process.exit(fail ? 1 : 0);
