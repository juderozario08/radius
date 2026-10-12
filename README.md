<div align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo_v54-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo v54" />
  <img src="https://img.shields.io/badge/Go_1.26.9-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Gin-0088CC?style=for-the-badge&logo=gin&logoColor=white" alt="Gin" />
  <img src="https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
</div>

<br />

<div align="center">
  <h1 align="center">Radius</h1>
  <p align="center">
    <strong>A Comprehensive Retail, Logistics & Inventory Management System</strong>
    <br />
    <br />
    Radius connects the retail sales floor with real-time inventory, logistics, receiving, admin-recorded transactions, and multi-channel fulfillment. It equips retail staff, department managers, and administrators with a mobile-first interface and a Go backend API.
  </p>
</div>

## ✨ Key Features & Capabilities

- **Mobile Inventory Management System (MIMS)**:
  - Real-time hardware barcode scanning for products and warehouse bin locations (`Aisle-Bay-Shelf-Position`).
  - Multi-bin inventory allocation (`OVERSTOCK`, `TOP_STOCK`, `UNBINNED`).
  - Granular stock tracking across 11 sub-inventory buckets (`new_qty`, `open_box_qty`, `bopis_qty`, `rtv_qty`, `quarantine_qty`, `repair_qty`, `demo_qty`, etc.).
  - Sales floor inventory adjustment requests with supervisor review and approval queues.
- **Cycle Counting & Auditing**:
  - Category-based weekly count schedules with calendar views.
  - Real-time mobile barcode counting, variance calculations, and manager sign-off workflows.
  - Dynamic shift ownership transfer for in-progress audits.
- **Receiving & Logistics**:
  - Inbound Purchase Order (PO) processing with item-by-item barcode verification.
  - High-speed master carton receiving via 20-digit License Plate Receiving (LPR) barcodes.
  - Store-to-store Stock Transfer receiving with manual check and one-tap "Quick Receive" modes.
- **Replenishment & Fill Reports (IS4TC)**:
  - In-Stock For The Customer (IS4TC) empty hole aisle scanning.
  - Collaborative, shared store scanning sessions.
  - Automated replenishment pick lists combining sales velocity and backroom overstock quantities.
- **Transaction History & Sales Analytics**:
  - Read-only transaction history for staff, with occasional admin-recorded transactions. Radius does not provide mobile POS checkout.
  - Sales revenue metrics and transaction-based inventory records.
- **Omnichannel Digital Order Fulfillment**:
  - Multi-channel queue managing **BOPIS** (Buy Online, Pick Up In Store) and **STS** (Ship to Store).
  - Complete order lifecycle stage transitions (`Awaiting Pickup`, `Ready for Pickup`, `Work in Progress`, `Shipped`, `Delivered`, `Released`).
- **Print & Copy Service Center**:
  - Web and walk-in custom commercial print order production queue and status tracking.
- **Immutable Inventory Audit Ledger**:
  - Comprehensive transaction log (`inventory_transactions`) recording every receipt, sale, return, transfer, cycle count variance, and manual adjustment.
- **Role-Based Access Control (RBAC) & Sessions**:
  - Four distinct roles: `ADMIN`, `MANAGER`, `SALES`, `SERVICE`.
  - Secure JWT authentication with refresh token hashing, device/IP session tracking, and remote session revocation.
- **Automated High-Volume Seed Pipeline**:
  - Deterministic, high-scale Python synthetic data generator using Faker.
  - Generates 70,000+ inventory records, 50,000 POS transactions, 10,000 products, 5,000 online orders, 5,000 print orders, 2,000 POs, 2,000 stock transfers, and 1,000 cycle counts across 7 stores with automatic chunked SQL execution and cleanup.

---

## 🛠️ Tech Stack

### Frontend (Mobile Application)
- **Framework**: React Native & Expo SDK 54 (`expo-router` file-based navigation)
- **UI Components**: Custom reusable components, React Native StyleSheet with central design tokens (`colors.ts`, `styles.ts`)
- **Device Integrations**: `expo-camera` for barcode scanning, `expo-secure-store` for token security, `expo-haptics` for tactile feedback

