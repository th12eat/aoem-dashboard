/* =====================================================================
   AoEM Era 8 — Heroes & Bestiary Glossary : DATA
   ---------------------------------------------------------------------
   This file holds ALL glossary data. The page (index.html) only renders
   it. To add a hero: append an object to GLOSSARY.heroes. To add a shared
   secondary skill: add it to GLOSSARY.secondarySkills (keyed by id) so it
   can be linked from any hero (enables future "which heroes have skill X").

   EFFECT NOTATION (standardized, uniform across every skill):
     Each effect = { text, scale }.
       text  = what the effect does, in plain words (no number).
       scale = the magnitude + how it scales, in parentheses on the page.
   Rules:
     - Damage rate (a multiplier of a stat): "480% scaling with Might"
       (no plus sign — it is 480% OF the stat, not an increase).
     - Buff/debuff increase: "+15% scaling with Might", or "+20%" if FLAT.
     - FLAT means the in-game text had NO "(<attribute> bonus)" tag.
     - Multi-attribute: "scaling with Armor + Might".
   Link a mechanic term inside text with {{term_id}} — the renderer turns
   it into a clickable term that opens the definition modal.

   "ingame" = the verbatim in-game wording, shown behind a dropdown.
   ===================================================================== */

const GLOSSARY = {

  /* ---------------------------------------------------------------- */
  /* CLASSIFICATION LOOKUPS                                            */
  /* specialty: shield color in-game. unitType: weapon symbol(s).      */
  /* "search" terms (incl. plurals) let "warriors"/"pikemen" filter.   */
  /* ---------------------------------------------------------------- */
  specialties: {
    warrior:   { label: "Warrior",   color: "#c43d3d", search: "warrior warriors" },
    tactician: { label: "Tactician", color: "#3d7cc4", search: "tactician tacticians" },
    marshall:  { label: "Marshall",  color: "#d4a843", search: "marshall marshalls marshal marshals" }
  },
  unitTypes: {
    swordsman: { label: "Swordsman", icon: "⚔",      search: "swordsman swordsmen sword" },
    archer:    { label: "Archer",    icon: "🏹", search: "archer archers bow" },
    pikeman:   { label: "Pikeman",   icon: "↑",       search: "pikeman pikemen pike" },
    cavalry:   { label: "Cavalry",   icon: "🐎", search: "cavalry cav horse" }
  },

  /* ---------------------------------------------------------------- */
  /* HEROES                                                            */
  /* ---------------------------------------------------------------- */
  heroes: [
    {
      id: "king_derrick",
      name: "King Derrick",
      // portrait: "img/king_derrick.png",  // optional, add later

      // specialty: one of "warrior" (red), "tactician" (blue), "marshall" (gold)
      // unitTypes: any of "swordsman","archer","pikeman","cavalry" (can be multiple)
      // null / [] = not yet captured (need the hero info screenshot)
      specialty: "warrior",
      unitTypes: ["archer", "swordsman"],

      commander: {
        name: "Defensive Slungshot",
        rageCost: 200,
        effects: [
          { text: "Deals Might Damage to the target", scale: "480% scaling with Might" },
          { text: "Target takes increased Might Damage for 6s", scale: "+15% scaling with Might" }
        ],
        ingame: "(Commander Skill) Deals might damage to the target (damage rate: 480.00%, might bonus) and increases their might damage taken by 15.00% (might bonus) for 6s."
      },

      signature: {
        name: "Grace and Blessings",
        skillType: "active",
        activation: "28%",
        level: 40,
        effects: [
          { text: "Deals Might Damage to the target", scale: "160% scaling with Might" },
          { text: "All your heroes deal increased Might Damage for 6s", scale: "+20% (flat)" },
          { text: "If the target is in {{rout}}: target takes increased Might Damage from all sources for 6s", scale: "+15% scaling with Might" }
        ],
        ingame: "(Signature Skill) Deals might damage to the target (damage rate: 160.00%, might bonus) and increases all your heroes' might damage by 20.00% for 6s. If the target is in Rout state, increases their might damage taken by 15.00% (might bonus) for 6s."
      },

      // equipped secondary skills, in slot order (slot 1, slot 2)
      secondaryEquipped: ["efficient_harvest", "windfall"],

      // full interchangeable pool this hero can choose 2 from
      secondaryPool: ["efficient_harvest", "sunder", "windfall", "fearless_frontrunner", "earth_crush", "righteous_judgement"]
    }
  ],

  /* ---------------------------------------------------------------- */
  /* SHARED SECONDARY SKILLS (linked by id from heroes)                */
  /* diamondRank: red-diamond upgrade level, 0-4 (4 = maxed via         */
  /* Legendary skill scrolls). Secondary skills have diamonds;          */
  /* Commander & Signature do not.                                      */
  /* ---------------------------------------------------------------- */
  secondarySkills: {
    efficient_harvest: {
      name: "Efficient Harvest",
      skillType: "passive",
      activation: "100%",
      level: 40,
      diamondRank: 4,
      effects: [
        { text: "Increases gathering speed for all resources", scale: "+35.2%" }
      ],
      ingame: "Increases the gathering speed for all resources by 35.20%."
    },
    windfall: {
      name: "Windfall",
      skillType: "passive",
      activation: "100%",
      level: 40,
      diamondRank: 4,
      effects: [
        { text: "Increases gathering speed for all resources", scale: "+30%" },
        { text: "Obtains extra resources on successful gathering", scale: "+14%" }
      ],
      ingame: "Increases the gathering speed for all resources by 30.00%. Obtains 14.00% extra resources upon successful gathering."
    },

    // Pool skills not yet captured in detail — names recorded so hero
    // linkage works now; fill in effects/ingame when we screenshot them.
    sunder:               { name: "Sunder",               pending: true },
    fearless_frontrunner: { name: "Fearless Frontrunner",  pending: true },
    earth_crush:          { name: "Earth Crush",            pending: true },
    righteous_judgement:  { name: "Righteous Judgement",    pending: true }
  },

  /* ---------------------------------------------------------------- */
  /* MECHANIC / TERM GLOSSARY (clickable, opens modal)                 */
  /* ---------------------------------------------------------------- */
  terms: {
    commander_skill: {
      name: "Commander Skill",
      def: "A hero's first skill. Takes effect only when the hero is a troop's Commander (the lead hero of the march). In battle, 10 Rage accumulates per second; the skill consumes Rage to fire. Unique to the hero — it cannot be removed or learned by others."
    },
    signature_skill: {
      name: "Signature Skill",
      def: "A hero's second skill. Unique to the hero and cannot be removed or learned by other heroes. Unlike the Commander Skill, it works even when the hero is NOT the Commander."
    },
    secondary_skill: {
      name: "Secondary Skill",
      def: "The hero's remaining two skill slots. These are NOT unique to the hero — each hero has a pool of interchangeable secondary skills (about 6–8) and only two can be equipped at a time. The same secondary skill can appear on multiple heroes."
    },
    rout: {
      name: "Rout",
      def: "Troops in the Rout state take Might damage once every second. The damage rate is determined by the skill that inflicted the Rout state."
    },
    active: {
      name: "Active",
      def: "Skill type. Has a chance to activate each time the hero takes an action.",
      isType: true
    },
    turn_based: {
      name: "Turn-based",
      def: "Skill type. Guaranteed to activate between certain intervals.",
      isType: true
    },
    secondary_strike: {
      name: "Secondary Strike",
      def: "Skill type. Has a chance to activate each time the hero launches a normal attack (including double attacks).",
      isType: true
    },
    passive: {
      name: "Passive",
      def: "Skill type. Activates under certain conditions.",
      isType: true
    },
    attributes: {
      name: "Attributes & Damage Types",
      def: "Every hero has four attributes: Might, Strategy, Armor, and Siege. A skill's damage is a percentage of one (or more) of these attributes. Example: \"480% scaling with Might\" means the skill deals damage equal to 480% of the hero's Might attribute, as Might-type damage. When a skill clause has no scaling tag, that value is flat."
    },
    normal: {
      name: "Normal (Damage)",
      def: "Definition not yet captured — will be added when we have the in-game screenshot.",
      pending: true
    },
    crit: {
      name: "Critical Strike Rate",
      def: "Heroes' base critical strike rate is 0%. With no skill effects, critical strikes can only occur through normal attacks and skills that explicitly indicate the ability to deal critical strikes. Damage is significantly increased when a critical strike triggers. Max critical strike rate: 75%."
    },
    burn: {
      name: "Burn",
      def: "Troops in the Burn state take Strategy damage once every second. The damage rate is determined by the skill that inflicted the Burn state."
    },
    charging_state: {
      name: "Charging State",
      def: "Some active skills require 3s of charging to be activated. If a hero in the charging state is interrupted by a skill or inflicted with Silence, the skill will not be activated."
    },
    counterattack: {
      name: "Counterattack",
      def: "Heroes in the counterattack state have a chance to attack back against enemies who deal normal attack damage to them."
    },
    double_attack: {
      name: "Double Attack",
      def: "Heroes in the double attack state attack twice when using normal attacks, and both attacks have a chance to trigger secondary strike skills."
    },
    marks: {
      name: "Marks",
      def: "Marks can be placed on heroes or troops. Skills will trigger effects based on the number of marks."
    },
    silence: {
      name: "Silence",
      def: "Silenced heroes cannot use active skills. After the effect ends, they cannot be silenced again for 3s."
    }
  }
};
