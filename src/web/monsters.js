// ===================== Monster log =====================
// A hunter's guide per monster: weak spots, what works, hitzones, drops and your own record.
// All notes are written by the app from the numbers (hitzones and weakness data from MHDB).
let MB_WT="long-sword", MB_OPT={owned:false,hunted:false,resist:true,artian:true}, MB_LAST=null, MB_BUILDS=[];
// What each monster hits you with (elements and ailments). Hand-checked; unknown ones are left out.
const MON_ATK={"Ajarakan":["fire"],"Arkveld":["dragon"],"Guardian Arkveld":["dragon"],"Balahara":["water"],"Blangonga":["ice"],"Congalala":["fire","poison"],
  "Gogmazios":["fire","blastblight"],"Gore Magala":["frenzy"],"Gravios":["fire"],"Guardian Ebony Odogaron":["dragon","bleeding"],"Guardian Fulgur Anjanath":["thunder"],
  "Guardian Rathalos":["fire"],"Gypceros":["poison"],"Hirabami":["ice"],"Jin Dahaad":["ice"],"Lagiacrus":["thunder"],"Lala Barina":["paralysis"],"Mizutsune":["water"],
  "Nerscylla":["poison"],"Nu Udra":["fire"],"Quematrice":["fire"],"Rathalos":["fire"],"Rathian":["fire","poison"],"Rey Dau":["thunder"],"Rompopolo":["poison"],
  "Seregios":["bleeding"],"Uth Duna":["water"],"Yian Kut-Ku":["fire"]};
const ATKN={fire:"Fire",water:"Water",thunder:"Thunder",ice:"Ice",dragon:"Dragon",poison:"Poison",paralysis:"Paralysis",sleep:"Sleep",bleeding:"Bleeding",blastblight:"Blast",frenzy:"Frenzy"};
const RESN={fire:"Fire Resistance",water:"Water Resistance",thunder:"Thunder Resistance",ice:"Ice Resistance",dragon:"Dragon Resistance",poison:"Poison Resistance",paralysis:"Paralysis Resistance",sleep:"Sleep Resistance",bleeding:"Bleeding Resistance",blastblight:"Blast Resistance",frenzy:"Antivirus"};
const ICOL={fire:"#e8603c",water:"#3f8fe0",thunder:"#e6c84a",ice:"#7fd0f0",dragon:"#9a5ad8",poison:"#a052b8",sleep:"#6fa8d6",paralysis:"#d8c33a",blastblight:"#e08a3c",stun:"#f0d264",exhaust:"#7fb07a",bleeding:"#d9473f",frenzy:"#8a4fb3",
  flash:"#f3f0c8",noise:"#c9a46c",sonic:"#c9a46c",trap:"#9fb4c8","shock-trap":"#e6c84a","pitfall-trap":"#a87f5a",tranq:"#8fc0a8",meat:"#d98a7a",dung:"#a88a5a",mount:"#c8a878"};
