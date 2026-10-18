// ===================== Builds tab =====================
let BD=null, BUILDS=[], B=null, bEditing=null;
const WTYPES=[["great-sword","Great Sword"],["long-sword","Long Sword"],["sword-shield","Sword & Shield"],["dual-blades","Dual Blades"],["hammer","Hammer"],["hunting-horn","Hunting Horn"],["lance","Lance"],["gunlance","Gunlance"],["switch-axe","Switch Axe"],["charge-blade","Charge Blade"],["insect-glaive","Insect Glaive"],["light-bowgun","Light Bowgun"],["heavy-bowgun","Heavy Bowgun"],["bow","Bow"]];
const ASLOTS=[["head","Head"],["chest","Chest"],["arms","Arms"],["waist","Waist"],["legs","Legs"]];
const ELCOL={fire:"#e8693c",water:"#3d9be0",thunder:"#e3c234",ice:"#8fd3ef",dragon:"#a35bd8",poison:"#a052b8",paralysis:"#d8c33a",sleep:"#6fa8d6",blast:"#e08a3c"};
const SHC=["#d9443a","#e8893a","#e3cf3a","#65c24a","#3b8fe0","#f0f0f0","#b36ae0"];

function newBuild(){return {name:"",wtype:"long-sword",weapon:null,armor:{head:null,chest:null,arms:null,waist:null,legs:null},
  talisman:null,custom:{skills:[{s:"",l:1},{s:"",l:1},{s:"",l:1}],slots:[0,0,0]},decos:{}}}

async function loadBuildData(){
  if(BD) return;
  BD=await api("/api/builds/data");
  BD.armorById={};BD.armor.forEach(a=>BD.armorById[a.i]=a);
  BD.decoById={};BD.decos.forEach(d=>BD.decoById[d.i]=d);
  BD.talById={};BD.talismans.forEach(t=>BD.talById[t.i]=t);
  BD.skillList=Object.entries(BD.skills).map(([id,s])=>({id,...s})).sort((a,b)=>a.n.localeCompare(b.n));
}
async function loadBuilds(){try{BUILDS=(await api("/api/builds")).builds||[]}catch(e){BUILDS=[]}renderBuildList()}
async function saveBuilds(){await api("/api/builds",{method:"PUT",body:JSON.stringify({builds:BUILDS})})}

const weaponOf=b=>b.artian?makeArtian(b.wtype,b.artian):b.weapon==null?null:(BD.weapons[b.wtype]||[]).find(w=>w.i===b.weapon)||null;
const skName=id=>BD.skills[id]?BD.skills[id].n:("Skill "+id);
const slotTxt=sl=>(sl||[]).filter(x=>x>0).map(x=>"①②③④"[x-1]).join("")||"—";
function skSummary(sk){return Object.entries(sk||{}).filter(([id])=>BD.skills[id]&&!["set","group"].includes(BD.skills[id].k)).map(([id,l])=>`${skName(id)} ${l}`).join(", ")}

// pieces that have slots, in a fixed order: weapon, armor..., talisman
function socketsOf(b){
  const out=[];const w=weaponOf(b);
  if(w)(w.sl||[]).forEach((sz,j)=>sz>0&&out.push({key:`weapon:${j}`,size:sz,on:"weapon"}));
  ASLOTS.forEach(([k])=>{const a=BD.armorById[b.armor[k]];if(a)(a.sl||[]).forEach((sz,j)=>sz>0&&out.push({key:`${k}:${j}`,size:sz,on:"armor"}))});
  const ts=b.talisman==="custom"?b.custom.slots:[];(ts||[]).forEach((sz,j)=>sz>0&&out.push({key:`tal:${j}`,size:sz,on:"armor"}));
  return out;
}

function computeBuild(b){
  const sk={},src={};const add=(id,l,from)=>{sk[id]=(sk[id]||0)+l;(src[id]=src[id]||[]).push(from+" +"+l)};
  const w=weaponOf(b);let atk=0,aff=0,def=0,defMax=0,res={fire:0,water:0,thunder:0,ice:0,dragon:0},els=[];
  if(w){atk=w.atk;aff=w.aff;def+=w.def;defMax+=w.def;els=w.el||[];Object.entries(w.sk).forEach(([id,l])=>add(id,l,w.n))}
  const setCount={};
  ASLOTS.forEach(([k])=>{const a=BD.armorById[b.armor[k]];if(!a)return;def+=a.def.base;defMax+=a.def.max;
    Object.keys(res).forEach(r=>res[r]+=a.res[r]||0);
    Object.entries(a.sk).forEach(([id,l])=>{const s=BD.skills[id];if(s&&(s.k==="set"||s.k==="group"))setCount[id]=(setCount[id]||0)+1;else add(id,l,a.n)})});
  if(b.talisman==="custom"){b.custom.skills.forEach(x=>{if(x.s&&x.l>0)add(x.s,x.l,"Talisman")})}
  else if(b.talisman){const t=BD.talById[b.talisman];if(t)Object.entries(t.sk).forEach(([id,l])=>add(id,l,t.n))}
  const valid=new Set(socketsOf(b).map(s=>s.key));
  Object.entries(b.decos).forEach(([key,did])=>{if(!valid.has(key))return;const d=BD.decoById[did];if(d)Object.entries(d.sk).forEach(([id,l])=>add(id,l,d.n))});
  const bonuses=Object.entries(setCount).map(([id,n])=>{const s=BD.skills[id];const act=(s.r||[]).filter(r=>(r.p||0)<=n&&r.p);const next=(s.r||[]).find(r=>r.p>n);
    return {id,n,kind:s.k,name:s.n,active:act.length?act[act.length-1]:null,next,ranks:s.r}});
  return {sk,src,atk,aff,def,defMax,res,els,bonuses,w};
}

