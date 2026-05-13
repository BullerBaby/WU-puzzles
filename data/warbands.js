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
    abilities: ['Trial and Execution', 'Discorporate', 'Whet the Blade'],
    fighters: {
      W: { label: 'W', name: 'Wielder of the Blade', isLeader: true,
           move: 3, wounds: 4, glory: 2,
           save: { dice: 1, type: 'block' },
           attacks: [
             { name: "Headsman's Axe", range: 1, dice: 3, damage: 3, type: 'hammer' },
           ],
           attacksInspired: [
             { name: "Headsman's Axe", range: 1, dice: 4, damage: 3, type: 'hammer', note: 'Cleave' },
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
      S: { label: 'S', name: 'Scriptor — range 3',
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
  'generic-4': {
    name: 'Generic 4-fighter warband',
    abilities: ["Veteran's Resolve", 'Tactical Withdrawal'],
    fighters: {
      o1: { label: 'o1', name: 'Opp leader', isLeader: true,
            move: 3, wounds: 5, glory: 2,
            save: { dice: 2, type: 'block' },
            attacks: [
              { name: 'Two-handed Sword', range: 1, dice: 3, damage: 3, type: 'sword' },
            ] },
      o2: { label: 'o2', name: 'Opp 2',
            move: 4, wounds: 3, glory: 1,
            save: { dice: 1, type: 'dodge' },
            attacks: [
              { name: 'Short Blade', range: 1, dice: 2, damage: 2, type: 'sword' },
            ] },
      o3: { label: 'o3', name: 'Opp 3',
            move: 4, wounds: 3, glory: 1,
            save: { dice: 1, type: 'dodge' },
            attacks: [
              { name: 'Spear', range: 2, dice: 2, damage: 2, type: 'sword' },
            ] },
      o4: { label: 'o4', name: 'Opp 4',
            move: 3, wounds: 4, glory: 1,
            save: { dice: 1, type: 'block' },
            attacks: [
              { name: 'Shield Bash', range: 1, dice: 2, damage: 2, type: 'hammer' },
            ] },
    },
  },
};
