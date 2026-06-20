staples-inventory/
├── cmd/
│   └── api/
│       └── main.go
│
├── internal/
│   ├── config/
│   │   └── config.go
│   │
│   ├── database/
│   │   ├── database.go
│   │   └── migrate.go
│   │
│   ├── models/                    # ✅ already done — your 7 files
│   │   ├── store.go                # Store, Employee, EmployeeRole
│   │   ├── product.go              # Category, Supplier, Product, ProductSupplier
│   │   ├── inventory.go            # Inventory, StockTransfer(+Item), OutOfStockLog, CycleCount(+Item)
│   │   ├── merchandising.go        # Planogram(+Product), FillReport(+Item), PriceTagJob(+Item)
│   │   ├── orders.go               # PurchaseOrder(+Item), OnlineOrder(+Item)
│   │   ├── sales.go                # PriceHistory, Transaction(+Item)
│   │   └── sessions.go             # Session
│   │
│   ├── repository/                 # mirrors models grouping
│   │   ├── store_repo.go            # stores + employees
│   │   ├── product_repo.go          # categories, suppliers, products, product_suppliers
│   │   ├── inventory_repo.go        # inventory, stock_transfers, out_of_stock_log, cycle_counts
│   │   ├── merchandising_repo.go    # planograms, fill_reports, price_tag_jobs
│   │   ├── orders_repo.go           # purchase_orders, online_orders
│   │   ├── sales_repo.go            # price_history, transactions
│   │   └── session_repo.go          # sessions (kept separate — security-sensitive, simple CRUD)
│   │
│   ├── service/
│   │   ├── auth_service.go          # login, password check, session issue/expire/validate
│   │   ├── store_service.go
│   │   ├── product_service.go
│   │   ├── inventory_service.go     # on_hand adjustments, mims_location validation, low-stock
│   │   ├── transfer_service.go      # stock_transfers workflow
│   │   ├── out_of_stock_service.go
│   │   ├── cycle_count_service.go
│   │   ├── planogram_service.go
│   │   ├── fill_report_service.go
│   │   ├── price_tag_service.go
│   │   ├── purchasing_service.go    # purchase_orders + receiving
│   │   ├── online_order_service.go  # reservation + picking workflow
│   │   ├── pricing_service.go       # price_history versioning
│   │   ├── pos_service.go           # transactions + inventory decrement
│   │   └── barcode_service.go       # UPC lookup via product_repo
│   │
│   ├── handler/
│   │   ├── auth_handler.go
│   │   ├── store_handler.go
│   │   ├── product_handler.go
│   │   ├── inventory_handler.go
│   │   ├── transfer_handler.go
│   │   ├── out_of_stock_handler.go
│   │   ├── cycle_count_handler.go
│   │   ├── planogram_handler.go
│   │   ├── fill_report_handler.go
│   │   ├── price_tag_handler.go
│   │   ├── purchase_order_handler.go
│   │   ├── online_order_handler.go
│   │   ├── transaction_handler.go
│   │   └── barcode_handler.go
│   │
│   ├── router/
│   │   └── router.go
│   │
│   └── middleware/
│       ├── auth.go                  # validates token_hash against sessions, checks expires_at
│       ├── logger.go
│       └── error_handler.go
│
├── migrations/
│   ├── 000001_extensions.up.sql
│   ├── 000002_enums.up.sql           # every CREATE TYPE up front, in one place
│   ├── 000003_core_entities.up.sql   # stores, categories, suppliers, products, product_suppliers
│   ├── 000004_employees_sessions.up.sql
│   ├── 000005_pricing_planograms.up.sql
│   ├── 000006_inventory.up.sql
│   ├── 000007_transfers_purchasing.up.sql
│   ├── 000008_oos_fill_reports.up.sql
│   ├── 000009_price_tags.up.sql
│   ├── 000010_transactions.up.sql
│   ├── 000011_online_orders.up.sql
│   ├── 000012_cycle_counts.up.sql
│   └── ...matching .down.sql for each
│
├── pkg/
│   ├── apierror/apierror.go
│   ├── response/response.go
│   └── validator/location.go         # mims_location regex check (mirrors DB CHECK constraint)
│
├── .env.example
├── .gitignore
├── go.mod
├── go.sum
├── Makefile
└── README.md
