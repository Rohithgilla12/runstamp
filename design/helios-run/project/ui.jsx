// ui.jsx — shared atoms: theme, icons, charts, route map

// ─── Theme context ──────────────────────────────────────────
const ThemeCtx = React.createContext({ dark:false, accent:'solar', units:'km' });
const useTheme = () => React.useContext(ThemeCtx);

// Accent palettes
const ACCENTS = {
  solar:    { primary:'#e85d2f', deep:'#c44a1e', name:'Solar' },
  electric: { primary:'#3a5cff', deep:'#2742c4', name:'Electric' },
  moss:     { primary:'#4a6b3a', deep:'#3a5430', name:'Moss' },
  ink:      { primary:'#14110d', deep:'#000000', name:'Ink' },
};

function useColors(){
  const { dark, accent } = useTheme();
  const a = ACCENTS[accent] || ACCENTS.solar;
  return dark ? {
    paper:'#0e0d0b', paper2:'#1a1714', paper3:'#22201c',
    ink:'#f3ede2', ink2:'#c9c0b1', ink3:'#8a8170',
    line:'rgba(243,237,226,0.12)', line2:'rgba(243,237,226,0.06)',
    accent:a.primary, accentDeep:a.deep,
    moss:'#7a9a6a', warn:'#d4a667', sky:'#6da6c4',
  } : {
    paper:'#f3ede2', paper2:'#ebe3d3', paper3:'#e2d8c4',
    ink:'#14110d', ink2:'#3a342b', ink3:'#75695a',
    line:'rgba(20,17,13,0.10)', line2:'rgba(20,17,13,0.06)',
    accent:a.primary, accentDeep:a.deep,
    moss:'#4a6b3a', warn:'#c0833a', sky:'#3c6e8c',
  };
}

