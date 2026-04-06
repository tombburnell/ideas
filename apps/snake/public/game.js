const GRID = 20;
const CELL = 400 / GRID;
const TICK_MS = 110;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const nameInput = document.getElementById("playerName");
const submitBtn = document.getElementById("submitScore");
const leaderboardEl = document.getElementById("leaderboard");
const scoresErrorEl = document.getElementById("scoresError");

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 10, y: 10 };
let score = 0;
let running = false;
let paused = false;
let tickId = null;
let gameOver = false;
let lastSubmittedScore = null;

function randCell() {
  return {
    x: Math.floor(Math.random() * GRID),
    y: Math.floor(Math.random() * GRID),
  };
}

function placeFood() {
  let p;
  do {
    p = randCell();
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  food = p;
}

function reset() {
  if (tickId) clearInterval(tickId);
  tickId = null;
  snake = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  running = false;
  paused = false;
  gameOver = false;
  placeFood();
  updateHud();
  submitBtn.disabled = true;
  lastSubmittedScore = null;
  draw();
}

function updateHud() {
  scoreEl.textContent = `SCORE ${String(score).padStart(4, "0")}`;
  if (gameOver) statusEl.textContent = "GAME OVER";
  else if (paused) statusEl.textContent = "PAUSED";
  else if (running) statusEl.textContent = "PLAY";
  else statusEl.textContent = "READY";
}

function draw() {
  ctx.fillStyle = "#020804";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#0d2818";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(canvas.width, i * CELL);
    ctx.stroke();
  }

  ctx.fillStyle = "#ff3355";
  ctx.fillRect(food.x * CELL + 1, food.y * CELL + 1, CELL - 2, CELL - 2);

  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#66ff88" : "#33ff66";
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
}

function tick() {
  if (!running || paused || gameOver) return;
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    endGame();
    return;
  }
  if (snake.some((s) => s.x === head.x && s.y === head.y)) {
    endGame();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    placeFood();
  } else {
    snake.pop();
  }
  updateHud();
  draw();
}

function endGame() {
  gameOver = true;
  running = false;
  if (tickId) {
    clearInterval(tickId);
    tickId = null;
  }
  updateHud();
  submitBtn.disabled = score <= 0 || lastSubmittedScore === score;
}

function start() {
  if (running && !gameOver) return;
  if (gameOver) reset();
  running = true;
  paused = false;
  updateHud();
  if (!tickId) tickId = setInterval(tick, TICK_MS);
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  updateHud();
}

document.addEventListener("keydown", (e) => {
  const k = e.key;
  if (k === "ArrowUp" && dir.y === 0) nextDir = { x: 0, y: -1 };
  else if (k === "ArrowDown" && dir.y === 0) nextDir = { x: 0, y: 1 };
  else if (k === "ArrowLeft" && dir.x === 0) nextDir = { x: -1, y: 0 };
  else if (k === "ArrowRight" && dir.x === 0) nextDir = { x: 1, y: 0 };
  else if (k === "p" || k === "P") togglePause();
  else if (k === "r" || k === "R") reset();
  else return;
  e.preventDefault();
  if (!running && !gameOver && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) {
    start();
  }
});

submitBtn.addEventListener("click", async () => {
  const playerName = nameInput.value.trim() || "AAA";
  submitBtn.disabled = true;
  scoresErrorEl.classList.add("hidden");
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, score }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Submit failed");
    }
    lastSubmittedScore = score;
    await loadScores();
  } catch (err) {
    scoresErrorEl.textContent = err.message || "Could not submit score";
    scoresErrorEl.classList.remove("hidden");
    submitBtn.disabled = false;
  }
});

async function loadScores() {
  scoresErrorEl.classList.add("hidden");
  try {
    const res = await fetch("/api/scores");
    if (!res.ok) throw new Error("Could not load scores");
    const data = await res.json();
    leaderboardEl.innerHTML = "";
    data.scores.forEach((row, i) => {
      const li = document.createElement("li");
      const label = `${i + 1}. ${escapeHtml(row.playerName)} — ${row.score}`;
      li.innerHTML = label;
      leaderboardEl.appendChild(li);
    });
    if (gameOver && score > 0 && lastSubmittedScore !== score) {
      submitBtn.disabled = false;
    }
  } catch (e) {
    scoresErrorEl.textContent = e.message || "Scores unavailable";
    scoresErrorEl.classList.remove("hidden");
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

canvas.addEventListener("click", () => {
  if (!running) start();
});

reset();
loadScores();
