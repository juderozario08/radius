# Radius Project - AI Agent Rules & Guidelines

Welcome to the Radius project. This file (`AGENTS.md`) contains the master set of rules, style guidelines, and behavioral constraints for all AI agents working on this codebase. **You MUST follow these rules at all times without exception.**

## 🚨 Critical Constraints

1. **DO NOT DELETE CORE TABLES**: You must NEVER delete the `Stores` table or the `Employees` table in the database schema. These are critical components of the system.
2. **Follow DRY Principles**: Always look for existing constants, styles, or functions before writing new ones. Do not duplicate logic or design tokens.
3. **Respect the Theme**: Stick to the established theme and staples of the application when building UI components.

---

## 🏗️ Project Architecture & Knowledge Graph

- **Backend**: Go (Gin, PostgreSQL, Redis). Layered clean architecture (Handlers -> Services -> Repositories).
- **Frontend**: React Native (Expo v54, expo-router).
- **Graphify**: This project uses a Graphify knowledge graph (`graphify-out/graph.json`). 
  - For any codebase or architecture questions, you must **first run** `graphify query "<question>"` (CLI) or the `query_graph` MCP tool. 
  - Use `graphify path` and `graphify explain` to navigate dependencies. Do not rely solely on `grep` or file reading for large architectural questions.

---

## 🎨 Frontend Guidelines (React Native / Expo)

1. **Expo Version**: We are using **Expo v54**. Always refer to Expo v54 documentation (e.g., https://docs.expo.dev/versions/v54.0.0/) before writing or modifying API usage.
2. **State Management & Data Fetching**: We use basic `fetch` requests for API communication. **Do not introduce** external state management libraries like Zustand or React Query unless explicitly instructed by the user. Keep it simple.
3. **Styling**: 
   - Use standard `StyleSheet.create({})` for component styling.
   - **DRY Principle**: Global styles and colors are defined in `src/constants/styles.ts` and `src/constants/colors.ts`. You MUST import and use these constants rather than hardcoding hex codes or standard padding/margin rules.
4. **Testing**: Frontend testing (Jest + React Native Testing Library) is not yet implemented but will be soon. Write modular, easily testable components.

---

## ⚙️ Backend Guidelines (Go)

1. **Database & Migrations**: 
   - We use PostgreSQL.
   - All schema modifications MUST be done via `golang-migrate` files in the `migrations/` directory. Do not instruct the user to run manual `ALTER TABLE` commands on the production DB.
2. **Testing**: 
   - We use the standard Go `testing` package along with `go.uber.org/mock/gomock` for interface mocking, and `miniredis` for Redis mocking.
   - Follow the existing testing patterns (e.g., table-driven tests) found in `radius-backend/internal/service/*_test.go`.
3. **Logging & Errors**: 
   - Stick to the industry standard, basic logging patterns currently used in the project. Return properly formatted errors up the stack.

---

## 🌳 Git & Version Control

- **Commits**: This is a single-developer project. Standard, descriptive commit messages are perfectly fine. You do not need to enforce strict "Conventional Commits" (e.g., `feat:`, `fix:`) unless requested. Keep branch names simple.

---

**By reading this file, you agree to adhere to these constraints and prioritize the safety of the `Stores` and `Employees` tables above all else.**
