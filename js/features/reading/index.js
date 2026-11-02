import { $, $$, el } from '../../core/dom.js';
import { READING_TEXT } from '../../data/content.js';
import { toast } from '../../core/toast.js';

export const startReading = () => {
  const container = $('#readingContainer');
  container.textContent = '';

  const wordKeys = Object.keys(READING_TEXT.words).sort((a, b) => b.length - a.length);
  const text = READING_TEXT.text;

  let i = 0;
  while (i < text.length) {
    let matched = null;
    for (const key of wordKeys) {
      if (text.startsWith(key, i)) {
        matched = key;
        break;
      }
    }
    if (matched) {
      const span = el('span', 'reading-word', matched);
      span.dataset.word = matched;
      span.onclick = () => {
        const data = READING_TEXT.words[matched];
        toast(`${matched} · ${data.romaji} · ${data.mean}`);
      };
      container.appendChild(span);
      i += matched.length;
    } else {
      container.appendChild(document.createTextNode(text[i]));
      i++;
    }
  }
};