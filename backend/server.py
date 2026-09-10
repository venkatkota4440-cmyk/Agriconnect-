"""AgriLink 360 — FastAPI backend.

Full agricultural marketplace: auth, profiles, listings/inventory, offers &
negotiation, contracts, delivery, transactions, ratings, follows, saved items,
chat, notifications, market prices, AI demand/planting insights, translation,
image upload (object storage) and an admin panel. MongoDB is the source of truth.
"""
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import uuid
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Query, Header, Response
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("agrilink")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "agrilink360"

CATEGORIES = ["Vegetables", "Fruits", "Grains", "Pulses", "Spices", "Oilseeds", "Dairy", "Organic Produce", "Flowers", "Other"]
BUYER_TYPES = ["Retailer", "Wholesaler", "Trader", "Restaurant", "Food Processor", "Exporter", "Institutional Buyer"]
LANGUAGES = {"en": "English", "hi": "Hindi (हिंदी)", "te": "Telugu (తెలుగు)", "ta": "Tamil (தமிழ்)", "mr": "Marathi (मराठी)", "es": "Spanish", "fr": "French"}

app = FastAPI(title="AgriLink 360 API")
api = APIRouter(prefix="/api")

# ---------------------------------------------------------------------------
# Password / JWT helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# Weight/volume normalisation to a base unit so market prices (often per quintal)
# can be fairly compared to listing prices (often per kg).
_UNIT_TO_BASE = {"kg": 1.0, "quintal": 100.0, "tonne": 1000.0, "litre": 1.0, "dozen": 1.0, "piece": 1.0, "bag": 1.0}

def _convert_price(price: float, from_unit: str, to_unit: str) -> float:
    fu = _UNIT_TO_BASE.get((from_unit or "kg").lower(), 1.0)
    tu = _UNIT_TO_BASE.get((to_unit or "kg").lower(), 1.0)
    per_base = price / fu
    return round(per_base * tu, 2)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------------------------------------------------------------------------
# LLM helper
# ---------------------------------------------------------------------------
async def llm_complete(system: str, prompt: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()), system_message=system).with_model("anthropic", "claude-sonnet-4-6")
    out = ""
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            out += ev.content
        elif isinstance(ev, StreamDone):
            break
    return out

# ---------------------------------------------------------------------------
# Notifications & audit
# ---------------------------------------------------------------------------
async def notify(user_id: str, ntype: str, title: str, body: str, link: Optional[str] = None):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": ntype, "title": title,
        "body": body, "link": link, "read": False, "created_at": now_iso(),
    })

async def audit(user_id: Optional[str], action: str, entity: str, entity_id: str, meta: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "action": action, "entity": entity,
        "entity_id": entity_id, "meta": meta or {}, "created_at": now_iso(),
    })

# ---------------------------------------------------------------------------
# Serialization helpers (privacy-aware)
# ---------------------------------------------------------------------------
def profile_completeness(u: dict) -> int:
    checks = [bool(u.get("name")), bool(u.get("mobile")), bool(u.get("about")),
              bool((u.get("contact") or {}).get("district")), bool((u.get("contact") or {}).get("state")),
              bool(u.get("photo"))]
    if u.get("role") == "farmer":
        checks += [bool(u.get("specialization")), bool(u.get("crops"))]
    elif u.get("role") == "buyer":
        checks += [bool(u.get("business_name")), bool(u.get("buyer_type"))]
    v = u.get("verifications", {})
    checks += [bool(v.get("farmer") or v.get("buyer") or v.get("business"))]
    return round(100 * sum(1 for c in checks if c) / len(checks))

def public_user(u: dict, viewer: Optional[dict] = None) -> dict:
    priv = u.get("privacy", {})
    is_self = viewer and viewer.get("id") == u.get("id")
    is_verified_viewer = bool(viewer and any((viewer.get("verifications") or {}).values()))

    def gated(value, level):
        if is_self:
            return value
        if level == "public":
            return value
        if level == "verified" and is_verified_viewer:
            return value
        return None

    contact = u.get("contact") or {}
    out = {
        "id": u["id"], "name": u.get("name"), "role": u.get("role"),
        "photo": u.get("photo"), "about": u.get("about"),
        "verifications": u.get("verifications", {}),
        "verified": bool(any((u.get("verifications") or {}).values())),
        "rating": round(u.get("rating", 0), 1), "rating_count": u.get("rating_count", 0),
        "completed_transactions": u.get("completed_transactions", 0),
        "followers_count": u.get("followers_count", 0),
        "following_count": u.get("following_count", 0),
        "location_approx": ", ".join(filter(None, [contact.get("district"), contact.get("state")])) or "Location hidden",
        "created_at": u.get("created_at"),
        # farmer fields
        "farm_size": u.get("farm_size"), "experience_years": u.get("experience_years"),
        "specialization": u.get("specialization"), "crops": u.get("crops", []),
        # buyer fields
        "business_name": u.get("business_name"), "buyer_type": u.get("buyer_type"),
        "crops_required": u.get("crops_required", []), "procurement_quantity": u.get("procurement_quantity"),
        # privacy-gated contact
        "phone": gated(u.get("mobile"), priv.get("phone", "private")),
        "email": gated(u.get("email"), priv.get("email", "private")),
    }
    return out

def private_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password_hash", None)
    aad = u.get("identity_number")
    if aad:
        u["identity_masked"] = "XXXX-XXXX-" + aad[-4:]
    u.pop("identity_number", None)
    u["profile_completeness"] = profile_completeness(u)
    return u

# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    role: Literal["farmer", "buyer"]
    mobile: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    address: Optional[str] = None
    village: Optional[str] = None
    mandal: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pin: Optional[str] = None
    country: Optional[str] = "India"
    alt_mobile: Optional[str] = None

class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    mobile: Optional[str] = None
    photo: Optional[str] = None
    about: Optional[str] = None
    contact: Optional[Contact] = None
    # farmer
    farm_size: Optional[str] = None
    experience_years: Optional[int] = None
    specialization: Optional[str] = None
    crops: Optional[List[str]] = None
    # buyer
    business_name: Optional[str] = None
    buyer_type: Optional[str] = None
    crops_required: Optional[List[str]] = None
    procurement_quantity: Optional[str] = None

class PrivacyUpdate(BaseModel):
    phone: Optional[Literal["private", "verified", "public"]] = None
    email: Optional[Literal["private", "verified", "public"]] = None
    address: Optional[Literal["private", "approximate"]] = None
    location: Optional[Literal["hidden", "approximate", "matching"]] = None

class ListingReq(BaseModel):
    model_config = ConfigDict(extra="ignore")
    crop_name: str
    category: str
    variety: Optional[str] = None
    description: Optional[str] = None
    quantity: float = Field(gt=0)
    unit: str = "kg"
    grade: Optional[str] = "A"
    price: float = Field(gt=0)
    price_unit: Optional[str] = "kg"
    harvest_date: Optional[str] = None
    available_date: Optional[str] = None
    organic: bool = False
    delivery_available: bool = False
    images: Optional[List[str]] = None
    location: Optional[dict] = None

