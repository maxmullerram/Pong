const infoEl = document.getElementById("profileInfo");
const contentEl = document.getElementById("profileContent");
const logoutBtn = document.getElementById("logoutBtn");

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function loadProfile() {
  const response = await fetch("/api/profile/me");
  const data = await response.json();

  if (!response.ok) {
    infoEl.textContent = "Necesitas iniciar sesión para ver tu perfil.";
    contentEl.innerHTML = '<a class="btn" href="/login">Login</a>';
    logoutBtn.style.display = "none";
    return;
  }

  const user = data.user;
  infoEl.innerHTML = `
    <strong>${user.username}</strong><br />
    Best score: ${user.best_score || 0}<br />
    Fecha best score: ${formatDate(user.best_score_at)}
  `;

  const games = data.games || [];
  if (games.length === 0) {
    contentEl.textContent = "Aún no tienes partidas guardadas.";
    return;
  }

  const rows = games
    .map(
      (game) => `
        <tr>
          <td>${game.score_player} - ${game.score_ai}</td>
          <td>${game.duration_seconds}s</td>
          <td>${formatDate(game.created_at)}</td>
        </tr>
      `
    )
    .join("");

  contentEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Score</th>
          <th>Duración</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

loadProfile();
