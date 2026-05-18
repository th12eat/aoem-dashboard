import { useState, useCallback, useMemo, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   LOCALIZATION SYSTEM
   Pre-generate translations on first use, cache them.
   Switching languages after first translation is instant.
   ═══════════════════════════════════════════════════ */
const LANGUAGES = [
  { code: "en", label: "English", colors: [["#BF0A30",0,0,1,1],["#fff",0,.15,1,.12],["#fff",0,.39,1,.12],["#fff",0,.63,1,.12],["#fff",0,.87,1,.13],["#002868",0,0,.45,.54]] }, // US — stripes + blue canton
  { code: "ko", label: "한국어", colors: [["#fff",0,0,1,1],["#CD2E3A",.25,.15,.5,.35],["#0047A0",.25,.5,.5,.35]] }, // KR — white + red top / blue bottom split
  { code: "es", label: "Español", colors: [["#c60b1e",0,0,1,.25],["#ffc400",0,.25,1,.5],["#c60b1e",0,.75,1,.25]] }, // ES
  { code: "pt", label: "Português", colors: [["#006600",0,0,.4,1],["#FF0000",.4,0,.6,1]] }, // PT — green left, red right
  { code: "no", label: "Norsk", colors: [["#EF2B2D",0,0,1,1],["#fff",.22,0,.2,1],["#fff",0,.35,1,.3],["#002868",.26,0,.12,1],["#002868",0,.39,1,.22]] }, // NO — red bg, white cross, blue inner cross
  { code: "sv", label: "Svenska", colors: [["#006AA7",0,0,1,1],["#FECC02",.22,0,.14,1],["#FECC02",0,.38,1,.24]] }, // SE
  { code: "fi", label: "Suomi", colors: [["#fff",0,0,1,1],["#003580",.22,0,.16,1],["#003580",0,.38,1,.24]] }, // FI
  { code: "de", label: "Deutsch", colors: [["#000",0,0,1,.33],["#D00",0,.33,1,.34],["#FFCE00",0,.67,1,.33]] }, // DE
  { code: "fr", label: "Français", colors: [["#002395",0,0,.33,1],["#fff",.33,0,.34,1],["#ED2939",.67,0,.33,1]] }, // FR
  { code: "ar", label: "العربية", colors: [["#006C35",0,0,1,.33],["#fff",0,.33,1,.34],["#000",0,.67,1,.33]] }, // SA
  { code: "hi", label: "हिन्दी", colors: [["#FF9933",0,0,1,.33],["#fff",0,.33,1,.34],["#138808",0,.67,1,.33]] }, // IN
  { code: "ta", label: "தமிழ்", colors: [["#FF9933",0,0,1,.33],["#fff",0,.33,1,.34],["#138808",0,.67,1,.33]] }, // IN
  { code: "fa", label: "فارسی", colors: [["#239f40",0,0,1,.33],["#fff",0,.33,1,.34],["#DA0000",0,.67,1,.33]] }, // IR
  { code: "vi", label: "Tiếng Việt", colors: [["#DA251D",0,0,1,1],["#FFFF00",.35,.25,.3,.5]] }, // VN
  { code: "th", label: "ไทย", colors: [["#A51931",0,0,1,.17],["#F4F5F8",0,.17,1,.16],["#2D2A4A",0,.33,1,.34],["#F4F5F8",0,.67,1,.16],["#A51931",0,.83,1,.17]] }, // TH
  { code: "si", label: "සිංහල", colors: [["#FFBE29",0,0,1,1],["#8D153A",.25,.1,.65,.8]] }, // LK
  { code: "ja", label: "日本語", colors: [["#fff",0,0,1,1],["#BC002D",.35,.25,.3,.5]] }, // JP — white + red circle
  { code: "zh", label: "中文", colors: [["#DE2910",0,0,1,1],["#FFDE00",.08,.15,.12,.2]] }, // CN — red + yellow star
];

function Flag({ colors, size = 20 }) {
  const h = Math.round(size * 0.7);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ borderRadius: 2, display: "block", border: "1px solid #334155" }}>
      {colors.map(([fill, x, y, w, ht], i) => (
        <rect key={i} x={x * size} y={y * h} width={w * size} height={ht * h} fill={fill} />
      ))}
    </svg>
  );
}

const EN = {
  headerSub: "Age of Empires Mobile — Command Center",
  headerTitle: "THE MIGHTIEST EMPIRE",
  defending: "DEFENDING",
  attacking: "ATTACKING",
  invasionLabel: "Invasion: Sunday",
  tabOverview: "Overview",
  tabMap: "Map",
  tabTimeline: "Timeline",
  tabPrep: "Prep",
  tabRoles: "Roles",
  tabBrief: "Brief",
  sitBrief: "SITUATION BRIEF",
  wonPrepWith: "won prep with",
  vsOur: "vs our",
  theyInvade: "They invade our map.",
  weInvade: "We invade their map.",
  strategy: "Strategy:",
  stratDefense: "WC1 + AGC on NE line, MyT + REU on SE line. WC1 takes IC. Swordsman Tower is priority.",
  stratOffense: "WC1 + AGC on NW line, MyT + REU on SW line. WC1 takes IC. Swordsman Tower is priority.",
  allianceOverview: "ALLIANCE OVERVIEW",
  colRole: "Role",
  colAllies: "Allies",
  colExpected: "Expected",
  colPower: "Power",
  colMerits: "Merits",
  colTotal: "TOTAL",
  config: "CONFIG",
  oppServerLabel: "Opponent Server",
  invTimeLabel: "Invasion Time",
  wonPrepCheck: "We won prep (switch to OFFENSE)",
  battlefield: "BATTLEFIELD",
  defPositions: "DEFENSE POSITIONS",
  offPositions: "OFFENSE POSITIONS",
  mapDesc: "Each alliance has a designated teleport zone. Colored sections show where to teleport.",
  towerAssign: "TOWER ASSIGNMENTS",
  towerWarn: "Pikeman (W) likely conceded — WC1 attempts if Swordsman secured.",
  warMachines: "WAR MACHINES (Per Alliance)",
  siegeDesc: "Trebuchets & rams on gates first. After gates fall, remaining siege hunts enemy Krakens (whale citadels). Escalades spread as jump points between gate and IC.",
  siegeWarn: "4hr build time — once spent, gone. Siege only on DEFENSE.",
  siegeStats: "Rams: ~500 dmg/2s (infinite) | Trebs: ~2500 dmg/3s (50 shots) | Citadel HP: ~1.25M",
  defTimeline: "DEFENSE TIMELINE",
  offTimeline: "OFFENSE TIMELINE",
  prepResults: "PREP STAGE RESULTS",
  editStage: "EDIT STAGE POINTS (Billions)",
  rallyLead: "RALLY LEAD",
  rallyLeadDesc: "Communicates rally timings to alliance",
  taxiRunners: "TAXI RUNNERS (3-4)",
  taxiRunnersDesc: "Ferry players toward IC via taxi rallies",
  siegeCoord: "SIEGE COORDINATOR",
  siegeCoordDesc: "Coordinates war machine deployment & targeting",
  siegeHelpers: "SIEGE HELPERS (3-4)",
  siegeHelpersDesc: "Build & deploy war machines as directed",
  taxiProtocol: "TAXI RALLY PROTOCOL",
  taxiStep1: "Officer rallies enemy citadel across from IC",
  taxiStep2: "Players join — rally slowly moves toward IC",
  taxiStep3: "Near courtyard → officer kicks or disbands",
  taxiStep4: "Ejected players reinforce IC / courtyard immediately",
  taxiStep5: "Repeat continuously — this is the lifeline",
  taxiWarn: "Only R5 and R4 officers can kick/disband rallies.",
  briefTitle: "SHAREABLE BRIEF",
  briefDesc: "Copy this condensed battle plan to share in Discord or in-game chat.",
  copy: "Copy",
  translating: "Translating...",
  cached: "Cached",
  icHoldTitle: "IC HOLD RULES",
  icHoldRule1: "4-hour IC contest window after gates fall",
  icHoldRule2: "Win by: holding IC longest over 4hrs OR holding 1 consecutive hour",
  icHoldRule3: "After 4hrs, map reverts to open PvP for 2 more hours before event ends",
  // Map labels
  mapRally: "RALLY",
  mapRallyLeader: "RALLY LEADER",
  mapSiegeLeader: "SIEGE LEADER",
  mapGateRing: "Gate Ring",
  mapICZone: "IC Zone",
  mapGates: "Gates",
  mapRallyStaging: "Rally Staging",
  mapSiegeStaging: "Siege Staging",
  oppIntel: "OPPONENT INTEL",
  oppAlliancesSub: "Top alliances from",
  krakenTargets: "SIEGE TARGETS (Krakens)",
  krakenDesc: "High-power players to target with remaining siege after gates fall. Citadel HP ~1.25M.",
  mapInner: "inner",
  mapOuter: "outer",
  // Tower names
  towerSword: "Sword",
  towerArrow: "Arrow",
  towerCavalry: "Cavalry",
  towerPike: "Pike",
  // Alliance roles
  rolePrimaryStrike: "Primary Strike / IC Hold",
  roleSecondaryStrike: "Secondary Strike / Support",
  roleFlanking: "Flanking / Tower Control",
  roleTowerHold: "Tower Hold / Taxi Rallies",
  // Timeline phases
  tl0Phase: "Map Opens", tl0Desc: "Cross-server PvP begins. Scout enemy positions. Do NOT teleport yet.",
  tl1Phase: "WC1 Teleports", tl1Desc: "WC1 teleports to outer position. Secure Swordsman Tower (N). Build war machines.",
  tl2Phase: "MyT Teleports", tl2Desc: "MyT teleports to outer position. Secure Cavalry Tower (S). Position war machines.",
  tl3Phase: "REU Teleports", tl3Desc: "REU teleports to inner position near Archer Tower (E). Attempt Pikeman (W) if feasible.",
  tl4Phase: "Gates Unlock + AGC", tl4Desc: "AGC teleports to inner position near Archer Tower. ALL engage. Gates attackable. Deploy siege.",
  tl5Phase: "Gate Siege", tl5Desc: "Trebs & rams on gates. After gates fall, remaining siege hunts enemy Krakens. Escalades as jump points.",
  tl6Phase: "IC Assault", tl6Desc: "Rush IC with strongest marches. WC1 enters first. All others fill courtyard. Taxi rallies critical.",
  tl7Phase: "IC Contest (4hr)", tl7Desc: "Hold IC for 1 consecutive hour OR hold longest over 4hrs. Rotate reinforcements. Courtyard = victory.",
  tl8Phase: "Open PvP (2hr)", tl8Desc: "Map reverts to open PvP. Teleportation stays open 2 more hours. Event ends after.",
};