### Backend (REST API Service)
- **Language**: Go 1.26.9
- **Web Framework**: Gin
- **Database**: PostgreSQL with connection pooling
- **Migrations**: `golang-migrate` (43 sequential versioned schema migrations)
- **Caching & Ephemeral State**: Redis (with embedded `miniredis` for zero-dependency local development)
- **Architecture**: Layered Clean Architecture (`Handlers` ➔ `Services` ➔ `Repositories`)

### Seed & Data Engineering
- **Language**: Python 3.12 (with `Faker`)
- **Automation**: Integrated Go runner executing Python orchestrator and chunked SQL batches

---

## 🏗️ Project Structure

```
radius/
├── radius-backend/
│   ├── cmd/
│   │   ├── api/main.go          # HTTP REST API server entrypoint
│   │   ├── migrate/main.go      # PostgreSQL migration runner (golang-migrate)
│   │   └── seeds/main.go        # Automated seed generator & DB loader
│   ├── internal/
│   │   ├── handler/             # Gin HTTP handlers & request validation
│   │   ├── service/             # Business logic & domain services
│   │   ├── repository/          # PostgreSQL database queries
│   │   ├── models/              # Go domain structs and request/response DTOs
│   │   ├── middleware/          # JWT auth, RBAC, rate limiting, CORS
│   │   ├── database/            # DB connection & migration helpers
│   │   └── router/              # Route group registrations
│   ├── migrations/              # 43 golang-migrate UP/DOWN SQL scripts
│   └── seeds/                   # Python synthetic data generation modules (00-14)
├── radius-frontend/
│   ├── app/                     # Expo Router file-based screens & tabs
│   ├── src/
│   │   ├── components/          # Modular UI components (inventory, reports, orders)
│   │   ├── constants/           # Global styles, color tokens, and API routes
│   │   ├── types/               # TypeScript interfaces matching backend models
│   │   └── context/             # Auth and Store context providers
│   └── assets/                  # Icons and static brand assets
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v22+
- **Go**: v1.26.9+
- **PostgreSQL**: v14+
- **Python**: v3.10+ (for seed generation)
- **Expo CLI**: `npx expo`

---

### Docker Compose (Local Development Only)

Runs the API, PostgreSQL, and Redis together. The compose file is for local development only and must not be used in production.

```bash
cp .env.example .env
docker compose up --build
```

The API builds its `DATABASE_URL` and `REDIS_URL` from the values in `.env`, so keep passwords URL-safe (letters, digits, `-`, `_`). Migrations run on startup and the API is served at `http://localhost:8080`. Run `docker compose down -v` to remove the containers and data volumes.

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd radius-backend
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Ensure DATABASE_URL and JWT_SECRET_KEY are set
   ```

3. **Set up Python Virtual Environment (for Seeds)**:
   ```bash
   python3 -m venv venv
   ./venv/bin/pip install faker
   ```

4. **Run Database Migrations**:
   ```bash
   go run cmd/migrate/main.go
   ```

5. **(Optional) Seed High-Volume Test Data**:
   ```bash
   SEED_EMPLOYEE_PASSWORD='choose-a-password' go run cmd/seeds/main.go --i-understand-this-wipes-data
   ```
   *This wipes and regenerates all operational data (stores and employees are kept), generates realistic datasets via Python, runs batched SQL inserts, and cleans up temporary SQL files. On an empty database it also creates stores 1-7 and four demo employees (`admin@radius.dev`, `manager@radius.dev`, `sales@radius.dev`, `service@radius.dev`) using `SEED_EMPLOYEE_PASSWORD`; if that is unset, a random password is generated and printed.*

6. **Start the API Server**:
   ```bash
   go run cmd/api/main.go
   ```
   *The server starts on port `8080` (or `PORT` from `.env`).*

---

### Production Health Check

`./prod-check.sh` signs in to the live API and runs a read-only sweep of every major area, then prints a summary (wake-up time, latency median/p95/max, barcode scan cache effect, failures, and for admins the database pool and Redis stats). It prompts for your email and password; the password is never echoed or stored, and the script signs out when it finishes. If the account is already signed in elsewhere, it asks before taking over that session.

```bash
./prod-check.sh                                   # checks https://radius-2563.onrender.com
./prod-check.sh http://localhost:8080             # or any other base URL (also via RADIUS_API_URL)
```

It needs only `curl` and `python3`, and exits non-zero if any request fails with a 5xx, 401 or network error.

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd radius-frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Set EXPO_PUBLIC_API_URL to your backend URL (e.g., http://localhost:8080)
   ```

