import { state } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { $, $$, el, clear } from '../../core/dom.js';
import { SRS } from '../../srs/srs.js';
import { shuffle } from '../../core/utils.js';
import { go } from '../../core/router.js';
import { toast } from '../../core/toast.js';
import { KANA_DATA } from '../../data/kana.js';
import { cleanupStage, endTraining } from './index.js';

export const startSRS = () => {
  const currentSet = {};
  state.groups.forEach((g) => {
    const grp = KANA_DATA[state.tab] && KANA_DATA[state.tab][g];
    if (grp) Object.assign(currentSet, grp.chars);
  });

  const chars = Object.keys(currentSet);
  if (!chars.length) {
    toast('Select Kana groups first', 'error');
    go('setup');
    return;
  }

  const due = chars.filter((c) => SRS.isDue(state.srs[c]));
  if (!due.length) {
    toast('No cards due right now', 'info');
    return;
  }

  const T = state.train;
  T.mode = 'srs';
  T.queue = shuffle(due);
  T.index = 0;
  T.total = due.length;
  T.correct = 0;
  T.score = 0;
  T.startTime = Date.now();
  T.locked = false;
  T.currentSet = currentSet;

  $('#hudStage').textContent = `Card 1 / ${T.total}`;
  $('#hudScore').textContent = 'Mode: SRS';
  $('#hudTimer').textContent = '0:00';
  $('#endBtn').style.display = 'block';
  $('#progressFill').style.width = '0%';

  const hudTimer = setInterval(() => {
    if (T.mode && T.startTime) {
      const elapsed = Math.floor((Date.now() - T.startTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      $('#hudTimer').textContent = `${m}:${String(s).padStart(2, '0')}`;
    }
  }, 1000);

  T.hudTimer = hudTimer;

  go('training');
  setTimeout(() => nextSRSStage(), 80);
};

export const nextSRSStage = () => {
  const T = state.train;
  if (T.mode !== 'srs') return;
  cleanupStage();

  if (T.index >= T.queue.length) { endTraining(); return; }

  T.locked = false;
  const char = T.queue[T.index];
  $('#hudStage').textContent = `Card ${T.index + 1} / ${T.total}`;
  $('#progressFill').style.width = `${(T.index / T.total) * 100}%`;

  const container = $('#methodContainer');
  clear(container);

  const name = el('div', 'method-name', 'SRS Review');
  const kana = el('div', 'kana-display', char);

  const input = el('input', 'text-input');
  input.type = 'text';
  input.placeholder = 'romaji...';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.id = 'srsInput';

  const fb = el('div', 'feedback');
  fb.id = 'srsFeedback';

  const rating = el('div', 'rating-row');
  rating.id = 'srsRating';

  const rates = [
    { q: 0, label: 'Again', sub: 'reset' },
    { q: 3, label: 'Hard', sub: '+1d' },
    { q: 4, label: 'Good', sub: '+6d' },
    { q: 5, label: 'Easy', sub: '+ long' }
  ];

  rates.forEach((r) => {
    const btn = el('button', 'rate-btn');
    btn.dataset.q = r.q;
    btn.appendChild(document.createTextNode(r.label));
    btn.appendChild(el('small', '', r.sub));
    rating.appendChild(btn);
  });

  container.appendChild(name);
  container.appendChild(kana);
  container.appendChild(input);
  container.appendChild(fb);
  container.appendChild(rating);

  const correctRomaji = T.currentSet[char];
  let answered = false;

  input.focus();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !answered) {
      answered = true;
      const val = input.value.trim().toLowerCase();
      if (val === correctRomaji) {
        fb.textContent = '✓ Correct — rate yourself';
        fb.className = 'feedback correct';
      } else {
        fb.textContent = `✗ Correct answer: ${correctRomaji}`;
        fb.className = 'feedback wrong';
      }
      input.disabled = true;
      $$('.rate-btn', rating).forEach((b) => b.classList.add('active'));
    }
  });

  $$('.rate-btn', rating).forEach((btn) => {
    btn.onclick = () => {
      if (T.locked) return;
      T.locked = true;
      cleanupStage();
      const q = parseInt(btn.dataset.q, 10);
      state.srs[char] = SRS.review(state.srs[char], q);
      save('srs', state.srs);
      if (q >= 3) T.correct++;
      T.index++;
      T.timer = setTimeout(() => {
        T.locked = false;
        nextSRSStage();
      }, 300);
    };
  });

  T.cleanup = () => { input.disabled = true; };
};
