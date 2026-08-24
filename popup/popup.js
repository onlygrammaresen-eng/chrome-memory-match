/**
 * Memory Match - Chrome Extension
 * Temas + ranking local + sonidos + animaciones suaves (versión estable)
 */

const THEMES = {
  emojis: ['😀', '😎', '🤩', '🥳', '😍', '🤯', '👻', '🤖', '👽', '🎃', '🦄', '🐉'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'],
  fruits: ['🍎', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉', '🍋', '🍊', '🥭'],
  space: ['🚀', '🛸', '🌙', '⭐', '🌟', '☄️', '🪐', '🌍', '🌕', '🛰️', '👾', '🔭'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍣', '🍩', '🍦', '🍪', '🧁', '🍫', '🍿', '🥤']
};

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
  muted: false
};

// ========== Sound System (Web Audio API) ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15, detune = 0) {
  if (state.muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently ignore audio errors
  }
}

function playFlip() {
  playTone(520, 0.08, 'sine', 0.12);
}

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
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'sine', 0.15), i * 120);
  });
}

function playClick() {
  playTone(800, 0.05, 'square', 0.06);
}

// ========== DOM ==========
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const themeSelect = document.getElementById('theme');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('new-game');
const showRankingBtn = document.getElementById('show-ranking');
const muteBtn = document.getElementById('mute-btn');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const rankingList = document.getElementById('ranking-list');
const playAgainBtn = document.getElementById('play-again');
const closeModalBtn = document.getElementById('close-modal');

// ========== Storage helpers ==========
async function getScores() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['scores'], (result) => {
      resolve(result.scores || []);
    });
  });
}

async function saveScore(score) {
  const scores = await getScores();
  scores.push(score);
  scores.sort((a, b) => {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.time - b.time;
  });
  const top = scores.slice(0, 20);
  return new Promise((resolve) => {
    chrome.storage.local.set({ scores: top }, resolve);
  });
}

async function loadMutePreference() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['muted'], (result) => {
      state.muted = !!result.muted;
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

// ========== Animation helpers ==========
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
  const deck = shuffle([...symbols, ...symbols]);

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

  // Flip
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
      // Match
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
      // No match
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
    date: new Date().toISOString()
  };

  await saveScore(score);

  modalTitle.textContent = '🎉 ¡Ganaste!';
  modalMessage.textContent = `Lo completaste en ${state.moves} movimientos y ${state.timer} segundos.`;
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
      item.innerHTML = `
        <span><span class="rank">#${i + 1}</span> ${s.moves} mov · ${s.time}s</span>
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

// ========== Events ==========
newGameBtn.addEventListener('click', () => {
  playClick();
  state.theme = themeSelect.value;
  state.difficulty = difficultySelect.value;
  createBoard();
});

showRankingBtn.addEventListener('click', showRanking);

playAgainBtn.addEventListener('click', () => {
  playClick();
  closeModal();
  createBoard();
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
  state.theme = themeSelect.value;
});

difficultySelect.addEventListener('change', () => {
  state.difficulty = difficultySelect.value;
});

// Init
loadMutePreference().then(() => {
  createBoard();
});
