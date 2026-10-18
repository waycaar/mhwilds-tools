// ===================== Settings =====================
// One place for the game folder, theme, which tabs show, text size and accessibility options.
window.PREFS={tabs:{quests:true,builds:true,monsters:true,hunts:"auto"},textSize:100,reduceMotion:false,contrast:false,startTab:"quests",autoUpdate:true};
const TABN=[["quests","Quests","Make and install custom event quests"],["builds","Builds","Build editor, calculator and damage comparison"],["monsters","Monsters","Monster guide and best builds per monster"],["hunts","Hunts","Your hunt log (needs the data reader)"]];
let READER_ON=null;
function loadPrefs(p){try{const o=typeof p==="string"?JSON.parse(p):p;if(o&&typeof o==="object"){PREFS=Object.assign({},PREFS,o);PREFS.tabs=Object.assign({quests:true,builds:true,monsters:true,hunts:"auto"},o.tabs||{})}}catch(e){}applyPrefs()}
function savePrefs(){clearTimeout(window._ps);window._ps=setTimeout(()=>api("/api/settings",{method:"POST",body:JSON.stringify({prefs:PREFS})}).catch(()=>{}),250)}
function tabOn(k){const v=PREFS.tabs[k];if(v==="auto")return READER_ON!==false;return v!==false}
function applyPrefs(){
  document.body.style.zoom=(PREFS.textSize||100)/100;
  document.documentElement.classList.toggle("rm",!!PREFS.reduceMotion);
  try{applyTheme(THEME.h1,THEME.h2,false)}catch(e){}
  document.querySelectorAll(".nav button[data-view]").forEach(b=>{const v=b.dataset.view;if(v==="updates")return;b.style.display=tabOn(v)?"":"none"});
  const cur=document.querySelector(".nav button.on");
  if(cur&&cur.style.display==="none"){const first=[...document.querySelectorAll(".nav button[data-view]")].find(b=>b.style.display!=="none");if(first)showView(first.dataset.view)}
  try{navCheck()}catch(e){}
}
async function refreshReaderState(){try{const u=await api("/api/update");READER_ON=!!u.probeInstalled}catch(e){}applyPrefs()}
function openSettings(){
  const g=typeof GAME!=="undefined"?GAME:null;const gok=g&&g.gameFound;
  const seg=(key,opts,val)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" class="${String(val)===String(v)?"on":""}" data-pref="${key}" data-val="${v}">${l}</button>`).join("")}</div>`;
  $("setBody").innerHTML=`
    <div class="sset"><h3>Game folder</h3>
      <div class="setrow"><span class="sdot ${gok?(g.peqInstalled?"ok":"warn"):"bad"}"></span><div class="sgrow"><div class="spath">${esc(g&&g.path?g.path:"Not set")}</div><div class="hint">${esc(g?g.message||"":"")}</div></div><button class="btn sm" onclick="closeModal('settingsModal');openGame()">Change</button></div></div>
    <div class="sset"><h3>Look</h3>
      <div class="setrow"><div class="sgrow"><b>Theme</b><div class="hint">Presets and two adjustable colours</div></div><button class="btn sm" onclick="closeModal('settingsModal');openTheme()">🎨 Change theme</button></div>
      <div class="setrow"><div class="sgrow"><b>Text and interface size</b><div class="hint">Scales the whole app</div></div>${seg("textSize",[[90,"Small"],[100,"Normal"],[115,"Large"],[130,"Larger"]],PREFS.textSize)}</div></div>
    <div class="sset"><h3>Accessibility</h3>
      <label class="setrow"><div class="sgrow"><b>Higher contrast</b><div class="hint">Brighter text and borders</div></div><input type="checkbox" class="tgl" data-prefb="contrast" ${PREFS.contrast?"checked":""}></label>
      <label class="setrow"><div class="sgrow"><b>Reduce motion</b><div class="hint">Turns off animations and smooth scrolling</div></div><input type="checkbox" class="tgl" data-prefb="reduceMotion" ${PREFS.reduceMotion?"checked":""}></label></div>
    <div class="sset"><h3>Tabs</h3>
      ${TABN.map(([k,n,d])=>`<div class="setrow"><div class="sgrow"><b>${n}</b><div class="hint">${d}${k==="hunts"&&PREFS.tabs.hunts==="auto"?` · ${READER_ON?"shown: data reader is installed":"hidden: data reader isn't installed"}`:""}</div></div>
        ${k==="hunts"?seg("tab:"+k,[["auto","Auto"],["true","Show"],["false","Hide"]],PREFS.tabs[k]):`<input type="checkbox" class="tgl" data-tab="${k}" ${PREFS.tabs[k]!==false?"checked":""}>`}</div>`).join("")}
      <div class="setrow"><div class="sgrow"><b>Open on</b><div class="hint">The tab the app starts on</div></div><select id="setStart" style="width:auto">${TABN.filter(([k])=>tabOn(k)).map(([k,n])=>`<option value="${k}" ${PREFS.startTab===k?"selected":""}>${n}</option>`).join("")}</select></div></div>
    <div class="sset"><h3>Updates and data reader</h3>
      <label class="setrow"><div class="sgrow"><b>Check for updates when the app opens</b><div class="hint">You can always check from the Updates tab</div></div><input type="checkbox" class="tgl" data-prefb="autoUpdate" ${PREFS.autoUpdate!==false?"checked":""}></label>
      <div class="setrow"><div class="sgrow"><b>Data reader</b><div class="hint">${READER_ON?"Installed. Used for loadouts, sending builds and the hunt log.":"Not installed. Only needed for loadouts, sending builds and the hunt log."}</div></div><button class="btn sm" onclick="closeModal('settingsModal');showView('updates')">Manage</button></div>
      <div class="setrow"><div class="sgrow"><b>Credits</b><div class="hint">Who made this and what it's built on</div></div><button class="btn sm" onclick="closeModal('settingsModal');openCredits()">Open</button></div>
      <div class="setrow"><div class="sgrow"><b>Restart the app</b><div class="hint">Your current quest form is kept</div></div><button class="btn sm" onclick="restartApp()">⟳ Restart</button></div></div>`;
  const b=$("setBody");
  b.querySelectorAll("[data-pref]").forEach(x=>x.onclick=()=>{const k=x.dataset.pref,v=x.dataset.val;
    if(k.startsWith("tab:"))PREFS.tabs[k.slice(4)]=v==="auto"?"auto":v==="true";else PREFS[k]=isNaN(+v)?v:+v;savePrefs();applyPrefs();openSettings()});
  b.querySelectorAll("[data-prefb]").forEach(x=>x.onchange=()=>{PREFS[x.dataset.prefb]=x.checked;savePrefs();applyPrefs()});
  b.querySelectorAll("[data-tab]").forEach(x=>x.onchange=()=>{PREFS.tabs[x.dataset.tab]=x.checked;savePrefs();applyPrefs();openSettings()});
  $("setStart").onchange=()=>{PREFS.startTab=$("setStart").value;savePrefs()};
  $("settingsModal").classList.add("show");
}
// ---------- credits ----------
const CREDITS=[
  ["LartTyler","mhdb-wilds-data: the gear, skill and monster data behind the builds and the monster guide (GPL-3.0)","https://github.com/LartTyler/mhdb-wilds-data"],
  ["praydog and the REFramework contributors","REFramework, which runs the data reader and makes Wilds modding possible","https://github.com/praydog/REFramework"],
  ["kassent","Permanent Event Quests and Custom Quest Loader, which loads the quests this app makes and keeps the official quests they're built from","https://www.nexusmods.com/monsterhunterwilds/mods/1096"],
  ["Rasmus Andersson","The Inter typeface used in the app (SIL Open Font License)","https://rsms.me/inter/"],
  ["Everyone who tested early builds","For the bug reports and screenshots",""],
];
function openCredits(){
  const ver=(document.getElementById("ver")||{}).textContent||"";
  $("credBody").innerHTML=`<div class="credhero">
      <div class="credlogo"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg></div>
      <div><div class="credname">MH Wilds <b>Tools</b></div><div class="hint">${esc(ver)} · Quests, builds &amp; hunts for Monster Hunter Wilds</div></div></div>
    <div class="credmade"><div class="hint">Made by</div><div class="credwho">waycock</div>
      <button class="discord" onclick="copyDiscord()" title="Copy Discord username"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18.2 18.2 0 0 0-5.6 0L8.6 3a19.6 19.6 0 0 0-4.9 1.4C.6 9 -.3 13.5.1 18a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-.9l.5-.4a14 14 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 .9L18 21a19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.7-3.7-13.6zM8.3 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm7.4 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg><span>waycock</span><small id="dcCopied">Copy</small></button>
      <div class="hint" style="margin-top:6px">Questions, bugs or ideas? Add me on Discord.</div></div>
    <div class="credthanks">Thanks to the people whose work this is built on</div><div class="credlist">${CREDITS.map(([t,d,u])=>`<div class="credrow"><div><b>${esc(t)}</b><div class="hint">${esc(d)}</div></div>${u?`<button class="btn sm ghost" onclick="openUrl('${u}')">Open ↗</button>`:""}</div>`).join("")}</div>
    <div class="hint" style="margin-top:14px;text-align:center">Monster Hunter Wilds is a trademark of Capcom. This is a fan-made tool and isn't affiliated with or endorsed by Capcom.</div>`;
  $("creditsModal").classList.add("show");
}
async function copyDiscord(){try{await navigator.clipboard.writeText("waycock")}catch(e){const t=document.createElement("textarea");t.value="waycock";document.body.appendChild(t);t.select();document.execCommand("copy");t.remove()}
  const c=$("dcCopied");if(c){c.textContent="Copied";setTimeout(()=>c.textContent="Copy",1500)}}
async function openUrl(u){try{await api("/api/openurl?u="+encodeURIComponent(u))}catch(e){toast(`<b>Couldn't open the link</b>${esc(u)}`,true)}}
setTimeout(refreshReaderState,600);
