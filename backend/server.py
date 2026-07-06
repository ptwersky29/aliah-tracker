"""Auction Ledger backend — FastAPI + PostgreSQL (Neon).
Manages a synagogue auction/aliyos ledger:
 - Customers
 - Products (special items in addition to the built-in standard aliyos)
 - Sales (weekly auction sales)
 - Payments
 - Extra charges (nakhtzol)
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from psycopg_pool import AsyncConnectionPool
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from auth import get_current_user, router as auth_router, USERS_TABLE_SQL

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]
db_pool = None

app = FastAPI(title="Auction Ledger")
api = APIRouter(prefix="/api", dependencies=[Depends(get_current_user)])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


TABLES_SQL = """
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_price REAL,
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT DEFAULT '',
    product_id TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    week TEXT NOT NULL,
    price REAL NOT NULL,
    created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT DEFAULT '',
    amount REAL NOT NULL,
    date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    item_id TEXT,
    item_name TEXT DEFAULT '',
    created_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS extra_charges (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT DEFAULT '',
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT DEFAULT '',
    created_date TEXT NOT NULL
);
"""


# ---------------------------------------------------------------------------
# psycopg helper wrappers (mimic asyncpg API)
# ---------------------------------------------------------------------------
async def _fetch(sql, *args):
    async with db_pool.connection() as conn:
        cur = await conn.execute(sql, args)
        return [dict(r) for r in await cur.fetchall()]


async def _fetchrow(sql, *args):
    async with db_pool.connection() as conn:
        cur = await conn.execute(sql, args)
        r = await cur.fetchone()
        return dict(r) if r else None


async def _execute(sql, *args):
    async with db_pool.connection() as conn:
        cur = await conn.execute(sql, args)
        return cur.statusmessage


async def _fetchval(sql, *args):
    async with db_pool.connection() as conn:
        cur = await conn.execute(sql, args)
        r = await cur.fetchone()
        return r[0] if r else None


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = AsyncConnectionPool(DATABASE_URL, min_size=1, max_size=5, open=True)
    async with db_pool.connection() as conn:
        for stmt in TABLES_SQL.split(";"):
            s = stmt.strip()
            if s:
                await conn.execute(s + ";")
        for stmt in USERS_TABLE_SQL.split(";"):
            s = stmt.strip()
            if s:
                await conn.execute(s + ";")


@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    first_name: str
    last_name: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""
    created_date: str = Field(default_factory=_now_iso)


class CustomerCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    name: str
    default_price: Optional[float] = None
    sort_order: Optional[int] = 0
    active: bool = True
    created_date: str = Field(default_factory=_now_iso)


class ProductCreate(BaseModel):
    name: str
    default_price: Optional[float] = None
    sort_order: Optional[int] = 0
    active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    default_price: Optional[float] = None
    sort_order: Optional[int] = None
    active: Optional[bool] = None


class Sale(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    customer_id: str
    customer_name: Optional[str] = ""
    product_id: str
    product_name: Optional[str] = ""
    week: str
    price: float
    created_date: str = Field(default_factory=_now_iso)


class SaleCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = ""
    product_id: str
    product_name: Optional[str] = ""
    week: str
    price: float


class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    customer_id: str
    customer_name: Optional[str] = ""
    amount: float
    date: Optional[str] = ""
    notes: Optional[str] = ""
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    created_date: str = Field(default_factory=_now_iso)


class PaymentCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = ""
    amount: float
    date: Optional[str] = ""
    notes: Optional[str] = ""
    item_id: Optional[str] = None
    item_name: Optional[str] = None


class ExtraCharge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    customer_id: str
    customer_name: Optional[str] = ""
    description: str
    amount: float
    date: Optional[str] = ""
    created_date: str = Field(default_factory=_now_iso)


class ExtraChargeCreate(BaseModel):
    customer_id: str
    customer_name: Optional[str] = ""
    description: str
    amount: float
    date: Optional[str] = ""


# ---------------------------------------------------------------------------
# Generic CRUD factory
# ---------------------------------------------------------------------------
def _register_crud(table_name, model, create_model, update_model=None):
    @api.get(f"/{table_name}", response_model=List[model])
    async def list_items():
        rows = await _fetch(f'SELECT * FROM "{table_name}" ORDER BY created_date DESC')
        return rows

    @api.post(f"/{table_name}", response_model=model)
    async def create_item(payload: create_model):
        obj = model(**payload.model_dump())
        data = obj.model_dump()
        cols = list(data.keys())
        vals = list(data.values())
        quoted_cols = ",".join(f'"{c}"' for c in cols)
        placeholders = ",".join("%s" for _ in cols)
        await _execute(
            f'INSERT INTO "{table_name}" ({quoted_cols}) VALUES ({placeholders})',
            *vals,
        )
        return obj

    @api.get(f"/{table_name}/{{item_id}}", response_model=model)
    async def get_item(item_id: str):
        row = await _fetchrow(f'SELECT * FROM "{table_name}" WHERE id = %s', item_id)
        if not row:
            raise HTTPException(404, "Not found")
        return row

    if update_model is not None:
        @api.patch(f"/{table_name}/{{item_id}}", response_model=model)
        async def update_item(item_id: str, payload: update_model):
            updates = {k: v for k, v in payload.model_dump().items() if v is not None}
            if not updates:
                row = await _fetchrow(f'SELECT * FROM "{table_name}" WHERE id = %s', item_id)
                if not row:
                    raise HTTPException(404, "Not found")
                return row
            set_clauses = " , ".join(f'"{k}" = %s' for k in updates.keys())
            vals = list(updates.values())
            async with db_pool.connection() as conn:
                cur = await conn.execute(
                    f'UPDATE "{table_name}" SET {set_clauses} WHERE id = %s RETURNING *',
                    (*vals, item_id),
                )
                r = await cur.fetchone()
            if not r:
                raise HTTPException(404, "Not found")
            return dict(r)

    @api.delete(f"/{table_name}/{{item_id}}")
    async def delete_item(item_id: str):
        async with db_pool.connection() as conn:
            cur = await conn.execute(f'DELETE FROM "{table_name}" WHERE id = %s', (item_id,))
            if cur.rowcount == 0:
                raise HTTPException(404, "Not found")
        return {"ok": True}


_register_crud("customers", Customer, CustomerCreate, CustomerUpdate)
_register_crud("products", Product, ProductCreate, ProductUpdate)
_register_crud("sales", Sale, SaleCreate)
_register_crud("payments", Payment, PaymentCreate)
_register_crud("extra_charges", ExtraCharge, ExtraChargeCreate)


# ---------------------------------------------------------------------------
# Aggregate endpoint
# ---------------------------------------------------------------------------
@api.get("/snapshot")
async def snapshot():
    async with db_pool.connection() as conn:
        cur = await conn.execute('SELECT * FROM "customers" ORDER BY first_name ASC')
        customers = [dict(r) for r in await cur.fetchall()]
        cur = await conn.execute('SELECT * FROM "products" ORDER BY sort_order ASC')
        products = [dict(r) for r in await cur.fetchall()]
        cur = await conn.execute('SELECT * FROM "sales" ORDER BY created_date DESC')
        sales = [dict(r) for r in await cur.fetchall()]
        cur = await conn.execute('SELECT * FROM "payments" ORDER BY created_date DESC')
        payments = [dict(r) for r in await cur.fetchall()]
        cur = await conn.execute('SELECT * FROM "extra_charges" ORDER BY created_date DESC')
        extras = [dict(r) for r in await cur.fetchall()]
    return {
        "customers": customers,
        "products": products,
        "sales": sales,
        "payments": payments,
        "extra_charges": extras,
    }


# ---------------------------------------------------------------------------
# Seed demo data
# ---------------------------------------------------------------------------
SAMPLE_CUSTOMERS = [
    ("יוסף", "פרידמאן", "07700 900100"),
    ("שמואל", "ראזענבערג", "07700 900101"),
    ("מרדכי", "וועבער", "07700 900102"),
    ("חיים", "גראָסמאן", "07700 900103"),
    ("אהרן", "שווארץ", ""),
    ("דוד", "האָראָוויץ", "07700 900105"),
    ("נפתלי", "כ״ץ", ""),
    ("יצחק", "פערל", "07700 900107"),
    ("בנימין", "טייטלבוים", "07700 900108"),
    ("שלום", "וויינשטאק", ""),
]

SAMPLE_PRODUCTS = [
    {"name": "פתיחה (ארון הקודש)", "default_price": 36, "sort_order": 1},
    {"name": "פתיחה — מנחה", "default_price": 18, "sort_order": 2},
    {"name": "אויפֿרוף", "default_price": 100, "sort_order": 3},
    {"name": "בר־מצוה ברכה", "default_price": 180, "sort_order": 4},
]


@api.post("/seed")
async def seed():
    inserted = {"customers": 0, "products": 0, "sales": 0, "payments": 0, "extra_charges": 0}

    async with db_pool.connection() as conn:
        cur = await conn.execute('SELECT COUNT(*) FROM "customers"')
        if (await cur.fetchone())[0] == 0:
            for first, last, phone in SAMPLE_CUSTOMERS:
                c = Customer(first_name=first, last_name=last, phone=phone)
                d = c.model_dump()
                cols = ",".join(f'"{k}"' for k in d)
                ph = ",".join("%s" for _ in d)
                await conn.execute(
                    f'INSERT INTO "customers" ({cols}) VALUES ({ph})', tuple(d.values())
                )
                inserted["customers"] += 1

        cur = await conn.execute('SELECT COUNT(*) FROM "products"')
        if (await cur.fetchone())[0] == 0:
            for p in SAMPLE_PRODUCTS:
                prod = Product(**p)
                d = prod.model_dump()
                cols = ",".join(f'"{k}"' for k in d)
                ph = ",".join("%s" for _ in d)
                await conn.execute(
                    f'INSERT INTO "products" ({cols}) VALUES ({ph})', tuple(d.values())
                )
                inserted["products"] += 1

        cur = await conn.execute('SELECT COUNT(*) FROM "sales"')
        if (await cur.fetchone())[0] == 0:
            cur = await conn.execute('SELECT * FROM "customers"')
            customers = [dict(r) for r in await cur.fetchall()]
            if customers:
                import datetime as _dt
                today = _dt.date.today()
                offset_to_sat = (5 - today.weekday()) % 7
                last_sat = today + _dt.timedelta(days=offset_to_sat - 7)
                weeks = [(last_sat - _dt.timedelta(days=7 * i)).isoformat() for i in range(4)]

                aliyos = [
                    ("kohen", "כהן", 36),
                    ("levi", "לוי", 18),
                    ("shlishi", "שלישי", 25),
                    ("revii", "רביעי", 36),
                    ("chamishi", "חמישי", 18),
                    ("shishi", "שישי", 50),
                    ("shvii", "שביעי", 72),
                    ("maftir", "מפטיר", 100),
                    ("hagbah", "הגבה", 18),
                    ("glilah", "גלילה", 10),
                ]

                for wi, week in enumerate(weeks):
                    for ai, (pid, plabel, base) in enumerate(aliyos[: 8 - wi % 2]):
                        cust = customers[(wi * 3 + ai) % len(customers)]
                        price = float(base + (ai * 5) % 25)
                        sale = Sale(
                            customer_id=cust["id"],
                            customer_name=f"{cust.get('first_name','')} {cust.get('last_name','')}".strip(),
                            product_id=pid,
                            product_name=plabel,
                            week=week,
                            price=price,
                        )
                        d = sale.model_dump()
                        cols = ",".join(f'"{k}"' for k in d)
                        ph = ",".join("%s" for _ in d)
                        await conn.execute(
                            f'INSERT INTO "sales" ({cols}) VALUES ({ph})', tuple(d.values())
                        )
                        inserted["sales"] += 1

                for ci, cust in enumerate(customers[:5]):
                    pay = Payment(
                        customer_id=cust["id"],
                        customer_name=f"{cust.get('first_name','')} {cust.get('last_name','')}".strip(),
                        amount=float(50 + ci * 20),
                        date=weeks[0],
                        notes="צאָלונג",
                    )
                    d = pay.model_dump()
                    cols = ",".join(f'"{k}"' for k in d)
                    ph = ",".join("%s" for _ in d)
                    await conn.execute(
                        f'INSERT INTO "payments" ({cols}) VALUES ({ph})', tuple(d.values())
                    )
                    inserted["payments"] += 1

                extra = ExtraCharge(
                    customer_id=customers[0]["id"],
                    customer_name=f"{customers[0].get('first_name','')} {customers[0].get('last_name','')}".strip(),
                    description="נדבה לחזקה",
                    amount=50,
                    date=weeks[1],
                )
                d = extra.model_dump()
                cols = ",".join(f'"{k}"' for k in d)
                ph = ",".join("%s" for _ in d)
                await conn.execute(
                    f'INSERT INTO "extra_charges" ({cols}) VALUES ({ph})', tuple(d.values())
                )
                inserted["extra_charges"] += 1

    return {"ok": True, "inserted": inserted}


@api.post("/wipe")
async def wipe():
    async with db_pool.connection() as conn:
        for name in ["customers", "products", "sales", "payments", "extra_charges"]:
            await conn.execute(f'DELETE FROM "{name}"')
    return {"ok": True}


@api.get("/")
async def root():
    return {"name": "Auction Ledger", "status": "ok"}


app.include_router(auth_router)
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
