/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("game");
const canvasWrap = document.getElementById("canvasWrap");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const livesEl = document.getElementById("lives");
const nameInput = document.getElementById("playerName");
const nameRow = document.getElementById("nameRow");
const submitBtn = document.getElementById("submitScore");
const leaderboardEl = document.getElementById("leaderboard");
const scoresErrorEl = document.getElementById("scoresError");
const touchPause = document.getElementById("touchPause");
const touchRestart = document.getElementById("touchRestart");
const touchFire = document.getElementById("touchFire");
const helpToggle = document.getElementById("helpToggle");
const helpBody = document.getElementById("helpBody");
const boardOverlay = document.getElementById("boardOverlay");
const overlayActionBtn = document.getElementById("overlayActionBtn");
const scoresModal = document.getElementById("scoresModal");
const openScoresBtn = document.getElementById("openScoresBtn");
const scoresModalClose = document.getElementById("scoresModalClose");
const scoresModalBackdrop = document.getElementById("scoresModalBackdrop");
const touchControls = document.getElementById("touchControls");

const GW = 240;
const GH = 360;
const PLAYER_Y = GH - 26;
const PLAYER_W = 24;
const PLAYER_H = 9;
const PLAYER_SPEED = 120;
const BULLET_SPEED = 260;
const ENEMY_BULLET_SPEED = 110;
const INV_COLS = 11;
const INV_ROWS = 5;
const INV_W = 15;
const INV_H = 11;
const INV_GAP_X = 5;
const INV_GAP_Y = 7;
const FORM_START_X = 10;
const FORM_START_Y = 44;

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
  if (scoresModal && !scoresModal.hidden && e.key !== "Escape") return;
  if (e.key === "Escape" && scoresModal && !scoresModal.hidden) {
    e.preventDefault();
    closeScoresModal();
  }
});

/** --- Web Audio (unlocked on first gesture) --- */
let audioCtx = null;

function ensureAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function playTone(freq, dur, type = "square", gain = 0.06) {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playShoot() {
  playTone(880, 0.05, "square", 0.05);
  playTone(440, 0.04, "square", 0.035);
}

function playExplode() {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const dur = 0.14;
  const bufferSize = ac.sampleRate * dur;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, t0);
  filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

function playHiss() {
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime;
  const dur = 0.22;
  const osc = ac.createOscillator();
  const osc2 = ac.createOscillator();
  osc.type = "sawtooth";
  osc2.type = "square";
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(40, t0 + dur);
  osc2.frequency.setValueAtTime(90, t0);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  osc2.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc2.start(t0);
  osc.stop(t0 + dur + 0.02);
  osc2.stop(t0 + dur + 0.02);
}

function playWaveClear() {
  playTone(523, 0.08, "square", 0.055);
  setTimeout(() => playTone(659, 0.1, "square", 0.05), 70);
}

/** --- Particles --- */
let particles = [];

function spawnParticles(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 90;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.2,
      t: 0,
      color,
    });
  }
}

function updateParticles(dt) {
  particles = particles.filter((p) => {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 120 * dt;
    return p.t < p.life;
  });
}

function drawParticles() {
  for (const p of particles) {
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** --- Invader grid & game state --- */
let alive = [];
let formX = FORM_START_X;
let formY = FORM_START_Y;
let dir = 1;
let stepTimer = 0;
let baseStepInterval = 0.55;
let wave = 1;
let playerX = GW / 2;
let keys = { left: false, right: false };
let touchMove = { left: false, right: false };
let playerBullets = [];
let enemyBullets = [];
let enemyFireAcc = 0;
let score = 0;
let lives = 3;
let running = false;
let paused = false;
let gameOver = false;
let lastSubmittedScore = null;
let animT = 0;
let rafId = 0;
let lastTs = 0;

function invaderWorldPos(c, r) {
  const bx = Math.sin(animT * 3 + r * 0.7) * 1.2;
  return {
    x: formX + c * (INV_W + INV_GAP_X) + bx,
    y: formY + r * (INV_H + INV_GAP_Y),
  };
}

function countAlive() {
  let n = 0;
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (alive[r][c]) n++;
    }
  }
  return n;
}