// Cache object: { langCode: { ...translatedStrings } }
const L10N_CACHE = { en: EN };

async function fetchTranslation(langCode) {
  if (L10N_CACHE[langCode]) return L10N_CACHE[langCode];
  const lang = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
  const keys = Object.keys(EN);
  const payload = keys.map(k => `${k}|||${EN[k]}`).join("\n");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 8000,
      messages: [{ role: "user", content: `Translate the values in these key-value pairs into ${lang}. Format: key|||value. Keep keys unchanged. Keep alliance tags (WC1, MyT, REU, AGC), server names, times (UTC), numbers, emoji, and compass directions (NE/SE/NW/SW/N/S/E/W) exactly as-is. Translate everything else. Output ONLY the same key|||translated_value format, one per line. No extra text.\n\n${payload}` }]
    })
  });
  const data = await resp.json();
  const raw = data.content?.map(c => c.text || "").join("") || "";
  const result = { ...EN };
  raw.split("\n").forEach(line => {
    const idx = line.indexOf("|||");
    if (idx > 0) {
      const k = line.substring(0, idx).trim();
      const v = line.substring(idx + 3).trim();
      if (EN[k] !== undefined && v) result[k] = v;
    }
  });
  L10N_CACHE[langCode] = result;
  return result;
}

function genOppCode(name) {
  const m = name.match(/\d+/);
  return m ? `E#${m[0].padStart(3, "0")}` : "";
}

function towerIcon(towerStr) {
  const icons = [];
  if (towerStr.includes("Swordsman")) icons.push("⚔️");
  if (towerStr.includes("Pikeman")) icons.push("🔱");
  if (towerStr.includes("Cavalry")) icons.push("🐴");
  if (towerStr.includes("Archer")) icons.push("🏹");
  return icons.join(" ") || "—";
}

const DEFAULT_CONFIG = {
  oppServer: "Era38",
  invasionTime: "11:00 UTC",
  weWonPrep: false,
  alliances: [
    { tag: "WC1", roleKey: "rolePrimaryStrike", teleportTime: "10:30 UTC", position: "NE-inner", tower: "Swordsman (N) / Pikeman (W)", color: "#3b82f6", allies: 168, expected: "", power: "17,236,872,426", merits: "1,493,190,936" },
    { tag: "MyT", roleKey: "roleFlanking", teleportTime: "10:40 UTC", position: "SE-outer", tower: "Cavalry (S)", color: "#22c55e", allies: 153, expected: "", power: "10,077,180,519", merits: "744,926,645" },
    { tag: "REU", roleKey: "roleSecondaryStrike", teleportTime: "10:50 UTC", position: "SE-inner", tower: "Archer (E)", color: "#f59e0b", allies: 118, expected: "", power: "8,634,995,031", merits: "825,232,103" },
    { tag: "AGC", roleKey: "roleTowerHold", teleportTime: "11:00 UTC", position: "NE-outer", tower: "Archer (E)", color: "#ef4444", allies: 169, expected: "", power: "11,113,145,620", merits: "154,684,345" },
  ],
  prepStages: [
    { name: "Resource Gathering", ourPts: 2.89, oppPts: 3.09, won: false },
    { name: "Unit Training", ourPts: 0, oppPts: 0, won: false },
    { name: "Tribal Eliminations", ourPts: 0, oppPts: 0, won: false },
    { name: "Speed Up Consumption", ourPts: 0, oppPts: 0, won: false },
    { name: "Power Boost", ourPts: 0, oppPts: 0, won: false },
  ],
  totalOur: 2.89,
  totalOpp: 3.09,
  oppAlliances: [
    { rank: 1, tag: "E38", name: "TheLastWolf", allies: 160, power: "17,825,083,183", merits: "1,701,935,323" },
    { rank: 2, tag: "K38", name: "Republic한국", allies: 150, power: "11,735,334,303", merits: "710,232,458" },
    { rank: 3, tag: "S38", name: "ShadowsOfWar", allies: 167, power: "9,901,400,493", merits: "389,679,065" },
    { rank: 4, tag: "NAS", name: "NewAllieSparta", allies: 149, power: "7,193,506,001", merits: "107,554,795" },
  ],
  krakens: [
    { rank: 1, name: "Arcaneaura", alliance: "E38", power: "291,865,767" },
    { rank: 2, name: "HungryJoker", alliance: "E38", power: "278,136,398" },
    { rank: 3, name: "gamers2604", alliance: "E38", power: "272,437,389" },
    { rank: 4, name: "Tobÿ", alliance: "--", power: "259,361,292" },
    { rank: 5, name: "BàTriệu", alliance: "E38", power: "250,137,629" },
    { rank: 6, name: "Patatan", alliance: "E38", power: "242,796,135" },
    { rank: 7, name: "Shinsunchi", alliance: "E38", power: "241,016,304" },
    { rank: 8, name: "君主9316507", alliance: "--", power: "236,097,425" },
    { rank: 9, name: "❄RiverHorseM", alliance: "E38", power: "235,518,510" },
    { rank: 10, name: "SlickWhiskey", alliance: "E38", power: "225,235,926" },
    { rank: 11, name: "RealD⁸⁴", alliance: "K38", power: "218,372,686" },
    { rank: 12, name: "Kaspar~|~", alliance: "E38", power: "214,967,013" },
  ],
  roles: {
    WC1: { rallyLead: "TBD", taxiRunners: ["TBD","TBD","TBD","TBD"], siegeCoord: "TBD", siegeHelpers: ["TBD","TBD","TBD","TBD"] },
    MyT: { rallyLead: "TBD", taxiRunners: ["TBD","TBD","TBD","TBD"], siegeCoord: "TBD", siegeHelpers: ["TBD","TBD","TBD","TBD"] },
    REU: { rallyLead: "TBD", taxiRunners: ["TBD","TBD","TBD","TBD"], siegeCoord: "TBD", siegeHelpers: ["TBD","TBD","TBD","TBD"] },
    AGC: { rallyLead: "TBD", taxiRunners: ["TBD","TBD","TBD","TBD"], siegeCoord: "TBD", siegeHelpers: ["TBD","TBD","TBD","TBD"] },
  },
};

