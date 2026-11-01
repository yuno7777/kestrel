FROM python:3.13-slim

WORKDIR /workspace

# Install common package and dependencies
COPY packages/common /workspace/packages/common
COPY services/api/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -e /workspace/packages/common && \
    pip install --no-cache-dir -r /workspace/requirements.txt

# Copy source code and artifacts
COPY ml /workspace/ml
COPY services/api /workspace/services/api

ENV PYTHONPATH=/workspace
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "services.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
