# This tells the hosting service exactly how to set up a computer
# to run your app - including installing Tesseract OCR, which is
# system software (not just a Python package) that your free mock
# mode needs for reading text out of images.

FROM python:3.11-slim

# Install Tesseract OCR (system-level, same as what you installed on Windows)
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# The hosting service tells us which port to listen on via $PORT
ENV PORT=5000
EXPOSE 5000

CMD gunicorn app:app --bind 0.0.0.0:$PORT
