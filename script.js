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
const gameOverMessage = document.getElementById("gameOverMessage");

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const INITIAL_SPEED = 130;
const INITIAL_LIVES = 3;
const GOAL_SCORE = 12;

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
      correctIndex: 1
    },
    {
      q: "A(6,1) é igual a:",
      options: ["1", "6", "5", "720"],
      correctIndex: 1
    },
    {
      q: "Qual fórmula representa arranjo simples?",
      options: ["A(n,p)=n!/p!", "A(n,p)=n!/(n-p)!", "A(n,p)=p!/(n-p)!", "A(n,p)=n^p"],
      correctIndex: 1
    }
  ],
  medio: [
    {
      q: "Quantos arranjos de 7 elementos tomados 3 a 3?",
      options: ["35", "120", "210", "343"],
      correctIndex: 2
    },
    {
      q: "Em uma corrida com 8 atletas, de quantas formas podium (1o,2o,3o) pode ser formado?",
      options: ["56", "336", "512", "720"],
      correctIndex: 1
    },
    {
      q: "Se A(n,2)=30, qual pode ser o valor de n?",
      options: ["5", "6", "7", "8"],
      correctIndex: 1
    }
  ],
  dificil: [
    {
      q: "Quantos arranjos de 10 elementos tomados 4 a 4?",
      options: ["210", "2520", "5040", "720"],
      correctIndex: 1
    },
    {
      q: "Se A(n,3)=60, qual valor de n satisfaz a equação?",
      options: ["4", "5", "6", "7"],
      correctIndex: 1
    },
    {
      q: "Em senhas sem repetição com 3 letras distintas escolhidas de 6, quantas existem?",
      options: ["18", "120", "216", "60"],
      correctIndex: 1
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

function showQuestion() {
  const { diff, available } = getQuestionPool();
  const choice = available[Math.floor(Math.random() * available.length)];
  usedQuestions.add(choice.key);
  const question = choice.question;

  questionTitle.textContent = `Pergunta (${labelForDifficulty(diff)})`;
  questionText.textContent = question.q;
  answersContainer.innerHTML = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-btn";
    button.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
    button.addEventListener("click", () => handleAnswer(index, question.correctIndex));
    answersContainer.appendChild(button);
  });

  questionModal.classList.remove("hidden");
}

function handleAnswer(selectedIndex, correctIndex) {
  const buttons = [...answersContainer.querySelectorAll(".answer-btn")];
  buttons.forEach((btn) => (btn.disabled = true));
  buttons[correctIndex].classList.add("correct");

  if (selectedIndex === correctIndex) {
    buttons[selectedIndex].classList.add("correct");
    feedbackEl.textContent = "Correto! A cobrinha vai crescer.";
    feedbackEl.classList.add("good");
    pendingGrowth = true;
    score += 1;
    speed = Math.max(70, INITIAL_SPEED - score * 4);
  } else {
    buttons[selectedIndex].classList.add("wrong");
    feedbackEl.textContent = "Resposta incorreta! Você perdeu 1 vida.";
    feedbackEl.classList.add("bad");
    lives -= 1;
    shakeScreen();
    if (lives <= 0) {
      updateHUD();
      setTimeout(() => endGame("Você ficou sem vidas!"), 900);
      return;
    }
  }

  updateHUD();
  setTimeout(() => {
    questionModal.classList.add("hidden");
    if (!pendingGrowth) {
      snake.pop();
    }
    pendingGrowth = false;
    food = generateFood();
    isPausedForQuestion = false;
    restartLoopWithSpeed();
  }, 900);
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

function endGame(message) {
  isGameOver = true;
  isPausedForQuestion = true;
  clearInterval(gameLoopId);
  gameOverMessage.textContent = `${message} Pontuação final: ${score}.`;
  gameOverModal.classList.remove("hidden");
}

function closeModals() {
  questionModal.classList.add("hidden");
  gameOverModal.classList.add("hidden");
  if (startModal) startModal.classList.add("hidden");
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

initGameState();
startModal.classList.remove("hidden");
renderLoop();
