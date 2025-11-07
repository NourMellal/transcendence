# 📋 API Documentation

**Single Source of Truth** - Split OpenAPI files for maintainability and collaboration.

## 🏗️ Structure

```
docs/api/
├── openapi.yaml              # 🎯 MAIN ENTRY POINT (edit this)
├── paths/                    # 🛣️ API endpoints by domain
│   ├── auth.yaml            # Authentication (login, register, 2FA)
│   ├── users.yaml           # User management & profiles
│   ├── games.yaml           # Game lifecycle & real-time play
│   ├── chat.yaml            # Messaging & chat rooms
│   ├── tournaments.yaml     # Tournament management
│   ├── stats.yaml           # Statistics & leaderboards
│   └── health.yaml          # Health checks
│
└── components/              # 🧩 Reusable components
    ├── schemas/             # Data models
    │   ├── User.yaml
    │   ├── Game.yaml
    │   ├── Chat.yaml
    │   ├── Tournament.yaml
    │   ├── Stats.yaml
    │   ├── Auth.yaml
    │   └── Common.yaml
    ├── responses/           # Standard responses
    │   ├── Success.yaml
    │   ├── Error400.yaml
    │   ├── Error401.yaml
    │   ├── Error403.yaml
    │   ├── Error404.yaml
    │   └── Error500.yaml
    ├── parameters/          # Reusable parameters
    │   ├── UserId.yaml
    │   ├── GameId.yaml
    │   └── Pagination.yaml
    └── security.yaml        # Authentication schemes
```

## ✅ Benefits of This Structure

### 🎯 **Single Source of Truth**
- Only split files exist - no duplicates
- No "which file is correct?" confusion
- Changes go directly to the source

### 👥 **Team Collaboration**
- Each developer can own specific endpoints
- Clean Git diffs with isolated changes
- No merge conflicts in giant files
- Easy to review pull requests

### 🔄 **Maintainability**
- DRY principle - reuse components across endpoints
- Easy to find and update specific functionality
- Modular structure scales with team growth

### 🛠️ **Developer Experience**
- Modern tools support `$ref` out of the box
- Fast navigation in VS Code
- IntelliSense and validation work perfectly

## 🚀 Usage

### For Development
Use `openapi.yaml` as your entry point. Most modern tools support `$ref`:

```bash
# VS Code with REST Client
# Postman (import openapi.yaml)
# Swagger Editor
# Redocly CLI
```

### Validation & Preview
```bash
# Install Redocly CLI
npm install -g @redocly/cli

# Validate API spec
redocly lint docs/api/openapi.yaml

# Preview documentation
redocly preview-docs docs/api/openapi.yaml

# Build static docs
redocly build-docs docs/api/openapi.yaml -o dist/api-docs
```

## 📝 Editing Workflow

### 1. Adding a New Endpoint
```bash
# 1. Add path definition
vim docs/api/paths/users.yaml

# 2. Add/update schemas if needed
vim docs/api/components/schemas/User.yaml

# 3. Reference in main file
vim docs/api/openapi.yaml
```

### 2. Adding a New Schema
```bash
# 1. Create schema file
vim docs/api/components/schemas/NewEntity.yaml

# 2. Reference from main openapi.yaml
# 3. Use in path definitions
```

### 3. Validation
```bash
# Always validate after changes
redocly lint docs/api/openapi.yaml

# Fix any errors before committing
```

## 🔧 Tool Compatibility

✅ **Works with:**
- VS Code with OpenAPI extensions
- Swagger Editor (online & local)
- Postman (import `openapi.yaml`)
- Insomnia (import `openapi.yaml`)
- Redocly CLI
- SwaggerUI (latest versions)
- Code generators (openapi-generator, etc.)

## 📋 Team Guidelines

### ✅ DO
- Edit split files in `paths/` and `components/`
- Use `$ref` to reference reusable components
- Validate changes before committing
- Keep related endpoints in the same path file
- Reuse components when possible

### ❌ DON'T
- Create manual bundle files
- Duplicate schema definitions
- Put everything in one file
- Edit generated files
- Skip validation

## 🎯 File Ownership

| Domain | File | Team Owner |
|--------|------|------------|
| Authentication | `paths/auth.yaml` | User Team |
| User Management | `paths/users.yaml` | User Team |
| Real-time Gaming | `paths/games.yaml` | Game Team |
| Chat & Messaging | `paths/chat.yaml` | Chat Team |
| Tournaments | `paths/tournaments.yaml` | Tournament Team |
| Statistics | `paths/stats.yaml` | All Teams |
| Core Schemas | `components/schemas/` | Schema Owner |

## 🚨 What We Removed

### ❌ Eliminated Redundancy
- **No more bundle files** - eliminated duplicate information
- **No bundling scripts** - no sync issues to manage
- **Single source of truth** - split files are the only source

### ✅ Clean Architecture
- Clear file ownership per team
- No confusion about "which file to edit"
- Modern tooling handles `$ref` perfectly
- Scales with team growth

## 📚 Quick Start

```bash
# 1. Install tools
npm install -g @redocly/cli

# 2. Validate current spec
redocly lint docs/api/openapi.yaml

# 3. Preview docs locally
redocly preview-docs docs/api/openapi.yaml
# Opens http://localhost:8080

# 4. Make changes to split files
# 5. Validate again
# 6. Commit changes
```

## 🆘 Migration from Bundle Approach

If you had bundle files before:
1. ✅ Keep split files (source of truth)
2. ❌ Delete bundle files (redundant)
3. ✅ Update tooling to use `openapi.yaml`
4. ✅ Document the new workflow

---

**Remember**: The split files in `paths/` and `components/` are your **source of truth**. There are no bundle files to keep in sync!