// ---------- rendering ----------
function renderBuildList(){
  const box=$("bList");if(!box)return;const q=sq($("bSearch").value||"");
  const list=BUILDS.map((b,i)=>({b,i})).filter(({b})=>smatch((b.name||"")+" "+(WTYPES.find(w=>w[0]===b.wtype)||["",""])[1]+" "+((BD&&weaponOf(b)||{}).n||""),q));
  box.innerHTML=list.length?list.map(({b,i})=>`<div style="display:flex;align-items:center;gap:2px"><button class="qitem ${bEditing===i?"active":""}" data-bi="${i}">
    <div class="t">${gearIcon(b.wtype,((BD&&b.weapon!=null&&(BD.weapons[b.wtype]||[]).find(x=>x.i===b.weapon))||{}).rar||5,16)} ${esc(b.name||"Untitled build")}</div><div class="s">${esc((WTYPES.find(w=>w[0]===b.wtype)||["",""])[1])}${BD&&weaponOf(b)?" · "+esc(weaponOf(b).n):""}</div></button>
    <button class="btn sm ghost danger" title="Delete" data-bdel="${i}">✕</button></div>`).join(""):`<div class="empty">${q?"No matches.":"Saved builds show up here."}</div>`;
  box.querySelectorAll("[data-bi]").forEach(el=>el.onclick=()=>{bEditing=+el.dataset.bi;B=JSON.parse(JSON.stringify(BUILDS[bEditing]));renderBuild();renderBuildList()});
  box.querySelectorAll("[data-bdel]").forEach(el=>el.onclick=()=>{const i=+el.dataset.bdel;
    $("cTitle").textContent="Delete build?";$("cBody").textContent=`"${BUILDS[i].name||"Untitled build"}" will be removed.`;$("cOk").textContent="Delete";
    $("cOk").onclick=async()=>{closeModal("confirmModal");BUILDS.splice(i,1);if(bEditing===i){bEditing=null;B=newBuild();renderBuild()}else if(bEditing>i)bEditing--;await saveBuilds();renderBuildList()};
    $("confirmModal").classList.add("show")});
}

function pieceRow(label,item,slotKeyPrefix,sl,on,pickFn,extra){
  const lockKey=slotKeyPrefix==='weapon'?'weapon':slotKeyPrefix==='tal'?'tal':slotKeyPrefix;
  const sockets=(sl||[]).map((sz,j)=>sz>0?socketHTML(`${slotKeyPrefix}:${j}`,sz,on):"").join("");
  return `<div class="eq"><div class="eqk">${label}</div>
    <button class="eqbtn" onclick="${pickFn}"><span class="eqi">${gearIcon(lockKey==="weapon"?B.wtype:lockKey,item&&item.rar||(lockKey==="tal"&&item?6:0),26)}</span><span class="eqt">${item?`<span class="eqn">${esc(item.n)}</span><span class="eqm">${item.rar?"R"+item.rar+" · ":""}${esc(extra||skSummary(item.sk)||"no skills")}</span>`:`<span class="eqn" style="color:var(--faint)">Choose ${label.toLowerCase()}…</span>`}</span></button>
    <div class="socks">${sockets}</div><span class="eqx">${item&&lockKey?`<button class="btn sm ghost lockb ${B.locked&&B.locked[lockKey]?"on":""}" title="Lock: the calculator keeps this piece" onclick="toggleLock('${lockKey}')">${B.locked&&B.locked[lockKey]?"🔒":"🔓"}</button>`:""}${item?`<button class="btn sm ghost" title="Remove" onclick="${pickFn.replace("pick","clear")}">✕</button>`:""}</span></div>`;
}
function socketHTML(key,size,on){
  const d=BD.decoById[B.decos[key]];
  return `<button class="sock ${on}" title="${d?esc(d.n+" — "+skSummary(d.sk)):"Empty level "+size+" "+on+" slot"}" onclick="pickDeco('${key}',${size},'${on}')">
    <span class="sgem">${decoIcon(d,20,size)}<b>${size}</b></span>${d?`<span class="dn">${esc(skSummary(d.sk))}</span>`:`<span class="dn" style="color:var(--faint)">empty</span>`}</button>`;
}

function renderBuild(){
  if(!BD||!B) return;
  $("bName").value=B.name||"";
  $("bWtype").innerHTML=WTYPES.map(([k,n])=>`<option value="${k}" ${k===B.wtype?"selected":""}>${n}</option>`).join("");
  const w=weaponOf(B);
  let h=pieceRow("Weapon",w,"weapon",w&&w.sl,"weapon","pickWeapon()",w?`${w.atk} atk${w.aff?` · ${w.aff>0?"+":""}${w.aff}%`:""}${(w.el||[]).map(e=>` · ${e.t} ${e.v}`).join("")}${skSummary(w.sk)?" · "+skSummary(w.sk):""}`:"");
  ASLOTS.forEach(([k,n])=>{const a=BD.armorById[B.armor[k]];h+=pieceRow(n,a,k,a&&a.sl,"armor",`pickArmor('${k}')`,a?`${slotTxt(a.sl)} · ${skSummary(a.sk)||"no skills"}`:"")});
  const t=B.talisman==="custom"?{n:"Custom talisman",sk:Object.fromEntries(B.custom.skills.filter(x=>x.s).map(x=>[x.s,x.l]))}:BD.talById[B.talisman];
  h+=pieceRow("Talisman",t,"tal",B.talisman==="custom"?B.custom.slots:[],"armor","pickTalisman()");
  if(B.talisman==="custom"){
    h+=`<div class="customtal">${B.custom.skills.map((x,i)=>`<div class="inline"><select data-cs="${i}"><option value="">— skill ${i+1} —</option>${BD.skillList.filter(s=>s.k==="armor"||s.k==="weapon").map(s=>`<option value="${s.id}" ${s.id===x.s?"selected":""}>${esc(s.n)}</option>`).join("")}</select>
      <input type="number" min="1" max="7" data-cl="${i}" value="${x.l}" style="width:70px"></div>`).join("")}
      <div class="inline"><span class="hint">Slots</span>${B.custom.slots.map((v,i)=>`<select data-csl="${i}">${[0,1,2,3].map(n=>`<option value="${n}" ${n==v?"selected":""}>${n?"Level "+n:"none"}</option>`).join("")}</select>`).join("")}</div></div>`;
  }
  $("bEquip").innerHTML=h;
  $("bEquip").querySelectorAll("[data-cs]").forEach(el=>el.onchange=()=>{B.custom.skills[+el.dataset.cs].s=el.value;renderBuild()});
  $("bEquip").querySelectorAll("[data-cl]").forEach(el=>el.oninput=()=>{B.custom.skills[+el.dataset.cl].l=Math.max(1,parseInt(el.value||"1",10));renderSummary()});
  $("bEquip").querySelectorAll("[data-csl]").forEach(el=>el.onchange=()=>{B.custom.slots[+el.dataset.csl]=+el.value;renderBuild()});
  renderSummary();
  $("bSaveBtn").textContent=bEditing!==null?"Save changes":"Save build";
}

