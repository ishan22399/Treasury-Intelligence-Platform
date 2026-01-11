# Quick Start Guide

## Start the Application

### Terminal 1 - Backend:
```bash
cd backend
python server.py
```
✓ Backend running on http://localhost:5000

### Terminal 2 - Frontend:
```bash
cd frontend
npm start
```
✓ Frontend opens at http://localhost:3000

## First Steps

1. **Initialize System**
   - Click "Initialize with Sample Data" button
   - Wait for ~10 seconds for data generation
   - Dashboard will load automatically

2. **Explore Features**
   - **Dashboard** - View global liquidity and trends
   - **Liquidity** - See regional breakdown
   - **Cash Pooling** - Calculate pool positions
   - **Netting** - Run inter-company netting
   - **Data Quality** - Check validation issues
   - **Import Data** - Upload your own Excel/CSV files

3. **Import Your Data**
   - Go to "Import Data" page
   - Download CSV templates
   - Fill with your data
   - Upload and import

4. **Connect from Power BI**
   - Use REST API endpoints
   - Example: `http://localhost:5000/api/treasury/analytics/summary`
   - In Power BI: Get Data > Web > Enter URL

## API Endpoints

All APIs return JSON format, perfect for Power BI, Tableau, Excel:

- `GET /api/treasury/liquidity/global-position` - Global cash position
- `GET /api/treasury/liquidity/by-region/APAC` - Regional liquidity
- `GET /api/treasury/cash-pool/status` - Cash pool status
- `GET /api/treasury/netting/results` - Netting transactions
- `GET /api/treasury/analytics/summary` - Analytics summary
- `GET /api/treasury/analytics/trends` - 30-day trends

## CSV Template Formats

### Cash Balances (cash_balances.csv)
```csv
account_number,balance_date,currency,balance_local,entity_code,region
ACC-001,2026-01-11,USD,1000000.00,ENTITY-001,AMER
ACC-002,2026-01-11,EUR,500000.00,ENTITY-002,EMEA
```

### Bank Accounts (bank_accounts.csv)
```csv
account_number,account_name,entity_code,bank_name,currency,country_code,account_type
ACC-001,Main Operating,ENTITY-001,JPMorgan,USD,US,Operating
ACC-002,Euro Account,ENTITY-002,Deutsche Bank,EUR,DE,Operating
```

### FX Rates (fx_rates.csv)
```csv
currency_pair,rate,rate_date
EUR/USD,1.10,2026-01-11
GBP/USD,1.27,2026-01-11
```

### Legal Entities (entities.csv)
```csv
entity_code,entity_name,country_code,region
ENTITY-001,US Corp,US,AMER
ENTITY-002,DE GmbH,DE,EMEA
```

## Troubleshooting

**Backend won't start:**
- Check MongoDB connection string in backend/.env
- Verify Python packages: `pip install -r requirements.txt`

**Frontend won't compile:**
- Delete node_modules: `rm -rf node_modules`
- Reinstall: `npm install`

**Can't connect to backend:**
- Check backend is running on port 5000
- Update REACT_APP_BACKEND_URL in frontend/.env
