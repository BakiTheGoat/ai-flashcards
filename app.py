"""
AI Flashcard Generator - Flask Backend
----------------------------------------
This is the "brain" of the app. It:
1. Serves the webpage (index.html)
2. Receives notes from the browser - either pasted text, or an
   uploaded .txt, .pdf, or image file
3. Turns that content into flashcards - either using the real Claude
   API (MOCK_MODE = False, costs a tiny amount of API credit), or a
   free, offline, rule-based generator (MOCK_MODE = True, no cost,
   but simpler/lower quality flashcards)
4. Sends the flashcards back to the browser as JSON

File handling in plain English:
- .txt file  -> we just read the text directly.
- .pdf file  -> we extract the text using the "pypdf" library.
- image file -> in REAL mode, Claude reads the picture directly (no
  OCR needed). In MOCK mode, we use free OCR software (Tesseract, via
  the "pytesseract" library) to pull text out of the picture instead,
  since mock mode never calls the paid AI.
"""

import os
import re
import json
import base64
import io
from flask import Flask, render_template, request, jsonify
from anthropic import Anthropic
from pypdf import PdfReader

app = Flask(__name__)

# ---------------------------------------------------------------
# API KEY SETUP
# ---------------------------------------------------------------
# NEVER type your API key directly into this file if you plan to
# share your code (e.g. on GitHub). Instead, we read it from an
# "environment variable" - a value stored outside your code.
#
# How to set it (see README.md for full details):
#   Windows (PowerShell):  $env:ANTHROPIC_API_KEY="your-key-here"
#   Mac/Linux:              export ANTHROPIC_API_KEY="your-key-here"
# ---------------------------------------------------------------

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

MODEL_NAME = "claude-sonnet-4-6"  # a fast, capable Claude model

# ---------------------------------------------------------------
# MOCK MODE
# ---------------------------------------------------------------
# Set this to True to skip the real (paid) API call. Instead, the
# app reads your actual uploaded/pasted content and generates simple
# flashcards using free, offline, rule-based logic - no API key or
# credits needed. Great for testing/demoing the full pipeline for
# free. Set to False when you're ready for higher-quality, real
# AI-generated flashcards (costs a small amount of API credit).
# ---------------------------------------------------------------
MOCK_MODE = True

ALLOWED_TEXT_EXTENSIONS = {"txt"}
ALLOWED_PDF_EXTENSIONS = {"pdf"}
ALLOWED_JSON_EXTENSIONS = {"json"}
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
IMAGE_MEDIA_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
}

FLASHCARD_INSTRUCTIONS = """You are a study assistant. Read the content provided and create
flashcards to help a student memorize the key concepts.

Rules:
- Create ONE flashcard for every distinct term or concept covered in the
  content. If there are 10 terms, make 10 flashcards. If there are 100
  terms, make 100 flashcards. Do not skip any and do not artificially
  limit the count - cover everything present.
- Each flashcard has a short "question" and a concise "answer".
- Focus on definitions, key facts, and important relationships.
- Respond with ONLY valid JSON, no other text, no markdown code fences.
- Use exactly this format:

[
  {"question": "...", "answer": "..."},
  {"question": "...", "answer": "..."}
]
"""


