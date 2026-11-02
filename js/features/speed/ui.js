import { $, $$, el } from '../../core/dom.js';
import { state } from '../../core/state.js';
import { rankClass } from '../../core/utils.js';

const SECTIONS = [
  'speedNative', 'speedDirection', 'speedSetup', 'speedLevel',
  'speedIntro', 'speedFlashWrap', 'speedAnswerWrap', 'speedSessionEnd'
];

export const hideAllSections = () => {
  SECTIONS.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.classList.remove('active');
  });
};

export const renderLives = () => {
  const wrap = $('#speedLives');
  if (!wrap) return;
  wrap.textContent = '';
  for (let i = 0; i < 5; i++) {
    const lost = i >= state.speed.lives ? 'lost' : '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `speed-heart ${lost}`);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 21s-7.5-4.9-10-9.1C.3 8.7 2.4 4.5 6.5 4.5c2.1 0 3.8 1.2 4.5 2.9.7-1.7 2.4-2.9 4.5-2.9 4.1 0 6.2 4.2 4.5 7.4C19.5 16.1 12 21 12 21z');
    svg.appendChild(path);
    wrap.appendChild(svg);
  }
};

export const setRank = (rank, pop) => {
  const badge = $('#speedRankBadge');
  if (!badge) return;
  badge.classList.remove('rank-d', 'rank-c', 'rank-b', 'rank-a', 'rank-s', 'rank-ss', 'rank-sss', 'pop');
  void badge.offsetWidth;
  badge.classList.add(rankClass(rank));
  badge.textContent = rank;
  if (pop) badge.classList.add('pop');
  state.speed.rank = rank;
};

export const showNative = () => {
  hideAllSections();
  $('#speedNative').classList.add('active');
  $('#speedEndBtn').style.display = 'none';
  $$('.speed-native-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.native === state.speed.nativeLang);
  });
};

export const showDirection = () => {
  hideAllSections();
  $('#speedDirection').classList.add('active');
  $('#speedEndBtn').style.display = 'none';

  const nativeName = state.speed.nativeLang === 'ru' ? 'Русский' : 'English';
  const t1 = document.querySelector('.speed-direction-card[data-dir="native2jp"] .speed-level-title');
  const t2 = document.querySelector('.speed-direction-card[data-dir="jp2native"] .speed-level-title');
  if (t1) t1.textContent = `${nativeName} → Japanese`;
  if (t2) t2.textContent = `Japanese → ${nativeName}`;

  $$('.speed-direction-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.dir === state.speed.direction);
  });
};

export const showSetup = () => {
  hideAllSections();
  $('#speedSetup').classList.add('active');
  $('#speedEndBtn').style.display = 'none';

  const note = $('#speedSetupNote');
  if (state.speed.jpIme === 'yes') note.textContent = 'Japanese IME enabled — kana/kanji or romaji accepted';
  else if (state.speed.jpIme === 'no') note.textContent = 'Romaji input only';
  else note.textContent = '';
};

export const showLevel = () => {
  hideAllSections();
  $('#speedLevel').classList.add('active');
  $('#speedEndBtn').style.display = 'none';

  $$('#speedLevelGrid .speed-level-card').forEach((c) => {
    c.classList.toggle('selected', c.dataset.level === state.speed.level);
  });

  const note = $('#speedLevelNote');
  note.textContent = state.speed.level
    ? `Selected: ${state.speed.level.toUpperCase()}`
    : 'No level selected yet';
};

export const showIntro = () => {
  hideAllSections();
  $('#speedIntro').classList.add('active');
  $('#speedEndBtn').style.display = 'none';
  $('#speedSettingsPopover').classList.remove('active');
  $('#speedSettingsBtn').classList.remove('active');
};

export const showSessionEnd = (finalRank, totalScore, correct, total) => {
  $('#speedEndRank').textContent = finalRank;
  $('#speedEndScore').textContent = totalScore;
  $('#speedEndCorrect').textContent = correct;
  $('#speedEndWords').textContent = total;

  hideAllSections();
  $('#speedSessionEnd').classList.add('active');
  setRank(finalRank, true);
};