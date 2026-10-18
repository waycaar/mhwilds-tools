// ===================== Hunted monsters =====================
// Which monsters you've hunted, and at what level (normal, tempered, arch-tempered).
// The calculator can skip gear you can't craft yet. Saved in the app folder.
// kinds[g] = [normal, tempered, arch-tempered], each ticked on its own. levels[g] (highest ticked) is kept for older files.
let HUNTED={levels:{},kinds:{},only:false}, HUNTED_LOADED=false;
const HKIND=[["Hunted","n"],["Tempered","t"],["Arch-Tempered","a"]];
async function loadHunted(){if(HUNTED_LOADED)return HUNTED;try{const r=await api("/api/hunted");HUNTED={levels:r.levels||{},kinds:r.kinds||{},only:!!r.only};
  Object.entries(HUNTED.levels).forEach(([g,l])=>{if(!HUNTED.kinds[g]&&l>=0)HUNTED.kinds[g]=[true,l>=1,l>=2]})}catch(e){}HUNTED_LOADED=true;return HUNTED}
function saveHunted(){api("/api/hunted",{method:"PUT",body:JSON.stringify(HUNTED)}).catch(e=>toast(`<b>Couldn't save</b>${esc(e.message)}`,true))}
// Which versions of each monster can actually appear (checked against MHDB, quest data and Capcom's update notes:
// only Rey Dau, Uth Duna, Nu Udra, Jin Dahaad and Arkveld come as Arch-Tempered).
const CAN_TEMPERED=new Set(["-1916429696", "-1547364608", "-1528962176", "-1440201088", "-1363370496", "-1083842944", "-758250816", "-535078400", "-34937520", "15", "16", "25", "26", "33", "13052", "21849", "32634", "107194928", "222933952", "402056736", "567628288", "746996864", "777460864", "1049705664", "1401863296", "1411933184", "1467998976", "1553456768", "1657778432", "1663995904", "1965232896", "2129596800"]), CAN_ARCH=new Set(["-1547364608", "746996864", "1467998976", "1553456768", "1657778432"]);
function canKind(g,i){g=String(g);return i===0||(i===1&&CAN_TEMPERED.has(g))||(i===2&&CAN_ARCH.has(g))}
const KIND_NA=["","This monster doesn't appear as Tempered","This monster doesn't appear as Arch-Tempered"];
function kindPill(g,i,attr){const l=HKIND[i][0];if(!canKind(g,i))return `<button class="hk k${i} na" disabled title="${KIND_NA[i]}"><i></i>${l}</button>`;
  return `<button class="hk k${i} ${huntKinds(g)[i]?"on":""}" ${attr}="${i}" data-hg="${g}"><i></i>${l}</button>`}
function huntKinds(g){const k=(HUNTED.kinds[String(g)]||[false,false,false]).slice();for(let i=1;i<3;i++)if(!canKind(g,i))k[i]=false;return k}
function setKind(g,i,on){const k=huntKinds(g).slice();k[i]=on;HUNTED.kinds[String(g)]=k;const l=k[2]?2:k[1]?1:k[0]?0:-1;HUNTED.levels[String(g)]=l;saveHunted()}
function huntLv(g){const k=huntKinds(g);return k[2]?2:k[1]?1:k[0]?0:-1}
function huntDots(g){const k=huntKinds(g);return k.map((on,i)=>on?`<span class="hdot l${i}" title="${HKIND[i][0]}"></span>`:"").join("")}
function canCraft(req){return !(req||[]).some(([g,v])=>huntLv(g)<v)}
function huntedCount(){return Object.keys(BD.monsters||{}).filter(g=>huntLv(g)>=0).length}

