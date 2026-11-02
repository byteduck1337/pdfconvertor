const PREFIX = 'km_';

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const save = (key, val) => {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(val));
  } catch (e) {
    console.warn('storage save failed', key);
  }
};

export const loadAll = (state) => {
  state.groups = read('groups', []);
  state.charStats = read('stats', {});
  state.srs = read('srs', {});
  state.dict = read('dict', []);

  const profile = read('profile', null);
  if (profile) Object.assign(state.profile, profile);

  const settings = read('settings', null);
  if (settings) {
    if (settings.length) state.settings.length = settings.length;
    if (Array.isArray(settings.methods) && settings.methods.length) {
      state.settings.methods = settings.methods;
    }
  }

  const jpIme = read('speed_jpime', null);
  if (jpIme === 'yes' || jpIme === 'no') state.speed.jpIme = jpIme;

  const level = read('speed_level', null);
  if (level) state.speed.level = level;

  const native = read('speed_native', null);
  if (native === 'ru' || native === 'en') state.speed.nativeLang = native;

  const dir = read('speed_direction', null);
  if (dir === 'native2jp' || dir === 'jp2native') state.speed.direction = dir;
};

export const getUsername = () => {
  try {
    return localStorage.getItem(`${PREFIX}username`) || '';
  } catch {
    return '';
  }
};

export const setUsername = (name) => {
  try {
    localStorage.setItem(`${PREFIX}username`, String(name).trim());
  } catch {}
};

export const setRaw = (key, val) => {
  try {
    localStorage.setItem(`${PREFIX}${key}`, val);
  } catch {}
};