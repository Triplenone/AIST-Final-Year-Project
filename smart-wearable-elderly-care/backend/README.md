# Backend Services

This folder groups the cloud microservices required by the platform.

## Service Catalogue

- `services/monitoring-service.md`: Handles ingestion of biometric and ambient telemetry.
- `services/resident-service.md`: Manages resident profiles, care plans, and device assignments.
- `services/alert-service.md`: Executes rule-based and ML-driven alerting workflows.
- `services/integration-service.md`: Synchronizes data with third-party EHR systems.

Each service is expected to expose OpenAPI specifications, implement OAuth2 scopes, and publish events to the Kafka backbone described in the architecture overview.
