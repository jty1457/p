# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install FFMPEG and other dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the local Flask app to the container
COPY app.py .

# Run the Flask app using Gunicorn (or Flask dev server for local testing)
# Gunicorn is a WSGI HTTP server for UNIX, commonly used for running Python web apps.
# For Cloud Run, Gunicorn is a good choice. The PORT environment variable is set by Cloud Run.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
