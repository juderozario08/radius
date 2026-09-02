<div align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo_v54-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo v54" />
  <img src="https://img.shields.io/badge/Go_1.24-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
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
    Radius is a powerful, production-grade, full-stack application connecting the physical retail sales floor with real-time digital inventory, logistics, receiving, POS transactions, and multi-channel fulfillment. It equips retail staff, department managers, and administrators with a mobile-first interface and a high-performance Go backend API.
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
- **Point of Sale (POS) & Sales Analytics**:
  - Full transaction ledger supporting multi-method payments (`Card`, `Cash`, `Gift Card`), tax calculations, and card last-4 tracking.
  - Real-time inventory deduction and sales revenue metrics.
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
- **Language**: Go 1.24
- **Web Framework**: Gin
- **Database**: PostgreSQL with connection pooling
- **Migrations**: `golang-migrate` (37 sequential versioned schema migrations)
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
│   ├── migrations/              # 37 golang-migrate UP/DOWN SQL scripts
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
- **Node.js**: v18+
- **Go**: v1.23+
- **PostgreSQL**: v14+
- **Python**: v3.10+ (for seed generation)
- **Expo CLI**: `npx expo`

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
   go run cmd/seeds/main.go
   ```
   *This automatically generates realistic datasets via Python, runs batched SQL inserts, and cleans up temporary SQL files.*

6. **Start the API Server**:
   ```bash
   go run cmd/api/main.go
   ```
   *The server starts on port `8080` (or `PORT` from `.env`).*

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
