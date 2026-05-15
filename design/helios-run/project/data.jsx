// data.jsx — sample dataset for RunStamp prototype
// Gilla, marathon trainee in Bangalore. ~75 km/week.

const USER = {
  name: 'Gilla',
  handle: 'gilla',
  homeCity: 'Bangalore',
  country: 'IN',
  units: 'metric',
  joined: '2023-08-01',
  avatar: null,
};

// helper to generate a polyline as percent-of-canvas points
// each route is a parametric squiggle
function route(seed, kind = 'loop') {
  const pts = [];
  const N = kind === 'out' ? 60 : 80;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    let x, y;
    if (kind === 'loop') {
      // Cubbon-park style figure-of-eight
      const a = t * Math.PI * 2;
      x = 0.5 + 0.30 * Math.sin(a + seed) + 0.06 * Math.sin(a * 3 + seed);
      y = 0.5 + 0.22 * Math.sin(a * 2 + seed * 0.7) + 0.04 * Math.cos(a * 5 + seed);
    } else if (kind === 'lake') {
      const a = t * Math.PI * 2;
      x = 0.5 + 0.28 * Math.cos(a + seed) + 0.04 * Math.sin(a * 4);
      y = 0.5 + 0.18 * Math.sin(a + seed) + 0.06 * Math.cos(a * 3);
    } else if (kind === 'out') {
      // out-and-back along a coastline
      const u = t < 0.5 ? t * 2 : (1 - t) * 2;
      x = 0.08 + u * 0.84 + 0.02 * Math.sin(t * 18 + seed);
      y = 0.55 + 0.10 * Math.sin(t * 6 + seed) - (t < 0.5 ? 0 : 0.02);
    } else if (kind === 'trail') {
      // hilly meander
      const a = t * Math.PI * 1.6;
      x = 0.15 + 0.7 * t + 0.08 * Math.sin(a * 3 + seed);
      y = 0.7 - 0.5 * t + 0.10 * Math.cos(a * 4 + seed);
    } else { // 'urban'
      const a = t * 6.2;
      x = 0.2 + t * 0.6 + 0.08 * Math.sin(a + seed);
      y = 0.3 + 0.4 * Math.sin(t * 3 + seed) + 0.04 * Math.cos(a * 2);
    }
    pts.push([x, y]);
  }
  return pts;
}

const SHOES = [
  { id: 's1', brand: 'Saucony', model: 'Endorphin Speed 4', color: '#e85d2f', km: 312, cap: 600, primary: true,  retired:false, since:'2026-02-10' },
  { id: 's2', brand: 'ASICS',   model: 'Novablast 4',        color: '#3c6e8c', km: 188, cap: 700, primary: false, retired:false, since:'2026-03-04' },
  { id: 's3', brand: 'Nike',    model: 'Vaporfly 3',         color: '#d4ff3a', km:  64, cap: 250, primary: false, retired:false, since:'2026-01-20', race: true },
  { id: 's4', brand: 'Hoka',    model: 'Clifton 9',          color: '#a89576', km: 612, cap: 700, primary: false, retired:false, since:'2025-09-12' },
];

