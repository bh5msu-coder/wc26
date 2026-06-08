/* WC26 web preview — data, scoring + Monte Carlo (ported from the Next.js app) */
(function () {
  const WC = {};

  WC.weights = { win: 3, draw: 1, goal: 1, cs: 1, ko: 1, champ: 1 };

  WC.players = [
    { id: "bard", name: "Bard", color: "#C6FF3A" },
    { id: "goalie", name: "Goalie", color: "#2E7CF6" },
    { id: "andy", name: "Andy", color: "#FF8A3D" },
    { id: "brain", name: "Brain", color: "#34E29B" },
    { id: "jarn", name: "Jarn", color: "#E45CFF" },
    { id: "tom", name: "Tom", color: "#FFC83D", isYou: true },
    { id: "zd", name: "ZD", color: "#7C3AED" },
    { id: "stove", name: "Stove", color: "#FF5C72" },
  ];

  // owner, code, name, flag, group, W,D,L, GF, CS, KOW, round, alive, strength
  const D = [
    ["you","ARG","Argentina","🇦🇷","C",4,1,0,12,3,2,"QF",1,90],
    ["you","MAR","Morocco","🇲🇦","F",3,2,0,7,3,2,"QF",1,78],
    ["you","COL","Colombia","🇨🇴","G",3,1,1,7,2,1,"R16",0,72],
    ["you","CAN","Canada","🇨🇦","A",1,1,1,3,1,0,"Group",0,58],
    ["tom","POR","Portugal","🇵🇹","H",4,1,0,12,2,2,"QF",1,86],
    ["tom","NED","Netherlands","🇳🇱","E",3,2,0,9,2,2,"QF",1,83],
    ["tom","SUI","Switzerland","🇨🇭","B",1,2,1,4,1,0,"R32",0,64],
    ["tom","DEN","Denmark","🇩🇰","J",1,0,2,3,1,0,"Group",0,62],
    ["marcus","FRA","France","🇫🇷","D",4,0,1,11,2,2,"QF",1,89],
    ["marcus","URU","Uruguay","🇺🇾","K",2,2,1,6,1,1,"R16",0,74],
    ["marcus","JPN","Japan","🇯🇵","I",3,0,2,8,1,1,"R16",0,70],
    ["marcus","SRB","Serbia","🇷🇸","L",1,0,2,3,0,0,"Group",0,60],
    ["diego","BRA","Brazil","🇧🇷","G",3,2,0,10,2,2,"QF",1,91],
    ["diego","BEL","Belgium","🇧🇪","E",3,1,1,9,1,1,"R16",0,75],
    ["diego","MEX","Mexico","🇲🇽","A",2,1,1,5,2,0,"R32",0,66],
    ["diego","ECU","Ecuador","🇪🇨","A",1,1,1,2,2,0,"Group",0,61],
    ["priya","ESP","Spain","🇪🇸","B",4,1,0,13,2,2,"QF",1,92],
    ["priya","CRO","Croatia","🇭🇷","K",2,3,0,6,2,1,"R16",0,73],
    ["priya","USA","USA","🇺🇸","D",2,1,1,6,1,0,"R32",0,67],
    ["priya","AUS","Australia","🇦🇺","B",0,2,1,2,1,0,"Group",0,57],
    ["jamie","ENG","England","🏴󠁧󠁢󠁥󠁮󠁧󠁿","F",3,1,1,8,3,2,"QF",1,87],
    ["jamie","GER","Germany","🇩🇪","H",3,1,1,10,2,1,"R16",0,80],
    ["jamie","SEN","Senegal","🇸🇳","I",2,0,2,5,1,0,"R32",0,68],
    ["jamie","KOR","South Korea","🇰🇷","J",0,1,2,2,0,0,"Group",0,59],
    // free agents — now all drafted; no record yet (out at group / not in KO)
    ["","ITA","Italy","🇮🇹","L",0,0,0,0,0,0,"Group",0,58],
    ["","NOR","Norway","🇳🇴","E",0,0,0,0,0,0,"Group",0,54],
    ["","NGA","Nigeria","🇳🇬","G",0,0,0,0,0,0,"Group",0,44],
    ["","EGY","Egypt","🇪🇬","F",0,0,0,0,0,0,"Group",0,42],
    ["","CIV","Ivory Coast","🇨🇮","K",0,0,0,0,0,0,"Group",0,40],
    ["","AUT","Austria","🇦🇹","C",0,0,0,0,0,0,"Group",0,38],
    ["","TUR","Türkiye","🇹🇷","E",0,0,0,0,0,0,"Group",0,37],
    ["","GHA","Ghana","🇬🇭","D",0,0,0,0,0,0,"Group",0,35],
    ["","POL","Poland","🇵🇱","H",0,0,0,0,0,0,"Group",0,33],
    ["","SCO","Scotland","🏴󠁧󠁢󠁳󠁣󠁴󠁿","G",0,0,0,0,0,0,"Group",0,33],
    ["","TUN","Tunisia","🇹🇳","J",0,0,0,0,0,0,"Group",0,31],
    ["","ALG","Algeria","🇩🇿","I",0,0,0,0,0,0,"Group",0,30],
    ["","CMR","Cameroon","🇨🇲","B",0,0,0,0,0,0,"Group",0,30],
    ["","PAR","Paraguay","🇵🇾","D",0,0,0,0,0,0,"Group",0,30],
    ["","IRN","Iran","🇮🇷","A",0,0,0,0,0,0,"Group",0,28],
    ["","CRC","Costa Rica","🇨🇷","C",0,0,0,0,0,0,"Group",0,24],
    ["","JAM","Jamaica","🇯🇲","F",0,0,0,0,0,0,"Group",0,23],
    ["","KSA","Saudi Arabia","🇸🇦","H",0,0,0,0,0,0,"Group",0,22],
    ["","QAT","Qatar","🇶🇦","L",0,0,0,0,0,0,"Group",0,20],
    ["","PAN","Panama","🇵🇦","I",0,0,0,0,0,0,"Group",0,18],
    ["","UZB","Uzbekistan","🇺🇿","B",0,0,0,0,0,0,"Group",0,18],
    ["","NZL","New Zealand","🇳🇿","K",0,0,0,0,0,0,"Group",0,17],
    ["","CPV","Cape Verde","🇨🇻","J",0,0,0,0,0,0,"Group",0,16],
    ["","JOR","Jordan","🇯🇴","L",0,0,0,0,0,0,"Group",0,16],
  ];

  WC.nations = D.map((d, i) => ({
    ownerId: d[0], code: d[1], name: d[2], flag: d[3], group: d[4],
    W: d[5], D: d[6], L: d[7], GF: d[8], CS: d[9], KOW: d[10],
    round: d[11], alive: !!d[12], strength: d[13], champion: false,
    pickNumber: 0, round_drafted: 0,
  }));

  // ── draft order: 8 managers × 6 rounds = 48 picks (in overall pick order) ──
  // Best available by strength assigned to each successive pick, so the live
  // quarter-finalists land with the early picks.
  WC.draftPicks = [
    ["bard","ESP"],["goalie","BRA"],["andy","ARG"],["brain","FRA"],["jarn","ENG"],["tom","POR"],["zd","NED"],["stove","GER"],
    ["zd","MAR"],["tom","BEL"],["jarn","URU"],["brain","CRO"],["andy","COL"],["goalie","JPN"],["bard","SEN"],["stove","USA"],
    ["stove","MEX"],["stove","SUI"],["zd","DEN"],["tom","ECU"],["jarn","SRB"],["brain","KOR"],["andy","CAN"],["goalie","ITA"],
    ["bard","AUS"],["stove","NOR"],["zd","NGA"],["tom","EGY"],["jarn","CIV"],["stove","AUT"],["brain","TUR"],["zd","GHA"],
    ["andy","POL"],["goalie","SCO"],["bard","TUN"],["zd","ALG"],["tom","CMR"],["tom","PAR"],["jarn","IRN"],["jarn","CRC"],
    ["brain","JAM"],["brain","KSA"],["andy","QAT"],["goalie","PAN"],["andy","UZB"],["bard","NZL"],["goalie","CPV"],["bard","JOR"],
  ];
  WC.draftPicks.forEach(([owner, code], i) => {
    const n = WC.nations.find((x) => x.code === code);
    if (n) { n.ownerId = owner; n.pickNumber = i + 1; }
  });
  WC.draftOrderR1 = ["bard","goalie","andy","brain","jarn","tom","zd","stove"];

  WC.deltas = { andy: 16, zd: 13, bard: 11, tom: 9, brain: 8, jarn: 8, goalie: 7, stove: 3 };

  WC.fixtures = [
    { id:"qf1", stage:"Quarter-final", status:"live", minute:"62'", home:"ARG", away:"NED", hs:1, as:1, venue:"MetLife Stadium" },
    { id:"qf2", stage:"Quarter-final", status:"upcoming", home:"ESP", away:"BRA", when:"Today · 8:00 PM", venue:"AT&T Stadium" },
    { id:"qf3", stage:"Quarter-final", status:"upcoming", home:"FRA", away:"ENG", when:"Tomorrow · 4:00 PM", venue:"SoFi Stadium" },
    { id:"qf4", stage:"Quarter-final", status:"upcoming", home:"POR", away:"MAR", when:"Tomorrow · 8:00 PM", venue:"Estadio Azteca" },
    { id:"r16a", stage:"Round of 16", status:"final", home:"ARG", away:"GER", hs:2, as:1, when:"Sun" },
    { id:"r16b", stage:"Round of 16", status:"final", home:"ESP", away:"URU", hs:3, as:0, when:"Sun" },
    { id:"r16c", stage:"Round of 16", status:"final", home:"MAR", away:"BEL", hs:1, as:0, when:"Sat" },
    { id:"r16d", stage:"Round of 16", status:"final", home:"POR", away:"JPN", hs:2, as:0, when:"Sat" },
  ];

  WC.feed = [
    { t:"now", code:"ARG", icon:"goal", text:"Álvarez fires Argentina ahead", pts:"+2", who:"andy", detail:"Goal + clean-sheet watch" },
    { t:"11m", code:"NED", icon:"goal", text:"Gakpo levels for the Dutch", pts:"+1", who:"zd", detail:"Goal scored" },
    { t:"2h", code:"POR", icon:"ko", text:"Portugal book quarter-final spot", pts:"+6", who:"tom", detail:"KO win +3, +1 KO bonus, +2 goals" },
    { t:"Sun", code:"ARG", icon:"ko", text:"Argentina edge Germany in R16", pts:"+6", who:"andy", detail:"KO win +3, +1 KO bonus, +2 goals" },
    { t:"Sun", code:"ESP", icon:"cs", text:"Spain shut out Uruguay 3–0", pts:"+7", who:"bard", detail:"KO win +4, +3 goals, +1 CS" },
    { t:"Sat", code:"MAR", icon:"cs", text:"Morocco grind a 1–0 clean sheet", pts:"+5", who:"zd", detail:"KO win +4, +1 CS" },
  ];

  WC.bracket = {
    quarterfinals: [
      { home:"ARG", away:"NED" }, { home:"ESP", away:"BRA" },
      { home:"FRA", away:"ENG" }, { home:"POR", away:"MAR" },
    ],
    semifinals: [ { fromHome:0, fromAway:1 }, { fromHome:2, fromAway:3 } ],
    final: { fromHome:0, fromAway:1 },
  };

  // ── scoring ──
  WC.byCode = (c) => WC.nations.find((n) => n.code === c);
  WC.points = (n) => {
    const w = WC.weights;
    return w.win*n.W + w.draw*n.D + w.goal*n.GF + w.cs*n.CS + w.ko*n.KOW + (n.champion ? w.champ : 0);
  };
  WC.rosterOf = (id) => WC.nations.filter((n) => n.ownerId === id).sort((a,b)=>WC.points(b)-WC.points(a));
  WC.totalOf = (id) => WC.rosterOf(id).reduce((s,n)=>s+WC.points(n),0);
  WC.aliveOf = (id) => WC.rosterOf(id).filter((n)=>n.alive).length;
  WC.standings = () => WC.players.map((p)=>({
      player:p, total:WC.totalOf(p.id), alive:WC.aliveOf(p.id), today:WC.deltas[p.id]||0,
    })).sort((a,b)=> b.total!==a.total ? b.total-a.total : b.alive-a.alive)
      .map((r,i)=>Object.assign(r,{rank:i+1}));

  // ── Monte Carlo (mirrors lib/simulate.ts) ──
  function poisson(l){ const L=Math.exp(-l); let k=0,p=1; do{k++;p*=Math.random();}while(p>L); return k-1; }
  const sig=(x)=>1/(1+Math.exp(-x));
  function match(h,a,scale){
    const sh=WC.byCode(h).strength, sa=WC.byCode(a).strength, diff=sh-sa, base=1.35;
    let gh=poisson(base*Math.exp(diff/scale/2)), ga=poisson(base*Math.exp(-diff/scale/2));
    if(gh===ga){ return Math.random()<sig(diff/(scale*.7)) ? {win:h,los:a,gh,ga,tie:true} : {win:a,los:h,gh,ga,tie:true}; }
    return gh>ga ? {win:h,los:a,gh,ga,tie:false} : {win:a,los:h,gh,ga,tie:false};
  }
  WC.simulate = function(runs, scale){
    const w=WC.weights, ids=WC.players.map(p=>p.id);
    const base={}, added={}, wins={}, finals={};
    ids.forEach(id=>{ base[id]=WC.totalOf(id); added[id]=0; wins[id]=0; finals[id]=[]; });
    const codes={}; WC.bracket.quarterfinals.forEach(m=>{codes[m.home]=1;codes[m.away]=1;});
    const sf={},fin={},champ={}; Object.keys(codes).forEach(c=>{sf[c]=0;fin[c]=0;champ[c]=0;});
    const own=(c)=>{ const n=WC.byCode(c); return n&&n.ownerId; };

    for(let r=0;r<runs;r++){
      const ra={};
      const score=(o)=>{
        const wG=o.tie?o.gh:Math.max(o.gh,o.ga), lG=o.tie?o.ga:Math.min(o.gh,o.ga);
        const add=(code,gf,conc,won)=>{ const o2=own(code); if(!o2)return; let p=0; if(won)p+=w.win+w.ko; p+=w.goal*gf; if(conc===0)p+=w.cs; ra[o2]=(ra[o2]||0)+p; };
        add(o.win,wG,lG,true); add(o.los,lG,wG,false);
      };
      const qw=[]; WC.bracket.quarterfinals.forEach(m=>{const o=match(m.home,m.away,scale);score(o);qw.push(o.win);});
      qw.forEach(c=>sf[c]++);
      const sw=[]; WC.bracket.semifinals.forEach(s=>{const o=match(qw[s.fromHome],qw[s.fromAway],scale);score(o);sw.push(o.win);});
      sw.forEach(c=>fin[c]++);
      const fo=match(sw[WC.bracket.final.fromHome],sw[WC.bracket.final.fromAway],scale); score(fo);
      const co=own(fo.win); if(co) ra[co]=(ra[co]||0)+w.champ; champ[fo.win]++;

      let best=-Infinity; const tot=ids.map(id=>{const t=base[id]+(ra[id]||0); added[id]+=ra[id]||0; finals[id].push(t); if(t>best)best=t; return {id,t};});
      const top=tot.filter(x=>x.t===best); top.forEach(x=>wins[x.id]+=1/top.length);
    }
    const pct=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.max(0,Math.round(p/100*(s.length-1))))];};
    const managers=WC.players.map(p=>({ id:p.id, winProb:wins[p.id]/runs, expectedPoints:base[p.id]+added[p.id]/runs,
      expectedAdded:added[p.id]/runs, base:base[p.id], p10:pct(finals[p.id],10), p90:pct(finals[p.id],90) }));
    const nations=Object.keys(codes).map(c=>({ code:c, sfProb:sf[c]/runs, finalProb:fin[c]/runs, champProb:champ[c]/runs }));
    return { runs, managers, nations };
  };

  window.WC = WC;
})();
