const WORLD_W = 400;
const WORLD_H = 500;
const PADDLE_W = 76;
const PADDLE_H = 14;
const PADDLE_Y = WORLD_H - 36;
const BALL_R = 7;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_W = 34;
const BRICK_H = 15;
const BRICK_GAP = 5;
const BRICK_TOP = 52;
const BRICK_LEFT = (WORLD_W - (BRICK_COLS * BRICK_W + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

const POP_COLORS = ["#00e5ff", "#ff00aa", "#ffe600", "#7cff00", "#ff6b2c", "#b388ff"];

const canvas = document.getElementById("game");
const canvasWrap = document.getElementById("canvasWrap");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
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

let scale = 1;

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

function layoutCanvas() {
  if (!canvasWrap) return;
  const aspect = WORLD_W / WORLD_H;
  let cw = canvasWrap.clientWidth;
  let ch = canvasWrap.clientHeight;
  if (cw / ch > aspect) {
    cw = Math.floor(ch * aspect);
  } else {
    ch = Math.floor(cw / aspect);
  }
  if (cw < 200) cw = 200;
  if (ch < Math.floor(cw / aspect)) ch = Math.floor(cw / aspect);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
    scale = cw / WORLD_W;
    draw();
  }
}

let bricks = [];
let paddle = { x: WORLD_W / 2 - PADDLE_W / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
let ball = { x: WORLD_W / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 };
let score = 0;
let lives = 3;
let level = 1;
let running = false;
let paused = false;
let gameOver = false;
let ballOnPaddle = true;
let lastSubmittedScore = null;
let rafId = null;
let lastTs = 0;

let keyLeft = false;
let keyRight = false;
let touchLeft = false;
let touchRight = false;
let pointerAimX = null;

function speedMul() {
  return 1 + (level - 1) * 0.06;
}

function buildBricks() {
  const rows = Math.min(BRICK_ROWS + Math.floor((level - 1) / 2), 8);
  bricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const x = BRICK_LEFT + c * (BRICK_W + BRICK_GAP);
      const y = BRICK_TOP + r * (BRICK_H + BRICK_GAP);
      bricks.push({
        x,
        y,
        w: BRICK_W,
        h: BRICK_H,
        color: POP_COLORS[(r + c) % POP_COLORS.length],
        row: r,
      });
    }
  }
}

function resetBallOnPaddle() {
  ball.x = paddle.x + paddle.w / 2;
  ball.y = paddle.y - BALL_R - 1;
  ball.vx = 0;
  ball.vy = 0;
  ballOnPaddle = true;
}

function launchBall() {
  if (!ballOnPaddle) return;
  ballOnPaddle = false;
  const base = 260 * speedMul();
  const angle = (-Math.PI / 2 + (Math.random() * 0.5 - 0.25) * 0.35);
  ball.vx = Math.cos(angle) * base;
  ball.vy = Math.sin(angle) * base;
}

function updateBoardOverlay() {
  if (!boardOverlay || !overlayActionBtn) return;
  const show = paused || !running || gameOver || ballOnPaddle;
  if (show) {
    boardOverlay.removeAttribute("hidden");
    boardOverlay.setAttribute("aria-hidden", "false");
    if (gameOver) overlayActionBtn.textContent = "Try again";
    else if (paused) overlayActionBtn.textContent = "Resume";
    else if (ballOnPaddle && running) overlayActionBtn.textContent = "Launch";
    else overlayActionBtn.textContent = "Start";
  } else {
    boardOverlay.setAttribute("hidden", "");
    boardOverlay.setAttribute("aria-hidden", "true");
  }
}

function resumeFromPause() {
  if (!running || gameOver || !paused) return;
  paused = false;
  lastTs = 0;
  updateHud();
  updateBoardOverlay();
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function setNameRowVisible(visible) {
  if (!nameRow) return;
  nameRow.classList.toggle("hidden", !visible);
}

function reset() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTs = 0;
  score = 0;
  lives = 3;
  level = 1;
  paddle.x = WORLD_W / 2 - PADDLE_W / 2;
  buildBricks();
  resetBallOnPaddle();
  running = false;
  paused = false;
  gameOver = false;
  submitBtn.disabled = true;
  lastSubmittedScore = null;
  setNameRowVisible(false);
  updateHud();
  updateBoardOverlay();
  draw();
}

function livesDots() {
  return "●".repeat(Math.max(0, lives)) || "—";
}

function updateHud() {
  scoreEl.textContent = `SCORE ${String(score).padStart(4, "0")}`;
  livesEl.textContent = livesDots();
  if (gameOver) statusEl.textContent = "GAME OVER";
  else if (paused) statusEl.textContent = "PAUSED";
  else if (running && ballOnPaddle) statusEl.textContent = "LAUNCH";
  else if (running) statusEl.textContent = `LV ${level}`;
  else statusEl.textContent = "READY";
}

