# OpenAPI Specification - Transcendence API

## 📁 Structure

This directory contains the **modular OpenAPI specification** for the Transcendence API, split into multiple files for better maintainability.

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
