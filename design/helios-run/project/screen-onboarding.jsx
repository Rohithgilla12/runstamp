// screen-onboarding.jsx — splash / sign-in / connect Strava / connect Health

function Onboarding({ step, setStep, onDone }){
  const c = useColors();
  const screens = [Splash, SignIn, Primer, ConnectStrava, ConnectHealth];
  const Screen = screens[step] || Splash;
  return (
    <div style={{
      width:'100%', height:'100%', background:c.paper, color:c.ink,
      position:'relative', overflow:'hidden',
    }} className="grain">
      <Screen step={step} setStep={setStep} onDone={onDone}/>
    </div>
  );
}

function Splash({ setStep }){
  const c = useColors();
  return (
    <div style={{
      padding:'80px 32px 48px', height:'100%', display:'flex', flexDirection:'column',
      justifyContent:'space-between',
    }} className="rise">
      <div>
        <div style={{ position:'relative', width:96, height:96, marginBottom:48 }}>
          <SunMark size={96}/>
        </div>
        <div className="eyebrow" style={{ color:c.ink3, marginBottom:14 }}>RUNSTAMP · v0.1</div>
        <h1 className="display" style={{
          fontSize:54, lineHeight:1.02, margin:0, letterSpacing:'-0.02em',
          fontWeight:400,
        }}>
          Make your runs<br/>
          <span className="serif" style={{ fontStyle:'italic', color:c.accent }}>look as good</span><br/>
          as they felt.
        </h1>
      </div>

      <div>
        <div style={{
          padding:'14px 16px', border:`1px solid ${c.line}`, borderRadius:12,
          display:'flex', gap:12, alignItems:'center', marginBottom:18,
          background:c.paper2,
        }}>
          <Icon.github width="22" height="22" style={{ color:c.ink2, flexShrink:0 }}/>
          <div style={{ fontSize:13, lineHeight:1.4 }}>
            <div style={{ color:c.ink, fontWeight:500 }}>Open source.</div>
            <div style={{ color:c.ink3 }}>AGPL-3.0 · your data, your server, your call.</div>
          </div>
        </div>
        <Button kind="primary" full onClick={()=>setStep(1)}>
          Get started <Icon.chevR width="18" height="18"/>
        </Button>
        <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:c.ink3 }}>
          Already have an account?{' '}
          <span className="tap" style={{ color:c.ink, textDecoration:'underline' }}>Sign in</span>
        </div>
      </div>
    </div>
  );
}

function SignIn({ setStep }){
  const c = useColors();
  return (
    <div style={{ padding:'72px 32px 32px', height:'100%', display:'flex', flexDirection:'column' }} className="rise">
      <div className="tap" onClick={()=>setStep(0)} style={{ marginBottom:36, color:c.ink2 }}>
        <Icon.back width="22" height="22"/>
      </div>
      <Eyebrow style={{ marginBottom:10 }}>STEP 01 · 03</Eyebrow>
      <h2 className="display" style={{ fontSize:36, margin:'0 0 8px', letterSpacing:'-0.02em' }}>
        Sign in to <span className="serif" style={{ fontStyle:'italic', color:c.accent }}>RunStamp</span>.
      </h2>
      <p style={{ color:c.ink3, fontSize:15, lineHeight:1.45, margin:'0 0 32px', textWrap:'pretty' }}>
        We use Firebase Auth. We never see your password. You can self-host this whole thing.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <Button kind="primary" full onClick={()=>setStep(2)} icon={<Icon.apple width="18" height="18"/>}>
          Continue with Apple
        </Button>
        <Button kind="ghost" full onClick={()=>setStep(2)}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
            <span style={{
              width:18, height:18, borderRadius:9, background:'conic-gradient(#ea4335,#fbbc05,#34a853,#4285f4,#ea4335)',
              border:`1px solid ${c.line}`,
            }}/>
            Continue with Google
          </span>
        </Button>
        <Button kind="ghost" full onClick={()=>setStep(2)}>
          Continue with email
        </Button>
      </div>

      <div style={{ marginTop:'auto', fontSize:11, color:c.ink3, lineHeight:1.5 }}>
        By continuing you agree to the{' '}
        <span style={{ color:c.ink2, textDecoration:'underline' }}>terms</span> and{' '}
        <span style={{ color:c.ink2, textDecoration:'underline' }}>privacy policy</span>.
        We are reader-only with your fitness data.
      </div>
    </div>
  );
}

