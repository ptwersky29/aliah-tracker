import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

load_dotenv()

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
GOOGLE_CLIENT_SECRET = os.environ["GOOGLE_CLIENT_SECRET"]
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)
JWT_SECRET = os.environ["JWT_SECRET"]
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
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
    google_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_date TEXT NOT NULL,
    last_login TEXT NOT NULL
);
"""


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: str
    created_date: str
    last_login: str


def create_jwt(user_id: str, email: str) -> str:
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


@router.get("/google")
async def google_login():
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{qs}")


@router.get("/google/callback")
async def google_callback(code: Optional[str] = None, error: Optional[str] = None):
    from server import _execute, _fetchrow, _new_id, _now_iso

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
    redirect_url = f"{FRONTEND_URL}/login?token={token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