const ICO={
 fire:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
 water:'<path d="M12 2.5S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.5 12 2.5z"/>',
 thunder:'<path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z"/>',
 ice:'<path d="M11 2h2v20h-2zM2 11h20v2H2zM4.2 5.6l1.4-1.4 14.2 14.2-1.4 1.4zM18.4 4.2l1.4 1.4L5.6 19.8l-1.4-1.4z"/>',
 dragon:'<path d="M4 20c3-1 5-4 6-8l-3 1 5-9 2 6-2 0c1 3 4 5 8 6-5 1-9 0-11-2-1 3-3 5-5 6z"/>',
 poison:'<path d="M12 3a6 6 0 0 0-6 6c0 2.5 1.5 4 2.5 5v3h7v-3c1-1 2.5-2.5 2.5-5a6 6 0 0 0-6-6zm-2.5 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9 18.5h6V21H9z"/>',
 sleep:'<path d="M5 4h7l-5 7h5v2H4l5-7H5zM14 11h6l-4 6h4v2h-7l4-6h-3z"/>',
 paralysis:'<path d="M12 2 4 14h6l-2 8 10-13h-6l2-7z" opacity=".9"/><circle cx="18" cy="5" r="2"/>',
 blastblight:'<path d="M12 1l2 6 6-3-3 6 6 2-6 2 3 6-6-3-2 6-2-6-6 3 3-6-6-2 6-2-3-6 6 3z"/>',
 bleeding:'<path d="M12 3s-5 6-5 10a5 5 0 0 0 10 0c0-4-5-10-5-10zM7 3l2 3M17 3l-2 3"/>',
 frenzy:'<circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4 4l3.5 3.5M16.5 16.5 20 20M20 4l-3.5 3.5M7.5 16.5 4 20" stroke="currentColor" stroke-width="2" fill="none"/>',
 stun:'<path d="M12 3l1.8 4 4.2.4-3.2 2.8 1 4.2L12 12.2 8.2 14.4l1-4.2L6 7.4l4.2-.4z"/><path d="M4 18c5 4 11 4 16 0" stroke="currentColor" stroke-width="2" fill="none"/>',
 exhaust:'<path d="M3 17h4v4H3zM9 13h4v8H9zM15 9h4v12h-4z" opacity=".5"/><path d="M4 4c5 0 9 3 13 9l1-3 2 5-5-1 2-1C13 8 9 6 4 6z"/>',
 flash:'<circle cx="12" cy="12" r="4"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6M4.2 4.2l4 4M15.8 15.8l4 4M19.8 4.2l-4 4M8.2 15.8l-4 4" stroke="currentColor" stroke-width="2" fill="none"/>',
 noise:'<path d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15 8c2 2 2 6 0 8M18 5c4 4 4 10 0 14" stroke="currentColor" stroke-width="2" fill="none"/>',
 trap:'<path d="M3 15h18v3H3zM5 15l2-8h2l-1 8M19 15l-2-8h-2l1 8M10 15l2-10 2 10"/>',
 meat:'<path d="M14 4a6 6 0 0 1 6 6c0 4-4 7-8 7l-4 4-2-2 4-4c0-4 0-11 4-11z"/>',
 dung:'<circle cx="9" cy="14" r="5"/><circle cx="16" cy="9" r="4"/>',
 cut:'<path d="M19 2l3 3-12 12-3-3z"/><path d="M6 15l3 3-2.5 2.5-3-3z"/><path d="M3 21l2-2" stroke="currentColor" stroke-width="2"/>',
 blunt:'<path d="M4 4h11v7H4z"/><path d="M15 6h4v3h-4z"/><path d="M8.5 11h2.5v11H8.5z"/>',
 shot:'<path d="M3 21 17 7M14 4h6v6" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M3 21l2-6 4 4z"/>',
 mount:'<path d="M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 21l2-9h8l2 9h-3l-1-5h-4l-1 5z"/>',
};
function icoSvg(k,sz){const p=ICO[k]||ICO[k.replace(/-trap$/,"")]||(k.includes("trap")?ICO.trap:null)||'<circle cx="12" cy="12" r="5"/>';return `<svg class="ico" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${p}</svg>`}
const DTYPES=[["s","Cutting","Great Sword, Long Sword, Sword & Shield, Dual Blades, Lance, Gunlance, Switch Axe, Charge Blade, Insect Glaive"],
  ["b","Blunt","Hammer, Hunting Horn (and shield bashes)"],["p","Shot","Bow, Light Bowgun, Heavy Bowgun"]];
const DTCOL={s:"#d9a13a",b:"#b0784a",p:"#6fa8d6"};
// how well a damage type works: average of the three best parts, plus how many parts count as weak points
function dtEff(parts,k){const v=parts.map(p=>p[k]||0).sort((a,b)=>b-a);const top=v.slice(0,3);const avg=top.reduce((a,x)=>a+x,0)/Math.max(1,top.length);
  const best=parts.slice().sort((a,b)=>(b[k]||0)-(a[k]||0))[0];return {avg,best,weak:parts.filter(p=>(p[k]||0)>=45).length,n:avg>=60?3:avg>=50?2:avg>=40?1:0}}
function wrow(k,label,n,note){
  return `<div class="wr" style="--c:${ICOL[k]||MELCOL[k]||"var(--accent)"}"><span class="wri">${icoSvg(k,14)}</span><span class="wrn">${esc(label)}</span>${note?`<span class="wrnote">${note}</span>`:""}${starRow(n)}</div>`;
}
function starRow(n){const f=Math.floor(n),h=n-f>=.5;let out="";for(let i=0;i<3;i++)out+=`<i class="${i<f?"on":(i===f&&h?"half":"")}">★</i>`;return `<span class="srow">${out}</span>`}
let MON_SEL=null, MON_Q="", MON_RANK="high";
const MELCOL={fire:"#e8603c",water:"#3f8fe0",thunder:"#e6c84a",ice:"#7fd0f0",dragon:"#9a5ad8"};
const STATN={poison:"Poison",sleep:"Sleep",paralysis:"Paralysis",blastblight:"Blast",stun:"Stun",exhaust:"Exhaust"};
const EFFN={flash:"Flash pods",noise:"Noise",sonic:"Sonic",trap:"Traps","shock-trap":"Shock trap","pitfall-trap":"Pitfall trap",tranq:"Tranq",meat:"Meat",dung:"Dung pod",stun:"Stun",exhaust:"Exhaust",mount:"Mounting"};
const DROPK={"target-reward":"Quest reward","carve":"Carve","carve-severed":"Carve (severed tail)","carve-rotten":"Carve (rotten)","carve-rotten-severed":"Carve (rotten, severed)","carve-crystallized":"Carve (crystallized)","broken-part":"Broken part","wound-destroyed":"Wound","tempered-wound-destroyed":"Wound (tempered only)","broken-fragment":"Broken fragment"};
const PNAME=p=>p.n;

