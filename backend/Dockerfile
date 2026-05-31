# =============================================================================
# Backend Dockerfile
# Uses Python 3.11 (3.12+ has PyTorch compatibility issues on some platforms)
# Pins PyTorch to 2.3.x for broad compatibility including macOS hosts
# =============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for psycopg2, Playwright browsers, and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Upgrade pip and install Python deps (including PyTorch via CPU-only for portability)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        torch==2.3.1 \
        torchvision==0.18.1 \
        --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    # Install Playwright browsers (needed for LinkedIn scraper)
    playwright install chromium && \
    playwright install-deps chromium

# Copy the rest of the application
COPY . .

# Expose the backend port
EXPOSE 8000

# Run the backend with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
