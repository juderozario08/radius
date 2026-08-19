---
name: test-and-verify
description: >-
  Use this skill to run static analysis, linting, unit tests, and build checks 
  across both the Go backend and React Native frontend before finalizing tasks or opening PRs.
---

# Pre-Flight Verification & Test Suite

This skill guides running full validation across both repositories (`radius-backend` and `radius-frontend`) to ensure code quality and build integrity.

## 🧪 Verification Commands

### 1. Backend Verification (Go)
Run tests and build check in `radius-backend`:
```bash
# Run all unit tests
cd radius-backend && go test -v ./...

# Verify clean compilation
cd radius-backend && go build ./...
```

### 2. Frontend Verification (TypeScript & Expo)
Run TypeScript compilation check and linting in `radius-frontend`:
```bash
# Type check without emitting JS files
cd radius-frontend && npx tsc --noEmit
```

### 3. Knowledge Graph Sync
Keep the project knowledge graph up to date after code changes:
```bash
graphify update .
```

## 📋 Pre-Flight Checklist
- [ ] Backend tests passing (`go test ./...`)
- [ ] Backend compilation successful (`go build ./...`)
- [ ] Frontend TypeScript type-checking passing without errors (`npx tsc --noEmit`)
- [ ] No temporary scaffolding files left in the repo (per `AGENTS.md`)
- [ ] `Stores` and `Employees` tables remain intact and protected
