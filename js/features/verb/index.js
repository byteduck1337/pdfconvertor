import { $ } from '../../core/dom.js';
import { VERBS } from '../../data/content.js';

export const startVerb = () => {
  const v = VERBS[Math.floor(Math.random() * VERBS.length)];
  const verbNode = $('#vcVerb');
  const hintNode = $('#vcHint');
  const input = $('#vcInput');
  const fb = $('#vcFeedback');

  verbNode.textContent = v.dict;
  hintNode.textContent = `Target: ${v.hint}`;
  input.value = '';
  fb.textContent = '';
  input.focus();

  input.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (input.value.trim() === v.ans) {
      fb.textContent = '✓ Correct!';
      fb.className = 'feedback correct';
      setTimeout(startVerb, 1500);
    } else {
      fb.textContent = `✗ Answer: ${v.ans}`;
      fb.className = 'feedback wrong';
      setTimeout(startVerb, 2000);
    }
  };
};