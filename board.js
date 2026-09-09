/* ==================== WARBAND PANEL ====================
 * Everything that renders inside the two side panels (your warband below the
 * board, opponent's above) plus the step-info bar:
 *
 *   - Fighter cards (badge, wounds badge, upgrade chips, hover tooltip)
 *   - Fighter tokens (move/charge/guard/stagger circles under SVG fighter)
 *   - Hands (objective + power cards as chips or face-down placeholders)
 *   - Dice (attack + defence faces in the step-info bar)
 *   - Power-step events (chips for cards / abilities / reactions)
 *   - Warscroll abilities (chips marked used / unused)
 *   - Activation tokens (4 per side, right-most go hollow as used)
 *   - Decks header (deck pair, with plot rules on deck-name hover)
 */

import { svgEl } from './board.js';
import { WARBANDS } from '../data/warbands.js';
import { lookupDeck } from '../data/decks.js';

/* Tap-outside-to-close handler for fighter-card tooltips on mobile.
 * Registered once at module load. Clicking anywhere outside an open
 * fighter card closes its tooltip. */
document.addEventListener('click', function(e) {
  if (!e.target.closest || !e.target.closest('.fighter-card')) {
    document.querySelectorAll('.fighter-card.tooltip-open').forEach(function(c) {
      c.classList.remove('tooltip-open');
    });
  }
});

/* Same pattern for deck-name tooltips: clicking outside an open deck name
 * closes any open plot tooltips. */
document.addEventListener('click', function(e) {
  if (!e.target.closest || !e.target.closest('.deck-name')) {
    document.querySelectorAll('.deck-name.tooltip-open').forEach(function(c) {
      c.classList.remove('tooltip-open');
    });
  }
});

/* ==================== RENDER DICE ==================== */
function makeDie(face) {
  const el = document.createElement('span');
  el.className = 'die';
  if (face === 'C') el.classList.add('crit');
  if (face === 'D' || face === 'Sh') el.classList.add('dodge');
  if (face === '-') el.classList.add('blank');
  el.textContent = face;
  return el;
}

export function renderDice(diceData) {
  const c = document.getElementById('curr-dice');
  c.innerHTML = '';
  if (!diceData) return;
  if (diceData.attack && diceData.attack.length) {
    const grp = document.createElement('span'); grp.className = 'dice-group';
    const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = 'attack';
    grp.appendChild(lbl);
    diceData.attack.forEach(f => grp.appendChild(makeDie(f)));
    c.appendChild(grp);
  }
  if (diceData.defense && diceData.defense.length) {
    const sep = document.createElement('span'); sep.className = 'dice-sep'; sep.textContent = 'vs';
    c.appendChild(sep);
    const grp = document.createElement('span'); grp.className = 'dice-group';
    const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = 'defence';
    grp.appendChild(lbl);
    diceData.defense.forEach(f => grp.appendChild(makeDie(f)));
    c.appendChild(grp);
  }
}

/* ==================== RENDER HANDS ==================== */
function normalizeHand(h) {
  if (h === undefined || h === null) return { obj: [], pow: [], objCount: 0, powCount: 0 };
  if (typeof h === 'number') return { obj: [], pow: [], objCount: 0, powCount: h };
  const objIsArr = Array.isArray(h.objectives);
  const powIsArr = Array.isArray(h.power);
  return {
    obj: objIsArr ? h.objectives : [],
    pow: powIsArr ? h.power : [],
    objCount: objIsArr ? h.objectives.length : (typeof h.objectives === 'number' ? h.objectives : 0),
    powCount: powIsArr ? h.power.length     : (typeof h.power      === 'number' ? h.power      : 0),
  };
}

function fillCards(elId, names, count, cls) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  if (names && names.length) {
    names.forEach(function(name) {
      const chip = document.createElement('span');
      chip.className = 'card-chip ' + cls;
      chip.textContent = name;
      chip.title = name;
      el.appendChild(chip);
    });
  } else {
    for (let i = 0; i < count; i++) {
      const chip = document.createElement('span');
      chip.className = 'card-chip hidden ' + cls;
      chip.textContent = '◆';
      el.appendChild(chip);
    }
  }
}

