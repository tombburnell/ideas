import * as PIXI from "pixi.js";
import RAPIER from "@dimforge/rapier2d-compat";

type SoundKey = "bumper" | "lane" | "drain" | "launch";
type ColliderTag =
  | { type: "bumper"; points: number }
  | { type: "lane"; points: number }
  | { type: "drain" }
  | { type: "slingshot"; points: number }
  | { type: "ball" };

const VIRTUAL_WIDTH = 620;
const VIRTUAL_HEIGHT = 1000;
const BALL_RADIUS = 13;
const BASE_BALLS = 3;
const EXTRA_BALL_THRESHOLDS = [1500, 3500];
const FIXED_STEP = 1 / 60;
const PLAYFIELD_LEFT = 82;
const PLAYFIELD_RIGHT = 520;
const LAUNCH_LANE_LEFT = PLAYFIELD_RIGHT;
const LAUNCH_LANE_RIGHT = 578;
const LAUNCH_LANE_CENTER = 549;
const LAUNCH_REST_Y = 900;
const LAUNCH_EXIT_Y = 320;
const TOP_ARC_Y = 132;
const TOP_LEFT_ARC_X = 152;
const TOP_RIGHT_ARC_X = 448;
const LANE_OUTER_WALL_X = 578;
const LANE_JOIN_Y = 132;

const scoreEl = document.getElementById("score") as HTMLElement;
const ballsEl = document.getElementById("balls") as HTMLElement;
const highScoreEl = document.getElementById("highScore") as HTMLElement;
const overlay = document.getElementById("boardOverlay") as HTMLElement;
const overlayMessage = document.getElementById("overlayMessage") as HTMLElement;
const overlayActionBtn = document.getElementById("overlayActionBtn") as HTMLButtonElement;
const gameWrap = document.getElementById("gameWrap") as HTMLElement;
const leftBtn = document.getElementById("leftBtn") as HTMLButtonElement;
const rightBtn = document.getElementById("rightBtn") as HTMLButtonElement;
const launchBtn = document.getElementById("launchBtn") as HTMLButtonElement;
const nameRow = document.getElementById("nameRow") as HTMLElement;
const nameInput = document.getElementById("playerName") as HTMLInputElement;
const submitBtn = document.getElementById("submitScore") as HTMLButtonElement;
const leaderboardEl = document.getElementById("leaderboard") as HTMLOListElement;
const scoresErrorEl = document.getElementById("scoresError") as HTMLElement;
const scoresModal = document.getElementById("scoresModal") as HTMLElement;
const openScoresBtn = document.getElementById("openScoresBtn") as HTMLButtonElement;
const scoresModalClose = document.getElementById("scoresModalClose") as HTMLButtonElement;
const scoresModalBackdrop = document.getElementById("scoresModalBackdrop") as HTMLButtonElement;
const helpModal = document.getElementById("helpModal") as HTMLElement;
const openHelpBtn = document.getElementById("openHelpBtn") as HTMLButtonElement;
const helpModalClose = document.getElementById("helpModalClose") as HTMLButtonElement;
const helpModalBackdrop = document.getElementById("helpModalBackdrop") as HTMLButtonElement;

const app = new PIXI.Application();
await app.init({ backgroundAlpha: 0, antialias: true, resizeTo: gameWrap });
app.stage.eventMode = "static";
gameWrap.appendChild(app.canvas);

await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: 1800 });
const eventQueue = new RAPIER.EventQueue(true);
const colliderTags = new Map<number, ColliderTag>();
const ballGraphic = new PIXI.Graphics();
const leftFlipperGraphic = new PIXI.Graphics();
const rightFlipperGraphic = new PIXI.Graphics();
const tableLayer = new PIXI.Container();
const dynamicLayer = new PIXI.Container();
const fxLayer = new PIXI.Container();
app.stage.addChild(tableLayer, dynamicLayer, fxLayer);
dynamicLayer.addChild(ballGraphic, leftFlipperGraphic, rightFlipperGraphic);

