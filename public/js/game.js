const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const startBtn = document.getElementById("startBtn");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");

const paddleWidth = 12;
const paddleHeight = 80;
const ballRadius = 8;
const winningScore = 10;

let player = { x: 20, y: canvas.height / 2 - paddleHeight / 2, speed: 5, dy: 0 };
let ai = { x: canvas.width - 32, y: canvas.height / 2 - paddleHeight / 2, speed: 4, dy: 0 };
let ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 3 };

let playerScore = 0;
let aiScore = 0;
let running = false;
let startTime = null;
let animationId = null;
let currentUser = null;

function resetPositions() {
  player.y = canvas.height / 2 - paddleHeight / 2;
  ai.y = canvas.height / 2 - paddleHeight / 2;
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = Math.random() > 0.5 ? 4 : -4;
  ball.vy = Math.random() > 0.5 ? 3 : -3;
}

function resetGame() {
  playerScore = 0;
  aiScore = 0;
  updateScores();
  resetPositions();
  messageEl.textContent = "";
  statusEl.textContent = currentUser ? `Logueado como ${currentUser.username}` : "Jugando como invitado";
}

function updateScores() {
  playerScoreEl.textContent = playerScore;
  aiScoreEl.textContent = aiScore;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(player.x, player.y, paddleWidth, paddleHeight);
  ctx.fillRect(ai.x, ai.y, paddleWidth, paddleHeight);

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 20);
  ctx.lineTo(canvas.width / 2, canvas.height - 20);
  ctx.stroke();
  ctx.setLineDash([]);
}

function update() {
  player.y += player.dy;
  if (player.y < 0) player.y = 0;
  if (player.y + paddleHeight > canvas.height) player.y = canvas.height - paddleHeight;

  const difficultyBoost = Math.min(6, Math.floor((playerScore + aiScore) / 2));
  const target = ball.y - paddleHeight / 2;
  if (ai.y + paddleHeight / 2 < target) {
    ai.y += ai.speed + difficultyBoost * 0.3;
  } else {
    ai.y -= ai.speed + difficultyBoost * 0.3;
  }
  if (ai.y < 0) ai.y = 0;
  if (ai.y + paddleHeight > canvas.height) ai.y = canvas.height - paddleHeight;

  ball.x += ball.vx;
  ball.y += ball.vy;

  if (ball.y - ballRadius <= 0 || ball.y + ballRadius >= canvas.height) {
    ball.vy *= -1;
  }

  if (
    ball.x - ballRadius <= player.x + paddleWidth &&
    ball.y >= player.y &&
    ball.y <= player.y + paddleHeight
  ) {
    ball.vx = Math.abs(ball.vx) + 0.2;
    ball.vy += player.dy * 0.2;
  }

  if (
    ball.x + ballRadius >= ai.x &&
    ball.y >= ai.y &&
    ball.y <= ai.y + paddleHeight
  ) {
    ball.vx = -Math.abs(ball.vx) - 0.2;
    ball.vy += (ai.y - ball.y) * 0.01;
  }

  if (ball.x < 0) {
    aiScore += 1;
    updateScores();
    resetPositions();
  }

  if (ball.x > canvas.width) {
    playerScore += 1;
    updateScores();
    resetPositions();
  }

  if (playerScore >= winningScore || aiScore >= winningScore) {
    endGame();
  }
}

function loop() {
  if (!running) return;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

function startGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  resetGame();
  running = true;
  startTime = Date.now();
  loop();
}

async function endGame() {
  running = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
  const resultText = playerScore > aiScore ? "¡Ganaste!" : "La IA ganó esta vez.";
  messageEl.textContent = `${resultText} Resultado final: ${playerScore} - ${aiScore}`;

  if (currentUser) {
    await fetch("/api/game/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score_player: playerScore,
        score_ai: aiScore,
        duration_seconds: durationSeconds,
      }),
    });
  }
}

function handleKeyDown(event) {
  if (event.key === "w" || event.key === "W") {
    player.dy = -player.speed;
  }
  if (event.key === "s" || event.key === "S") {
    player.dy = player.speed;
  }
}

function handleKeyUp(event) {
  if (["w", "W", "s", "S"].includes(event.key)) {
    player.dy = 0;
  }
}

async function loadUser() {
  const response = await fetch("/api/me");
  const data = await response.json();
  currentUser = data.user;
  statusEl.textContent = currentUser ? `Logueado como ${currentUser.username}` : "Jugando como invitado";
  logoutBtn.style.display = currentUser ? "inline-flex" : "none";
}

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  currentUser = null;
  statusEl.textContent = "Jugando como invitado";
  logoutBtn.style.display = "none";
});

startBtn.addEventListener("click", startGame);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

loadUser();
draw();
