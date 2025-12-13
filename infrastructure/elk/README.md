# ELK quick start (shared stack)

This folder contains the minimal ELK stack for Transcendence. Everything is configured to use:
- index prefix: `transcendence-v2-*` (versioned to avoid mapping conflicts)
- JSON logs from `data/logs` via Filebeat → Logstash → Elasticsearch → Kibana
- Saved Kibana objects checked in at `infrastructure/elk/kibana/saved-objects/export.ndjson`

## How to bring it up
1) Create writable log dir (if you did `bash scripts/setup-service.sh` it’s already done):
   - `mkdir -p data/logs && chmod u+rwX data/logs`
2) Start the stack:
   - `docker compose up -d elasticsearch logstash kibana filebeat`
   - (Optional) `docker compose up -d grafana rabbitmq vault` as needed.
3) Run the app (e.g., `pnpm dev:all`) to emit logs.

## Kibana setup for every dev
1) Data view: Kibana → Stack Management → Data Views → Create  
   - Name: `logs` (or any)  
   - Pattern: `transcendence-v2-*`  
   - Time field: `@timestamp`
2) Import dashboard: Kibana → Stack Management → Saved Objects → Import  
   - File: `infrastructure/elk/kibana/saved-objects/export.ndjson`  
   - Keep “overwrite conflicts” checked.
3) Open the imported dashboard (“Transcendence – Ops Dashboard”) and set time range (e.g., “Last 24 hours”).

## Notes and troubleshooting
- If Filebeat refuses to start with “filebeat.yml must be owned by uid=0”, either:
  - `sudo chown root:root infrastructure/elk/filebeat/filebeat.yml` (preferred), or
  - keep `user: root` and `--strict.perms=false` as in `docker-compose.yml`.
- If no docs appear: delete only bad indices (e.g., old `transcendence-*`) or bump the prefix again (e.g., `transcendence-v3`) in `.env` and restart Logstash.
- Logstash normalizes fields (`level` as string, `time`→`@timestamp`), so mapping stays stable.
