/* G27 Ash–Growth Simulator — inputs and measured data.
   Every number has a source (see SOURCES). Edit MEASURED_PINCH after the team weighs one pinch of ash. */
(function (root) {
  'use strict';

  // ▼ 팀이 재 1꼬집 무게를 재면 여기만 고칩니다. Edit this after weighing one pinch of ash.
  //   예/example: { g: 0.25, sd: 0.04, note: '11/27, An Sanghyeon, 10 pinches' }
  const MEASURED_PINCH = null;

  const PARAMS = {
    loads: { Low: 6.0, High: 15.9, Extreme: 34.2 },   // Mg/ha, Santín et al. (2015)
    cellSide: 3.4,        // cm, measured (12-cell tray)
    cellDepth: 5.4,       // cm, measured
    topGap: 1.0,          // cm, ISO 11269-2:2012 §10.2
    porosity: 0.71,       // Bilderback & Fonteno (1987)
    ashEC: 33.0,          // dS/m, ash:water 1:5, Neina et al. (2020)
    ashEC_sd: 14.0,       // dS/m, Neina et al. (2020)
    ratio: 5.0,           // the 5 in 1:5
    soilEC: 0.0,          // dS/m, assumption (not measured)
    f: 1.0,               // share of ash salts reaching the root zone; worst case before calibration
  };

  const SPECIES = {
    barley: { a: 8.0, ec0: 28.0, name: { en: 'Barley', ko: '보리' }, latin: 'Hordeum vulgare' },   // Maas & Hoffman (1977); FAO 29
    bean:   { a: 1.0, ec0: 6.3,  name: { en: 'Bean',   ko: '강낭콩' }, latin: 'Phaseolus vulgaris' }, // Maas & Hoffman (1977); FAO 29
  };
  const BARLEY_GERM_LIMIT = [4.0, 5.0];  // dS/m, Ayers & Westcot (1985), FAO 29 Table 4 footnote

  // Barley heights (cm) from the team sheet "G27 보리 키 기록표" (PDF, 26 Nov).
  // Set 1 sown 23 Oct, Set 2 sown 26 Oct. Keys = pinches of ash per cell. Order within a list is not plant identity.
  const BARLEY = [
    { date: '10/27', set: 1, day: 4,  h: { 0: [0.7, 0.6], 1: [], 3: [], 6: [] } },
    { date: '10/28', set: 1, day: 5,  h: { 0: [2.5, 2.9, 2.9], 1: [2.5, 0.5], 3: [1.6, 2.1, 2.9, 3.8], 6: [1.4, 2.2, 3.1] } },
    { date: '10/30', set: 1, day: 7,  h: { 0: [2.2, 4.2, 7.1, 7.2, 7.4, 5.4, 0.8], 1: [0.3, 4.3, 8.2, 1.0, 2.5, 2.7, 1.8], 3: [5.7, 6.1, 7.3, 7.5, 3.5, 2.2], 6: [5.8, 2.4, 4.9, 6.0, 4.5, 2.1, 8.8] } },
    { date: '11/2',  set: 1, day: 10, h: { 0: [9.3, 7.2, 5.2, 3.3, 8.0, 4.5, 5.0], 1: [8.4, 0.5, 5.3, 0.9, 3.0, 3.0, 2.0], 3: [9.0, 2.4, 4.0, 0.7, 0.3, 7.0, 6.0, 5.0], 6: [18.0, 6.0, 6.0, 7.0, 6.0, 5.0, 2.0] } },
    { date: '11/4',  set: 1, day: 12, h: { 0: [3.5, 5.5, 8.7, 7.6, 4.3, 7.3], 1: [1.0, 1.8, 3.2, 2.8, 1.7, 7.7, 5.4], 3: [8.0, 4.2, 2.2, 0.6, 0.6, 6.4, 5.8, 7.4], 6: [15.6, 6.0, 6.3, 4.0, 3.0, 6.2, 7.0] } },
    { date: '11/6',  set: 1, day: 14, h: { 0: [4.0, 6.2, 9.4, 7.6, 5.6, 9.1, 4.5], 1: [2.5, 3.2, 3.4, 3.3, 5.7, 10.1], 3: [3.0, 4.0, 8.5, 0.8, 5.1, 6.9, 7.3], 6: [6.5, 6.7, 16.8, 6.7, 6.0, 4.6, 2.8] } },
    { date: '10/30', set: 2, day: 4,  h: { 0: [1.5, 1.0, 2.1, 0.7, 2.6], 1: [1.2, 0.9, 2.0, 1.1, 1.1, 1.9], 3: [0.5, 0.8, 0.7], 6: [1.5, 0.9, 1.1] } },
    { date: '11/2',  set: 2, day: 7,  h: { 0: [0.7, 4.0, 1.3, 2.0, 1.3, 2.1], 1: [1.0, 2.3, 3.2, 3.0, 4.4], 3: [2.4, 1.0, 1.5], 6: [4.2, 1.0, 3.5] } },
    { date: '11/4',  set: 2, day: 9,  h: { 0: [3.2, 1.7, 1.7, 1.2, 2.4], 1: [3.3, 5.0, 2.5, 3.9, 0.6, 2.3], 3: [2.1, 1.2, 1.6, 2.3, 0.2, 0.6], 6: [3.2, 1.2] } },
    { date: '11/6',  set: 2, day: 11, h: { 0: [5.0, 0.9, 1.5, 2.4, 2.5, 0.7], 1: [4.0, 5.1, 4.2, 3.0, 1.1, 1.7], 3: [1.4, 2.6, 2.0, 2.6, 1.6], 6: [3.9, 2.1] } },
  ];
  const SEEDS_PER_LEVEL = 9;   // 3 cells x 3 seeds, team report

  const SOURCES = [
    { item: { en: 'Ash load: Low, High, Extreme', ko: '재 부하량: 저강도 · 고강도 · 극심' }, value: '6.0 · 15.9 · 34.2', unit: 'Mg/ha', src: 'Santín et al. (2015)' },
    { item: { en: 'Cell side and depth', ko: '칸 한 변 · 높이' }, value: '3.4 · 5.4', unit: 'cm', src: { en: 'Measured (12-cell tray)', ko: '실측 (12구 모종판)' } },
    { item: { en: 'Soil surface below the rim', ko: '흙 표면 ~ 칸 위 끝' }, value: '1.0', unit: 'cm', src: 'ISO 11269-2:2012, §10.2' },
    { item: { en: 'Pore space of cell soil', ko: '흙 속 빈틈 비율' }, value: '0.71', unit: '—', src: 'Bilderback & Fonteno (1987)' },
    { item: { en: 'EC of ash in water (1:5)', ko: '재 1:5 액의 EC' }, value: '33 (SD 14)', unit: 'dS/m', src: 'Neina et al. (2020)' },
    { item: { en: 'EC is proportional to dissolved salt', ko: 'EC는 녹은 양에 비례' }, value: '—', unit: '—', src: 'Rusydi (2018)' },
    { item: { en: 'EC of the potting soil itself', ko: '상토 자체의 EC' }, value: '0', unit: 'dS/m', src: { en: 'Assumption (not measured)', ko: '가정 (측정하지 않음)' } },
    { item: { en: 'Barley: threshold a, EC at 0% growth', ko: '보리: 문턱 a, 생장 0%가 되는 EC' }, value: '8.0 · 28', unit: 'dS/m', src: 'Maas & Hoffman (1977); Ayers & Westcot (1985)' },
    { item: { en: 'Bean: threshold a, EC at 0% growth', ko: '강낭콩: 문턱 a, 생장 0%가 되는 EC' }, value: '1.0 · 6.3', unit: 'dS/m', src: 'Maas & Hoffman (1977); Ayers & Westcot (1985)' },
    { item: { en: 'Barley germination limit (topsoil EC)', ko: '보리 발아 한계 (윗흙 EC)' }, value: '4–5', unit: 'dS/m', src: 'Ayers & Westcot (1985), Table 4 note' },
    { item: { en: 'Barley heights, 23 Oct – 6 Nov', ko: '보리 키, 10/23 ~ 11/6' }, value: { en: '46 plants on 6 Nov', ko: '11/6 46포기' }, unit: 'cm', src: { en: 'Team record sheet "G27 보리 키 기록표"', ko: '팀 기록표 "G27 보리 키 기록표"' } },
    { item: { en: 'Mass of one pinch of ash', ko: '재 1꼬집 무게' }, value: { en: 'not yet measured', ko: '아직 재지 않음' }, unit: 'g', src: { en: 'Team measurement (pending)', ko: '팀 실측 (예정)' } },
    { item: { en: 'Updating before → after (Bayes)', ko: '실험 전 → 실험 후 갱신 (베이즈)' }, value: '—', unit: '—', src: 'Gelman et al. (2013)' },
  ];

  const REFERENCES = [
    'Ayers, R. S., & Westcot, D. W. (1985). <i>Water quality for agriculture</i> (FAO Irrigation and Drainage Paper No. 29, Rev. 1). Food and Agriculture Organization of the United Nations.',
    'Bilderback, T. E., & Fonteno, W. C. (1987). Effects of container geometry and media physical properties on air and water volumes in containers. <i>Journal of Environmental Horticulture, 5</i>(4), 180–182.',
    'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian data analysis</i> (3rd ed.). CRC Press.',
    'International Organization for Standardization. (2012). <i>Soil quality — Determination of the effects of pollutants on soil flora — Part 2: Effects of contaminated soil on the emergence and early growth of higher plants</i> (ISO Standard No. 11269-2:2012).',
    'Maas, E. V., & Hoffman, G. J. (1977). Crop salt tolerance — Current assessment. <i>Journal of the Irrigation and Drainage Division, 103</i>(2), 115–134.',
    'Neina, D., Faust, S., & Joergensen, R. G. (2020). Characterization of charcoal and firewood ash for use in African peri-urban agriculture. <i>Chemical and Biological Technologies in Agriculture, 7</i>, Article 5.',
    'Rusydi, A. F. (2018). Correlation between conductivity and total dissolved solid in various type of water: A review. <i>IOP Conference Series: Earth and Environmental Science, 118</i>, Article 012019.',
    'Santín, C., Doerr, S. H., Otero, X. L., & Chafer, C. J. (2015). Quantity, composition and water contamination potential of ash produced under different wildfire severities. <i>Environmental Research, 142</i>, 297–308.',
  ];

  const api = { MEASURED_PINCH, PARAMS, SPECIES, BARLEY_GERM_LIMIT, BARLEY, SEEDS_PER_LEVEL, SOURCES, REFERENCES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.G27_DATA = api;
})(typeof window !== 'undefined' ? window : globalThis);