4. **Start the Expo Development Server**:
   ```bash
   npx expo start
   ```
   *Scan the QR code with Expo Go on iOS/Android or run on a simulator/emulator.*

---

## 🗺️ Store Topology & Constraints

- **Store 1**: **Head Office** (Stores inventory and MIMS warehouse bins, but has zero sales floor transactions, customer orders, POs, or stock transfers).
- **Stores 2–7**: **Active Retail Store Locations** (Full sales floor, receiving dock, POS registers, BOPIS/STS fulfillment, and cycle counting operations).

---

## 📡 REST API Reference

The Radius backend exposes 92 endpoints structured across public access, administrative oversight, manager workflows, and mobile sales-floor operations. Role-based access control enforces four hierarchical roles: `ADMIN` > `MANAGER` > `SERVICE` > `SALES`.

### 1. Authentication & System Health

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | System health check and uptime probe |
| `POST` | `/login` | Public | Employee login returning access and refresh JWT pair |
| `POST` | `/api/refresh_token` | Public | Rotates access and refresh tokens with 30s grace replay window |
| `POST` | `/api/verify_token` | `SALES` | Validates session token and active employee status |
| `POST` | `/api/logout` | `SALES` | Invalidates current token session |

### 2. WebSocket & Live Store Events

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `POST` | `/api/v1/ws/ticket` | `SALES` | Generates a single-use authentication ticket for WebSocket streaming |
| `GET` | `/api/v1/ws` | Ticket | Real-time bi-directional store activity WebSocket stream (`?ticket=...`) |

### 3. Administrator Endpoints

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/admin/employees` | `ADMIN` | List all employees across all stores |
| `POST` | `/api/admin/employees` | `ADMIN` | Create a new employee account |
| `PUT` | `/api/admin/employees/:id` | `ADMIN` | Update employee profile, role, or store assignment |
| `POST` | `/api/admin/employees/:id/activate` | `ADMIN` | Activate an inactive employee account |
| `POST` | `/api/admin/employees/:id/terminate` | `ADMIN` | Terminate an employee account and revoke active sessions |
| `GET` | `/api/admin/metrics` | `ADMIN` | System-wide sales, order, and inventory performance metrics |
| `GET` | `/api/admin/sessions` | `ADMIN` | List all active employee sessions |
| `DELETE` | `/api/admin/sessions/:id` | `ADMIN` | Remotely terminate a specific session |
| `GET` | `/api/admin/stores` | `ADMIN` | List all store facilities |
| `POST` | `/api/admin/stores` | `ADMIN` | Create a new store facility |
| `GET` | `/api/admin/stores/:id` | `ADMIN` | Retrieve single store details |
| `PUT` | `/api/admin/stores/:id` | `ADMIN` | Update store metadata |
| `POST` | `/api/admin/stores/:id/activate` | `ADMIN` | Mark a store active |
| `POST` | `/api/admin/stores/:id/deactivate` | `ADMIN` | Deactivate store operations |
| `GET` | `/api/admin/stores/operations` | `ADMIN` | Multi-store operational overview |

### 4. Store Manager Operations

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/manager/employees` | `MANAGER` | List employees assigned to manager's store |
| `GET` | `/api/manager/store/:id` | `MANAGER` | View store management telemetry |