function renderSummary(){
  const c=computeBuild(B);
  const stat=(k,v)=>`<div class="st"><span>${k}</span><b>${v}</b></div>`;
  let sharp="";
  if(c.w&&c.w.sh){const tot=SHC.reduce((a,_,i)=>a+(c.w.sh[["red","orange","yellow","green","blue","white","purple"][i]]||0),0)||1;
    sharp=`<div class="sharp">${["red","orange","yellow","green","blue","white","purple"].map((k,i)=>c.w.sh[k]?`<i style="flex:${c.w.sh[k]};background:${SHC[i]}"></i>`:"").join("")}</div>`}
  let h=`<div class="sgrid">${stat("Attack",c.w?c.atk:"—")}${stat("Affinity",c.w?(c.aff>0?"+":"")+c.aff+"%":"—")}
    ${stat("Element",c.els.length?c.els.map(e=>`<span style="color:${ELCOL[e.t]||"inherit"}">${e.t} ${e.v}</span>`).join(" "):"—")}
    ${stat("Defense",`${c.def} <span class="hint">(${c.defMax} upgraded)</span>`)}</div>${sharp}
    <div class="res">${Object.entries(c.res).map(([k,v])=>`<span style="color:${ELCOL[k]}">${k}</span> <b class="${v<0?"neg":""}">${v>0?"+":""}${v}</b>`).join(" · ")}</div>`;
  const skills=Object.entries(c.sk).map(([id,l])=>({id,l,s:BD.skills[id]})).filter(x=>x.s).sort((a,b)=>b.l-a.l||a.s.n.localeCompare(b.s.n));
  h+=`<h3>Skills <span class="hint">${skills.length}</span></h3>`;
  h+=skills.length?skills.map(x=>{const max=x.s.max,lv=Math.min(x.l,max),over=x.l>max;
    const desc=(x.s.r[lv-1]||{}).d||x.s.d;
    return `<div class="skl" title="${esc(desc+"\n\nFrom: "+(c.src[x.id]||[]).join(", "))}"><div class="skn">${esc(x.s.n)}${x.s.k==="weapon"?'<span class="tag">weapon</span>':""}</div>
      <div class="pips">${Array.from({length:max},(_,i)=>`<i class="${i<lv?"on":""}"></i>`).join("")}</div><div class="skv ${over?"over":""}">${lv}/${max}${over?` (+${x.l-max} wasted)`:""}</div></div>`}).join(""):`<div class="empty" style="padding:4px 0">Add gear to see skills.</div>`;
  if(c.bonuses.length){h+=`<h3>Set &amp; group bonuses</h3>`+c.bonuses.map(bn=>`<div class="bon ${bn.active?"on":""}" title="${esc(bn.ranks.map(r=>`${r.p} pieces: ${r.n||""} — ${r.d}`).join("\n"))}">
    <div><b>${esc(bn.name)}</b> <span class="hint">${bn.kind==="set"?"set":"group"} · ${bn.n} piece${bn.n>1?"s":""}</span></div>
    <div class="hint">${bn.active?`Active: ${esc(bn.active.n||"")} — ${esc(bn.active.d)}`:""}${bn.next?`${bn.active?"<br>":""}Next at ${bn.next.p} pieces: ${esc(bn.next.n||"")}`:""}</div></div>`).join("")}
  $("bSummary").innerHTML=h;
}

// ---------- "only gear I own" in the editor ----------
let OWN=null, OWN_ON=false;
try{OWN_ON=localStorage.getItem("qmOwnOnly")==="1"}catch(e){}
async function loadOwn(force){if(OWN&&!force)return OWN;try{OWN=await api("/api/owned")}catch(e){OWN={found:false}}
  if(OWN.found){OWN.A=new Set(OWN.armor);OWN.T=new Set(OWN.tal);OWN.W={};Object.entries(OWN.weapons||{}).forEach(([k,v])=>OWN.W[k]=new Set(v))}return OWN}
async function toggleOwnOnly(on){OWN_ON=on;try{localStorage.setItem("qmOwnOnly",on?"1":"0")}catch(e){}
  if(on){const o=await loadOwn(true);if(!o.found){toast(`<b>No gear export yet</b>Load into the game with the data reader installed and your gear is exported automatically.`,true);$("bOwnOnly").checked=false;OWN_ON=false;return}
    toast(`<b>Showing only gear you own</b>From your export: ${o.armor.length} armor pieces, ${Object.values(o.decos).reduce((a,b)=>a+b,0)} decorations.`,false,3000)}}
function ownFilter(kind){if(!OWN_ON||!OWN||!OWN.found)return null;
  if(kind==="weapon")return w=>(OWN.W[B.wtype]||new Set()).has(w.i);
  if(kind==="armor")return a=>OWN.A.has(a.i);
  if(kind==="tal")return t=>t.custom||OWN.T.has(t.i);
  if(kind==="deco")return d=>d.i===""||(OWN.decos[d.i]||0)>0;return null}
function ownItems(items,kind){const f=ownFilter(kind);return f?items.filter(f):items}

