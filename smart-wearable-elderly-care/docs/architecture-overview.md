# System Architecture Overview

The solution is organized around four interacting layers: Edge Devices, Platform Services, Data & Intelligence, and Experience & Operations. The design balances resident safety, clinical workflows, and data privacy to meet the goals of the "Smart Wearable and Smart Elderly Care Home" proposal.

## 1. Edge Devices Layer

This layer covers all hardware deployed on residents and inside the facility.

- **Smart Wearable Hub**: Wrist-worn device with biometric sensors (heart rate, SpO2, fall detection IMUs) and BLE connectivity to gateway tablets.
- **In-Home Sensors**: Bed occupancy mats, door sensors, and ambient monitoring (temperature, air quality) connected via Zigbee/Matter.
- **Edge Gateway**: Android tablet or embedded Linux gateway with containerized agent for buffering data, running over-the-air (OTA) updates, and executing offline alerts when connectivity drops.

Communication from this layer uses MQTT over TLS to reach the ingestion API.

## 2. Platform Services Layer

Cloud-native services delivering core functionality.

- **Ingestion Service** (FastAPI + MQTT bridge) normalizes sensor payloads and persists to the time-series store.
- **Resident Management Service** provides CRUD operations for resident profiles, care plans, and device assignments.
- **Alert Orchestration Service** applies configurable rules to streaming data and triggers notifications to caregivers and family members.
- **Integration Service** connects to electronic health record (EHR) systems via FHIR/HL7, ensuring synchronized clinical data.

Services communicate through an event bus (Kafka) and expose REST/GraphQL APIs secured with OAuth2 and fine-grained RBAC.

## 3. Data & Intelligence Layer

Advanced analytics and AI models power predictive care.

- **Time-Series Database** (InfluxDB/TimescaleDB) storing high-frequency sensor data.
- **Feature Store & ML Pipelines** built on Apache Spark and MLflow to train models for fall-risk prediction, anomaly detection, and personalized activity recommendations.
- **Analytics Warehouse** (Snowflake/BigQuery) aggregates operational and clinical data for BI dashboards.
- **Data Governance** includes PII encryption, differential privacy for analytics sharing, and audit logs retained per regulatory requirements.

## 4. Experience & Operations Layer

Interfaces and processes that deliver value to end users.

- **Mobile Caregiver App** (Flutter/React Native) providing real-time alerts, resident status, and task management.
- **Family Web Portal** (React + Next.js) offering wellbeing summaries, communication, and visit scheduling.
- **Operations Control Center** dashboards (Grafana) showing facility KPIs, device fleet health, and SLA adherence.
- **DevSecOps Tooling** including Terraform for IaC, GitHub Actions CI/CD, automated security scans, and observability stack (Prometheus, Loki, Tempo).

## Cross-Cutting Concerns

- **Security & Compliance**: End-to-end encryption, device attestation, HIPAA/GDPR-compliant data handling, and role-based access.
- **Reliability**: Multi-region deployment with active-active failover, circuit breakers, and automated incident response.
- **Scalability**: Containerized microservices on Kubernetes with autoscaling based on sensor load.

This layered architecture ensures that wearable-derived insights seamlessly flow into care operations while maintaining safety, privacy, and scalability.
