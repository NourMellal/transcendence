# 🔧 Development Guide for Team Members

This guide helps team members understand how to work with the microservices architecture and contribute effectively.

## 🚀 Quick Start for New Team Members

### 1. Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Git
- VS Code (recommended)

### 2. Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd transcendence

# Install dependencies
pnpm install

# Build shared packages (required first!)
pnpm --filter "./packages/*" build

# Start all services
pnpm dev:all
```

### 3. Verify Installation
- API Gateway: http://localhost:3000/health
- User Service: http://localhost:3001/health
- Game Service: http://localhost:3002/health
- Chat Service: http://localhost:3003/health
- Tournament Service: http://localhost:3004/health

---

## 📂 Working with Different Parts of the System

### 🔧 Modifying Shared Packages

#### When to modify shared packages:
- Adding new data structures used by multiple services
- Creating common utility functions
- Adding validation schemas for new API endpoints

#### Workflow:
```bash
# 1. Make changes in packages/shared-types, shared-utils, or shared-validation
cd packages/shared-types
# Edit src/index.ts

# 2. Build the package
pnpm build

# 3. The changes are automatically available to all services
# 4. Restart services to see changes
pnpm dev:all
```

#### Example: Adding a new shared type
```typescript
// In packages/shared-types/src/index.ts
export interface GameRoom {
  id: string;
  player1Id: string;
  player2Id?: string;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}
```

### 🎮 Working on Individual Services

#### File Structure for Each Service:
```
services/[service-name]/
├── src/
│   ├── domain/           # Business rules (pure logic, no dependencies)
│   ├── application/      # Use cases (business operations)
│   ├── adapters/         # External integrations
│   └── server.ts         # Main entry point
├── package.json
└── tsconfig.json
```

#### Adding a New Feature to a Service:

**Example: Adding "Get User Stats" to User Service**

1. **Add Domain Interface** (`src/domain/ports.ts`):
```typescript
export interface GetUserStatsUseCase {
  execute(userId: string): Promise<UserStats>;
}
```

2. **Create Use Case** (`src/application/get-user-stats.usecase.ts`):
```typescript
import { GetUserStatsUseCase, UserRepository } from '../domain/ports.js';

export class GetUserStatsUseCaseImpl implements GetUserStatsUseCase {
  constructor(private readonly userRepository: UserRepository) {}
  
  async execute(userId: string): Promise<UserStats> {
    // Business logic here
  }
}
```

3. **Add Controller Endpoint** (`src/adapters/web/user.controller.ts`):
```typescript
// Add to registerRoutes method
fastify.get('/me/stats', async (request, reply) => {
  const userId = this.getUserIdFromRequest(request);
  const stats = await this.getUserStatsUseCase.execute(userId);
  return reply.send(createSuccessResponse(stats));
});
```

4. **Wire Dependencies** (`src/server.ts`):
```typescript
const getUserStatsUseCase = new GetUserStatsUseCaseImpl(userRepository);
const userController = new UserController(
  getUserUseCase,
  updateProfileUseCase,
  getUserStatsUseCase  // Add here
);
```

### 🌐 Adding New API Endpoints

#### Process:
1. **Add validation schema** in `packages/shared-validation`
2. **Implement endpoint** in appropriate service
3. **Update API Gateway** routing if needed
4. **Test integration**

#### Example: Adding Game Creation Endpoint

1. **Shared Validation** (`packages/shared-validation/src/index.ts`):
```typescript
export const createGameSchema = z.object({
  gameType: z.enum(['classic', 'ranked']),
  maxScore: z.number().min(1).max(21).default(11)
});
```

2. **Game Service Controller**:
```typescript
fastify.post('/games', async (request, reply) => {
  const validatedData = createGameSchema.parse(request.body);
  // Game creation logic
});
```

3. **API Gateway** (if new service):
```typescript
// In infrastructure/api-gateway/src/server.ts
{ prefix: '/api/games', upstream: config.GAME_SERVICE_URL }
```

---

## 🔄 Common Development Tasks

### Starting Development Environment

```bash
# Option 1: Start all services
pnpm dev:all

# Option 2: Start specific services
pnpm dev:user        # User service only
pnpm dev:game        # Game service only
pnpm dev:gateway     # API Gateway only

