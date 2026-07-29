const generateBtn = document.getElementById("generateBtn");
const notesInput = document.getElementById("notesInput");
const fileInput = document.getElementById("fileInput");
const fileNameLabel = document.getElementById("fileName");
const statusMsg = document.getElementById("statusMsg");
const flashcardArea = document.getElementById("flashcardArea");
const modeRow = document.getElementById("modeRow");
const flipModeBtn = document.getElementById("flipModeBtn");
const saveBtn = document.getElementById("saveBtn");
const printBtn = document.getElementById("printBtn");
const printArea = document.getElementById("printArea");
const historyBar = document.getElementById("historyBar");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const progressBtn = document.getElementById("progressBtn");
const progressOverlay = document.getElementById("progressOverlay");
const progressCloseBtn = document.getElementById("progressCloseBtn");
const clearProgressBtn = document.getElementById("clearProgressBtn");
const progressList = document.getElementById("progressList");
const searchRow = document.getElementById("searchRow");
const searchInput = document.getElementById("searchInput");
const studyModeBtn = document.getElementById("studyModeBtn");
const quizModeBtn = document.getElementById("quizModeBtn");
const quizOverlay = document.getElementById("quizOverlay");
const quizCloseBtn = document.getElementById("quizCloseBtn");
const quizProgress = document.getElementById("quizProgress");
const quizScoreLabel = document.getElementById("quizScoreLabel");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const quizNextBtn = document.getElementById("quizNextBtn");

// Study overlay elements
const studyOverlay = document.getElementById("studyOverlay");
const studyCloseBtn = document.getElementById("studyCloseBtn");
const studyProgress = document.getElementById("studyProgress");
const unlearnedOnlyToggle = document.getElementById("unlearnedOnlyToggle");
const studyCard = document.getElementById("studyCard");
const studyCardFront = document.getElementById("studyCardFront");
const studyCardBack = document.getElementById("studyCardBack");
const studyPrevBtn = document.getElementById("studyPrevBtn");
const studyNextBtn = document.getElementById("studyNextBtn");
const studyShuffleBtn = document.getElementById("studyShuffleBtn");
const studyLearningBtn = document.getElementById("studyLearningBtn");
const studyKnownBtn = document.getElementById("studyKnownBtn");

let currentFlashcards = [];
let showMeaningFirst = false; // false = term first (default), true = meaning first

const HISTORY_KEY = "flashcard_history";
const THEME_KEY = "flashcard_theme";
const MAX_HISTORY_ITEMS = 15;

// ---------------------------------------------------------------
// DARK MODE
// ---------------------------------------------------------------

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggleBtn.textContent = "☀️ Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggleBtn.textContent = "🌙 Dark";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }
}

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

initTheme();

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

function getSetTitle(flashcards) {
  const firstTerm = flashcards[0].question.replace(/^What is\s+/i, "").replace(/\?$/, "");
  return flashcards.length > 1
    ? `${firstTerm} + ${flashcards.length - 1} more`
    : firstTerm;
}

function saveToHistory(flashcards) {
  if (!flashcards || flashcards.length === 0) return;

  const history = loadHistory();
  const title = getSetTitle(flashcards);

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
      loadFlashcardSet(entry.flashcards);
      statusMsg.style.color = "var(--success)";
      statusMsg.textContent = `Loaded ${entry.flashcards.length} flashcards from history.`;
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
// IMAGE RESIZE (before upload - see earlier notes on phone photos)
// ---------------------------------------------------------------

function resizeImageFile(file, maxDimension = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Could not process image"));
            return;
          }
          const resizedFile = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg"
          });
          resolve(resizedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objectUrl;
  });
}

// ---------------------------------------------------------------
// GENERATE
// ---------------------------------------------------------------

