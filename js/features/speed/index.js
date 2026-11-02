import { state, save } from '../../core/state.js';
import { $, $$ } from '../../core/dom.js';
import { go } from '../../core/router.js';
import { DICT_WORDS } from '../../data/dictionary.js';
import { fmtTime, rankFromScore, toRomajiLoose } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import {
  hideAllSections, renderLives, setRank,
  showNative, showDirection, showSetup, showLevel, showIntro, showSessionEnd
} from './ui.js';
import { submitSpeedAnswer } from './input.js';

const ANSWER_TIME_MS = 15000;
const SESSION_DURATION_MS = 180000;

const clearTimers = () => {
  const s = state.speed;
  if (s.answerTimer) { clearInterval(s.answerTimer); s.answerTimer = null; }
  if (s.sessionTimer) { clearInterval(s.sessionTimer); s.sessionTimer = null; }
  s.flashTimers.forEach((t) => clearTimeout(t));
  s.flashTimers = [];
};

const levelFilter = () => {
  const lv = state.speed.level;
  if (!lv || lv === 'quepro') return DICT_WORDS;
  return DICT_WORDS.filter((w) => w.level === lv);
};

const pickPair = () => {
  const pool = levelFilter().filter((w) => w.en && w.ru && w.jp && w.romaji);
  if (!pool.length) return null;

  const item = pool[Math.floor(Math.random() * pool.length)];
  const native = state.speed.nativeLang === 'ru' ? item.ru : item.en;
  const nativeLang = state.speed.nativeLang === 'ru' ? 'Русский' : 'English';

  if (state.speed.direction === 'native2jp') {
    return {
      prompt: native,
      answer: item.jp,
      lang: nativeLang,
      answerLang: '日本語',
      isJpAnswer: true
    };
  }
  return {
    prompt: item.jp,
    answer: native,
    lang: '日本語',
    answerLang: nativeLang,
    isJpAnswer: false
  };
};

export const openSpeed = () => {
  const s = state.speed;
  s.active = false;
  s.phase = 'idle';
  s.lives = 5;
  s.streak = 0;
  s.score = 0;
  s.totalScore = 0;
  s.correct = 0;
  s.total = 0;
  s.answerTime = ANSWER_TIME_MS;
  s.rank = 'D';
  s.inputLocked = false;
  clearTimers();

  renderLives();
  $('#speedStreak').textContent = 'Streak 0';
  $('#speedSessionTimer').textContent = '3:00';
  setRank('D', false);
  $('#speedInput').value = '';
  $('#speedFeedback').textContent = '';
  $('#speedFeedback').className = 'feedback';
  $('#speedTimerBar').style.width = '100%';
  $('#speedTimerBar').className = 'speed-timer-bar';

  go('speed');

  if (!s.nativeLang) showNative();
  else if (!s.direction) showDirection();
  else if (!s.jpIme) showSetup();
  else if (!s.level) showLevel();
  else showIntro();
};

const startSession = () => {
  const s = state.speed;
  if (!s.nativeLang) { showNative(); return; }
  if (!s.direction) { showDirection(); return; }
  if (!s.jpIme) { showSetup(); return; }
  if (!s.level) { showLevel(); return; }

  const test = pickPair();
  if (!test) {
    toast('No words available for this level', 'error');
    showLevel();
    return;
  }

  s.active = true;
  s.phase = 'flash';
  s.lives = 5;
  s.streak = 0;
  s.score = 0;
  s.totalScore = 0;
  s.correct = 0;
  s.total = 0;
  s.answerTime = ANSWER_TIME_MS;
  s.sessionStart = Date.now();
  s.sessionEnd = s.sessionStart + SESSION_DURATION_MS;
  s.inputLocked = false;
  s.rank = 'D';

  renderLives();
  $('#speedStreak').textContent = 'Streak 0';
  setRank('D', false);
  $('#speedEndBtn').style.display = 'inline-flex';
  $('#speedInput').value = '';
  $('#speedFeedback').textContent = '';
  $('#speedFeedback').className = 'feedback';

  clearTimers();

  s.sessionTimer = setInterval(() => {
    const left = Math.max(0, s.sessionEnd - Date.now());
    $('#speedSessionTimer').textContent = fmtTime(Math.ceil(left / 1000));
    if (left <= 0) endSpeed(true);
  }, 200);

  nextRound();
};