class OfferReq(BaseModel):
    listing_id: str
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)
    delivery_method: Literal["pickup", "delivery"] = "pickup"
    message: Optional[str] = None
    expires_in_days: int = 7

class OfferRespondReq(BaseModel):
    action: Literal["accept", "reject", "counter"]
    price: Optional[float] = None
    quantity: Optional[float] = None
    message: Optional[str] = None

class RatingReq(BaseModel):
    transaction_id: str
    rating: int = Field(ge=1, le=5)
    review: Optional[str] = None

class SavedReq(BaseModel):
    item_type: Literal["listing", "farmer", "buyer", "market", "transport"]
    item_id: str

class MessageReq(BaseModel):
    text: str = Field(min_length=1)

class ConversationReq(BaseModel):
    participant_id: str
    context: Optional[str] = None

class TranslateReq(BaseModel):
    keys: dict
    target_lang: str

class DisputeReq(BaseModel):
    reason: str

# ===========================================================================
# AUTH ROUTES
# ===========================================================================
def _auth_response(user: dict) -> dict:
    token = create_access_token(user["id"], user["email"], user["role"])
    return {"access_token": token, "user": private_user(user)}

@api.post("/auth/register")
async def register(req: RegisterReq):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(req.password),
        "name": req.name.strip(), "role": req.role, "mobile": req.mobile,
        "mobile_verified": False, "email_verified": False,
        "photo": None, "about": None, "contact": {"country": "India"},
        "privacy": {"phone": "private", "email": "private", "address": "private", "location": "approximate"},
        "verifications": {"mobile": False, "email": False, "identity": False, "business": False, "farmer": False, "buyer": False},
        "crops": [], "crops_required": [],
        "rating": 0.0, "rating_count": 0, "completed_transactions": 0,
        "followers_count": 0, "following_count": 0, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await audit(user["id"], "register", "user", user["id"], {"role": req.role})
    await notify(user["id"], "welcome", "Welcome to AgriLink 360", "Complete your profile to start trading.", "/verification")
    return _auth_response(user)

@api.post("/auth/login")
async def login(req: LoginReq):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _auth_response(user)

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return private_user(user)

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

# ===========================================================================
# PROFILE / USERS
# ===========================================================================
@api.put("/users/me")
async def update_me(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if "contact" in update and update["contact"] is not None:
        merged = {**(user.get("contact") or {}), **update["contact"]}
        update["contact"] = merged
    if update:
        update["updated_at"] = now_iso()
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return private_user(fresh)

@api.put("/users/me/privacy")
async def update_privacy(req: PrivacyUpdate, user: dict = Depends(get_current_user)):
    priv = {**(user.get("privacy") or {}), **req.model_dump(exclude_none=True)}
    await db.users.update_one({"id": user["id"]}, {"$set": {"privacy": priv}})
    return {"privacy": priv}

@api.get("/users/me/verification")
async def my_verification(user: dict = Depends(get_current_user)):
    v = user.get("verifications", {})
    providers = {
        "mobile": {"status": "verified" if v.get("mobile") else "unavailable", "note": None if v.get("mobile") else "Mobile OTP unavailable — provider not configured"},
        "email": {"status": "verified" if v.get("email") else "unavailable", "note": None if v.get("email") else "Email verification unavailable — provider not configured"},
        "identity": {"status": "verified" if v.get("identity") else "unavailable", "note": None if v.get("identity") else "Identity verification unavailable — provider not configured"},
        "business": {"status": "verified" if v.get("business") else "pending", "note": "Reviewed by AgriLink admin"},
        "farmer": {"status": "verified" if v.get("farmer") else "pending", "note": "Reviewed by AgriLink admin"},
        "buyer": {"status": "verified" if v.get("buyer") else "pending", "note": "Reviewed by AgriLink admin"},
    }
    return {"completeness": profile_completeness(user), "categories": providers}

@api.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    viewer = None
    try:
        viewer = await get_current_user(request)
    except HTTPException:
        pass
    data = public_user(target, viewer)
    data["active_listings"] = await db.listings.count_documents({"farmer_id": user_id, "status": {"$ne": "deleted"}}) if target["role"] == "farmer" else 0
    return data

@api.get("/farmers")
async def list_farmers(request: Request, q: Optional[str] = None, limit: int = 24):
    query = {"role": "farmer"}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"specialization": {"$regex": q, "$options": "i"}}]
    docs = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return [public_user(d) for d in docs]

@api.get("/buyers")
async def list_buyers(request: Request, q: Optional[str] = None, buyer_type: Optional[str] = None, limit: int = 24):
    query = {"role": "buyer"}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"business_name": {"$regex": q, "$options": "i"}}]
    if buyer_type:
        query["buyer_type"] = buyer_type
    docs = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return [public_user(d) for d in docs]

# ===========================================================================
# LISTINGS / STOCK
# ===========================================================================
def listing_public(l: dict, farmer: Optional[dict] = None) -> dict:
    out = dict(l)
    out.pop("_id", None)
    if farmer:
        out["farmer"] = {"id": farmer["id"], "name": farmer["name"], "photo": farmer.get("photo"),
                         "verified": bool(any((farmer.get("verifications") or {}).values())),
                         "rating": round(farmer.get("rating", 0), 1),
                         "completed_transactions": farmer.get("completed_transactions", 0)}
    return out

@api.get("/categories")
async def categories():
    counts = {}
    pipeline = [{"$match": {"status": "available"}}, {"$group": {"_id": "$category", "n": {"$sum": 1}}}]
    async for row in db.listings.aggregate(pipeline):
        counts[row["_id"]] = row["n"]
    return [{"name": c, "count": counts.get(c, 0)} for c in CATEGORIES]

