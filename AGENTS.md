## Rules

### 1. File & Folder Organization
- **Domain-driven structure**: Organize code by business domains (`cli/`, `registry/`, `components/`, `utils/`)
- **Subfolder patterns**: Use consistent patterns (`domain/`, `routes/`, `views/`, `middleware/`)
- **File naming**: Use kebab-case for all files and folders (`components-cache`, `package-json-validator`)
- **Module exports**: Use `index.ts` files for clean public APIs and re-exports
- **Centralized types**: Place shared TypeScript interfaces in `src/types.ts`

### 2. TypeScript Coding Standards
- **Strict compilation**: All code must pass TypeScript strict mode checks
- **Interface design**: Use comprehensive interfaces with optional properties (`?` syntax)
- **Type imports**: Use `import type` for type-only dependencies
- **Union types**: Use union types for constrained values (`'oc-registry' | 'oc-registry-local'`)
- **Generic interfaces**: Extend base types like `PackageJson` for specialized interfaces
- **Naming conventions**:
  - camelCase for variables/functions (`componentName`, `getComponent`)
  - PascalCase for interfaces/types (`Component`, `RegistryOptions`)
  - UPPER_CASE for constants (`DEFAULT_PORT`)

### 3. Code Style & Patterns
- **Import organization**: Group imports (Node.js with `node:` prefix, external libraries, local modules)
- **Function style**: Use arrow functions for simple operations, function declarations for main functions
- **Async patterns**: Prefer async/await over Promise chains
- **Object destructuring**: Use destructuring in function parameters
- **Descriptive naming**: Use clear, descriptive function names (`getComponentRetrievingInfo` vs `getComp`)

---

## File Structure Enforcement

### Required Directory Structure
```
src/
├── cli/
│   ├── commands.ts
│   ├── domain/           # Business logic
│   ├── facade/           # Public APIs
│   └── programmatic-api.ts
├── registry/
│   ├── routes/           # Express routes
│   ├── domain/           # Business logic
│   │   └── validators/   # Input validation
│   ├── views/            # JSX components
│   │   └── partials/     # Reusable components
│   └── middleware/       # Express middleware
├── components/           # Component implementations
├── utils/               # Shared utilities
├── types.ts            # Centralized type definitions
└── resources/          # Static resources
```

### File Extension Rules
- `.ts` for TypeScript modules and business logic
- `.tsx` for React/JSX components and views
- `index.ts` for module exports and public APIs

---