export function renderHands(state) {
  const me = normalizeHand(state.hand && state.hand.me);
  const opp = normalizeHand(state.hand && state.hand.opp);
  document.getElementById('my-obj-count').textContent = me.objCount;
  document.getElementById('my-pow-count').textContent = me.powCount;
  document.getElementById('opp-obj-count').textContent = opp.objCount;
  document.getElementById('opp-pow-count').textContent = opp.powCount;
  fillCards('my-obj-cards',  me.obj,  me.objCount,  'obj');
  fillCards('my-pow-cards',  me.pow,  me.powCount,  'power');
  fillCards('opp-obj-cards', opp.obj, opp.objCount, 'obj');
  fillCards('opp-pow-cards', opp.pow, opp.powCount, 'power');

  // Deck and discard pile counts (display as small badges next to hand).
  // Empty by default; populated only when the game state specifies them.
  const meDeck  = normalizeHand(state.deck    && state.deck.me);
  const oppDeck = normalizeHand(state.deck    && state.deck.opp);
  const meDisc  = normalizeHand(state.discard && state.discard.me);
  const oppDisc = normalizeHand(state.discard && state.discard.opp);
  document.getElementById('my-obj-deck').textContent     = meDeck.objCount;
  document.getElementById('my-pow-deck').textContent     = meDeck.powCount;
  document.getElementById('opp-obj-deck').textContent    = oppDeck.objCount;
  document.getElementById('opp-pow-deck').textContent    = oppDeck.powCount;
  document.getElementById('my-obj-discard').textContent  = meDisc.objCount;
  document.getElementById('my-pow-discard').textContent  = meDisc.powCount;
  document.getElementById('opp-obj-discard').textContent = oppDisc.objCount;
  document.getElementById('opp-pow-discard').textContent = oppDisc.powCount;
}

/* ==================== RENDER POWER STEP ==================== */
function formatPrefix(ev) {
  if (ev.type !== 'card') return '';
  if (ev.kind === 'upgrade' || ev.kind === 'U') return 'U:';
  if (ev.kind === 'gambit'  || ev.kind === 'G') return 'G:';
  return '';
}

export function renderPowerStep(events) {
  const wrapper = document.getElementById('power-step');
  const container = document.getElementById('power-events');
  container.innerHTML = '';
  if (!events || !events.length) {
    wrapper.classList.remove('has-events');
    return;
  }
  wrapper.classList.add('has-events');
  events.forEach(function(ev) {
    const chip = document.createElement('span');
    chip.className = 'power-event ' + (ev.side === 'opp' ? 'opp' : 'me');
    if (ev.type === 'ability') chip.classList.add('ability');

    const side = document.createElement('span');
    side.className = 'power-event-side';
    side.textContent = ev.side === 'opp' ? 'Opp' : 'You';
    chip.appendChild(side);

    const prefix = formatPrefix(ev);
    if (prefix) {
      const p = document.createElement('span');
      p.className = 'power-event-prefix';
      p.textContent = prefix;
      chip.appendChild(p);
    }

    const text = document.createElement('span');
    let txt = ev.name || '';
    if (ev.target) txt += ' → ' + ev.target;
    if (ev.type === 'reaction') txt += ' (reaction)';
    text.textContent = txt;
    chip.appendChild(text);

    container.appendChild(chip);
  });
}

/* ==================== RENDER FIGHTER TOKENS ==================== */
const TOKEN_TYPES = {
  move:    { letter: 'M', color: 'var(--tok-move)',    label: 'Move action used' },
  charge:  { letter: 'C', color: 'var(--tok-charge)',  label: 'Charge action used (cannot activate again this round)' },
  guard:   { letter: 'G', color: 'var(--tok-guard)',   label: 'On Guard' },
  stagger: { letter: 'S', color: 'var(--tok-stagger)', label: 'Staggered' },
};

