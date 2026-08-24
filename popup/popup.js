/**
 * Memory Match - Chrome Extension
 * Temas + ranking + sonidos + animaciones + Modo Diario
 */

const THEMES = {
  emojis: ['😀', '😎', '🤩', '🥳', '😍', '🤯', '👻', '🤖', '👽', '🎃', '🦄', '🐉'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'],
  fruits: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉', '🍋', '🍊', '🥭'],
  space: ['🚀', '🛸', '🌙', '⭐', '🌟', '☄️', '🪐', '🌍', '🌕', '🛰️', '👾', '🔭'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🍦', '🍪', '🧁', '🍫', '🍿', '🥤']
};

const THEME_KEYS = Object.keys(THEMES);

const DIFFICULTY = {
  easy: { pairs: 4, cols: 4 },
  medium: { pairs: 8, cols: 4 },
  hard: { pairs: 12, cols: 6 }
};

let state = {
  cards: [],
  flipped: [],
  matched: 0,
  moves: 0,
  timer: 0,
  timerId: null,
  locked: false,
  theme: 'emojis',
  difficulty: 'medium',
  muted: false,
  isDaily: false
};

// ========== Sound System ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  if (state.muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playFlip() { playTone(520, 0.08, 'sine', 0.12); }
function playMatch() {
  playTone(523.25, 0.12, 'sine', 0.14);
  setTimeout(() => playTone(659.25, 0.12, 'sine', 0.14), 80);
  setTimeout(() => playTone(783.99, 0.18, 'sine', 0.16), 160);
}
function playMismatch() {
  playTone(220, 0.15, 'triangle', 0.1);
  setTimeout(() => playTone(180, 0.2, 'triangle', 0.08), 100);
}
function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, 'sine', 0.15), i * 120);
  });
}
function playClick() { playTone(800, 0.05, 'square', 0.06); }

// ========== DOM ==========
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const themeSelect = document.getElementById('theme');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('new-game');
const dailyBtn = document.getElementById('daily-btn');
const showRankingBtn = document.getElementById('show-ranking');
const muteBtn = document.getElementById('mute-btn');
const modeBadge = document.getElementById('mode-badge');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const rankingList = document.getElementById('ranking-list');
const playAgainBtn = document.getElementById('play-again');
const closeModalBtn = document.getElementById('close-modal');

// ========== Date helpers ==========
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyTheme() {
  // Rota el tema según el día del año
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date() - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return THEME_KEYS[dayOfYear % THEME_KEYS.length];
}

// Seeded random (mulberry32)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seedStr) {
  // Simple string → number seed
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const rand = mulberry32(seed);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ========== Storage ==========
async function getScores() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scores'], (r) => resolve(r.scores || []));
  });
}

async function saveScore(score) {
  const scores = await getScores();
  scores.push(score);
  scores.sort((a, b) => (a.moves !== b.moves ? a.moves - b.moves : a.time - b.time));
  return new Promise((resolve) => {
    chrome.storage.local.set({ scores: scores.slice(0, 20) }, resolve);
  });
}

async function getDailyBest() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['dailyBest'], (r) => resolve(r.dailyBest || {}));
  });
}

async function saveDailyBest(score) {
  const key = getTodayKey();
  const data = await getDailyBest();
  const prev = data[key];
  // Solo guarda si es mejor (menos movimientos, o igual movimientos y menos tiempo)
  if (!prev || score.moves < prev.moves || (score.moves === prev.moves && score.time < prev.time)) {
    data[key] = score;
    // Limpia entradas muy antiguas (guarda últimos 30 días)
    const keys = Object.keys(data).sort().reverse().slice(0, 30);
    const cleaned = {};
    keys.forEach((k) => (cleaned[k] = data[k]));
    return new Promise((resolve) => {
      chrome.storage.local.set({ dailyBest: cleaned }, resolve);
    });
  }
}

async function loadMutePreference() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['muted'], (r) => {
      state.muted = !!r.muted;
      updateMuteUI();
      resolve();
    });
  });
}

function saveMutePreference() {
  chrome.storage.local.set({ muted: state.muted });
}

function updateMuteUI() {
  muteBtn.textContent = state.muted ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', state.muted);
  muteBtn.title = state.muted ? 'Activar sonido' : 'Silenciar';
}

// ========== Animation ==========
function triggerMatchPop(id) {
  const el = boardEl.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('match-pop');
  setTimeout(() => el.classList.remove('match-pop'), 500);
}