def get_extension(filename):
    """Returns the lowercase file extension without the dot, e.g. 'pdf'."""
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def extract_text_from_pdf(file_storage):
    """Reads a PDF file (uploaded via the browser) and pulls out its text."""
    reader = PdfReader(file_storage)
    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def extract_text_from_image_ocr(file_storage):
    """
    Uses free OCR (Tesseract via pytesseract) to read text out of an
    image. Only used in MOCK_MODE, since real mode sends the image
    straight to Claude instead. Requires the Tesseract OCR engine to
    be installed on your computer (see README.md).

    If Tesseract isn't on your system PATH, set an environment
    variable TESSERACT_CMD to its full .exe path (Windows) and this
    will pick it up automatically - no code changes needed.
    """
    from PIL import Image
    import pytesseract

    tesseract_cmd = os.environ.get("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    image = Image.open(file_storage)
    text = pytesseract.image_to_string(image)
    return text.strip()


def parse_flashcard_response(raw_text):
    """Cleans up and parses the AI's JSON response into a Python list."""
    raw_text = raw_text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        raw_text = raw_text.replace("json", "", 1).strip()
    return json.loads(raw_text)


def looks_like_header(line):
    """
    True only for actual title/header lines like 'Chapter 3', 'Unit 1',
    'Page 2 of 5' - i.e. the word is followed by a number. This avoids
    false positives on real terms that happen to contain these words,
    like 'Unit Testing'.
    """
    return bool(re.search(r'\b(chapter|unit|page)\s*\d', line, re.IGNORECASE))


def generate_mock_flashcards(text):
    """
    Free, offline, rule-based flashcard generator. Not real AI - just
    pattern matching - but it reads your ACTUAL content so you can
    test the full app pipeline for free.

    Two strategies, applied in order:
    1. TWO-LINE PAIRS: a short "term" line followed by a line that
       starts with a lowercase letter (e.g. "Switch" / "connects
       devices..."). This catches ANY definition phrasing - "is",
       "connects", "allows", "enables", "controls", etc. - since it
       doesn't rely on a fixed list of verbs.
    2. SAME-LINE PATTERNS: "Term refers to X", "Term is/are X",
       "Term: X" all on one line.
    """
    raw_lines = [l.strip() for l in re.split(r'\n+', text) if l.strip()]

    def looks_like_term_line(line):
        # A term line is short, has no sentence-ending punctuation,
        # and doesn't already contain a colon (which would make it
        # a same-line pattern instead).
        return (2 <= len(line) <= 60
                and ":" not in line
                and not line.endswith((".", "!", "?"))
                and not looks_like_header(line))

    flashcards = []
    seen_terms = set()
    used_indices = set()

    # --- Strategy 1: two-line term/definition pairs ---
    for i in range(len(raw_lines) - 1):
        if i in used_indices:
            continue
        term_line = raw_lines[i]
        next_line = raw_lines[i + 1]

        if looks_like_term_line(term_line) and re.match(r'^[a-z]', next_line):
            term = term_line.strip()
            meaning = next_line.strip()
            # Clean up leading "is"/"are"/"refers to" so answers read
            # naturally as a standalone sentence, e.g. "a device that..."
            meaning = re.sub(r'^(is|are|refers to)\s+', '', meaning, flags=re.IGNORECASE)
            meaning = meaning.rstrip(".") + "."

            term_key = term.lower()
            if term_key not in seen_terms:
                seen_terms.add(term_key)
                flashcards.append({"question": f"What is {term}?", "answer": meaning})
            used_indices.add(i)
            used_indices.add(i + 1)

    # --- Strategy 2: same-line patterns, for anything not already caught ---
    remaining_lines = [l for idx, l in enumerate(raw_lines) if idx not in used_indices]
    candidates = []
    for line in remaining_lines:
        for piece in re.split(r'(?<=[.!?])\s+(?=[A-Z0-9])', line):
            piece = piece.strip()
            if piece:
                candidates.append(piece)

    patterns = [
        r'^\s*(?:\d+[\.\)]\s*)?(.+?)\s+refers to\s+(.+)$',
        r'^\s*(?:\d+[\.\)]\s*)?(.+?)\s+(?:is|are)\s+(.+)$',
        r'^\s*(?:\d+[\.\)]\s*)?([^:]{2,60}):\s*(.+)$',
    ]

    for sentence in candidates:
        sentence = re.sub(r'^\s*\d+[\.\)]\s*', '', sentence).strip()
        if len(sentence) < 15:
            continue

        for pattern in patterns:
            m = re.match(pattern, sentence, re.IGNORECASE)
            if m:
                term = m.group(1).strip().strip('"\'')
                meaning = m.group(2).strip().rstrip(".") + "."

                if len(term) < 2 or len(term) > 60:
                    continue
                if looks_like_header(term):
                    continue

                term_key = term.lower()
                if term_key in seen_terms:
                    continue
                seen_terms.add(term_key)
                flashcards.append({"question": f"What is {term}?", "answer": meaning})
                break

        if len(flashcards) >= 200:
            break

    if not flashcards:
        flashcards.append({
            "question": "No clear term/definition pairs found",
            "answer": "Try text with a term on its own line followed by its definition, or patterns like 'Term: definition'."
        })

    return flashcards


@app.route("/")
def home():
    """Serves the main webpage."""
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate_flashcards():
    """
    Receives EITHER pasted notes text OR an uploaded file (.txt, .pdf,
    or an image) from the frontend, turns it into flashcards, and
    returns them as JSON.
    """
    notes = request.form.get("notes", "").strip()
    uploaded_file = request.files.get("file")

    has_text = bool(notes)
    has_file = uploaded_file is not None and uploaded_file.filename != ""

    if not has_text and not has_file:
        return jsonify({"error": "Please paste some notes or upload a file first."}), 400

    image_content_block = None  # only used in REAL mode for images

    if has_file:
        ext = get_extension(uploaded_file.filename)

        # A previously saved flashcard set - load it directly and skip
        # regeneration entirely (free, instant, no OCR/AI involved).
        if ext in ALLOWED_JSON_EXTENSIONS:
            try:
                saved_data = json.load(uploaded_file)
                flashcards = saved_data.get("flashcards", saved_data) if isinstance(saved_data, dict) else saved_data
                if not isinstance(flashcards, list) or not all(
                    isinstance(c, dict) and "question" in c and "answer" in c for c in flashcards
                ):
                    raise ValueError("bad shape")
            except Exception:
                return jsonify({"error": "That doesn't look like a valid saved flashcard file."}), 400
            return jsonify({"flashcards": flashcards})

        if ext in ALLOWED_TEXT_EXTENSIONS:
            file_text = uploaded_file.read().decode("utf-8", errors="ignore").strip()
            notes = (notes + "\n\n" + file_text).strip() if notes else file_text

        elif ext in ALLOWED_PDF_EXTENSIONS:
            try:
                file_text = extract_text_from_pdf(uploaded_file)
            except Exception:
                return jsonify({"error": "Could not read that PDF. Try a different file."}), 400
            if not file_text:
                return jsonify({"error": "Couldn't find any text in that PDF (it may be a scanned image PDF)."}), 400
            notes = (notes + "\n\n" + file_text).strip() if notes else file_text

        elif ext in ALLOWED_IMAGE_EXTENSIONS:
            if MOCK_MODE:
                # Free path: OCR the image locally instead of using paid AI vision
                try:
                    file_text = extract_text_from_image_ocr(uploaded_file)
                except Exception:
                    return jsonify({
                        "error": "Free OCR isn't set up yet. Install Tesseract OCR "
                                 "(see README.md) to read text from images for free, "
                                 "or switch MOCK_MODE to False to use real AI vision."
                    }), 500
                if not file_text:
                    return jsonify({"error": "Couldn't read any text from that image. Try a clearer photo."}), 400
                notes = (notes + "\n\n" + file_text).strip() if notes else file_text
            else:
                # Real mode: send the image straight to Claude, no OCR needed
                image_bytes = uploaded_file.read()
                image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
                image_content_block = {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": IMAGE_MEDIA_TYPES[ext],
                        "data": image_b64,
                    },
                }

        else:
            return jsonify({"error": "Unsupported file type. Please upload a .txt, .pdf, image, or saved .json file."}), 400

    # -----------------------------------------------------------
    # MOCK MODE: free, offline, rule-based flashcards from the
    # REAL content you provided (typed notes and/or extracted text).
    # -----------------------------------------------------------
    if MOCK_MODE:
        if len(notes) < 20:
            return jsonify({"error": "That's a bit short — add more notes or a bigger file for better flashcards."}), 400
        flashcards = generate_mock_flashcards(notes)
        return jsonify({"flashcards": flashcards})

    # -----------------------------------------------------------
    # REAL MODE: send to Claude (costs a small amount of API credit)
    # -----------------------------------------------------------
    if not image_content_block and len(notes) < 20:
        return jsonify({"error": "That's a bit short — add more notes for better flashcards."}), 400

    if image_content_block:
        text_instruction = FLASHCARD_INSTRUCTIONS
        if notes:
            text_instruction += f"\n\nThe student also added these extra notes:\n\"\"\"\n{notes}\n\"\"\""
        message_content = [
            image_content_block,
            {"type": "text", "text": text_instruction},
        ]
    else:
        message_content = f"{FLASHCARD_INSTRUCTIONS}\n\nNotes:\n\"\"\"\n{notes}\n\"\"\""

    try:
        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=8192,
            messages=[{"role": "user", "content": message_content}]
        )

        raw_text = response.content[0].text
        flashcards = parse_flashcard_response(raw_text)

        return jsonify({"flashcards": flashcards})

    except json.JSONDecodeError:
        return jsonify({"error": "AI response wasn't in the right format. Please try again."}), 500
    except Exception as e:
        return jsonify({"error": f"Something went wrong: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)