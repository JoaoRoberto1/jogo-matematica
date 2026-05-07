const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const progressEl = document.getElementById("progress");
const progressFillEl = document.getElementById("progressFill");
const difficultyEl = document.getElementById("difficulty");
const restartButton = document.getElementById("restartButton");
const playAgainButton = document.getElementById("playAgainButton");
const startButton = document.getElementById("startButton");
const startModal = document.getElementById("startModal");

const questionModal = document.getElementById("questionModal");
const questionTitle = document.getElementById("questionTitle");
const questionText = document.getElementById("questionText");
const answersContainer = document.getElementById("answers");
const feedbackEl = document.getElementById("feedback");

const gameOverModal = document.getElementById("gameOverModal");
const gameOverReason = document.getElementById("gameOverReason");
const gameOverScoreEl = document.getElementById("gameOverScore");
const gameOverBestEl = document.getElementById("gameOverBest");
const gameOverNewRecordEl = document.getElementById("gameOverNewRecord");
const menuFromGameOverButton = document.getElementById("menuFromGameOverButton");

const victoryModal = document.getElementById("victoryModal");
const victoryScoreEl = document.getElementById("victoryScore");
const victoryBestEl = document.getElementById("victoryBest");
const victoryNewRecordEl = document.getElementById("victoryNewRecord");
const victoryPlayAgainButton = document.getElementById("victoryPlayAgainButton");
const menuFromVictoryButton = document.getElementById("menuFromVictoryButton");

const goalScoreLabel = document.getElementById("goalScoreLabel");
const startHighScoreEl = document.getElementById("startHighScore");

const muteButton = document.getElementById("muteButton");

const HIGH_SCORE_KEY = "snakeCombinatorioBestScore";
const MUTE_KEY = "snakeCombinatorioMuted";
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const INITIAL_SPEED = 130;
const INITIAL_LIVES = 3;
const GOAL_SCORE = 12;

/* ---------------- ÁUDIO ---------------- */
const audio = {
  ctx: null,
  master: null,
  musicGain: null,
  musicNodes: [],
  musicTimer: null,
  muted: false
};

function getStoredMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function ensureAudio() {
  if (audio.ctx) return audio.ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audio.ctx = new Ctor();
  audio.master = audio.ctx.createGain();
  audio.master.gain.value = audio.muted ? 0 : 0.5;
  audio.master.connect(audio.ctx.destination);
  return audio.ctx;
}

function resumeAudioIfNeeded() {
  if (audio.ctx && audio.ctx.state === "suspended") {
    audio.ctx.resume().catch(() => {});
  }
}

function playTone({ freq, duration = 0.18, type = "sine", gain = 0.18, attack = 0.01, release = 0.08, slideTo = null }) {
  if (audio.muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  resumeAudioIfNeeded();

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), ctx.currentTime + duration);
  }
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration + release);

  osc.connect(g);
  g.connect(audio.master);
  osc.start();
  osc.stop(ctx.currentTime + duration + release + 0.05);
}

function playSequence(notes, gap = 0.07) {
  let delay = 0;
  notes.forEach((n) => {
    setTimeout(() => playTone(n), delay * 1000);
    delay += (n.duration || 0.15) + gap;
  });
}

const sounds = {
  eat() {
    playTone({ freq: 660, duration: 0.08, type: "triangle", gain: 0.22, slideTo: 990 });
  },
  correct() {
    playSequence(
      [
        { freq: 523.25, duration: 0.1, type: "triangle", gain: 0.2 },
        { freq: 659.25, duration: 0.1, type: "triangle", gain: 0.2 },
        { freq: 783.99, duration: 0.18, type: "triangle", gain: 0.22 }
      ],
      0.02
    );
  },
  wrong() {
    playTone({ freq: 240, duration: 0.18, type: "sawtooth", gain: 0.2, slideTo: 110 });
    setTimeout(() => playTone({ freq: 180, duration: 0.22, type: "square", gain: 0.16, slideTo: 90 }), 120);
  },
  death() {
    playSequence(
      [
        { freq: 392, duration: 0.18, type: "square", gain: 0.22 },
        { freq: 311.13, duration: 0.18, type: "square", gain: 0.22 },
        { freq: 246.94, duration: 0.18, type: "square", gain: 0.22 },
        { freq: 196, duration: 0.4, type: "square", gain: 0.22, slideTo: 80 }
      ],
      0.04
    );
  },
  victory() {
    playSequence(
      [
        { freq: 523.25, duration: 0.12, type: "triangle", gain: 0.22 },
        { freq: 659.25, duration: 0.12, type: "triangle", gain: 0.22 },
        { freq: 783.99, duration: 0.12, type: "triangle", gain: 0.22 },
        { freq: 1046.5, duration: 0.32, type: "triangle", gain: 0.24 }
      ],
      0.03
    );
  }
};

