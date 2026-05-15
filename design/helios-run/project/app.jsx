// app.jsx — root: navigation, theme, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accent": "solar",
  "units": "km",
  "showOnboarding": false,
  "startTab": "home"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Navigation: a small stack of routes
  const [route, setRoute] = React.useState({ type: t.startTab });
  const [tab, setTab] = React.useState(t.startTab);
  const [onboardingStep, setOnboardingStep] = React.useState(0);
  const [onboardingActive, setOnboardingActive] = React.useState(t.showOnboarding);

  const go = (r) => {
    setRoute(r);
    if (['home','analytics','places','settings'].includes(r.type)) setTab(r.type);
  };

  // Sync tab change
  const goTab = (id) => {
    setTab(id);
    setRoute({ type:id });
  };

  React.useEffect(()=>{ setOnboardingActive(t.showOnboarding); }, [t.showOnboarding]);

  // Theme application: write CSS vars on body so the dark/light bg is right
  React.useEffect(()=>{
    document.body.style.background = t.dark
      ? 'radial-gradient(1200px 700px at 20% 0%, #1c1814 0%, transparent 60%), radial-gradient(900px 600px at 80% 100%, #0f0d0a 0%, transparent 60%), #0a0907'
      : 'radial-gradient(1200px 700px at 20% 0%, #38322a 0%, transparent 60%), radial-gradient(900px 600px at 80% 100%, #2a241d 0%, transparent 60%), #1d1a16';
  }, [t.dark]);

  const themeValue = { dark:t.dark, accent:t.accent, units:t.units };
  const setTheme = (patch) => {
    Object.keys(patch).forEach(k => setTweak(k, patch[k]));
  };

  return (
    <ThemeCtx.Provider value={themeValue}>
      <div style={{
        display:'flex', flexDirection:'row', gap:30,
        alignItems:'center', justifyContent:'center',
      }}>
        <IOSDevice width={402} height={874} dark={t.dark}>
          <div style={{ position:'relative', width:'100%', height:'100%' }}>
            {onboardingActive ? (
              <Onboarding step={onboardingStep} setStep={setOnboardingStep}
                onDone={()=>{ setOnboardingActive(false); setTweak('showOnboarding', false); }}/>
            ) : (
              <>
                <ScreenRouter route={route} go={go} units={t.units} dark={t.dark} accent={t.accent} setTheme={setTheme}/>
                {showTabsFor(route) && <TabBar tab={tab} go={goTab} dark={t.dark}/>}
              </>
            )}
          </div>
        </IOSDevice>

        {/* Side panel: device label */}
        <div style={{
          color:'#a89576', fontFamily:'JetBrains Mono', fontSize:11,
          display:'flex', flexDirection:'column', gap:6, opacity:0.6,
          minWidth:160,
        }}>
          <div style={{ color:'#e85d2f', fontWeight:600 }}>RUNSTAMP · v0.1</div>
          <div>iPhone 15 · 402×874</div>
          <div>iOS 26 · light/dark</div>
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(168,149,118,0.18)', fontStyle:'italic', fontFamily:'Geist', fontSize:12, color:'#c9c0b1' }}>
            Tap any screen. Drag handles in the editor.
          </div>
          <div style={{ marginTop:8, fontFamily:'Geist', fontSize:11, color:'#75695a' }}>
            Try the bottom-right Tweaks toggle for theme & accent.
          </div>
        </div>
      </div>

      {/* Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Theme"/>
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v)=>setTweak('dark', v)}/>

        <TweakSection label="Data"/>
        <TweakRadio label="Units" value={t.units} options={['km','mi']} onChange={(v)=>setTweak('units', v)}/>

        <TweakSection label="Flow"/>
        <TweakToggle label="Show onboarding" value={onboardingActive} onChange={(v)=>{
          setTweak('showOnboarding', v);
          setOnboardingActive(v);
          if(v) setOnboardingStep(0);
        }}/>
        <TweakSelect label="Start screen" value={t.startTab}
          options={['home','analytics','places','settings']}
          onChange={(v)=>{ setTweak('startTab', v); goTab(v); }}/>

        <TweakSection label="Jump to"/>
        <TweakButton onClick={()=>go({ type:'activity', id:'a1' })}>Activity detail</TweakButton>
        <TweakButton onClick={()=>go({ type:'editor', id:'a1' })}>Share editor</TweakButton>
      </TweaksPanel>
    </ThemeCtx.Provider>
  );
}

function showTabsFor(route){
  // Hide tabs on activity detail (it's a stack push), editor, and settings sub-pages
  if(['activity','editor'].includes(route.type)) return false;
  return true;
}

function ScreenRouter({ route, go, units, dark, accent, setTheme }){
  switch(route.type){
    case 'home':      return <HomeScreen go={go} units={units}/>;
    case 'analytics': return <AnalyticsScreen go={go} units={units}/>;
    case 'places':    return <PlacesScreen go={go} units={units}/>;
    case 'settings':  return <SettingsScreen go={go} units={units} dark={dark} accent={accent} setTheme={setTheme}/>;
    case 'activity':  return <ActivityScreen id={route.id} go={go} units={units}/>;
    case 'editor':    return <EditorScreen id={route.id} go={go} units={units} accent={accent}/>;
    default:          return <HomeScreen go={go} units={units}/>;
  }
}

function TabBar({ tab, go, dark }){
  const c = useColors();
  const items = [
    ['home','Home', 'home'],
    ['analytics','Stats', 'chart'],
    ['places','Places', 'globe'],
    ['settings','Profile', 'user'],
  ];
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0,
      paddingBottom:24, paddingTop:8,
      background: dark
        ? 'linear-gradient(180deg, rgba(14,13,11,0) 0%, rgba(14,13,11,0.85) 30%, rgba(14,13,11,0.97) 100%)'
        : 'linear-gradient(180deg, rgba(243,237,226,0) 0%, rgba(243,237,226,0.85) 30%, rgba(243,237,226,0.97) 100%)',
      backdropFilter:'blur(8px)',
      zIndex:5,
    }}>
      <div style={{
        margin:'0 14px', borderRadius:18,
        background: dark ? 'rgba(26,23,20,0.92)' : 'rgba(255,251,243,0.92)',
        border: `1px solid ${c.line}`,
        boxShadow:'0 6px 24px rgba(0,0,0,0.08)',
        display:'flex', alignItems:'center', justifyContent:'space-around',
        padding:'8px 6px',
      }}>
        {items.map(([id,label,iconKey])=>{
          const I = Icon[iconKey];
          const on = tab===id;
          return (
            <div key={id} className="tap" onClick={()=>go(id)} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              padding:'6px 14px', borderRadius:12,
              color: on ? c.ink : c.ink3,
              background: on ? c.paper2 : 'transparent',
              transition: 'background .15s',
            }}>
              <I width="20" height="20"/>
              <span style={{ fontSize:10, fontWeight: on?500:400, letterSpacing:'-0.01em' }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