function bottomShooters() {
  const list = [];
  for (let c = 0; c < INV_COLS; c++) {
    for (let r = INV_ROWS - 1; r >= 0; r--) {
      if (alive[r][c]) {
        list.push({ c, r });
        break;
      }
    }
  }
  return list;
}

function minMaxAliveX() {
  let minX = Infinity;
  let maxX = -Infinity;
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (!alive[r][c]) continue;
      const p = invaderWorldPos(c, r);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + INV_W);
    }
  }
  return { minX, maxX };
}

function lowestInvaderY() {
  let y = 0;
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (!alive[r][c]) continue;
      const p = invaderWorldPos(c, r);
      y = Math.max(y, p.y + INV_H);
    }
  }
  return y;
}

function resetFormation() {
  alive = [];
  for (let r = 0; r < INV_ROWS; r++) {
    const row = [];
    for (let c = 0; c < INV_COLS; c++) row.push(true);
    alive.push(row);
  }
  formX = FORM_START_X;
  formY = FORM_START_Y;
  dir = 1;
  stepTimer = 0;
  baseStepInterval = Math.max(0.18, 0.55 - (wave - 1) * 0.045);
  playerBullets = [];
  enemyBullets = [];
  enemyFireAcc = 0;
}

function layoutCanvas() {
  if (!canvasWrap) return;
  const rw = canvasWrap.clientWidth;
  const rh = canvasWrap.clientHeight;
  const s = Math.max(1, Math.floor(Math.min(rw / GW, rh / GH)));
  if (canvas.width !== GW * s || canvas.height !== GH * s) {
    canvas.width = GW * s;
    canvas.height = GH * s;
    scale = s;
  }
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

function setNameRowVisible(visible) {
  if (!nameRow) return;
  nameRow.classList.toggle("hidden", !visible);
}

function livesDisplay() {
  return "♥".repeat(Math.max(0, lives)) + (lives <= 0 ? "" : "");
}

function updateHud() {
  scoreEl.textContent = `SCORE ${String(score).padStart(4, "0")}`;
  waveEl.textContent = `WAVE ${wave}`;
  if (livesEl) livesEl.textContent = livesDisplay();
  if (gameOver) statusEl.textContent = "GAME OVER";
  else if (paused) statusEl.textContent = "PAUSED";
  else if (running) statusEl.textContent = "PLAY";
  else statusEl.textContent = "READY";
}

function reset() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lastTs = 0;
  wave = 1;
  score = 0;
  lives = 3;
  running = false;
  paused = false;
  gameOver = false;
  playerX = GW / 2;
  keys.left = false;
  keys.right = false;
  touchMove.left = false;
  touchMove.right = false;
  particles = [];
  resetFormation();
  submitBtn.disabled = true;
  lastSubmittedScore = null;
  setNameRowVisible(false);
  updateHud();
  updateBoardOverlay();
  draw();
}

function loseLife() {
  lives -= 1;
  playHiss();
  spawnParticles(playerX, PLAYER_Y + PLAYER_H / 2, 14, "#5ecf5e");
  playerBullets = [];
  if (lives <= 0) {
    endGame();
    return;
  }
  enemyBullets = [];
  playerX = GW / 2;
  updateHud();
}

function endGame() {
  gameOver = true;
  running = false;
  updateHud();
  setNameRowVisible(true);
  submitBtn.disabled = score <= 0 || lastSubmittedScore === score;
  updateBoardOverlay();
}

function start() {
  if (running && !gameOver) return;
  if (gameOver) return;
  ensureAudio();
  running = true;
  paused = false;
  updateHud();
  updateBoardOverlay();
  lastTs = 0;
  if (!rafId) rafId = requestAnimationFrame(loop);
}

function resumeFromPause() {
  if (!running || gameOver || !paused) return;
  paused = false;
  updateHud();
  updateBoardOverlay();
}

function togglePause() {
  if (!running || gameOver) return;
  paused = !paused;
  updateHud();
  updateBoardOverlay();
}

