/* ==================== POLL ====================
 * Per-step quiz prompt. A step can declare:
 *   poll: { question?, options: [string, ...], correct: <index> }
 *
 * Clicking an option reveals whether it's the right call:
 *   - clicked option matches `correct`  → that option turns green
 *   - clicked option is something else   → that option turns red
 *
 * The user's clicked indices are persisted in localStorage under
 * POLLS_KEY, keyed by `gameId:stepIdx`, so the colouring stays after
 * a reload. For back-compat with games that used the old `actual`
 * field, `actual` is read as a fallback when `correct` is missing.
 *
 * renderPoll accepts an optional `onCorrect(stepIdx)` callback, fired the
 * first time the correct option is clicked. The host uses it to reveal a
 * follow-up step (e.g. the opponent's hidden power card).
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

export function renderPoll(game, stepIdx, onCorrect) {
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
      const alreadyClicked = clickedSet.has(i);
      addClicked(game.id, stepIdx, i);
      renderPoll(game, stepIdx, onCorrect);
      // Reveal the follow-up (e.g. opponent's hidden power card) the first
      // time the correct option is picked. `onCorrect` is responsible for
      // deciding whether there's anything to advance to.
      if (!alreadyClicked && i === correctIdx && typeof onCorrect === 'function') {
        onCorrect(stepIdx);
      }
    });
    optsEl.appendChild(btn);
  });
}
