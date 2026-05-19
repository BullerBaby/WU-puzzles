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
};