function tokenSpec(rawName) {
  const k = String(rawName).toLowerCase();
  if (TOKEN_TYPES[k]) return Object.assign({ key: k }, TOKEN_TYPES[k]);
  // Aliases
  if (k === 'attack' || k === 'cleav') return Object.assign({ key: 'cleave' }, TOKEN_TYPES.cleave);
  if (k === 'def' || k === 'block')     return Object.assign({ key: 'defence' }, TOKEN_TYPES.defence);
  if (k === 'staggered')                return Object.assign({ key: 'stagger' }, TOKEN_TYPES.stagger);
  return { key: k, letter: String(rawName).charAt(0).toUpperCase(), color: 'var(--tok-other)', label: rawName };
}

/* Short label for a single action token, used by the per-hex hover tooltip
 * (e.g. "Guard token", "Move token"). */
export function tokenLabel(rawName) {
  const spec = tokenSpec(rawName);
  const NICE = { move: 'Move', charge: 'Charge', guard: 'Guard', stagger: 'Stagger', cleave: 'Cleave', defence: 'Defence' };
  const base = NICE[spec.key] || (String(rawName).charAt(0).toUpperCase() + String(rawName).slice(1));
  return base + ' token';
}

export function renderFighterTokens(fighterId, tokens, slain) {
  const g = document.getElementById('t-' + fighterId);
  if (!g) return;
  g.innerHTML = '';
  if (slain) return;
  if (!tokens || !tokens.length) return;
  // Position tokens INSIDE the fighter's hex (apothem ~11.26), along the bottom
  // edge where they overlap the fighter circle (r=10) but stay within the hex.
  // For multiple tokens, contract spacing to fit the hex's narrowing width.
  const r = 3.2;
  const cy = 6.5;
  const n = tokens.length;
  // Solve hex constraint 0.866*|cx| + 0.5*|cy| <= 11.258 - r  for usable half-width.
  const usable = Math.max(0, ((11.258 - r - 0.5 * Math.abs(cy)) / 0.866) - 0.2);
  const desiredStep = r * 2 + 0.6;
  const step = n > 1 ? Math.min(desiredStep, (usable * 2) / (n - 1)) : 0;
  const startX = -((n - 1) * step) / 2;
  tokens.forEach(function(t, i) {
    const spec = tokenSpec(t);
    const cx = startX + i * step;
    const c = svgEl('circle', { cx: cx.toFixed(2), cy: cy, r: r, fill: spec.color, class: 'tok-circle' });
    g.appendChild(c);
    const lbl = svgEl('text', { x: cx.toFixed(2), y: cy + 0.2, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'tok-label' });
    lbl.textContent = spec.letter;
    g.appendChild(lbl);
  });
}

/* ==================== RENDER FIGHTER CARDS ====================
 * Two rows of small cards (opp above the board, me below). Each card shows the
 * fighter's badge, name, current wounds taken (red pill), and upgrades attached.
 * Hover reveals a tooltip with Move / Wounds / Glory stats and attack profiles.
 */
function buildAttackProfileNode(attack, inspired) {
  const row = document.createElement('div');
  row.className = 'attack-profile' + (inspired ? ' inspired-profile' : '');
  const nm = document.createElement('div');
  nm.className = 'attack-profile-name';
  nm.textContent = attack.name || (inspired ? 'Inspired attack' : 'Attack');
  if (inspired) {
    const star = document.createElement('span');
    star.className = 'star';
    star.textContent = '★';
    nm.appendChild(star);
  }
  row.appendChild(nm);
  const stats = document.createElement('div');
  stats.className = 'attack-profile-stats';
  const bits = [];
  if (attack.range != null) bits.push('<span class="ap-stat">Rng <strong>' + attack.range + '</strong></span>');
  if (attack.dice  != null) {
    let dicePart = 'Dice <strong>' + attack.dice + '</strong>';
    if (attack.type === 'sword' || attack.type === 'hammer') {
      dicePart += ' <span class="ap-suffix ' + attack.type + '">' + attack.type + '</span>';
    }
    bits.push('<span class="ap-stat">' + dicePart + '</span>');
  }
  if (attack.damage != null) bits.push('<span class="ap-stat">Dmg <strong>' + attack.damage + '</strong></span>');
  if (attack.cleave) bits.push('<span class="ap-stat"><strong>Cleave</strong></span>');
  if (attack.note) bits.push('<span class="ap-stat">' + attack.note + '</span>');
  stats.innerHTML = bits.join(' ');
  row.appendChild(stats);
  return row;
}