// ---------- chooser dialog ----------
let chooser=null;
function openChooser(title,items,rowHTML,onPick,searchText,filters,iconFn){
  chooser={items,rowHTML,onPick,searchText,filters:filters||null,f:null,iconFn:iconFn||null};
  $("chTitle").textContent=title+(OWN_ON&&OWN&&OWN.found?" (gear you own)":"");$("chSearch").value="";
  $("chFilters").innerHTML=filters?filters.map((f,i)=>`<button class="btn sm ${i===0?"primary":""}" data-cf="${i}">${esc(f[0])}</button>`).join(""):"";
  $("chFilters").querySelectorAll("[data-cf]").forEach(el=>el.onclick=()=>{chooser.f=filters[+el.dataset.cf][1];$("chFilters").querySelectorAll("button").forEach(x=>x.classList.toggle("primary",x===el));drawChooser()});
  chooser.f=filters?filters[0][1]:null;
  $("chooser").classList.add("show");drawChooser();setTimeout(()=>$("chSearch").focus(),30);
}
function drawChooser(){
  const q=sq($("chSearch").value);
  if(!chooser.keys)chooser.keys=new Map(chooser.items.map(it=>{const h=skey(chooser.searchText(it));return [it,[h,h.replace(/ /g,"")]]}));
  let list=chooser.items.filter(it=>{if(chooser.f&&!chooser.f(it))return false;const [h,hc]=chooser.keys.get(it);return q.every(w=>h.includes(w)||hc.includes(w))});
  const more=list.length>300;list=list.slice(0,300);
  $("chList").innerHTML=list.map((it,i)=>`<div class="chrow" data-ci="${i}">${chooser.iconFn?`<span class="chi">${chooser.iconFn(it)}</span>`:""}<div style="min-width:0">${chooser.rowHTML(it)}</div></div>`).join("")+(more?`<div class="empty">Showing the first 300. Type to narrow down.</div>`:"")+(list.length?"":`<div class="empty">Nothing matches.</div>`);
  $("chList").querySelectorAll("[data-ci]").forEach(el=>el.onclick=()=>{const it=list[+el.dataset.ci];closeModal("chooser");chooser.onPick(it)});
}
function pickWeapon(){
  const ws=BD.weapons[B.wtype]||[];
  openChooser(`Choose a ${(WTYPES.find(w=>w[0]===B.wtype)||["",""])[1]}`,ownItems([...ws],"weapon").sort((a,b)=>b.rar-a.rar||b.atk-a.atk),
    w=>`<div class="chn">${esc(w.n)} <span class="hint">R${w.rar}</span></div><div class="chm">${w.atk} atk${w.aff?` · ${w.aff>0?"+":""}${w.aff}%`:""}${(w.el||[]).map(e=>` · <span style="color:${ELCOL[e.t]||"inherit"}">${e.t} ${e.v}</span>`).join("")} · slots ${slotTxt(w.sl)}${skSummary(w.sk)?" · "+esc(skSummary(w.sk)):""}</div>`,
    w=>{B.weapon=w.i;delete B.artian;Object.keys(B.decos).forEach(k=>k.startsWith("weapon:")&&delete B.decos[k]);renderBuild()},
    w=>w.n+" "+skSummary(w.sk)+" "+(w.el||[]).map(e=>e.t).join(" "),
    [["All",null],["Rarity 8",w=>w.rar>=8],["Element",w=>(w.el||[]).some(e=>ELCOL[e.t]&&["fire","water","thunder","ice","dragon"].includes(e.t))],["Status",w=>(w.el||[]).some(e=>["poison","paralysis","sleep","blast"].includes(e.t))]],
    w=>gearIcon(B.wtype,w.rar,28));
}
function pickArmor(kind){
  const items=ownItems(BD.armor.filter(a=>a.k===kind),"armor").sort((a,b)=>b.rar-a.rar||b.def.base-a.def.base);
  openChooser(`Choose ${kind} armor`,items,
    a=>`<div class="chn">${esc(a.n)} <span class="hint">R${a.rar} · def ${a.def.base}</span></div><div class="chm">slots ${slotTxt(a.sl)} · ${esc(skSummary(a.sk)||"no skills")}${(()=>{const st=BD.sets[a.set];const x=[st.set&&skName(st.set.s),st.grp&&skName(st.grp.s)].filter(Boolean);return x.length?` · <span style="color:var(--accent2)">${esc(x.join(" / "))}</span>`:""})()}</div>`,
    a=>{B.armor[kind]=a.i;Object.keys(B.decos).forEach(k=>k.startsWith(kind+":")&&delete B.decos[k]);renderBuild()},
    a=>{const st=BD.sets[a.set];return a.n+" "+st.n+" "+skSummary(a.sk)+" "+(st.set?skName(st.set.s):"")+" "+(st.grp?skName(st.grp.s):"")},
    [["All",null],["High rank (R5+)",a=>a.rar>=5],["Rarity 8",a=>a.rar>=8],["3-slot",a=>(a.sl||[]).includes(3)]],
    a=>gearIcon(a.k,a.rar,28));
}
function pickTalisman(){
  const items=[{i:"custom",n:"Custom talisman…",sk:{},rar:0,custom:true},...ownItems([...BD.talismans],"tal").sort((a,b)=>b.rar-a.rar||a.n.localeCompare(b.n))];
  openChooser("Choose a talisman",items,
    t=>t.custom?`<div class="chn">Custom talisman…</div><div class="chm">Enter the skills and slots of a random talisman you own</div>`:`<div class="chn">${esc(t.n)} <span class="hint">R${t.rar}</span></div><div class="chm">${esc(skSummary(t.sk))}</div>`,
    t=>{B.talisman=t.i;Object.keys(B.decos).forEach(k=>k.startsWith("tal:")&&delete B.decos[k]);renderBuild()},
    t=>t.n+" "+skSummary(t.sk),null,t=>gearIcon("tal",t.rar||6,28));
}
function pickDeco(key,size,on){
  const items=[{i:"",n:"Empty slot",sk:{},lv:0,on},...ownItems(BD.decos.filter(d=>d.on===on&&d.lv<=size),"deco").sort((a,b)=>b.lv-a.lv||a.n.localeCompare(b.n))];
  openChooser(`Level ${size} ${on} slot`,items,
    d=>d.i===""?`<div class="chn">Empty slot</div>`:`<div class="chn">${esc(d.n)} <span class="hint">level ${d.lv}</span></div><div class="chm">${esc(skSummary(d.sk))}</div>`,
    d=>{if(d.i==="")delete B.decos[key];else B.decos[key]=d.i;renderBuild()},
    d=>d.n+" "+skSummary(d.sk),null,d=>decoIcon(d.i===""?null:d,26,d.lv||1));
}
function clearWeapon(){B.weapon=null;delete B.artian;renderBuild()}
function clearArmor(k){B.armor[k]=null;renderBuild()}
function clearTalisman(){B.talisman=null;renderBuild()}

// ---------- actions ----------
async function saveBuild(){
  B.name=$("bName").value.trim()||"Untitled build";
  if(bEditing!==null) BUILDS[bEditing]=JSON.parse(JSON.stringify(B)); else {BUILDS.push(JSON.parse(JSON.stringify(B)));bEditing=BUILDS.length-1}
  try{await saveBuilds();renderBuildList();renderBuild();toast(`<b>Build saved</b>${esc(B.name)}`,false,2500)}catch(e){toast(`<b>Couldn't save</b>${esc(e.message)}`,true)}
}
function newBuildUI(){bEditing=null;B=newBuild();renderBuild();renderBuildList();$("bName").focus()}
function copyBuildCode(){
  const code="MHWB1:"+btoa(unescape(encodeURIComponent(JSON.stringify(B))));
  navigator.clipboard.writeText(code).then(()=>toast("<b>Build code copied</b>Send it to a friend; they can paste it with Import.",false,4000),()=>{prompt("Copy this build code:",code)});
}
function importBuild(){
  $("cTitle").textContent="Import a build";
  $("cBody").innerHTML=`<label class="f"><span>Paste a build code (starts with MHWB1:)</span><textarea id="impCode" style="min-height:80px"></textarea></label>`;
  $("cOk").textContent="Import";
  $("cOk").onclick=()=>{try{const c=$("impCode").value.trim();if(!c.startsWith("MHWB1:"))throw 0;
      const b=JSON.parse(decodeURIComponent(escape(atob(c.slice(6)))));B=Object.assign(newBuild(),b);bEditing=null;closeModal("confirmModal");renderBuild();renderBuildList();toast("<b>Build imported</b>Click Save build to keep it.",false,3500)}
    catch(e){toast("<b>That code didn't work</b>Make sure you copied all of it.",true)}};
  $("confirmModal").classList.add("show");
}

