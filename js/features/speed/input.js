import { state } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { checkAnswer, toRomajiLoose } from '../../core/utils.js';

export const submitSpeedAnswer = (onSuccess, onFail) => {
  const s = state.speed;
  if (!s.active || s.phase !== 'answer' || s.inputLocked) return;

  const input = $('#speedInput');
  const val = input.value.trim();
  if (!val) return;

  s.inputLocked = true;
  if (s.answerTimer) { clearInterval(s.answerTimer); s.answerTimer = null; }
  input.disabled = true;

  const total = s.answerTime;
  const elapsed = Date.now() - s.answerStart;
  const timeUsedPct = Math.min(100, Math.round((elapsed / total) * 100));
  const cur = s.current;
  const result = checkAnswer(val, cur.answer, s.jpIme);
  const sim = result.sim;
  const fb = $('#speedFeedback');

  if (sim >= 80) {
    const rawScore = Math.max(0, sim - timeUsedPct);
    const add = Math.min(100, rawScore);
    s.score += add;
    s.totalScore += add;
    s.correct++;
    s.total++;
    s.streak++;
    if (s.streak > s.bestStreak) s.bestStreak = s.streak;
    $('#speedStreak').textContent = `Streak ${s.streak}`;

    fb.textContent = `+${add} (${sim}% match · ${timeUsedPct}% time)`;
    fb.className = 'feedback correct';

    if (s.answerTime > 3000) {
      s.answerTime = Math.max(3000, s.answerTime - 500);
    }

    onSuccess(sim);
  } else {
    let shown = cur.answer;
    if (cur.isJpAnswer && s.jpIme === 'no') shown = toRomajiLoose(cur.answer);
    fb.textContent = `Wrong — answer: ${shown}`;
    fb.className = 'feedback wrong';
    s.total++;
    s.streak = 0;
    $('#speedStreak').textContent = 'Streak 0';

    onFail(sim);
  }
};