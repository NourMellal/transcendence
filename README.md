# Transcendence 🏓

A real-time Pong-style game built by 42-Network students.
**North-star:** _< 30 s from page-load → fair online match._

## 🏗️ Architecture

This project uses **Hexagonal Architecture** (Ports & Adapters) for maintainability and testability.

```
src/
├─ domain/          # Business logic & entities
├─ application/     # Use cases & workflows
├─ adapters/        # External interfaces (DB, HTTP, etc.)
├─ config/          # Environment configuration
└─ app.ts           # Dependency injection
```

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

# Run tests
pnpm test

# Lint code
pnpm run lint

## 📋 Development

- **Framework**: Fastify (Node.js)
- **Language**: TypeScript
- **Architecture**: Hexagonal Architecture
- **Database**: SQLite (development)
- **Testing**: Vitest
- **Linting**: ESLint

## 🤝 Contributing

1. Follow the established Hexagonal Architecture patterns
2. Write tests for new features
3. Run `pnpm run lint` before committing
4. Use conventional commits

## 📚 Key Files

- `src/domain/` - Business entities and rules
- `src/application/` - Use cases and workflows
- `src/adapters/` - External interfaces and implementations
- `docs/openapi.yaml` - API documentation
