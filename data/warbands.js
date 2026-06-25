/* ==================== WARBANDS ====================
 * Shared warband definitions. Each entry has a name, a fighters object
 * (without `side` — that's assigned per-game), and an optional abilities
 * list. A game can reference warbands via `warbands: { me: id, opp: id }`
 * instead of inlining `fighters` + `abilities`. Per-game `fighters`/`abilities`
 * still work and override (or augment) anything from the warband.
 *
 * Fighter shape: { label, name?, isLeader?, move?, wounds?, glory?,
 *                  save?: { dice, type }, attacks?: [...], attacksInspired?: [...] }
 * Attack shape:  { name, range, dice, damage, type ('sword'|'hammer'),
 *                  cleave?, note? }
 */

export const WARBANDS = {
  'headsmens-curse': {
    name: "Headsmen's Curse",
    abilities: ['Eternal Duty','Whet the Blade','Discorporate','Cackling Court'],
    fighters: {
      W: { label: 'W', name: 'Wielder of the Blade', isLeader: true,
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: "Headsman's Axe", range: 1, dice: 3, damage: 3, type: 'hammer' },
           ],
           attacksInspired: [
             { name: "Headsman's Axe", range: 1, dice: 4, damage: 3, type: 'hammer', note: '' },
           ] },
      B: { label: 'B', name: 'Bearer of the Block',
           move: 3, wounds: 5, glory: 1,
           save: { dice: 2, type: 'block' },
           attacks: [
             { name: 'Heavy Block', range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Heavy Block', range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      S: { label: 'S', name: 'Scriptor of the Sentence',
           move: 4, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Cursed Quill', range: 3, dice: 2, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Cursed Quill', range: 3, dice: 3, damage: 2, type: 'sword' },
           ] },
      H: { label: 'H', name: 'Sharpener of the Blade',
           move: 4, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Whetted Knife', range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Whetted Knife', range: 1, dice: 3, damage: 3, type: 'sword' },
           ] },
    },
  },
  'emberwatch': {
    name: 'The Emberwatch',
    abilities: ['Alone We Stand','Vanguard Dash','Deadly Sentries','The Raptors of Sigmar'],
    fighters: {
      A: { label: 'A', name: 'Ardorn', isLeader: true,
           move: 3, wounds: 5, glory: 3,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Meelee',  range: 1, dice: 2, damage: 2, type: 'hammer' },
             { name: 'Ranged', range: 3, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Meelee',  range: 1, dice: 3, damage: 2, type: 'hammer' },
             { name: 'Ranged', range: 3, dice: 3, damage: 1, type: 'hammer' },
           ] },
      F: { label: 'F', name: 'Farasa',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Meelee',  range: 1, dice: 3, damage: 2, type: 'sword' },
             { name: 'Ranged', range: 3, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Meelee',  range: 1, dice: 4, damage: 2, type: 'sword' },
             { name: 'Ranged', range: 3, dice: 3, damage: 1, type: 'sword' },
           ] },
      Y: { label: 'Y', name: 'Yurik',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Meelee',     range: 1, dice: 2, damage: 2, type: 'hammer' },
             { name: 'Ranged', range: 4, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Meelee',     range: 1, dice: 3, damage: 2, type: 'hammer' },
             { name: 'Ranged', range: 4, dice: 3, damage: 1, type: 'sword', note: 'Save unchanged when inspired' },
           ] },
    },
  },
  'kurnoths-heralds': {
    name: "Kurnoth's Heralds",
    abilities: ['Swift Sentinels', 'The Endless Hunt', "Herald's Pride", 'Precision Volley'],
    fighters: {
      Y: { label: 'Y', name: 'Ylarin, Master of the Paths', isLeader: true,
           move: 4, wounds: 5, glory: 3,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Spear',  range: 2, dice: 2, damage: 2, type: 'hammer', note: 'Crit-Grievous' },
           ],
           attacksInspired: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Spear',  range: 2, dice: 3, damage: 2, type: 'hammer', note: 'Grievous' },
           ] },
      C: { label: 'C', name: 'Cullon, Axe of Kurnoth',
           move: 4, wounds: 5, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Axe',    range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Axe',    range: 1, dice: 3, damage: 3, type: 'hammer', cleave: true },
           ] },
      L: { label: 'L', name: 'Lenwythe, Eye of the Forest',
           move: 4, wounds: 5, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Bow',    range: 3, dice: 2, damage: 1, type: 'hammer', note: 'Crit-Stagger' },
           ],
           attacksInspired: [
             { name: 'Hooves', range: 1, dice: 4, damage: 1, type: 'sword',  note: 'Grapple' },
             { name: 'Bow',    range: 3, dice: 3, damage: 1, type: 'hammer', note: 'Stagger' },
           ] },
    },
  },
  'ephilims-pandaemonium': {
    name: "Ephilim's Pandaemonium",
    abilities: ['Glorious Change', 'Power Leech', 'Warpsplash', 'Wyrdflame'],
    fighters: {
      E: { label: 'E', name: 'Ephilim', isLeader: true,
           move: 3, wounds: 4, glory: 2,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'hammer' },
           ] },
      S: { label: 'S', name: 'Spawnmaw',
           move: 4, wounds: 3, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ] },
      F: { label: 'F', name: 'Flamespooler',
           move: 3, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 4, dice: 3, damage: 1, type: 'sword' },
           ] },
      A: { label: 'A', name: "Apo'trax",
           move: 3, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      K: { label: 'K', name: 'Kindlefinger',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 1, damage: 2, type: 'hammer' },
             { range: 3, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
             { range: 4, dice: 2, damage: 1, type: 'hammer' },
           ] },
    },
  },
  'thorns-of-the-briar-queen': {
    name: 'Thorns of the Briar Queen',
    abilities: ['Surrounded', 'Wave of Terror', 'Soul Warden', 'Throttle'],
    fighters: {
      B: { label: 'B', name: 'Briar Queen', isLeader: true,
           move: 3, wounds: 3, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 2, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 2, dice: 3, damage: 1, type: 'sword', note: 'Grievous' },
           ] },
      V: { label: 'V', name: 'Varclav',
           move: 3, wounds: 3, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      H: { label: 'H', name: 'The Ever-hanged',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'sword', cleave: true, note: 'Ensnare' },
           ] },
      I: { label: 'I', name: 'The Ironwretch',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      X: { label: 'X', name: 'The Exhumed',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      S: { label: 'S', name: 'The Silenced',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword', note: 'Stagger' },
           ] },
      U: { label: 'U', name: 'The Uncrowned',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword', cleave: true },
           ] },
    },
  },

  'farstriders': {
    name: 'The Farstriders',
    abilities: ['Ranger Elite','Forward the Vanguard!','Behind Enemy Lines','Vanguard'],
    fighters: {
      F: { label: 'F', name: 'Farstrider', isLeader: true,
           move: 3, wounds: 5, glory: 3,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'hammer' },
           ] },
      E: { label: 'E', name: 'Eagle-Eye',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ] },
      S: { label: 'S', name: 'Swiftblade',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 4, damage: 2, type: 'sword' },
             { range: 3, dice: 4, damage: 1, type: 'sword' },
           ] },
    },
  },

  'spiteclaws-swarm': {
    name: "Spiteclaw's Swarm",
    abilities: ['Skitter','Justified Paranoia',"'Out my way, fool-things!'",'Swarm','Scheming Pack','Untimely Promotion'],
    fighters: {
      S: { label: 'S', name: 'Spiteclaw', isLeader: true,
           move: 5, wounds: 4, glory: 2,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 2, dice: 3, damage: 1, type: 'hammer' },
           ] },
      K: { label: 'K', name: 'Krrk',
           move: 5, wounds: 3, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 2, dice: 3, damage: 1, type: 'hammer' },
           ] },
      L: { label: 'L', name: 'Lurking Skaven',
           move: 5, wounds: 3, glory: 1,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
             { range: 3, dice: 2, damage: 1, type: 'sword' },
           ] },
      H: { label: 'H', name: 'Hungering Skaven',
           move: 5, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 1, type: 'hammer' },
           ] },
      F: { label: 'F', name: 'Festering Skaven',
           move: 5, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
           ] },
    },
  },

  'ironsouls-condemnors': {
    name: "Ironsoul's Condemnors",
    abilities: ['Punishing Blow','Aetherically Charged Shield','Aetherically Charged Maul','Bulwark Against the Dark'],
    fighters: {
      I: { label: 'I', name: 'Ironsoul', isLeader: true,
           move: 3, wounds: 5, glory: 3,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      B: { label: 'B', name: 'Brodus',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      T: { label: 'T', name: 'Tavian',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
    },
  },

  'sepulchral-guard': {
    name: 'The Sepulchral Guard',
    abilities: ['Grasping Hands','Startling Reformation','Bone Shrapnel','Forward!','Arise!'],
    fighters: {
      W: { label: 'W', name: 'The Sepulchral Warden', isLeader: true,
           move: 2, wounds: 4, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 3, type: 'hammer' },
             { range: 2, dice: 2, damage: 2, type: 'hammer' },
           ] },
      H: { label: 'H', name: 'The Harvester',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 4, damage: 2, type: 'sword' },
           ] },
      P: { label: 'P', name: 'The Prince of Dust',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      C: { label: 'C', name: 'The Champion',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      I: { label: 'I', name: 'The Inevitable Petitioner',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
           ] },
      Z: { label: 'Z', name: 'The Zealous Petitioner',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
           ] },
      R: { label: 'R', name: 'The Rising Petitioner',
           move: 2, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
           ] },
    },
  },

  'zondaras-gravebreakers': {
    name: "Zondara's Gravebreakers",
    abilities: ['Destined','Undying Love','Exhume','Unearth','Gravebreakers'],
    fighters: {
      Z: { label: 'Z', name: 'Zondara', isLeader: true,
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 3, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ] },
      F: { label: 'F', name: 'Ferlain',
           move: 4, wounds: 5, glory: 2,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
      C: { label: 'C', name: 'Cracktomb',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
      T: { label: 'T', name: 'Toyle',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      P: { label: 'P', name: 'Pikk',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
           ] },
    },
  },

  'cyrenis-razors': {
    name: "Cyreni's Razors",
    abilities: ['Deadly Riposte','Phantasmal Ink','Soul Harvest','Hammertide'],
    fighters: {
      C: { label: 'C', name: 'Cyreni', isLeader: true,
           move: 4, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 2, dice: 3, damage: 1, type: 'hammer' },
           ] },
      E: { label: 'E', name: 'Cephanyr',
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 4, damage: 2, type: 'sword' },
           ] },
      R: { label: 'R', name: 'Renglaith',
           move: 4, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 2, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 4, damage: 2, type: 'sword' },
             { range: 2, dice: 4, damage: 1, type: 'sword' },
           ] },
      A: { label: 'A', name: 'Alathyrr',
           move: 4, wounds: 4, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 2, dice: 3, damage: 2, type: 'hammer' },
           ] },
    },
  },

  'brethren-of-the-bolt': {
    name: 'Brethren of the Bolt',
    abilities: ['Fulminating Hymn','Crackling Burst',"Heaven's Charge",'Coruscating Revival','Holy Capacitors'],
    fighters: {
      F: { label: 'F', name: 'Pater Filius', isLeader: true,
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
             { range: 3, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
             { range: 3, dice: 3, damage: 1, type: 'hammer' },
           ] },
      G: { label: 'G', name: 'Galvic',
           move: 3, wounds: 3, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      T: { label: 'T', name: 'Tazat',
           move: 3, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ] },
      Y: { label: 'Y', name: 'Yakob',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
      A: { label: 'A', name: 'Arcus',
           move: 3, wounds: 2, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 2, dice: 2, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 2, dice: 2, damage: 2, type: 'hammer' },
           ] },
    },
  },

  'daggoks-stab-ladz': {
    name: "Daggok's Stab-ladz",
    abilities: ["'Two against one, ya git!'","Thief of Kunnin'",'Nasty Poisons','Krule Stab',"Schemin' Gitz"],
    fighters: {
      D: { label: 'D', name: 'Daggok', isLeader: true,
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
             { range: 2, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 3, type: 'hammer' },
             { range: 2, dice: 3, damage: 1, type: 'hammer' },
           ] },
      G: { label: 'G', name: 'Grakk',
           move: 4, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 2, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
             { range: 2, dice: 3, damage: 2, type: 'sword' },
           ] },
      H: { label: 'H', name: 'Hurrk',
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ] },
      J: { label: 'J', name: 'Jagz',
           move: 3, wounds: 4, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
    },
  },

  // Morgok's Krushas — Ironjawz Brutes (Destruction). Three big, tough greenskins.
  // Inspire mechanic: gain Waaagh! counters on attacks (yours or against you);
  // spend 3 counters in your power step to inspire. See abilities below.
  'morgoks-krushas': {
    name: "Morgok's Krushas",
    abilities: ["Waaagh! Energy", "Ded 'Ard", 'Shut It!', "Get a Move On, Ya Gitz!"],
    fighters: {
      M: { label: 'M', name: 'Morgok', isLeader: true,
           move: 3, wounds: 5, glory: 3,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'hammer', note: 'Grievous' },
           ] },
      A: { label: 'A', name: "'Ardskull",
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 2, dice: 3, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 2, dice: 3, damage: 3, type: 'hammer', note: 'Brutal' },
           ] },
      T: { label: 'T', name: 'Thugg',
           move: 3, wounds: 5, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 3, type: 'sword' },
           ] },
    },
  },

  // Thyrielle's Zephyrites — Lumineth Realm-lords (Order). Four fighters plus
  // Tzul, a vulpine spirit *token* (not a fighter — can't be attacked, blocks
  // movement, doesn't block line of sight). Most warband mechanics key off
  // "windblown": any fighter in a straight line from Tzul to the board edge.
  // Inspire: a friendly windblown fighter makes a successful Attack.
  // NB. The schema has no slot for non-fighter companions; if you author a
  // puzzle with this warband, draw Tzul as a custom feature token on the board.
  'thyrielles-zephyrites': {
    name: "Thyrielle's Zephyrites",
    abilities: ['The Living Gale', 'Zephyr Leap', 'Hurricane Aid', 'Zephyr Dance', 'One with the Wind', 'Cyclonic Pull'],
    fighters: {
      T: { label: 'T', name: 'Thyrielle', isLeader: true,
           move: 4, wounds: 4, glory: 3,
           save: { dice: 2, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
             { range: 3, dice: 2, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
             { range: 3, dice: 2, damage: 1, type: 'hammer' },
           ] },
      O: { label: 'O', name: 'Orieth',
           move: 4, wounds: 3, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
             { range: 3, dice: 2, damage: 2, type: 'hammer' },
           ],
           attacksInspired: [
             { range: 1, dice: 2, damage: 1, type: 'sword' },
             { range: 3, dice: 3, damage: 2, type: 'hammer' },
           ] },
      A: { label: 'A', name: 'Anara',
           move: 4, wounds: 3, glory: 2,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 3, dice: 3, damage: 1, type: 'sword' },
           ],
           attacksInspired: [
             { range: 3, dice: 2, damage: 1, type: 'hammer' },
           ] },
      S: { label: 'S', name: 'Sirikith',
           move: 4, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { range: 1, dice: 2, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
    },
  },

  // Zarbag's Gitz — Moonclan Grots (Destruction). Rules current as of the
  // official Rules Updates, February 2026. Bonekrakka & Gobbaluk fighter cards
  // and the Inspire condition / warband abilities reflect the updated wording.
  // Inspire: each time you gain a sixth or subsequent Glory point, inspire a
  //   friendly fighter (warband-wide condition, identical on every card).
  // Squigs (Bonekrakka, Gobbaluk) and the herded Squig tokens are handled by
  //   the Squig Herder / Make Some Noise! abilities.
  'zarbags-gitz': {
    name: "Zarbag's Gitz",
    abilities: ['Volley', 'Slippery Gitz', 'Fungal Burst', 'Gang Up', 'Make Some Noise!'],
    fighters: {
      Z: { label: 'Z', name: 'Zarbag', isLeader: true,
           move: 3, wounds: 3, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: 'Sickle', range: 1, dice: 3, damage: 2, type: 'sword' },
             { name: 'Curse',  range: 3, dice: 4, damage: 1, type: 'hammer' },
           ],
           attacksInspired: [
             { name: 'Sickle', range: 1, dice: 3, damage: 2, type: 'sword' },
             { name: 'Curse',  range: 3, dice: 4, damage: 1, type: 'hammer' },
           ] },
      N: { label: 'N', name: 'Snirk Sourtongue',
           move: 3, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Ball and Chain', range: 1, dice: 3, damage: 3, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Ball and Chain', range: 1, dice: 3, damage: 3, type: 'sword' },
           ] },
      D: { label: 'D', name: 'Drizgit da Squig-hunter',
           move: 3, wounds: 3, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
      P: { label: 'P', name: 'Prog da Netter',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Net', range: 3, dice: 2, damage: 1, type: 'sword', note: 'Volley' },
           ],
           attacksInspired: [
             { name: 'Net', range: 3, dice: 2, damage: 1, type: 'sword', note: 'Volley' },
           ] },
      T: { label: 'T', name: 'Stikkit',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ],
           attacksInspired: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ] },
      I: { label: 'I', name: 'Dibbz',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ],
           attacksInspired: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ] },
      R: { label: 'R', name: 'Redkap',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ],
           attacksInspired: [
             { name: 'Bow', range: 3, dice: 3, damage: 1, type: 'sword', note: 'Volley' },
           ] },
      K: { label: 'K', name: 'Bonekrakka',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
      G: { label: 'G', name: 'Gobbaluk',
           move: 3, wounds: 1, glory: 1,
           save: { dice: 1, type: 'dodge' },
           attacks: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ],
           attacksInspired: [
             { name: 'Bite', range: 1, dice: 3, damage: 2, type: 'sword' },
           ] },
    },
  },
};