let viewInit=false;
async function showView(v){
  document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("on",b.dataset.view===v));try{navCheck()}catch(e){}
  $("questsView").style.display=v==="quests"?"":"none";
  $("buildsView").style.display=v==="builds"?"":"none";
  $("updatesView").style.display=v==="updates"?"":"none";
  $("huntsView").style.display=v==="hunts"?"":"none";
  $("monstersView").style.display=v==="monsters"?"":"none";
  if(v==="monsters"){try{if(!BD)await loadBuildData()}catch(e){}renderMonsterLog().catch(e=>toast(`<b>Couldn't load monsters</b>${esc(e.message)}`,true));
    const ms=$("monSearch");if(!ms._w){ms._w=1;ms.oninput=()=>{MON_Q=ms.value;renderMonsterLog()}}}
  if(v==="updates") renderUpdates();
  if(v==="hunts") renderHunts();
  if(v==="builds"&&!viewInit){viewInit=true;
    try{await loadBuildData();B=B||newBuild();
      $("bOwnOnly").checked=OWN_ON;if(OWN_ON)loadOwn();
      $("bWtype").onchange=()=>{B.wtype=$("bWtype").value;B.weapon=null;delete B.artian;Object.keys(B.decos).forEach(k=>k.startsWith("weapon:")&&delete B.decos[k]);renderBuild()};
      $("bName").oninput=()=>{B.name=$("bName").value};
      $("bSearch").oninput=renderBuildList;$("chSearch").oninput=drawChooser;
      $("chSearch").onkeydown=e=>{if(e.key==="Enter"){const r=$("chList").querySelector("[data-ci]");if(r)r.click()}};
      await loadBuilds();renderBuild();
    }catch(e){viewInit=false;toast(`<b>Couldn't load gear data</b>${esc(e.message)}`,true)}
  }
}

// ---------- import loadouts from the running game ----------
let GM=null;
const PARTS=["head","chest","arms","waist","legs"];
// Turn one piece of game gear (category, ids, decorations) into build fields.
function applyPiece(b,c,v0,v1,acc,notes){
  if(c===1){ // weapon: v0 = weapon type, v1 = weapon id
    const kind=GM.wtypes[v0];if(!kind)return;
    const gid=(GM.weapon[kind]||{})[v1];
    b.wtype=kind;b.weapon=gid??null;
    const w=(BD.weapons[kind]||[]).find(x=>x.i===gid);
    if(!w){notes.add("a weapon the app doesn't know yet");return}
    (acc||[]).forEach((a,j)=>{const d=GM.deco[a];if(d&&w.sl[j]>0)b.decos[`weapon:${j}`]=d});
  }else if(c===0){ // armor: v0 = series, v1 = part
    const kind=PARTS[v1];const si=GM.armor[v0];
    const a=BD.armor.find(x=>x.set===si&&x.k===kind);
    if(!a){notes.add("an armor piece the app doesn't know yet");return}
    b.armor[kind]=a.i;
    (acc||[]).forEach((d0,j)=>{const d=GM.deco[d0];if(d&&a.sl[j]>0)b.decos[`${kind}:${j}`]=d});
  }else if(c===2){ // talisman: v0 = type, v1 = level
    const t=GM.amulet[v0];const id=t?`${t}:${v1}`:null;
    if(id&&BD.talById[id])b.talisman=id;else notes.add("a random talisman (add its skills under Custom talisman)");
  }
}
function buildFromLoadout(lo){
  const b=newBuild();b.name=lo.name||`Loadout ${lo.slot+1}`;b.src=`game:${lo.slot}`;const notes=new Set();b.boxes=(lo.index||[]).slice(0,7);
  (lo.pieces||[]).slice(0,7).forEach(p=>{if(p&&p.c>=0&&!p.none)applyPiece(b,p.c,p.v0,p.v1,p.acc,notes)});
  return {b,notes};
}
function buildFromCurrent(ex){
  const b=newBuild();b.name="Currently equipped";b.src="game:current";const notes=new Set();b.boxes=(ex.current||[]).slice(0,7);
  const byI={};(ex.box||[]).forEach(x=>byI[x.i]=x);
  (ex.current||[]).slice(0,7).forEach(i=>{const x=byI[i];if(!x)return;const c=x.cg>>3;
    applyPiece(b,c,x.v[0],x.v[1],x.acc,notes);if(c===1&&x.bc)notes.add("Artian weapon bonuses (not included yet)")});
  return {b,notes};
}
async function importFromGame(){
  let g;try{g=await api("/api/gear");if(!GM)GM=await api("/api/builds/map")}catch(e){toast(`<b>Couldn't check</b>${esc(e.message)}`,true);return}
  $("cTitle").textContent="Import from game";
  if(!g.found){
    $("cBody").innerHTML=`${g.old?`<p><b>Your data reader is out of date.</b> Update it on the Updates tab, then start the game once more.</p>`:`<p>Your gear is read by the MH Wilds Tools data reader while the game runs.</p>`}
      <ol class="steps"><li>Start Monster Hunter Wilds and load your save.</li><li>Your gear is exported a few seconds after you load in. Or open the REFramework menu (Insert) → MH Wilds Tools data reader → <b>Export my gear now</b>.</li><li>Click Import from game again.</li></ol>`;
    $("cOk").textContent="OK";$("cOk").onclick=()=>closeModal("confirmModal");$("confirmModal").classList.add("show");return;
  }
  const ex=JSON.parse(typeof g.export==="string"?g.export:JSON.stringify(g.export));
  const rows=[buildFromCurrent(ex),...(ex.loadouts||[]).map(buildFromLoadout)];
  const desc=b=>{const w=weaponOf(b);return [w?w.n:null,...PARTS.map(k=>BD.armorById[b.armor[k]]?.n).filter(Boolean)].filter(Boolean).slice(0,3).join(", ")+"…"};
  $("cBody").innerHTML=`<p class="hint">Read from your game at ${esc(ex.time||g.time)}. Pick what to import:</p>
    <div style="max-height:46vh;overflow:auto">${rows.map((r,i)=>{const exists=BUILDS.some(x=>x.src===r.b.src);
      return `<label class="check" style="align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)"><input type="checkbox" data-ri="${i}" ${i>0?"checked":""}>
      <span><b style="color:var(--text)">${esc(r.b.name)}</b>${exists?' <span class="tag">updates existing</span>':""}<br><span class="hint">${esc(desc(r.b))}</span>
      ${r.notes.size?`<br><span class="hint" style="color:var(--warn)">Not included: ${esc([...r.notes].join("; "))}</span>`:""}</span></label>`}).join("")}</div>`;
  $("cOk").textContent="Import selected";
  $("cOk").onclick=async()=>{let n=0;
    $("cBody").querySelectorAll("[data-ri]:checked").forEach(el=>{const b=rows[+el.dataset.ri].b;const k=BUILDS.findIndex(x=>x.src===b.src);
      if(k>=0)BUILDS[k]=b;else BUILDS.push(b);n++});
    closeModal("confirmModal");await saveBuilds();renderBuildList();toast(`<b>${n} build${n===1?"":"s"} imported</b>Pick one from the list to view it.`,false,4000)};
  $("confirmModal").classList.add("show");
}