function handleOverlayAction() {
  ensureAudio();
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

function firePlayer() {
  if (!running || paused || gameOver) return;
  if (playerBullets.length >= 1) return;
  playerBullets.push({ x: playerX, y: PLAYER_Y - 4 });
  playShoot();
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function killInvader(c, r) {
  if (!alive[r][c]) return;
  alive[r][c] = false;
  const p = invaderWorldPos(c, r);
  score += 20 + (INV_ROWS - 1 - r) * 4;
  playExplode();
  spawnParticles(p.x + INV_W / 2, p.y + INV_H / 2, 10, "#3d8c3d");
  spawnParticles(p.x + INV_W / 2, p.y + INV_H / 2, 6, "#111811");
  if (countAlive() === 0) {
    wave += 1;
    playWaveClear();
    resetFormation();
  }
  const n = countAlive();
  if (n > 0) baseStepInterval = Math.max(0.12, 0.55 - (wave - 1) * 0.045 - (55 - n) * 0.004);
}

function tick(dt) {
  if (!running || paused || gameOver) return;
  animT += dt;

  const moveL = keys.left || touchMove.left;
  const moveR = keys.right || touchMove.right;
  if (moveL && !moveR) playerX -= PLAYER_SPEED * dt;
  if (moveR && !moveL) playerX += PLAYER_SPEED * dt;
  playerX = Math.max(PLAYER_W / 2 + 2, Math.min(GW - PLAYER_W / 2 - 2, playerX));

  stepTimer += dt;
  const interval = baseStepInterval;
  if (stepTimer >= interval && countAlive() > 0) {
    stepTimer = 0;
    const step = 4 * dir;
    formX += step;
    const { minX, maxX } = minMaxAliveX();
    const margin = 6;
    if ((dir > 0 && maxX >= GW - margin) || (dir < 0 && minX <= margin)) {
      formX -= step;
      dir *= -1;
      formY += 8;
    }
  }

  if (lowestInvaderY() >= PLAYER_Y - 4) {
    endGame();
    playHiss();
    return;
  }

  for (let i = playerBullets.length - 1; i >= 0; i--) {
    const b = playerBullets[i];
    b.y -= BULLET_SPEED * dt;
    if (b.y < 0) {
      playerBullets.splice(i, 1);
      continue;
    }
    let hit = false;
    for (let r = 0; r < INV_ROWS && !hit; r++) {
      for (let c = 0; c < INV_COLS && !hit; c++) {
        if (!alive[r][c]) continue;
        const p = invaderWorldPos(c, r);
        if (rectsOverlap(b.x - 1, b.y - 4, 2, 6, p.x, p.y, INV_W, INV_H)) {
          killInvader(c, r);
          playerBullets.splice(i, 1);
          hit = true;
        }
      }
    }
  }

  enemyFireAcc += dt;
  const fireEvery = Math.max(0.35, 1.1 - wave * 0.06);
  if (enemyFireAcc >= fireEvery && countAlive() > 0) {
    enemyFireAcc = 0;
    const shooters = bottomShooters();
    if (shooters.length) {
      const pick = shooters[Math.floor(Math.random() * shooters.length)];
      const p = invaderWorldPos(pick.c, pick.r);
      enemyBullets.push({ x: p.x + INV_W / 2, y: p.y + INV_H });
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.y += ENEMY_BULLET_SPEED * dt;
    if (b.y > GH) {
      enemyBullets.splice(i, 1);
      continue;
    }
    if (
      rectsOverlap(
        b.x - 1.5,
        b.y - 2,
        3,
        6,
        playerX - PLAYER_W / 2,
        PLAYER_Y,
        PLAYER_W,
        PLAYER_H
      )
    ) {
      enemyBullets.splice(i, 1);
      loseLife();
    }
  }

  updateHud();
}

function drawCreeperFace(px, py, w, h) {
  const pad = 2;
  const x0 = px + pad;
  const y0 = py + pad;
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const u = cw / 8;
  const v = ch / 8;
  ctx.fillStyle = "#2f8f2f";
  ctx.fillRect(px, py, w, h);
  ctx.fillStyle = "#1a1c1a";
  const cells = [
    [2, 2],
    [3, 2],
    [5, 2],
    [6, 2],
    [2, 3],
    [3, 3],
    [5, 3],
    [6, 3],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 5],
    [6, 5],
  ];
  for (const [cx, cy] of cells) {
    ctx.fillRect(x0 + cx * u, y0 + cy * v, Math.ceil(u), Math.ceil(v));
  }
  ctx.fillStyle = "#e84a5f";
  const mx = Math.sin(animT * 4) * 0.4;
  ctx.fillRect(x0 + (3.2 + mx) * u, y0 + 4.2 * v, u * 1.6, v * 0.55);
}

function drawPlayer() {
  const x = playerX - PLAYER_W / 2;
  const thrust = (keys.left || touchMove.left || keys.right || touchMove.right) && running && !paused;
  ctx.fillStyle = thrust ? "#7ae07a" : "#5ecf5e";
  ctx.fillRect(x, PLAYER_Y, PLAYER_W, PLAYER_H);
  ctx.fillStyle = "#0a100c";
  ctx.fillRect(x + 4, PLAYER_Y + 2, 4, 3);
  ctx.fillRect(x + PLAYER_W - 8, PLAYER_Y + 2, 4, 3);
  ctx.fillStyle = "#3a523a";
  ctx.fillRect(x + PLAYER_W / 2 - 2, PLAYER_Y - 3, 4, 4);
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#1a2332";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const g = ctx.createLinearGradient(0, 0, 0, GH);
  g.addColorStop(0, "#1e2a38");
  g.addColorStop(1, "#0f141c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GW, GH);

  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)";
    ctx.fillRect((i * 37) % GW, (i * 53 + animT * 8) % GH, 1, 1);
  }

  ctx.strokeStyle = "rgba(94, 207, 94, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, PLAYER_Y + PLAYER_H + 6);
  ctx.lineTo(GW, PLAYER_Y + PLAYER_H + 6);
  ctx.stroke();

  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (!alive[r][c]) continue;
      const p = invaderWorldPos(c, r);
      drawCreeperFace(p.x, p.y, INV_W, INV_H);
    }
  }

  ctx.fillStyle = "#e8c84a";
  for (const b of playerBullets) {
    ctx.fillRect(b.x - 1, b.y - 4, 2, 6);
  }

  ctx.fillStyle = "#ff6b7a";
  for (const b of enemyBullets) {
    ctx.fillRect(b.x - 1.5, b.y - 2, 3, 6);
  }

  drawPlayer();
  drawParticles();
}