const MUSIC_NOTES = [220.0, 261.63, 329.63, 392.0, 329.63, 261.63];
function startMusic() {
  if (audio.muted) return;
  if (audio.musicTimer) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  resumeAudioIfNeeded();

  audio.musicGain = ctx.createGain();
  audio.musicGain.gain.value = 0.045;
  audio.musicGain.connect(audio.master);

  let i = 0;
  const playNote = () => {
    if (audio.muted || !audio.musicGain) return;
    const freq = MUSIC_NOTES[i % MUSIC_NOTES.length];
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
    osc.connect(g);
    g.connect(audio.musicGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    i += 1;
  };

  playNote();
  audio.musicTimer = setInterval(playNote, 480);
}

function stopMusic() {
  if (audio.musicTimer) {
    clearInterval(audio.musicTimer);
    audio.musicTimer = null;
  }
  if (audio.musicGain) {
    try {
      audio.musicGain.disconnect();
    } catch {
      /* ignore */
    }
    audio.musicGain = null;
  }
}

function applyMutedState() {
  muteButton.classList.toggle("muted", audio.muted);
  muteButton.setAttribute("aria-pressed", String(audio.muted));
  muteButton.title = audio.muted ? "Som desligado" : "Som ligado";
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  if (audio.muted) {
    stopMusic();
  }
}

function toggleMute() {
  audio.muted = !audio.muted;
  saveMuted(audio.muted);
  applyMutedState();
  if (!audio.muted) {
    ensureAudio();
    resumeAudioIfNeeded();
    const gameRunning = !isGameOver && startModal.classList.contains("hidden");
    if (gameRunning) startMusic();
  }
}

audio.muted = getStoredMuted();
applyMutedState();
muteButton.addEventListener("click", toggleMute);
/* --------------------------------------- */

function getStoredBest() {
  try {
    return Math.max(0, parseInt(localStorage.getItem(HIGH_SCORE_KEY) || "0", 10) || 0);
  } catch {
    return 0;
  }
}

function saveHighScoreIfBeat(finalScore) {
  const prev = getStoredBest();
  const isNewRecord = finalScore > prev;
  const best = Math.max(prev, finalScore);
  if (isNewRecord) {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(best));
    } catch {
      /* ignore */
    }
  }
  return { best, isNewRecord };
}

function updateStartHighScoreDisplay() {
  const b = getStoredBest();
  startHighScoreEl.textContent = b > 0 ? String(b) : "—";
}

function showLossScreen(reason, finalScore, best, isNewRecord) {
  gameOverReason.textContent = reason;
  gameOverScoreEl.textContent = String(finalScore);
  gameOverBestEl.textContent = String(best);
  gameOverNewRecordEl.classList.toggle("hidden", !isNewRecord);
  const openLoss = () => openModal(gameOverModal);
  if (!questionModal.classList.contains("hidden")) {
    closeModal(questionModal, openLoss);
  } else {
    openLoss();
  }
}

function showVictoryScreen(finalScore, best, isNewRecord) {
  victoryScoreEl.textContent = String(finalScore);
  victoryBestEl.textContent = String(best);
  victoryNewRecordEl.classList.toggle("hidden", !isNewRecord);
  openModal(victoryModal);
}

function goToMainMenu() {
  clearInterval(gameLoopId);
  stopTimer();
  stopMusic();
  closeModals();
  initGameState();
  updateStartHighScoreDisplay();
  openModal(startModal);
}

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

