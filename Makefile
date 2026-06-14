.PHONY: bootstrap backend frontend firmware docs

ARDUINO_CLI ?= C:/Program Files/Arduino IDE/resources/app/lib/backend/resources/arduino-cli.exe

bootstrap:
	@echo "TODO: install pre-commit, python deps, npm deps"

backend:
	cd backend/backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev -- --host 0.0.0.0

firmware:
	cd firmware && "$(ARDUINO_CLI)" compile --fqbn "esp32:esp32:esp32s3:FlashSize=8M,PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc" .

docs:
	@echo "Fill docs/ before running mkdocs"
