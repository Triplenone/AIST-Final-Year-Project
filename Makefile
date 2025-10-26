.PHONY: bootstrap backend frontend firmware docs

bootstrap:
	@echo "TODO: install pre-commit, python deps, npm deps"

backend:
	cd backend && uvicorn app.main:app --reload

frontend:
	cd frontend/web-dashboard && python -m http.server 5500

firmware:
	cd firmware && pio run

docs:
	@echo "Fill docs/ before running mkdocs"
