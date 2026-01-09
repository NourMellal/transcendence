SHELL := /bin/bash

SEED_FILE := infrastructure/vault/.seed.env
SEED_EXAMPLE := infrastructure/vault/.seed.env.example
CERT_DIR := infrastructure/nginx/certs

.PHONY: setup dev-up dev-down dev-restart eval-up eval-down eval-restart seed certs

COMPOSE_EVAL := docker compose -f docker-compose.yml
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

setup:
	bash scripts/setup-service.sh

dev-up: setup
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

dev-restart: dev-down dev-up

eval-up: setup
	$(COMPOSE_EVAL) up -d --build

eval-down:
	$(COMPOSE_EVAL) down

eval-restart: eval-down eval-up

seed:
	@if [ ! -f "$(SEED_FILE)" ]; then \
		if [ -n "$(SEED_SOURCE)" ] && [ -f "$(SEED_SOURCE)" ]; then \
			cp "$(SEED_SOURCE)" "$(SEED_FILE)"; \
			echo "Copied Vault seed from $(SEED_SOURCE)"; \
		else \
			echo "Missing $(SEED_FILE). Run 'make setup' or copy from $(SEED_EXAMPLE)."; \
			exit 1; \
		fi; \
	fi
	$(COMPOSE_EVAL) up -d vault
	@i=0; \
	until $(COMPOSE_EVAL) exec -T vault /vault/health-check.sh >/dev/null 2>&1; do \
		i=$$((i+1)); \
		if [ $$i -ge 30 ]; then \
			echo "Vault did not become ready in time."; \
			exit 1; \
		fi; \
		sleep 1; \
	done
	$(COMPOSE_EVAL) exec -T vault /vault/scripts/simple-setup.sh

certs:
	@if [ ! -f "$(CERT_DIR)/fullchain.pem" ] || [ ! -f "$(CERT_DIR)/privkey.pem" ]; then \
		echo "SSL certs missing. Running scripts/setup-ssl-certs.sh..."; \
		scripts/setup-ssl-certs.sh; \
	else \
		echo "SSL certs already present."; \
	fi