generateBtn.addEventListener("click", async () => {
  const notes = notesInput.value.trim();
  let file = fileInput.files[0];

  statusMsg.textContent = "";
  flashcardArea.innerHTML = "";
  modeRow.style.display = "none";
  searchRow.style.display = "none";

  if (!notes && !file) {
    statusMsg.style.color = "var(--error)";
    statusMsg.textContent = "Please paste some notes or upload a file first.";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  statusMsg.style.color = "var(--text-muted)";

  try {
    if (file && file.type && file.type.startsWith("image/")) {
      statusMsg.textContent = "Preparing your image...";
      try {
        file = await resizeImageFile(file);
      } catch (resizeErr) {
        console.warn("Image resize failed, using original file:", resizeErr);
      }
    }

    statusMsg.textContent = file
      ? "Reading your file and asking AI to generate flashcards..."
      : "Asking AI to read your notes...";

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
      statusMsg.style.color = "var(--error)";
      statusMsg.textContent = data.error || "Something went wrong.";
      return;
    }

    statusMsg.style.color = "var(--success)";
    statusMsg.textContent = `Generated ${data.flashcards.length} flashcards. Click a card to flip it.`;

    loadFlashcardSet(data.flashcards);
    saveToHistory(currentFlashcards);

  } catch (err) {
    statusMsg.style.color = "var(--error)";
    statusMsg.textContent = "Could not reach the server. Is the Flask app running?";
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Flashcards";
  }
});

// Shared helper: load a flashcard set into the UI (used by generate + history + json upload)
function loadFlashcardSet(flashcards) {
  currentFlashcards = flashcards;
  showMeaningFirst = false;
  updateFlipModeLabel();
  modeRow.style.display = flashcards.length > 0 ? "flex" : "none";
  searchRow.style.display = flashcards.length > 0 ? "block" : "none";
  searchInput.value = "";
  resetProgress();
  renderFlashcards(currentFlashcards);
}

// ---------------------------------------------------------------
// FLIP MODE TOGGLE
// ---------------------------------------------------------------

flipModeBtn.addEventListener("click", () => {
  showMeaningFirst = !showMeaningFirst;
  updateFlipModeLabel();
  renderFlashcards(getFilteredCards());
});

function updateFlipModeLabel() {
  flipModeBtn.textContent = showMeaningFirst
    ? "🔄 Show Term First"
    : "🔄 Show Meaning First";
}

// ---------------------------------------------------------------
// SEARCH / FILTER (grid view)
// ---------------------------------------------------------------

function getFilteredCards() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return currentFlashcards;
  return currentFlashcards.filter(
    (c) =>
      c.question.toLowerCase().includes(query) ||
      c.answer.toLowerCase().includes(query)
  );
}

searchInput.addEventListener("input", () => {
  renderFlashcards(getFilteredCards());
});

// ---------------------------------------------------------------
// SAVE TO FILE
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
// GRID RENDER
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

// ---------------------------------------------------------------
// STUDY MODE (shuffle + keyboard nav + known/learning progress)
// ---------------------------------------------------------------
// Progress is tracked in-memory per session, keyed by card question
// text. It resets when you generate/load a new set - this keeps
// things simple and avoids extra storage complexity.

let studyDeck = [];
let studyIndex = 0;
let studyFlipped = false;
let cardProgress = {}; // { questionText: "known" | "learning" }

