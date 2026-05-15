// screen-places.jsx — world map of cities I've run in

function PlacesScreen({ go, units }){
  const c = useColors();
  const [filter, setFilter] = React.useState('all'); // all, 2026, India, Travel
  const [selected, setSelected] = React.useState(null);

  let places = PLACES;
  if(filter==='2026') places = PLACES.filter(p=>p.first.startsWith('2026') || p.runs > 5);
  if(filter==='india') places = PLACES.filter(p=>p.country==='India');
  if(filter==='travel') places = PLACES.filter(p=>p.country!=='India');

  const cities = places.length;
  const countries = new Set(places.map(p=>p.country)).size;
  const totalKm = places.reduce((a,p)=>a+p.km, 0);

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'14px 20px 0' }}>
        <Eyebrow>PLACES</Eyebrow>
        <div className="display" style={{ fontSize:26, lineHeight:1.08, letterSpacing:'-0.02em', marginTop:4, textWrap:'pretty' }}>
          Every city, <span className="serif" style={{ fontStyle:'italic' }}>everywhere</span>.
        </div>
      </div>

      {/* Hero stats */}
      <div style={{ padding:'16px 20px 0', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, alignItems:'flex-end' }}>
        <div>
          <Eyebrow>CITIES</Eyebrow>
          <div className="mono" style={{ fontSize:36, fontWeight:500, lineHeight:1, letterSpacing:'-0.03em' }}>{cities}</div>
        </div>
        <div>
          <Eyebrow>COUNTRIES</Eyebrow>
          <div className="mono" style={{ fontSize:24, fontWeight:500, lineHeight:1 }}>{countries}</div>
        </div>
        <div>
          <Eyebrow>{distUnit(units).toUpperCase()}</Eyebrow>
          <div className="mono" style={{ fontSize:24, fontWeight:500, lineHeight:1 }}>{totalKm.toLocaleString()}</div>
        </div>
      </div>

      {/* World map */}
      <div style={{ padding:'18px 14px 0' }}>
        <div style={{
          background:c.paper2, border:`1px solid ${c.line}`, borderRadius:14,
          padding:16, position:'relative', overflow:'hidden',
        }}>
          <WorldMap places={places} selected={selected} onSelect={setSelected}/>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding:'14px 20px 0', display:'flex', gap:6, flexWrap:'wrap' }}>
        {[
          ['all','All time'],
          ['2026','2026'],
          ['india','India'],
          ['travel','Travel'],
        ].map(([id,l])=>(
          <div key={id} className="tap" onClick={()=>setFilter(id)} style={{
            padding:'7px 12px', borderRadius:999,
            border:`1px solid ${c.line}`,
            background: filter===id ? c.ink : 'transparent',
            color: filter===id ? c.paper : c.ink2,
            fontSize:12, fontWeight:500,
          }}>{l}</div>
        ))}
      </div>

      {/* List */}
      <SectionHeader title="By distance" right={
        <div className="tap" style={{ display:'flex', alignItems:'center', gap:4, fontSize:13, color:c.ink2 }}>
          Sort <Icon.chevD width="12" height="12"/>
        </div>
      }/>
      <div style={{ padding:'0 14px' }}>
        <Card padded={false}>
          {[...places].sort((a,b)=>b.km-a.km).map((p,i)=>(
            <PlaceRow key={p.city} place={p} units={units} top={i===0} index={i+1}/>
          ))}
        </Card>
      </div>

      {/* Share card */}
      <div style={{ padding:'18px 20px 24px' }}>
        <Card padded style={{ background:c.ink, color:c.paper, border:'none', position:'relative', overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <Eyebrow style={{ color:c.accent }}>SHARE</Eyebrow>
              <div className="display" style={{ fontSize:18, marginTop:4, lineHeight:1.1 }}>
                Make a <span className="serif" style={{ fontStyle:'italic' }}>Places</span> card.
              </div>
              <div style={{ fontSize:11, color:'rgba(243,237,226,0.5)', marginTop:4 }}>
                Beautiful 9:16 of every city you've run in.
              </div>
            </div>
            <Icon.share width="22" height="22" style={{ color:c.accent }}/>
          </div>
        </Card>
      </div>

      {/* selected place sheet */}
      {selected && (
        <PlaceSheet place={selected} units={units} onClose={()=>setSelected(null)}/>
      )}
    </div>
  );
}