const QUESTIONS = {
  facil: [
    {
      q: "Quantos arranjos simples de 5 elementos tomados 2 a 2 existem?",
      options: ["10", "20", "25", "15"],
      correctIndex: 1,
      explanation: "A(5,2) = 5!/(5-2)! = 5·4 = 20."
    },
    {
      q: "A(6,1) é igual a:",
      options: ["1", "6", "5", "720"],
      correctIndex: 1,
      explanation: "A(n,1) sempre é igual a n. Logo A(6,1)=6."
    },
    {
      q: "Qual fórmula representa arranjo simples?",
      options: ["A(n,p)=n!/p!", "A(n,p)=n!/(n-p)!", "A(n,p)=p!/(n-p)!", "A(n,p)=n^p"],
      correctIndex: 1,
      explanation: "Por definição, A(n,p) = n! / (n-p)!."
    }
  ],
  medio: [
    {
      q: "Quantos arranjos de 7 elementos tomados 3 a 3?",
      options: ["35", "120", "210", "343"],
      correctIndex: 2,
      explanation: "A(7,3) = 7·6·5 = 210."
    },
    {
      q: "Em uma corrida com 8 atletas, de quantas formas podium (1o,2o,3o) pode ser formado?",
      options: ["56", "336", "512", "720"],
      correctIndex: 1,
      explanation: "A(8,3) = 8·7·6 = 336."
    },
    {
      q: "Se A(n,2)=30, qual pode ser o valor de n?",
      options: ["5", "6", "7", "8"],
      correctIndex: 1,
      explanation: "A(n,2)=n·(n-1). Logo n(n-1)=30 → n=6."
    }
  ],
  dificil: [
    {
      q: "Quantos arranjos de 10 elementos tomados 4 a 4?",
      options: ["210", "2520", "5040", "720"],
      correctIndex: 2,
      explanation: "A(10,4) = 10·9·8·7 = 5040."
    },
    {
      q: "Se A(n,3)=60, qual valor de n satisfaz a equação?",
      options: ["4", "5", "6", "7"],
      correctIndex: 1,
      explanation: "A(n,3)=n(n-1)(n-2). Para n=5: 5·4·3=60."
    },
    {
      q: "Em senhas sem repetição com 3 letras distintas escolhidas de 6, quantas existem?",
      options: ["18", "120", "216", "60"],
      correctIndex: 1,
      explanation: "A(6,3) = 6·5·4 = 120."
    }
  ]
};

let snake;
let direction;
let nextDirection;
let food;
let score;
let lives;
let speed;
let gameLoopId;
let isPausedForQuestion;
let isGameOver;
let pendingGrowth;
let usedQuestions;

function initGameState() {
  snake = [
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  food = generateFood();
  score = 0;
  lives = INITIAL_LIVES;
  speed = INITIAL_SPEED;
  isPausedForQuestion = false;
  isGameOver = false;
  pendingGrowth = false;
  usedQuestions = new Set();
  closeModals();
  updateHUD();
}

function startGame() {
  clearInterval(gameLoopId);
  initGameState();
  ensureAudio();
  resumeAudioIfNeeded();
  startMusic();
  gameLoopId = setInterval(tick, speed);
}

function restartLoopWithSpeed() {
  clearInterval(gameLoopId);
  gameLoopId = setInterval(tick, speed);
}

function tick() {
  if (isPausedForQuestion || isGameOver) return;

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  if (isWallCollision(head) || isSelfCollision(head)) {
    shakeScreen();
    endGame("A cobrinha colidiu!");
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    spawnParticles(food.x, food.y);
    sounds.eat();
    isPausedForQuestion = true;
    showQuestion();
  } else {
    snake.pop();
  }
}

function isWallCollision(head) {
  return head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT;
}

function isSelfCollision(head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y);
}

const FOOD_EDGE_MARGIN = 2;

function generateFood() {
  const min = FOOD_EDGE_MARGIN;
  const max = TILE_COUNT - FOOD_EDGE_MARGIN - 1;
  const range = max - min + 1;
  let position;
  do {
    position = {
      x: min + Math.floor(Math.random() * range),
      y: min + Math.floor(Math.random() * range)
    };
  } while (snake && snake.some((segment) => segment.x === position.x && segment.y === position.y));
  return position;
}

function getDifficultyByProgress() {
  if (score < 4) return "facil";
  if (score < 8) return "medio";
  return "dificil";
}

function getQuestionPool() {
  const diff = getDifficultyByProgress();
  const all = QUESTIONS[diff];
  const available = all
    .map((question, index) => ({ question, key: `${diff}-${index}` }))
    .filter((item) => !usedQuestions.has(item.key));

  if (available.length === 0) {
    usedQuestions = new Set([...usedQuestions].filter((key) => !key.startsWith(diff)));
    return getQuestionPool();
  }

  return { diff, available };
}