// ========== Game logic ==========
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startTimer() {
  stopTimer();
  state.timer = 0;
  timerEl.textContent = `Tiempo: 0s`;
  state.timerId = setInterval(() => {
    state.timer++;
    timerEl.textContent = `Tiempo: ${state.timer}s`;
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function createBoard() {
  const { pairs } = DIFFICULTY[state.difficulty];
  const symbols = THEMES[state.theme].slice(0, pairs);

  let deck;
  if (state.isDaily) {
    // Tablero determinista según la fecha
    deck = seededShuffle([...symbols, ...symbols], getTodayKey() + state.theme);
  } else {
    deck = shuffle([...symbols, ...symbols]);
  }

  state.cards = deck.map((symbol, index) => ({
    id: index,
    symbol,
    flipped: false,
    matched: false
  }));
  state.flipped = [];
  state.matched = 0;
  state.moves = 0;
  state.locked = false;

  movesEl.textContent = `Movimientos: 0`;
  boardEl.className = `board ${state.difficulty}`;
  boardEl.innerHTML = '';

  // Badge de modo diario
  if (state.isDaily) {
    modeBadge.classList.remove('hidden');
    modeBadge.textContent = `📅 Desafío Diario · ${state.theme}`;
    themeSelect.disabled = true;
    difficultySelect.disabled = true;
  } else {
    modeBadge.classList.add('hidden');
    themeSelect.disabled = false;
    difficultySelect.disabled = false;
  }

  state.cards.forEach((card) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.id = card.id;
    cardEl.innerHTML = `
      <div class="card-face card-front">❓</div>
      <div class="card-face card-back">${card.symbol}</div>
    `;
    cardEl.addEventListener('click', () => onCardClick(card.id));
    boardEl.appendChild(cardEl);
  });

  startTimer();
}

function onCardClick(id) {
  if (state.locked) return;
  const card = state.cards[id];
  if (card.flipped || card.matched) return;

  card.flipped = true;
  state.flipped.push(id);
  updateCardUI(id);
  playFlip();

  if (state.flipped.length === 2) {
    state.moves++;
    movesEl.textContent = `Movimientos: ${state.moves}`;
    state.locked = true;

    const [id1, id2] = state.flipped;
    const c1 = state.cards[id1];
    const c2 = state.cards[id2];

    if (c1.symbol === c2.symbol) {
      c1.matched = true;
      c2.matched = true;
      state.matched += 2;
      updateCardUI(id1);
      updateCardUI(id2);
      triggerMatchPop(id1);
      triggerMatchPop(id2);
      state.flipped = [];
      state.locked = false;
      playMatch();

      if (state.matched === state.cards.length) {
        setTimeout(() => onWin(), 400);
      }
    } else {
      playMismatch();
      setTimeout(() => {
        c1.flipped = false;
        c2.flipped = false;
        updateCardUI(id1);
        updateCardUI(id2);
        state.flipped = [];
        state.locked = false;
      }, 700);
    }
  }
}

function updateCardUI(id) {
  const card = state.cards[id];
  const el = boardEl.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.toggle('flipped', card.flipped || card.matched);
  el.classList.toggle('matched', card.matched);
}

async function onWin() {
  stopTimer();
  playWin();

  const score = {
    moves: state.moves,
    time: state.timer,
    theme: state.theme,
    difficulty: state.difficulty,
    date: new Date().toISOString(),
    isDaily: state.isDaily
  };

  await saveScore(score);

  if (state.isDaily) {
    await saveDailyBest(score);
    const best = (await getDailyBest())[getTodayKey()];
    modalTitle.textContent = '📅 ¡Desafío Diario completado!';
    modalMessage.innerHTML = `
      Lo terminaste en <strong>${state.moves}</strong> movimientos y <strong>${state.timer}s</strong>.<br>
      ${best && best.moves === state.moves && best.time === state.timer
        ? '🏆 ¡Nuevo récord personal de hoy!'
        : `Tu mejor de hoy: ${best.moves} mov · ${best.time}s`}
    `;
  } else {
    modalTitle.textContent = '🎉 ¡Ganaste!';
    modalMessage.textContent = `Lo completaste en ${state.moves} movimientos y ${state.timer} segundos.`;
  }

  rankingList.classList.add('hidden');
  overlay.classList.remove('hidden');
}

async function showRanking() {
  playClick();
  const scores = await getScores();
  rankingList.innerHTML = '';

  if (scores.length === 0) {
    rankingList.innerHTML = '<p style="text-align:center;opacity:0.7">Aún no hay partidas guardadas.</p>';
  } else {
    scores.slice(0, 10).forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'ranking-item';
      const dailyTag = s.isDaily ? ' 📅' : '';
      item.innerHTML = `
        <span><span class="rank">#${i + 1}</span> ${s.moves} mov · ${s.time}s${dailyTag}</span>
        <span style="opacity:0.7;font-size:0.8em">${s.difficulty}</span>
      `;
      rankingList.appendChild(item);
    });
  }

  modalTitle.textContent = '🏆 Ranking Local';
  modalMessage.textContent = 'Mejores partidas (por movimientos, luego tiempo)';
  rankingList.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeModal() {
  overlay.classList.add('hidden');
}

function startNormalGame() {
  state.isDaily = false;
  state.theme = themeSelect.value;
  state.difficulty = difficultySelect.value;
  createBoard();
}

function startDailyChallenge() {
  state.isDaily = true;
  state.theme = getDailyTheme();
  state.difficulty = 'medium'; // Fijo para el diario
  themeSelect.value = state.theme;
  difficultySelect.value = 'medium';
  createBoard();
}

// ========== Events ==========
newGameBtn.addEventListener('click', () => {
  playClick();
  startNormalGame();
});

dailyBtn.addEventListener('click', () => {
  playClick();
  startDailyChallenge();
});

showRankingBtn.addEventListener('click', showRanking);

playAgainBtn.addEventListener('click', () => {
  playClick();
  closeModal();
  if (state.isDaily) startDailyChallenge();
  else startNormalGame();
});

closeModalBtn.addEventListener('click', () => {
  playClick();
  closeModal();
});

muteBtn.addEventListener('click', () => {
  state.muted = !state.muted;
  updateMuteUI();
  saveMutePreference();
  if (!state.muted) playClick();
});

themeSelect.addEventListener('change', () => {
  if (!state.isDaily) state.theme = themeSelect.value;
});

difficultySelect.addEventListener('change', () => {
  if (!state.isDaily) state.difficulty = difficultySelect.value;
});

// Init
loadMutePreference().then(() => {
  startNormalGame();
});
