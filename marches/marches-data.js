/* =====================================================================
   AoEM Era 8 — My Marches : DATA
   ---------------------------------------------------------------------
   Thomas's (TommyTorpedo) 5 marches, 3 heroes each. Transcribed from
   in-game screenshots. The page (index.html) only renders this.

   SCHEMA (per hero):
     id, name, isCommander, role (profile combat tag), heroLevel/heroLevelMax,
     stars (of 5), specialty, unitTypes[], damageType, active, unitCapacity
     gear: { helm, gauntlets, chest, boots }
        each: { name, level, starRank (of 4), bonuses:[{stat,value}], gems }
        gems: null  ->  GEM LOADOUTS ARE A PLACEHOLDER. The *_Gems.jpeg
        screenshots actually showed the ASCEND screen, not gem slots.
        Thomas will provide gem screenshots later; fill the gems array then:
        gems: [{ slot:1, name:"", rarity:"grey|green|blue|purple|gold|red", tier:"", effect:"" }, ...x3]
     ring: { name, level, rarity (blue<=30/purple<=40/gold<=50), buffs:[{stat,value}], trait:{name,activation,desc} }
     mount: { name, temperament, stats:[{stat,value}], traits:[{name,rarity,desc}] }
     adornment: { name, level (<=60), trait:{name,rarity (blue/purple/yellow/red),desc}, buffs:[{stat,value,locked}] }
     skills: { commander:{name,rageCost,desc},
               signature:{name,skillType,activation,level,desc},
               secondaryEquipped:[{name,skillType,activation,level,diamondRank,desc}],
               secondaryPool:[{name,desc}] }
     notes: optional string (transcription caveats)

   GAME CONSTANTS: hero max level 165 (Thomas's current cap 155); gear max
   Lv.80, 4 gold stars = fully ascended; rings blue<=30/purple<=40/gold<=50;
   adornments max Lv.60, trait rarity blue->purple->yellow->red.
   ===================================================================== */

const MARCHES = [

/* =================================================================== */
/* MARCH 1 — WARRIOR SWORDSMEN  (Commander: Miyamoto)                  */
/* =================================================================== */
{
  id: "warrior_swordsmen",
  name: "Warrior Swordsmen",
  specialty: "warrior",
  unitType: "swordsman",
  commanderId: "miyamoto",
  heroes: [
    {
      id: "miyamoto", name: "Miyamoto Musashi", isCommander: true,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["swordsman"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] }
      },
      ring: { name: "Ring of Bear", level: 20, rarity: "purple",
        buffs: [{stat:"Commander's Might Damage", value:"+4.8%"}, {stat:"Troop's Attack", value:"+8.4%"}],
        trait: { name: "All Out", activation: "100%", desc: "Reduces all your heroes' armor by 20.00 and increases the commander's might by 51.67." } },
      mount: { name: "Highland Horse", temperament: "Warbred",
        stats: [{stat:"Might", value:"3.5"}, {stat:"Armor", value:"2.9"}],
        traits: [{name:"Overpower", rarity:"red", desc:"Mounted hero's active skill might damage increases by 10%."}] },
      adornment: { name: "Swift Blade", level: 37,
        trait: { name: "Wavebreaker", rarity: "purple", desc: "Trait active on this adornment (see in-game for full text)." },
        buffs: [{stat:"Swordsmen's Attack", value:"+12.40%", locked:false}, {stat:"Swordsmen's Health", value:"+3.90%", locked:false}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Flash of Yang", rageCost: 250, desc: "Deals might damage to up to 3 enemy troops in the fan-shaped area in front (damage rate: 425.00%, might bonus) and reduces the targets' skill damage by 20.00% (might bonus) for 6s. Grants 120 initial rage upon entering battle." },
        signature: { name: "Moment of Yin", skillType: "active", activation: "28%", level: 40, desc: "Deals 1 instance of might damage to the enemy (damage rate: 390.00%, might bonus) and has a 50.00% chance to let the hero with the highest might (excluding the caster) cast a signature active skill or a turn-based skill, while increasing the extra skill's damage by 30.00% (might bonus)." },
        secondaryEquipped: [
          { name: "Peerless Strike", skillType: "active", activation: "25%", level: 40, diamondRank: 4, desc: "Deals high might damage to the enemy troop (damage rate: 350.00%, might bonus)." },
          { name: "Furious Charge", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "Every time the hero activates their Signature Skill (except passive skills), increases the hero's might damage by 19.50%. Up to 5 stacks." }
        ],
        secondaryPool: [
          { name: "Earth Crush", desc: "Deals might damage to the enemy troop (damage rate: 200.00%, might bonus) and inflicts Rout, dealing might damage every second (damage rate: 20.10%, might bonus) for 6s." },
          { name: "Crashing Boulder", desc: "Deals might damage to the enemy troop (damage rate: 149.65%, might bonus)." },
          { name: "Shield Slam", desc: "Deals might damage to the enemy troop (damage rate: 156.95%, might bonus, armor bonus)." },
          { name: "High Spirit", desc: "Increases the activation chance of the hero's active skills by 12.06% (15.08% for charging skills)." }
        ]
      }
    },
    {
      id: "scipio", name: "Scipio Africanus", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["swordsman"], damageType: "Might", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] }
      },
      ring: { name: "Divine Warrior", level: 20, rarity: "gold",
        buffs: [{stat:"Troop's Damage", value:"+4.8%"}, {stat:"Troop's Attack", value:"+4.8%"}, {stat:"Troop's Defense", value:"+4.8%"}],
        trait: { name: "Right-hand Talent", activation: "100%", desc: "Reduces the secondary strike skill damage of all heroes in your troop by 19.62% (cannot be purified); increases the active skill damage of the other 2 heroes in this troop by 9.81%, and increases the activation chance of customizable active skills by 0.98%." } },
      mount: { name: "Steppe Horse", temperament: "Protective",
        stats: [{stat:"Might", value:"4.0"}, {stat:"Armor", value:"2.7"}],
        traits: [{name:"Lifesaver", rarity:"red", desc:"After the mounted hero causes recovery effects, all damage taken by your troop reduces by 4.8% for 3s."}] },
      adornment: { name: "Swift Blade", level: 1,
        trait: { name: "Charge", rarity: "blue", desc: "After entering battle, the mounted hero's first 3 signature skills deal 7.65% increased damage." },
        buffs: [{stat:"Swordsmen's Attack", value:"+1%", locked:false}, {stat:"Swordsmen's Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Disciplined Code", rageCost: 300, desc: "Recovers your units every second (recovery rate: 30.00%, might bonus), increases the damage of your other heroes' signature active skills by 10.00%, and increases their activation chance by 5.00% for 9s." },
        signature: { name: "African Conquest", skillType: "passive", activation: "100%", level: 40, desc: "After your commander activates their signature active skill, reduces damage taken by your troop by 30.00% for 3s. After triggering 4 times, your troop enters the \"Conquest\" state (activation count does not accumulate during this period) for 6s. During this state, your commander's signature active skill can deal critical strikes." },
        secondaryEquipped: [
          { name: "One-Man Army", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "Increases the chance for other heroes in your troop to activate their signature active skill by 15.00%. After a signature active skill is used, boosts the signature active skill damage of all other heroes in your troop by 15.00% (might bonus) for 3s." },
          { name: "Bloodthirst", skillType: "active", activation: "25%", level: 40, diamondRank: 4, desc: "Deals might damage to the enemy troop (damage rate: 300.00%, might bonus) and recovers your units (recovery rate: 135.00%, might bonus)." }
        ],
        secondaryPool: [
          { name: "Righteous Judgement", desc: "Enters Charging State. After 3s, deals might damage to the enemy troop (damage rate: 79.79%, might bonus) and reduces all enemy heroes' might and strategy by 17.88 (might bonus) for 3s." },
          { name: "Crashing Boulder", desc: "Deals might damage to the enemy troop (damage rate: 149.65%, might bonus)." },
          { name: "Fortification", desc: "After the hero recovers units, increases all your heroes' armor by 80.30 for 3s (triggers every 6s)." },
          { name: "King's Blade", desc: "Deals might damage to the enemy troop every 9s (damage rate: 200.00%, might bonus), with a 46% chance to increase all your heroes' damage by 20.10% for 3s." }
        ]
      },
      notes: "Signature 'African Conquest' description trails off in-game after the critical-strike clause."
    },
    {
      id: "lagertha", name: "Lagertha", isCommander: false,
      role: "Piercing", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["swordsman"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+1.2%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] }
      },
      ring: { name: "Tranquil Water", level: 20, rarity: "blue",
        buffs: [{stat:"Troop's Skill Damage Reduction", value:"+4.8%"}, {stat:"Troop's Defense", value:"+4.8%"}, {stat:"Troop's Health", value:"+2.4%"}],
        trait: { name: "Light's Protection", activation: "100%", desc: "For the first 18s after entering battle, reduces your troop's damage taken by 15.70%." } },
      mount: { name: "Steppe Horse", temperament: "Warbred",
        stats: [{stat:"Strategy", value:"3.4"}, {stat:"Siege", value:"2.9"}],
        traits: [{name:"Overpower", rarity:"red", desc:"Mounted hero's active skill might damage increases by 10%."}, {name:"Gallant", rarity:"purple", desc:"Mounted hero's secondary strike skill might damage increases (value truncated in-game)."}] },
      adornment: { name: "Swift Blade", level: 11,
        trait: { name: "Blazing Edge", rarity: "blue", desc: "When the mounted hero activates their signature active skill, there is a 45% chance to deal might damage to enemies (damage rate: 60.6%, might bonus), triggers up to once every 3s (only effective in world solo PVP battles)." },
        buffs: [{stat:"Swordsmen's Attack", value:"+7%", locked:false}, {stat:"Swordsmen's Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Berserker's Shield Dance", rageCost: 250, desc: "Deals 3 instances of might damage to enemy troops (damage rate: 150.00%, might bonus), causes the hero to ignore 10.00% defense when dealing damage, and increases the activation chance of signature active skills by 5.00% for 6s. Grants 50 initial rage upon entering battle." },
        signature: { name: "Valkyrie's Edge", skillType: "active", activation: "25%", level: 40, desc: "Deals might damage to the enemy troop (damage rate: 210.00%, might bonus) with a 40.00% chance (increases by 10.00% every 3s, up to 80.00%) to ignore 15.00% of enemy defense. When dealing defense-ignoring damage, recovers 40.00% of the damage dealt as units. Applies \"Judgment\" to your hero and the commander. When activating a signature active skill, there is a 65.00% chance to cast it an additional time (damage reduced by 30.00%, max 1/turn). Upon entering combat, increases the activation chance of your first Signature Skill by 60.00%, and the first Judgment trigger chance to 100.00% (cooldown 60s)." },
        secondaryEquipped: [
          { name: "Raging Bloodline", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "After using 3 signature active skills, increases the might of your hero with the highest might by 50.00, increases their damage by 10.00% (might bonus), and reduces critical strike damage taken by 30.00% for 6s." },
          { name: "Peerless Strike", skillType: "active", activation: "25%", level: 40, diamondRank: 4, desc: "Deals high might damage to the enemy troop (damage rate: 350.00%, might bonus)." }
        ],
        secondaryPool: [
          { name: "High Spirit", desc: "Increases the activation chance of the hero's active skills by 12.06% (15.08% for charging skills)." },
          { name: "Crashing Boulder", desc: "Deals might damage to the enemy troop (damage rate: 149.65%, might bonus)." },
          { name: "Shield Slam", desc: "Deals might damage to the enemy troop (damage rate: 156.95%, might bonus, armor bonus)." },
          { name: "Bloodthirst", desc: "Deals might damage to the enemy troop (damage rate: 60.60%, might bonus) and recovers your units (recovery rate: 27.27%, might bonus)." }
        ]
      },
      notes: "Mount stat panel shows Strategy/Siege on this screen. 'Gallant' trait text truncated in-game."
    }
  ]
},

