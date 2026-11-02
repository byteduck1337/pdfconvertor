import { state } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { $, $$, el, clear } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { DICT_WORDS } from '../../data/dictionary.js';

let currentDictType = 'word';

const renderDict = () => {
  const query = ($('#dictSearch').value || '').toLowerCase();
  const list = $('#dictList');
  clear(list);

  const items = state.dict
    .filter((e) =>
      e.native.toLowerCase().includes(query) ||
      e.jp.includes(query) ||
      e.romaji.toLowerCase().includes(query)
    )
    .sort((a, b) => b.added - a.added);

  if (!items.length) {
    const empty = el('div', '', 'No entries found.');
    empty.style.cssText = 'text-align:center;padding:3rem;color:var(--text-muted);';
    list.appendChild(empty);
    return;
  }

  items.forEach((e) => {
    const item = el('div', 'dict-item');

    const jp = el('div', 'dict-jp', e.jp);
    const tip = el('div', 'dict-tooltip', `${e.native} · ${e.romaji}`);
    jp.appendChild(tip);

    const info = el('div', 'dict-info');
    const native = el('div', 'dict-native', e.native);
    const romaji = el('div', 'dict-romaji', e.romaji);
    info.appendChild(native);
    info.appendChild(romaji);

    const type = el('div', '', e.type);
    type.style.cssText = 'font-family:var(--font-mono);font-size:0.6rem;text-transform:uppercase;color:var(--text-muted);margin-right:1rem;';

    const del = el('button', 'dict-del', '✕');
    del.onclick = () => {
      state.dict = state.dict.filter((x) => x.id !== e.id);
      save('dict', state.dict);
      renderDict();
    };

    item.appendChild(jp);
    item.appendChild(info);
    item.appendChild(type);
    item.appendChild(del);
    list.appendChild(item);
  });
};

const showFieldError = (inputId, message) => {
  const input = document.getElementById(inputId);
  const err = document.getElementById(`${inputId}Error`);
  if (input) input.setAttribute('aria-invalid', 'true');
  if (err) {
    err.textContent = message;
    err.style.display = 'block';
  }
};

const clearFieldError = (inputId) => {
  const input = document.getElementById(inputId);
  const err = document.getElementById(`${inputId}Error`);
  if (input) input.setAttribute('aria-invalid', 'false');
  if (err) {
    err.textContent = '';
    err.style.display = 'none';
  }
};

export const openDictAdd = () => {
  $('#dictOverlay').classList.add('active');
  $('#dictNative').value = '';
  $('#dictJp').value = '';
  $('#dictRomaji').value = '';
  clearFieldError('dictNative');
  clearFieldError('dictJp');

  currentDictType = 'word';
  $$('#dictTypeToggle .tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.type === 'word');
  });
  $('#autoTranslateBtn').style.display = 'block';
  $('#localTranslateBtn').style.display = 'block';
};

export const bindDictionary = () => {
  $('#dictSearch').addEventListener('input', renderDict);

  $$('#dictTypeToggle .tab-btn').forEach((btn) => {
    btn.onclick = () => {
      currentDictType = btn.dataset.type;
      $$('#dictTypeToggle .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      const t = $('#autoTranslateBtn');
      const l = $('#localTranslateBtn');
      if (currentDictType === 'sentence') {
        t.style.display = 'none';
        l.style.display = 'none';
      } else {
        t.style.display = 'block';
        l.style.display = 'block';
      }
    };
  });

  $('#addDictBtn').onclick = openDictAdd;
  $('#closeDictBtn').onclick = () => $('#dictOverlay').classList.remove('active');

  $('#dictJp').addEventListener('input', (e) => {
    const text = e.target.value.trim();
    if (text && window.wanakana) {
      $('#dictRomaji').value = window.wanakana.toRomaji(text);
    }
  });

  $('#localTranslateBtn').onclick = () => {
    const text = $('#dictNative').value.trim().toLowerCase();
    if (!text) {
      showFieldError('dictNative', 'Enter text first');
      return;
    }
    clearFieldError('dictNative');

    const match = DICT_WORDS.find((w) =>
      w.en.toLowerCase() === text || w.ru.toLowerCase() === text || w.jp === text
    );

    if (match) {
      $('#dictJp').value = match.jp;
      $('#dictRomaji').value = match.romaji;
      toast('Found in local dictionary', 'info');
    } else {
      toast('Not found locally. Try API.', 'error');
    }
  };

  $('#autoTranslateBtn').onclick = async () => {
    const text = $('#dictNative').value.trim();
    if (!text) {
      showFieldError('dictNative', 'Enter text first');
      return;
    }
    clearFieldError('dictNative');

    const isRussian = /[а-яА-ЯёЁ]/.test(text);
    const sourceLang = isRussian ? 'ru' : 'en';
    const btn = $('#autoTranslateBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Translating...';
    btn.disabled = true;

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=ja&dt=t&dt=rm&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      const data = await res.json();

      if (data && data[0]) {
        const chunks = data[0];
        const jpText = chunks[0][0];
        let romajiText = chunks.slice(1).map((c) => c[1] || '').join(' ').trim();
        if (!romajiText) romajiText = window.wanakana ? window.wanakana.toRomaji(jpText) : jpText;

        if (jpText.toLowerCase() === text.toLowerCase()) {
          toast('Translation failed. Try manual.', 'error');
        } else {
          $('#dictJp').value = jpText;
          $('#dictRomaji').value = romajiText;
          toast('Translation successful', 'info');
        }
      } else {
        toast('Translation failed', 'error');
      }
    } catch {
      toast('Network error', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  $('#saveDictBtn').onclick = () => {
    const native = $('#dictNative').value.trim();
    const jp = $('#dictJp').value.trim();
    const romaji = $('#dictRomaji').value.trim();

    let valid = true;
    if (!native) {
      showFieldError('dictNative', 'Required');
      valid = false;
    } else clearFieldError('dictNative');

    if (!jp) {
      showFieldError('dictJp', 'Required');
      valid = false;
    } else clearFieldError('dictJp');

    if (!valid) {
      toast('Fill required fields', 'error');
      return;
    }

    state.dict.push({
      id: Date.now().toString(),
      native,
      jp,
      romaji,
      type: currentDictType,
      added: Date.now()
    });
    save('dict', state.dict);
    $('#dictOverlay').classList.remove('active');
    renderDict();
    toast('Entry saved', 'info');
  };
};

export const renderDictionary = renderDict;