// What each monster (and each level) unlocks, for the list
function unlockInfo(){
  const info={};const add=(g,v,label)=>{const x=info[g]=info[g]||{n:0,arch:new Set(),archN:0};x.n++;if(v===2){x.archN++;x.arch.add(label)}};
  BD.armor.forEach(a=>(a.req||[]).forEach(([g,v])=>add(g,v,BD.sets[a.set]?BD.sets[a.set].n:a.n)));
  Object.values(BD.weapons).forEach(l=>l.forEach(w=>(w.req||[]).forEach(([g,v])=>add(g,v,w.n))));
  BD.talismans.forEach(t=>(t.req||[]).forEach(([g,v])=>add(g,v,t.n.replace(/ [IVX]+$/,""))));
  return info;
}
// Tempered drops the gear data doesn't list per monster
const TEMPERED_NOTE="Tempered hunts also drop Artian weapon parts and Wyverian Bloodstones.";

async function openHunted(){
  await loadHunted();const info=unlockInfo();
  const mons=Object.entries(BD.monsters).sort((a,b)=>a[1].localeCompare(b[1]));
  const icon=g=>{try{const m=D.monsters.find(x=>String(x.id)===String(g));return m?badge(m,30):""}catch(e){return ""}};
  $("huntedList").innerHTML=mons.map(([g,n])=>{const i=info[g]||{n:0,arch:new Set(),archN:0};const lv=huntLv(g);
    return `<div class="hmrow"><span class="hmi">${icon(g)}</span>
      <div class="hmn"><b>${esc(n)}</b><div class="hint">${i.n?`${i.n} gear pieces need it`:"no gear needs it"}${i.archN?` · Arch-Tempered unlocks ${esc([...i.arch].slice(0,3).join(", "))}${i.arch.size>3?"…":""}`:""}</div></div>
      <div class="hkinds">${HKIND.map((x,i)=>kindPill(g,i,"data-hk")).join("")}</div></div>`}).join("");
  $("huntedList").querySelectorAll("[data-hk]").forEach(b=>b.onclick=()=>{const on=!b.classList.contains("on");setKind(b.dataset.hg,+b.dataset.hk,on);
    b.classList.toggle("on",on);updateHuntedBtn();
    try{if($("monstersView").style.display!=="none"){if(b.dataset.hg===String(MON_SEL))drawMonster();renderMonsterLog()}}catch(e){}});
  const note=document.querySelector("#huntedModal .hint");if(note)note.innerHTML=note.innerHTML.replace("TEMPEREDNOTE",TEMPERED_NOTE);
  $("huntedModal").classList.add("show");
}
function huntedAll(v){Object.keys(BD.monsters).forEach(g=>{HUNTED.kinds[g]=v<0?[false,false,false]:[true,huntKinds(g)[1],huntKinds(g)[2]];HUNTED.levels[g]=huntLv(g)});saveHunted();openHunted();updateHuntedBtn()}
async function huntedFromLog(){
  try{const h=await api("/api/hunts");const d=await api("/api/dmgdata");let n=0;
    (h.hunts||[]).forEach(x=>{if(!["slain","captured","captured or left"].includes(x.result))return;
      const g=d.rt2fx[String(x.em_id)];if(g==null||!BD.monsters[String(g)])return;
      const lv=Math.min(2,Math.max(0,x.legendary||0));if(canKind(g,lv)&&!huntKinds(g)[lv]){setKind(g,lv,true);n++}});openHunted();updateHuntedBtn();
    toast(n?`<b>Updated ${n} monsters</b>From your hunt log.`:`<b>Nothing new</b>Your hunt log has no hunts beyond what's already marked.`,false,3500);
  }catch(e){toast(`<b>Couldn't read the hunt log</b>${esc(e.message)}`,true)}
}
function updateHuntedBtn(){const b=$("cHuntedBtn");if(b&&BD)b.textContent=`Hunted monsters (${huntedCount()}/${Object.keys(BD.monsters).length})`}
// Exclusions for the calculator
function huntedExclusions(wtype){
  const ex={armor:[],weapons:[],tal:[]};
  BD.armor.forEach(a=>{if(!canCraft(a.req))ex.armor.push(a.i)});
  (BD.weapons[wtype]||[]).forEach(w=>{if(!canCraft(w.req))ex.weapons.push(w.i)});
  BD.talismans.forEach(t=>{if(!canCraft(t.req))ex.tal.push(t.i)});
  return ex;
}