function resetProgress() {
  cardProgress = {};
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function openStudyMode() {
  if (currentFlashcards.length === 0) return;
  studyDeck = shuffleArray(currentFlashcards);
  studyIndex = 0;
  studyFlipped = false;
  unlearnedOnlyToggle.checked = false;
  studyOverlay.style.display = "flex";
  renderStudyCard();
}

function closeStudyMode() {
  studyOverlay.style.display = "none";
}

function getActiveStudyDeck() {
  if (unlearnedOnlyToggle.checked) {
    const filtered = studyDeck.filter((c) => cardProgress[c.question] !== "known");
    return filtered.length > 0 ? filtered : studyDeck;
  }
  return studyDeck;
}

function renderStudyCard() {
  const deck = getActiveStudyDeck();
  if (studyIndex >= deck.length) studyIndex = 0;
  if (studyIndex < 0) studyIndex = deck.length - 1;

  const card = deck[studyIndex];
  if (!card) return;

  const termOnly = card.question.replace(/^What is\s+/i, "").replace(/\?$/, "");
  const frontText = showMeaningFirst ? card.answer : card.question;
  const backText = showMeaningFirst ? termOnly : card.answer;

  studyCardFront.textContent = frontText;
  studyCardBack.textContent = backText;
  studyFlipped = false;
  studyCard.classList.remove("flipped");

  const knownCount = studyDeck.filter((c) => cardProgress[c.question] === "known").length;
  studyProgress.textContent = `Card ${studyIndex + 1} of ${deck.length} · ${knownCount}/${studyDeck.length} known`;
}

function studyFlip() {
  studyFlipped = !studyFlipped;
  studyCard.classList.toggle("flipped", studyFlipped);
}

function studyNext() {
  const deck = getActiveStudyDeck();
  studyIndex = (studyIndex + 1) % deck.length;
  renderStudyCard();
}

function studyPrev() {
  const deck = getActiveStudyDeck();
  studyIndex = (studyIndex - 1 + deck.length) % deck.length;
  renderStudyCard();
}

function markCurrentCard(status) {
  const deck = getActiveStudyDeck();
  const card = deck[studyIndex];
  if (!card) return;
  cardProgress[card.question] = status;
  studyNext();
}

studyModeBtn.addEventListener("click", openStudyMode);
studyCloseBtn.addEventListener("click", closeStudyMode);
studyCard.addEventListener("click", studyFlip);
studyPrevBtn.addEventListener("click", studyPrev);
studyNextBtn.addEventListener("click", studyNext);
studyShuffleBtn.addEventListener("click", () => {
  studyDeck = shuffleArray(studyDeck);
  studyIndex = 0;
  renderStudyCard();
});
studyKnownBtn.addEventListener("click", () => markCurrentCard("known"));
studyLearningBtn.addEventListener("click", () => markCurrentCard("learning"));
unlearnedOnlyToggle.addEventListener("change", () => {
  studyIndex = 0;
  renderStudyCard();
});

// Keyboard shortcuts, only active while Study Mode is open
document.addEventListener("keydown", (e) => {
  if (studyOverlay.style.display !== "flex") return;

  if (e.key === "Escape") {
    closeStudyMode();
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    studyFlip();
  } else if (e.key === "ArrowRight") {
    studyNext();
  } else if (e.key === "ArrowLeft") {
    studyPrev();
  }
});

// Click outside the panel closes it too
studyOverlay.addEventListener("click", (e) => {
  if (e.target === studyOverlay) closeStudyMode();
});

// ---------------------------------------------------------------
// QUIZ MODE (multiple choice - free, no AI needed)
// ---------------------------------------------------------------
// Wrong answers are just other cards' real answers from the same
// set, shuffled in alongside the correct one. Needs at least 4
// cards so there are enough distractors to pick from. Timer per
// question is optional - user picks it on a setup screen first.

const quizSetup = document.getElementById("quizSetup");
const quizPlay = document.getElementById("quizPlay");
const quizStartBtn = document.getElementById("quizStartBtn");
const quizTimerEl = document.getElementById("quizTimer");
const timerOptionBtns = document.querySelectorAll(".timer-option-btn");

let quizDeck = [];
let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let quizTimerSeconds = 0; // 0 = no timer
let quizCountdownInterval = null;
let quizTimeLeft = 0;

timerOptionBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    timerOptionBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    quizTimerSeconds = parseInt(btn.dataset.seconds, 10);
  });
});

function openQuizMode() {
  if (currentFlashcards.length < 4) {
    statusMsg.style.color = "var(--error)";
    statusMsg.textContent = "Quiz Mode needs at least 4 flashcards in the set to generate answer choices.";
    return;
  }

  quizOverlay.style.display = "flex";
  quizSetup.style.display = "block";
  quizPlay.style.display = "none";
}

function closeQuizMode() {
  stopQuizTimer();
  quizOverlay.style.display = "none";
}

quizStartBtn.addEventListener("click", () => {
  quizDeck = shuffleArray(currentFlashcards);
  quizIndex = 0;
  quizScore = 0;
  quizSetup.style.display = "none";
  quizPlay.style.display = "block";
  renderQuizQuestion();
});

function stopQuizTimer() {
  if (quizCountdownInterval) {
    clearInterval(quizCountdownInterval);
    quizCountdownInterval = null;
  }
}

