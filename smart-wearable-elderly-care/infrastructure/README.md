# Infrastructure & DevSecOps

Defines cloud infrastructure, CI/CD, and observability required to run the platform reliably.

## Infrastructure-as-Code
- Terraform modules for network, Kubernetes clusters, databases, and secrets management.
- Environment-specific overlays (dev, staging, production) with automated policy checks via Open Policy Agent.

## Platform Engineering
- GitHub Actions pipelines performing linting, security scans (Snyk, Trivy), and automated deployments.
- Argo CD managing GitOps workflows to sync Kubernetes manifests.
- Observability stack composed of Prometheus, Loki, Tempo, and Grafana for unified monitoring.

## Security Controls
- Identity-aware proxies enforcing zero-trust access.
- Secrets rotated using HashiCorp Vault.
- Continuous compliance reports against HIPAA/GDPR frameworks.