# Option 3: Start with Docker (full environment)
pnpm docker:up
```

### Making Changes to Shared Code

```bash
# 1. Edit shared package
cd packages/shared-utils
# Make changes...

# 2. Build package
pnpm build

# 3. Restart services to pick up changes
# In another terminal:
pnpm dev:all
```

### Adding Dependencies

```bash
# Add to specific service
cd services/user-service
pnpm add express

# Add to shared package
cd packages/shared-utils
pnpm add lodash

# Add to root (affects all packages)
cd ../../
pnpm add -w typescript
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm --filter @transcendence/user-service test

# Run tests in watch mode
cd services/user-service
pnpm test:watch
```

### Building for Production

```bash
# Build all packages and services
pnpm build

# Build specific service
pnpm --filter @transcendence/user-service build

# Start production build
cd services/user-service
pnpm start
```

---

## 🐛 Debugging and Troubleshooting

### Common Issues

#### 1. "Cannot find module '@transcendence/shared-*'"
**Solution**: Build shared packages first
```bash
pnpm --filter "./packages/*" build
```

#### 2. Service won't start
**Checklist**:
- Are shared packages built?
- Are dependencies installed?
- Is the port already in use?
- Check environment variables

#### 3. Database connection errors
**For SQLite issues**:
```bash
# Check if database file exists
ls services/user-service/user-service.db

# If missing, the service will create it automatically
# Make sure the directory has write permissions
```

#### 4. Import path errors
**Common fixes**:
- Use `.js` extensions in imports (TypeScript requirement)
- Check relative path depths (`../` vs `../../`)
- Ensure exports are properly defined

### Useful Debugging Commands

```bash
# Check service health
curl http://localhost:3001/health

# View service logs
pnpm --filter @transcendence/user-service dev

# Check all running processes
netstat -tulpn | grep :300

# View Docker logs
pnpm docker:logs
```

---

## 📝 Code Style and Best Practices

### File Naming Conventions
- **Interfaces**: `PascalCase` (`UserRepository`)
- **Classes**: `PascalCase` (`SqliteUserRepository`)
- **Files**: `kebab-case.type.ext` (`user.controller.ts`, `get-user.usecase.ts`)
- **Directories**: `kebab-case` (`shared-types`, `user-service`)

### Import/Export Patterns
```typescript
// Use .js extensions for local imports
import { User } from './entities.js';
import { UserRepository } from '../domain/ports.js';

// Use package names for shared imports
import { createSuccessResponse } from '@transcendence/shared-utils';
import { updateUserSchema } from '@transcendence/shared-validation';
```

### Error Handling Pattern
```typescript
// Use shared error classes
import { NotFoundError, ValidationError } from '@transcendence/shared-utils';

// In use cases
if (!user) {
  throw new NotFoundError('User');
}

// In controllers
try {
  const result = await this.useCase.execute(data);
  return reply.send(createSuccessResponse(result));
} catch (error) {
  return this.handleError(error, reply);
}
```

### Database Operations
```typescript
// Always use async/await with the sqlite package
const user = await this.db.get('SELECT * FROM users WHERE id = ?', userId);
await this.db.run('INSERT INTO users (...) VALUES (...)', ...values);
```

---

## 🤝 Team Collaboration

### Git Workflow
1. **Create feature branch**: `feature/add-user-stats`
2. **Make changes** following the patterns above
3. **Test locally**: `pnpm dev:all`
4. **Build and test**: `pnpm build && pnpm test`
5. **Create pull request**
6. **Review and merge**

### Service Ownership
- **User Service**: Authentication, profiles, 2FA
- **Game Service**: Game logic, real-time gameplay
- **Chat Service**: Messaging, chat rooms
- **Tournament Service**: Tournament management
- **API Gateway**: Routing, rate limiting, CORS

### Communication
- **Shared Types**: Discuss interface changes with all teams
- **API Changes**: Update documentation and inform frontend team
- **Database Schema**: Coordinate migrations with DevOps

---

## 📚 Additional Resources

### Learning Materials
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Fastify Documentation](https://www.fastify.io/docs/)

### Project-Specific Docs
- `README-microservices.md` - Main project documentation
- `docs/ARCHITECTURE.md` - Detailed architecture explanation
- `docker-compose.yml` - Service configuration
- Individual service README files (when created)

Happy coding! 🚀
