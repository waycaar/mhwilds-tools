// ===================== Updates tab =====================
const CHANGELOG=[
 ["1.5.1",["The source code is now on GitHub under the GPL-3.0, with build steps","Quests are built from the official quests in your Permanent Event Quest mod folder instead of copies shipped with the app. If a map's usual quest is missing, another official quest on that map is used","The app no longer contains any files from other mods"]],
 ["1.5",["The app file is now MHWildsTools.exe. Updating from an older version renames it for you and removes the old MHWildsQuestMaker.exe, so update any shortcut you made","Credits thank the people the app is built on by name: LartTyler, praydog and the REFramework contributors, kassent and Rasmus Andersson","No more white box around a tab after you click it","Small text fixes"]],
 ["1.4.12",["The app is now called MH Wilds Tools","New look: Inter typeface, glass header, softer cards and buttons, and a cleaner active tab. Works with every theme","Credits page (star button in the top bar, or Settings → Credits) with a Discord link to copy","Monsters list is split into Monsters and Guardian monsters","Monster pages show hunts logged and your best time from the hunt log, plus best times for normal, tempered and arch-tempered when you have more than one kind. Duplicate log entries no longer count"]],
 ["1.4.11",["Removed the developer probe. Everything it collected (monster strength and health tables) is built into the app now, and the app deletes the old probe from your game folder if it finds it","Data reader v9: your gear is exported automatically once your save has loaded, and again whenever your equipped gear, loadouts or equipment box change. It no longer writes an empty file at the title screen","A checkbox in the reader window turns auto export off if you'd rather press the button yourself","Quests: dropped the \"untested\" warnings for Tempered and Arch-Tempered versions, Arena spawns and monsters outside the built-in list. The only warning left is for a monster on a map it has never appeared on officially","Quests: Arch-Tempered is only offered for monsters that actually come that way (Rey Dau, Uth Duna, Nu Udra, Jin Dahaad, Arkveld). Switching to another monster moves an Arch-Tempered pick to Tempered","Quests: health and attack for every strength level are now built into the app (read from the game's own table), so HP shows for every quest without the data reader","Builds editor: an \"Only gear I own\" checkbox. When ticked, the gear, talisman and decoration pickers only list what's in your last in-game export","Hunt log: a captured monster was sometimes logged a second time as a 1-second \"quest ended\" hunt, and a slain monster could be logged again every second until you left. Fixed in the reader (it skips monsters that are already down or already logged), and old duplicates are hidden"]],
 ["1.4.10",["Fixed: \"+ Add monster\" in the Quests tab did nothing (broken since the Monsters tab was added)"]],
 ["1.4.9",["Calculator: choose how long to search (3 seconds to 1 minute). Longer searches can find better builds and show up to 100 results; the button counts down while it searches","Best builds against a monster uses the same search time (up to 20 seconds per weapon)"]],
 ["1.4.8",["Arch-Tempered can only be ticked for monsters that actually come in that version (Rey Dau, Uth Duna, Nu Udra, Jin Dahaad, Arkveld); for the rest the pill is struck through. Same for the two monsters with no tempered version (Zoh Shia, Guardian Arkveld)"]],
 ["1.4.7",["Hunted, Tempered and Arch-Tempered are tracked separately, each with its own coloured dot in the monster list (green, blue, purple)","Monster pages and the hunted monsters list use toggle pills for each kind"]],
 ["1.4.6",["Monster pages show how well each damage type works (cutting, blunt, shot) with stars, its best part and how many weak points it has; hover a type to see which weapons use it","Hunter's notes name the best damage type"]],
 ["1.4.5",["Monster pages: a Hunted checkbox (with normal / tempered / arch-tempered) for the monster you're looking at, and a View hunted monsters button to see and change them all"]],
 ["1.4.4",["Settings (gear icon, top right): game folder, theme, text and interface size, higher contrast, reduce motion, which tabs show, which tab the app opens on, update checks and the data reader","The Hunts tab hides itself when the data reader isn't installed (or set it to always show or hide)","A red dot on Settings means the game folder needs fixing"]],
 ["1.4.3",["Monster health is built into the app; the data reader no longer scans the game for it","Data reader v8 is much smaller: it only exports your gear and loadouts, writes builds into an empty loadout slot when you ask, and keeps the hunt log. Updating removes the old reader automatically","The reader does far less work while you play: it checks monsters at most every couple of seconds, gives up on things it can't find, and reads its files less often, so the game should stutter less"]],
 ["1.4.2",["Monster weaknesses redone as compact rows in the same style as the skill list: element and status side by side, with stars on the right"]],
 ["1.4.1",["Best builds against a monster can include Artian weapons (checkbox, on by default). The app plans a rarity 8 Artian with the best element, parts and reinforcement rolls for that monster and your skills, and shows the parts and rolls to aim for","Planned Artian builds open in the editor like any other build"]],
 ["1.4",["Public release with everything from 1.3.1 to 1.3.7: Monsters, Hunts and Damage tabs, best builds per monster, hunted monsters, smarter search and small-window support"]],
 ["1.3.7",["Monster pages show what each monster attacks with (fire, thunder, poison, bleeding and so on)","Best builds now add resistance to the monster's attacks (its element's Resistance skill, Blight Resistance, or the ailment's resistance) after the damage skills, and builds with equal damage are ranked by how well they resist it","New look for weaknesses: element and status tiles with icons, coloured star ratings and strength bars; items and tricks shown as works / doesn't work tiles","Tabs no longer get squeezed by a long game folder path"]],
 ["1.3.6",["Best builds against a monster: on any monster's page, pick a weapon type and the app finds the weapons that hit it hardest (damage type, weak spots, element), builds skills around them and ranks the results by damage","The app now fits small windows: the header folds onto two rows, tabs scroll with arrows when they don't fit, and side lists stack above the page on narrow windows"]],
 ["1.3.5",["Monsters tab: a hunter's guide for every large monster. Notes on where to hit, best element and statuses, what items work, a full hitzone table and high/low rank drops","Shows your hunts and best time for each monster, with a button to compare your builds against it"]],
 ["1.3.4",["Hunted monsters: mark each monster as not yet, hunted, tempered or arch-tempered, or fill it in from your hunt log","Calculator option \"Only gear from monsters I've hunted\" skips armor, weapons and talismans you can't craft yet. Arch-Tempered is needed for γ certificate gear"]],
 ["1.3.3",["Hunts tab: every large monster you fight is logged with its time, result and the weapon you used. Personal bests per monster, averages and filters","Damage tab in Builds: pick a monster and compare your builds' damage per hit on every part, with weak points, wounds and conditional skills","Data reader v7: records hunts"]],
 ["1.3.2",["Clear build button in the editor (with undo)","Searching ignores apostrophes, so masters finds Master's Touch. Greek letters work as words or letters (y or gamma for γ), and 3 finds III","Skill and item boxes use the same smarter search","\"Use γ (gamma) armor\" checkbox in the calculator"]],
 ["1.3.1",["Calculator results show skills like the in-game list: skill badge, level pips and Lv, in your theme colors","Skills you asked for are listed first, the rest under \"Also on this build\""]],
 ["1.3",["First public release: everything from 1.2.x tested together","Updates download and install from inside the app"]],
 ["1.2.6",["Online updates: the app checks GitHub for new public releases, then downloads and installs them itself (no more SmartScreen warnings on updates)","Check again button in the Updates tab"]],
 ["1.2.5",["Gear icons: every weapon type, armor piece and talisman has its own icon, colored by rarity","Decorations show as colored gems sized by slot level","New calculator layout: each result lists weapon, head to legs, then talisman top to bottom, with rarity colors, every slot and the decoration in it","Icons are drawn into the app itself, so nothing is downloaded or stored on your PC"]],
 ["1.2.4",["Calculator: must-have skills, lock 🔒 pieces in the editor, ban pieces from results, 'Room for more' suggestions","Smarter search order (better builds found sooner)","Updates install even if your browser renames the file","Data reader v6: learns Artian bonuses and random talisman skills from the game"]],
 ["1.2.3",["Build calculator: list skills in priority order and it maxes the first, then the next, and so on","Send to game: writes a build into an empty in-game loadout slot (with automatic save backup and undo)","Data reader v5"]],
 ["1.2.2",["Import from game: your in-game loadouts and current gear become builds in one click","Updates tab with automatic install of waiting updates","Data reader v4: exports gear, loadouts and decorations"]],
 ["1.2.1",["Version shown in the bottom-right corner","Updates install themselves and old copies are cleaned up","Updates tab","Import from game: step 1 (reads your gear and loadouts)"]],
 ["1.2",["Builds tab: weapons, armor, talismans, decorations, skill totals, set bonuses, build codes","Themes with two adjustable colours","Quest search by name, monster, ID or map","Health updates when you change strength"]],
 ["1.1.1",["Monster badges, wiki icons and drag-and-drop pictures","All 773 Wilds items for rewards","Monster health from game data","Restart app button"]],
 ["1.0",["First release: create, edit and install event quests"]]];
