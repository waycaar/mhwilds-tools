// ===================== Themes =====================
// Every theme is just two hues. All shades are derived with fixed saturation and
// lightness, so every theme keeps the same muted, warm-dark look.
const THEMES=[
  {n:"Ember",h1:34,h2:38},{n:"Frost",h1:212,h2:195},{n:"Verdant",h1:120,h2:88},
  {n:"Abyss",h1:228,h2:172},{n:"Crimson",h1:356,h2:44},{n:"Royal",h1:272,h2:300},
  {n:"Storm",h1:200,h2:48},{n:"Sakura",h1:330,h2:345},{n:"Volcanic",h1:12,h2:20}];
const hsl=(h,s,l)=>`hsl(${h} ${s}% ${l}%)`;
function themeVars(h1,h2){
  return {"--bg":hsl(h1,15,7),"--panel":hsl(h1,14,10),"--panel2":hsl(h1,13,13),"--line":hsl(h1,13,19),"--line2":hsl(h1,13,25),
    "--text":hsl(h1,30,89),"--muted":hsl(h1,12,60),"--faint":hsl(h1,10,43),"--field":hsl(h1,16,6),"--aside":hsl(h1,16,8),
    "--head1":hsl(h1,14,11),"--head2":hsl(h1,15,8.5),"--deep":hsl(h1,16,5),"--footer":`hsl(${h1} 15% 7% / .96)`,"--chip":hsl(h1,13,15),
    "--accent":hsl(h2,73,55),"--accent2":hsl(h2,83,67),"--accentInk":hsl(h2,60,7)};
}
let THEME={h1:34,h2:38};
function applyTheme(h1,h2,save){
  THEME={h1:+h1,h2:+h2};
  const v=themeVars(THEME.h1,THEME.h2);
  if(window.PREFS&&PREFS.contrast){Object.assign(v,{"--text":hsl(THEME.h1,20,96),"--muted":hsl(THEME.h1,12,78),"--faint":hsl(THEME.h1,10,64),"--line":hsl(THEME.h1,13,30),"--line2":hsl(THEME.h1,13,40)})}Object.entries(v).forEach(([k,x])=>document.documentElement.style.setProperty(k,x));
  const s1=document.getElementById("hue1"),s2=document.getElementById("hue2");
  if(s1){s1.value=THEME.h1;s2.value=THEME.h2;document.getElementById("sw1").style.background=hsl(THEME.h1,14,16);document.getElementById("sw2").style.background=hsl(THEME.h2,73,55)}
  document.querySelectorAll("#themeList button").forEach(b=>b.classList.toggle("on",+b.dataset.h1===THEME.h1&&+b.dataset.h2===THEME.h2));
  if(save){clearTimeout(window._ts);window._ts=setTimeout(()=>api("/api/settings",{method:"POST",body:JSON.stringify({theme:THEME})}).catch(()=>{}),300)}
}
function openTheme(){
  document.getElementById("themeList").innerHTML=THEMES.map(t=>`<button data-h1="${t.h1}" data-h2="${t.h2}" style="background:${hsl(t.h1,14,10)}">
    <span style="font-weight:700;color:${hsl(t.h1,30,89)}">${t.n}</span><span class="sw"><i style="background:${hsl(t.h1,13,19)}"></i><i style="background:${hsl(t.h2,73,55)}"></i><i style="background:${hsl(t.h2,83,67)}"></i></span></button>`).join("");
  document.querySelectorAll("#themeList button").forEach(b=>b.onclick=()=>applyTheme(b.dataset.h1,b.dataset.h2,true));
  document.getElementById("hue1").oninput=e=>applyTheme(e.target.value,THEME.h2,true);
  document.getElementById("hue2").oninput=e=>applyTheme(THEME.h1,e.target.value,true);
  applyTheme(THEME.h1,THEME.h2,false);
  document.getElementById("themeModal").classList.add("show");
}
(async()=>{try{const s=await api("/api/settings");if(s.prefs&&window.loadPrefs)loadPrefs(s.prefs);if(s.theme)applyTheme(s.theme.h1,s.theme.h2,false);else applyTheme(THEME.h1,THEME.h2,false)}catch(e){}})();
