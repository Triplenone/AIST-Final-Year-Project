# Data Pipelines Runbook

## Streaming Telemetry Pipeline
- Source: Kafka topics populated by the monitoring service.
- Processing: Apache Flink jobs performing windowed aggregations and anomaly scoring.
- Sink: TimescaleDB for long-term storage and Redis for low-latency dashboard access.

## Batch Analytics Pipeline
- Source: PostgreSQL (resident service) and TimescaleDB snapshots.
- Orchestration: Airflow DAG executing dbt transformations and loading curated marts into Snowflake.
- Output: BI datasets consumed by the Analytics Center and compliance reports.

## ML Training Pipeline
- Feature engineering notebooks converted into reusable Spark jobs.
- Model tracking with MLflow, including performance metrics and lineage.
- Continuous training triggered by data drift detection.