const sounds: Record<SoundKey, HTMLAudioElement[]> = {
  bumper: [new Audio("/assets/homer.ogg"), new Audio("/assets/bart.ogg")],
  lane: [new Audio("/assets/bart.ogg")],
  drain: [new Audio("/assets/doh.mp3")],
  launch: [new Audio("/assets/homer.ogg")],
};
for (const list of Object.values(sounds)) {
  for (const audio of list) {
    audio.preload = "auto";
    audio.volume = 0.55;
  }
}
sounds.drain[0].volume = 0.75;

const leftFlipperPivot = { x: 202, y: 860 };
const rightFlipperPivot = { x: 418, y: 860 };
const FLIPPER_HALF_LENGTH = 56;
const FLIPPER_HALF_THICKNESS = 12;
const leftFlipperRest = 0.68;
const leftFlipperActive = -0.18;
const rightFlipperRest = -0.68;
const rightFlipperActive = 0.18;
const leftFlipperBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(leftFlipperPivot.x, leftFlipperPivot.y)
);
const rightFlipperBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(rightFlipperPivot.x, rightFlipperPivot.y)
);
leftFlipperBody.setRotation(leftFlipperRest, true);
rightFlipperBody.setRotation(rightFlipperRest, true);
world.createCollider(
  RAPIER.ColliderDesc.cuboid(FLIPPER_HALF_LENGTH, FLIPPER_HALF_THICKNESS)
    .setTranslation(FLIPPER_HALF_LENGTH, 0)
    .setRestitution(0.15)
    .setFriction(0.05),
  leftFlipperBody
);
world.createCollider(
  RAPIER.ColliderDesc.cuboid(FLIPPER_HALF_LENGTH, FLIPPER_HALF_THICKNESS)
    .setTranslation(-FLIPPER_HALF_LENGTH, 0)
    .setRestitution(0.15)
    .setFriction(0.05),
  rightFlipperBody
);

let score = 0;
let highScore = 0;
let ballsRemaining = BASE_BALLS;
let awardedExtraBalls = 0;
let running = false;
let gameOver = false;
let ballInLauncher = true;
let unlockedAudio = false;
let lastSubmittedScore: number | null = null;
let leftPressed = false;
let rightPressed = false;
let accumulator = 0;
let lastFrame = performance.now();
let drainPending = false;
let leftLaneLit = false;
let rightLaneLit = false;
let ballInProtectedLaunchLane = false;
let ballBody = createBall(true);
const laneHandles: number[] = [];

function playSound(key: SoundKey) {
  if (!unlockedAudio) return;
  const list = sounds[key];
  const audio = list[Math.floor(Math.random() * list.length)];
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

function unlockAudio() {
  if (unlockedAudio) return;
  unlockedAudio = true;
  for (const audio of Object.values(sounds).flat()) {
    audio.muted = true;
    void audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => {
      audio.muted = false;
    });
  }
}

function addStaticSegment(a: [number, number], b: [number, number], restitution = 0.35, friction = 0.1) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(
    RAPIER.ColliderDesc.segment({ x: a[0], y: a[1] }, { x: b[0], y: b[1] })
      .setRestitution(restitution)
      .setFriction(friction),
    body
  );
}

function addBumper(x: number, y: number, radius: number, points: number) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(radius)
      .setRestitution(1.24)
      .setFriction(0)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );
  colliderTags.set(collider.handle, { type: "bumper", points });
  return { x, y, radius };
}

function addSensorRect(x: number, y: number, hw: number, hh: number, tag: ColliderTag) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(hw, hh)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );
  colliderTags.set(collider.handle, tag);
  return collider.handle;
}

function addSensorBall(x: number, y: number, radius: number, tag: ColliderTag) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(radius)
      .setSensor(true)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );
  colliderTags.set(collider.handle, tag);
  return collider.handle;
}

const bumpers = [
  addBumper(200, 325, 34, 125),
  addBumper(310, 250, 36, 150),
  addBumper(420, 335, 34, 125),
];

addStaticSegment([140, 112], [TOP_LEFT_ARC_X, TOP_ARC_Y], 0.45);
addStaticSegment([TOP_LEFT_ARC_X, TOP_ARC_Y], [PLAYFIELD_LEFT, 212], 0.45);
addStaticSegment([PLAYFIELD_LEFT, 198], [PLAYFIELD_LEFT, 704], 0.22);
addStaticSegment([PLAYFIELD_LEFT, 704], [142, 828], 0.2);
addStaticSegment([142, 828], [194, 902], 0.18);

