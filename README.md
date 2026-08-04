<div align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Gin-0088CC?style=for-the-badge&logo=gin&logoColor=white" alt="Gin" />
</div>

<br />

<div align="center">
  <h1 align="center">Radius</h1>
  <p align="center">
    <strong>A Comprehensive Retail & Inventory Management System</strong>
    <br />
    <br />
    Radius is a powerful, full-stack application designed to seamlessly connect the physical sales floor with digital inventory systems. It empowers retail staff, managers, and administrators with a mobile-first interface and a robust backend API to handle everything from stock transfers to employee management.
  </p>
</div>

## ✨ Key Features

- **Role-Based Access Control (RBAC)**: Secure authentication and authorization for Admins, Managers, and Sales Floor staff, restricting access based on employee roles.
- **Inventory Management**: Real-time tracking of product stock, cycle counts, out-of-stock reporting, and store-to-store transfers.
- **Store & Employee Administration**: Complete administrative tools for onboarding employees, activating/deactivating stores, and managing active sessions.
- **Sales & POS Integrations**: Handling physical transactions, online orders, and dynamic pricing strategies.
- **Session Management**: JWT-based session tracking with automated background cleanup workers for secure logins.
- **Mobile-First Experience**: Built natively for iOS and Android using Expo, ensuring store associates have powerful tools directly on their devices.

---

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **Framework**: React Native & Expo (`expo-router` for file-based routing)
- **UI & Navigation**: React Navigation, `expo-symbols`, Reanimated
- **Device Capabilities**: `expo-secure-store` for safe credential storage, `expo-haptics` for tactile feedback.

### Backend (REST API)
- **Language**: Go (Golang)
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL with connection pooling
- **Migrations**: `golang-migrate` for versioned schema changes
- **Security**: JWT Authentication, IP Rate Limiting, CORS Middleware

---

## 🏗️ Architecture & Modules

The backend is structured using a clean, layered architecture separating **Handlers**, **Services**, and **Repositories** to ensure scalability and testability.

Key Modules include:
- `Auth`: Login, JWT token generation, and verification.
- `Employees & Stores`: Management of staff profiles and branch locations.
- `Inventory & Products`: Global product catalogs, cycle counting, and fill reports.
- `Transactions & Orders`: Point-of-Sale (POS) capabilities and online order fulfillment.
- `Merchandising`: Planogram compliance and execution.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Go (v1.21+)
- PostgreSQL (v14+)
- Expo CLI

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd radius-backend
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Ensure you configure DATABASE_URL and JWT_SECRET_KEY in the .env file.
   ```
3. Run the server (migrations will run automatically in non-release mode):
   ```bash
   go run cmd/api/main.go
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd radius-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Update EXPO_PUBLIC_API_URL to point to your backend (e.g., http://localhost:8080)
   ```
4. Start the Expo development server:
   ```bash
   npm start
   ```

---

## 🗺️ Roadmap & Current Focus

I am actively developing the application. **My current focus is implementing a Barcode Scanner feature for inventory scanning.**

This feature will leverage the mobile device's camera to read standard UPC/EAN barcodes, instantly querying the Go backend to display product details, current stock levels, and enabling quick cycle counts directly from the sales floor.
