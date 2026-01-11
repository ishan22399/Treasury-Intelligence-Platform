# Global Treasury Intelligence & Automation Platform

A comprehensive treasury management system with real-time liquidity monitoring, cash pooling, inter-company netting, and data quality validation.

## 🚀 Features

- **Real-time Liquidity Monitoring** - Track cash positions across all regions and entities
- **Cash Pooling Optimization** - Automated physical and notional cash pooling
- **Inter-Company Netting** - Automated settlement optimization
- **Data Quality Validation** - Automated checks for data integrity
- **Excel/CSV Import** - Easy data upload from spreadsheets
- **Power BI/API Integration** - Connect from any BI tool
- **Multi-Region Support** - APAC, EMEA, AMER regions
- **Real-time Analytics** - Interactive dashboards and trends

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- MongoDB Atlas account (free tier works)

## 🛠️ Installation

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python server.py
```

Server will start on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

Application will open on `http://localhost:3000`

## 📊 Using the System

### Option 1: Initialize with Sample Data

1. Open `http://localhost:3000`
2. Click "Initialize with Sample Data"
3. System creates sample entities, accounts, and balances

### Option 2: Import Your Own Data

1. Go to "Import Data" section
2. Download CSV templates
3. Fill in your data
4. Upload the file

## 🔌 Power BI / API Integration

Connect from Power BI using: `http://localhost:5000/api/treasury/analytics/summary`

## 📄 License

MIT
