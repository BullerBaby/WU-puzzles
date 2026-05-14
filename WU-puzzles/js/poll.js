/* ==================== POLL ====================
 * Per-step opinion poll. A step can declare:
 *   poll: { question?, options: [string, ...], actual? }
 *
 * Votes are stored in localStorage under POLLS_KEY, keyed by `gameId:stepIdx`,
 * so they persist across reloads but stay local to the browser (no server,
 * no cross-device sync). Optional `actual` (index) marks which option was
 * played; gets a green ✓ once any votes are cast.
 */

const POLLS_KEY = 'underworlds-polls-v1';

function loadAllPolls() {
  try { return JSON.parse(localStorage.getItem(POLLS_KEY) || '{}'); }
  catch (e) { return {}; }
}

function saveAllPolls(all) {
  try { localStorage.setItem(POLLS_KEY, JSON.stringify(all)); return true; }
  catch (e) { return false; }
}

function pollKey(gameId, stepIdx) { return gameId + ':' + stepIdx; }

function getStepVotes(gameId, stepIdx, optionCount) {
  const all = loadAllPolls();
  const key = pollKey(gameId, stepIdx);
  const votes = (all[key] || []).slice();
  while (votes.length < optionCount) votes.push(0);
  return votes;
}

function addPollVote(gameId, stepIdx, optIdx, optionCount) {
  const all = loadAllPolls();
  const key = pollKey(gameId, stepIdx);
  if (!Array.isArray(all[key])) all[key] = [];
  while (all[key].length < optionCount) all[key].push(0);
  all[key][optIdx] = (all[key][optIdx] || 0) + 1;
  saveAllPolls(all);
  return all[key];
}

export function resetStepVotes(gameId, stepIdx) {
  const all = loadAllPolls();
  const key = pollKey(gameId, stepIdx);
  if (all[key]) { delete all[key]; saveAllPolls(all); }
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
  const optsEl = document.getElementById('poll-options');
  const metaEl = document.getElementById('poll-meta');
  optsEl.innerHTML = '';
  const votes = getStepVotes(game.id, stepIdx, poll.options.length);
  const total = votes.reduce(function(a, b) { return a + b; }, 0);
  metaEl.textContent = total === 0 ? 'No votes yet' : (total + (total === 1 ? ' vote' : ' votes'));
  const actualIdx = (typeof poll.actual === 'number') ? poll.actual : -1;
  poll.options.forEach(function(opt, i) {
    const count = votes[i] || 0;
    const pct = total > 0 ? (count / total * 100) : 0;
    const btn = document.createElement('button');
    btn.className = 'poll-option' + (i === actualIdx && total > 0 ? ' is-actual' : '');
    btn.type = 'button';
    const bar = document.createElement('span'); bar.className = 'poll-option-bar';
    bar.style.width = pct.toFixed(1) + '%';
    btn.appendChild(bar);
    const wrap = document.createElement('span'); wrap.className = 'poll-option-content';
    const txt = document.createElement('span'); txt.className = 'poll-option-text';
    txt.textContent = opt;
    wrap.appendChild(txt);
    const cnt = document.createElement('span'); cnt.className = 'poll-option-count';
    cnt.textContent = total > 0 ? (count + ' · ' + Math.round(pct) + '%') : '0';
    wrap.appendChild(cnt);
    btn.appendChild(wrap);
    btn.addEventListener('click', function() {
      addPollVote(game.id, stepIdx, i, poll.options.length);
      renderPoll(game, stepIdx);
    });
    optsEl.appendChild(btn);
  });
}