const PHASE_COLORS = ["#94a3b8","#3b82f6","#22c55e","#f59e0b","#ef4444","#c084fc","#f472b6","#fbbf24","#64748b"];

/* ═══════════════════════════════════════════════════
   ZOOMABLE MAP WRAPPER
   ═══════════════════════════════════════════════════ */
function ZoomableMap({ children }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(s => Math.min(4, Math.max(0.5, s + delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) { el.addEventListener("wheel", handleWheel, { passive: false }); return () => el.removeEventListener("wheel", handleWheel); }
  }, [handleWheel]);

  const onPointerDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); e.currentTarget.setPointerCapture(e.pointerId); };
  const onPointerMove = (e) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onPointerUp = () => setDragging(false);
  const reset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <button onClick={() => setScale(s => Math.min(4, s + 0.3))} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#fbbf24", width: 28, height: 28, fontSize: 16, cursor: "pointer", fontFamily: "monospace" }}>+</button>
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.3))} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#fbbf24", width: 28, height: 28, fontSize: 16, cursor: "pointer", fontFamily: "monospace" }}>−</button>
        <button onClick={reset} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#94a3b8", padding: "4px 10px", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>Reset</button>
        <span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>{Math.round(scale * 100)}%</span>
      </div>
      <div ref={containerRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        style={{ overflow: "hidden", borderRadius: 8, border: "1px solid #1e3a5f", cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}>
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "center center", transition: dragging ? "none" : "transform 0.15s ease" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DIAMOND MAP
   ═══════════════════════════════════════════════════ */
function DiamondMap({ alliances, isDefense, t }) {
  const w = 820, h = 820;
  const cx = w / 2, cy = h / 2;
  const outerR = 300, innerR = 160, gateR = 62, towerDist = 90;

  const oN={x:cx,y:cy-outerR},oE={x:cx+outerR,y:cy},oS={x:cx,y:cy+outerR},oW={x:cx-outerR,y:cy};
  const iN={x:cx,y:cy-innerR},iE={x:cx+innerR,y:cy},iS={x:cx,y:cy+innerR},iW={x:cx-innerR,y:cy};
  const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const poly=pts=>pts.map(p=>`${p.x},${p.y}`).join(" ");
  const oNE=mid(oN,oE),oSE=mid(oE,oS),oSW=mid(oS,oW),oNW=mid(oW,oN);
  const iNE=mid(iN,iE),iSE=mid(iE,iS),iSW=mid(iS,iW),iNW=mid(iW,iN);

  // NE line: split at 1/3 from N (outer=1/3, inner=2/3). NW mirrors same.
  const oNE3=lerp(oN,oE,1/3), iNE3=lerp(iN,iE,1/3);
  const oNW3=lerp(oN,oW,1/3), iNW3=lerp(iN,iW,1/3);

  const zones={
    "NE-outer":[oN,oNE3,iNE3,iN],         // 1/3 slice (AGC)
    "NE-inner":[oNE3,oE,iE,iNE3],          // 2/3 slice (WC1)
    "SE-outer":[oSE,oS,iS,iSE],            // 1/2 (MyT)
    "SE-inner":[oE,oSE,iSE,iE],            // 1/2 (REU)
    "NW-outer":[oN,oNW3,iNW3,iN],          // offense mirror
    "NW-inner":[oNW3,oW,iW,iNW3],
    "SW-outer":[oSW,oS,iS,iSW],
    "SW-inner":[oW,oSW,iSW,iW],
  };
  const offRemap={"NE-outer":"NW-outer","NE-inner":"NW-inner","SE-outer":"SW-outer","SE-inner":"SW-inner"};
  const enemyKeys=isDefense?["NW-outer","NW-inner","SW-outer","SW-inner"]:["NE-outer","NE-inner","SE-outer","SE-inner"];
  const aZone=a=>{const k=isDefense?a.position:offRemap[a.position];return{key:k,pts:zones[k]};};
  const centroid=pts=>({x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length});

  const towerNames=[t.towerSword,t.towerArrow,t.towerCavalry,t.towerPike];
  const towers=[
    {label:towerNames[0],emoji:"⚔️",dir:"N",x:cx,y:cy-towerDist},
    {label:towerNames[1],emoji:"🏹",dir:"E",x:cx+towerDist,y:cy},
    {label:towerNames[2],emoji:"🐴",dir:"S",x:cx,y:cy+towerDist},
    {label:towerNames[3],emoji:"🔱",dir:"W",x:cx-towerDist,y:cy},
  ];

  const ga=Math.PI/4;
  const gates=[
    {x:cx+gateR*Math.cos(ga),y:cy+gateR*Math.sin(ga)},
    {x:cx+gateR*Math.cos(-ga),y:cy+gateR*Math.sin(-ga)},
    {x:cx+gateR*Math.cos(Math.PI+ga),y:cy+gateR*Math.sin(Math.PI+ga)},
    {x:cx+gateR*Math.cos(Math.PI-ga),y:cy+gateR*Math.sin(Math.PI-ga)},
  ];

  // Rally arrows originate from the NE and SE split points on inner diamond
  const rallyMids=isDefense?[iNE3,iSE]:[iNW3,iSW];

  // Rally leader markers — pushed into colored zones from the split point
  const rallyMarkers=[];
  const pushDist=0.22;
  if(isDefense){
    const a1=alliances.find(a=>a.position==="NE-outer"),a2=alliances.find(a=>a.position==="NE-inner");
    const a3=alliances.find(a=>a.position==="SE-outer"),a4=alliances.find(a=>a.position==="SE-inner");
    rallyMarkers.push({pt:lerp(iNE3,iN,pushDist),color:a1?.color||"#ef4444"});
    rallyMarkers.push({pt:lerp(iNE3,iE,pushDist),color:a2?.color||"#3b82f6"});
    rallyMarkers.push({pt:lerp(iSE,iS,pushDist),color:a3?.color||"#22c55e"});
    rallyMarkers.push({pt:lerp(iSE,iE,pushDist),color:a4?.color||"#f59e0b"});
  } else {
    const a1=alliances.find(a=>a.position==="NE-outer"),a2=alliances.find(a=>a.position==="NE-inner");
    const a3=alliances.find(a=>a.position==="SE-outer"),a4=alliances.find(a=>a.position==="SE-inner");
    rallyMarkers.push({pt:lerp(iNW3,iN,pushDist),color:a1?.color||"#ef4444"});
    rallyMarkers.push({pt:lerp(iNW3,iW,pushDist),color:a2?.color||"#3b82f6"});
    rallyMarkers.push({pt:lerp(iSW,iS,pushDist),color:a3?.color||"#22c55e"});
    rallyMarkers.push({pt:lerp(iSW,iW,pushDist),color:a4?.color||"#f59e0b"});
  }

  // Siege markers — OUTSIDE red boundary (siege drives inward from outside invasion zone)
  // N: AGC + WC1, S: MyT, W: REU + WC1 + AGC, NE: WC1 (gate attack)
  const pb=28; // push-back distance outside outer diamond
  // WC1 gate siege position — next to WC1 rally leader marker (NE-inner side of inner diamond)
  const wc1RallyLdrPt=isDefense?lerp(iNE3,iE,pushDist):{x:lerp(iNW3,iW,pushDist).x,y:lerp(iNW3,iW,pushDist).y};
  const wc1GateOffX=isDefense?18:-18;
  const siegeMarkers=isDefense?[
    {x:oN.x-28,y:oN.y-pb,dir:"N",tag:"AGC",color:"#ef4444",targetX:mid(oN,oW).x+30,targetY:mid(oN,oW).y+30},
    {x:oN.x+28,y:oN.y-pb,dir:"N",tag:"WC1",color:"#3b82f6",targetX:mid(oN,oW).x+50,targetY:mid(oN,oW).y+10},
    {x:oS.x,y:oS.y+pb,dir:"S",tag:"MyT",color:"#22c55e",targetX:mid(oS,oW).x+30,targetY:mid(oS,oW).y-30},
    {x:oW.x-pb,y:oW.y-20,dir:"W",tag:"REU",color:"#f59e0b",targetX:oW.x+55,targetY:oW.y-10},
    {x:oW.x-pb,y:oW.y,dir:"W",tag:"WC1",color:"#3b82f6",targetX:oW.x+55,targetY:oW.y},
    {x:oW.x-pb,y:oW.y+20,dir:"W",tag:"AGC",color:"#ef4444",targetX:oW.x+55,targetY:oW.y+10},
    {x:wc1RallyLdrPt.x+wc1GateOffX,y:wc1RallyLdrPt.y,dir:"NE",tag:"WC1",color:"#3b82f6",targetX:cx+gateR*Math.cos(-Math.PI/4),targetY:cy+gateR*Math.sin(-Math.PI/4)},
  ]:[
    {x:oN.x-28,y:oN.y-pb,dir:"N",tag:"AGC",color:"#ef4444",targetX:mid(oN,oE).x-30,targetY:mid(oN,oE).y+30},
    {x:oN.x+28,y:oN.y-pb,dir:"N",tag:"WC1",color:"#3b82f6",targetX:mid(oN,oE).x-50,targetY:mid(oN,oE).y+10},
    {x:oS.x,y:oS.y+pb,dir:"S",tag:"MyT",color:"#22c55e",targetX:mid(oS,oE).x-30,targetY:mid(oS,oE).y-30},
    {x:oW.x-pb,y:oW.y-20,dir:"W",tag:"REU",color:"#f59e0b",targetX:mid(oW,oS).x+30,targetY:mid(oW,oS).y-10},
    {x:oW.x-pb,y:oW.y,dir:"W",tag:"WC1",color:"#3b82f6",targetX:mid(oW,oS).x+30,targetY:mid(oW,oS).y},
    {x:oW.x-pb,y:oW.y+20,dir:"W",tag:"AGC",color:"#ef4444",targetX:mid(oW,oS).x+30,targetY:mid(oW,oS).y+10},
    {x:wc1RallyLdrPt.x+wc1GateOffX,y:wc1RallyLdrPt.y,dir:"NW",tag:"WC1",color:"#3b82f6",targetX:cx+gateR*Math.cos(Math.PI+Math.PI/4),targetY:cy+gateR*Math.sin(Math.PI+Math.PI/4)},
  ];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",maxWidth:620,margin:"0 auto",display:"block"}}>
      <defs>
        <radialGradient id="icGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3"/><stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <marker id="arrY" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24"/></marker>
        <marker id="arrSiege" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="7" markerHeight="5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f87171"/></marker>
      </defs>

      {/* Outer boundary */}
      <polygon points={poly([oN,oE,oS,oW])} fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="8,4" opacity="0.5"/>

      {/* Enemy zones */}
      {enemyKeys.map(k=><polygon key={`ez-${k}`} points={poly(zones[k])} fill="#64748b" opacity="0.04"/>)}

      {/* Alliance zones */}
      {alliances.map(a=>{const{pts}=aZone(a);return <polygon key={`az-${a.tag}`} points={poly(pts)} fill={a.color} opacity="0.15" stroke={a.color} strokeWidth="1" strokeOpacity="0.3"/>;
      })}

      {/* Split lines */}
      {(isDefense?[[oNE3,iNE3],[oSE,iSE]]:[[oNW3,iNW3],[oSW,iSW]]).map(([a,b],i)=>(
        <line key={`sp${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,4" opacity="0.3"/>
      ))}

      {/* Inner diamond */}
      <polygon points={poly([iN,iE,iS,iW])} fill="#1e293b" fillOpacity="0.35" stroke="#3b82f6" strokeWidth="2"/>

      {/* Gate ring */}
      <circle cx={cx} cy={cy} r={gateR} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6,3"/>
      {gates.map((g,i)=><rect key={`g${i}`} x={g.x-5} y={g.y-5} width="10" height="10" rx="2" fill="#475569" stroke="#94a3b8" strokeWidth="1.5"/>)}

      {/* Rally leader markers — triangles pushed into zones */}
      {rallyMarkers.map((m,i)=>{
        const dx=cx-m.pt.x,dy=cy-m.pt.y;
        const ang=Math.atan2(dy,dx);
        const size=8;
        const p1={x:m.pt.x+Math.cos(ang)*size,y:m.pt.y+Math.sin(ang)*size};
        const p2={x:m.pt.x+Math.cos(ang+2.3)*size,y:m.pt.y+Math.sin(ang+2.3)*size};
        const p3={x:m.pt.x+Math.cos(ang-2.3)*size,y:m.pt.y+Math.sin(ang-2.3)*size};
        const labelDx=Math.cos(ang+Math.PI)*24,labelDy=Math.sin(ang+Math.PI)*24;
        return (
          <g key={`rm${i}`}>
            <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={m.color} opacity="0.9" stroke="#0f172a" strokeWidth="1"/>
            <text x={m.pt.x+labelDx} y={m.pt.y+labelDy} fontSize="10" fill={m.color} fontFamily="monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" opacity="0.9">{t.mapRallyLeader}</text>
          </g>
        );
      })}

      {/* Siege leader markers — alliance-colored, with attack arrows into enemy zone */}
      {siegeMarkers.map((s,i)=>{
        const dx=s.targetX-s.x,dy=s.targetY-s.y;
        const len=Math.sqrt(dx*dx+dy*dy)||1;
        const nx=dx/len,ny=dy/len;
        const ax=s.x+nx*18,ay=s.y+ny*18;
        const bx=s.targetX-nx*8,by=s.targetY-ny*8;
        // Label position: NE/NW gate markers put text below, others push away from arrow
        const isGateMarker = s.dir==="NE"||s.dir==="NW";
        const lx=isGateMarker ? s.x : s.x-nx*22;
        const ly=isGateMarker ? s.y+16 : s.y-ny*22;
        return(
          <g key={`sm${i}`}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={s.color} strokeWidth="2" strokeDasharray="4,3" opacity="0.6" markerEnd="url(#arrSiege)"/>
            <polygon points={`${s.x},${s.y-9} ${s.x+8},${s.y} ${s.x},${s.y+9} ${s.x-8},${s.y}`} fill={s.color} opacity="0.85" stroke="#0f172a" strokeWidth="1.5"/>
            <text x={lx} y={isGateMarker?ly:ly-6} fontSize="10" fill={s.color} fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.9">{t.mapSiegeLeader}</text>
            <text x={lx} y={isGateMarker?ly+13:ly+7} fontSize="11" fill={s.color} fontFamily="monospace" fontWeight="bold" textAnchor="middle" opacity="0.9">{s.tag}</text>
          </g>
        );
      })}

      {/* Rally arrows — two segments: rally leader → gate → IC */}
      {rallyMids.map((from,i)=>{
        // Find the nearest gate to this rally start point
        const gateIdx = isDefense ? (i===0 ? 1 : 0) : (i===0 ? 2 : 3); // def: NE=gate1, SE=gate0; off: NW=gate2, SW=gate3
        const gate = gates[gateIdx];

        // Segment 1: from rally start to gate
        const dx1=gate.x-from.x, dy1=gate.y-from.y;
        const len1=Math.sqrt(dx1*dx1+dy1*dy1)||1;
        const nx1=dx1/len1, ny1=dy1/len1;
        const s1x=from.x-nx1*8, s1y=from.y-ny1*8;
        const e1x=gate.x-nx1*8, e1y=gate.y-ny1*8;
        const m1x=(s1x+e1x)/2, m1y=(s1y+e1y)/2;

        // Segment 2: from gate to IC center
        const dx2=cx-gate.x, dy2=cy-gate.y;
        const len2=Math.sqrt(dx2*dx2+dy2*dy2)||1;
        const nx2=dx2/len2, ny2=dy2/len2;
        const s2x=gate.x+nx2*8, s2y=gate.y+ny2*8;
        const e2x=cx, e2y=cy;

        return (
          <g key={`r${i}`}>
            {/* Segment 1: to gate — no arrowhead */}
            <line x1={s1x} y1={s1y} x2={e1x} y2={e1y} stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6,4" opacity="0.9"/>
            {/* Segment 2: gate to IC */}
            <line x1={s2x} y1={s2y} x2={e2x} y2={e2y} stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="6,4" markerEnd="url(#arrY)" opacity="0.9"/>
            {/* Label on segment 1 — NE line: left side, SE line: right side */}
            <text x={m1x+(i===0?-1:1)*ny1*18} y={m1y-(i===0?-1:1)*nx1*18} fontSize="10" fill="#fbbf24" fontFamily="monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{t.mapRally}</text>
          </g>
        );
      })}

      {/* IC */}
      <circle cx={cx} cy={cy} r="36" fill="url(#icGlow)"/>
      <circle cx={cx} cy={cy} r="18" fill="#1e293b" stroke="#fbbf24" strokeWidth="2.5" filter="url(#glow)"/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">IC</text>

      {/* Towers */}
      {towers.map(tw=>(
        <g key={tw.dir}>
          <circle cx={tw.x} cy={tw.y} r="14" fill="#1e293b" stroke="#64748b" strokeWidth="1.5"/>
          <text x={tw.x} y={tw.y-1} textAnchor="middle" dominantBaseline="middle" fontSize="11">{tw.emoji}</text>
          <text x={tw.x} y={tw.y+16} textAnchor="middle" fontSize="7" fill="#94a3b8" fontFamily="monospace">{tw.label} ({tw.dir})</text>
        </g>
      ))}

      {/* Entry labels */}
      {[{l:"NE",p:oNE,a:isDefense,ox:14,oy:-14},{l:"SE",p:oSE,a:isDefense,ox:14,oy:14},{l:"SW",p:oSW,a:!isDefense,ox:-14,oy:14},{l:"NW",p:oNW,a:!isDefense,ox:-14,oy:-14}].map(ep=>(
        <g key={ep.l}><circle cx={ep.p.x} cy={ep.p.y} r="4" fill={ep.a?"#4ade80":"#475569"} opacity={ep.a?0.8:0.3}/><text x={ep.p.x+ep.ox} y={ep.p.y+ep.oy} textAnchor="middle" fontSize="10" fontFamily="monospace" fontWeight="bold" fill={ep.a?"#4ade80":"#475569"}>{ep.l}</text></g>
      ))}

      {/* Alliance labels in zones */}
      {alliances.map(a=>{const{pts}=aZone(a);const c=centroid(pts);return(
        <g key={`lbl-${a.tag}`}><rect x={c.x-26} y={c.y-11} width="52" height="22" rx="5" fill={a.color} opacity="0.92" stroke="#0f172a" strokeWidth="1.5"/><text x={c.x} y={c.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="bold" fill="#fff" fontFamily="monospace">{a.tag}</text></g>
      );})}

      {/* Legend */}
      <g transform="translate(8,8)">
        <rect width="182" height="110" rx="6" fill="#0f172a" opacity="0.92" stroke="#334155"/>
        {alliances.map((a,i)=>(<g key={`lg${a.tag}`}><rect x="8" y={10+i*14} width="10" height="10" rx="2" fill={a.color} opacity="0.4"/><text x="24" y={18+i*14} fontSize="7.5" fill="#94a3b8" fontFamily="monospace">{a.tag} ({a.position.includes("inner")?t.mapInner:t.mapOuter})</text></g>))}
        <line x1="8" y1="68" x2="18" y2="68" stroke="#3b82f6" strokeWidth="2"/><text x="24" y="71" fontSize="7.5" fill="#94a3b8" fontFamily="monospace">{t.mapICZone}</text>
        <rect x="8" y="78" width="10" height="10" rx="2" fill="#475569" stroke="#94a3b8" strokeWidth="1"/><text x="24" y="86" fontSize="7.5" fill="#94a3b8" fontFamily="monospace">{t.mapGates}</text>
        <polygon points="8,98 13,92 18,98" fill="#4ade80" opacity="0.8"/><text x="24" y="99" fontSize="7.5" fill="#94a3b8" fontFamily="monospace">{t.mapRallyStaging}</text>
      </g>
    </svg>
  );
}

function PrepChart({stages}){
  const mx=Math.max(...stages.map(s=>Math.max(s.ourPts,s.oppPts)));
  return(<div style={{display:"flex",flexDirection:"column",gap:10}}>{stages.map((s,i)=>(<div key={i}><div style={{fontSize:12,color:"#cbd5e1",fontFamily:"monospace",marginBottom:3}}>{s.won?"✅":"❌"} {s.name}</div><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:"#60a5fa",width:40,textAlign:"right",fontFamily:"monospace"}}>{s.ourPts}B</span><div style={{flex:1}}><div style={{height:14,width:`${(s.ourPts/mx)*100}%`,background:"linear-gradient(90deg,#1e40af,#3b82f6)",borderRadius:3}}/></div></div><div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,color:"#f87171",width:40,textAlign:"right",fontFamily:"monospace"}}>{s.oppPts}B</span><div style={{flex:1}}><div style={{height:14,width:`${(s.oppPts/mx)*100}%`,background:"linear-gradient(90deg,#991b1b,#ef4444)",borderRadius:3}}/></div></div></div>))}</div>);
}

function fmt(str){const n=parseInt(String(str).replace(/,/g,""),10);if(n>=1e9)return(n/1e9).toFixed(2)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";return str;}
function sumF(arr,f){return arr.reduce((s,a)=>s+(parseInt(String(a[f]).replace(/,/g,""),10)||0),0);}
function fmtN(n){if(n>=1e9)return(n/1e9).toFixed(2)+"B";if(n>=1e6)return(n/1e6).toFixed(1)+"M";return n.toLocaleString();}

/* ═══════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   LANGUAGE PICKER (custom dropdown with flag emoji)
   ═══════════════════════════════════════════════════ */
function LangPicker({ value, onChange, disabled, cached }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", direction: "ltr" }}>
      <button onClick={() => !disabled && setOpen(!open)} style={{
        background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "4px 10px",
        color: "#fbbf24", fontSize: 12, fontFamily: "inherit", cursor: disabled ? "wait" : "pointer",
        display: "flex", alignItems: "center", gap: 6, opacity: disabled ? 0.6 : 1,
      }}>
        <Flag colors={current.colors} size={22}/>
        <span style={{ fontSize: 10 }}>{current.label}</span>
        <span style={{ fontSize: 8, color: "#64748b", marginLeft: 2 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4,
          background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: 4,
          zIndex: 100, maxHeight: 280, overflowY: "auto", minWidth: 180,
          boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
        }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => { onChange(l.code); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
              background: l.code === value ? "#1e293b" : "transparent", border: "none", borderRadius: 4,
              color: l.code === value ? "#fbbf24" : "#cbd5e1", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              textAlign: "left",
            }}>
              <Flag colors={l.colors} size={24}/>
              <span style={{ flex: 1 }}>{l.label}</span>
              {cached.has(l.code) && l.code !== "en" && <span style={{ fontSize: 9, color: "#4ade80" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TMEDashboard(){
  const[config,setConfig]=useState(DEFAULT_CONFIG);
  const[activeTab,setActiveTab]=useState("overview");
  const[uiLang,setUiLang]=useState("en");
  const[t,setT]=useState(EN);
  const[loading,setLoading]=useState(false);
  const[cached,setCached]=useState(new Set(["en"]));

  const isDefense=!config.weWonPrep;
  const oppCode=genOppCode(config.oppServer);

  const handleLang=useCallback(async(code)=>{
    if(L10N_CACHE[code]){setT(L10N_CACHE[code]);setUiLang(code);return;}
    setLoading(true);
    try{
      const result=await fetchTranslation(code);
      setT(result);setUiLang(code);
      setCached(prev=>new Set([...prev,code]));
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  const updateStage=(idx,field,value)=>{setConfig(p=>{const s=[...p.prepStages];s[idx]={...s[idx],[field]:parseFloat(value)||0};return{...p,prepStages:s};});};
  const updateRole=(tag,field,value,idx)=>{setConfig(p=>{const roles={...p.roles},r={...roles[tag]};if(idx!==undefined){const arr=[...r[field]];arr[idx]=value;r[field]=arr;}else r[field]=value;roles[tag]=r;return{...p,roles};});};
  const updateExpected=(idx,value)=>{setConfig(p=>{const a=[...p.alliances];a[idx]={...a[idx],expected:value};return{...p,alliances:a};});};

  const tlPhases=Array.from({length:9},(_,i)=>({phase:t[`tl${i}Phase`],desc:t[`tl${i}Desc`]}));
  const tlTimes=["09:00 UTC","10:30 UTC","10:40 UTC","10:50 UTC","11:00 UTC","11:00–11:30","Gates Fall","+0 to +4hrs","+4hrs"];

  const briefText=useMemo(()=>`=== TME: Era8 vs ${config.oppServer} (${isDefense?"DEF":"OFF"}) ===\nSunday ${config.invasionTime}\n\n${config.alliances.map(a=>`[${a.tag}] ${a.position} | ${a.tower} | TP: ${a.teleportTime}`).join("\n")}\n\nTOWERS: WC1→Sword/Pike | MyT→Cav | AGC/REU→Archer\nIC: 4hrs, 1hr consecutive or longest. Then 2hr open PvP.\nSIEGE: Gates→Krakens. Defense only.\nTrebs ~2500/3s (50) | Rams ~500/2s (∞) | Citadel ~1.25M HP\nEscalades = jump points gate→IC\n\n${Object.entries(config.roles).map(([tag,r])=>`[${tag}] Rally:${r.rallyLead} Taxi:${r.taxiRunners.filter(x=>x!=="TBD").join(",")||"TBD"} Siege:${r.siegeCoord}`).join("\n")}`,[config,isDefense]);

  const tabs=[
    {id:"overview",label:`📋 ${t.tabOverview}`},{id:"map",label:`🗺️ ${t.tabMap}`},
    {id:"timeline",label:`⏱️ ${t.tabTimeline}`},{id:"prep",label:`📊 ${t.tabPrep}`},
    {id:"roles",label:`👥 ${t.tabRoles}`},{id:"brief",label:`📜 ${t.tabBrief}`},
  ];
  const card={background:"linear-gradient(135deg,#111827 0%,#1e293b 100%)",border:"1px solid #1e3a5f",borderRadius:10,padding:16,marginBottom:12};
  const inp={background:"#0f172a",border:"1px solid #334155",borderRadius:4,padding:"5px 8px",color:"#e2e8f0",fontSize:11,fontFamily:"'JetBrains Mono',monospace",width:"100%"};
  const isRTL=uiLang==="ar"||uiLang==="fa";

  return(
    <div style={{minHeight:"100vh",background:"#0a0e1a",color:"#e2e8f0",fontFamily:"'JetBrains Mono','Fira Code',monospace",direction:isRTL?"rtl":"ltr"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#0f172a,#1e3a5f,#0f172a)",borderBottom:"2px solid #fbbf24",padding:16,textAlign:"center",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:6}}>
          <LangPicker value={uiLang} onChange={handleLang} disabled={loading} cached={cached}/>
          {loading&&<span style={{fontSize:10,color:"#fbbf24"}}>⏳ {t.translating}</span>}
        </div>
        <div style={{fontSize:11,color:"#fbbf24",letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>{t.headerSub}</div>
        <div style={{fontSize:22,fontWeight:800,color:"#f8fafc",letterSpacing:1}}>{t.headerTitle}</div>
        <div style={{fontSize:13,color:"#94a3b8",marginTop:4}}>
          <span style={{color:"#60a5fa",fontWeight:700}}>Era8 (E#008)</span> ⚔️{" "}
          <span style={{color:"#f87171",fontWeight:700}}>{config.oppServer} ({oppCode})</span> ·{" "}
          <span style={{color:isDefense?"#f59e0b":"#4ade80"}}>{isDefense?`🛡️ ${t.defending}`:`⚔️ ${t.attacking}`}</span>
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{t.invasionLabel} · {config.invasionTime}</div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",overflowX:"auto",background:"#0f172a",borderBottom:"1px solid #1e3a5f",padding:"0 8px",direction:"ltr"}}>
        {tabs.map(tb=>(
          <button key={tb.id} onClick={()=>setActiveTab(tb.id)} style={{flex:"none",padding:"10px 14px",fontSize:11,fontFamily:"inherit",background:activeTab===tb.id?"#1e293b":"transparent",color:activeTab===tb.id?"#fbbf24":"#64748b",border:"none",borderBottom:activeTab===tb.id?"2px solid #fbbf24":"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{tb.label}</button>
        ))}
      </div>

      <div style={{padding:12,maxWidth:720,margin:"0 auto"}}>

        {activeTab==="overview"&&(<>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:10}}>⚡ {t.sitBrief}</div>
            <div style={{fontSize:12,lineHeight:1.8,color:"#cbd5e1"}}>
              <p style={{margin:"0 0 8px"}}><strong style={{color:"#f87171"}}>{config.oppServer}</strong> {t.wonPrepWith} <strong>{config.totalOpp}B</strong> {t.vsOur} <strong>{config.totalOur}B</strong>. {isDefense?t.theyInvade:t.weInvade}</p>
              <p style={{margin:0}}><strong>{t.strategy}</strong> {isDefense?t.stratDefense:t.stratOffense}</p>
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:10}}>🏰 {t.allianceOverview}</div>
            <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"52px 1fr 48px 52px 65px 65px",gap:6,padding:"0 8px",marginBottom:6,minWidth:440}}>
                <span style={{fontSize:9,color:"#64748b"}}></span>
                <span style={{fontSize:9,color:"#64748b"}}>{t.colRole}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"center"}}>{t.colAllies}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"center"}}>{t.colExpected}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"right"}}>{t.colPower}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"right"}}>{t.colMerits}</span>
              </div>
              {config.alliances.map((a,i)=>(
                <div key={a.tag} style={{display:"grid",gridTemplateColumns:"52px 1fr 48px 52px 65px 65px",gap:6,alignItems:"center",padding:8,background:"#0f172a",borderRadius:6,borderLeft:`3px solid ${a.color}`,marginBottom:i<3?6:0,minWidth:440}}>
                  <div style={{fontSize:13,fontWeight:800,color:a.color}}>{a.tag}</div>
                  <div>
                    <div style={{fontSize:10,color:"#e2e8f0"}}>{t[a.roleKey]||a.roleKey}</div>
                    <div style={{fontSize:9,color:"#fbbf24"}}>{a.teleportTime}</div>
                  </div>
                  <div style={{fontSize:11,color:"#cbd5e1",textAlign:"center"}}>{a.allies}</div>
                  <div style={{textAlign:"center"}}><input value={a.expected} onChange={e=>updateExpected(i,e.target.value)} style={{...inp,width:40,textAlign:"center",padding:"3px 4px",fontSize:11}} placeholder="—"/></div>
                  <div style={{fontSize:10,color:"#cbd5e1",textAlign:"right"}}>{fmt(a.power)}</div>
                  <div style={{fontSize:10,color:"#cbd5e1",textAlign:"right"}}>{fmt(a.merits)}</div>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"52px 1fr 48px 52px 65px 65px",gap:6,padding:"8px 8px 0",marginTop:6,borderTop:"1px solid #334155",minWidth:440}}>
                <div style={{fontSize:10,fontWeight:700,color:"#94a3b8"}}>{t.colTotal}</div><div></div>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>{sumF(config.alliances,"allies")}</div>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>{config.alliances.reduce((s,a)=>s+(parseInt(a.expected)||0),0)||"—"}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#e2e8f0",textAlign:"right"}}>{fmtN(sumF(config.alliances,"power"))}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#e2e8f0",textAlign:"right"}}>{fmtN(sumF(config.alliances,"merits"))}</div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#f87171",marginBottom:10}}>🔴 {t.oppIntel} — {config.oppServer}</div>
            <div style={{fontSize:10,color:"#64748b",marginBottom:8}}>{t.oppAlliancesSub} {config.oppServer}</div>
            <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 52px 1fr 48px 65px 65px",gap:6,padding:"0 8px",marginBottom:6,minWidth:400}}>
                <span style={{fontSize:9,color:"#64748b"}}>#</span>
                <span style={{fontSize:9,color:"#64748b"}}>Tag</span>
                <span style={{fontSize:9,color:"#64748b"}}>Name</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"center"}}>{t.colAllies}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"right"}}>{t.colPower}</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"right"}}>{t.colMerits}</span>
              </div>
              {config.oppAlliances.map((a,i)=>(
                <div key={a.tag} style={{display:"grid",gridTemplateColumns:"28px 52px 1fr 48px 65px 65px",gap:6,alignItems:"center",padding:8,background:"#0f172a",borderRadius:6,borderLeft:"3px solid #f87171",marginBottom:i<3?6:0,minWidth:400}}>
                  <div style={{fontSize:11,color:"#f87171",fontWeight:700}}>{a.rank}</div>
                  <div style={{fontSize:12,fontWeight:800,color:"#f87171"}}>{a.tag}</div>
                  <div style={{fontSize:10,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
                  <div style={{fontSize:11,color:"#cbd5e1",textAlign:"center"}}>{a.allies}</div>
                  <div style={{fontSize:10,color:"#cbd5e1",textAlign:"right"}}>{fmt(a.power)}</div>
                  <div style={{fontSize:10,color:"#cbd5e1",textAlign:"right"}}>{fmt(a.merits)}</div>
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"28px 52px 1fr 48px 65px 65px",gap:6,padding:"8px 8px 0",marginTop:6,borderTop:"1px solid #334155",minWidth:400}}>
                <div></div>
                <div style={{fontSize:10,fontWeight:700,color:"#94a3b8"}}>{t.colTotal}</div>
                <div></div>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",textAlign:"center"}}>{config.oppAlliances.reduce((s,a)=>s+a.allies,0)}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#e2e8f0",textAlign:"right"}}>{fmtN(config.oppAlliances.reduce((s,a)=>s+(parseInt(String(a.power).replace(/,/g,""),10)||0),0))}</div>
                <div style={{fontSize:10,fontWeight:700,color:"#e2e8f0",textAlign:"right"}}>{fmtN(config.oppAlliances.reduce((s,a)=>s+(parseInt(String(a.merits).replace(/,/g,""),10)||0),0))}</div>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:6}}>🐋 {t.krakenTargets}</div>
            <div style={{fontSize:10,color:"#64748b",marginBottom:10}}>{t.krakenDesc}</div>
            <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr 52px 75px",gap:6,padding:"0 8px",marginBottom:6,minWidth:300}}>
                <span style={{fontSize:9,color:"#64748b"}}>#</span>
                <span style={{fontSize:9,color:"#64748b"}}>Name</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"center"}}>Alliance</span>
                <span style={{fontSize:9,color:"#64748b",textAlign:"right"}}>{t.colPower}</span>
              </div>
              {config.krakens.map((k,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 52px 75px",gap:6,alignItems:"center",padding:"6px 8px",background:i%2===0?"#0f172a":"transparent",borderRadius:4,minWidth:300}}>
                  <div style={{fontSize:11,color:i<3?"#fbbf24":"#94a3b8",fontWeight:i<3?700:400}}>{k.rank}</div>
                  <div style={{fontSize:11,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k.name}</div>
                  <div style={{fontSize:10,color:"#f87171",textAlign:"center",fontWeight:700}}>{k.alliance}</div>
                  <div style={{fontSize:10,color:"#cbd5e1",textAlign:"right"}}>{fmt(k.power)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <label style={{fontSize:11,color:"#94a3b8"}}>{t.oppServerLabel}<input value={config.oppServer} onChange={e=>setConfig(p=>({...p,oppServer:e.target.value}))} style={{...inp,marginTop:2}}/></label>
              <label style={{fontSize:11,color:"#94a3b8"}}>{t.invTimeLabel}<input value={config.invasionTime} onChange={e=>setConfig(p=>({...p,invasionTime:e.target.value}))} style={{...inp,marginTop:2}}/></label>
            </div>
            <label style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:8,marginTop:10}}>
              <input type="checkbox" checked={config.weWonPrep} onChange={e=>setConfig(p=>({...p,weWonPrep:e.target.checked}))}/>{t.wonPrepCheck}
            </label>
          </div>
        </>)}

        {activeTab==="map"&&(<>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>🗺️ {t.battlefield} — {isDefense?t.defPositions:t.offPositions}</div>
            <div style={{fontSize:10,color:"#94a3b8",marginBottom:12}}>{t.mapDesc}</div>
            <ZoomableMap>
              <DiamondMap alliances={config.alliances} isDefense={isDefense} t={t}/>
            </ZoomableMap>
          </div>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>🏗️ {t.towerAssign}</div>
            {config.alliances.map((a,i)=>(
              <div key={a.tag} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<3?"1px solid #1e3a5f":"none"}}>
                <span style={{color:a.color,fontWeight:700,fontSize:12}}>{a.tag}</span>
                <span style={{fontSize:11,color:"#cbd5e1"}}>{towerIcon(a.tower)} {a.tower}</span>
              </div>
            ))}
            <div style={{fontSize:10,color:"#f59e0b",marginTop:8}}>⚠️ {t.towerWarn}</div>
          </div>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>💣 {t.warMachines}</div>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr 1fr",gap:"6px 16px",fontSize:11}}>
              <div></div><div style={{color:"#94a3b8",textAlign:"center"}}>Trebs (12)</div><div style={{color:"#94a3b8",textAlign:"center"}}>Rams (3)</div><div style={{color:"#94a3b8",textAlign:"center"}}>Esc (3)</div>
              {config.alliances.map(a=>[
                <div key={`l${a.tag}`} style={{color:a.color,fontWeight:700}}>{a.tag}</div>,
                <div key={`t${a.tag}`} style={{textAlign:"center",color:"#cbd5e1"}}>12</div>,
                <div key={`r${a.tag}`} style={{textAlign:"center",color:"#cbd5e1"}}>3</div>,
                <div key={`e${a.tag}`} style={{textAlign:"center",color:"#cbd5e1"}}>3</div>,
              ])}
            </div>
            <div style={{fontSize:10,color:"#94a3b8",marginTop:8,lineHeight:1.6}}>{t.siegeDesc}</div>
            <div style={{fontSize:10,color:"#64748b",marginTop:4}}>{t.siegeStats}</div>
            <div style={{fontSize:10,color:"#f59e0b",marginTop:6}}>⚠️ {t.siegeWarn}</div>
          </div>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>🏛️ {t.icHoldTitle}</div>
            <ul style={{margin:0,paddingLeft:18,fontSize:11,color:"#cbd5e1",lineHeight:1.8}}>
              <li>{t.icHoldRule1}</li><li>{t.icHoldRule2}</li><li>{t.icHoldRule3}</li>
            </ul>
          </div>
        </>)}

        {activeTab==="timeline"&&(
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:12}}>⏱️ {isDefense?t.defTimeline:t.offTimeline}</div>
            {tlPhases.map((ph,i)=>(
              <div key={i} style={{display:"flex",gap:12,marginBottom:16}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:20,flexShrink:0}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:PHASE_COLORS[i]||"#94a3b8",border:"2px solid #0f172a",boxShadow:`0 0 6px ${PHASE_COLORS[i]||"#94a3b8"}`}}/>
                  {i<tlPhases.length-1&&<div style={{width:2,flex:1,background:"#1e3a5f",marginTop:2}}/>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:PHASE_COLORS[i]||"#94a3b8",fontWeight:700,letterSpacing:1}}>{tlTimes[i]}</div>
                  <div style={{fontSize:12,fontWeight:700,color:"#f8fafc",margin:"2px 0"}}>{ph.phase}</div>
                  <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.5}}>{ph.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab==="prep"&&(<>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:4}}>📊 {t.prepResults}</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,fontSize:12}}>
              <span><span style={{color:"#60a5fa"}}>■</span> Era8: <strong>{config.totalOur}B</strong></span>
              <span><span style={{color:"#f87171"}}>■</span> {config.oppServer}: <strong>{config.totalOpp}B</strong></span>
            </div>
            <PrepChart stages={config.prepStages}/>
          </div>
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>✏️ {t.editStage}</div>
            {config.prepStages.map((s,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6,marginBottom:6,alignItems:"center"}}>
                <span style={{fontSize:11,color:"#cbd5e1"}}>{s.name}</span>
                <input type="number" step="0.1" value={s.ourPts} onChange={e=>updateStage(i,"ourPts",e.target.value)} style={{...inp,border:"1px solid #1e40af",color:"#60a5fa",textAlign:"center",width:"auto"}}/>
                <input type="number" step="0.1" value={s.oppPts} onChange={e=>updateStage(i,"oppPts",e.target.value)} style={{...inp,border:"1px solid #991b1b",color:"#f87171",textAlign:"center",width:"auto"}}/>
              </div>
            ))}
          </div>
        </>)}

        {activeTab==="roles"&&(<>
          {config.alliances.map(a=>(
            <div key={a.tag} style={card}>
              <div style={{fontSize:13,fontWeight:700,color:a.color,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <span>{a.tag} — {t[a.roleKey]||a.roleKey}</span>
                <span style={{fontSize:10,color:"#64748b"}}>{a.teleportTime}</span>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#fbbf24",marginBottom:2,letterSpacing:1}}>📣 {t.rallyLead}</div>
                <div style={{fontSize:9,color:"#64748b",marginBottom:4}}>{t.rallyLeadDesc}</div>
                <input value={config.roles[a.tag]?.rallyLead} onChange={e=>updateRole(a.tag,"rallyLead",e.target.value)} style={inp}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#fbbf24",marginBottom:2,letterSpacing:1}}>🚕 {t.taxiRunners}</div>
                <div style={{fontSize:9,color:"#64748b",marginBottom:4}}>{t.taxiRunnersDesc}</div>
                {config.roles[a.tag]?.taxiRunners.map((n,i)=>(<input key={i} value={n} onChange={e=>updateRole(a.tag,"taxiRunners",e.target.value,i)} style={{...inp,marginBottom:3}}/>))}
              </div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:10,color:"#fbbf24",marginBottom:2,letterSpacing:1}}>🎯 {t.siegeCoord}</div>
                <div style={{fontSize:9,color:"#64748b",marginBottom:4}}>{t.siegeCoordDesc}</div>
                <input value={config.roles[a.tag]?.siegeCoord} onChange={e=>updateRole(a.tag,"siegeCoord",e.target.value)} style={inp}/>
              </div>
              <div>
                <div style={{fontSize:10,color:"#fbbf24",marginBottom:2,letterSpacing:1}}>🔧 {t.siegeHelpers}</div>
                <div style={{fontSize:9,color:"#64748b",marginBottom:4}}>{t.siegeHelpersDesc}</div>
                {config.roles[a.tag]?.siegeHelpers.map((n,i)=>(<input key={i} value={n} onChange={e=>updateRole(a.tag,"siegeHelpers",e.target.value,i)} style={{...inp,marginBottom:3}}/>))}
              </div>
            </div>
          ))}
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:8}}>🚕 {t.taxiProtocol}</div>
            <ol style={{margin:0,paddingLeft:18,fontSize:11,color:"#cbd5e1",lineHeight:1.8}}>
              <li>{t.taxiStep1}</li><li>{t.taxiStep2}</li><li>{t.taxiStep3}</li><li>{t.taxiStep4}</li><li>{t.taxiStep5}</li>
            </ol>
            <div style={{fontSize:10,color:"#f59e0b",marginTop:8}}>⚠️ {t.taxiWarn}</div>
          </div>
        </>)}

        {activeTab==="brief"&&(
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,color:"#fbbf24",marginBottom:4}}>📜 {t.briefTitle}</div>
            <div style={{fontSize:10,color:"#64748b",marginBottom:10}}>{t.briefDesc}</div>
            <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:11,lineHeight:1.7,color:"#cbd5e1",background:"#0a0e1a",padding:12,borderRadius:6,border:"1px solid #1e3a5f",maxHeight:500,overflowY:"auto",direction:"ltr"}}>{briefText}</pre>
            <button onClick={()=>navigator.clipboard?.writeText(briefText)} style={{marginTop:8,padding:"6px 16px",fontSize:11,background:"#1e3a5f",border:"1px solid #334155",borderRadius:4,color:"#fbbf24",cursor:"pointer",fontFamily:"inherit"}}>📋 {t.copy}</button>
          </div>
        )}
      </div>

      <div style={{textAlign:"center",padding:16,fontSize:9,color:"#334155",borderTop:"1px solid #1e3a5f"}}>TME Command Center · TommyTorpedo · Era8 · v1.4</div>
    </div>
  );
}
