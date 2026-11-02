import { state } from '../../core/state.js';
import { $, el, clear } from '../../core/dom.js';
import { getUsername } from '../../core/storage.js';
import { statusOf } from '../../data/kana.js';
import { toast } from '../../core/toast.js';

const API_URL = 'https://kana.okeysexsex.workers.dev';

let submitLock = false;
let submitTimer = null;

export const renderLeaderboard = async () => {
  const list = $('#leaderboardList');
  clear(list);

  for (let i = 0; i < 5; i++) {
    const sk = el('div', 'dict-item');
    sk.style.height = '56px';
    sk.style.opacity = '0.3';
    sk.style.animation = 'pulse 1.5s ease-in-out infinite';
    list.appendChild(sk);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_URL}/leaderboard`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error('http');

    const data = await res.json();
    clear(list);

    if (!Array.isArray(data) || !data.length) {
      const empty = el('div', '', 'No records yet. Be the first!');
      empty.style.cssText = 'text-align:center;padding:2rem;color:var(--text-muted);';
      list.appendChild(empty);
      return;
    }

    const localUser = getUsername();

    data.forEach((u, i) => {
      const isMe = u.username === localUser;
      const item = el('div', 'dict-item');
      if (isMe) {
        item.style.borderColor = 'rgba(255,255,255,0.3)';
        item.style.background = 'rgba(255,255,255,0.05)';
      }

      const rank = el('div', '', `#${i + 1}`);
      rank.style.cssText = `font-family:var(--font-mono);width:40px;text-align:center;color:${i < 3 ? '#fff' : 'var(--text-muted)'};font-weight:bold;`;

      const avatar = el('div', 'avatar', (u.username || '?')[0].toUpperCase());
      avatar.style.cssText = 'width:32px;height:32px;font-size:0.7rem;';

      const info = el('div', 'dict-info');
      info.style.marginLeft = '1rem';
      const name = el('div', 'dict-native');
      name.textContent = u.username;
      if (isMe) {
        const you = el('span', '', ' (YOU)');
        you.style.cssText = 'font-size:0.6rem;color:var(--accent);';
        name.appendChild(you);
      }
      info.appendChild(name);

      const mastered = el('div', '', String(u.mastered ?? 0));
      mastered.style.cssText = 'width:80px;text-align:center;font-family:var(--font-mono);color:var(--accent);font-weight:bold;';

      const sessions = el('div', '', String(u.sessions ?? 0));
      sessions.style.cssText = 'width:80px;text-align:center;font-family:var(--font-mono);';

      const mins = Math.floor((u.time_studied || 0) / 60);
      const timeStr = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
      const time = el('div', '', timeStr);
      time.style.cssText = 'width:100px;text-align:right;font-family:var(--font-mono);color:var(--text-muted);';

      item.appendChild(rank);
      item.appendChild(avatar);
      item.appendChild(info);
      item.appendChild(mastered);
      item.appendChild(sessions);
      item.appendChild(time);
      list.appendChild(item);
    });
  } catch (e) {
    clear(list);
    const err = el('div');
    err.style.cssText = 'text-align:center;padding:2rem;color:var(--status-error);';
    const msg = el('div', '', 'Failed to load. Check connection.');
    const retry = el('button', 'back-btn', 'Retry');
    retry.style.marginTop = '1rem';
    retry.onclick = renderLeaderboard;
    err.appendChild(msg);
    err.appendChild(retry);
    list.appendChild(err);
  }
};

export const submitScore = () => {
  if (submitLock) return;
  clearTimeout(submitTimer);

  submitTimer = setTimeout(async () => {
    const username = getUsername();
    if (!username) return;
    if (!/^[a-zA-Z0-9_]{2,15}$/.test(username)) {
      toast('Nickname must be 2-15 letters, numbers or _', 'error');
      return;
    }

    submitLock = true;
    const mastered = Object.keys(state.charStats).filter((c) => statusOf(c, state.charStats) === 'green').length;

    try {
      const res = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          sessions: state.profile.sessions,
          time_studied: state.profile.timeSec,
          mastered,
          session_id: `${username}-${Date.now()}`
        })
      });

      if (res.status === 429) {
        toast('Too many requests. Wait a minute.', 'error');
        return;
      }
      if (!res.ok) {
        toast('Submit failed', 'error');
        return;
      }
      toast('Leaderboard updated', 'info');
    } catch {
      toast('Network error', 'error');
    } finally {
      submitLock = false;
    }
  }, 2000);
};

export const bindLeaderboard = () => {
  document.addEventListener('click', (e) => {
    if (e.target.id === 'refreshLeaderboardBtn') renderLeaderboard();
  });
};