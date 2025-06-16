// --- CONFIGURAZIONE ---
const JSONBIN_URL = "https://api.jsonbin.io/v3/b/68501fdd8960c979a5aad334"; // <-- INSERISCI L'URL DEL TUO BIN
const API_KEY = "$2a$10$aouP7HWpjrO3/0lnk2QiwOS82ITY.QgtY3UfqgzpfJa8shj6LEPQW"; // <-- INSERISCI LA TUA API KEY

// --- ELEMENTI DELLA PAGINA ---
const mircoScoreEl = document.getElementById("mirco-score");
const matteoScoreEl = document.getElementById("matteo-score");
const statusEl = document.getElementById("status");
const loginSection = document.getElementById("login-section");
const actionsSection = document.getElementById("actions-section");
const welcomeMessage = document.getElementById("welcome-message");
const mainActionsContainer = document.getElementById("main-actions-container");
const historyList = document.getElementById("history-list");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
// Elementi del modale
const penaltyModal = document.getElementById("penalty-modal");
const penaltyOptionsContainer = document.getElementById("penalty-options");
const closeModalButton = document.getElementById("close-modal-button");

// --- STATO DELL'APPLICAZIONE ---
let appData = { scores: { mirco: 0, matteo: 0 }, users: {}, history: [] };
let loggedInUser = null;
let isLoading = false;

// --- FUNZIONI DI UTILITÀ, API, LOG, RENDER (INVARIATE) ---
// (Puoi copiare queste sezioni dal codice precedente, non sono cambiate)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function setLoading(loading, message) {
  isLoading = loading;
  statusEl.textContent = message || "";
  document
    .querySelectorAll("button")
    .forEach((btn) => (btn.disabled = loading));
}
async function fetchDataFromBin() {
  setLoading(true, "Sincronizzazione...");
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, {
      headers: { "X-Master-Key": API_KEY },
    });
    if (!response.ok) throw new Error("Errore di rete");
    const data = await response.json();
    appData = data.record;
    appData.history = appData.history || [];
    renderAll();
    setLoading(false, "Pronto!");
  } catch (error) {
    console.error(error);
    setLoading(false, "Errore di sincronizzazione.");
  }
}
async function updateDataInBin() {
  if (isLoading) return;
  setLoading(true, "Salvataggio...");
  try {
    appData.history.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const response = await fetch(JSONBIN_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Master-Key": API_KEY },
      body: JSON.stringify(appData),
    });
    if (!response.ok) throw new Error("Errore di salvataggio");
    renderAll();
    setLoading(false, "Punteggio salvato!");
  } catch (error) {
    console.error(error);
    setLoading(false, "Errore nel salvataggio.");
  }
}
function logEvent(description, points, target) {
  const event = {
    timestamp: new Date().toISOString(),
    description: description,
    points: points,
    target: target,
  };
  appData.history.push(event);
}
function renderScores() {
  mircoScoreEl.textContent = appData.scores.mirco.toFixed(2);
  matteoScoreEl.textContent = appData.scores.matteo.toFixed(2);
}
function renderHistory() {
  historyList.innerHTML = "";
  const sortedHistory = appData.history
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  sortedHistory.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const isGain = item.points > 0;
    const pointsClass = isGain ? "points-gain" : "points-loss";
    const pointsSign = isGain ? "+" : "";
    li.innerHTML = `<div class="description">${
      item.description
    }<div class="timestamp">${new Date(item.timestamp).toLocaleString(
      "it-IT"
    )}</div></div><span class="points ${pointsClass}">${pointsSign}${
      item.points
    }</span>`;
    historyList.appendChild(li);
  });
}
function renderAll() {
  renderScores();
  renderHistory();
}

// --- NUOVE FUNZIONI PER GESTIRE IL MODALE ---
function showPenaltyModal() {
  penaltyModal.classList.add("visible");
}

function hidePenaltyModal() {
  penaltyModal.classList.remove("visible");
}

