// screen-home.jsx — the hero screen. Latest run, week, best efforts, recap, shoes.

function HomeScreen({ go, units }){
  const c = useColors();
  const latest = ACT[0];

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink,
      paddingTop:54, // status bar
      paddingBottom:96, // tab bar
      minHeight:'100%',
    }}>

      {/* Header */}
      <div style={{ padding:'14px 20px 6px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <Eyebrow>SUN · MAY 17 · 2026</Eyebrow>
          <div className="display" style={{ fontSize:28, lineHeight:1.05, marginTop:4, letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>
            Good morning,
          </div>
          <div className="display serif" style={{ fontSize:28, lineHeight:1.05, fontStyle:'italic' }}>
            Gilla.
          </div>
        </div>
        <div style={{ flexShrink:0, marginTop:4 }}>
          <SunMark size={32}/>
        </div>
      </div>

      {/* Live-sync chip */}
      <div style={{ padding:'12px 20px 0' }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'5px 10px 5px 8px',
          background:c.paper2, borderRadius:999, border:`1px solid ${c.line}`,
          fontSize:11, color:c.ink2,
        }}>
          <span style={{ width:6, height:6, borderRadius:3, background:c.moss, animation:'pulse-solar 1.8s infinite' }}/>
          <span className="mono">SYNCED · 4m AGO · STRAVA</span>
        </div>
      </div>

      {/* Hero post-run card */}
      <div style={{ padding:'14px 20px 0' }}>
        <PostRunCard run={latest} units={units} onOpen={()=>go({type:'activity', id:latest.id})} onShare={()=>go({type:'editor', id:latest.id})}/>
      </div>

      {/* This week */}
      <SectionHeader title="This week" right={
        <span className="mono" style={{ fontSize:11, color:c.ink3 }}>W21 · MARATHON BUILD</span>
      }/>
      <div style={{ padding:'0 20px' }}>
        <WeekStrip onDay={(idx)=>{}}/>
      </div>

      {/* Best efforts */}
      <SectionHeader title="Best efforts" right={<span className="eyebrow" style={{ color:c.ink3 }}>THIS MONTH</span>}/>
      <div style={{ padding:'0 20px' }}>
        <BestEffortsRow/>
      </div>

      {/* Recap rotator */}
      <SectionHeader title="Recap"/>
      <div style={{ padding:'0 20px' }}>
        <RecapCarousel/>
      </div>

      {/* Shoes */}
      <SectionHeader title="Shoes" right={
        <span className="tap" style={{ fontSize:13, color:c.ink2 }} onClick={()=>go({type:'settings', sub:'shoes'})}>Manage</span>
      }/>
      <div style={{ padding:'0 20px' }}>
        <ShoesWidget/>
      </div>

      {/* Places */}
      <SectionHeader title="Places" right={
        <span className="tap" style={{ fontSize:13, color:c.ink2 }} onClick={()=>go({type:'places'})}>See all <Icon.chevR width="12" height="12" style={{ verticalAlign:-2 }}/></span>
      }/>
      <div style={{ padding:'0 20px 24px' }}>
        <PlacesPreview onOpen={()=>go({type:'places'})}/>
      </div>
    </div>
  );
}

function SectionHeader({ title, right }){
  const c = useColors();
  return (
    <div style={{
      padding:'28px 20px 12px',
      display:'flex', alignItems:'baseline', justifyContent:'space-between',
    }}>
      <h3 className="display" style={{
        fontSize:22, margin:0, fontWeight:400, letterSpacing:'-0.01em', color:c.ink, lineHeight:1.1, whiteSpace:'nowrap',
      }}>{title}</h3>
      {right}
    </div>
  );
}

function PostRunCard({ run, units, onOpen, onShare }){
  const c = useColors();
  return (
    <div className="rise tap" onClick={onOpen} style={{
      background:c.ink, color:c.paper, borderRadius:18,
      overflow:'hidden', position:'relative',
    }}>
      {/* Map background */}
      <div style={{ position:'absolute', inset:0, opacity:0.85 }}>
        <RouteMap points={run.route} width={362} height={420} style="dark" accent={c.accent}/>
      </div>
      {/* gradient overlay */}
      <div style={{
        position:'absolute', inset:0,
        background:`linear-gradient(180deg, rgba(14,13,11,0.4) 0%, rgba(14,13,11,0.1) 35%, rgba(14,13,11,0.85) 100%)`,
      }}/>

      <div style={{ position:'relative', padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div className="eyebrow" style={{ color:c.accent, marginBottom:4 }}>POST-RUN · 4 MIN AGO</div>
            <div className="display" style={{ fontSize:22, lineHeight:1.1, letterSpacing:'-0.02em', textWrap:'pretty' }}>
              {run.title}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, color:'rgba(243,237,226,0.6)', fontSize:12 }}>
              <Icon.pin width="12" height="12"/>
              <span>{run.place}</span>
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <Icon.sun width="20" height="20" style={{ color:c.accent }}/>
            <div className="mono" style={{ fontSize:10, color:'rgba(243,237,226,0.6)', marginTop:4 }}>{run.weather.t}°</div>
          </div>
        </div>

        <div style={{ height:120 }}/>

        <div style={{
          display:'grid', gridTemplateColumns:'1.2fr 0.9fr 1.1fr', gap:14, alignItems:'flex-end',
        }}>
          <div>
            <div className="eyebrow" style={{ color:'rgba(243,237,226,0.5)', fontSize:9 }}>DISTANCE</div>
            <div className="mono" style={{ fontSize:48, fontWeight:500, lineHeight:1, letterSpacing:'-0.03em' }}>
              {fmtDist(run.distance, units)}
              <span style={{ fontSize:14, color:'rgba(243,237,226,0.6)', marginLeft:4 }}>{distUnit(units)}</span>
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ color:'rgba(243,237,226,0.5)', fontSize:9 }}>PACE</div>
            <div className="mono" style={{ fontSize:22, fontWeight:500, letterSpacing:'-0.01em' }}>{fmtPace(run.pace, units)}</div>
            <div style={{ fontSize:10, color:'rgba(243,237,226,0.5)' }}>{paceUnit(units)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ color:'rgba(243,237,226,0.5)', fontSize:9 }}>TIME</div>
            <div className="mono" style={{ fontSize:22, fontWeight:500, letterSpacing:'-0.01em' }}>{fmtTime(run.seconds)}</div>
            <div style={{ fontSize:10, color:'rgba(243,237,226,0.5)' }}>h:m:s</div>
          </div>
        </div>

        {/* sub stats */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          marginTop:14, paddingTop:14, borderTop:'1px solid rgba(243,237,226,0.12)',
          fontSize:11, color:'rgba(243,237,226,0.7)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Icon.heart width="12" height="12" style={{ color:c.accent }}/>
            <span className="mono">{run.avgHr} avg · {run.maxHr} max</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Icon.mountain width="12" height="12"/>
            <span className="mono">{run.elev} m</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <Icon.flame width="12" height="12"/>
            <span className="mono">{run.cal} kcal</span>
          </div>
        </div>

        {/* CTA */}
        <button className="tap" onClick={(e)=>{e.stopPropagation(); onShare();}}
          style={{
            marginTop:14, width:'100%', height:46,
            background:c.accent, color:'#fff', border:'none', borderRadius:12,
            fontFamily:'Geist', fontWeight:500, fontSize:14,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
            cursor:'pointer',
          }}
        >
          <Icon.share width="16" height="16" style={{ color:'#fff' }}/>
          Create share card
        </button>
      </div>
    </div>
  );
}