function buildFighterCard(id, info) {
  const card = document.createElement('div');
  const isMe = info.side === 'me';
  card.className = 'fighter-card ' + (isMe ? 'me' : 'opp') + (info.isLeader ? ' leader' : '');
  card.id = 'fc-' + id;
  card.dataset.fid = id;

  const header = document.createElement('div');
  header.className = 'fighter-card-header';

  const badge = document.createElement('span');
  badge.className = 'fighter-card-badge';
  badge.textContent = info.label;
  badge.title = info.name || info.label;
  header.appendChild(badge);

  const wounds = document.createElement('span');
  wounds.className = 'fighter-card-wounds';
  wounds.id = 'fc-w-' + id;
  wounds.hidden = true;
  wounds.textContent = '0';
  header.appendChild(wounds);

  card.appendChild(header);

  const upgrades = document.createElement('div');
  upgrades.className = 'fighter-card-upgrades';
  upgrades.id = 'fc-u-' + id;
  card.appendChild(upgrades);

  // Tooltip (built once per fighter, content is static — derived from fighter info)
  const tip = document.createElement('div');
  tip.className = 'fighter-tooltip';

  const tn = document.createElement('div');
  tn.className = 'fighter-tooltip-name';
  const tnText = document.createElement('span');
  tnText.textContent = info.name || info.label;
  tn.appendChild(tnText);
  if (info.isLeader) {
    const tag = document.createElement('span');
    tag.className = 'leader-tag';
    tag.textContent = 'Leader';
    tn.appendChild(tag);
  }
  const inspiredTag = document.createElement('span');
  inspiredTag.className = 'inspired-tag';
  inspiredTag.textContent = 'Inspired';
  inspiredTag.style.display = 'none';
  inspiredTag.id = 'fc-i-' + id;
  tn.appendChild(inspiredTag);
  tip.appendChild(tn);

  const ts = document.createElement('div');
  ts.className = 'fighter-tooltip-stats';
  function statBit(label, value) {
    const s = document.createElement('span');
    s.className = 'stat';
    s.innerHTML = '<span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span>';
    return s;
  }
  if (info.move    != null) ts.appendChild(statBit('Move',   info.move));
  if (info.save && info.save.dice != null) {
    const s = document.createElement('span');
    s.className = 'stat';
    const lbl = '<span class="stat-label">Def</span>';
    const val = '<span class="stat-value">' + info.save.dice + '</span>';
    const sfx = info.save.type ? '<span class="stat-suffix">' + info.save.type + '</span>' : '';
    s.innerHTML = lbl + val + sfx;
    ts.appendChild(s);
  }
  if (info.wounds  != null) ts.appendChild(statBit('Wounds', info.wounds));
  if (info.glory   != null) ts.appendChild(statBit('Glory',  info.glory));
  if (!ts.children.length) {
    const note = document.createElement('span');
    note.className = 'attack-profile-empty';
    note.textContent = 'No stats provided';
    ts.appendChild(note);
  }
  tip.appendChild(ts);

  const attacks = (info.attacks || []).slice();
  const attacksInspired = (info.attacksInspired || []).slice();
  if (attacks.length || attacksInspired.length) {
    const lbl = document.createElement('div');
    lbl.className = 'fighter-tooltip-section-label';
    lbl.textContent = 'Attack profiles';
    tip.appendChild(lbl);
    attacks.forEach(function(a) { tip.appendChild(buildAttackProfileNode(a, false)); });
    attacksInspired.forEach(function(a) { tip.appendChild(buildAttackProfileNode(a, true)); });
  }

  card.appendChild(tip);
  return card;
}

