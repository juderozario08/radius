---
name: api-sync-contracts
description: >-
  Use this skill when modifying backend API response structures or updating frontend 
  TypeScript types and fetch calls to ensure full-stack schema consistency.
---

# Full-Stack API Contract Synchronization

This skill provides a procedure for aligning data schemas across the Go backend (`radius-backend`) and the React Native frontend (`radius-frontend`).

## 🎯 Goal
Ensure that changes made to Go API endpoints, DTOs, and Gin handler responses are faithfully represented in TypeScript types and frontend API client methods.

## 🛠️ Step-by-Step Sync Checklist

### 1. Identify Backend DTO / Response Struct
- Check structs in `radius-backend/internal/models/` or handler responses in `radius-backend/internal/handler/`.
- Note JSON tags (e.g. `json:"store_id"`, `json:"created_at"`).

### 2. Update Frontend Types
- Navigate to `radius-frontend/src/types/`.
- Update or create matching TypeScript `interface` or `type` definitions using camelCase or snake_case matching the exact JSON response serialization.
- Ensure optional fields (`omitempty` in Go) are marked with `?` in TypeScript.

### 3. Update Frontend API Client Functions
- Check `radius-frontend/src/api/` helper functions.
- Update fetch endpoints, headers, query parameters, or body payloads.
- Ensure proper error handling and typing of the returned promise: `Promise<ApiResponse<T>>`.

### 4. Verification
- Run frontend type check to ensure no consumer components are broken by type changes:
  ```bash
  cd radius-frontend && npx tsc --noEmit
  ```
