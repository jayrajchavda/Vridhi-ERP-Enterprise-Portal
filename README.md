# Vridhi ERP — Enterprise Operations Portal

A modern, high-performance monorepo-based ERP + CRM portal designed specifically for trade, sales, inventory replenishment, GST billing, and customer relationships in the Indian market.

---

## 🚀 Key Modules & Capabilities

### 1. Customer Relationship (CRM) & Follow-ups
*   **Customer Directory**: Profiles containing contact details, address states (for GST calculations), and tax registration IDs (GSTIN).
*   **Follow-up Checklist**: Unified scheduler tracking customer actions segmented by **Overdue**, **Today**, and **Upcoming (next 7 days)**.
*   **Interaction Logs**: Logging panel enabling sales agents to log phone calls, emails, and meetings while scheduling next follow-up alerts in a single step.

### 2. Products & Inventory Management
*   **Master Catalog**: SKU records, warehouse location categories, and product unit prices.
*   **Safety Stock Alerts**: Automatic alert flags for products dropping below safe replenishment thresholds.
*   **Reorder Suggestions**: Automatically calculates optimal order quantities using the replenishment algorithm:
    $$\text{Suggested Reorder Qty} = (\text{Safety Stock} \times 2) - \text{Current On-hand Stock}$$

### 3. Vendors & Procurement
*   **Supplier Registry**: Database storing partner contact persons, email addresses, and GSTINs.
*   **Purchase Orders (PO)**: Multi-line item PO builder with status states (`DRAFT` $\rightarrow$ `SENT` $\rightarrow$ `COMPLETED` / `CANCELLED`).
*   **Shipment Receipt Logs**: Allows logging of partial vendor deliveries, linking to original PO lines and dynamically incrementing stock balances.

### 4. Sales Challans & Invoicing
*   **Delivery Challans**: Log customer orders in `DRAFT` status and transactionally deduct stock when transitioned to `CONFIRMED`.
*   **Tax Invoice Engine**: Dynamically converts confirmed challans into tax invoices.
*   **GST Calculation Engine**:
    *   **Intra-State**: Split taxes (CGST + SGST) for transactions inside the home state.
    *   **Inter-State**: Unified tax (IGST) for customer locations in other states.
*   **Ledger & Payment Tracking**: Supports partial payments, remaining balance checks, and logs payments against invoices.

### 5. Documents & Notifications
*   **PDF Document Export**: Exports tax invoices, PO forms, and delivery challans using custom-formatted layouts built with PDFKit.
*   **SMTP Email Delivery**: Sends PDF attachments in the background asynchronously without blocking user response cycles. Audits logs inside the `EmailLog` database table.

---

## 🛠 Tech Stack

*   **Monorepo Architecture**: npm Workspaces
*   **Frontend**: React, Vite, TypeScript, Vanilla CSS, TanStack Query, Zustand, Axios
*   **Backend**: Node.js, Express.js, TypeScript, SQLite
*   **Database ORM**: Prisma ORM
*   **Emailing**: Nodemailer

---

## 💻 Local Setup & Commands

### Prerequisites
*   Node.js v18+ & npm

### Setup Steps
1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Initialize Database**:
    Sync schema changes and run database seeds:
    ```bash
    npm run db:push --workspace=apps/backend
    npm run db:seed --workspace=apps/backend
    ```
3.  **Run Development Servers**:
    Starts backend on port `5000` and frontend on port `5173`:
    ```bash
    npm run dev
    ```

---

## 🔑 Seeding User Profiles

| Profile Role | Email Address | Password |
| :--- | :--- | :--- |
| **Admin Manager** | `admin@demo.com` | `Passw0rd!` |
| **Sales Executive** | `sales@demo.com` | `Passw0rd!` |
| **Warehouse Keeper** | `warehouse@demo.com` | `Passw0rd!` |
| **Accounts Officer** | `accounts@demo.com` | `Passw0rd!` |

---

## 🧪 Running Test Suites

Run integration tests verifying the transaction engines, GST calculations, and background SMTP handlers:
```bash
npm run test --workspace=apps/backend
```
*Current test suite results*: **54 tests passed successfully** with zero regressions.