const nextRound = () => {
  const s = state.speed;
  if (!s.active) return;
  if (s.lives <= 0) { endSpeed(true); return; }
  if (Date.now() >= s.sessionEnd) { endSpeed(true); return; }

  s.phase = 'flash';
  const pair = pickPair();
  if (!pair) { endSpeed(true); return; }
  s.current = pair;
  s.inputLocked = false;

  const flashWrap = $('#speedFlashWrap');
  const flashWord = $('#speedFlashWord');
  const flashLang = $('#speedFlashLang');
  const answerWrap = $('#speedAnswerWrap');

  answerWrap.classList.remove('active');
  flashWrap.classList.add('active');

  flashWord.className = `speed-flash-word${pair.isJpAnswer ? ' jp' : ''}`;
  flashWord.textContent = pair.prompt;
  flashLang.textContent = pair.lang;
  flashLang.className = 'speed-flash-lang';

  const flashShowMs = 900;
  const flashHoldMs = 1500;

  s.flashTimers.push(setTimeout(() => {
    flashWord.classList.add('show');
    flashLang.classList.add('show');
  }, 50));

  s.flashTimers.push(setTimeout(() => {
    flashWord.classList.remove('show');
    flashWord.classList.add('hide');
    flashLang.classList.remove('show');
  }, flashShowMs + flashHoldMs));

  s.flashTimers.push(setTimeout(() => {
    flashWrap.classList.remove('active');
    startAnswerPhase();
  }, flashShowMs + flashHoldMs + 300));
};

const startAnswerPhase = () => {
  const s = state.speed;
  if (!s.active) return;
  s.phase = 'answer';

  const answerWrap = $('#speedAnswerWrap');
  answerWrap.classList.add('active');

  const input = $('#speedInput');
  input.value = '';
  input.disabled = false;
  input.className = 'text-input speed-input';

  const isJp = s.current && s.current.isJpAnswer;
  if (isJp && s.jpIme === 'no') input.placeholder = 'Type in romaji...';
  else if (isJp) input.placeholder = 'Type kana, kanji or romaji...';
  else input.placeholder = 'Type the translation...';

  $('#speedFeedback').textContent = '';
  $('#speedFeedback').className = 'feedback';

  setTimeout(() => input.focus(), 50);

  s.answerStart = Date.now();
  const total = s.answerTime;
  const bar = $('#speedTimerBar');
  bar.style.width = '100%';
  bar.className = 'speed-timer-bar';

  if (s.answerTimer) clearInterval(s.answerTimer);

  s.answerTimer = setInterval(() => {
    const elapsed = Date.now() - s.answerStart;
    const left = Math.max(0, total - elapsed);
    const pct = (left / total) * 100;
    bar.style.width = `${pct}%`;
    if (pct <= 33) bar.className = 'speed-timer-bar danger';
    else if (pct <= 66) bar.className = 'speed-timer-bar warn';

    if (left <= 0) {
      clearInterval(s.answerTimer);
      s.answerTimer = null;
      handleTimeout();
    }
  }, 50);
};

const handleTimeout = () => {
  const s = state.speed;
  if (!s.active) return;
  if (s.inputLocked) return;
  s.inputLocked = true;

  const fb = $('#speedFeedback');
  const cur = s.current;
  let hint = cur.answer;
  if (cur.isJpAnswer && s.jpIme === 'no') hint = toRomajiLoose(cur.answer);

  fb.textContent = `Timeout — answer: ${hint}`;
  fb.className = 'feedback wrong';
  loseLife();

  s.streak = 0;
  $('#speedStreak').textContent = 'Streak 0';

  setTimeout(() => {
    if (s.active) nextRound();
  }, 1200);
};

