// screen-analytics.jsx — year/month/all-time

function AnalyticsScreen({ go, units }){
  const c = useColors();
  const [scope, setScope] = React.useState('year'); // year | month | all
  const [year, setYear] = React.useState(2026);

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'14px 20px 0' }}>
        <Eyebrow>STATISTICS</Eyebrow>
        <div className="display" style={{ fontSize:30, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:2 }}>
          The <span className="serif" style={{ fontStyle:'italic' }}>bigger</span> picture.
        </div>
      </div>

      {/* Scope picker */}
      <div style={{ padding:'18px 14px 0' }}>
        <div style={{
          background:c.paper2, borderRadius:12, padding:4,
          display:'flex', border:`1px solid ${c.line}`,
        }}>
          {[
            ['year','Year'],
            ['month','Month'],
            ['all','All-time'],
          ].map(([id,l])=>(
            <div key={id} className="tap" onClick={()=>setScope(id)} style={{
              flex:1, padding:'9px 0', textAlign:'center', borderRadius:9,
              background: scope===id ? c.ink : 'transparent',
              color: scope===id ? c.paper : c.ink2,
              fontSize:13, fontWeight:500,
            }}>{l}</div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 20px 0' }}>
        {scope==='year' && <YearView year={year} setYear={setYear} units={units}/>}
        {scope==='month' && <MonthView units={units}/>}
        {scope==='all' && <AllTimeView units={units}/>}
      </div>
    </div>
  );
}

function YearView({ year, setYear, units }){
  const c = useColors();
  const cells = HEATMAP;
  const total = MONTHLY_KM.reduce((a,b)=>a+b.km, 0);
  return (
    <div>
      {/* Year selector */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div className="tap" onClick={()=>setYear(y=>y-1)} style={{ width:28, height:28, borderRadius:8, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.back width="14" height="14" style={{ color:c.ink2 }}/>
        </div>
        <div className="display" style={{ fontSize:24, letterSpacing:'-0.01em' }}>
          {year}
        </div>
        <div className="tap" onClick={()=>setYear(y=>y+1)} style={{ width:28, height:28, borderRadius:8, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.4 }}>
          <Icon.chevR width="14" height="14" style={{ color:c.ink2 }}/>
        </div>
      </div>

      {/* big totals */}
      <Card padded style={{ background:c.paper2 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:14 }}>
          <div>
            <Eyebrow>DISTANCE</Eyebrow>
            <div className="mono" style={{ fontSize:44, fontWeight:500, lineHeight:1, letterSpacing:'-0.03em' }}>
              {Math.round(total).toLocaleString()}
              <span style={{ fontSize:14, color:c.ink3, marginLeft:4 }}>{distUnit(units)}</span>
            </div>
          </div>
          <div>
            <Eyebrow>RUNS</Eyebrow>
            <div className="mono" style={{ fontSize:22, fontWeight:500 }}>97</div>
          </div>
          <div>
            <Eyebrow>HOURS</Eyebrow>
            <div className="mono" style={{ fontSize:22, fontWeight:500 }}>108</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:14, marginTop:10, fontSize:11, color:c.ink3 }}>
          <Delta value={+18.4} format={v=>`${v}% vs ${year-1}`}/>
          <span>On pace for 3,200 km ({year}).</span>
        </div>
      </Card>

      {/* Heatmap */}
      <SectionHeader title="Year in pixels" right={<span className="eyebrow" style={{ color:c.ink3 }}>52 W · 7 D</span>}/>
      <Card padded>
        <Heatmap data={cells}/>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, fontSize:10, color:c.ink3 }}>
          <span className="eyebrow">LESS</span>
          <div style={{ display:'flex', gap:3 }}>
            {[0,1,2,3,4].map(v=>(
              <div key={v} style={{ width:12, height:12, borderRadius:2, background: heatColor(v, c) }}/>
            ))}
          </div>
          <span className="eyebrow">MORE</span>
        </div>
      </Card>

      {/* Monthly chart */}
      <SectionHeader title="Monthly distance"/>
      <Card padded>
        <BarChart data={MONTHLY_KM} width={320} height={120} valKey="km" labelKey="m"
                  highlight={(d)=>d.partial}/>
        <div style={{ marginTop:8, fontSize:11, color:c.ink3, display:'flex', justifyContent:'space-between' }}>
          <span>Peak: <span className="mono" style={{ color:c.ink }}>Apr · 318 km</span></span>
          <span>Avg: <span className="mono" style={{ color:c.ink }}>270 km</span></span>
        </div>
      </Card>

      {/* PBs */}
      <SectionHeader title="Personal bests"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          ['5K',  '20:52', 'Kanteerava · Apr 12', true],
          ['10K', '44:32', 'May 10 · ▲ 1:14 in 2026', false],
          ['HM',  '1:38:44', 'Mumbai HM · Jan 19', true],
          ['M',   '3:32:18', 'Mumbai Mar · Jan 21', false],
        ].map(([d,t,sub,pr],i)=>(
          <Card key={i} padded>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <Eyebrow>{d}</Eyebrow>
              {pr && <span className="eyebrow" style={{ color:c.accent }}>NEW</span>}
            </div>
            <div className="mono" style={{ fontSize:22, fontWeight:500, marginTop:4 }}>{t}</div>
            <div style={{ fontSize:10.5, color:c.ink3, marginTop:2 }}>{sub}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function heatColor(v, c){
  if(v===0) return c.line2;
  if(v===1) return c.paper3;
  if(v===2) return c.ink3;
  if(v===3) return c.ink2;
  return c.accent;
}

function Heatmap({ data }){
  const c = useColors();
  const cell = 5;
  const gap = 1.5;
  return (
    <div>
      {/* month labels */}
      <div style={{ position:'relative', height:14, marginBottom:4, marginLeft:14 }}>
        {['J','F','M','A','M','J','J','A','S','O','N','D'].map((m,i)=>(
          <span key={i} style={{
            position:'absolute', left:i*(52/12)*(cell+gap),
            fontSize:9, color:c.ink3, fontWeight:500, fontFamily:'JetBrains Mono',
          }}>{m}</span>
        ))}
      </div>
      <div style={{ display:'flex' }}>
        <div style={{ display:'flex', flexDirection:'column', gap, marginRight:6 }}>
          {['M','','W','','F','','S'].map((d,i)=>(
            <span key={i} style={{ height:cell, fontSize:7.5, color:c.ink3, lineHeight:`${cell}px`, fontFamily:'JetBrains Mono' }}>{d}</span>
          ))}
        </div>
        <svg width={52*(cell+gap)} height={7*(cell+gap)}>
          {data.map((week, wi)=>(
            week.map((v, di)=>(
              <rect key={wi+'-'+di}
                x={wi*(cell+gap)} y={di*(cell+gap)}
                width={cell} height={cell} rx="0.8"
                fill={heatColor(v, c)}/>
            ))
          ))}
        </svg>
      </div>
    </div>
  );
}

function MonthView({ units }){
  const c = useColors();
  // build a calendar for May 2026
  const days = 31;
  const startDow = 4; // May 1 is a Friday
  const today = 17;
  // map active days from week/ACT
  const activeKm = {};
  ACT.forEach(a=>{
    if(a.date.startsWith('2026-05')){
      const d = parseInt(a.date.split('-')[2],10);
      activeKm[d] = (activeKm[d]||0) + a.distance;
    }
  });

  const cells = [];
  for(let i=0;i<startDow;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);

  return (
    <div>
      <Card padded style={{ background:c.paper2 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:10 }}>
          <div>
            <Eyebrow>MAY 2026</Eyebrow>
            <div className="mono" style={{ fontSize:36, fontWeight:500, lineHeight:1, letterSpacing:'-0.02em' }}>
              188.4<span style={{ fontSize:12, color:c.ink3, marginLeft:4 }}>{distUnit(units)}</span>
            </div>
            <div style={{ fontSize:11, color:c.ink3, marginTop:4 }}>
              13 runs · 14:32:18 · 412m climbed
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <Eyebrow>LOAD</Eyebrow>
            <div className="mono" style={{ fontSize:18, fontWeight:500, color:c.accent }}>HIGH</div>
            <div style={{ fontSize:10, color:c.ink3 }}>TSS · 142/wk</div>
          </div>
        </div>
        {/* weekday strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, marginTop:4 }}>
          {['M','T','W','T','F','S','S'].map((d,i)=>(
            <div key={i} style={{ textAlign:'center', fontSize:9, color:c.ink3, fontWeight:500 }}>{d}</div>
          ))}
          {cells.map((d,i)=>{
            const km = d && activeKm[d];
            const isToday = d===today;
            return (
              <div key={i} style={{
                aspectRatio:'1/1', borderRadius:6,
                background: km ? c.accent : (d ? c.paper : 'transparent'),
                border: isToday ? `1.5px solid ${c.ink}` : (d ? `1px solid ${c.line}`:'none'),
                position:'relative',
                display:'flex', alignItems:'center', justifyContent:'center',
                opacity: km ? Math.min(0.4 + km/30*0.6, 1) : 1,
              }}>
                {d && (
                  <span className="mono" style={{
                    fontSize:9, color: km ? '#fff' : c.ink3, fontWeight: isToday?600:400,
                  }}>{d}</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weekly bars */}
      <SectionHeader title="Weekly mileage" right={<span className="eyebrow" style={{ color:c.ink3 }}>LAST 12 W</span>}/>
      <Card padded>
        <BarChart data={WEEKLY_KM} width={320} height={130} valKey="km" labelKey="w"
                  highlight={(d)=>d.current}/>
        <div style={{ display:'flex', gap:14, fontSize:11, color:c.ink3, marginTop:8 }}>
          <span><Dot c={c.ink2}/> Mileage</span>
          <span><Dot c={c.accent}/> This week</span>
        </div>
      </Card>

      {/* Filters */}
      <SectionHeader title="Filter" right={<Icon.filter width="16" height="16" style={{ color:c.ink2 }}/>}/>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['All runs','Long ≥20K','Workouts','Easy','HR Z2','By shoe','Travel'].map((t,i)=>(
          <div key={t} className="tap" style={{
            padding:'7px 12px', borderRadius:999,
            border:`1px solid ${c.line}`,
            background: i===0 ? c.ink : 'transparent',
            color: i===0 ? c.paper : c.ink2,
            fontSize:12, fontWeight:500,
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function AllTimeView({ units }){
  const c = useColors();
  return (
    <div>
      <Card padded style={{ background:c.ink, color:c.paper, border:'none', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-40, top:-40, opacity:0.07 }}>
          <SunMark size={180}/>
        </div>
        <Eyebrow style={{ color:'rgba(243,237,226,0.5)' }}>SINCE AUG 2023</Eyebrow>
        <div className="mono" style={{ fontSize:64, fontWeight:500, lineHeight:0.95, letterSpacing:'-0.04em', marginTop:6 }}>
          4,287
        </div>
        <div className="eyebrow" style={{ color:'rgba(243,237,226,0.5)', marginTop:4 }}>{distUnit(units).toUpperCase()} LIFETIME</div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginTop:18, paddingTop:14, borderTop:'1px solid rgba(243,237,226,0.12)' }}>
          <div>
            <Eyebrow style={{ color:'rgba(243,237,226,0.5)' }}>RUNS</Eyebrow>
            <div className="mono" style={{ fontSize:20, fontWeight:500 }}>612</div>
          </div>
          <div>
            <Eyebrow style={{ color:'rgba(243,237,226,0.5)' }}>HOURS</Eyebrow>
            <div className="mono" style={{ fontSize:20, fontWeight:500 }}>393</div>
          </div>
          <div>
            <Eyebrow style={{ color:'rgba(243,237,226,0.5)' }}>ELEV</Eyebrow>
            <div className="mono" style={{ fontSize:20, fontWeight:500 }}>38.4k</div>
          </div>
        </div>
      </Card>

      <SectionHeader title="Lifetime PRs"/>
      <Card padded={false}>
        {[
          ['1K',  '3:42',   'Jan 14, 2026'],
          ['1 mile', '6:08','Jan 14, 2026'],
          ['5K',  '20:52',  'Apr 12, 2026'],
          ['10K', '43:18',  'Nov 03, 2025'],
          ['HM',  '1:38:44','Jan 19, 2026'],
          ['M',   '3:32:18','Jan 21, 2026'],
        ].map(([d,t,sub],i)=>(
          <div key={i} style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'14px 16px', borderTop: i>0 ? `1px solid ${c.line2}` : 'none',
          }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <span className="mono" style={{ fontSize:11, color:c.ink3 }}>{d}</span>
              <span className="mono" style={{ fontSize:18, fontWeight:500 }}>{t}</span>
            </div>
            <span style={{ fontSize:11, color:c.ink3 }}>{sub}</span>
          </div>
        ))}
      </Card>

      <SectionHeader title="Streaks"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Card padded>
          <Eyebrow>CURRENT</Eyebrow>
          <div className="mono" style={{ fontSize:30, fontWeight:500 }}>6 <span style={{ fontSize:13, color:c.ink3 }}>days</span></div>
          <div style={{ fontSize:11, color:c.ink3, marginTop:2 }}>Since May 11</div>
        </Card>
        <Card padded>
          <Eyebrow>LONGEST</Eyebrow>
          <div className="mono" style={{ fontSize:30, fontWeight:500 }}>28 <span style={{ fontSize:13, color:c.ink3 }}>days</span></div>
          <div style={{ fontSize:11, color:c.ink3, marginTop:2 }}>Aug 4 → Aug 31, 2025</div>
        </Card>
      </div>

      <SectionHeader title="Cumulative distance"/>
      <Card padded>
        <CumulativeChart units={units}/>
      </Card>
    </div>
  );
}

function CumulativeChart({ units }){
  const c = useColors();
  const W=320, H=140, pad=14;
  // monthly cumulative since Aug 2023
  const months = 33;
  const monthly = [];
  let cum = 0;
  for(let i=0;i<months;i++){
    const km = 100 + Math.random()*220 + i*1.5;
    cum += km;
    monthly.push(cum);
  }
  const max = monthly[monthly.length-1];
  const step = (W-pad*2)/(monthly.length-1);
  const y = (v) => pad + (H-pad*2) - (v/max)*(H-pad*2);
  const d = monthly.map((v,i)=>`${i===0?'M':'L'}${(pad+i*step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <div>
      <svg width={W} height={H} style={{ display:'block' }}>
        {[0.25,0.5,0.75].map((p,i)=>(
          <line key={i} x1={pad} y1={pad+(H-pad*2)*p} x2={W-pad} y2={pad+(H-pad*2)*p} stroke={c.line2}/>
        ))}
        <path d={`${d} L${W-pad} ${H-pad} L${pad} ${H-pad}Z`} fill={c.accent} opacity="0.12"/>
        <path d={d} fill="none" stroke={c.accent} strokeWidth="2" strokeLinecap="round"/>
        <circle cx={W-pad} cy={y(max)} r="4" fill={c.accent}/>
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:c.ink3, marginTop:4 }} className="mono">
        <span>AUG '23</span><span>MAY '26</span>
      </div>
    </div>
  );
}

Object.assign(window, { AnalyticsScreen });
