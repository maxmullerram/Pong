const tableBody = document.querySelector("#leaderboardTable tbody");
const emptyEl = document.getElementById("empty");

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function loadLeaderboard() {
  const response = await fetch("/api/leaderboard");
  const data = await response.json();

  tableBody.innerHTML = "";
  if (!data.leaderboard || data.leaderboard.length === 0) {
    emptyEl.textContent = "Aún no hay puntajes. ¡Sé el primero!";
    return;
  }

  data.leaderboard.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.username}</td>
      <td>${row.best_score}</td>
      <td>${formatDate(row.best_score_at)}</td>
    `;
    tableBody.appendChild(tr);
  });
}

loadLeaderboard();
