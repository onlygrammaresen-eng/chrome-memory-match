/**
 * Memory Match - Chrome Extension
 * Temas + ranking local con chrome.storage
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
  difficulty: 'medium'
};

// DOM
const boardEl = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');
const themeSelect = document.getElementById('theme');
const difficultySelect = document.getElementById('difficulty');
const newGameBtn = document.getElementById('new-game');
const showRankingBtn = document.getElementById('show-ranking');
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
  // Keep only best 20, sorted by moves then time
  scores.sort((a, b) => {
    if (a.moves !== b.moves) return a.moves - b.moves;
    return a.time - b.time;
  });
  const top = scores.slice(0, 20);
  return new Promise((resolve) => {
    chrome.storage.local.set({ scores: top }, resolve);
  });
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
  const { pairs, cols } = DIFFICULTY[state.difficulty];
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
      state.flipped = [];
      state.locked = false;

      if (state.matched === state.cards.length) {
        onWin();
      }
    } else {
      // No match → flip back after delay
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
  state.theme = themeSelect.value;
  state.difficulty = difficultySelect.value;
  createBoard();
});

showRankingBtn.addEventListener('click', showRanking);
playAgainBtn.addEventListener('click', () => {
  closeModal();
  createBoard();
});
closeModalBtn.addEventListener('click', closeModal);

themeSelect.addEventListener('change', () => {
  state.theme = themeSelect.value;
});

difficultySelect.addEventListener('change', () => {
  state.difficulty = difficultySelect.value;
});

// Start first game
createBoard();
