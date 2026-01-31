const form = document.getElementById("registerForm");
const messageEl = document.getElementById("message");

function showMessage(text, isSuccess = false) {
  messageEl.className = isSuccess ? "alert success" : "alert";
  messageEl.textContent = text;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageEl.textContent = "";

  const formData = new FormData(form);
  const payload = {
    username: formData.get("username"),
    password: formData.get("password"),
  };

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    showMessage(data.error || "No se pudo registrar.");
    return;
  }

  showMessage("Registro completo. ¡Vamos a jugar!", true);
  setTimeout(() => {
    window.location.href = "/game";
  }, 800);
});
