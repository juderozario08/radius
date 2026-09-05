# Radius Application Features

Welcome to the comprehensive feature guide for **Radius**, a full-stack retail, mobile inventory management, and store logistics application. This document provides a complete overview of all operational, architectural, and planned features across the Radius mobile application (React Native / Expo v54) and backend service (Go / Gin / PostgreSQL / Redis).

---

## 📋 Table of Contents

1. [Authentication, Security & Access Control](#1-authentication-security--access-control)
2. [Store & Branch Administration](#2-store--branch-administration)
3. [Employee & Staff Management](#3-employee--staff-management)
4. [Product Catalog & Search](#4-product-catalog--search)
5. [Mobile Inventory Management (MIMS)](#5-mobile-inventory-management-mims)
6. [Cycle Counting & Inventory Auditing](#6-cycle-counting--inventory-auditing)
7. [Receiving & Inbound Logistics](#7-receiving--inbound-logistics)
8. [Fill Reports & Replenishment (IS4TC)](#8-fill-reports--replenishment-is4tc)
9. [Point of Sale (POS) & Transactions](#9-point-of-sale-pos--transactions)
10. [Omnichannel Online Order Fulfillment](#10-omnichannel-online-order-fulfillment)
11. [Print & Copy Service Center](#11-print--copy-service-center)
12. [Audit Trails & Inventory History](#12-audit-trails--inventory-history)
13. [High-Volume Seed & Synthetic Data Pipeline](#13-high-volume-seed--synthetic-data-pipeline)
14. [Hardware & Mobile Device Capabilities](#14-hardware--mobile-device-capabilities)
15. [Roadmap & Planned Features](#15-roadmap--planned-features)

---

## 1. Authentication, Security & Access Control

- **Employee Authentication**: Secure email and password login system issuing JWT access tokens and long-lived refresh tokens with automated silent token refresh.
- **Session Tracking & Remote Revocation**: Real-time tracking of active user sessions by device and IP address. Administrators can view active sessions store-wide and remotely terminate compromised or stale sessions.
- **Concurrent Login Conflict Resolution**: Detects existing active sessions upon employee login, preventing accidental duplicate logins or prompting confirmation to take over a session.
- **Role-Based Access Control (RBAC)**: Fine-grained permission model spanning four key employee roles:
  - `ADMIN`: Full system access, store creation, employee management, and global session control.
  - `MANAGER`: Store-level oversight, inventory adjustment approvals, and staff monitoring.
  - `SALES`: Sales floor operations, MIMS inventory lookups, empty hole scans, POS transactions, and customer orders.
  - `SERVICE`: Customer service desk, print order production, and fulfillment workflows.
- **Rate Limiting & Security Middleware**: IP-based rate limiting on sensitive endpoints to protect against brute-force attempts.

---

## 2. Store & Branch Administration

- **Store Directory & Profile Management**: Centralized store directory maintaining branch addresses, Canadian postal codes, phone numbers, timezones, and operational metadata.
- **Store Activation & Lifecycle Management**: Administrative capability to onboard new store locations, edit location details, and toggle active/inactive store status.
- **Multi-Store Context Switching**: Dynamic store context provider allowing managers and administrators to switch between branch views seamlessly without logging out.
- **Head Office vs. Retail Separation**:
  - **Store 1 (Head Office)**: Designated as central administration/storage; stores inventory and MIMS warehouse bins but contains zero POS registers, customer transactions, POs, or stock transfers.
  - **Stores 2–7 (Retail Branches)**: Fully operational sales floor branches equipped with retail registers, receiving bays, BOPIS pickup desks, and cycle count schedules.

---

## 3. Employee & Staff Management

- **Employee Directory**: Paginated and filterable employee directory displaying employee roles, contact information, assigned store, and employment status.
- **Employee Onboarding & Editing**: Comprehensive forms for creating new staff profiles, setting roles, assigning stores, and updating personal or contact details.
- **Staff Lifecycle Control (Activation & Termination)**: Safe deactivation or permanent termination toggles with audit safeguards protecting core records.
- **Store-Specific Employee Rosters**: Managerial view isolating employees assigned to specific store branches.

---

## 4. Product Catalog & Search

- **Global Product Catalog**: Master product registry storing SKU numbers, UPC/EAN barcodes, titles, descriptions, categories, brands, units of measure (Each, Case, Pack), case pack quantities, item weights, default costs, and retail MSRPs.
- **Multi-Faceted Search Engine**: Fast search across product names, SKU numbers, or barcodes with dynamic filters for categories, brands, price points, and in-stock status.
- **Category Hierarchy & Brand Caching**: Redis-cached category trees and distinct brand aggregations for rapid querying and navigation.
- **Rich Product Detail Screen**: Multi-tab product overview showing:
  - **Details**: Full specifications, pricing, brand info, and store-specific stock breakdown.
  - **Locations**: Active sales floor and backroom bin assignments with quantities.

---

## 5. Mobile Inventory Management (MIMS)

- **Real-Time Barcode Product Lookup**: Integrated mobile barcode scanner querying store stock levels, reserved quantities, and location metadata.
- **Standardized Bin Location System**: Standardized 9-digit location identifiers (`Aisle-Bay-Shelf-Position`, e.g., `01-02-01-001`) with regex validation.
- **Multi-Bin Product Mapping (`mims_location_items`)**:
  - Tracks specific bin assignments with `OVERSTOCK`, `TOP_STOCK`, and `UNBINNED` location types.
  - Item binning workflow supporting `IN` (move into bin) and `OUT` (pick from bin) actions with quantity validation against active inventory.
  - Multi-location synchronization endpoint (`PUT /api/sales_floor/inventory/locations/sync`).
- **Granular Sub-Inventory Tracking**: Tracks 11 dedicated stock buckets per product at every store:
  - `new_qty` (Active sellable store stock)
  - `open_box_qty` (Returned / inspected open-box units)
  - `bopis_qty` (Allocated for online customer pickup)
  - `rtv_qty` (Staged for Return-to-Vendor)
  - `code88_qty` (Marked down / clearance)
  - `quarantine_qty` (Held pending QA inspection)
  - `repair_qty` (Under customer or depot repair)
  - `customer_on_hold_qty` / `fc_on_hold_qty` (Special order holds)
  - `demo_qty` (Sales floor floor display units)
  - `on_order_qty` (Inbound open PO quantities)
  - `on_hand_qty` & `available_qty` (PostgreSQL `GENERATED ALWAYS AS STORED` calculated totals).
- **Inventory Adjustment Requests**: Sales floor tool for logging unit discrepancies with standardized reason codes.
- **Supervisor Adjustment Review**: Manager approval queue allowing supervisors to review, adjust, approve, write off, or reject pending inventory adjustments before committing changes.
- **Scan Activity Telemetry**: Automated logging (`mims_scan_log`) recording hardware scan events, employee IDs, timestamps, and scan types.

---

## 6. Cycle Counting & Inventory Auditing

- **Weekly Cycle Count Scheduling**: Automated and manual scheduling of weekly cycle counts organized by product category (`cycle_count_schedule`).
- **Interactive Mobile Count Scanner**: Real-time scanner interface for counting store inventory against expected counts with live count increments and manual entry fallbacks.
- **Discrepancy & Variance Analysis**: Automated calculation of unit variances and dollar discrepancies between book inventory and physically counted units.
- **Cycle Count Approval Workflow**: Multi-stage lifecycle (`NOT STARTED` ➔ `IN PROGRESS` ➔ `PENDING APPROVAL` ➔ `APPROVED` / `COMPLETED`).
- **Ownership Transfer**: In-progress cycle counts can be transferred between associates during shift handovers.
- **Historical Count Search & Archive**: Searchable archive of past cycle counts for store compliance and shrinkage reviews.

---

## 7. Receiving & Inbound Logistics

- **Purchase Order (PO) Receiving**: List and search incoming supplier purchase orders with expected delivery dates and line-item details.
- **Item-by-Item Barcode Verification**: Real-time barcode validation ensuring scanned items belong to the open PO and incrementing received quantities.
- **License Plate Receiving (LPR)**: High-speed receiving of pre-palletized boxes and master cartons by scanning 20-digit LPR barcodes.
- **Stock Transfer Receiving**: Process incoming store-to-store inventory transfers with item-level verification or one-tap "Quick Receive" functionality.

---

## 8. Fill Reports & Replenishment (IS4TC)

- **IS4TC (In-Stock For The Customer) Scanning**: Rapid floor scanning tool allowing associates to walk aisles, scan empty shelf holes, and log out-of-stock display locations.
- **Shared IS4TC Store Session**: Collaborative, store-wide temporary scanning session where multiple associates contribute to a shared replenishment list.
- **Automated Fill Report Generation**: Dynamic replenishment reports combining POS sales velocity, empty hole scans, and available backroom stock to generate pick lists.
- **Replenishment Filtering & Aisle Sorting**: Filter fill lists by source (`POS Sales`, `IS4TC Holes`, `Negative Stock`, `In Stock`) and sort by physical aisle order for optimal picking paths.

---

## 9. Point of Sale (POS) & Transactions

- **Transaction Processing**: Comprehensive transaction recording supporting multiple payment methods (`Card`, `Cash`, `Gift Card`) and transaction types (`Sale`, `Return`, `Void`).
- **Detailed Sales Itemization**: Line-item tracking with quantities, unit prices, unit costs, discounts, subtotal, sales tax calculations (e.g., 13% ON, 12% BC), and payment card references.
- **Transaction History & Search**: Searchable transaction registry allowing staff to filter and review receipts by date, store, register ID, and cashier.
- **Real-Time Stock Deduction**: Automated decrementing of on-hand inventory upon successful sale transaction completion.

---

## 10. Omnichannel Online Order Fulfillment

- **Multi-Channel Order Tracking**: Centralized dashboard for managing digital customer orders across:
  - **BOPIS**: Buy Online, Pick Up In Store
  - **STS**: Ship to Store
  - **Shipping**: Direct Ship-from-Store fulfillment
- **Order Lifecycle Management**: End-to-end status tracking (`Awaiting Pickup`, `Ready for Pickup`, `Work in Progress`, `Shipped`, `Delivering`, `Delivered`, `Released`).
- **Customer & Line-Item Verification**: Detailed order summaries showing customer contact info, fulfillment preferences, and ordered items for packing and customer handoff.

---

## 11. Print & Copy Service Center

- **Print Order Workflow**: Dedicated order queue for retail copy and print services managing both walk-in and web orders.
- **Production Status Tracking**: Stage tracking through `Submitted`, `In Production`, `Ready for Pickup`, `Completed`, and `Cancelled`.
- **Job Specification Details**: Tracking job details including paper stock, finishing options, binding, quantities, customer turnaround requirements, and special instructions.

---

## 12. Audit Trails & Inventory History

- **Master Inventory Audit Ledger (`inventory_transactions`)**: Dedicated, typed, immutable ledger recording every stock modification across the entire network.
- **Activity Tracking**: Tracks events including `RECEIPT`, `SALE`, `RETURN`, `TRANSFER`, `ADJUSTMENT`, `DAMAGE`, `DEMO_ASSIGNMENT`, `WRITE_OFF`, and `CYCLE_COUNT`.
- **Audit Screen (`Audit.tsx`)**: Allows store managers to inspect chronological stock event history for any product, with employee attribution and reference IDs.

---

## 13. High-Volume Seed & Synthetic Data Pipeline

- **Automated Synthetic Generation**: Python-based generator utilizing Faker with deterministic seeding.
- **Scale**:
  - **70,000** Inventory Records (7 stores × 10,000 products)
  - **50,000** POS Transactions + line items
  - **10,000** Products Catalog with brand/cost distributions
  - **5,000** Online Customer Orders (BOPIS / STS)
  - **5,000** Print Orders & Items
  - **2,000** Purchase Orders & Line Items
  - **2,000** Inter-Store Stock Transfers
  - **2,000** Loyalty Preferred Members
  - **1,000** Cycle Count Audits & Schedules
  - **525** MIMS Bin Locations
- **Zero Artifact Bloat**: The Go runner (`cmd/seeds/main.go`) executes the generator, runs chunked SQL batches, and automatically removes temporary files.

---

## 14. Hardware & Mobile Device Capabilities

- **Camera Barcode Scanner**: Hardware-accelerated barcode scanning using `expo-camera` supporting standard 1D/2D barcodes (UPC-A, EAN-13, Code 128).
- **Haptic Feedback**: Tactile responses via `expo-haptics` for successful scans, errors, and button interactions.
- **Secure Credential Storage**: Safe on-device persistence of authentication tokens using `expo-secure-store`.
- **Keyboard & View Adaptation**: Responsive layout management with safe area context and keyboard avoidance across iOS and Android devices.

---

## 15. Roadmap & Planned Features

- **Outbound Stock Transfer Creation**: Picking, packing, and dispatching outbound stock transfers to neighboring store locations.
- **Customer Returns & RMA Pipeline**: Dedicated return authorization flow with item inspection, damage dispositioning, and Return-to-Vendor (RTV) processing.
- **Sales Floor Activities Stream**: Centralized associate task feed for shift assignments and customer assistance alerts.
- **Real-Time Push Notifications**: In-app and push notifications for urgent curbside arrivals, receiving dock notices, and approval requests.
