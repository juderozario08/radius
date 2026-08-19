---
name: pg-migrations-safety
description: >-
  Use this skill when creating, modifying, or applying PostgreSQL database migrations 
  with golang-migrate in radius-backend/migrations.
---

# PostgreSQL Migrations & Schema Safety

This skill ensures schema changes in `radius-backend` adhere strictly to data safety constraints and `golang-migrate` practices.

## 🚨 ABSOLUTE SAFETY CONSTRAINTS
- **NEVER DELETE OR DROP CORE TABLES**: You must NEVER drop or delete the `Stores` table or the `Employees` table.
- **NO MANUAL ALTER TABLE IN PROD**: All database modifications must be scripted via sequential migration files in `radius-backend/migrations/`.
- **HUMAN CONFIRMATION**: Always prompt the user for confirmation before executing migration commands against live databases.

## 📂 Migration Directory
- Path: `radius-backend/migrations/`
- Files follow the format: `<sequence>_<description>.up.sql` and `<sequence>_<description>.down.sql`

## 🛠️ Step-by-Step Migration Workflow

1. **Check Latest Migration Sequence**:
   - Inspect `radius-backend/migrations/` to find the highest sequence number (e.g., `000003_...`).
   
2. **Create New Migration Pair**:
   - Create next numbered files:
     - `radius-backend/migrations/<seq>_<name>.up.sql`
     - `radius-backend/migrations/<seq>_<name>.down.sql`

3. **Write Forward & Rollback SQL**:
   - Ensure the `.up.sql` file contains complete DDL statements, constraints, and indexes.
   - Ensure the `.down.sql` accurately undos the `.up.sql` (e.g., `DROP TABLE IF EXISTS`, `DROP COLUMN`).

4. **Verify Syntax & Validate**:
   - Verify SQL compatibility with PostgreSQL.
   - Update model structs in `radius-backend/internal/models/` to match any newly added columns.