function worldToCanvas() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawHalftoneBg() {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#fffef8";
  ctx.fillRect(0, 0, w, h);
  const step = Math.max(8, 10 * scale);
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let y = 0; y < h; y += step) {
    const row = Math.floor(y / step);
    for (let x = row % 2 === 0 ? 0 : step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function strokeRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function draw() {
  drawHalftoneBg();
  worldToCanvas();

  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, WORLD_W - 4, WORLD_H - 4);

  bricks.forEach((b) => {
    ctx.fillStyle = b.color;
    strokeRoundRect(b.x, b.y, b.w, b.h, 3);
    ctx.fill();
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.fillStyle = "#ff00aa";
  strokeRoundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
  ctx.fill();
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe600";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0a0a0a";
  ctx.stroke();
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function resolveBrickHit(prevX, prevY) {
  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    if (!circleRectOverlap(ball.x, ball.y, BALL_R, b.x, b.y, b.w, b.h)) continue;

    const overlapL = ball.x + BALL_R - b.x;
    const overlapR = b.x + b.w - (ball.x - BALL_R);
    const overlapT = ball.y + BALL_R - b.y;
    const overlapB = b.y + b.h - (ball.y - BALL_R);

    const penL = Math.abs(overlapL);
    const penR = Math.abs(overlapR);
    const penT = Math.abs(overlapT);
    const penB = Math.abs(overlapB);
    const m = Math.min(penL, penR, penT, penB);

    if (m === penL || m === penR) {
      ball.vx *= -1;
      ball.x = m === penL ? b.x - BALL_R - 0.01 : b.x + b.w + BALL_R + 0.01;
    } else {
      ball.vy *= -1;
      ball.y = m === penT ? b.y - BALL_R - 0.01 : b.y + b.h + BALL_R + 0.01;
    }

    bricks.splice(i, 1);
    score += 10 * (8 - b.row + level);
    if (bricks.length === 0) {
      level += 1;
      buildBricks();
      resetBallOnPaddle();
      running = true;
      paused = false;
      updateBoardOverlay();
    }
    return true;
  }
  return false;
}

function bouncePaddle() {
  if (ball.vy <= 0) return;
  const padTop = paddle.y;
  const nextBottom = ball.y + BALL_R;
  if (nextBottom < padTop - 2) return;
  if (!circleRectOverlap(ball.x, ball.y, BALL_R, paddle.x, paddle.y, paddle.w, paddle.h)) return;

  const cx = paddle.x + paddle.w / 2;
  const t = clamp((ball.x - cx) / (paddle.w / 2), -1, 1);
  const maxAng = (65 * Math.PI) / 180;
  const ang = t * maxAng;
  const sp = Math.hypot(ball.vx, ball.vy) * 1.02 * speedMul();
  const cap = 420 * speedMul();
  const speed = Math.min(sp, cap);
  ball.vx = Math.sin(ang) * speed;
  ball.vy = -Math.abs(Math.cos(ang) * speed);
  ball.y = paddle.y - BALL_R - 0.5;
}

function step(dt) {
  const paddleSpeed = 340 * speedMul();
  if (keyLeft || touchLeft) paddle.x -= paddleSpeed * dt;
  if (keyRight || touchRight) paddle.x += paddleSpeed * dt;
  if (pointerAimX !== null) {
    paddle.x = pointerAimX - paddle.w / 2;
  }
  paddle.x = clamp(paddle.x, 4, WORLD_W - paddle.w - 4);

  if (ballOnPaddle) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - BALL_R - 1;
    return;
  }

  const sub = 3;
  const sdt = dt / sub;
  for (let s = 0; s < sub; s++) {
    ball.x += ball.vx * sdt;
    ball.y += ball.vy * sdt;

    if (ball.x - BALL_R < 4) {
      ball.x = 4 + BALL_R;
      ball.vx *= -1;
    } else if (ball.x + BALL_R > WORLD_W - 4) {
      ball.x = WORLD_W - 4 - BALL_R;
      ball.vx *= -1;
    }
    if (ball.y - BALL_R < 4) {
      ball.y = 4 + BALL_R;
      ball.vy *= -1;
    }

    bouncePaddle();
    if (resolveBrickHit()) {
      /* brick removed */
    }

    if (ball.y - BALL_R > WORLD_H + 12) {
      lives -= 1;
      if (lives <= 0) {
        endGame();
        return;
      }
      resetBallOnPaddle();
      paused = false;
      updateHud();
      updateBoardOverlay();
      return;
    }
  }
}

function loop(ts) {
  if (!running || gameOver) {
    rafId = null;
    return;
  }
  if (paused) {
    rafId = null;
    lastTs = ts;
    return;
  }

  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.05) dt = 0.05;
  step(dt);
  updateHud();
  draw();

  rafId = requestAnimationFrame(loop);
}

function endGame() {
  gameOver = true;
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastTs = 0;
  updateHud();
  setNameRowVisible(true);
  submitBtn.disabled = score <= 0 || lastSubmittedScore === score;
  updateBoardOverlay();
  draw();
}

function start() {
  if (gameOver) return;
  running = true;
  paused = false;
  updateHud();
  updateBoardOverlay();
  if (!rafId) {
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }
}

function handleOverlayAction() {
  if (paused) {
    resumeFromPause();
    return;
  }
  if (gameOver) {
    reset();
    return;
  }
  if (!running) {
    start();
    return;
  }
  if (ballOnPaddle) {
    launchBall();
    updateHud();
    updateBoardOverlay();
    if (running && !paused && !gameOver && !rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }
}

overlayActionBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  handleOverlayAction();
});