// Activities — newest first. Last ~3 months of training, plus a few travel runs.
const ACT = [
  {
    id:'a1', date:'2026-05-14', day:'Sun', time:'05:42',
    title:'Cubbon Park long run',
    place:'Cubbon Park, Bangalore', city:'Bangalore', country:'India',
    distance:24.02, seconds:7920, elev:86, pace:330, // sec/km computed below
    avgHr:152, maxHr:168, cal:1684, cadence:174, shoe:'s1',
    splits:[5,5,5,30,32,28,30,29,31,29,30,30,31,29,29,30,31,32,33,34,35,30,28,29].map((d,i)=>({k:i+1, sec: 320 + d*1.5, hr: 140+(i%7)*3})),
    streamHr: gen(120, 30, [140,165], 0.4),
    streamPace: gen(120, 30, [310,360], 0.5),
    route: route(0.3,'loop'),
    notes:'Cool dawn, sub-150 HR cap until 18K. Felt strong.',
    weather:{t:24, w:'Misty', icon:'fog'},
    kind:'long',
  },
  {
    id:'a2', date:'2026-05-12', day:'Fri', time:'06:10',
    title:'Sankey Tank loops',
    place:'Sankey Tank, Bangalore', city:'Bangalore', country:'India',
    distance:8.12, seconds:2400, elev:18,
    avgHr:148, maxHr:158, cal:540, cadence:178, shoe:'s2',
    splits:[{k:1,sec:298,hr:142},{k:2,sec:295,hr:148},{k:3,sec:296,hr:150},{k:4,sec:293,hr:152},{k:5,sec:294,hr:153},{k:6,sec:296,hr:153},{k:7,sec:294,hr:152},{k:8,sec:294,hr:151}],
    streamHr: gen(40, 30, [140,158], 0.3),
    route: route(1.1,'lake'),
    weather:{t:22, w:'Clear', icon:'clear'},
    kind:'easy',
  },
  {
    id:'a3', date:'2026-05-10', day:'Wed', time:'06:00',
    title:'400m × 10 intervals',
    place:'Kanteerava Stadium, Bangalore', city:'Bangalore', country:'India',
    distance:9.45, seconds:2700, elev:8,
    avgHr:162, maxHr:182, cal:680, cadence:188, shoe:'s3',
    streamHr: gen(45, 30, [120,185], 0.9),
    route: route(2.4,'urban'),
    weather:{t:23, w:'Humid', icon:'cloud'},
    kind:'workout',
  },
  {
    id:'a4', date:'2026-05-08', day:'Mon', time:'06:30',
    title:'Hebbal Lake recovery',
    place:'Hebbal Lake, Bangalore', city:'Bangalore', country:'India',
    distance:6.30, seconds:2070, elev:12,
    avgHr:138, maxHr:146, cal:410, cadence:170, shoe:'s2',
    route: route(3.0,'lake'),
    streamHr: gen(35, 30, [132,146], 0.2),
    weather:{t:21, w:'Clear', icon:'clear'},
    kind:'easy',
  },
  {
    id:'a5', date:'2026-05-05', day:'Fri', time:'06:00',
    title:'Marine Drive sunrise',
    place:'Marine Drive, Mumbai', city:'Mumbai', country:'India',
    distance:12.10, seconds:3720, elev:6,
    avgHr:150, maxHr:160, cal:820, cadence:176, shoe:'s1',
    route: route(4.5,'out'),
    streamHr: gen(60, 30, [142,160], 0.4),
    weather:{t:28, w:'Humid', icon:'cloud'},
    kind:'travel',
  },
  {
    id:'a6', date:'2026-04-26', day:'Sun', time:'06:00',
    title:'Sunday 28K',
    place:'Cubbon Park, Bangalore', city:'Bangalore', country:'India',
    distance:28.05, seconds:9540, elev:108,
    avgHr:155, maxHr:171, cal:1980, cadence:174, shoe:'s1',
    route: route(5.2,'loop'),
    streamHr: gen(140, 30, [145,170], 0.3),
    weather:{t:25, w:'Clear', icon:'clear'},
    kind:'long',
  },
  {
    id:'a7', date:'2026-04-12', day:'Sat', time:'06:30',
    title:'Vagator beach run',
    place:'Vagator, Goa', city:'Goa', country:'India',
    distance:9.40, seconds:3120, elev:14,
    avgHr:152, maxHr:165, cal:660, cadence:172, shoe:'s2',
    route: route(6.7,'out'),
    weather:{t:30, w:'Hot', icon:'sun'},
    kind:'travel',
  },
  {
    id:'a8', date:'2026-03-17', day:'Mon', time:'07:00',
    title:'Hampstead Heath',
    place:'Hampstead Heath, London', city:'London', country:'United Kingdom',
    distance:11.20, seconds:3600, elev:142,
    avgHr:155, maxHr:172, cal:780, cadence:170, shoe:'s4',
    route: route(7.9,'trail'),
    weather:{t:9, w:'Drizzle', icon:'rain'},
    kind:'travel',
  },
  {
    id:'a9', date:'2026-01-22', day:'Wed', time:'06:00',
    title:'Imperial Palace loop',
    place:'Chiyoda, Tokyo', city:'Tokyo', country:'Japan',
    distance:10.00, seconds:2880, elev:24,
    avgHr:148, maxHr:158, cal:680, cadence:178, shoe:'s4',
    route: route(8.5,'loop'),
    weather:{t:6, w:'Crisp', icon:'clear'},
    kind:'travel',
  },
];