function stars(n){return n<=0?`<span class="wst none">✕</span>`:n<1?`<span class="wst half">★</span>`:`<span class="wst">${"★".repeat(Math.min(3,n))}</span>`}
// element effectiveness from the average elemental hitzone across parts
function elStars(m,el){const v=m.parts.map(p=>p[el]||0);const avg=v.reduce((a,x)=>a+x,0)/Math.max(1,v.length);const mx=Math.max(...v);
  return {avg,mx,n:avg>=25?3:avg>=18?2:avg>=12?1:avg>=7?0.5:0}}

function monRecord(g){
  // from the in-app hunt log: total hunts, finished hunts, best time overall and per kind (normal / tempered / arch)
  const r={hunts:0,done:0,best:null,bestBy:[null,null,null],cnt:[0,0,0],lv:-1};
  try{if(HDMG){huntsClean().forEach(h=>{if(String(HDMG.rt2fx[String(h.em_id)])!==String(g))return;const k=Math.min(2,Math.max(0,h.legendary||0));r.hunts++;r.cnt[k]++;
    if(HUNT_DONE.includes(h.result)){r.done++;if(r.best==null||h.seconds<r.best)r.best=h.seconds;if(r.bestBy[k]==null||h.seconds<r.bestBy[k])r.bestBy[k]=h.seconds}})}}catch(e){}
  try{r.lv=huntLv(g)}catch(e){}
  return r;
}

async function renderMonsterLog(){
  await loadDmg();try{await loadHunts()}catch(e){}try{await loadHunted()}catch(e){}
  const mons=Object.entries(DMG.monsters).sort((a,b)=>a[1].n.localeCompare(b[1].n));
  if(!MON_SEL)MON_SEL=mons[0][0];
  const q=sq(MON_Q);
  const icon=g=>{try{const m=D.monsters.find(x=>String(x.id)===String(g));return m?badge(m,30):""}catch(e){return ""}};
  const item=([g,m])=>`<button class="qitem ${g===MON_SEL?"active":""}" data-mon="${g}"><div class="t" style="display:flex;align-items:center;gap:8px">${icon(g)}<span style="flex:1;min-width:0">${esc(m.n)}</span><span class="hdots">${(()=>{try{return huntDots(g)}catch(e){return ""}})()}</span></div><div class="s">${esc(m.sp)}</div></button>`;
  const shown=mons.filter(([g,m])=>smatch(m.n+" "+m.sp+" "+(m.loc||[]).join(" ")+(m.n.startsWith("Guardian ")?" guardian":""),q));
  const grp=[["Monsters",shown.filter(([g,m])=>!m.n.startsWith("Guardian "))],["Guardian monsters",shown.filter(([g,m])=>m.n.startsWith("Guardian "))]].filter(x=>x[1].length);
  $("monList").innerHTML=grp.map(([t,l])=>`<div class="sect">${t}<span class="sectn">${l.length}</span></div>${l.map(item).join("")}`).join("")||`<div class="empty">No monsters match.</div>`;
  $("monList").querySelectorAll("[data-mon]").forEach(b=>b.onclick=()=>{MON_SEL=b.dataset.mon;renderMonsterLog();$("monBody").scrollTop=0});
  drawMonster();
}

