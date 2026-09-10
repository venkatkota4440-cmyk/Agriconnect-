"""Demo data seeding for AgriLink 360. Idempotent. All demo prices are labelled 'Demonstration'."""
from datetime import datetime, timezone, timedelta
import uuid

def now_iso():
    return datetime.now(timezone.utc).isoformat()

IMG = {
    "tomato": ["https://images.unsplash.com/photo-1582284540020-8acbe03f4924?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1662370761575-05ff1ee40d7d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "mango": ["https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1732472581875-89ff83f18439?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "wheat": ["https://images.unsplash.com/photo-1595444042058-f038c7e0e778?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1635174815475-1c624f86808b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "rice": ["https://images.unsplash.com/photo-1586201375761-83865001e31c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "lentils": ["https://images.unsplash.com/photo-1612257416648-ee7a6c533b4f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1599579085809-4edbc35cee01?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "spices": ["https://images.unsplash.com/photo-1716816211590-c15a328a5ff0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "turmeric": ["https://images.unsplash.com/photo-1606951444141-e5533feb55be?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "milk": ["https://images.unsplash.com/photo-1550583724-b2692b85b150?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "marigold": ["https://images.unsplash.com/photo-1518369623551-510c7b3c9f5d?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "organic": ["https://images.unsplash.com/photo-1624668430039-0175a0fbf006?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200", "https://images.unsplash.com/photo-1659822887922-c1386185cc6b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "mustard": ["https://images.unsplash.com/photo-1702896781457-1d4f69aebf7e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"],
    "farmer1": "https://images.unsplash.com/photo-1628492058844-589eb5dc6a35?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "farmer2": "https://images.unsplash.com/photo-1545830790-68595959c491?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
    "farmer3": "https://images.unsplash.com/photo-1627475320102-d73fcb4eb427?crop=entropy&cs=srgb&fm=jpg&q=85&w=600",
}

FARMERS = [
    {"id": "f0000000-0000-0000-0000-000000000001", "email": "farmer@agrilink.com", "name": "Ramesh Kumar", "photo": IMG["farmer1"],
     "about": "Third-generation farmer specialising in organic vegetables and heirloom tomatoes across 12 acres near Kolar. Committed to residue-free produce and fair pricing.",
     "specialization": "Organic Vegetables", "farm_size": "12 acres", "experience_years": 18,
     "crops": ["Tomato", "Onion", "Leafy Greens"], "district": "Kolar", "state": "Karnataka", "village": "Vemgal",
     "rating": 4.7, "rating_count": 34, "completed_transactions": 41, "followers_count": 128, "verified": True},
    {"id": "f0000000-0000-0000-0000-000000000002", "email": "lakshmi@agrilink.com", "name": "Lakshmi Devi", "photo": IMG["farmer2"],
     "about": "Grain and pulse grower from the fertile Godavari belt. FPO member supplying premium basmati and toor dal to institutional buyers.",
     "specialization": "Grains & Pulses", "farm_size": "28 acres", "experience_years": 22,
     "crops": ["Basmati Rice", "Toor Dal", "Wheat"], "district": "East Godavari", "state": "Andhra Pradesh", "village": "Rajanagaram",
     "rating": 4.9, "rating_count": 52, "completed_transactions": 76, "followers_count": 310, "verified": True},
    {"id": "f0000000-0000-0000-0000-000000000003", "email": "suresh@agrilink.com", "name": "Suresh Reddy", "photo": IMG["farmer3"],
     "about": "Horticulture specialist growing Alphonso mango, turmeric and marigold. Focused on export-grade quality and cold-chain logistics.",
     "specialization": "Horticulture & Spices", "farm_size": "16 acres", "experience_years": 14,
     "crops": ["Mango", "Turmeric", "Marigold"], "district": "Krishna", "state": "Andhra Pradesh", "village": "Nuzvid",
     "rating": 4.6, "rating_count": 29, "completed_transactions": 33, "followers_count": 96, "verified": True},
]

BUYERS = [
    {"id": "b0000000-0000-0000-0000-000000000001", "email": "buyer@agrilink.com", "name": "Anil Sharma", "business_name": "Anil Agro Traders",
     "buyer_type": "Wholesaler", "about": "Wholesale trader sourcing vegetables and grains for metro mandis. Reliable payments and bulk pickup.",
     "crops_required": ["Tomato", "Onion", "Rice"], "procurement_quantity": "5-20 tonnes / week", "district": "Bengaluru Urban", "state": "Karnataka",
     "rating": 4.5, "rating_count": 18, "completed_transactions": 22, "verified": True},
    {"id": "b0000000-0000-0000-0000-000000000002", "email": "freshmart@agrilink.com", "name": "Priya Nair", "business_name": "FreshMart Retail",
     "buyer_type": "Retailer", "about": "Organic-first retail chain with 14 stores. Prioritises verified farmers and residue-free produce.",
     "crops_required": ["Organic Vegetables", "Fruits"], "procurement_quantity": "2-5 tonnes / week", "district": "Hyderabad", "state": "Telangana",
     "rating": 4.8, "rating_count": 25, "completed_transactions": 30, "verified": True},
]

def _listing(fid, crop, category, variety, qty, unit, grade, price, imgs, organic=False, delivery=True, district="", state="", desc=""):
    return {
        "id": str(uuid.uuid4()), "farmer_id": fid, "crop_name": crop, "category": category, "variety": variety,
        "description": desc, "quantity_total": qty, "quantity_available": qty, "quantity_reserved": 0.0,
        "quantity_sold": 0.0, "unit": unit, "grade": grade, "price": price, "price_unit": unit,
        "harvest_date": (datetime.now(timezone.utc) - timedelta(days=4)).date().isoformat(),
        "available_date": datetime.now(timezone.utc).date().isoformat(),
        "organic": organic, "delivery_available": delivery, "images": imgs,
        "location": {"district": district, "state": state}, "verified_seller": True,
        "status": "available", "rating": 0, "rating_count": 0, "views": 0,
        "created_at": now_iso(), "updated_at": now_iso(),
    }

PRICES = [
    ("Tomato", "Kolar APMC", "Karnataka", 1200, 2200, 1700, "quintal"),
    ("Onion", "Lasalgaon", "Maharashtra", 1400, 2600, 2000, "quintal"),
    ("Basmati Rice", "Karnal Mandi", "Haryana", 3200, 4200, 3700, "quintal"),
    ("Wheat", "Indore Mandi", "Madhya Pradesh", 2200, 2600, 2400, "quintal"),
    ("Toor Dal", "Gulbarga APMC", "Karnataka", 6800, 8200, 7500, "quintal"),
    ("Mango", "Nuzvid Market", "Andhra Pradesh", 4000, 9000, 6500, "quintal"),
    ("Turmeric", "Nizamabad Market", "Telangana", 12000, 16000, 14000, "quintal"),
    ("Red Chilli", "Guntur Market", "Andhra Pradesh", 14000, 22000, 18000, "quintal"),
    ("Groundnut", "Rajkot Market", "Gujarat", 5500, 6800, 6100, "quintal"),
    ("Marigold", "Bengaluru Flower Mkt", "Karnataka", 30, 80, 55, "kg"),
    ("Milk", "Local Dairy Co-op", "Andhra Pradesh", 32, 42, 38, "litre"),
    ("Mustard", "Jaipur Mandi", "Rajasthan", 5200, 6100, 5600, "quintal"),
]


async def seed_all(db, hash_password):
    pw = hash_password("Password@123")
    # Upsert demo farmers/buyers (never touch password if exists)
    for f in FARMERS:
        exists = await db.users.find_one({"id": f["id"]})
        if exists:
            continue
        await db.users.insert_one({
            "id": f["id"], "email": f["email"], "password_hash": pw, "name": f["name"], "role": "farmer",
            "mobile": "+91" + str(90000000 + int(f["id"][-1])), "mobile_verified": False, "email_verified": False,
            "photo": f["photo"], "about": f["about"], "specialization": f["specialization"], "farm_size": f["farm_size"],
            "experience_years": f["experience_years"], "crops": f["crops"],
            "contact": {"village": f["village"], "district": f["district"], "state": f["state"], "country": "India"},
            "privacy": {"phone": "verified", "email": "private", "address": "approximate", "location": "approximate"},
            "verifications": {"mobile": False, "email": False, "identity": False, "business": False, "farmer": f["verified"], "buyer": False},
            "rating": f["rating"], "rating_count": f["rating_count"], "completed_transactions": f["completed_transactions"],
            "followers_count": f["followers_count"], "following_count": 0, "created_at": now_iso(),
        })
    for b in BUYERS:
        exists = await db.users.find_one({"id": b["id"]})
        if exists:
            continue
        await db.users.insert_one({
            "id": b["id"], "email": b["email"], "password_hash": pw, "name": b["name"], "role": "buyer",
            "mobile": "+91" + str(80000000 + int(b["id"][-1])), "mobile_verified": False, "email_verified": False,
            "photo": None, "about": b["about"], "business_name": b["business_name"], "buyer_type": b["buyer_type"],
            "crops_required": b["crops_required"], "procurement_quantity": b["procurement_quantity"],
            "contact": {"district": b["district"], "state": b["state"], "country": "India"},
            "privacy": {"phone": "verified", "email": "private", "address": "private", "location": "approximate"},
            "verifications": {"mobile": False, "email": False, "identity": False, "business": b["verified"], "farmer": False, "buyer": b["verified"]},
            "rating": b["rating"], "rating_count": b["rating_count"], "completed_transactions": b["completed_transactions"],
            "followers_count": 0, "following_count": 0, "created_at": now_iso(),
        })

    # Listings
    if await db.listings.count_documents({"farmer_id": {"$in": [f["id"] for f in FARMERS]}}) == 0:
        f1, f2, f3 = FARMERS[0]["id"], FARMERS[1]["id"], FARMERS[2]["id"]
        listings = [
            _listing(f1, "Tomato", "Vegetables", "Hybrid Nati", 800, "kg", "A", 24, IMG["tomato"], organic=True, district="Kolar", state="Karnataka", desc="Firm, vine-ripened organic tomatoes. Hand-picked, uniform grade, ideal for retail and processing."),
            _listing(f1, "Organic Mixed Vegetables", "Organic Produce", "Seasonal Basket", 400, "kg", "A", 45, IMG["organic"], organic=True, district="Kolar", state="Karnataka", desc="Certified residue-free mixed seasonal vegetables curated for organic retail."),
            _listing(f1, "Onion", "Vegetables", "Bellary Red", 1500, "kg", "B", 18, IMG["tomato"][1:], district="Kolar", state="Karnataka", desc="Red onions with good shelf life, bulk quantity available."),
            _listing(f2, "Basmati Rice", "Grains", "Pusa 1121", 5000, "kg", "A", 62, IMG["rice"], district="East Godavari", state="Andhra Pradesh", desc="Long-grain aromatic basmati, aged 12 months. Export-grade milling."),
            _listing(f2, "Wheat", "Grains", "Lokwan", 6000, "kg", "A", 26, IMG["wheat"], district="East Godavari", state="Andhra Pradesh", desc="Clean, sun-dried wheat with low moisture, suitable for flour mills."),
            _listing(f2, "Toor Dal", "Pulses", "Desi", 2000, "kg", "A", 96, IMG["lentils"], district="East Godavari", state="Andhra Pradesh", desc="Unpolished toor dal from FPO cluster. Consistent grade and cleanliness."),
            _listing(f3, "Mango", "Fruits", "Banganapalli", 1200, "kg", "A", 78, IMG["mango"], district="Krishna", state="Andhra Pradesh", desc="Sweet, fibreless Banganapalli mangoes. Carefully ripened, export quality."),
            _listing(f3, "Turmeric", "Spices", "Finger Turmeric", 900, "kg", "A", 145, IMG["turmeric"], district="Krishna", state="Andhra Pradesh", desc="High-curcumin finger turmeric, polished and sorted."),
            _listing(f3, "Marigold", "Flowers", "African Orange", 600, "kg", "A", 58, IMG["marigold"], district="Krishna", state="Andhra Pradesh", desc="Fresh marigold blooms for festivals and garland traders."),
            _listing(f3, "Mustard Seed", "Oilseeds", "Yellow Mustard", 1800, "kg", "B", 56, IMG["mustard"], district="Krishna", state="Andhra Pradesh", desc="Bold yellow mustard seed with high oil content."),
            _listing(f1, "Cow Milk", "Dairy", "A2", 300, "litre", "A", 46, IMG["milk"], district="Kolar", state="Karnataka", desc="Fresh A2 cow milk from indigenous breed, daily supply available."),
            _listing(f2, "Green Gram", "Pulses", "Moong", 1500, "kg", "A", 88, IMG["lentils"][1:], district="East Godavari", state="Andhra Pradesh", desc="Bright green moong dal, machine-cleaned and graded."),
        ]
        await db.listings.insert_many(listings)

    # Market prices
    if await db.market_prices.count_documents({}) == 0:
        await db.market_prices.insert_many([
            {"id": str(uuid.uuid4()), "crop": c, "market": mk, "location": st, "min": float(mn), "max": float(mx),
             "modal": float(md), "unit": u, "source": "Demonstration dataset", "data_type": "Demonstration", "timestamp": now_iso()}
            for (c, mk, st, mn, mx, md, u) in PRICES
        ])