function gen(N, _hz, [lo, hi], variance){
  const arr = []; let v = (lo+hi)/2;
  for(let i=0;i<N;i++){
    v += (Math.random()-0.5)*variance*(hi-lo)*0.2;
    if(v<lo) v=lo+Math.random()*5; if(v>hi) v=hi-Math.random()*5;
    arr.push(v);
  }
  return arr;
}

// Compute pace per activity
ACT.forEach(a => { a.pace = Math.round(a.seconds / a.distance); });

// This-week stats (Mon May 11 → Sun May 17, with Sun being today)
const THIS_WEEK = {
  km: 47.89,
  runs: 4,
  seconds: 13020,
  elev: 124,
  vsLast: { km: +5.3, runs: 0, seconds: +20*60 }, // delta
  days: [
    { d:'M', date:11, km:0,    rest:true },
    { d:'T', date:12, km:8.12, kind:'easy' },
    { d:'W', date:13, km:9.45, kind:'workout' },
    { d:'T', date:14, km:0,    rest:true },
    { d:'F', date:15, km:6.30, kind:'easy' },
    { d:'S', date:16, km:0,    rest:true },
    { d:'S', date:17, km:24.02, kind:'long', today:true },
  ],
};

const BEST_EFFORTS_MONTH = [
  { d:'1K',  t:'3:42',  date:'May 10', isPR:false },
  { d:'5K',  t:'21:14', date:'May 10', isPR:true },
  { d:'10K', t:'44:32', date:'May 10', isPR:false },
  { d:'HM',  t:'1:42:18', date:'Apr 26', isPR:false },
];

const ALLTIME = {
  km: 4287, runs: 612, seconds: 4287*330, elev: 38420,
  longest: 32.4, fastest5k: '20:52', fastestHM:'1:38:44', fastestM:'3:32:18',
  streak: 6, longestStreak: 28,
};

// Year heatmap: 52 weeks × 7 days. Density 0–4
function yearHeatmap(){
  const out = [];
  for(let w=0; w<52; w++){
    const week = [];
    // training cycle: build period before week 30, taper, race-recover-rebuild
    const baseLoad = 0.5 + 0.4*Math.sin((w/52)*Math.PI*2);
    for(let d=0; d<7; d++){
      const r = Math.random();
      let v = 0;
      if (r < baseLoad*0.7) v = 0;
      else if (r < baseLoad*0.85) v = 1;
      else if (r < baseLoad*0.93) v = 2;
      else if (r < baseLoad*0.98) v = 3;
      else v = 4;
      // Sundays are usually long runs
      if (d === 6 && Math.random() < 0.75) v = Math.max(v, 3);
      // future weeks empty
      if (w > 19) v = 0;
      week.push(v);
    }
    out.push(week);
  }
  return out;
}
const HEATMAP = yearHeatmap();

const MONTHLY_KM = [
  { m:'Jan', km: 248, runs: 18 },
  { m:'Feb', km: 286, runs: 21 },
  { m:'Mar', km: 312, runs: 22 },
  { m:'Apr', km: 318, runs: 23 },
  { m:'May', km: 188, runs: 13, partial:true },
];