function startQuizTimer() {
  stopQuizTimer();
  if (quizTimerSeconds <= 0) {
    quizTimerEl.textContent = "";
    return;
  }

  quizTimeLeft = quizTimerSeconds;
  updateTimerDisplay();

  quizCountdownInterval = setInterval(() => {
    quizTimeLeft--;
    updateTimerDisplay();
    if (quizTimeLeft <= 0) {
      stopQuizTimer();
      handleQuizTimeout();
    }
  }, 1000);
}

function updateTimerDisplay() {
  quizTimerEl.textContent = `⏱ ${quizTimeLeft}s`;
  quizTimerEl.classList.toggle("timer-low", quizTimeLeft <= 5);
}

function handleQuizTimeout() {
  if (quizAnswered) return;
  quizAnswered = true;

  const card = quizDeck[quizIndex];
  Array.from(quizOptions.children).forEach((optBtn) => {
    optBtn.disabled = true;
    if (optBtn.textContent === card.answer) {
      optBtn.classList.add("correct");
    }
  });

  quizFeedback.textContent = "⏰ Time's up!";
  quizFeedback.classList.add("wrong-text");
  quizScoreLabel.textContent = `Score: ${quizScore}/${quizIndex + 1}`;
  quizNextBtn.style.display = "block";
}

function renderQuizQuestion() {
  if (quizIndex >= quizDeck.length) {
    stopQuizTimer();
    renderQuizSummary();
    return;
  }

  quizAnswered = false;
  const card = quizDeck[quizIndex];

  // Build 3 wrong answers from other cards, plus the correct one
  const otherAnswers = currentFlashcards
    .filter((c) => c.question !== card.question)
    .map((c) => c.answer);
  const wrongChoices = shuffleArray(otherAnswers).slice(0, 3);
  const allChoices = shuffleArray([card.answer, ...wrongChoices]);

  quizProgress.textContent = `Question ${quizIndex + 1} of ${quizDeck.length}`;
  quizScoreLabel.textContent = `Score: ${quizScore}/${quizIndex}`;
  quizQuestion.textContent = card.question;
  quizFeedback.textContent = "";
  quizFeedback.className = "quiz-feedback";
  quizNextBtn.style.display = "none";

  quizOptions.innerHTML = "";
  allChoices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option-btn";
    btn.textContent = choice;
    btn.addEventListener("click", () => selectQuizAnswer(btn, choice, card.answer));
    quizOptions.appendChild(btn);
  });

  startQuizTimer();
}

function selectQuizAnswer(btn, chosen, correctAnswer) {
  if (quizAnswered) return;
  quizAnswered = true;
  stopQuizTimer();

  const isCorrect = chosen === correctAnswer;
  if (isCorrect) quizScore++;

  // Disable all options and reveal correct/wrong
  Array.from(quizOptions.children).forEach((optBtn) => {
    optBtn.disabled = true;
    if (optBtn.textContent === correctAnswer) {
      optBtn.classList.add("correct");
    } else if (optBtn === btn) {
      optBtn.classList.add("wrong");
    }
  });

  quizFeedback.textContent = isCorrect ? "✓ Correct!" : "✗ Not quite.";
  quizFeedback.classList.add(isCorrect ? "correct-text" : "wrong-text");
  quizScoreLabel.textContent = `Score: ${quizScore}/${quizIndex + 1}`;
  quizNextBtn.style.display = "block";
}

