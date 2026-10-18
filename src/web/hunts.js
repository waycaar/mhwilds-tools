// ===================== Hunt log =====================
// Shows hunts recorded by the data reader (reframework/data/questmaker/hunts.json).
let HUNTS=null, HF={mon:"",wt:"",res:""}, HGM=null, HDMG=null;
const LEGN=["","Tempered","Arch-Tempered"];
function fmtTime(s){if(s==null)return "–";s=Math.round(s);const m=Math.floor(s/60),x=s%60;return m+":"+String(x).padStart(2,"0")}
async function loadHunts(){
  const r=await api("/api/hunts");HUNTS=r;
  try{if(!HGM)HGM=await api("/api/builds/map")}catch(e){}
  try{if(!HDMG)HDMG=await api("/api/dmgdata")}catch(e){}
  try{if(typeof BD==="undefined"||!BD)await loadBuildData()}catch(e){}
  return r;
}
// hunts worth showing: drops re-reads of a monster that was already down (old readers logged those)
function huntsClean(){return ((HUNTS&&HUNTS.hunts)||[]).filter(h=>(h.seconds||0)>=3&&!(h.result==="quest ended"&&(h.seconds||0)<5))}
const HUNT_DONE=["slain","captured","captured or left"];
function huntMon(h){
  if(h.name)return h.name;
  const fx=HDMG&&HDMG.rt2fx[String(h.em_id)];const m=fx!=null&&HDMG.monsters[String(fx)];return m?m.n:"Monster "+h.em_id;
}
function huntWeapon(h){
  const g=h.gear||{};if(g.wtype==null||!HGM)return {kind:null,name:"–"};
  const kind=(HGM.wtypes||[])[g.wtype];let name="";
  try{const gid=HGM.weapon[kind][String(g.weapon)];const w=(BD.weapons[kind]||[]).find(x=>x.i===gid);if(w)name=w.n}catch(e){}
  return {kind,name:name||(WTYPES.find(x=>x[0]===kind)||["",kind||"?"])[1]};
}
function huntResult(h){return {"slain":"Slain","captured":"Captured","captured or left":"Captured?","left":"Left","quest ended":"Quest ended"}[h.result]||h.result||"–"}
async function renderHunts(){
  const box=$("huntsBody");box.innerHTML=`<div class="empty">Loading hunts…</div>`;
  try{await loadHunts()}catch(e){box.innerHTML=`<div class="hpnote">${esc(e.message)}</div>`;return}
  const all=huntsClean().reverse();
  if(!all.length){
    box.innerHTML=`<div class="card"><h2>No hunts yet</h2><p>The hunt log is filled in by the data reader while you play.</p>
      <ul class="steps"><li>Make sure the data reader is installed and up to date (Updates tab).</li><li>Fight a large monster. Each one is logged from your first hit until it's slain or captured.</li><li>Come back here and press Refresh.</li></ul>
      ${HUNTS.reader?"":`<div class="hint">The data reader isn't installed in this game folder yet.</div>`}
      <button class="btn" onclick="renderHunts()">Refresh</button></div>`;return}
  const done=all.filter(h=>h.result==="slain"||h.result==="captured"||h.result==="captured or left");
  const tot=all.reduce((a,h)=>a+(h.seconds||0),0);
  const byMon={};done.forEach(h=>{const k=huntMon(h)+"|"+(h.legendary||0);(byMon[k]=byMon[k]||[]).push(h)});
  const pbs=Object.entries(byMon).map(([k,l])=>{const [n,leg]=k.split("|");const best=l.reduce((a,h)=>!a||h.seconds<a.seconds?h:a,null);
    const avg=l.reduce((a,h)=>a+h.seconds,0)/l.length;return {n,leg:+leg,best,avg,count:l.length}}).sort((a,b)=>b.count-a.count||a.n.localeCompare(b.n));
  const most=pbs[0];
  const mons=[...new Set(all.map(huntMon))].sort();const wts=[...new Set(all.map(h=>huntWeapon(h).kind).filter(Boolean))];
  const list=all.filter(h=>(!HF.mon||huntMon(h)===HF.mon)&&(!HF.wt||huntWeapon(h).kind===HF.wt)&&(!HF.res||(HF.res==="done"?done.includes(h):!done.includes(h))));
  box.innerHTML=`<div class="hstats">
      <div class="hst"><b>${all.length}</b><span>hunts logged</span></div>
      <div class="hst"><b>${tot>=3600?Math.floor(tot/3600)+"h "+Math.round(tot%3600/60)+"m":Math.round(tot/60)+" min"}</b><span>total time</span></div>
      <div class="hst"><b>${most?esc(most.n):"–"}</b><span>most hunted${most?` (${most.count})`:""}</span></div>
      <div class="hst"><b>${done.length?Math.round(done.length/all.length*100)+"%":"–"}</b><span>finished</span></div></div>
    <div class="hgrid">
    <section class="card"><h2>Personal bests</h2>${pbs.length?`<table class="dtab ht"><tr><th>Monster</th><th>Best</th><th>Average</th><th>Hunts</th><th>Best with</th></tr>
      ${pbs.map(p=>{const w=huntWeapon(p.best);return `<tr><td>${esc(p.n)}${p.leg?` <span class="tag lg${p.leg}">${LEGN[p.leg]}</span>`:""}</td><td class="best">${fmtTime(p.best.seconds)}</td><td>${fmtTime(p.avg)}</td><td>${p.count}</td><td>${w.kind?gearIcon(w.kind,8,16):""} ${esc(w.name)}</td></tr>`}).join("")}</table>`:`<div class="empty">Finish a hunt to set a time.</div>`}</section>
    <section class="card"><h2>Hunts <span style="flex:1"></span><button class="btn sm" onclick="renderHunts()">Refresh</button></h2>
      <div class="inline" style="gap:8px;margin-bottom:10px">
        <select id="hfMon"><option value="">All monsters</option>${mons.map(m=>`<option ${HF.mon===m?"selected":""}>${esc(m)}</option>`).join("")}</select>
        <select id="hfWt"><option value="">All weapons</option>${wts.map(k=>`<option value="${k}" ${HF.wt===k?"selected":""}>${esc((WTYPES.find(x=>x[0]===k)||["",k])[1])}</option>`).join("")}</select>
        <select id="hfRes"><option value="">Any result</option><option value="done" ${HF.res==="done"?"selected":""}>Slain or captured</option><option value="other" ${HF.res==="other"?"selected":""}>Didn't finish</option></select></div>
      <div class="hlist">${list.slice(0,300).map(h=>{const w=huntWeapon(h);const ok=done.includes(h);
        return `<div class="hrow"><span class="hico">${w.kind?gearIcon(w.kind,8,22):""}</span>
          <div class="hm"><div><b>${esc(huntMon(h))}</b>${h.legendary?` <span class="tag lg${h.legendary}">${LEGN[h.legendary]||""}</span>`:""}${h.players>1?` <span class="hint">· ${h.players} players</span>`:""}</div>
          <div class="hint">${esc((h.started||"").slice(0,16))} · ${esc(w.name)}${h.in_quest?" · quest":" · field"}</div></div>
          <div class="htime ${ok?"":"no"}">${fmtTime(h.seconds)}<small>${esc(huntResult(h))}</small></div></div>`}).join("")||`<div class="empty">No hunts match.</div>`}</div>
    </section></div>
    <div class="hint" style="margin-top:10px">Times run from your first hit until the monster is slain or captured, so pauses and cutscenes count.</div>`;
  $("hfMon").onchange=()=>{HF.mon=$("hfMon").value;renderHunts()};
  $("hfWt").onchange=()=>{HF.wt=$("hfWt").value;renderHunts()};
  $("hfRes").onchange=()=>{HF.res=$("hfRes").value;renderHunts()};
}
