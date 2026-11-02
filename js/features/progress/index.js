import { state } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { statusOf } from '../../data/kana.js';

export const renderProgress = () => {
  const mastered = Object.keys(state.charStats).filter(
    (c) => statusOf(c, state.charStats) === 'green'
  ).length;

  $('#islandKanji').textContent = mastered;
  $('#islandVocab').textContent = state.dict.length;
  $('#islandSessions').textContent = state.profile.sessions;
};