// --- LOGICA E RENDER UI (AGGIORNATA) ---
function setupActionUI() {
  mainActionsContainer.innerHTML = ""; // Pulisce i pulsanti precedenti

  if (!loggedInUser) return;

  const opponent = loggedInUser === "mirco" ? "matteo" : "mirco";
  const userCapitalized =
    loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);
  const opponentCapitalized =
    opponent.charAt(0).toUpperCase() + opponent.slice(1);

  // Definiamo tutte le azioni possibili
  const actions = [
    {
      text: `${opponentCapitalized} mi ha burlato! (+1 a ${opponentCapitalized})`,
      class: "btn-win",
      action: () => {
        appData.scores[opponent] += 1;
        logEvent(
          `${userCapitalized} è stato burlato da ${opponentCapitalized}`,
          1,
          opponent
        );
        updateDataInBin();
      },
    },
    {
      text: `Ha burlato un esterno (+0.25 a ${opponentCapitalized})`,
      class: "btn-side",
      action: () => {
        appData.scores[opponent] += 0.25;
        logEvent(
          `${userCapitalized} ha burlato un esterno`,
          0.25,
          opponent
        );
        updateDataInBin();
      },
    },
    {
      text: `Sono stato burlato da un esterno...`,
      class: "btn-lose",
      action: () => {
        showPenaltyModal(); // Questa azione apre il popup
      },
    },
  ];

  // Creiamo i pulsanti principali
  actions.forEach((act) => {
    const button = document.createElement("button");
    button.textContent = act.text;
    button.className = act.class;
    button.addEventListener("click", act.action);
    mainActionsContainer.appendChild(button);
  });
}

function setupPenaltyOptions() {
  penaltyOptionsContainer.innerHTML = ""; // Pulisce le opzioni

  if (!loggedInUser) return;
  const userCapitalized =
    loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);

  const penalties = [
    {
      text: "Burla Level Alto (-0.25)",
      points: -0.25,
      desc: `colpito da esterno (Burla Level Alto)`,
    },
    {
      text: "Burla Level Medio (-0.5)",
      points: -0.5,
      desc: `colpito da esterno (Burla Level Medio)`,
    },
    {
      text: "Burla Level Basso (-1)",
      points: -1,
      desc: `colpito da esterno (Burla Level Basso)`,
    },
    {
      text: "Burla Level ZERO (Reset)",
      points: 0,
      class: "btn-reset",
      desc: `colpito da esterno (Burla Level ZERO)`,
    },
  ];

  penalties.forEach((p) => {
    const penaltyButton = document.createElement("button");
    penaltyButton.textContent = p.text;
    if (p.class) penaltyButton.className = p.class;

    penaltyButton.addEventListener("click", () => {
      if (p.points === 0) {
        // Caso speciale RESET
        const oldScore = appData.scores[loggedInUser];
        logEvent(`${userCapitalized} ${p.desc}`, -oldScore, loggedInUser);
        appData.scores[loggedInUser] = 0;
      } else {
        appData.scores[loggedInUser] += p.points;
        logEvent(`${userCapitalized} ${p.desc}`, p.points, loggedInUser);
      }
      hidePenaltyModal();
      updateDataInBin();
    });
    penaltyOptionsContainer.appendChild(penaltyButton);
  });
}

function renderUI() {
  if (loggedInUser) {
    loginSection.classList.add("hidden");
    actionsSection.classList.remove("hidden");
    welcomeMessage.textContent = `Benvenuto, ${loggedInUser}!`;
    setupActionUI();
    setupPenaltyOptions(); // Pre-popoliamo le opzioni del modale
  } else {
    loginSection.classList.remove("hidden");
    actionsSection.classList.add("hidden");
    loginForm.reset();
  }
}

// --- GESTIONE DEGLI EVENTI ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setLoading(true, "Verifica in corso...");
  const username = document.getElementById("username-select").value;
  const password = document.getElementById("password").value;
  if (!username || !appData.users[username])
    return setLoading(false, "Utente non trovato o non selezionato.");
  const passwordHash = await hashPassword(password);
  if (passwordHash === appData.users[username]) {
    loggedInUser = username;
    setLoading(false, `Login effettuato come ${username}!`);
  } else {
    setLoading(false, "Password errata!");
  }
  renderUI();
});

logoutButton.addEventListener("click", () => {
  loggedInUser = null;
  statusEl.textContent = "Logout effettuato.";
  renderUI();
});

// Eventi per chiudere il modale
closeModalButton.addEventListener("click", hidePenaltyModal);
penaltyModal.addEventListener("click", (e) => {
  if (e.target === penaltyModal) {
    // Chiude solo se si clicca sullo sfondo
    hidePenaltyModal();
  }
});

// --- INIZIALIZZAZIONE ---
document.addEventListener("DOMContentLoaded", async () => {
  await fetchDataFromBin();
  setInterval(fetchDataFromBin, 20000);
});
