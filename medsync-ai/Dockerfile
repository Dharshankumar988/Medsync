# Use the official Python slim image
FROM python:3.11-slim

# Set environment variables to prevent Python from buffering stdout/stderr
# and writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Hugging Face Spaces standard port
ENV PORT=7860
EXPOSE 7860

# Install system dependencies required for OpenCV and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with user ID 1000 (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Create and set working directory
WORKDIR $HOME/app

# Copy requirements file and install dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Copy the entire application
COPY --chown=user . .

# Ensure model and cache directories exist and are writable
RUN mkdir -p models/cache && chmod -R 777 models

ENV TORCH_HOME=/app/models/cache
ENV TRANSFORMERS_CACHE=/app/models/cache
ENV HF_HOME=/app/models/cache

# Run the FastAPI server via Uvicorn on 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