addStaticSegment([146, 110], [200, 92], 0.45);
addStaticSegment([200, 92], [320, 78], 0.45);
addStaticSegment([320, 78], [430, 92], 0.45);
addStaticSegment([430, 92], [LANE_OUTER_WALL_X, LANE_JOIN_Y], 0.45);
addStaticSegment([PLAYFIELD_RIGHT, LAUNCH_EXIT_Y], [PLAYFIELD_RIGHT, 684], 0.22);
addStaticSegment([PLAYFIELD_RIGHT, 684], [450, 818], 0.2);
addStaticSegment([450, 818], [406, 902], 0.18);

addStaticSegment([LANE_OUTER_WALL_X, LANE_JOIN_Y], [LANE_OUTER_WALL_X, 930], 0.2);

addStaticSegment([96, 724], [196, 784], 0.36, 0.06);
addStaticSegment([512, 724], [412, 784], 0.36, 0.06);
addStaticSegment([126, 932], [210, 892], 0.15);
addStaticSegment([482, 932], [398, 892], 0.15);

addSensorRect(310, 938, 102, 20, { type: "drain" });
laneHandles.push(addSensorRect(150, 212, 42, 16, { type: "lane", points: 150 }));
laneHandles.push(addSensorRect(470, 212, 42, 16, { type: "lane", points: 150 }));
function createBall(inLauncher: boolean) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(inLauncher ? LAUNCH_LANE_CENTER : 458, inLauncher ? LAUNCH_REST_Y : 205)
      .setLinearDamping(0.12)
      .setAngularDamping(0.2)
      .setCcdEnabled(true)
  );
  const collider = world.createCollider(
    RAPIER.ColliderDesc.ball(BALL_RADIUS)
      .setDensity(0.8)
      .setRestitution(0.72)
      .setFriction(0.02)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );
  colliderTags.set(collider.handle, { type: "ball" });
  return body;
}

function replaceBall(inLauncher: boolean) {
  const existing = ballBody.collider(0);
  if (existing) colliderTags.delete(existing.handle);
  world.removeRigidBody(ballBody);
  ballBody = createBall(inLauncher);
  ballInLauncher = inLauncher;
  ballInProtectedLaunchLane = false;
  drainPending = false;
}

function updateHud() {
  scoreEl.textContent = String(score);
  ballsEl.textContent = String(ballsRemaining);
  highScoreEl.textContent = String(highScore);
}

function setNameRowVisible(visible: boolean) {
  nameRow.classList.toggle("hidden", !visible);
  if (visible) nameInput.focus();
}