function togglePause() {
  if (!running || gameOver) return;
  if (ballOnPaddle) return;
  paused = !paused;
  lastTs = 0;
  if (paused) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    draw();
  } else if (!rafId) {
    rafId = requestAnimationFrame(loop);
  }
  updateHud();
  updateBoardOverlay();
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
  if (k === "ArrowLeft") {
    keyLeft = true;
    e.preventDefault();
  } else if (k === "ArrowRight") {
    keyRight = true;
    e.preventDefault();
  } else if (k === "p" || k === "P") togglePause();
  else if (k === "r" || k === "R") reset();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keyLeft = false;
  if (e.key === "ArrowRight") keyRight = false;
});

submitBtn.addEventListener("click", async () => {
  const playerName = nameInput.value.trim() || "POP";
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
      li.innerHTML = `${i + 1}. ${escapeHtml(row.playerName)} — ${row.score}`;
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
  if (d === "left") {
    paddle.x -= 28;
    paddle.x = clamp(paddle.x, 4, WORLD_W - paddle.w - 4);
    draw();
  } else if (d === "right") {
    paddle.x += 28;
    paddle.x = clamp(paddle.x, 4, WORLD_W - paddle.w - 4);
    draw();
  }
}

const touchPadLr = document.getElementById("touchPadLr");

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

function endTouchDir() {
  touchLeft = false;
  touchRight = false;
}

touchPadLr?.addEventListener(
  "pointerdown",
  (e) => {
    const btn = e.target.closest("button[data-dir]");
    if (!btn || !touchPadLr.contains(btn)) return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    const d = btn.getAttribute("data-dir");
    if (d === "left") touchLeft = true;
    else if (d === "right") touchRight = true;
  },
  { passive: false }
);

touchPadLr?.addEventListener("pointerup", (e) => {
  const btn = e.target.closest("button[data-dir]");
  if (!btn || !touchPadLr.contains(btn)) return;
  endTouchDir();
});
touchPadLr?.addEventListener("pointercancel", endTouchDir);

touchPause?.addEventListener("click", () => togglePause());
touchRestart?.addEventListener("click", () => reset());

function canvasPointerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (WORLD_W / rect.width);
  return clamp(x, paddle.w / 2 + 4, WORLD_W - paddle.w / 2 - 4);
}

canvasWrap?.addEventListener(
  "pointerdown",
  (e) => {
    if (e.target.closest("button")) return;
    if (e.target === canvas || canvasWrap.contains(canvas)) {
      pointerAimX = canvasPointerX(e.clientX);
      canvasWrap.setPointerCapture(e.pointerId);
    }
  },
  { passive: true }
);

canvasWrap?.addEventListener("pointermove", (e) => {
  if (!canvasWrap.hasPointerCapture(e.pointerId) && pointerAimX === null) return;
  if (canvasWrap.hasPointerCapture(e.pointerId)) {
    pointerAimX = canvasPointerX(e.clientX);
    if (running && ballOnPaddle && !rafId) draw();
  }
});

canvasWrap?.addEventListener("pointerup", (e) => {
  if (canvasWrap.hasPointerCapture(e.pointerId)) {
    canvasWrap.releasePointerCapture(e.pointerId);
  }
  pointerAimX = null;
});
canvasWrap?.addEventListener("pointercancel", () => {
  pointerAimX = null;
});

const ro = new ResizeObserver(() => layoutCanvas());
if (canvasWrap) ro.observe(canvasWrap);
window.addEventListener("load", layoutCanvas);
layoutCanvas();

reset();