const TIMER_BY_DIFFICULTY = { facil: 15, medio: 12, dificil: 10 };
let timerIntervalId = null;
let currentQuestionContext = null;

const timerFillEl = document.getElementById("timerFill");
const timerTextEl = document.getElementById("timerText");
const feedbackIconEl = document.querySelector("#feedback .feedback-icon");
const feedbackTextEl = document.querySelector("#feedback .feedback-text");

function showQuestion() {
  const { diff, available } = getQuestionPool();
  const choice = available[Math.floor(Math.random() * available.length)];
  usedQuestions.add(choice.key);
  const question = choice.question;

  questionTitle.textContent = `Pergunta (${labelForDifficulty(diff)})`;
  questionText.textContent = question.q;
  answersContainer.innerHTML = "";
  feedbackEl.classList.remove("good", "bad", "show");
  feedbackIconEl.textContent = "";
  feedbackTextEl.textContent = "";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.innerHTML = `
      <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
      <span class="answer-text">${option}</span>
    `;
    button.addEventListener("click", () => handleAnswer(index, question.correctIndex, question.explanation));
    answersContainer.appendChild(button);
  });

  currentQuestionContext = { question, diff };
  openModal(questionModal);
  startTimer(TIMER_BY_DIFFICULTY[diff] ?? 15, question);
}

function startTimer(seconds, question) {
  stopTimer();
  const total = seconds * 1000;
  const startedAt = performance.now();

  timerFillEl.style.transition = "none";
  timerFillEl.style.width = "100%";
  timerFillEl.classList.remove("warning", "danger");
  timerTextEl.textContent = `${seconds}s`;

  void timerFillEl.offsetWidth;
  timerFillEl.style.transition = `width ${total}ms linear`;
  timerFillEl.style.width = "0%";

  timerIntervalId = setInterval(() => {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, Math.ceil((total - elapsed) / 1000));
    timerTextEl.textContent = `${remaining}s`;

    if (remaining <= Math.ceil(seconds * 0.5)) timerFillEl.classList.add("warning");
    if (remaining <= Math.ceil(seconds * 0.25)) timerFillEl.classList.add("danger");

    if (elapsed >= total) {
      stopTimer();
      handleAnswer(-1, question.correctIndex, question.explanation, true);
    }
  }, 100);
}

function stopTimer() {
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function handleAnswer(selectedIndex, correctIndex, explanation, timedOut = false) {
  stopTimer();
  const buttons = [...answersContainer.querySelectorAll(".answer-btn")];
  buttons.forEach((btn) => (btn.disabled = true));
  buttons[correctIndex].classList.add("correct");

  feedbackEl.classList.add("show");

  let reachedGoal = false;

  if (!timedOut && selectedIndex === correctIndex) {
    buttons[selectedIndex].classList.add("correct");
    feedbackIconEl.textContent = "✓";
    feedbackTextEl.textContent = `Correto! ${explanation || "A cobrinha vai crescer."}`;
    feedbackEl.classList.add("good");
    pendingGrowth = true;
    score += 1;
    speed = Math.max(70, INITIAL_SPEED - score * 4);
    if (score >= GOAL_SCORE) reachedGoal = true;
    sounds.correct();
  } else {
    if (!timedOut && selectedIndex >= 0) {
      buttons[selectedIndex].classList.add("wrong");
    }
    feedbackIconEl.textContent = "✗";
    feedbackTextEl.textContent = timedOut
      ? `Tempo esgotado! ${explanation || ""}`.trim()
      : `Incorreto! ${explanation || "Você perdeu 1 vida."}`;
    feedbackEl.classList.add("bad");
    lives -= 1;
    shakeScreen();
    sounds.wrong();
    if (lives <= 0) {
      updateHUD();
      setTimeout(() => endGame("Você ficou sem vidas!"), 1600);
      return;
    }
  }

  updateHUD();
  setTimeout(() => {
    closeModal(questionModal, () => {
      if (reachedGoal) {
        clearInterval(gameLoopId);
        isGameOver = true;
        isPausedForQuestion = true;
        stopMusic();
        sounds.victory();
        const { best, isNewRecord } = saveHighScoreIfBeat(score);
        showVictoryScreen(score, best, isNewRecord);
        return;
      }
      if (!pendingGrowth) {
        snake.pop();
      }
      pendingGrowth = false;
      food = generateFood();
      isPausedForQuestion = false;
      restartLoopWithSpeed();
    });
  }, 1600);
}

function openModal(modal) {
  modal.classList.remove("hidden", "closing");
  modal.classList.add("show");
}

function closeModal(modal, onClosed) {
  modal.classList.add("closing");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("closing");
    if (typeof onClosed === "function") onClosed();
  }, 250);
}