function updateOverlay() {
  if (running && !gameOver) {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  if (gameOver) {
    overlayActionBtn.textContent = "Play again";
    overlayMessage.textContent = `Game over. Springfield score: ${score}.`;
  } else if (ballInLauncher) {
    overlayActionBtn.textContent = running ? "Launch ball" : "Start game";
    overlayMessage.textContent = "Tap launch to send the ball into Springfield.";
  } else {
    overlayActionBtn.textContent = "Resume";
    overlayMessage.textContent = "Keep the ball alive and chase extra balls.";
  }
}

function triggerBurst(color: number, x: number, y: number) {
  const burst = new PIXI.Graphics();
  burst.circle(0, 0, 24).stroke({ color, width: 7, alpha: 0.8 });
  burst.position.set(x, y);
  fxLayer.addChild(burst);
  const started = performance.now();
  const tick = () => {
    const elapsed = (performance.now() - started) / 260;
    burst.scale.set(1 + elapsed * 1.8);
    burst.alpha = Math.max(0, 1 - elapsed);
    if (elapsed >= 1) {
      app.ticker.remove(tick);
      burst.destroy();
      return;
    }
  };
  app.ticker.add(tick);
}

function awardPoints(points: number) {
  score += points;
  highScore = Math.max(highScore, score);
  for (let i = awardedExtraBalls; i < EXTRA_BALL_THRESHOLDS.length; i += 1) {
    if (score >= EXTRA_BALL_THRESHOLDS[i]) {
      ballsRemaining += 1;
      awardedExtraBalls += 1;
      triggerBurst(i % 2 === 0 ? 0xff62cc : 0x73e5ff, 310, 330);
    }
  }
  updateHud();
}

function launchBall() {
  if (!running) {
    running = true;
  }
  if (!ballInLauncher) return;
  ballBody.setTranslation({ x: LAUNCH_LANE_CENTER, y: LAUNCH_REST_Y }, true);
  ballBody.setLinvel({ x: 0, y: -3200 }, true);
  ballInLauncher = false;
  ballInProtectedLaunchLane = true;
  updateOverlay();
  playSound("launch");
}

function drainBall() {
  if (drainPending) return;
  drainPending = true;
  playSound("drain");
  ballsRemaining -= 1;
  updateHud();
  if (ballsRemaining <= 0) {
    running = false;
    gameOver = true;
    setNameRowVisible(true);
    submitBtn.disabled = score <= 0 || lastSubmittedScore === score;
    updateOverlay();
    return;
  }
  window.setTimeout(() => {
    replaceBall(true);
    running = true;
    updateOverlay();
  }, 900);
}

function handleCollision(tag: ColliderTag, handle: number) {
  const pos = ballBody.translation();
  if (tag.type === "bumper") {
    awardPoints(tag.points);
    const direction = pos.x < VIRTUAL_WIDTH / 2 ? -1 : 1;
    ballBody.applyImpulse({ x: direction * 160, y: -140 }, true);
    triggerBurst(0xff62cc, pos.x, pos.y);
    playSound("bumper");
    return;
  }
  if (tag.type === "slingshot") {
    awardPoints(tag.points);
    const direction = pos.x < VIRTUAL_WIDTH / 2 ? 1 : -1;
    ballBody.applyImpulse({ x: direction * 160, y: -160 }, true);
    playSound("lane");
    return;
  }
  if (tag.type === "lane") {
    awardPoints(tag.points);
    if (handle === laneHandles[0]) leftLaneLit = true;
    if (handle === laneHandles[1]) rightLaneLit = true;
    drawTable();
    playSound("lane");
    return;
  }
  if (tag.type === "drain") {
    drainBall();
  }
}

function stepPhysics(deltaMs: number) {
  accumulator += deltaMs / 1000;
  while (accumulator >= FIXED_STEP) {
    accumulator -= FIXED_STEP;
    leftFlipperBody.setNextKinematicRotation(leftPressed ? leftFlipperActive : leftFlipperRest);
    rightFlipperBody.setNextKinematicRotation(rightPressed ? rightFlipperActive : rightFlipperRest);
    world.step(eventQueue);
    eventQueue.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const tag1 = colliderTags.get(h1);
      const tag2 = colliderTags.get(h2);
      if (tag1?.type === "ball" && tag2) handleCollision(tag2, h2);
      if (tag2?.type === "ball" && tag1) handleCollision(tag1, h1);
    });
    const pos = ballBody.translation();
    if (ballInLauncher) {
      ballBody.setTranslation({ x: LAUNCH_LANE_CENTER, y: LAUNCH_REST_Y }, true);
      ballBody.setLinvel({ x: 0, y: 0 }, true);
      ballBody.setAngvel(0, true);
    }
    if (ballInProtectedLaunchLane) {
      const currentVel = ballBody.linvel();
      if (pos.y > LAUNCH_EXIT_Y) {
        ballBody.setTranslation({ x: LAUNCH_LANE_CENTER, y: pos.y }, true);
        ballBody.setLinvel({ x: 0, y: Math.min(currentVel.y, -3000) }, true);
      } else {
        ballInProtectedLaunchLane = false;
        ballBody.setTranslation({ x: LAUNCH_LANE_CENTER, y: pos.y }, true);
        ballBody.setLinvel({ x: -220, y: Math.min(currentVel.y, -2750) }, true);
      }
      ballBody.setAngvel(0, true);
    }
    if (!ballInLauncher && pos.y > VIRTUAL_HEIGHT + 100) {
      drainBall();
    }
  }
}

