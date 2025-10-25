# 📚 Transcendence Documentation

**Clean Architecture** - **Split Files ONLY** - **Single Source of Truth**

## 🏗️ New Documentation Structure

```
docs/
├── index.md                     # 📋 This navigation hub
├── getting-started/             # 🚀 Quick start & setup
│   ├── QUICK_START.md          # 5-minute setup guide
│   ├── INSTALLATION.md         # Detailed installation
│   └── DEVELOPMENT_SETUP.md    # Development environment
│
├── architecture/                # 🏛️ System design
│   ├── OVERVIEW.md             # High-level architecture
│   ├── MICROSERVICES.md        # Service-oriented design
│   ├── HEXAGONAL.md            # Ports & adapters pattern
│   ├── MESSAGING.md            # Event-driven communication
│   └── SECURITY.md             # Security patterns
│
├── development/                 # 👥 Team collaboration
│   ├── TEAM_GUIDE.md           # Working together effectively
│   ├── WORKFLOW.md             # Git flow & development
│   ├── TESTING.md              # Testing strategies
│   ├── PACKAGES.md             # Shared package management
│   └── DEBUGGING.md            # Troubleshooting
│
├── api/                         # 🔗 REST API (SPLIT FILES ONLY)
│   ├── README.md               # API documentation guide
│   ├── openapi.yaml            # 🎯 MAIN ENTRY POINT
│   ├── paths/                  # Endpoints by domain
│   │   ├── auth.yaml          # Authentication
│   │   ├── users.yaml         # User management
│   │   ├── games.yaml         # Game lifecycle
│   │   ├── chat.yaml          # Messaging
│   │   ├── tournaments.yaml   # Tournament system
│   │   ├── stats.yaml         # Statistics
│   │   └── health.yaml        # Health checks
│   └── components/             # Reusable API components
│       ├── schemas/           # Data models
│       ├── responses.yaml     # Standard responses
│       ├── parameters.yaml    # Common parameters
│       └── security.yaml      # Auth schemes
```

## ✅ What We Fixed

### ❌ **Eliminated Redundancy**
- **No more bundle files** - removed `openapi-bundled.yaml`
- **No bundling scripts** - removed `bundle-openapi.js`
- **Single source of truth** - only split files exist
- **No sync issues** - eliminated duplicate information

### ✅ **Clean API Architecture**
- **Split files only** - `openapi.yaml` + `paths/` + `components/`
- **Domain-organized** - each team owns their endpoints
- **Reusable components** - DRY principle applied
- **Modern tooling** - all tools support `$ref` now

### 🎯 **Team Collaboration**
- **Clear ownership** - each service team owns their paths
- **No merge conflicts** - isolated changes in separate files
- **Fast reviews** - small, focused pull requests
- **Easy onboarding** - clear structure and documentation

## 🚀 Quick Commands

```bash
# Validate API specification
npm run api:validate

# Preview API docs locally
npm run api:preview

# Build static API documentation
npm run api:build

# Start all services
pnpm dev:all

# Run tests
pnpm test
```

## 📋 Updated Package.json Scripts

```json
{
  "scripts": {
    "api:validate": "redocly lint docs/api/openapi.yaml",
    "api:preview": "redocly preview-docs docs/api/openapi.yaml", 
    "api:build": "redocly build-docs docs/api/openapi.yaml -o docs/api/generated"
  }
}
```

## 🎯 Benefits of New Structure

### For **API Documentation**:
- ✅ **Single source of truth** - no bundle confusion
- ✅ **Team ownership** - clear file responsibilities  
- ✅ **Modern tooling** - all tools support split files
- ✅ **Clean Git diffs** - isolated changes

### For **General Documentation**:
- ✅ **Navigable structure** - easy to find information
- ✅ **Progressive disclosure** - from quick start to deep dive
- ✅ **Role-based organization** - architects, developers, ops
- ✅ **Maintainable** - clear ownership and update process

## 📚 Migration Notes

### Files Removed:
- `openapi-bundled.yaml` ❌ (redundant bundle)
- `bundle-openapi.js` ❌ (bundling script)
- `MIGRATION-SUMMARY.md` ❌ (no longer needed)

### Files Reorganized:
- `openapi-main.yaml` → `api/openapi.yaml` ✅
- `components/` → `api/components/` ✅  
- `paths/` → `api/paths/` ✅
- Architecture docs consolidated ✅