function renderQuizSummary() {
  const pct = Math.round((quizScore / quizDeck.length) * 100);
  const setTitle = getSetTitle(currentFlashcards);

  const pastAttempts = saveQuizAttempt(setTitle, quizScore, quizDeck.length, pct);
  const trendHtml = buildQuizTrendHtml(pastAttempts, pct);

  quizProgress.textContent = "Quiz complete";
  quizTimerEl.textContent = "";
  quizScoreLabel.textContent = "";
  quizQuestion.textContent = "";
  quizFeedback.textContent = "";
  quizNextBtn.style.display = "none";

  quizOptions.innerHTML = `
    <div class="quiz-summary" id="quizSummaryBox">
      <div>You scored</div>
      <div class="score-big" id="scoreCountUp">0 / ${quizDeck.length}</div>
      <div>${pct}% correct</div>
      ${trendHtml}
      <button id="quizRetryBtn" class="secondary-btn" style="margin-top:16px;">🔁 Try Again</button>
    </div>
  `;

  animateScoreCountUp(quizScore, quizDeck.length);
  if (pct >= 70) {
    launchConfetti(document.getElementById("quizSummaryBox"));
  }

  document.getElementById("quizRetryBtn").addEventListener("click", () => {
    quizDeck = shuffleArray(currentFlashcards);
    quizIndex = 0;
    quizScore = 0;
    renderQuizQuestion();
  });
}

// ---------------------------------------------------------------
// QUIZ PERFORMANCE TRACKING (per set, saved in this browser)
// ---------------------------------------------------------------

const QUIZ_HISTORY_KEY = "quiz_performance_history";
const MAX_ATTEMPTS_PER_SET = 20;

