import { state } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { $, clear } from '../../core/dom.js';
import { KANA_DATA } from '../../data/kana.js';
import { go } from '../../core/router.js';
import { fmtTime } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { renderQE, renderFlashcard, renderMC, renderRomajiSelect, renderStroke } from './methods.js';

let hudTimerId = null;

const startHudTimer = () => {
  clearInterval(hudTimerId);
  hudTimerId = setInterval(() => {
    if (state.train.mode && state.train.startTime) {
      const elapsed = Math.floor((Date.now() - state.train.startTime) / 1000);
      const node = $('#hudTimer');
      if (node) node.textContent = fmtTime(elapsed);
    }
  }, 1000);
};

const stopHudTimer = () => {
  clearInterval(hudTimerId);
  hudTimerId = null;
};

export const cleanupStage = () => {
  const T = state.train;
  if (T.cleanup) { try { T.cleanup(); } catch {} T.cleanup = null; }
  if (T.timer) { clearTimeout(T.timer); T.timer = null; }
};

export const completeStage = (char, isCorrect) => {
  const T = state.train;
  if (T.locked) return;
  T.locked = true;
  cleanupStage();

  if (!state.charStats[char]) state.charStats[char] = { attempts: 0, correct: 0 };
  state.charStats[char].attempts++;

  if (isCorrect) {
    state.charStats[char].correct++;
    T.correct++;
    T.score += 100;
  }

  save('stats', state.charStats);
  $('#hudScore').textContent = `Score: ${T.score}`;
  T.index++;

  T.timer = setTimeout(() => {
    T.locked = false;
    if (T.mode === 'kana') nextKanaStage();
    else if (T.mode === 'srs') import('./srs.js').then((m) => m.nextSRSStage());
  }, isCorrect ? 600 : 1200);
};

export const endTraining = () => {
  const T = state.train;
  cleanupStage();
  stopHudTimer();

  if (!T.startTime) return;
  const elapsed = Math.floor((Date.now() - T.startTime) / 1000);
  const acc = T.index ? Math.round((T.correct / T.index) * 100) : 0;

  state.profile.sessions++;
  state.profile.correct += T.correct;
  state.profile.total += T.index;
  state.profile.timeSec += elapsed;
  save('profile', state.profile);

  $('#rScore').textContent = T.score || T.correct;
  $('#rAcc').textContent = `${acc}%`;
  $('#rTime').textContent = fmtTime(elapsed);

  T.mode = null;
  T.startTime = 0;

  go('results');
  import('../leaderboard/index.js').then((m) => m.submitScore());
};

export const startKana = () => {
  const currentSet = {};
  state.groups.forEach((g) => {
    const grp = KANA_DATA[state.tab] && KANA_DATA[state.tab][g];
    if (grp) Object.assign(currentSet, grp.chars);
  });

  const chars = Object.keys(currentSet);
  if (!chars.length) {
    toast('Select at least one group', 'error');
    return;
  }

  const pool = [];
  chars.forEach((c) => {
    const st = state.charStats[c];
    let weight = 1;
    if (st && st.attempts > 0) {
      const a = st.correct / st.attempts;
      if (a < 0.7) weight = 3;
      else if (a < 0.9) weight = 2;
    }
    for (let i = 0; i < weight; i++) pool.push(c);
  });

  const T = state.train;
  T.mode = 'kana';
  T.queue = [];
  T.index = 0;
  T.total = state.settings.length;
  T.correct = 0;
  T.score = 0;
  T.startTime = Date.now();
  T.locked = false;
  T.currentSet = currentSet;

  for (let i = 0; i < T.total; i++) {
    T.queue.push({ char: pool[Math.floor(Math.random() * pool.length)] });
  }

  $('#hudStage').textContent = `Stage 1 / ${T.total}`;
  $('#hudScore').textContent = 'Score: 0';
  $('#hudTimer').textContent = '0:00';
  $('#endBtn').style.display = 'none';
  $('#progressFill').style.width = '0%';

  startHudTimer();
  go('training');
  setTimeout(() => nextKanaStage(), 80);
};

export const nextKanaStage = () => {
  const T = state.train;
  if (T.mode !== 'kana') return;
  cleanupStage();

  if (T.index >= T.total) { endTraining(); return; }

  T.locked = false;
  const char = T.queue[T.index].char;
  $('#hudStage').textContent = `Stage ${T.index + 1} / ${T.total}`;
  $('#progressFill').style.width = `${(T.index / T.total) * 100}%`;

  const container = $('#methodContainer');
  clear(container);

  const methods = state.settings.methods.filter((m) =>
    ['qe', 'flashcard', 'mc', 'romajiSelect', 'stroke'].includes(m)
  );
  if (!methods.length) methods.push('flashcard');
  const method = methods[Math.floor(Math.random() * methods.length)];

  if (method === 'qe') renderQE(container, char);
  else if (method === 'flashcard') renderFlashcard(container, char);
  else if (method === 'mc') renderMC(container, char);
  else if (method === 'romajiSelect') renderRomajiSelect(container, char);
  else if (method === 'stroke') renderStroke(container, char);
};
