// screen-activity.jsx — detailed view of a single activity

function ActivityScreen({ id, go, units }){
  const c = useColors();
  const run = ACT.find(a=>a.id===id) || ACT[0];
  const [tab, setTab] = React.useState('splits');

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%', paddingBottom:96,
    }}>
      {/* Hero map */}
      <div style={{ position:'relative', height:340, overflow:'hidden' }}>
        <RouteMap points={run.route} width={402} height={340} style={c.paper==='#0e0d0b'?'dark':'light'} accent={c.accent}/>
        <div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(180deg, ${c.paper}cc 0%, transparent 25%, transparent 65%, ${c.paper}f0 100%)`,
        }}/>
        {/* top bar */}
        <div style={{
          position:'absolute', top:54, left:0, right:0,
          padding:'0 14px', display:'flex', justifyContent:'space-between',
        }}>
          <div className="tap" onClick={()=>go({type:'home'})} style={{
            width:38, height:38, borderRadius:12, background:c.paper, border:`1px solid ${c.line}`,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Icon.back width="20" height="20" style={{ color:c.ink }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div className="tap" style={{
              width:38, height:38, borderRadius:12, background:c.paper, border:`1px solid ${c.line}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><Icon.heart width="18" height="18" style={{ color:c.ink2 }}/></div>
            <div className="tap" style={{
              width:38, height:38, borderRadius:12, background:c.paper, border:`1px solid ${c.line}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><Icon.more width="18" height="18" style={{ color:c.ink2 }}/></div>
          </div>
        </div>
        {/* bottom info */}
        <div style={{ position:'absolute', bottom:14, left:20, right:20 }}>
          <div className="eyebrow" style={{ color:c.accent }}>{run.day.toUpperCase()} · MAY 17 · 05:42</div>
          <div className="display" style={{ fontSize:30, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:4 }}>{run.title}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, color:c.ink3, fontSize:12 }}>
            <Icon.pin width="12" height="12"/>
            <span>{run.place}</span>
          </div>
        </div>
      </div>

      {/* Big stats */}
      <div style={{ padding:'12px 20px 0' }}>
        <div style={{
          display:'grid', gridTemplateColumns:'1.2fr 0.9fr 1.1fr', gap:14,
          paddingBottom:18, borderBottom:`1px solid ${c.line}`,
        }}>
          <div>
            <Eyebrow>DISTANCE</Eyebrow>
            <div className="mono" style={{ fontSize:42, fontWeight:500, lineHeight:1, letterSpacing:'-0.03em' }}>
              {fmtDist(run.distance, units)}
              <span style={{ fontSize:13, color:c.ink3, marginLeft:4 }}>{distUnit(units)}</span>
            </div>
          </div>
          <div>
            <Eyebrow>PACE</Eyebrow>
            <div className="mono" style={{ fontSize:22, fontWeight:500 }}>{fmtPace(run.pace, units)}</div>
            <div style={{ fontSize:10, color:c.ink3 }}>{paceUnit(units)}</div>
          </div>
          <div>
            <Eyebrow>TIME</Eyebrow>
            <div className="mono" style={{ fontSize:22, fontWeight:500 }}>{fmtTime(run.seconds)}</div>
            <div style={{ fontSize:10, color:c.ink3 }}>h:m:s</div>
          </div>
        </div>

        {/* secondary stats */}
        <div style={{
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:0,
          padding:'14px 0', borderBottom:`1px solid ${c.line}`,
        }}>
          {[
            ['HR',  `${run.avgHr}`, 'avg', c.accent],
            ['Max', `${run.maxHr}`, 'bpm'],
            ['Elev',`${run.elev}`,  'm'],
            ['Cal', `${run.cal}`,   'kcal'],
          ].map(([l,v,u,col], i)=>(
            <div key={i} style={{ borderLeft: i>0?`1px solid ${c.line}`:'none', paddingLeft:i>0?14:0 }}>
              <Eyebrow style={{ color: col||c.ink3 }}>{l}</Eyebrow>
              <div className="mono" style={{ fontSize:18, fontWeight:500 }}>{v}</div>
              <div style={{ fontSize:10, color:c.ink3 }}>{u}</div>
            </div>
          ))}
        </div>

        {/* weather & shoe & notes */}
        <div style={{ display:'flex', gap:8, padding:'14px 0', flexWrap:'wrap' }}>
          <Chip><WeatherIcon icon={run.weather.icon}/><span className="mono" style={{ fontSize:11 }}>{run.weather.t}° · {run.weather.w}</span></Chip>
          <Chip><Icon.shoe width="14" height="14" style={{ color:c.ink2 }}/><span style={{ fontSize:11.5 }}>Saucony Endorphin Speed</span></Chip>
          <Chip><Icon.bolt width="12" height="12" style={{ color:c.accent }}/><span className="mono" style={{ fontSize:11 }}>{run.cadence||174} spm</span></Chip>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding:'0 20px', marginTop:12 }}>
        <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${c.line}` }}>
          {['splits','hr','pace'].map(t=>(
            <div key={t} className="tap" onClick={()=>setTab(t)} style={{
              padding:'10px 14px',
              fontSize:13, fontWeight:500,
              color: tab===t ? c.ink : c.ink3,
              borderBottom: tab===t ? `2px solid ${c.accent}` : '2px solid transparent',
              marginBottom:-1,
            }}>
              {t==='splits'?'Splits':t==='hr'?'Heart rate':'Pace'}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'16px 20px 0' }}>
        {tab==='splits' && <SplitsTable run={run} units={units}/>}
        {tab==='hr' && <HrChart run={run}/>}
        {tab==='pace' && <PaceChart run={run}/>}
      </div>

      {/* Source */}
      <div style={{ padding:'20px 20px 0' }}>
        <Eyebrow style={{ marginBottom:8 }}>SOURCE</Eyebrow>
        <div style={{
          padding:'10px 12px', background:c.paper2, border:`1px solid ${c.line}`,
          borderRadius:12, display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'#fc4c02', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon.strava width="18" height="18" style={{ color:'#fff' }}/>
          </div>
          <div style={{ flex:1, fontSize:12 }}>
            <div style={{ color:c.ink, fontWeight:500 }}>Strava</div>
            <div className="mono" style={{ color:c.ink3, fontSize:11 }}>id 11498376521 · synced 4m ago</div>
          </div>
          <span className="eyebrow" style={{ color:c.ink3 }}>CANONICAL</span>
        </div>
      </div>

      {/* Big CTA */}
      <div style={{ padding:'20px 20px 24px' }}>
        <Button kind="accent" full onClick={()=>go({type:'editor', id:run.id})} icon={<Icon.share width="18" height="18" style={{ color:'#fff' }}/>}>
          Create share card
        </Button>
      </div>
    </div>
  );
}

function Chip({ children }){
  const c = useColors();
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding:'6px 10px', background:c.paper2,
      border:`1px solid ${c.line}`, borderRadius:999,
      color:c.ink2,
    }}>{children}</div>
  );
}

