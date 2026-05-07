const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const progressEl = document.getElementById("progress");
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
  draw();
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
    endGame("A cobrinha colidiu!");
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    isPausedForQuestion = true;
    showQuestion();
  } else {
    snake.pop();
  }

  draw();
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
    draw();
  }, 900);
}

function updateHUD() {
  const progress = Math.min(100, Math.round((score / GOAL_SCORE) * 100));
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  progressEl.textContent = `${progress}%`;
  difficultyEl.textContent = labelForDifficulty(getDifficultyByProgress());
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

function draw() {
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#0a0518");
  g.addColorStop(0.5, "#12061f");
  g.addColorStop(1, "#05121a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(0, 245, 255, 0.06)";
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

function drawSnake() {
  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#00f5ff" : "#39ff14";
    ctx.fillRect(
      segment.x * GRID_SIZE + 1,
      segment.y * GRID_SIZE + 1,
      GRID_SIZE - 2,
      GRID_SIZE - 2
    );
  });
}

function drawFood() {
  ctx.fillStyle = "#ff2bd6";
  ctx.beginPath();
  ctx.arc(
    food.x * GRID_SIZE + GRID_SIZE / 2,
    food.y * GRID_SIZE + GRID_SIZE / 2,
    GRID_SIZE / 2.6,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const candidate = DIRECTIONS[key];
  if (!candidate || isPausedForQuestion || isGameOver) return;
  event.preventDefault();

  const isOpposite = candidate.x + direction.x === 0 && candidate.y + direction.y === 0;
  if (!isOpposite) {
    nextDirection = candidate;
  }
});

restartButton.addEventListener("click", startGame);
playAgainButton.addEventListener("click", startGame);
startButton.addEventListener("click", startGame);

initGameState();
draw();
startModal.classList.remove("hidden");
