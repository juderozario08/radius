# Radius Application Features Tracker

This document tracks application features, modules, and workflows that are **PLANNED**, **PARTIALLY IMPLEMENTED**, or currently existing as **UI/Backend Stubs** in the codebase.

---

## 🚧 Active Backlog & Partially Implemented Features

### 1. Customer Returns & RMA Pipeline
- **Status:** Schema Foundation Only (~15% complete)
- **Backend:** Transaction items store `return_reason` and `inventory_transactions` supports `RETURN` transaction types. Dedicated return authorization services, return receipt generation, and Return-to-Vendor (RTV) dispositioning need handlers.
- **Frontend:** `Back Room > Returns` screen (`Returns.tsx`) is a placeholder.

### 2. Fix Receiving Repo Generated Column Writes
- **Status:** Bug (~5% complete)
- **Backend:** `receiving_repo.go` writes to `on_hand_qty` directly, but migration `000031` converted it to a `GENERATED ALWAYS AS STORED` column. These writes will fail on the current schema. All receiving queries (PO receive, transfer receive, quick receive) need to update `new_qty` instead of `on_hand_qty`.

### 3. Real-Time Push Notifications & Alerts
- **Status:** UI Placeholder (~5% complete)
- **Backend:** Notification dispatcher service for curbside BOPIS arrivals, manager adjustment approval alerts, and low stock warnings is pending.
- **Frontend:** `Notifications` screen (`notifications.tsx`) is a placeholder.

### 4. Mobile POS Checkout
- **Status:** Not Started (~0% complete)
- **Backend:** Needs secure payment processing integration (or mock), receipt generation, and tax calculation services.
- **Frontend:** The application lacks a dedicated checkout flow for processing sales directly on the floor.

### 5. Print Order Updates
- **Status:** Partial (~60% complete)
- **Backend:** Endpoints for creating and viewing print orders exist, but updating order status (e.g., from 'IN PROGRESS' to 'COMPLETED') needs a complete flow.
- **Frontend:** Need detailed update screens for managing print order lifecycles beyond just viewing them.

---

## 🧹 Completed Schema & Codebase Cleanups

- [x] **Remove Planograms & Price Tag Generation**: Dropped `planograms` and `planogram_products` tables via migration `000038`, removed backend boilerplate services/handlers, and purged frontend planogram tabs and price tag screens.
- [x] **Drop 7 Unused Database Tables & Custom Enums**: Removed dead tables (`audit_log`, `out_of_stock_log`, `price_history`, `price_tag_jobs`, `price_tag_job_items`, `print_supplies`, `print_services`) and 5 unused enums via `golang-migrate` migration `000037`.
- [x] **Consolidate Audit Ledger**: Standardized on `inventory_transactions` as the sole immutable audit log across POS sales, PO receiving, stock transfers, cycle counts, and manager adjustments.
- [x] **High-Volume Seed Data Pipeline**: Automated Python synthetic seed generation with Faker, chunked SQL batch execution, and automatic file cleanup via `cmd/seeds/main.go`.
- [x] **Store 1 Head Office Constraint**: Enforced separation between Head Office (Store 1: inventory/MIMS only) and Retail Branches (Stores 2–7: retail transactions, transfers, POs, online orders, print orders, and cycle counts).
- [x] **Sales Floor Activities Feed**: Fully implemented live WebSocket activity feed tracking incoming online orders, cycle count updates, and receiving dock activities.
- [x] **Outbound Stock Transfer Creation & Dispatching**: End-to-end stock transfer creation, manifest scanning, inventory deduction/audit trail on creation, dispatching with carrier/tracking, cancellation with stock refund, and real-time WebSocket notifications.
- [x] **RESTful API Endpoint Standardization**: Refactored backend routes and handlers to standard RESTful conventions using path parameters (`:id`), collection routes, and sub-resource action verbs, along with type-safe route builders and updated callers across the frontend.
