// ===================== Gear icons =====================
// Original icon set drawn for this app (not taken from the game). Built into the .exe.
const RARCOL={1:"#9aa1a8",2:"#c8ccd0",3:"#9ccc65",4:"#43a047",5:"#29b6f6",6:"#7e57c2",7:"#ec407a",8:"#ff9800"};
const GEMCOL={white:"#e8e8e8",blue:"#3f7fe0",yellow:"#f1c232",purple:"#9c5bd6",red:"#e05050",rose:"#e8799c",sky:"#6cc4f0",gray:"#9a9a9a",
  emerald:"#2fb27a",brown:"#a6764a",ultramarine:"#3949c9",lemon:"#e6e65a",ivory:"#f2ead0",pink:"#f39bc8",vermilion:"#ec5a2e",
  "moss-green":"#7a9a3a",green:"#46b04a","dark-purple":"#5e2f8a","sage-green":"#9cb38a"};
const GPATH={
  head:'<path d="M4 14a8 8 0 0 1 16 0v4h-3.5v-3h-2v5h-5v-5h-2v3H4z"/><path d="M12 6v8" stroke="rgba(0,0,0,.35)" stroke-width="1.4" fill="none"/>',
  chest:'<path d="M7 3.5 9.5 5h5L17 3.5l4 4.5-3 3V21H6V11L3 8z"/><path d="M12 6v14" stroke="rgba(0,0,0,.35)" stroke-width="1.3" fill="none"/>',
  arms:'<path d="M8 3h7v6.5l3.5 2.2V21H8.5L7 14z"/><path d="M10 15h7M10 18h7" stroke="rgba(0,0,0,.35)" stroke-width="1.2" fill="none"/>',
  waist:'<path d="M3 8.5h18v6.5H3z"/><path d="M10 7.5h4v8.5h-4z" fill="rgba(0,0,0,.35)"/><path d="M6 15l-1 5h4l1-5M18 15l1 5h-4l-1-5"/>',
  legs:'<path d="M6 3h5v11l-1.5 7H5l1-7zM13 3h5v11l1 7h-4.5L13 14z"/>',
  tal:'<path d="M12 2.5 18.5 10 12 21.5 5.5 10z"/><path d="M12 2.5v19M5.5 10h13" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none"/>',
  "great-sword":'<path d="M10.2 2h3.6l1 14h-5.6z"/><path d="M7 16h10v2.2H7z"/><path d="M11 18.2h2V22h-2z"/>',
  "long-sword":'<path d="M18.5 2.5 20 4 7.5 16.5 6 15z"/><path d="M5 14.5l3.5 3.5-1.2 1.2L3.8 15.7z"/><path d="M5.2 18.2 3 21l-.8-.8 2.6-2.4z"/>',
  "sword-shield":'<path d="M14.5 2.5 16 4 7 13 5.6 11.6z"/><path d="M4.3 12.3l2.9 2.9-1 1L3.3 13.3z"/><path d="M13 11h8v5a4 4 0 0 1-4 5 4 4 0 0 1-4-5z"/>',
  "dual-blades":'<path d="M5 2.5l1.4-.5 7 13-1.5 1z"/><path d="M19 2.5l-1.4-.5-7 13 1.5 1z"/><path d="M9.5 16h5v1.6h-5zM10.5 17.6h1.2V22h-1.2zM12.3 17.6h1.2V22h-1.2z"/>',
  hammer:'<path d="M5 3h10v7H5z"/><path d="M15 5h3v3h-3z"/><path d="M8.6 10h2.8v12H8.6z"/>',
  "hunting-horn":'<path d="M6 2.5c5 1 9 4.5 10.5 9.5l3 1-1 3-3-1C13 13 9.5 9 5 7z"/><path d="M8 9.5 4.5 22h2.4L10 11z"/>',
  lance:'<path d="M12 1.5 14 6v11h-4V6z"/><path d="M10.6 17h2.8v5h-2.8z"/><path d="M2.5 8h6v7a3 3 0 0 1-6 0z" opacity=".8"/>',
  gunlance:'<path d="M11 2h3v15h-3z"/><path d="M14 5h3.5v2.5H14z"/><path d="M11.2 17h2.6v5h-2.6z"/><path d="M3 8h6v7a3 3 0 0 1-6 0z" opacity=".8"/>',
  "switch-axe":'<path d="M11 2h2.4v20H11z"/><path d="M13.4 3c5 .5 7 3.5 7 7s-2 6-7 6.5z"/>',
  "charge-blade":'<path d="M9 2h3l.6 12H8.4z"/><path d="M7 14h7v1.8H7zM9.6 15.8h1.8V21H9.6z"/><path d="M14 9h7v5a3.5 4.5 0 0 1-7 0z" opacity=".85"/>',
  "insect-glaive":'<path d="M11.1 6h1.8v16h-1.8z"/><path d="M12 1.5 15 6.5H9z"/><circle cx="18" cy="11" r="2.2"/><path d="M16.2 9.4 14.5 8M19.8 9.4 21.5 8" stroke="currentColor" stroke-width="1" fill="none"/>',
  "light-bowgun":'<path d="M2.5 10h15v3.5h-15z"/><path d="M17.5 10.8H22v1.8h-4.5z"/><path d="M6 13.5h3l-1 5.5H5z"/>',
  "heavy-bowgun":'<path d="M2 8.5h16v6H2z"/><path d="M18 9.5h4v3.5h-4z"/><path d="M5 14.5h3.5l-1 6.5H4z"/><path d="M10 14.5h3v3h-3z"/>',
  bow:'<path d="M6 2c8 4 8 16 0 20" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M6.5 2.5v19" stroke="currentColor" stroke-width=".9" fill="none"/><path d="M4 12h15M16.5 10l3 2-3 2" stroke="currentColor" stroke-width="1.2" fill="none"/>',
};
function gearIcon(kind,rarity,size){
  size=size||22;const col=RARCOL[rarity]||"#8a8f96";const p=GPATH[kind]||GPATH.tal;
  return `<svg class="gi" width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${col}" aria-hidden="true"><g fill="currentColor">${p}</g></svg>`;
}
function decoIcon(d,size,slotSize){
  size=size||18;const col=d?(GEMCOL[d.c]||"#cfcfcf"):"transparent";const lv=d?d.lv:(slotSize||1);
  const shape=lv>=3?'<path d="M12 2 21 8v8l-9 6-9-6V8z"/>':lv===2?'<path d="M12 2.5 20.5 12 12 21.5 3.5 12z"/>':'<circle cx="12" cy="12" r="8.5"/>';
  return `<svg class="gi" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><g fill="${col}" stroke="${d?"rgba(0,0,0,.35)":"var(--line2)"}" stroke-width="1.4" ${d?"":'stroke-dasharray="3 2"'}>${shape}</g>${d?'<path d="M8 8.5 11 6" stroke="rgba(255,255,255,.6)" stroke-width="1.6" stroke-linecap="round" fill="none"/>':""}</svg>`;
}