// ===================== Calculator =====================
let CT=[]; // [{s: skillId, w: wanted level, m: must-have}]
const BANS=new Set();
function renderBans(){const el=$("cBans");if(!el)return;el.innerHTML=BANS.size?`<span class="hint">Banned:</span> `+[...BANS].map(id=>`<button class="chipx" data-unban="${id}">${esc(BD.armorById[id]?.n||id)} ✕</button>`).join(" "):"";el.querySelectorAll("[data-unban]").forEach(b=>b.onclick=()=>{BANS.delete(+b.dataset.unban);renderBans()})}
function builderTab(t){
  document.querySelectorAll(".subtabs button").forEach(b=>b.classList.toggle("on",b.dataset.bt===t));
  $("calcPane").style.display=t==="calc"?"":"none";$("editorPane").style.display=t==="editor"?"":"none";$("dmgPane").style.display=t==="dmg"?"":"none";
  if(t==="calc")renderCalc();
  if(t==="dmg")renderDamage().catch(e=>toast(`<b>Couldn't load damage data</b>${esc(e.message)}`,true));
}
function calcInit(){
  try{if(PREFS.calcSeconds&&$("cSecs"))$("cSecs").value=String(PREFS.calcSeconds)}catch(e){}
  loadHunted().then(()=>{$("cHunted").checked=HUNTED.only;updateHuntedBtn()});
  $("cHunted").onchange=()=>{HUNTED.only=$("cHunted").checked;saveHunted()};
  $("cWtype").innerHTML=WTYPES.map(([k,n])=>`<option value="${k}">${n}</option>`).join("");
  $("cWtype").value=B.wtype;$("cWtype").onchange=renderCalcWeapon;
  if(!$("cAdd")._ac){$("cAdd")._ac=1;$("cAdd")._acEnter=calcAddSkill;
    autocomplete($("cAdd"),()=>BD.skillList.map(x=>({n:x.n,m:{weapon:"weapon",armor:"armor",set:"set bonus",group:"group bonus"}[x.k]||""})),()=>calcAddSkill())}
  $("cAdd").onkeydown=e=>{if(e.key==="Enter")calcAddSkill()};
  renderCalcWeapon();
}
function renderCalcWeapon(){
  const t=$("cWtype").value;const w=B.wtype===t?weaponOf(B):null;
  $("cWeapon").innerHTML=`<option value="">Any ${esc((WTYPES.find(x=>x[0]===t)||["",""])[1])}</option>`+(w?`<option value="${w.i}">${esc(w.n)} (from editor)</option>`:"");
}
function renderCalc(){
  if(!$("cWtype").options.length)calcInit();
  $("cTargets").innerHTML=CT.length?CT.map((x,i)=>{const s=BD.skills[x.s];return `<div class="tgt"><span class="no">${i+1}</span><span>${esc(s.n)}${s.k!=="armor"?` <span class="tag">${s.k}</span>`:""}</span>
    <label class="must" title="Must-have: only show builds that fully reach this"><input type="checkbox" data-tm="${i}" ${x.m?"checked":""}> must</label><select data-tw="${i}">${Array.from({length:s.max},(_,l)=>`<option value="${l+1}" ${l+1===x.w?"selected":""}>${l+1===s.max?"Max ("+s.max+")":"Level "+(l+1)}</option>`).join("")}</select>
    <button class="btn sm ghost" data-up="${i}" title="Higher priority" ${i===0?"disabled":""}>▲</button><button class="btn sm ghost" data-dn="${i}" title="Lower priority" ${i===CT.length-1?"disabled":""}>▼</button><button class="btn sm ghost danger" data-rm="${i}" title="Remove">✕</button></div>`}).join("")
    :`<div class="empty">No skills yet. Example: add Weakness Exploit, then Critical Boost, then Agitator.</div>`;
  $("cTargets").querySelectorAll("[data-tw]").forEach(el=>el.onchange=()=>{CT[+el.dataset.tw].w=+el.value});
  $("cTargets").querySelectorAll("[data-tm]").forEach(el=>el.onchange=()=>{CT[+el.dataset.tm].m=el.checked});
  renderBans();
  $("cTargets").querySelectorAll("[data-up]").forEach(el=>el.onclick=()=>{const i=+el.dataset.up;[CT[i-1],CT[i]]=[CT[i],CT[i-1]];renderCalc()});
  $("cTargets").querySelectorAll("[data-dn]").forEach(el=>el.onclick=()=>{const i=+el.dataset.dn;[CT[i+1],CT[i]]=[CT[i],CT[i+1]];renderCalc()});
  $("cTargets").querySelectorAll("[data-rm]").forEach(el=>el.onclick=()=>{CT.splice(+el.dataset.rm,1);renderCalc()});
}
function calcAddSkill(){
  const v=skey($("cAdd").value).trim(),q=sq($("cAdd").value);if(!q.length)return;
  const s=BD.skillList.find(x=>skey(x.n).trim()===v)||BD.skillList.find(x=>skey(x.n).trim().replace(/ /g,"").startsWith(q.join("")))||BD.skillList.find(x=>smatch(x.n,q));
  if(!s){toast("<b>Skill not found</b>Pick one from the list as you type.",true,2500);return}
  if(!CT.some(x=>x.s===s.id))CT.push({s:s.id,w:s.max});$("cAdd").value="";renderCalc();$("cAdd").focus();
}
function calcFromBuild(){
  const c=computeBuild(B);CT=Object.entries(c.sk).filter(([id])=>BD.skills[id]).sort((a,b)=>b[1]-a[1]).map(([id,l])=>({s:id,w:Math.min(BD.skills[id].max,Math.max(l,1))}));
  c.bonuses.filter(b=>b.active).forEach(b=>CT.push({s:b.id,w:b.active.l||1}));
  $("cWtype").value=B.wtype;renderCalcWeapon();renderCalc();
}
function calcClear(){CT=[];renderCalc();$("cResults").innerHTML=`<div class="empty">Add skills and click Find builds.</div>`}
let calcLast=null;
async function calcRun(){
  if(!CT.length){toast("<b>Add at least one skill</b>",true,2500);return}
  const secs=+($("cSecs")&&$("cSecs").value||6);try{PREFS.calcSeconds=secs;savePrefs()}catch(e){}
  const btn=$("cRun");btn.disabled=true;let left=secs;btn.textContent=`Searching… (up to ${secs} seconds)`;
  const tick=setInterval(()=>{left--;if(left>0)btn.textContent=`Searching… (${left}s left at most)`},1000);
  const wv=$("cWeapon").value;
  const req={wtype:$("cWtype").value,weapon:wv?+wv:null,targets:CT.map(x=>({skill:x.s,want:x.w,must:!!x.m})),owned:$("cOwned").checked,
    talisman:$("cTal").value,minRarity:+$("cRar").value,locks:{},exclude:[...BANS],seconds:secs};
  if(!$("cGamma").checked)BD.armor.forEach(a=>{if(/γ/.test(a.n))req.exclude.push(a.i)});
  if($("cHunted").checked){await loadHunted();const ex=huntedExclusions(req.wtype);req.exclude.push(...ex.armor);req.excludeWeapons=ex.weapons;req.excludeTal=ex.tal;
    if(req.weapon!=null&&ex.weapons.includes(req.weapon))toast("<b>Heads up</b>The weapon you picked needs a monster you haven't hunted yet.",false,3500)}
  if($("cLock").checked&&B.locked){ASLOTS.forEach(([k])=>{if(B.locked[k]&&B.armor[k]!=null)req.locks[k]=B.armor[k]});
    if(B.locked.weapon&&B.weapon!=null&&B.wtype===req.wtype)req.weapon=B.weapon;
    if(B.locked.tal&&B.talisman&&B.talisman!=="custom")req.talisman=B.talisman;}
  try{calcLast={req,res:await api("/api/calc",{method:"POST",body:JSON.stringify(req)})};renderCalcResults()}
  catch(e){toast(`<b>Search failed</b>${esc(e.message)}`,true)}
  clearInterval(tick);btn.disabled=false;btn.textContent="Find builds";
}
function calcToBuild(r,req){
  const b=newBuild();b.wtype=req.wtype;b.weapon=r.weapon;
  ASLOTS.forEach(([k])=>b.armor[k]=r.armor[k]??null);b.talisman=r.talisman||null;b.decos=Object.assign({},r.decos);
  b.name="Calc: "+CT.slice(0,2).map(x=>BD.skills[x.s].n).join(" + ");return b;
}
const SKGLYPH={weapon:'<path d="M18 3l3 3-11 11-3-3z"/><path d="M5 15l4 4-2 2-4-4z"/>',
  armor:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
  set:'<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z"/>',
  group:'<circle cx="8" cy="9" r="4"/><circle cx="16" cy="9" r="4"/><circle cx="12" cy="16" r="4"/>'};