export function renderFighterCards(game) {
  const oppRow = document.getElementById('fighter-cards-opp');
  const meRow  = document.getElementById('fighter-cards-me');
  if (!oppRow || !meRow) return;
  oppRow.innerHTML = '';
  meRow.innerHTML = '';
  for (const id in game.fighters) {
    const info = game.fighters[id];
    const card = buildFighterCard(id, info);
    (info.side === 'me' ? meRow : oppRow).appendChild(card);
  }
  // Smart tooltip positioning: on hover/tap, flip to right-align if it would overflow.
  function positionTooltip(card) {
    const tip = card.querySelector('.fighter-tooltip');
    if (!tip) return;
    // Reset any previous override before measuring
    tip.style.left = '';
    tip.style.right = '';
    // Defer to next frame so the tooltip has its natural width
    requestAnimationFrame(function() {
      const rect = tip.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        tip.style.left = 'auto';
        tip.style.right = '0';
      }
    });
  }
  document.querySelectorAll('.fighter-card').forEach(function(card) {
    card.addEventListener('mouseenter', function() { positionTooltip(card); });
    // Tap-to-toggle for touch devices (and for keyboard / desktop click).
    // The CSS keeps the tooltip visible while .tooltip-open is on the card.
    card.addEventListener('click', function(e) {
      const wasOpen = card.classList.contains('tooltip-open');
      // Close any other open tooltips
      document.querySelectorAll('.fighter-card.tooltip-open').forEach(function(c) {
        if (c !== card) c.classList.remove('tooltip-open');
      });
      if (wasOpen) {
        card.classList.remove('tooltip-open');
      } else {
        card.classList.add('tooltip-open');
        positionTooltip(card);
      }
      e.stopPropagation();
    });
  });
}

export function updateFighterCards(state, game) {
  const wounds = state.wounds || {};
  const slain = state.slain || [];
  const inspired = state.inspired || [];
  const upgrades = state.upgrades || {};
  for (const id in game.fighters) {
    const card = document.getElementById('fc-' + id);
    if (!card) continue;
    const isSlain = slain.indexOf(id) >= 0;
    const isInspired = inspired.indexOf(id) >= 0;
    card.classList.toggle('slain', isSlain);
    card.classList.toggle('inspired', isInspired);

    // Inspired tag in tooltip
    const itag = document.getElementById('fc-i-' + id);
    if (itag) itag.style.display = isInspired ? 'inline-block' : 'none';

    // Wounds badge
    const wb = document.getElementById('fc-w-' + id);
    const wc = wounds[id] || 0;
    if (wb) {
      if (wc > 0 && !isSlain) {
        wb.hidden = false;
        wb.textContent = wc;
        const maxW = game.fighters[id].wounds;
        wb.title = maxW ? (wc + ' / ' + maxW + ' wounds') : (wc + ' wound' + (wc === 1 ? '' : 's'));
      } else {
        wb.hidden = true;
      }
    }

    // Upgrades
    const ug = document.getElementById('fc-u-' + id);
    if (ug) {
      ug.innerHTML = '';
      const list = upgrades[id] || [];
      list.forEach(function(name) {
        const chip = document.createElement('span');
        chip.className = 'upgrade-chip';
        chip.textContent = name;
        chip.title = name;
        ug.appendChild(chip);
      });
    }

    // Attack profiles: show only the inspired variant when inspired (and it
    // exists), otherwise only the uninspired variant. Fighters that lack an
    // inspired profile fall back to their regular profile in both states.
    const fInfo = game.fighters[id];
    const hasInspiredProfile = Array.isArray(fInfo.attacksInspired) && fInfo.attacksInspired.length > 0;
    const showInspired = isInspired && hasInspiredProfile;
    card.querySelectorAll('.attack-profile').forEach(function(p) {
      const isInspiredProfile = p.classList.contains('inspired-profile');
      p.style.display = (isInspiredProfile === showInspired) ? '' : 'none';
    });
  }
}