### New Package Dependencies:
- Added `@redocly/cli` for API validation and preview

## 🆘 Quick Help

- **API questions**: See [API README](./api/README.md)
- **Setup issues**: Check [Quick Start](./getting-started/QUICK_START.md)
- **Architecture**: Read [Architecture Overview](./architecture/OVERVIEW.md)
- **Team workflow**: Review [Team Guide](./development/TEAM_GUIDE.md)

---

**The main entry point is now [docs/index.md](./index.md) - start there!** 🚀

```
docs/
├── openapi-main.yaml          # Main entry point (use this for development)
├── openapi-bundled.yaml       # Bundled single file (generated, for Swagger UI)
├── components/
│   ├── security.yaml          # Security schemes
│   └── schemas/
│       ├── auth.yaml          # Authentication schemas
│       ├── user.yaml          # User schemas
│       ├── game.yaml          # Game schemas
│       ├── chat.yaml          # Chat schemas
│       ├── tournament.yaml    # Tournament schemas
│       ├── stats.yaml         # Statistics schemas
│       └── common.yaml        # Common/error schemas
├── paths/
│   ├── auth.yaml              # Authentication endpoints
│   ├── users.yaml             # User endpoints
│   ├── games.yaml             # Game endpoints
│   ├── chat.yaml              # Chat endpoints
│   ├── tournaments.yaml       # Tournament endpoints
│   ├── stats.yaml             # Statistics endpoints
│   └── health.yaml            # Health check endpoints
└── bundle-openapi.js          # Bundling script
```

## 🚀 Usage

### For Development (Modular Files)
Use `openapi-main.yaml` as your entry point. Most tools support `$ref` to external files.

### For Swagger UI/Editor (Single File)

1. **Install dependencies:**
   ```bash
   npm install js-yaml --save-dev
   ```

2. **Bundle the specification:**
   ```bash
   node docs/bundle-openapi.js
   ```

3. **Use the bundled file:**
   Open `openapi-bundled.yaml` in Swagger UI or Swagger Editor.

### Add to package.json scripts:
```json
{
  "scripts": {
    "openapi:bundle": "node docs/bundle-openapi.js",
    "openapi:validate": "swagger-cli validate docs/openapi-bundled.yaml",
    "openapi:serve": "swagger-ui-watcher docs/openapi-main.yaml"
  }
}
```

## ✨ Benefits

### **Separation of Concerns**
- Each domain (Auth, Games, Chat, Tournaments) has its own files
- Easier to navigate and understand
- Better git diff and merge conflict resolution

### **Reusability**
- Schemas can be referenced across multiple endpoints
- Common patterns defined once

### **Team Collaboration**
- Multiple developers can work on different endpoints simultaneously
- Clear ownership and responsibility per file

### **Maintainability**
- Changes isolated to specific files
- Easier to review pull requests
- Less scrolling through large files

## 📝 Making Changes

### To add a new endpoint:
1. Add the path definition in the appropriate `paths/*.yaml` file
2. If needed, add new schemas in `components/schemas/*.yaml`
3. Reference them in `openapi-main.yaml`
4. Run `npm run openapi:bundle` to update the bundled file

### To add a new schema:
1. Add it to the appropriate schema file in `components/schemas/`
2. Reference it from `openapi-main.yaml` and any paths that use it
3. Bundle the specification

## 🔧 Tools Compatibility

- **Swagger Editor**: Use bundled file
- **Swagger UI**: Use bundled file
- **VS Code REST Client**: Use modular files
- **Postman**: Import bundled file
- **Code Generators**: Use bundled file
- **Redoc**: Use bundled file

## 🎯 Quick Commands

```bash
# Bundle the spec
node docs/bundle-openapi.js

# Validate the bundled spec (requires swagger-cli)
npx swagger-cli validate docs/openapi-bundled.yaml

# View in browser (requires swagger-ui-watcher)
npx swagger-ui-watcher docs/openapi-bundled.yaml
```

## ⚠️ Important Notes

- **Do not edit** `openapi-bundled.yaml` directly - it's auto-generated
- Always edit the modular files in `components/` and `paths/`
- Run the bundler after making changes
- The bundled file is gitignored by default (add to `.gitignore` if needed)
