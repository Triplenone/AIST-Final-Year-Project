# Infra Skeleton / °òÂ¦³]¬I°©¬[

- `docker-compose.dev.yml`: brings up Mosquitto, TimescaleDB, MinIO, backend, frontend.
- `mkcert-dev-certs.sh`: helper to generate dev TLS certs.
- `mosquitto/`: broker config & cert store.
- `sql/`: seed scripts / schema snapshots.

TODO: add edge-mode compose, secrets management, observability stack.