/* ==================== RENDER WARSCROLL ABILITIES ====================
 * Per-side static list of warscroll abilities (game.abilities.me / .opp).
 * Each renders as a chip with a small round token. When the ability's name
 * appears in state.abilitiesUsed[side], the token is removed (visually
 * outlined-only) and the name is struck through.
 */
export function renderAbilities(game, state) {
  const abilities = game.abilities || {};
  const used = (state && state.abilitiesUsed) || {};
  ['me', 'opp'].forEach(function(side) {
    const list = abilities[side] || [];
    const usedList = used[side] || [];
    const group = document.getElementById('abilities-group-' + side);
    const container = document.getElementById('abilities-' + side);
    if (!group || !container) return;
    if (!list.length) {
      group.hidden = true;
      container.innerHTML = '';
      return;
    }
    group.hidden = false;
    container.innerHTML = '';
    list.forEach(function(name) {
      const chip = document.createElement('span');
      chip.className = 'ability-chip';
      const isUsed = usedList.indexOf(name) >= 0;
      if (isUsed) chip.classList.add('used');
      const tok = document.createElement('span');
      tok.className = 'ability-token';
      chip.appendChild(tok);
      const txt = document.createElement('span');
      txt.className = 'ability-chip-name';
      txt.textContent = name;
      chip.appendChild(txt);
      chip.title = (isUsed ? 'Used — ' : '') + name;
      container.appendChild(chip);
    });
  });
}

/* ==================== RENDER ACTIVATIONS ====================
 * Each side has up to 4 activation tokens per round (defaults to 4). Each
 * activation is followed by a power step (where players may play power
 * cards), so the row alternates activation circles and smaller power-step
 * circles.
 *
 * The two counters are independent:
 *   - state.activationsUsed[side] controls the big blue activation circles
 *   - state.powerStepsUsed[side]  controls the small gold power-step circles
 *
 * If powerStepsUsed[side] isn't specified, the power steps mirror the
 * activations (the common case: activation completed -> its power step
 * has been resolved too). Set powerStepsUsed explicitly when you want to
 * show a mid-cycle state (e.g. "activation 3 happened, but its power step
 * hasn't been resolved yet").
 *
 * Use `activationsUsed: null` (or `powerStepsUsed: null`) in a diff to
 * reset that counter (e.g. at end of round).
 */
const ACTIVATIONS_PER_ROUND = 4;

export function renderActivations(state) {
  const aUsed = state.activationsUsed || {};
  const pUsed = state.powerStepsUsed  || {};
  ['me', 'opp'].forEach(function(side) {
    const prefix = side === 'me' ? 'my' : 'opp';
    const container = document.getElementById(prefix + '-activations');
    if (!container) return;
    container.innerHTML = '';
    const total = ACTIVATIONS_PER_ROUND;
    const aCount = Math.max(0, Math.min(total, aUsed[side] || 0));
    // Power steps default to mirroring activations when unspecified.
    const pCount = Math.max(0, Math.min(total,
      pUsed[side] != null ? pUsed[side] : aCount));
    for (let i = 0; i < total; i++) {
      const aTok = document.createElement('span');
      aTok.className = 'activation-token' + (i < aCount ? ' used' : '');
      aTok.textContent = 'A';
      container.appendChild(aTok);
      const pTok = document.createElement('span');
      pTok.className = 'power-step-token' + (i < pCount ? ' used' : '');
      pTok.textContent = 'P';
      container.appendChild(pTok);
    }
    container.title =
      (total - aCount) + ' of ' + total + ' activations remaining; ' +
      (total - pCount) + ' of ' + total + ' power steps remaining';
  });
}

/* ==================== RENDER WARBAND LABELS ====================
 * Replace the static "Your warband" / "Opponent's warband" labels with the
 * actual warband name when the game references a WARBANDS registry entry
 * via `warbands: { me, opp }`. Falls back to the default labels for games
 * that inline their fighters without using the registry.
 */
