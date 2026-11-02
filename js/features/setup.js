import { state } from '../core/state.js';
import { save } from '../core/storage.js';
import { $, $$, el, clear } from '../core/dom.js';
import { KANA_DATA, statusOf } from '../data/kana.js';
import { startKana } from './training/index.js';

export const renderSetup = () => {
  $('#startKanaBtn').disabled = state.groups.length === 0;

  $$('.tab-btn[data-tab]').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === state.tab);
  });

  const grid = $('#subgroupGrid');
  clear(grid);

  const groups = KANA_DATA[state.tab] || {};
  Object.entries(groups).forEach(([key, grp]) => {
    const card = el('div', `subgroup-card ${state.groups.includes(key) ? 'selected' : ''}`);
    const name = el('div', 'subgroup-name', grp.name);
    const chars = el('div', 'subgroup-chars');

    Object.keys(grp.chars).forEach((c) => {
      const span = el('span', `char-status ${statusOf(c, state.charStats)}`, c);
      chars.appendChild(span);
    });

    card.appendChild(name);
    card.appendChild(chars);

    card.onclick = () => {
      const idx = state.groups.indexOf(key);
      if (idx >= 0) state.groups.splice(idx, 1);
      else state.groups.push(key);

      save('groups', state.groups);
      card.classList.toggle('selected');
      $('#startKanaBtn').disabled = state.groups.length === 0;
    };

    grid.appendChild(card);
  });
};

export const bindSetup = () => {
  $$('.tab-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      renderSetup();
    });
  });

  $('#startKanaBtn').onclick = startKana;
};
