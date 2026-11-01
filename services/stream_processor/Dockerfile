FROM python:3.13-slim

WORKDIR /workspace

COPY packages/common /workspace/packages/common
COPY services/api/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -e /workspace/packages/common && \
    pip install --no-cache-dir -r /workspace/requirements.txt aiokafka redis

COPY ml /workspace/ml
COPY services /workspace/services

ENV PYTHONPATH=/workspace

CMD ["python", "services/stream_processor/app/main.py"]
