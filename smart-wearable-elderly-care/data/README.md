# Data & Intelligence

This space defines the data strategy, analytics assets, and machine learning deliverables.

## Pipelines
- Raw telemetry ingestion into the time-series store.
- Batch ETL from operational databases into the analytics warehouse.
- ML training pipelines orchestrated via Apache Airflow, producing models tracked in MLflow.

## Governance & Compliance
- Data catalog managed through Apache Atlas with lineage tracking.
- Role-based access control and column-level masking for sensitive fields.
- Differential privacy techniques applied when sharing aggregated reports.

See `pipelines/` for detailed runbooks and DAG specifications.
