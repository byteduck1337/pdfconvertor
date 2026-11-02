import { loadAll, save } from './storage.js';
export { save };

export const state = {
  screen: 'menu',
  tab: 'hiragana',
  groups: [],
  settings: { length: 20, methods: ['qe', 'flashcard', 'mc', 'romajiSelect', 'stroke'] },
  profile: { sessions: 0, correct: 0, total: 0, timeSec: 0 },
  charStats: {},
  srs: {},
  dict: [],
  train: {
    mode: null, queue: [], index: 0, total: 0,
    correct: 0, score: 0, startTime: 0, locked: false,
    cleanup: null, timer: null, hudTimer: null,
    currentSet: null
  },
  speed: {
    active: false, phase: 'idle', lives: 5, streak: 0, bestStreak: 0,
    score: 0, correct: 0, total: 0, totalScore: 0,
    sessionStart: 0, sessionEnd: 0, current: null,
    answerTime: 15000, answerStart: 0,
    answerTimer: null, sessionTimer: null, flashTimers: [],
    inputLocked: false, rank: 'D',
    nativeLang: null, direction: null, jpIme: null, level: null,
    cleanup: null
  }
};

export const initState = () => {
  loadAll(state);
};