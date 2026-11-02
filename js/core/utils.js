export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const fmtTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
};

export const similarity = (a, b) => {
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (!A && !B) return 100;
  const max = Math.max(A.length, B.length);
  if (!max) return 100;
  const dist = levenshtein(A, B);
  return Math.max(0, Math.round((1 - dist / max) * 100));
};

export const hasJapaneseChars = (s) => /[\u3040-\u30ff\u4e00-\u9faf]/.test(s);

export const toRomajiLoose = (s) => {
  if (window.wanakana) return window.wanakana.toRomaji(s);
  return s;
};

export const normalize = (s) => s.toLowerCase().trim();

export const checkAnswer = (given, expected, jpIme) => {
  const g = normalize(given);
  const e = normalize(expected);
  if (!g) return { sim: 0, matchedVariant: null };
  if (hasJapaneseChars(expected)) {
    if (jpIme === 'yes') {
      const simJp = similarity(g, e);
      const romajiExpected = normalize(toRomajiLoose(expected));
      const simRomaji = similarity(g, romajiExpected);
      const best = Math.max(simJp, simRomaji);
      return { sim: best, matchedVariant: simJp >= simRomaji ? 'jp' : 'romaji' };
    }
    const romajiExpected = normalize(toRomajiLoose(expected));
    return { sim: similarity(g, romajiExpected), matchedVariant: 'romaji' };
  }
  return { sim: similarity(g, e), matchedVariant: 'plain' };
};

export const rankFromScore = (score) => {
  if (score >= 95) return 'SSS';
  if (score >= 85) return 'SS';
  if (score >= 75) return 'S';
  if (score >= 60) return 'A';
  if (score >= 45) return 'B';
  if (score >= 30) return 'C';
  return 'D';
};

export const rankClass = (rank) => {
  const map = {
    D: 'rank-d', C: 'rank-c', B: 'rank-b',
    A: 'rank-a', S: 'rank-s', SS: 'rank-ss', SSS: 'rank-sss'
  };
  return map[rank] || 'rank-d';
};