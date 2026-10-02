# Personal Budget Tracker

A full-stack personal finance and expense tracking web application. Features a double-entry transaction ledger, monthly spending ceilings with threshold warning alerts, cash flow analytics, and exportable CSV audit trails.

Designed for high reliability, zero telemetry clutter, and instant deployment across Vercel, Render, or any standard Node.js runtime.

---

## Key Capabilities

- **Double-Entry Ledger**: Record income credits and expense debits with categorized tagging, custom descriptions, and transaction timestamps.
- **Budget Ceilings & Alerts**: Establish monthly spending targets with automated threshold indicators (80% warning and 100%+ limit breach banners).
- **Interactive Visualizations**:
  - **Category Spending Breakdown**: Chart.js doughnut chart detailing category share and total outlay.
  - **6-Month Cash Flow Trends**: Comparative bar chart monitoring income versus expenses over recent months.
- **Real-Time Data Controls**: Instant multi-condition filtering (credit/debit), category drill-down, full-text note search, and date/amount sorting.
- **Data Export & Portability**: Stream transaction histories into standard CSV files for offline spreadsheets and tax accounting.
- **User Authentication**: Secure credentials verification with Node.js native `crypto.scryptSync` password hashing and token-based session management.
- **Offline & Resilient Fallback**: Seamless synchronization between the server REST API and browser storage (`localStorage`) ensuring high availability.

---

## Tech Stack & Architecture

- **Backend Runtime**: Node.js (v20+ / v22)
- **Server Framework**: Express.js with JSON REST endpoints
- **Security**: Native PBKDF2/Scrypt cryptographic password hashing, standard HTTP security headers
- **Frontend**: Responsive modern web application, native DOM API, Chart.js, Plus Jakarta Sans & JetBrains Mono typography
- **Data Layer**: File-backed JSON data store with automatic schema bootstrapping and in-memory cache

---

## Project Structure

```text
├── server.js              # Express REST API and static server
├── db.js                  # Persistent JSON storage layer and crypto helpers
├── index.html             # Landing page and product overview
├── login.html             # Authentication interface with quick demo fill
├── register.html          # New account registration and validation
├── dashboard.html         # Main authenticated ledger, charts, and budget controls
├── vercel.json            # Vercel deployment configuration
├── render.yaml            # Render web service deployment configuration
├── package.json           # Dependencies and runtime scripts
└── metadata.json          # Application studio metadata
```

---

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm (or bun)

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Matam-Rohith/personal_budget_tracker.git
   cd personal_budget_tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Sample Demo Account

For rapid inspection without completing registration, use the preloaded demo account:
- **Username**: `demo`
- **Password**: `demo123`

---

## API Reference

### Authentication
- `POST /api/auth/register` — Register a new user account `{ username, email, password, name }`
- `POST /api/auth/login` — Authenticate and receive a session token `{ username, password }`
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/logout` — Terminate active session

### Transactions
- `GET /api/transactions` — Query transactions with parameters: `month`, `type`, `category`, `search`, `sortBy`, `sortOrder`
- `POST /api/transactions` — Record a transaction `{ type, category, amount, date, note }`
- `PUT /api/transactions/:id` — Update transaction properties
- `DELETE /api/transactions/:id` — Delete a transaction entry

### Budgets & Analytics
- `GET /api/budget` — Retrieve user monthly budget target and currency
- `PUT /api/budget` — Update monthly budget ceiling and currency symbol
- `GET /api/summary?month=YYYY-MM` — Generate calculated metrics, category distribution, and 6-month cash flow trends
- `GET /api/export` — Download complete transaction history as CSV

---

## Deployment Guide

### Deploying to Vercel

The project includes `vercel.json` preconfigured for Vercel's Node.js runtime:

1. Push your repository to GitHub.
2. Import the project in the [Vercel Dashboard](https://vercel.com).
3. Keep default build and install settings.
4. Deploy. Vercel will route incoming requests to `server.js`.

### Deploying to Render

The repository includes a `render.yaml` blueprint:

1. Log in to the [Render Dashboard](https://render.com).
2. Select **New** > **Blueprint** and connect your repository.
3. Render will provision a Web Service with:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Click **Apply** to deploy.

---

## License

This project is licensed under the [MIT License](LICENSE).
