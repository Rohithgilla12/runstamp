// screen-editor.jsx — share editor with photo upload + drag-drop stat stickers

const TEMPLATES = [
  { id:'stickers',  name:'Stickers',   eyebrow:'001', free:true },
  { id:'magazine',  name:'Magazine',   eyebrow:'002' },
  { id:'minimal',   name:'Minimal',    eyebrow:'003' },
  { id:'brutalist', name:'Brutalist',  eyebrow:'004' },
  { id:'track',     name:'Track Meet', eyebrow:'005' },
  { id:'newsprint', name:'Newsprint',  eyebrow:'006' },
  { id:'topo',      name:'Topo',       eyebrow:'007' },
];

const ASPECTS = [
  { id:'9:16', w:9, h:16, label:'Story' },
  { id:'1:1',  w:1, h:1,  label:'Post' },
  { id:'4:5',  w:4, h:5,  label:'Feed' },
];

const BACKGROUNDS = [
  { id:'photo', label:'Photo' },
  { id:'map',   label:'Map' },
  { id:'solid', label:'Solid' },
];

// ─── Sticker definitions ────────────────────────────────────
// Each sticker type knows how to render (small content + bounding size)
const STICKER_KINDS = {
  distance:  { label:'Distance',  icon:'ruler',   w:0.62, h:0.13 },
  pace:      { label:'Pace',      icon:'pace',    w:0.40, h:0.12 },
  time:      { label:'Time',      icon:'clock',   w:0.56, h:0.12 },
  hr:        { label:'Heart rate',icon:'heart',   w:0.40, h:0.14 },
  elev:      { label:'Elevation', icon:'mountain',w:0.40, h:0.12 },
  cal:       { label:'Calories',  icon:'flame',   w:0.40, h:0.12 },
  cadence:   { label:'Cadence',   icon:'bolt',    w:0.40, h:0.12 },
  splits:    { label:'Splits',    icon:'sliders', w:0.86, h:0.30 },
  hrchart:   { label:'HR chart',  icon:'spark',   w:0.78, h:0.22 },
  pacechart: { label:'Pace chart',icon:'spark',   w:0.78, h:0.22 },
  route:     { label:'Route',     icon:'pin',     w:0.66, h:0.34 },
  date:      { label:'Date',      icon:'clock',   w:0.40, h:0.08 },
  shoe:      { label:'Shoe',      icon:'shoe',    w:0.78, h:0.10 },
  title:     { label:'Title',     icon:'pin',     w:0.86, h:0.10 },
  place:     { label:'Place',     icon:'pin',     w:0.66, h:0.08 },
};

const DEFAULT_STICKERS = [
  { id:'s1', type:'title',    x:0.07, y:0.06 },
  { id:'s2', type:'distance', x:0.07, y:0.74 },
  { id:'s3', type:'pace',     x:0.07, y:0.87 },
];

// Photos available as backgrounds. First is "Upload from photos" pseudo-action.
const PHOTOS = [
  { id:'p1', label:'Sunrise Cubbon',  swatch:'linear-gradient(160deg, #f6c177 0%, #e85d2f 50%, #5a3010 100%)' },
  { id:'p2', label:'Marine Drive',    swatch:'linear-gradient(180deg, #4a6b8a 0%, #d4a667 60%, #2a1a14 100%)' },
  { id:'p3', label:'Goa beach',       swatch:'linear-gradient(160deg, #87ceeb 0%, #f5deb3 60%, #2a1a14 100%)' },
  { id:'p4', label:'Hampstead misty', swatch:'linear-gradient(180deg, #2a3a3a 0%, #5a6b6b 60%, #d4d0c8 100%)' },
  { id:'p5', label:'Tokyo dawn',      swatch:'linear-gradient(180deg, #2a2438 0%, #e85d8a 50%, #ffb98a 100%)' },
  { id:'p6', label:'Track stripes',   swatch:'repeating-linear-gradient(0deg, #c44a1e 0 18px, #a93a16 18px 36px)' },
  { id:'p7', label:'Sankey lake',     swatch:'linear-gradient(180deg, #6a8a4a 0%, #3a5a3a 60%, #1a2a1a 100%)' },
  { id:'p8', label:'Paris bridge',    swatch:'linear-gradient(180deg, #8a8a9a 0%, #5a4a3a 60%, #1a1410 100%)' },
];

