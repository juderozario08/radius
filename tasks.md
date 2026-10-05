# Radius Application Features Tracker

This document tracks application features, modules, and workflows that are **PLANNED**, **PARTIALLY IMPLEMENTED**, or currently existing as **UI/Backend Stubs** in the codebase.

---

## 🚧 Active Backlog & Partially Implemented Features

### 1. Real-Time Push Notifications & Alerts
- **Status:** UI Placeholder (~5% complete)
- **Backend:** Notification dispatcher service for curbside BOPIS arrivals, manager adjustment approval alerts, and low stock warnings is pending.
- **Frontend:** `Notifications` screen (`notifications.tsx`) is a placeholder.

### 2. Mobile POS Checkout
- **Status:** Not Started (~0% complete)
- **Backend:** Needs secure payment processing integration (or mock), receipt generation, and tax calculation services.
- **Frontend:** The application lacks a dedicated checkout flow for processing sales directly on the floor.

### 3. Print Order Updates
- **Status:** Partial (~60% complete)
- **Backend:** Endpoints for creating and viewing print orders exist, but updating order status (e.g., from 'IN PROGRESS' to 'COMPLETED') needs a complete flow.
- **Frontend:** Need detailed update screens for managing print order lifecycles beyond just viewing them.

---

## 🧹 Completed Schema & Codebase Cleanups

- [x] **Fix Receiving & Sales Repo Generated Column Writes**: Updated all inventory receiving and sale queries in `receiving_repo.go` and `sales_repo.go` to update `new_qty` instead of attempting direct updates to the PostgreSQL `GENERATED ALWAYS AS STORED` column `on_hand_qty`.
- [x] **Customer Returns & RMA Pipeline**: End-to-end customer return authorization, receipt lookup and product scan fallback, return window enforcement (14 days tech, 30 days default), manager approval workflow for returns over $50, RTV queueing for defective items, inventory disposition re-stocking, immutable audit ledger integration, and interactive frontend back room Returns workflow.
- [x] **Remove Planograms & Price Tag Generation**: Dropped `planograms` and `planogram_products` tables via migration `000038`, removed backend boilerplate services/handlers, and purged frontend planogram tabs and price tag screens.
- [x] **Drop 7 Unused Database Tables & Custom Enums**: Removed dead tables (`audit_log`, `out_of_stock_log`, `price_history`, `price_tag_jobs`, `price_tag_job_items`, `print_supplies`, `print_services`) and 5 unused enums via `golang-migrate` migration `000037`.
- [x] **Consolidate Audit Ledger**: Standardized on `inventory_transactions` as the sole immutable audit log across POS sales, PO receiving, stock transfers, cycle counts, and manager adjustments.
- [x] **High-Volume Seed Data Pipeline**: Automated Python synthetic seed generation with Faker, chunked SQL batch execution, and automatic file cleanup via `cmd/seeds/main.go`.
- [x] **Store 1 Head Office Constraint**: Enforced separation between Head Office (Store 1: inventory/MIMS only) and Retail Branches (Stores 2–7: retail transactions, transfers, POs, online orders, print orders, and cycle counts).
- [x] **Sales Floor Activities Feed**: Fully implemented live WebSocket activity feed tracking incoming online orders, cycle count updates, and receiving dock activities.
- [x] **Outbound Stock Transfer Creation & Dispatching**: End-to-end stock transfer creation, manifest scanning, inventory deduction/audit trail on creation, dispatching with carrier/tracking, cancellation with stock refund, and real-time WebSocket notifications.
- [x] **RESTful API Endpoint Standardization**: Refactored backend routes and handlers to standard RESTful conventions using path parameters (`:id`), collection routes, and sub-resource action verbs, along with type-safe route builders and updated callers across the frontend.
