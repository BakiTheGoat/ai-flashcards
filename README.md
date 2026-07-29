# AI Flashcard Generator

Paste notes, or upload a .txt, PDF, picture, or a previously saved set ->
get flashcards -> study them with flip cards, timed quizzes, and progress
tracking, all with dark mode and a couple of good demo moments.

Live version: https://ai-flashcards-baki.onrender.com

## What's inside
- `app.py` — Flask backend (generation logic, file handling, mock/real AI modes)
- `templates/index.html` — the webpage structure
- `static/style.css` — styling, dark mode, animations, print layout
- `static/script.js` — all frontend logic (upload, history, study/quiz modes, etc.)
- `requirements.txt` — Python packages needed
- `Dockerfile` — tells hosting services (like Render) how to build/run the app
- `.gitignore` — keeps junk files out of version control

## Features

**Input**
- Paste notes directly, or upload a `.txt`, `.pdf`, or an image (photo of
  notes/textbook page)
- Upload a previously saved `.json` flashcard set to reload it instantly,
  no regeneration needed
- Recognizes two content styles: `Term: definition` / `Term (pos): meaning`
  glossary-style notes, AND `Q: ... A: ...` question/answer-style notes
  (keeps your original wording for Q&A pairs instead of rewording them)

**Studying**
- **Flip cards** in a grid — click any card to flip between term and meaning
- **Flip mode toggle** — switch whether the term or the meaning shows first
- **Study Mode** — one card at a time, shuffled, with keyboard shortcuts
  (Space/Enter to flip, arrow keys to navigate, Esc to close), plus
  "Knew it" / "Still learning" tracking and a filter for unlearned cards
- **Quiz Mode** — multiple choice (1 correct + 3 pulled from other cards in
  the set), with an optional per-question timer (no timer, 10s/15s/30s/60s)
- **Search** — filter the current set live as you type

**Tracking & history**
- **Recent flashcard sets** bar — auto-saves every set you generate, click
  a chip to reload it instantly (stored in your browser)
- **My Progress page** — tracks every quiz attempt per set over time, shows
  your latest score, best score, and trend vs your last attempt

**Saving & exporting**
- **Save Flashcards** — downloads the current set as a `.json` file you can
  re-upload later (a portable backup, separate from the browser history)
- **Print / Export PDF** — opens a clean, printer-friendly study sheet via
  your browser's print dialog; choose "Save as PDF" as the destination to
  get an actual PDF file

**Look & feel**
- Dark mode toggle (remembers your choice, also respects your system
  preference on first visit)
- Custom typography (Space Grotesk for headings, Public Sans for body,
  JetBrains Mono for data/timestamps), a stacked "index card" shadow effect
  on every flashcard, a springy flip animation, confetti + animated score
  count-up on a strong quiz result, and small polish touches (button
  ripple, glowing focus states, shimmer while generating)

## Two generation modes

**MOCK_MODE = True** (the default right now)
- 100% free, no API key required
- Reads your ACTUAL uploaded/pasted content
- Generates flashcards using rule-based pattern matching (recognizes
  `Term: meaning`, `Term (pos): meaning`, `Term` on its own line followed by
  its definition, and `Q:`/`A:` pairs)
- Lower quality than real AI on unstructured prose, but free and reliable
  for structured notes
- For images, uses free OCR software (Tesseract) to read the picture —
  works well on printed/typed text, less reliably on handwriting

**MOCK_MODE = False** (real AI mode)
- Uses the real Claude API — understands any phrasing or structure, much
  smarter results
- Costs a small amount of API credit (a few generations cost well under $0.10)
- For images, sends the picture directly to Claude (no OCR needed — Claude
  reads images natively, including handwriting)

Switch between them by editing `MOCK_MODE` near the top of `app.py`.

**Note on the deployed version:** image uploads on the free Render hosting
tier can fail (the OCR engine needs more memory than the free 512MB plan
reliably provides). Text and PDF uploads work fine there regardless of
mode. Image uploads are most reliable when running locally on your own PC.

## Step 1: Install Python packages
```bash
pip install -r requirements.txt
```

## Step 2 (only needed for FREE image reading in mock mode): Install Tesseract OCR

This is separate system software, not a Python package — pytesseract is just
a Python wrapper around it.

