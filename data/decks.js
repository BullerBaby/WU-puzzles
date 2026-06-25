/* ==================== RIVALS DECKS ====================
 * Library of universal Rivals decks players can choose from. Each player
 * brings 2 decks; games reference them via `decks: { me: { pair, plots } }`
 * where `pair` is a string like "Blazing Assault / Countdown to Cataclysm".
 *
 * The `plot` text is the special rule that the deck's Plot card brings to
 * the game (some decks have no plot card — those have `plot: null`).
 *
 * Plot text is rendered on hover/tap of the deck name in the warband panel.
 *
 * Looked up by name (case-insensitive); unknown names just render with no
 * tooltip, so existing custom games keep working even if they reference a
 * deck that isn't in this library.
 */
export const RIVALS_DECKS = {
  'Nexus of Power': {
    plot:
      "Friendly fighters are covetous while they are within 1 hex of a treasure token.\n\n" +
      "Friendly covetous fighters' Range 1 melee weapons (excluding Upgrades) have +1 Range " +
      "while they hold a treasure token.\n\n" +
      "After the numbered side of the feature tokens has been revealed in the Place Treasure " +
      "Tokens sequence, your opponent can flip up to two treasure tokens. If both players " +
      "have this Plot card, then starting with the player who last placed a treasure token, " +
      "both players take it in turns to flip a token or pass. A player must pass if they " +
      "have already flipped 2 treasure tokens. The sequence ends after both players pass in " +
      "succession.",
  },

  'Hunting Grounds':       { plot: null },

  'Deadly Synergy': {
    plot:
      "Adjacent friendly fighters are united.\n\n" +
      "Enemy fighters adjacent to a united friendly fighter are Flanked.\n\n" +
      "If each other friendly fighter is slain, the remaining friendly fighter is united.",
  },

  'Raging Slayers': {
    plot:
      "(Errata update) You can use the following abilities:\n\n" +
      "Raging Charge: Immediately after picking a friendly fighter to Charge or picking a " +
      "friendly fighter to Attack if they already had a Charge token at the start of the " +
      "turn, you can give that fighter and/or another friendly fighter in the same territory " +
      "each a Rage token. Fighters with any Rage tokens are enraged.\n\n" +
      "Raging Strike: After you make an Attack roll as part of a melee Attack for an enraged " +
      "friendly fighter, you can immediately change one successful result to a Critical " +
      "Attack result.\n\n" +
      "Poor Footing: You must use this immediately after an enraged friendly fighter was " +
      "Attacked if that fighter was not driven back or grappled. Push the target 1 hex away " +
      "from the attacker. Your opponent chooses the direction of that push.\n\n" +
      "Remove all Rage tokens from enraged friendly fighters at the end of the battle round.",
  },

  'Realmstone Raiders': {
    plot:
      "(Errata update) Immediately after the first successful friendly melee Attack in an " +
      "Action step, you can either: raid once or a number of times equal to the Bounty " +
      "characteristic of the target.\n\n" +
      "Raid: Reveal the top card of your Power deck. That card is raided. If that card is " +
      "an Emberstone card, you can put that card back on top or on the bottom of your Power " +
      "deck.\n\n" +
      "Emberstone cards have the following additional rules:\n" +
      "• Emberstone Ploy: You can play this Ploy immediately after it is raided.\n" +
      "• Emberstone Upgrade: You can equip this Upgrade immediately after it is raided if " +
      "you have the required Glory points.\n\n" +
      "If a raided card is not an Emberstone card, put that card on the bottom of your " +
      "Power deck.\n\n" +
      "Store: In place of a Raid, you may instead reveal an Emberstone card from your hand, " +
      "then put that card at the bottom of your Power deck. This card has not been raided.",
  },

  'Edge of the Knife': {
    plot:
      "Fighters with a Health characteristic of 2 or less and/or 2 or more damage tokens are " +
      "tempered.",
  },

  'Reckless Fury':         { plot: null },
  'Wrack and Ruin':        { plot: null },
  'Blazing Assault':       { plot: null },
  'Emberstone Sentinels':  { plot: null },
  'Pillage and Plunder':   { plot: null },

  'Countdown to Cataclysm': {
    plot:
      "(Errata update) During the Muster Warbands step of 'Setting Up', place a generic " +
      "token on the 1st step on the countdown card included in this deck. This token is " +
      "your Cataclysm tracker.\n\n" +
      "You must advance your Cataclysm tracker 1 step the first time a friendly fighter is " +
      "slain in each combat phase, and you must advance your Cataclysm tracker 1 step after " +
      "the last power step in each battle round for each feature token that has no enemy " +
      "fighters on it.\n\n" +
      "While your tracker is:\n" +
      "• on the 1st to 5th step, your Cataclysm value is 1.\n" +
      "• on the 6th to 9th step, your Cataclysm value is 2.\n" +
      "• on the 10th to 13th step, your Cataclysm value is 3.\n" +
      "• on the final step, your Cataclysm value is 4.",
  },
};

/* Build a case-insensitive name → entry index so authors can write deck names
 * however they like ("blazing assault", "Blazing Assault", "BLAZING ASSAULT").
 * Returns the matching entry, or null if no match. */
const DECK_INDEX = (function() {
  const m = Object.create(null);
  for (const k of Object.keys(RIVALS_DECKS)) m[k.toLowerCase()] = RIVALS_DECKS[k];
  return m;
})();

export function lookupDeck(name) {
  if (!name) return null;
  return DECK_INDEX[String(name).trim().toLowerCase()] || null;
}

/* List of all deck names (in declaration order). Useful for authoring docs
 * and for any future picker UI. */
export const DECK_NAMES = Object.keys(RIVALS_DECKS);
