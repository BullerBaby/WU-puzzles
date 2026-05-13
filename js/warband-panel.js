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
 *   - Decks header (deck pair + plot-card chips)
 */

import { svgEl } from './board.js';

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

export function renderFighterTokens(fighterId, tokens, slain) {
  const g = document.getElementById('t-' + fighterId);
  if (!g) return;
  g.innerHTML = '';
  if (slain) return;
  if (!tokens || !tokens.length) return;
  // Position a row of small circles below the fighter (fighter circle r=10, so y=14)
  const r = 3.5;
  const spacing = 7.2;
  const n = tokens.length;
  const startX = -((n - 1) * spacing) / 2;
  tokens.forEach(function(t, i) {
    const spec = tokenSpec(t);
    const cx = startX + i * spacing;
    const cy = 14;
    const c = svgEl('circle', { cx: cx.toFixed(2), cy: cy, r: r, fill: spec.color, class: 'tok-circle' });
    const tooltip = svgEl('title');
    tooltip.textContent = spec.label;
    c.appendChild(tooltip);
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
  // Smart tooltip positioning: on hover, flip to right-align if it would overflow.
  document.querySelectorAll('.fighter-card').forEach(function(card) {
    card.addEventListener('mouseenter', function() {
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
 * Each side has up to 4 activation tokens per round (defaults to 4). As
 * fighters activate, the count in state.activationsUsed[side] increases and
 * the right-most tokens go hollow. Use `activationsUsed: null` in a diff to
 * reset (e.g. at end of round).
 */
const ACTIVATIONS_PER_ROUND = 4;

export function renderActivations(state) {
  const used = state.activationsUsed || {};
  ['me', 'opp'].forEach(function(side) {
    const prefix = side === 'me' ? 'my' : 'opp';
    const container = document.getElementById(prefix + '-activations');
    if (!container) return;
    container.innerHTML = '';
    const total = ACTIVATIONS_PER_ROUND;
    const usedCount = Math.max(0, Math.min(total, used[side] || 0));
    for (let i = 0; i < total; i++) {
      const tok = document.createElement('span');
      tok.className = 'activation-token' + (i >= total - usedCount ? ' used' : '');
      container.appendChild(tok);
    }
    container.title = (total - usedCount) + ' of ' + total + ' activations remaining';
  });
}

/* ==================== RENDER DECKS (deck pair + plot cards) ====================
 * Each game can declare `decks: { me: { pair, plots }, opp: { pair, plots } }`
 * where `pair` is a string like "Hunters of Huanchi / Shadeborn" and `plots`
 * is an array of up to 2 plot-card names. Rendered in the warband panel
 * header below the side label.
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
      const pair = document.createElement('span');
      pair.className = 'deck-pair';
      pair.textContent = d.pair;
      container.appendChild(pair);
    }
    if (d.plots && d.plots.length) {
      const plots = document.createElement('span');
      plots.className = 'plot-chips';
      d.plots.slice(0, 2).forEach(function(name) {
        const chip = document.createElement('span');
        chip.className = 'plot-chip';
        chip.textContent = name;
        chip.title = name;
        plots.appendChild(chip);
      });
      container.appendChild(plots);
    }
  });
}
