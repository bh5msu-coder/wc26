/* WC26 web preview — vanilla render layer */
(function () {
  const W = window.WC;

  // ── icons (subset, stroke = currentColor) ──
  const I = {
    trophy:'<path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 6H4.5a2.5 2.5 0 002.5 2.5M17 6h2.5a2.5 2.5 0 01-2.5 2.5M12 13v3M9 20h6M10 20l.5-4h3l.5 4"/>',
    swap:'<path d="M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8"/>',
    shield:'<path d="M12 3l7 2.5v5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5v-5L12 3z"/><path d="M9 12.2l2 2 4-4.2"/>',
    calendar:'<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    dice:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
    bolt:'<path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" fill="currentColor"/>',
    arrowUp:'<path d="M12 19V5M6 11l6-6 6 6"/>',
    ball:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.5 2.5-1.3 4.1H9.8L8.5 10z" fill="currentColor" stroke="none"/>',
    ko:'<path d="M5 4l6 6M5 10l3-3M3 6l3-2M19 4l-6 6M19 10l-3-3M21 6l-3-2M9.5 12.5L4 18l2 2 5.5-5.5M14.5 12.5L20 18l-2 2-5.5-5.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    check:'<path d="M5 12l5 5L20 6"/>',
    chevron:'<path d="M9 5l7 7-7 7"/>',
    logout:'<path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 12H21M18 9l3 3-3 3"/>',
  };
  const icon = (n, s = 18, c = 'currentColor', sw = 1.8) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="display:block">${I[n] || ''}</svg>`;

  const SCOREI = { goal:'ball', cs:'shield', ko:'ko', champ:'trophy', win:'bolt' };

  // ── helpers ──
  const initials = (name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return parts.map(w=>w[0]).join('').slice(0,2).toUpperCase();
  };
  const av = (p, size = 34, ring = false) =>
    `<div class="avatar" style="width:${size}px;height:${size}px;background:${p.color};font-size:${size*0.36}px;${ring?`box-shadow:0 0 0 2px var(--bg),0 0 0 4px ${p.color}`:''}">${initials(p.name)}</div>`;
  const flag = (code, size = 30) => {
    const n = W.byCode(code); const r = Math.round(size*0.32);
    return `<div class="flagtile" style="width:${size}px;height:${size}px;border-radius:${r}px;font-size:${size*0.62}px"><span class="flag">${n?n.flag:'🏳️'}</span></div>`;
  };
  const TONES = {
    pos:['rgba(52,226,155,.14)','var(--pos)'], accent:['rgba(198,255,58,.14)','var(--accent)'],
    accent2:['rgba(59,134,255,.16)','var(--accent2)'], gold:['rgba(255,200,61,.16)','var(--gold)'],
    live:['rgba(255,92,114,.16)','var(--neg)'], muted:['var(--chip)','var(--dim)'],
  };
  const chip = (inner, tone='muted', extra='') => {
    const [bg,fg]=TONES[tone];
    return `<span class="chip" style="background:${bg};color:${fg};${extra}">${inner}</span>`;
  };
  const livedot = '<span class="livedot"><i class="p"></i><i class="d"></i></span>';
  const pct = (x)=> x>=0.1?Math.round(x*100)+'%':x>=0.01?(x*100).toFixed(1)+'%':'<1%';

  // ── nav ──
  const NAV = [
    {k:'table',label:'Table',icon:'trophy'},
    {k:'draft',label:'Draft',icon:'swap'},
    {k:'squad',label:'Squad',icon:'shield'},
    {k:'fixtures',label:'Fixtures',icon:'calendar'},
    {k:'predictions',label:'Predictions',icon:'dice'},
    {k:'scoring',label:'Scoring',icon:'info'},
  ];
  let tab = 'table';
  const me = W.players.find(p=>p.isYou);

  // ── screens ──
  const screens = {};

  screens.table = () => {
    const st = W.standings(); const m = st.find(s=>s.player.isYou);
    const live = W.fixtures.find(f=>f.status==='live'); const leader = st[0].total;
    const ahead = m.rank===1; const margin = ahead ? m.total-(st[1]?st[1].total:0) : leader-m.total;
    const liveScore = live ? `${W.byCode(live.home).flag} ${live.hs}–${live.as} ${W.byCode(live.away).flag}` : '';
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <div><div class="eyebrow">The Table</div><div class="display h1">${'The Lads'}</div></div>
      ${chip(livedot+' Quarter-finals','live','padding:6px 11px;font-size:12px')}
    </div>
    <div class="grid2 lead">
      <div style="display:flex;flex-direction:column;gap:24px">
        <div style="position:relative;overflow:hidden;border-radius:24px;padding:20px;background:linear-gradient(155deg,#18263b,#111824 70%);border:1px solid var(--lineStrong);box-shadow:0 18px 40px rgba(0,0,0,.35)">
          <div style="position:absolute;top:-60px;right:-40px;width:200px;height:200px;border-radius:999px;background:var(--accent);opacity:.16;filter:blur(34px)"></div>
          <div style="position:relative;display:flex;align-items:center;gap:8px;margin-bottom:16px">
            ${ahead?chip(icon('trophy',12)+' 1ST PLACE','accent'):chip('RANK '+m.rank,'muted')}
            ${chip(icon('arrowUp',11)+' +'+m.today+' today','pos')}
            <div style="margin-left:auto;font-size:12px;font-weight:600;color:var(--dim)">${m.alive} alive</div>
          </div>
          <div style="position:relative;display:flex;align-items:flex-end;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">${av(m.player,48)}
              <div><div style="font-size:13px;font-weight:600;color:var(--dim)">Your total</div><div style="font-size:18px;font-weight:800">${m.player.name}</div></div></div>
            <div style="text-align:right"><div class="display" style="font-size:64px">${m.total}</div>
              <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin-top:3px">points</div></div>
          </div>
          <div style="position:relative;display:flex;align-items:center;gap:8px;margin-top:16px;padding-top:13px;border-top:1px solid var(--line)">
            <div style="font-size:12.5px;font-weight:600;color:var(--dim)">${ahead?`<span style="color:var(--accent);font-weight:800">+${margin}</span> clear at the top`:`<span style="color:var(--accent);font-weight:800">${margin}</span> off the lead`}</div>
            <div style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:5px 11px;background:var(--chip);border:1px solid var(--line)">${livedot}<span style="font-size:12px;font-weight:700">${liveScore}</span></div>
          </div>
        </div>
        <div><div class="seclabel">Standings</div>
          <div class="card" style="padding:5px;display:flex;flex-direction:column;gap:2px">
            ${st.map(r=>{const you=r.player.isYou; const gap=leader-r.total; return `
              <div style="display:flex;align-items:center;gap:12px;padding:11px 13px;border-radius:12px;${you?'background:rgba(198,255,58,.08);border:1px solid rgba(198,255,58,.28)':'border:1px solid transparent'}">
                <div class="display" style="width:24px;text-align:center;font-size:20px;color:${r.rank===1?'var(--accent)':'var(--faint)'}">${r.rank}</div>
                ${av(r.player,36)}
                <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px;font-weight:700">${r.player.name}</span>
                  ${r.alive>0?`<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:var(--dim)"><span style="width:6px;height:6px;border-radius:99px;background:var(--pos)"></span>${r.alive} alive</span>`:''}</div>
                  <div style="font-size:11.5px;color:var(--faint);margin-top:2px">${r.rank===1?'Leads the pool':gap+' behind'} · +${r.today} today</div></div>
                <div class="display" style="font-size:26px">${r.total}</div>
              </div>`;}).join('')}
          </div>
        </div>
      </div>
      <div><div class="seclabel">Latest scoring</div>
        <div class="card" style="padding:4px 14px">
          ${W.feed.map(ev=>{const n=W.byCode(ev.code); const p=W.players.find(x=>x.id===ev.who);
            const tone=ev.icon==='ko'?'var(--accent2)':ev.icon==='cs'?'var(--pos)':'var(--accent)';
            return `<div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding:10px 0">
              <div style="position:relative">${flag(ev.code,36)}<div style="position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border-radius:99px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:${tone}">${icon(SCOREI[ev.icon],11,tone)}</div></div>
              <div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.text}</div><div style="font-size:11.5px;color:var(--faint);margin-top:2px">${ev.detail} · ${ev.t}</div></div>
              <div style="display:flex;align-items:center;gap:8px"><span class="display" style="font-size:18px;color:var(--pos)">${ev.pts}</span>${av(p,22)}</div>
            </div>`;}).join('')}
          <div style="height:2px"></div>
        </div>
      </div>
    </div>`;
  };

  screens.squad = () => {
    const st = W.standings();
    return `<div style="margin-bottom:24px"><div class="eyebrow">Six nations each</div><div class="display h1">Squads</div></div>
    <div style="display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      ${st.map(row=>{const roster=W.rosterOf(row.player.id); const you=row.player.isYou;
        return `<div class="card" style="padding:14px 16px;${you?'border:1px solid rgba(198,255,58,.3)':''}">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">${av(row.player,40)}
            <div style="flex:1"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px;font-weight:800">${row.player.name}</span>${you?chip('YOU','accent','font-size:10px;padding:2px 7px'):''}</div>
              <div style="font-size:11.5px;color:var(--faint)">${row.alive} alive · ${roster.length} drafted</div></div>
            <div class="display" style="font-size:30px">${row.total}</div></div>
          ${roster.map(n=>{const bits=[];if(n.W||n.D)bits.push(n.W+'W '+n.D+'D');if(n.GF)bits.push(n.GF+' G');if(n.CS)bits.push(n.CS+' CS');if(n.KOW)bits.push(n.KOW+' KO');
            return `<div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding:11px 0">${flag(n.code,38)}
              <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:14.5px;font-weight:700">${n.name}</span>${n.alive?chip('ALIVE','pos','font-size:10px;padding:2px 7px'):chip('OUT · '+n.round,'muted','font-size:10px;padding:2px 7px')}</div>
              <div style="font-size:11.5px;color:var(--faint);margin-top:2px">Group ${n.group} · ${bits.join(' · ')||'No points yet'}</div></div>
              <div class="display" style="font-size:24px">${W.points(n)}</div></div>`;}).join('')}
        </div>`;}).join('')}
    </div>`;
  };

  screens.fixtures = () => {
    const stages = [...new Set(W.fixtures.map(f=>f.stage))];
    const side=(code,dim)=>`<div style="display:flex;align-items:center;gap:10px;${dim?'opacity:.5':''}">${flag(code,30)}<span style="font-size:14px;font-weight:700">${code}</span>${W.byCode(code)&&W.byCode(code).ownerId?'<span style="width:6px;height:6px;border-radius:99px;background:var(--accent)"></span>':''}</div>`;
    return `<div style="margin-bottom:24px"><div class="eyebrow">Knockouts</div><div class="display h1">Fixtures</div></div>
    <div style="display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      ${stages.map(stage=>`<div><div class="seclabel">${stage}</div><div class="card" style="padding:2px 16px">
        ${W.fixtures.filter(f=>f.stage===stage).map(f=>{const has=f.hs!=null;const hw=has&&f.hs>f.as,aw=has&&f.as>f.hs;
          return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding:14px 0">
            <div style="display:flex;flex-direction:column;gap:10px">${side(f.home,f.status==='final'&&!hw)}${side(f.away,f.status==='final'&&!aw)}</div>
            <div style="display:flex;align-items:center;gap:16px">
              ${has?`<div class="display" style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;font-size:18px"><span style="${!hw?'opacity:.5':''}">${f.hs}</span><span style="${!aw?'opacity:.5':''}">${f.as}</span></div>`:''}
              <div style="width:120px;text-align:right">${f.status==='live'?chip(livedot+' '+f.minute,'live','font-size:11px'):f.status==='upcoming'?`<div style="font-size:11.5px;font-weight:600;color:var(--dim)">${f.when}</div>`:chip('FT','muted','font-size:11px')}
                ${f.venue?`<div style="font-size:10.5px;color:var(--faint);margin-top:4px">${f.venue}</div>`:''}</div>
            </div></div>`;}).join('')}
      </div></div>`).join('')}
    </div>
    <p style="font-size:12px;color:var(--faint);margin-top:16px">A green dot marks a nation drafted in <strong style="color:var(--dim)">The Lads</strong>.</p>`;
  };

  screens.draft = () => {
    const cols = W.draftOrderR1;
    const byRound={},counts={};
    W.draftPicks.forEach(([pid,code])=>{counts[pid]=counts[pid]||0;byRound[pid]=byRound[pid]||{};byRound[pid][counts[pid]]=code;counts[pid]++;});
    const head=cols.map(pid=>{const p=W.players.find(x=>x.id===pid);return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">${av(p,26)}<span style="font-size:9.5px;font-weight:700;color:${p.isYou?'var(--accent)':'var(--faint)'}">${p.name}</span></div>`;}).join('');
    const rows=[0,1,2,3,4,5].map(r=>`<div style="display:grid;grid-template-columns:repeat(${cols.length},1fr);gap:6px;margin-bottom:6px">${cols.map(pid=>{const code=byRound[pid][r];const n=W.byCode(code);const p=W.players.find(x=>x.id===pid);
      return `<div style="position:relative;border-radius:12px;padding:8px 2px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;${p.isYou?'background:rgba(198,255,58,.09);border:1px solid rgba(198,255,58,.25)':'background:var(--surface);border:1px solid var(--line)'}">
        <span style="position:absolute;left:4px;top:2px;font-size:8px;font-weight:700;color:var(--faint)">${n.pickNumber}</span><span class="flag" style="font-size:18px">${n.flag}</span><span style="font-size:8.5px;font-weight:800">${code}</span></div>`;}).join('')}</div>`).join('');
    return `<div style="display:flex;align-items:end;justify-content:space-between;margin-bottom:20px">
      <div><div class="eyebrow">Custom draft · 6 rounds</div><div class="display h1">The Draft</div></div>
      <button style="display:inline-flex;align-items:center;gap:6px;border:none;border-radius:999px;padding:9px 14px;background:var(--accent);color:var(--accentInk);font-weight:800;font-size:12.5px">${icon('bolt',14,'var(--accentInk)')} Mock draft</button>
    </div>
    <div class="card" style="padding:14px;max-width:880px">
      <div style="display:grid;grid-template-columns:repeat(${cols.length},1fr);gap:6px;margin-bottom:8px">${head}</div>
      ${rows}
      <div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-top:8px">${icon('swap',13,'var(--faint)')}<span style="font-size:11px;color:var(--faint)">Custom order · 6 rounds · 48 picks</span></div>
    </div>
    <p style="font-size:12px;color:var(--faint);margin-top:14px">The live app adds an interactive mock-draft simulator on this screen.</p>`;
  };

  screens.scoring = () => {
    const rules=[
      ['bolt','var(--accent2)','Match win','Every match — groups & knockouts','+3'],
      ['ball','var(--accent)','Goal scored','For each goal your nation scores','+1'],
      ['shield','var(--pos)','Clean sheet','Each match without conceding','+1'],
      ['ko','var(--gold)','Knockout bonus','On top of the win, every KO round','+1'],
      ['trophy','#B073FF','Champion bonus','One-off if your nation lifts the cup','+1'],
    ];
    return `<div style="margin-bottom:18px"><div class="eyebrow">The rules</div><div class="display h1">Scoring</div></div>
    <p style="max-width:640px;font-size:13.5px;line-height:1.55;color:var(--dim);margin:0 0 20px">You draft 4 nations. Every match they play earns points all the way to the final. As commissioner, you can tune any value — the table, squads and predictions all update instantly.</p>
    <div class="card" style="padding:6px 18px 12px;max-width:640px">
      ${rules.map(r=>`<div style="display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--line);padding:14px 0">
        <div style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,${r[1]} 16%,transparent);color:${r[1]}">${icon(r[0],20,r[1])}</div>
        <div style="flex:1"><div style="font-size:14.5px;font-weight:700">${r[2]}</div><div style="font-size:11.5px;color:var(--faint);margin-top:2px">${r[3]}</div></div>
        <div style="display:flex;align-items:center;gap:8px"><button style="width:32px;height:32px;border-radius:99px;background:var(--surface2);border:1px solid var(--line);color:var(--text);display:flex;align-items:center;justify-content:center">${icon('plus',13,'var(--text)',2.4)}</button><span class="display" style="width:36px;text-align:center;font-size:24px">${r[4]}</span></div></div>`).join('')}
      <div style="display:flex;align-items:center;gap:10px;border-radius:12px;padding:12px 14px;background:var(--surface2);border:1px solid var(--line);margin-top:12px">${icon('info',16,'var(--dim)')}<span style="font-size:12px;color:var(--dim)">A draw always scores +1. Highest total when the final whistle blows in New York/New Jersey wins the pool.</span></div>
    </div>
    <div style="margin-top:20px"><button style="display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;padding:12px 20px;background:var(--accent);color:var(--accentInk);font-weight:800;font-size:14px">${icon('check',16,'var(--accentInk)')} Save scoring</button></div>`;
  };

  // ── predictions (live sim) ──
  let predRuns = 10000, predScale = 40;
  function renderPred() {
    const res = W.simulate(predRuns, predScale);
    const byId = Object.fromEntries(W.players.map(p=>[p.id,p]));
    const ranked = [...res.managers].sort((a,b)=>b.winProb-a.winProb);
    const maxWin = ranked[0].winProb||1;
    const fav = ranked[0];
    const champ = [...res.nations].sort((a,b)=>b.champProb-a.champProb);
    const top = champ[0];
    const bar=(p,color,h=8)=>`<div class="bar" style="height:${h}px"><span style="width:${Math.max(1.5,p*100)}%;background:${color}"></span></div>`;

    document.getElementById('pred-fav').innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Pool favourite</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:12px">${av(byId[fav.id],42)}
        <div style="flex:1"><div style="font-size:17px;font-weight:800">${byId[fav.id].name}</div><div style="font-size:12px;color:var(--dim)">to win “the pool”</div></div>
        <div class="display" style="font-size:34px;color:var(--accent)">${pct(fav.winProb)}</div></div>`;
    document.getElementById('pred-champ').innerHTML = `
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Most likely champion</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:12px">${flag(top.code,42)}
        <div style="flex:1"><div style="font-size:17px;font-weight:800">${W.byCode(top.code).name}</div><div style="font-size:12px;color:var(--dim)">lifts the cup most often</div></div>
        <div class="display" style="font-size:34px;color:var(--gold)">${pct(top.champProb)}</div></div>`;

    document.getElementById('pred-odds').innerHTML = ranked.map(r=>{const m=byId[r.id];return `
      <div style="border-bottom:1px solid var(--line);padding:12px 0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${av(m,28)}<span style="font-size:14px;font-weight:700">${m.name}</span>${m.isYou?chip('YOU','accent','font-size:10px;padding:2px 7px'):''}<span class="display" style="margin-left:auto;font-size:20px">${pct(r.winProb)}</span></div>
        ${bar(r.winProb/maxWin, m.isYou?'var(--accent)':'var(--accent2)')}
        <div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:var(--faint);margin-top:6px"><span>Proj. <strong style="color:var(--dim)">${Math.round(r.expectedPoints)}</strong> pts (now ${r.base})</span><span>Range ${r.p10}–${r.p90} · <span style="color:var(--pos)">+${r.expectedAdded.toFixed(1)} exp</span></span></div>
      </div>`;}).join('');

    document.getElementById('pred-road').innerHTML = champ.map(n=>{const nat=W.byCode(n.code);const owner=nat.ownerId?byId[nat.ownerId]:null;return `
      <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding:10px 0">${flag(n.code,30)}
        <div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;font-weight:700">${nat.name}</span>${owner?`<span style="width:6px;height:6px;border-radius:99px;background:${owner.color}" title="${owner.name}"></span>`:''}</div>
          <div style="margin-top:4px">${bar(n.finalProb,'var(--accent2)',5)}</div></div>
        <div style="width:44px;text-align:right;font-size:12px;font-weight:700;color:var(--dim)">${pct(n.finalProb)}</div>
        <div class="display" style="width:44px;text-align:right;font-size:16px;color:var(--gold)">${pct(n.champProb)}</div></div>`;}).join('');
  }

  screens.predictions = () => `
    <div style="display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:12px;margin-bottom:24px">
      <div><div class="eyebrow">Monte Carlo · from the quarter-finals</div><div class="display h1">Predictions</div></div>
      <div style="display:flex;align-items:center;gap:8px">${chip(icon('dice',13)+' <span id="pred-count"></span> simulations','muted')}
        <button id="pred-rerun" style="display:inline-flex;align-items:center;gap:6px;border:none;border-radius:999px;padding:8px 14px;background:var(--accent);color:var(--accentInk);font-weight:800;font-size:12.5px">${icon('swap',14,'var(--accentInk)')} Re-run</button></div>
    </div>
    <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-bottom:24px">
      <div class="card" id="pred-fav" style="padding:16px 18px"></div>
      <div class="card" id="pred-champ" style="padding:16px 18px"></div>
    </div>
    <div class="grid2 pred">
      <div><div class="seclabel">Title odds</div><div class="card" id="pred-odds" style="padding:6px 16px 10px"></div></div>
      <div style="display:flex;flex-direction:column;gap:24px">
        <div><div class="seclabel" style="display:flex;justify-content:space-between"><span>Road to the final</span><span style="font-size:10.5px;color:var(--faint)">Final · Cup</span></div><div class="card" id="pred-road" style="padding:6px 16px 8px"></div></div>
        <div class="card" style="padding:16px 18px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)">Simulation settings</div>
          <div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:600;color:var(--dim)">Runs</span>
            <div class="seg" id="pred-runs">${[2000,10000,50000].map(r=>`<button data-r="${r}" class="${r===predRuns?'on':''}">${r/1000}k</button>`).join('')}</div></div>
          <div style="margin-top:16px"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;font-weight:600;color:var(--dim)">Upset factor</span><span id="pred-scaleLabel" style="font-size:12px;font-weight:700;color:var(--accent)"></span></div>
            <input type="range" id="pred-slider" min="20" max="70" step="2" value="${predScale}"/>
            <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);margin-top:4px"><span>More upsets</span><span>Form holds</span></div></div>
          <p style="font-size:11.5px;line-height:1.5;color:var(--faint);margin:16px 0 0">Each run plays out the live bracket with a Poisson goal model weighted by team strength, then scores every owned nation with this pool’s rules.</p>
        </div>
      </div>
    </div>`;

  function wirePred() {
    const label=()=>document.getElementById('pred-scaleLabel').textContent = predScale<=28?'Chaos':predScale>=56?'Chalk':'Balanced';
    document.getElementById('pred-count').textContent = predRuns.toLocaleString();
    label(); renderPred();
    document.getElementById('pred-rerun').onclick = ()=>renderPred();
    document.getElementById('pred-runs').onclick = (e)=>{const b=e.target.closest('button');if(!b)return;predRuns=+b.dataset.r;
      [...e.currentTarget.children].forEach(c=>c.classList.toggle('on',+c.dataset.r===predRuns));
      document.getElementById('pred-count').textContent=predRuns.toLocaleString();renderPred();};
    const sl=document.getElementById('pred-slider');
    sl.oninput=()=>{predScale=+sl.value;label();};
    sl.onchange=()=>{predScale=+sl.value;label();renderPred();};
  }

  // ── shell + router ──
  function navHTML(mobile) {
    return NAV.map(it=>`<a class="navlink ${it.k===tab?'active':''}" data-tab="${it.k}">${icon(it.icon, mobile?21:19, it.k===tab?'var(--accent)':'var(--faint)', it.k===tab?2.1:1.7)}<span ${mobile?`style="color:${it.k===tab?'var(--text)':'var(--faint)'}"`:''}>${it.label}</span></a>`).join('');
  }

  function render() {
    const root = document.getElementById('root');
    root.innerHTML = `
    <div class="app">
      <aside class="side">
        <div>
          <div class="brand"><div class="logo">${icon('trophy',20,'var(--accentInk)')}</div><div class="display" style="font-size:22px">WC26</div></div>
          <div style="padding:0 8px 2px;font-size:10px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--faint)">Quarter-finals</div>
          <div class="display" style="padding:0 8px 20px;font-size:20px">The Lads</div>
          <nav style="display:flex;flex-direction:column;gap:4px" id="side-nav">${navHTML(false)}</nav>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;border-radius:14px;padding:12px;background:var(--surface);border:1px solid var(--line)">
          <div style="display:flex;align-items:center;gap:10px">${av(me,32)}<div style="font-size:13px;font-weight:700">${me.name}</div></div>
          ${icon('logout',18,'var(--dim)')}
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div><div style="font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--faint)">Quarter-finals</div><div class="display" style="font-size:20px">The Lads</div></div>
          ${av(me,32)}
        </header>
        <div class="wrap" id="screen"></div>
        <nav class="tabbar" id="tab-nav">${navHTML(true)}</nav>
      </div>
    </div>`;
    document.getElementById('screen').innerHTML = screens[tab]();
    if (tab==='predictions') wirePred();
    root.querySelectorAll('[data-tab]').forEach(a=>a.onclick=()=>{tab=a.dataset.tab;render();window.scrollTo(0,0);});
  }

  render();
})();
