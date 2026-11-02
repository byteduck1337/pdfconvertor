export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export const el = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
};

export const setText = (node, text) => {
  node.textContent = text;
};

export const show = (node) => node.classList.add('active');
export const hide = (node) => node.classList.remove('active');