function skillRow(x){
  const sk=BD.skills[x.id];const k=sk.k||"armor";
  const pips=Array.from({length:x.max},(_,i)=>`<i class="${i<x.lv?"on":(x.target&&i<x.want?"miss":"")}"></i>`).join("");
  const short=x.target&&x.lv<x.want;
  return `<div class="skr${x.target?" tg":""}"><span class="skb ${k}"><svg viewBox="0 0 24 24" width="15" height="15"><g fill="currentColor">${SKGLYPH[k]||SKGLYPH.armor}</g></svg></span>
    <div class="skm"><span class="sknm">${esc(sk.n)}</span><span class="gpips">${pips}</span></div>
    <span class="sklv${short?" short":""}">Lv ${x.lv}${short?` <small>/ ${x.want}</small>`:""}</span></div>`;
}
let lastCleared=null;
function clearBuild(){
  lastCleared=JSON.parse(JSON.stringify(B));
  const n=newBuild();n.name=B.name;n.wtype=B.wtype;B=n;renderBuild();
  toast(`<b>Build cleared</b><button class="btn sm" style="margin-top:8px" onclick="undoClear()">Undo</button>`,false,6000);
}
function undoClear(){if(!lastCleared)return;B=lastCleared;lastCleared=null;renderBuild();$("toast").classList.remove("show")}
function calcPieceRow(key,label,it,icon,r){
  const col=it?(RARCOL[it.rar]||"#8a8f96"):"var(--line2)";
  if(!it)return `<div class="cpc none" style="--rc:${col}"><span class="cpi">${gearIcon(icon,0,24)}</span><div class="cpt"><span class="cpl">${label}</span><span class="cpn" style="color:var(--faint)">Any / none</span></div></div>`;
  const sl=(key==="tal"?[]:(it.sl||[]));
  const socks=sl.map((size,j)=>{const d=BD.decoById[r.decos[key+":"+j]];
    return `<span class="csock${d?"":" empty"}" title="${d?esc(d.n):"Empty level "+size+" slot"}">${decoIcon(d||null,16,size)}<b>${size}</b><span>${d?esc(skSummary(d.sk)):"empty"}</span></span>`}).join("");
  const ban=(key!=="weapon"&&key!=="tal"&&r.armor[key]!=null)?`<span class="ban cban" data-ban="${r.armor[key]}" title="Ban this piece from future searches">ban</span>`:"";
  return `<div class="cpc" style="--rc:${col}"><span class="cpi">${gearIcon(icon,it.rar,24)}</span>
    <div class="cpt"><span class="cpl">${label}</span><span class="cpn">${esc(it.n)} <span class="cpr">R${it.rar}</span>${ban}</span>
    ${socks?`<div class="csocks">${socks}</div>`:`<div class="csocks"><span class="hint">${key==="tal"?esc(skSummary(it.sk)):"no slots"}</span></div>`}</div></div>`;
}
function renderCalcResults(){
  const {req,res}=calcLast;const box=$("cResults");
  if(req.owned&&!res.ownedAvailable){box.innerHTML=`<div class="hpnote">You haven't imported your gear yet. Use ⤓ Import from game first, or untick "Only gear I own".</div>`;return}
  if(!res.results||!res.results.length){box.innerHTML=`<div class="hpnote">${esc(res.bottleneck||"No builds found with these settings.")}</div>`;return}
  const head=`<div class="hint" style="margin-bottom:8px">${res.results.length} builds · ${res.complete?"full search":"best found in "+(res.ms/1000).toFixed(1)+"s"} · ${res.checked.toLocaleString()} combinations checked${res.bottleneck?`<br><span style="color:var(--warn)">${esc(res.bottleneck)}</span>`:""}</div>`;
  box.innerHTML=head+res.results.slice(0,100).map((r,i)=>{
    const tset=new Set(req.targets.map(t=>t.skill));
    const tgt=req.targets.map((t,j)=>{const sk=BD.skills[t.skill];return {id:t.skill,lv:r.achieved[j],want:Math.min(t.want||sk.max,sk.max),max:sk.max,target:true}});
    const extra=Object.entries(r.skills).filter(([id,l])=>!tset.has(id)&&BD.skills[id]&&l>0&&!["set","group"].includes(BD.skills[id].k)).sort((a,b)=>b[1]-a[1]).map(([id,l])=>({id,lv:Math.min(l,BD.skills[id].max),max:BD.skills[id].max}));
    const w=r.weapon!=null?(BD.weapons[req.wtype]||[]).find(x=>x.i===r.weapon):null;
    const rows=[["weapon","Weapon",w,req.wtype],...ASLOTS.map(([k,l])=>[k,l,r.armor[k]!=null?BD.armorById[r.armor[k]]:null,k]),["tal","Talisman",r.talisman?BD.talById[r.talisman]:null,"tal"]];
    const pieces=rows.map(([key,label,it,icon])=>calcPieceRow(key,label,it,icon,r)).join("");
    return `<div class="cres"><div class="inline" style="justify-content:space-between"><b>#${i+1}</b><span class="hint">def ${r.defense} · ${r.freeSlots} free slot levels</span></div>
      <div class="sklist">${tgt.map(skillRow).join("")}${extra.length?`<div class="skdiv">Also on this build</div>`+extra.map(skillRow).join(""):""}</div>
      <div class="cpieces">${pieces}</div>
      <button class="btn sm" style="margin-top:10px" data-open="${i}">Open in editor</button></div>`}).join("");
  if(res.room&&res.room.length){
    box.insertAdjacentHTML("afterbegin",`<div class="hpnote" style="display:block"><b>Room for more</b> <span class="hint">(fits in #1's free slots, click to add)</span><div class="chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${res.room.map(x=>`<button class="chipx" data-room="${x.skill}" data-lv="${x.total}">+ ${esc(BD.skills[x.skill].n)} ${x.total}</button>`).join("")}</div></div>`);
    box.querySelectorAll("[data-room]").forEach(el=>el.onclick=()=>{if(!CT.some(x=>x.s===el.dataset.room))CT.push({s:el.dataset.room,w:+el.dataset.lv});renderCalc();calcRun()});
  }
  box.querySelectorAll("[data-ban]").forEach(el=>el.onclick=()=>{BANS.add(+el.dataset.ban);renderBans();toast(`<b>Banned</b>${esc(BD.armorById[+el.dataset.ban].n)} won't be used. Search again to update.`,false,2500)});
  box.querySelectorAll("[data-open]").forEach(el=>el.onclick=()=>{B=calcToBuild(res.results[+el.dataset.open],req);bEditing=null;builderTab("editor");renderBuild();renderBuildList();toast("<b>Opened in the editor</b>Click Save build to keep it.",false,3000)});
}

