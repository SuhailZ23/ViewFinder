# Use Python for the Backend
FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential

# Copy requirements.txt (This is correct here)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]