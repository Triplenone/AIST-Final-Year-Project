# Infrastructure

This folder contains scaffold infrastructure files that are not the primary demo path.

## Current status
- docker-compose.dev.yml is a legacy scaffold and is not aligned with the current MySQL-backed backend.
- The runnable demo stack for this repo is docker-compose.demo.yml at the repository root.
- The active frontend communicates with /api/v1/* on the FastAPI backend.

## Recommendation
Use the root demo compose file for end-to-end demos. Treat infra/ as future-work scaffolding until it is updated to match the current backend configuration.