const loseLife = () => {
  const s = state.speed;
  s.lives = Math.max(0, s.lives - 1);
  renderLives();
  if (s.lives <= 0) {
    setTimeout(() => endSpeed(true), 600);
  }
};

export const endSpeed = (showResults) => {
  const s = state.speed;
  if (!s.active) return;
  s.active = false;
  s.phase = 'idle';
  clearTimers();
  $('#speedEndBtn').style.display = 'none';

  const elapsed = s.sessionStart ? Math.floor((Date.now() - s.sessionStart) / 1000) : 0;

  if (showResults) {
    const avg = s.total ? Math.round(s.totalScore / s.total) : 0;
    const finalRank = rankFromScore(avg);
    showSessionEnd(finalRank, s.totalScore, s.correct, s.total);

    if (elapsed > 0) {
      state.profile.sessions++;
      state.profile.timeSec += elapsed;
      save('profile', state.profile);
    }
  } else {
    if (!s.nativeLang) showNative();
    else if (!s.direction) showDirection();
    else if (!s.jpIme) showSetup();
    else if (!s.level) showLevel();
    else showIntro();
  }
};

export const bindSpeed = () => {
  $$('.speed-native-card').forEach((card) => {
    card.onclick = () => {
      state.speed.nativeLang = card.dataset.native;
      save('speed_native', state.speed.nativeLang);
      showDirection();
    };
  });

  $$('.speed-direction-card').forEach((card) => {
    card.onclick = () => {
      state.speed.direction = card.dataset.dir;
      save('speed_direction', state.speed.direction);
      showSetup();
    };
  });

  $('#speedKbYes').onclick = () => {
    state.speed.jpIme = 'yes';
    save('speed_jpime', 'yes');
    showLevel();
  };

  $('#speedKbNo').onclick = () => {
    state.speed.jpIme = 'no';
    save('speed_jpime', 'no');
    showLevel();
  };

  $('#speedSettingsBtn').onclick = (e) => {
    e.stopPropagation();
    $('#speedSettingsBtn').classList.toggle('active');
    $('#speedSettingsPopover').classList.toggle('active');
  };

  document.addEventListener('click', (e) => {
    const popover = $('#speedSettingsPopover');
    const btn = $('#speedSettingsBtn');
    if (popover && popover.classList.contains('active')) {
      if (!e.target.closest('#speedSettingsWrap')) {
        popover.classList.remove('active');
        btn.classList.remove('active');
      }
    }
  });

  $('#speedChangeLangBtn').onclick = () => {
    $('#speedSettingsBtn').classList.remove('active');
    $('#speedSettingsPopover').classList.remove('active');
    showNative();
  };

  $('#speedChangeLevelBtn').onclick = () => {
    $('#speedSettingsBtn').classList.remove('active');
    $('#speedSettingsPopover').classList.remove('active');
    showLevel();
  };

  $('#speedChangeKbBtn').onclick = () => {
    $('#speedSettingsBtn').classList.remove('active');
    $('#speedSettingsPopover').classList.remove('active');
    showSetup();
  };

  $$('#speedLevelGrid .speed-level-card').forEach((card) => {
    card.onclick = () => {
      state.speed.level = card.dataset.level;
      save('speed_level', state.speed.level);
      $$('#speedLevelGrid .speed-level-card').forEach((c) => {
        c.classList.toggle('selected', c === card);
      });
      $('#speedLevelNote').textContent = `Selected: ${state.speed.level.toUpperCase()}`;
      setTimeout(() => showIntro(), 250);
    };
  });

  $('#speedStartBtn').onclick = startSession;
  $('#speedRestartBtn').onclick = startSession;
  $('#speedEndBtn').onclick = () => endSpeed(true);

  $('#speedInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSpeedAnswer(
        (sim) => {
          setRank(rankFromScore(sim), true);
          setTimeout(() => {
            if (state.speed.active) nextRound();
          }, 800);
        },
        (sim) => {
          setRank(rankFromScore(sim), true);
          loseLife();
          setTimeout(() => {
            if (state.speed.active) nextRound();
          }, 1200);
        }
      );
    }
  });
};