let UP=null, upTimer=null;
async function loadUpdateInfo(){try{UP=await api("/api/update")}catch(e){UP=null}
  const need=UP&&((UP.pending&&UP.pendingNewer)||(UP.probeInstalled&&!UP.probeCurrent));
  const d=document.getElementById("upDot");if(d)d.classList.toggle("on",!!need);return UP}
async function renderUpdates(){
  await loadUpdateInfo();if(!UP)return;
  let a=`<div class="uprow"><div><div class="hint">Installed version</div><div class="big">v${esc(UP.version)}</div><div class="hint">${esc(UP.buildDate||"")}</div></div></div>`;
  if(UP.pending&&UP.pendingNewer){
    a+=`<div class="hpnote" style="border-style:solid;border-color:var(--warn)"><div><b>Update ready: v${esc(UP.pendingVersion||"?")}</b><br>It's waiting next to the app but hasn't been installed yet.</div><span class="sp"></span><button class="btn primary" onclick="forceUpdate()">Force update now</button></div>`;
  }else if(UP.pending){
    a+=`<div class="hpnote"><div>An older update file (v${esc(UP.pendingVersion||"?")}) is next to the app. It's removed automatically the next time the app starts.</div></div>`;
  }else{
    a+=`<div id="upOnline" class="hint">Checking GitHub for a new release…</div>`;
  }
  a+=`<div class="hint" style="margin-top:8px">App folder: <code>${esc(UP.folder||"")}</code></div>`;
  document.getElementById("upApp").innerHTML=a;
  if(document.getElementById("upOnline"))renderOnline(false);
  let p;
  const what=`<div class="hint" style="margin-bottom:8px">Only needed for importing your loadouts, sending builds to the game and the hunt log. Everything else, including monster health, works without it.</div>`;
  if(!UP.probeInstalled) p=`<div class="uprow"><div>Not installed.</div><span style="flex:1"></span><button class="btn" onclick="updProbe()">Install</button></div>`;
  else if(!UP.probeCurrent) p=`<div class="uprow"><div><b style="color:var(--warn)">Out of date.</b> The new reader is smaller: it no longer scans the game for health data.</div><span style="flex:1"></span><button class="btn primary" onclick="updProbe()">Update data reader</button></div>`;
  else p=`<div class="uprow"><div>✔ Up to date.</div><span style="flex:1"></span><button class="btn sm" onclick="updProbe()">Reinstall</button></div>`;

  document.getElementById("upProbe").innerHTML=what+p+`<div class="hint">If the game is running, restart it after updating the script.</div>`;
  document.getElementById("upLog").innerHTML=`<div class="log">${CHANGELOG.map(([v,items])=>`<h4>v${v}</h4><ul>${items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`).join("")}</div>`;
}
async function updProbe(){try{await api("/api/hp",{method:"POST"});try{refreshReaderState()}catch(e){}toast("<b>Data reader updated</b>Restart the game if it's running.",false,4000);renderUpdates()}catch(e){toast(`<b>Couldn't update</b>${esc(e.message)}`,true)}}
let ON=null;
async function loadOnline(force){try{ON=await api("/api/update/online"+(force?"?force=1":""))}catch(e){ON=null}
  if(ON&&ON.ok&&ON.newer){const d=document.getElementById("upDot");if(d)d.classList.add("on")}return ON}
function notesHTML(t){return esc(t||"").split(/\r?\n/).filter(x=>x.trim()).map(x=>x.replace(/^[-*]\s*/,"• ")).join("<br>")}
async function renderOnline(force){
  const el=document.getElementById("upOnline");if(!el)return;
  el.innerHTML="Checking GitHub for a new release…";
  await loadOnline(force);
  const again=`<button class="btn sm" onclick="renderOnline(true)">Check again</button>`;
  if(!ON){el.innerHTML=`Couldn't check for updates. ${again}`;return}
  if(!ON.ok){el.innerHTML=`<div class="uprow"><div>Online updates: ${esc(ON.error||"unavailable")}.</div><span style="flex:1"></span>${again}</div>`;return}
  if(ON.newer){el.outerHTML=`<div id="upOnline" class="hpnote" style="display:block;border-style:solid;border-color:var(--accent)"><b>New release: v${esc(ON.version)}</b>
    <div class="hint" style="margin:6px 0 10px">${notesHTML(ON.notes)||"No release notes."}</div>
    <button class="btn primary" id="dlBtn" onclick="installOnline()">Download and install</button></div>`;return}
  el.innerHTML=`<div class="uprow"><div>✔ You're up to date (latest public release is v${esc(ON.version)}).</div><span style="flex:1"></span>${again}</div>`;
}
async function installOnline(){
  const b=document.getElementById("dlBtn");if(b){b.disabled=true;b.textContent="Downloading…"}
  try{const r=await api("/api/update/download",{method:"POST"});toast(`<b>v${esc(r.version)} downloaded</b>Restarting to install…`,false,2500);setTimeout(()=>restartApp(),1200)}
  catch(e){if(b){b.disabled=false;b.textContent="Download and install"}toast(`<b>Update failed</b>${esc(e.message)}`,true)}
}
function forceUpdate(){clearInterval(upTimer);restartApp()}
// If a newer update is waiting when the app opens, install it automatically after a short countdown.
async function autoUpdateCheck(){
  await loadUpdateInfo();
  if(!(UP&&UP.pending&&UP.pendingNewer)){
    if(window.PREFS&&PREFS.autoUpdate===false)return;
    await loadOnline(false);
    if(!(ON&&ON.ok&&ON.newer))return;
    const o=document.createElement("div");o.id="autoUp";
    o.style.cssText="position:fixed;inset:0;z-index:98;background:rgba(0,0,0,.6);display:grid;place-items:center";
    o.innerHTML=`<div class="card" style="max-width:480px"><h2>Update available: v${esc(ON.version)}</h2>
      <div class="hint" style="max-height:220px;overflow:auto;margin-bottom:12px">${notesHTML(ON.notes)||"A new version is out."}</div>
      <div class="inline" style="justify-content:flex-end"><button class="btn ghost" id="upLater">Later</button><button class="btn primary" id="dlBtn">Download and install</button></div></div>`;
    document.body.appendChild(o);
    document.getElementById("upLater").onclick=()=>{o.remove();toast("<b>Update postponed</b>Install it any time from the Updates tab.",false,4000)};
    document.getElementById("dlBtn").onclick=()=>installOnline();
    return;
  }
  let n=5;
  const o=document.createElement("div");o.id="autoUp";
  o.style.cssText="position:fixed;inset:0;z-index:98;background:rgba(0,0,0,.6);display:grid;place-items:center";
  o.innerHTML=`<div class="card" style="max-width:420px;text-align:center"><h2 style="justify-content:center">Update ready</h2>
    <p>Installing <b>v${esc(UP.pendingVersion||"?")}</b> in <b id="upN">${n}</b>…</p>
    <div class="inline" style="justify-content:center"><button class="btn ghost" id="upLater">Not now</button><button class="btn primary" id="upNow">Update now</button></div></div>`;
  document.body.appendChild(o);
  document.getElementById("upNow").onclick=()=>{o.remove();forceUpdate()};
  document.getElementById("upLater").onclick=()=>{clearInterval(upTimer);o.remove();toast("<b>Update postponed</b>Install it any time from the Updates tab.",false,4000)};
  upTimer=setInterval(()=>{n--;const e=document.getElementById("upN");if(e)e.textContent=n;if(n<=0){o.remove();forceUpdate()}},1000);
}
setTimeout(autoUpdateCheck,1200);
