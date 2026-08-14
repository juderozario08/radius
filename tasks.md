# Radius Application Features Tracker

This document tracks the actual application features and modules based on the current state of the codebase.

## ✅ Implemented Features

The following features have been built and have active endpoints/logic in the backend and frontend:

- [x] **Authentication & Sessions**: Secure login, JWT generation, and session management (`auth_handler.go`, `session_handler.go`).
- [x] **Employee Administration**: Creating and managing staff profiles and roles (`employee_handler.go`).
- [x] **Store Administration**: Managing store locations and branch details (`store_handler.go`).
- [x] **Product Catalog & Categories**: Browsing the global product directory and categories (`product_handler.go`, `category_handler.go`).
- [x] **Inventory Tracking**: Viewing and managing baseline stock levels (`inventory_handler.go`).
- [x] **Receiving (POs & LPRs)**: Processing incoming purchase orders and license plate receives (`receiving_handler.go`).
- [x] **Transactions / POS**: Handling physical in-store point-of-sale transactions (`transaction_handler.go`).
- [x] **Online Orders**: Managing and fulfilling digital order requests (`online_order_handler.go`).

---

## 🚧 Not Yet Implemented (Currently Stubs)

The following features are planned in the architecture and have initial placeholder files, but the actual logic and endpoints have not yet been built:

- [ ] **Barcode Scanning**: Using mobile device cameras to scan UPC/EANs and fetch product details (`barcode_handler.go`).
- [ ] **Cycle Counts**: Performing routine manual counts of physical inventory on the floor (`cycle_count_handler.go`).
- [ ] **Fill Reports**: Generating and actioning reports for restocking shelves from the back room (`fill_report_handler.go`).
- [ ] **Out-of-Stock Reporting**: Flagging and tracking items that are empty on the sales floor (`out_of_stock_handler.go`).
- [ ] **Stock Transfers**: Moving inventory securely between different store locations (`transfer_handler.go`).
- [ ] **Planograms**: Visual merchandising compliance and shelf-layout tracking (`planogram_handler.go`).
- [ ] **Dynamic Pricing**: Managing markdowns, sales, and temporary price adjustments (`pricing_handler.go`).