@api.post("/listings")
async def create_listing(req: ListingReq, user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers can create listings")
    if req.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    contact = user.get("contact") or {}
    listing = {
        "id": str(uuid.uuid4()), "farmer_id": user["id"],
        "crop_name": req.crop_name, "category": req.category, "variety": req.variety,
        "description": req.description,
        "quantity_total": req.quantity, "quantity_available": req.quantity,
        "quantity_reserved": 0.0, "quantity_sold": 0.0, "unit": req.unit,
        "grade": req.grade, "price": req.price, "price_unit": req.price_unit,
        "harvest_date": req.harvest_date, "available_date": req.available_date,
        "organic": req.organic, "delivery_available": req.delivery_available,
        "images": req.images or [],
        "location": req.location or {"district": contact.get("district"), "state": contact.get("state")},
        "verified_seller": bool(any((user.get("verifications") or {}).values())),
        "status": "available", "rating": round(user.get("rating", 0), 1), "rating_count": 0,
        "views": 0, "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.listings.insert_one(listing)
    await audit(user["id"], "create", "listing", listing["id"], {"crop": req.crop_name})
    return listing_public(listing, user)

@api.get("/listings")
async def list_listings(
    q: Optional[str] = None, category: Optional[str] = None, location: Optional[str] = None,
    grade: Optional[str] = None, min_price: Optional[float] = None, max_price: Optional[float] = None,
    min_quantity: Optional[float] = None, organic: Optional[bool] = None,
    verified: Optional[bool] = None, delivery: Optional[bool] = None,
    sort: str = "recommended", page: int = 1, page_size: int = 24,
):
    query: dict = {"status": "available"}
    if q:
        query["$or"] = [{"crop_name": {"$regex": q, "$options": "i"}}, {"variety": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]
    if category and category != "All":
        query["category"] = category
    if grade:
        query["grade"] = grade
    if organic:
        query["organic"] = True
    if verified:
        query["verified_seller"] = True
    if delivery:
        query["delivery_available"] = True
    if location:
        query["$or"] = query.get("$or", []) + [{"location.district": {"$regex": location, "$options": "i"}}, {"location.state": {"$regex": location, "$options": "i"}}]
    price_q = {}
    if min_price is not None:
        price_q["$gte"] = min_price
    if max_price is not None:
        price_q["$lte"] = max_price
    if price_q:
        query["price"] = price_q
    if min_quantity is not None:
        query["quantity_available"] = {"$gte": min_quantity}

    sort_map = {
        "price_low": [("price", 1)], "price_high": [("price", -1)],
        "newest": [("created_at", -1)], "popular": [("views", -1)],
        "rating": [("rating", -1)], "recommended": [("verified_seller", -1), ("rating", -1), ("created_at", -1)],
        "nearest": [("created_at", -1)],
    }
    sort_spec = sort_map.get(sort, sort_map["recommended"])
    skip = (page - 1) * page_size
    total = await db.listings.count_documents(query)
    docs = await db.listings.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(page_size).to_list(page_size)
    farmer_ids = list({d["farmer_id"] for d in docs})
    farmers = {f["id"]: f for f in await db.users.find({"id": {"$in": farmer_ids}}, {"_id": 0}).to_list(len(farmer_ids))}
    return {"total": total, "page": page, "page_size": page_size,
            "items": [listing_public(d, farmers.get(d["farmer_id"])) for d in docs]}

@api.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    l = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not l or l["status"] == "deleted":
        raise HTTPException(status_code=404, detail="Listing not found")
    await db.listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    farmer = await db.users.find_one({"id": l["farmer_id"]}, {"_id": 0})
    return listing_public(l, farmer)

@api.put("/listings/{listing_id}")
async def update_listing(listing_id: str, req: ListingReq, user: dict = Depends(get_current_user)):
    l = await db.listings.find_one({"id": listing_id})
    if not l:
        raise HTTPException(status_code=404, detail="Listing not found")
    if l["farmer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own listings")
    sold = l.get("quantity_sold", 0) + l.get("quantity_reserved", 0)
    new_avail = max(0.0, req.quantity - sold)
    update = {
        "crop_name": req.crop_name, "category": req.category, "variety": req.variety,
        "description": req.description, "quantity_total": req.quantity, "quantity_available": new_avail,
        "unit": req.unit, "grade": req.grade, "price": req.price, "price_unit": req.price_unit,
        "harvest_date": req.harvest_date, "available_date": req.available_date,
        "organic": req.organic, "delivery_available": req.delivery_available,
        "images": req.images if req.images is not None else l.get("images", []),
        "updated_at": now_iso(),
    }
    await db.listings.update_one({"id": listing_id}, {"$set": update})
    fresh = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    return listing_public(fresh, user)

@api.patch("/listings/{listing_id}/status")
async def set_listing_status(listing_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    if status not in ["available", "reserved", "sold", "expired", "deleted"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    l = await db.listings.find_one({"id": listing_id})
    if not l or l["farmer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.listings.update_one({"id": listing_id}, {"$set": {"status": status, "updated_at": now_iso()}})
    return {"ok": True, "status": status}

@api.get("/my/stock")
async def my_stock(user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Only farmers have stock")
    docs = await db.listings.find({"farmer_id": user["id"], "status": {"$ne": "deleted"}}, {"_id": 0}).sort([("created_at", -1)]).to_list(200)
    return [listing_public(d, user) for d in docs]

# ===========================================================================
# OFFERS & NEGOTIATION
# ===========================================================================
@api.post("/offers")
async def create_offer(req: OfferReq, user: dict = Depends(get_current_user)):
    if user["role"] != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can make offers")
    listing = await db.listings.find_one({"id": req.listing_id}, {"_id": 0})
    if not listing or listing["status"] != "available":
        raise HTTPException(status_code=404, detail="Listing not available")
    if req.quantity > listing["quantity_available"]:
        raise HTTPException(status_code=400, detail=f"Only {listing['quantity_available']} {listing['unit']} available")
    total = round(req.price * req.quantity, 2)
    offer = {
        "id": str(uuid.uuid4()), "listing_id": req.listing_id, "crop_name": listing["crop_name"],
        "unit": listing["unit"], "farmer_id": listing["farmer_id"], "buyer_id": user["id"],
        "quantity": req.quantity, "price": req.price, "total": total,
        "delivery_method": req.delivery_method, "message": req.message,
        "status": "pending", "current_actor": "farmer",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)).isoformat(),
        "history": [{"actor": "buyer", "actor_id": user["id"], "price": req.price, "quantity": req.quantity,
                     "message": req.message, "action": "offer", "at": now_iso()}],
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.offers.insert_one(offer)
    await notify(listing["farmer_id"], "offer", "New offer received",
                 f"{user['name']} offered ₹{req.price}/{listing['unit']} for {req.quantity}{listing['unit']} of {listing['crop_name']}", f"/offers/{offer['id']}")
    await audit(user["id"], "create", "offer", offer["id"], {"listing": req.listing_id})
    offer.pop("_id", None)
    return offer

async def _enrich_offer(o: dict) -> dict:
    o.pop("_id", None)
    farmer = await db.users.find_one({"id": o["farmer_id"]}, {"_id": 0, "name": 1, "id": 1, "photo": 1})
    buyer = await db.users.find_one({"id": o["buyer_id"]}, {"_id": 0, "name": 1, "id": 1, "photo": 1, "business_name": 1})
    o["farmer"] = farmer
    o["buyer"] = buyer
    return o

@api.get("/offers")
async def list_offers(role: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"farmer_id": user["id"]}, {"buyer_id": user["id"]}]}
    if status:
        query["status"] = status
    docs = await db.offers.find(query, {"_id": 0}).sort([("updated_at", -1)]).to_list(200)
    return [await _enrich_offer(d) for d in docs]

@api.get("/offers/{offer_id}")
async def get_offer(offer_id: str, user: dict = Depends(get_current_user)):
    o = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    if not o or user["id"] not in (o["farmer_id"], o["buyer_id"]):
        raise HTTPException(status_code=404, detail="Offer not found")
    return await _enrich_offer(o)

@api.post("/offers/{offer_id}/respond")
async def respond_offer(offer_id: str, req: OfferRespondReq, user: dict = Depends(get_current_user)):
    o = await db.offers.find_one({"id": offer_id})
    if not o or user["id"] not in (o["farmer_id"], o["buyer_id"]):
        raise HTTPException(status_code=404, detail="Offer not found")
    if o["status"] not in ("pending", "countered"):
        raise HTTPException(status_code=400, detail="This offer is already closed")
    if datetime.fromisoformat(o["expires_at"]) < datetime.now(timezone.utc):
        await db.offers.update_one({"id": offer_id}, {"$set": {"status": "expired"}})
        raise HTTPException(status_code=400, detail="This offer has expired")
    actor = "farmer" if user["id"] == o["farmer_id"] else "buyer"
    if o["current_actor"] != actor:
        raise HTTPException(status_code=403, detail="It is not your turn to respond")

    entry = {"actor": actor, "actor_id": user["id"], "message": req.message, "at": now_iso()}
    if req.action == "reject":
        entry.update({"action": "reject"})
        await db.offers.update_one({"id": offer_id}, {"$set": {"status": "rejected", "updated_at": now_iso()}, "$push": {"history": entry}})
        other = o["buyer_id"] if actor == "farmer" else o["farmer_id"]
        await notify(other, "offer", "Offer rejected", f"Your offer on {o['crop_name']} was rejected.", f"/offers/{offer_id}")
        return {"ok": True, "status": "rejected"}

    if req.action == "counter":
        if req.price is None:
            raise HTTPException(status_code=400, detail="Counter price is required")
        qty = req.quantity or o["quantity"]
        entry.update({"action": "counter", "price": req.price, "quantity": qty})
        next_actor = "buyer" if actor == "farmer" else "farmer"
        await db.offers.update_one({"id": offer_id}, {
            "$set": {"status": "countered", "price": req.price, "quantity": qty,
                     "total": round(req.price * qty, 2), "current_actor": next_actor, "updated_at": now_iso()},
            "$push": {"history": entry}})
        other = o["buyer_id"] if actor == "farmer" else o["farmer_id"]
        await notify(other, "counteroffer", "Counter-offer received", f"₹{req.price}/{o['unit']} proposed for {o['crop_name']}.", f"/offers/{offer_id}")
        return {"ok": True, "status": "countered"}

    # accept -> reserve inventory atomically & create contract
    entry.update({"action": "accept", "price": o["price"], "quantity": o["quantity"]})
    reserved = await db.listings.find_one_and_update(
        {"id": o["listing_id"], "quantity_available": {"$gte": o["quantity"]}},
        {"$inc": {"quantity_available": -o["quantity"], "quantity_reserved": o["quantity"]}, "$set": {"updated_at": now_iso()}},
    )
    if not reserved:
        raise HTTPException(status_code=409, detail="Insufficient stock remaining to accept this offer")
    await db.offers.update_one({"id": offer_id}, {"$set": {"status": "accepted", "updated_at": now_iso()}, "$push": {"history": entry}})

    contract = {
        "id": str(uuid.uuid4()), "offer_id": offer_id, "listing_id": o["listing_id"],
        "farmer_id": o["farmer_id"], "buyer_id": o["buyer_id"], "crop_name": o["crop_name"],
        "quantity": o["quantity"], "unit": o["unit"], "price": o["price"], "total": o["total"],
        "delivery_method": o["delivery_method"],
        "location": reserved.get("location", {}),
        "expected_date": o.get("expires_at"),
        "terms": "Standard AgriLink 360 trade terms. This is a digital record of agreement and is not a substitute for a legally executed contract.",
        "status": "pending_confirmation",
        "confirmations": {"farmer": False, "buyer": False},
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.contracts.insert_one(contract)
    delivery = {
        "id": str(uuid.uuid4()), "contract_id": contract["id"], "status": "preparing",
        "pickup_area": ", ".join(filter(None, [reserved.get("location", {}).get("district"), reserved.get("location", {}).get("state")])) or "Farm location",
        "destination_area": "Buyer location (approx.)", "transport_provider": None,
        "delivery_date": None, "events": [{"status": "preparing", "at": now_iso(), "note": "Contract created"}],
    }
    await db.deliveries.insert_one(delivery)
    await notify(o["buyer_id"], "contract", "Offer accepted — contract created", f"Your offer on {o['crop_name']} was accepted. Confirm the contract to proceed.", f"/contracts/{contract['id']}")
    await notify(o["farmer_id"], "contract", "Contract created", f"Confirm the contract for {o['crop_name']} to activate the deal.", f"/contracts/{contract['id']}")
    await audit(user["id"], "accept", "offer", offer_id, {"contract": contract["id"]})
    return {"ok": True, "status": "accepted", "contract_id": contract["id"]}

# ===========================================================================
# CONTRACTS + DELIVERY
# ===========================================================================
async def _enrich_contract(c: dict) -> dict:
    c.pop("_id", None)
    c["farmer"] = await db.users.find_one({"id": c["farmer_id"]}, {"_id": 0, "id": 1, "name": 1, "photo": 1})
    c["buyer"] = await db.users.find_one({"id": c["buyer_id"]}, {"_id": 0, "id": 1, "name": 1, "photo": 1, "business_name": 1})
    c["delivery"] = await db.deliveries.find_one({"contract_id": c["id"]}, {"_id": 0})
    return c

@api.get("/contracts")
async def list_contracts(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"farmer_id": user["id"]}, {"buyer_id": user["id"]}]}
    if status:
        query["status"] = status
    docs = await db.contracts.find(query, {"_id": 0}).sort([("updated_at", -1)]).to_list(200)
    return [await _enrich_contract(d) for d in docs]

@api.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, user: dict = Depends(get_current_user)):
    c = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not c or user["id"] not in (c["farmer_id"], c["buyer_id"]):
        raise HTTPException(status_code=404, detail="Contract not found")
    return await _enrich_contract(c)

@api.post("/contracts/{contract_id}/confirm")
async def confirm_contract(contract_id: str, user: dict = Depends(get_current_user)):
    c = await db.contracts.find_one({"id": contract_id})
    if not c or user["id"] not in (c["farmer_id"], c["buyer_id"]):
        raise HTTPException(status_code=404, detail="Contract not found")
    if c["status"] not in ("pending_confirmation", "draft"):
        raise HTTPException(status_code=400, detail="Contract cannot be confirmed in its current state")
    role = "farmer" if user["id"] == c["farmer_id"] else "buyer"
    confirmations = {**c["confirmations"], role: True}
    update = {"confirmations": confirmations, "updated_at": now_iso()}
    activated = confirmations["farmer"] and confirmations["buyer"]
    if activated:
        update["status"] = "active"
    await db.contracts.update_one({"id": contract_id}, {"$set": update})
    await audit(user["id"], "confirm", "contract", contract_id, {"role": role})
    if activated:
        await db.deliveries.update_one({"contract_id": contract_id}, {"$set": {"status": "pickup_scheduled"}, "$push": {"events": {"status": "pickup_scheduled", "at": now_iso(), "note": "Contract activated by both parties"}}})
        for uid in (c["farmer_id"], c["buyer_id"]):
            await notify(uid, "contract", "Contract activated", f"Contract for {c['crop_name']} is now active.", f"/contracts/{contract_id}")
    else:
        other = c["buyer_id"] if role == "farmer" else c["farmer_id"]
        await notify(other, "contract", "Contract confirmation", f"The other party confirmed the contract for {c['crop_name']}. Please confirm to activate.", f"/contracts/{contract_id}")
    return {"ok": True, "status": update.get("status", c["status"]), "confirmations": confirmations}

DELIVERY_FLOW = ["preparing", "pickup_scheduled", "picked_up", "in_transit", "delivered", "completed"]

@api.post("/contracts/{contract_id}/delivery/advance")
async def advance_delivery(contract_id: str, status: str = Query(...), transport_provider: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    c = await db.contracts.find_one({"id": contract_id})
    if not c or c["farmer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the farmer can update delivery status")
    if c["status"] != "active":
        raise HTTPException(status_code=400, detail="Contract must be active")
    if status not in DELIVERY_FLOW:
        raise HTTPException(status_code=400, detail="Invalid delivery status")
    d = await db.deliveries.find_one({"contract_id": contract_id})
    if DELIVERY_FLOW.index(status) <= DELIVERY_FLOW.index(d["status"]):
        raise HTTPException(status_code=400, detail="Delivery status must move forward")
    if status == "completed":
        raise HTTPException(status_code=400, detail="Only the buyer can confirm final delivery")
    upd = {"status": status}
    if transport_provider:
        upd["transport_provider"] = transport_provider
    if status == "in_transit":
        upd["delivery_date"] = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    await db.deliveries.update_one({"contract_id": contract_id}, {"$set": upd, "$push": {"events": {"status": status, "at": now_iso()}}})
    await notify(c["buyer_id"], "delivery", "Delivery update", f"{c['crop_name']} delivery is now: {status.replace('_', ' ')}", f"/contracts/{contract_id}")
    return {"ok": True, "status": status}

@api.post("/contracts/{contract_id}/delivery/confirm")
async def confirm_delivery(contract_id: str, user: dict = Depends(get_current_user)):
    c = await db.contracts.find_one({"id": contract_id})
    if not c or c["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm delivery")
    if c["status"] != "active":
        raise HTTPException(status_code=400, detail="Contract must be active")
    d = await db.deliveries.find_one({"contract_id": contract_id})
    if d["status"] not in ("delivered", "in_transit"):
        raise HTTPException(status_code=400, detail="Delivery must be marked delivered/in-transit by farmer first")

    # finalize inventory: reserved -> sold
    listing = await db.listings.find_one_and_update(
        {"id": c["listing_id"]},
        {"$inc": {"quantity_reserved": -c["quantity"], "quantity_sold": c["quantity"]}, "$set": {"updated_at": now_iso()}},
    )
    if listing and listing.get("quantity_available", 0) <= 0 and (listing.get("quantity_reserved", 0) - c["quantity"]) <= 0:
        await db.listings.update_one({"id": c["listing_id"]}, {"$set": {"status": "sold"}})

    await db.deliveries.update_one({"contract_id": contract_id}, {"$set": {"status": "completed"}, "$push": {"events": {"status": "completed", "at": now_iso(), "note": "Delivery confirmed by buyer"}}})
    await db.contracts.update_one({"id": contract_id}, {"$set": {"status": "completed", "updated_at": now_iso()}})

    # market reference price for savings estimate (normalise units to the contract unit)
    ref = await db.market_prices.find_one({"crop": {"$regex": c["crop_name"], "$options": "i"}}, {"_id": 0})
    ref_price = _convert_price(ref["modal"], ref.get("unit", "kg"), c["unit"]) if ref else round(c["price"] * 0.9, 2)
    benefit = round((c["price"] - ref_price) * c["quantity"], 2)

    txn = {
        "id": str(uuid.uuid4()), "contract_id": contract_id, "listing_id": c["listing_id"],
        "farmer_id": c["farmer_id"], "buyer_id": c["buyer_id"], "crop_name": c["crop_name"],
        "quantity": c["quantity"], "unit": c["unit"], "price": c["price"], "total": c["total"],
        "reference_price": ref_price, "estimated_benefit": benefit,
        "benefit_source": ref["market"] + " market" if ref else "AgriLink estimate",
        "benefit_timestamp": ref["timestamp"] if ref else now_iso(),
        "status": "completed", "payment_status": "settled_offplatform",
        "created_at": now_iso(),
    }
    await db.transactions.insert_one(txn)
    await db.savings_records.insert_one({
        "id": str(uuid.uuid4()), "user_id": c["farmer_id"], "transaction_id": txn["id"],
        "crop_name": c["crop_name"], "reference_price": ref_price, "agreed_price": c["price"],
        "quantity": c["quantity"], "estimated_benefit": benefit, "created_at": now_iso(),
    })
    await db.users.update_one({"id": c["farmer_id"]}, {"$inc": {"completed_transactions": 1}})
    await db.users.update_one({"id": c["buyer_id"]}, {"$inc": {"completed_transactions": 1}})
    for uid, other_role in [(c["farmer_id"], "buyer"), (c["buyer_id"], "farmer")]:
        await notify(uid, "transaction", "Transaction completed", f"Trade for {c['crop_name']} completed. You can now rate the {other_role}.", f"/transactions")
    await audit(user["id"], "complete", "transaction", txn["id"], {"contract": contract_id})
    return {"ok": True, "transaction_id": txn["id"]}

# ===========================================================================
# TRANSACTIONS / RATINGS / SAVINGS
# ===========================================================================
async def _enrich_txn(t: dict, user_id: str) -> dict:
    t.pop("_id", None)
    counter_id = t["buyer_id"] if t["farmer_id"] == user_id else t["farmer_id"]
    t["counterparty"] = await db.users.find_one({"id": counter_id}, {"_id": 0, "id": 1, "name": 1, "photo": 1, "business_name": 1})
    t["my_role"] = "farmer" if t["farmer_id"] == user_id else "buyer"
    t["rated"] = bool(await db.ratings.find_one({"transaction_id": t["id"], "rater_id": user_id}))
    return t

@api.get("/transactions")
async def list_transactions(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"farmer_id": user["id"]}, {"buyer_id": user["id"]}]}
    if status:
        query["status"] = status
    docs = await db.transactions.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(200)
    return [await _enrich_txn(d, user["id"]) for d in docs]

@api.post("/transactions/{txn_id}/dispute")
async def dispute_txn(txn_id: str, req: DisputeReq, user: dict = Depends(get_current_user)):
    t = await db.transactions.find_one({"id": txn_id})
    if not t or user["id"] not in (t["farmer_id"], t["buyer_id"]):
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.transactions.update_one({"id": txn_id}, {"$set": {"status": "disputed", "dispute": {"reason": req.reason, "by": user["id"], "at": now_iso()}}})
    await db.transaction_history.insert_one({"id": str(uuid.uuid4()), "transaction_id": txn_id, "action": "dispute", "by": user["id"], "reason": req.reason, "at": now_iso()})
    await audit(user["id"], "dispute", "transaction", txn_id, {"reason": req.reason})
    return {"ok": True, "status": "disputed"}

@api.get("/savings")
async def my_savings(user: dict = Depends(get_current_user)):
    docs = await db.savings_records.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(200)
    total = round(sum(d["estimated_benefit"] for d in docs), 2)
    return {"total_estimated_benefit": total, "records": docs}

@api.post("/ratings")
async def create_rating(req: RatingReq, user: dict = Depends(get_current_user)):
    t = await db.transactions.find_one({"id": req.transaction_id})
    if not t or user["id"] not in (t["farmer_id"], t["buyer_id"]):
        raise HTTPException(status_code=404, detail="Transaction not found")
    if t["status"] != "completed":
        raise HTTPException(status_code=400, detail="Only completed transactions can be rated")
    if await db.ratings.find_one({"transaction_id": req.transaction_id, "rater_id": user["id"]}):
        raise HTTPException(status_code=400, detail="You already rated this transaction")
    ratee_id = t["buyer_id"] if user["id"] == t["farmer_id"] else t["farmer_id"]
    await db.ratings.insert_one({
        "id": str(uuid.uuid4()), "transaction_id": req.transaction_id, "rater_id": user["id"],
        "ratee_id": ratee_id, "rating": req.rating, "review": req.review, "created_at": now_iso(),
    })
    agg = await db.ratings.aggregate([{"$match": {"ratee_id": ratee_id}}, {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "n": {"$sum": 1}}}]).to_list(1)
    if agg:
        await db.users.update_one({"id": ratee_id}, {"$set": {"rating": round(agg[0]["avg"], 2), "rating_count": agg[0]["n"]}})
    await notify(ratee_id, "rating", "You received a rating", f"You were rated {req.rating}★.", f"/transactions")
    return {"ok": True}