function drawMonster(){
  const g=MON_SEL,m=DMG.monsters[g];if(!m)return;
  const gm=(()=>{try{return D.monsters.find(x=>String(x.id)===String(g))}catch(e){return null}})();
  const rec=monRecord(g);
  const els=Object.fromEntries(ELEMS.map(e=>[e,elStars(m,e)]));
  const bestEl=ELEMS.slice().sort((a,b)=>els[b].avg-els[a].avg);
  const st=(m.weakAll||[]).filter(w=>w.k==="status"),ef=(m.weakAll||[]).filter(w=>w.k==="effect");
  const resEl=(m.resist||[]).filter(r=>r.k==="element").map(r=>r.t),resEf=(m.resist||[]).filter(r=>r.k!=="element").map(r=>r.t);
  const cnt={},seenN={};(m.partsFull||m.parts).forEach(p=>cnt[p.n]=(cnt[p.n]||0)+1);
  const parts=(m.partsFull||m.parts).map(p=>cnt[p.n]>1?{...p,n:p.n+" "+(seenN[p.n]=(seenN[p.n]||0)+1)}:p);
  const top=(k)=>parts.slice().sort((a,b)=>(b[k]||0)-(a[k]||0));
  const weakSpots=[...new Set(parts.filter(p=>p.s>=45||p.b>=45||p.p>=45).map(PNAME))];
  // written notes
  const atk=MON_ATK[m.n]||[];
  const dts=DTYPES.map(([k,l])=>({k,l,e:dtEff(m.partsFull||m.parts,k)})).sort((a,b)=>b.e.avg-a.e.avg);
  const notes=[];
  const ts=top("s")[0],tb=top("b")[0],tp=top("p")[0];
  notes.push(`Hit the <b>${esc(ts.n)}</b> with cutting weapons (${ts.s}), the <b>${esc(tb.n)}</b> with blunt weapons (${tb.b}), and aim shots at the <b>${esc(tp.n)}</b> (${tp.p}).`);
  notes.push(`Best damage type: <b>${dts[0].l.toLowerCase()}</b>${dts[1].e.avg>=dts[0].e.avg-3?` (${dts[1].l.toLowerCase()} is about as good)`:""}${dts[2].e.avg<dts[0].e.avg-8?`, ${dts[2].l.toLowerCase()} is weakest`:""}.`);
  if(weakSpots.length)notes.push(`Weak points (45 or more, where Weakness Exploit works): ${weakSpots.map(x=>`<b>${esc(x)}</b>`).join(", ")}.`);
  else notes.push(`No part reaches 45 on its own, so Weakness Exploit only helps on wounds.`);
  if(els[bestEl[0]].avg>=7)notes.push(`Best element: <b style="color:${MELCOL[bestEl[0]]}">${bestEl[0]}</b>${els[bestEl[1]].avg>=els[bestEl[0]].avg-3&&els[bestEl[1]].avg>=7?` (or <b style="color:${MELCOL[bestEl[1]]}">${bestEl[1]}</b>)`:""}, up to ${els[bestEl[0]].mx} on the ${esc(top(bestEl[0])[0].n)}.`);
  else notes.push(`Elements do very little here. Raw damage builds are the better pick.`);
  const badEl=ELEMS.filter(e=>els[e].avg<5);if(badEl.length&&badEl.length<5)notes.push(`Skip ${badEl.map(e=>`<b>${e}</b>`).join(", ")}: it barely does anything.`);
  const goodSt=st.filter(w=>w.l>=2).map(w=>STATN[w.t]||w.t);if(goodSt.length)notes.push(`Statuses that work well: ${goodSt.join(", ")}.`);
  const goodEf=ef.map(w=>EFFN[w.t]||w.t);if(goodEf.length)notes.push(`Works on it: ${goodEf.join(", ")}.`);
  if(resEf.length)notes.push(`Doesn't work: ${resEf.map(t=>EFFN[t]||t).join(", ")}.`);
  if(atk.length)notes.push(`It attacks with ${atk.map(t=>`<b style="color:${ICOL[t]||"inherit"}">${(ATKN[t]||t).toLowerCase()}</b>`).join(" and ")}. ${atk.map(t=>RESN[t]).filter(Boolean).length?`Worth bringing ${[...new Set(atk.map(t=>RESN[t]).filter(Boolean))].join(" or ")}.`:""}`);
  const tough=parts.filter(p=>p.hp).sort((a,b)=>a.hp-b.hp);if(tough.length)notes.push(`Easiest part to break or wound: <b>${esc(tough[0].n)}</b> (${tough[0].hp} durability).`);

  const heat=v=>{const t=Math.max(0,Math.min(1,v/80));return `background:color-mix(in srgb,var(--accent) ${Math.round(t*60)}%,transparent)`};
  const drops=(m.drops||{})[MON_RANK]||[];const byK={};
  drops.forEach(d=>{const l=byK[d.k]=byK[d.k]||[];const x=l.find(y=>y.n===d.n&&y.a===d.a);if(x)x.c=Math.max(x.c,d.c);else l.push({...d})});
  Object.values(byK).forEach(l=>l.sort((a,b)=>b.c-a.c));
  $("monBody").innerHTML=`<div class="mhead">
      <div class="mbadge">${gm?badge(gm,72):""}</div>
      <div style="flex:1;min-width:0"><h1 style="margin:0">${esc(m.n)}</h1>
        <div class="hint">${esc(m.sp)} · ${(m.hp||0).toLocaleString()} base HP · ${esc((m.loc||[]).join(", ")||"special arena")}</div>
        <div style="margin-top:6px">${(m.var||[]).includes("tempered")||(gm&&gm.tempered)?`<span class="tag lg1">Tempered</span>`:""}${gm&&gm.arch?`<span class="tag lg2">Arch-Tempered</span>`:""}
          <span class="tag">Size ${m.size?`${m.size.mini}–${m.size.gold}+ cm`:"–"}</span></div></div>
      <div class="mrec">
        <div class="hkinds" id="mHunt">${HKIND.map((x,i)=>kindPill(g,i,"data-mk")).join("")}</div>
        <div class="mstats"><div class="mstat"><b>${rec.hunts}</b><span>hunt${rec.hunts===1?"":"s"} logged</span></div>
          <div class="mstat"><b>${rec.best!=null?fmtTime(rec.best):"–"}</b><span>best time</span></div>
          ${rec.bestBy.some((x,i)=>x!=null&&i>0)||rec.cnt.filter(Boolean).length>1?`<div class="mstat kinds">${HKIND.map((x,i)=>rec.cnt[i]?`<div><i class="hdot l${i}"></i>${x[0]==="Hunted"?"Normal":x[0]} <b>${rec.bestBy[i]!=null?fmtTime(rec.bestBy[i]):"–"}</b> <small>(${rec.cnt[i]})</small></div>`:"").join("")}</div>`:""}</div>
        <div class="inline" style="gap:6px;justify-content:flex-end;flex-wrap:wrap"><button class="btn sm" onclick="openHunted()">View hunted monsters</button><button class="btn sm" onclick="monToDamage('${g}')">Compare my builds against it</button></div></div></div>
    <div class="mgrid">
      <section class="card"><h2>Hunter's notes</h2><ul class="mnotes">${notes.map(n=>`<li>${n}</li>`).join("")}</ul></section>
      <section class="card"><h2>Weaknesses</h2>
        ${atk.length?`<div class="atkrow"><span class="wl2">Attacks with</span>${atk.map(t=>`<span class="atk" style="--c:${ICOL[t]||"var(--accent)"}">${icoSvg(t,14)}${esc(ATKN[t]||t)}</span>`).join("")}</div>`:""}
        <div class="wsub" style="margin-top:0">Damage type</div>
        <div class="dtypes">${DTYPES.map(([k,label,wps])=>{const e=dtEff(parts,k);return `<div class="wr" style="--c:${DTCOL[k]}" title="Used by: ${esc(wps)}">
          <span class="wri">${icoSvg(k==="s"?"cut":k==="b"?"blunt":"shot",14)}</span><span class="wrn">${label}<small class="dtsub">${esc(e.best.n)} ${e.best[k]} · ${e.weak} weak point${e.weak===1?"":"s"}</small></span>${starRow(e.n)}</div>`}).join("")}</div>
        <div class="wcols">
          <div><div class="wsub" style="margin-top:0">Element</div>${ELEMS.map(e=>{const r=resEl.includes(e),n=r?0:els[e].n;return wrow(e,e,n,r?"resists":(n<=0?"barely works":""))}).join("")}</div>
          <div><div class="wsub" style="margin-top:0">Status</div>${Object.keys(STATN).map(k=>{const w=(m.weakAll||[]).find(x=>x.t===k);return wrow(k,STATN[k],w?w.l:0,w?"":"immune")}).join("")}</div>
        </div>
        ${ef.length||resEf.length?`<div class="wsub">Items and tricks</div><div class="trick">
          ${ef.map(w=>`<div class="tk ok">${icoSvg(w.t,16)}<span>${esc(EFFN[w.t]||w.t)}${w.c&&typeof w.c==="string"?`<small>${esc(w.c)}</small>`:""}</span><b>✓</b></div>`).join("")}
          ${resEf.map(t=>`<div class="tk no">${icoSvg(t,16)}<span>${esc(EFFN[t]||t)}</span><b>✕</b></div>`).join("")}</div>`:""}
        <div class="hint" style="margin-top:10px">Element stars come from the average elemental hitzone across all parts.</div></section>
    </div>
    <section class="card" id="mbBox"><h2>Best builds against ${esc(m.n)}</h2>
      <div class="inline" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
        <label class="f" style="min-width:180px"><span>Weapon type</span><select id="mbWt">${WTYPES.map(([k,n])=>`<option value="${k}" ${k===MB_WT?"selected":""}>${n}</option>`).join("")}</select></label>
        <label class="check" style="margin:0 0 8px"><input type="checkbox" id="mbOwned" ${MB_OPT.owned?"checked":""}> Only gear I own</label>
        <label class="check" style="margin:0 0 8px"><input type="checkbox" id="mbHunted" ${MB_OPT.hunted?"checked":""}> Only monsters I've hunted</label>
        ${(MON_ATK[m.n]||[]).length?`<label class="check" style="margin:0 0 8px"><input type="checkbox" id="mbResist" ${MB_OPT.resist?"checked":""}> Add ${esc((MON_ATK[m.n]||[]).map(t=>(ATKN[t]||t).toLowerCase()).join(" / "))} resistance</label>`:""}
        <label class="check" style="margin:0 0 8px" title="A rarity 8 Artian weapon with the best parts and reinforcement rolls for this monster"><input type="checkbox" id="mbArtian" ${MB_OPT.artian?"checked":""}> Include Artian weapons (perfect rolls)</label>
        <button class="btn primary" id="mbRun" onclick="monBestBuilds('${g}')">Find best builds</button></div>
      <div class="hint" style="margin-top:6px">Picks the weapons that hit this monster hardest (damage type, its weak spots and element), finds skills to go with them, then ranks the builds by damage per hit on its best part.</div>
      <div id="mbRes">${MB_LAST&&MB_LAST.g===g&&MB_LAST.wt===MB_WT?MB_LAST.html:""}</div></section>
    <section class="card"><h2>Hitzones</h2><div style="overflow:auto"><table class="dtab mhz"><tr><th>Part</th><th>Cut</th><th>Blunt</th><th>Shot</th>${ELEMS.map(e=>`<th style="color:${MELCOL[e]}">${e}</th>`).join("")}<th>Stun</th><th>Durability</th></tr>
      ${parts.map(p=>`<tr><td>${esc(p.n)}${(p.s>=45||p.b>=45||p.p>=45)?` <span class="wk">weak</span>`:""}</td>${["s","b","p"].map(k=>`<td style="${heat(p[k])}" class="${p[k]>=45?"best":""}">${p[k]}</td>`).join("")}${ELEMS.map(e=>`<td style="${heat((p[e]||0)*2.5)}">${p[e]||0}</td>`).join("")}<td>${p.stun!=null?p.stun:"–"}</td><td class="hint">${p.hp||"–"}</td></tr>`).join("")}</table></div>
      <div class="hint" style="margin-top:8px">Higher numbers take more damage. 45 or more counts as a weak point.</div></section>
    <section class="card"><h2>Drops <span style="flex:1"></span><div class="seg" style="font-size:12px"><button class="${MON_RANK==="high"?"on":""}" onclick="MON_RANK='high';drawMonster()">High rank</button><button class="${MON_RANK==="low"?"on":""}" onclick="MON_RANK='low';drawMonster()">Low rank</button></div></h2>
      ${drops.length?`<div class="dropgrid">${Object.entries(byK).map(([k,l])=>`<div><div class="wsub" style="margin-top:0">${esc(DROPK[k]||k)}</div>${l.map(d=>`<div class="drop"><span>${esc(d.n)}${d.a>1?` ×${d.a}`:""}</span><b>${d.c}%</b></div>`).join("")}</div>`).join("")}</div>`:`<div class="empty">No ${MON_RANK} rank drops listed.</div>`}</section>`;
  wireMonHunted(g);
}
function wireMonHunted(g){
  document.querySelectorAll("#mHunt [data-mk]").forEach(b=>b.onclick=()=>{const on=!b.classList.contains("on");setKind(g,+b.dataset.mk,on);b.classList.toggle("on",on);
    try{updateHuntedBtn()}catch(e){}const d=document.querySelector(`#monList [data-mon="${g}"] .hdots`);if(d)d.innerHTML=huntDots(g)});
}
function monToDamage(g){showView("builds").then(()=>{DMGSEL=DMGSEL||null;builderTab("dmg");setTimeout(()=>{if(DMGSEL){DMGSEL.mon=g;DMGSEL.part="best";renderDamage()}},400)})}