function loop(ts) {
  rafId = requestAnimationFrame(loop);
  if (!lastTs) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (dt > 0.1) dt = 0.1;
  updateParticles(dt);
  tick(dt);
  draw();
}

document.addEventListener("keydown", (e) => {
  if (scoresModal && !scoresModal.hidden && e.key !== "Escape") return;

  if (e.key === " " || e.code === "Space") {
    const overlayUp = boardOverlay && boardOverlay.getAttribute("aria-hidden") === "false";
    if (overlayUp) {
      e.preventDefault();
      handleOverlayAction();
      return;
    }
    e.preventDefault();
    firePlayer();
    return;
  }

  const k = e.key;
  if (k === "ArrowLeft") keys.left = true;
  else if (k === "ArrowRight") keys.right = true;
  else if (k === "p" || k === "P") togglePause();
  else if (k === "r" || k === "R") reset();
  else return;
  e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") keys.left = false;
  if (e.key === "ArrowRight") keys.right = false;
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
      li.textContent = `${i + 1}. ${row.playerName} — ${row.score}`;
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

touchFire?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ensureAudio();
  const overlayUp = boardOverlay && boardOverlay.getAttribute("aria-hidden") === "false";
  if (overlayUp) {
    handleOverlayAction();
    return;
  }
  firePlayer();
});

function bindHoldDir(btn, dir) {
  if (!btn) return;
  const start = (e) => {
    e.preventDefault();
    ensureAudio();
    if (dir === "left") touchMove.left = true;
    else touchMove.right = true;
  };
  const end = () => {
    if (dir === "left") touchMove.left = false;
    else touchMove.right = false;
  };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", end);
  btn.addEventListener("pointercancel", end);
  btn.addEventListener("pointerleave", end);
}

const leftBtn = touchControls?.querySelector('[data-dir="left"]');
const rightBtn = touchControls?.querySelector('[data-dir="right"]');
bindHoldDir(leftBtn, "left");
bindHoldDir(rightBtn, "right");

touchPause?.addEventListener("click", () => togglePause());
touchRestart?.addEventListener("click", () => reset());

const ro = new ResizeObserver(() => {
  layoutCanvas();
  draw();
});
if (canvasWrap) ro.observe(canvasWrap);
window.addEventListener("load", () => {
  layoutCanvas();
  reset();
});
layoutCanvas();
reset();