@api.get("/users/{user_id}/ratings")
async def user_ratings(user_id: str):
    docs = await db.ratings.find({"ratee_id": user_id}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    for d in docs:
        rater = await db.users.find_one({"id": d["rater_id"]}, {"_id": 0, "name": 1, "photo": 1})
        d["rater"] = rater
    return docs

# ===========================================================================
# FOLLOWS / SAVED
# ===========================================================================
@api.post("/follows/{target_id}")
async def follow(target_id: str, user: dict = Depends(get_current_user)):
    if target_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    target = await db.users.find_one({"id": target_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = await db.follows.find_one({"follower_id": user["id"], "target_id": target_id})
    if existing:
        return {"ok": True, "following": True}
    await db.follows.insert_one({"id": str(uuid.uuid4()), "follower_id": user["id"], "target_id": target_id, "created_at": now_iso()})
    await db.users.update_one({"id": target_id}, {"$inc": {"followers_count": 1}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"following_count": 1}})
    await notify(target_id, "follower", "New follower", f"{user['name']} started following you.", f"/users/{user['id']}")
    return {"ok": True, "following": True}

@api.delete("/follows/{target_id}")
async def unfollow(target_id: str, user: dict = Depends(get_current_user)):
    res = await db.follows.delete_one({"follower_id": user["id"], "target_id": target_id})
    if res.deleted_count:
        await db.users.update_one({"id": target_id}, {"$inc": {"followers_count": -1}})
        await db.users.update_one({"id": user["id"]}, {"$inc": {"following_count": -1}})
    return {"ok": True, "following": False}

@api.get("/following")
async def following(user: dict = Depends(get_current_user)):
    rows = await db.follows.find({"follower_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [r["target_id"] for r in rows]
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    return [public_user(u, user) for u in users]

@api.get("/followers")
async def followers(user: dict = Depends(get_current_user)):
    rows = await db.follows.find({"target_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [r["follower_id"] for r in rows]
    users = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    return [public_user(u, user) for u in users]

@api.get("/follows/check/{target_id}")
async def check_follow(target_id: str, user: dict = Depends(get_current_user)):
    return {"following": bool(await db.follows.find_one({"follower_id": user["id"], "target_id": target_id}))}

@api.post("/saved")
async def save_item(req: SavedReq, user: dict = Depends(get_current_user)):
    existing = await db.saved_items.find_one({"user_id": user["id"], "item_type": req.item_type, "item_id": req.item_id})
    if existing:
        return {"ok": True, "saved": True}
    await db.saved_items.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "item_type": req.item_type, "item_id": req.item_id, "created_at": now_iso()})
    return {"ok": True, "saved": True}

@api.delete("/saved/{item_type}/{item_id}")
async def unsave_item(item_type: str, item_id: str, user: dict = Depends(get_current_user)):
    await db.saved_items.delete_one({"user_id": user["id"], "item_type": item_type, "item_id": item_id})
    return {"ok": True, "saved": False}

@api.get("/saved")
async def list_saved(user: dict = Depends(get_current_user)):
    rows = await db.saved_items.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(500)
    result = {"listing": [], "farmer": [], "buyer": [], "market": [], "transport": []}
    for r in rows:
        if r["item_type"] == "listing":
            l = await db.listings.find_one({"id": r["item_id"]}, {"_id": 0})
            if l:
                farmer = await db.users.find_one({"id": l["farmer_id"]}, {"_id": 0})
                result["listing"].append(listing_public(l, farmer))
        elif r["item_type"] in ("farmer", "buyer"):
            u = await db.users.find_one({"id": r["item_id"]}, {"_id": 0})
            if u:
                result[r["item_type"]].append(public_user(u, user))
    return result

# ===========================================================================
# CHAT / MESSAGING
# ===========================================================================
@api.post("/conversations")
async def start_conversation(req: ConversationReq, user: dict = Depends(get_current_user)):
    if req.participant_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    other = await db.users.find_one({"id": req.participant_id})
    if not other:
        raise HTTPException(status_code=404, detail="User not found")
    pair = sorted([user["id"], req.participant_id])
    conv = await db.conversations.find_one({"pair": pair})
    if not conv:
        conv = {"id": str(uuid.uuid4()), "pair": pair, "participants": pair, "context": req.context,
                "last_message": None, "last_at": now_iso(), "created_at": now_iso()}
        await db.conversations.insert_one(conv)
    conv.pop("_id", None)
    return conv

@api.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    docs = await db.conversations.find({"participants": user["id"]}, {"_id": 0}).sort([("last_at", -1)]).to_list(200)
    for c in docs:
        other_id = [p for p in c["participants"] if p != user["id"]][0]
        c["other"] = await db.users.find_one({"id": other_id}, {"_id": 0, "id": 1, "name": 1, "photo": 1, "business_name": 1, "role": 1})
        c["unread"] = await db.messages.count_documents({"conversation_id": c["id"], "sender_id": {"$ne": user["id"]}, "read": False})
    return docs

@api.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv or user["id"] not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized for this conversation")
    await db.messages.update_many({"conversation_id": conv_id, "sender_id": {"$ne": user["id"]}}, {"$set": {"read": True}})
    docs = await db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(1000)
    return docs

@api.post("/conversations/{conv_id}/messages")
async def send_message(conv_id: str, req: MessageReq, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conv_id})
    if not conv or user["id"] not in conv["participants"]:
        raise HTTPException(status_code=403, detail="Not authorized for this conversation")
    msg = {"id": str(uuid.uuid4()), "conversation_id": conv_id, "sender_id": user["id"], "text": req.text, "read": False, "created_at": now_iso()}
    await db.messages.insert_one(msg)
    await db.conversations.update_one({"id": conv_id}, {"$set": {"last_message": req.text[:120], "last_at": now_iso()}})
    other_id = [p for p in conv["participants"] if p != user["id"]][0]
    await notify(other_id, "message", "New message", f"{user['name']}: {req.text[:60]}", "/messages")
    msg.pop("_id", None)
    return msg

# ===========================================================================
# NOTIFICATIONS
# ===========================================================================
@api.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).limit(100).to_list(100)
    return docs

@api.get("/notifications/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    return {"count": await db.notifications.count_documents({"user_id": user["id"], "read": False})}

@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

# ===========================================================================
# MARKET PRICES + AI INSIGHTS
# ===========================================================================
@api.get("/market-prices")
async def market_prices(crop: Optional[str] = None):
    query = {}
    if crop:
        query["crop"] = {"$regex": crop, "$options": "i"}
    docs = await db.market_prices.find(query, {"_id": 0}).sort([("crop", 1)]).to_list(200)
    return docs

@api.get("/market-prices/insights")
async def price_insights(crop: str = Query(...)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="AI insights unavailable — provider not configured")
    prices = await db.market_prices.find({"crop": {"$regex": crop, "$options": "i"}}, {"_id": 0}).to_list(20)
    listings_n = await db.listings.count_documents({"crop_name": {"$regex": crop, "$options": "i"}, "status": "available"})
    offers_n = await db.offers.count_documents({"crop_name": {"$regex": crop, "$options": "i"}})
    system = ("You are an agricultural market analyst for India. Return ONLY compact JSON with keys: "
              "demand ('High'|'Moderate'|'Low'), trend ('Rising'|'Stable'|'Falling'), summary (<=2 sentences), "
              "planting_recommendation (<=2 sentences), best_sell_window (short phrase). No markdown, no extra text.")
    prompt = (f"Crop: {crop}. Demonstration market price rows: {prices}. "
              f"Active listings on platform: {listings_n}. Total offers seen: {offers_n}. "
              f"Give demand assessment, price trend, a short summary, a planting recommendation, and the best selling window.")
    try:
        raw = await llm_complete(system, prompt)
        import json as _json, re as _re
        m = _re.search(r"\{.*\}", raw, _re.S)
        data = _json.loads(m.group(0)) if m else {"summary": raw}
    except Exception as e:
        logger.error(f"insights error: {e}")
        raise HTTPException(status_code=502, detail="Could not generate insights right now. Please try again.")
    data["crop"] = crop
    data["source"] = "AgriLink AI · Demonstration data"
    data["generated_at"] = now_iso()
    return data

# ===========================================================================
# TRANSLATION
# ===========================================================================
@api.post("/translate")
async def translate(req: TranslateReq):
    if req.target_lang == "en" or req.target_lang not in LANGUAGES:
        return {"lang": "en", "translations": req.keys}
    cache = await db.translation_cache.find_one({"lang": req.target_lang, "keys_hash": _keys_hash(req.keys)}, {"_id": 0})
    if cache:
        return {"lang": req.target_lang, "translations": cache["translations"], "cached": True}
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="Translation unavailable — provider not configured")
    import json as _json, re as _re
    system = (f"You are a professional translator. Translate the JSON string VALUES into {LANGUAGES[req.target_lang]}. "
              "Keep the JSON keys identical. Keep the brand name 'AgriLink 360' and 'LŪMEN // ÍNDEX' unchanged. "
              "Return ONLY the translated JSON object, no markdown.")
    try:
        raw = await llm_complete(system, _json.dumps(req.keys, ensure_ascii=False))
        m = _re.search(r"\{.*\}", raw, _re.S)
        translations = _json.loads(m.group(0)) if m else req.keys
    except Exception as e:
        logger.error(f"translate error: {e}")
        raise HTTPException(status_code=502, detail="Translation failed. Please try again.")
    await db.translation_cache.insert_one({"id": str(uuid.uuid4()), "lang": req.target_lang, "keys_hash": _keys_hash(req.keys), "translations": translations, "created_at": now_iso()})
    return {"lang": req.target_lang, "translations": translations}

def _keys_hash(keys: dict) -> str:
    import hashlib, json as _json
    return hashlib.sha256(_json.dumps(keys, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:24]

@api.get("/languages")
async def languages():
    return [{"code": k, "name": v} for k, v in LANGUAGES.items()]

# ===========================================================================
# OTP (provider-gated, never faked)
# ===========================================================================
@api.post("/otp/send")
async def otp_send():
    raise HTTPException(status_code=503, detail="Mobile OTP unavailable — provider not configured")

@api.post("/otp/verify")
async def otp_verify():
    raise HTTPException(status_code=503, detail="Mobile OTP unavailable — provider not configured")

# ===========================================================================
# FILE UPLOAD
# ===========================================================================
@api.post("/upload")
async def upload(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "bin"
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 8MB")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    try:
        result = put_object(path, data, file.content_type or "image/jpeg")
    except Exception as e:
        logger.error(f"upload failed: {e}")
        raise HTTPException(status_code=503, detail="Image storage unavailable — provider not configured")
    rec = {"id": str(uuid.uuid4()), "storage_path": result["path"], "owner_id": user["id"],
           "original_filename": file.filename, "content_type": file.content_type,
           "size": result.get("size"), "is_deleted": False, "created_at": now_iso()}
    await db.files.insert_one(rec)
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    return {"id": rec["id"], "url": f"/api/files/{result['path']}", "path": result["path"]}

@api.get("/files/{path:path}")
async def download_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ctype = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return FastResponse(content=data, media_type=rec.get("content_type") or ctype)

# ===========================================================================
# DASHBOARDS
# ===========================================================================
@api.get("/dashboard/farmer")
async def farmer_dashboard(user: dict = Depends(get_current_user)):
    if user["role"] != "farmer":
        raise HTTPException(status_code=403, detail="Farmer dashboard only")
    uid = user["id"]
    txns = await db.transactions.find({"farmer_id": uid, "status": "completed"}, {"_id": 0}).to_list(1000)
    total_sales = round(sum(t["total"] for t in txns), 2)
    crops_sold = round(sum(t["quantity"] for t in txns), 2)
    savings = await db.savings_records.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    est_revenue = round(sum(s["estimated_benefit"] for s in savings), 2)
    active_stock = await db.listings.count_documents({"farmer_id": uid, "status": "available"})
    active_buyers = len({t["buyer_id"] for t in txns})
    saved_count = await db.saved_items.count_documents({"user_id": uid})
    # sales by month
    monthly = {}
    for t in txns:
        m = t["created_at"][:7]
        monthly[m] = monthly.get(m, 0) + t["total"]
    sales_series = [{"month": k, "value": round(v, 2)} for k, v in sorted(monthly.items())][-6:]
    # crop distribution
    by_crop = {}
    for t in txns:
        by_crop[t["crop_name"]] = by_crop.get(t["crop_name"], 0) + t["quantity"]
    crop_series = [{"name": k, "value": round(v, 2)} for k, v in by_crop.items()]
    return {
        "metrics": {
            "total_sales": total_sales, "crops_sold": crops_sold,
            "completed_transactions": len(txns), "estimated_additional_revenue": est_revenue,
            "active_stock": active_stock, "active_buyers": active_buyers,
            "followers": user.get("followers_count", 0), "saved_items": saved_count,
        },
        "sales_series": sales_series, "crop_series": crop_series,
    }

@api.get("/dashboard/buyer")
async def buyer_dashboard(user: dict = Depends(get_current_user)):
    if user["role"] != "buyer":
        raise HTTPException(status_code=403, detail="Buyer dashboard only")
    uid = user["id"]
    txns = await db.transactions.find({"buyer_id": uid, "status": "completed"}, {"_id": 0}).to_list(1000)
    purchased_qty = round(sum(t["quantity"] for t in txns), 2)
    total_spent = round(sum(t["total"] for t in txns), 2)
    pending_offers = await db.offers.count_documents({"buyer_id": uid, "status": {"$in": ["pending", "countered"]}})
    active_contracts = await db.contracts.count_documents({"buyer_id": uid, "status": {"$in": ["active", "pending_confirmation"]}})
    saved_farmers = await db.saved_items.count_documents({"user_id": uid, "item_type": "farmer"})
    following = await db.follows.count_documents({"follower_id": uid})
    by_crop = {}
    for t in txns:
        by_crop[t["crop_name"]] = by_crop.get(t["crop_name"], 0) + t["quantity"]
    crop_series = [{"name": k, "value": round(v, 2)} for k, v in by_crop.items()]
    monthly = {}
    for t in txns:
        m = t["created_at"][:7]
        monthly[m] = monthly.get(m, 0) + t["total"]
    spend_series = [{"month": k, "value": round(v, 2)} for k, v in sorted(monthly.items())][-6:]
    return {
        "metrics": {
            "purchased_quantity": purchased_qty, "total_spent": total_spent,
            "pending_offers": pending_offers, "active_contracts": active_contracts,
            "completed_purchases": len(txns), "saved_farmers": saved_farmers,
            "following": following, "followers": user.get("followers_count", 0),
        },
        "spend_series": spend_series, "crop_series": crop_series,
    }

# ===========================================================================
# ADMIN
# ===========================================================================
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "farmers": await db.users.count_documents({"role": "farmer"}),
        "buyers": await db.users.count_documents({"role": "buyer"}),
        "listings": await db.listings.count_documents({"status": {"$ne": "deleted"}}),
        "offers": await db.offers.count_documents({}),
        "contracts": await db.contracts.count_documents({}),
        "transactions": await db.transactions.count_documents({}),
        "disputes": await db.transactions.count_documents({"status": "disputed"}),
    }

@api.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin), q: Optional[str] = None):
    query = {}
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]
    docs = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort([("created_at", -1)]).limit(200).to_list(200)
    for d in docs:
        d["profile_completeness"] = profile_completeness(d)
    return docs

