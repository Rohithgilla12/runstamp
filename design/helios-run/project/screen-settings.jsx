// screen-settings.jsx — profile + settings + shoes

function SettingsScreen({ go, units, dark, accent, setTheme }){
  const c = useColors();
  const [sub, setSub] = React.useState(null); // null | 'shoes' | 'connections' | 'privacy'

  if(sub==='shoes') return <ShoesScreen back={()=>setSub(null)} units={units}/>;
  if(sub==='connections') return <ConnectionsScreen back={()=>setSub(null)}/>;
  if(sub==='privacy') return <PrivacyScreen back={()=>setSub(null)}/>;

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'14px 20px 0' }}>
        <Eyebrow>PROFILE</Eyebrow>
      </div>

      {/* Profile hero */}
      <div style={{ padding:'10px 20px 0' }}>
        <Card padded style={{ background:c.paper2 }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{
              width:56, height:56, borderRadius:28, position:'relative',
              background:`linear-gradient(135deg, ${c.accent}, #c44a1e)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:`1px solid ${c.line}`,
            }}>
              <span className="display" style={{ fontSize:24, color:'#fff' }}>G</span>
            </div>
            <div style={{ flex:1 }}>
              <div className="display" style={{ fontSize:22, lineHeight:1, letterSpacing:'-0.01em' }}>Gilla</div>
              <div style={{ fontSize:12, color:c.ink3, marginTop:2 }}>Bangalore · joined Aug '23</div>
            </div>
            <Icon.more width="18" height="18" style={{ color:c.ink3 }}/>
          </div>

          <div style={{
            marginTop:14, paddingTop:14, borderTop:`1px solid ${c.line}`,
            display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12,
          }}>
            <SmallStat label="LIFETIME" val="4,287" unit="km"/>
            <SmallStat label="RUNS" val="612"/>
            <SmallStat label="STREAK" val="6" unit="d"/>
          </div>
        </Card>
      </div>

      <SectionHeader title="RunStamp"/>
      <div style={{ padding:'0 14px' }}>
        <Card padded={false}>
          <Row icon={<Icon.shoe/>} label="Shoes" value="4 active" onClick={()=>setSub('shoes')}/>
          <Row icon={<Icon.share/>} label="Connections" value="Strava · Apple Health" onClick={()=>setSub('connections')}/>
          <Row icon={<Icon.privacy/>} label="Privacy" value="200 m blur · on" onClick={()=>setSub('privacy')}/>
          <Row icon={<Icon.ruler/>} label="Units" value={units==='km'?'Metric':'Imperial'} chevron/>
          <Row icon={<Icon.cam/>} label="Default share" value="9:16 · Magazine" chevron/>
        </Card>
      </div>

      <SectionHeader title="Theme"/>
      <div style={{ padding:'0 20px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <ThemeSwatch dark={false} active={!dark} onClick={()=>setTheme({dark:false})} label="Light"/>
          <ThemeSwatch dark={true}  active={dark}  onClick={()=>setTheme({dark:true})}  label="Dark"/>
        </div>
      </div>

      <SectionHeader title="Data"/>
      <div style={{ padding:'0 14px' }}>
        <Card padded={false}>
          <Row icon={<Icon.download/>} label="Export data" value="GPX zip · JSON" chevron/>
          <Row icon={<Icon.github/>} label="View source" value="github.com/gilla/runstamp" chevron/>
          <Row icon={<Icon.trash/>} label="Delete account" danger chevron/>
        </Card>
      </div>

      <div style={{ padding:'28px 20px', textAlign:'center', fontSize:11, color:c.ink3 }}>
        <SunMark size={22}/>
        <div className="mono" style={{ marginTop:8 }}>RUNSTAMP · v0.1.0 · AGPL-3.0</div>
        <div style={{ marginTop:4, fontStyle:'italic' }}>Open-source. Self-hostable. Yours.</div>
      </div>
    </div>
  );
}

function SmallStat({ label, val, unit }){
  const c = useColors();
  return (
    <div>
      <div className="eyebrow" style={{ color:c.ink3, fontSize:9 }}>{label}</div>
      <div className="mono" style={{ fontSize:18, fontWeight:500, lineHeight:1.2 }}>
        {val}{unit && <span style={{ fontSize:11, color:c.ink3, marginLeft:3 }}>{unit}</span>}
      </div>
    </div>
  );
}

function Row({ icon, label, value, onClick, danger, chevron }){
  const c = useColors();
  return (
    <div className="tap" onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
      borderBottom:`1px solid ${c.line2}`,
    }}>
      <div style={{ width:18, height:18, color: danger ? '#c44a1e' : c.ink2, display:'flex' }}>
        {React.cloneElement(icon, { width:18, height:18 })}
      </div>
      <span style={{ flex:1, fontSize:14, fontWeight:500, color: danger ? '#c44a1e' : c.ink }}>{label}</span>
      {value && <span style={{ fontSize:12, color:c.ink3 }}>{value}</span>}
      {(chevron || onClick) && <Icon.chevR width="14" height="14" style={{ color:c.ink3 }}/>}
    </div>
  );
}

function ThemeSwatch({ dark, active, onClick, label }){
  const c = useColors();
  return (
    <div className="tap" onClick={onClick} style={{
      flex:1, padding:14, borderRadius:12,
      background: dark ? '#0e0d0b' : '#f3ede2',
      border: `1.5px solid ${active ? c.accent : c.line}`,
      position:'relative',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ width:18, height:18, color: dark?'#f3ede2':'#14110d' }}>
          {dark ? <Icon.moon/> : <Icon.sun/>}
        </div>
        {active && <Icon.check width="16" height="16" style={{ color:c.accent }}/>}
      </div>
      <div style={{ marginTop:8, fontSize:12, fontWeight:500, color: dark?'#f3ede2':'#14110d' }}>{label}</div>
      <div style={{ marginTop:6, display:'flex', gap:3 }}>
        {[1,2,3].map(i=>(
          <div key={i} style={{ flex:1, height:4, borderRadius:2, background: dark?'rgba(243,237,226,0.2)':'rgba(20,17,13,0.15)' }}/>
        ))}
      </div>
    </div>
  );
}

function ShoesScreen({ back, units }){
  const c = useColors();
  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'12px 14px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="tap" onClick={back} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.back width="18" height="18"/>
        </div>
        <Eyebrow>SHOES</Eyebrow>
        <div className="tap" style={{ width:36, height:36, borderRadius:10, background:c.ink, color:c.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.plus width="18" height="18"/>
        </div>
      </div>

      <div style={{ padding:'14px 20px 0' }}>
        <div className="display" style={{ fontSize:30, lineHeight:1.05, letterSpacing:'-0.02em' }}>
          Four pairs in rotation.
        </div>
        <div style={{ fontSize:13, color:c.ink3, marginTop:4 }}>
          Total: 1,176 km across active shoes.
        </div>
      </div>

      <div style={{ padding:'18px 14px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {SHOES.map(s=>{
          const pct = Math.min(s.km/s.cap, 1);
          const warn = pct > 0.85;
          return (
            <Card key={s.id} padded>
              <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:s.color, opacity:s.primary?1:0.85,
                  border:`1px solid ${c.line}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <Icon.shoe width="26" height="26" style={{ color:'#fff', filter:'drop-shadow(0 1px 0 rgba(0,0,0,0.25))' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:15, fontWeight:500, color:c.ink }}>{s.model}</span>
                    {s.primary && <span className="eyebrow" style={{ color:c.accent, fontSize:9 }}>PRIMARY</span>}
                    {s.race && <span className="eyebrow" style={{ color:c.ink3, fontSize:9 }}>RACE-DAY</span>}
                  </div>
                  <div style={{ fontSize:12, color:c.ink3 }}>{s.brand} · since {s.since.slice(0,7)}</div>

                  <div style={{ marginTop:10 }}>
                    <div style={{ position:'relative', height:6, background:c.line, borderRadius:3, overflow:'hidden' }}>
                      <div style={{
                        position:'absolute', inset:0,
                        width:`${pct*100}%`,
                        background: warn ? c.warn : c.ink,
                      }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span className="mono" style={{ fontSize:11, color: warn ? c.warn : c.ink2 }}>
                        {s.km} {distUnit(units)}
                        {warn && ' · replace soon'}
                      </span>
                      <span className="mono" style={{ fontSize:11, color:c.ink3 }}>cap {s.cap}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionsScreen({ back }){
  const c = useColors();
  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'12px 14px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="tap" onClick={back} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.back width="18" height="18"/>
        </div>
        <Eyebrow>CONNECTIONS</Eyebrow>
        <div style={{ width:36 }}/>
      </div>

      <div style={{ padding:'14px 20px 0' }}>
        <div className="display" style={{ fontSize:30, letterSpacing:'-0.02em', lineHeight:1.05 }}>
          Where your runs come from.
        </div>
      </div>

      <div style={{ padding:'18px 14px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <ConnCard
          icon={<div style={{ background:'#fc4c02', width:48, height:48, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.strava width="28" height="28" style={{ color:'#fff' }}/></div>}
          name="Strava" status="Connected · canonical"
          sub="Webhook-driven · last sync 4m ago"
          counts={[['612','runs'],['4,287','km'],['—','errors']]}
        />
        <ConnCard
          icon={<div style={{ background:'#fb466c', width:48, height:48, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.heart width="24" height="24" style={{ color:'#fff' }}/></div>}
          name="Apple Health" status="Connected · fallback"
          sub="Read-only · 14 deduped against Strava"
          counts={[['218','workouts'],['8','dupes'],['—','errors']]}
        />
        <div style={{
          padding:14, background:'transparent', border:`1px dashed ${c.line}`,
          borderRadius:14, display:'flex', alignItems:'center', gap:12,
        }}>
          <div style={{ width:48, height:48, borderRadius:14, background:c.paper2, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon.plus width="22" height="22" style={{ color:c.ink2 }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500 }}>Garmin Connect</div>
            <div style={{ fontSize:11, color:c.ink3 }}>Coming in M8 · roadmap</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnCard({ icon, name, status, sub, counts }){
  const c = useColors();
  return (
    <Card padded>
      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        {icon}
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
            <span style={{ fontSize:16, fontWeight:500 }}>{name}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
            <span style={{ width:6, height:6, borderRadius:3, background:c.moss }}/>
            <span className="eyebrow" style={{ color:c.moss }}>{status}</span>
          </div>
          <div style={{ fontSize:11, color:c.ink3, marginTop:6 }}>{sub}</div>
        </div>
      </div>
      <div style={{
        marginTop:12, paddingTop:12, borderTop:`1px solid ${c.line}`,
        display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10,
      }}>
        {counts.map(([v,l],i)=>(
          <div key={i}>
            <div className="mono" style={{ fontSize:18, fontWeight:500 }}>{v}</div>
            <div className="eyebrow" style={{ color:c.ink3, fontSize:9 }}>{l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PrivacyScreen({ back }){
  const c = useColors();
  const [zone, setZone] = React.useState(200);
  const [hideHome, setHideHome] = React.useState(true);
  const [hideWork, setHideWork] = React.useState(false);

  return (
    <div className="hideScroll grain" style={{
      background:c.paper, color:c.ink, minHeight:'100%',
      paddingTop:54, paddingBottom:96,
    }}>
      <div style={{ padding:'12px 14px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div className="tap" onClick={back} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon.back width="18" height="18"/>
        </div>
        <Eyebrow>PRIVACY</Eyebrow>
        <div style={{ width:36 }}/>
      </div>

      <div style={{ padding:'14px 20px 0' }}>
        <div className="display" style={{ fontSize:30, lineHeight:1.05, letterSpacing:'-0.02em' }}>
          Don't show the world where you start.
        </div>
        <div style={{ fontSize:13, color:c.ink3, marginTop:6, textWrap:'pretty' }}>
          RunStamp defaults <span style={{ color:c.ink }}>on</span>. Strava defaults off.
        </div>
      </div>

      <div style={{ padding:'18px 14px 0' }}>
        <Card padded>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Eyebrow>BLUR RADIUS</Eyebrow>
            <span className="mono" style={{ fontSize:18, fontWeight:500 }}>{zone} m</span>
          </div>
          <input type="range" min="0" max="500" step="50" value={zone} onChange={(e)=>setZone(+e.target.value)}
            style={{ width:'100%', marginTop:8, accentColor:c.accent }}/>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:c.ink3 }} className="mono">
            <span>OFF</span><span>200</span><span>500 M</span>
          </div>
        </Card>
      </div>

      <div style={{ padding:'14px' }}>
        <Card padded={false}>
          <Toggle label="Hide home start" sub="2nd Cross, Jayanagar" value={hideHome} onChange={setHideHome}/>
          <Toggle label="Hide office" sub="Indiranagar" value={hideWork} onChange={setHideWork}/>
          <Toggle label="Hide route from screenshots" sub="Strip GPS from share cards" value={true} onChange={()=>{}}/>
        </Card>
      </div>
    </div>
  );
}

function Toggle({ label, sub, value, onChange }){
  const c = useColors();
  return (
    <div className="tap" onClick={()=>onChange(!value)} style={{
      padding:'14px 16px', display:'flex', alignItems:'center', gap:12,
      borderBottom:`1px solid ${c.line2}`,
    }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:c.ink3, marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{
        width:46, height:28, borderRadius:14, padding:2,
        background: value ? c.accent : c.line,
        transition:'background .15s',
      }}>
        <div style={{
          width:24, height:24, borderRadius:12, background:'#fff',
          transform: value ? 'translateX(18px)' : 'none',
          transition:'transform .15s', boxShadow:'0 1px 2px rgba(0,0,0,0.18)',
        }}/>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
