FROM python:3.13-slim

WORKDIR /workspace

COPY packages/common /workspace/packages/common
COPY services/api/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -e /workspace/packages/common && \
    pip install --no-cache-dir -r /workspace/requirements.txt aiokafka

COPY ml /workspace/ml
COPY services /workspace/services

ENV PYTHONPATH=/workspace

CMD ["python", "services/persistence_worker/app/main.py"]
