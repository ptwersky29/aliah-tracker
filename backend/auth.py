import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

load_dotenv()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "").rstrip("/")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").rstrip("/")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

router = APIRouter(prefix="/api/auth")
logger = logging.getLogger(__name__)

USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_id TEXT DEFAULT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    password_hash TEXT DEFAULT '',
    created_date TEXT NOT NULL,
    last_login TEXT NOT NULL
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT '';
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
"""


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str
    created_date: str
    last_login: str


class RegisterInput(BaseModel):
    name: str
    email: str
    password: str


class LoginInput(BaseModel):
    email: str
    password: str


def create_jwt(user_id: str, email: str) -> str:
    _check_jwt_secret()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def get_current_user(request: Request) -> dict:
    from server import _fetchrow

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid Authorization header")
    token = auth[7:]
    payload = decode_jwt(token)
    user = await _fetchrow('SELECT * FROM "users" WHERE id = %s', payload["sub"])
    if not user:
        raise HTTPException(401, "User not found")
    return user


def _check_google_config():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(503, "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    if not GOOGLE_REDIRECT_URI:
        raise HTTPException(503, "GOOGLE_REDIRECT_URI is not configured.")


def _check_jwt_secret():
    if not JWT_SECRET:
        raise HTTPException(503, "JWT_SECRET is not configured.")


def _check_frontend_url():
    if not FRONTEND_URL:
        raise HTTPException(503, "FRONTEND_URL is not configured.")


@router.get("/health")
async def auth_health():
    return {
        "ok": True,
        "google_configured": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "jwt_configured": bool(JWT_SECRET),
        "frontend_configured": bool(FRONTEND_URL),
    }


@router.get("/google")
async def google_login():
    _check_google_config()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: Optional[str] = None, error: Optional[str] = None):
    from server import _execute, _fetchrow, _new_id, _now_iso

    _check_google_config()
    _check_jwt_secret()
    _check_frontend_url()
    if error or not code:
        raise HTTPException(400, f"Google OAuth error: {error or 'no code'}")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(400, "Failed to exchange code for token")

        token_data = token_resp.json()
        access_token = token_data["access_token"]

        user_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(400, "Failed to fetch user info")

        google_user = user_resp.json()

    google_id = str(google_user["id"])
    email = google_user["email"]
    name = google_user.get("name", "")
    avatar = google_user.get("picture", "")

    existing = await _fetchrow('SELECT * FROM "users" WHERE google_id = %s', google_id)

    if existing:
        user_id = existing["id"]
        await _execute(
            'UPDATE "users" SET last_login = %s, name = %s, avatar_url = %s, email = %s WHERE id = %s',
            _now_iso(), name, avatar, email, user_id,
        )
    else:
        user_id = _new_id()
        await _execute(
            'INSERT INTO "users" (id, google_id, email, name, avatar_url, created_date, last_login) VALUES (%s,%s,%s,%s,%s,%s,%s)',
            user_id, google_id, email, name, avatar, _now_iso(), _now_iso(),
        )

    token = create_jwt(user_id, email)
    redirect_url = f"{FRONTEND_URL}/login?{urlencode({'token': token})}"
    return RedirectResponse(url=redirect_url)


@router.post("/register")
async def register(payload: RegisterInput):
    from server import _execute, _fetchrow, _new_id, _now_iso

    _check_jwt_secret()
    name = payload.name.strip()
    email = payload.email.strip().lower()
    if not name or not email or not payload.password:
        raise HTTPException(400, "Name, email, and password are required")
    if len(payload.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    existing = await _fetchrow('SELECT * FROM "users" WHERE email = %s', email)
    if existing:
        raise HTTPException(409, "An account with this email already exists")

    pw_hash = bcrypt.hashpw(payload.password.encode(), bcrypt.gensalt()).decode()
    user_id = _new_id()
    await _execute(
        'INSERT INTO "users" (id, email, name, password_hash, created_date, last_login) VALUES (%s,%s,%s,%s,%s,%s)',
        user_id, email, name, pw_hash, _now_iso(), _now_iso(),
    )
    token = create_jwt(user_id, email)
    return {"token": token, "user": {"id": user_id, "email": email, "name": name}}


@router.post("/login")
async def login(payload: LoginInput):
    from server import _execute, _fetchrow, _now_iso

    _check_jwt_secret()
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(400, "Email and password are required")

    user = await _fetchrow('SELECT * FROM "users" WHERE email = %s', email)
    if not user:
        raise HTTPException(401, "Invalid email or password")

    stored_hash = user.get("password_hash") or ""
    if not stored_hash or not bcrypt.checkpw(payload.password.encode(), stored_hash.encode()):
        raise HTTPException(401, "Invalid email or password")

    await _execute('UPDATE "users" SET last_login = %s WHERE id = %s', _now_iso(), user["id"])
    token = create_jwt(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "")},
    }


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