function Primer({ setStep }){
  const c = useColors();
  return (
    <div style={{ padding:'72px 32px 32px', height:'100%', display:'flex', flexDirection:'column' }} className="rise">
      <div className="tap" onClick={()=>setStep(1)} style={{ marginBottom:36, color:c.ink2 }}>
        <Icon.back width="22" height="22"/>
      </div>
      <Eyebrow style={{ marginBottom:10 }}>STEP 02 · 03</Eyebrow>
      <h2 className="display" style={{ fontSize:32, margin:'0 0 8px', letterSpacing:'-0.02em', lineHeight:1.1 }}>
        Connect your <span className="serif" style={{ fontStyle:'italic' }}>runs</span>.
      </h2>
      <p style={{ color:c.ink3, fontSize:15, lineHeight:1.45, margin:'0 0 28px', textWrap:'pretty' }}>
        RunStamp doesn't track runs. It reads runs you've already recorded elsewhere — beautifully.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <ConnectRow
          icon={<div style={{ width:44, height:44, borderRadius:12, background:'#fc4c02', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.strava width="26" height="26" style={{ color:'#fff' }}/></div>}
          title="Strava"
          desc="Activities, segments, splits. Webhook-driven — runs land within seconds."
          required
        />
        <ConnectRow
          icon={<div style={{ width:44, height:44, borderRadius:12, background:'#fb466c', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.heart width="22" height="22" style={{ color:'#fff' }}/></div>}
          title="Apple Health"
          desc="Workouts, heart rate, route. Reader-only — we never write back."
        />
        <ConnectRow
          icon={<div style={{ width:44, height:44, borderRadius:12, background:c.paper2, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.cam width="20" height="20" style={{ color:c.ink2 }}/></div>}
          title="Photos"
          desc="Optional. So your shares can use real photos from the route."
        />
      </div>

      <div style={{ marginTop:'auto', paddingTop:20 }}>
        <Button kind="primary" full onClick={()=>setStep(3)}>
          Continue <Icon.chevR width="18" height="18"/>
        </Button>
      </div>
    </div>
  );
}

function ConnectRow({ icon, title, desc, required }){
  const c = useColors();
  return (
    <div style={{
      padding:14, border:`1px solid ${c.line}`, borderRadius:14,
      display:'flex', gap:14, alignItems:'flex-start',
    }}>
      {icon}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
          <span style={{ fontWeight:500, fontSize:15, color:c.ink }}>{title}</span>
          {required && <span className="eyebrow" style={{ color:c.accent, fontSize:9 }}>REQUIRED</span>}
        </div>
        <div style={{ fontSize:12.5, color:c.ink3, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{desc}</div>
      </div>
    </div>
  );
}

function ConnectStrava({ setStep, onDone }){
  const c = useColors();
  const [phase, setPhase] = React.useState('idle'); // idle, connecting, syncing, done
  const [progress, setProgress] = React.useState(0);

  React.useEffect(()=>{
    if(phase==='connecting'){
      const t = setTimeout(()=>setPhase('syncing'), 1100);
      return ()=>clearTimeout(t);
    }
    if(phase==='syncing'){
      const id = setInterval(()=>{
        setProgress(p => {
          const np = p + Math.random()*8 + 4;
          if(np >= 100){ clearInterval(id); setPhase('done'); return 100; }
          return np;
        });
      }, 140);
      return ()=>clearInterval(id);
    }
  }, [phase]);

  if(phase === 'idle'){
    return (
      <div style={{ padding:'72px 32px 32px', height:'100%', display:'flex', flexDirection:'column' }} className="rise">
        <div className="tap" onClick={()=>setStep(2)} style={{ marginBottom:36, color:c.ink2 }}>
          <Icon.back width="22" height="22"/>
        </div>
        <Eyebrow style={{ marginBottom:10 }}>STEP 03 · 03</Eyebrow>
        <h2 className="display" style={{ fontSize:32, margin:'0 0 8px', letterSpacing:'-0.02em', lineHeight:1.1 }}>
          Connect <span className="serif" style={{ fontStyle:'italic', color:'#fc4c02' }}>Strava</span>.
        </h2>
        <p style={{ color:c.ink3, fontSize:15, lineHeight:1.45, margin:'0 0 24px', textWrap:'pretty' }}>
          You'll be asked to authorize RunStamp in your browser. We request read-only access to your activities.
        </p>

        <div style={{ background:c.paper2, border:`1px solid ${c.line}`, borderRadius:14, padding:16, marginBottom:24 }}>
          <Eyebrow style={{ marginBottom:10 }}>WHAT WE READ</Eyebrow>
          {[
            ['activity:read', 'Activity list, distance, time, splits'],
            ['activity:read_all', 'Includes routes flagged as private'],
            ['profile:read_all', 'Username, profile photo'],
          ].map(([s,d])=>(
            <div key={s} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'6px 0', borderTop:`1px solid ${c.line2}` }}>
              <Icon.check width="14" height="14" style={{ color:c.moss, marginTop:2, flexShrink:0 }}/>
              <div>
                <div className="mono" style={{ fontSize:11, color:c.ink2 }}>{s}</div>
                <div style={{ fontSize:12, color:c.ink3, lineHeight:1.4 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:'auto' }}>
          <Button full onClick={()=>setPhase('connecting')} style={{ background:'#fc4c02', borderColor:'#fc4c02', color:'#fff' }}>
            <Icon.strava width="20" height="20" style={{ color:'#fff' }}/> Authorize Strava
          </Button>
          <div className="tap" onClick={()=>setStep(4)} style={{ textAlign:'center', marginTop:14, fontSize:13, color:c.ink3 }}>
            Skip — set up later
          </div>
        </div>
      </div>
    );
  }

  // syncing / done
  return (
    <div style={{ padding:'72px 32px 32px', height:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <div style={{ marginTop:48 }}>
        <div style={{ position:'relative', width:120, height:120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ position:'absolute', inset:0, animation: phase==='done'?'none':'spin 2.4s linear infinite' }}>
            <circle cx="60" cy="60" r="52" fill="none" stroke={c.line} strokeWidth="2"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke={c.accent} strokeWidth="3"
                    strokeDasharray={`${(phase==='done'?100:progress)*3.27} 327`} strokeLinecap="round"
                    transform="rotate(-90 60 60)"/>
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {phase==='done'
              ? <Icon.check width="40" height="40" style={{ color:c.accent }}/>
              : <SunMark size={48}/>}
          </div>
        </div>
      </div>
      <h2 className="display" style={{ fontSize:28, margin:'32px 0 8px', letterSpacing:'-0.01em', textAlign:'center' }}>
        {phase==='connecting' && 'Authorizing…'}
        {phase==='syncing' && 'Backfilling your runs'}
        {phase==='done' && 'You\'re in.'}
      </h2>
      <p style={{ color:c.ink3, fontSize:14, textAlign:'center', maxWidth:280, lineHeight:1.45 }}>
        {phase==='connecting' && 'Returning from Strava.'}
        {phase==='syncing' && `Last 90 days first, then 5 years in the background. ${Math.round(progress)}%`}
        {phase==='done' && 'Pulled 612 runs across 4,287 km. Welcome, Gilla.'}
      </p>

      {phase==='syncing' && (
        <div style={{ width:'100%', marginTop:32, fontSize:12, color:c.ink3 }}>
          <div className="mono" style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${c.line2}` }}>
            <span>activities</span>
            <span style={{ color:c.ink }}>{Math.round(progress*6.12)} / 612</span>
          </div>
          <div className="mono" style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${c.line2}` }}>
            <span>streams</span>
            <span style={{ color:c.ink }}>{Math.round(progress*4.8)} / 480</span>
          </div>
          <div className="mono" style={{ display:'flex', justifyContent:'space-between', padding:'6px 0' }}>
            <span>geocoding</span>
            <span style={{ color:c.ink }}>{Math.round(progress*0.12)} / 12 cities</span>
          </div>
        </div>
      )}

      {phase==='done' && (
        <div style={{ marginTop:'auto', width:'100%' }}>
          <Button kind="primary" full onClick={onDone}>
            Open RunStamp <Icon.chevR width="18" height="18"/>
          </Button>
        </div>
      )}
    </div>
  );
}

function ConnectHealth(){ return <ConnectStrava/>; }

Object.assign(window, { Onboarding });
