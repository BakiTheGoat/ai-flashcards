const generateBtn = document.getElementById("generateBtn");
const notesInput = document.getElementById("notesInput");
const fileInput = document.getElementById("fileInput");
const fileNameLabel = document.getElementById("fileName");
const statusMsg = document.getElementById("statusMsg");
const flashcardArea = document.getElementById("flashcardArea");
const modeRow = document.getElementById("modeRow");
const flipModeBtn = document.getElementById("flipModeBtn");
const saveBtn = document.getElementById("saveBtn");
const historyBar = document.getElementById("historyBar");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

let currentFlashcards = [];
let showMeaningFirst = false; // false = term first (default), true = meaning first

const HISTORY_KEY = "flashcard_history";
const MAX_HISTORY_ITEMS = 15;

// ---------------------------------------------------------------
// HISTORY (saved in this browser only, via localStorage)
// ---------------------------------------------------------------

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function saveToHistory(flashcards) {
  if (!flashcards || flashcards.length === 0) return;

  const history = loadHistory();

  const firstTerm = flashcards[0].question.replace(/^What is\s+/i, "").replace(/\?$/, "");
  const title = flashcards.length > 1
    ? `${firstTerm} + ${flashcards.length - 1} more`
    : firstTerm;

  const entry = {
    id: Date.now().toString(),
    title: title,
    count: flashcards.length,
    timestamp: new Date().toISOString(),
    flashcards: flashcards
  };

  history.unshift(entry);
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (err) {
    // Storage full or unavailable - fail silently, history is a nice-to-have
  }

  renderHistory();
}

function deleteHistoryItem(id) {
  const history = loadHistory().filter((h) => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function renderHistory() {
  const history = loadHistory();

  if (history.length === 0) {
    historyBar.style.display = "none";
    return;
  }

  historyBar.style.display = "block";
  historyList.innerHTML = "";

  history.forEach((entry) => {
    const chip = document.createElement("div");
    chip.className = "history-chip";
    chip.innerHTML = `
      <button class="chip-delete" title="Remove">✕</button>
      <span class="chip-title">${escapeHtml(entry.title)}</span>
      <span class="chip-meta">${entry.count} cards · ${formatRelativeTime(entry.timestamp)}</span>
    `;

    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-delete")) return;
      currentFlashcards = entry.flashcards;
      showMeaningFirst = false;
      updateFlipModeLabel();
      modeRow.style.display = "flex";
      statusMsg.style.color = "#2e7d32";
      statusMsg.textContent = `Loaded ${entry.flashcards.length} flashcards from history.`;
      renderFlashcards(currentFlashcards);
    });

    chip.querySelector(".chip-delete").addEventListener("click", () => {
      deleteHistoryItem(entry.id);
    });

    historyList.appendChild(chip);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// Show history on page load
renderHistory();

// ---------------------------------------------------------------
// FILE UPLOAD LABEL
// ---------------------------------------------------------------

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    fileNameLabel.textContent = fileInput.files[0].name;
  } else {
    fileNameLabel.textContent = "";
  }
});

// ---------------------------------------------------------------
// GENERATE
// ---------------------------------------------------------------

generateBtn.addEventListener("click", async () => {
  const notes = notesInput.value.trim();
  const file = fileInput.files[0];

  statusMsg.textContent = "";
  flashcardArea.innerHTML = "";
  modeRow.style.display = "none";

  if (!notes && !file) {
    statusMsg.style.color = "#b00020";
    statusMsg.textContent = "Please paste some notes or upload a file first.";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  statusMsg.style.color = "#666";
  statusMsg.textContent = file
    ? "Reading your file and asking AI to generate flashcards..."
    : "Asking AI to read your notes...";

  try {
    const formData = new FormData();
    formData.append("notes", notes);
    if (file) {
      formData.append("file", file);
    }

    const response = await fetch("/generate", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      statusMsg.style.color = "#b00020";
      statusMsg.textContent = data.error || "Something went wrong.";
      return;
    }

    statusMsg.style.color = "#2e7d32";
    statusMsg.textContent = `Generated ${data.flashcards.length} flashcards. Click a card to flip it.`;

    currentFlashcards = data.flashcards;
    showMeaningFirst = false;
    updateFlipModeLabel();
    modeRow.style.display = data.flashcards.length > 0 ? "flex" : "none";
    renderFlashcards(currentFlashcards);

    // Automatically keep this set in the history bar for next time
    saveToHistory(currentFlashcards);

  } catch (err) {
    statusMsg.style.color = "#b00020";
    statusMsg.textContent = "Could not reach the server. Is the Flask app running?";
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Flashcards";
  }
});

// ---------------------------------------------------------------
// FLIP MODE TOGGLE
// ---------------------------------------------------------------

flipModeBtn.addEventListener("click", () => {
  showMeaningFirst = !showMeaningFirst;
  updateFlipModeLabel();
  renderFlashcards(currentFlashcards);
});

function updateFlipModeLabel() {
  flipModeBtn.textContent = showMeaningFirst
    ? "🔄 Show Term First"
    : "🔄 Show Meaning First";
}

// ---------------------------------------------------------------
// SAVE TO FILE (separate from history - this is a downloadable backup)
// ---------------------------------------------------------------

saveBtn.addEventListener("click", () => {
  if (currentFlashcards.length === 0) return;

  const dataStr = JSON.stringify({ flashcards: currentFlashcards }, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = `flashcards_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// ---------------------------------------------------------------
// RENDER
// ---------------------------------------------------------------

function renderFlashcards(flashcards) {
  flashcardArea.innerHTML = "";

  flashcards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";

    const termOnly = card.question.replace(/^What is\s+/i, "").replace(/\?$/, "");

    const frontText = showMeaningFirst ? card.answer : card.question;
    const backText = showMeaningFirst ? termOnly : card.answer;

    cardEl.innerHTML = `
      <div class="card-inner">
        <div class="card-front">${escapeHtml(frontText)}</div>
        <div class="card-back">${escapeHtml(backText)}</div>
      </div>
    `;

    cardEl.addEventListener("click", () => {
      cardEl.classList.toggle("flipped");
    });

    flashcardArea.appendChild(cardEl);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}