function WeekStrip({ onDay }){
  const c = useColors();
  const w = THIS_WEEK;
  const maxKm = Math.max(...w.days.map(d=>d.km));
  const kindColor = (k) => k==='long'?c.accent : k==='workout'?'#8a5a30' : k==='easy'?c.moss : c.ink3;

  return (
    <div style={{
      background:c.paper2, borderRadius:14, border:`1px solid ${c.line}`,
      padding:14,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14 }}>
        <div>
          <div className="mono" style={{ fontSize:42, fontWeight:500, lineHeight:1, letterSpacing:'-0.02em' }}>
            47.89
            <span style={{ fontSize:14, color:c.ink3, marginLeft:4 }}>km</span>
          </div>
          <div style={{ display:'flex', gap:14, marginTop:6, fontSize:12, color:c.ink3 }}>
            <span className="mono">4 runs</span>
            <span className="mono">3:37:00</span>
            <Delta value={w.vsLast.km} format={v=>`${v.toFixed(1)} km`}/>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="eyebrow" style={{ color:c.ink3 }}>TARGET</div>
          <div className="mono" style={{ fontSize:18, fontWeight:500, color:c.ink }}>75 km</div>
        </div>
      </div>

      {/* day strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6 }}>
        {w.days.map((d, i)=>{
          const h = d.rest ? 8 : Math.max(14, (d.km/maxKm) * 56);
          return (
            <div key={i} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:6,
              padding:'8px 0', borderRadius:10,
              background: d.today ? c.paper3 : 'transparent',
              border: d.today ? `1px solid ${c.line}` : '1px solid transparent',
            }}>
              <div style={{
                width:'72%', height:h, borderRadius:3,
                background: d.rest ? c.line : kindColor(d.kind),
                opacity: d.rest ? 0.5 : 1,
              }}/>
              <div style={{ fontSize:10, color:c.ink3, fontWeight:500 }}>{d.d}</div>
              <div className="mono" style={{ fontSize:10, color: d.today ? c.ink : c.ink3, fontWeight:d.today?500:400 }}>
                {d.km ? d.km.toFixed(0) : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ display:'flex', gap:14, marginTop:12, fontSize:10, color:c.ink3 }}>
        <Dot c={c.accent}/> Long
        <Dot c="#8a5a30"/> Workout
        <Dot c={c.moss}/> Easy
        <Dot c={c.line} dim/> Rest
      </div>
    </div>
  );
}

function Dot({ c:color, dim }){
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
    <span style={{ width:8, height:8, borderRadius:2, background:color, opacity:dim?0.6:1 }}/>
  </span>;
}

function BestEffortsRow(){
  const c = useColors();
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
      {BEST_EFFORTS_MONTH.map((b, i)=>(
        <div key={i} style={{
          background: b.isPR ? c.ink : c.paper2,
          color: b.isPR ? c.paper : c.ink,
          border:`1px solid ${b.isPR ? c.ink : c.line}`,
          borderRadius:12, padding:'10px 10px 12px',
          position:'relative', overflow:'hidden',
        }}>
          <div className="eyebrow" style={{ color: b.isPR ? c.accent : c.ink3, fontSize:9 }}>
            {b.isPR ? 'PR' : b.d}
          </div>
          {b.isPR && (
            <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>{b.d}</div>
          )}
          <div className="mono" style={{ fontSize:18, fontWeight:500, letterSpacing:'-0.01em', marginTop:b.isPR?0:4 }}>
            {b.t}
          </div>
          <div style={{ fontSize:9.5, color: b.isPR ? 'rgba(243,237,226,0.5)' : c.ink3, marginTop:4 }}>
            {b.date}
          </div>
        </div>
      ))}
    </div>
  );
}

function RecapCarousel(){
  const c = useColors();
  const [idx, setIdx] = React.useState(0);
  React.useEffect(()=>{
    const t = setInterval(()=>setIdx(i => (i+1)%RECAPS.length), 4200);
    return ()=>clearInterval(t);
  }, []);
  const r = RECAPS[idx];

  return (
    <div style={{
      background:c.paper2, border:`1px solid ${c.line}`,
      borderRadius:14, padding:18, position:'relative', overflow:'hidden', minHeight:130,
    }}>
      {/* sun motif */}
      <div style={{ position:'absolute', right:-30, top:-30, opacity:0.06 }}>
        <SunMark size={140}/>
      </div>

      <div className="rise" key={idx} style={{ position:'relative' }}>
        <Eyebrow style={{ marginBottom:8, color:c.accent }}>{r.eyebrow}</Eyebrow>
        <div className="display" style={{ fontSize:18, fontWeight:400, letterSpacing:'-0.01em', color:c.ink2, lineHeight:1.3 }}>
          {r.body}
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:6 }}>
          <span className="mono" style={{ fontSize:38, fontWeight:500, lineHeight:1, letterSpacing:'-0.02em' }}>{r.num}</span>
          <span style={{ fontSize:14, color:c.ink3 }}>{r.suffix}</span>
        </div>
        <div style={{ fontSize:12, color:c.ink3, marginTop:8 }}>{r.detail}</div>
      </div>

      {/* dots */}
      <div style={{ position:'absolute', bottom:14, right:14, display:'flex', gap:4 }}>
        {RECAPS.map((_,i)=>(
          <div key={i} style={{
            width:i===idx?14:5, height:5, borderRadius:3,
            background: i===idx ? c.ink : c.line, transition:'all .3s',
          }}/>
        ))}
      </div>
    </div>
  );
}