@api.post("/admin/verify")
async def admin_verify(user_id: str = Query(...), category: str = Query(...), approved: bool = Query(True), admin: dict = Depends(require_admin)):
    if category not in ("mobile", "email", "identity", "business", "farmer", "buyer"):
        raise HTTPException(status_code=400, detail="Invalid category")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    v = {**(target.get("verifications") or {}), category: approved}
    await db.users.update_one({"id": user_id}, {"$set": {"verifications": v}})
    await audit(admin["id"], "verify", "user", user_id, {"category": category, "approved": approved})
    await notify(user_id, "verification", "Verification updated", f"Your {category} verification was {'approved' if approved else 'revoked'}.", "/verification")
    return {"ok": True, "verifications": v}

@api.get("/admin/disputes")
async def admin_disputes(admin: dict = Depends(require_admin)):
    docs = await db.transactions.find({"status": "disputed"}, {"_id": 0}).sort([("created_at", -1)]).to_list(200)
    for d in docs:
        d["farmer"] = await db.users.find_one({"id": d["farmer_id"]}, {"_id": 0, "name": 1, "id": 1})
        d["buyer"] = await db.users.find_one({"id": d["buyer_id"]}, {"_id": 0, "name": 1, "id": 1})
    return docs

@api.post("/admin/disputes/{txn_id}/resolve")
async def admin_resolve_dispute(txn_id: str, resolution: str = Query(...), admin: dict = Depends(require_admin)):
    await db.transactions.update_one({"id": txn_id}, {"$set": {"status": "completed", "dispute_resolution": {"note": resolution, "by": admin["id"], "at": now_iso()}}})
    await audit(admin["id"], "resolve_dispute", "transaction", txn_id, {"resolution": resolution})
    return {"ok": True}