/* =================================================================== */
/* MARCH 2 — TACTICIAN SWORDSMEN  (Commander: Ramesses II)             */
/* =================================================================== */
{
  id: "tactician_swordsmen",
  name: "Tactician Swordsmen",
  specialty: "tactician",
  unitType: "swordsman",
  commanderId: "ramsses",
  heroes: [
    {
      id: "ramsses", name: "Ramesses II", isCommander: true,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "tactician", unitTypes: ["swordsman"], damageType: "Strategy", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] }
      },
      ring: { name: "Ring of Serpent", level: 31, rarity: "purple",
        buffs: [{stat:"Troop's Attack", value:"+14.0%"}, {stat:"Troop's Defense", value:"+10.5%"}],
        trait: { name: "Strategy and Might", activation: "100%", desc: "Increases the hero's strategy by 46.66 (might bonus)." } },
      mount: { name: "Steppe Horse", temperament: "Alert",
        stats: [{stat:"Might", value:"3.7"}, {stat:"Strategy", value:"3.2"}],
        traits: [{name:"Spiritbond", rarity:"red", desc:"Mounted hero's active skill strategy damage increases by 20%."}] },
      adornment: { name: "Mystic Mirror", level: 60,
        trait: { name: "Calculation", rarity: "red", desc: "When the mounted hero activates their signature active skill, increases strategy by 4.51, stacking up to 3 times. When fully stacked, increases signature active skill damage by 10.83%." },
        buffs: [{stat:"Swordsmen's Defense", value:"+12.40%", locked:false}, {stat:"Swordsmen's Health", value:"+4.50%", locked:false}, {stat:"Troop's Damage Taken Reduction", value:"+4.50%", locked:false}] },
      skills: {
        commander: { name: "Son of Ra", rageCost: 280, desc: "Reduces the movement speed of 3 enemies in the area by 20.00% for 3s. Enters the Holy Blessing state, increasing strategy by 30.00 and activating an additional Signature Skill once per second (damage reduced by 40%, cannot be purified), with a chance to nullify Silence effects; lasts 9s. Grants 150 initial rage upon entering battle." },
        signature: { name: "Storms of Set", skillType: "active", activation: "30%", level: 40, desc: "Deals strategy damage to the enemy troop (damage rate: 245.00%, strategy bonus). For the first 30s of battle, each Signature Skill activation additionally recovers rage; this reduces after 30s. Other rage recovery effects for your troop do not take effect." },
        secondaryEquipped: [
          { name: "Flame of Genesis", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "Each time the hero activates the signature active skill, increases the hero's strategy by 30.00, up to 6 stacks. For every 3 activations of the signature active skill, increases the damage of the next signature active skill by 25.00%." },
          { name: "Strategy Master's Gift", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "Increases the hero's strategy damage by 30.00% and the activation chance of signature active skills by 15.00%." }
        ],
        secondaryPool: [
          { name: "Ultimate Strategy", desc: "Deals 1 instance of strategy damage to the enemy troop (damage rate: 70.70%, strategy bonus)." },
          { name: "High Spirit", desc: "Increases the activation chance of the hero's active skills by 3.64% (4.55% for charging skills)." },
          { name: "Suppression", desc: "Deals strategy damage to the enemy troop (damage rate: 131.40%, strategy bonus) and reduces the enemy commander's stats." },
          { name: "Deception", desc: "Deals 1 instance of strategy damage to the enemy troop (damage rate: 149.65%, strategy bonus)." }
        ]
      },
      notes: "Some green inline values in Son of Ra (Silence-nullify %) and Storms of Set (rage amounts) were not legible in-game."
    },
    {
      id: "confucius", name: "Confucius", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "tactician", unitTypes: ["swordsman"], damageType: "Strategy", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] }
      },
      ring: { name: "Lofty Mountain", level: 11, rarity: "gold",
        buffs: [{stat:"Commander's Damage", value:"+3.0%"}, {stat:"Troop's Defense", value:"+6.0%"}, {stat:"Troop's Health", value:"+1.5%"}],
        trait: { name: "Accumulating Strength", activation: "100%", desc: "For the first 18s after entering battle, reduces your troop's might damage taken by 4.06% (armor bonus). After 18s, increases your troop's damage by 4.06% (strategy bonus)." } },
      mount: { name: "White Jade Lion", temperament: "Docile",
        stats: [{stat:"Might", value:"5.2"}, {stat:"Armor", value:"7.3"}],
        traits: [{name:"Bedrock", rarity:"red", desc:"Your troop's all damage taken reduces by 2.4%."}] },
      adornment: { name: "Mystic Mirror", level: 40,
        trait: { name: "Thunder", rarity: "blue", desc: "After the mounted hero launches a normal attack, there's a 70% chance to increase the hero's next skill damage by 8.3% for 3s." },
        buffs: [{stat:"Swordsmen's Defense", value:"+12.40%", locked:false}, {stat:"Swordsmen's Health", value:"+4.50%", locked:false}, {stat:"Troop's Damage Taken Reduction", value:"+0.50%", locked:false}] },
      skills: {
        commander: { name: "Benevolent Heart", rageCost: 300, desc: "For the next 6s, recovers your units once per second (recovery rate: 60.00%, strategy bonus) and doubles the unit recovery effect of Disciplined." },
        signature: { name: "Disciplined", skillType: "active", activation: "30%", level: 40, desc: "Applies \"Disciplined\" to your troop for 6s. While active, each time your troop takes skill damage (continuous damage excluded), recovers units (strategy bonus; up to 2/sec). Every 9 unit-recovery triggers, the highest-strategy hero immediately activates their signature active skill (every 6s, effective as second-in-command) with bonus damage (strategy bonus). After entering battle, increases this skill's trigger chance for 3s. Each signature-active-skill activation stacks this skill's trigger chance (up to 4, max 1 stack/3s) and reduces your troop's damage taken (strategy bonus; up to 8 stacks)." },
        secondaryEquipped: [
          { name: "Spring Breeze", skillType: "active", activation: "35%", level: 40, diamondRank: 4, desc: "Recovers your troop's units (recovery rate: 140.00%, strategy bonus) and reduces might damage taken by 12.00% for 3s. 50.00% chance to recover units an additional 2 times per activation (recovery rate: 60.00%, strategy bonus)." },
          { name: "Peaceful Haven", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "After the hero recovers units, reduces your troop's damage taken by 20.00% for 3s." }
        ],
        secondaryPool: [
          { name: "War Tactic", desc: "Deals strategy damage to the enemy troop (damage rate: 56.56%, strategy bonus) and recovers your troop's units (recovery rate: ~31.31%, strategy bonus)." },
          { name: "Conflagration", desc: "Deals strategy damage to the enemy troop (damage rate: 59.60%, strategy bonus) and inflicts Burn, dealing strategy damage every second." },
          { name: "Suppression", desc: "Deals strategy damage to the enemy troop (damage rate: 131.40%, strategy bonus) and reduces the enemy commander's stats." },
          { name: "Sowing Discord", desc: "After a normal attack, deals strategy damage (damage rate: 135.05%, strategy bonus) and steals 21.90 strategy." }
        ]
      }
    },
    {
      id: "zhuge", name: "Zhuge Liang", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "tactician", unitTypes: ["swordsman"], damageType: "Strategy", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Blazing Heart", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        gauntlets: { name: "Flowing Force", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] },
        chest:     { name: "Infinite Land", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's defense bonus", value:"+19.58%"}, {stat:"Swordsmen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Swordsmen's damage taken reduction", value:"+2.4%"} ] },
        boots:     { name: "Shadowless Wind", level: 80, starRank: 4, gems: null, bonuses: [
          {stat:"Swordsmen's attack bonus", value:"+19.58%"}, {stat:"Swordsmen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+3.0%"} ] }
      },
      ring: { name: "Skyward Knight", level: 32, rarity: "gold",
        buffs: [{stat:"Commander's Damage", value:"+7.2%"}, {stat:"Troop's Attack", value:"+10.8%"}, {stat:"Troop's Defense", value:"+10.8%"}],
        trait: { name: "Cost of Victory", activation: "100%", desc: "Reduces the hero's damage dealt by 15.00% (cannot be purified). Increases your commander's damage by 9.43% (strategy bonus) and their signature active skill's activation chance by 5.54%." } },
      mount: { name: "Highland Horse", temperament: "Fearless",
        stats: [{stat:"Strategy", value:"3.5"}, {stat:"Might", value:"2.2"}],
        traits: [{name:"Lifesaver", rarity:"red", desc:"After the mounted hero causes recovery effects, all damage taken by your troop reduces by 4.8% for 3s."}] },
      adornment: { name: "Mystic Mirror", level: 37,
        trait: { name: "Blood Rage", rarity: "yellow", desc: "When your units fall below 50% of the max amount for the first time in battle, gains 12.46 rage immediately. Triggers at most once every 30s (only one hero's copy takes effect)." },
        buffs: [{stat:"Swordsmen's Defense", value:"+12.40%", locked:false}, {stat:"Swordsmen's Health", value:"+3.90%", locked:false}, {stat:"Troop's Damage Taken Reduction", value:"+0.50%", locked:false}] },
      skills: {
        commander: { name: "Stone Sentinel Maze", rageCost: 200, desc: "Reduces your troop's damage taken by 15.00% (strategy bonus) and enters the \"Qimen\" state: directly reduces the might skill damage taken equal to 1% of deployed units (up to 80% of the damage taken) and increases the commander's signature active skill damage, lasting 6s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Miracle of Qimen", skillType: "passive", activation: "100%", level: 40, desc: "Zhuge transfers 15.0% of his base attributes (using the commander's highest base attribute) to your commander at 1:1. For the first 12s, reduces troop damage taken by 25.00%, then 12.50%. Every 3s, enters \"Qimen\" for 2s: reduces might skill damage taken proportional to deployed units (up to 80%), boosts the commander's signature active skill damage (strategy bonus), and has a 50.00% chance to recover units (recovery rate: 200.00%, strategy bonus)." },
        secondaryEquipped: [
          { name: "Borrowing the East Wind", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "3s after entering battle, increases the commander's signature active skill damage by 30.00% and activation chance by 10.00% for 9s. Afterward, reduces to 15.00% damage and 5.00% activation until the battle ends." },
          { name: "Peaceful Haven", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "After the hero recovers units, reduces your troop's damage taken by 20.00% for 3s." }
        ],
        secondaryPool: [
          { name: "War Tactic", desc: "Deals strategy damage to the enemy troop (damage rate: 56.56%, strategy bonus) and recovers your troop's units (recovery rate: ~31.31%, strategy bonus)." },
          { name: "Conflagration", desc: "Deals strategy damage to the enemy troop (damage rate: 59.60%, strategy bonus) and inflicts Burn, dealing strategy damage every second." },
          { name: "Suppression", desc: "Deals strategy damage to the enemy troop (damage rate: 131.40%, strategy bonus) and reduces the enemy commander's stats." },
          { name: "Sowing Discord", desc: "After a normal attack, deals strategy damage (damage rate: 135.05%, strategy bonus) and steals 21.90 strategy." }
        ]
      }
    }
  ]
},

