// ===================== Damage comparison =====================
// Compares saved builds against one monster: damage per hit on each part.
// Numbers are per hit at a chosen motion value, so compare builds of the same weapon type.
let DMG=null, DMGSEL=null, DMGCOND={};
const SHARP=["red","orange","yellow","green","blue","white","purple"];
const SHARP_RAW={red:.5,orange:.75,yellow:1,green:1.05,blue:1.2,white:1.32,purple:1.39};
const SHARP_EL={red:.25,orange:.5,yellow:.75,green:1,blue:1.0625,white:1.15,purple:1.25};
const SHARPCOL={red:"#d9473f",orange:"#e8873a",yellow:"#e6c84a",green:"#66b84a",blue:"#3f86e0",white:"#e8e8e8",purple:"#a35ad8"};
const ELEMS=["fire","water","thunder","ice","dragon"];

async function loadDmg(){if(!DMG)DMG=await api("/api/dmgdata");return DMG}
function dmgType(wt){return wt==="hammer"||wt==="hunting-horn"?"b":(wt==="bow"||wt==="light-bowgun"||wt==="heavy-bowgun")?"p":"s"}

// Reads the numbers out of a skill level's description, e.g. "Attack +2% Bonus: +8".
function parseSkill(id,lv,name){
  const s=BD.skills[id];if(!s||!s.r)return null;const r=s.r[Math.min(lv,s.r.length)-1];if(!r)return null;
  const d=(r.d||"").replace(/\s+/g," ");const e={name:name||s.n,lv,atk:0,atkPct:0,aff:0,crit:0,el:{},elPct:{},weak:0,wound:0,cond:false,used:false};
  let m;
  if(/weak points/i.test(d)){m=d.match(/affinity \+?(\d+)%|(\d+)% increased affinity/i);if(m)e.weak=+(m[1]||m[2]);m=d.match(/extra (\d+)%/i);if(m)e.wound=+m[1];e.used=!!e.weak;return e}
  m=d.match(/critical hits to (\d+)%/i);if(m){e.crit=1+(+m[1])/100;e.used=true}
  m=d.match(/Attack \+(\d+)%/);if(m){e.atkPct=+m[1];e.used=true}
  m=d.match(/Bonus: \+(\d+)/);if(m&&e.atkPct){e.atk=+m[1]}
  else{m=d.match(/Attack \+(\d+)(?![\d%])/);if(m){e.atk=+m[1];e.used=true}}
  m=d.match(/[Aa]ffinity \+(\d+)%/);if(m){e.aff=+m[1];e.used=true}
  for(const el of ELEMS){const re=new RegExp(el+" attack \\+(\\d+)(%)?","i");m=d.match(re);
    if(m){e.used=true;if(m[2]){e.elPct[el]=+m[1];const b=d.match(/Bonus: \+(\d+)/);if(b)e.el[el]=+b[1];e.atk=0;e.atkPct=0}else e.el[el]=+m[1]}}
  e.cond=/while active|against|if cured|when active|after/i.test(d)&&!/^Attack \+\d+%? ?(Bonus|$)/.test(d);
  if(/Attack Boost|Critical Eye|Critical Boost/.test(s.n)||/^(Fire|Water|Thunder|Ice|Dragon) Attack$/.test(s.n))e.cond=false;
  return e.used?e:null;
}

function buildEffects(b){
  const c=computeBuild(b);const fx=[],skipped=[];
  Object.entries(c.sk).forEach(([id,l])=>{const s=BD.skills[id];if(!s)return;const e=parseSkill(id,l);
    if(e)fx.push(e);else if(s.k==="weapon"||/attack|affinity|critical|element|burst|coalescence|flayer/i.test((s.r||[]).map(r=>r.d).join(" ")))skipped.push(`${s.n} ${l}`)});
  (c.bonuses||[]).forEach(bn=>{if(!bn.active)return;const e=parseSkill(bn.id,bn.active.l||1,bn.name);if(e){e.cond=true;fx.push(e)}else skipped.push(bn.name)});
  return {c,fx,skipped};
}

// Highest sharpness color the weapon reaches (Handicraft extends length, rarely the color)
function sharpOf(b,c){
  const w=c.w;if(!w||!w.sh)return null;let top=0;SHARP.forEach((k,i)=>{if((w.sh[k]||0)>0)top=i});return SHARP[top];
}

