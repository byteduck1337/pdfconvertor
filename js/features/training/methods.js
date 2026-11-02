import { state } from '../../core/state.js';
import { $, $$, el, clear } from '../../core/dom.js';
import { shuffle } from '../../core/utils.js';
import { completeStage } from './index.js';

const pickWrong = (correct) => {
  const vals = Object.values(state.train.currentSet || {});
  if (vals.length < 2) return correct;
  let w, safety = 0;
  do { w = vals[Math.floor(Math.random() * vals.length)]; safety++; }
  while (w === correct && safety < 20);
  return w;
};

export const renderQE = (container, char) => {
  const T = state.train;
  const correct = T.currentSet[char];
  const qIsCorrect = Math.random() < 0.5;
  const wrong = pickWrong(correct);
  const qAns = qIsCorrect ? correct : wrong;
  const eAns = qIsCorrect ? wrong : correct;

  clear(container);

  const name = el('div', 'method-name', 'Time Attack');
  const kana = el('div', 'kana-display', char);
  const opts = el('div', 'qe-options');

  const qBtn = el('button', 'qe-btn', 'Q');
  qBtn.appendChild(el('small', '', qAns));

  const eBtn = el('button', 'qe-btn', 'E');
  eBtn.appendChild(el('small', '', eAns));

  opts.appendChild(qBtn);
  opts.appendChild(eBtn);

  container.appendChild(name);
  container.appendChild(kana);
  container.appendChild(opts);

  let answered = false;
  const controller = new AbortController();

  const finish = (choice) => {
    if (answered) return;
    answered = true;
    controller.abort();
    const isCorrect = (choice === 'q' && qIsCorrect) || (choice === 'e' && !qIsCorrect);
    const btn = choice === 'q' ? qBtn : eBtn;
    btn.classList.add(isCorrect ? 'correct' : 'wrong');
    completeStage(char, isCorrect);
  };

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'q') finish('q');
    if (k === 'e') finish('e');
  }, { signal: controller.signal });

  qBtn.onclick = () => finish('q');
  eBtn.onclick = () => finish('e');

  T.cleanup = () => controller.abort();
};

export const renderFlashcard = (container, char) => {
  const T = state.train;
  const correct = T.currentSet[char];

  clear(container);

  const name = el('div', 'method-name', 'Flashcard');
  const kana = el('div', 'kana-display', char);
  const input = el('input', 'text-input');
  input.type = 'text';
  input.placeholder = '...';
  input.autocomplete = 'off';
  input.spellcheck = false;

  const fb = el('div', 'feedback');

  container.appendChild(name);
  container.appendChild(kana);
  container.appendChild(input);
  container.appendChild(fb);

  input.focus();
  let answered = false;

  input.addEventListener('input', () => {
    if (answered) return;
    if (input.value.trim().toLowerCase() === correct) {
      answered = true;
      input.disabled = true;
      fb.textContent = '✓ Correct';
      fb.className = 'feedback correct';
      completeStage(char, true);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !answered && input.value.trim() !== '') {
      input.classList.add('error');
      fb.textContent = '✗ Try again';
      fb.className = 'feedback wrong';
      input.value = '';
      setTimeout(() => input.classList.remove('error'), 400);
    }
  });

  T.cleanup = () => { input.disabled = true; };
};

export const renderMC = (container, char) => {
  const T = state.train;
  const correct = T.currentSet[char];
  const opts = shuffle([correct, pickWrong(correct), pickWrong(correct), pickWrong(correct)]);

  clear(container);

  const name = el('div', 'method-name', 'Multiple Choice');
  const kana = el('div', 'kana-display', char);
  const grid = el('div', 'grid-4');

  container.appendChild(name);
  container.appendChild(kana);
  container.appendChild(grid);

  let answered = false;

  opts.forEach((opt) => {
    const btn = el('div', 'grid-card', opt);
    btn.onclick = () => {
      if (answered) return;
      answered = true;
      const isCorrect = opt === correct;
      btn.classList.add(isCorrect ? 'correct' : 'wrong');
      if (!isCorrect) {
        $$('.grid-card', grid).forEach((c) => {
          if (c.textContent === correct) c.classList.add('correct');
        });
      }
      completeStage(char, isCorrect);
    };
    grid.appendChild(btn);
  });

  T.cleanup = () => { answered = true; };
};

