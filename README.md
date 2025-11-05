# Transcendence 🏓

A real-time Pong-style game built by 42-Network students.
**North-star:** _< 30 s from page-load → fair online match._

## 🏗️ Architecture

This project uses **Hexagonal Architecture** (Ports & Adapters) for maintainability and testability.

### Backend
```
src/
├─ domain/          # Business logic & entities
├─ application/     # Use cases & workflows
├─ adapters/        # External interfaces (DB, HTTP, etc.)
├─ config/          # Environment configuration
└─ app.ts           # Dependency injection
```

### Frontend
```
client/
├─ src/
│  ├─ components/   # React components
│  ├─ services/     # API clients
│  └─ types/        # TypeScript types
└─ public/          # Static assets
```

## 🚀 Quick Start

### Backend

```bash
# Install dependencies
pnpm install

# Start backend server (http://localhost:8000)
pnpm run dev
```

### Frontend

```bash
# Navigate to client directory
cd client

# Install dependencies
pnpm install

# Start frontend dev server (http://localhost:3000)
pnpm dev
```

### Testing

```bash
# Run backend tests
pnpm test

# Run frontend tests
cd client && pnpm test
```

### Linting

```bash
# Lint backend code
pnpm run lint

# Lint frontend code
cd client && pnpm lint
```

## 📋 Development

### Backend
- **Framework**: Fastify (Node.js)
- **Language**: TypeScript
- **Architecture**: Hexagonal Architecture
- **Database**: SQLite (development)
- **Testing**: Vitest
- **Linting**: ESLint

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint

## 🤝 Contributing

1. Follow the established Hexagonal Architecture patterns
2. Write tests for new features
3. Run `pnpm run lint` before committing
4. Use conventional commits

## 📚 Key Files

### Backend
- `src/domain/` - Business entities and rules
- `src/application/` - Use cases and workflows
- `src/adapters/` - External interfaces and implementations
- `docs/openapi.yaml` - API documentation

### Frontend
- `client/src/components/Profile.tsx` - User profile component
- `client/src/services/api.ts` - API client for backend communication
- `client/README.md` - Detailed frontend documentation

## 🎨 Features

### User Profile Page
- View user information (username, email, avatar)
- Edit username with inline form
- Upload and preview avatar images
- Real-time loading states and error handling
- Success notifications for operations
- Responsive design with Tailwind CSS

See [client/README.md](client/README.md) for more details.