// ---------- best builds against one monster ----------
function skillIdByName(n){return Object.keys(BD.skills).find(k=>BD.skills[k].n===n)}
function bareBuild(wt,wid){const b=newBuild();b.wtype=wt;b.weapon=wid;return b}
function bestPartFor(m,b,opt){let best=null,part=null;m.parts.forEach(p=>{const r=hitDamage(b,p,opt);if(r&&(!best||r.total>best.total)){best=r;part=p}});return {r:best,part}}
async function monBestBuilds(g){
  const m=DMG.monsters[g];const wt=$("mbWt").value;MB_WT=wt;MB_OPT={owned:$("mbOwned").checked,hunted:$("mbHunted").checked,resist:$("mbResist")?$("mbResist").checked:MB_OPT.resist,artian:$("mbArtian").checked};
  const atk=MON_ATK[m.n]||[];
  const btn=$("mbRun");btn.disabled=true;const box=$("mbRes");
  try{
    await loadHunted();
    let own=null;
    if(MB_OPT.owned){try{const gx=await api("/api/gear");if(!gx.found)throw new Error("no export");const gm=await api("/api/builds/map");const ti=(gm.wtypes||[]).indexOf(wt);own=new Set();
      ((gx.export||gx).box||[]).forEach(e=>{if((e.cg>>3)===1&&e.v&&e.v[0]===ti){const gid=(gm.weapon[wt]||{})[String(e.v[1])];if(gid!=null)own.add(gid)}})}
      catch(e){box.innerHTML=`<div class="hpnote">Import your gear from the game first (Builds → Import from game), or untick Only gear I own.</div>`;return}}
    const ex=MB_OPT.hunted?huntedExclusions(wt):{armor:[],weapons:[],tal:[]};
    const opt={mv:100,wound:false};
    // 1. weapons that hit this monster hardest on their own
    let ws=(BD.weapons[wt]||[]).filter(w=>(own?own.has(w.i):w.rar>=5)&&!ex.weapons.includes(w.i));
    const ranked=ws.map(w=>({w,...bestPartFor(m,bareBuild(wt,w.i),opt)})).filter(x=>x.r).sort((a,b)=>b.r.total-a.r.total);
    if(!ranked.length){box.innerHTML=`<div class="hpnote">No ${esc(wt)} weapons fit those filters.</div>`;return}
    // Artian: the best element + parts + rolls for this monster, as its own candidate
    let art=null;
    if(MB_OPT.artian){for(const el of [null,...ELEMS]){if(el&&!(ART_ELB[wt]>0))continue;const bb=bareBuild(wt,null);const r=bestArtian(m,bb,el,opt);
      if(r&&(!art||r.d.r.total>art.r.total))art={w:makeArtian(wt,r.spec),spec:r.spec,el,r:r.d.r,part:r.d.part,artian:true}}}
    const picks=[ranked[0]];
    const otherKind=ranked.find(x=>(!!x.r.elType&&x.r.elem>=1)!==(!!ranked[0].r.elType&&ranked[0].r.elem>=1));
    if(otherKind)picks.push(otherKind);else if(ranked[1])picks.push(ranked[1]);
    if(art)picks.push(art);
    // 2. skills for this monster
    const weak=m.parts.some(p=>Math.max(p.s,p.b,p.p)>=45);
    const all=[];
    for(let i=0;i<picks.length;i++){
      const pk=picks[i];btn.textContent=`Searching ${i+1} of ${picks.length}… (${pk.artian?"Artian":pk.w.n})`;
      const names=[];if(weak)names.push(["Weakness Exploit",5]);
      if(pk.r.elType&&(pk.part[pk.r.elType]||0)>=15)names.push([pk.r.elType[0].toUpperCase()+pk.r.elType.slice(1)+" Attack",3]);
      names.push(["Critical Boost",5],["Agitator",5],["Attack Boost",5],["Maximum Might",3],["Critical Eye",5]);
      if(!weak)names.unshift(["Critical Eye",5]);
      // defence against what it hits you with, after the damage skills
      if(MB_OPT.resist)atk.forEach(t=>{if(RESN[t])names.push([RESN[t],3]);if(["fire","water","thunder","ice","dragon"].includes(t))names.push(["Blight Resistance",3])});
      const targets=[];names.forEach(([n,w])=>{const id=skillIdByName(n);if(id&&!targets.some(t=>t.skill===id))targets.push({skill:id,want:Math.min(w,BD.skills[id].max),must:false})});
      const req={wtype:wt,weapon:pk.artian?null:pk.w.i,targets,owned:MB_OPT.owned,talisman:"any",minRarity:5,locks:{},exclude:[...ex.armor],excludeWeapons:[],excludeTal:ex.tal};
      if(pk.artian)req.virtualSlots=[3,3,3];
      req.seconds=Math.min(20,(window.PREFS&&PREFS.calcSeconds)||6);
      const res=await api("/api/calc",{method:"POST",body:JSON.stringify(req)});
      (res.results||[]).forEach(r=>{const b=calcToBuild(r,req);b.name=`${m.n}: ${pk.w.n}`;
        if(pk.artian){b.weapon=null;const o=bestArtian(m,b,pk.el,opt);b.artian=o?o.spec:pk.spec;b.name=`${m.n}: ${makeArtian(wt,b.artian).n}`}
        const d=bestPartFor(m,b,opt);if(d.r)all.push({b,r:d.r,part:d.part,skills:r.skills,def:defVs(b,r.skills,atk)})});
    }
    // damage first; builds within 1% of each other are ordered by how well they resist its attacks
    all.sort((a,b)=>{const d=b.r.total-a.r.total;if(Math.abs(d)>Math.max(a.r.total,b.r.total)*0.01)return d;return (b.def.score-a.def.score)||d});
    const seen=new Set(),top=[];for(const x of all){const k=JSON.stringify([x.b.weapon,x.b.artian||null,Object.entries(x.skills||{}).filter(([id,l])=>l>0).sort()]);if(seen.has(k))continue;seen.add(k);top.push(x);if(top.length>=5)break}
    MB_BUILDS=top;
    if(!top.length){box.innerHTML=`<div class="hpnote">No builds found with those filters.${MB_OPT.owned?" Try unticking Only gear I own.":""}</div>`;return}
    const best=top[0].r.total;
    const html=`<div class="mbres">${top.map((x,i)=>{const w=weaponOf(x.b);const sk=Object.entries(x.skills||{}).filter(([id,l])=>BD.skills[id]&&l>0&&!["set","group"].includes(BD.skills[id].k)).sort((a,b)=>b[1]-a[1]).slice(0,7);
      return `<div class="dres"><div class="inline" style="justify-content:space-between;gap:10px;align-items:flex-start">
        <div style="min-width:0"><div class="dn">#${i+1} ${gearIcon(wt,w.rar,18)} ${esc(w.n)}${x.b.artian?` <span class="tag lg2">perfect rolls</span>`:""}</div>
          ${x.b.artian?`<div class="resv">${esc(artianLabel(x.b.artian))}</div>`:""}
          <div class="hint">${esc(x.part.n)} · ${Math.round(x.r.attack)} attack · ${Math.round(x.r.aff)}% affinity${x.r.elType?` · ${esc(x.r.elType)} ${Math.round(x.r.elVal)}`:""}${x.r.sh?` · <span class="shp" style="background:${SHARPCOL[x.r.sh]}"></span>${x.r.sh}`:""}</div>
          ${x.def.txt?`<div class="resv" style="margin-top:4px">Against its attacks: ${x.def.txt}</div>`:""}
          <div class="chips2" style="margin-top:6px">${sk.map(([id,l])=>`<span class="chipx">${esc(BD.skills[id].n)} ${l}</span>`).join("")}</div></div>
        <div style="text-align:right"><div class="dnum">${Math.round(x.r.total)}<small>${x.r.elem>=1?`${Math.round(x.r.raw)} + ${Math.round(x.r.elem)} ${esc(x.r.elType)}`:"raw"} per hit</small></div>
          <button class="btn sm" style="margin-top:8px" onclick="monOpenBuild(${i})">Open in editor</button></div></div>
        <div class="dbarrow"><div class="dbar"><i style="width:${(x.r.total/best*100).toFixed(1)}%"></i></div><span class="${i===0?"top":""}">${i===0?"best":"−"+(100-x.r.total/best*100).toFixed(1)+"%"}</span></div></div>`}).join("")}</div>
      <div class="hint">Damage per hit at motion value 100 on the part each build hits hardest, with conditional skills counted as active. Compare within one weapon type.${MB_OPT.artian?" Artian weapons are planned ones (rarity 8, best parts and rolls for this monster), built from community-published numbers. Craft or reroll toward the parts and rolls shown.":""}</div>`;
    MB_LAST={g,wt,html};box.innerHTML=html;
  }catch(e){box.innerHTML=`<div class="hpnote">${esc(e.message)}</div>`}
  finally{btn.disabled=false;btn.textContent="Find best builds"}
}
function monOpenBuild(i){const x=MB_BUILDS[i];if(!x)return;showView("builds").then(()=>{B=JSON.parse(JSON.stringify(x.b));bEditing=null;builderTab("editor");renderBuild();renderBuildList();toast("<b>Opened in the editor</b>Click Save build to keep it.",false,3000)})}

// How well a build stands up to what the monster hits with: elemental resistance and ailment skills
function defVs(b,skills,atk){
  if(!atk.length)return {score:0,txt:""};
  const c=computeBuild(b);const parts=[];let score=0;
  const lvOf=n=>{const id=skillIdByName(n);return id?(skills&&skills[id])||0:0};
  atk.forEach(t=>{
    if(["fire","water","thunder","ice","dragon"].includes(t)){
      let r=c.res[t]||0;const sl=lvOf(RESN[t]);const id=skillIdByName(RESN[t]);
      if(sl&&id){const m=(BD.skills[id].r[Math.min(sl,BD.skills[id].r.length)-1].d||"").match(/resistance \+(\d+)/i);if(m)r+=+m[1]}
      score+=r;parts.push(`<span style="color:${ICOL[t]}">${ATKN[t]} res ${r>0?"+":""}${r}</span>`);
    }else{const l=lvOf(RESN[t]);score+=l*5;parts.push(`${esc(RESN[t])} ${l||"none"}`)}
  });
  const bl=lvOf("Blight Resistance");if(bl){score+=bl*3;parts.push(`Blight Resistance ${bl}`)}
  return {score,txt:parts.join(" · ")};
}
