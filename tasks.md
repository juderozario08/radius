# Radius Application Features Tracker

This document tracks application features, modules, and workflows that are **PLANNED**, **PARTIALLY IMPLEMENTED**, or currently existing as **UI/Backend Stubs** in the codebase.

---

## 🚧 Active Backlog & Partially Implemented Features

### 1. Outbound Stock Transfer Creation & Dispatching
- **Status:** Partial (~35% complete) — Inbound receiving works; outbound creation is a stub.
- **Backend:** `transfer_handler.go` and `transfer_service.go` exist as stubs. Endpoints for initiating an outbound transfer, scanning items into the transfer manifest, and dispatching in-transit status need completion.
- **Frontend:** `Store > Transfers` screen (`transfers.tsx`) is a placeholder ("Coming soon"). Needs UI for selecting destination store, adding items/quantities, and reviewing dispatch manifests.

### 2. Customer Returns & RMA Pipeline
- **Status:** Schema Foundation Only (~15% complete)
- **Backend:** Transaction items store `return_reason` and `inventory_transactions` supports `RETURN` transaction types. Dedicated return authorization services, return receipt generation, and Return-to-Vendor (RTV) dispositioning need handlers.
- **Frontend:** `Back Room > Returns` screen (`Returns.tsx`) is a placeholder.

### 3. Sales Floor Activities Feed
- **Status:** UI Placeholder (~5% complete)
- **Backend:** Endpoints for employee task distribution, price change task batches, and manager shift notes are pending.
- **Frontend:** `Sales Floor > Activities` screen (`Activities.tsx`) is a placeholder.

### 4. Real-Time Push Notifications & Alerts
- **Status:** UI Placeholder (~5% complete)
- **Backend:** Notification dispatcher service for curbside BOPIS arrivals, manager adjustment approval alerts, and low stock warnings is pending.
- **Frontend:** `Notifications` screen (`Notifications.tsx`) is a placeholder.

---

## 🧹 Completed Schema & Codebase Cleanups

- [x] **Remove Planograms & Price Tag Generation**: Dropped `planograms` and `planogram_products` tables via migration `000038`, removed backend boilerplate services/handlers, and purged frontend planogram tabs and price tag screens.
- [x] **Drop 7 Unused Database Tables & Custom Enums**: Removed dead tables (`audit_log`, `out_of_stock_log`, `price_history`, `price_tag_jobs`, `price_tag_job_items`, `print_supplies`, `print_services`) and 5 unused enums via `golang-migrate` migration `000037`.
- [x] **Consolidate Audit Ledger**: Standardized on `inventory_transactions` as the sole immutable audit log across POS sales, PO receiving, stock transfers, cycle counts, and manager adjustments.
- [x] **High-Volume Seed Data Pipeline**: Automated Python synthetic seed generation with Faker, chunked SQL batch execution, and automatic file cleanup via `cmd/seeds/main.go`.
- [x] **Store 1 Head Office Constraint**: Enforced separation between Head Office (Store 1: inventory/MIMS only) and Retail Branches (Stores 2–7: retail transactions, transfers, POs, online orders, print orders, and cycle counts).