// ─── Icons ──────────────────────────────────────────────────
const Icon = {
  home: (p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>),
  chart:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20V8"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>),
  globe:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>),
  user: (p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg>),
  back: (p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 5l-7 7 7 7"/></svg>),
  share:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v13"/><path d="M7 8l5-5 5 5"/><rect x="4" y="16" width="16" height="5" rx="1"/></svg>),
  more: (p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>),
  plus: (p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  check:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12l5 5L20 7"/></svg>),
  heart:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s-7-4.4-9.5-9C.5 7.8 4 4 8 4c2 0 3.5 1 4 2 .5-1 2-2 4-2 4 0 7.5 3.8 5.5 8-2.5 4.6-9.5 9-9.5 9z"/></svg>),
  mountain:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 19l6-11 4 7 3-5 5 9z"/></svg>),
  bolt:(p)=>(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>),
  flame:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>),
  clock:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  pace:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="13" r="7"/><path d="M12 13l4-4"/><path d="M9 4h6"/></svg>),
  ruler:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>),
  shoe:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 15c0-1 1-2 2-2l5-1 3-4 4 1 6 3v3a2 2 0 01-2 2H4a2 2 0 01-2-2z"/><path d="M9 12l1 3M13 13l1 2"/></svg>),
  cam:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l2-3h4l2 3"/><circle cx="12" cy="13" r="4"/></svg>),
  sun:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>),
  moon:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 14A8 8 0 119.5 4 7 7 0 0020 14z"/></svg>),
  cloud:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 18a5 5 0 010-10 6 6 0 0111-2 4 4 0 011 8H7z"/></svg>),
  fog:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}><path d="M3 10h18M3 14h12M5 18h14"/></svg>),
  rain:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 15a5 5 0 010-10 6 6 0 0111-2 4 4 0 011 8H7z"/><path d="M9 19l-1 2M13 19l-1 2M17 19l-1 2"/></svg>),
  pin:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>),
  chevR:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 5l7 7-7 7"/></svg>),
  chevD:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 9l7 7 7-7"/></svg>),
  filter:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}><path d="M3 6h18M6 12h12M10 18h4"/></svg>),
  layers:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5"/></svg>),
  sliders:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/></svg>),
  download:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v13M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>),
  trash:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>),
  privacy:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>),
  github:(p)=>(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.1-1.46-1.1-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z"/></svg>),
  strava:(p)=>(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M7 13L12 3l5 10h-3l-2-4-2 4H7zm5 0l3 6h-2l-1-2-1 2h-2l3-6z"/></svg>),
  apple:(p)=>(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M17.7 12.6c0-2.4 2-3.5 2.1-3.6-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8C7.3 7.2 6 8.2 5.2 9.7c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.7 3-.7s1.8.7 3.1.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-.9-2.5-3.8zm-2.4-7c.6-.8 1-1.9.9-3-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.3-.5 2.9-1.3z"/></svg>),
  spark:(p)=>(<svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z"/></svg>),
  arrowUp:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 14l5-5 5 5"/></svg>),
  arrowDown:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 10l5 5 5-5"/></svg>),
  x:(p)=>(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>),
};

// ─── Sun mark (RunStamp logo) ─────────────────────────────────
function SunMark({ size=20, color, strokeColor }){
  const c = useColors();
  const fill = color || c.accent;
  const sc = strokeColor || c.ink;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4.8" fill={fill}/>
      {[...Array(8)].map((_,i)=>{
        const a = (i*Math.PI*2)/8;
        const x1 = 12 + Math.cos(a)*7.2, y1 = 12 + Math.sin(a)*7.2;
        const x2 = 12 + Math.cos(a)*10.5, y2 = 12 + Math.sin(a)*10.5;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={fill} strokeWidth="1.6" strokeLinecap="round"/>;
      })}
    </svg>
  );
}

// ─── Route map ──────────────────────────────────────────────
// Renders a polyline on a stylized cartographic background.
function RouteMap({ points, width=358, height=200, style='light', flat=false, accent }){
  const c = useColors();
  const a = accent || c.accent;
  // map style colors
  const styles = {
    light:{ bg:'#e8e1d1', land:'#dfd6c0', park:'#cdd5b6', water:'#bcd4d8', road:'#f3ede2', roadLine:'#c9bea7' },
    dark: { bg:'#1d1a16', land:'#26221c', park:'#2a2e22', water:'#1a2a30', road:'#2e2925', roadLine:'#3e362a' },
    sat:  { bg:'#222', land:'#1f2a1a', park:'#2c3a22', water:'#1c2a36', road:'#3a3a36', roadLine:'#4a4a44' },
  };
  const s = styles[style] || styles.light;
  // map polyline to viewbox
  const pad = 18;
  const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = Math.max(maxX-minX, 0.01), rangeY = Math.max(maxY-minY, 0.01);
  const scale = Math.min((width-pad*2)/rangeX, (height-pad*2)/rangeY);
  const offX = (width - rangeX*scale)/2 - minX*scale;
  const offY = (height - rangeY*scale)/2 - minY*scale;
  const d = points.map((p,i)=>{
    const x = p[0]*scale + offX, y = p[1]*scale + offY;
    return `${i===0?'M':'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const start = points[0], end = points[points.length-1];
  const sx = start[0]*scale+offX, sy = start[1]*scale+offY;
  const ex = end[0]*scale+offX, ey = end[1]*scale+offY;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
      <rect x="0" y="0" width={width} height={height} fill={s.bg}/>
      {/* park polygons */}
      <ellipse cx={width*0.55} cy={height*0.45} rx={width*0.25} ry={height*0.28} fill={s.park} opacity="0.85"/>
      <ellipse cx={width*0.18} cy={height*0.7} rx={width*0.18} ry={height*0.18} fill={s.park} opacity="0.6"/>
      {/* water */}
      <path d={`M0 ${height*0.78} Q${width*0.3} ${height*0.72} ${width*0.6} ${height*0.84} T${width} ${height*0.82} L${width} ${height} L0 ${height}Z`} fill={s.water} opacity="0.85"/>
      {/* roads */}
      {[0.25, 0.55, 0.85].map((y,i)=>(
        <line key={'h'+i} x1="0" y1={height*y} x2={width} y2={height*y} stroke={s.road} strokeWidth={i===1?6:3}/>
      ))}
      {[0.2,0.45,0.7].map((x,i)=>(
        <line key={'v'+i} x1={width*x} y1="0" x2={width*x} y2={height} stroke={s.road} strokeWidth={i===1?5:2.5}/>
      ))}
      {/* road outlines */}
      <line x1="0" y1={height*0.55} x2={width} y2={height*0.55} stroke={s.roadLine} strokeWidth="0.5" strokeDasharray="4 6"/>
      {/* polyline glow */}
      <path d={d} fill="none" stroke={a} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.18"/>
      <path d={d} fill="none" stroke={a} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* start/end markers */}
      <circle cx={sx} cy={sy} r="6" fill={style==='dark'?'#fff':'#fff'} stroke={a} strokeWidth="2"/>
      <circle cx={sx} cy={sy} r="2.5" fill={a}/>
      <circle cx={ex} cy={ey} r="5" fill={a}/>
      {/* north arrow */}
      {!flat && (
        <g transform={`translate(${width-26},${20})`}>
          <text x="0" y="0" fontFamily="JetBrains Mono" fontSize="9" fill={style==='dark'?'#8a8170':'#75695a'} textAnchor="middle">N</text>
          <path d="M0 4 L-3 10 L0 8 L3 10 Z" fill={style==='dark'?'#8a8170':'#75695a'}/>
        </g>
      )}
    </svg>
  );
}

// ─── Sparkline ──────────────────────────────────────────────
function Sparkline({ data, width=80, height=24, color, fill=true, strokeWidth=1.5 }){
  const c = useColors();
  const stroke = color || c.accent;
  if(!data || data.length<2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(max-min, 1);
  const step = width/(data.length-1);
  const pts = data.map((v,i)=>[i*step, height - ((v-min)/range)*(height-4) - 2]);
  const d = pts.map((p,i)=>`${i===0?'M':'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height}>
      {fill && <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={stroke} opacity="0.12"/>}
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Bar chart ──────────────────────────────────────────────
function BarChart({ data, width=320, height=120, valKey='km', labelKey='w', highlight, format }){
  const c = useColors();
  const max = Math.max(...data.map(d=>d[valKey]||0))*1.1;
  const barW = (width - 24)/data.length - 4;
  return (
    <svg width={width} height={height+24} style={{display:'block'}}>
      {/* gridlines */}
      {[0.25,0.5,0.75,1].map((p,i)=>(
        <line key={i} x1="0" y1={height*(1-p)} x2={width} y2={height*(1-p)} stroke={c.line2}/>
      ))}
      {data.map((d,i)=>{
        const h = (d[valKey]||0)/max * (height-8);
        const x = i*(barW+4) + 8;
        const y = height - h;
        const isHi = highlight && highlight(d, i);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="2"
                  fill={isHi ? c.accent : c.ink2} opacity={isHi?1:0.85}/>
            <text x={x+barW/2} y={height+14}
                  fontFamily="JetBrains Mono" fontSize="9"
                  fill={c.ink3} textAnchor="middle">{d[labelKey]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Delta chip ─────────────────────────────────────────────
function Delta({ value, format=(v)=>v }){
  const c = useColors();
  const up = value > 0;
  const flat = value === 0;
  const color = flat ? c.ink3 : up ? c.moss : c.warn;
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:2,
      color, fontFamily:'JetBrains Mono', fontSize:11, fontWeight:500,
    }}>
      {flat ? '—' : up ? '▲' : '▼'} {format(Math.abs(value))}
    </span>
  );
}

// ─── Card ───────────────────────────────────────────────────
function Card({ children, style, padded=true, onClick }){
  const c = useColors();
  return (
    <div className={onClick?'tap':''} onClick={onClick} style={{
      background:c.paper, borderRadius:14,
      border:`1px solid ${c.line}`,
      padding: padded ? 16 : 0,
      ...style,
    }}>{children}</div>
  );
}

// ─── Eyebrow ────────────────────────────────────────────────
function Eyebrow({ children, style }){
  const c = useColors();
  return <div className="eyebrow" style={{ color:c.ink3, ...style }}>{children}</div>;
}

// ─── Stat ───────────────────────────────────────────────────
function Stat({ label, value, sub, unit, size='md' }){
  const c = useColors();
  const sizes = {
    sm:{ v:24, s:11, l:9 },
    md:{ v:34, s:12, l:10 },
    lg:{ v:48, s:13, l:10 },
    xl:{ v:64, s:14, l:11 },
  };
  const z = sizes[size];
  return (
    <div>
      <div className="eyebrow" style={{ color:c.ink3, fontSize:z.l, marginBottom:2 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <span className="mono" style={{ fontSize:z.v, fontWeight:500, letterSpacing:'-0.02em', color:c.ink, lineHeight:1 }}>{value}</span>
        {unit && <span style={{ fontSize:z.s, color:c.ink3 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:z.s, color:c.ink3, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────
function Button({ children, kind='primary', onClick, style, full, icon, disabled }){
  const c = useColors();
  const styles = {
    primary: { background:c.ink, color:c.paper, border:'1px solid '+c.ink },
    accent:  { background:c.accent, color:'#fff', border:'1px solid '+c.accent },
    ghost:   { background:'transparent', color:c.ink, border:`1px solid ${c.line}` },
    danger:  { background:'transparent', color:'#c44a1e', border:`1px solid ${c.line}` },
  };
  return (
    <button className="tap" onClick={onClick} disabled={disabled} style={{
      ...styles[kind],
      height:48, padding:'0 18px', borderRadius:12,
      fontFamily:'Geist', fontWeight:500, fontSize:15,
      letterSpacing:'-0.01em',
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
      width: full ? '100%' : undefined,
      cursor:'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}>
      {icon}
      {children}
    </button>
  );
}

// ─── Weather glyph helper ───────────────────────────────────
const WeatherIcon = ({ icon, size=14 })=> {
  const c = useColors();
  const Comp = Icon[icon] || Icon.sun;
  return <Comp width={size} height={size} style={{ color:c.ink3 }}/>;
};

Object.assign(window, {
  ThemeCtx, useTheme, ACCENTS, useColors,
  Icon, SunMark, RouteMap, Sparkline, BarChart, Delta, Card, Eyebrow, Stat, Button, WeatherIcon,
});