function drawFlipper(graphic: PIXI.Graphics, x: number, y: number, rotation: number, isLeft: boolean) {
  graphic.clear();
  graphic.position.set(x, y);
  graphic.rotation = rotation;
  graphic.roundRect(isLeft ? 0 : -116, -14, 116, 28, 14).fill({ color: isLeft ? 0xff62cc : 0x73e5ff }).stroke({ color: 0xffffff, width: 4 });
  graphic.circle(0, 0, 18).fill({ color: 0xffffff }).stroke({ color: 0x37416e, width: 4 });
}

function makeLight(x: number, y: number, lit: boolean) {
  const g = new PIXI.Graphics();
  g.circle(x, y, 20).fill({ color: lit ? 0xff62cd : 0xffffff, alpha: lit ? 1 : 0.35 }).stroke({ color: 0x37416e, width: 3 });
  return g;
}

function drawStar(g: PIXI.Graphics, x: number, y: number, r1: number, r2: number, points: number, color: number) {
  const step = Math.PI / points;
  g.moveTo(x, y - r1);
  for (let i = 1; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? r1 : r2;
    const angle = -Math.PI / 2 + i * step;
    g.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  g.closePath();
  g.fill({ color });
}

function drawTable() {
  tableLayer.removeChildren();
  const bg = new PIXI.Graphics();
  bg.roundRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT, 28).fill({ color: 0x84d8ff });
  bg.rect(0, 0, VIRTUAL_WIDTH, 210).fill({ color: 0x8edaff });
  bg.rect(0, 210, VIRTUAL_WIDTH, 790).fill({ color: 0xf2c72f });
  bg.roundRect(70, 78, 478, 870, 36).stroke({ color: 0xffffff, width: 10, alpha: 0.5 });
  bg.roundRect(PLAYFIELD_LEFT, 96, PLAYFIELD_RIGHT - PLAYFIELD_LEFT, 832, 28)
    .fill({ color: 0xf6d558, alpha: 0.35 });
  bg.roundRect(LAUNCH_LANE_LEFT, LAUNCH_EXIT_Y - 18, LAUNCH_LANE_RIGHT - LAUNCH_LANE_LEFT, 948 - LAUNCH_EXIT_Y, 22)
    .fill({ color: 0x9ee7ff, alpha: 0.62 })
    .stroke({ color: 0xffffff, width: 4, alpha: 0.85 });
  tableLayer.addChild(bg);

  const logoBackdrop = new PIXI.Graphics();
  logoBackdrop.roundRect(118, 612, 384, 126, 62).fill({ color: 0xffffff, alpha: 0.22 });
  logoBackdrop.roundRect(132, 624, 356, 102, 52).fill({ color: 0x8edaff, alpha: 0.16 });
  tableLayer.addChild(logoBackdrop);

  const logo = PIXI.Sprite.from("/assets/simpsons-logo.svg");
  logo.anchor.set(0.5);
  logo.position.set(310, 674);
  logo.width = 408;
  logo.height = 162;
  logo.alpha = 0.72;
  tableLayer.addChild(logo);

  const lanePanel = new PIXI.Graphics();
  lanePanel.roundRect(118, 138, 332, 72, 28).fill({ color: 0xfff5cb }).stroke({ color: 0x37416e, width: 4 });
  lanePanel.roundRect(LAUNCH_LANE_LEFT + 6, LAUNCH_EXIT_Y - 10, 48, 140, 20).fill({ color: 0xffffff, alpha: 0.16 });
  tableLayer.addChild(lanePanel, makeLight(150, 212, leftLaneLit), makeLight(470, 212, rightLaneLit));

  const chalkboard = new PIXI.Graphics();
  chalkboard.roundRect(122, 118, 180, 76, 18).fill({ color: 0x2c4438 }).stroke({ color: 0xf4e8a0, width: 4 });
  chalkboard.circle(154, 144, 6).fill({ color: 0xff6ec9 });
  chalkboard.circle(270, 144, 6).fill({ color: 0xff6ec9 });
  const chalkText = new PIXI.Text({
    text: "I WILL NOT\nTILT THE TABLE",
    style: { fontFamily: "Arial", fontSize: 24, fontWeight: "800", fill: 0xffffff, align: "center" },
  });
  chalkText.position.set(144, 132);
  tableLayer.addChild(chalkboard, chalkText);

  const cloud = new PIXI.Graphics();
  cloud.circle(358, 147, 24).fill({ color: 0xffffff, alpha: 0.92 });
  cloud.circle(390, 138, 32).fill({ color: 0xffffff, alpha: 0.92 });
  cloud.circle(422, 148, 22).fill({ color: 0xffffff, alpha: 0.92 });
  cloud.roundRect(354, 147, 82, 28, 14).fill({ color: 0xffffff, alpha: 0.92 });
  tableLayer.addChild(cloud);

  const donut = new PIXI.Graphics();
  donut.circle(154, 416, 44).fill({ color: 0xff8bd5 });
  donut.circle(154, 416, 18).fill({ color: 0xf5c529 });
  for (const sprinkle of [
    { x: 144, y: 394, color: 0x9b61ff },
    { x: 171, y: 398, color: 0x7df2ff },
    { x: 177, y: 421, color: 0xfff772 },
    { x: 142, y: 437, color: 0x7df29a },
  ]) {
    donut.roundRect(sprinkle.x, sprinkle.y, 16, 5, 3).fill({ color: sprinkle.color });
  }
  tableLayer.addChild(donut);

  const tv = new PIXI.Graphics();
  tv.roundRect(350, 396, 104, 80, 18).fill({ color: 0x7b5fff, alpha: 0.94 }).stroke({ color: 0xffffff, width: 5 });
  tv.roundRect(364, 410, 76, 44, 10).fill({ color: 0xc4ff95 }).stroke({ color: 0x37416e, width: 4 });
  tv.rect(384, 474, 36, 10).fill({ color: 0x37416e });
  tv.rect(374, 482, 56, 8).fill({ color: 0xffffff, alpha: 0.7 });
  tableLayer.addChild(tv);

  const upperLabel = new PIXI.Text({
    text: "SPRINGFIELD ELEMENTARY",
    style: { fontFamily: "Arial", fontSize: 26, fontWeight: "900", fill: 0x26305d },
  });
  upperLabel.position.set(124, 84);
  const launcherText = new PIXI.Text({
    text: "PLUNGER LANE",
    style: { fontFamily: "Arial", fontSize: 20, fontWeight: "900", fill: 0xffffff },
  });
  launcherText.rotation = Math.PI / 2;
  launcherText.position.set(582, 360);
  const centerCaption = new PIXI.Text({
    text: "FLIP IT BACK TO\nSPRINGFIELD",
    style: { fontFamily: "Arial", fontSize: 31, fontWeight: "900", fill: 0x25325d, align: "center" },
  });
  centerCaption.anchor.set(0.5);
  centerCaption.position.set(292, 584);
  tableLayer.addChild(upperLabel, launcherText, centerCaption);

  const stars = new PIXI.Graphics();
  drawStar(stars, 164, 564, 22, 10, 5, 0xff66cc);
  drawStar(stars, 454, 574, 24, 11, 5, 0x6be5ff);
  tableLayer.addChild(stars);

  const rails = new PIXI.Graphics();
  rails.moveTo(140, 112).quadraticCurveTo(TOP_LEFT_ARC_X, TOP_ARC_Y, PLAYFIELD_LEFT, 212);
  rails.moveTo(146, 110)
    .quadraticCurveTo(220, 88, 320, 78)
    .quadraticCurveTo(430, 90, LANE_OUTER_WALL_X, LANE_JOIN_Y);
  rails.moveTo(LANE_OUTER_WALL_X, LANE_JOIN_Y).lineTo(LANE_OUTER_WALL_X, 930);
  rails.moveTo(PLAYFIELD_RIGHT, LAUNCH_EXIT_Y).lineTo(PLAYFIELD_RIGHT, 684).lineTo(462, 818).lineTo(418, 902);
  rails.moveTo(96, 724).lineTo(196, 784).lineTo(142, 828);
  rails.moveTo(524, 724).lineTo(424, 784).lineTo(462, 818);
  rails.moveTo(126, 932).lineTo(210, 892);
  rails.moveTo(494, 932).lineTo(410, 892);
  rails.stroke({ color: 0xffffff, width: 8, alpha: 0.85, cap: "round", join: "round" });
  tableLayer.addChild(rails);

  const arenaOutline = new PIXI.Graphics();
  arenaOutline.moveTo(PLAYFIELD_LEFT, 212)
    .lineTo(PLAYFIELD_LEFT, 704)
    .lineTo(142, 828)
    .lineTo(194, 902)
    .lineTo(418, 902)
    .lineTo(462, 818)
    .lineTo(PLAYFIELD_RIGHT, 684)
    .lineTo(PLAYFIELD_RIGHT, LAUNCH_EXIT_Y);
  arenaOutline.stroke({ color: 0x20274a, width: 6, alpha: 0.38, cap: "round", join: "round" });
  tableLayer.addChild(arenaOutline);

  for (const bumper of bumpers) {
    const ring = new PIXI.Graphics();
    ring.circle(bumper.x, bumper.y, bumper.radius + 12).fill({ color: 0xffffff, alpha: 0.28 });
    ring.circle(bumper.x, bumper.y, bumper.radius).fill({ color: 0xff74d8 }).stroke({ color: 0xffffff, width: 6 });
    ring.circle(bumper.x, bumper.y, 12).fill({ color: 0xffea62 });
    tableLayer.addChild(ring);
  }

  const slings = new PIXI.Graphics();
  slings.poly([96, 724, 196, 784, 142, 828]).fill({ color: 0xff6db6, alpha: 0.82 }).stroke({ color: 0xffffff, width: 4 });
  slings.poly([524, 724, 424, 784, 462, 818]).fill({ color: 0x80f2ff, alpha: 0.82 }).stroke({ color: 0xffffff, width: 4 });
  tableLayer.addChild(slings);
}

