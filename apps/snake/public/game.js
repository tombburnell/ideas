const GRID = 20;
const TICK_MS = 110;

const canvas = document.getElementById("game");
const canvasWrap = document.getElementById("canvasWrap");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const nameInput = document.getElementById("playerName");
const nameRow = document.getElementById("nameRow");
const submitBtn = document.getElementById("submitScore");
const leaderboardEl = document.getElementById("leaderboard");
const scoresErrorEl = document.getElementById("scoresError");
const touchPause = document.getElementById("touchPause");
const touchRestart = document.getElementById("touchRestart");
const helpToggle = document.getElementById("helpToggle");
const helpBody = document.getElementById("helpBody");
const boardOverlay = document.getElementById("boardOverlay");
const overlayActionBtn = document.getElementById("overlayActionBtn");
const scoresModal = document.getElementById("scoresModal");
const openScoresBtn = document.getElementById("openScoresBtn");
const scoresModalClose = document.getElementById("scoresModalClose");
const scoresModalBackdrop = document.getElementById("scoresModalBackdrop");

function syncHelpPanel() {
  if (!helpToggle || !helpBody) return;
  const wide = window.matchMedia("(min-width: 720px)").matches;
  if (wide) {
    helpBody.classList.add("is-open");
    helpBody.setAttribute("aria-hidden", "false");
    helpToggle.setAttribute("aria-expanded", "true");
  } else {
    helpBody.classList.remove("is-open");
    helpBody.setAttribute("aria-hidden", "true");
    helpToggle.setAttribute("aria-expanded", "false");
  }
}

helpToggle?.addEventListener("click", () => {
  const open = !helpBody.classList.contains("is-open");
  helpBody.classList.toggle("is-open", open);
  helpBody.setAttribute("aria-hidden", String(!open));
  helpToggle.setAttribute("aria-expanded", String(open));
});

window.matchMedia("(min-width: 720px)").addEventListener("change", syncHelpPanel);
syncHelpPanel();

function openScoresModal() {
  if (!scoresModal) return;
  scoresModal.hidden = false;
  document.body.classList.add("modal-open");
  loadScores();
  scoresModalClose?.focus();
}

function closeScoresModal() {
  if (!scoresModal) return;
  scoresModal.hidden = true;
  document.body.classList.remove("modal-open");
  openScoresBtn?.focus();
}

openScoresBtn?.addEventListener("click", () => openScoresModal());
scoresModalClose?.addEventListener("click", () => closeScoresModal());
scoresModalBackdrop?.addEventListener("click", () => closeScoresModal());

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && scoresModal && !scoresModal.hidden) {
    e.preventDefault();
    closeScoresModal();
  }
});

let cell = 20;

function layoutCanvas() {
  if (!canvasWrap) return;
  const d = Math.min(canvasWrap.clientWidth, canvasWrap.clientHeight);
  let size = Math.floor(d / GRID) * GRID;
  if (size < GRID * 10) size = GRID * 10;
  if (size !== canvas.width) {
    canvas.width = size;
    canvas.height = size;
    cell = size / GRID;
    draw();
  }
}

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

function updateBoardOverlay() {
  if (!boardOverlay || !overlayActionBtn) return;
  const show = paused || !running || gameOver;
  if (show) {
    boardOverlay.removeAttribute("hidden");
    boardOverlay.setAttribute("aria-hidden", "false");
    if (gameOver) overlayActionBtn.textContent = "Try again";
    else if (paused) overlayActionBtn.textContent = "Resume";
    else overlayActionBtn.textContent = "Start";
  } else {
    boardOverlay.setAttribute("hidden", "");
    boardOverlay.setAttribute("aria-hidden", "true");
  }
}

function resumeFromPause() {
  if (!running || gameOver || !paused) return;
  paused = false;
  updateHud();
  updateBoardOverlay();
}

function setNameRowVisible(visible) {
  if (!nameRow) return;
  nameRow.classList.toggle("hidden", !visible);
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
  setNameRowVisible(false);
  updateBoardOverlay();
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
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * cell);
    ctx.lineTo(canvas.width, i * cell);
    ctx.stroke();
  }

  ctx.fillStyle = "#ff3355";
  ctx.fillRect(food.x * cell + 1, food.y * cell + 1, cell - 2, cell - 2);

  snake.forEach((seg, i) => {
    ctx.fillStyle = i === 0 ? "#66ff88" : "#33ff66";
    ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
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
  setNameRowVisible(true);
  submitBtn.disabled = score <= 0 || lastSubmittedScore === score;
  updateBoardOverlay();
}

function start() {
  if (running && !gameOver) return;
  if (gameOver) return;
  running = true;
  paused = false;
  updateHud();
  updateBoardOverlay();
  if (!tickId) tickId = setInterval(tick, TICK_MS);
}

function handleOverlayAction() {
  if (paused) {
    resumeFromPause();
    return;
  }
  if (gameOver) {
    reset();
  }
  start();
}

overlayActionBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  handleOverlayAction();
});

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  updateHud();
  updateBoardOverlay();
}

function trySetDir(nx, ny) {
  nextDir = { x: nx, y: ny };
}

/** ←/→ (keyboard or touch): 90° turn relative to current heading. */
function headingForRelativeTurn() {
  if (running || paused || gameOver) return dir;
  return nextDir;
}

function turnLeft() {
  const d = headingForRelativeTurn();
  nextDir = { x: d.y, y: -d.x };
}

function turnRight() {
  const d = headingForRelativeTurn();
  nextDir = { x: -d.y, y: d.x };
}

document.addEventListener("keydown", (e) => {
  if (scoresModal && !scoresModal.hidden && e.key !== "Escape") return;

  if (e.key === " " || e.code === "Space") {
    const overlayUp =
      boardOverlay && boardOverlay.getAttribute("aria-hidden") === "false";
    if (overlayUp) {
      e.preventDefault();
      handleOverlayAction();
    }
    return;
  }

  const k = e.key;
  if (k === "ArrowUp") trySetDir(0, -1);
  else if (k === "ArrowDown") trySetDir(0, 1);
  else if (k === "ArrowLeft") turnLeft();
  else if (k === "ArrowRight") turnRight();
  else if (k === "p" || k === "P") togglePause();
  else if (k === "r" || k === "R") reset();
  else return;
  e.preventDefault();
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
    openScoresModal();
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

function applyDirFromButton(btn) {
  const d = btn.getAttribute("data-dir");
  if (d === "up") trySetDir(0, -1);
  else if (d === "down") trySetDir(0, 1);
  else if (d === "left") turnLeft();
  else if (d === "right") turnRight();
}

const touchPadLr = document.getElementById("touchPadLr");
const touchPadSecondary = document.getElementById("touchPadSecondary");

function bindDirDelegation(root) {
  if (!root) return;
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-dir]");
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();
    applyDirFromButton(btn);
  });
}

bindDirDelegation(touchPadLr);
bindDirDelegation(touchPadSecondary);

touchPause?.addEventListener("click", () => togglePause());
touchRestart?.addEventListener("click", () => reset());

const ro = new ResizeObserver(() => layoutCanvas());
if (canvasWrap) ro.observe(canvasWrap);
window.addEventListener("load", layoutCanvas);
layoutCanvas();

reset();