// ===================== Send a build to the game =====================
async function sendToGame(){
  const body={name:($("bName").value.trim()||B.name||"MH Wilds Tools build"),wtype:B.wtype,weapon:B.weapon,armor:B.armor,talisman:B.talisman,decos:B.decos,boxes:B.boxes||[]};
  let r;
  try{r=await api("/api/gear/send",{method:"POST",body:JSON.stringify(body)})}
  catch(e){$("cTitle").textContent="Send to game";$("cBody").innerHTML=`<p>${esc(e.message)}.</p>`;$("cOk").textContent="OK";$("cOk").onclick=()=>closeModal("confirmModal");$("confirmModal").classList.add("show");return}
  $("cTitle").textContent="Send to game";
  const warn=r.warnings&&r.warnings.length?`<ul class="steps" style="color:var(--warn)">${r.warnings.map(w=>`<li>${esc(w)}</li>`).join("")}</ul>`:"";
  if(!r.ok){
    $("cBody").innerHTML=`<p><b>You don't own every piece of this build yet</b>, so it can't be sent. Missing:</p><ul class="steps">${r.missing.map(m=>`<li>${esc(m)}</li>`).join("")}</ul>${warn}
      <p class="hint">If you got them recently, export your gear again in the game, then use Import from game to refresh what the app knows you own.</p>`;
  }else{
    $("cBody").innerHTML=`<p><b>"${esc(body.name)}" is ready for the game.</b></p>
      <ol class="steps"><li>In the game, press <b>Insert</b>. At the top of the REFramework menu you'll see <i>MH Wilds Tools: loadout waiting</i>.</li>
      <li>Click <b>Write to empty loadout slot</b>. It only uses an empty slot and never overwrites one of yours.</li>
      <li>Open your loadouts in the game and equip it.</li></ol>${warn}
      <p class="hint">${r.backup?`Your save was backed up first, to <code>${esc(r.backup)}</code>.`:"Your save couldn't be backed up automatically. Consider copying it yourself before writing."} To undo, use <b>Undo last loadout write</b> in MH Wilds Tools data reader.</p>`;
  }
  $("cOk").textContent="OK";$("cOk").onclick=()=>closeModal("confirmModal");$("confirmModal").classList.add("show");
}

function toggleLock(k){B.locked=B.locked||{};B.locked[k]=!B.locked[k];renderBuild()}