function hitDamage(b,part,opt){
  const {c,fx,skipped}=buildEffects(b);const w=c.w;if(!w)return null;
  const on=e=>!e.cond||DMGCOND[e.name]!==false;
  let atkPct=0,atkFlat=0,aff=w.aff||0,crit=1.25,el={},elPct={},weakAff=0,woundAff=0;
  fx.forEach(e=>{if(!on(e))return;atkPct+=e.atkPct;atkFlat+=e.atk;aff+=e.aff;if(e.crit)crit=Math.max(crit,e.crit);
    Object.entries(e.el).forEach(([k,v])=>el[k]=(el[k]||0)+v);Object.entries(e.elPct).forEach(([k,v])=>elPct[k]=(elPct[k]||0)+v);
    weakAff+=e.weak;woundAff+=e.wound});
  const attack=w.atk*(1+atkPct/100)+atkFlat;
  const hz=part[dmgType(b.wtype)];
  let a=aff;if(hz>=45)a+=weakAff+(opt.wound?woundAff:0);a=Math.max(-100,Math.min(100,a));
  const critM=a>=0?1+a/100*(crit-1):1+a/100*.25;
  const sh=sharpOf(b,c);const sr=sh?SHARP_RAW[sh]:1,se=sh?SHARP_EL[sh]:1;
  const raw=attack*opt.mv/100*hz/100*sr*critM;
  let elem=0,elType=null,elVal=0;
  (w.el||[]).forEach(x=>{if(!ELEMS.includes(x.t))return;elType=x.t;elVal=x.v*(1+(elPct[x.t]||0)/100)+(el[x.t]||0);elem+=elVal/10*(part[x.t]||0)/100*se*(opt.mv>0?1:0)});
  return {raw,elem,total:raw+elem,attack,aff:a,crit,sh,elType,elVal,skipped,fx};
}

function dmgBuildsList(){
  const list=BUILDS.map((b,i)=>({key:"s"+i,b,name:b.name||"Untitled build"}));
  if(B&&weaponOf(B))list.unshift({key:"cur",b:B,name:(B.name||"Editor build")+" (editor)"});
  return list;
}

async function renderDamage(){
  await loadDmg();const box=$("dmgPane");
  const mons=Object.entries(DMG.monsters).sort((a,b)=>a[1].n.localeCompare(b[1].n));
  if(!DMGSEL)DMGSEL={mon:mons[0][0],part:"best",mv:100,wound:false,builds:new Set(dmgBuildsList().slice(0,4).map(x=>x.key))};
  const all=dmgBuildsList();
  const conds=new Map();all.filter(x=>DMGSEL.builds.has(x.key)).forEach(x=>buildEffects(x.b).fx.filter(e=>e.cond).forEach(e=>conds.set(e.name,e)));
  const m=DMG.monsters[DMGSEL.mon];
  box.innerHTML=`<div class="dgrid">
   <section class="card"><h2>Setup</h2>
    <label class="f"><span>Monster</span><select id="dMon">${mons.map(([id,x])=>`<option value="${id}" ${id===DMGSEL.mon?"selected":""}>${esc(x.n)}</option>`).join("")}</select></label>
    <div class="hint" style="margin:6px 0 12px">Weak to ${Object.keys(m.weak).length?Object.keys(m.weak).map(k=>`<b>${k}</b>`).join(", "):"nothing in particular"}</div>
    <label class="f"><span>Part</span><select id="dPart"><option value="best">Best part for each build</option>${m.parts.map((p,i)=>`<option value="${i}" ${String(i)===String(DMGSEL.part)?"selected":""}>${esc(p.n)} (cut ${p.s} · blunt ${p.b} · shot ${p.p})</option>`).join("")}</select></label>
    <label class="f" style="margin-top:10px"><span>Motion value</span><input type="number" id="dMv" min="1" max="500" value="${DMGSEL.mv}"></label>
    <div class="hint" style="margin-top:4px">How strong the attack is. 100 is a fair middle; only compare builds that use the same weapon type.</div>
    <label class="check" style="margin-top:10px"><input type="checkbox" id="dWound" ${DMGSEL.wound?"checked":""}> Hitting a wound</label>
    ${conds.size?`<div class="hint" style="margin:14px 0 6px">Skills that only work some of the time. Untick any you won't have up:</div>
      ${[...conds.keys()].map(n=>`<label class="check"><input type="checkbox" data-cond="${esc(n)}" ${DMGCOND[n]!==false?"checked":""}> ${esc(n)}</label>`).join("")}`:""}
    <div class="hint" style="margin:14px 0 6px">Builds to compare</div>
    <div class="dblist">${all.length?all.map(x=>`<label class="check"><input type="checkbox" data-db="${x.key}" ${DMGSEL.builds.has(x.key)?"checked":""}> ${gearIcon(x.b.wtype,(weaponOf(x.b)||{}).rar||5,16)} ${esc(x.name)}</label>`).join(""):`<div class="empty">Save a build first.</div>`}</div>
   </section>
   <section class="card"><h2>Damage per hit</h2><div id="dRes"></div></section></div>`;
  $("dMon").onchange=()=>{DMGSEL.mon=$("dMon").value;DMGSEL.part="best";renderDamage()};
  $("dPart").onchange=()=>{DMGSEL.part=$("dPart").value;drawDamage()};
  $("dMv").oninput=()=>{DMGSEL.mv=Math.max(1,+$("dMv").value||100);drawDamage()};
  $("dWound").onchange=()=>{DMGSEL.wound=$("dWound").checked;drawDamage()};
  box.querySelectorAll("[data-cond]").forEach(el=>el.onchange=()=>{DMGCOND[el.dataset.cond]=el.checked;drawDamage()});
  box.querySelectorAll("[data-db]").forEach(el=>el.onchange=()=>{el.checked?DMGSEL.builds.add(el.dataset.db):DMGSEL.builds.delete(el.dataset.db);renderDamage()});
  drawDamage();
}