function updateHUD() {
  const progress = Math.min(100, Math.round((score / GOAL_SCORE) * 100));

  if (scoreEl.textContent !== String(score)) {
    scoreEl.textContent = String(score);
    scoreEl.classList.remove("pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pop");
  }

  renderHearts(lives);

  progressEl.textContent = `${progress}%`;
  progressFillEl.style.width = `${progress}%`;

  const diff = getDifficultyByProgress();
  difficultyEl.textContent = labelForDifficulty(diff);
  difficultyEl.classList.remove("difficulty-facil", "difficulty-medio", "difficulty-dificil");
  difficultyEl.classList.add(`difficulty-${diff}`);
}

function renderHearts(currentLives) {
  livesEl.innerHTML = "";
  for (let i = 0; i < INITIAL_LIVES; i += 1) {
    const heart = document.createElement("span");
    heart.className = i < currentLives ? "heart heart-full" : "heart heart-empty";
    heart.textContent = i < currentLives ? "♥" : "♡";
    livesEl.appendChild(heart);
  }
}

function labelForDifficulty(diff) {
  if (diff === "medio") return "Médio";
  if (diff === "dificil") return "Difícil";
  return "Fácil";
}

function endGame(reasonMessage) {
  isGameOver = true;
  isPausedForQuestion = true;
  clearInterval(gameLoopId);
  stopTimer();
  stopMusic();
  sounds.death();
  const { best, isNewRecord } = saveHighScoreIfBeat(score);
  showLossScreen(reasonMessage, score, best, isNewRecord);
}

function closeModals() {
  stopTimer();
  [questionModal, gameOverModal, victoryModal, startModal].forEach((m) => {
    if (m) {
      m.classList.add("hidden");
      m.classList.remove("show", "closing");
    }
  });
}

const particles = [];

function draw() {
  ctx.save();
  ctx.beginPath();
  const radius = 10;
  const w = canvas.width;
  const h = canvas.height;
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.quadraticCurveTo(w, 0, w, radius);
  ctx.lineTo(w, h - radius);
  ctx.quadraticCurveTo(w, h, w - radius, h);
  ctx.lineTo(radius, h);
  ctx.quadraticCurveTo(0, h, 0, h - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();

  const bg = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w * 0.8);
  bg.addColorStop(0, "#1a0830");
  bg.addColorStop(0.55, "#0c0420");
  bg.addColorStop(1, "#04020c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawVignetteGlow();
  drawGrid();
  drawFood();
  drawSnake();
  drawParticles();

  ctx.restore();
}

function drawVignetteGlow() {
  const w = canvas.width;
  const h = canvas.height;
  const grd1 = ctx.createRadialGradient(w * 0.15, h * 0.15, 10, w * 0.15, h * 0.15, w * 0.5);
  grd1.addColorStop(0, "rgba(0, 245, 255, 0.10)");
  grd1.addColorStop(1, "rgba(0, 245, 255, 0)");
  ctx.fillStyle = grd1;
  ctx.fillRect(0, 0, w, h);

  const grd2 = ctx.createRadialGradient(w * 0.85, h * 0.85, 10, w * 0.85, h * 0.85, w * 0.5);
  grd2.addColorStop(0, "rgba(255, 43, 214, 0.10)");
  grd2.addColorStop(1, "rgba(255, 43, 214, 0)");
  ctx.fillStyle = grd2;
  ctx.fillRect(0, 0, w, h);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(0, 245, 255, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= TILE_COUNT; i += 1) {
    const p = i * GRID_SIZE;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }
}

function roundedRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function lerpColor(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16);
  const b = parseInt(c2.slice(1), 16);
  const r1 = (a >> 16) & 255;
  const g1 = (a >> 8) & 255;
  const b1 = a & 255;
  const r2 = (b >> 16) & 255;
  const g2 = (b >> 8) & 255;
  const b2 = b & 255;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function drawSnake() {
  const headColor = "#00f5ff";
  const tailColor = "#39ff14";
  const len = snake.length;

  ctx.save();
  ctx.shadowColor = "rgba(0, 245, 255, 0.6)";
  ctx.shadowBlur = 18;

  for (let i = len - 1; i >= 0; i -= 1) {
    const segment = snake[i];
    const t = len === 1 ? 0 : i / (len - 1);
    const color = lerpColor(headColor, tailColor, t);
    ctx.fillStyle = color;

    const px = segment.x * GRID_SIZE + 2;
    const py = segment.y * GRID_SIZE + 2;
    const size = GRID_SIZE - 4;
    const radius = i === 0 ? 8 : 6;

    if (i > 0 && i < len - 1) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(57, 255, 20, 0.4)";
    } else if (i === 0) {
      ctx.shadowBlur = 22;
      ctx.shadowColor = "rgba(0, 245, 255, 0.85)";
    }

    roundedRect(px, py, size, size, radius);
    ctx.fill();
  }
  ctx.restore();

  drawSnakeEyes();
}