function SplitsTable({ run, units }){
  const c = useColors();
  const splits = run.splits || [];
  if(!splits.length) return <Empty text="No splits available."/>;
  const minSec = Math.min(...splits.map(s=>s.sec));
  const maxSec = Math.max(...splits.map(s=>s.sec));
  return (
    <div>
      <div style={{
        display:'grid', gridTemplateColumns:'30px 56px 1fr 50px',
        gap:8, padding:'8px 0', fontSize:10, color:c.ink3,
        borderBottom:`1px solid ${c.line}`,
      }} className="eyebrow">
        <div>KM</div><div>PACE</div><div>RELATIVE</div><div style={{textAlign:'right'}}>HR</div>
      </div>
      <div style={{ maxHeight:260, overflow:'auto' }} className="hideScroll">
        {splits.map((s,i)=>{
          const pct = (s.sec-minSec)/(maxSec-minSec || 1);
          const fast = s.sec === minSec;
          return (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'30px 56px 1fr 50px',
              gap:8, padding:'8px 0', fontSize:13, alignItems:'center',
              borderBottom:`1px solid ${c.line2}`,
            }}>
              <span className="mono" style={{ color:c.ink3 }}>{s.k}</span>
              <span className="mono" style={{ fontWeight:fast?500:400, color: fast?c.accent:c.ink }}>{fmtPace(s.sec, units)}</span>
              <div style={{ position:'relative', height:6, background:c.line2, borderRadius:3 }}>
                <div style={{
                  position:'absolute', left:0, top:0, height:6,
                  width:`${30 + (1-pct)*70}%`,
                  background: fast ? c.accent : c.ink2,
                  opacity:0.85, borderRadius:3,
                }}/>
              </div>
              <span className="mono" style={{ textAlign:'right', color:c.ink3, fontSize:11 }}>{s.hr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HrChart({ run }){
  const c = useColors();
  const data = run.streamHr;
  if(!data) return <Empty text="No HR data."/>;
  return <StreamChart data={data} unit="bpm" color={c.accent} label="Heart rate"/>;
}
function PaceChart({ run }){
  const c = useColors();
  const data = run.streamPace || run.streamHr.map(()=>320+Math.random()*40);
  return <StreamChart data={data} unit="/km" color={c.ink} label="Pace" invert/>;
}

function StreamChart({ data, color, unit, label, invert }){
  const c = useColors();
  const W=358, H=160, pad=12;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max-min || 1;
  const step = (W-pad*2)/(data.length-1);
  const y = (v) => pad + (H-pad*2) - ((v-min)/range)*(H-pad*2);
  const d = data.map((v,i)=> `${i===0?'M':'L'}${(pad+i*step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const fill = `${d} L${W-pad} ${H-pad} L${pad} ${H-pad} Z`;
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <Eyebrow>{label.toUpperCase()}</Eyebrow>
        <div className="mono" style={{ fontSize:11, color:c.ink3 }}>
          {min.toFixed(0)} — {max.toFixed(0)} {unit}
        </div>
      </div>
      <svg width={W} height={H} style={{ display:'block' }}>
        {[0.25,0.5,0.75].map((p,i)=>(
          <line key={i} x1={pad} y1={pad+(H-pad*2)*p} x2={W-pad} y2={pad+(H-pad*2)*p} stroke={c.line2}/>
        ))}
        <path d={fill} fill={color} opacity="0.1"/>
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function Empty({ text }){
  const c = useColors();
  return <div style={{ fontSize:13, color:c.ink3, textAlign:'center', padding:20 }}>{text}</div>;
}

Object.assign(window, { ActivityScreen });
