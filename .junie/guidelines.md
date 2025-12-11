Project mission
Build a multiplayer Pong platform with accounts, real‑time games, tournaments, and supporting services implemented as independent TypeScript microservices behind a custom API Gateway.[4][5]
Use hexagonal (ports and adapters) within each service, OpenAPI as the public API contract, and asynchronous integration via a message broker for cross‑service workflows.[5][6][7]
High‑level architecture
Microservices pattern: independent deployable services (User, Game, Tournament, etc.) behind an API Gateway that handles edge concerns and routes to services.[8][4]
Hexagonal inside services: domain and application layers are framework‑agnostic, with HTTP, DB, and messaging kept in infrastructure adapters that depend inward only.[9][5]
Event‑driven backbone: services publish integration events and subscribe to others via RabbitMQ/topic exchanges to keep services decoupled and eventually consistent.[6][10]
OpenAPI as source of truth: a split OpenAPI spec drives types, validation, client generation, docs, and contract tests to keep consumers and providers aligned.[7][11]
Secrets and configuration: sensitive credentials are managed via a vault pattern so services don’t hardcode secrets and can rotate safely when needed.[12][13]
Monorepo and shared code
Organize shared packages in a workspace so services import shared contracts without duplicating code while preserving service autonomy and independent builds.[14][15]
Shared “domain types” are interface/enum contracts only (no business logic), used for DTOs and cross‑service data shapes to keep a shared vocabulary without coupling implementations.[16][7]
Shared “messaging” contains integration event contracts and metadata (type, version, timestamp) but not broker connections or handlers, which belong to each service’s infrastructure.[17][18]
API boundary and frontend SPA
The SPA (TypeScript + Tailwind, no React) communicates only with the REST endpoints defined in OpenAPI through the Gateway, receiving/producing JSON DTOs defined by the spec.[2][1]
The frontend’s internal architecture is independent; it must not import backend entities or access service internals, and should generate or consume types directly from the OpenAPI spec for safety.[19][20]
For real‑time gameplay, the SPA uses WebSocket endpoints exposed by the game service or gateway, still exchanging serialized messages/DTOs rather than domain entities.[1][6]
Validation strategy (defense in depth)
Gateway layer: perform fast schema validation (OpenAPI/JSON schema), authentication, content‑type checks, basic sanitization, and rate‑limiting to fail early and protect services.[21][22][23]
Service layer: re‑validate and enforce business rules, state transitions, authorization/ownership, and invariants even if the gateway already validated the shape, to remain safe if the gateway is bypassed.[24][25]
Database layer: enforce integrity with unique keys, FKs, and check constraints as the last line of defense to preserve consistency under concurrent or partial failures.[23][26]
OpenAPI workflow
Author and maintain split OpenAPI files as the single source of truth, and auto‑bundle only as a generated artifact when needed by tools not supporting $ref imports.[11][7]
Generate TypeScript types for request/response from the spec for gateway, services, and frontend to prevent drift and give compile‑time safety across the stack.[27][28]
Use the spec for runtime request/response validation in the gateway during development, and retain explicit service‑side validation for domain rules in production.[29][30]
Spin up a mock server from the spec so the SPA and services can develop in parallel without waiting on implementations, and use it for demos and exploratory testing.[31][32]
Run contract tests in CI to detect breaking changes when endpoints, payloads, or status codes evolve, and block merges on contract violations.[33][34]
Messaging and events
Use domain events internally within a single service to coordinate aggregates, but publish only integration events across services to avoid leaking domain internals and tight coupling.[18][17]
Standardize integration events with metadata (eventId, eventType, version, timestamp, source, correlationId) and version payload schemas to evolve producers and consumers safely.[35][17]
Prefer topic exchanges with meaningful routing keys like domain.action (e.g., user.registered, game.finished) to make queue bindings expressive and selective.[10][6]
Database and migrations
Follow the database‑per‑service pattern and manage schema changes with migrations per service to avoid cross‑service coupling at the data layer.[36][4]
Use additive/compatibility‑first, multi‑phase migrations to enable zero‑downtime deploys: add fields first, deploy readers/writers for both shapes, then remove deprecated fields in a later release.[37][36]
Keep data migrations separate from schema migrations and ensure rollback plans are documented and tested to reduce operational risk.[38][36]
Security and secrets
Enforce least privilege at the gateway and service levels, validate JWTs, and keep authZ fine‑grained inside services to prevent over‑exposed endpoints and confused deputy issues.[13][23]
Centralize secrets (DB, JWT, OAuth, RabbitMQ) with a vault approach and short‑lived tokens where possible to minimize blast radius and improve rotation and auditability.[12][13]
Apply rate limiting, input sanitization, and consistent error handling at the edge to deter abuse and reduce service load during anomalous traffic spikes.[22][39]
Definition of Done (PRs touching APIs, services, or events)
OpenAPI updated and validated; types regenerated; mock server and docs refreshed; consumers assessed for impact and versioning applied where necessary.[7][11]
Gateway validation and service business validations implemented consistently with the defense‑in‑depth strategy to prevent schema‑only checks from masking logic gaps.[25][24]
For events: new/changed integration events documented with versioning and routing keys; publisher and consumer behaviors tested end‑to‑end with the broker running in CI.[6][17]
Migrations created for any schema change with backward‑compatible rollout steps, rollbacks defined, and operational notes added to the service README.[36][37]
Secrets not hardcoded; vault or equivalent mechanism wired; local/dev overrides documented; no secrets committed to VCS under any circumstance.[13][12]
What Codex should generate by default
Controllers/handlers that map HTTP DTOs to use cases and back, without leaking frameworks into domain/application layers to preserve hexagonal boundaries.[5][9]
Service‑side validation for business rules in use cases plus gateway schema validation wired to the OpenAPI spec for early rejection and consistent error responses.[24][29]
TypeScript types from OpenAPI for all request/response shapes, and lightweight clients for the SPA when needed to reduce boilerplate and prevent drift.[20][27]
Publisher/consumer scaffolding that uses shared integration‑event contracts and topic routing keys, with idempotent handlers and explicit ack/nack semantics.[10][6]
Migration files and per‑service DB configuration, avoiding any shared database or cross‑service joins to keep autonomy and deployability intact.[4][36]
Vault‑backed configuration loaders and dependency wiring so secrets are fetched at startup instead of read from static .env files, with clear fallback only for local dev when documented.[12][13]
Non‑goals Codex must avoid
Importing domain entities into controllers, gateways, or the SPA, or sharing entity classes across services, which would violate boundaries and increase coupling.[17][5]
Sharing repository implementations, database models, or message‑broker clients in shared libraries; only contracts and types belong in shared packages.[18][7]
Adding gateway‑only validations and skipping service‑side business checks, which undermines security and correctness under partial failures or misrouting.[25][24]