function drawSnakeEyes() {
  const head = snake[0];
  const cx = head.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = head.y * GRID_SIZE + GRID_SIZE / 2;
  const offset = 4;
  const eyeR = 2.2;
  const pupilR = 1.2;

  let e1x;
  let e1y;
  let e2x;
  let e2y;

  if (direction.x === 1) {
    e1x = cx + 2; e1y = cy - offset;
    e2x = cx + 2; e2y = cy + offset;
  } else if (direction.x === -1) {
    e1x = cx - 2; e1y = cy - offset;
    e2x = cx - 2; e2y = cy + offset;
  } else if (direction.y === -1) {
    e1x = cx - offset; e1y = cy - 2;
    e2x = cx + offset; e2y = cy - 2;
  } else {
    e1x = cx - offset; e1y = cy + 2;
    e2x = cx + offset; e2y = cy + 2;
  }

  ctx.fillStyle = "#0a0218";
  ctx.beginPath();
  ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2);
  ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(e1x + direction.x * 0.6, e1y + direction.y * 0.6, pupilR, 0, Math.PI * 2);
  ctx.arc(e2x + direction.x * 0.6, e2y + direction.y * 0.6, pupilR, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood() {
  const cx = food.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = food.y * GRID_SIZE + GRID_SIZE / 2;
  const t = performance.now() / 1000;
  const pulse = 1 + Math.sin(t * 3.5) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, GRID_SIZE);
  auraGrad.addColorStop(0, "rgba(255, 43, 214, 0.5)");
  auraGrad.addColorStop(0.5, "rgba(255, 43, 214, 0.18)");
  auraGrad.addColorStop(1, "rgba(255, 43, 214, 0)");
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, GRID_SIZE, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 43, 214, 0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, GRID_SIZE / 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f4edff";
  ctx.shadowColor = "rgba(255, 43, 214, 0.9)";
  ctx.shadowBlur = 12;
  ctx.font = `bold ${Math.floor(GRID_SIZE * 0.95)}px "Orbitron", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("π", 0, 1);

  ctx.restore();
}

function spawnParticles(gridX, gridY, count = 22) {
  const cx = gridX * GRID_SIZE + GRID_SIZE / 2;
  const cy = gridY * GRID_SIZE + GRID_SIZE / 2;
  const colors = ["#ff2bd6", "#00f5ff", "#39ff14", "#f0ff4a"];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= p.decay;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function shakeScreen() {
  canvas.classList.remove("shake");
  void canvas.offsetWidth;
  canvas.classList.add("shake");
}

let renderLoopId = null;
function renderLoop() {
  draw();
  renderLoopId = requestAnimationFrame(renderLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const candidate = DIRECTIONS[key];
  if (!candidate) return;
  event.preventDefault();
  if (isPausedForQuestion || isGameOver) return;

  const isOpposite = candidate.x + direction.x === 0 && candidate.y + direction.y === 0;
  if (!isOpposite) {
    nextDirection = candidate;
  }
});

restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
startButton.addEventListener("click", startGame);
victoryPlayAgainButton.addEventListener("click", startGame);
menuFromGameOverButton.addEventListener("click", goToMainMenu);
menuFromVictoryButton.addEventListener("click", goToMainMenu);

goalScoreLabel.textContent = String(GOAL_SCORE);
updateStartHighScoreDisplay();

initGameState();
openModal(startModal);
renderLoop();
