"""Backend API tests for Auction Ledger.

Covers: health, seed idempotency, snapshot, CRUD for customers/products/sales/
payments/extra_charges, and basic validation/404 behaviour.
"""
import os
import uuid

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def ensure_seeded(session):
    """Ensure DB has data; call seed (idempotent)."""
    r = session.post(f"{API}/seed", timeout=30)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("name") == "Auction Ledger"
        assert data.get("status") == "ok"


# ---------------------------------------------------------------------------
# Seed idempotency + snapshot
# ---------------------------------------------------------------------------
class TestSeedSnapshot:
    def test_seed_is_idempotent(self, session):
        r = session.post(f"{API}/seed", timeout=30)
        assert r.status_code == 200
        data = r.json()
        # Second call should insert 0 because data exists already
        assert data["ok"] is True
        ins = data["inserted"]
        assert ins["customers"] == 0
        assert ins["products"] == 0
        assert ins["sales"] == 0
        assert ins["payments"] == 0
        assert ins["extra_charges"] == 0

    def test_snapshot_shape(self, session):
        r = session.get(f"{API}/snapshot", timeout=15)
        assert r.status_code == 200
        data = r.json()
        for k in ["customers", "products", "sales", "payments", "extra_charges"]:
            assert k in data
            assert isinstance(data[k], list)
        # Expected approximate counts from seed
        assert len(data["customers"]) >= 10
        assert len(data["products"]) >= 4
        assert len(data["sales"]) >= 20
        assert len(data["payments"]) >= 5
        assert len(data["extra_charges"]) >= 1


# ---------------------------------------------------------------------------
# Customers CRUD
# ---------------------------------------------------------------------------
class TestCustomers:
    def test_list(self, session):
        r = session.get(f"{API}/customers", timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Verify no MongoDB _id leak
        for it in items[:5]:
            assert "_id" not in it
            assert "id" in it
            assert "first_name" in it

    def test_create_get_update_delete(self, session):
        unique = f"TEST_{uuid.uuid4().hex[:8]}"
        # CREATE
        r = session.post(
            f"{API}/customers",
            json={"first_name": unique, "last_name": "Tester", "phone": "0700"},
        )
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["first_name"] == unique
        assert created["last_name"] == "Tester"
        cid = created["id"]
        assert cid

        # GET single
        r = session.get(f"{API}/customers/{cid}")
        assert r.status_code == 200
        assert r.json()["id"] == cid

        # UPDATE
        r = session.patch(f"{API}/customers/{cid}", json={"phone": "0711"})
        assert r.status_code == 200
        assert r.json()["phone"] == "0711"

        # GET persists
        r = session.get(f"{API}/customers/{cid}")
        assert r.json()["phone"] == "0711"
        assert r.json()["first_name"] == unique  # unchanged

        # DELETE
        r = session.delete(f"{API}/customers/{cid}")
        assert r.status_code == 200

        # GET 404
        r = session.get(f"{API}/customers/{cid}")
        assert r.status_code == 404

    def test_create_requires_first_name(self, session):
        r = session.post(f"{API}/customers", json={"last_name": "NoFirst"})
        assert r.status_code == 422

    def test_delete_nonexistent_404(self, session):
        r = session.delete(f"{API}/customers/does-not-exist-{uuid.uuid4().hex}")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Products CRUD
# ---------------------------------------------------------------------------
class TestProducts:
    def test_list(self, session):
        r = session.get(f"{API}/products")
        assert r.status_code == 200

    def test_create_update_delete(self, session):
        name = f"TEST_prod_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/products", json={"name": name, "default_price": 25, "sort_order": 99})
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["name"] == name

        r = session.patch(f"{API}/products/{pid}", json={"default_price": 30})
        assert r.status_code == 200
        assert r.json()["default_price"] == 30

        r = session.delete(f"{API}/products/{pid}")
        assert r.status_code == 200

        r = session.get(f"{API}/products/{pid}")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Sales CRUD
# ---------------------------------------------------------------------------
class TestSales:
    def test_list(self, session):
        r = session.get(f"{API}/sales")
        assert r.status_code == 200

    def test_create_delete(self, session):
        # Pull a customer first
        r = session.get(f"{API}/customers")
        customers = r.json()
        assert customers, "Need at least one customer"
        cust = customers[0]
        payload = {
            "customer_id": cust["id"],
            "customer_name": f"{cust['first_name']} {cust.get('last_name','')}",
            "product_id": "kohen",
            "product_name": "כהן",
            "week": "2026-01-10",
            "price": 36.0,
        }
        r = session.post(f"{API}/sales", json=payload)
        assert r.status_code == 200, r.text
        sale = r.json()
        assert sale["product_id"] == "kohen"
        assert sale["price"] == 36.0
        sid = sale["id"]

        # GET it back
        r = session.get(f"{API}/sales/{sid}")
        assert r.status_code == 200
        assert r.json()["customer_id"] == cust["id"]

        # DELETE
        r = session.delete(f"{API}/sales/{sid}")
        assert r.status_code == 200

        r = session.get(f"{API}/sales/{sid}")
        assert r.status_code == 404

    def test_create_missing_fields(self, session):
        r = session.post(f"{API}/sales", json={"customer_id": "x"})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Payments CRUD
# ---------------------------------------------------------------------------
class TestPayments:
    def test_create_delete(self, session):
        r = session.get(f"{API}/customers")
        cust = r.json()[0]
        r = session.post(
            f"{API}/payments",
            json={"customer_id": cust["id"], "amount": 75.5, "notes": "TEST"},
        )
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["amount"] == 75.5

        r = session.get(f"{API}/payments/{pid}")
        assert r.status_code == 200

        r = session.delete(f"{API}/payments/{pid}")
        assert r.status_code == 200

        r = session.get(f"{API}/payments/{pid}")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Extra charges CRUD
# ---------------------------------------------------------------------------
class TestExtraCharges:
    def test_create_delete(self, session):
        r = session.get(f"{API}/customers")
        cust = r.json()[0]
        r = session.post(
            f"{API}/extra_charges",
            json={"customer_id": cust["id"], "description": "TEST_extra", "amount": 12.0},
        )
        assert r.status_code == 200, r.text
        eid = r.json()["id"]
        assert r.json()["description"] == "TEST_extra"
        assert r.json()["amount"] == 12.0

        r = session.delete(f"{API}/extra_charges/{eid}")
        assert r.status_code == 200

        r = session.get(f"{API}/extra_charges/{eid}")
        assert r.status_code == 404

    def test_create_missing_amount(self, session):
        r = session.post(
            f"{API}/extra_charges",
            json={"customer_id": "x", "description": "no amount"},
        )
        assert r.status_code == 422