### 5. Products & Catalog

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/products/search` | `SALES` | Search catalog by text query, barcode, SKU, or category |
| `GET` | `/api/sales_floor/products/categories` | `SALES` | List product categories |
| `GET` | `/api/sales_floor/products/brands` | `SALES` | List product brands |
| `GET` | `/api/sales_floor/products/audit` | `SALES` | Audit product information by barcode |
| `GET` | `/api/sales_floor/products/:id` | `SALES` | Retrieve complete product specifications |

### 6. Mobile Inventory Management (MIMS) & Bin Locations

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/inventory/product` | `SALES` | Query store inventory levels for product |
| `GET` | `/api/sales_floor/inventory/products/:id` | `SALES` | Detailed sub-inventory breakdown across 11 buckets |
| `POST` | `/api/sales_floor/inventory/quantity` | `SALES` | Update sub-inventory quantity bucket |
| `POST` | `/api/sales_floor/inventory/bin` | `SALES` | Assign product stock to warehouse bin location |
| `POST` | `/api/sales_floor/inventory/locations` | `SALES` | Create or update bin location |
| `GET` | `/api/sales_floor/inventory/locations/:id` | `SALES` | Retrieve inventory held within specific bin |
| `PUT` | `/api/sales_floor/inventory/locations/sync` | `SALES` | Synchronize bin locations batch |
| `GET` | `/api/sales_floor/inventory/adjustments` | `SALES` | List inventory variance adjustment requests |
| `POST` | `/api/sales_floor/inventory/adjustments` | `SALES` | Submit inventory adjustment request |
| `POST` | `/api/sales_floor/inventory/adjustments/review` | `MANAGER` | Approve or reject inventory adjustment |

### 7. Cycle Counting & Audits

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/cycle_counts` | `SALES` | List active and historical cycle counts |
| `POST` | `/api/sales_floor/cycle_counts` | `SALES` | Create a new cycle count audit |
| `GET` | `/api/sales_floor/cycle_counts/:id` | `SALES` | Retrieve cycle count summary and status |
| `GET` | `/api/sales_floor/cycle_counts/:id/items` | `SALES` | List expected and counted items in count |
| `POST` | `/api/sales_floor/cycle_counts/:id/scans` | `SALES` | Record barcode scan and item quantity count |
| `POST` | `/api/sales_floor/cycle_counts/:id/submit` | `SALES` | Submit completed count for review |
| `POST` | `/api/sales_floor/cycle_counts/:id/approve` | `MANAGER` | Approve cycle count and post variance ledger |
| `POST` | `/api/sales_floor/cycle_counts/:id/transfer_ownership` | `MANAGER` | Transfer count assignment to another employee |
| `GET` | `/api/sales_floor/cycle_counts/schedule` | `SALES` | View weekly cycle count schedule calendar |
| `POST` | `/api/sales_floor/cycle_counts/schedule` | `MANAGER` | Update store counting schedules |
| `GET` | `/api/sales_floor/cycle_counts/search` | `SALES` | Search past cycle counts by category or date |

### 8. Shelf Replenishment & Fill Reports (IS4TC)

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/fill_reports` | `SALES` | Retrieve replenishment pick lists |
| `POST` | `/api/sales_floor/fill_reports/empty_hole` | `SALES` | Record scanned empty shelf position |
| `GET` | `/api/sales_floor/is4tc/session` | `SALES` | Retrieve store's active collaborative scan session |
| `POST` | `/api/sales_floor/is4tc/session/add` | `SALES` | Add scanned product to active session |
| `DELETE` | `/api/sales_floor/is4tc/session/clear` | `SALES` | Clear store replenishment scan session |

