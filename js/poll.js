/* ==================== POLL ====================
 * Per-step quiz prompt. A step can declare:
 *   poll: {
 *     question?,
 *     options: [string, ...],
 *     correct: <index>,
 *     reveal?: { type: 'power'|'objective', card: 'Name' }
 *       // optional: revealed only after user clicks the correct option
 *   }
 *
 * Clicking an option reveals whether it's the right call:
 *   - clicked option matches `correct`  → that option turns green
 *   - clicked option is something else   → that option turns red
 *
 * If a `reveal` is defined and the user finds the correct answer, the
 * reveal block shows beneath the options (e.g. "Power card played:
 * Violent Blast").
 *
 * The user's clicked indices are persisted in localStorage under
 * POLLS_KEY, keyed by `gameId:stepIdx`, so the colouring stays after
 * a reload. For back-compat with games that used the old `actual`
 * field, `actual` is read as a fallback when `correct` is missing.
 */

const POLLS_KEY = 'underworlds-poll-answers-v1';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(POLLS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveAll(all) {
  try { localStorage.setItem(POLLS_KEY, JSON.stringify(all)); return true; }
  catch (e) { return false; }
}

function pollKey(gameId, stepIdx) { return gameId + ':' + stepIdx; }

function getClicked(gameId, stepIdx) {
  const all = loadAll();
  const arr = all[pollKey(gameId, stepIdx)];
  return Array.isArray(arr) ? arr.slice() : [];
}

function addClicked(gameId, stepIdx, optIdx) {
  const all = loadAll();
  const k = pollKey(gameId, stepIdx);
  const arr = Array.isArray(all[k]) ? all[k] : [];
  if (arr.indexOf(optIdx) < 0) arr.push(optIdx);
  all[k] = arr;
  saveAll(all);
  return arr;
}

export function resetStepAnswers(gameId, stepIdx) {
  const all = loadAll();
  const k = pollKey(gameId, stepIdx);
  if (all[k]) { delete all[k]; saveAll(all); }
}

export function renderPoll(game, stepIdx) {
  const panel = document.getElementById('poll-panel');
  if (!panel || !game) return;
  const step = game.steps[stepIdx];
  const poll = step && step.poll;
  if (!poll || !Array.isArray(poll.options) || !poll.options.length) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  document.getElementById('poll-question').textContent = poll.question || 'What would you do?';

  // The right answer can be declared as `correct` (new name) or `actual`
  // (legacy name from when this was a "what was actually played" indicator).
  const correctIdx =
    (typeof poll.correct === 'number') ? poll.correct :
    (typeof poll.actual  === 'number') ? poll.actual  : -1;

  const clicked = getClicked(game.id, stepIdx);
  const clickedSet = new Set(clicked);
  const hasFoundCorrect = correctIdx >= 0 && clickedSet.has(correctIdx);

  const optsEl = document.getElementById('poll-options');
  optsEl.innerHTML = '';

  const metaEl = document.getElementById('poll-meta');
  if (metaEl) {
    metaEl.className = 'poll-meta';
    if (!clicked.length || correctIdx < 0) {
      metaEl.textContent = '';
    } else if (hasFoundCorrect) {
      metaEl.textContent = 'Correct';
      metaEl.classList.add('correct');
    } else {
      metaEl.textContent = 'Try again';
      metaEl.classList.add('incorrect');
    }
  }

  poll.options.forEach(function(opt, i) {
    const btn = document.createElement('button');
    let cls = 'poll-option';
    if (clickedSet.has(i)) {
      cls += (i === correctIdx) ? ' correct' : ' incorrect';
    }
    btn.className = cls;
    btn.type = 'button';

    const wrap = document.createElement('span');
    wrap.className = 'poll-option-content';
    const txt = document.createElement('span');
    txt.className = 'poll-option-text';
    txt.textContent = opt;
    wrap.appendChild(txt);

    if (clickedSet.has(i)) {
      const mark = document.createElement('span');
      mark.className = 'poll-option-mark';
      mark.textContent = (i === correctIdx) ? '✓' : '✗';
      wrap.appendChild(mark);
    }

    btn.appendChild(wrap);

    btn.addEventListener('click', function() {
      addClicked(game.id, stepIdx, i);
      renderPoll(game, stepIdx);
    });
    optsEl.appendChild(btn);
  });

  // Reveal block: visible only after the user has clicked the correct
  // option. Currently supports power/objective card reveals.
  const revealEl = document.getElementById('poll-reveal');
  if (revealEl) {
    revealEl.innerHTML = '';
    if (hasFoundCorrect && poll.reveal && poll.reveal.card) {
      const type = (poll.reveal.type === 'objective' || poll.reveal.type === 'obj')
        ? 'obj' : 'power';
      const labelText = (type === 'obj')
        ? 'Objective card revealed:'
        : 'Power card revealed:';
      const label = document.createElement('span');
      label.className = 'poll-reveal-label';
      label.textContent = labelText;
      const chip = document.createElement('span');
      chip.className = 'card-chip ' + type;
      chip.textContent = poll.reveal.card;
      chip.title = poll.reveal.card;
      revealEl.appendChild(label);
      revealEl.appendChild(chip);
      revealEl.hidden = false;
    } else {
      revealEl.hidden = true;
    }
  }
}
