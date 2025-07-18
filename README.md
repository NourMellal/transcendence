# ft_transcendence 🏓

A real-time Pong-style game built by four 42-Network students.  
**North-star:** *< 30 s from page-load → fair online match.*

![Architecture overview](docs/assets/architecture.png)

---

## 🚀 Quick start

```bash
git clone https://github.com/42-team/ft_transcendence.git
cd ft_transcendence
cp .env.template .env        # fill secrets
docker compose up --build    # one-command dev env
```

# 🗂️ Repository layout
| Path              | Purpose                                | CODEOWNER |
| ----------------- | -------------------------------------- | --------- |
| `apps/web`        | React SPA (TypeScript + Tailwind)      | @dev2     |
| `apps/server`     | Fastify API + WebSocket gateway        | @dev3     |
| `packages/core`   | Game physics & shared TypeScript types | @dev1     |
| `infra/compose.*` | Docker & CI/CD definitions             | @dev4     |
| `docs/adr`        | Architecture Decision Records          | all       |

# 📡 Tech stack & subject modules

| Area          | Tech                                               | Subject module fulfilled         |
| ------------- | -------------------------------------------------- | -------------------------------- |
| Edge security | **Nginx + ModSecurity**                            | WAF / Vault (major)              |
| Auth          | Fastify + JWT + TOTP (2-FA)                        | 2-FA + JWT (major)               |
| Realtime      | WebSocket (socket.io)                              | Remote players (major)           |
| Persistence   | SQLite via Prisma                                  | Database (minor)                 |
| Observability | Logstash → Elasticsearch → Kibana / Prom → Grafana | ELK (major) + Monitoring (minor) |
| Styling       | Tailwind CSS                                       | Front-end framework (minor)      |
| Build         | Docker Compose + GitHub Actions                    | —                                |

# 🏗️ Contributing workflow
Create a branch: git checkout -b feat/<scope>

Follow the DoD checklist in .github/PULL_REQUEST_TEMPLATE.md

Run tests & linter: docker compose exec server pnpm test

Open a PR to dev; required reviewers = CODEOWNER + 1 peer
