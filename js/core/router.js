import { state } from './state.js';
import { $$ } from './dom.js';

const hooks = {};
let beforeLeave = null;
let onEnterTrainingCleanup = null;
let onEnterSpeedCleanup = null;

export const registerScreen = (name, handlers = {}) => {
  hooks[name] = handlers;
};

export const setLeavers = ({ leaveTraining, leaveSpeed }) => {
  onEnterTrainingCleanup = leaveTraining;
  onEnterSpeedCleanup = leaveSpeed;
};

export const go = (name) => {
  if (beforeLeave) beforeLeave(name);

  if (name !== 'training' && state.train.mode && onEnterTrainingCleanup) {
    onEnterTrainingCleanup();
  }
  if (name !== 'speed' && state.speed.active && onEnterSpeedCleanup) {
    onEnterSpeedCleanup(false);
  }

  $$('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  state.screen = name;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  $$('.ext-tab[data-nav]').forEach((t) => {
    t.classList.toggle('active', t.dataset.nav === name);
  });

  const hook = hooks[name];
  if (hook && hook.onEnter) {
    try { hook.onEnter(); } catch (e) { console.error(e); }
  }
};