function drawDamage(){
  const m=DMG.monsters[DMGSEL.mon];const opt={mv:DMGSEL.mv,wound:DMGSEL.wound};
  const sel=dmgBuildsList().filter(x=>DMGSEL.builds.has(x.key)&&weaponOf(x.b));
  if(!sel.length){$("dRes").innerHTML=`<div class="empty">Tick at least one build with a weapon.</div>`;return}
  const rows=sel.map(x=>{
    let best=null,bestPart=null;
    const parts=DMGSEL.part==="best"?m.parts.map((p,i)=>i):[+DMGSEL.part];
    parts.forEach(i=>{const r=hitDamage(x.b,m.parts[i],opt);if(r&&(!best||r.total>best.total)){best=r;bestPart=m.parts[i]}});
    return {...x,r:best,part:bestPart};
  }).filter(x=>x.r);
  const top=Math.max(...rows.map(x=>x.r.total));
  const wts=new Set(rows.map(x=>x.b.wtype));
  $("dRes").innerHTML=(wts.size>1?`<div class="hpnote" style="margin-bottom:10px">These builds use different weapon types, which hit with different motion values. Compare within one weapon type for a fair result.</div>`:"")+
   rows.sort((a,b)=>b.r.total-a.r.total).map(x=>{const r=x.r;const pct=r.total/top*100;
    return `<div class="dres"><div class="inline" style="justify-content:space-between;gap:10px">
      <div style="min-width:0"><div class="dn">${gearIcon(x.b.wtype,(weaponOf(x.b)||{}).rar||5,18)} ${esc(x.name)}</div>
        <div class="hint">${esc(x.part.n)} · ${Math.round(r.attack)} attack · ${Math.round(r.aff)}% affinity${r.elType?` · ${esc(r.elType)} ${Math.round(r.elVal)}`:""}${r.sh?` · <span class="shp" style="background:${SHARPCOL[r.sh]}"></span>${r.sh}`:""}</div></div>
      <div class="dnum">${Math.round(r.total)}<small>${r.elem>=1?`${Math.round(r.raw)} + ${Math.round(r.elem)} ${esc(r.elType)}`:"raw"}</small></div></div>
      <div class="dbarrow"><div class="dbar"><i style="width:${pct.toFixed(1)}%"></i></div><span class="${pct>=99.95?"top":""}">${pct>=99.95?"best":"−"+(100-pct).toFixed(1)+"%"}</span></div>
      ${r.skipped.length?`<div class="hint" style="margin-top:4px">Not counted: ${esc(r.skipped.join(", "))}</div>`:""}</div>`}).join("")+
   `<h3 class="dh">Every part</h3><div style="overflow:auto"><table class="dtab"><tr><th>Part</th><th>Cut / blunt / shot</th>${rows.map(x=>`<th>${esc(x.name)}</th>`).join("")}</tr>
    ${m.parts.map(p=>{const vals=rows.map(x=>hitDamage(x.b,p,opt).total);const mx=Math.max(...vals);
      return `<tr><td>${esc(p.n)}</td><td class="hint">${p.s} / ${p.b} / ${p.p}</td>${vals.map(v=>`<td class="${v===mx&&rows.length>1?"best":""}">${Math.round(v)}</td>`).join("")}</tr>`}).join("")}</table></div>
   <div class="hint" style="margin-top:10px">Damage per hit = attack × motion value × hitzone × sharpness × average crit, plus element. Hitzones from MHDB. Skills marked "not counted" are ones whose exact numbers the game doesn't show.</div>`;
}
