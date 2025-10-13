# Monitoring Service Blueprint

## Responsibilities
- Subscribe to MQTT topics published by edge gateways.
- Normalize payloads into canonical JSON schema.
- Persist time-series data to the telemetry database.
- Emit anomalies to the alert orchestrator via Kafka.

## Technology Stack
- FastAPI for RESTful ingestion endpoints.
- Pydantic for payload validation.
- Kafka producer for streaming alerts.
- TimescaleDB client for durable storage.

## Deployment Considerations
- Horizontal pod autoscaling based on message throughput.
- Circuit breaker to protect downstream databases.
- Expose Prometheus metrics for latency and error tracking.