/* =================================================================== */
/* MARCH 3 — WARRIOR ARCHERS  (Commander: Hua Mulan)                   */
/* =================================================================== */
{
  id: "warrior_archers",
  name: "Warrior Archers",
  specialty: "warrior",
  unitType: "archer",
  commanderId: "mulan",
  heroes: [
    {
      id: "mulan", name: "Hua Mulan", isCommander: true,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["archer"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Fiery Sun", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+1.2%"} ] },
        gauntlets: { name: "Embrace of Effulgence", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] },
        chest:     { name: "Eternal Flare", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+1.2%"} ] },
        boots:     { name: "Dawnbreak Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.5%"} ] }
      },
      ring: { name: "Radiant Guardian", level: 20, rarity: "gold",
        buffs: [{stat:"Normal Attack Damage", value:"+11.5%"}, {stat:"Troop's Attack", value:"+4.8%"}, {stat:"Troop's Defense", value:"+4.8%"}],
        trait: { name: "Flurry of Blows", activation: "100%", desc: "Increases the hero's secondary strike skill activation chance by 1.63% every 6s and has a 55.00% chance to gain Double Attack for 3s." } },
      mount: { name: "Mountain Thunder", temperament: "Warbred",
        stats: [{stat:"Might", value:"14.1"}, {stat:"Armor", value:"15.8"}],
        traits: [{name:"Fierce", rarity:"purple", desc:"Mounted hero's normal attack damage increases by 17.1%."}, {name:"Gallant", rarity:"purple", desc:"Mounted hero's secondary strike skill might damage increases (value truncated in-game)."}] },
      adornment: { name: "Piercing Arrow", level: 1,
        trait: { name: "Resistance", rarity: "blue", desc: "For the first 18.0s in battle, the first 3 instances of skill damage taken reduce by 5.74% each, and damage taken reduces by 3.83%. After 18.0s, all damage taken reduces by 1.91%." },
        buffs: [{stat:"Archers' Attack", value:"+1%", locked:false}, {stat:"Archers' Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Flying Swallow", rageCost: 250, desc: "Deals 4 rapid-fire instances of might damage to the target (damage rate: 155.00%, might bonus). Grants 150 initial rage upon entering battle." },
        signature: { name: "Starchaser", skillType: "secondary_strike", activation: "26%", level: 40, desc: "After a normal attack, deals an extra instance of might damage to the target (damage rate: 300.00%, might bonus), which has an 85% chance to become 3 instances of might damage (damage rate: 190.00%, might bonus)." },
        secondaryEquipped: [
          { name: "Act of Mercy", skillType: "secondary_strike", activation: "25%", level: 40, diamondRank: 4, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 235.00%, might bonus). Increases your damage by 2.00% (up to 100%) for every 1% of units the target loses." },
          { name: "Double Attack", skillType: "active", activation: "40%", level: 40, diamondRank: 4, desc: "Enters the Double Attack state and increases the hero's might, strategy, and armor by 20.00 for 3s." }
        ],
        secondaryPool: [
          { name: "Weak Spot Attack", desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 247.90%, might bonus) and increases the hero's damage by 20.10% (might bonus) for 3s." },
          { name: "Furious Charge", desc: "Every time the hero activates their Signature Skill (except passive skills), increases the hero's might damage by 3.94%. Up to 5 stacks." },
          { name: "Armor Piercer", desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 182.50%, might bonus) and reduces all enemy heroes' armor by 50.00 for 3s." },
          { name: "Infuriation", desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 182.50%, might bonus) and increases the hero's might by 50.00 for 3s." }
        ]
      },
      notes: "Mount 'Mountain Thunder' Gallant trait % truncated in-game."
    },
    {
      id: "mehmed", name: "Mehmed II", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["archer"], damageType: "Might", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Fiery Sun", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Embrace of Effulgence", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Eternal Flare", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Dawnbreak Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Deer", level: 20, rarity: "purple",
        buffs: [{stat:"Commander's Damage", value:"+3.36%"}, {stat:"Troop's Damage Reduction", value:"+3.36%"}],
        trait: { name: "Coercion", activation: "100%", desc: "Reduces a random enemy hero's damage by 10.83% and increases one of your heroes' damage by 10.83%." } },
      mount: { name: "White Jade Lion", temperament: "Docile",
        stats: [{stat:"Might", value:"7.4"}, {stat:"Siege", value:"6.4"}],
        traits: [{name:"Lifesaver", rarity:null, desc:"After the mounted hero causes recovery effects, all damage taken by your troop reduces by 4.03% for 3s."}] },
      adornment: { name: "Piercing Arrow", level: 1,
        trait: { name: "Shadow Chaser", rarity: "blue", desc: "After the mounted hero launches a normal attack, there's a 65% chance to increase the hero's next skill damage by 7.65% for 3s." },
        buffs: [{stat:"Archers' Attack", value:"+1%", locked:false}, {stat:"Archers' Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Sultan Caesar", rageCost: 250, desc: "Increases the damage dealt by nearby allied troops (up to 3, your other troops prioritized) by 18.00%. Upon taking skill damage, recovers units equal to 15.00% of the damage taken for 9s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Fatih", skillType: "turn-based", activation: "100%", level: 40, desc: "Once every 6s, a 70.00% chance to trigger each effect separately: 1) reduces your troop's damage taken by 25.00% (might bonus) for 3s; 2) increases your troop's active & secondary strike skill damage by 30.00% (might bonus) for 3s." },
        secondaryEquipped: [
          { name: "Peaceful Haven", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "After the hero recovers units, reduces your troop's damage taken by 20.00% for 3s." },
          { name: "Owl's Lament", skillType: "passive", activation: "100%", level: 40, diamondRank: 4, desc: "Every 6s, recovers your units (recovery rate: 160.00%, might bonus). Upon taking skill damage, 75.00% chance to recover units equal to 25.00% of the damage taken for 3s (triggers once only)." }
        ],
        secondaryPool: [
          { name: "King's Blade", desc: "Deals might damage to the enemy troop every 9s (damage rate: 200.00%, might bonus), with a 46% chance to increase all your heroes' damage by 20.10% for 3s." },
          { name: "Bloodthirst", desc: "Deals might damage to the enemy troop (damage rate: 60.60%, might bonus) and recovers your units (recovery rate: 27.27%, might bonus)." },
          { name: "Crashing Boulder", desc: "Deals might damage to the enemy troop (damage rate: 149.65%, might bonus)." },
          { name: "Sunder", desc: "After a normal attack, deals might damage (damage rate: 180.00%, might bonus) and inflicts Rout, dealing might damage every second (damage rate: 25.55%, might bonus) for 3s." }
        ]
      }
    },
    {
      id: "bellevue", name: "Bellevue", isCommander: false,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["archer"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Fiery Sun", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Embrace of Effulgence", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Eternal Flare", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Archers' damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Dawnbreak Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Archers' damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Tulip", level: 30, rarity: "blue",
        buffs: [{stat:"Troop's Attack", value:"+6.8%"}, {stat:"Troop's Defense", value:"+6.8%"}],
        trait: { name: "Mighty Strike", activation: "25%", desc: "Deals might damage to the enemy troop (damage rate: 125.00%, might bonus)." } },
      mount: { name: "Wildfire", temperament: "Warbred",
        stats: [{stat:"Might", value:"7.6"}, {stat:"Armor", value:"5.5"}],
        traits: [{name:"Gallant", rarity:null, desc:"Mounted hero's secondary strike skill might damage increases by 6%."}, {name:"Overpower", rarity:null, desc:"Mounted hero's active skill might damage increases (value truncated in-game)."}] },
      adornment: { name: "Piercing Arrow", level: 1,
        trait: { name: "War Prep", rarity: "blue", desc: "When entering battle, if your units exceed 80% of deployment capacity, the mounted hero's all damage increases by 7.65% for 12s (effective once every 30s at most)." },
        buffs: [{stat:"Archers' Attack", value:"+1%", locked:false}, {stat:"Archers' Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Imminent Tempest", rageCost: 300, desc: "Deals 3 instances of might damage to the target (damage rate: 200.00%, might bonus), increasing the hero's might damage by 35.00% (might bonus) for 6s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Black Tide", skillType: "passive", activation: "100%", level: 40, desc: "There is a 75.00% chance to enter the Double Attack state for 3s. Increases the hero's might by 150.00 for every 6 normal attacks launched, for 9s." },
        secondaryEquipped: [
          { name: "Weak Spot Attack", skillType: "secondary_strike", activation: "20%", level: 40, diamondRank: 5, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 370.00%, might bonus) and increases the hero's damage by 30.00% (might bonus) for 3s." },
          { name: "Pay in Blood", skillType: "secondary_strike", activation: "25%", level: 40, diamondRank: 5, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 370.00%, might bonus) and recovers your units (recovery rate: 120.00%, might bonus)." }
        ],
        secondaryPool: [
          { name: "Dark Flag", desc: "After a normal attack, increases the might of your highest-might hero by 73.70 and reduces the armor of the enemy's highest-armor hero by 67.00, for 6s." },
          { name: "Act of Mercy", desc: "After a normal attack, deals might damage (damage rate: 47.47%, might bonus). Increases your damage by 2.00% (up to 100%) for every 1% of units the target loses." },
          { name: "Armor Piercer", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and reduces all enemy heroes' armor by 50.00 for 3s." },
          { name: "Infuriation", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and increases the hero's might by 50.00 for 3s." }
        ]
      },
      notes: "Mount 'Wildfire' Overpower trait % truncated in-game."
    }
  ]
},

/* =================================================================== */
/* MARCH 4 — WARRIOR CAVALRY  (Commander: Lü Bu)                       */
/* =================================================================== */
{
  id: "warrior_cavalry",
  name: "Warrior Cavalry",
  specialty: "warrior",
  unitType: "cavalry",
  commanderId: "lu_bu",
  heroes: [
    {
      id: "lu_bu", name: "Lü Bu", isCommander: true,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["cavalry"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Divine Crown", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Contract of Light", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Omniscience", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Dust-Free Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Daisy", level: 30, rarity: "blue",
        buffs: [{stat:"Troop's Attack", value:"+6.8%"}, {stat:"Troop's Defense", value:"+6.8%"}],
        trait: { name: "Double Strike", activation: "20%", desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 155.00%, might bonus)." } },
      mount: { name: "Wildfire", temperament: "Docile",
        stats: [{stat:"Armor", value:"7.6"}, {stat:"Siege", value:"7.7"}],
        traits: [{name:"Gallant", rarity:"yellow", desc:"Mounted hero's secondary strike skill might damage increases by 8.4%."}, {name:"Army Sunder", rarity:"green", desc:"Mounted hero's all types of damage increase (value truncated in-game)."}] },
      adornment: { name: "Unyielding Iron", level: 1,
        trait: { name: "Shadow Chaser", rarity: "blue", desc: "After the mounted hero launches a normal attack, there's a 65% chance to increase the hero's next skill damage by 7.65% for 3s." },
        buffs: [{stat:"Cavalry's Attack", value:"+1%", locked:false}, {stat:"Cavalry's Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "One-of-a-Kind General", rageCost: 200, desc: "Deals might damage to up to 5 enemy troops in a circular area (damage rate: 240.00%, might bonus, can deal critical strikes). Reduces their movement speed by 10.00% for 3s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Unrivaled Prowess", skillType: "passive", activation: "100%", level: 40, desc: "Increases the hero's Critical Strike Rate by 25.00% and makes all the hero's skills deal critical strikes. After any of your heroes deals a critical strike, increases the damage of Lü Bu's next customizable skill by 30.00% and there is a 100.00% chance to deal one more normal attack, lasting 3s (stacks up to 1, does not affect the Double Attack effect)." },
        secondaryEquipped: [
          { name: "Ripper Tiger", skillType: "secondary_strike", activation: "25%", level: 40, diamondRank: 4, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 320.00%, might bonus) and increases the hero's Critical Strike Rate by 15.00% for 3s." },
          { name: "Weak Spot Attack", skillType: "secondary_strike", activation: "20%", level: 40, diamondRank: 5, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 370.00%, might bonus) and increases the hero's damage by 30.00% (might bonus) for 3s." }
        ],
        secondaryPool: [
          { name: "Critical Insight", desc: "Increases all your heroes' Critical Strike Rate by 10.00%. When dealing a critical strike, reduces all enemy heroes' armor by 15.00. Up to 3 stacks." },
          { name: "Spirited Pursuit", desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 288.10%, might bonus)." },
          { name: "Armor Piercer", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and reduces all enemy heroes' armor by 50.00 for 3s." },
          { name: "Infuriation", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and increases the hero's might by 50.00 for 3s." }
        ]
      },
      notes: "Mount 'Wildfire' Army Sunder trait text truncated in-game."
    },
    {
      id: "attila", name: "Attila the Hun", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["cavalry"], damageType: "Might", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Divine Crown", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Contract of Light", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Omniscience", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Dust-Free Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Lord of the Eastern Heavens", level: 20, rarity: "blue",
        buffs: [{stat:"Commander's Damage", value:"+4.8%"}, {stat:"Troop's Attack", value:"+7.2%"}, {stat:"Troop's Health", value:"+3.6%"}],
        trait: { name: "Decree of Victory", activation: "100%", desc: "Reduces the damage of all your heroes' active skills by 25% (cannot be purified) but increases the damage of their normal attacks by 39.25%." } },
      mount: { name: "Pegasus", temperament: "Alert",
        stats: [{stat:"Might", value:"8.7"}, {stat:"Strategy", value:"7.4"}],
        traits: [{name:"Fearless", rarity:"purple", desc:"Solo Battle: your troop's damage taken reduces by 2.66% (only effective when attacking player troops)."}] },
      adornment: { name: "Unyielding Iron", level: 1,
        trait: { name: "Resistance", rarity: "blue", desc: "For the first 18.0s in battle, the first 3 instances of skill damage taken reduce by 5.74% each, and damage taken reduces by 3.83%. After 18.0s, all damage taken reduces by 1.91%." },
        buffs: [{stat:"Cavalry's Attack", value:"+1%", locked:false}, {stat:"Cavalry's Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Nomadic Strength", rageCost: 400, desc: "All your heroes enter the Double Attack state, and increases your troop's movement speed by 30.00% for 9s. Grants 200 initial rage upon entering battle." },
        signature: { name: "Annihilator", skillType: "passive", activation: "100%", level: 40, desc: "There is a 35.00% chance for all your heroes to enter the Double Attack state, and increases your commander's might damage by 35.00% and might by 35.00 (might bonus) for 3s." },
        secondaryEquipped: [
          { name: "Warrior's Hymn", skillType: "secondary_strike", activation: "30%", level: 40, diamondRank: 4, desc: "Increases the next hero's might by 125.00 (might bonus) and Critical Strike Rate by 20.00% for 3s." },
          { name: "Critical Insight", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "Increases all your heroes' Critical Strike Rate by 14.00%. When dealing a critical strike, reduces all enemy heroes' armor by 15.00. Up to 3 stacks." }
        ],
        secondaryPool: [
          { name: "Weak Spot Attack", desc: "After a normal attack, deals might damage (damage rate: 247.90%, might bonus) and increases the hero's damage by 20.10% (might bonus) for 3s." },
          { name: "Act of Mercy", desc: "After a normal attack, deals might damage (damage rate: 47.47%, might bonus). Increases your damage by 2.00% (up to 100%) for every 1% of units the target loses." },
          { name: "Infuriation", desc: "After a normal attack, deals might damage (damage rate: 206.61%, might bonus) and increases the hero's might by 50.00 for 3s." },
          { name: "Armor Piercer", desc: "After a normal attack, deals might damage (damage rate: 225.89%, might bonus) and reduces all enemy heroes' armor by 50.00 for 3s." }
        ]
      }
    },
    {
      id: "zhao_yun", name: "Zhao Yun", isCommander: false,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["cavalry"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Divine Crown", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Contract of Light", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Omniscience", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Cavalry's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Dust-Free Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Cavalry's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Night Wolf", level: 30, rarity: "blue",
        buffs: [{stat:"Commander's Damage", value:"+6.8%"}, {stat:"Troop's Attack", value:"+10.2%"}],
        trait: { name: "Ablaze Spirit", activation: "100%", desc: "After every 9 normal attacks of your troop, increases the damage of all your heroes' normal attacks and secondary strike skills by 17.95% (might bonus) and reduces their armor by 25.12 for 3s." } },
      mount: { name: "Steppe Horse", temperament: "Mischievous",
        stats: [{stat:"Might", value:"3.7"}, {stat:"Armor", value:"3.8"}],
        traits: [{name:"Gallant", rarity:"yellow", desc:"Mounted hero's secondary strike skill might damage increases by 10%."}] },
      adornment: { name: "Unyielding Iron", level: 1,
        trait: { name: "Chain Slayer", rarity: "blue", desc: "After the mounted hero activates 3 customizable secondary strike or active skills, increases the next hero's skill damage by 4.78%, stacking up to 2 times." },
        buffs: [{stat:"Cavalry's Attack", value:"+1%", locked:false}, {stat:"Cavalry's Health", value:"+0.50%", locked:true}, {stat:"Hero's Skill Damage", value:"+0.60%", locked:true}] },
      skills: {
        commander: { name: "Wild Dragon", rageCost: 250, desc: "Deals might damage to an enemy troop (damage rate: 240.00%, might bonus, can deal critical strikes) and applies one stack of the \"Cloud Dragon\" mark for 15s, while reducing your troop's damage taken by 8.00% (might bonus) for 6s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Valiant Rescue", skillType: "passive", activation: "100%", level: 40, desc: "After any of your heroes activate a secondary strike skill, applies 1 stack of \"Cloud Dragon\" to the enemy troop for 15s. At 3 stacks, consumes all marks and deals might damage (damage rate: 240.00%, might bonus, can crit). Additionally, 100.00% chance for Zhao Yun and the next hero to enter Double Attack for 3s. This skill has 12.00% base Crit Rate. Increases all heroes' critical strike damage by 10.00%, Crit Rate by 15.00%, and reduces your troop's critical strike damage taken by 15.00%. Reduces Zhao Yun's customizable secondary strike skill damage by 30.00% but increases their trigger chance by 5.00%. As commander, each normal attack has a chance to recover 5.00 rage." },
        secondaryEquipped: [
          { name: "Pay in Blood", skillType: "secondary_strike", activation: "25%", level: 40, diamondRank: 5, desc: "After a normal attack, deals might damage to the enemy troop (damage rate: 370.00%, might bonus) and recovers your units (recovery rate: 120.00%, might bonus)." },
          { name: "Dragon Manifestation", skillType: "secondary_strike", activation: "35%", level: 40, diamondRank: 4, desc: "After a normal attack, alternates: (1) increases the activation chance of all your heroes' customizable secondary strike skills by 5.00% for 6s; (2) immediately uses the other customizable secondary strike skill (excluding ring skills) at 15.00% reduced damage." }
        ],
        secondaryPool: [
          { name: "Dark Flag", desc: "After a normal attack, increases the might of your highest-might hero by 22.22 and reduces the armor of the enemy's highest-armor hero by 20.20, for 6s." },
          { name: "Critical Insight", desc: "Increases all your heroes' Critical Strike Rate by 5.13%. When dealing a critical strike, reduces all enemy heroes' armor by 7.69. Up to 3 stacks." },
          { name: "Armor Piercer", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and reduces all enemy heroes' armor by 50.00 for 3s." },
          { name: "Infuriation", desc: "After a normal attack, deals might damage (damage rate: 182.50%, might bonus) and increases the hero's might by 50.00 for 3s." }
        ]
      },
      notes: "A couple of green inline values in 'Valiant Rescue' were illegible in-game."
    }
  ]
},

/* =================================================================== */
/* MARCH 5 — WARRIOR PIKEMEN  (Commander: Cyrus the Great)             */
/* =================================================================== */
{
  id: "warrior_pikemen",
  name: "Warrior Pikemen",
  specialty: "warrior",
  unitType: "pikeman",
  commanderId: "cyrus",
  heroes: [
    {
      id: "cyrus", name: "Cyrus the Great", isCommander: true,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["pikeman"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Power of Abyss", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Ring of Chaos", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Master of Death", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Nightmare Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Messenger of Destruction", level: 10, rarity: "gold",
        buffs: [{stat:"Troop's Damage", value:"+2.8%"}, {stat:"Troop's Attack", value:"+2.8%"}, {stat:"Troop's Defense", value:"+2.8%"}],
        trait: { name: "Perception", activation: "100%", desc: "Reduces the damage of all your heroes' normal attacks by 20% (cannot be purified) but increases the damage of their passive skills by 20.32%." } },
      mount: { name: "Highland Horse", temperament: "Mischievous",
        stats: [{stat:"Might", value:"3.2"}, {stat:"Armor", value:"3.0"}],
        traits: [{name:"Valor", rarity:"red", desc:"Mounted hero's passive skill might damage increases by 10%."}] },
      adornment: { name: "Stalwart Shield", level: 1,
        trait: { name: "Thunder", rarity: "blue", desc: "After the mounted hero launches a normal attack, there's a 70% chance to increase the hero's next skill damage by 7.65% for 3s." },
        buffs: [{stat:"Pikemen's Defense", value:"+1%", locked:false}, {stat:"Pikemen's Health", value:"+0.50%", locked:true}, {stat:"Troop's Damage Taken Reduction", value:"+0.50%", locked:true}] },
      skills: {
        commander: { name: "Isolated Green Vine", rageCost: 250, desc: "Deals might damage to 3 enemy troops in the fan-shaped area in front (damage rate: 370.00%, might bonus) and increases Cyrus's Counterattack trigger chance from customizable skills by 10.00% for 12s. Grants 100 initial rage upon entering battle." },
        signature: { name: "King of the World", skillType: "passive", activation: "100%", level: 40, desc: "Increases the hero's customizable skill damage by 30.00%. When dealing damage with customizable skills (continuous damage excluded), a 65.00% chance to deal might damage (damage rate: 660.00%, might bonus, max once/sec) and increase the hero's might by 50.00 for 3s. This attack has a 65.00% chance to ignore 20.00% of enemy defense. When taking might damage, a 20.00% chance to reduce that damage by 8.00% (might bonus). For the first 18s, reduces secondary strike damage taken by 8.00% (might bonus)." },
        secondaryEquipped: [
          { name: "Child of Prophecy", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "When hit by a normal attack, a 30% chance to immediately Counterattack, dealing might damage (damage rate: 135.00%, might bonus, max once/sec). Every 4th trigger guarantees a critical strike; meanwhile, your troop's critical damage taken reduces by 35.00% for 3s." },
          { name: "Forceful Retaliation", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "When hit by a normal attack, a 20% chance to Counterattack, dealing might damage (damage rate: 130.00%, might bonus, max one/sec). Meanwhile, increases the hero's might by 30.00 for 6s." }
        ],
        secondaryPool: [
          { name: "Counterattack", desc: "When hit by a normal attack, a 15% chance to immediately Counterattack, dealing might damage (damage rate: 87.60%, might bonus, max one/sec)." },
          { name: "Vigilance", desc: "When hit by a normal attack, a 15% chance to Counterattack (max once/sec), dealing might damage (damage rate: 62.05%, might bonus). 50% chance to inflict Rout, dealing might damage every second (damage rate: 25.00%, might bonus) for 3s." },
          { name: "Fearless Retribution", desc: "When hit by a normal attack, a 20% chance to Counterattack, dealing might damage (damage rate: 24.24%, might bonus, max one/sec). Recovers your troop's units (recovery rate: 7.45%, might bonus, every 6s)." },
          { name: "Whirlwind Sweep", desc: "Increases the hero's might damage by 3.94% once every 6s. Up to 5 stacks." }
        ]
      }
    },
    {
      id: "vlad", name: "Vlad III", isCommander: false,
      role: "Attack", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["pikeman"], damageType: "Might", active: true, unitCapacity: 31200,
      gear: {
        helm:      { name: "Power of Abyss", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Ring of Chaos", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Master of Death", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Nightmare Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Boar", level: 20, rarity: "purple",
        buffs: [{stat:"Troop's Attack", value:"+9.6%"}, {stat:"Troop's Defense", value:"+7.2%"}],
        trait: { name: "Burning Will", activation: "100%", desc: "When your troop's units fall below 60% of the maximum, increases all heroes' passive skill damage by 20.67%." } },
      mount: { name: "White Brilliance", temperament: "Docile",
        stats: [{stat:"Strategy", value:"7.9"}, {stat:"Siege", value:"6.9"}],
        traits: [{name:"Valor", rarity:"red", desc:"Mounted hero's passive skill might damage increases by 9.2%."}, {name:"Siege", rarity:"purple", desc:"Mounted hero's siege increases by 7.6 in siege battles."}] },
      adornment: { name: "Stalwart Shield", level: 1,
        trait: { name: "Guard Formation", rarity: "blue", desc: "Within an area of 500, for each allied troop in battle, the mounted hero's armor increases by 5.74, up to 17.21." },
        buffs: [{stat:"Pikemen's Defense", value:"+1%", locked:false}, {stat:"Pikemen's Health", value:"+0.50%", locked:true}, {stat:"Troop's Damage Taken Reduction", value:"+0.50%", locked:true}] },
      skills: {
        commander: { name: "King's Edict", rageCost: 250, desc: "Deals might damage to up to 2 enemy troops in the fan-shaped area in front (damage rate: 470.00%, might bonus). For the next 6s, reduces your troop's damage taken by 10.00% and grants a 40.00% chance to increase your might damage to 1.20x its normal value. Grants 100 initial rage upon entering battle." },
        signature: { name: "Dragon's Vigor", skillType: "passive", activation: "100%", level: 40, desc: "When your highest-might hero deals damage (excluding continuous damage), a 60.00% chance to also deal might damage to an enemy troop (damage rate: 160.00%, might bonus, max once/3s). When the hero himself deals damage, a 30.00% chance to ignore 30.00% of the target's defense. For the first 18s, reduces your troop's damage taken by 10.00% (might bonus)." },
        secondaryEquipped: [
          { name: "Deadly Dragonthorn", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "When hit by a normal attack, a 25% chance to Counterattack, dealing might damage (damage rate: 140.00%, might bonus, max once/sec). Every 4 triggers, the next activation ignores 40.00% of enemy defense and increases damage of your highest-might hero (excluding self) by 25.00% for 3s." },
          { name: "Forceful Retaliation", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "When hit by a normal attack, a 20% chance to Counterattack, dealing might damage (damage rate: 130.00%, might bonus, max one/sec). Meanwhile, increases the hero's might by 30.00 for 6s." }
        ],
        secondaryPool: [
          { name: "Battle Roar", desc: "Deals might damage to the enemy troop (damage rate: 89.40%, might bonus) and increases the hero's damage by 2.98% (might bonus) for 6s. (Activation 30%)" },
          { name: "Whirlwind Sweep", desc: "Increases the hero's might damage by 3.94% once every 6s. Up to 5 stacks." },
          { name: "Counterattack", desc: "When hit by a normal attack, a 15% chance to immediately Counterattack, dealing might damage (damage rate: 87.60%, might bonus, max one/sec)." },
          { name: "Vigilance", desc: "When hit by a normal attack, a 15% chance to Counterattack (max once/sec), dealing might damage (damage rate: 62.05%, might bonus). 50% chance to inflict Rout, dealing might damage every second (damage rate: 25.00%, might bonus) for 3s." }
        ]
      }
    },
    {
      id: "mansa", name: "Mansa Musa", isCommander: false,
      role: "Support", heroLevel: 155, heroLevelMax: 155, stars: 5,
      specialty: "warrior", unitTypes: ["pikeman"], damageType: "Might", active: false, unitCapacity: 31200,
      gear: {
        helm:      { name: "Power of Abyss", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        gauntlets: { name: "Ring of Chaos", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Base elimination rate during sieges", value:"+0.6%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] },
        chest:     { name: "Master of Death", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's health bonus", value:"+3.0%"}, {stat:"Unit capacity", value:"+1,800"},
          {stat:"Damage taken reduction from countering unit types", value:"+4.5%"}, {stat:"Pikemen's damage taken reduction", value:"+0.8%"} ] },
        boots:     { name: "Nightmare Boots", level: 80, starRank: 3, gems: null, bonuses: [
          {stat:"Pikemen's damage", value:"+2.4%"}, {stat:"Elimination rate", value:"+6.0%"},
          {stat:"Damage dealt to countered unit types", value:"+4.5%"}, {stat:"All your heroes' skill damage", value:"+1.0%"} ] }
      },
      ring: { name: "Ring of Clover", level: 30, rarity: "gold",
        buffs: [{stat:"Troop's Attack", value:"+6.8%"}, {stat:"Troop's Defense", value:"+6.8%"}],
        trait: { name: "Armor Maintenance", activation: "100%", desc: "Has a 50.00% chance to reduce your troop's damage taken by 25.00% for 3s every 6s." } },
      mount: { name: "Moon Wash", temperament: "Fearless",
        stats: [{stat:"Strategy", value:"14.5"}, {stat:"Armor", value:"15.7"}],
        traits: [{name:"Renewal", rarity:"purple", desc:"Mounted hero's healing effect increases by 8.74%."}, {name:"Lifesaver", rarity:"purple", desc:"After the mounted hero causes recovery effects, all damage taken by your troop reduces by 3.26% for 3s."}] },
      adornment: { name: "Stalwart Shield", level: 1,
        trait: { name: "Resistance", rarity: "blue", desc: "For the first 18.0s in battle, the first 3 instances of skill damage taken reduce by 5.74% each, and damage taken reduces by 3.83%. After 18.0s, all damage taken reduces by 1.91%." },
        buffs: [{stat:"Pikemen's Defense", value:"+1%", locked:false}, {stat:"Pikemen's Health", value:"+0.50%", locked:true}, {stat:"Troop's Damage Taken Reduction", value:"+0.50%", locked:true}] },
      skills: {
        commander: { name: "Spend a Fortune", rageCost: 300, desc: "Deals might damage to up to 2 enemy troops in the fan-shaped area in front (damage rate: 550.00%, might bonus) and reduces the enemy commander's armor by 70.00 (might bonus) for 6s. Grants 100 initial rage upon entering battle." },
        signature: { name: "Devout Radiance", skillType: "passive", activation: "100%", level: 40, desc: "After your troop takes 12 normal attacks (counts up to 2/sec), deals might damage to the enemy troop (damage rate: 450.00%, might bonus), recovers your troop's units (recovery rate: 90.00%, might bonus), and reduces your troop's damage taken by 18.00% (might bonus) for 6s." },
        secondaryEquipped: [
          { name: "Golden Odyssey", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "After your troop takes 12 normal attacks (counts up to 2/sec), recovers your troop's units (recovery rate: 130.00%, might bonus, armor bonus) and increases the commander's damage by 20.00% (might bonus) for 3s." },
          { name: "Mettle", skillType: "secondary_strike", activation: "100%", level: 40, diamondRank: 4, desc: "After every 12 normal attacks taken by your troop (counts up to 2/sec), recovers your units (recovery rate: 170.00%, might bonus, armor bonus)." }
        ],
        secondaryPool: [
          { name: "Vigilance", desc: "When hit by a normal attack, a 15% chance to Counterattack (max once/sec), dealing might damage (damage rate: 62.05%, might bonus). 50% chance to inflict Rout, dealing might damage every second (damage rate: 25.00%, might bonus) for 3s." },
          { name: "Fearless Retribution", desc: "When hit by a normal attack, a 20% chance to Counterattack, dealing might damage (damage rate: 80.40%, might bonus, max one/sec). Recovers your troop's units (recovery rate: 25.00%, might bonus, every 6s)." },
          { name: "Tenacity", desc: "Recovers your units every 9s (recovery rate: 65.65%, armor bonus)." },
          { name: "King's Blade", desc: "Deals might damage to the enemy troop every 9s (damage rate: 59.60%, might bonus), with a 46% chance to increase all your heroes' damage by 6.06% for 3s." }
        ]
      }
    }
  ]
}

];

if (typeof module !== 'undefined' && module.exports) { module.exports = MARCHES; }