function loadQuizHistory() {
  try {
    const raw = localStorage.getItem(QUIZ_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

// Saves this attempt and returns the PAST attempts for this set
// (not including the one just saved), most recent first.
function saveQuizAttempt(setTitle, score, total, pct) {
  const allHistory = loadQuizHistory();
  const pastAttempts = (allHistory[setTitle] || []).slice();

  const newAttempt = {
    timestamp: new Date().toISOString(),
    score: score,
    total: total,
    pct: pct
  };

  const updated = [newAttempt, ...pastAttempts].slice(0, MAX_ATTEMPTS_PER_SET);
  allHistory[setTitle] = updated;

  try {
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(allHistory));
  } catch (err) {
    // Storage full or unavailable - fail silently, this is a nice-to-have
  }

  return pastAttempts;
}

function buildQuizTrendHtml(pastAttempts, currentPct) {
  if (pastAttempts.length === 0) {
    return `<div class="quiz-trend-note">First attempt on this set — nice work getting started!</div>`;
  }

  const lastAttempt = pastAttempts[0];
  const diff = currentPct - lastAttempt.pct;

  let trendLine;
  if (diff > 0) {
    trendLine = `<span class="trend-up">▲ Up ${diff}%</span> from your last attempt (${lastAttempt.pct}%)`;
  } else if (diff < 0) {
    trendLine = `<span class="trend-down">▼ Down ${Math.abs(diff)}%</span> from your last attempt (${lastAttempt.pct}%)`;
  } else {
    trendLine = `Same as your last attempt (${lastAttempt.pct}%)`;
  }

  const bestPct = Math.max(currentPct, ...pastAttempts.map((a) => a.pct));
  const attemptCount = pastAttempts.length + 1;

  const recentList = pastAttempts
    .slice(0, 4)
    .map((a) => `<li>${a.score}/${a.total} (${a.pct}%) · ${formatRelativeTime(a.timestamp)}</li>`)
    .join("");

  return `
    <div class="quiz-trend-note">
      ${trendLine}<br>
      Attempt #${attemptCount} on this set · Best so far: ${bestPct}%
      <ul class="quiz-trend-list">${recentList}</ul>
    </div>
  `;
}

quizModeBtn.addEventListener("click", openQuizMode);
quizCloseBtn.addEventListener("click", closeQuizMode);
quizNextBtn.addEventListener("click", () => {
  quizIndex++;
  renderQuizQuestion();
});

quizOverlay.addEventListener("click", (e) => {
  if (e.target === quizOverlay) closeQuizMode();
});

// ---------------------------------------------------------------
// MY PROGRESS PAGE (browses quiz performance across ALL sets)
// ---------------------------------------------------------------

function openProgressPage() {
  renderProgressList();
  progressOverlay.style.display = "flex";
}

function closeProgressPage() {
  progressOverlay.style.display = "none";
}

function renderProgressList() {
  const allHistory = loadQuizHistory();
  const setTitles = Object.keys(allHistory);

  if (setTitles.length === 0) {
    progressList.innerHTML = `
      <div class="progress-empty">
        No quiz attempts yet.<br>
        Take a Quiz Mode session on any flashcard set to start tracking your progress here.
      </div>
    `;
    return;
  }

  // Sort sets by most recent activity first
  const sorted = setTitles
    .map((title) => ({ title, attempts: allHistory[title] }))
    .sort((a, b) => new Date(b.attempts[0].timestamp) - new Date(a.attempts[0].timestamp));

  progressList.innerHTML = "";

  sorted.forEach(({ title, attempts }) => {
    const latest = attempts[0];
    const best = Math.max(...attempts.map((a) => a.pct));

    let trendBadge = "";
    if (attempts.length > 1) {
      const diff = latest.pct - attempts[1].pct;
      if (diff > 0) trendBadge = `<span class="trend-up">▲ ${diff}%</span>`;
      else if (diff < 0) trendBadge = `<span class="trend-down">▼ ${Math.abs(diff)}%</span>`;
      else trendBadge = `<span style="color:var(--text-muted)">— no change</span>`;
    }

    const item = document.createElement("div");
    item.className = "progress-item";
    item.innerHTML = `
      <div class="progress-item-top">
        <span class="progress-item-title">${escapeHtml(title)}</span>
        <span class="progress-item-latest">${latest.pct}%</span>
      </div>
      <div class="progress-item-meta">
        ${attempts.length} attempt${attempts.length > 1 ? "s" : ""} ·
        best ${best}% ·
        last ${formatRelativeTime(latest.timestamp)}
        ${trendBadge ? " · " + trendBadge : ""}
      </div>
    `;
    progressList.appendChild(item);
  });
}

progressBtn.addEventListener("click", openProgressPage);
progressCloseBtn.addEventListener("click", closeProgressPage);
clearProgressBtn.addEventListener("click", () => {
  localStorage.removeItem(QUIZ_HISTORY_KEY);
  renderProgressList();
});
progressOverlay.addEventListener("click", (e) => {
  if (e.target === progressOverlay) closeProgressPage();
});

// ---------------------------------------------------------------
// QUIZ SUMMARY POLISH (purely visual - doesn't affect scoring,
// tracking, or any saved data, just how the result is presented)
// ---------------------------------------------------------------

function animateScoreCountUp(finalScore, total) {
  const el = document.getElementById("scoreCountUp");
  if (!el) return;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = `${finalScore} / ${total}`;
    return;
  }

  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const current = Math.round(progress * finalScore);
    el.textContent = `${current} / ${total}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function launchConfetti(container) {
  if (!container) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const colors = ["#4C56F0", "#7B61FF", "#FF6B4A", "#4FCB8A", "#FF8464"];
  const pieceCount = 24;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    piece.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
    container.appendChild(piece);

    // Clean up after the animation finishes so the DOM doesn't grow
    piece.addEventListener("animationend", () => piece.remove());
  }
}

// ---------------------------------------------------------------
// PRINT / EXPORT AS PDF
// ---------------------------------------------------------------
// Uses the browser's native print dialog. Choosing "Save as PDF"
// as the destination in that dialog produces an actual PDF file -
// no extra libraries needed. This is separate from "Save
// Flashcards" (which downloads a .json to reload into the app
// later) - this one is for printing or handing in as a document.

printBtn.addEventListener("click", () => {
  if (currentFlashcards.length === 0) {
    statusMsg.style.color = "var(--error)";
    statusMsg.textContent = "Generate some flashcards first before printing.";
    return;
  }

  const setTitle = getSetTitle(currentFlashcards);
  const dateStr = new Date().toLocaleDateString();

  const itemsHtml = currentFlashcards
    .map((card) => {
      const term = card.question.replace(/^What is\s+/i, "").replace(/\?$/, "");
      return `
        <div class="print-item">
          <div class="print-term">${escapeHtml(term)}</div>
          <div class="print-meaning">${escapeHtml(card.answer)}</div>
        </div>
      `;
    })
    .join("");

  printArea.innerHTML = `
    <div class="print-title">${escapeHtml(setTitle)}</div>
    <div class="print-subtitle">${currentFlashcards.length} terms · printed ${dateStr}</div>
    ${itemsHtml}
  `;

  window.print();
});