@api.get("/admin/audit-logs")
async def admin_audit(admin: dict = Depends(require_admin)):
    return await db.audit_logs.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(200).to_list(200)

@api.post("/admin/market-prices")
async def admin_add_price(payload: dict, admin: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), "crop": payload["crop"], "market": payload["market"],
           "location": payload.get("location"), "min": float(payload["min"]), "max": float(payload["max"]),
           "modal": float(payload["modal"]), "unit": payload.get("unit", "quintal"),
           "source": payload.get("source", "Admin entry"), "data_type": payload.get("data_type", "Demonstration"),
           "timestamp": now_iso()}
    await db.market_prices.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/admin/listings")
async def admin_listings(admin: dict = Depends(require_admin)):
    docs = await db.listings.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(200).to_list(200)
    return docs

@api.get("/")
async def root():
    return {"app": "AgriLink 360", "status": "ok"}

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup: indexes, storage, seed
# ---------------------------------------------------------------------------
from seed_data import seed_all

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@agrilink.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    base = {
        "name": "AgriLink Admin", "role": "admin", "mobile": None, "mobile_verified": True,
        "email_verified": True, "about": "Platform administrator.",
        "contact": {"country": "India"}, "privacy": {"phone": "private", "email": "private", "address": "private", "location": "hidden"},
        "verifications": {"mobile": True, "email": True, "identity": False, "business": True, "farmer": True, "buyer": True},
        "crops": [], "crops_required": [], "rating": 0.0, "rating_count": 0, "completed_transactions": 0,
        "followers_count": 0, "following_count": 0,
    }
    if existing is None:
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": admin_email,
                                   "password_hash": hash_password(admin_password), "created_at": now_iso(), **base})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}})

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.listings.create_index([("status", 1), ("category", 1)])
    await db.listings.create_index("farmer_id")
    await db.follows.create_index([("follower_id", 1), ("target_id", 1)], unique=True)
    await db.saved_items.create_index([("user_id", 1), ("item_type", 1), ("item_id", 1)], unique=True)
    await db.ratings.create_index([("transaction_id", 1), ("rater_id", 1)], unique=True)
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning(f"Storage init failed (uploads will report unavailable): {e}")
    await seed_admin()
    await seed_all(db, hash_password)
    logger.info("AgriLink 360 backend ready")

@app.on_event("shutdown")
async def shutdown():
    client.close()