function syncDrawables() {
  const ballPos = ballBody.translation();
  ballGraphic.clear();
  ballGraphic.circle(ballPos.x + 2, ballPos.y + 3, BALL_RADIUS + 1).fill({ color: 0x5f687f, alpha: 0.24 });
  ballGraphic.circle(ballPos.x, ballPos.y, BALL_RADIUS).fill({ color: 0xd4dae2 }).stroke({ color: 0x697389, width: 4 });
  ballGraphic.circle(ballPos.x - 3, ballPos.y - 4, BALL_RADIUS * 0.62).fill({ color: 0xf8fbff, alpha: 0.85 });
  ballGraphic.circle(ballPos.x - 5, ballPos.y - 6, 4).fill({ color: 0xffffff, alpha: 0.98 });
  drawFlipper(leftFlipperGraphic, leftFlipperPivot.x, leftFlipperPivot.y, leftFlipperBody.rotation(), true);
  drawFlipper(rightFlipperGraphic, rightFlipperPivot.x, rightFlipperPivot.y, rightFlipperBody.rotation(), false);
}

function resizeScene() {
  const { width, height } = gameWrap.getBoundingClientRect();
  app.renderer.resize(width, height);
  const scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
  app.stage.scale.set(scale);
  app.stage.position.set((width - VIRTUAL_WIDTH * scale) / 2, (height - VIRTUAL_HEIGHT * scale) / 2);
  drawTable();
  syncDrawables();
}
new ResizeObserver(resizeScene).observe(gameWrap);
resizeScene();