function EditorScreen({ id, go, units, accent }){
  const c = useColors();
  const run = ACT.find(a=>a.id===id) || ACT[0];

  const [tpl, setTpl] = React.useState('stickers');
  const [aspect, setAspect] = React.useState('9:16');
  const [bg, setBg] = React.useState('photo');
  const [solidColor, setSolidColor] = React.useState(0);
  const [photo, setPhoto] = React.useState(PHOTOS[0]);
  const [stickers, setStickers] = React.useState(DEFAULT_STICKERS);
  const [selected, setSelected] = React.useState(null);
  const [tab, setTab] = React.useState('template');
  const [exporting, setExporting] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const [picker, setPicker] = React.useState(false); // show camera roll
  const [stampPos, setStampPos] = React.useState('br'); // br | bl | tr | tl | off

  const asp = ASPECTS.find(a=>a.id===aspect);
  const canvasW = aspect==='9:16' ? 240 : aspect==='1:1' ? 280 : 250;
  const canvasH = Math.round(canvasW * (asp.h/asp.w));

  function doExport(){
    setExporting(true);
    setTimeout(()=>{ setExporting(false); setShared(true); }, 1200);
  }

  function addSticker(type){
    const id = 's' + Date.now();
    // place near top-middle if title-like, else center
    const x = STICKER_KINDS[type].w >= 0.7 ? (1-STICKER_KINDS[type].w)/2 : 0.1 + Math.random()*0.25;
    const y = 0.3 + Math.random() * 0.3;
    setStickers(prev => [...prev, { id, type, x, y }]);
    setSelected(id);
    setTpl('stickers'); // switch to stickers if not already
  }
  function moveSticker(id, x, y){
    setStickers(prev => prev.map(s => s.id===id ? {...s, x, y} : s));
  }
  function removeSticker(id){
    setStickers(prev => prev.filter(s => s.id!==id));
    if(selected===id) setSelected(null);
  }
  const onCanvasTap = (e)=>{
    // tapping background clears selection
    if(e.target === e.currentTarget) setSelected(null);
  };

  return (
    <div style={{
      background:c.paper, color:c.ink, minHeight:'100%', position:'relative',
      paddingBottom:0,
    }} className="grain">
      {/* Top bar */}
      <div style={{
        position:'sticky', top:0, zIndex:5,
        paddingTop:54, background:c.paper, borderBottom:`1px solid ${c.line}`,
      }}>
        <div style={{ padding:'8px 14px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div className="tap" onClick={()=>go({type:'activity', id:run.id})} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Icon.back width="20" height="20" style={{ color:c.ink }}/>
          </div>
          <div style={{ textAlign:'center' }}>
            <Eyebrow>EDITOR</Eyebrow>
            <div style={{ fontSize:13, fontWeight:500 }}>{run.title}</div>
          </div>
          <div className="tap" onClick={doExport} style={{
            padding:'7px 12px', borderRadius:10,
            background:c.ink, color:c.paper, fontSize:13, fontWeight:500,
          }}>
            Export
          </div>
        </div>

        {/* Aspect toggle */}
        <div style={{ padding:'4px 14px 12px', display:'flex', gap:6, justifyContent:'center' }}>
          {ASPECTS.map(a=>(
            <div key={a.id} className="tap" onClick={()=>setAspect(a.id)} style={{
              padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:500,
              background: aspect===a.id ? c.ink : 'transparent',
              color: aspect===a.id ? c.paper : c.ink2,
              border: aspect===a.id ? `1px solid ${c.ink}` : `1px solid ${c.line}`,
              display:'flex', alignItems:'center', gap:6,
            }}>
              <span className="mono">{a.id}</span>
              <span style={{ opacity:0.7 }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas stage */}
      <div style={{
        padding:'18px 14px 14px',
        display:'flex', justifyContent:'center', alignItems:'center',
        background: `repeating-linear-gradient(45deg, ${c.paper2} 0 12px, ${c.paper} 12px 24px)`,
        minHeight: canvasH + 36,
      }}>
        <div style={{
          width:canvasW, height:canvasH, overflow:'hidden',
          boxShadow:'0 20px 50px rgba(0,0,0,0.18)',
          borderRadius: aspect==='9:16' ? 14 : 10,
          background:c.paper,
          position:'relative',
        }}>
          <CanvasRender
            tpl={tpl} bg={bg} solidColor={solidColor} photo={photo}
            run={run} units={units}
            width={canvasW} height={canvasH}
            stickers={stickers}
            interactive
            selected={selected}
            onSelectSticker={setSelected}
            onMoveSticker={moveSticker}
            onRemoveSticker={removeSticker}
            onCanvasTap={onCanvasTap}
            showStamp={stampPos!=='off'}
            stampPosition={stampPos}
          />
        </div>
      </div>

      {/* Editor tabs */}
      <div style={{ display:'flex', padding:'0 14px', gap:0, borderBottom:`1px solid ${c.line}` }}>
        {[
          ['template','Template'],
          ['background','Photo'],
          ['stats','Stats'],
          ['export','Export'],
        ].map(([id,l])=>(
          <div key={id} className="tap" onClick={()=>setTab(id)} style={{
            padding:'12px 12px', fontSize:13, fontWeight:500,
            color: tab===id ? c.ink : c.ink3,
            borderBottom: tab===id ? `2px solid ${c.accent}` : '2px solid transparent',
            marginBottom:-1, flex:1, textAlign:'center',
          }}>{l}</div>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding:'14px 14px 24px', minHeight:160 }}>
        {tab==='template' && (
          <div>
            <div style={{ fontSize:11, color:c.ink3, marginBottom:10 }}>
              {tpl==='stickers'
                ? 'Free layout — drag stat stickers onto your photo.'
                : 'Pre-designed templates with fixed layouts.'}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
              {TEMPLATES.map(t=>(
                <div key={t.id} className="tap" onClick={()=>setTpl(t.id)} style={{
                  aspectRatio:'9/16', borderRadius:10, overflow:'hidden',
                  border: tpl===t.id ? `2px solid ${c.accent}` : `1px solid ${c.line}`,
                  position:'relative', background:c.paper2,
                }}>
                  <CanvasRender tpl={t.id} bg={bg} solidColor={solidColor} photo={photo}
                    run={run} units={units} width={100} height={178} mini
                    stickers={stickers}
                    showStamp={stampPos!=='off'} stampPosition={stampPos}/>
                  <div style={{
                    position:'absolute', left:0, right:0, bottom:0,
                    padding:'4px 6px', display:'flex', justifyContent:'space-between',
                    background:'linear-gradient(180deg, transparent, rgba(20,17,13,0.85))',
                    color:'#fff', fontSize:9,
                  }}>
                    <span className="mono">{t.eyebrow}{t.free?'·':''}</span>
                    <span style={{ fontWeight:500 }}>{t.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='background' && (
          <PhotoPicker bg={bg} setBg={setBg} photo={photo} setPhoto={setPhoto}
            solidColor={solidColor} setSolidColor={setSolidColor}
            openPicker={()=>setPicker(true)} run={run}/>
        )}

        {tab==='stats' && <StatPickerPanel onAdd={addSticker} stickers={stickers} onRemove={removeSticker}/>}
        {tab==='export' && <ExportPanel onExport={doExport} stampPos={stampPos} setStampPos={setStampPos}/>}
      </div>

      {/* Selected sticker bottom bar */}
      {selected && tpl==='stickers' && (
        <div style={{
          position:'sticky', bottom:0, padding:'10px 14px',
          background:c.paper, borderTop:`1px solid ${c.line}`,
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
        }}>
          <div style={{ fontSize:12, color:c.ink2 }}>
            <span className="eyebrow" style={{ color:c.accent }}>SELECTED</span>{' '}
            <span style={{ fontWeight:500 }}>{STICKER_KINDS[stickers.find(s=>s.id===selected)?.type]?.label}</span>
          </div>
          <div className="tap" onClick={()=>removeSticker(selected)} style={{
            padding:'6px 10px', borderRadius:8, background:c.paper2,
            border:`1px solid ${c.line}`, fontSize:12, display:'inline-flex', alignItems:'center', gap:6,
            color:'#c44a1e',
          }}>
            <Icon.trash width="14" height="14"/> Remove
          </div>
        </div>
      )}

      {/* Camera roll picker */}
      {picker && <CameraRollSheet onClose={()=>setPicker(false)} onPick={(p)=>{ setPhoto(p); setBg('photo'); setPicker(false); }}/>}

      {/* Exporting modal */}
      {exporting && (
        <div style={{
          position:'absolute', inset:0, background:'rgba(14,13,11,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:20,
        }}>
          <div style={{ background:c.paper, padding:'24px 28px', borderRadius:14, textAlign:'center' }}>
            <SunMark size={36}/>
            <div className="display" style={{ fontSize:18, marginTop:10 }}>Rendering 1080×1920…</div>
          </div>
        </div>
      )}
      {shared && <ShareSheet onClose={()=>setShared(false)} run={run}/>}
    </div>
  );
}

// ─── Canvas rendering ───────────────────────────────────────
const SOLID_COLORS = ['#e85d2f','#14110d','#f3ede2','#4a6b3a','#3c6e8c','#c0833a','#d4ff3a','#3a5cff','#a89576','#0e1116','#fff6ec','#1a3a2e'];

function CanvasRender(props){
  const { tpl, bg, solidColor=0, photo, run, units, width, height, mini, stickers,
          interactive, selected, onSelectSticker, onMoveSticker, onRemoveSticker, onCanvasTap,
          showStamp=true, stampPosition='br' } = props;
  const c = useColors();
  const isStickers = tpl === 'stickers';
  // Pick stamp color based on template/bg lightness
  const lightBg =
    tpl==='newsprint' ||
    (bg==='solid' && (SOLID_COLORS[solidColor]==='#f3ede2' || SOLID_COLORS[solidColor]==='#fff6ec'));
  const stampColor = lightBg ? '#14110d' : '#f3ede2';
  return (
    <div onClick={onCanvasTap} style={{
      width:'100%', height:'100%', position:'relative', overflow:'hidden',
      background: bg==='solid' ? SOLID_COLORS[solidColor] : '#000',
    }}>
      {/* background layer */}
      {bg==='photo' && (
        <div style={{ position:'absolute', inset:0, background: photo?.swatch || PHOTOS[0].swatch }}>
          {/* fake photo content: a hint of subject */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(circle at 30% 35%, rgba(255,220,180,0.18), transparent 50%), radial-gradient(circle at 75% 65%, rgba(255,255,255,0.08), transparent 40%)',
          }}/>
        </div>
      )}
      {bg==='map' && (
        <RouteMap points={run.route} width={width} height={height} style={tpl==='newsprint'?'light':'dark'} accent={c.accent} flat/>
      )}

      {/* template-specific overlay (only for fixed templates) */}
      {!isStickers && (
        <>
          {bg!=='solid' && tpl!=='newsprint' && tpl!=='minimal' && (
            <div style={{
              position:'absolute', inset:0,
              background:'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 100%)',
            }}/>
          )}
          {(()=>{ const Tpl = TPL_RENDERERS[tpl] || TPL_RENDERERS.minimal;
            return <Tpl run={run} units={units} mini={mini} width={width} height={height} bgKind={bg} solidColor={solidColor}/>; })()}
        </>
      )}

      {/* Stickers layer */}
      {isStickers && (
        <StickersLayer
          stickers={stickers||[]} run={run} units={units}
          width={width} height={height} mini={mini}
          interactive={interactive} selected={selected}
          onSelect={onSelectSticker} onMove={onMoveSticker} onRemove={onRemoveSticker}
        />
      )}

      {/* RunStamp watermark — baked into every share */}
      {showStamp && (
        <RunStampMark
          run={run} units={units}
          color={stampColor}
          size={mini ? 26 : Math.min(width*0.22, 78)}
          position={stampPosition}
          mini={mini}
        />
      )}
    </div>
  );
}

// ─── RunStamp mark — circular wax-seal watermark ────────────
function RunStampMark({ run, units, color='#f3ede2', size=72, position='br', mini }){
  // Position percentages
  const pos = {
    br: { right: mini? 6:12, bottom: mini? 6:14, left:'auto', top:'auto', rotate:-8 },
    bl: { left:  mini? 6:12, bottom: mini? 6:14, right:'auto', top:'auto', rotate:8 },
    tr: { right: mini? 6:12, top:    mini? 6:14, left:'auto', bottom:'auto', rotate:-8 },
    tl: { left:  mini? 6:12, top:    mini? 6:14, right:'auto', bottom:'auto', rotate:8 },
  }[position] || {};
  const rotate = pos.rotate || 0;
  const date = (run.date || '2026-05-17').slice(2).replace(/-/g,'·'); // 26·05·17
  const dist = Math.round(run.distance || 0) + 'K';
  return (
    <div style={{
      position:'absolute',
      right: pos.right, bottom: pos.bottom, left: pos.left, top: pos.top,
      width: size, height: size,
      transform:`rotate(${rotate}deg)`,
      pointerEvents:'none',
      filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
      opacity: 0.88,
    }}>
      <svg viewBox="-50 -50 100 100" width="100%" height="100%" style={{ color, overflow:'visible' }}>
        <defs>
          <path id={`rsm-top-${size}`} d="M -38,0 A 38,38 0 0 1 38,0"/>
          <path id={`rsm-bot-${size}`} d="M -34,4 A 34,34 0 0 0 34,4"/>
        </defs>
        {/* outer dashed ring */}
        <circle r="44" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.6 1.6" opacity="0.7"/>
        {/* inner solid ring */}
        <circle r="38" fill="none" stroke="currentColor" strokeWidth="1.2"/>
        {/* curved text top */}
        <text fontFamily="'JetBrains Mono', monospace" fontSize="7.2" fill="currentColor" letterSpacing="1.8" fontWeight="600">
          <textPath href={`#rsm-top-${size}`} startOffset="50%" textAnchor="middle">★ RUNSTAMP ★</textPath>
        </text>
        {/* curved text bottom */}
        <text fontFamily="'JetBrains Mono', monospace" fontSize="5.5" fill="currentColor" letterSpacing="1.2" opacity="0.85">
          <textPath href={`#rsm-bot-${size}`} startOffset="50%" textAnchor="middle">· {date} · BLR ·</textPath>
        </text>
        {/* center: sun mark */}
        <g>
          <circle cx="0" cy="-1" r="6.5" fill="currentColor"/>
          {[...Array(8)].map((_, i)=>{
            const a = (i*Math.PI*2)/8;
            const x1 = Math.cos(a)*9.5, y1 = Math.sin(a)*9.5 - 1;
            const x2 = Math.cos(a)*13,  y2 = Math.sin(a)*13 - 1;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>;
          })}
          {/* distance under sun */}
          <text x="0" y="20" fontFamily="'JetBrains Mono', monospace" fontSize="8.5"
                fill="currentColor" textAnchor="middle" letterSpacing="0.6" fontWeight="700">{dist}</text>
        </g>
      </svg>
    </div>
  );
}

const fontScale = (mini, base) => mini ? Math.round(base * 0.42) : base;

// ─── Stickers layer ─────────────────────────────────────────
function StickersLayer({ stickers, run, units, width, height, mini, interactive, selected, onSelect, onMove, onRemove }){
  const ref = React.useRef(null);
  const dragRef = React.useRef(null);

  function onPtrDown(e, sticker){
    if(!interactive) return;
    e.stopPropagation();
    onSelect && onSelect(sticker.id);
    const rect = ref.current.getBoundingClientRect();
    // offset from sticker top-left to pointer
    const offX = e.clientX - rect.left - sticker.x*rect.width;
    const offY = e.clientY - rect.top - sticker.y*rect.height;
    dragRef.current = { id:sticker.id, offX, offY };
    try { e.target.setPointerCapture(e.pointerId); } catch(_){}
  }
  function onPtrMove(e){
    if(!dragRef.current || !ref.current) return;
    const { id, offX, offY } = dragRef.current;
    const rect = ref.current.getBoundingClientRect();
    let x = (e.clientX - rect.left - offX) / rect.width;
    let y = (e.clientY - rect.top - offY) / rect.height;
    x = Math.max(0.01, Math.min(0.99, x));
    y = Math.max(0.01, Math.min(0.99, y));
    onMove && onMove(id, x, y);
  }
  function onPtrUp(){ dragRef.current = null; }

  return (
    <div ref={ref} style={{ position:'absolute', inset:0, touchAction:'none' }}
      onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerCancel={onPtrUp}>
      {stickers.map(s => (
        <Sticker key={s.id} s={s} run={run} units={units}
          width={width} height={height} mini={mini}
          selected={interactive && s.id===selected}
          onPtrDown={(e)=>onPtrDown(e, s)}/>
      ))}
    </div>
  );
}

function Sticker({ s, run, units, width, height, mini, selected, onPtrDown }){
  const kind = STICKER_KINDS[s.type];
  const w = (kind?.w || 0.4) * width;
  const h = (kind?.h || 0.12) * height;
  return (
    <div onPointerDown={onPtrDown} style={{
      position:'absolute',
      left: s.x * width, top: s.y * height,
      width: w, height: h,
      cursor: 'grab',
      touchAction:'none',
      outline: selected ? `2px solid #fff` : 'none',
      outlineOffset: 2,
      boxShadow: selected ? '0 0 0 3px rgba(232,93,47,0.85), 0 6px 16px rgba(0,0,0,0.45)' : 'none',
      borderRadius: 10,
      transition: 'box-shadow .12s',
    }}>
      <StickerContent type={s.type} run={run} units={units} mini={mini}/>
    </div>
  );
}

function StickerContent({ type, run, units, mini }){
  const fs = (b) => mini ? Math.round(b*0.42) : b;
  const cardStyle = {
    width:'100%', height:'100%', display:'flex', flexDirection:'column',
    justifyContent:'center',
    padding: mini? 4 : 10,
    borderRadius: mini? 4 : 10,
    backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
    background:'rgba(14,13,11,0.55)',
    color:'#fff',
    border:'1px solid rgba(255,255,255,0.18)',
    boxShadow:'0 4px 14px rgba(0,0,0,0.3)',
  };
  const eyebrow = (label) => (
    <div style={{
      fontFamily:'JetBrains Mono', fontSize:fs(9), fontWeight:500,
      letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.65)',
    }}>{label}</div>
  );
  const big = (v, suffix) => (
    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
      <span style={{ fontFamily:'JetBrains Mono', fontSize:fs(28), fontWeight:500, letterSpacing:'-0.02em', lineHeight:1 }}>{v}</span>
      {suffix && <span style={{ fontSize:fs(11), color:'rgba(255,255,255,0.7)' }}>{suffix}</span>}
    </div>
  );

  if(type==='distance') return <div style={cardStyle}>{eyebrow('DISTANCE')}{big(fmtDist(run.distance,units), distUnit(units))}</div>;
  if(type==='pace')     return <div style={cardStyle}>{eyebrow('PACE')}{big(fmtPace(run.pace,units), paceUnit(units))}</div>;
  if(type==='time')     return <div style={cardStyle}>{eyebrow('TIME')}{big(fmtTime(run.seconds))}</div>;
  if(type==='hr')       return <div style={cardStyle}>{eyebrow('HEART RATE')}{big(run.avgHr, `· ${run.maxHr} max`)}</div>;
  if(type==='elev')     return <div style={cardStyle}>{eyebrow('ELEVATION')}{big(`+${run.elev}`,'m')}</div>;
  if(type==='cal')      return <div style={cardStyle}>{eyebrow('CALORIES')}{big(run.cal,'kcal')}</div>;
  if(type==='cadence')  return <div style={cardStyle}>{eyebrow('CADENCE')}{big(run.cadence||174,'spm')}</div>;
  if(type==='date')     return <div style={cardStyle}><div style={{fontFamily:'JetBrains Mono', fontSize:fs(11), color:'rgba(255,255,255,0.85)'}}>SUN · MAY 17 · 05:42</div></div>;
  if(type==='shoe')     return <div style={cardStyle}><div style={{display:'flex',alignItems:'center',gap:fs(6)}}><Icon.shoe width={fs(14)} height={fs(14)} style={{color:'rgba(255,255,255,0.9)'}}/><span style={{fontSize:fs(11), fontWeight:500}}>Saucony Endorphin Speed</span></div></div>;
  if(type==='title')    return (
    <div style={{ ...cardStyle, background:'transparent', border:'none', boxShadow:'none', backdropFilter:'none' }}>
      <div style={{ fontFamily:"'Instrument Serif', Georgia, serif", fontSize:fs(28), fontWeight:400, lineHeight:1.05, letterSpacing:'-0.02em',
                    textShadow:'0 2px 12px rgba(0,0,0,0.6)' }}>
        <span style={{ fontStyle:'italic' }}>Cubbon</span> Park
      </div>
    </div>
  );
  if(type==='place')    return (
    <div style={{...cardStyle, padding: mini?3:6, background:'transparent', border:'none', boxShadow:'none', backdropFilter:'none'}}>
      <div style={{ display:'flex', alignItems:'center', gap:4, fontFamily:'JetBrains Mono', fontSize:fs(10), color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,0.7)' }}>
        <Icon.pin width={fs(11)} height={fs(11)}/> Bangalore, IN
      </div>
    </div>
  );
  if(type==='route')    return (
    <div style={{...cardStyle, padding:0, overflow:'hidden'}}>
      <RouteMap points={run.route} width={300} height={150} style="dark" accent="#e85d2f" flat/>
    </div>
  );
  if(type==='splits')   return (
    <div style={{...cardStyle, padding:mini?6:10}}>
      {eyebrow('SPLITS · KM')}
      <div style={{ display:'flex', alignItems:'flex-end', gap:mini?1.5:3, marginTop:fs(4), flex:1 }}>
        {(run.splits||[]).slice(0,18).map((sp,i)=>{
          const arr = (run.splits||[]).slice(0,18);
          const min = Math.min(...arr.map(x=>x.sec)), max = Math.max(...arr.map(x=>x.sec));
          const norm = (sp.sec-min)/(max-min || 1);
          const h = 4 + (1-norm)*22;
          return <div key={i} style={{ flex:1, height:`${h}px`, background: norm<0.3 ? '#e85d2f' : 'rgba(255,255,255,0.6)', borderRadius:1 }}/>;
        })}
      </div>
    </div>
  );
  if(type==='hrchart' || type==='pacechart') {
    const arr = (run.streamHr || []).slice(0,60);
    const min = Math.min(...arr), max = Math.max(...arr);
    return (
      <div style={{...cardStyle, padding:mini?6:10}}>
        {eyebrow(type==='hrchart' ? 'HR · BPM' : 'PACE')}
        <svg viewBox={`0 0 100 30`} preserveAspectRatio="none" style={{ width:'100%', flex:1, marginTop:fs(2) }}>
          <path d={arr.map((v,i)=>`${i===0?'M':'L'}${(i/(arr.length-1))*100} ${30 - ((v-min)/(max-min||1))*28 - 1}`).join(' ')}
            fill="none" stroke="#e85d2f" strokeWidth="1.2"/>
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'JetBrains Mono', fontSize:fs(9), color:'rgba(255,255,255,0.6)' }}>
          <span>{Math.round(min)}</span>
          <span>{Math.round(max)}</span>
        </div>
      </div>
    );
  }
  return <div style={cardStyle}>{type}</div>;
}

// ─── Templates (fixed layouts) ──────────────────────────────
const TPL_RENDERERS = {
  minimal({ run, units, mini, bgKind, solidColor }) {
    const isLight = bgKind==='solid' ? SOLID_COLORS[solidColor]==='#f3ede2' || SOLID_COLORS[solidColor]==='#fff6ec' : false;
    const ink = isLight ? '#14110d' : '#fff';
    const dim = isLight ? 'rgba(20,17,13,0.5)' : 'rgba(255,255,255,0.6)';
    return (
      <div style={{
        position:'absolute', inset:0, padding: mini?12:22, color:ink,
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        background: bgKind==='solid' ? '' : 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.1), rgba(0,0,0,0.7))',
      }}>
        <div>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,11), color:dim }}>SUN · MAY 17 · 26</div>
          <div className="display" style={{ fontSize:fontScale(mini,22), lineHeight:1.05, marginTop:6, letterSpacing:'-0.01em', textWrap:'pretty' }}>
            {run.title}
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize:fontScale(mini,72), fontWeight:500, lineHeight:0.95, letterSpacing:'-0.04em' }}>
            {fmtDist(run.distance, units)}
          </div>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,10), color:dim, marginTop:4 }}>{distUnit(units).toUpperCase()}</div>
          <div style={{ display:'flex', gap:fontScale(mini,12), marginTop:fontScale(mini,12) }}>
            <Mini label="PACE" val={fmtPace(run.pace, units)} color={ink} dim={dim} mini={mini}/>
            <Mini label="TIME" val={fmtTime(run.seconds)} color={ink} dim={dim} mini={mini}/>
            <Mini label="HR" val={run.avgHr} color={ink} dim={dim} mini={mini}/>
          </div>
        </div>
      </div>
    );
  },

  magazine({ run, units, mini }) {
    const c = useColors();
    return (
      <div style={{ position:'absolute', inset:0, padding:mini?10:20, color:'#fff', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,10), color:c.accent }}>VOL. XII · SUN 05:42</div>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,10), opacity:0.7 }}>RUNSTAMP</div>
        </div>
        <div style={{ marginTop:'auto' }}>
          <div className="display" style={{ fontSize:fontScale(mini,32), lineHeight:0.95, letterSpacing:'-0.02em', fontWeight:400 }}>
            <span className="serif" style={{ fontStyle:'italic' }}>twenty</span>-four
          </div>
          <div className="display" style={{ fontSize:fontScale(mini,32), lineHeight:0.95, letterSpacing:'-0.02em', fontWeight:400 }}>
            kilometres at
          </div>
          <div className="display" style={{ fontSize:fontScale(mini,32), lineHeight:0.95, letterSpacing:'-0.02em', fontWeight:400, color:c.accent }}>
            <span className="serif" style={{ fontStyle:'italic' }}>dawn</span>.
          </div>
        </div>
        <div style={{
          marginTop:fontScale(mini,14), paddingTop:fontScale(mini,10),
          borderTop:'1px solid rgba(255,255,255,0.25)',
          display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:fontScale(mini,8),
        }}>
          <Mini label="PACE" val={fmtPace(run.pace,units)} color="#fff" dim="rgba(255,255,255,0.6)" mini={mini}/>
          <Mini label="TIME" val={fmtTime(run.seconds)} color="#fff" dim="rgba(255,255,255,0.6)" mini={mini}/>
          <Mini label="ELEV" val={run.elev+'m'} color="#fff" dim="rgba(255,255,255,0.6)" mini={mini}/>
        </div>
      </div>
    );
  },

  brutalist({ run, units, mini }) {
    return (
      <div style={{ position:'absolute', inset:0, padding:0, color:'#fff', background:'#0a0a0a' }}>
        <div style={{
          position:'absolute', top:0, left:0, right:0,
          padding:fontScale(mini,12),
          borderBottom:'2px solid #fff',
          display:'flex', justifyContent:'space-between',
        }}>
          <div className="mono" style={{ fontSize:fontScale(mini,11), fontWeight:600 }}>RUNSTAMP // 003</div>
          <div className="mono" style={{ fontSize:fontScale(mini,11) }}>2026-05-17</div>
        </div>
        <div style={{
          position:'absolute', top:fontScale(mini,40), left:fontScale(mini,12), right:fontScale(mini,12),
        }}>
          <div className="mono" style={{ fontSize:fontScale(mini,84), fontWeight:700, lineHeight:0.9, letterSpacing:'-0.05em', color:'#ff5a1f' }}>
            {Math.round(run.distance)}
          </div>
          <div className="mono" style={{ fontSize:fontScale(mini,14), color:'#fff', marginTop:fontScale(mini,4), fontWeight:600 }}>KILOMETRES</div>
        </div>
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          borderTop:'2px solid #fff',
          padding:fontScale(mini,10),
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:fontScale(mini,4),
          fontFamily:'JetBrains Mono', fontSize:fontScale(mini,10),
        }}>
          <div>PACE_____{fmtPace(run.pace,units)}</div>
          <div>TIME_____{fmtTime(run.seconds)}</div>
          <div>HR_______{run.avgHr}</div>
          <div>ELEV_____{run.elev}M</div>
        </div>
      </div>
    );
  },

  track({ run, units, mini }) {
    return (
      <div style={{ position:'absolute', inset:0, padding:0, color:'#fff', overflow:'hidden' }}>
        <div style={{
          position:'absolute', inset:0,
          background:`repeating-linear-gradient(0deg, transparent 0 ${fontScale(mini,28)}px, rgba(255,255,255,0.06) ${fontScale(mini,28)}px ${fontScale(mini,29)}px)`,
        }}/>
        <div style={{
          position:'absolute', top:fontScale(mini,12), left:fontScale(mini,14), right:fontScale(mini,14),
          display:'flex', justifyContent:'space-between',
        }}>
          <div className="mono" style={{ fontSize:fontScale(mini,10), letterSpacing:'0.2em', fontWeight:600 }}>LANE · 04</div>
          <div className="mono" style={{ fontSize:fontScale(mini,10), letterSpacing:'0.2em' }}>17.05.26</div>
        </div>
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
        }}>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,10), opacity:0.6 }}>FINISHING TIME</div>
          <div className="mono" style={{ fontSize:fontScale(mini,52), fontWeight:600, lineHeight:1, letterSpacing:'-0.02em', color:'#d4ff3a' }}>
            {fmtTime(run.seconds)}
          </div>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,9), opacity:0.5, marginTop:fontScale(mini,4) }}>
            {fmtDist(run.distance,units).toUpperCase()} {distUnit(units).toUpperCase()} · AVG {fmtPace(run.pace,units)}{paceUnit(units)}
          </div>
        </div>
        <div style={{
          position:'absolute', bottom:fontScale(mini,14), left:fontScale(mini,14), right:fontScale(mini,14),
          display:'flex', justifyContent:'space-between', fontSize:fontScale(mini,10),
        }}>
          <div className="mono">HR {run.avgHr}/{run.maxHr}</div>
          <div className="mono">CAD {run.cadence}</div>
          <div className="mono">+{run.elev}m</div>
        </div>
      </div>
    );
  },

  newsprint({ run, units, mini }) {
    return (
      <div style={{ position:'absolute', inset:0, padding:0, background:'#f6f1e2', color:'#14110d' }}>
        <div style={{
          padding:fontScale(mini,12),
          borderBottom:'2px solid #14110d',
          display:'flex', justifyContent:'space-between', alignItems:'baseline',
        }}>
          <div className="display serif" style={{ fontSize:fontScale(mini,16), fontStyle:'italic' }}>The Daily RunStamp</div>
          <div className="mono" style={{ fontSize:fontScale(mini,9) }}>SUN · MAY 17 · 26</div>
        </div>
        <div style={{ padding:fontScale(mini,12) }}>
          <div className="eyebrow" style={{ fontSize:fontScale(mini,9) }}>RUNNING · BANGALORE</div>
          <div className="display" style={{ fontSize:fontScale(mini,22), lineHeight:1.05, marginTop:fontScale(mini,4), letterSpacing:'-0.01em', textWrap:'pretty' }}>
            Twenty-four kilometres before the city wakes.
          </div>
          <div style={{ fontSize:fontScale(mini,10), color:'#75695a', marginTop:fontScale(mini,4), fontStyle:'italic' }}>
            Cubbon Park, in the mist, sub-150 heart rate.
          </div>
        </div>
        <div style={{
          margin:`0 ${fontScale(mini,12)}px`,
          border:'1px solid #14110d', height: mini? 70 : 150, overflow:'hidden',
        }}>
          <RouteMap points={run.route} width={mini?86:216} height={mini?70:150} style="light" accent="#c44a1e" flat/>
        </div>
        <div style={{
          margin:`${fontScale(mini,10)}px ${fontScale(mini,12)}px 0`,
          paddingTop:fontScale(mini,8),
          borderTop:'1px solid #14110d',
          display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:fontScale(mini,4),
        }}>
          <Mini label="DIST" val={fmtDist(run.distance,units)} color="#14110d" dim="#75695a" mini={mini}/>
          <Mini label="PACE" val={fmtPace(run.pace,units)} color="#14110d" dim="#75695a" mini={mini}/>
          <Mini label="TIME" val={fmtTime(run.seconds)} color="#14110d" dim="#75695a" mini={mini}/>
          <Mini label="HR"   val={run.avgHr} color="#14110d" dim="#75695a" mini={mini}/>
        </div>
      </div>
    );
  },

  topo({ run, units, mini }) {
    return (
      <div style={{ position:'absolute', inset:0, padding:0, background:'#0e1116', color:'#fff' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0 }}>
          {[...Array(14)].map((_,i)=>(
            <path key={i} d={`M-10 ${10+i*7} Q ${30+i*2} ${20+i*5}, ${60-i} ${30+i*4} T ${110} ${50+i*3}`}
              fill="none" stroke="#a89576" strokeWidth="0.25" opacity={0.25+i*0.03}/>
          ))}
        </svg>
        <div style={{ position:'absolute', inset:0, padding:fontScale(mini,14), display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div className="eyebrow" style={{ fontSize:fontScale(mini,9), color:'#a89576' }}>N 12°58' · E 77°35'</div>
            <div className="eyebrow" style={{ fontSize:fontScale(mini,9), color:'#a89576' }}>↑ {run.elev}M</div>
          </div>
          <div style={{ marginTop:'auto' }}>
            <div className="display" style={{ fontSize:fontScale(mini,26), lineHeight:1.05, fontWeight:400, letterSpacing:'-0.02em' }}>
              <span className="serif" style={{ fontStyle:'italic', color:'#e85d2f' }}>Cubbon</span> Park
            </div>
            <div className="mono" style={{ fontSize:fontScale(mini,46), fontWeight:500, lineHeight:1, letterSpacing:'-0.04em', marginTop:fontScale(mini,4) }}>
              {fmtDist(run.distance,units)}
              <span style={{ fontSize:fontScale(mini,12), color:'#a89576', marginLeft:4 }}>{distUnit(units)}</span>
            </div>
            <div style={{ display:'flex', gap:fontScale(mini,10), marginTop:fontScale(mini,8) }}>
              <Mini label="PACE" val={fmtPace(run.pace,units)} color="#fff" dim="#a89576" mini={mini}/>
              <Mini label="TIME" val={fmtTime(run.seconds)} color="#fff" dim="#a89576" mini={mini}/>
              <Mini label="HR" val={run.avgHr} color="#fff" dim="#a89576" mini={mini}/>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

function Mini({ label, val, color, dim, mini }){
  return (
    <div>
      <div className="eyebrow" style={{ fontSize:fontScale(mini,8.5), color:dim, marginBottom:fontScale(mini,2) }}>{label}</div>
      <div className="mono" style={{ fontSize:fontScale(mini,15), fontWeight:500, color, letterSpacing:'-0.01em' }}>{val}</div>
    </div>
  );
}

// ─── Photo / Background picker ──────────────────────────────
function PhotoPicker({ bg, setBg, photo, setPhoto, solidColor, setSolidColor, openPicker, run }){
  const c = useColors();
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {BACKGROUNDS.map(b=>(
          <div key={b.id} className="tap" onClick={()=>setBg(b.id)} style={{
            padding:'8px 14px', borderRadius:8,
            background: bg===b.id ? c.ink : 'transparent',
            color: bg===b.id ? c.paper : c.ink2,
            border: `1px solid ${bg===b.id ? c.ink : c.line}`,
            fontSize:12, fontWeight:500,
          }}>{b.label}</div>
        ))}
      </div>
      {bg==='photo' && (
        <div>
          <div className="tap" onClick={openPicker} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 14px', border:`1px dashed ${c.line}`, borderRadius:12,
            marginBottom:10,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:8, background:c.paper2, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon.cam width="18" height="18" style={{ color:c.ink2 }}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>Upload from Photos</div>
                <div style={{ fontSize:11, color:c.ink3 }}>From your camera roll</div>
              </div>
            </div>
            <Icon.chevR width="16" height="16" style={{ color:c.ink3 }}/>
          </div>
          <Eyebrow style={{ marginBottom:8 }}>FROM THIS RUN</Eyebrow>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {PHOTOS.map((p)=>(
              <div key={p.id} className="tap" onClick={()=>setPhoto(p)} style={{
                aspectRatio:'1/1', borderRadius:8,
                background: p.swatch,
                border: photo?.id===p.id ? `2px solid ${c.accent}` : `1px solid ${c.line}`,
                position:'relative', overflow:'hidden',
              }}>
                <div style={{
                  position:'absolute', left:0, right:0, bottom:0, padding:'3px 5px',
                  background:'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
                  fontSize:8, color:'#fff', fontFamily:'JetBrains Mono',
                  textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap',
                }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {bg==='map' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
          {['light','dark','sat'].map((s,i)=>(
            <div key={s} className="tap" style={{
              aspectRatio:'4/3', borderRadius:8, overflow:'hidden',
              border:i===0?`2px solid ${c.accent}`:`1px solid ${c.line}`,
            }}>
              <RouteMap points={run.route} width={100} height={75} style={s} flat accent={c.accent}/>
            </div>
          ))}
        </div>
      )}
      {bg==='solid' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:8 }}>
          {SOLID_COLORS.map((col,i)=>(
            <div key={i} className="tap" onClick={()=>setSolidColor(i)} style={{
              aspectRatio:'1/1', borderRadius:8, background:col,
              border: solidColor===i ? `2px solid ${c.accent}` : `1px solid ${c.line}`,
            }}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Camera roll sheet ──────────────────────────────────────
function CameraRollSheet({ onClose, onPick }){
  const c = useColors();
  const today = ['p1','p2','p3'];
  const week  = ['p4','p5','p6'];
  const month = ['p7','p8','p1','p3','p5','p2'];
  const groups = [
    { label:'Today', ids: today },
    { label:'This week', ids: week },
    { label:'This month', ids: month },
  ];
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:40,
      background:'rgba(14,13,11,0.55)',
      display:'flex', flexDirection:'column', justifyContent:'flex-end',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:c.paper, borderRadius:'18px 18px 0 0',
        maxHeight:'78%', display:'flex', flexDirection:'column',
        boxShadow:'0 -20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ width:36, height:4, background:c.line, borderRadius:2, margin:'8px auto 0' }}/>
        <div style={{
          padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between',
          borderBottom:`1px solid ${c.line}`,
        }}>
          <span className="tap" onClick={onClose} style={{ fontSize:14, color:c.ink2 }}>Cancel</span>
          <span style={{ fontSize:14, fontWeight:600 }}>Photos</span>
          <span className="tap" style={{ fontSize:14, color:c.accent, fontWeight:500 }}>Add</span>
        </div>

        <div style={{
          padding:'8px 14px', display:'flex', gap:8, borderBottom:`1px solid ${c.line2}`,
        }}>
          {['Recents','Selfies','Screenshots','Bangalore','Travel'].map((a,i)=>(
            <div key={a} style={{
              padding:'5px 10px', borderRadius:999, fontSize:11, fontWeight:500,
              background: i===0 ? c.ink : c.paper2, color: i===0 ? c.paper : c.ink2,
              border:`1px solid ${i===0?c.ink:c.line}`,
            }}>{a}</div>
          ))}
        </div>

        <div style={{ overflowY:'auto', padding:'8px 12px 24px', flex:1 }} className="hideScroll">
          {groups.map(g => (
            <div key={g.label} style={{ marginTop:10 }}>
              <div style={{ fontSize:11, color:c.ink3, fontWeight:500, padding:'4px 4px 6px' }}>{g.label}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:2 }}>
                {g.ids.map((id,idx)=>{
                  const p = PHOTOS.find(x=>x.id===id);
                  return (
                    <div key={g.label+idx} className="tap" onClick={()=>onPick(p)} style={{
                      aspectRatio:'1/1', background:p.swatch,
                      position:'relative', overflow:'hidden',
                    }}>
                      <div style={{
                        position:'absolute', right:4, bottom:3,
                        fontSize:9, color:'#fff', fontFamily:'JetBrains Mono',
                        textShadow:'0 1px 2px rgba(0,0,0,0.6)',
                      }}>{p.label.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stat picker panel ──────────────────────────────────────
function StatPickerPanel({ onAdd, stickers, onRemove }){
  const c = useColors();
  const placedTypes = new Set((stickers||[]).map(s=>s.type));
  const items = [
    ['distance','Distance','ruler'],
    ['pace','Pace','pace'],
    ['time','Time','clock'],
    ['hr','Heart rate','heart'],
    ['elev','Elevation','mountain'],
    ['cal','Calories','flame'],
    ['cadence','Cadence','bolt'],
    ['splits','Splits','sliders'],
    ['hrchart','HR chart','spark'],
    ['pacechart','Pace chart','spark'],
    ['route','Route map','pin'],
    ['date','Date','clock'],
    ['shoe','Shoe','shoe'],
    ['title','Title','pin'],
    ['place','Place','pin'],
  ];
  return (
    <div>
      <div style={{ fontSize:11, color:c.ink3, marginBottom:10 }}>
        Tap to add a sticker. Drag it on the canvas to place.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8 }}>
        {items.map(([type, label, ic])=>{
          const I = Icon[ic];
          const on = placedTypes.has(type);
          return (
            <div key={type} className="tap" onClick={()=>onAdd(type)} style={{
              padding:'10px', borderRadius:10,
              background: on ? c.paper2 : c.paper,
              color: c.ink,
              border: on ? `1px solid ${c.ink}` : `1px solid ${c.line}`,
              display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start',
              position:'relative',
            }}>
              <I width="18" height="18" style={{ color: on ? c.accent : c.ink2 }}/>
              <span style={{ fontSize:12, fontWeight:500 }}>{label}</span>
              {on && <Icon.check width="12" height="12" style={{ position:'absolute', top:8, right:8, color:c.accent }}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Export panel ───────────────────────────────────────────
function ExportPanel({ onExport, stampPos, setStampPos }){
  const c = useColors();
  const positions = [
    { id:'br', label:'BR' },
    { id:'bl', label:'BL' },
    { id:'tr', label:'TR' },
    { id:'tl', label:'TL' },
    { id:'off', label:'Off' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* RunStamp signature */}
      <div style={{
        padding:'12px 14px', border:`1px solid ${c.line}`, borderRadius:12,
        background:c.paper2,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <Eyebrow style={{ color:c.accent }}>RUNSTAMP SIGNATURE</Eyebrow>
            <div style={{ fontSize:12.5, color:c.ink2, marginTop:3, lineHeight:1.35, textWrap:'pretty' }}>
              A small wax-seal mark is added to every export — your run's signature.
            </div>
          </div>
          <div style={{ width:42, height:42, color:c.ink, flexShrink:0, marginLeft:10 }}>
            <svg viewBox="-50 -50 100 100" width="100%" height="100%">
              <circle r="44" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.7"/>
              <circle r="36" fill="none" stroke="currentColor" strokeWidth="2"/>
              <circle cx="0" cy="-1" r="6" fill="currentColor"/>
              {[...Array(8)].map((_, i)=>{
                const a=(i*Math.PI*2)/8;
                return <line key={i} x1={Math.cos(a)*9} y1={Math.sin(a)*9-1} x2={Math.cos(a)*13} y2={Math.sin(a)*13-1} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>;
              })}
            </svg>
          </div>
        </div>
        <Eyebrow style={{ marginBottom:6 }}>POSITION</Eyebrow>
        <div style={{ display:'flex', gap:6 }}>
          {positions.map(p=>(
            <div key={p.id} className="tap" onClick={()=>setStampPos(p.id)} style={{
              flex:1, padding:'8px 0', textAlign:'center',
              borderRadius:8, fontSize:11, fontFamily:'JetBrains Mono', fontWeight:500,
              background: stampPos===p.id ? c.ink : 'transparent',
              color: stampPos===p.id ? c.paper : c.ink2,
              border: `1px solid ${stampPos===p.id ? c.ink : c.line}`,
            }}>{p.label}</div>
          ))}
        </div>
      </div>

      <ExportRow icon={<div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:600 }}>IG</div>} title="Instagram Story" desc="9:16 · direct share" highlight onClick={onExport}/>
      <ExportRow icon={<div style={{ width:32, height:32, borderRadius:8, background:'#25d366', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:600 }}>W</div>} title="WhatsApp" desc="Share to chat" onClick={onExport}/>
      <ExportRow icon={<div style={{ width:32, height:32, borderRadius:8, background:c.ink, color:c.paper, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600 }}>𝕏</div>} title="X / Twitter" desc="Post to feed" onClick={onExport}/>
      <ExportRow icon={<div style={{ width:32, height:32, borderRadius:8, background:c.paper2, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.download width="16" height="16" style={{ color:c.ink2 }}/></div>} title="Save to Photos" desc="PNG · 1080×1920" onClick={onExport}/>
      <ExportRow icon={<div style={{ width:32, height:32, borderRadius:8, background:c.paper2, border:`1px solid ${c.line}`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.layers width="16" height="16" style={{ color:c.ink2 }}/></div>} title="Stat stickers" desc="Each block as transparent PNG" onClick={onExport}/>
    </div>
  );
}

function ExportRow({ icon, title, desc, highlight, onClick }){
  const c = useColors();
  return (
    <div className="tap" onClick={onClick} style={{
      padding:'10px 12px', display:'flex', gap:12, alignItems:'center',
      background: highlight ? c.paper2 : 'transparent',
      border: `1px solid ${highlight ? c.line : c.line2}`,
      borderRadius:12,
    }}>
      {icon}
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:500, color:c.ink }}>{title}</div>
        <div style={{ fontSize:11, color:c.ink3 }}>{desc}</div>
      </div>
      <Icon.chevR width="16" height="16" style={{ color:c.ink3 }}/>
    </div>
  );
}

// ─── Share sheet (post-export) ──────────────────────────────
function ShareSheet({ onClose, run }){
  const c = useColors();
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:30,
      background:'rgba(14,13,11,0.55)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:c.paper, borderRadius:'20px 20px 0 0',
        padding:'24px 20px 36px', width:'100%', maxWidth:402,
        boxShadow:'0 -20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ width:36, height:4, background:c.line, borderRadius:2, margin:'0 auto 18px' }}/>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
          <div style={{ width:56, height:56, borderRadius:28, background:c.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon.check width="32" height="32" style={{ color:'#fff' }}/>
          </div>
        </div>
        <div className="display" style={{ fontSize:22, textAlign:'center', letterSpacing:'-0.01em' }}>
          Stamped & shared.
        </div>
        <div style={{ textAlign:'center', fontSize:13, color:c.ink3, marginTop:4 }}>
          Saved to Photos with your RunStamp signature.
        </div>
        <div style={{ marginTop:18, display:'flex', gap:8 }}>
          <Button kind="ghost" full onClick={onClose}>Edit again</Button>
          <Button kind="primary" full onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EditorScreen, CanvasRender, TPL_RENDERERS, SOLID_COLORS, PHOTOS, STICKER_KINDS });
