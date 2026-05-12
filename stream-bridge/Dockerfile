FROM python:3.11-slim

WORKDIR /app

# Place cuip_sdk-2.0.3-py3-none-any.whl in stream-bridge/ before building
COPY cuip_sdk-2.0.3-py3-none-any.whl .
RUN pip install --no-cache-dir cuip_sdk-2.0.3-py3-none-any.whl

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV CUIP_API_KEY=""
ENV NODE_INGEST_URL="http://server:3001/api/stream-ingest"

CMD ["python", "main.py"]