### 9. Inbound Receiving & Purchase Orders

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/receiving/purchase_orders` | `SALES` | List open inbound purchase orders |
| `GET` | `/api/sales_floor/receiving/purchase_orders/:id` | `SALES` | Retrieve PO items and received quantities |
| `GET` | `/api/sales_floor/receiving/purchase_orders/:id/check_product` | `SALES` | Verify scanned barcode matches PO manifest |
| `POST` | `/api/sales_floor/receiving/purchase_orders/:id/receive` | `SALES` | Receive line item units against purchase order |
| `POST` | `/api/sales_floor/receiving/purchase_orders/:id/receive_lpr` | `SALES` | High-speed master carton receive via 20-digit LPR |
| `GET` | `/api/sales_floor/receiving/transfers` | `SALES` | List incoming inter-store stock transfers |
| `GET` | `/api/sales_floor/receiving/transfers/:id` | `SALES` | Retrieve transfer manifest |
| `GET` | `/api/sales_floor/receiving/transfers/:id/check_product` | `SALES` | Verify product on incoming transfer |
| `POST` | `/api/sales_floor/receiving/transfers/:id/quick_receive` | `SALES` | One-tap quick receive of sealed transfer |
| `POST` | `/api/sales_floor/receiving/transfers/:id/receive` | `SALES` | Item-by-item manual receive of transfer |

### 10. Inter-Store Stock Transfers

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/transfers` | `SALES` | List store-to-store transfer requests |
| `POST` | `/api/sales_floor/transfers` | `MANAGER` | Create outbound stock transfer request |
| `GET` | `/api/sales_floor/transfers/:id` | `SALES` | Retrieve transfer details and items |
| `POST` | `/api/sales_floor/transfers/:id/dispatch` | `MANAGER` | Dispatch and ship transfer to destination |
| `POST` | `/api/sales_floor/transfers/:id/cancel` | `MANAGER` | Cancel pending transfer and release reserved stock |
| `GET` | `/api/sales_floor/transfers/stores` | `SALES` | List available destination stores |

### 11. Omnichannel Digital Order Fulfillment (BOPIS / STS)

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/orders/online` | `SALES` | View BOPIS and Ship-to-Store order queue |
| `POST` | `/api/sales_floor/orders/online` | `SALES` | Create new customer digital order |
| `GET` | `/api/sales_floor/orders/online/:id` | `SALES` | Retrieve order details and fulfillment stage |
| `PUT` | `/api/sales_floor/orders/online/:id/assign` | `SALES` | Assign order to current staff member for picking |
| `PUT` | `/api/sales_floor/orders/online/:id/items/:item_id` | `SALES` | Update pick status of individual item |
| `POST` | `/api/sales_floor/orders/online/:id/complete_pick` | `SALES` | Mark all items picked and stage for pickup |
| `POST` | `/api/sales_floor/orders/online/:id/cancel` | `SALES` | Cancel digital order and restore allocated inventory |

### 12. Commercial Print Center Orders

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/orders/print` | `SALES` | List custom print shop jobs |
| `GET` | `/api/sales_floor/orders/print/:id` | `SALES` | Retrieve print order job specifications |
| `PUT` | `/api/sales_floor/orders/print/:id/status` | `SERVICE` | Transition print job production state |

### 13. Customer Returns & RTV Processing

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/returns` | `SALES` | Query historical customer returns |
| `POST` | `/api/sales_floor/returns` | `SALES` | Process customer return and issue refund/credit |
| `GET` | `/api/sales_floor/returns/:id` | `SALES` | View return receipt details and item dispositions |
| `POST` | `/api/sales_floor/returns/:id/approve` | `MANAGER` | Approve returns exceeding value threshold |
| `POST` | `/api/sales_floor/returns/:id/reject` | `MANAGER` | Reject customer return |
| `GET` | `/api/sales_floor/returns/lookup/:id` | `SALES` | Lookup original transaction and returnable items |
| `GET` | `/api/sales_floor/returns/search_by_product` | `SALES` | Search past transactions by product barcode |
| `GET` | `/api/sales_floor/returns/rtv` | `SALES` | View Return-To-Vendor quarantine queue |

### 14. Transactions & Ledger Audit

| Method | Endpoint | Min Role | Description |
|---|---|---|---|
| `GET` | `/api/sales_floor/transactions` | `SALES` | View completed retail sales transactions |
| `POST` | `/api/sales_floor/transactions` | `ADMIN` | Record POS transaction with Canadian tax rules |
| `GET` | `/api/sales_floor/transactions/:id` | `SALES` | Retrieve transaction receipt and item lines |
