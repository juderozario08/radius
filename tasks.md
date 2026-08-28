# Radius Application Features Tracker

This document tracks the application features and modules that are **NOT YET IMPLEMENTED** or are currently existing only as stubs/placeholders in the codebase.

## 🚧 Missing / Unimplemented Features

### 1. Out of Stock (OOS) Reporting
- **Status:** Empty Skeletons (0% complete)
- **Backend:** `out_of_stock_handler.go` and `out_of_stock_service.go` exist but have no logic or registered endpoints.
- **Frontend:** Placeholder component `OOSCard.tsx`. No UI flow implemented.

### 2. Outbound Stock Transfers
- **Status:** Partial - Inbound receiving works, outbound is missing (~30% complete)
- **Backend:** `transfer_handler.go` and `transfer_service.go` are stubs. Logic for creating and dispatching outbound transfers is missing.
- **Frontend:** The `Store > Transfers` screen (`transfers.tsx`) is a placeholder ("Coming soon").

### 3. Dynamic Pricing & Price Tags
- **Status:** DB Schema only (~5% complete)
- **Backend:** `pricing_handler.go` and `pricing_service.go` are empty skeletons.
- **Frontend:** The `Price Tags` tab (`price_tags/index.tsx`) is a placeholder ("Coming soon").

### 4. Planograms & Merchandising Compliance
- **Status:** DB Schema and Mockups (~10% complete)
- **Backend:** Handler, service, and `merchandising_repo.go` are empty skeletons.
- **Frontend:** `ProductPlanogram.tsx` exists as a mockup UI, but no active integration.

### 5. Returns / RMA Workflow
- **Status:** DB Schema and Placeholders (~10% complete)
- **Backend:** Support for `return_reason` exists in DB, but no dedicated returns handler/service logic.
- **Frontend:** The `Back Room > Returns` screen (`Returns.tsx`) is a placeholder.

### 6. Additional Frontend Gaps
- **Store Tab Sub-pages:** `purchase_orders.tsx` and `transfers.tsx` are placeholders.
- **Sales Floor Activities:** The `Activities` screen is a placeholder.
- **Dashboard & Notifications:** The home `Dashboard` has static text, and the `Notifications` screen is a placeholder.
- **API Client Stubs:** Dedicated API fetch wrappers (`inventory.api.ts`, `orders.api.ts`, etc.) are currently empty (app uses direct `apiFetch` in screens instead).