export function renderWarbandLabels(game) {
  const ids = game.warbands || {};
  const fallbacks = { me: 'Your warband', opp: "Opponent's warband" };
  ['me', 'opp'].forEach(function(side) {
    const el = document.getElementById(side + '-warband-name');
    if (!el) return;
    const wbId = ids[side];
    const wb = wbId ? WARBANDS[wbId] : null;
    el.textContent = (wb && wb.name) ? wb.name : fallbacks[side];
  });
}

/* ==================== RENDER DECKS (deck pair) ====================
 * Each game can declare `decks: { me: { pair }, opp: { pair } }`
 * where `pair` is a string like "Hunters of Huanchi / Shadeborn".
 * Rendered in the warband panel header below the side label.
 *
 * Each deck name in the pair is split on " / " and rendered as a hoverable
 * span. The hover tooltip shows the deck's plot-card rule text (from
 * data/decks.js). Decks that aren't in the library still render — just
 * without a tooltip — so unknown / custom deck names keep working.
 */
export function renderDecks(game) {
  const decks = game.decks || {};
  ['me', 'opp'].forEach(function(side) {
    const container = document.getElementById((side === 'me' ? 'me' : 'opp') + '-warband-meta');
    if (!container) return;
    container.innerHTML = '';
    const d = decks[side];
    if (!d) return;
    if (d.pair) {
      const wrap = document.createElement('span');
      wrap.className = 'deck-pair';
      // Split on " / " (the canonical separator) and render each piece as a
      // hoverable deck-name span. Preserve the literal " / " separator
      // between them so the visual layout matches the old single-string form.
      const parts = String(d.pair).split(/\s*\/\s*/);
      parts.forEach(function(name, i) {
        if (i > 0) {
          const sep = document.createElement('span');
          sep.className = 'deck-name-sep';
          sep.textContent = ' / ';
          wrap.appendChild(sep);
        }
        wrap.appendChild(makeDeckNameEl(name));
      });
      container.appendChild(wrap);
    }
  });
}

/* Build a single deck-name span: the deck name, plus a tooltip with the
 * deck's plot rule text if we recognise it. Falls back to a plain span
 * (no tooltip) if the deck isn't in the library. */
function makeDeckNameEl(name) {
  const trimmed = String(name).trim();
  const el = document.createElement('span');
  el.className = 'deck-name';
  el.textContent = trimmed;

  const entry = lookupDeck(trimmed);
  if (!entry) return el; // unknown deck — render as plain text, no tooltip

  el.classList.add('has-tooltip');
  const tip = document.createElement('span');
  tip.className = 'deck-tooltip';

  const title = document.createElement('span');
  title.className = 'deck-tooltip-title';
  title.textContent = trimmed;
  tip.appendChild(title);

  const body = document.createElement('span');
  body.className = 'deck-tooltip-body';
  if (entry.plot) {
    // Preserve paragraph and bullet structure from the source text.
    String(entry.plot).split(/\n\n+/).forEach(function(para) {
      const p = document.createElement('span');
      p.className = 'deck-tooltip-para';
      p.textContent = para;
      body.appendChild(p);
    });
  } else {
    const p = document.createElement('span');
    p.className = 'deck-tooltip-para deck-tooltip-empty';
    p.textContent = 'No plot card — this deck has no special rule.';
    body.appendChild(p);
  }
  tip.appendChild(body);
  el.appendChild(tip);

  // Tap-to-toggle on mobile (matches the fighter-card pattern). Hover
  // still works on desktop via the :hover CSS rule.
  el.addEventListener('click', function(ev) {
    ev.stopPropagation();
    const wasOpen = el.classList.contains('tooltip-open');
    document.querySelectorAll('.deck-name.tooltip-open').forEach(function(c) {
      if (c !== el) c.classList.remove('tooltip-open');
    });
    if (wasOpen) el.classList.remove('tooltip-open');
    else         el.classList.add('tooltip-open');
  });

  return el;
}
