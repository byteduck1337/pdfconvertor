import { $, $$, el, clear } from '../../core/dom.js';
import { shuffle } from '../../core/utils.js';
import { SENTENCES } from '../../data/content.js';

export const startSentence = () => {
  const s = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  const prompt = $('#sbPrompt');
  const bank = $('#sbBank');
  const answer = $('#sbAnswer');
  const feedback = $('#sbFeedback');

  prompt.textContent = `Translate: "${s.en}"`;
  clear(bank);
  clear(answer);
  feedback.textContent = '';

  const check = () => {
    if (answer.children.length !== s.jp.length) return;
    const current = Array.from(answer.children).map((c) => c.textContent);
    if (current.join('') === s.jp.join('')) {
      feedback.textContent = '✓ Correct!';
      feedback.className = 'feedback correct';
      setTimeout(startSentence, 1500);
    } else {
      feedback.textContent = '✗ Incorrect order';
      feedback.className = 'feedback wrong';
      setTimeout(() => {
        clear(answer);
        $$('.sentence-word', bank).forEach((b) => b.classList.remove('used'));
        feedback.textContent = '';
      }, 1000);
    }
  };

  shuffle(s.jp).forEach((word) => {
    const wordEl = el('div', 'sentence-word', word);
    wordEl.onclick = () => {
      wordEl.classList.add('used');
      const placed = el('div', 'sentence-word', word);
      placed.onclick = () => {
        placed.remove();
        wordEl.classList.remove('used');
        check();
      };
      answer.appendChild(placed);
      check();
    };
    bank.appendChild(wordEl);
  });
};