**Windows:**
1. Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Run it, keep the default install location (usually `C:\Program Files\Tesseract-OCR`)
3. If OCR gives an error saying it can't find tesseract, set an environment
   variable (no code editing needed):
   ```powershell
   $env:TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"
   ```
   Then restart the app with `python app.py` in that same terminal.

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt install tesseract-ocr
```

If you skip this step, everything else still works — you just won't be able
to OCR images while in mock mode. Text, PDF, and JSON uploads work either way.

## Step 3 (only needed for REAL AI mode): Get an Anthropic API key
1. Go to https://console.anthropic.com/
2. Sign up / log in, add a small amount of funds ($5 is plenty for a class project)
3. Go to "API Keys" and create a new key

Set it as an environment variable:

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="your-key-here"
```

**Mac/Linux:**
```bash
export ANTHROPIC_API_KEY="your-key-here"
```

(You'll need to set this every time you open a new terminal, unless you add
it to your system environment variables permanently.)

## Step 4: Run the app
```bash
python app.py
```

Then open your browser to: **http://127.0.0.1:5000**

## How to use it
- Type/paste notes into the text box, AND/OR upload a `.txt`, `.pdf`, image,
  or saved `.json` set
- Click "Generate Flashcards"
- Click any card to flip between term and meaning
- Try **Study Mode** for focused, shuffled review with keyboard shortcuts
- Try **Quiz Mode** to test yourself with multiple choice and an optional timer
- Check **My Progress** (top bar) to see how your quiz scores trend over time
- Use **Save Flashcards** to back up a set, or **Print / Export PDF** for a
  physical/PDF study sheet

## How the AI part works (real mode, plain terms)
1. Your content gets sent to Claude with instructions: "turn this into
   flashcards, reply ONLY in this JSON format, one card per term/concept."
2. For images, the picture itself is sent — Claude reads it directly.
3. Claude sends back a list of question/answer pairs.
4. JavaScript turns each pair into a flip-able card.

## Deploying to the public internet (so anyone can use it, not just you)

Already deployed at https://ai-flashcards-baki.onrender.com using
**Render.com** (free tier). Here's the process, if setting up your own or
redeploying elsewhere:

### Step 1: Put your project on GitHub
1. Go to https://github.com and create a free account if you don't have one
2. Create a new repository (e.g. "ai-flashcards")
3. Push your whole project folder to it (all files: `app.py`,
   `templates/`, `static/`, `requirements.txt`, `Dockerfile`, `.gitignore`)
   ```powershell
   git init
   git add .
   git commit -m "first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/ai-flashcards.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to https://render.com and sign up (free, can use your GitHub account)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your `ai-flashcards` repository
4. Render will detect the `Dockerfile` automatically - leave the settings
   on their defaults (it should say "Docker" as the environment)
5. Choose the **Free** instance type
6. Under **"Environment Variables"**, add `ANTHROPIC_API_KEY` (only needed
   if `MOCK_MODE` is `False`)
7. Click **"Create Web Service"**

Render builds and deploys automatically - takes a few minutes the first
time, then gives you a public URL like `https://your-app.onrender.com`.

### Notes on public deployment
- **Free tier sleeps when idle.** Spins down after 15 minutes of no
  traffic, takes ~30-60 seconds to wake back up on the next visit.
- **MOCK_MODE default:** the deployed version uses whatever `MOCK_MODE` is
  set to in `app.py` at the time you pushed it.
- **Image uploads are unreliable on the free tier** (OCR memory limits) —
  text/PDF work fine regardless.
- **History and Progress data are per-browser** (localStorage) — won't
  sync between your PC, phone, or a different browser.
- **To update the live version:** push changes to GitHub
  (`git add .`, `git commit -m "..."`, `git push`) - Render redeploys
  automatically within a minute or two.

## Ideas to extend it further (optional, for extra credit / polish)
- Persist flashcard sets and quiz progress in a real database (SQLite)
  instead of browser-only storage, so it follows you across devices
- Tag/categorize sets by subject once you have many of them
- Add accessibility labels (aria-label) to icon-only buttons
- Add a first-time onboarding hint pointing out Study Mode, Quiz Mode,
  and the Progress page for new users