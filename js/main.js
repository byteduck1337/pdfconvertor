import { state, initState, save } from './core/state.js';
import { $, $$ } from './core/dom.js';
import { go, registerScreen, setLeavers } from './core/router.js';
import { getUsername, setUsername } from './core/storage.js';
import { toast } from './core/toast.js';

import { renderSetup, bindSetup } from './features/setup.js';
import { endTraining } from './features/training/index.js';
import { startSRS } from './features/training/srs.js';
import { openSpeed, bindSpeed, endSpeed } from './features/speed/index.js';
import { bindDictionary, renderDictionary } from './features/dictionary/index.js';
import { startSentence } from './features/sentence/index.js';
import { startVerb } from './features/verb/index.js';
import { startReading } from './features/reading/index.js';
import { renderLeaderboard, bindLeaderboard } from './features/leaderboard/index.js';
import { renderProgress } from './features/progress/index.js';
import { statusOf } from './data/kana.js';
import { initTilt } from './ui/tilt.js';
import { initPencilLines } from './ui/pencil.js';

const bindNav = () => {
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    const target = nav.dataset.nav;
    if (target === 'srs-start') startSRS();
    else if (target === 'speed') openSpeed();
    else go(target);
  });

  $('#logoBtn').addEventListener('click', () => go('menu'));

  const extTabsWrap = document.getElementById('fx-tabs');
  if (extTabsWrap) {
    const extTabs = extTabsWrap.querySelectorAll('.ext-tab');
    extTabsWrap.addEventListener('click', (e) => {
      const clicked = e.target.closest('.ext-tab');
      if (!clicked) return;

      if (clicked.dataset.nav) go(clicked.dataset.nav);
      if (clicked.id === 'extSettingsBtn') $('#settingsOverlay').classList.add('active');

      extTabs.forEach((t) => t.classList.remove('active'));
      clicked.classList.add('active');
    });
  }
};

const bindSettings = () => {
  $('#closeSettingsBtn').onclick = () => $('#settingsOverlay').classList.remove('active');

  $$('#lengthGrid .tab-btn').forEach((btn) => {
    btn.classList.toggle('active', parseInt(btn.dataset.length, 10) === state.settings.length);
    btn.onclick = () => {
      state.settings.length = parseInt(btn.dataset.length, 10);
      save('settings', state.settings);
      $$('#lengthGrid .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    };
  });

  $$('.method-checkbox input').forEach((cb) => {
    cb.checked = state.settings.methods.includes(cb.value);
    cb.addEventListener('change', () => {
      const checked = $$('.method-checkbox input:checked').map((c) => c.value);
      if (checked.length === 0) {
        cb.checked = true;
        toast('At least one method required', 'error');
        return;
      }
      state.settings.methods = checked;
      save('settings', state.settings);
    });
  });
};

const bindProfile = () => {
  $('#profileBtn').onclick = () => {
    const acc = state.profile.total
      ? Math.round((state.profile.correct / state.profile.total) * 100)
      : 0;
    const mins = Math.floor(state.profile.timeSec / 60);
    const username = getUsername();

    $('#profSessions').textContent = state.profile.sessions;
    $('#profAccuracy').textContent = `${acc}%`;
    $('#profMastered').textContent = Object.keys(state.charStats).filter(
      (c) => statusOf(c, state.charStats) === 'green'
    ).length;
    $('#profTime').textContent = `${mins}m`;
    $('#profileAvatarText').textContent = username ? username[0].toUpperCase() : 'KM';
    $('#usernameInput').value = username;
    $('#profileOverlay').classList.add('active');
  };

  $('#closeProfileBtn').onclick = () => $('#profileOverlay').classList.remove('active');

  $('#usernameInput').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val) {
      setUsername(val);
      $('#profileAvatarText').textContent = val[0].toUpperCase();
    }
  });

  $('#updateLeaderboardBtn').onclick = () => {
    if (!getUsername()) {
      toast('Enter a nickname first', 'error');
      return;
    }
    import('./features/leaderboard/index.js').then((m) => m.submitScore());
    $('#profileOverlay').classList.remove('active');
  };

  $('#resetBtn').onclick = () => {
    if (confirm('Reset ALL progress? This cannot be undone.')) {
      localStorage.clear();
      location.reload();
    }
  };
};

const bindOverlays = () => {
  $$('.overlay').forEach((o) => {
    o.onclick = (e) => { if (e.target === o) o.classList.remove('active'); };
  });

  $('#endBtn').addEventListener('click', endTraining);
};

const registerScreens = () => {
  registerScreen('menu', {});
  registerScreen('setup', { onEnter: renderSetup });
  registerScreen('training', {});
  registerScreen('speed', {});
  registerScreen('results', {});
  registerScreen('dict', { onEnter: renderDictionary });
  registerScreen('sentence', { onEnter: startSentence });
  registerScreen('verb', { onEnter: startVerb });
  registerScreen('reading', { onEnter: startReading });
  registerScreen('leaderboard', { onEnter: renderLeaderboard });
  registerScreen('progress', { onEnter: renderProgress });
};

const start = () => {
  initState();
  registerScreens();
  setLeavers({ leaveTraining: endTraining, leaveSpeed: endSpeed });

  bindNav();
  bindSettings();
  bindProfile();
  bindOverlays();
  bindSetup();
  bindSpeed();
  bindDictionary();
  bindLeaderboard();

  const username = getUsername();
  if (username) {
    const avatar = $('#profileBtn');
    if (avatar) avatar.textContent = username[0].toUpperCase();
  }

  go('menu');
  initTilt();
  initPencilLines();
};

document.addEventListener('DOMContentLoaded', start);