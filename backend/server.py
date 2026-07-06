"""Auction Ledger backend — FastAPI + MongoDB.

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
from fastapi import APIRouter, FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Auction Ledger")
api = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


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
    week: str  # ISO date string of the Shabbos
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
    date: Optional[str] = ""  # ISO date string
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
def _register_crud(collection_name, model, create_model, update_model=None):
    coll = db[collection_name]
    plural = collection_name

    @api.get(f"/{plural}", response_model=List[model])
    async def list_items():  # noqa
        items = await coll.find({}, {"_id": 0}).sort("created_date", -1).to_list(5000)
        return items

    @api.post(f"/{plural}", response_model=model)
    async def create_item(payload: create_model):  # noqa
        obj = model(**payload.model_dump())
        await coll.insert_one(obj.model_dump())
        return obj

    @api.get(f"/{plural}/{{item_id}}", response_model=model)
    async def get_item(item_id: str):  # noqa
        doc = await coll.find_one({"id": item_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Not found")
        return doc

    if update_model is not None:
        @api.patch(f"/{plural}/{{item_id}}", response_model=model)
        async def update_item(item_id: str, payload: update_model):  # noqa
            updates = {k: v for k, v in payload.model_dump().items() if v is not None}
            if not updates:
                doc = await coll.find_one({"id": item_id}, {"_id": 0})
                if not doc:
                    raise HTTPException(404, "Not found")
                return doc
            result = await coll.find_one_and_update(
                {"id": item_id},
                {"$set": updates},
                projection={"_id": 0},
                return_document=True,
            )
            if not result:
                raise HTTPException(404, "Not found")
            return result

    @api.delete(f"/{plural}/{{item_id}}")
    async def delete_item(item_id: str):  # noqa
        result = await coll.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(404, "Not found")
        return {"ok": True}


_register_crud("customers", Customer, CustomerCreate, CustomerUpdate)
_register_crud("products", Product, ProductCreate, ProductUpdate)
_register_crud("sales", Sale, SaleCreate)
_register_crud("payments", Payment, PaymentCreate)
_register_crud("extra_charges", ExtraCharge, ExtraChargeCreate)


# ---------------------------------------------------------------------------
# Aggregate endpoint — convenient single fetch for dashboards
# ---------------------------------------------------------------------------
@api.get("/snapshot")
async def snapshot():
    """Return all collections in a single response so the frontend can build
    derived views (balances, etc.) without firing five separate requests."""
    customers = await db.customers.find({}, {"_id": 0}).sort("first_name", 1).to_list(5000)
    products = await db.products.find({}, {"_id": 0}).sort("sort_order", 1).to_list(5000)
    sales = await db.sales.find({}, {"_id": 0}).sort("created_date", -1).to_list(10000)
    payments = await db.payments.find({}, {"_id": 0}).sort("created_date", -1).to_list(10000)
    extras = await db.extra_charges.find({}, {"_id": 0}).sort("created_date", -1).to_list(10000)
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
    """Idempotent demo seed — only inserts if collections are empty."""
    inserted = {"customers": 0, "products": 0, "sales": 0, "payments": 0, "extra_charges": 0}

    # Customers
    if await db.customers.count_documents({}) == 0:
        for first, last, phone in SAMPLE_CUSTOMERS:
            c = Customer(first_name=first, last_name=last, phone=phone)
            await db.customers.insert_one(c.model_dump())
            inserted["customers"] += 1

    # Products
    if await db.products.count_documents({}) == 0:
        for p in SAMPLE_PRODUCTS:
            prod = Product(**p)
            await db.products.insert_one(prod.model_dump())
            inserted["products"] += 1

    # Some sales / payments for the last 4 Shabbosos using built-in aliyos ids
    if await db.sales.count_documents({}) == 0:
        customers = await db.customers.find({}, {"_id": 0}).to_list(100)
        if customers:
            # Find last 4 Saturdays
            import datetime as _dt
            today = _dt.date.today()
            offset_to_sat = (5 - today.weekday()) % 7  # weekday(): Mon=0..Sun=6; Sat=5
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
                    await db.sales.insert_one(sale.model_dump())
                    inserted["sales"] += 1

            # Partial payments
            for ci, cust in enumerate(customers[:5]):
                pay = Payment(
                    customer_id=cust["id"],
                    customer_name=f"{cust.get('first_name','')} {cust.get('last_name','')}".strip(),
                    amount=float(50 + ci * 20),
                    date=weeks[0],
                    notes="צאָלונג",
                )
                await db.payments.insert_one(pay.model_dump())
                inserted["payments"] += 1

            # One extra charge
            extra = ExtraCharge(
                customer_id=customers[0]["id"],
                customer_name=f"{customers[0].get('first_name','')} {customers[0].get('last_name','')}".strip(),
                description="נדבה לחזקה",
                amount=50,
                date=weeks[1],
            )
            await db.extra_charges.insert_one(extra.model_dump())
            inserted["extra_charges"] += 1

    return {"ok": True, "inserted": inserted}


@api.post("/wipe")
async def wipe():
    """Remove all collections — destructive, used for testing only."""
    for name in ["customers", "products", "sales", "payments", "extra_charges"]:
        await db[name].delete_many({})
    return {"ok": True}


@api.get("/")
async def root():
    return {"name": "Auction Ledger", "status": "ok"}


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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