const WEEKLY_KM = [
  // last 12 weeks, ending this week
  {w:'W10', km:54.2}, {w:'W11', km:61.5}, {w:'W12', km:62.8}, {w:'W13', km:68.4},
  {w:'W14', km:71.0}, {w:'W15', km:74.2}, {w:'W16', km:80.6}, {w:'W17', km:76.9},
  {w:'W18', km:82.1}, {w:'W19', km:78.4}, {w:'W20', km:42.5, taper:true}, {w:'W21', km:47.9, current:true},
];

const PLACES = [
  { city:'Bangalore', country:'India',  cc:'IN', lat:12.97, lon:77.59, runs:421, km:3142, first:'2023-08-04' },
  { city:'Mumbai',    country:'India',  cc:'IN', lat:19.07, lon:72.87, runs:18,  km:138,  first:'2024-02-11' },
  { city:'Delhi',     country:'India',  cc:'IN', lat:28.61, lon:77.20, runs:6,   km:48,   first:'2024-11-02' },
  { city:'Goa',       country:'India',  cc:'IN', lat:15.30, lon:74.12, runs:8,   km:64,   first:'2024-12-28' },
  { city:'Chennai',   country:'India',  cc:'IN', lat:13.08, lon:80.27, runs:4,   km:32,   first:'2025-03-19' },
  { city:'Hyderabad', country:'India',  cc:'IN', lat:17.38, lon:78.49, runs:3,   km:22,   first:'2025-07-08' },
  { city:'London',    country:'UK',     cc:'GB', lat:51.51, lon:-0.13, runs:11,  km:96,   first:'2024-09-12' },
  { city:'Paris',     country:'France', cc:'FR', lat:48.86, lon:2.35,  runs:5,   km:42,   first:'2024-09-19' },
  { city:'Tokyo',     country:'Japan',  cc:'JP', lat:35.68, lon:139.69, runs:7,  km:58,   first:'2026-01-20' },
  { city:'Singapore', country:'Singapore', cc:'SG', lat:1.35, lon:103.82, runs:4,km:34,   first:'2025-04-12' },
  { city:'New York',  country:'USA',    cc:'US', lat:40.71, lon:-74.00, runs:9,  km:78,   first:'2023-10-15' },
  { city:'Lisbon',    country:'Portugal',cc:'PT', lat:38.72, lon:-9.14, runs:6,  km:52,   first:'2025-06-22' },
];

const RECAPS = [
  { eyebrow:'THIS MONTH', body:"You've run in", num:3, suffix:'cities', detail:'Bangalore · Mumbai · Goa' },
  { eyebrow:'STREAK',     body:'Longest run streak this year', num:'12d', suffix:'and counting', detail:'Apr 19 — present' },
  { eyebrow:'NEW BEST',   body:'5K personal best', num:'21:14', suffix:'on May 10', detail:'Kanteerava Stadium · 400m × 10' },
  { eyebrow:'CONSISTENCY',body:'Sundays run', num:'14/15', suffix:'this year', detail:'Long-run discipline.' },
];

// Helpers
function fmtPace(secPerKm, units='km'){
  if(units==='mi') secPerKm = Math.round(secPerKm * 1.609);
  secPerKm = Math.round(secPerKm);
  const m = Math.floor(secPerKm/60), s = secPerKm%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function fmtTime(sec){
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function fmtDist(km, units='km'){
  if(units==='mi') return (km/1.609).toFixed(2);
  return km.toFixed(2);
}
function distUnit(units='km'){ return units==='mi' ? 'mi' : 'km'; }
function paceUnit(units='km'){ return units==='mi' ? '/mi' : '/km'; }

Object.assign(window, {
  USER, ACT, THIS_WEEK, BEST_EFFORTS_MONTH, ALLTIME, HEATMAP,
  MONTHLY_KM, WEEKLY_KM, PLACES, SHOES, RECAPS, route,
  fmtPace, fmtTime, fmtDist, distUnit, paceUnit,
});