function ShoesWidget(){
  const c = useColors();
  const active = SHOES.filter(s=>!s.retired).slice(0,3);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {active.map(s=>{
        const pct = Math.min(s.km/s.cap, 1);
        const warn = pct > 0.8;
        return (
          <div key={s.id} style={{
            background:c.paper2, border:`1px solid ${c.line}`,
            borderRadius:12, padding:'12px 14px',
            display:'flex', alignItems:'center', gap:14,
          }}>
            <div style={{
              width:38, height:38, borderRadius:10,
              background:s.color, opacity:s.primary?1:0.7,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:`1px solid ${c.line}`,
            }}>
              <Icon.shoe width="20" height="20" style={{ color:'#fff', filter:'drop-shadow(0 1px 0 rgba(0,0,0,0.2))' }}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:13, fontWeight:500, color:c.ink }}>{s.model}</span>
                {s.primary && <span className="eyebrow" style={{ color:c.accent, fontSize:9 }}>PRIMARY</span>}
                {s.race && <span className="eyebrow" style={{ color:c.ink3, fontSize:9 }}>RACE</span>}
              </div>
              <div style={{ fontSize:11, color:c.ink3, marginBottom:6 }}>{s.brand}</div>
              <div style={{ position:'relative', height:4, background:c.line, borderRadius:2, overflow:'hidden' }}>
                <div style={{
                  position:'absolute', inset:0,
                  width:`${pct*100}%`,
                  background: warn ? c.warn : c.ink,
                }}/>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div className="mono" style={{ fontSize:14, fontWeight:500, color:c.ink }}>{s.km}</div>
              <div className="mono" style={{ fontSize:10, color:c.ink3 }}>/ {s.cap} km</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlacesPreview({ onOpen }){
  const c = useColors();
  const cities = PLACES.length;
  const countries = new Set(PLACES.map(p=>p.country)).size;
  return (
    <div className="tap" onClick={onOpen} style={{
      background:c.paper2, borderRadius:14, border:`1px solid ${c.line}`,
      padding:16, position:'relative', overflow:'hidden',
    }}>
      {/* mini world dots */}
      <MiniWorldMap height={120}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:10 }}>
        <div>
          <div className="display" style={{ fontSize:30, lineHeight:1, letterSpacing:'-0.02em' }}>
            <span className="mono" style={{ fontWeight:500 }}>{cities}</span>
            <span style={{ fontSize:14, color:c.ink3, marginLeft:6 }}>cities</span>
            <span style={{ color:c.line, margin:'0 8px' }}>·</span>
            <span className="mono" style={{ fontWeight:500 }}>{countries}</span>
            <span style={{ fontSize:14, color:c.ink3, marginLeft:6 }}>countries</span>
          </div>
          <div style={{ fontSize:12, color:c.ink3, marginTop:4 }}>Latest: Tokyo · Jan '26</div>
        </div>
        <Icon.chevR width="18" height="18" style={{ color:c.ink3 }}/>
      </div>
    </div>
  );
}

// Tiny world dotted map (used in Home preview)
function MiniWorldMap({ height=120, big=false }){
  const c = useColors();
  // simple equirectangular projection; render places as dots
  const W = big ? 760 : 320, H = height;
  const proj = (lat, lon) => [((lon+180)/360)*W, ((90-lat)/180)*H];
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
      {/* continent silhouettes — rough shapes */}
      <g fill={c.line} opacity="0.5">
        {/* dotted grid */}
        {[...Array(28)].map((_,col)=>(
          [...Array(12)].map((_,row)=>{
            const x = (col+0.5)*(W/28), y = (row+0.5)*(H/12);
            // crude land mask
            const lat = 90 - (y/H)*180, lon = (x/W)*360-180;
            const land = (
              (lat>20 && lat<70 && lon>-130 && lon<-60) || // north america
              (lat>-55 && lat<10 && lon>-80 && lon<-35) || // south america
              (lat>35 && lat<70 && lon>-10 && lon<40) || // europe
              (lat>-35 && lat<35 && lon>-15 && lon<50) || // africa
              (lat>5 && lat<55 && lon>50 && lon<140) || // asia
              (lat>-45 && lat<-10 && lon>110 && lon<155) // australia
            );
            return land ? <circle key={col+'-'+row} cx={x} cy={y} r="1.4" fill={c.ink3} opacity="0.35"/> : null;
          })
        ))}
      </g>
      {/* places */}
      {PLACES.map((p,i)=>{
        const [x,y] = proj(p.lat, p.lon);
        const r = Math.min(2 + Math.log10(Math.max(p.runs,1)) * 3, 8);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r+4} fill={c.accent} opacity="0.18"/>
            <circle cx={x} cy={y} r={r} fill={c.accent}/>
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { HomeScreen, SectionHeader, MiniWorldMap });
