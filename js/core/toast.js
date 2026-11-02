import { $, el } from './dom.js';

export const toast = (msg, type = 'info') => {
  const container = $('#toastContainer');
  if (!container) return;

  const node = el('div', `toast ${type}`);
  const span = el('span', '', String(msg));
  node.appendChild(span);
  node.setAttribute('role', type === 'error' ? 'alert' : 'status');
  container.appendChild(node);

  setTimeout(() => {
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 300);
  }, 3000);
};