function WorldMap({ places, selected, onSelect }){
  const c = useColors();
  const W = 370, H = 220;
  const proj = (lat, lon) => [((lon+180)/360)*W, ((90-lat)/180)*H];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block' }}>
      {/* dot continents */}
      {[...Array(38)].map((_,col)=>(
        [...Array(18)].map((_,row)=>{
          const x = (col+0.5)*(W/38), y = (row+0.5)*(H/18);
          const lat = 90 - (y/H)*180, lon = (x/W)*360-180;
          const land = (
            (lat>20 && lat<70 && lon>-130 && lon<-60) ||
            (lat>-55 && lat<10 && lon>-80 && lon<-35) ||
            (lat>35 && lat<70 && lon>-10 && lon<40) ||
            (lat>-35 && lat<35 && lon>-15 && lon<50) ||
            (lat>5 && lat<55 && lon>50 && lon<140) ||
            (lat>-45 && lat<-10 && lon>110 && lon<155)
          );
          if(!land) return null;
          return <circle key={col+'-'+row} cx={x} cy={y} r="1.2" fill={c.ink3} opacity="0.32"/>;
        })
      ))}
      {/* places */}
      {places.map((p)=>{
        const [x,y] = proj(p.lat, p.lon);
        const r = Math.min(2 + Math.log10(Math.max(p.runs,1)) * 4, 10);
        const isSel = selected && selected.city === p.city;
        return (
          <g key={p.city} onClick={()=>onSelect(p)} style={{ cursor:'pointer' }}>
            <circle cx={x} cy={y} r={r+6} fill={c.accent} opacity={isSel?0.35:0.18}/>
            <circle cx={x} cy={y} r={r} fill={c.accent} stroke={isSel?'#fff':'none'} strokeWidth="1.5"/>
            {p.runs > 50 && (
              <text x={x+r+4} y={y+3} fontFamily="JetBrains Mono" fontSize="8" fill={c.ink2}>
                {p.city}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PlaceRow({ place:p, units, top, index }){
  const c = useColors();
  return (
    <div style={{
      padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
      borderTop: index>1 ? `1px solid ${c.line2}` : 'none',
    }}>
      <span className="mono" style={{ fontSize:11, color:c.ink3, width:18 }}>{String(index).padStart(2,'0')}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:500, color:c.ink }}>{p.city}</span>
          {top && <span className="eyebrow" style={{ color:c.accent, fontSize:9 }}>HOME</span>}
        </div>
        <div style={{ fontSize:11, color:c.ink3 }}>{p.country} · since {p.first.slice(0,7)}</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div className="mono" style={{ fontSize:14, fontWeight:500 }}>{p.km.toLocaleString()} <span style={{ fontSize:10, color:c.ink3 }}>{distUnit(units)}</span></div>
        <div className="mono" style={{ fontSize:10, color:c.ink3 }}>{p.runs} runs</div>
      </div>
    </div>
  );
}

function PlaceSheet({ place, units, onClose }){
  const c = useColors();
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:30,
      background:'rgba(14,13,11,0.55)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="rise" style={{
        background:c.paper, borderRadius:'20px 20px 0 0',
        padding:'20px 20px 36px', width:'100%', maxWidth:402,
      }}>
        <div style={{ width:36, height:4, background:c.line, borderRadius:2, margin:'0 auto 18px' }}/>
        <Eyebrow style={{ color:c.accent }}>{place.country}</Eyebrow>
        <div className="display" style={{ fontSize:30, lineHeight:1, letterSpacing:'-0.02em', marginTop:4 }}>
          {place.city}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:18 }}>
          <Stat label="DISTANCE" value={place.km.toLocaleString()} unit={distUnit(units)} size="md"/>
          <Stat label="RUNS" value={place.runs} size="md"/>
          <Stat label="SINCE" value={place.first.slice(0,4)} size="md"/>
        </div>
        <div style={{ marginTop:18, display:'flex', gap:8 }}>
          <Button kind="ghost" full onClick={onClose}>Close</Button>
          <Button kind="primary" full>View all runs <Icon.chevR width="16" height="16"/></Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PlacesScreen });
