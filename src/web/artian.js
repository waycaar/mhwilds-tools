// ===================== Artian weapons (rarity 8, planned rolls) =====================
// Artian weapons aren't in the gear data, so the app builds one from community-published numbers:
// base 190 attack / 5% affinity, three parts that each give +5 attack or +5% affinity, element from
// three matching parts (plus the infusion bonus), and five reinforcements:
// Attack +5 (up to 5), Affinity +5% (up to 3), Element +X (up to 4), Sharpness +30 (up to 2).
const ART_EL={"great-sword":450,"long-sword":270,"sword-shield":260,"dual-blades":250,"hammer":320,"hunting-horn":320,"lance":270,
  "gunlance":270,"switch-axe":320,"charge-blade":300,"insect-glaive":270,"bow":270,"light-bowgun":0,"heavy-bowgun":0};
const ART_INF={"sword-shield":20,"dual-blades":20};            // others +30
const ART_ELB={"great-sword":80,"long-sword":50,"hammer":50,"hunting-horn":50,"lance":50,"gunlance":50,"charge-blade":50,
  "sword-shield":30,"switch-axe":30,"insect-glaive":30,"bow":30,"dual-blades":20,"light-bowgun":0,"heavy-bowgun":0};
const ART_NAME={"great-sword":"Varianza","long-sword":"Dimensius","sword-shield":"Verdoloto","dual-blades":"Tiltkreise","hammer":"Moteurvankel",
  "hunting-horn":"Omiltika","lance":"Skyscraper","gunlance":"Argenesis","switch-axe":"Mundus Altus","charge-blade":"Chrono Gear",
  "insect-glaive":"Diprielcha","light-bowgun":"Animilater","heavy-bowgun":"Greifen","bow":"Angelbein"};
const ART_SHARP={red:80,orange:40,yellow:60,green:80,blue:70,white:60,purple:0};
const _artCache=new Map();
function makeArtian(wt,a){
  const k=wt+JSON.stringify(a);if(_artCache.has(k))return _artCache.get(k);
  const r=a.rolls||{a:0,f:0,e:0,s:0};const ranged=wt==="bow"||wt==="light-bowgun"||wt==="heavy-bowgun";
  const el=a.el&&ART_EL[wt]?[{t:a.el,v:ART_EL[wt]+(ART_INF[wt]||30)+(r.e||0)*(ART_ELB[wt]||0)}]:[];
  const w={i:-1,artian:true,n:`${ART_NAME[wt]||"Artian"} (Artian${a.el?", "+a.el:""})`,rar:8,atk:190+5*(a.atk||0)+5*(r.a||0),aff:5+5*(3-(a.atk||0))+5*(r.f||0),
    def:0,sl:[3,3,3],sk:{},el,sh:ranged?null:Object.assign({},ART_SHARP,{white:ART_SHARP.white+30*(r.s||0)}),hc:null};
  _artCache.set(k,w);return w;
}
function artianLabel(a){const r=a.rolls||{};const roll=[["Attack",r.a],["Affinity",r.f],["Element",r.e],["Sharpness",r.s]].filter(x=>x[1]>0).map(([n,c])=>`${n} ×${c}`).join(", ");
  return `Parts: ${a.atk||0} attack, ${3-(a.atk||0)} affinity · Rolls: ${roll||"none"}`}
// Every legal combination of parts and the five reinforcements
function artianSpecs(wt,el){
  const out=[];const canEl=!!el&&(ART_ELB[wt]||0)>0;
  for(let atk=0;atk<=3;atk++)for(let a=0;a<=5;a++)for(let f=0;f<=3;f++)for(let e=0;e<=(canEl?4:0);e++){
    const s=5-a-f-e;if(s<0||s>2)continue;out.push({el:el||null,atk,rolls:{a,f,e,s}})}
  return out;
}
// Best parts + rolls for a build against one monster (score = damage on its best part)
function bestArtian(m,b,el,opt){
  let best=null;
  for(const spec of artianSpecs(b.wtype,el)){const t=Object.assign({},b,{artian:spec});const d=bestPartFor(m,t,opt);
    if(d.r&&(!best||d.r.total>best.d.r.total))best={spec,d}}
  return best;
}