function resetGame() {
  score = 0;
  ballsRemaining = BASE_BALLS;
  awardedExtraBalls = 0;
  leftLaneLit = false;
  rightLaneLit = false;
  running = false;
  gameOver = false;
  lastSubmittedScore = null;
  replaceBall(true);
  updateHud();
  setNameRowVisible(false);
  drawTable();
  updateOverlay();
}

function animate(now: number) {
  const delta = Math.min(32, now - lastFrame);
  lastFrame = now;
  if (running) stepPhysics(delta);
  syncDrawables();
  requestAnimationFrame(animate);
}

function setButtonVisual(button: HTMLButtonElement, pressed: boolean) {
  button.style.transform = pressed ? "translateY(3px) scale(0.98)" : "";
}

function bindFlipperButton(button: HTMLButtonElement, setter: (value: boolean) => void) {
  const down = (event: Event) => {
    event.preventDefault();
    unlockAudio();
    setter(true);
    setButtonVisual(button, true);
  };
  const up = (event: Event) => {
    event.preventDefault();
    setter(false);
    setButtonVisual(button, false);
  };
  button.addEventListener("pointerdown", down);
  button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up);
  button.addEventListener("pointerleave", up);
}

bindFlipperButton(leftBtn, (value) => {
  leftPressed = value;
});
bindFlipperButton(rightBtn, (value) => {
  rightPressed = value;
});

