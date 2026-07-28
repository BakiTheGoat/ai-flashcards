# AI Flashcard Generator

Paste notes, or upload a .txt, PDF, or picture of your notes -> get flashcards
-> click to flip and study.

## What's inside
- `app.py` — Flask backend
- `templates/index.html` — the webpage
- `static/style.css` — styling + flip animation
- `static/script.js` — frontend logic (sends notes/files, displays flashcards)
- `requirements.txt` — Python packages you need

## Two modes

**MOCK_MODE = True** (the default right now)
- 100% free, no API key required
- Reads your ACTUAL uploaded/pasted content
- Generates flashcards using simple rule-based logic (splits sentences,
  looks for "X is Y" or "X: Y" patterns)
- Lower quality than real AI, but perfect for testing/demoing for free
- For images, uses free OCR software (Tesseract) to read the picture

**MOCK_MODE = False** (real AI mode)
- Uses the real Claude API — much smarter, better flashcards
- Costs a small amount of API credit (a few generations cost well under $0.10)
- For images, sends the picture directly to Claude (no OCR needed —
  Claude can read images natively)

Switch between them by editing `MOCK_MODE` near the top of `app.py`.

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
to OCR images while in mock mode. Text and PDF uploads work either way.

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
- Type/paste notes into the text box, AND/OR
- Click "Choose a file" and upload a .txt, .pdf, or image
- Click "Generate Flashcards"
- Click any card to flip between question and answer

## How the AI part works (real mode, plain terms)
1. Your content gets sent to Claude with instructions: "turn this into
   flashcards, reply ONLY in this JSON format."
2. For images, the picture itself is sent — Claude reads it directly.
3. Claude sends back a list of question/answer pairs.
4. JavaScript turns each pair into a flip-able card.

## Deploying to the public internet (so anyone can use it, not just you)

Right now the app only runs on your PC. To get a real public URL, you need
to host it somewhere. Here's the free, beginner-friendly path using
**Render.com**.

### Step 1: Put your project on GitHub
1. Go to https://github.com and create a free account if you don't have one
2. Create a new repository (e.g. "ai-flashcards")
3. Upload your whole project folder to it (all files: `app.py`,
   `templates/`, `static/`, `requirements.txt`, `Dockerfile`, `.gitignore`)

   Easiest way if you're new to Git - in your project folder:
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
6. Under **"Environment Variables"**, add:
   - `MOCK_MODE` → not needed here (it's controlled inside app.py, see note below)
   - `ANTHROPIC_API_KEY` → your real key (only needed if MOCK_MODE is False)
7. Click **"Create Web Service"**

Render will build and deploy your app - this takes a few minutes the first
time. When it's done, you'll get a public URL like:
```
https://ai-flashcards-xxxx.onrender.com
```
Anyone can open that link and use your app - no need for them to be on
your Wi-Fi or run anything themselves.

### Notes on public deployment
- **Free tier sleeps when idle.** Render's free instances "spin down" after
  15 minutes of no traffic, and take ~30-60 seconds to wake back up on the
  next visit. Fine for a class demo, just give it a moment if it seems slow
  at first.
- **MOCK_MODE default:** the deployed version will use whatever `MOCK_MODE`
  is set to in your `app.py` at the time you pushed it. Set it to `True`
  before deploying if you don't want visitors accidentally using your paid
  API credits.
- **History bar won't be shared between devices** - it's still per-browser
  (localStorage), same as running locally.
- **If you update your code later**, just push the changes to GitHub again
  (`git add .`, `git commit -m "update"`, `git push`) - Render automatically
  redeploys.

## Ideas to extend it (optional, for extra credit / polish)
- Save flashcard sets to a database (SQLite) so they persist between visits
- Add a subject/tag field so you can organize sets by class
- Add a "shuffle" or "quiz mode" button
- Add a loading spinner instead of just text
