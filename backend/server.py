from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import numpy as np
from io import StringIO, BytesIO
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Global Treasury Intelligence & Automation Platform")
api_router = APIRouter(prefix="/api")

# ============= DATA MODELS =============

class Country(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str  # US, UK, SG, etc
    name: str
    region: str  # APAC, EMEA, AMER
    base_currency: str  # USD, EUR, SGD

class LegalEntity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_code: str
    entity_name: str
    country_code: str
    region: str

class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str
    account_name: str
    entity_code: str
    bank_name: str
    currency: str
    country_code: str
    account_type: str  # Operating, Investment, Pool Header

class CashBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str
    balance_date: str
    currency: str
    balance_local: float
    balance_usd: float  # Converted to USD
    entity_code: str
    region: str

class FXRate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    currency_pair: str  # EUR/USD
    rate: float
    rate_date: str

class CashPool(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pool_name: str
    pool_type: str  # Physical, Notional
    region: str
    header_account: str
    participant_accounts: List[str]
    currency: str

class ValidationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    check_date: str
    check_type: str  # missing_balance, duplicate, fx_mismatch, negative_cash
    severity: str  # High, Medium, Low
    description: str
    affected_records: int
    status: str  # Open, Resolved

class NettingResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    netting_date: str
    from_entity: str
    to_entity: str
    amount: float
    currency: str
    status: str  # Pending, Settled, Failed

# ============= UTILITY FUNCTIONS =============

async def get_fx_rate(from_currency: str, to_currency: str = "USD") -> float:
    """Get FX rate for currency conversion"""
    if from_currency == to_currency:
        return 1.0
    
    # Try to get from database
    currency_pair = f"{from_currency}/{to_currency}"
    rate_doc = await db.fx_rates.find_one({"currency_pair": currency_pair}, {"_id": 0})
    
    if rate_doc:
        return rate_doc['rate']
    
    # Default rates if not found
    default_rates = {
        "EUR/USD": 1.10,
        "GBP/USD": 1.27,
        "SGD/USD": 0.74,
        "JPY/USD": 0.0067,
        "CNY/USD": 0.14,
        "INR/USD": 0.012,
        "AUD/USD": 0.66,
    }
    return default_rates.get(currency_pair, 1.0)

def validate_data(balances: List[Dict]) -> List[ValidationLog]:
    """Run data quality checks"""
    logs = []
    today = datetime.now(timezone.utc).isoformat()
    
    # Check for missing balances
    missing_count = sum(1 for b in balances if b.get('balance_local') is None or b.get('balance_local') == 0)
    if missing_count > 0:
        logs.append(ValidationLog(
            check_date=today,
            check_type="missing_balance",
            severity="High",
            description=f"Found {missing_count} accounts with missing or zero balances",
            affected_records=missing_count,
            status="Open"
        ))
    
    # Check for negative cash
    negative_count = sum(1 for b in balances if b.get('balance_local', 0) < 0)
    if negative_count > 0:
        logs.append(ValidationLog(
            check_date=today,
            check_type="negative_cash",
            severity="Medium",
            description=f"Found {negative_count} accounts with negative balances",
            affected_records=negative_count,
            status="Open"
        ))
    
    # Check for duplicates
    account_dates = [(b.get('account_number'), b.get('balance_date')) for b in balances]
    duplicates = len(account_dates) - len(set(account_dates))
    if duplicates > 0:
        logs.append(ValidationLog(
            check_date=today,
            check_type="duplicate",
            severity="High",
            description=f"Found {duplicates} duplicate account-date combinations",
            affected_records=duplicates,
            status="Open"
        ))
    
    return logs

# ============= API ENDPOINTS =============

@api_router.get("/")
async def root():
    return {
        "message": "Global Treasury Intelligence & Automation Platform API",
        "version": "1.0",
        "modules": [
            "Liquidity Management",
            "Cash Pooling",
            "Netting",
            "Data Validation",
            "Analytics"
        ]
    }

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check MongoDB connection
        await db.command("ping")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "services": {
            "database": db_status,
            "api": "healthy"
        }
    }

# ============= MASTER DATA SETUP =============

@api_router.post("/treasury/setup/initialize")
async def initialize_master_data():
    """Initialize treasury master data with sample data"""
    try:
        # Clear existing data
        await db.countries.delete_many({})
        await db.entities.delete_many({})
        await db.bank_accounts.delete_many({})
        await db.fx_rates.delete_many({})
        await db.cash_pools.delete_many({})
        
        # Countries
        countries = [
            {"code": "US", "name": "United States", "region": "AMER", "base_currency": "USD"},
            {"code": "UK", "name": "United Kingdom", "region": "EMEA", "base_currency": "GBP"},
            {"code": "DE", "name": "Germany", "region": "EMEA", "base_currency": "EUR"},
            {"code": "SG", "name": "Singapore", "region": "APAC", "base_currency": "SGD"},
            {"code": "JP", "name": "Japan", "region": "APAC", "base_currency": "JPY"},
            {"code": "CN", "name": "China", "region": "APAC", "base_currency": "CNY"},
            {"code": "AU", "name": "Australia", "region": "APAC", "base_currency": "AUD"},
            {"code": "IN", "name": "India", "region": "APAC", "base_currency": "INR"},
        ]
        
        country_objs = [Country(**c) for c in countries]
        await db.countries.insert_many([c.model_dump() for c in country_objs])
        
        # Legal Entities
        entities = [
            {"entity_code": "JCI-US-001", "entity_name": "JCI Americas Corp", "country_code": "US", "region": "AMER"},
            {"entity_code": "JCI-UK-001", "entity_name": "JCI UK Limited", "country_code": "UK", "region": "EMEA"},
            {"entity_code": "JCI-DE-001", "entity_name": "JCI Deutschland GmbH", "country_code": "DE", "region": "EMEA"},
            {"entity_code": "JCI-SG-001", "entity_name": "JCI Singapore Pte Ltd", "country_code": "SG", "region": "APAC"},
            {"entity_code": "JCI-JP-001", "entity_name": "JCI Japan KK", "country_code": "JP", "region": "APAC"},
            {"entity_code": "JCI-CN-001", "entity_name": "JCI China Ltd", "country_code": "CN", "region": "APAC"},
            {"entity_code": "JCI-AU-001", "entity_name": "JCI Australia Pty", "country_code": "AU", "region": "APAC"},
            {"entity_code": "JCI-IN-001", "entity_name": "JCI India Pvt Ltd", "country_code": "IN", "region": "APAC"},
        ]
        
        entity_objs = [LegalEntity(**e) for e in entities]
        await db.entities.insert_many([e.model_dump() for e in entity_objs])
        
        # Bank Accounts
        banks = ["HSBC", "JPMorgan", "Citibank", "Deutsche Bank", "BNP Paribas"]
        accounts = []
        
        for entity in entities:
            # Each entity has 2-3 accounts
            for i in range(random.randint(2, 3)):
                currency = countries[[c['code'] for c in countries].index(entity['country_code'])]['base_currency']
                accounts.append({
                    "account_number": f"{entity['entity_code']}-{random.randint(1000, 9999)}",
                    "account_name": f"{entity['entity_name']} - Account {i+1}",
                    "entity_code": entity['entity_code'],
                    "bank_name": random.choice(banks),
                    "currency": currency,
                    "country_code": entity['country_code'],
                    "account_type": "Operating" if i < 2 else "Investment"
                })
        
        account_objs = [BankAccount(**a) for a in accounts]
        await db.bank_accounts.insert_many([a.model_dump() for a in account_objs])
        
        # FX Rates
        fx_rates = [
            {"currency_pair": "EUR/USD", "rate": 1.10, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "GBP/USD", "rate": 1.27, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "SGD/USD", "rate": 0.74, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "JPY/USD", "rate": 0.0067, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "CNY/USD", "rate": 0.14, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "INR/USD", "rate": 0.012, "rate_date": datetime.now(timezone.utc).isoformat()},
            {"currency_pair": "AUD/USD", "rate": 0.66, "rate_date": datetime.now(timezone.utc).isoformat()},
        ]
        
        fx_objs = [FXRate(**fx) for fx in fx_rates]
        await db.fx_rates.insert_many([fx.model_dump() for fx in fx_objs])
        
        # Cash Pools
        pools = [
            {
                "pool_name": "APAC Cash Pool",
                "pool_type": "Physical",
                "region": "APAC",
                "header_account": "POOL-APAC-HEADER",
                "participant_accounts": [a['account_number'] for a in accounts if a['country_code'] in ['SG', 'JP', 'CN', 'AU', 'IN']],
                "currency": "USD"
            },
            {
                "pool_name": "EMEA Cash Pool",
                "pool_type": "Notional",
                "region": "EMEA",
                "header_account": "POOL-EMEA-HEADER",
                "participant_accounts": [a['account_number'] for a in accounts if a['country_code'] in ['UK', 'DE']],
                "currency": "EUR"
            },
            {
                "pool_name": "AMER Cash Pool",
                "pool_type": "Physical",
                "region": "AMER",
                "header_account": "POOL-AMER-HEADER",
                "participant_accounts": [a['account_number'] for a in accounts if a['country_code'] == 'US'],
                "currency": "USD"
            },
        ]
        
        pool_objs = [CashPool(**p) for p in pools]
        await db.cash_pools.insert_many([p.model_dump() for p in pool_objs])
        
        return {
            "status": "success",
            "message": "Treasury master data initialized",
            "counts": {
                "countries": len(countries),
                "entities": len(entities),
                "bank_accounts": len(accounts),
                "fx_rates": len(fx_rates),
                "cash_pools": len(pools)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/treasury/setup/generate-balances")
async def generate_sample_balances():
    """Generate realistic daily cash balances"""
    try:
        # Clear existing balances
        await db.cash_balances.delete_many({})
        
        # Get all accounts
        accounts = await db.bank_accounts.find({}, {"_id": 0}).to_list(1000)
        
        if not accounts:
            raise HTTPException(status_code=400, detail="No bank accounts found. Run initialize first.")
        
        today = datetime.now(timezone.utc).date().isoformat()
        balances = []
        
        for account in accounts:
            # Get entity info first
            entity = await db.entities.find_one({"entity_code": account['entity_code']}, {"_id": 0})
            entity_region = entity['region'] if entity else 'UNKNOWN'
            
            # Generate realistic balance based on region
            if account['country_code'] == 'US':
                base_balance = random.uniform(5_000_000, 50_000_000)
            elif entity_region == 'EMEA':
                base_balance = random.uniform(2_000_000, 20_000_000)
            else:  # APAC
                base_balance = random.uniform(1_000_000, 15_000_000)
            
            # Add some volatility
            balance_local = base_balance * random.uniform(0.8, 1.2)
            
            # Convert to USD
            fx_rate = await get_fx_rate(account['currency'], 'USD')
            balance_usd = balance_local * fx_rate
            
            balances.append({
                "account_number": account['account_number'],
                "balance_date": today,
                "currency": account['currency'],
                "balance_local": round(balance_local, 2),
                "balance_usd": round(balance_usd, 2),
                "entity_code": account['entity_code'],
                "region": entity_region
            })
        
        balance_objs = [CashBalance(**b) for b in balances]
        await db.cash_balances.insert_many([b.model_dump() for b in balance_objs])
        
        return {
            "status": "success",
            "message": "Sample cash balances generated",
            "count": len(balances),
            "date": today
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= LIQUIDITY MANAGEMENT =============

@api_router.get("/treasury/liquidity/global-position")
async def get_global_position():
    """Get global cash position across all entities"""
    try:
        balances = await db.cash_balances.find({}, {"_id": 0}).to_list(10000)
        
        if not balances:
            return {
                "total_liquidity_usd": 0,
                "by_region": {},
                "by_currency": {},
                "total_accounts": 0
            }
        
        # Total liquidity
        total_usd = sum(b['balance_usd'] for b in balances)
        
        # By region
        by_region = {}
        for balance in balances:
            region = balance['region']
            by_region[region] = by_region.get(region, 0) + balance['balance_usd']
        
        # By currency
        by_currency = {}
        for balance in balances:
            currency = balance['currency']
            by_currency[currency] = by_currency.get(currency, 0) + balance['balance_local']
        
        return {
            "total_liquidity_usd": round(total_usd, 2),
            "by_region": {k: round(v, 2) for k, v in by_region.items()},
            "by_currency": {k: round(v, 2) for k, v in by_currency.items()},
            "total_accounts": len(balances),
            "as_of_date": balances[0]['balance_date'] if balances else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/treasury/liquidity/by-region/{region}")
async def get_regional_liquidity(region: str):
    """Get liquidity for a specific region"""
    try:
        balances = await db.cash_balances.find({"region": region}, {"_id": 0}).to_list(10000)
        
        if not balances:
            return {
                "region": region,
                "total_usd": 0,
                "entities": [],
                "currencies": {}
            }
        
        # By entity
        by_entity = {}
        for balance in balances:
            entity = balance['entity_code']
            by_entity[entity] = by_entity.get(entity, 0) + balance['balance_usd']
        
        # By currency
        by_currency = {}
        for balance in balances:
            currency = balance['currency']
            by_currency[currency] = by_currency.get(currency, 0) + balance['balance_local']
        
        return {
            "region": region,
            "total_usd": round(sum(b['balance_usd'] for b in balances), 2),
            "entities": {k: round(v, 2) for k, v in by_entity.items()},
            "currencies": {k: round(v, 2) for k, v in by_currency.items()},
            "account_count": len(balances)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= CASH POOLING =============

@api_router.get("/treasury/cash-pool/status")
async def get_cash_pool_status():
    """Get status of all cash pools"""
    try:
        pools = await db.cash_pools.find({}, {"_id": 0}).to_list(1000)
        
        pool_status = []
        for pool in pools:
            # Get balances for participant accounts
            balances = await db.cash_balances.find(
                {"account_number": {"$in": pool['participant_accounts']}},
                {"_id": 0}
            ).to_list(1000)
            
            total_balance = sum(b['balance_usd'] for b in balances)
            participant_count = len(balances)
            
            # Calculate pool efficiency (higher is better)
            efficiency = min(100, (participant_count / max(1, len(pool['participant_accounts']))) * 100)
            
            pool_status.append({
                "pool_name": pool['pool_name'],
                "pool_type": pool['pool_type'],
                "region": pool['region'],
                "total_balance_usd": round(total_balance, 2),
                "participants": participant_count,
                "efficiency": round(efficiency, 2),
                "status": "Active" if participant_count > 0 else "Inactive"
            })
        
        return {
            "pools": pool_status,
            "total_pools": len(pools)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/treasury/cash-pool/calculate/{region}")
async def calculate_cash_pooling(region: str):
    """Calculate cash pooling for a region"""
    try:
        # Get pool for region
        pool = await db.cash_pools.find_one({"region": region}, {"_id": 0})
        
        if not pool:
            raise HTTPException(status_code=404, detail=f"No pool found for region {region}")
        
        # Get balances
        balances = await db.cash_balances.find(
            {"account_number": {"$in": pool['participant_accounts']}},
            {"_id": 0}
        ).to_list(1000)
        
        if not balances:
            return {
                "pool_name": pool['pool_name'],
                "total_pooled": 0,
                "participants": []
            }
        
        # Calculate pooling
        total_pooled = sum(b['balance_usd'] for b in balances)
        average_balance = total_pooled / len(balances)
        
        participants = []
        for balance in balances:
            variance = balance['balance_usd'] - average_balance
            participants.append({
                "account": balance['account_number'],
                "entity": balance['entity_code'],
                "balance_usd": balance['balance_usd'],
                "variance_from_avg": round(variance, 2),
                "status": "Surplus" if variance > 0 else "Deficit"
            })
        
        return {
            "pool_name": pool['pool_name'],
            "pool_type": pool['pool_type'],
            "total_pooled_usd": round(total_pooled, 2),
            "average_balance": round(average_balance, 2),
            "participants": participants,
            "calculation_date": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= NETTING =============

@api_router.post("/treasury/netting/run")
async def run_netting():
    """Run inter-company netting"""
    try:
        # Clear old netting results
        await db.netting_results.delete_many({})
        
        # Get all entities with surplus
        balances = await db.cash_balances.find({}, {"_id": 0}).to_list(10000)
        
        # Group by entity
        entity_balances = {}
        for balance in balances:
            entity = balance['entity_code']
            entity_balances[entity] = entity_balances.get(entity, 0) + balance['balance_usd']
        
        # Identify surplus and deficit entities
        avg_balance = sum(entity_balances.values()) / len(entity_balances)
        surplus_entities = {k: v for k, v in entity_balances.items() if v > avg_balance}
        deficit_entities = {k: v for k, v in entity_balances.items() if v < avg_balance}
        
        # Create netting transactions
        netting_results = []
        today = datetime.now(timezone.utc).date().isoformat()
        
        for deficit_entity, deficit_amount in list(deficit_entities.items())[:3]:
            for surplus_entity, surplus_amount in list(surplus_entities.items())[:2]:
                # Calculate netting amount (simplified)
                netting_amount = min(
                    abs(deficit_amount - avg_balance),
                    surplus_amount - avg_balance
                ) * 0.3  # Net 30% of difference
                
                if netting_amount > 100000:  # Only net if > 100k
                    netting_results.append({
                        "netting_date": today,
                        "from_entity": surplus_entity,
                        "to_entity": deficit_entity,
                        "amount": round(netting_amount, 2),
                        "currency": "USD",
                        "status": random.choice(["Settled", "Pending", "Settled", "Settled"])  # Mostly settled
                    })
        
        if netting_results:
            netting_objs = [NettingResult(**n) for n in netting_results]
            await db.netting_results.insert_many([n.model_dump() for n in netting_objs])
        
        return {
            "status": "success",
            "netting_date": today,
            "total_transactions": len(netting_results),
            "total_netted_usd": round(sum(n['amount'] for n in netting_results), 2),
            "transactions": netting_results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/treasury/netting/results")
async def get_netting_results():
    """Get latest netting results"""
    try:
        results = await db.netting_results.find({}, {"_id": 0}).to_list(1000)
        
        if not results:
            return {
                "total_transactions": 0,
                "total_netted": 0,
                "by_status": {},
                "transactions": []
            }
        
        # By status
        by_status = {}
        for result in results:
            status = result['status']
            by_status[status] = by_status.get(status, 0) + 1
        
        return {
            "total_transactions": len(results),
            "total_netted_usd": round(sum(r['amount'] for r in results), 2),
            "by_status": by_status,
            "transactions": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= DATA VALIDATION =============

@api_router.post("/treasury/validate")
async def run_validation():
    """Run data quality validation"""
    try:
        # Get all balances
        balances = await db.cash_balances.find({}, {"_id": 0}).to_list(10000)
        
        if not balances:
            return {
                "status": "success",
                "issues_found": 0,
                "validations": []
            }
        
        # Run validation
        validation_logs = validate_data(balances)
        
        # Clear old logs
        await db.validation_logs.delete_many({})
        
        # Save new logs
        if validation_logs:
            await db.validation_logs.insert_many([v.model_dump() for v in validation_logs])
        
        return {
            "status": "success",
            "issues_found": len(validation_logs),
            "validations": [v.model_dump() for v in validation_logs],
            "check_date": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/treasury/validation/report")
async def get_validation_report():
    """Get data quality report"""
    try:
        logs = await db.validation_logs.find({}, {"_id": 0}).to_list(1000)
        
        if not logs:
            return {
                "total_issues": 0,
                "by_severity": {},
                "by_type": {},
                "issues": []
            }
        
        # By severity
        by_severity = {}
        for log in logs:
            severity = log['severity']
            by_severity[severity] = by_severity.get(severity, 0) + 1
        
        # By type
        by_type = {}
        for log in logs:
            check_type = log['check_type']
            by_type[check_type] = by_type.get(check_type, 0) + 1
        
        return {
            "total_issues": len(logs),
            "by_severity": by_severity,
            "by_type": by_type,
            "issues": logs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= DATA IMPORT =============

# File upload constraints
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.csv'}

@api_router.post("/treasury/import/upload")
async def upload_data(file: UploadFile = File(...), data_type: str = Form(...)):
    """Upload Excel or CSV file to import data"""
    try:
        logger.info(f"File upload started: {file.filename}, type: {data_type}")
        
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            logger.warning(f"Invalid file type: {file_ext}")
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            logger.warning(f"File too large: {file_size} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
            )
        
        logger.info(f"File validated: {file_size} bytes")
        
        # Determine file type and read accordingly
        if file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(BytesIO(content))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(StringIO(content.decode('utf-8')))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use Excel (.xlsx) or CSV (.csv)")
        
        # Validate and process based on data type
        records_imported = 0
        
        if data_type == 'cash_balances':
            # Validate required columns
            required_columns = ['account_number', 'balance_date', 'currency', 'balance_local', 'entity_code', 'region']
            if not all(col in df.columns for col in required_columns):
                raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {required_columns}")
            
            # Convert to records and add IDs
            records = df.to_dict('records')
            for record in records:
                # Convert to USD if needed
                fx_rate = await get_fx_rate(record['currency'], 'USD')
                record['balance_usd'] = float(record['balance_local']) * fx_rate
                record['id'] = str(uuid.uuid4())
            
            # Insert into database
            if records:
                await db.cash_balances.insert_many(records)
                records_imported = len(records)
        
        elif data_type == 'bank_accounts':
            required_columns = ['account_number', 'account_name', 'entity_code', 'bank_name', 'currency', 'country_code', 'account_type']
            if not all(col in df.columns for col in required_columns):
                raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {required_columns}")
            
            records = df.to_dict('records')
            for record in records:
                record['id'] = str(uuid.uuid4())
            
            if records:
                await db.bank_accounts.insert_many(records)
                records_imported = len(records)
        
        elif data_type == 'fx_rates':
            required_columns = ['currency_pair', 'rate', 'rate_date']
            if not all(col in df.columns for col in required_columns):
                raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {required_columns}")
            
            records = df.to_dict('records')
            for record in records:
                record['id'] = str(uuid.uuid4())
                record['rate'] = float(record['rate'])
            
            if records:
                await db.fx_rates.insert_many(records)
                records_imported = len(records)
        
        elif data_type == 'entities':
            required_columns = ['entity_code', 'entity_name', 'country_code', 'region']
            if not all(col in df.columns for col in required_columns):
                raise HTTPException(status_code=400, detail=f"Missing required columns. Required: {required_columns}")
            
            records = df.to_dict('records')
            for record in records:
                record['id'] = str(uuid.uuid4())
            
            if records:
                await db.entities.insert_many(records)
                records_imported = len(records)
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported data type: {data_type}")
        
        logger.info(f"Successfully imported {records_imported} records of type {data_type}")
        return {
            "status": "success",
            "message": f"Successfully imported {records_imported} records",
            "records_imported": records_imported,
            "data_type": data_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@api_router.get("/treasury/import/api-info")
async def get_api_info():
    """Get API connection information for Power BI, Tableau, etc."""
    return {
        "api_base_url": os.environ.get('API_BASE_URL', 'http://localhost:5000/api'),
        "endpoints": {
            "global_position": "/treasury/liquidity/global-position",
            "regional_liquidity": "/treasury/liquidity/by-region/{region}",
            "cash_pools": "/treasury/cash-pool/status",
            "netting_results": "/treasury/netting/results",
            "validation_report": "/treasury/validation/report",
            "analytics": "/treasury/analytics/summary",
            "trends": "/treasury/analytics/trends"
        },
        "authentication": "None (add authentication as needed)",
        "rate_limit": "None",
        "documentation": f"{os.environ.get('API_BASE_URL', 'http://localhost:5000')}/docs"
    }

@api_router.get("/treasury/export/{data_type}")
async def export_data(data_type: str):
    """Export data to Excel file"""
    try:
        logger.info(f"Export requested for: {data_type}")
        
        # Fetch data based on type
        if data_type == "cash_balances":
            data = await db.cash_balances.find({}, {"_id": 0}).to_list(10000)
        elif data_type == "bank_accounts":
            data = await db.bank_accounts.find({}, {"_id": 0}).to_list(10000)
        elif data_type == "entities":
            data = await db.entities.find({}, {"_id": 0}).to_list(10000)
        elif data_type == "fx_rates":
            data = await db.fx_rates.find({}, {"_id": 0}).to_list(10000)
        elif data_type == "netting_results":
            data = await db.netting_results.find({}, {"_id": 0}).to_list(10000)
        elif data_type == "validation_logs":
            data = await db.validation_logs.find({}, {"_id": 0}).to_list(10000)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid data type: {data_type}")
        
        if not data:
            raise HTTPException(status_code=404, detail="No data found to export")
        
        # Convert to DataFrame and Excel
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=data_type)
        output.seek(0)
        
        logger.info(f"Export successful: {len(data)} records")
        
        # Return as downloadable file
        filename = f"{data_type}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

# ============= ANALYTICS & REPORTING =============

@api_router.get("/treasury/analytics/summary")
async def get_analytics_summary():
    """Get comprehensive treasury analytics"""
    try:
        # Get all data
        balances = await db.cash_balances.find({}, {"_id": 0}).to_list(10000)
        pools = await db.cash_pools.find({}, {"_id": 0}).to_list(1000)
        netting = await db.netting_results.find({}, {"_id": 0}).to_list(1000)
        validations = await db.validation_logs.find({}, {"_id": 0}).to_list(1000)
        
        # Calculate metrics
        total_liquidity = sum(b['balance_usd'] for b in balances)
        
        # Regional breakdown
        regional_liquidity = {}
        for balance in balances:
            region = balance['region']
            regional_liquidity[region] = regional_liquidity.get(region, 0) + balance['balance_usd']
        
        # Top entities
        entity_balances = {}
        for balance in balances:
            entity = balance['entity_code']
            entity_balances[entity] = entity_balances.get(entity, 0) + balance['balance_usd']
        
        top_entities = sorted(entity_balances.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_liquidity_usd": round(total_liquidity, 2),
            "total_accounts": len(balances),
            "total_cash_pools": len(pools),
            "active_netting_transactions": len(netting),
            "data_quality_issues": len(validations),
            "regional_breakdown": {k: round(v, 2) for k, v in regional_liquidity.items()},
            "top_entities": [{"entity": e[0], "balance_usd": round(e[1], 2)} for e in top_entities],
            "as_of_date": datetime.now(timezone.utc).date().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/treasury/analytics/trends")
async def get_trends():
    """Get historical trends (simulated for demo)"""
    try:
        # Simulate 30 days of historical data
        trends = []
        base_liquidity = 150_000_000
        
        for i in range(30, 0, -1):
            date = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
            # Add some variance
            liquidity = base_liquidity * random.uniform(0.9, 1.1)
            
            trends.append({
                "date": date,
                "total_liquidity_usd": round(liquidity, 2),
                "apac": round(liquidity * 0.35, 2),
                "emea": round(liquidity * 0.30, 2),
                "amer": round(liquidity * 0.35, 2)
            })
        
        return {
            "period": "Last 30 Days",
            "trends": trends
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('treasury_app.log')
    ]
)
logger = logging.getLogger(__name__)

# Log startup
logger.info("=" * 50)
logger.info("Treasury Intelligence Platform Starting")
logger.info(f"MongoDB URL: {mongo_url[:20]}...")
logger.info(f"Database: {os.environ['DB_NAME']}")
logger.info("=" * 50)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Main entry point for running the server
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