launchBtn.addEventListener("click", (event) => {
  event.preventDefault();
  unlockAudio();
  launchBall();
});

overlayActionBtn.addEventListener("click", (event) => {
  event.preventDefault();
  unlockAudio();
  if (gameOver) resetGame();
  if (ballInLauncher) launchBall();
  updateOverlay();
});

document.addEventListener("keydown", (event) => {
  unlockAudio();
  if (event.key === "a" || event.key === "ArrowLeft") {
    leftPressed = true;
    event.preventDefault();
  }
  if (event.key === "d" || event.key === "ArrowRight") {
    rightPressed = true;
    event.preventDefault();
  }
  if (event.key === " ") {
    event.preventDefault();
    launchBall();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "a" || event.key === "ArrowLeft") leftPressed = false;
  if (event.key === "d" || event.key === "ArrowRight") rightPressed = false;
});

type ScoreEntry = {
  playerName: string;
  score: number;
};

async function fetchScores() {
  const response = await fetch("/api/scores");
  const data = await response.json();
  return Array.isArray(data.scores) ? (data.scores as ScoreEntry[]) : [];
}

async function refreshHighScore() {
  try {
    const scores = await fetchScores();
    const topScore = scores.reduce((max, entry) => Math.max(max, entry.score), 0);
    highScore = Math.max(highScore, topScore);
    updateHud();
  } catch {
    // Keep the live score as the fallback high score if the API is unavailable.
  }
}

async function loadScores() {
  leaderboardEl.innerHTML = "";
  scoresErrorEl.classList.add("hidden");
  try {
    const scores = await fetchScores();
    const topScore = scores.reduce((max, entry) => Math.max(max, entry.score), 0);
    highScore = Math.max(highScore, topScore);
    updateHud();
    if (scores.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No Springfield heroes yet.";
      leaderboardEl.appendChild(li);
      return;
    }
    for (const entry of scores) {
      const li = document.createElement("li");
      li.textContent = `${entry.playerName} — ${entry.score}`;
      leaderboardEl.appendChild(li);
    }
  } catch {
    scoresErrorEl.textContent = "Failed to load scores.";
    scoresErrorEl.classList.remove("hidden");
  }
}

function openScoresModal() {
  scoresModal.hidden = false;
  document.body.classList.add("modal-open");
  void loadScores();
}

function closeScoresModal() {
  scoresModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openHelpModal() {
  helpModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeHelpModal() {
  helpModal.hidden = true;
  document.body.classList.remove("modal-open");
}

openScoresBtn.addEventListener("click", () => openScoresModal());
openHelpBtn.addEventListener("click", () => openHelpModal());
scoresModalClose.addEventListener("click", () => closeScoresModal());
scoresModalBackdrop.addEventListener("click", () => closeScoresModal());
helpModalClose.addEventListener("click", () => closeHelpModal());
helpModalBackdrop.addEventListener("click", () => closeHelpModal());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !scoresModal.hidden) closeScoresModal();
  if (event.key === "Escape" && !helpModal.hidden) closeHelpModal();
});

nameInput.addEventListener("input", () => {
  submitBtn.disabled = !nameInput.value.trim() || score <= 0 || lastSubmittedScore === score;
});

submitBtn.addEventListener("click", async () => {
  const playerName = nameInput.value.trim();
  if (!playerName || score <= 0) return;
  submitBtn.disabled = true;
  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName, score }),
    });
    if (!response.ok) throw new Error("save failed");
    lastSubmittedScore = score;
    highScore = Math.max(highScore, score);
    updateHud();
    openScoresModal();
  } catch {
    submitBtn.disabled = false;
    alert("Failed to save score.");
  }
});

resetGame();
void refreshHighScore();
requestAnimationFrame((ts) => {
  lastFrame = ts;
  requestAnimationFrame(animate);
});
