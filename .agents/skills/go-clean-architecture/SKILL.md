---
name: go-clean-architecture
description: >-
  Use this skill when adding or updating Go backend features, API endpoints, 
  handlers, business logic services, or database repositories in radius-backend.
---

# Go Clean Architecture & Backend Workflow

This skill outlines the standard flow for implementing features in `radius-backend` using Gin, layered clean architecture, and PostgreSQL.

## 🏗️ Layered Architecture Pattern
Code in `radius-backend/internal` is organized into distinct layers:
1. **Router & Handler** (`internal/handler/` & `internal/router/`):
   - Handles HTTP request parsing, payload validation, and JSON response formatting.
   - Calls the appropriate Service.
2. **Service** (`internal/service/`):
   - Contains core business logic, orchestrates repository calls, and interacts with Redis cache if needed.
   - Accompanied by table-driven unit tests (`*_test.go`).
3. **Repository** (`internal/repository/`):
   - Direct PostgreSQL SQL queries via `database.DB`. Defines interfaces for mockability.
4. **Models** (`internal/models/`):
   - Domain structs and DTOs with `json` and `db` tags.

## 🛠️ Step-by-Step Feature Implementation

### 1. Define Model & Repository Interface
- Create or update structs in `internal/models/`.
- Define the repository interface and implementation in `internal/repository/`.
- If mocking is required for service tests, ensure the interface is exported.

### 2. Implement Business Logic in Service
- Add methods to the service in `internal/service/`.
- Follow table-driven unit testing patterns with `gomock` and `miniredis` in `internal/service/*_test.go`.

### 3. Implement Gin Handler & Register Route
- Create handler methods in `internal/handler/`.
- Handle request validation and return standard error/success JSON structures.
- Register endpoints in `internal/router/router.go`.

### 4. Verification & Testing
Run backend unit tests and build check:
```bash
cd radius-backend && go test ./...
cd radius-backend && go build ./...
```