export const renderRomajiSelect = (container, char) => {
  const T = state.train;
  const keys = shuffle(Object.keys(T.currentSet)).slice(0, 4);
  if (!keys.includes(char)) keys[0] = char;

  const correct = T.currentSet[char];

  clear(container);

  const name = el('div', 'method-name', 'Romaji Select');
  const layout = el('div', 'romaji-layout');
  const rCol = el('div', 'romaji-col');
  const arrow = el('div', 'arrow-ind', '→');
  const kCol = el('div', 'kana-col');

  layout.appendChild(rCol);
  layout.appendChild(arrow);
  layout.appendChild(kCol);

  container.appendChild(name);
  container.appendChild(layout);

  let answered = false;

  const romajiValues = [];
  keys.forEach((k) => {
    const v = T.currentSet[k];
    if (!romajiValues.includes(v)) romajiValues.push(v);
  });

  shuffle(romajiValues).forEach((r) => {
    const item = el('div', 'romaji-item', r);
    item.onclick = () => {
      if (answered) return;
      answered = true;
      const ok = r === correct;
      item.classList.add(ok ? 'correct-pair' : 'wrong');
      completeStage(char, ok);
    };
    rCol.appendChild(item);
  });

  keys.forEach((k) => {
    const item = el('div', 'kana-item', k);
    if (k === char) {
      item.style.borderColor = 'rgba(255,255,255,0.5)';
      item.style.background = 'rgba(255,255,255,0.1)';
    }
    kCol.appendChild(item);
  });

  T.cleanup = () => { answered = true; };
};

export const renderStroke = (container, char) => {
  const T = state.train;

  clear(container);

  const name = el('div', 'method-name', 'Stroke Practice');
  const wrap = el('div', 'canvas-container');
  const bg = el('div', 'canvas-bg-char', char);
  const canvas = el('canvas', 'drawing-canvas');
  canvas.width = 220;
  canvas.height = 220;

  wrap.appendChild(bg);
  wrap.appendChild(canvas);

  const controls = el('div', 'canvas-controls');
  const clearBtn = el('button', 'back-btn', 'Clear');
  clearBtn.style.margin = '0';
  clearBtn.style.padding = '0.4rem 1rem';

  const checkBtn = el('button', 'start-btn', 'Check');
  checkBtn.style.margin = '0';
  checkBtn.style.width = 'auto';
  checkBtn.style.padding = '0.4rem 1rem';

  controls.appendChild(clearBtn);
  controls.appendChild(checkBtn);

  const fb = el('div', 'feedback');

  container.appendChild(name);
  container.appendChild(wrap);
  container.appendChild(controls);
  container.appendChild(fb);

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;
  let lastX = 0;
  let lastY = 0;
  let answered = false;

  const pos = (ev) => {
    const r = canvas.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    return { x: cx - r.left, y: cy - r.top };
  };

  const start = (ev) => {
    ev.preventDefault();
    drawing = true;
    const p = pos(ev);
    lastX = p.x;
    lastY = p.y;
  };

  const move = (ev) => {
    if (!drawing) return;
    ev.preventDefault();
    const p = pos(ev);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
  };

  const end = (ev) => {
    if (ev) ev.preventDefault();
    drawing = false;
  };

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseout', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  clearBtn.onclick = () => {
    ctx.clearRect(0, 0, 220, 220);
    fb.textContent = '';
  };

  checkBtn.onclick = () => {
    if (answered) return;
    const data = ctx.getImageData(0, 0, 220, 220).data;
    let px = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) px++;
    }
    if (px < 500) {
      fb.textContent = 'Draw first';
      fb.className = 'feedback hint';
      return;
    }
    answered = true;
    completeStage(char, true);
  };

  T.cleanup = () => { answered = true; };
};